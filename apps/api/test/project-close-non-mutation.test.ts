import {
  chmod,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { afterAll, describe, expect, it, vi } from 'vitest'

// `G-15` observes executed calls, so both filesystem module boundaries are
// instrumented for this process before any module under test binds them. Every
// wrapper records and then delegates to the real implementation unchanged, and
// only calls made while a window is open are recorded.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { instrumentFsModule } = await import('./project-close-fs-ledger.js')
  return instrumentFsModule(actual, 'node:fs')
})
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { instrumentFsModule } = await import('./project-close-fs-ledger.js')
  return instrumentFsModule(actual, 'node:fs/promises')
})

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
import { buildRuntimeUserDataPath } from '../src/project-runtime-process.js'
import {
  BL020_PRE_CLAIM_SETTLEMENTS,
  BL020_IMPORT_DELTA_VIOLATION_CODES,
  BL020_PRODUCTION_ENTRYPOINTS,
  BL020_VALIDATION_ONLY_MODULES,
  SELECTED_CLOSE_SOURCE_PATHS,
  buildCloseImportDelta,
  closeImportDeltaWriteCapableAdditions,
  computeCloseImportClosure,
  validateCloseFilesystemLedger,
  validateCloseImportDelta,
  type Bl020PreClaimSettlement,
  type Bl020ScenarioId,
  type CloseImportDelta,
  type CloseImportDeltaFacts,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
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
import { settleReconciliation } from './project-close-app-helper.js'
import {
  closeDeadlineArms,
  deferred,
  deleteProject,
  entryStateOf,
  type CloseWorld,
  type HttpResult,
  type SubjectSelector,
} from './project-close-fixtures.js'
import {
  arrangeRejection,
  executeCloseScenario,
  liveIdentity,
  navigate,
  recordedHostValues,
  REJECTION_ORDER,
  REJECTION_ROUTE_RESULT,
  until,
  type RejectionCategory,
  type ScenarioContext,
} from './project-close-matrix-support.js'
import {
  fsInstrumentation,
  openFsWindow,
  type RecordedFsCall,
} from './project-close-fs-ledger.js'
import {
  assertPublicSafe,
  buildFilesystemLedger,
  collectImportDeltaFacts,
  compareManifests,
  IMPORT_DELTA_CONTROLS,
  isProductModule,
  NARROW_FROM_ONLY_GRAMMAR,
  NON_MUTATION_LEDGER_PATH,
  observeFixtureTrees,
  readCensusBaseTexts,
  reportImportDelta,
  reportLedger,
  retainReport,
  runImportDeltaControls,
  runtimeEphemeralRoot,
  scenarioFixtureShells,
  type FixtureTreePair,
  type ImportDeltaControlOutcome,
  type LedgerReport,
  type ManifestComparison,
} from './project-close-non-mutation-support.js'

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
      let retryFaultPending = true
      app = await build({
        createProjectLibrary: async () => library,
        // The production service is composed from the application's own
        // runtime, proxy, and library; only one scenario's first attempt is
        // faulted, and every other request runs the real close path.
        createProjectCloseService: (dependencies) => {
          const realClose = createProjectCloseService(dependencies)
          return {
            async closeProject(id) {
              if (id === 'retry' && retryFaultPending) {
                retryFaultPending = false
                throw new ProjectCloseError('project_close_failed')
              }
              return realClose.closeProject(id)
            },
          }
        },
      })
      await settleReconciliation(app)

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

// ---------------------------------------------------------------------------
// T-14: filesystem non-mutation and peer isolation across every close outcome
// ---------------------------------------------------------------------------

/** What one executed outcome observed, reduced to what a report may carry. */
interface OutcomeRecord {
  readonly outcome: string
  readonly scenario: Bl020ScenarioId
  readonly settled: {
    readonly outcome: string
    readonly rejectionCategory: string | null
    readonly preClaimSettlement: Bl020PreClaimSettlement | null
    readonly routeStatus: number | null
    readonly routeCategory: string | null
    readonly publicState: string | null
    readonly routeStatuses: readonly number[]
  }
  readonly manifests: readonly ManifestComparison[]
  readonly peer: {
    readonly identityUnchanged: boolean
    readonly readinessUnchanged: boolean
    readonly stableRouteUnchanged: boolean
    readonly activeConnectionsUnchanged: boolean
    readonly registrationUnchanged: boolean
    readonly fixtureDigestUnchanged: boolean
  }
  readonly control: {
    readonly processIdentityUnchanged: boolean
    readonly listenerUnchanged: boolean
  }
  readonly ledger: LedgerReport
  readonly guardViolations: readonly string[]
}

const executed: OutcomeRecord[] = []

/** The measured `G-23` delta, produced by the guard's own executed case. */
let importDelta: CloseImportDelta | null = null

/** The repository facts that delta was derived from, kept for its controls. */
let importDeltaFacts: CloseImportDeltaFacts | null = null

/** What each executed `G-23` negative control produced. */
let importDeltaControls: readonly ImportDeltaControlOutcome[] = []

/** What the instrumentation-capture control observed a product module do. */
let capture: {
  readonly member: string
  readonly origin: string
  readonly family: string
  readonly runtimeFamilyRootUnderTmpdir: boolean
} | null = null

/** Every close outcome class this lane must execute, in Plan order. */
const REQUIRED_OUTCOMES = Object.freeze([
  'running-success',
  'retained-failed-success',
  ...REJECTION_ORDER.map((category) => 'rejected:' + category),
  'eight-concurrent-close',
  'eight-concurrent-contender',
  'repeated-close',
])

interface CaseInputs {
  readonly outcome: string
  readonly scenario: Bl020ScenarioId
  readonly arrange?: (
    world: CloseWorld,
    context: ScenarioContext
  ) => Promise<{ release?: () => Promise<void> } | void>
  readonly act?: (world: CloseWorld) => Promise<readonly HttpResult[]>
  readonly subject?: (world: CloseWorld) => SubjectSelector
  /** Runs after the ledger window closed and before the after-manifests. */
  readonly afterWindow?: (world: CloseWorld) => Promise<void>
  readonly expectViolation?: boolean
}

interface CaseResult {
  readonly row: ProjectCloseEvidenceRow
  readonly record: OutcomeRecord
  readonly calls: readonly RecordedFsCall[]
  readonly registeredProjectRoots: readonly string[]
}

/**
 * Executes one close outcome through the production route, proxy, manager, and
 * library, bracketing it with recursive manifests of both registered fixture
 * trees and with a filesystem window scoped to the close itself.
 */
async function runOutcome(inputs: CaseInputs): Promise<CaseResult> {
  const trees: {
    before: FixtureTreePair | null
    after: FixtureTreePair | null
  } = { before: null, after: null }
  let calls: readonly RecordedFsCall[] = []
  let registeredProjectRoots: readonly string[] = []
  let statuses: readonly number[] = []
  let families = { runtime: '', database: '' }
  const row = await executeCloseScenario(inputs.scenario, (world, context) => {
    let release: () => Promise<void> = async () => undefined
    const roots = {
      selectedRoot: world.selected.canonicalPath,
      peerRoot: world.peer.canonicalPath,
    }
    return {
      arrangeSelected: async () => {
        const generation = world.manager
        const arranged = await inputs.arrange?.(world, context)
        if (arranged !== undefined && arranged.release !== undefined)
          release = arranged.release
        // An arrangement that replaced the API generation dropped every entry
        // the prior generation owned, so the peer is re-established through
        // the production route before the peer observations bracket the close.
        if (world.manager !== generation) await navigate(world, world.peer.id)
        registeredProjectRoots = Object.freeze(
          (await world.library.list()).map((project) => project.canonicalPath)
        )
        families = {
          // Both families are derived from the delivered code that creates
          // them: the runtime's own ephemeral parent directory, and the
          // directory this world's isolated database actually lives in.
          runtime: runtimeEphemeralRoot(buildRuntimeUserDataPath('probe', 0)),
          database: path.dirname(context.databasePath),
        }
        trees.before = await observeFixtureTrees(roots)
      },
      act: async () => {
        const window = openFsWindow()
        try {
          const responses = await (
            inputs.act ??
            (async (target: CloseWorld) => [
              await deleteProject(target, target.selected.id),
            ])
          )(world)
          statuses = Object.freeze(responses.map((response) => response.status))
          return responses
        } finally {
          calls = window.close()
        }
      },
      settle: async () => {
        await release()
        await inputs.afterWindow?.(world)
        trees.after = await observeFixtureTrees(roots)
      },
      ...(inputs.subject === undefined
        ? {}
        : { subject: inputs.subject(world) }),
      resetLedgerBeforeAct: true,
    }
  })

  const before = trees.before
  const after = trees.after
  if (before === null || after === null)
    throw new Error('BL-020 ' + inputs.outcome + ' walked no fixture tree')
  const manifests = Object.freeze([
    compareManifests(
      'selected',
      inputs.outcome,
      before.selected,
      after.selected
    ),
    compareManifests('peer', inputs.outcome, before.peer, after.peer),
  ])

  const ledger = buildFilesystemLedger({
    calls,
    registeredProjectRoots,
    permittedRoots: [families.runtime, families.database],
  })
  const guardViolations = validateCloseFilesystemLedger(ledger)
  if (inputs.expectViolation === true) {
    expect(guardViolations).toContain('project-directory-content-non-mutation')
  } else {
    expect(guardViolations, inputs.outcome + ' G-15 ledger').toEqual([])
  }

  // Peer isolation and the unrelated control, read from the observations the
  // row bracketed around the close.
  const peer = {
    identityUnchanged: row.peerAfter.identity === row.peerBefore.identity,
    readinessUnchanged: row.peerAfter.readiness === row.peerBefore.readiness,
    stableRouteUnchanged:
      row.peerAfter.stableRoute === row.peerBefore.stableRoute,
    activeConnectionsUnchanged:
      row.peerAfter.activeConnections === row.peerBefore.activeConnections,
    registrationUnchanged:
      JSON.stringify(row.peerAfter.registration) ===
      JSON.stringify(row.peerBefore.registration),
    fixtureDigestUnchanged:
      row.peerAfter.fixture.digest === row.peerBefore.fixture.digest &&
      row.peerAfter.fixture.members === row.peerBefore.fixture.members,
  }
  for (const [dimension, held] of Object.entries(peer))
    expect(held, inputs.outcome + ' peer ' + dimension).toBe(true)
  expect(row.peerBefore.fixture.members).toBeGreaterThan(0)
  const control = {
    processIdentityUnchanged:
      row.controlAfter.processIdentity === row.controlBefore.processIdentity,
    listenerUnchanged:
      row.controlAfter.listenerAvailable ===
      row.controlBefore.listenerAvailable,
  }
  for (const [dimension, held] of Object.entries(control))
    expect(held, inputs.outcome + ' control ' + dimension).toBe(true)

  const record: OutcomeRecord = Object.freeze({
    outcome: inputs.outcome,
    scenario: inputs.scenario,
    settled: Object.freeze({
      outcome: row.outcome,
      rejectionCategory: row.rejectionCategory,
      preClaimSettlement: row.preClaimSettlement,
      routeStatus: row.routeStatus,
      routeCategory: row.routeCategory,
      publicState: row.publicState,
      routeStatuses: statuses,
    }),
    manifests,
    peer: Object.freeze(peer),
    control: Object.freeze(control),
    ledger: reportLedger(ledger, families),
    guardViolations,
  })
  executed.push(record)
  return { row, record, calls, registeredProjectRoots }
}

/** The joined contender of a contended close: it armed no close deadline. */
const contenderSubject =
  (projectId: string): SubjectSelector =>
  (invocations) => {
    const contender = invocations.find(
      (invocation) =>
        invocation.projectId === projectId &&
        closeDeadlineArms(invocation).length === 0 &&
        !invocation.admissionReads.some(
          (read) => read.projectId === projectId && read.resolvedAbsent
        )
    )
    if (contender === undefined)
      throw new Error('BL-020 contended close opened no joined contender')
    return contender
  }

/** The repeated close: its own persistence read resolved the project absent. */
const persistedAbsenceSubject =
  (projectId: string): SubjectSelector =>
  (invocations) => {
    const repeated = invocations.find(
      (invocation) =>
        invocation.projectId === projectId &&
        invocation.admissionReads.some(
          (read) => read.projectId === projectId && read.resolvedAbsent
        )
    )
    if (repeated === undefined)
      throw new Error('BL-020 repeated close never read its project absent')
    return repeated
  }

describe('BL-020 filesystem non-mutation across every close outcome', () => {
  it('instruments both filesystem module boundaries for the frozen set', async () => {
    // Importing the module is what installs its instrumentation, so both
    // boundaries are bound before any outcome executes.
    await import('node:fs')
    await import('node:fs/promises')
    const modules = fsInstrumentation()
    expect(modules.map((record) => record.module).sort()).toEqual([
      'node:fs',
      'node:fs/promises',
    ])
    for (const record of modules)
      expect(record.instrumented).toEqual([...record.available])
  })

  it('captures a write-capable call made by a product module', async () => {
    // Module-boundary instrumentation, not source scanning: the call below is
    // made by `project-library.ts` through its own `node:fs/promises` binding,
    // and must appear in the window this test opened around it.
    const database = await allocateDatabaseTestContext('bl020-t14-capture')
    const window = openFsWindow()
    let observed: readonly RecordedFsCall[] = []
    let library: ProjectLibrary | undefined
    try {
      library = await createProjectLibrary(database.databasePath)
    } finally {
      observed = window.close()
    }
    library.close()
    const productCalls = observed.filter(
      (call) => call.writeCapable && isProductModule(call.origin)
    )
    expect(productCalls.map((call) => call.origin)).toContain(
      'apps/api/src/project-library.ts'
    )
    const databaseRoot = path.dirname(database.databasePath)
    const captured = productCalls.find(
      (call) =>
        call.path === databaseRoot ||
        call.path.startsWith(databaseRoot + path.sep)
    )
    expect(captured?.member).toBe('mkdir')
    // The other permitted family is the runtime's own ephemeral root, derived
    // from the delivered path builder rather than restated here.
    const runtimeRoot = runtimeEphemeralRoot(
      buildRuntimeUserDataPath('capture-control', 0)
    )
    expect(runtimeRoot.startsWith(os.tmpdir() + path.sep)).toBe(true)
    capture = {
      member: captured?.member ?? '',
      origin: captured?.origin ?? '',
      family: 'isolated-database',
      runtimeFamilyRootUnderTmpdir: true,
    }
    await database.cleanup()
  }, 60_000)

  it('holds across a running close', async () => {
    const { row } = await runOutcome({
      outcome: 'running-success',
      scenario: 'S-28',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
      },
    })
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
    expect(row.registrationAfter).toBeNull()
  }, 300_000)

  it('holds across a retained-failed close', async () => {
    const { row } = await runOutcome({
      outcome: 'retained-failed-success',
      scenario: 'S-28',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
        await liveIdentity(world, world.selected.id).exitEarly(1)
        await until(
          'the retained failure the observed exit installs',
          () => entryStateOf(world, world.selected.id) === 'failed'
        )
      },
    })
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
  }, 300_000)

  it.each(REJECTION_ORDER.map((category) => [category, category] as const))(
    'holds across the %s admission rejection',
    async (_label, category: RejectionCategory) => {
      const [status, routeCategory] = REJECTION_ROUTE_RESULT[category]
      const { row } = await runOutcome({
        outcome: 'rejected:' + category,
        scenario: 'S-30',
        arrange: (world, context) => arrangeRejection(world, context, category),
      })
      expect(row.outcome).toBe('rejected')
      expect(row.rejectionCategory).toBe(category)
      expect(row.routeStatus).toBe(status)
      expect(row.routeCategory).toBe(routeCategory)
      expect(row.registrationAfter).not.toBeNull()
    },
    300_000
  )

  it('holds across eight concurrent closes', async () => {
    const statuses: number[] = []
    const { row } = await runOutcome({
      outcome: 'eight-concurrent-close',
      scenario: 'S-29',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
      },
      act: async (world) => {
        const responses = await Promise.all(
          Array.from({ length: 8 }, () =>
            deleteProject(world, world.selected.id)
          )
        )
        statuses.push(...responses.map((response) => response.status))
        return responses
      },
    })
    expect(statuses.filter((status) => status === 200)).toHaveLength(1)
    expect(statuses.filter((status) => status === 404)).toHaveLength(7)
    expect(row.outcome).toBe('closed')
  }, 300_000)

  it('holds for the joined contender of eight concurrent closes', async () => {
    const { row } = await runOutcome({
      outcome: 'eight-concurrent-contender',
      scenario: 'S-29',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
      },
      act: async (world) =>
        Promise.all(
          Array.from({ length: 8 }, () =>
            deleteProject(world, world.selected.id)
          )
        ),
      subject: (world) => contenderSubject(world.selected.id),
    })
    expect(row.preClaimSettlement).toBe('contender-join')
  }, 300_000)

  it('holds across a repeated close', async () => {
    const statuses: number[] = []
    const { row } = await runOutcome({
      outcome: 'repeated-close',
      scenario: 'S-29',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
      },
      act: async (world) => {
        const responses: HttpResult[] = []
        for (let attempt = 0; attempt < 3; attempt += 1)
          responses.push(await deleteProject(world, world.selected.id))
        statuses.push(...responses.map((response) => response.status))
        return responses
      },
      subject: (world) => persistedAbsenceSubject(world.selected.id),
    })
    expect(statuses).toEqual([200, 404, 404])
    expect(row.outcome).toBe('already-absent')
    expect(row.preClaimSettlement).toBe('persisted-absence')
  }, 300_000)

  it('fails its negative control: a marker written inside the selected root', async () => {
    let markerPath = ''
    const { calls, registeredProjectRoots, row } = await runOutcome({
      outcome: 'g15-negative-control',
      scenario: 'S-31',
      arrange: async (world) => {
        await navigate(world, world.selected.id)
        markerPath = path.join(
          world.selected.canonicalPath,
          'bl020-negative-control-marker'
        )
      },
      act: async (world) => {
        // A fixture close path: the marker is written from inside the close,
        // while production is suspended in the drain it invoked.
        const entered = deferred<void>()
        const hold = deferred<void>()
        world.onDrainStarted(() => entered.resolve())
        world.holdDrain(hold)
        const response = deleteProject(world, world.selected.id)
        await entered.promise
        await writeFile(markerPath, 'bl-020 negative control\n')
        hold.resolve()
        world.holdDrain(null)
        world.onDrainStarted(null)
        return [await response]
      },
      afterWindow: async () => {
        await rm(markerPath, { force: true })
      },
      expectViolation: true,
    })
    expect(row.outcome).toBe('closed')
    const violating = calls.filter(
      (call) =>
        call.writeCapable &&
        registeredProjectRoots.some((root) =>
          call.path.startsWith(root + path.sep)
        )
    )
    expect(violating.map((call) => call.member)).toContain('writeFile')
    expect(violating).toHaveLength(1)
  }, 300_000)

  it('runs G-23 over every added, modified, or renamed source file against the base revision', async () => {
    const facts = await collectImportDeltaFacts()
    const delta = buildCloseImportDelta(facts)
    expect(validateCloseImportDelta(delta)).toEqual([])

    // The measured entry list is exactly the independently measured census,
    // and every measured file carries a computed role — none is unclassified.
    expect([...delta.entries].map((entry) => entry.file).sort()).toEqual(
      [...facts.census].map((fact) => fact.file).sort()
    )
    expect(
      delta.entries
        .filter((entry) => entry.role === 'unclassified')
        .map((entry) => entry.file)
    ).toEqual([])

    // Governance is derived from reachability, never carried independently:
    // it is exactly `(K ∪ SelectedCloseSources) ∩ C`, and the closure reaches
    // no module this plan exempted.
    const closure = new Set(delta.closure)
    const selected = new Set<string>(Object.values(SELECTED_CLOSE_SOURCE_PATHS))
    for (const entry of delta.entries) {
      expect(entry.governed).toBe(entry.role === 'production')
      expect(entry.governed).toBe(
        closure.has(entry.file) || selected.has(entry.file)
      )
    }
    expect(delta.governedScope.length).toBeGreaterThan(0)
    for (const module of BL020_VALIDATION_ONLY_MODULES)
      expect(closure.has(module), module + ' is unreachable').toBe(false)
    for (const entryPoint of BL020_PRODUCTION_ENTRYPOINTS)
      expect(closure.has(entryPoint)).toBe(true)

    // Every changed selected source is governed, whatever its location.
    for (const source of selected) {
      const entry = delta.entries.find((candidate) => candidate.file === source)
      if (entry !== undefined) expect(entry.role).toBe('production')
    }

    // A file absent at the base carries an empty base import set rather than
    // being skipped, and a file present at the base resolved its base text.
    for (const entry of delta.entries) {
      expect(entry.baseTextResolved).toBe(entry.presentAtBase)
      if (!entry.presentAtBase) expect(entry.baseMembers).toEqual([])
    }

    // The corrected grammar reaches everything the delivered `from '…'`-only
    // grammar reached, and the guard passes on a tree where the validation,
    // fixture, CLI, and evidence-writer modules this plan requires do add
    // write-capable members.
    const narrow = computeCloseImportClosure(
      facts.sources,
      facts.entryPoints,
      NARROW_FROM_ONLY_GRAMMAR
    )
    for (const member of narrow) expect(closure.has(member)).toBe(true)
    expect(
      delta.entries.filter(
        (entry) =>
          !entry.governed &&
          closeImportDeltaWriteCapableAdditions(entry).length > 0
      ).length
    ).toBeGreaterThan(0)
    expect(
      delta.entries
        .filter(
          (entry) =>
            entry.governed &&
            closeImportDeltaWriteCapableAdditions(entry).length > 0
        )
        .map((entry) => entry.file)
    ).toEqual([])

    importDeltaFacts = facts
    importDelta = delta
    importDeltaControls = runImportDeltaControls(facts, delta)
  }, 300_000)

  it('compares a renamed file against its pre-rename base text', async () => {
    const facts = importDeltaFacts
    const delta = importDelta
    if (facts === null || delta === null)
      throw new Error('BL-020 T-14 measured no import delta')
    // The measurement reads a renamed file's base blob from the path it moved
    // from, so a move is compared against what it actually moved from.
    const [renamed] = await readCensusBaseTexts(facts.baseSha, [
      {
        file: SELECTED_CLOSE_SOURCE_PATHS.closeService,
        changeType: 'renamed',
        basePath: SELECTED_CLOSE_SOURCE_PATHS.runtimeManager,
      },
    ])
    const manager = facts.census.find(
      (fact) => fact.file === SELECTED_CLOSE_SOURCE_PATHS.runtimeManager
    )
    expect(renamed?.baseText).toBe(manager?.baseText)
    expect(renamed?.baseText).not.toBe(
      facts.census.find(
        (fact) => fact.file === SELECTED_CLOSE_SOURCE_PATHS.closeService
      )?.baseText
    )

    // A rename whose pre-rename text resolves validates like any other
    // modification: it is neither treated as an addition nor skipped.
    const priorPath = 'apps/api/src/project-close-before-the-rename.ts'
    const moved = buildCloseImportDelta({
      ...facts,
      census: facts.census.map((fact) =>
        fact.file === SELECTED_CLOSE_SOURCE_PATHS.closeService
          ? { ...fact, changeType: 'renamed' as const, basePath: priorPath }
          : fact
      ),
    })
    expect(validateCloseImportDelta(moved)).toEqual([])
    const entry = moved.entries.find(
      (candidate) => candidate.file === SELECTED_CLOSE_SOURCE_PATHS.closeService
    )
    expect(entry?.changeType).toBe('renamed')
    expect(entry?.basePath).toBe(priorPath)
    expect(entry?.presentAtBase).toBe(true)
    expect(entry?.baseTextResolved).toBe(true)
  }, 120_000)

  it('declares one negative control for each of the seven G-23 codes', () => {
    const designated = new Set(
      IMPORT_DELTA_CONTROLS.map((control) => control.code)
    )
    expect([...designated].sort()).toEqual(
      [...BL020_IMPORT_DELTA_VIOLATION_CODES].sort()
    )
    expect(IMPORT_DELTA_CONTROLS.length).toBeGreaterThanOrEqual(8)
  })

  it.each(
    IMPORT_DELTA_CONTROLS.map((control) => [control.name, control] as const)
  )('fails its G-23 negative control: %s', (name, control) => {
    const outcome = importDeltaControls.find((row) => row.control === name)
    if (outcome === undefined)
      throw new Error('BL-020 G-23 executed no control named ' + name)
    // The exact codes, so no condition absorbs another's failure and no
    // control passes by producing a violation it did not aim at.
    expect(outcome.violations).toEqual([...control.expected])
    expect(outcome.violations).toContain(control.code)
  })

  it('covers every outcome class and every pre-claim settlement site', () => {
    expect(executed.map((record) => record.outcome)).toEqual([
      ...REQUIRED_OUTCOMES,
      'g15-negative-control',
    ])
    const sites = new Set(
      executed
        .map((record) => record.settled.preClaimSettlement)
        .filter((site): site is Bl020PreClaimSettlement => site !== null)
    )
    for (const site of BL020_PRE_CLAIM_SETTLEMENTS)
      expect([...sites], 'pre-claim settlement site ' + site).toContain(site)
  })

  it('retains the public-safe execution ledger', async () => {
    if (importDelta === null)
      throw new Error('BL-020 T-14 measured no import delta')
    if (capture === null)
      throw new Error('BL-020 T-14 captured no product-module call')
    const report = {
      task: 'T-14',
      guards: ['G-15', 'G-23'],
      manifestAttributes: [
        'relative-membership',
        'file-content-digest',
        'non-dereferenced-link-target-digest',
        'permission-mode',
        'modification-time',
      ],
      accessTimeCompared: false,
      // What the executed ledger observes, stated so the proof's boundary is
      // read rather than assumed: every `node:fs` and `node:fs/promises` call
      // made in this process while a close was executing. Writes made by a
      // separate process or by a native binding are covered by the recursive
      // before/after manifests, which are the independent half of `G-15`.
      ledgerScope: {
        observes: 'in-process node:fs and node:fs/promises calls during close',
        outsideBoundary: [
          'writes made by a spawned runtime process',
          'writes made by a native database binding',
        ],
        boundaryCoveredBy: 'recursive before/after fixture manifests',
      },
      instrumentationCapture: capture,
      outcomes: executed,
      importDelta: reportImportDelta(importDelta),
      // Every `G-23` failure condition, the corruption that produced it, and
      // the exact codes the guard reported for it.
      importDeltaViolationCodes: [...BL020_IMPORT_DELTA_VIOLATION_CODES],
      importDeltaControls,
      filesystemNegativeControl: {
        outcome: 'g15-negative-control',
        violation: 'project-directory-content-non-mutation',
        detected: true,
        markerRemoved: true,
      },
    }
    const serialized = JSON.stringify(report, null, 2) + '\n'
    assertPublicSafe(serialized, recordedHostValues())
    // The redaction scan is not vacuous: it rejects a report carrying a value
    // only this host could know.
    expect(() =>
      assertPublicSafe(serialized + REPOSITORY_ROOT, recordedHostValues())
    ).toThrow()
    await retainReport(NON_MUTATION_LEDGER_PATH, serialized)
    expect((await readFile(NON_MUTATION_LEDGER_PATH, 'utf8')).length).toBe(
      serialized.length
    )
  }, 60_000)

  afterAll(async () => {
    // The worlds removed every tree they materialized; the empty per-scenario
    // shells this lane created are removed here, and a shell that still holds
    // anything is left alone rather than deleted.
    await scenarioFixtureShells(['S-28', 'S-29', 'S-30', 'S-31'])
  })
})
