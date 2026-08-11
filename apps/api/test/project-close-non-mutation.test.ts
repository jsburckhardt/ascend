import { chmod, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import {
  ProjectCloseError,
  createProjectCloseService,
} from '../src/project-close.js'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  allocateDatabaseTestContext,
  REPOSITORY_ROOT,
} from './project-database-test-helper.js'
import {
  allocateRegistrationFixture,
  snapshotFixture,
  type ManifestEntry,
} from './project-registration-fixture-helper.js'
import { build } from './helper.js'

export const BL009_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-009/close-project'
)
export const BL009_MANIFEST_EVIDENCE_PATH = path.join(
  BL009_EVIDENCE_ROOT,
  'manifest-matrix.json'
)

const REQUIRED_MANIFEST_OUTCOMES = [
  'cancel',
  'success',
  'unknown',
  'persistenceFailure',
  'transportAmbiguity',
  'retry',
  'alreadyAbsent',
  'eightConcurrentDeletes',
] as const

type ManifestOutcome = (typeof REQUIRED_MANIFEST_OUTCOMES)[number]

interface ManifestComparison {
  readonly executed: true
  readonly before: readonly ManifestEntry[]
  readonly after: readonly ManifestEntry[]
  readonly membershipBefore: readonly string[]
  readonly membershipAfter: readonly string[]
  readonly bytesBefore: Readonly<Record<string, string | null>>
  readonly bytesAfter: Readonly<Record<string, string | null>>
  readonly permissionsBefore: Readonly<Record<string, number>>
  readonly permissionsAfter: Readonly<Record<string, number>>
  readonly timestampsBefore: Readonly<Record<string, string>>
  readonly timestampsAfter: Readonly<Record<string, string>>
  readonly equal: true
  readonly requestCount: number
  readonly statuses: readonly number[]
}

function project(
  id: string,
  canonicalPath: string,
  createdAt: number
): Project {
  return { id, name: 'Fixture ' + id, canonicalPath, createdAt }
}

function values<T>(
  manifest: readonly ManifestEntry[],
  select: (entry: ManifestEntry) => T
): Record<string, T> {
  return Object.fromEntries(
    manifest.map((entry) => [entry.relativePath, select(entry)])
  )
}

function encodedBytes(entry: ManifestEntry): string | null {
  return entry.bytesBase64 ?? entry.linkTargetBase64 ?? null
}

describe('BL-009 recursive project non-mutation matrix', () => {
  it('executes every route path and combines eight DELETEs with recursive integrity', async () => {
    const fixture = await allocateRegistrationFixture('bl009-manifest')
    const database = await allocateDatabaseTestContext('bl009-manifest')
    const nested = path.join(fixture.root, 'nested')
    const content = path.join(nested, 'sentinel.bin')
    const link = path.join(fixture.root, 'sentinel-link')
    await mkdir(nested)
    await writeFile(content, Buffer.from([0, 1, 2, 255, 60, 62]))
    await chmod(content, 0o640)
    await symlink(path.join('nested', 'sentinel.bin'), link)

    let library: ProjectLibrary = await createProjectLibrary(
      database.databasePath
    )
    let app: Awaited<ReturnType<typeof build>> | undefined
    const outcomes = {} as Record<ManifestOutcome, ManifestComparison>
    try {
      const ids = [
        'cancel',
        'success',
        'ambiguous',
        'retry',
        'already-absent',
        'concurrent',
        'rollback',
      ] as const
      for (const [index, id] of ids.entries()) {
        await library.create(
          project(id, path.join(fixture.root, 'registered-' + id), index + 1)
        )
      }
      library.close()
      const resource = createDatabase(database.databasePath)
      await resource.database.run(
        sql.raw(
          `CREATE TRIGGER close_matrix_abort AFTER DELETE ON projects WHEN OLD.id = 'rollback' BEGIN SELECT RAISE(ABORT, 'private-sentinel'); END`
        )
      )
      resource.close()
      library = await createProjectLibrary(database.databasePath)
      const realClose = createProjectCloseService(library)
      let retryFaultPending = true
      app = await build({
        createProjectLibrary: async () => library,
        createProjectCloseService: () => ({
          async closeProject(id) {
            if (id === 'retry' && retryFaultPending) {
              retryFaultPending = false
              throw new ProjectCloseError('project_close_failed')
            }
            return realClose.closeProject(id)
          },
        }),
      })

      const record = async (
        label: ManifestOutcome,
        request: () => Promise<readonly number[]>
      ): Promise<void> => {
        const before = await snapshotFixture(fixture.root)
        const statuses = await request()
        const after = await snapshotFixture(fixture.root)
        expect(after, label + ' recursive manifest').toEqual(before)
        const comparison: ManifestComparison = {
          executed: true,
          before,
          after,
          membershipBefore: before.map(({ relativePath }) => relativePath),
          membershipAfter: after.map(({ relativePath }) => relativePath),
          bytesBefore: values(before, encodedBytes),
          bytesAfter: values(after, encodedBytes),
          permissionsBefore: values(before, ({ mode }) => mode),
          permissionsAfter: values(after, ({ mode }) => mode),
          timestampsBefore: values(before, ({ mtimeNs }) => mtimeNs),
          timestampsAfter: values(after, ({ mtimeNs }) => mtimeNs),
          equal: true,
          requestCount: statuses.length,
          statuses,
        }
        expect(comparison.membershipAfter).toEqual(comparison.membershipBefore)
        expect(comparison.bytesAfter).toEqual(comparison.bytesBefore)
        expect(comparison.permissionsAfter).toEqual(
          comparison.permissionsBefore
        )
        expect(comparison.timestampsAfter).toEqual(comparison.timestampsBefore)
        outcomes[label] = comparison
      }

      await record('cancel', async () => {
        expect((await library.list()).some(({ id }) => id === 'cancel')).toBe(
          true
        )
        return []
      })
      await record('success', async () => {
        const response = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/success',
        })
        expect(response.json()).toEqual({
          id: 'success',
          disposition: 'closed',
        })
        return [response.statusCode]
      })
      await record('unknown', async () => {
        const response = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/unknown',
        })
        expect(response.json()).toEqual({
          error: { category: 'project_not_found' },
        })
        return [response.statusCode]
      })
      await record('persistenceFailure', async () => {
        const rowsBefore = await library.list()
        const response = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/rollback',
        })
        expect(response.json()).toEqual({
          error: { category: 'project_close_failed' },
        })
        expect(await library.list()).toEqual(rowsBefore)
        return [response.statusCode]
      })
      await record('transportAmbiguity', async () => {
        const discardedResponse = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/ambiguous',
        })
        expect(discardedResponse.statusCode).toBe(200)
        const authoritative = await app!.inject({
          method: 'GET',
          url: '/api/projects',
        })
        expect(
          (authoritative.json() as { projects: Project[] }).projects.some(
            ({ id }) => id === 'ambiguous'
          )
        ).toBe(false)
        return [discardedResponse.statusCode, authoritative.statusCode]
      })
      await record('retry', async () => {
        const first = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/retry',
        })
        const second = await app!.inject({
          method: 'DELETE',
          url: '/api/projects/retry',
        })
        expect(first.json()).toEqual({
          error: { category: 'project_close_failed' },
        })
        expect(second.json()).toEqual({ id: 'retry', disposition: 'closed' })
        return [first.statusCode, second.statusCode]
      })
      await record('alreadyAbsent', async () => {
        const responses = []
        for (let index = 0; index < 3; index += 1) {
          responses.push(
            await app!.inject({
              method: 'DELETE',
              url: '/api/projects/already-absent',
            })
          )
        }
        expect(responses.map(({ statusCode }) => statusCode)).toEqual([
          200, 404, 404,
        ])
        return responses.map(({ statusCode }) => statusCode)
      })
      await record('eightConcurrentDeletes', async () => {
        const responses = await Promise.all(
          Array.from({ length: 8 }, () =>
            app!.inject({
              method: 'DELETE',
              url: '/api/projects/concurrent',
            })
          )
        )
        const statuses = responses.map(({ statusCode }) => statusCode)
        expect(statuses.filter((status) => status === 200)).toHaveLength(1)
        expect(statuses.filter((status) => status === 404)).toHaveLength(7)
        expect(
          (await library.list()).some(({ id }) => id === 'concurrent')
        ).toBe(false)
        return statuses
      })

      const closeSource = await readFile(
        path.join(REPOSITORY_ROOT, 'apps/api/src/project-close.ts'),
        'utf8'
      )
      expect(closeSource).not.toMatch(
        /node:fs|project-registration|canonicalPath/u
      )
      expect(Object.keys(outcomes)).toEqual([...REQUIRED_MANIFEST_OUTCOMES])
      await mkdir(BL009_EVIDENCE_ROOT, { recursive: true })
      await writeFile(
        BL009_MANIFEST_EVIDENCE_PATH,
        JSON.stringify(
          {
            manifestFields: [
              'relativePath',
              'type',
              'mode',
              'mtimeNs',
              'bytesBase64',
              'linkTargetBase64',
            ],
            outcomes,
            integrityComparedBeforeCleanup: true,
            concurrentClosed: 1,
            concurrentNotFound: 7,
          },
          null,
          2
        ) + '\n'
      )
    } finally {
      await app?.close()
      library.close()
      await database.cleanup()
      await fixture.cleanup()
    }
  })
})
