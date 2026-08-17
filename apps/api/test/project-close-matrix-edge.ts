/// <reference types="node" />
import { expect } from 'vitest'

import type {
  CloseRefusedAcquisition,
  ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
import { deriveProjectOwnerToken } from '../src/project-runtime-contract.js'
import {
  closeDeadlineArms,
  deferred,
  deleteProject,
  entryStateOf,
  fireCloseDrainDeadline,
  matrixConfig,
  navigateWorkbench,
  openHeldWorkbenchRequest,
  proxyAuditFor,
  runtimeStatesOverHttp,
  type CloseWorld,
  type HostIdentity,
  type HttpResult,
} from './project-close-fixtures.js'
import {
  arrangeRejection,
  assertRowConsistency,
  errorCategoryOf,
  executeCloseScenario,
  failThroughUnconfirmedStop,
  identitiesFor,
  liveIdentity,
  managerAudit,
  navigate,
  readDurableFields,
  until,
  type DurableFields,
} from './project-close-matrix-support.js'

/**
 * The five edge scenarios this module executes, in the plan's order. Each one
 * runs in its own world against the production library, manager, proxy, close
 * service, and route over loopback, and every row is assembled from what that
 * execution produced.
 */
export const EDGE_MATRIX_SCENARIOS = Object.freeze([
  'S-69',
  'S-70',
  'S-71',
  'S-74',
  'S-75',
] as const)

export type EdgeMatrixScenarioId = (typeof EDGE_MATRIX_SCENARIOS)[number]

/** One executed scenario: its row, what it took, and what it observed. */
export interface EdgeScenarioResult {
  readonly scenario: EdgeMatrixScenarioId
  readonly row: ProjectCloseEvidenceRow
  readonly durationMs: number
  readonly observations: readonly string[]
}

export interface EdgeMatrixExecution {
  readonly rows: readonly ProjectCloseEvidenceRow[]
  readonly results: readonly EdgeScenarioResult[]
  readonly durationMs: number
}

// ---------------------------------------------------------------------------
// Shared observation helpers
// ---------------------------------------------------------------------------

const tokenOf = (projectId: string): string =>
  deriveProjectOwnerToken(projectId)

const signalsFor = (world: CloseWorld, projectId: string): number =>
  world.ledger.signalsByProject.get(tokenOf(projectId)) ?? 0

/** The failure code a proxied refusal published in its own envelope. */
const failureCodeOf = (response: HttpResult): string | null =>
  (response.body as { error?: { code?: string } } | undefined)?.error?.code ??
  null

const CLEAR_PROXY_AUDIT = Object.freeze({
  pendingOperations: 0,
  httpRequests: 0,
  httpResponses: 0,
  rawSockets: 0,
  webSockets: 0,
})

/**
 * The one re-observation phase 5 makes before the single permitted re-drain:
 * a stale pending registration and nothing else. Every other per-token count
 * being zero is the discriminator between an arrival that merely registered
 * and one that escaped into an acquisition.
 */
const STALE_REGISTRATION_AUDIT = Object.freeze({
  ...CLEAR_PROXY_AUDIT,
  pendingOperations: 1,
})

/**
 * The two arrivals the stale-clearance choreography needs, with disjoint
 * declared roles.
 *
 * The delivered ordering forbids one arrival from carrying both jobs: an
 * arrival that entered `start()` before the claim registered its pending
 * operation first, so phase 1 cannot settle until it unwinds, and an arrival
 * that reaches the proxy after phase 1 settled is refused at `start()`'s head,
 * which precedes every `await`. Arrival A is therefore the pre-claim refusal
 * witness and arrival B the post-phase-1 stale-audit witness, and each row
 * asserts each role's own observations.
 */
interface ArrivalRole {
  readonly role: 'pre-claim-refusal-witness' | 'post-phase-1-stale-audit'
  readonly entersBeforeTheClaim: boolean
  readonly heldAt: 'running-reuse-await' | 'proxy-project-resolution'
  readonly status: number
  readonly failureCode: string | null
  readonly recordedAsRefusal: boolean
}

const ARRIVAL_A: ArrivalRole = Object.freeze({
  role: 'pre-claim-refusal-witness',
  entersBeforeTheClaim: true,
  heldAt: 'running-reuse-await',
  status: 503,
  failureCode: 'workbench_closing',
  recordedAsRefusal: true,
})

const ARRIVAL_B: ArrivalRole = Object.freeze({
  role: 'post-phase-1-stale-audit',
  entersBeforeTheClaim: false,
  heldAt: 'proxy-project-resolution',
  status: 502,
  failureCode: 'workbench_start_cancelled',
  recordedAsRefusal: false,
})

/** The armed drain deadline of a named close, as the scheduler holds it. */
interface DrainDeadlineState {
  readonly declaredMs: number
  readonly cancelled: boolean
  readonly fired: boolean
}

const drainDeadlineState = (
  world: CloseWorld,
  projectId: string
): DrainDeadlineState | null => {
  const invocation = [...world.closeInvocations]
    .reverse()
    .find((candidate) => candidate.projectId === projectId)
  const arm =
    invocation === undefined ? undefined : closeDeadlineArms(invocation)[0]
  return arm === undefined
    ? null
    : Object.freeze({
        declaredMs: arm.declaredMs,
        cancelled: arm.cancelled,
        fired: arm.fired,
      })
}

/** The drain deadline is still armed and unfired when the re-drain is entered. */
const ARMED_DRAIN_DEADLINE: DrainDeadlineState = Object.freeze({
  declaredMs: matrixConfig.closeDrainAllowanceMs,
  cancelled: false,
  fired: false,
})

/**
 * Asserts the two arrivals played the roles the choreography declares: A the
 * refusal the post-`await` recheck produced, B the cancellation the re-drain's
 * own abort produced, and exactly one recorded refusal — A's.
 */
function assertArrivalRoles(
  row: ProjectCloseEvidenceRow,
  arrivals: { readonly a: ArrivalRole; readonly b: ArrivalRole }
): void {
  expect(arrivals.a).toEqual(ARRIVAL_A)
  expect(arrivals.b).toEqual(ARRIVAL_B)
  expect(row.execution.refusedAcquisitions).toEqual([
    {
      seam: 'running-reuse-await',
      settled: true,
      classification: 'runtime-closing',
    },
  ])
  expect(row.execution.productionPathsEntered).toContain('running-reuse-await')
  expect(
    row.managerAudit?.refusedLateAcquisitionsDelta ?? 0
  ).toBeGreaterThanOrEqual(1)
}

/**
 * A real loopback acquisition suspended inside `start()`'s one declared
 * running-reuse await.
 *
 * The arrival is issued through the stable workbench route, so the proxy
 * registers its per-token pending operation before it requests the
 * acquisition, exactly as `M-18` requires. The manager's running branch then
 * observes host liveness, and that observation is where the arrival is held —
 * the hold is a release handle the identity hands to the one acquisition that
 * entered it, and it suspends production inside the await rather than around
 * it.
 */
interface ReuseArrival {
  readonly response: Promise<HttpResult>
  release(): void
}

function holdAtRunningReuseAwait(
  world: CloseWorld,
  identity: HostIdentity
): ReuseArrival {
  const hold = deferred<void>()
  const entered = identity.livenessEntries
  identity.livenessHolds.push(hold)
  const response = navigateWorkbench(world, identity.projectId)
  return {
    response: (async () => {
      await until(
        'the arrival to enter the running-reuse observation',
        () => identity.livenessEntries > entered
      )
      return response
    })(),
    release: () => hold.resolve(),
  }
}

/**
 * S-69: a stale phase-1 clearance, one permitted re-drain, and a late
 * acquisition refused at the running-reuse await.
 */
async function runS69(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    auditBeforeClose: {} as Readonly<Record<string, number>>,
    pendingInsideFirstDrain: -1,
    terminateCallsAtFirstDrain: -1,
    reuseStatus: 0,
    reuseCode: null as string | null,
    pendingWhenReleaseFinished: -1,
    auditAtRedrain: {} as Readonly<Record<string, number>>,
    drainDeadlineAtRedrain: null as DrainDeadlineState | null,
    lateStatus: 0,
    lateCode: null as string | null,
    refusedDelta: -1,
    livenessEntries: -1,
  }
  const refusals: CloseRefusedAcquisition[] = []
  const row = await executeCloseScenario('S-69', (world) => {
    const resolveHold = deferred<void>()
    const releaseHold = deferred<void>()
    let identity: HostIdentity | null = null
    let reuse: ReuseArrival | null = null
    let late: Promise<HttpResult> | null = null
    return {
      arrangeSelected: async () => {
        // The real pre-close proxied pair phase 1 releases, opened and
        // completed through the stable route before the close is requested.
        await navigate(world, world.selected.id)
        identity = liveIdentity(world, world.selected.id)
        observed.auditBeforeClose = proxyAuditFor(world, world.selected)
        reuse = holdAtRunningReuseAwait(world, identity)
        await until(
          'the reuse arrival to register a pending operation',
          () => proxyAuditFor(world, world.selected).pendingOperations >= 1
        )
        observed.livenessEntries = identity.livenessEntries
        // Phase 3 is suspended at the identity's own release await, which is
        // the window the second arrival is issued in.
        identity.releaseHold = releaseHold
      },
      act: async () => {
        const settled = deleteProject(world, world.selected.id)
        await until(
          'the close entering its first drain',
          () => world.proxyCalls.drain >= 1
        )
        observed.pendingInsideFirstDrain = proxyAuditFor(
          world,
          world.selected
        ).pendingOperations
        observed.terminateCallsAtFirstDrain = identity?.terminateCalls ?? -1
        // Released inside the first drain: the resumed acquisition takes the
        // post-await recheck, is refused `runtime-closing`, settles its own
        // 503, and releases its pending key in `handleHttp`'s `finally`, so
        // the first drain reaches five zeros on an otherwise correct close.
        reuse?.release()
        const refused = await (reuse as ReuseArrival).response
        observed.reuseStatus = refused.status
        observed.reuseCode = failureCodeOf(refused)
        refusals.push(
          Object.freeze({
            seam: 'running-reuse-await',
            settled: true,
            classification: 'runtime-closing',
          })
        )
        await until(
          'the close entering its release',
          () => (identity?.terminateCalls ?? 0) >= 1
        )
        // The second real arrival registers its pending operation while the
        // close is inside phases 2 – 4, and is suspended in `resolveTarget`
        // after that registration.
        world.holdProxyResolve(resolveHold, world.selected.id)
        late = navigateWorkbench(world, world.selected.id)
        await until(
          'the late arrival to register a pending operation',
          () => proxyAuditFor(world, world.selected).pendingOperations >= 1
        )
        observed.pendingWhenReleaseFinished = proxyAuditFor(
          world,
          world.selected
        ).pendingOperations
        world.onDrainStarted(() => {
          if (world.proxyCalls.drain < 2) return
          world.onDrainStarted(null)
          // Phase 5's own first re-observation, taken at the instant the
          // single permitted re-drain is entered: a stale registration and
          // every other per-token count zero.
          observed.auditAtRedrain = proxyAuditFor(world, world.selected)
          observed.drainDeadlineAtRedrain = drainDeadlineState(
            world,
            world.selected.id
          )
          resolveHold.resolve()
          world.holdProxyResolve(null)
        })
        releaseHold.resolve()
        if (identity !== null) identity.releaseHold = null
        return [await settled]
      },
      settle: async () => {
        world.holdProxyResolve(null)
        resolveHold.resolve()
        const cancelled = await (late as Promise<HttpResult>)
        observed.lateStatus = cancelled.status
        observed.lateCode = failureCodeOf(cancelled)
        observed.refusedDelta =
          managerAudit(world).refusedLateAcquisitions ?? -1
      },
      refusedAcquisitions: refusals,
      extraSeams: ['running-reuse-await'],
    }
  })
  assertRowConsistency(row)
  expect(observed.auditBeforeClose).toEqual(CLEAR_PROXY_AUDIT)
  expect(observed.livenessEntries).toBe(1)
  // The pre-close pair was still live when the close entered its first drain,
  // and no release had been attempted at that instant.
  expect(observed.pendingInsideFirstDrain).toBe(1)
  expect(observed.terminateCallsAtFirstDrain).toBe(0)
  expect(observed.pendingWhenReleaseFinished).toBe(1)
  // The stale registration, and nothing else, is what phase 5 re-observed.
  expect(observed.auditAtRedrain).toEqual(STALE_REGISTRATION_AUDIT)
  // The armed drain deadline had neither fired nor been cancelled, so the
  // re-drain settled on its own observation rather than on an expired arm.
  expect(observed.drainDeadlineAtRedrain).toEqual(ARMED_DRAIN_DEADLINE)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.drainInvocations).toBe(2)
  expect(row.execution.connectionAuditInvocations).toBe(2)
  assertArrivalRoles(row, {
    a: {
      role: 'pre-claim-refusal-witness',
      entersBeforeTheClaim: true,
      heldAt: 'running-reuse-await',
      status: observed.reuseStatus,
      failureCode: observed.reuseCode,
      recordedAsRefusal: refusals.length === 1,
    },
    b: {
      role: 'post-phase-1-stale-audit',
      entersBeforeTheClaim: false,
      heldAt: 'proxy-project-resolution',
      status: observed.lateStatus,
      failureCode: observed.lateCode,
      recordedAsRefusal: false,
    },
  })
  expect(row.managerAudit?.claimLateWork).toBe(0)
  expect(row.execution.confirmation?.inFlightLifecycle).toBe(true)
  expect(row.residual.proxyPendingOperations).toBe(0)
  note(
    'the phase-1 clearance was stale: pending operations were ' +
      String(observed.auditAtRedrain.pendingOperations) +
      ' when the single permitted re-drain ran, the refused acquisition ' +
      '(arrival A, held at the running-reuse await) settled ' +
      String(observed.reuseStatus) +
      ' ' +
      String(observed.reuseCode) +
      ', the stale-audit arrival (arrival B, held at the proxy project ' +
      'resolution) settled ' +
      String(observed.lateStatus) +
      ' ' +
      String(observed.lateCode) +
      ', and the invocation pair was ' +
      String(row.execution.drainInvocations) +
      '/' +
      String(row.execution.connectionAuditInvocations)
  )
  return row
}

/** S-70: the same choreography whose second arrival is never released. */
async function runS70(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    reuseStatus: 0,
    reuseCode: null as string | null,
    auditAtRedrain: {} as Readonly<Record<string, number>>,
    drainDeadlineAtRedrain: null as DrainDeadlineState | null,
    claimLateWorkAtRedrain: null as number | null,
    lateStatus: 0,
    lateCode: null as string | null,
    durableBefore: null as DurableFields | null,
    durableAfter: null as DurableFields | null,
    ownershipAfter: -1,
    removalCalls: [] as string[],
  }
  const refusals: CloseRefusedAcquisition[] = []
  const row = await executeCloseScenario('S-70', (world) => {
    const resolveHold = deferred<void>()
    const releaseHold = deferred<void>()
    let identity: HostIdentity | null = null
    let reuse: ReuseArrival | null = null
    let late: Promise<HttpResult> | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        identity = liveIdentity(world, world.selected.id)
        observed.durableBefore = await readDurableFields(
          world,
          world.selected.id
        )
        reuse = holdAtRunningReuseAwait(world, identity)
        await until(
          'the reuse arrival to register a pending operation',
          () => proxyAuditFor(world, world.selected).pendingOperations >= 1
        )
        identity.releaseHold = releaseHold
      },
      act: async () => {
        const settled = deleteProject(world, world.selected.id)
        await until(
          'the close entering its first drain',
          () => world.proxyCalls.drain >= 1
        )
        reuse?.release()
        const refused = await (reuse as ReuseArrival).response
        observed.reuseStatus = refused.status
        observed.reuseCode = failureCodeOf(refused)
        refusals.push(
          Object.freeze({
            seam: 'running-reuse-await',
            settled: true,
            classification: 'runtime-closing',
          })
        )
        await until(
          'the close entering its release',
          () => (identity?.terminateCalls ?? 0) >= 1
        )
        world.holdProxyResolve(resolveHold, world.selected.id)
        late = navigateWorkbench(world, world.selected.id)
        await until(
          'the late arrival to register a pending operation',
          () => proxyAuditFor(world, world.selected).pendingOperations >= 1
        )
        world.onDrainStarted(() => {
          if (world.proxyCalls.drain < 2) return
          world.onDrainStarted(null)
          observed.auditAtRedrain = proxyAuditFor(world, world.selected)
          observed.drainDeadlineAtRedrain = drainDeadlineState(
            world,
            world.selected.id
          )
          observed.claimLateWorkAtRedrain =
            world.sampleCloseClaim(world.selected.id)?.lateWork ?? null
          // The re-drain polls a resource it cannot clear while the arrival
          // is suspended inside `start()`, so the armed caller drain deadline
          // is what ends it. It is fired after the re-drain has been polling
          // for several intervals, so the deadline lands on a drain that is
          // genuinely stuck rather than on one that never observed anything.
          setTimeout(() => fireCloseDrainDeadline(world, world.selected.id), 25)
        })
        releaseHold.resolve()
        if (identity !== null) identity.releaseHold = null
        return [await settled]
      },
      settle: async () => {
        world.holdProxyResolve(null)
        resolveHold.resolve()
        const cancelled = await (late as Promise<HttpResult>)
        observed.lateStatus = cancelled.status
        observed.lateCode = failureCodeOf(cancelled)
        observed.durableAfter = await readDurableFields(
          world,
          world.selected.id
        )
        observed.ownershipAfter = managerAudit(world).ownershipRecords
        observed.removalCalls = [
          ...(world.closeInvocations.at(-1)?.callOrder ?? []),
        ]
      },
      refusedAcquisitions: refusals,
      extraSeams: ['running-reuse-await'],
      inFlightClaimLateWork: () => observed.claimLateWorkAtRedrain,
    }
  })
  assertRowConsistency(row)
  // The stale registration alone, observed before the single permitted
  // re-drain, with the drain deadline still armed when that re-drain began.
  expect(observed.auditAtRedrain).toEqual(STALE_REGISTRATION_AUDIT)
  expect(observed.drainDeadlineAtRedrain).toEqual(ARMED_DRAIN_DEADLINE)
  // The refusal raised the manager's refusal account without raising the
  // claim's own late work.
  expect(observed.claimLateWorkAtRedrain).toBe(0)
  assertArrivalRoles(row, {
    a: {
      role: 'pre-claim-refusal-witness',
      entersBeforeTheClaim: true,
      heldAt: 'running-reuse-await',
      status: observed.reuseStatus,
      failureCode: observed.reuseCode,
      recordedAsRefusal: refusals.length === 1,
    },
    b: {
      role: 'post-phase-1-stale-audit',
      entersBeforeTheClaim: false,
      heldAt: 'proxy-project-resolution',
      status: observed.lateStatus,
      failureCode: observed.lateCode,
      recordedAsRefusal: false,
    },
  })
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(row.routeStatus).toBe(500)
  expect(row.routeCategory).toBe('runtime_release_unconfirmed')
  expect(row.execution.drainInvocations).toBe(2)
  expect(row.execution.connectionAuditInvocations).toBe(1)
  expect(observed.removalCalls).not.toContain('removal')
  expect(row.execution.confirmation).toBeNull()
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('close-release-unconfirmed')
  expect(row.registrationAfter).not.toBeNull()
  expect(observed.durableAfter).toEqual(observed.durableBefore)
  expect(observed.ownershipAfter).toBeGreaterThanOrEqual(1)
  note(
    'the live resource, not the refusal, ended the re-drain: pending ' +
      'operations were ' +
      String(observed.auditAtRedrain.pendingOperations) +
      ' when the armed drain deadline fired, the invocation pair was ' +
      String(row.execution.drainInvocations) +
      '/' +
      String(row.execution.connectionAuditInvocations) +
      ', the retained ownership records were ' +
      String(observed.ownershipAfter) +
      ', and the released arrival B settled ' +
      String(observed.lateStatus) +
      ' ' +
      String(observed.lateCode)
  )
  return row
}

/** S-71: two retained ownership records with no quarantine anywhere. */
async function runS71(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    identitiesBefore: -1,
    ownershipBefore: -1,
    quarantineBefore: -1,
    entryBefore: null as string | null,
    identitiesAliveAfter: -1,
  }
  const row = await executeCloseScenario('S-71', (world) => ({
    arrangeSelected: async () => {
      // One retained record from a stop whose audit could not confirm the
      // identity had gone, and a second from a fresh start out of the
      // retained `failed` entry. Neither path quarantines anything.
      await failThroughUnconfirmedStop(world, world.selected.id)
      const retained = liveIdentity(world, world.selected.id)
      await navigate(world, world.selected.id)
      // The retained generation leaves when the close reclaims it, which is
      // what makes this a two-record sweep rather than a refusal.
      retained.mode = 'graceful'
      observed.entryBefore = entryStateOf(world, world.selected.id)
      observed.identitiesBefore = identitiesFor(
        world,
        world.selected.id
      ).filter((identity) => identity.alive).length
      const audit = managerAudit(world)
      observed.ownershipBefore = audit.ownershipRecords
      observed.quarantineBefore = audit.quarantinedOwnershipRecords ?? 0
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.identitiesAliveAfter = identitiesFor(
        world,
        world.selected.id
      ).filter((identity) => identity.alive).length
    },
  }))
  assertRowConsistency(row)
  expect(observed.entryBefore).toBe('running')
  expect(observed.identitiesBefore).toBe(2)
  expect(observed.quarantineBefore).toBe(0)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.ownershipCardinality?.frozen).toBe(2)
  expect(row.execution.ownershipCardinality?.sweepUnits).toBe(2)
  expect(row.execution.ownershipCardinality?.capExceeded).toBe(false)
  expect(row.declaredBound).toBe('B-8')
  expect(row.requiresQuarantineResolution).toBe(false)
  expect(row.managerAudit?.quarantinedOwnershipRecords).toBe(0)
  expect(observed.identitiesAliveAfter).toBe(0)
  note(
    'two frozen ownership records with zero quarantine anywhere: the sweep ' +
      'reclaimed ' +
      String(row.execution.ownershipCardinality?.sweepUnits) +
      ' units under the two-record bound ' +
      row.declaredBound +
      ' (' +
      String(row.declaredBoundMs) +
      ' ms) and left no live generation'
  )
  return row
}

/**
 * The three signal accounts of the interruption episode, never summed.
 *
 * Each is attributed to the phase that produced it: the interrupted close's
 * own account, the replacement transition's orderly cleanup, and the safe
 * retry's. A blanket zero over the whole episode would be untruthful, because
 * the ending boundary's own shutdown may legitimately signal its ownership
 * records while the interrupted close signalled nothing at all.
 */
interface SignalAccounts {
  readonly interruptedClose: number
  readonly replacementTransition: number
  readonly safeRetry: number
}

interface InterruptionRecord {
  readonly interruptedStatus: number
  readonly interruptedCategory: string | null
  readonly entryAfterInterruption: string | null
  readonly publicStateAfterInterruption: string | null
  readonly publicFailureAfterInterruption: string | null
  readonly signalsAfterInterruption: number
  readonly registrationAfterInterruption: boolean
  readonly ownershipAfterInterruption: number
  readonly removalReachedBeforeInterruption: boolean
  readonly candidateAliveAfterInterruption: boolean
  readonly rebootEntry: string | null
  readonly rebootRegistration: boolean
  /** Read from the route projection that publishes the four-value state. */
  readonly rebootPublicState: string | null
  readonly rebootPublicFailure: string | null
  /** The replacement boot's own settlement for this project. */
  readonly rebootReconcileOutcome: string | null
  readonly rebootRefusalReason: string | null
  readonly rebootAbsenceProof: string | null
  /** The adopted `pid:processStartTime:port`, or `null` when none was adopted. */
  readonly rebootAdoptedIdentity: string | null
  readonly candidateIdentity: string
  readonly candidateAliveAfterReboot: boolean
  /** Signals the old generation's orderly shutdown delivered to the survivor. */
  readonly signalsFromReplacementTransition: number
}

/** The exact `pid:processStartTime:port` the attribution conjunction compares. */
const identityTriple = (input: {
  readonly pid: number | null
  readonly processStartTime: string | null
  readonly port: number
}): string =>
  [
    input.pid === null ? 'absent' : String(input.pid),
    input.processStartTime ?? 'absent',
    String(input.port),
  ].join(':')

let lastInterruption: InterruptionRecord | null = null
let lastSignalAccounts: SignalAccounts | null = null

/** The interruption episode the most recent `S-74` execution observed. */
export const lastS74Interruption = (): InterruptionRecord | null =>
  lastInterruption

/** The three separately kept signal accounts of that same execution. */
export const lastS74SignalAccounts = (): SignalAccounts | null =>
  lastSignalAccounts

/**
 * S-74: an API interruption inside the release phase, strictly before the
 * confirmation region, with a surviving attributable candidate.
 *
 * The interruption is delivered inside the one release await the identity
 * owns and before any signal is delivered, which is the deterministic
 * in-process counterpart of an API generation that stops existing there. It is
 * *not* a real host kill: this row does not claim the real-host grade `T-12`
 * owns, and it says so in its own observations.
 */
async function runS74(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let record: InterruptionRecord | null = null
  const observed = {
    retryCallOrder: [] as string[],
    retrySignals: -1,
    aliveAfterRetry: -1,
  }
  const row = await executeCloseScenario('S-74', (world) => {
    let held: { readonly settled: Promise<unknown>; destroy(): void } | null =
      null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        const identity = liveIdentity(world, world.selected.id)
        const releaseHold = deferred<void>()
        identity.releaseHold = releaseHold
        identity.releaseInterruption = new Error(
          'BL-020 API ended inside the release phase'
        )
        const interrupted = deleteProject(world, world.selected.id)
        await until(
          'the close entering its release',
          () => identity.terminateCalls >= 1
        )
        releaseHold.resolve()
        identity.releaseHold = null
        const settled = await interrupted
        const invocation = world.closeInvocations.at(-1)
        // The published projection, read from the route that owns it.
        const interruptedReport = (await runtimeStatesOverHttp(world))[
          world.selected.id
        ]
        const beforeReboot = {
          interruptedStatus: settled.status,
          interruptedCategory: errorCategoryOf(settled),
          entryAfterInterruption: entryStateOf(world, world.selected.id),
          publicStateAfterInterruption: interruptedReport?.state ?? null,
          publicFailureAfterInterruption:
            interruptedReport?.failureCategory ?? null,
          signalsAfterInterruption: signalsFor(world, world.selected.id),
          registrationAfterInterruption:
            (await world.library.findById(world.selected.id)) !== undefined,
          ownershipAfterInterruption: managerAudit(world).ownershipRecords,
          removalReachedBeforeInterruption: (
            invocation?.callOrder ?? []
          ).includes('removal'),
          candidateAliveAfterInterruption: identity.alive,
          candidateIdentity: identityTriple(identity),
        }
        // Both generations become survivors of the API process they were
        // started under: the supervised child ends from the boundary's point
        // of view while the process and its loopback listener stay up, which
        // is the survivor the next boot has to attribute. The peer is carried
        // across with the subject so the replacement boot's world is the same
        // world the interrupted one was, minus the interruption.
        const peerIdentity = liveIdentity(world, world.peer.id)
        for (const survivor of [identity, peerIdentity]) {
          survivor.mode = 'unconfirmed'
          survivor.settleExit({ code: 0, signal: null, addressInUse: false })
        }
        await until(
          'the boundary recording the supervised children it can no longer confirm',
          () => entryStateOf(world, world.peer.id) === 'failed'
        )
        const signalsBeforeTransition = signalsFor(world, world.selected.id)
        world.reconcilePlan.projects = await world.library.list()
        world.reconcilePlan.candidates = [identity, peerIdentity]
        await world.reboot()
        await until(
          'the replacement boot to settle its reconciliation',
          () =>
            entryStateOf(world, world.selected.id) !== 'reconciling' &&
            entryStateOf(world, world.peer.id) !== 'reconciling'
        )
        // The published state is read from the same route projection that
        // publishes it: `inspect()` reports the internal runtime state, which
        // is not the four-value public vocabulary this expectation names.
        const rebootReport = (await runtimeStatesOverHttp(world))[
          world.selected.id
        ]
        const projection = world.manager.inspect(world.selected.id)
        // The recovery boundary's own settlement for this subject, read from
        // the reconciliation record rather than inferred from the entry state.
        const reconciliation = world.manager
          .inspectReconciliation?.()
          ?.projects.find(
            (project) => project.projectToken === tokenOf(world.selected.id)
          )
        record = Object.freeze({
          ...beforeReboot,
          rebootEntry: entryStateOf(world, world.selected.id),
          rebootRegistration:
            (await world.library.findById(world.selected.id)) !== undefined,
          rebootPublicState: rebootReport?.state ?? null,
          rebootPublicFailure: rebootReport?.failureCategory ?? null,
          rebootReconcileOutcome: reconciliation?.outcome ?? null,
          rebootRefusalReason: reconciliation?.refusalReason ?? null,
          rebootAbsenceProof: reconciliation?.absenceProof ?? null,
          rebootAdoptedIdentity:
            projection === undefined ? null : identityTriple(projection),
          candidateAliveAfterReboot: identity.alive,
          signalsFromReplacementTransition:
            signalsFor(world, world.selected.id) - signalsBeforeTransition,
        })
        world.reconcilePlan.projects = []
        // The safe retry has a real proxied pair to release, so the
        // replacement boot's own teardown order is observable.
        liveIdentity(world, world.selected.id).holdUpstream(true)
        held = openHeldWorkbenchRequest(world, world.selected.id)
        await until(
          'a live proxied pair for the retry to release',
          () => proxyAuditFor(world, world.selected).httpResponses >= 1
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        await held?.settled
        observed.retryCallOrder = [
          ...(world.closeInvocations.at(-1)?.callOrder ?? []),
        ]
        observed.retrySignals = signalsFor(world, world.selected.id)
        observed.aliveAfterRetry = identitiesFor(
          world,
          world.selected.id
        ).filter((identity) => identity.alive).length
      },
      // The interrupted close and the real replacement boot both ran before
      // the window opened, so the window holds exactly the safe retry and the
      // row reports that retry, its own ledger, and its own events alone.
      resetLedgerBeforeAct: true,
    }
  })
  assertRowConsistency(row)
  const interruption = record as InterruptionRecord | null
  expect(interruption).not.toBeNull()
  if (interruption === null) return row
  // The interruption struck inside the release phase and strictly before the
  // confirmation region: no removal instant was reached, and the interrupted
  // close delivered no signal at all to the generation it was reclaiming.
  expect(interruption.interruptedStatus).toBe(500)
  expect(interruption.interruptedCategory).toBe('project_close_failed')
  expect(interruption.removalReachedBeforeInterruption).toBe(false)
  expect(interruption.signalsAfterInterruption).toBe(0)
  expect(interruption.candidateAliveAfterInterruption).toBe(true)
  expect(interruption.entryAfterInterruption).toBe('failed')
  // The interrupted generation retained the project as `Failed` classified
  // `close-release-unconfirmed`, never absent and never `Stopped`.
  expect(interruption.publicStateAfterInterruption).toBe('Failed')
  expect(interruption.publicFailureAfterInterruption).toBe(
    'close-release-unconfirmed'
  )
  expect(interruption.registrationAfterInterruption).toBe(true)
  expect(interruption.ownershipAfterInterruption).toBeGreaterThanOrEqual(1)
  // On the replacement boot the registration is present and the surviving
  // candidate is still alive, so `absent` and `Stopped` are both unreachable
  // whatever the conjunction settles.
  expect(interruption.rebootRegistration).toBe(true)
  expect(interruption.candidateAliveAfterReboot).toBe(true)
  expect(interruption.rebootPublicState).not.toBe('Stopped')
  expect(interruption.rebootReconcileOutcome).not.toBe('absent')
  // The branch the unchanged reconciliation conjunction produced, asserted as
  // the disjunction it is and read from the recovery boundary's own record.
  const adopted = interruption.rebootReconcileOutcome === 'adopted'
  if (adopted) {
    expect(interruption.rebootEntry).toBe('running')
    expect(interruption.rebootPublicState).toBe('Running')
    expect(interruption.rebootPublicFailure).toBeNull()
    // The adopted identity is the survivor's own, element for element.
    expect(interruption.rebootAdoptedIdentity).toBe(
      interruption.candidateIdentity
    )
    expect(interruption.rebootRefusalReason).toBeNull()
  } else {
    expect(interruption.rebootReconcileOutcome).toBe('unresolved')
    expect(interruption.rebootEntry).toBe('failed')
    expect(interruption.rebootPublicState).toBe('Failed')
    expect(interruption.rebootPublicFailure).toBe('reconcile-unconfirmed')
    // The element that refused is named rather than left implicit.
    expect(interruption.rebootRefusalReason).not.toBeNull()
    expect(interruption.rebootAdoptedIdentity).toBeNull()
  }
  // The safe retry settles on that branch, and on that branch alone.
  if (adopted) {
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
    expect(row.registrationAfter).toBeNull()
    expect(observed.retryCallOrder).toEqual(['drain', 'audit', 'removal'])
    // Exactly one termination of the adopted generation, and no second signal.
    expect(observed.retrySignals).toBe(1)
    expect(observed.aliveAfterRetry).toBe(0)
  } else {
    expect(row.outcome).toBe('rejected')
    expect(row.rejectionCategory).toBe('reconcile-unresolved')
    expect(row.routeStatus).toBe(409)
    expect(row.registrationAfter).not.toBeNull()
    expect(observed.retryCallOrder).toEqual([])
    expect(observed.retrySignals).toBe(0)
  }
  // The three accounts are kept apart and asserted against their own phase.
  const accounts: SignalAccounts = Object.freeze({
    interruptedClose: interruption.signalsAfterInterruption,
    replacementTransition: interruption.signalsFromReplacementTransition,
    safeRetry: observed.retrySignals,
  })
  expect(accounts.interruptedClose).toBe(0)
  expect(accounts.replacementTransition).toBeGreaterThanOrEqual(0)
  expect(accounts.safeRetry).toBe(adopted ? 1 : 0)
  lastInterruption = interruption
  lastSignalAccounts = accounts
  note(
    'the interruption was delivered inside the release await and before any ' +
      'signal, so this row claims deterministic in-process grade only and ' +
      'never the real-host grade T-12 owns; the interrupted close retained ' +
      'entry ' +
      String(interruption.entryAfterInterruption) +
      ' published as ' +
      String(interruption.publicStateAfterInterruption) +
      '/' +
      String(interruption.publicFailureAfterInterruption) +
      ' with the registration present, ' +
      String(interruption.ownershipAfterInterruption) +
      ' manager-wide ownership record(s), and ' +
      String(accounts.interruptedClose) +
      ' signals of its own; the replacement boot settled the surviving ' +
      'attributable candidate as ' +
      String(interruption.rebootReconcileOutcome) +
      (interruption.rebootRefusalReason === null
        ? ''
        : ' (' + interruption.rebootRefusalReason + ')') +
      ' to entry ' +
      String(interruption.rebootEntry) +
      ' published as ' +
      String(interruption.rebootPublicState) +
      " (the ending generation's own orderly shutdown delivered " +
      String(accounts.replacementTransition) +
      ' signal(s) of its own the survivor ignored); the safe retry ran ' +
      (observed.retryCallOrder.length === 0
        ? 'no release at all'
        : observed.retryCallOrder.join(' > ')) +
      ' with ' +
      String(accounts.safeRetry) +
      ' signal(s) and zero residual'
  )
  return row
}

/** S-75: a frozen ownership cardinality of five against the cap of four. */
async function runS75(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    ownershipBefore: -1,
    ownershipAfter: -1,
    identitiesBefore: -1,
    identitiesAfter: -1,
    entryBefore: null as string | null,
    entryAfter: null as string | null,
    durableBefore: null as DurableFields | null,
    durableAfter: null as DurableFields | null,
    callOrder: [] as string[],
    eventsDuringClose: -1,
  }
  const row = await executeCloseScenario('S-75', (world, context) => ({
    arrangeSelected: async () => {
      await arrangeRejection(world, context, 'ownership-cardinality-exceeded')
      observed.entryBefore = entryStateOf(world, world.selected.id)
      observed.ownershipBefore = managerAudit(world).ownershipRecords
      observed.identitiesBefore = identitiesFor(
        world,
        world.selected.id
      ).filter((identity) => identity.alive).length
      observed.durableBefore = await readDurableFields(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.entryAfter = entryStateOf(world, world.selected.id)
      observed.ownershipAfter = managerAudit(world).ownershipRecords
      observed.identitiesAfter = identitiesFor(world, world.selected.id).filter(
        (identity) => identity.alive
      ).length
      observed.durableAfter = await readDurableFields(world, world.selected.id)
      observed.callOrder = [...(world.closeInvocations.at(-1)?.callOrder ?? [])]
    },
    resetLedgerBeforeAct: true,
  }))
  assertRowConsistency(row)
  observed.eventsDuringClose = row.emittedEvents.length
  expect(observed.entryBefore).toBe('failed')
  expect(observed.identitiesBefore).toBe(5)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('ownership-cardinality-exceeded')
  expect(row.routeStatus).toBe(500)
  expect(row.execution.ownershipCardinality).toEqual({
    frozen: 5,
    cap: matrixConfig.closeOwnershipSweepCap,
    sweepUnits: 1,
    capExceeded: true,
  })
  expect(row.declaredBound).toBe('B-5')
  expect(row.requiresQuarantineResolution).toBe(false)
  expect(row.execution.claimInstalledAt).not.toBeNull()
  expect(row.execution.elapsedOrigin).toBe('claim')
  expect(row.preClaimSettlement).toBeNull()
  // The gate ran inside the claim-installing section: nothing downstream of
  // it was authorised, and nothing downstream of it ran.
  expect(row.execution.drainInvocations).toBe(0)
  expect(row.execution.connectionAuditInvocations).toBe(0)
  expect(observed.callOrder).toEqual([])
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(row.execution.primitiveCalls.audit).toBe(0)
  expect(row.emittedEvents).toEqual([])
  expect(row.execution.productionPathsEntered).toEqual([
    'route-entry',
    'claim-install',
    'cardinality-gate',
  ])
  // The registration and every ownership record are exactly as found.
  expect(observed.durableAfter).toEqual(observed.durableBefore)
  expect(observed.ownershipAfter).toBe(observed.ownershipBefore)
  expect(observed.identitiesAfter).toBe(observed.identitiesBefore)
  expect(observed.entryAfter).toBe(observed.entryBefore)
  expect(row.publicState).toBe('Failed')
  expect(row.registrationAfter).not.toBeNull()
  note(
    'the cardinality gate refused inside the claim-installing section: ' +
      'frozen ' +
      String(row.execution.ownershipCardinality?.frozen) +
      ' against cap ' +
      String(row.execution.ownershipCardinality?.cap) +
      ' with sweepUnits ' +
      String(row.execution.ownershipCardinality?.sweepUnits) +
      ' (the floor, because no sweep was authorised), bound ' +
      row.declaredBound +
      ' recomputed from (false, 1), and zero drains, signals, terminations, ' +
      'removals, failure installs, and lifecycle events'
  )
  return row
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Executes the five edge scenarios in the plan's order. Every row is produced
 * by running production paths — the route, the close service, the runtime
 * manager, the workbench proxy, and the SQLite library — over loopback in a
 * world this run allocated and released.
 */
export async function runEdgeMatrix(
  only?: readonly EdgeMatrixScenarioId[]
): Promise<EdgeMatrixExecution> {
  const results: EdgeScenarioResult[] = []
  const startedAt = Date.now()

  const execute = async (
    scenario: EdgeMatrixScenarioId,
    run: (note: (text: string) => void) => Promise<ProjectCloseEvidenceRow>
  ): Promise<void> => {
    if (only !== undefined && !only.includes(scenario)) return
    const observations: string[] = []
    const enteredAt = Date.now()
    if (process.env.BL020_EDGE_REPORT === '1')
      process.stderr.write('[edge] ' + scenario + ' start\n')
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
    if (process.env.BL020_EDGE_REPORT === '1')
      process.stderr.write(
        '[edge] ' +
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

  await execute('S-69', runS69)
  await execute('S-70', runS70)
  await execute('S-71', runS71)
  await execute('S-74', runS74)
  await execute('S-75', runS75)

  const rows = results.map((result) => result.row)
  expect(rows.map((row) => row.scenario)).toEqual(
    EDGE_MATRIX_SCENARIOS.filter(
      (scenario) => only === undefined || only.includes(scenario)
    )
  )
  const execution: EdgeMatrixExecution = Object.freeze({
    rows: Object.freeze(rows),
    results: Object.freeze(results),
    durationMs: Date.now() - startedAt,
  })
  lastExecution = execution
  return execution
}

/** The five edge rows, in the plan's order. */
export async function runEdgeMatrixRows(): Promise<
  readonly ProjectCloseEvidenceRow[]
> {
  return (await runEdgeMatrix()).rows
}

let lastExecution: EdgeMatrixExecution | null = null

/** The per-scenario record of the most recent execution in this process. */
export const lastEdgeMatrixExecution = (): EdgeMatrixExecution | null =>
  lastExecution
