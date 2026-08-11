import { chmod, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import { createProjectCloseService } from '../src/project-close.js'
import { createProjectLibrary } from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  allocateDatabaseTestContext,
  REPOSITORY_ROOT,
} from './project-database-test-helper.js'
import {
  allocateRegistrationFixture,
  snapshotFixture,
} from './project-registration-fixture-helper.js'

export const BL009_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-009/close-project'
)
export const BL009_MANIFEST_EVIDENCE_PATH = path.join(
  BL009_EVIDENCE_ROOT,
  'manifest-matrix.json'
)

function project(
  id: string,
  canonicalPath: string,
  createdAt: number
): Project {
  return { id, name: 'Fixture ' + id, canonicalPath, createdAt }
}

describe('BL-009 recursive project non-mutation matrix', () => {
  it('keeps membership, bytes, links, modes, and mtimes identical before cleanup', async () => {
    const fixture = await allocateRegistrationFixture('bl009-manifest')
    const database = await allocateDatabaseTestContext('bl009-manifest')
    const nested = path.join(fixture.root, 'nested')
    const content = path.join(nested, 'sentinel.bin')
    const link = path.join(fixture.root, 'sentinel-link')
    await mkdir(nested)
    await writeFile(content, Buffer.from([0, 1, 2, 255, 60, 62]))
    await chmod(content, 0o640)
    await symlink(content, link)
    const baseline = await snapshotFixture(fixture.root)
    const results: Record<string, boolean> = {}
    let library = await createProjectLibrary(database.databasePath)
    try {
      const assertEqual = async (label: string): Promise<void> => {
        const current = await snapshotFixture(fixture.root)
        expect(current, label).toEqual(baseline)
        results[label] = true
      }
      await assertEqual('cancel')

      await library.create(project('success', fixture.root, 1))
      await expect(
        createProjectCloseService(library).closeProject('success')
      ).resolves.toEqual({ disposition: 'closed', id: 'success' })
      await assertEqual('success')

      await expect(
        createProjectCloseService(library).closeProject('unknown')
      ).resolves.toEqual({ disposition: 'project_not_found' })
      await assertEqual('unknownId')

      await expect(
        createProjectCloseService(library).closeProject('success')
      ).resolves.toEqual({ disposition: 'project_not_found' })
      await assertEqual('alreadyAbsent')

      await library.create(project('ambiguous', fixture.root, 2))
      await createProjectCloseService(library).closeProject('ambiguous')
      expect((await library.list()).some(({ id }) => id === 'ambiguous')).toBe(
        false
      )
      await assertEqual('transportAmbiguity')

      await library.create(project('retry', fixture.root, 3))
      await assertEqual('provedNoTransmission')
      await createProjectCloseService(library).closeProject('retry')
      await assertEqual('sameIdRetry')

      await library.create(project('concurrent', fixture.root, 4))
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () =>
          createProjectCloseService(library).closeProject('concurrent')
        )
      )
      expect(
        concurrent.filter(({ disposition }) => disposition === 'closed')
      ).toHaveLength(1)
      expect(
        concurrent.filter(
          ({ disposition }) => disposition === 'project_not_found'
        )
      ).toHaveLength(7)
      await assertEqual('eightWayConcurrency')

      library.close()
      library = await createProjectLibrary(database.databasePath)
      await library.create(project('rollback', fixture.root, 5))
      library.close()
      const resource = createDatabase(database.databasePath)
      await resource.database.run(
        sql.raw(
          `CREATE TRIGGER close_matrix_abort AFTER DELETE ON projects WHEN OLD.id = 'rollback' BEGIN SELECT RAISE(ABORT, 'private-sentinel'); END`
        )
      )
      resource.close()
      library = await createProjectLibrary(database.databasePath)
      const beforeRows = await library.list()
      await expect(
        createProjectCloseService(library).closeProject('rollback')
      ).rejects.toMatchObject({ category: 'project_close_failed' })
      expect(await library.list()).toEqual(beforeRows)
      await assertEqual('persistenceRollback')

      const closeSource = await readFile(
        path.join(REPOSITORY_ROOT, 'apps/api/src/project-close.ts'),
        'utf8'
      )
      expect(closeSource).not.toMatch(
        /node:fs|project-registration|canonicalPath/u
      )
      results.noProjectFilesystemImport = true
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
            outcomes: results,
            integrityComparedBeforeCleanup: true,
            concurrentClosed: 1,
            concurrentNotFound: 7,
          },
          null,
          2
        ) + '\n'
      )
    } finally {
      library.close()
      await database.cleanup()
      await fixture.cleanup()
    }
  })
})
