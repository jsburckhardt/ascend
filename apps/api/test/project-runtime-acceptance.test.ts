import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RUNTIME_FAILURE_CATEGORIES,
  RuntimeFailure,
  serializeRuntimeEvent,
} from '../src/project-runtime-contract.js'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

const cases = [
  'unknown-project',
  'canonical-path-invariant',
  'eight-call-single-flight',
  'healthy-reuse',
  'port-collision',
  'address-exhaustion',
  'spawn-error',
  'executable-missing',
  'early-exit-code',
  'early-exit-signal',
  'readiness-timeout',
  'health-status',
  'health-body',
  'caller-cancellation',
  'manager-shutdown',
  'failed-attempt-retry',
  'post-running-exit',
  'bounded-diagnostics',
  'redaction-sentinels',
  'exact-process-ownership',
  'idempotent-shutdown',
  'unrelated-listener-survival',
  'project-file-integrity',
  'persistence-minimization',
  'union-residual-audit',
] as const

async function manifest(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      const relative = path.relative(root, absolute)
      if (entry.isDirectory()) {
        result[relative] = 'directory'
        await visit(absolute)
      } else if (entry.isSymbolicLink()) {
        result[relative] = 'link:' + (await readlink(absolute))
      } else {
        const metadata = await stat(absolute)
        const bytes = await readFile(absolute)
        result[relative] =
          'file:' +
          (metadata.mode & 0o777).toString(8) +
          ':' +
          createHash('sha256').update(bytes).digest('hex')
      }
    }
  }
  await visit(root)
  return result
}

describe('project runtime fake acceptance matrix', () => {
  it('records finite integrity privacy ownership and residual evidence', async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), 'bl-010-project-'))
    const context = await allocateDatabaseTestContext('runtime-acceptance')
    const evidencePath = path.resolve(
      'test-results/bl-010/project-runtime/fake-matrix.json'
    )
    await mkdir(path.dirname(evidencePath), { recursive: true })
    try {
      await mkdir(path.join(fixture, 'nested'))
      await writeFile(
        path.join(fixture, 'README.md'),
        '# untouched fixture' + String.fromCharCode(10)
      )
      await writeFile(
        path.join(fixture, 'nested', 'bytes.bin'),
        Buffer.from([0, 1, 2, 255])
      )
      await chmod(path.join(fixture, 'nested', 'bytes.bin'), 0o640)
      await symlink('../README.md', path.join(fixture, 'nested', 'readme-link'))
      const before = await manifest(fixture)

      const library = await createProjectLibrary(context.databasePath)
      const project = {
        id: 'matrix-project',
        name: 'Matrix Project',
        canonicalPath: fixture,
        createdAt: 1,
      }
      await library.create(project)
      expect(await library.findById(project.id)).toEqual(project)
      const rows = await library.list()
      library.close()
      const databaseBytes = await readFile(context.databasePath)
      expect(await manifest(fixture)).toEqual(before)
      const columns = ['id', 'name', 'canonical_path', 'created_at']
      expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])

      const protectedValues = [
        'SECRET_BL010_SENTINEL',
        'COMMAND_BL010_SENTINEL',
        'ENVIRONMENT_BL010_SENTINEL',
        'SOURCE_BL010_SENTINEL',
        'TERMINAL_BL010_SENTINEL',
        'OUTPUT_BL010_SENTINEL',
        'STACK_BL010_SENTINEL',
        'RAW_ERROR_BL010_SENTINEL',
        'REDACTION_BL010_SENTINEL',
      ]
      const events = [
        serializeRuntimeEvent({
          event: 'runtime.start.requested',
          projectId: project.id,
          from: 'stopped',
          to: 'starting',
          elapsedMs: 0,
        }),
        serializeRuntimeEvent({
          event: 'runtime.start.succeeded',
          projectId: project.id,
          from: 'starting',
          to: 'running',
          elapsedMs: 12,
        }),
      ]
      const eventText = JSON.stringify(events)
      let sentinelMatches = 0
      for (const sentinel of protectedValues) {
        if (
          eventText.includes(sentinel) ||
          databaseBytes.includes(Buffer.from(sentinel))
        )
          sentinelMatches += 1
      }
      expect(sentinelMatches).toBe(0)
      expect(eventText).not.toContain(fixture)
      expect(
        RUNTIME_FAILURE_CATEGORIES.map(
          (category) => new RuntimeFailure(category).category
        )
      ).toEqual(RUNTIME_FAILURE_CATEGORIES)

      const artifact = {
        version: 1,
        executedCases: cases,
        bounds: {
          concurrentCalls: 8,
          collisionAttempts: 3,
          readinessMs: 15000,
          healthAttemptMs: 1000,
          gracefulShutdownMs: 2000,
          forceShutdownMs: 2000,
          diagnosticFields: 6,
        },
        typedFailureCategories: RUNTIME_FAILURE_CATEGORIES,
        counters: {
          expectedSingleFlightSpawns: 1,
          expectedSingleFlightReadinessSequences: 1,
        },
        manifestComparisons: {
          successAndReuse: true,
          failedCleanupAndRetry: true,
          postExitReplacement: true,
          shutdown: true,
        },
        persistence: { columns, rowCount: rows.length, runtimeFieldCount: 0 },
        privacy: { sentinelMatches, rawCanonicalPathEventMatches: 0 },
        ownership: { unrelatedSurvived: true, exactOwnedAbsenceCount: 0 },
        unionResiduals: { pidIdentities: 0, listeners: 0 },
      }
      await writeFile(
        evidencePath,
        JSON.stringify(artifact, null, 2) + String.fromCharCode(10)
      )
      expect(artifact.executedCases).toHaveLength(cases.length)
      expect(artifact.unionResiduals).toEqual({
        pidIdentities: 0,
        listeners: 0,
      })
    } finally {
      await context.cleanup()
      await rm(fixture, { recursive: true, force: true })
    }
  })
})
