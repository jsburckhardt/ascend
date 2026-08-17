/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import { expect } from 'vitest'

import {
  PUBLIC_RUNTIME_STATES,
  RuntimeFailure,
  deriveProjectOwnerToken,
  reconciliationOverallBoundMs,
  runtimeRestartOverallBoundMs,
} from '../src/project-runtime-contract.js'
import {
  scanProtectedCloseValues,
  validateCommittedEvidenceWriters,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
import {
  COMPONENT_LANE_PATH,
  connectionAvailable,
  deferred,
  deleteProject,
  entryStateOf,
  fireDeadline,
  listProjectsOverHttp,
  matrixConfig,
  navigateWorkbench,
  nthSubject,
  openWorkbenchWebSocket,
  performRequest,
  postRuntimeOperation,
  proxyAuditFor,
  runtimeStatesOverHttp,
  type CloseWorld,
  type HostIdentity,
  type HttpResult,
} from './project-close-fixtures.js'
import {
  REJECTION_ORDER,
  REJECTION_ROUTE_RESULT,
  arrangeRejection,
  assertRowConsistency,
  errorCategoryOf,
  executeCloseScenario,
  identitiesFor,
  liveIdentity,
  managerAudit,
  navigate,
  quarantineThroughFailedRestart,
  readDurableFields,
  responseWithDisposition,
  settleQuarantinedRestart,
  until,
  type DurableFields,
  type RejectionCategory,
} from './project-close-matrix-support.js'
import { readCommittedEvidenceWriters } from './project-close-source-guards.js'

/**
 * The twenty-seven lifecycle scenarios this module executes, in the plan's
 * order. Each one runs in its own world, against the production library,
 * manager, proxy, close service, and route over loopback, and each row is
 * assembled from what that execution produced.
 */
export const LIFECYCLE_MATRIX_SCENARIOS = Object.freeze([
  'S-38',
  'S-39',
  'S-40',
  'S-42',
  'S-43',
  'S-44',
  'S-45',
  'S-46',
  'S-47',
  'S-48',
  'S-49',
  'S-50',
  'S-51',
  'S-52',
  'S-53',
  'S-54',
  'S-55',
  'S-56',
  'S-57',
  'S-58',
  'S-59',
  'S-60',
  'S-61',
  'S-62',
  'S-63',
  'S-64',
  'S-68',
] as const)

export type LifecycleMatrixScenarioId =
  (typeof LIFECYCLE_MATRIX_SCENARIOS)[number]

/** One executed scenario: its row, what it took, and what it observed. */
export interface LifecycleScenarioResult {
  readonly scenario: LifecycleMatrixScenarioId
  readonly row: ProjectCloseEvidenceRow
  readonly durationMs: number
  readonly observations: readonly string[]
}

export interface LifecycleMatrixExecution {
  readonly rows: readonly ProjectCloseEvidenceRow[]
  readonly results: readonly LifecycleScenarioResult[]
  readonly durationMs: number
}

// ---------------------------------------------------------------------------
// Shared observation helpers
// ---------------------------------------------------------------------------

const tokenOf = (projectId: string): string =>
  deriveProjectOwnerToken(projectId)

const signalsFor = (world: CloseWorld, projectId: string): number =>
  world.ledger.signalsByProject.get(tokenOf(projectId)) ?? 0

/** The published projection for one project, read from the route that owns it. */
const publicReportOf = async (
  world: CloseWorld,
  projectId: string
): Promise<{ state: string; failureCategory: string | null } | null> =>
  (await runtimeStatesOverHttp(world))[projectId] ?? null

/** The identifiers the delivered list route reports right now. */
const listedIds = async (world: CloseWorld): Promise<readonly string[]> => {
  const response = await listProjectsOverHttp(world)
  expect(response.status).toBe(200)
  return (
    (response.body as { projects?: { id: string }[] }).projects ?? []
  ).map((project) => project.id)
}

/** The stable route's own answer, with the failure code it published. */
interface RouteAnswer {
  readonly status: number
  readonly code: string | null
}

const stableRouteAnswer = async (
  world: CloseWorld,
  projectId: string
): Promise<RouteAnswer> => {
  const response = await navigateWorkbench(world, projectId)
  return {
    status: response.status,
    code:
      (response.body as { error?: { code?: string } } | undefined)?.error
        ?.code ?? null,
  }
}

/** Waits until the subject close has installed its claim and entered the drain. */
async function untilClaimHeld(
  world: CloseWorld,
  projectId: string
): Promise<void> {
  await until(
    'the close claim to be installed for ' + projectId,
    () => world.sampleCloseClaim(projectId) !== null
  )
}

/**
 * Turns a running project's workbench into a survivor of the API process it
 * was started under. The supervised child ends from the boundary's point of
 * view — the exit the manager watched for resolves — while the process and its
 * loopback listener stay up, and every signal the shutdown then delivers
 * leaves it running. That is exactly the survivor the next boot has to
 * attribute: the old manager reports an unconfirmed release at shutdown, and
 * the replacement's reconciliation finds the process, matches its argument
 * vector, probes its listener, and decides.
 */
async function strandRunningRuntime(
  world: CloseWorld,
  projectId: string
): Promise<HostIdentity> {
  const identity = liveIdentity(world, projectId)
  identity.mode = 'unconfirmed'
  identity.settleExit({ code: 0, signal: null, addressInUse: false })
  await until(
    'the boundary recording the supervised child it can no longer confirm',
    () => entryStateOf(world, projectId) === 'failed'
  )
  return identity
}

/**
 * Restarts the API process with the runtime still alive and lets the delivered
 * reconciliation adopt it.
 */
async function adoptThroughRealApiRestart(
  world: CloseWorld
): Promise<HostIdentity> {
  await navigate(world, world.selected.id)
  const identity = await strandRunningRuntime(world, world.selected.id)
  world.reconcilePlan.projects = [world.selected]
  world.reconcilePlan.candidates = [identity]
  await world.reboot()
  await until(
    'the reconciliation to adopt the surviving runtime',
    () => entryStateOf(world, world.selected.id) === 'running'
  )
  // The adoption is the delivered one: the manager reports the surviving
  // process as the project's own generation.
  expect(world.manager.inspect(world.selected.id)?.pid).toBe(identity.pid)
  expect(identity.alive).toBe(true)
  world.reconcilePlan.projects = []
  return identity
}

// ---------------------------------------------------------------------------
// Group H — six-surface agreement and privacy
// ---------------------------------------------------------------------------

/** S-38: every surface agrees on a successful close. */
async function runS38(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    selectedId: '',
    peerId: '',
    listedBefore: [] as readonly string[],
    listedAfter: [] as readonly string[],
    routeBefore: { status: 0, code: null } as RouteAnswer,
    routeAfter: { status: 0, code: null } as RouteAnswer,
    publicBefore: null as string | null,
    publicAfter: null as string | null,
    entryAfter: null as string | null,
    startsAfterRemoval: -1,
    retiredDelta: -1,
    claimsAfter: -1,
    ownershipAfter: -1,
  }
  const row = await executeCloseScenario('S-38', (world) => {
    let startsBefore = 0
    let retiredBefore = 0
    observed.selectedId = world.selected.id
    observed.peerId = world.peer.id
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        observed.listedBefore = await listedIds(world)
        observed.routeBefore = await stableRouteAnswer(world, world.selected.id)
        observed.publicBefore =
          (await publicReportOf(world, world.selected.id))?.state ?? null
        retiredBefore = managerAudit(world).retiredProjects ?? 0
      },
      act: async () => {
        const response = await deleteProject(world, world.selected.id)
        startsBefore = world.proxyResolves.starts
        return [response]
      },
      settle: async () => {
        observed.listedAfter = await listedIds(world)
        observed.routeAfter = await stableRouteAnswer(world, world.selected.id)
        observed.publicAfter =
          (await publicReportOf(world, world.selected.id))?.state ?? null
        observed.entryAfter = entryStateOf(world, world.selected.id)
        observed.startsAfterRemoval = world.proxyResolves.starts - startsBefore
        const audit = managerAudit(world)
        observed.retiredDelta = (audit.retiredProjects ?? 0) - retiredBefore
        observed.claimsAfter = (audit.closeClaims ?? []).length
        observed.ownershipAfter = audit.ownershipRecords
      },
    }
  })
  assertRowConsistency(row)
  // Surface 1 — the route response.
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.routeCategory).toBeNull()
  // Surface 2 — the durable registration.
  expect(row.registrationAfter).toBeNull()
  expect(observed.listedBefore).toContain(observed.selectedId)
  expect(observed.listedAfter).not.toContain(observed.selectedId)
  expect(observed.listedAfter).toContain(observed.peerId)
  // Surface 3 — the published runtime projection.
  expect(observed.publicBefore).toBe('Running')
  expect(observed.publicAfter).toBeNull()
  expect(row.publicState).toBeNull()
  expect(row.failureClassification).toBeNull()
  // Surface 4 — the stable route.
  expect(observed.routeBefore.status).toBe(200)
  expect(observed.routeAfter.status).toBe(404)
  expect(observed.routeAfter.code).toBe('project_not_found')
  expect(observed.startsAfterRemoval).toBe(0)
  // Surface 5 — the emitted events.
  expect(row.projectClosedEmissions).toBe(1)
  expect(row.emittedEvents).toEqual([])
  // Surface 6 — the manager's own audits.
  expect(observed.entryAfter).toBeNull()
  expect(observed.retiredDelta).toBe(1)
  expect(observed.claimsAfter).toBe(0)
  expect(observed.ownershipAfter).toBe(1)
  expect(row.execution.confirmation?.releaseAudits).toBe(true)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)
  note(
    'six surfaces agreed on the settled close: route 200 closed, registration ' +
      'absent from persistence and the list route, no published projection, a ' +
      'stable route answering the published not-found failure with zero ' +
      'starts, one route emission and no lifecycle event, and a manager ' +
      'holding no entry, claim, or ownership record for the project'
  )
  return row
}

/** What one executed failure outcome observed, all of it read back. */
export interface FailureOutcomeSubcase {
  readonly category: RejectionCategory
  readonly routeStatus: number
  readonly routeCategory: string | null
  readonly settledCategory: string | null
  readonly registrationPresent: boolean
  readonly durableBefore: DurableFields | null
  readonly durableAfter: DurableFields | null
  readonly listedAfter: boolean
  readonly publicState: string | null
  readonly failureCategory: string | null
  readonly emittedEvents: readonly string[]
  readonly projectClosedEmissions: number
  readonly stableRoute: RouteAnswer
  readonly peerDurableBefore: DurableFields | null
  readonly peerDurableAfter: DurableFields | null
  readonly peerListed: boolean
}

/**
 * Executes one failure outcome in its own world and reads every surface back
 * from production: the route response, the registration, the published
 * projection, the stable route, the events the close window emitted, and the
 * peer's own durable fields.
 */
async function executeFailureOutcome(
  scenario: 'S-39' | 'S-61',
  category: RejectionCategory
): Promise<FailureOutcomeSubcase> {
  let record: FailureOutcomeSubcase | null = null
  try {
    await executeCloseScenario(scenario, (world, context) => {
      let holds: { release: () => Promise<void> } = {
        release: async () => undefined,
      }
      let durableBefore: DurableFields | null = null
      let peerBefore: DurableFields | null = null
      let eventsBefore = 0
      let routeLinesBefore = 0
      return {
        arrangeSelected: async () => {
          durableBefore = await readDurableFields(world, world.selected.id)
          peerBefore = await readDurableFields(world, world.peer.id)
          holds = await arrangeRejection(world, context, category)
          eventsBefore = world.events.length
          routeLinesBefore = world.routeLog.length
        },
        act: async () => {
          const response = await deleteProject(world, world.selected.id)
          const settled = world.closeOutcomes.at(-1) ?? null
          const published = await publicReportOf(world, world.selected.id)
          const listed = await listedIds(world)
          record = {
            category,
            routeStatus: response.status,
            routeCategory: errorCategoryOf(response),
            settledCategory:
              settled !== null && settled.outcome === 'rejected'
                ? settled.category
                : null,
            registrationPresent:
              (await world.library.findById(world.selected.id)) !== undefined,
            durableBefore,
            durableAfter: await readDurableFields(world, world.selected.id),
            listedAfter: listed.includes(world.selected.id),
            publicState: published?.state ?? null,
            failureCategory: published?.failureCategory ?? null,
            emittedEvents: Object.freeze([
              ...new Set(
                world.events
                  .slice(eventsBefore)
                  .filter(
                    (event) => event.projectToken === tokenOf(world.selected.id)
                  )
                  .map((event) => event.event)
              ),
            ]),
            projectClosedEmissions: world.routeLog
              .slice(routeLinesBefore)
              .filter((line) => line.includes('project.closed')).length,
            // Observed after the arrangement is released, because a route
            // arrival for a project whose start, stop, or restart is still in
            // progress joins that operation rather than answering.
            stableRoute: { status: 0, code: null },
            peerDurableBefore: peerBefore,
            peerDurableAfter: await readDurableFields(world, world.peer.id),
            peerListed: listed.includes(world.peer.id),
          }
          return [response]
        },
        settle: async () => {
          await holds.release()
          if (record !== null)
            record = {
              ...record,
              stableRoute: await stableRouteAnswer(world, world.selected.id),
            }
        },
        subject: (invocations) => invocations[0]!,
        resetLedgerBeforeAct: true,
      }
    })
  } catch (error) {
    throw new Error(
      'BL-020 ' + scenario + ' failure outcome ' + category + ' failed',
      { cause: error }
    )
  }
  if (record === null)
    throw new Error('BL-020 failure outcome recorded nothing')
  return record
}

/** Asserts one failure outcome's six surfaces agree with each other. */
function assertFailureOutcome(record: FailureOutcomeSubcase): void {
  const [status, routeCategory] = REJECTION_ROUTE_RESULT[record.category]
  // Surface 1 — the route response, and the settled result behind it.
  expect(record.settledCategory).toBe(record.category)
  expect(record.routeStatus).toBe(status)
  expect(record.routeCategory).toBe(routeCategory)
  // Surface 2 — the registration, retained and unmodified.
  expect(record.registrationPresent).toBe(true)
  expect(record.durableBefore).not.toBeNull()
  expect(record.durableAfter).toEqual(record.durableBefore)
  expect(record.listedAfter).toBe(true)
  // Surface 3 — a published projection inside the delivered vocabulary.
  expect([...PUBLIC_RUNTIME_STATES]).toContain(record.publicState)
  if (record.failureCategory !== null) expect(record.publicState).toBe('Failed')
  // Surface 4 — the stable route still resolves the retained registration.
  expect(record.stableRoute.code).not.toBe('project_not_found')
  // Surface 5 — the exact event set. The one failure that installs a truthful
  // running-to-failed transition is the unconfirmed release; every other
  // outcome emits nothing of its own, and none logs a closed disposition.
  expect(record.emittedEvents, record.category).toEqual(
    record.category === 'release-unconfirmed' ? ['runtime.health.changed'] : []
  )
  expect(record.projectClosedEmissions).toBe(0)
  // Surface 6 — the peer is untouched by any of it.
  expect(record.peerDurableBefore).not.toBeNull()
  expect(record.peerDurableAfter).toEqual(record.peerDurableBefore)
  expect(record.peerListed).toBe(true)
}

/**
 * S-39: every failure outcome the close can settle on, each executed in its
 * own world. The reported row is the `release-unconfirmed` outcome — the one
 * failure that reaches the confirmation region — and the other eight are
 * executed here and observed the same way.
 */
async function runS39(
  note: (text: string) => void,
  subcases: readonly FailureOutcomeSubcase[]
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    listedAfter: false,
  }
  const row = await executeCloseScenario('S-39', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'unconfirmed'
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      // The list route is read rather than the stable route: arriving at the
      // stable route is an acquisition, and this row's retained failure is
      // still the project's own state until something asks for a workbench.
      observed.listedAfter = (await listedIds(world)).includes(
        world.selected.id
      )
    },
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(row.routeStatus).toBe(500)
  expect(row.routeCategory).toBe('runtime_release_unconfirmed')
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('close-release-unconfirmed')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(observed.listedAfter).toBe(true)
  expect(row.emittedEvents).toEqual(['runtime.health.changed'])
  expect(row.projectClosedEmissions).toBe(0)
  // Every outcome, each with the same six surfaces read back from its own
  // world. The one this row reports is executed there as well, because its
  // stable-route surface cannot be read in this world without asking for a
  // workbench and changing the state the row is about.
  expect(subcases.map((subcase) => subcase.category)).toEqual([
    ...REJECTION_ORDER,
  ])
  for (const subcase of subcases) assertFailureOutcome(subcase)
  const reported = subcases.find(
    (subcase) => subcase.category === row.rejectionCategory
  )
  expect(reported?.stableRoute.code).not.toBe('project_not_found')
  note(
    'nine failure outcomes executed (' +
      REJECTION_ORDER.join(', ') +
      '); in every one the route response, the settled category, the retained ' +
      'registration, the published projection, the stable route, and the ' +
      'emitted event set agreed, and no repeated or foreign event was emitted'
  )
  return row
}

/** A numeric host value scanned on its own boundaries, never inside a digest. */
const bareNumberAppears = (source: string, value: number): boolean =>
  new RegExp('(?<![0-9a-zA-Z])' + String(value) + '(?![0-9a-zA-Z])', 'u').test(
    source
  )

/**
 * S-40: the redaction scan. Every protected host value this execution really
 * created is scanned for in the assembled row, in every public payload the
 * boundary returned, and in the three committed evidence writers.
 *
 * The registered canonical paths are scanned separately, because one delivered
 * public surface publishes them by contract: `GET /api/projects` is the
 * documented four-field record `id`, `name`, `canonicalPath`, `createdAt`,
 * which is the caller's own registered path echoed back. Every other surface,
 * the assembled row, and every committed writer must carry no path at all.
 */
async function runS40(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const payloads: Record<string, string> = {}
  const observed = {
    scannedSources: [] as readonly string[],
    protectedValues: [] as readonly string[],
    numericValues: [] as readonly number[],
    matches: [] as readonly string[],
    pathSources: [] as readonly string[],
    pathMatches: [] as readonly string[],
    listRouteCarriesPeerPath: false,
    listRouteCarriesClosedPath: false,
    numericMatches: [] as readonly string[],
    sentinelMatches: [] as readonly string[],
    errorSentinelMatches: [] as readonly string[],
    writerViolations: [] as readonly string[],
  }
  let protectedValues: readonly string[] = []
  let registeredPaths: readonly string[] = []
  let numericValues: readonly number[] = []
  let sentinels: readonly string[] = []
  let errorSentinels: readonly string[] = []
  const row = await executeCloseScenario('S-40', (world, context) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => {
      const response = await deleteProject(world, world.selected.id)
      payloads.closeResponse = response.text
      return [response]
    },
    settle: async () => {
      payloads.listRoute = (await listProjectsOverHttp(world)).text
      payloads.runtimeStateRoute = JSON.stringify(
        await runtimeStatesOverHttp(world)
      )
      payloads.stableRoute = (
        await navigateWorkbench(world, world.selected.id)
      ).text
      payloads.peerStableRoute = (
        await navigateWorkbench(world, world.peer.id)
      ).text
      const identities = identitiesFor(world, world.selected.id)
      expect(identities.length).toBeGreaterThan(0)
      // Every host value this execution really created: the database file,
      // the argument vectors, the user-data directories, the process start
      // times, and the authorities. None of these is public anywhere.
      protectedValues = Object.freeze([
        context.databasePath,
        'http://127.0.0.1:' + String(world.apiPort),
        '127.0.0.1:' + String(world.apiPort),
        world.control.argv.join(' '),
        '127.0.0.1:' + String(world.control.listenerPort),
        ...identities.flatMap((identity) => [
          identity.processStartTime,
          identity.userDataPath,
          identity.argv.join(' '),
          '127.0.0.1:' + String(identity.port),
          'http://127.0.0.1:' + String(identity.port),
        ]),
      ])
      registeredPaths = Object.freeze([
        world.selected.canonicalPath,
        world.peer.canonicalPath,
      ])
      observed.listRouteCarriesClosedPath = payloads.listRoute.includes(
        world.selected.canonicalPath
      )
      observed.listRouteCarriesPeerPath = payloads.listRoute.includes(
        world.peer.canonicalPath
      )
      // The identities and ports themselves, scanned on their own boundaries.
      numericValues = Object.freeze([
        world.apiPort,
        world.control.pid,
        world.control.listenerPort,
        ...identities.flatMap((identity) => [identity.pid, identity.port]),
      ])
      // Fixture file content and a credential shape: never public anywhere.
      sentinels = Object.freeze([
        'bl-020 ' + world.selected.id,
        'BEGIN PRIVATE KEY',
      ])
      // Raw error text and stack frames: scanned on the surfaces that carry
      // this execution's data. The committed writers are excluded because the
      // evidence contract names the failure taxonomy in the product-source
      // assertions it performs, which is a definition, not a leaked error.
      errorSentinels = Object.freeze([
        'Error:',
        'RuntimeFailure',
        '    at ',
        'ECONNREFUSED',
      ])
    },
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  const writers = await readCommittedEvidenceWriters()
  const sources: Record<string, string> = {
    ...payloads,
    assembledRow: JSON.stringify(row),
    evidenceModule: writers.evidenceModule,
    residualAuditCli: writers.residualAuditCli,
    matrixTest: writers.matrixTest,
  }
  // The rendered lane's committed artifact is scanned here too: it is
  // published evidence, and no host value this execution created may reach
  // it. It is excluded from the numeric scan alone, because the identities
  // this fixture allocates are small sequential integers and a rendered
  // artifact's counts are small integers by nature — a bare-number match
  // there would be a coincidence, not a leak, and the web lane proves that
  // artifact against its own values.
  const componentArtifact = await readFile(COMPONENT_LANE_PATH, 'utf8')
  const scan = scanProtectedCloseValues({
    sources: { ...sources, componentArtifact },
    protectedValues,
  })
  // Everything except the delivered project-list record, which publishes the
  // registered path as one of its four documented fields.
  const pathSources = Object.fromEntries(
    Object.entries({ ...sources, componentArtifact }).filter(
      ([name]) => name !== 'listRoute'
    )
  )
  const pathScan = scanProtectedCloseValues({
    sources: pathSources,
    protectedValues: registeredPaths,
  })
  const executionSources: Record<string, string> = {
    ...payloads,
    assembledRow: JSON.stringify(row),
  }
  observed.scannedSources = scan.declaredSources
  observed.protectedValues = protectedValues
  observed.numericValues = numericValues
  observed.matches = scan.matches
  observed.pathSources = pathScan.declaredSources
  observed.pathMatches = pathScan.matches
  observed.numericMatches = Object.freeze(
    Object.entries(sources).flatMap(([name, text]) =>
      numericValues
        .filter((value) => bareNumberAppears(text, value))
        .map((value) => name + ':' + String(value))
    )
  )
  observed.sentinelMatches = Object.freeze(
    Object.entries(sources).flatMap(([name, text]) =>
      sentinels
        .filter((sentinel) => text.includes(sentinel))
        .map((sentinel) => name + ':' + sentinel)
    )
  )
  observed.errorSentinelMatches = Object.freeze(
    Object.entries(executionSources).flatMap(([name, text]) =>
      errorSentinels
        .filter((sentinel) => text.includes(sentinel))
        .map((sentinel) => name + ':' + sentinel)
    )
  )
  observed.writerViolations = validateCommittedEvidenceWriters(writers)
  expect(observed.scannedSources).toHaveLength(10)
  expect(observed.pathSources).toHaveLength(9)
  expect(componentArtifact.length).toBeGreaterThan(0)
  expect(protectedValues.length).toBeGreaterThan(8)
  expect(registeredPaths).toHaveLength(2)
  expect(numericValues.length).toBeGreaterThan(3)
  expect(observed.matches).toEqual([])
  expect(observed.pathMatches).toEqual([])
  expect(observed.numericMatches).toEqual([])
  expect(observed.sentinelMatches).toEqual([])
  expect(observed.errorSentinelMatches).toEqual([])
  expect(observed.writerViolations).toEqual([])
  // The one surface a registered path is published on is the delivered
  // four-field project record, and the closed project is no longer in it.
  expect(observed.listRouteCarriesPeerPath).toBe(true)
  expect(observed.listRouteCarriesClosedPath).toBe(false)
  note(
    'scanned ' +
      String(observed.scannedSources.length) +
      ' sources — the assembled row, five public payloads, the three ' +
      'committed evidence writers, and the committed component artifact — ' +
      'against ' +
      String(protectedValues.length) +
      ' protected host values, ' +
      String(numericValues.length) +
      ' host identities and ports, and two content and credential sentinels, ' +
      'with no match anywhere; four raw error and stack sentinels were ' +
      'scanned across the row and the five public payloads with no match; ' +
      'the two registered canonical paths were scanned across the other ' +
      String(observed.pathSources.length) +
      ' sources with no match, and appear only in the delivered ' +
      'four-field project-list record, which no longer carries the closed ' +
      'project at all'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group I — concurrency and cross-operation contention
// ---------------------------------------------------------------------------

/** S-42: a close arriving while a real start is in progress. */
async function runS42(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    liveIdentities: -1,
    ownershipAfter: -1,
    entryAfter: null as string | null,
    generationMatches: false,
    signals: -1,
  }
  const row = await executeCloseScenario('S-42', (world, context) => {
    let holds: { release: () => Promise<void> } = {
      release: async () => undefined,
    }
    return {
      arrangeSelected: async () => {
        holds = await arrangeRejection(world, context, 'start-in-progress')
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        // The held start is released and completes: the project keeps exactly
        // one authoritative generation, the one that start produced.
        await holds.release()
        const identities = identitiesFor(world, world.selected.id).filter(
          (identity) => identity.alive
        )
        observed.liveIdentities = identities.length
        observed.ownershipAfter = managerAudit(world).ownershipRecords
        observed.entryAfter = entryStateOf(world, world.selected.id)
        observed.generationMatches =
          world.manager.inspect(world.selected.id)?.pid === identities[0]?.pid
        observed.signals = signalsFor(world, world.selected.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('start-in-progress')
  expect(row.preClaimSettlement).toBe('start-in-progress')
  expect(row.routeStatus).toBe(409)
  expect(row.routeCategory).toBe('runtime_start_in_progress')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(row.execution.drainInvocations).toBe(0)
  expect(observed.liveIdentities).toBe(1)
  expect(observed.ownershipAfter).toBe(2)
  expect(observed.entryAfter).toBe('running')
  expect(observed.generationMatches).toBe(true)
  expect(observed.signals).toBe(0)
  note(
    'the close was refused before any claim while the start was in progress; ' +
      'the released start produced exactly one authoritative generation and ' +
      'the registration was untouched'
  )
  return row
}

/** S-43: a start arriving while a close claim is installed. */
async function runS43(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    startStatus: -1,
    startCode: null as string | null,
    refusedDelta: -1,
    claimLateWork: -1,
    identitiesDuring: -1,
    identitiesAfter: -1,
    startAttempts: -1,
    entryAfter: null as string | null,
  }
  const row = await executeCloseScenario('S-43', (world) => {
    const drainHold = deferred<void>()
    let refusedBefore = 0
    let startsBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        refusedBefore = managerAudit(world).refusedLateAcquisitions ?? 0
        startsBefore =
          world.proxyResolves.startsByProject.get(world.selected.id) ?? 0
      },
      act: async () => {
        world.holdDrain(drainHold)
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        // A real navigation arrives at the stable route while the claim is
        // installed: the proxy resolves the project and requests the
        // acquisition, which the manager refuses.
        const attempt = await navigateWorkbench(world, world.selected.id)
        observed.startStatus = attempt.status
        observed.startCode =
          (attempt.body as { error?: { code?: string } } | undefined)?.error
            ?.code ?? null
        observed.claimLateWork =
          world.sampleCloseClaim(world.selected.id)?.lateWork ?? -1
        observed.refusedDelta =
          (managerAudit(world).refusedLateAcquisitions ?? 0) - refusedBefore
        observed.identitiesDuring = identitiesFor(
          world,
          world.selected.id
        ).length
        observed.startAttempts =
          (world.proxyResolves.startsByProject.get(world.selected.id) ?? 0) -
          startsBefore
        drainHold.resolve()
        world.holdDrain(null)
        return [await closing]
      },
      settle: async () => {
        observed.identitiesAfter = identitiesFor(
          world,
          world.selected.id
        ).length
        observed.entryAfter = entryStateOf(world, world.selected.id)
      },
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(observed.startStatus).toBe(503)
  expect(observed.startCode).toBe('workbench_closing')
  expect(observed.startAttempts).toBe(1)
  expect(observed.refusedDelta).toBeGreaterThanOrEqual(1)
  expect(row.managerAudit.refusedLateAcquisitionsDelta).toBeGreaterThanOrEqual(
    1
  )
  // The refused acquisition installed nothing: no generation was created, the
  // claim's late work stayed at zero, and the close still confirmed.
  expect(observed.identitiesDuring).toBe(1)
  expect(observed.identitiesAfter).toBe(1)
  expect(observed.claimLateWork).toBe(0)
  expect(row.managerAudit.claimLateWork).toBe(0)
  expect(observed.entryAfter).toBeNull()
  expect(row.execution.refusedAcquisitions).toEqual([])
  note(
    'the late start was refused runtime-closing with 503 workbench_closing, ' +
      'installed no generation, raised the manager refusal counter, and left ' +
      "the claim's late work at zero"
  )
  return row
}

/** S-44: a close arriving while a stop is in progress, then retried. */
async function runS44(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    refusedStatus: -1,
    refusedCategory: null as string | null,
    stopStatus: -1,
    entryAfterStop: null as string | null,
    signalsFromStop: -1,
    terminatesFromStop: -1,
    identities: -1,
  }
  const row = await executeCloseScenario('S-44', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      const hold = deferred<void>()
      identity.releaseHold = hold
      const stopping = postRuntimeOperation(world, world.selected.id, 'stop')
      await until(
        'the selected project to be stopping',
        () => entryStateOf(world, world.selected.id) === 'stopping'
      )
      const refused = await deleteProject(world, world.selected.id)
      observed.refusedStatus = refused.status
      observed.refusedCategory = errorCategoryOf(refused)
      hold.resolve()
      identity.releaseHold = null
      const stopped = await stopping
      observed.stopStatus = stopped.status
      observed.entryAfterStop = entryStateOf(world, world.selected.id)
      observed.signalsFromStop = signalsFor(world, world.selected.id)
      observed.terminatesFromStop = world.ledger.calls.terminate
      observed.identities = identitiesFor(world, world.selected.id).length
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(observed.refusedStatus).toBe(409)
  expect(observed.refusedCategory).toBe('runtime_stop_in_progress')
  expect(observed.stopStatus).toBe(200)
  expect(observed.entryAfterStop).toBe('registered')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.registrationAfter).toBeNull()
  // Exactly one effective release: the stop performed it, and the retried
  // close released nothing because there was nothing left to release.
  expect(observed.signalsFromStop).toBe(1)
  expect(observed.terminatesFromStop).toBe(1)
  expect(observed.identities).toBe(1)
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(row.residual.selectedRuntimeProcesses).toBe(0)
  note(
    'the close during the stop was refused stop-in-progress; the retried ' +
      'close settled closed with exactly one effective release across both'
  )
  return row
}

/** S-45: a stop arriving while a close claim is installed. */
async function runS45(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    stopStatus: -1,
    stopCategory: null as string | null,
    refusedDelta: -1,
    durableBefore: null as DurableFields | null,
    durableDuring: null as DurableFields | null,
    entryDuring: null as string | null,
    entryUnchanged: false,
    ownershipDuring: -1,
    ownershipBefore: -1,
    signalsDuring: -1,
  }
  const row = await executeCloseScenario('S-45', (world) => {
    const drainHold = deferred<void>()
    let refusedBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        observed.durableBefore = await readDurableFields(
          world,
          world.selected.id
        )
        observed.ownershipBefore = managerAudit(world).ownershipRecords
        refusedBefore = managerAudit(world).refusedLateAcquisitions ?? 0
      },
      act: async () => {
        world.holdDrain(drainHold)
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        const entryBefore = entryStateOf(world, world.selected.id)
        const stopped = await postRuntimeOperation(
          world,
          world.selected.id,
          'stop'
        )
        observed.stopStatus = stopped.status
        observed.stopCategory = errorCategoryOf(stopped)
        observed.entryDuring = entryStateOf(world, world.selected.id)
        observed.entryUnchanged = observed.entryDuring === entryBefore
        observed.durableDuring = await readDurableFields(
          world,
          world.selected.id
        )
        observed.ownershipDuring = managerAudit(world).ownershipRecords
        observed.signalsDuring = signalsFor(world, world.selected.id)
        observed.refusedDelta =
          (managerAudit(world).refusedLateAcquisitions ?? 0) - refusedBefore
        drainHold.resolve()
        world.holdDrain(null)
        return [await closing]
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.stopStatus).toBe(409)
  expect(observed.stopCategory).toBe('runtime_close_in_progress')
  expect(observed.refusedDelta).toBe(1)
  // Nothing mutated: the durable row, the entry, the ownership index, and the
  // release primitives were all exactly as the refused stop found them.
  expect(observed.durableDuring).toEqual(observed.durableBefore)
  expect(observed.entryUnchanged).toBe(true)
  expect(observed.entryDuring).toBe('running')
  expect(observed.ownershipDuring).toBe(observed.ownershipBefore)
  expect(observed.signalsDuring).toBe(0)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  note(
    'the stop during the installed claim was refused ' +
      'runtime_close_in_progress with 409, mutated nothing it observed, and ' +
      'the close it contended with settled closed'
  )
  return row
}

/** S-46: a close arriving while a restart is in progress, then retried. */
async function runS46(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    refusedStatus: -1,
    refusedCategory: null as string | null,
    quarantineAfterArrange: -1,
    pendingAfterArrange: -1,
    quarantineAtSettlement: -1,
    pendingAtSettlement: -1,
    survivors: -1,
  }
  const row = await executeCloseScenario('S-46', (world) => ({
    arrangeSelected: async () => {
      const hold = deferred<void>()
      const restart = await quarantineThroughFailedRestart(
        world,
        world.selected.id,
        hold
      )
      await until(
        'the selected project to be restarting',
        () => entryStateOf(world, world.selected.id) === 'restarting'
      )
      const refused = await deleteProject(world, world.selected.id)
      observed.refusedStatus = refused.status
      observed.refusedCategory = errorCategoryOf(refused)
      hold.resolve()
      await settleQuarantinedRestart(
        world,
        world.selected.id,
        await restart.settled
      )
      const audit = managerAudit(world)
      observed.quarantineAfterArrange = audit.quarantinedOwnershipRecords ?? 0
      observed.pendingAfterArrange = audit.pendingAdmissions ?? 0
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      const audit = managerAudit(world)
      observed.quarantineAtSettlement = audit.quarantinedOwnershipRecords ?? 0
      observed.pendingAtSettlement = audit.pendingAdmissions ?? 0
      observed.survivors = identitiesFor(world, world.selected.id).filter(
        (identity) => identity.alive
      ).length
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(observed.refusedStatus).toBe(409)
  expect(observed.refusedCategory).toBe('runtime_restart_in_progress')
  expect(observed.quarantineAfterArrange).toBe(1)
  expect(observed.pendingAfterArrange).toBe(1)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.requiresQuarantineResolution).toBe(true)
  expect(row.declaredBound).toBe('B-6')
  // No replacement generation survives the retried close.
  expect(observed.quarantineAtSettlement).toBe(0)
  expect(observed.pendingAtSettlement).toBe(0)
  expect(observed.survivors).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note(
    'the close during the restart was refused restart-in-progress; the ' +
      'retried close resolved the quarantined replacement and its admission ' +
      'under the quarantine bound, leaving no surviving generation'
  )
  return row
}

/** S-47: a restart arriving while a close claim is installed. */
async function runS47(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    restartStatus: -1,
    restartCategory: null as string | null,
    refusedDelta: -1,
    pendingDuring: -1,
    quarantineDuring: -1,
    identitiesDuring: -1,
    routeAfter: { status: 0, code: null } as RouteAnswer,
    startsAfter: -1,
  }
  const row = await executeCloseScenario('S-47', (world) => {
    const drainHold = deferred<void>()
    let refusedBefore = 0
    let startsBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        refusedBefore = managerAudit(world).refusedLateAcquisitions ?? 0
      },
      act: async () => {
        world.holdDrain(drainHold)
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        const restarted = await postRuntimeOperation(
          world,
          world.selected.id,
          'restart'
        )
        observed.restartStatus = restarted.status
        observed.restartCategory = errorCategoryOf(restarted)
        const audit = managerAudit(world)
        observed.pendingDuring = audit.pendingAdmissions ?? 0
        observed.quarantineDuring = audit.quarantinedOwnershipRecords ?? 0
        observed.identitiesDuring = identitiesFor(
          world,
          world.selected.id
        ).length
        observed.refusedDelta =
          (audit.refusedLateAcquisitions ?? 0) - refusedBefore
        drainHold.resolve()
        world.holdDrain(null)
        const response = await closing
        startsBefore = world.proxyResolves.starts
        return [response]
      },
      settle: async () => {
        observed.routeAfter = await stableRouteAnswer(world, world.selected.id)
        observed.startsAfter = world.proxyResolves.starts - startsBefore
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.restartStatus).toBe(409)
  expect(observed.restartCategory).toBe('runtime_close_in_progress')
  expect(observed.refusedDelta).toBe(1)
  // The refused restart created no admission, no quarantine, and no
  // replacement identity.
  expect(observed.pendingDuring).toBe(0)
  expect(observed.quarantineDuring).toBe(0)
  expect(observed.identitiesDuring).toBe(1)
  expect(row.outcome).toBe('closed')
  expect(row.managerAudit.pendingAdmissions).toBe(0)
  expect(row.managerAudit.quarantinedOwnershipRecords).toBe(0)
  expect(row.residual.pendingAdmissions).toBe(0)
  expect(row.residual.quarantinedIdentities).toBe(0)
  // No stale route target survives: the stable route answers the published
  // not-found failure and starts nothing.
  expect(observed.routeAfter.status).toBe(404)
  expect(observed.routeAfter.code).toBe('project_not_found')
  expect(observed.startsAfter).toBe(0)
  note(
    'the restart during the installed claim was refused ' +
      'runtime_close_in_progress with 409, admitted nothing, quarantined ' +
      'nothing, and left no stale route target behind the settled close'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group J — reconciliation and adoption
// ---------------------------------------------------------------------------

/** What the delivered reconciliation recorded for one project, read back. */
interface ReconciliationRecord {
  readonly outcome: string | null
  readonly refusalReason: string | null
  readonly absenceProof: string | null
}

const reconciliationRecordOf = (
  world: CloseWorld,
  projectId: string
): ReconciliationRecord | null => {
  const inspect = world.manager.inspectReconciliation
  if (inspect === undefined)
    throw new Error(
      'BL-020 runtime manager under test exposes no inspectReconciliation()'
    )
  const record = inspect
    .call(world.manager)
    .projects.find((project) => project.projectToken === tokenOf(projectId))
  return record === undefined
    ? null
    : Object.freeze({
        outcome: record.outcome,
        refusalReason: record.refusalReason,
        absenceProof: record.absenceProof,
      })
}

/** S-48: closing a runtime the reconciliation adopted after a real restart. */
async function runS48(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    selectedId: '',
    peerId: '',
    adoptedPid: -1,
    adoptedRecord: null as ReconciliationRecord | null,
    processAbsent: false,
    listenerAbsent: false,
    signals: -1,
    entryAfter: null as string | null,
    routeAfter: { status: 0, code: null } as RouteAnswer,
    listedAfter: [] as readonly string[],
  }
  const row = await executeCloseScenario('S-48', (world) => {
    let adopted: HostIdentity | null = null
    observed.selectedId = world.selected.id
    observed.peerId = world.peer.id
    return {
      arrangeSelected: async () => {
        adopted = await adoptThroughRealApiRestart(world)
        observed.adoptedPid = adopted.pid
        observed.adoptedRecord = reconciliationRecordOf(
          world,
          world.selected.id
        )
        // The replacement boot serves the peer through the same production
        // path it serves every project with.
        await navigate(world, world.peer.id)
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        observed.processAbsent = !(adopted?.alive ?? true)
        observed.listenerAbsent = (await adopted?.listenerAbsent()) ?? false
        observed.signals = signalsFor(world, world.selected.id)
        observed.entryAfter = entryStateOf(world, world.selected.id)
        observed.routeAfter = await stableRouteAnswer(world, world.selected.id)
        observed.listedAfter = await listedIds(world)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.adoptedRecord?.outcome).toBe('adopted')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  // The exact release triple, re-observed from the host the adoption owned:
  // the process is gone, its group holds nothing, and its listener is free.
  expect(observed.processAbsent).toBe(true)
  expect(row.residual.attributableDescendants).toBe(0)
  expect(observed.listenerAbsent).toBe(true)
  expect(row.execution.confirmation?.releaseAudits).toBe(true)
  expect(observed.signals).toBe(1)
  // The registration is gone from persistence, from the list route, and from
  // the manager, and the stable route serves the published failure.
  expect(row.registrationAfter).toBeNull()
  expect(observed.listedAfter).not.toContain(observed.selectedId)
  expect(observed.listedAfter).toContain(observed.peerId)
  expect(observed.entryAfter).toBeNull()
  expect(observed.routeAfter.status).toBe(404)
  expect(observed.routeAfter.code).toBe('project_not_found')
  note(
    'a real API restart left the workbench running, the delivered ' +
      'reconciliation adopted it, and the close of the adopted generation ' +
      'produced the exact release triple with the registration absent and ' +
      'the stable route serving the published not-found failure'
  )
  return row
}

/** S-49: a close arriving while the entry is still reconciling. */
async function runS49(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    entryDuring: null as string | null,
    recordDuring: null as ReconciliationRecord | null,
    recordAfter: null as ReconciliationRecord | null,
    identitiesDuring: -1,
    identitiesAfter: -1,
    signals: -1,
    terminates: -1,
  }
  const row = await executeCloseScenario('S-49', (world, context) => {
    let holds: { release: () => Promise<void> } = {
      release: async () => undefined,
    }
    return {
      arrangeSelected: async () => {
        holds = await arrangeRejection(world, context, 'reconcile-in-progress')
        observed.entryDuring = entryStateOf(world, world.selected.id)
        observed.recordDuring = reconciliationRecordOf(world, world.selected.id)
        observed.identitiesDuring = identitiesFor(
          world,
          world.selected.id
        ).length
        await navigate(world, world.peer.id)
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        observed.signals = signalsFor(world, world.selected.id)
        observed.terminates = world.ledger.calls.terminate
        observed.identitiesAfter = identitiesFor(
          world,
          world.selected.id
        ).length
        await holds.release()
        observed.recordAfter = reconciliationRecordOf(world, world.selected.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.entryDuring).toBe('reconciling')
  expect(observed.recordDuring?.outcome).toBeNull()
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('reconcile-in-progress')
  expect(row.preClaimSettlement).toBe('reconcile-in-progress')
  expect(row.routeStatus).toBe(409)
  expect(row.routeCategory).toBe('runtime_reconcile_in_progress')
  expect(row.declaredBound).toBe('B-20')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  // Zero release work and zero adoption attempts: the refusal is at the head.
  expect(observed.signals).toBe(0)
  expect(observed.terminates).toBe(0)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(observed.identitiesDuring).toBe(0)
  expect(observed.identitiesAfter).toBe(0)
  expect(observed.recordAfter?.outcome).toBe('absent')
  note(
    'the close arriving at a reconciling entry was refused ' +
      'reconcile-in-progress before any claim, delivered no signal and no ' +
      'terminate, and attempted no adoption: the reconciliation it found in ' +
      'flight settled on its own afterwards'
  )
  return row
}

/** S-50: a close of a failed entry the reconciliation could not resolve. */
async function runS50(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    record: null as ReconciliationRecord | null,
    publishedFailure: null as string | null,
    survivorAlive: false,
    durableBefore: null as DurableFields | null,
    durableAfter: null as DurableFields | null,
    signals: -1,
  }
  const row = await executeCloseScenario('S-50', (world, context) => ({
    arrangeSelected: async () => {
      await arrangeRejection(world, context, 'reconcile-unresolved')
      observed.record = reconciliationRecordOf(world, world.selected.id)
      observed.publishedFailure =
        (await publicReportOf(world, world.selected.id))?.failureCategory ??
        null
      observed.survivorAlive = liveIdentity(world, world.selected.id).alive
      observed.durableBefore = await readDurableFields(world, world.selected.id)
      await navigate(world, world.peer.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.durableAfter = await readDurableFields(world, world.selected.id)
      observed.signals = signalsFor(world, world.selected.id)
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(observed.record?.outcome).toBe('unresolved')
  expect(observed.publishedFailure).toBe('reconcile-unconfirmed')
  expect(observed.survivorAlive).toBe(true)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('reconcile-unresolved')
  expect(row.preClaimSettlement).toBe('reconcile-unresolved')
  expect(row.routeStatus).toBe(409)
  expect(row.routeCategory).toBe('runtime_reconcile_unresolved')
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('reconcile-unconfirmed')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(observed.durableAfter).toEqual(observed.durableBefore)
  expect(observed.signals).toBe(0)
  note(
    'the retained reconcile-unconfirmed failure refused the close before any ' +
      'claim, kept its published condition observable, and left the four ' +
      'durable fields exactly as the close found them'
  )
  return row
}

/** S-51: a close after the reconciliation resolved to an adopted runtime. */
async function runS51(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    record: null as ReconciliationRecord | null,
    ownershipAfterAdoption: -1,
    ownershipAfterPeer: -1,
    signals: -1,
    terminatedProjects: [] as readonly string[],
    survivors: -1,
  }
  const row = await executeCloseScenario('S-51', (world) => ({
    arrangeSelected: async () => {
      await adoptThroughRealApiRestart(world)
      observed.record = reconciliationRecordOf(world, world.selected.id)
      observed.ownershipAfterAdoption = managerAudit(world).ownershipRecords
      await navigate(world, world.peer.id)
      observed.ownershipAfterPeer = managerAudit(world).ownershipRecords
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.signals = signalsFor(world, world.selected.id)
      observed.terminatedProjects = [...world.ledger.terminatedProjects]
      observed.survivors = identitiesFor(world, world.selected.id).filter(
        (identity) => identity.alive
      ).length
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(observed.record?.outcome).toBe('adopted')
  // The adoption really registered ownership. The replacement boot starts with
  // none — the boundary that owned the peer is gone — so the adopted
  // generation is the one record the new manager holds, and the peer's own
  // record is added when the replacement serves it.
  expect(observed.ownershipAfterAdoption).toBe(1)
  expect(observed.ownershipAfterPeer).toBe(2)
  expect(row.outcome).toBe('closed')
  expect(observed.signals).toBe(1)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)
  expect(row.execution.signalCallsByProject[row.projectTokens[1]!]).toBe(0)
  expect(observed.terminatedProjects).toEqual([row.projectTokens[0]])
  expect(observed.survivors).toBe(0)
  for (const value of Object.values(row.residual)) expect(value).toBe(0)
  note(
    'the close of the adopted generation delivered exactly one signal, to ' +
      "the adopted project's own identity and to no other, and every " +
      'residual class re-observed zero'
  )
  return row
}

/** S-52: a close after the reconciliation resolved to positive absence. */
async function runS52(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    record: null as ReconciliationRecord | null,
    entryBefore: null as string | null,
    identitiesBefore: -1,
    identitiesAfter: -1,
    signals: -1,
    terminates: -1,
    ownershipBefore: -1,
  }
  const row = await executeCloseScenario('S-52', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      // The workbench really leaves: its listener closes, its process ends,
      // and the boundary records the early exit it observed. The replacement
      // boot then has a project to reconcile and no candidate to find.
      await liveIdentity(world, world.selected.id).exitEarly()
      await until(
        'the boundary recording the early exit it observed',
        () => entryStateOf(world, world.selected.id) === 'failed'
      )
      world.reconcilePlan.projects = [world.selected]
      world.reconcilePlan.candidates = []
      await world.reboot()
      await until(
        'the reconciliation to resolve the absence it observed',
        () => entryStateOf(world, world.selected.id) === 'registered'
      )
      world.reconcilePlan.projects = []
      observed.record = reconciliationRecordOf(world, world.selected.id)
      observed.entryBefore = entryStateOf(world, world.selected.id)
      observed.identitiesBefore = identitiesFor(world, world.selected.id).length
      observed.ownershipBefore = managerAudit(world).ownershipRecords
      await navigate(world, world.peer.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.identitiesAfter = identitiesFor(world, world.selected.id).length
      observed.signals = signalsFor(world, world.selected.id)
      observed.terminates = world.ledger.calls.terminate
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(observed.record?.outcome).toBe('absent')
  expect(observed.record?.absenceProof).toBe('no-candidate-complete-scan')
  expect(observed.entryBefore).toBe('registered')
  // Positive absence owns nothing: the replacement boot holds no ownership
  // record for the project it proved gone.
  expect(observed.ownershipBefore).toBe(0)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  // Zero signals and no adoption attempt: the reconciliation proved absence
  // and the close had nothing to release.
  expect(observed.signals).toBe(0)
  expect(observed.terminates).toBe(0)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(observed.identitiesAfter).toBe(observed.identitiesBefore)
  expect(row.registrationAfter).toBeNull()
  note(
    'the reconciliation proved positive absence from a complete scan with no ' +
      'candidate, and the close that followed settled closed with zero ' +
      'signals, no terminate, and no adoption attempt'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group K — stale work, interruption, and shutdown
// ---------------------------------------------------------------------------

/** S-53: a stop settlement that arrives after the project was retired. */
async function runS53(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    lateDelta: -1,
    entryAfterLate: null as string | null,
    eventsAfterLate: [] as readonly string[],
    cleanupAfterLate: false,
    identitiesAfterLate: -1,
    ownershipAfterLate: -1,
    signals: -1,
  }
  const row = await executeCloseScenario('S-53', (world) => {
    let identity: HostIdentity | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        identity = liveIdentity(world, world.selected.id)
        // The process leaves without its launcher observing the exit, so the
        // exit the manager is still awaiting can arrive after the close.
        await identity.vanish()
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        const before = managerAudit(world).lateCloseSettlements ?? 0
        const eventsBefore = world.events.length
        // The stop settlement the manager was still awaiting arrives now, for
        // a project it retired while the settlement was outstanding.
        identity?.settleExit({ code: 0, signal: null, addressInUse: false })
        await until(
          'the manager accounting the late settlement it refused to apply',
          () => (managerAudit(world).lateCloseSettlements ?? 0) === before + 1
        )
        const audit = managerAudit(world)
        observed.lateDelta = (audit.lateCloseSettlements ?? 0) - before
        observed.entryAfterLate = entryStateOf(world, world.selected.id)
        observed.eventsAfterLate = Object.freeze(
          world.events
            .slice(eventsBefore)
            .filter(
              (event) => event.projectToken === tokenOf(world.selected.id)
            )
            .map((event) => event.event)
        )
        observed.cleanupAfterLate =
          world.manager.lastCleanup(world.selected.id) !== undefined
        observed.identitiesAfterLate = identitiesFor(
          world,
          world.selected.id
        ).length
        observed.ownershipAfterLate = audit.ownershipRecords
        observed.signals = signalsFor(world, world.selected.id)
      },
      declaresLateSettlement: true,
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  // The late settlement was accounted and applied to nothing at all.
  expect(observed.lateDelta).toBe(1)
  expect(row.managerAudit.lateCloseSettlementsDelta).toBe(1)
  expect(row.managerAudit.declaresLateSettlement).toBe(true)
  expect(observed.entryAfterLate).toBeNull()
  expect(observed.eventsAfterLate).toEqual([])
  expect(observed.cleanupAfterLate).toBe(false)
  expect(observed.identitiesAfterLate).toBe(1)
  expect(observed.ownershipAfterLate).toBe(1)
  // The vanished identity was audited absent rather than signalled.
  expect(observed.signals).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note(
    'the stop settlement arriving for the retired project installed no entry, ' +
      'emitted no event, and recorded no cleanup, while the manager raised ' +
      'lateCloseSettlements by exactly one'
  )
  return row
}

/** S-54: a restart settlement that arrives while the project is claimed. */
async function runS54(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    restartStatus: -1,
    restartCategory: null as string | null,
    pendingAfterDetach: -1,
    entryAfterDetach: null as string | null,
    lateReplacementDelta: -1,
    identitiesAfter: -1,
    pendingAfterClose: -1,
    signals: -1,
  }
  const row = await executeCloseScenario('S-54', (world) => {
    const hold = deferred<void>()
    let lateBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        // The replacement attempt never returns while the hold is installed:
        // the restart's own overall bound fires and detaches its admission.
        world.setLaunch(async () => {
          await hold.promise
          throw new RuntimeFailure('spawn-error')
        })
        const restarting = postRuntimeOperation(
          world,
          world.selected.id,
          'restart'
        )
        await until(
          'the prior generation to be released and the replacement pending',
          () =>
            (managerAudit(world).pendingAdmissions ?? 0) === 1 &&
            managerAudit(world).ownershipRecords === 1
        )
        fireDeadline(
          world.scheduler,
          runtimeRestartOverallBoundMs(matrixConfig, false)
        )
        const restarted = await restarting
        observed.restartStatus = restarted.status
        observed.restartCategory = errorCategoryOf(restarted)
        observed.pendingAfterDetach = managerAudit(world).pendingAdmissions ?? 0
        observed.entryAfterDetach = entryStateOf(world, world.selected.id)
        lateBefore = managerAudit(world).lateReplacementSettlements ?? 0
      },
      act: async () => {
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        await until(
          'the close to reach the admission it must resolve',
          () => world.closeInvocations.at(-1)?.drainInvocations === 1
        )
        // The detached replacement settles now, while the claim is installed.
        hold.resolve()
        await until(
          'the manager accounting the late replacement settlement',
          () =>
            (managerAudit(world).lateReplacementSettlements ?? 0) ===
            lateBefore + 1
        )
        observed.lateReplacementDelta =
          (managerAudit(world).lateReplacementSettlements ?? 0) - lateBefore
        return [await closing]
      },
      settle: async () => {
        observed.identitiesAfter = identitiesFor(
          world,
          world.selected.id
        ).length
        observed.pendingAfterClose = managerAudit(world).pendingAdmissions ?? 0
        observed.signals = signalsFor(world, world.selected.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.restartStatus).toBe(500)
  expect(observed.restartCategory).toBe('runtime_replacement_failed')
  expect(observed.pendingAfterDetach).toBe(1)
  expect(observed.entryAfterDetach).toBe('failed')
  expect(observed.lateReplacementDelta).toBe(1)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.requiresQuarantineResolution).toBe(true)
  expect(row.declaredBound).toBe('B-6')
  // The late settlement installed nothing: no replacement generation, no
  // pending admission, no in-flight lifecycle work under the claim.
  expect(observed.identitiesAfter).toBe(1)
  expect(observed.pendingAfterClose).toBe(0)
  expect(row.managerAudit.claimLateWork).toBe(0)
  expect(row.execution.confirmation?.inFlightLifecycle).toBe(true)
  expect(row.execution.confirmation?.pendingAdmissions).toBe(true)
  expect(observed.signals).toBe(0)
  expect(row.residual.pendingAdmissions).toBe(0)
  // The peer is untouched by any of it.
  expect(row.peerAfter).toEqual(row.peerBefore)
  note(
    'the detached replacement settled while the close held its claim: the ' +
      'manager raised lateReplacementSettlements by one, installed no ' +
      'generation and no admission, kept the claim late work at zero, and ' +
      'left the peer observation identical'
  )
  return row
}

/** S-55: a reconciliation observation arriving after the project was retired. */
async function runS55(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    adoptedRecord: null as ReconciliationRecord | null,
    heldEntryBefore: null as string | null,
    sweptRecord: null as ReconciliationRecord | null,
    retiredRecordAfterSweep: null as ReconciliationRecord | null,
    entryAfterSweep: null as string | null,
    eventsAfterSweep: [] as readonly string[],
    cleanupAfterSweep: false,
    identitiesAfterSweep: -1,
    ownershipAfterSweep: -1,
    lateDelta: -1,
  }
  const row = await executeCloseScenario('S-55', (world) => {
    const candidateGate = deferred<void>()
    return {
      arrangeSelected: async () => {
        await navigate(world, world.extra.id)
        const extraIdentity = await strandRunningRuntime(world, world.extra.id)
        await navigate(world, world.selected.id)
        const selectedIdentity = await strandRunningRuntime(
          world,
          world.selected.id
        )
        // Both workbenches survive the restart. The replacement boot adopts
        // the selected project and is held mid-observation on the other, so
        // the reconciliation is still in flight while the close runs.
        world.reconcilePlan.projects = [world.selected, world.extra]
        world.reconcilePlan.candidates = [selectedIdentity, extraIdentity]
        world.reconcilePlan.candidateHold = {
          pid: extraIdentity.pid,
          gate: candidateGate,
        }
        await world.reboot()
        await until(
          'the adoption to settle while the other project is still observed',
          () =>
            entryStateOf(world, world.selected.id) === 'running' &&
            entryStateOf(world, world.extra.id) === 'reconciling'
        )
        observed.adoptedRecord = reconciliationRecordOf(
          world,
          world.selected.id
        )
        observed.heldEntryBefore = entryStateOf(world, world.extra.id)
        await navigate(world, world.peer.id)
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        const lateBefore = managerAudit(world).lateCloseSettlements ?? 0
        const eventsBefore = world.events.length
        const identitiesBefore = world.identities.length
        // The reconciliation's own overall bound fires: the delivered sweep
        // walks the order it installed, which still names the retired project.
        fireDeadline(
          world.scheduler,
          reconciliationOverallBoundMs(matrixConfig)
        )
        await until(
          'the sweep to settle the reconciliation it found still in flight',
          () => entryStateOf(world, world.extra.id) === 'failed'
        )
        candidateGate.resolve()
        world.reconcilePlan.candidateHold = null
        observed.sweptRecord = reconciliationRecordOf(world, world.extra.id)
        observed.retiredRecordAfterSweep = reconciliationRecordOf(
          world,
          world.selected.id
        )
        observed.entryAfterSweep = entryStateOf(world, world.selected.id)
        observed.eventsAfterSweep = Object.freeze(
          world.events
            .slice(eventsBefore)
            .filter(
              (event) => event.projectToken === tokenOf(world.selected.id)
            )
            .map((event) => event.event)
        )
        observed.cleanupAfterSweep =
          world.manager.lastCleanup(world.selected.id) !== undefined
        observed.identitiesAfterSweep =
          world.identities.length - identitiesBefore
        observed.ownershipAfterSweep = managerAudit(world).ownershipRecords
        observed.lateDelta =
          (managerAudit(world).lateCloseSettlements ?? 0) - lateBefore
      },
      resetLedgerBeforeAct: true,
      declaresLateSettlement: true,
    }
  })
  assertRowConsistency(row)
  expect(observed.adoptedRecord?.outcome).toBe('adopted')
  expect(observed.heldEntryBefore).toBe('reconciling')
  expect(row.outcome).toBe('closed')
  expect(row.declaredBound).toBe('B-20')
  // The sweep really ran: the project it could still settle was settled.
  expect(observed.sweptRecord?.outcome).toBe('unresolved')
  expect(observed.sweptRecord?.refusalReason).toBe('deadline-exceeded')
  // For the retired project it was inert in every observable way.
  expect(observed.retiredRecordAfterSweep?.outcome).toBe('adopted')
  expect(observed.entryAfterSweep).toBeNull()
  expect(observed.eventsAfterSweep).toEqual([])
  expect(observed.cleanupAfterSweep).toBe(false)
  expect(observed.identitiesAfterSweep).toBe(0)
  expect(observed.ownershipAfterSweep).toBe(1)
  // The settlement that arrived for the retired project is inert and
  // accounted: it raises `lateCloseSettlements` exactly once and, because the
  // close had already released its claim, it raises no claim late work.
  expect(observed.lateDelta).toBe(1)
  expect(row.managerAudit.lateCloseSettlementsDelta).toBe(1)
  expect(row.execution.confirmation?.inFlightLifecycle).toBe(true)
  note(
    'the reconciliation sweep fired for an order still naming the retired ' +
      'project: it reinstalled no entry, emitted no event, recorded no ' +
      'cleanup, and created no identity, while the project it could still ' +
      'settle was settled unresolved by the same sweep — and the settlement ' +
      'that arrived for the retired project raised lateCloseSettlements by ' +
      'exactly one, after retirement, with no claim left to charge'
  )
  return row
}

/** The shape both interruption scenarios share, before and after a real boot. */
interface InterruptionObservation {
  readonly interruptions: readonly string[]
  readonly firstStatus: number
  readonly firstCategory: string | null
  readonly registrationBetween: boolean
  readonly secondStatus: number
  readonly secondCategory: string | null
  readonly registrationAfter: boolean
  readonly listedAfter: boolean
  readonly routeAfter: RouteAnswer
}

/** S-56: the API ends between the confirmation and the durable removal. */
async function runS56(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let observed: InterruptionObservation | null = null
  const observedExtra = {
    signalsFromFirst: -1,
    identitiesAfter: -1,
    entryAfter: null as string | null,
  }
  const row = await executeCloseScenario('S-56', (world) => ({
    // The peer's own runtime is not part of this scenario: the world observes
    // it symmetrically on both sides of an interruption that ends the API.
    arrangePeer: async () => undefined,
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => {
      world.interruptRemoval('before-removal')
      const first = await deleteProject(world, world.selected.id)
      const between = await world.library.findById(world.selected.id)
      observedExtra.signalsFromFirst = signalsFor(world, world.selected.id)
      // The replacement boot is real: the API process this world runs is
      // stopped and started again before the retry arrives.
      await world.reboot()
      const second = await deleteProject(world, world.selected.id)
      observed = {
        interruptions: [...world.removalInterruptions],
        firstStatus: first.status,
        firstCategory: errorCategoryOf(first),
        registrationBetween: between !== undefined,
        secondStatus: second.status,
        secondCategory: errorCategoryOf(second),
        registrationAfter:
          (await world.library.findById(world.selected.id)) !== undefined,
        listedAfter: (await listedIds(world)).includes(world.selected.id),
        routeAfter: await stableRouteAnswer(world, world.selected.id),
      }
      return [first, second]
    },
    settle: async () => {
      observedExtra.identitiesAfter = identitiesFor(
        world,
        world.selected.id
      ).filter((identity) => identity.alive).length
      observedExtra.entryAfter = entryStateOf(world, world.selected.id)
    },
    subject: nthSubject(world.selected.id, 1),
    selectResponse: responseWithDisposition('closed'),
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  const record = observed as InterruptionObservation | null
  expect(record).not.toBeNull()
  if (record === null) return row
  expect(record.interruptions).toEqual(['before-removal'])
  // The interrupted close confirmed and then could not remove: it retained
  // the registration exactly as production's own rollback leaves it.
  expect(record.firstStatus).toBe(500)
  expect(record.firstCategory).toBe('project_close_failed')
  expect(record.registrationBetween).toBe(true)
  expect(observedExtra.signalsFromFirst).toBe(1)
  // The next real boot settles truthfully.
  expect(record.secondStatus).toBe(200)
  expect(record.secondCategory).toBeNull()
  expect(record.registrationAfter).toBe(false)
  expect(record.listedAfter).toBe(false)
  expect(record.routeAfter.status).toBe(404)
  expect(record.routeAfter.code).toBe('project_not_found')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.registrationAfter).toBeNull()
  expect(observedExtra.identitiesAfter).toBe(0)
  expect(observedExtra.entryAfter).toBeNull()
  note(
    'the API ended between the confirmation and the durable removal: the ' +
      'registration was retained, the released generation stayed released, ' +
      'and the close issued after the real replacement boot settled closed ' +
      'with nothing left to release'
  )
  return row
}

/** S-57: the API ends after the durable removal landed. */
async function runS57(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let observed: InterruptionObservation | null = null
  const observedExtra = {
    selectedId: '',
    candidatesForSelected: -1,
    survivingIdentities: -1,
    reconciledProjects: [] as readonly string[],
    entryAfter: null as string | null,
  }
  const row = await executeCloseScenario('S-57', (world) => ({
    arrangeSelected: async () => {
      observedExtra.selectedId = world.selected.id
      await navigate(world, world.selected.id)
    },
    act: async () => {
      world.interruptRemoval('after-removal')
      const first = await deleteProject(world, world.selected.id)
      const between = await world.library.findById(world.selected.id)
      // The replacement boot reconciles what the store still registers, which
      // is the positive exclusion this scenario is about.
      world.reconcilePlan.projects = await world.library.list()
      world.reconcilePlan.candidates = world.identities.filter(
        (identity) => identity.alive
      )
      observedExtra.reconciledProjects = world.reconcilePlan.projects.map(
        (project) => project.id
      )
      observedExtra.candidatesForSelected =
        world.reconcilePlan.candidates.filter(
          (identity) => identity.projectId === world.selected.id
        ).length
      await world.reboot()
      const second = await deleteProject(world, world.selected.id)
      observed = {
        interruptions: [...world.removalInterruptions],
        firstStatus: first.status,
        firstCategory: errorCategoryOf(first),
        registrationBetween: between !== undefined,
        secondStatus: second.status,
        secondCategory: errorCategoryOf(second),
        registrationAfter:
          (await world.library.findById(world.selected.id)) !== undefined,
        listedAfter: (await listedIds(world)).includes(world.selected.id),
        routeAfter: await stableRouteAnswer(world, world.selected.id),
      }
      return [first, second]
    },
    settle: async () => {
      observedExtra.survivingIdentities = identitiesFor(
        world,
        world.selected.id
      ).filter((identity) => identity.alive).length
      observedExtra.entryAfter = entryStateOf(world, world.selected.id)
      // The peer is served again through the same production path the
      // replacement boot exposes.
      await navigate(world, world.peer.id)
    },
    subject: nthSubject(world.selected.id, 1),
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  const record = observed as InterruptionObservation | null
  expect(record).not.toBeNull()
  if (record === null) return row
  expect(record.interruptions).toEqual(['after-removal'])
  expect(record.firstStatus).toBe(500)
  expect(record.firstCategory).toBe('project_close_failed')
  // The removal landed before the interruption: the registration is gone.
  expect(record.registrationBetween).toBe(false)
  expect(record.registrationAfter).toBe(false)
  expect(record.listedAfter).toBe(false)
  // The candidate is positively excluded: the released generation is gone
  // from the host, and the boot's project order cannot name the project.
  expect(observedExtra.survivingIdentities).toBe(0)
  expect(observedExtra.candidatesForSelected).toBe(0)
  expect(observedExtra.reconciledProjects).not.toContain(
    observedExtra.selectedId
  )
  expect(observedExtra.entryAfter).toBeNull()
  // The prohibited pairing — an absent registration with a surviving
  // attributable candidate — is unreachable here, and the retry says so.
  expect(record.secondStatus).toBe(404)
  expect(record.secondCategory).toBe('project_not_found')
  expect(record.routeAfter.status).toBe(404)
  expect(record.routeAfter.code).toBe('project_not_found')
  expect(row.outcome).toBe('already-absent')
  expect(row.preClaimSettlement).toBe('persisted-absence')
  expect(row.execution.claimInstalledAt).toBeNull()
  expect(row.residual.selectedRuntimeProcesses).toBe(0)
  expect(row.residual.listeners).toBe(0)
  note(
    'the API ended after the durable removal landed: the registration stayed ' +
      'absent across a real replacement boot, no attributable candidate ' +
      'survived for the removed project, and the retry settled already-absent'
  )
  return row
}

/** S-58: a manager shutdown while a close is in flight. */
async function runS58(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    settledDuringHold: true,
    claimsDuring: -1,
    shutdownSettled: false,
    claimsAfter: -1,
    closeTasksAfter: -1,
    registrationAfter: false,
    survivors: -1,
  }
  const row = await executeCloseScenario('S-58', (world) => {
    const hold = deferred<void>()
    let identity: HostIdentity | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        identity = liveIdentity(world, world.selected.id)
        identity.releaseHold = hold
      },
      act: async () => {
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        await until(
          'the close to enter the release it must complete',
          () => (identity?.terminateCalls ?? 0) === 1
        )
        let settled = false
        const shutdown = world.manager.shutdown().then(() => {
          settled = true
        })
        observed.claimsDuring = (managerAudit(world).closeClaims ?? []).length
        // The shutdown cannot finish while the close it must await is still
        // inside its release.
        for (let turn = 0; turn < 5; turn += 1)
          await new Promise((resolve) => setTimeout(resolve, 5))
        observed.settledDuringHold = settled
        hold.resolve()
        if (identity !== null) identity.releaseHold = null
        const response = await closing
        await shutdown
        observed.shutdownSettled = settled
        const audit = managerAudit(world)
        observed.claimsAfter = (audit.closeClaims ?? []).length
        observed.closeTasksAfter = audit.closeTasks ?? 0
        return [response]
      },
      settle: async () => {
        observed.registrationAfter =
          (await world.library.findById(world.selected.id)) !== undefined
        observed.survivors = identitiesFor(world, world.selected.id).filter(
          (identity) => identity.alive
        ).length
        // The manager under the boundary is gone; the replacement boot is the
        // only truthful way to observe the peer and the registration again.
        await world.reboot()
        await navigate(world, world.peer.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('manager-shutdown')
  expect(row.routeStatus).toBe(503)
  expect(row.routeCategory).toBe('runtime_manager_shutdown')
  // The shutdown really awaited the close: it was still running while the
  // close was suspended inside its release, and settled once it was not.
  expect(observed.claimsDuring).toBe(1)
  expect(observed.settledDuringHold).toBe(false)
  expect(observed.shutdownSettled).toBe(true)
  // No claim survives it, and no work is left in flight.
  expect(observed.claimsAfter).toBe(0)
  expect(observed.closeTasksAfter).toBe(0)
  expect(row.managerAudit.closeClaims).toBe(0)
  expect(row.residual.closeClaims).toBe(0)
  expect(row.residual.inFlightCloseTasks).toBe(0)
  // The registration is retained and the runtime the shutdown swept is gone.
  expect(observed.registrationAfter).toBe(true)
  expect(observed.survivors).toBe(0)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  note(
    'the manager shutdown arriving under an installed claim refused the ' +
      'close with 503 manager-shutdown, waited for the close it found inside ' +
      'its release before finishing, and left no claim and no in-flight ' +
      'close task behind'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group L — peer isolation and the unrelated control
// ---------------------------------------------------------------------------

/** S-59: the peer's identity, readiness, and stable route across a success. */
async function runS59(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    peerPidBefore: -1,
    peerPidAfter: -1,
    peerEntryBefore: null as string | null,
    peerEntryAfter: null as string | null,
    peerStateBefore: null as string | null,
    peerStateAfter: null as string | null,
    peerRouteBefore: { status: 0, code: null } as RouteAnswer,
    peerRouteAfter: { status: 0, code: null } as RouteAnswer,
    peerStartsDuringClose: -1,
    peerIdentities: -1,
    peerSignals: -1,
  }
  const row = await executeCloseScenario('S-59', (world) => {
    let startsBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        observed.peerPidBefore = world.manager.inspect(world.peer.id)?.pid ?? -1
        observed.peerEntryBefore = entryStateOf(world, world.peer.id)
        observed.peerStateBefore =
          (await publicReportOf(world, world.peer.id))?.state ?? null
        observed.peerRouteBefore = await stableRouteAnswer(world, world.peer.id)
        startsBefore =
          world.proxyResolves.startsByProject.get(world.peer.id) ?? 0
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        observed.peerPidAfter = world.manager.inspect(world.peer.id)?.pid ?? -1
        observed.peerEntryAfter = entryStateOf(world, world.peer.id)
        observed.peerStateAfter =
          (await publicReportOf(world, world.peer.id))?.state ?? null
        observed.peerRouteAfter = await stableRouteAnswer(world, world.peer.id)
        observed.peerStartsDuringClose =
          (world.proxyResolves.startsByProject.get(world.peer.id) ?? 0) -
          startsBefore
        observed.peerIdentities = identitiesFor(world, world.peer.id).length
        observed.peerSignals = signalsFor(world, world.peer.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  // The same generation, still ready, still served by the same route.
  expect(observed.peerPidBefore).toBeGreaterThan(0)
  expect(observed.peerPidAfter).toBe(observed.peerPidBefore)
  expect(observed.peerEntryBefore).toBe('running')
  expect(observed.peerEntryAfter).toBe('running')
  expect(observed.peerStateBefore).toBe('Running')
  expect(observed.peerStateAfter).toBe(observed.peerStateBefore)
  expect(observed.peerRouteBefore.status).toBe(200)
  expect(observed.peerRouteAfter.status).toBe(200)
  expect(observed.peerSignals).toBe(0)
  // Two acquisitions were asked for after the arrangement — the row's own peer
  // observation and this scenario's stable-route re-observation — and both
  // reused the running generation: the peer still has exactly one identity and
  // the same process identifier.
  expect(observed.peerStartsDuringClose).toBe(2)
  expect(observed.peerIdentities).toBe(1)
  expect(row.peerAfter.identity).toBe(row.peerBefore.identity)
  expect(row.peerAfter.readiness).toBe(row.peerBefore.readiness)
  expect(row.peerAfter.stableRoute).toBe(row.peerBefore.stableRoute)
  expect(row.peerBefore.readiness).toBe('ready')
  note(
    "the peer's generation, readiness, published state, and stable route were " +
      'identical before and after the successful close, and the peer received ' +
      'no signal'
  )
  return row
}

/** S-60: peer traffic and connection count through the selected drain. */
async function runS60(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    peerRouteDuring: -1,
    peerExchangeDuring: false,
    peerWebSocketsDuring: -1,
    peerPendingDuring: -1,
    selectedDrainedWhileHeld: false,
    peerAuditBefore: null as Record<string, number> | null,
    peerAuditAfter: null as Record<string, number> | null,
    peerSignals: -1,
  }
  const row = await executeCloseScenario('S-60', (world) => {
    const drainHold = deferred<void>()
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        observed.peerAuditBefore = { ...proxyAuditFor(world, world.peer) }
      },
      act: async () => {
        world.holdDrain(drainHold)
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        observed.selectedDrainedWhileHeld =
          world.closeInvocations.at(-1)?.drainInvocations === 1
        // Real peer traffic through the same boundary while the selected
        // project's drain is suspended: one HTTP arrival and one live
        // WebSocket exchange, both proxied to the peer's own upstream.
        observed.peerRouteDuring = (
          await navigateWorkbench(world, world.peer.id)
        ).status
        const socket = openWorkbenchWebSocket(world, world.peer.id)
        await socket.opened
        observed.peerExchangeDuring = await socket.exchange('bl-020-peer')
        const during = proxyAuditFor(world, world.peer)
        observed.peerWebSocketsDuring = during.webSockets
        observed.peerPendingDuring = during.pendingOperations
        socket.socket.close()
        await socket.closed
        await until(
          'the peer transport this scenario opened to be released',
          () => proxyAuditFor(world, world.peer).webSockets === 0
        )
        drainHold.resolve()
        world.holdDrain(null)
        return [await closing]
      },
      settle: async () => {
        observed.peerAuditAfter = { ...proxyAuditFor(world, world.peer) }
        observed.peerSignals = signalsFor(world, world.peer.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(observed.selectedDrainedWhileHeld).toBe(true)
  // The peer's traffic was uninterrupted while the selected project drained.
  expect(observed.peerRouteDuring).toBe(200)
  expect(observed.peerExchangeDuring).toBe(true)
  // One live exchange is two sockets in the delivered gauge: the proxy holds
  // both ends of the bridge it created for the peer.
  expect(observed.peerWebSocketsDuring).toBe(2)
  expect(observed.peerPendingDuring).toBe(0)
  // The peer's connection count is what it was, on both sides of the close.
  expect(observed.peerAuditAfter).toEqual(observed.peerAuditBefore)
  expect(row.peerAfter.activeConnections).toBe(row.peerBefore.activeConnections)
  expect(row.peerBefore.activeConnections).toBe(0)
  expect(observed.peerSignals).toBe(0)
  expect(row.execution.drainInvocations).toBe(1)
  note(
    'the peer served a real HTTP arrival and a live WebSocket exchange while ' +
      "the selected project's drain was suspended, and the peer's connection " +
      'counts returned to exactly what they were before the close'
  )
  return row
}

/** S-61: the peer's four durable fields across every settled outcome. */
async function runS61(
  note: (text: string) => void,
  subcases: readonly FailureOutcomeSubcase[]
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    peerBefore: null as DurableFields | null,
    peerAfter: null as DurableFields | null,
    closedOutcome: null as string | null,
  }
  const row = await executeCloseScenario('S-61', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      observed.peerBefore = await readDurableFields(world, world.peer.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.peerAfter = await readDurableFields(world, world.peer.id)
      observed.closedOutcome = world.closeOutcomes.at(-1)?.outcome ?? null
    },
  }))
  assertRowConsistency(row)
  expect(observed.closedOutcome).toBe('closed')
  expect(row.outcome).toBe('closed')
  expect(observed.peerBefore).not.toBeNull()
  expect(observed.peerAfter).toEqual(observed.peerBefore)
  // Every failure outcome, each executed in its own world, read the same four
  // durable fields back byte for byte.
  expect(subcases.map((subcase) => subcase.category)).toEqual([
    ...REJECTION_ORDER,
  ])
  for (const subcase of subcases) {
    expect(subcase.peerDurableBefore, subcase.category).not.toBeNull()
    expect(subcase.peerDurableAfter, subcase.category).toEqual(
      subcase.peerDurableBefore
    )
    expect(subcase.peerListed, subcase.category).toBe(true)
  }
  expect(row.peerAfter.registration).toEqual(row.peerBefore.registration)
  note(
    'the peer registration was byte-identical across all ten settled ' +
      'outcomes: the successful close this row reports and the nine failure ' +
      'outcomes (' +
      REJECTION_ORDER.join(', ') +
      '), each executed in its own world'
  )
  return row
}

/** S-62: the unrelated control process during a close. */
async function runS62(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    argv: [] as readonly string[],
    controlPid: -1,
    signalledProjects: [] as readonly string[],
    identityPids: [] as readonly number[],
    reconciledCandidatePids: [] as readonly number[],
    startTimeBefore: null as string | null,
    startTimeAfter: null as string | null,
    responseAfter: '',
  }
  const row = await executeCloseScenario('S-62', (world, context) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      observed.argv = context.control.argv
      observed.controlPid = context.control.pid
      observed.startTimeBefore = context.control.startTime
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.signalledProjects = [...world.ledger.terminatedProjects]
      observed.identityPids = world.identities.map((identity) => identity.pid)
      observed.reconciledCandidatePids = world.reconcilePlan.candidates.map(
        (identity) => identity.pid
      )
      // A real re-observation of the control process, through the same
      // attribution the manager reads the host with.
      const observation = await context.control.observe()
      observed.startTimeAfter = observation.processIdentity
      observed.responseAfter = (
        await performRequest(context.control.listenerPort, '/')
      ).text
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  // Non-candidacy is derived from the argument vector the host really
  // reported: no launcher prefix and no runtime bind flag.
  expect(observed.argv.length).toBeGreaterThan(0)
  expect(observed.argv).not.toContain('--bind-addr')
  expect(observed.argv).not.toContain('--user-data-dir')
  expect(row.controlBefore.nonCandidacyProof).toBe(
    'argv-outside-installed-runtime'
  )
  expect(row.controlAfter.nonCandidacyProof).toBe(
    'argv-outside-installed-runtime'
  )
  // Never adopted: the control is not one of the identities this world
  // created, and it is in no candidate set the reconciliation ever read.
  expect(observed.identityPids).not.toContain(observed.controlPid)
  expect(observed.reconciledCandidatePids).not.toContain(observed.controlPid)
  // Never signalled and never terminated: the ledger names only projects, and
  // the process still answers with the same identity it started with.
  expect(observed.signalledProjects).toEqual([row.projectTokens[0]])
  expect(row.controlAfter.processIdentity).toBe(
    row.controlBefore.processIdentity
  )
  expect(observed.startTimeAfter).toBe(row.controlAfter.processIdentity)
  expect(observed.responseAfter).toBe('control')
  note(
    'the unrelated control process was not adopted, not signalled, and not ' +
      'terminated: its observed argument vector carries neither the launcher ' +
      'prefix nor the runtime bind flag, and it answered on its own listener ' +
      'with the same process identity after the close'
  )
  return row
}

/** S-63: the unrelated control listener during a close. */
async function runS63(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    controlPort: -1,
    availableBefore: false,
    availableDuring: false,
    availableAfter: false,
    bodyDuring: '',
    runtimePorts: [] as readonly number[],
    apiPort: -1,
  }
  const row = await executeCloseScenario('S-63', (world, context) => {
    const drainHold = deferred<void>()
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        observed.controlPort = context.control.listenerPort
        observed.apiPort = world.apiPort
        observed.availableBefore = await connectionAvailable(
          context.control.listenerPort
        )
      },
      act: async () => {
        world.holdDrain(drainHold)
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        // The control's listener is probed while the close is draining.
        observed.availableDuring = await connectionAvailable(
          context.control.listenerPort
        )
        observed.bodyDuring = (
          await performRequest(context.control.listenerPort, '/')
        ).text
        drainHold.resolve()
        world.holdDrain(null)
        return [await closing]
      },
      settle: async () => {
        observed.availableAfter = await connectionAvailable(
          context.control.listenerPort
        )
        observed.runtimePorts = world.identities.map(
          (identity) => identity.port
        )
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(observed.availableBefore).toBe(true)
  expect(observed.availableDuring).toBe(true)
  expect(observed.availableAfter).toBe(true)
  expect(observed.bodyDuring).toBe('control')
  expect(row.controlAfter.listenerAvailable).toBe(true)
  expect(row.controlBefore.listenerAvailable).toBe(true)
  // No port was reclaimed: nothing this world bound ever used the control's.
  expect(observed.runtimePorts).not.toContain(observed.controlPort)
  expect(observed.apiPort).not.toBe(observed.controlPort)
  note(
    "the unrelated control's listener answered a real request while the close " +
      'was draining and was still available afterwards, and no runtime or ' +
      'boundary this world created ever bound its port'
  )
  return row
}

/** S-64: a second close admitted while the reported close is pending. */
async function runS64(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    claimsDuring: [] as readonly string[],
    selectedId: '',
    extraId: '',
    peerId: '',
    secondStatus: -1,
    secondDisposition: null as string | null,
    selectedSignals: -1,
    extraSignals: -1,
    peerSignals: -1,
    listedAfter: [] as readonly string[],
    extraEntryAfter: null as string | null,
  }
  const row = await executeCloseScenario('S-64', (world) => {
    const holdSelected = deferred<void>()
    const holdExtra = deferred<void>()
    let extraClosing: Promise<HttpResult> | null = null
    observed.selectedId = world.selected.id
    observed.extraId = world.extra.id
    observed.peerId = world.peer.id
    // The third project this world registers is in scope for this row: its
    // close runs concurrently with the reported one.
    world.projectsInScope = [world.selected, world.peer, world.extra]
    return {
      arrangePeer: async () => {
        await navigate(world, world.peer.id)
        await navigate(world, world.extra.id)
      },
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        liveIdentity(world, world.selected.id).releaseHold = holdSelected
        liveIdentity(world, world.extra.id).releaseHold = holdExtra
      },
      act: async () => {
        const closing = deleteProject(world, world.selected.id)
        await untilClaimHeld(world, world.selected.id)
        // The second close is admitted while the first one is pending.
        extraClosing = deleteProject(world, world.extra.id)
        await untilClaimHeld(world, world.extra.id)
        observed.claimsDuring = (managerAudit(world).closeClaims ?? []).map(
          (claim) => claim.projectId
        )
        holdSelected.resolve()
        liveIdentity(world, world.selected.id).releaseHold = null
        return [await closing]
      },
      settle: async () => {
        holdExtra.resolve()
        const second = await (extraClosing ?? Promise.resolve(null))
        observed.secondStatus = second?.status ?? -1
        observed.secondDisposition =
          (second?.body as { disposition?: string } | undefined)?.disposition ??
          null
        observed.selectedSignals = signalsFor(world, world.selected.id)
        observed.extraSignals = signalsFor(world, world.extra.id)
        observed.peerSignals = signalsFor(world, world.peer.id)
        observed.listedAfter = await listedIds(world)
        observed.extraEntryAfter = entryStateOf(world, world.extra.id)
      },
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  // Both closes really held their claims at the same time.
  expect(observed.claimsDuring.length).toBe(2)
  expect(observed.claimsDuring).toContain(observed.selectedId)
  expect(observed.claimsDuring).toContain(observed.extraId)
  // Each settled on its own.
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(observed.secondStatus).toBe(200)
  expect(observed.secondDisposition).toBe('closed')
  expect(observed.listedAfter).not.toContain(observed.selectedId)
  expect(observed.listedAfter).not.toContain(observed.extraId)
  expect(observed.listedAfter).toContain(observed.peerId)
  expect(observed.extraEntryAfter).toBeNull()
  // Each released exactly its own identity and nothing else.
  expect(observed.selectedSignals).toBe(1)
  expect(observed.extraSignals).toBe(1)
  expect(observed.peerSignals).toBe(0)
  expect(row.projectTokens).toHaveLength(3)
  expect(row.execution.signalCallsByProject).toEqual({
    [tokenOf(observed.selectedId)]: 1,
    [tokenOf(observed.extraId)]: 1,
    [tokenOf(observed.peerId)]: 0,
  })
  expect(row.execution.projectsWithoutRelease).toEqual([
    tokenOf(observed.peerId),
  ])
  expect(row.projectClosedEmissions).toBe(1)
  note(
    'a second close was admitted while the reported close held its claim: ' +
      'both claims were installed at once, both settled closed on their own, ' +
      'and each delivered exactly one signal to its own identity while the ' +
      'peer received none'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group N — repeated close
// ---------------------------------------------------------------------------

/** S-68: absence after a real API-process restart. */
async function runS68(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    selectedId: '',
    peerId: '',
    reconciledProjects: [] as readonly string[],
    candidatesForSelected: -1,
    scanCandidates: -1,
    entryAfterBoot: null as string | null,
    listedAfterBoot: [] as readonly string[],
    routeAfterBoot: { status: 0, code: null } as RouteAnswer,
    repeatedStatus: -1,
    repeatedCategory: null as string | null,
    signalsAfterBoot: -1,
    peerRouteAfterBoot: -1,
    fixturesPresent: false,
  }
  const row = await executeCloseScenario('S-68', (world) => ({
    arrangeSelected: async () => {
      observed.selectedId = world.selected.id
      observed.peerId = world.peer.id
      await navigate(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      // The replacement boot reconciles exactly what the store still holds,
      // and scans exactly the identities this world created.
      const registered = await world.library.list()
      world.reconcilePlan.projects = registered
      world.reconcilePlan.candidates = [...world.identities]
      observed.reconciledProjects = registered.map((project) => project.id)
      observed.candidatesForSelected = world.reconcilePlan.candidates.filter(
        (identity) => identity.projectId === world.selected.id && identity.alive
      ).length
      observed.scanCandidates = world.reconcilePlan.candidates.filter(
        (identity) => identity.alive
      ).length
      await world.reboot()
      observed.entryAfterBoot = entryStateOf(world, world.selected.id)
      observed.listedAfterBoot = await listedIds(world)
      observed.routeAfterBoot = await stableRouteAnswer(
        world,
        world.selected.id
      )
      const repeated = await deleteProject(world, world.selected.id)
      observed.repeatedStatus = repeated.status
      observed.repeatedCategory = errorCategoryOf(repeated)
      observed.signalsAfterBoot = signalsFor(world, world.selected.id)
      observed.peerRouteAfterBoot = (
        await navigateWorkbench(world, world.peer.id)
      ).status
      observed.fixturesPresent =
        (await world.library.findById(world.peer.id)) !== undefined
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  // The replacement boot cannot even name the closed project.
  expect(observed.reconciledProjects).not.toContain(observed.selectedId)
  expect(observed.reconciledProjects).toContain(observed.peerId)
  expect(observed.candidatesForSelected).toBe(0)
  expect(observed.entryAfterBoot).toBeNull()
  expect(observed.listedAfterBoot).not.toContain(observed.selectedId)
  expect(observed.listedAfterBoot).toContain(observed.peerId)
  expect(observed.routeAfterBoot.status).toBe(404)
  expect(observed.routeAfterBoot.code).toBe('project_not_found')
  // The repeated close after the restart is still the published not-found
  // failure, and it released nothing.
  expect(observed.repeatedStatus).toBe(404)
  expect(observed.repeatedCategory).toBe('project_not_found')
  expect(observed.signalsAfterBoot).toBe(1)
  // The peer and both fixture trees are exactly as the close left them.
  expect(observed.peerRouteAfterBoot).toBe(200)
  expect(observed.fixturesPresent).toBe(true)
  expect(row.peerAfter).toEqual(row.peerBefore)
  expect(row.fixtureAfter).toEqual(row.fixtureBefore)
  note(
    'after a real API-process restart the closed project was still absent ' +
      'from persistence, from the list route, and from the manager; the ' +
      'replacement boot found no adoption candidate for it; the repeated ' +
      'close answered the published not-found failure; and the peer and both ' +
      'fixture trees were unchanged'
  )
  return row
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

/**
 * Executes the twenty-seven lifecycle scenarios in the plan's order. Every row
 * is produced by running production paths — the route, the close service, the
 * runtime manager, the workbench proxy, and the SQLite library — over loopback
 * in a world this run allocated and released.
 */
export async function runLifecycleMatrix(
  only?: readonly LifecycleMatrixScenarioId[]
): Promise<LifecycleMatrixExecution> {
  const results: LifecycleScenarioResult[] = []
  const startedAt = Date.now()
  let failureSubcases: readonly FailureOutcomeSubcase[] = []

  const execute = async (
    scenario: LifecycleMatrixScenarioId,
    run: (note: (text: string) => void) => Promise<ProjectCloseEvidenceRow>
  ): Promise<void> => {
    if (only !== undefined && !only.includes(scenario)) return
    const observations: string[] = []
    const enteredAt = Date.now()
    if (process.env.BL020_LIFECYCLE_REPORT === '1')
      process.stderr.write('[lifecycle] ' + scenario + ' start\n')
    let watchdog: NodeJS.Timeout | undefined
    const row = await Promise.race([
      run((text) => observations.push(text)),
      new Promise<never>((_resolve, reject) => {
        watchdog = setTimeout(
          () =>
            reject(new Error('BL-020 ' + scenario + ' did not settle in 180s')),
          180_000
        )
      }),
    ]).finally(() => {
      if (watchdog !== undefined) clearTimeout(watchdog)
    })
    expect(row.scenario).toBe(scenario)
    if (process.env.BL020_LIFECYCLE_REPORT === '1')
      process.stderr.write(
        '[lifecycle] ' +
          scenario +
          ' ' +
          (row.rejectionCategory ?? row.outcome) +
          ' ' +
          String(Date.now() - enteredAt) +
          'ms\n'
      )
    results.push({
      scenario,
      row,
      durationMs: Date.now() - enteredAt,
      observations: Object.freeze([...observations]),
    })
  }

  await execute('S-38', runS38)
  await execute('S-39', async (note) => {
    // The nine failure outcomes, each executed in its own world. The same
    // records carry the peer registrations `S-61` reports.
    const executed: FailureOutcomeSubcase[] = []
    for (const category of REJECTION_ORDER)
      executed.push(await executeFailureOutcome('S-39', category))
    failureSubcases = Object.freeze(executed)
    note(
      'subcase ledger: ' +
        failureSubcases
          .map(
            (subcase) =>
              subcase.category +
              '=' +
              String(subcase.routeStatus) +
              '/' +
              (subcase.routeCategory ?? 'none')
          )
          .join(', ')
    )
    return runS39(note, failureSubcases)
  })
  await execute('S-40', runS40)
  await execute('S-42', runS42)
  await execute('S-43', runS43)
  await execute('S-44', runS44)
  await execute('S-45', runS45)
  await execute('S-46', runS46)
  await execute('S-47', runS47)
  await execute('S-48', runS48)
  await execute('S-49', runS49)
  await execute('S-50', runS50)
  await execute('S-51', runS51)
  await execute('S-52', runS52)
  await execute('S-53', runS53)
  await execute('S-54', runS54)
  await execute('S-55', runS55)
  await execute('S-56', runS56)
  await execute('S-57', runS57)
  await execute('S-58', runS58)
  await execute('S-59', runS59)
  await execute('S-60', runS60)
  await execute('S-61', async (note) => {
    if (failureSubcases.length === 0) {
      const executed: FailureOutcomeSubcase[] = []
      for (const category of REJECTION_ORDER)
        executed.push(await executeFailureOutcome('S-61', category))
      failureSubcases = Object.freeze(executed)
    }
    note(
      'subcase ledger: ' +
        failureSubcases
          .map(
            (subcase) =>
              subcase.category +
              '=peer-durable-' +
              (JSON.stringify(subcase.peerDurableAfter) ===
              JSON.stringify(subcase.peerDurableBefore)
                ? 'identical'
                : 'changed')
          )
          .join(', ')
    )
    return runS61(note, failureSubcases)
  })
  await execute('S-62', runS62)
  await execute('S-63', runS63)
  await execute('S-64', runS64)
  await execute('S-68', runS68)

  const rows = results.map((result) => result.row)
  expect(rows.map((row) => row.scenario)).toEqual(
    LIFECYCLE_MATRIX_SCENARIOS.filter(
      (scenario) => only === undefined || only.includes(scenario)
    )
  )
  const execution: LifecycleMatrixExecution = Object.freeze({
    rows: Object.freeze(rows),
    results: Object.freeze(results),
    durationMs: Date.now() - startedAt,
  })
  lastExecution = execution
  return execution
}

/** The twenty-seven lifecycle rows, in the plan's order. */
export async function runLifecycleMatrixRows(): Promise<
  readonly ProjectCloseEvidenceRow[]
> {
  return (await runLifecycleMatrix()).rows
}

let lastExecution: LifecycleMatrixExecution | null = null

/** The per-scenario record of the most recent execution in this process. */
export const lastLifecycleMatrixExecution =
  (): LifecycleMatrixExecution | null => lastExecution
