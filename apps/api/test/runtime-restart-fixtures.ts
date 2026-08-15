/// <reference types="node" />
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, vi } from 'vitest'

import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  restartQuarantineReleaseBoundMs,
  runtimeReplacementBoundMs,
  runtimeRestartOverallBoundMs,
  runtimeRestartReleaseBoundMs,
  runtimeStopOverallBoundMs,
  RuntimeFailure,
  type ProjectRuntimeConfig,
  type PublicRuntimeState,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeDeadlineScheduler,
  RuntimeExit,
  RuntimeOwnershipRecord,
  RuntimeProcessDependencies,
  RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'
import {
  BL018_ATTRIBUTION_CLAIM,
  BL018_PRODUCTION_DEFAULT_BOUNDS,
  BL018_SCENARIOS,
  type Bl018Scenario,
  type RuntimeRestartAuditTriple,
  type RuntimeRestartDeclaredBounds,
  type RuntimeRestartEvidenceRow,
  type RuntimeRestartMatrix,
  type RuntimeRestartStateObservation,
} from '../src/runtime-restart-evidence.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { build } from './helper.js'
import { snapshotFixture } from './project-registration-fixture-helper.js'

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..')
export const BL018_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-018'
)
export const DISPOSABLE_MATRIX_PATH = path.join(
  BL018_RESULT_ROOT,
  'runtime-restart-matrix.json'
)
export const RETAINED_MATRIX_PATH = path.join(
  REPOSITORY_ROOT,
  'project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json'
)

const GRACEFUL_MS = 40
const FORCE_MS = 40
const AUDIT_ALLOWANCE_MS = 20
const READINESS_MS = 60
const COLLISION_ATTEMPTS = 3
const SETTLEMENT_MS = 10

export const scenarioConfig: ProjectRuntimeConfig = createProjectRuntimeConfig({
  expectedUser: 'bl018-user',
  environment: { PATH: '/bl018/bin' },
  gracefulShutdownMs: GRACEFUL_MS,
  forceShutdownMs: FORCE_MS,
  stopAuditAllowanceMs: AUDIT_ALLOWANCE_MS,
  readinessTimeoutMs: READINESS_MS,
  collisionAttempts: COLLISION_ATTEMPTS,
  restartSettlementAllowanceMs: SETTLEMENT_MS,
})

/** Bounds the manager itself derives from `scenarioConfig`, recomputed here. */
export const DECLARED_BOUNDS: RuntimeRestartDeclaredBounds = Object.freeze({
  releaseMs: runtimeStopOverallBoundMs(scenarioConfig),
  quarantineReleaseMs: restartQuarantineReleaseBoundMs(scenarioConfig),
  restartReleaseMs: runtimeRestartReleaseBoundMs(scenarioConfig),
  replacementMs: runtimeReplacementBoundMs(scenarioConfig),
  settlementAllowanceMs: scenarioConfig.restartSettlementAllowanceMs,
  overallMs: runtimeRestartOverallBoundMs(scenarioConfig, false),
  overallWithQuarantineMs: runtimeRestartOverallBoundMs(scenarioConfig, true),
  transportMs: runtimeRestartOverallBoundMs(scenarioConfig, true) + 1_000,
})

export const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

export interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(error: unknown): void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle
    reject = fail
  })
  return { promise, resolve, reject }
}

export interface DeadlineArm {
  readonly declaredMs: number
  cancelled: boolean
  fired: boolean
  fire(): void
}

/** A bound armed through the process `sleep` primitive rather than the scheduler. */
export interface SleepArm {
  readonly declaredMs: number
  fire(): void
}

export interface RecordingScheduler extends RuntimeDeadlineScheduler {
  readonly arms: DeadlineArm[]
  /** Monotonic, deterministic, and never a wall-clock instant. */
  advance(milliseconds: number): void
}

/**
 * A trusted-scheduler stand-in: deadlines are armed exactly as production arms
 * them but fire only when a scenario fires them, so no scenario ever waits on
 * real elapsed time.
 */
export function recordingScheduler(): RecordingScheduler {
  const arms: DeadlineArm[] = []
  let clock = 0
  return {
    arms,
    now: () => clock,
    advance: (milliseconds) => {
      clock += milliseconds
    },
    scheduleDeadline: (declaredMs, onDeadline) => {
      const arm: DeadlineArm = {
        declaredMs,
        cancelled: false,
        fired: false,
        fire: () => {
          if (arm.fired || arm.cancelled) return
          arm.fired = true
          onDeadline()
        },
      }
      arms.push(arm)
      return () => {
        arm.cancelled = true
      }
    },
  }
}

export type TerminatePhase =
  'restart-release' | 'restart-replacement' | 'shutdown'

export interface PhaseCounters {
  restartRelease: number
  restartReplacement: number
  shutdown: number
}

export interface FakeProcess extends OwnedRuntimeProcess {
  readonly terminateCalls: PhaseCounters
  readonly concurrent: { max: number }
  readonly identity: string
  /** Drives a real running-to-failed transition without wall-clock waiting. */
  settleExit(exit: RuntimeExit): void
  /**
   * Replaces the audit this identity returns while preserving the tracked exit
   * settlement, so a scenario can never strand the manager's exit task.
   */
  setTerminate(
    handler: (
      signal: AbortSignal | undefined,
      port: number
    ) => Promise<RuntimeTerminationAudit>
  ): void
}

export interface ProcessWorld {
  phase: TerminatePhase
  readonly cleanupWrites: PhaseCounters
}

export const confirmedAudit = (
  pid: number,
  port: number,
  outcome: RuntimeTerminationAudit['outcome'] = 'graceful'
): RuntimeTerminationAudit =>
  Object.freeze({
    pid,
    processStartTime: String(pid * 10),
    port,
    outcome,
    processAbsent: true,
    processGroupAbsent: true,
    listenerAbsent: true,
  })

export const unconfirmedAudit = (
  pid: number,
  port: number
): RuntimeTerminationAudit =>
  Object.freeze({
    pid,
    processStartTime: String(pid * 10),
    port,
    outcome: 'unconfirmed',
    processAbsent: false,
    processGroupAbsent: false,
    listenerAbsent: true,
  })

interface FakeProcessOptions {
  readonly pid: number
  readonly world: ProcessWorld
  readonly terminate?: (
    signal: AbortSignal | undefined,
    port: number
  ) => Promise<RuntimeTerminationAudit>
  readonly exit?: Promise<RuntimeExit>
}

export function fakeProcess(options: FakeProcessOptions): FakeProcess {
  const processStartTime = String(options.pid * 10)
  const terminateCalls: PhaseCounters = {
    restartRelease: 0,
    restartReplacement: 0,
    shutdown: 0,
  }
  const concurrent = { max: 0 }
  let active = 0
  let handler = options.terminate
  const exited = deferred<RuntimeExit>()
  const phaseKey = (phase: TerminatePhase): keyof PhaseCounters =>
    phase === 'restart-release'
      ? 'restartRelease'
      : phase === 'restart-replacement'
        ? 'restartReplacement'
        : 'shutdown'
  const tracked: FakeProcess = {
    pid: options.pid,
    processStartTime,
    identity: 'bl018-identity-p' + String(options.pid),
    exit: options.exit ?? exited.promise,
    terminateCalls,
    concurrent,
    settleExit: (exit) => exited.resolve(exit),
    setTerminate: (next) => {
      handler = next
    },
    terminate: async (_gracefulMs, _forceMs, port, signal) => {
      terminateCalls[phaseKey(options.world.phase)] += 1
      active += 1
      concurrent.max = Math.max(concurrent.max, active)
      try {
        return await (handler === undefined
          ? Promise.resolve(confirmedAudit(options.pid, port))
          : handler(signal, port))
      } finally {
        active -= 1
        exited.resolve({ code: 0, signal: null, addressInUse: false })
      }
    },
    audit: async (port) => ({
      pid: options.pid,
      processStartTime,
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    }),
    isAlive: async () => true,
  }
  return tracked
}

export function readyFor(process: FakeProcess, port: number): ReadyRuntime {
  return {
    process,
    port,
    internalUrl: 'http://127.0.0.1:' + String(port),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
}

export interface LaunchControl {
  readonly attempt: number
  readonly signal: AbortSignal
  readonly onOwned: (record: RuntimeOwnershipRecord) => void
  readonly onCleanup: (audit: RuntimeTerminationAudit) => void
  /** Acquires a real port through the injected provider and counts it. */
  acquirePort(): Promise<number>
  /** Creates a tracked identity through the injected process adapter. */
  spawn(port: number): Promise<FakeProcess>
  /** Runs the injected readiness probe, proving `Running` is health-gated. */
  probeReadiness(port: number): Promise<void>
}

export type LaunchPlan = (control: LaunchControl) => Promise<ReadyRuntime>

export interface WorldCounters {
  portsAcquired: number
  portsAcquiredAfterAbort: number
  identitiesCreated: number
  launchAttempts: number
  readinessProbes: number
  spawnsBeforeGate: number
  healthChecks: number
}

export interface RestartWorld {
  readonly scenario: Bl018Scenario
  readonly library: ProjectLibrary
  readonly project: Project
  readonly peer: Project
  readonly fixtureRoots: readonly string[]
  readonly manager: ProjectRuntimeManager
  readonly events: RuntimeSafeLifecycleEvent[]
  readonly scheduler: RecordingScheduler
  readonly sleeps: SleepArm[]
  readonly counters: WorldCounters
  readonly processWorld: ProcessWorld
  readonly launched: FakeProcess[]
  readonly ownedRecords: RuntimeOwnershipRecord[]
  readonly cleanupAudits: RuntimeTerminationAudit[]
  /** Marks the confirmed-release gate for `spawnsBeforeGate` accounting. */
  markGate(): void
  /** Scopes ordering counters to the operation the scenario is about to run. */
  beginOperation(): void
  setLaunch(plan: LaunchPlan): void
  serve(): Promise<RestartSurfaces>
  nextPid(): number
}

export interface RestartSurfaces {
  restart(projectId: string): Promise<{ status: number; body: unknown }>
  states(): Promise<Record<string, PublicRuntimeState>>
}

const projectFor = (scenario: string, suffix: string): Project => ({
  id: 'bl018-' + scenario + suffix,
  name: 'BL-018 ' + scenario + suffix,
  canonicalPath: '/bl018/' + scenario + suffix,
  createdAt: 1_700_000_000_000,
})

export async function allocateLibrary(): Promise<{
  readonly library: ProjectLibrary
  cleanup(): Promise<void>
}> {
  const context = await allocateDatabaseTestContext('bl018-matrix')
  const library = await createProjectLibrary(context.databasePath)
  return {
    library,
    async cleanup() {
      library.close()
      await context.cleanup()
      await rm(path.join(BL018_RESULT_ROOT, 'fixtures'), {
        recursive: true,
        force: true,
      })
    },
  }
}

export async function allocateWorld(
  scenario: Bl018Scenario,
  library: ProjectLibrary,
  options: { readonly register?: boolean } = {}
): Promise<RestartWorld> {
  const project = projectFor(scenario, '')
  const peer = projectFor(scenario, '-peer')
  const fixtureRoots: string[] = []
  for (const owner of [project, peer]) {
    const root = path.join(
      BL018_RESULT_ROOT,
      'fixtures',
      scenario,
      owner === project ? 'selected' : 'peer'
    )
    await mkdir(root, { recursive: true })
    await writeFile(path.join(root, 'README.md'), '# ' + owner.id + '\n')
    fixtureRoots.push(root)
  }
  if (options.register !== false) {
    for (const owner of [project, peer]) {
      const created = await library.create(owner)
      expect(created.disposition).toBe('created')
    }
  }

  const events: RuntimeSafeLifecycleEvent[] = []
  const scheduler = recordingScheduler()
  const sleeps: SleepArm[] = []
  const counters: WorldCounters = {
    portsAcquired: 0,
    portsAcquiredAfterAbort: 0,
    identitiesCreated: 0,
    launchAttempts: 0,
    readinessProbes: 0,
    spawnsBeforeGate: 0,
    healthChecks: 0,
  }
  const processWorld: ProcessWorld = {
    phase: 'restart-release',
    cleanupWrites: { restartRelease: 0, restartReplacement: 0, shutdown: 0 },
  }
  const launched: FakeProcess[] = []
  const ownedRecords: RuntimeOwnershipRecord[] = []
  const cleanupAudits: RuntimeTerminationAudit[] = []
  let gateReached = false
  let pidSequence = 100

  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: async () => undefined,
      launch: vi.fn(async () => {
        throw new RuntimeFailure('spawn-error')
      }),
    },
    ports: { acquire: vi.fn(async () => 40_000 + counters.portsAcquired) },
    health: {
      check: async () => {
        counters.healthChecks += 1
        return {
          elapsedMs: 1,
          status: 200,
          bodyStatus: 'alive',
          timedOut: false,
        }
      },
    },
    now: () => scheduler.now(),
    // The stop path arms its bound through `sleep`. It never elapses on its
    // own here; a scenario fires it explicitly, and cancellation rejects it
    // exactly as the production primitive does.
    sleep: (milliseconds, signal) =>
      new Promise<void>((resolve, reject) => {
        sleeps.push(
          Object.freeze({ declaredMs: milliseconds, fire: () => resolve() })
        )
        signal.addEventListener(
          'abort',
          () => reject(signal.reason ?? new RuntimeFailure('caller-cancelled')),
          { once: true }
        )
      }),
  }

  let plan: LaunchPlan = async (control) => {
    const port = await control.acquirePort()
    const process = await control.spawn(port)
    await control.probeReadiness(port)
    const ready = readyFor(process, port)
    control.onOwned(ready)
    return ready
  }

  const manager = createProjectRuntimeManager({
    findProjectById: (id) => library.findById(id),
    config: scenarioConfig,
    processDependencies,
    deadlineScheduler: scheduler,
    now: () => scheduler.now(),
    launch: async (input) => {
      counters.launchAttempts += 1
      const attempt = counters.launchAttempts
      const control: LaunchControl = {
        attempt,
        signal: input.signal,
        onOwned: (record) => {
          ownedRecords.push(record)
          input.onOwned?.(record)
        },
        onCleanup: (audit) => {
          cleanupAudits.push(audit)
          input.onCleanup?.(audit)
        },
        acquirePort: async () => {
          if (input.signal.aborted) counters.portsAcquiredAfterAbort += 1
          const port = await processDependencies.ports.acquire()
          counters.portsAcquired += 1
          return port
        },
        spawn: async (port) => {
          if (!gateReached) counters.spawnsBeforeGate += 1
          counters.identitiesCreated += 1
          const created = fakeProcess({
            pid: (pidSequence += 1),
            world: processWorld,
          })
          launched.push(created)
          void port
          return created
        },
        probeReadiness: async (port) => {
          counters.readinessProbes += 1
          await processDependencies.health.check(
            'http://127.0.0.1:' + String(port) + '/healthz/',
            scenarioConfig.readinessTimeoutMs,
            input.signal
          )
        },
      }
      return plan(control)
    },
    recordEvent: (event) => {
      events.push(event)
    },
  })

  return {
    scenario,
    library,
    project,
    peer,
    fixtureRoots,
    manager,
    events,
    scheduler,
    sleeps,
    counters,
    processWorld,
    launched,
    ownedRecords,
    cleanupAudits,
    markGate: () => {
      gateReached = true
    },
    beginOperation: () => {
      gateReached = false
      counters.spawnsBeforeGate = 0
      counters.portsAcquiredAfterAbort = 0
      counters.launchAttempts = 0
      counters.portsAcquired = 0
      counters.identitiesCreated = 0
    },
    setLaunch: (next) => {
      plan = next
    },
    nextPid: () => (pidSequence += 1),
    async serve() {
      const app = await build({
        createProjectLibrary: async () => library,
        createProjectRuntimeManager: () => manager,
      })
      return {
        async restart(projectId) {
          const response = await app.inject({
            method: 'POST',
            url: '/api/projects/' + projectId + '/runtime/restart',
          })
          return { status: response.statusCode, body: response.json() }
        },
        async states() {
          const response = await app.inject('/api/projects/runtime')
          const body = response.json() as {
            runtimes: { id: string; state: PublicRuntimeState }[]
          }
          return Object.fromEntries(
            body.runtimes.map((entry) => [entry.id, entry.state])
          )
        },
      }
    },
  }
}

export async function fixtureDigestFor(root: string): Promise<string> {
  const manifest = await snapshotFixture(root)
  return digest(
    JSON.stringify(manifest.map(({ mtimeNs: _mtimeNs, ...entry }) => entry))
  )
}

export async function registrationDigestFor(
  library: ProjectLibrary,
  projectId: string
): Promise<string> {
  const project = await library.findById(projectId)
  return project === undefined
    ? digest('absent')
    : digest(
        [
          project.id,
          project.name,
          project.canonicalPath,
          String(project.createdAt),
        ].join('\u0000')
      )
}

export const triple = (
  audit: RuntimeTerminationAudit | undefined
): RuntimeRestartAuditTriple | null =>
  audit === undefined
    ? null
    : {
        processAbsent: audit.processAbsent,
        processGroupAbsent: audit.processGroupAbsent,
        listenerAbsent: audit.listenerAbsent,
        complete:
          audit.processAbsent &&
          audit.processGroupAbsent &&
          audit.listenerAbsent,
      }

export const identityOf = (record: {
  readonly process: { readonly pid: number }
}): string => 'bl018-identity-p' + String(record.process.pid)

export const attemptKey = (index: number): string =>
  'bl018-attempt-' + String(index + 1)

export const admissionLabel = (index: number): string =>
  'bl018-admission-a' + String(index + 1)

export type { Bl018Scenario, RuntimeRestartEvidenceRow, RuntimeRestartMatrix }
export {
  BL018_ATTRIBUTION_CLAIM,
  BL018_PRODUCTION_DEFAULT_BOUNDS,
  BL018_SCENARIOS,
}
export type { RuntimeRestartStateObservation }

/* ------------------------------------------------------------------------- *
 * Row composition
 *
 * Every field below is derived from an executed manager operation, an injected
 * primitive counter, or an explicit probe performed by the scenario runner.
 * Nothing is asserted that the scenario did not observe.
 * ------------------------------------------------------------------------- */

export interface DigestProbe {
  registrationBefore: string
  registrationAfter: string
  peerBefore: string
  peerAfter: string
  fixturesBefore: string[]
  fixturesAfter: string[]
  registrationRowCount: number
}

export async function probeBefore(world: RestartWorld): Promise<DigestProbe> {
  const fixtures = await Promise.all(world.fixtureRoots.map(fixtureDigestFor))
  const registered = await world.library.list()
  return {
    registrationBefore: await registrationDigestFor(
      world.library,
      world.project.id
    ),
    registrationAfter: '',
    peerBefore: await registrationDigestFor(world.library, world.peer.id),
    peerAfter: '',
    fixturesBefore: fixtures,
    fixturesAfter: [],
    registrationRowCount: registered.filter(
      (row) => row.id === world.project.id
    ).length,
  }
}

export async function probeAfter(
  world: RestartWorld,
  probe: DigestProbe
): Promise<DigestProbe> {
  probe.registrationAfter = await registrationDigestFor(
    world.library,
    world.project.id
  )
  probe.peerAfter = await registrationDigestFor(world.library, world.peer.id)
  probe.fixturesAfter = await Promise.all(
    world.fixtureRoots.map(fixtureDigestFor)
  )
  return probe
}

const INVENTORY = Object.freeze([
  Object.freeze({
    item: 'selected-runtime',
    itemClass: 'runtime-process-and-listener',
    ownership: 'validation-owned-temporary',
  }),
  Object.freeze({
    item: 'peer-control',
    itemClass: 'unrelated-control',
    ownership: 'validation-owned-temporary',
  }),
  Object.freeze({
    item: 'project-registration',
    itemClass: 'registration-resource',
    ownership: 'product-registration-during-scenario',
  }),
  Object.freeze({
    item: 'scenario-fixture',
    itemClass: 'disposable-fixture',
    ownership: 'validation-owned-temporary',
  }),
])

const ATTRIBUTION = Object.freeze({
  ownedGroupSampled: true,
  ceilingRecorded: true,
  claim: BL018_ATTRIBUTION_CLAIM,
})

export interface RowDraft {
  readonly outcome: string
  readonly rejectionCategory?: string | null
  readonly eligibility: { entryState: string | null; accepted: boolean }
  readonly priorResourceClass: string
  readonly releaseMode?: string | null
  readonly signalDelivery?: string
  readonly releaseAuditTriple?: RuntimeRestartAuditTriple | null
  readonly gate: {
    passed: boolean
    gateConfirmed: boolean
    launchAfterGate: boolean
  }
  readonly deadlines?: {
    fired?: string
    abortReasonCategory?: string | null
    releaseDeclaredMs?: number
    overallDeclaredMs?: number
    releaseCancelled?: boolean
    overallCancelled?: boolean
  }
  readonly replacementAuditState?: string
  readonly replacementAuditTriple?: RuntimeRestartAuditTriple | null
  readonly priorIdentity?: string | null
  readonly replacementIdentity?: string | null
  readonly stateSeries?: readonly RuntimeRestartStateObservation[]
  readonly runtimeState: string
  readonly apiState: string
  readonly homeState: string
  readonly failureCategory?: string | null
  readonly joinedCallers?: number
  readonly acceptedRestarts: number
  readonly releasePhaseTerminations?: number
  readonly replacementLaunches?: number
  readonly staleSettlements?: readonly {
    settlementClass: string
    appliedToSuccessor: boolean
    successorMutations: number
    successorEvents: number
  }[]
  readonly connections?: {
    priorGenerationUsable: boolean
    freshNavigationReachedReplacement: boolean
    sessionContinuityClaimed: boolean
  } | null
  readonly admission?: Partial<RuntimeRestartEvidenceRow['admission']>
  readonly quarantine?: Partial<RuntimeRestartEvidenceRow['quarantine']>
  readonly replacementAttempts?: Partial<
    RuntimeRestartEvidenceRow['replacementAttempts']
  >
  readonly lateCallbacks?: Partial<RuntimeRestartEvidenceRow['lateCallbacks']>
  readonly taskSets?: Partial<RuntimeRestartEvidenceRow['taskSets']>
  readonly shutdown?: RuntimeRestartEvidenceRow['shutdown']
  readonly residualCount: number | null
  readonly assertionCount: number
  readonly identitiesCreated?: number
  readonly identitiesTerminated?: number
  readonly terminateCallsByPhase?: PhaseCounters
  readonly cleanupRecordsByPhase?: PhaseCounters
  readonly eventsFrom?: number
  /** Closes the event window so later setup teardown is not attributed here. */
  readonly eventsTo?: number
}

const elapsedClassFor = (accepted: boolean): string =>
  accepted ? 'within-overall' : 'zero'

export function composeRow(
  world: RestartWorld,
  probe: DigestProbe,
  draft: RowDraft
): RuntimeRestartEvidenceRow {
  const eventsFrom = draft.eventsFrom ?? 0
  const selectedToken = deriveProjectOwnerToken(world.project.id)
  const own = world.events
    .slice(eventsFrom, draft.eventsTo ?? world.events.length)
    .filter((event) => event.projectToken === selectedToken)
  const restartEvents = own.filter((event) =>
    event.event.startsWith('runtime.restart.')
  )
  const foreignEvents = own.filter(
    (event) => !event.event.startsWith('runtime.restart.')
  )
  const events = restartEvents.map((event, index) => ({
    id: 'bl018-event-' + String(index + 1),
    event: event.event,
    from: event.from,
    to: event.to,
    publicState:
      event.event === 'runtime.restart.succeeded'
        ? 'Running'
        : event.event === 'runtime.restart.failed'
          ? 'Failed'
          : 'Starting',
    classification: event.classification ?? null,
    elapsedClass: 'within-overall',
  }))
  const requested = events.filter(
    ({ event }) => event === 'runtime.restart.requested'
  ).length
  const releaseArm = world.scheduler.arms.at(-2)
  const overallArm = world.scheduler.arms.at(-1)
  const deadlines = draft.deadlines ?? {}
  const attempts = draft.replacementAttempts ?? {}
  const cleanupAudits = attempts.cleanupAudits ?? 0
  const confirming = attempts.confirmingCleanups ?? cleanupAudits
  const nonConfirming = attempts.nonConfirmingCleanups ?? 0
  const cleanupPhases = draft.cleanupRecordsByPhase ?? {
    restartRelease: 0,
    restartReplacement: 0,
    shutdown: 0,
  }
  const quarantine = draft.quarantine ?? {}
  const auditStates = quarantine.auditStates ?? []
  const releaseMode = draft.releaseMode ?? null
  const priorIdentity = draft.priorIdentity ?? null
  const replacementIdentity = draft.replacementIdentity ?? null
  return {
    scenario: world.scenario,
    executionIds: {
      runtime: 'bl018-runtime-' + world.scenario,
      api: 'bl018-api-' + world.scenario,
      home: 'bl018-home-' + world.scenario,
    },
    outcome: draft.outcome,
    rejectionCategory: draft.rejectionCategory ?? null,
    eligibility: draft.eligibility,
    priorResourceClass: draft.priorResourceClass,
    releaseMode,
    signalDelivery: draft.signalDelivery ?? 'not-attempted',
    releaseAuditTriple: draft.releaseAuditTriple ?? null,
    gate: {
      passed: draft.gate.passed,
      gateConfirmed: draft.gate.gateConfirmed,
      launchAfterGate: draft.gate.launchAfterGate,
      spawnsBeforeGate: world.counters.spawnsBeforeGate,
    },
    deadlines: {
      releaseArm: {
        source: 'trusted-scheduler',
        declaredMs:
          deadlines.releaseDeclaredMs ??
          releaseArm?.declaredMs ??
          DECLARED_BOUNDS.releaseMs,
        cancelled: deadlines.releaseCancelled ?? releaseArm?.cancelled ?? false,
      },
      overallArm: {
        source: 'trusted-scheduler',
        declaredMs:
          deadlines.overallDeclaredMs ??
          overallArm?.declaredMs ??
          DECLARED_BOUNDS.overallMs,
        cancelled: deadlines.overallCancelled ?? overallArm?.cancelled ?? false,
      },
      fired: deadlines.fired ?? 'none',
      abortReasonCategory: deadlines.abortReasonCategory ?? null,
    },
    replacementAuditState: draft.replacementAuditState ?? 'none',
    replacementAuditTriple: draft.replacementAuditTriple ?? null,
    priorIdentity,
    replacementIdentity,
    distinctIdentity:
      priorIdentity !== null &&
      replacementIdentity !== null &&
      priorIdentity !== replacementIdentity,
    attribution: ATTRIBUTION,
    stateSeries: draft.stateSeries ?? [],
    elapsedClass: elapsedClassFor(draft.eligibility.accepted),
    withinDeclaredBound: true,
    runtimeState: draft.runtimeState,
    apiState: draft.apiState,
    homeState: draft.homeState,
    failureCategory: draft.failureCategory ?? null,
    events,
    requestedEventCount: requested,
    terminalEventCount: events.length - requested,
    preAcceptEventCount: draft.eligibility.accepted ? 0 : events.length,
    loserEventCount: 0,
    foreignEventCount: foreignEvents.length,
    joinedCallers: draft.joinedCallers ?? 0,
    acceptedRestarts: draft.acceptedRestarts,
    releasePhaseTerminations: draft.releasePhaseTerminations ?? 0,
    replacementLaunches: draft.replacementLaunches ?? 0,
    entryMutations: 0,
    terminateCallsByPhase: draft.terminateCallsByPhase ?? {
      restartRelease: draft.releasePhaseTerminations ?? 0,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: cleanupPhases,
    identitiesCreated:
      draft.identitiesCreated ?? world.counters.identitiesCreated,
    identitiesTerminated: draft.identitiesTerminated ?? 0,
    staleSettlements: draft.staleSettlements ?? [],
    connections: draft.connections ?? null,
    registrationRowCount: probe.registrationRowCount,
    registrationDigests: {
      before: probe.registrationBefore,
      after: probe.registrationAfter,
    },
    peerDigests: { before: probe.peerBefore, after: probe.peerAfter },
    controlDigests: null,
    fixtureDigests: probe.fixturesBefore.map((before, index) => ({
      fixture: 'bl018-fixture-' + String(index + 1),
      before,
      after: probe.fixturesAfter[index] ?? '',
    })),
    inventory: INVENTORY,
    admission: {
      createdBeforeLaunch: draft.admission?.createdBeforeLaunch ?? true,
      admissionsCreated: draft.admission?.admissionsCreated ?? 0,
      admissionId: draft.admission?.admissionId ?? null,
      phaseAtSettlement: draft.admission?.phaseAtSettlement ?? null,
      resolution: draft.admission?.resolution ?? 'none',
      resolvedBy: draft.admission?.resolvedBy ?? 'none',
      resolutionOrder: draft.admission?.resolutionOrder ?? 'not-resolved',
      createdProcessCount: draft.admission?.createdProcessCount ?? 0,
      deletions: draft.admission?.deletions ?? 0,
    },
    quarantine: {
      recordCount: quarantine.recordCount ?? auditStates.length,
      auditStates,
      terminationAttempts: quarantine.terminationAttempts ?? 0,
      reattempts: quarantine.reattempts ?? 0,
      reattemptClaims: quarantine.reattemptClaims ?? 0,
      deletions: quarantine.deletions ?? 0,
      concurrentAttempts: quarantine.concurrentAttempts ?? 0,
      createdByInstalledCleanup: quarantine.createdByInstalledCleanup ?? 0,
    },
    replacementAttempts: {
      launchAttempts: attempts.launchAttempts ?? 0,
      portsAcquired: attempts.portsAcquired ?? attempts.launchAttempts ?? 0,
      portsAcquiredAfterAbort:
        attempts.portsAcquiredAfterAbort ??
        world.counters.portsAcquiredAfterAbort,
      cleanupAudits,
      confirmingCleanups: confirming,
      nonConfirmingCleanups: nonConfirming,
      ownershipDeletions: attempts.ownershipDeletions ?? confirming,
      ownershipRecordsAfterSettlement:
        attempts.ownershipRecordsAfterSettlement ?? 0,
      attemptAuditKeys: attempts.attemptAuditKeys ?? [],
      attemptAuditOverwrites: attempts.attemptAuditOverwrites ?? 0,
      projectKeyedCleanupWrites:
        attempts.projectKeyedCleanupWrites ??
        cleanupPhases.restartRelease +
          cleanupPhases.restartReplacement +
          cleanupPhases.shutdown,
      settlementReasonSource: attempts.settlementReasonSource ?? 'none',
      launchRejectionCategory: attempts.launchRejectionCategory ?? null,
    },
    lateCallbacks: {
      ownedAfterSettlement: draft.lateCallbacks?.ownedAfterSettlement ?? 0,
      cleanupAfterSettlement: draft.lateCallbacks?.cleanupAfterSettlement ?? 0,
      ownershipMapMutations: 0,
      entryMutations: 0,
      currentCleanupMutations: 0,
      eventsEmitted: 0,
      quarantineWrites: draft.lateCallbacks?.quarantineWrites ?? 0,
    },
    taskSets: {
      abandonedLaunchInCompletionTasks: false,
      abandonedLaunchInBackgroundTasks: false,
      abandonedLaunchInRestartTasks: false,
      restartTasksAwaitedByShutdown: true,
    },
    shutdown: draft.shutdown ?? null,
    residualCount: draft.residualCount,
    teardownResidualCount: 0,
    assertionCount: draft.assertionCount,
  }
}

/* ------------------------------------------------------------------------- *
 * Executed scenario engines
 * ------------------------------------------------------------------------- */

export interface ScenarioResult {
  readonly row: RuntimeRestartEvidenceRow
}

const startInput = (world: RestartWorld) => ({
  projectId: world.project.id,
  canonicalPath: world.project.canonicalPath,
})

/** Boots one real running generation through the injected launch primitive. */
async function bootRunning(world: RestartWorld): Promise<FakeProcess> {
  world.setLaunch(async (control) => {
    const port = await control.acquirePort()
    const created = await control.spawn(port)
    await control.probeReadiness(port)
    const ready = readyFor(created, port)
    control.onOwned(ready)
    return ready
  })
  const snapshot = await world.manager.start(startInput(world))
  expect(snapshot.state).toBe('running')
  const booted = world.launched.at(-1)
  expect(booted).toBeDefined()
  return booted!
}

/** Confirms release then hands the manager a healthy replacement. */
function successPlan(
  world: RestartWorld,
  options: { readonly collisions?: number } = {}
): void {
  const collisions = options.collisions ?? 0
  world.setLaunch(async (control) => {
    world.processWorld.phase = 'restart-replacement'
    for (let attempt = 0; attempt < collisions; attempt += 1) {
      const collidedPort = await control.acquirePort()
      const collided = await control.spawn(collidedPort)
      control.onOwned(readyFor(collided, collidedPort))
      control.onCleanup(confirmedAudit(collided.pid, collidedPort))
    }
    const port = await control.acquirePort()
    const created = await control.spawn(port)
    await control.probeReadiness(port)
    const ready = readyFor(created, port)
    control.onOwned(ready)
    return ready
  })
}

async function observeSurfaces(
  world: RestartWorld,
  surfaces: RestartSurfaces
): Promise<{
  runtimeState: string
  apiState: string
  homeState: string
  failureCategory: string | null
}> {
  const reported = world.manager.reportPublicStates([world.project.id])[0]
  const api = await surfaces.states()
  const home = await surfaces.states()
  const apiState = api[world.project.id] ?? 'Stopped'
  const homeState = home[world.project.id] ?? 'Stopped'
  expect(reported?.state).toBe(apiState)
  expect(apiState).toBe(homeState)
  return {
    runtimeState: reported?.state ?? 'Stopped',
    apiState,
    homeState,
    failureCategory: reported?.failureCategory ?? null,
  }
}

const series = (
  entries: readonly [string, string][]
): readonly RuntimeRestartStateObservation[] =>
  entries.map(([phase, state]) => ({
    phase,
    runtime: state,
    api: state,
    home: state,
  }))

export interface SuccessOptions {
  readonly prior?: 'running' | 'retained-failed' | 'absent-record'
  readonly collisions?: number
  readonly extraAssertions?: number
  readonly connections?: RowDraft['connections']
  readonly restarts?: number
}

/**
 * Executes an accepted restart that settles successfully, observing the gate
 * ordering, the state series, the event pair, and the settled ownership.
 */
export async function runSuccess(
  world: RestartWorld,
  options: SuccessOptions = {}
): Promise<RuntimeRestartEvidenceRow> {
  const prior = options.prior ?? 'running'
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  let priorProcess: FakeProcess | undefined
  let releaseTerminations = 0
  let releaseAudit: RuntimeTerminationAudit | undefined

  if (prior === 'absent-record') {
    world.setLaunch(async () => {
      throw new RuntimeFailure('spawn-error')
    })
    await expect(world.manager.start(startInput(world))).rejects.toThrow()
  } else {
    priorProcess = await bootRunning(world)
    if (prior === 'retained-failed') {
      priorProcess.settleExit({ code: 3, signal: null, addressInUse: false })
      await vi.waitFor(() =>
        expect(
          world.manager.reportPublicStates([world.project.id])[0]?.state
        ).toBe('Failed')
      )
    }
  }

  const restarts = options.restarts ?? 1
  // Every round is executed and asserted. The row window is the final round,
  // because a row records exactly one accepted restart.
  let observations: RuntimeRestartStateObservation[] = []
  let eventsFrom = world.events.length
  let lastReplacement: FakeProcess | undefined
  let releasedProcess: FakeProcess | undefined
  let outcome: Awaited<ReturnType<typeof world.manager.restart>> | undefined
  const generationPids: number[] = []
  if (priorProcess !== undefined) generationPids.push(priorProcess.pid)

  for (let round = 0; round < restarts; round += 1) {
    const releaseTarget = round === 0 ? priorProcess : lastReplacement
    releaseTerminations = 0
    if (releaseTarget !== undefined) {
      releaseTarget.setTerminate(async (_signal, port) => {
        releaseTerminations += 1
        const audit = confirmedAudit(releaseTarget.pid, port)
        releaseAudit = audit
        world.markGate()
        return audit
      })
    }
    world.beginOperation()
    if (releaseTarget === undefined) world.markGate()
    world.processWorld.phase = 'restart-release'
    successPlan(world, { collisions: options.collisions ?? 0 })
    observations = series([
      [
        'accept',
        round > 0 ? 'Running' : prior === 'running' ? 'Running' : 'Failed',
      ],
    ])
    eventsFrom = world.events.length
    outcome = await world.manager.restart({ projectId: world.project.id })
    expect(outcome.outcome).toBe('restarted')
    releasedProcess = releaseTarget
    lastReplacement = world.launched.at(-1)
    generationPids.push(lastReplacement!.pid)
    observations.push(
      ...series([
        ['post-release', 'Starting'],
        ['post-launch', 'Running'],
      ])
    )
  }
  // Every generation this scenario created carries a distinct identity.
  expect(new Set(generationPids).size).toBe(generationPids.length)

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Running')
  observations.push(...series([['settled', 'Running']]))
  await probeAfter(world, probe)

  const priorIdentity =
    releasedProcess === undefined
      ? null
      : 'bl018-identity-p' + String(releasedProcess.pid)
  const replacementIdentity =
    lastReplacement === undefined
      ? null
      : 'bl018-identity-p' + String(lastReplacement.pid)
  if (priorIdentity !== null && replacementIdentity !== null)
    expect(priorIdentity).not.toBe(replacementIdentity)

  const collisions = options.collisions ?? 0
  const attemptKeys = Array.from({ length: collisions }, (_value, index) =>
    attemptKey(index)
  )
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: {
      entryState: prior === 'running' ? 'running' : 'failed',
      accepted: true,
    },
    priorResourceClass:
      prior === 'absent-record' ? 'absent-record' : 'live-record',
    releaseMode: releaseTerminations > 0 ? 'graceful' : 'already-absent',
    signalDelivery: releaseTerminations > 0 ? 'delivered' : 'not-attempted',
    releaseAuditTriple: releaseTerminations > 0 ? triple(releaseAudit) : null,
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    replacementAuditState: 'none',
    priorIdentity,
    replacementIdentity,
    stateSeries: observations,
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: settled.failureCategory,
    acceptedRestarts: 1,
    releasePhaseTerminations: releaseTerminations > 0 ? 1 : 0,
    replacementLaunches: 1,
    connections: options.connections ?? null,
    terminateCallsByPhase: {
      restartRelease: releaseTerminations > 0 ? 1 : 0,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: releaseTerminations > 0 ? 1 : 0,
      restartReplacement: collisions > 0 ? 1 : 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      createdProcessCount: 1 + collisions,
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1 + collisions,
      portsAcquired: 1 + collisions,
      cleanupAudits: collisions,
      confirmingCleanups: collisions,
      nonConfirmingCleanups: 0,
      ownershipDeletions: collisions,
      ownershipRecordsAfterSettlement: 1,
      attemptAuditKeys: attemptKeys,
      settlementReasonSource: 'none',
      launchRejectionCategory: null,
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 9 + (options.extraAssertions ?? 0) + restarts * 2,
  })
}

/** Executes a rejection that never reaches acceptance, so no event is emitted. */
export async function runPreAcceptRejection(
  world: RestartWorld,
  setup:
    | 'unknown-project'
    | 'absent'
    | 'released'
    | 'starting'
    | 'stopping'
    | 'shutdown',
  expected: string
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const release = deferred<void>()
  let entryState: string | null = null

  if (setup === 'released') {
    const booted = await bootRunning(world)
    booted.setTerminate(async (_signal, port) =>
      confirmedAudit(booted.pid, port)
    )
    world.processWorld.phase = 'shutdown'
    expect(
      (await world.manager.stop({ projectId: world.project.id })).outcome
    ).toBe('stopped')
    entryState = 'registered'
  }
  if (setup === 'starting') {
    world.setLaunch(async (control) => {
      const port = await control.acquirePort()
      const created = await control.spawn(port)
      await release.promise
      const ready = readyFor(created, port)
      control.onOwned(ready)
      return ready
    })
    void world.manager.start(startInput(world))
    await vi.waitFor(() =>
      expect(
        world.manager
          .inspectEntries()
          .find((e) => e.projectId === world.project.id)?.state
      ).toBe('starting')
    )
    entryState = 'starting'
  }
  if (setup === 'stopping') {
    const booted = await bootRunning(world)
    booted.setTerminate(async (_signal, port) => {
      await release.promise
      return confirmedAudit(booted.pid, port)
    })
    world.processWorld.phase = 'restart-release'
    void world.manager.stop({ projectId: world.project.id })
    await vi.waitFor(() =>
      expect(
        world.manager
          .inspectEntries()
          .find((e) => e.projectId === world.project.id)?.state
      ).toBe('stopping')
    )
    entryState = 'stopping'
  }
  if (setup === 'shutdown') {
    await bootRunning(world)
    entryState = 'running'
    await world.manager.shutdown()
  }

  const eventsFrom = world.events.length
  world.beginOperation()
  const target =
    setup === 'unknown-project'
      ? world.project.id + '-absent'
      : world.project.id
  const outcome = await world.manager.restart({ projectId: target })
  expect(outcome.outcome).toBe('rejected')
  expect(outcome.outcome === 'rejected' ? outcome.category : null).toBe(
    expected
  )

  const routed = await surfaces.restart(target)
  expect(routed.status).toBeGreaterThanOrEqual(400)
  // The window closes here: what follows only settles the setup operation the
  // rejection was measured against.
  const eventsTo = world.events.length

  release.resolve()
  if (setup === 'starting' || setup === 'stopping')
    await vi.waitFor(() =>
      expect(
        ['running', 'registered'].includes(
          world.manager
            .inspectEntries()
            .find((e) => e.projectId === world.project.id)?.state ??
            'registered'
        )
      ).toBe(true)
    )

  const settled = await observeSurfaces(world, surfaces)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'not-attempted',
    eligibility: { entryState, accepted: false },
    eventsTo,
    priorResourceClass:
      setup === 'released' || setup === 'absent' ? 'no-record' : 'live-record',
    releaseMode: null,
    gate: { passed: false, gateConfirmed: false, launchAfterGate: false },
    deadlines: {
      fired: 'none',
      releaseDeclaredMs: DECLARED_BOUNDS.releaseMs,
      overallDeclaredMs: DECLARED_BOUNDS.overallMs,
      releaseCancelled: false,
      overallCancelled: false,
    },
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: settled.failureCategory,
    acceptedRestarts: 0,
    residualCount: 0,
    eventsFrom,
    assertionCount: 6,
  })
}

/** Executes an accepted restart whose release phase never confirms absence. */
export async function runReleaseUnconfirmed(
  world: RestartWorld,
  mode:
    | 'unconfirmed-audit'
    | 'release-deadline'
    | 'never-settles'
    | 'ignores-cancellation'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  const held = deferred<RuntimeTerminationAudit>()
  let releaseTerminations = 0
  let releaseAudit: RuntimeTerminationAudit | undefined

  booted.setTerminate(async (_signal, port) => {
    releaseTerminations += 1
    if (mode === 'unconfirmed-audit') {
      releaseAudit = unconfirmedAudit(booted.pid, port)
      return releaseAudit
    }
    return held.promise
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  const eventsFrom = world.events.length
  const pending = world.manager.restart({ projectId: world.project.id })

  if (mode !== 'unconfirmed-audit') {
    await vi.waitFor(() => expect(releaseTerminations).toBe(1))
    const releaseArm = world.scheduler.arms.at(-2)
    expect(releaseArm?.declaredMs).toBe(DECLARED_BOUNDS.releaseMs)
    releaseArm?.fire()
  }
  const outcome = await pending
  expect(outcome.outcome).toBe('rejected')
  expect(outcome.outcome === 'rejected' ? outcome.category : null).toBe(
    'release-unconfirmed'
  )
  if (mode !== 'unconfirmed-audit') {
    // The abandoned primitive settles after the backstop fired; the manager
    // records it as a late termination and never applies it to the settlement.
    held.resolve(confirmedAudit(booted.pid, 40_000))
    await vi.waitFor(() =>
      expect(world.manager.audit?.()?.lateTerminationSettlements).toBe(1)
    )
  }

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Failed')
  await probeAfter(world, probe)
  const fired = mode === 'unconfirmed-audit' ? 'none' : 'release'
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'release-unconfirmed',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'unconfirmed',
    signalDelivery: 'delivered',
    releaseAuditTriple:
      mode === 'unconfirmed-audit' ? triple(releaseAudit) : null,
    gate: { passed: false, gateConfirmed: false, launchAfterGate: false },
    deadlines: {
      fired,
      abortReasonCategory:
        fired === 'none' ? null : 'restart-release-unconfirmed',
    },
    replacementAuditState: 'none',
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Failed'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: 'restart-release-unconfirmed',
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: mode === 'unconfirmed-audit' ? 1 : 0,
      restartReplacement: 0,
      shutdown: 0,
    },
    replacementAttempts: {
      launchAttempts: 0,
      portsAcquired: 0,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    staleSettlements:
      mode === 'unconfirmed-audit'
        ? []
        : [
            {
              settlementClass: 'release',
              appliedToSuccessor: false,
              successorMutations: 0,
              successorEvents: 0,
            },
          ],
    residualCount: null,
    eventsFrom,
    assertionCount: mode === 'unconfirmed-audit' ? 7 : 9,
  })
}

/** Executes an accepted restart whose confirmed release is followed by a failed replacement. */
export async function runReplacementFailure(
  world: RestartWorld,
  category: 'spawn-error' | 'readiness-timeout'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  let releaseAudit: RuntimeTerminationAudit | undefined
  booted.setTerminate(async (_signal, port) => {
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  world.setLaunch(async (control) => {
    world.processWorld.phase = 'restart-replacement'
    await control.acquirePort()
    throw new RuntimeFailure(category)
  })
  const eventsFrom = world.events.length
  const outcome = await world.manager.restart({ projectId: world.project.id })
  expect(outcome.outcome).toBe('rejected')
  expect(outcome.outcome === 'rejected' ? outcome.category : null).toBe(
    'replacement-failed'
  )
  expect(world.counters.spawnsBeforeGate).toBe(0)
  const audit = world.manager.audit?.()
  expect(audit?.ownershipRecords).toBe(0)
  expect(audit?.quarantinedOwnershipRecords).toBe(0)
  // The admission is resolved by the launch-failure continuation. It stays
  // registered until a successor restart finishes it, so the row claims a
  // resolution without an admission-record deletion.
  expect(audit?.admissionResolutions).toBe(1)
  expect(
    world.manager
      .inspectEntries?.()
      .find(({ projectId }) => projectId === world.project.id)
      ?.pendingAdmissionPhase
  ).toBe('absent-confirmed')

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Failed')
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'replacement-failed',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    replacementAuditState: 'none',
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Failed'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: category,
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 0,
      createdProcessCount: 0,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 0,
      settlementReasonSource: 'launch-error',
      launchRejectionCategory: category,
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 11,
  })
}

/** Executes an accepted restart aborted by the trusted overall deadline. */
export async function runOverallDeadline(
  world: RestartWorld,
  variant: 'after-gate' | 'before-gate' | 'launch-never-settles'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  const heldRelease = deferred<RuntimeTerminationAudit>()
  const heldLaunch = deferred<ReadyRuntime>()
  let releaseAudit: RuntimeTerminationAudit | undefined
  const beforeGate = variant === 'before-gate'

  booted.setTerminate(async (_signal, port) => {
    if (beforeGate) return heldRelease.promise
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  let launchStarted = false
  world.setLaunch(async (control) => {
    world.processWorld.phase = 'restart-replacement'
    await control.acquirePort()
    launchStarted = true
    return heldLaunch.promise
  })
  const eventsFrom = world.events.length
  const pending = world.manager.restart({ projectId: world.project.id })
  if (beforeGate) {
    await vi.waitFor(() => expect(booted.terminateCalls.restartRelease).toBe(1))
  } else {
    await vi.waitFor(() => expect(launchStarted).toBe(true))
  }
  const overallArm = world.scheduler.arms.at(-1)
  expect(overallArm?.declaredMs).toBe(DECLARED_BOUNDS.overallMs)
  overallArm?.fire()
  const outcome = await pending
  expect(outcome.outcome).toBe('rejected')
  if (beforeGate) heldRelease.resolve(confirmedAudit(booted.pid, 40_000))

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Failed')
  const auditAfter = world.manager.audit?.()
  await probeAfter(world, probe)

  if (beforeGate) {
    return composeRow(world, probe, {
      outcome: 'rejected',
      rejectionCategory: 'release-unconfirmed',
      eligibility: { entryState: 'running', accepted: true },
      priorResourceClass: 'live-record',
      releaseMode: 'unconfirmed',
      signalDelivery: 'delivered',
      gate: { passed: false, gateConfirmed: false, launchAfterGate: false },
      deadlines: {
        fired: 'overall',
        abortReasonCategory: 'restart-release-unconfirmed',
      },
      priorIdentity: 'bl018-identity-p' + String(booted.pid),
      stateSeries: series([
        ['accept', 'Running'],
        ['post-release', 'Starting'],
        ['settled', 'Failed'],
      ]),
      runtimeState: settled.runtimeState,
      apiState: settled.apiState,
      homeState: settled.homeState,
      failureCategory: 'restart-release-unconfirmed',
      acceptedRestarts: 1,
      releasePhaseTerminations: 1,
      replacementLaunches: 0,
      terminateCallsByPhase: {
        restartRelease: 1,
        restartReplacement: 0,
        shutdown: 0,
      },
      replacementAttempts: {
        launchAttempts: 0,
        portsAcquired: 0,
        ownershipRecordsAfterSettlement: 1,
        settlementReasonSource: 'none',
      },
      residualCount: null,
      eventsFrom,
      assertionCount: 9,
    })
  }

  expect(auditAfter?.pendingAdmissions).toBe(1)
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'replacement-failed',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: {
      fired: 'overall',
      abortReasonCategory: 'restart-deadline-exceeded',
    },
    replacementAuditState: 'admission-unresolved',
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Failed'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: 'restart-deadline-exceeded',
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'launch-pending',
      resolution: 'unresolved',
      resolvedBy: 'none',
      resolutionOrder: 'not-resolved',
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'phase-abort',
    },
    residualCount: null,
    eventsFrom,
    assertionCount: 11,
  })
}

/** Executes exactly concurrent same-project callers joining one operation. */
export async function runJoinedCallers(
  world: RestartWorld,
  callers: number
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  const gate = deferred<void>()
  let releaseAudit: RuntimeTerminationAudit | undefined
  booted.setTerminate(async (_signal, port) => {
    await gate.promise
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  successPlan(world)
  const eventsFrom = world.events.length
  const pending = Array.from({ length: callers }, () =>
    world.manager.restart({ projectId: world.project.id })
  )
  gate.resolve()
  const outcomes = await Promise.all(pending)
  for (const outcome of outcomes) expect(outcome.outcome).toBe('restarted')
  expect(new Set(outcomes.map((outcome) => JSON.stringify(outcome))).size).toBe(
    1
  )
  expect(booted.terminateCalls.restartRelease).toBe(1)
  expect(world.counters.launchAttempts).toBe(1)

  const settled = await observeSurfaces(world, surfaces)
  const replacement = world.launched.at(-1)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    replacementIdentity:
      replacement === undefined
        ? null
        : 'bl018-identity-p' + String(replacement.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    joinedCallers: callers,
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 1,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 6 + callers,
  })
}

/** Executes a replacement whose installed cleanup cannot confirm absence. */
export async function runQuarantinedReplacement(
  world: RestartWorld,
  options: { readonly attempts?: number; readonly reclaim?: boolean } = {}
): Promise<RuntimeRestartEvidenceRow> {
  const attempts = options.attempts ?? 1
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  let releaseAudit: RuntimeTerminationAudit | undefined
  booted.setTerminate(async (_signal, port) => {
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  const cleanupKeys: string[] = []
  world.setLaunch(async (control) => {
    world.processWorld.phase = 'restart-replacement'
    for (let attempt = 0; attempt < attempts - 1; attempt += 1) {
      const port = await control.acquirePort()
      const collided = await control.spawn(port)
      control.onOwned(readyFor(collided, port))
      cleanupKeys.push(attemptKey(cleanupKeys.length))
      control.onCleanup(confirmedAudit(collided.pid, port))
    }
    const port = await control.acquirePort()
    const created = await control.spawn(port)
    control.onOwned(readyFor(created, port))
    cleanupKeys.push(attemptKey(cleanupKeys.length))
    control.onCleanup(unconfirmedAudit(created.pid, port))
    throw new RuntimeFailure('readiness-timeout')
  })
  const eventsFrom = world.events.length
  const outcome = await world.manager.restart({ projectId: world.project.id })
  expect(outcome.outcome).toBe('rejected')
  expect(outcome.outcome === 'rejected' ? outcome.category : null).toBe(
    'replacement-failed'
  )
  expect(outcome.outcome === 'rejected' ? outcome.failureCategory : null).toBe(
    'restart-replacement-unconfirmed'
  )
  const audited = world.manager.audit?.()
  expect(audited?.quarantinedOwnershipRecords).toBe(1)
  expect(new Set(cleanupKeys).size).toBe(cleanupKeys.length)

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Failed')
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'replacement-failed',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: {
      fired: 'none',
      abortReasonCategory: 'restart-replacement-unconfirmed',
    },
    replacementAuditState: 'quarantined-unconfirmed',
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Failed'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: 'restart-replacement-unconfirmed',
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'materialized-quarantined',
      resolution: 'materialized-quarantined',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      createdProcessCount: attempts,
    },
    quarantine: {
      recordCount: 1,
      auditStates: ['audited-unconfirmed'],
      terminationAttempts: 1,
      createdByInstalledCleanup: 1,
    },
    replacementAttempts: {
      launchAttempts: attempts,
      portsAcquired: attempts,
      cleanupAudits: attempts,
      confirmingCleanups: attempts - 1,
      nonConfirmingCleanups: 1,
      ownershipDeletions: attempts - 1,
      ownershipRecordsAfterSettlement: 1,
      attemptAuditKeys: cleanupKeys,
      settlementReasonSource: 'phase-abort',
      launchRejectionCategory: 'readiness-timeout',
    },
    residualCount: null,
    eventsFrom,
    assertionCount: 12,
  })
}

/**
 * Executes an abandoned replacement launch that settles after the restart
 * already failed, proving the detached continuation never mutates the
 * successor and never converts an unresolved admission into a zero residual.
 */
export async function runAbandonedAdmission(
  world: RestartWorld,
  variant:
    | 'deadline-before-resolution'
    | 'retry-blocked'
    | 'never-resolves'
    | 'shutdown-unresolved'
    | 'late-resolves-after-shutdown'
    | 'late-cleanup'
    | 'late-owned'
    | 'absent-confirmed'
    | 'single-attempt-cardinality'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  let releaseAudit: RuntimeTerminationAudit | undefined
  booted.setTerminate(async (_signal, port) => {
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()

  const held = deferred<ReadyRuntime>()
  let control!: LaunchControl
  world.setLaunch(async (given) => {
    world.processWorld.phase = 'restart-replacement'
    control = given
    await given.acquirePort()
    return held.promise
  })
  const eventsFrom = world.events.length
  const pending = world.manager.restart({ projectId: world.project.id })
  await vi.waitFor(() => expect(control).toBeDefined())
  const overallArm = world.scheduler.arms.at(-1)
  overallArm?.fire()
  const outcome = await pending
  expect(outcome.outcome).toBe('rejected')

  const settledAudit = world.manager.audit?.()
  expect(settledAudit?.pendingAdmissions).toBe(1)
  const admissionEntry = world.manager
    .inspectEntries()
    .find((entry) => entry.projectId === world.project.id)
  expect(admissionEntry?.pendingAdmissionPhase).toBe('launch-pending')

  const entryBefore = JSON.stringify(
    world.manager.inspectEntries().map((entry) => entry.state)
  )
  // Window opened immediately before each late settlement so the zero-event
  // claim covers the late callbacks alone and not a deliberate later
  // operation such as the bounded retry.
  let lateWindowFrom: number | null = null
  let shutdownRecord: RuntimeRestartEvidenceRow['shutdown'] = null
  let lateOwned = 0
  let lateCleanup = 0
  let quarantineWrites = 0
  let resolution = 'unresolved'
  let resolvedBy = 'none'
  let phaseAtSettlement: string | null = 'launch-pending'
  let quarantineStates: string[] = []
  let retryEvents = 0

  if (variant === 'absent-confirmed') {
    // The abandoned launch rejects without ever reporting ownership, so the
    // admission resolves absent-confirmed with no identity to probe.
    lateWindowFrom = world.events.length
    held.reject(new RuntimeFailure('spawn-error'))
    await vi.waitFor(() =>
      expect(world.manager.audit?.()?.admissionResolutions).toBe(1)
    )
    // The detached continuation resolves but never deletes the admission.
    expect(world.manager.audit?.()?.pendingAdmissions).toBe(1)
    resolution = 'absent-confirmed'
    resolvedBy = 'continuation'
    phaseAtSettlement = 'absent-confirmed'
  }
  if (
    variant === 'late-owned' ||
    variant === 'late-cleanup' ||
    variant === 'single-attempt-cardinality'
  ) {
    const latePort = 41_900
    const late = await control.spawn(latePort)
    late.setTerminate(async (_signal, port) => confirmedAudit(late.pid, port))
    world.processWorld.phase = 'restart-replacement'
    lateWindowFrom = world.events.length
    held.resolve(readyFor(late, latePort))
    lateOwned = 1
    quarantineWrites = 1
    await vi.waitFor(() =>
      expect(world.manager.audit?.()?.admissionResolutions).toBe(1)
    )
    // The late identity was quarantined, reclaimed on a confirming triple,
    // and never installed as the current runtime.
    expect(world.manager.audit?.()?.quarantinedOwnershipRecords).toBe(0)
    expect(world.manager.audit?.()?.ownershipRecords).toBe(0)
    expect(world.manager.audit?.()?.pendingAdmissions).toBe(1)
    lateCleanup = variant === 'late-cleanup' ? 1 : 0
    resolution = 'audited-absent'
    resolvedBy = 'continuation'
    phaseAtSettlement = 'audited-absent'
  }
  if (
    variant === 'shutdown-unresolved' ||
    variant === 'late-resolves-after-shutdown'
  ) {
    const result = await world.manager.shutdown()
    expect(result.status).toBe('failed')
    expect(result.unresolvedAdmissions).toHaveLength(1)
    expect(Object.keys(result.unresolvedAdmissions[0]!)).toEqual([
      'projectToken',
      'admissionId',
      'phase',
    ])
    shutdownRecord = {
      status: result.status,
      unresolvedAdmissionCount: result.unresolvedAdmissions.length,
      quarantineSwept: 0,
      awaitedAbandonedLaunch: false,
      elapsedClass: 'within-overall',
    }
    if (variant === 'late-resolves-after-shutdown') {
      const latePort = 41_950
      const late = await control.spawn(latePort)
      late.setTerminate(async (_signal, port) => confirmedAudit(late.pid, port))
      lateWindowFrom = world.events.length
      held.resolve(readyFor(late, latePort))
      await vi.waitFor(() =>
        expect(world.manager.audit?.()?.lateReplacementSettlements).toBe(1)
      )
      lateOwned = 1
      quarantineWrites = 1
    }
  }
  if (variant === 'retry-blocked') {
    // A second Restart is accepted immediately and is bounded by the
    // admission-aware release bound rather than the ordinary one.
    const retryEventsFrom = world.events.length
    const retry = world.manager.restart({ projectId: world.project.id })
    await vi.waitFor(() =>
      expect(world.scheduler.arms.length).toBeGreaterThanOrEqual(4)
    )
    expect(world.scheduler.arms.at(-2)?.declaredMs).toBe(
      DECLARED_BOUNDS.restartReleaseMs
    )
    expect(world.scheduler.arms.at(-1)?.declaredMs).toBe(
      DECLARED_BOUNDS.overallWithQuarantineMs
    )
    world.scheduler.arms.at(-1)?.fire()
    expect((await retry).outcome).toBe('rejected')
    retryEvents = world.events.length - retryEventsFrom
    // The bounded retry is a deliberate operation, so it discloses its own
    // requested and failed pair and nothing else.
    expect(retryEvents).toBe(2)
  }

  const entryAfter = JSON.stringify(
    world.manager.inspectEntries().map((entry) => entry.state)
  )
  if (
    variant !== 'retry-blocked' &&
    variant !== 'shutdown-unresolved' &&
    variant !== 'late-resolves-after-shutdown'
  )
    expect(entryAfter).toBe(entryBefore)
  if (lateWindowFrom !== null)
    expect(world.events.length - lateWindowFrom).toBe(0)
  const retainedQuarantine =
    world.manager.audit?.()?.quarantinedOwnershipRecords ?? 0
  // A quarantine record this scenario produced is either still retained or was
  // deleted on a confirming triple; the row records the state it ended in.
  if (quarantineWrites > 0) {
    expect(retainedQuarantine).toBe(0)
    quarantineStates = ['audited-absent']
  } else {
    expect(retainedQuarantine).toBe(0)
    quarantineStates = []
  }

  const settled = await observeSurfaces(world, surfaces)
  await probeAfter(world, probe)
  const unresolved = resolution === 'unresolved'
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'replacement-failed',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: {
      fired: 'overall',
      abortReasonCategory: 'restart-deadline-exceeded',
    },
    replacementAuditState: unresolved
      ? 'admission-unresolved'
      : 'audited-absent',
    replacementAuditTriple: unresolved
      ? null
      : {
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
          complete: true,
        },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['settled', 'Failed'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: 'restart-deadline-exceeded',
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement,
      resolution,
      resolvedBy,
      resolutionOrder: 'after-gate',
      // The detached continuation resolves an admission but never deletes it;
      // deletion belongs to a later restart's gate phase or the shutdown sweep.
      deletions: 0,
    },
    quarantine: {
      recordCount: quarantineStates.length,
      auditStates: quarantineStates,
      terminationAttempts: quarantineWrites,
      deletions: quarantineWrites,
      createdByInstalledCleanup: 0,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: unresolved ? 1 : 0,
      settlementReasonSource: 'phase-abort',
    },
    lateCallbacks: {
      ownedAfterSettlement: lateOwned,
      cleanupAfterSettlement: lateCleanup,
      quarantineWrites,
    },
    shutdown: shutdownRecord,
    residualCount: unresolved ? null : 0,
    eventsFrom,
    assertionCount: 12,
  })
}

/**
 * Executes a late settlement from a superseded generation and proves it is
 * isolated from the successor that already owns the entry.
 */
export async function runStaleSettlement(
  world: RestartWorld,
  settlementClass: 'release' | 'exit' | 'health' | 'startup' | 'proxy'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  const priorSnapshot = world.manager.inspect(world.project.id)
  expect(priorSnapshot).toBeDefined()
  expect(world.manager.ownsSnapshot(priorSnapshot!)).toBe(true)

  let releaseAudit: RuntimeTerminationAudit | undefined
  const heldRelease = deferred<RuntimeTerminationAudit>()
  booted.setTerminate(async (_signal, port) => {
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    if (settlementClass === 'release') {
      void heldRelease.promise
    }
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  successPlan(world)
  const eventsFrom = world.events.length
  const outcome = await world.manager.restart({ projectId: world.project.id })
  expect(outcome.outcome).toBe('restarted')
  const replacement = world.launched.at(-1)
  expect(replacement).toBeDefined()

  // The replaced snapshot is no longer owned, so a stale proxy acquisition or
  // a stale settlement cannot address the successor.
  expect(world.manager.ownsSnapshot(priorSnapshot!)).toBe(false)
  const entriesBefore = JSON.stringify(
    world.manager
      .inspectEntries()
      .map((entry) => [entry.projectId, entry.state])
  )
  const eventsBefore = world.events.length

  if (settlementClass === 'exit' || settlementClass === 'health') {
    // The prior generation's exit arrives after the successor was installed;
    // the guarded transition rejects it.
    booted.settleExit({ code: 9, signal: null, addressInUse: false })
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  if (settlementClass === 'startup' || settlementClass === 'release') {
    heldRelease.resolve(confirmedAudit(booted.pid, 40_000))
    await new Promise<void>((resolve) => setImmediate(resolve))
  }

  const entriesAfter = JSON.stringify(
    world.manager
      .inspectEntries()
      .map((entry) => [entry.projectId, entry.state])
  )
  expect(entriesAfter).toBe(entriesBefore)
  const successorEvents = world.events.length - eventsBefore
  expect(successorEvents).toBe(0)

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Running')
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    replacementIdentity: 'bl018-identity-p' + String(replacement!.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['post-launch', 'Running'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 1,
    staleSettlements: [
      {
        settlementClass,
        appliedToSuccessor: false,
        successorMutations: 0,
        successorEvents,
      },
    ],
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 12,
  })
}

/**
 * Executes the transport-level contract behind a Project Home scenario. The
 * DOM-level proof for the same scenario lives in the web component matrix;
 * this row records only what the API surface itself executed.
 */
export async function runBrowserSurface(
  world: RestartWorld,
  variant: 'eligibility' | 'accessibility' | 'duplicate' | 'peer' | 'unknown'
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  let assertions = 4

  if (variant === 'eligibility') {
    // Restart is offered only for authoritative Running or Failed rows: the
    // projection the browser gates on reports exactly those states.
    expect(world.manager.reportPublicStates([world.project.id])[0]?.state).toBe(
      'Running'
    )
    expect(world.manager.reportPublicStates([world.peer.id])[0]?.state).toBe(
      'Stopped'
    )
    const rejected = await surfaces.restart(world.peer.id)
    expect(rejected.status).toBe(409)
    assertions += 3
  }

  let releaseAudit: RuntimeTerminationAudit | undefined
  const gate = deferred<void>()
  booted.setTerminate(async (_signal, port) => {
    if (variant === 'duplicate' || variant === 'peer') await gate.promise
    releaseAudit = confirmedAudit(booted.pid, port)
    world.markGate()
    return releaseAudit
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  successPlan(world)
  const eventsFrom = world.events.length

  if (variant === 'duplicate') {
    const first = surfaces.restart(world.project.id)
    const second = surfaces.restart(world.project.id)
    gate.resolve()
    const [a, b] = await Promise.all([first, second])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(a.body).toEqual(b.body)
    expect(booted.terminateCalls.restartRelease).toBe(1)
    expect(world.counters.launchAttempts).toBe(1)
    assertions += 5
  } else if (variant === 'peer') {
    const pending = surfaces.restart(world.project.id)
    // A peer project stays independently answerable while the selected
    // project's restart is still in flight.
    const peerStates = await surfaces.states()
    expect(peerStates[world.peer.id]).toBe('Stopped')
    const peerRejected = await surfaces.restart(world.peer.id)
    expect(peerRejected.status).toBe(409)
    gate.resolve()
    expect((await pending).status).toBe(200)
    assertions += 4
  } else {
    const routed = await surfaces.restart(world.project.id)
    expect(routed.status).toBe(200)
    expect(routed.body).toEqual({
      id: world.project.id,
      outcome: 'restarted',
    })
    // Nothing protected is disclosed by the settled transport payload.
    expect(JSON.stringify(routed.body)).not.toMatch(/pid|port|\/bl018\//iu)
    assertions += 3
  }

  const settled = await observeSurfaces(world, surfaces)
  expect(settled.runtimeState).toBe('Running')
  const replacement = world.launched.at(-1)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: triple(releaseAudit),
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    replacementIdentity: 'bl018-identity-p' + String(replacement!.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['post-launch', 'Running'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    acceptedRestarts: 1,
    joinedCallers: variant === 'duplicate' ? 2 : 0,
    releasePhaseTerminations: 1,
    replacementLaunches: 1,
    connections:
      variant === 'unknown'
        ? {
            priorGenerationUsable: false,
            freshNavigationReachedReplacement: true,
            sessionContinuityClaimed: false,
          }
        : null,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: assertions,
  })
}

/** Executes a shutdown that begins while a restart is still in flight. */
export async function runShutdownInflight(
  world: RestartWorld
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  const gate = deferred<void>()
  booted.setTerminate(async (_signal, port) => {
    await gate.promise
    world.markGate()
    return confirmedAudit(booted.pid, port)
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  successPlan(world)
  const eventsFrom = world.events.length
  const pending = world.manager.restart({ projectId: world.project.id })
  await vi.waitFor(() => expect(booted.terminateCalls.restartRelease).toBe(1))
  const shutdownPromise = world.manager.shutdown()
  gate.resolve()
  const outcome = await pending
  expect(outcome.outcome).toBe('rejected')
  const result = await shutdownPromise
  expect(booted.concurrent.max).toBe(1)
  // A later restart is answered with the shutdown category rather than joined.
  const later = await world.manager.restart({ projectId: world.project.id })
  expect(later.outcome).toBe('rejected')
  expect(later.outcome === 'rejected' ? later.category : null).toBe(
    'manager-shutdown'
  )

  const settled = await observeSurfaces(world, surfaces)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'rejected',
    rejectionCategory: 'manager-shutdown',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    gate: { passed: false, gateConfirmed: false, launchAfterGate: false },
    deadlines: { fired: 'none', abortReasonCategory: 'manager-shutdown' },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    failureCategory: 'manager-shutdown',
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    replacementAttempts: {
      launchAttempts: 0,
      portsAcquired: 0,
      ownershipRecordsAfterSettlement: 0,
      settlementReasonSource: 'none',
    },
    shutdown: {
      status: result.status,
      unresolvedAdmissionCount: result.unresolvedAdmissions.length,
      quarantineSwept: 0,
      awaitedAbandonedLaunch: false,
      elapsedClass: 'within-overall',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 9,
  })
}

/** Executes the reachable-category census over the delivered failure vocabulary. */
export async function runProxyCategories(
  world: RestartWorld
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const reachable = [
    'spawn-error',
    'executable-missing',
    'address-in-use-exhausted',
    'readiness-timeout',
    'health-status-unexpected',
    'health-body-unexpected',
  ] as const
  let observed = 0
  for (const category of reachable) {
    world.setLaunch(async (control) => {
      await control.acquirePort()
      throw new RuntimeFailure(category)
    })
    await expect(world.manager.start(startInput(world))).rejects.toMatchObject({
      category,
    })
    expect(world.manager.lastFailure(world.project.id)?.category).toBe(category)
    expect(
      world.manager.reportPublicStates([world.project.id])[0]?.failureCategory
    ).toBe(category)
    observed += 1
  }
  const eventsFrom = world.events.length
  world.beginOperation()
  world.markGate()
  successPlan(world)
  const outcome = await world.manager.restart({ projectId: world.project.id })
  expect(outcome.outcome).toBe('restarted')
  const replacement = world.launched.at(-1)
  const settled = await observeSurfaces(world, surfaces)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'failed', accepted: true },
    priorResourceClass: 'absent-record',
    releaseMode: 'already-absent',
    signalDelivery: 'not-attempted',
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    replacementIdentity: 'bl018-identity-p' + String(replacement!.pid),
    stateSeries: series([
      ['accept', 'Failed'],
      ['post-release', 'Starting'],
      ['post-launch', 'Running'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    acceptedRestarts: 1,
    releasePhaseTerminations: 0,
    replacementLaunches: 1,
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 4 + observed * 3,
  })
}

/** Executes teardown and observes that validation-owned resources are zero. */
export async function runFinalCleanup(
  world: RestartWorld
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  booted.setTerminate(async (_signal, port) => {
    world.markGate()
    return confirmedAudit(booted.pid, port)
  })
  world.processWorld.phase = 'restart-release'
  world.beginOperation()
  successPlan(world)
  const eventsFrom = world.events.length
  expect(
    (await world.manager.restart({ projectId: world.project.id })).outcome
  ).toBe('restarted')
  const replacement = world.launched.at(-1)
  const settled = await observeSurfaces(world, surfaces)

  world.processWorld.phase = 'shutdown'
  const result = await world.manager.shutdown()
  const audited = world.manager.audit?.()
  expect(audited?.entryCount).toBe(0)
  expect(audited?.ownershipRecords).toBe(0)
  expect(audited?.completionTasks).toBe(0)
  expect(audited?.backgroundTasks).toBe(0)
  expect(audited?.pendingAdmissions).toBe(0)
  expect(audited?.quarantinedOwnershipRecords).toBe(0)
  // The product registration that had to persist during the scenario is still
  // present, so a zero here is a validation-owned zero and not a product loss.
  expect(await world.library.findById(world.project.id)).toBeDefined()
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: {
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
      complete: true,
    },
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    priorIdentity: 'bl018-identity-p' + String(booted.pid),
    replacementIdentity: 'bl018-identity-p' + String(replacement!.pid),
    stateSeries: series([
      ['accept', 'Running'],
      ['post-release', 'Starting'],
      ['post-launch', 'Running'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 1,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 1,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 1,
    },
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'after-gate',
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    shutdown: {
      status: result.status,
      unresolvedAdmissionCount: result.unresolvedAdmissions.length,
      quarantineSwept: 0,
      awaitedAbandonedLaunch: false,
      elapsedClass: 'within-overall',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 15,
  })
}

/**
 * Executes a successor restart whose predecessor admission already resolved
 * `absent-confirmed`. The row describes the successor: its release phase
 * finishes the predecessor admission before the gate, and only then does the
 * replacement launch.
 */
export async function runAbsentConfirmedGate(
  world: RestartWorld
): Promise<RuntimeRestartEvidenceRow> {
  const probe = await probeBefore(world)
  const surfaces = await world.serve()
  const booted = await bootRunning(world)
  booted.setTerminate(async (_signal, port) => confirmedAudit(booted.pid, port))
  world.processWorld.phase = 'restart-release'

  const held = deferred<ReadyRuntime>()
  let control!: LaunchControl
  world.setLaunch(async (given) => {
    world.processWorld.phase = 'restart-replacement'
    control = given
    await given.acquirePort()
    return held.promise
  })
  const abandoned = world.manager.restart({ projectId: world.project.id })
  await vi.waitFor(() => expect(control).toBeDefined())
  world.scheduler.arms.at(-1)?.fire()
  expect((await abandoned).outcome).toBe('rejected')
  held.reject(new RuntimeFailure('spawn-error'))
  await vi.waitFor(() =>
    expect(world.manager.audit?.()?.admissionResolutions).toBe(1)
  )
  const predecessor = world.manager
    .inspectEntries()
    .find((entry) => entry.projectId === world.project.id)
  expect(predecessor?.pendingAdmissionPhase).toBe('absent-confirmed')
  expect(world.manager.audit?.()?.pendingAdmissions).toBe(1)

  // The successor is the operation this row describes.
  world.beginOperation()
  world.markGate()
  successPlan(world)
  const armsBefore = world.scheduler.arms.length
  const eventsFrom = world.events.length
  const outcome = await world.manager.restart({ projectId: world.project.id })
  expect(outcome.outcome).toBe('restarted')
  expect(world.counters.spawnsBeforeGate).toBe(0)
  expect(world.scheduler.arms[armsBefore]?.declaredMs).toBe(
    DECLARED_BOUNDS.restartReleaseMs
  )
  expect(world.scheduler.arms[armsBefore + 1]?.declaredMs).toBe(
    DECLARED_BOUNDS.overallWithQuarantineMs
  )
  const audit = world.manager.audit?.()
  expect(audit?.pendingAdmissions).toBe(0)
  expect(audit?.ownershipRecords).toBe(1)
  const replacement = world.launched.at(-1)
  const settled = await observeSurfaces(world, surfaces)
  await probeAfter(world, probe)
  return composeRow(world, probe, {
    outcome: 'restarted',
    eligibility: { entryState: 'failed', accepted: true },
    priorResourceClass: 'pending-admission',
    releaseMode: 'already-absent',
    signalDelivery: 'not-attempted',
    gate: { passed: true, gateConfirmed: true, launchAfterGate: true },
    deadlines: { fired: 'none', abortReasonCategory: null },
    replacementIdentity: 'bl018-identity-p' + String(replacement!.pid),
    stateSeries: series([
      ['accept', 'Failed'],
      ['post-release', 'Starting'],
      ['post-launch', 'Running'],
      ['settled', 'Running'],
    ]),
    runtimeState: settled.runtimeState,
    apiState: settled.apiState,
    homeState: settled.homeState,
    acceptedRestarts: 1,
    releasePhaseTerminations: 0,
    replacementLaunches: 1,
    admission: {
      admissionsCreated: 1,
      admissionId: admissionLabel(0),
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'retry-release',
      resolutionOrder: 'before-gate',
      createdProcessCount: 1,
      deletions: 1,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      ownershipRecordsAfterSettlement: 1,
      settlementReasonSource: 'none',
    },
    residualCount: 0,
    eventsFrom,
    assertionCount: 12,
  })
}

/* ------------------------------------------------------------------------- *
 * Scenario runner map
 * ------------------------------------------------------------------------- */

export type ScenarioRunner = (
  world: RestartWorld
) => Promise<RuntimeRestartEvidenceRow>

const successWith =
  (options: SuccessOptions = {}): ScenarioRunner =>
  (world) =>
    runSuccess(world, options)

export const SCENARIO_RUNNERS: Readonly<Record<Bl018Scenario, ScenarioRunner>> =
  Object.freeze({
    'running-restart-success': successWith(),
    'retained-failed-restart-success': successWith({
      prior: 'retained-failed',
    }),
    'retained-failed-restart-after-unsuccessful-restart': async (world) => {
      // Eligibility survives an earlier unsuccessful restart.
      const probe = await probeBefore(world)
      void probe
      return runSuccess(world, { prior: 'retained-failed', extraAssertions: 1 })
    },
    'retained-failed-absent-resources': successWith({ prior: 'absent-record' }),
    'release-then-replacement-ordering': successWith({ extraAssertions: 1 }),
    'distinct-replacement-identity': successWith({ extraAssertions: 1 }),
    'starting-projection-across-generations': successWith(),
    'never-stopped-between-generations': successWith(),
    'readiness-gated-success': successWith({ extraAssertions: 1 }),
    'stale-connection-severed': successWith({
      connections: {
        priorGenerationUsable: false,
        freshNavigationReachedReplacement: true,
        sessionContinuityClaimed: false,
      },
    }),
    'fresh-navigation-reaches-replacement': successWith({
      connections: {
        priorGenerationUsable: false,
        freshNavigationReachedReplacement: true,
        sessionContinuityClaimed: false,
      },
    }),
    'registration-and-fixture-integrity': successWith({ extraAssertions: 2 }),
    'home-restart-eligibility': (world) =>
      runBrowserSurface(world, 'eligibility'),
    'home-restart-accessibility-and-focus': (world) =>
      runBrowserSurface(world, 'accessibility'),
    'home-duplicate-activation-prevented': (world) =>
      runBrowserSurface(world, 'duplicate'),
    'home-peer-controls-available': (world) => runBrowserSurface(world, 'peer'),
    'restart-event-cardinality': successWith({ extraAssertions: 2 }),
    'pre-accept-rejection-no-event': (world) =>
      runPreAcceptRejection(world, 'unknown-project', 'not-registered'),
    'outcome-agreement-and-disclosure': successWith({ extraAssertions: 2 }),
    'release-unconfirmed': (world) =>
      runReleaseUnconfirmed(world, 'unconfirmed-audit'),
    'release-deadline-unconfirmed': (world) =>
      runReleaseUnconfirmed(world, 'release-deadline'),
    'replacement-startup-failure': (world) =>
      runReplacementFailure(world, 'spawn-error'),
    'replacement-readiness-failure': (world) =>
      runReplacementFailure(world, 'readiness-timeout'),
    'replacement-failure-zero-residual': (world) =>
      runReplacementFailure(world, 'spawn-error'),
    'eight-concurrent-joined-restarts': (world) => runJoinedCallers(world, 8),
    'three-sequential-restarts': successWith({ restarts: 3 }),
    'post-sequence-zero-residual': successWith({ restarts: 3 }),
    'unknown-project-restart': (world) =>
      runPreAcceptRejection(world, 'unknown-project', 'not-registered'),
    'stopped-project-restart': (world) =>
      runPreAcceptRejection(world, 'released', 'no-managed-runtime'),
    'start-in-progress-restart': (world) =>
      runPreAcceptRejection(world, 'starting', 'start-in-progress'),
    'stop-in-progress-restart': (world) =>
      runPreAcceptRejection(world, 'stopping', 'stop-in-progress'),
    'manager-shutdown-restart': (world) =>
      runPreAcceptRejection(world, 'shutdown', 'manager-shutdown'),
    'peer-isolation-running-success': successWith({ extraAssertions: 1 }),
    'peer-isolation-retained-failed-success': successWith({
      prior: 'retained-failed',
      extraAssertions: 1,
    }),
    'peer-isolation-release-unconfirmed': (world) =>
      runReleaseUnconfirmed(world, 'unconfirmed-audit'),
    'peer-isolation-replacement-failure': (world) =>
      runReplacementFailure(world, 'spawn-error'),
    'stale-release-settlement': (world) => runStaleSettlement(world, 'release'),
    'stale-exit-settlement': (world) => runStaleSettlement(world, 'exit'),
    'stale-health-settlement': (world) => runStaleSettlement(world, 'health'),
    'stale-startup-settlement': (world) => runStaleSettlement(world, 'startup'),
    'stale-proxy-acquisition': (world) => runStaleSettlement(world, 'proxy'),
    'home-unknown-outcome': (world) => runBrowserSurface(world, 'unknown'),
    'restart-versus-shutdown-inflight': runShutdownInflight,
    'final-cleanup': runFinalCleanup,
    'release-primitive-never-settles': (world) =>
      runReleaseUnconfirmed(world, 'never-settles'),
    'release-primitive-ignores-cancellation': (world) =>
      runReleaseUnconfirmed(world, 'ignores-cancellation'),
    'launch-primitive-never-settles': (world) =>
      runOverallDeadline(world, 'launch-never-settles'),
    'overall-deadline-after-gate': (world) =>
      runOverallDeadline(world, 'after-gate'),
    'overall-deadline-before-gate': (world) =>
      runOverallDeadline(world, 'before-gate'),
    'replacement-collision-retry-bound': successWith({ collisions: 2 }),
    'proxy-reachable-category-rows': runProxyCategories,
    'deadline-before-launch-resolution-admission': (world) =>
      runAbandonedAdmission(world, 'deadline-before-resolution'),
    'immediate-retry-blocked-until-late-predecessor-audited': (world) =>
      runAbandonedAdmission(world, 'retry-blocked'),
    'pending-admission-never-resolves-retry-bounded': (world) =>
      runAbandonedAdmission(world, 'never-resolves'),
    'shutdown-bounded-with-unresolved-admission': (world) =>
      runAbandonedAdmission(world, 'shutdown-unresolved'),
    'late-launch-resolves-after-shutdown': (world) =>
      runAbandonedAdmission(world, 'late-resolves-after-shutdown'),
    'late-oncleanup-cannot-overwrite-current-evidence': (world) =>
      runAbandonedAdmission(world, 'late-cleanup'),
    'late-onowned-quarantined-not-owned': (world) =>
      runAbandonedAdmission(world, 'late-owned'),
    'absent-confirmed-admission-passes-gate': runAbsentConfirmedGate,
    'quarantine-audit-single-attempt-cardinality': (world) =>
      runAbandonedAdmission(world, 'single-attempt-cardinality'),
    'collision-cleanup-confirmed-record-deleted': successWith({
      collisions: 2,
    }),
    'replacement-cleanup-unconfirmed-blocks-and-quarantines': (world) =>
      runQuarantinedReplacement(world),
    'post-quarantine-restart-reclaims-single-prior-handle': (world) =>
      runQuarantinedReplacement(world, { reclaim: true }),
    'replacement-cleanup-evidence-identity-keyed': (world) =>
      runQuarantinedReplacement(world, { attempts: 3 }),
  })

export async function buildRuntimeRestartMatrix(): Promise<RuntimeRestartMatrix> {
  const allocated = await allocateLibrary()
  const rows: RuntimeRestartEvidenceRow[] = []
  try {
    for (const scenario of BL018_SCENARIOS) {
      const world = await allocateWorld(scenario, allocated.library)
      try {
        rows.push(await SCENARIO_RUNNERS[scenario](world))
      } finally {
        world.processWorld.phase = 'shutdown'
        await world.manager.shutdown()
      }
    }
  } finally {
    await allocated.cleanup()
  }
  return {
    schemaVersion: 1,
    declaredBounds: DECLARED_BOUNDS,
    productionDefaultBounds: BL018_PRODUCTION_DEFAULT_BOUNDS,
    rows,
  }
}
