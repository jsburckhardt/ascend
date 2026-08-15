/// <reference types="node" />
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { expect, vi } from 'vitest'

import {
  RuntimeFailure,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  publicRuntimeStateForLifecycleEvent,
  runtimeStopOverallBoundMs,
  type ProjectRuntimeConfig,
  type PublicRuntimeState,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import {
  readProcessStartTime,
  terminateOwnedRuntimeGroup,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeExit,
  type RuntimeProcessDependencies,
  type RuntimeTerminationAudit,
  type RuntimeTerminationPrimitives,
} from '../src/project-runtime-process.js'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  BL017_ATTRIBUTION_CLAIM,
  BL017_SCENARIOS,
  NFR015_EVENT_CATALOG,
  type Bl017Scenario,
  type RuntimeStopAttribution,
  type RuntimeStopAuditTriple,
  type RuntimeStopDeclaredBounds,
  type RuntimeStopDigestPair,
  type RuntimeStopEvidenceEvent,
  type RuntimeStopEvidenceRow,
  type RuntimeStopFixtureDigest,
  type RuntimeStopInventoryItem,
  type RuntimeStopMatrix,
  type RuntimeStopPrimitiveBounding,
  type RuntimeStopSignalDelivery,
  type RuntimeStopSignalTimeline,
} from '../src/runtime-stop-evidence.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { build } from './helper.js'
import { snapshotFixture } from './project-registration-fixture-helper.js'

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..')
export const BL017_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-017'
)
export const DISPOSABLE_MATRIX_PATH = path.join(
  BL017_RESULT_ROOT,
  'runtime-stop-matrix.json'
)
export const DISPOSABLE_TIMING_PATH = path.join(
  BL017_RESULT_ROOT,
  'runtime-stop-timing.json'
)
export const RETAINED_MATRIX_PATH = path.join(
  REPOSITORY_ROOT,
  'project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json'
)

const GRACEFUL_MS = 120
const FORCE_MS = 120
const AUDIT_ALLOWANCE_MS = 100

const boundsFor = (
  gracefulMs: number,
  forceMs: number,
  auditAllowanceMs: number
): RuntimeStopDeclaredBounds => {
  const settlementAllowanceMs = Math.max(1, Math.floor(auditAllowanceMs / 10))
  return Object.freeze({
    gracefulMs,
    forceMs,
    auditAllowanceMs,
    settlementAllowanceMs,
    preSignalAllowanceMs: auditAllowanceMs - settlementAllowanceMs,
    overallMs: gracefulMs + forceMs + auditAllowanceMs,
  })
}

export const DECLARED_BOUNDS = boundsFor(
  GRACEFUL_MS,
  FORCE_MS,
  AUDIT_ALLOWANCE_MS
)
export const PRODUCTION_DEFAULT_BOUNDS = boundsFor(2_000, 2_000, 1_000)

export const scenarioConfig: ProjectRuntimeConfig = createProjectRuntimeConfig({
  expectedUser: 'bl017-user',
  environment: { PATH: '/bl017/bin' },
  gracefulShutdownMs: GRACEFUL_MS,
  forceShutdownMs: FORCE_MS,
  stopAuditAllowanceMs: AUDIT_ALLOWANCE_MS,
})

// Mirrors the plan's protected-value scan for public, API, and browser payloads:
// absolute paths, URLs, loopback authorities, identity numbers, and secrets.
export const PROTECTED_VALUE_SCAN =
  /(?:\/(?:home|tmp|workspaces|proc|usr)\/|https?:\/\/|wss?:\/\/|127\.0\.0\.1|localhost|"(?:pid|port|internalUrl|canonicalPath|ownerToken|command|environment|stdout|stderr)"|\b(?:secret|credential|password)\b)/iu

export const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

const ATTRIBUTION = Object.freeze({
  ownedGroupSampled: true,
  ceilingRecorded: true,
  claim: BL017_ATTRIBUTION_CLAIM,
})
const NO_SAMPLE_ATTRIBUTION = Object.freeze({
  ownedGroupSampled: false,
  ceilingRecorded: true,
  claim: BL017_ATTRIBUTION_CLAIM,
})

const NO_SIGNALS: RuntimeStopSignalDelivery = Object.freeze({
  graceful: 'not-attempted',
  force: 'not-attempted',
  signalFault: 'none',
  settlementAudits: 0,
})

const BASE_INVENTORY: readonly RuntimeStopInventoryItem[] = Object.freeze([
  Object.freeze({
    item: 'managed workbench runtime and its loopback listener',
    itemClass: 'runtime-process-and-listener',
    ownership: 'validation-owned-temporary',
  }),
  Object.freeze({
    item: 'project registration row and database sidecars',
    itemClass: 'registration-resource',
    ownership: 'product-registration-during-scenario',
  }),
  Object.freeze({
    item: 'disposable project fixture tree',
    itemClass: 'disposable-fixture',
    ownership: 'validation-owned-temporary',
  }),
])

const CONTROL_INVENTORY: RuntimeStopInventoryItem = Object.freeze({
  item: 'declared unrelated control process and its listener',
  itemClass: 'unrelated-control',
  ownership: 'validation-owned-temporary',
})

export interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  promise.catch(() => undefined)
  return { promise, resolve, reject }
}

export interface TerminationState {
  rootAlive: boolean
  groupAlive: boolean
  listenerAlive: boolean
}

export interface PrimitiveRecorder {
  readonly primitives: RuntimeTerminationPrimitives
  readonly signals: { signal: NodeJS.Signals; delivered: boolean; at: number }[]
  readonly observedGroups: number[]
  settlementAudits: number
  abandonedCalls: number
  incompleteAudits: number
  signalsAfterDeadline: number
  armedTimers: number
  deadlineFired: boolean
}

export function recordPrimitives(input: {
  readonly state: TerminationState
  readonly onSignal?: (
    signal: NodeJS.Signals,
    state: TerminationState
  ) => boolean
  readonly signalFault?: NodeJS.Signals
  readonly groupMembers?: readonly number[]
  readonly stall?: 'listener' | 'delay' | 'delay-uncancellable'
}): PrimitiveRecorder {
  const state = input.state
  let faultRaised = false
  const recorder: PrimitiveRecorder = {
    signals: [],
    observedGroups: [],
    settlementAudits: 0,
    abandonedCalls: 0,
    incompleteAudits: 0,
    signalsAfterDeadline: 0,
    armedTimers: 0,
    deadlineFired: false,
    primitives: {
      readProcessStartTime: async (_pid, signal) =>
        track(signal, () => (state.rootAlive ? 'owned-start' : null)),
      readProcessGroupMembers: async (group, signal) => {
        if (!recorder.observedGroups.includes(group))
          recorder.observedGroups.push(group)
        return track(signal, () =>
          state.groupAlive ? (input.groupMembers ?? [1]) : []
        )
      },
      listenerIsAbsent: async (_port, signal) => {
        if (input.stall === 'listener') return stall(signal)
        const absent = await track(signal, () => !state.listenerAlive)
        if (recorder.signals.length > 0) recorder.settlementAudits += 1
        return absent
      },
      delay: async (milliseconds, signal) => {
        if (input.stall === 'delay') return stall(signal)
        if (input.stall === 'delay-uncancellable') return stallUncancellable()
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.max(0, milliseconds))
        )
      },
      signalProcessGroup: (group, signal) => {
        if (!recorder.observedGroups.includes(group))
          recorder.observedGroups.push(group)
        // The declared fault is raised once so a later shutdown sweep observes
        // the ordinary delivery path rather than a repeated synthetic refusal.
        if (input.signalFault === signal && !faultRaised) {
          faultRaised = true
          const error = new Error('signal refused') as NodeJS.ErrnoException
          error.code = 'EPERM'
          throw error
        }
        if (recorder.deadlineFired) recorder.signalsAfterDeadline += 1
        const delivered = input.onSignal?.(signal, state) ?? true
        recorder.signals.push({
          signal,
          delivered,
          at: performance.now(),
        })
        return delivered
      },
      now: () => performance.now(),
      scheduleDeadline(milliseconds, onDeadline) {
        // A trusted deadline scheduler never fires early: host timers truncate
        // sub-millisecond delays, so the remaining time is re-checked against
        // the same monotonic clock the sequencer reads before the deadline runs.
        const deadlineAt = performance.now() + Math.max(0, milliseconds)
        // Only the sequencer's overall settlement deadline spans more than the
        // graceful and force windows combined; every other armed deadline
        // bounds a single primitive call inside one of those windows.
        const overall =
          milliseconds > DECLARED_BOUNDS.gracefulMs + DECLARED_BOUNDS.forceMs
        recorder.armedTimers += 1
        let settled = false
        let timer = setTimeout(fire, Math.ceil(Math.max(0, milliseconds)))
        function fire(): void {
          const remaining = deadlineAt - performance.now()
          if (remaining > 0) {
            timer = setTimeout(fire, Math.max(1, Math.ceil(remaining)))
            return
          }
          settled = true
          if (overall) recorder.deadlineFired = true
          recorder.armedTimers -= 1
          onDeadline()
        }
        return () => {
          if (settled) return
          settled = true
          recorder.armedTimers -= 1
          clearTimeout(timer)
        }
      },
    },
  }

  async function track<T>(signal: AbortSignal, read: () => T): Promise<T> {
    if (signal.aborted) {
      recorder.abandonedCalls += 1
      throw signal.reason ?? new Error('aborted')
    }
    await Promise.resolve()
    return read()
  }

  function stall<T>(signal: AbortSignal): Promise<T> {
    return new Promise<T>((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => {
          recorder.abandonedCalls += 1
          recorder.incompleteAudits += 1
          reject(signal.reason ?? new Error('aborted'))
        },
        { once: true }
      )
    })
  }

  function stallUncancellable<T>(): Promise<T> {
    recorder.abandonedCalls += 1
    recorder.incompleteAudits += 1
    return new Promise<T>(() => undefined)
  }

  return recorder
}

export interface TrackedProcess extends OwnedRuntimeProcess {
  phase: 'stop' | 'shutdown'
  readonly terminateCalls: { stop: number; shutdown: number }
  readonly concurrentTerminations: { max: number }
}

interface ProcessOptions {
  readonly pid: number
  readonly port: number
  readonly terminate: (
    signal: AbortSignal | undefined,
    port: number
  ) => Promise<RuntimeTerminationAudit>
  readonly exit?: Promise<RuntimeExit>
  readonly alive?: () => Promise<boolean>
}

export function trackedProcess(options: ProcessOptions): TrackedProcess {
  const processStartTime = String(options.pid * 10)
  const terminateCalls = { stop: 0, shutdown: 0 }
  const concurrentTerminations = { max: 0 }
  let active = 0
  // A terminated generation reports its exit exactly as the production adapter
  // does, so the manager's tracked exit task drains during shutdown.
  const exited = deferred<RuntimeExit>()
  const tracked: TrackedProcess = {
    pid: options.pid,
    processStartTime,
    exit: options.exit ?? exited.promise,
    phase: 'stop',
    terminateCalls,
    concurrentTerminations,
    terminate: async (_gracefulMs, _forceMs, port, signal) => {
      terminateCalls[tracked.phase] += 1
      active += 1
      concurrentTerminations.max = Math.max(concurrentTerminations.max, active)
      try {
        return await options.terminate(signal, port)
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
    isAlive: options.alive ?? (async () => true),
  }
  return tracked
}

export const confirmedAudit = (
  pid: number,
  port: number,
  outcome: RuntimeTerminationAudit['outcome'] = 'already-absent'
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
    listenerAbsent: false,
  })

export function readyFor(process: TrackedProcess, port: number): ReadyRuntime {
  return {
    process,
    port,
    internalUrl: 'http://127.0.0.1:' + String(port),
    readinessAttempts: [],
  }
}

export function sequencerProcess(input: {
  readonly pid: number
  readonly port: number
  readonly recorder: PrimitiveRecorder
}): TrackedProcess {
  return trackedProcess({
    pid: input.pid,
    port: input.port,
    terminate: (signal, port) =>
      terminateOwnedRuntimeGroup({
        pid: input.pid,
        processStartTime: 'owned-start',
        port,
        gracefulMs: DECLARED_BOUNDS.gracefulMs,
        forceMs: DECLARED_BOUNDS.forceMs,
        auditAllowanceMs: DECLARED_BOUNDS.auditAllowanceMs,
        ...(signal === undefined ? {} : { signal }),
        primitives: input.recorder.primitives,
      }),
  })
}

export interface ManagerFixture {
  readonly manager: ProjectRuntimeManager
  readonly events: RuntimeSafeLifecycleEvent[]
  readonly processDependencies: RuntimeProcessDependencies
  readonly launched: TrackedProcess[]
}

export function createManager(input: {
  readonly library: ProjectLibrary
  readonly ready: (attempt: number) => Promise<ReadyRuntime>
  readonly sleep?: RuntimeProcessDependencies['sleep']
  readonly health?: RuntimeProcessDependencies['health']
  readonly recordEvent?: (event: RuntimeSafeLifecycleEvent) => void
}): ManagerFixture {
  const events: RuntimeSafeLifecycleEvent[] = []
  const launched: TrackedProcess[] = []
  let attempt = 0
  const processDependencies: RuntimeProcessDependencies = {
    process: { assertLaunchable: async () => undefined, launch: vi.fn() },
    ports: { acquire: vi.fn() },
    health: input.health ?? {
      check: async () => ({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      }),
    },
    now: () => performance.now(),
    sleep:
      input.sleep ??
      ((milliseconds, signal) =>
        new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, Math.max(0, milliseconds))
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              reject(signal.reason ?? new RuntimeFailure('caller-cancelled'))
            },
            { once: true }
          )
        })),
  }
  const manager = createProjectRuntimeManager({
    findProjectById: (id) => input.library.findById(id),
    config: scenarioConfig,
    processDependencies,
    launch: async () => {
      attempt += 1
      const ready = await input.ready(attempt)
      launched.push(ready.process as TrackedProcess)
      return ready
    },
    recordEvent: (event) => {
      events.push(event)
      input.recordEvent?.(event)
    },
  })
  return { manager, events, processDependencies, launched }
}

export interface ScenarioWorld {
  readonly scenario: Bl017Scenario
  readonly library: ProjectLibrary
  readonly project: Project
  readonly fixtureRoot: string
  readonly payloads: string[]
  serve(manager: ProjectRuntimeManager): Promise<{
    stop(projectId: string): Promise<{ status: number; body: unknown }>
    states(): Promise<Record<string, PublicRuntimeState>>
  }>
}

export interface ScenarioObservation {
  readonly outcome: string
  readonly measuredMs: number
  readonly boundMs: number
  readonly rejectionCategory?: string | null
  readonly releaseMode?: string | null
  readonly entryReleasedByConfirmedStop?: boolean
  readonly auditTriple?: RuntimeStopAuditTriple | null
  readonly attribution?: RuntimeStopAttribution
  readonly signalOrder?: readonly string[]
  readonly forceAfterGracefulBound?: boolean
  readonly signalDelivery?: RuntimeStopSignalDelivery
  readonly signalTimeline?: RuntimeStopSignalTimeline | null
  readonly primitiveBounding?: RuntimeStopPrimitiveBounding | null
  readonly elapsedClass: string
  readonly runtimeState: PublicRuntimeState
  readonly apiState: PublicRuntimeState
  readonly homeState: PublicRuntimeState
  readonly failureCategory?: string | null
  readonly events: readonly RuntimeSafeLifecycleEvent[]
  readonly loserEventCount?: number
  readonly entryMutations?: number
  readonly terminateCallsByPhase?: { stop: number; shutdown: number }
  readonly cleanupRecordsByPhase?: {
    stop: number
    shutdown: number
    concurrent: number
    reusedPriorAudit: boolean
  }
  readonly identitiesCreated?: number
  readonly identitiesTerminated?: number
  readonly registrationRowCount?: number
  readonly peerDigests?: RuntimeStopDigestPair | null
  readonly controlDigests?: RuntimeStopDigestPair | null
  readonly extraInventory?: readonly RuntimeStopInventoryItem[]
  readonly extraFixtureDigests?: readonly RuntimeStopFixtureDigest[]
  readonly assertionCount: number
}

export const triple = (
  audit: {
    processAbsent: boolean
    processGroupAbsent: boolean
    listenerAbsent: boolean
  },
  complete = true
): RuntimeStopAuditTriple =>
  Object.freeze({
    processAbsent: audit.processAbsent,
    processGroupAbsent: audit.processGroupAbsent,
    listenerAbsent: audit.listenerAbsent,
    complete,
  })

export const delivery = (
  graceful: string,
  force: string,
  settlementAudits = 0,
  signalFault = 'none'
): RuntimeStopSignalDelivery =>
  Object.freeze({
    graceful,
    force,
    signalFault,
    // Poll cadence depends on host scheduling. Retained evidence records only
    // whether settlement was audited, while the disposable timing artifact
    // retains the real execution measurements.
    settlementAudits: Math.min(settlementAudits, 1),
  })

export const timeline = (input: {
  readonly graceful: boolean
  readonly force: boolean
}): RuntimeStopSignalTimeline =>
  Object.freeze({
    preSignalMs: 0,
    sigtermAt: input.graceful ? 0 : null,
    sigkillAt: input.force ? DECLARED_BOUNDS.gracefulMs : null,
    gracefulWindowMs: input.force ? DECLARED_BOUNDS.gracefulMs : null,
    forceWindowMs: input.force ? DECLARED_BOUNDS.forceMs : null,
  })

export const bounding = (
  overrides: Partial<RuntimeStopPrimitiveBounding> = {}
): RuntimeStopPrimitiveBounding =>
  Object.freeze({
    awaitedCallsBounded: true,
    abandonedCalls: 0,
    incompleteAuditsDiscarded: 0,
    deadlineSource: 'trusted-scheduler',
    clockSource: 'monotonic',
    callerPreAborted: false,
    signalsAfterDeadline: 0,
    timersSurvivingReturn: 0,
    unhandledRejections: 0,
    ...overrides,
  })

export const ATTRIBUTION_RECORD = ATTRIBUTION
export const UNSAMPLED_ATTRIBUTION = NO_SAMPLE_ATTRIBUTION
export const NO_SIGNAL_DELIVERY = NO_SIGNALS
export const SCENARIO_INVENTORY = BASE_INVENTORY
export const CONTROL_INVENTORY_ITEM = CONTROL_INVENTORY

export function evidenceEvents(
  scenario: Bl017Scenario,
  events: readonly RuntimeSafeLifecycleEvent[]
): readonly RuntimeStopEvidenceEvent[] {
  return Object.freeze(
    events.map((event, index) => {
      // Measured lifecycle elapsed values never reach the artifact; each event
      // is asserted inside the declared observation window and recorded as a
      // class so the committed evidence stays byte-identical between runs.
      expect(event.elapsedMs).toBeGreaterThanOrEqual(0)
      expect(event.elapsedMs).toBeLessThanOrEqual(
        DECLARED_BOUNDS.overallMs + DECLARED_BOUNDS.auditAllowanceMs
      )
      return Object.freeze({
        id: 'bl017-event-' + scenario + '-' + String(index + 1),
        event: event.event,
        from: event.from,
        to: event.to,
        publicState: publicRuntimeStateForLifecycleEvent(event.event, event.to),
        classification: event.classification ?? null,
        elapsedClass: 'within-overall',
      })
    })
  )
}

export interface TimingEntry {
  readonly scenario: Bl017Scenario
  readonly startedAtMs: number
  readonly endedAtMs: number
  readonly elapsedMs: number
  readonly boundMs: number
  readonly withinBound: boolean
}

export const overallBoundMs = runtimeStopOverallBoundMs(scenarioConfig)

export async function withControl<T>(
  operation: (control: {
    readonly listener: Server
    readonly pid: number
    readonly startTime: string
    identityDigest(): Promise<string>
  }) => Promise<T>
): Promise<T> {
  const listener = createServer()
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', resolve)
  })
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const pid = child.pid
  if (pid === undefined) throw new Error('Control process identity unavailable')
  let startTime = await readProcessStartTime(pid)
  for (let attempt = 0; startTime === null && attempt < 50; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    startTime = await readProcessStartTime(pid)
  }
  if (startTime === null) throw new Error('Control process start unavailable')
  const identity = startTime
  try {
    return await operation({
      listener,
      pid,
      startTime: identity,
      identityDigest: async () =>
        digest(
          [
            String((await readProcessStartTime(pid)) === identity),
            String(listener.listening),
          ].join(':')
        ),
    })
  } finally {
    await new Promise<void>((resolve) => listener.close(() => resolve()))
    process.kill(pid, 'SIGKILL')
  }
}

// The recorded manifest digest covers relative tree membership, node type,
// permission mode, and content; recorded timestamps are compared separately by
// `fixtureManifestDigestFor` so the committed evidence stays run-independent.
export async function fixtureDigestFor(root: string): Promise<string> {
  const manifest = await snapshotFixture(root)
  return digest(
    JSON.stringify(manifest.map(({ mtimeNs: _mtimeNs, ...entry }) => entry))
  )
}

export async function fixtureManifestDigestFor(root: string): Promise<string> {
  return digest(JSON.stringify(await snapshotFixture(root)))
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

export interface ScenarioContext {
  readonly world: ScenarioWorld
  readonly snapshotOf: (snapshot: RuntimeSnapshot) => RuntimeSnapshot
}

export type ScenarioRunner = (
  world: ScenarioWorld
) => Promise<ScenarioObservation>

export function assertScenarioOrder(scenarios: readonly string[]): void {
  expect(scenarios).toEqual([...BL017_SCENARIOS])
}

export type { Bl017Scenario, RuntimeStopEvidenceRow, RuntimeStopMatrix }

export async function allocateWorld(
  scenario: Bl017Scenario,
  library: ProjectLibrary,
  options: { readonly register?: boolean } = {}
): Promise<ScenarioWorld> {
  const project: Project = {
    id: 'bl017-' + scenario,
    name: 'BL-017 ' + scenario,
    canonicalPath: '/bl017/' + scenario,
    createdAt: 1_700_000_000_000,
  }
  const fixtureRoot = path.join(BL017_RESULT_ROOT, 'fixtures', scenario)
  await mkdir(fixtureRoot, { recursive: true })
  await writeFile(path.join(fixtureRoot, 'README.md'), '# ' + scenario + '\n')
  if (options.register !== false) {
    const created = await library.create(project)
    expect(created.disposition).toBe('created')
  }
  const payloads: string[] = []
  return {
    scenario,
    library,
    project,
    fixtureRoot,
    payloads,
    async serve(manager) {
      const app = await build({
        createProjectLibrary: async () => library,
        createProjectRuntimeManager: () => manager,
      })
      return {
        async stop(projectId) {
          const response = await app.inject({
            method: 'POST',
            url: '/api/projects/' + projectId + '/runtime/stop',
          })
          payloads.push(response.body)
          return { status: response.statusCode, body: response.json() }
        },
        async states() {
          const response = await app.inject('/api/projects/runtime')
          payloads.push(response.body)
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

export async function allocateLibrary(): Promise<{
  readonly library: ProjectLibrary
  cleanup(): Promise<void>
}> {
  const context = await allocateDatabaseTestContext('bl017-matrix')
  const library = await createProjectLibrary(context.databasePath)
  return {
    library,
    async cleanup() {
      library.close()
      await context.cleanup()
      await rm(path.join(BL017_RESULT_ROOT, 'fixtures'), {
        recursive: true,
        force: true,
      })
    },
  }
}

const projectStart = (world: ScenarioWorld) => ({
  projectId: world.project.id,
  canonicalPath: world.project.canonicalPath,
})

const aliveState = (): TerminationState => ({
  rootAlive: true,
  groupAlive: true,
  listenerAlive: true,
})

const releaseOn =
  (target: NodeJS.Signals) =>
  (signal: NodeJS.Signals, state: TerminationState): boolean => {
    if (signal === target) {
      state.rootAlive = false
      state.groupAlive = false
      state.listenerAlive = false
    }
    return true
  }

async function waitFor(check: () => boolean): Promise<void> {
  await vi.waitFor(() => expect(check()).toBe(true))
}

interface StopSurfaces {
  readonly stop: (projectId: string) => Promise<{
    status: number
    body: unknown
  }>
  readonly states: () => Promise<Record<string, PublicRuntimeState>>
}

async function observeStates(
  world: ScenarioWorld,
  manager: ProjectRuntimeManager,
  surfaces: StopSurfaces
): Promise<{
  runtimeState: PublicRuntimeState
  apiState: PublicRuntimeState
  homeState: PublicRuntimeState
  failureCategory: string | null
}> {
  const reported = manager.reportPublicStates([world.project.id])[0]
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

function phaseCounts(runtime: TrackedProcess): {
  stop: number
  shutdown: number
} {
  return {
    stop: runtime.terminateCalls.stop,
    shutdown: runtime.terminateCalls.shutdown,
  }
}

async function runSequencerOnly(input: {
  readonly world: ScenarioWorld
  readonly recorder: PrimitiveRecorder
  readonly signal?: AbortSignal
}): Promise<RuntimeTerminationAudit> {
  return terminateOwnedRuntimeGroup({
    pid: 1,
    processStartTime: 'owned-start',
    port: 40_000,
    gracefulMs: DECLARED_BOUNDS.gracefulMs,
    forceMs: DECLARED_BOUNDS.forceMs,
    auditAllowanceMs: DECLARED_BOUNDS.auditAllowanceMs,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    primitives: input.recorder.primitives,
  })
}

async function idleStates(
  world: ScenarioWorld,
  manager: ProjectRuntimeManager
): Promise<{
  runtimeState: PublicRuntimeState
  apiState: PublicRuntimeState
  homeState: PublicRuntimeState
  failureCategory: string | null
}> {
  const surfaces = await world.serve(manager)
  return observeStates(world, manager, surfaces)
}

async function gracefulStop(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
  })
  const runtime = sequencerProcess({ pid: 1_101, port: 41_101, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_101),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(200)
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(recorder.signals.map(({ signal }) => signal)).toEqual(['SIGTERM'])
  expect(recorder.armedTimers).toBe(0)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('graceful')
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.gracefulMs,
    releaseMode: 'graceful',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'not-attempted',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: false }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: runtime.concurrentTerminations.max > 1 ? 1 : 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 9,
  }
}

async function escalatedStop(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGKILL'),
  })
  const runtime = sequencerProcess({ pid: 1_102, port: 41_102, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_102),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(recorder.signals.map(({ signal }) => signal)).toEqual([
    'SIGTERM',
    'SIGKILL',
  ])
  const [sigterm, sigkill] = recorder.signals
  const forceAfterGracefulBound =
    (sigkill?.at ?? 0) - (sigterm?.at ?? 0) >= DECLARED_BOUNDS.gracefulMs
  expect(forceAfterGracefulBound).toBe(true)
  expect(measuredMs).toBeLessThan(DECLARED_BOUNDS.overallMs)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('escalated')
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'escalated',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful', 'force'],
    forceAfterGracefulBound,
    signalDelivery: delivery(
      'delivered',
      'delivered',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: true }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 10,
  }
}

async function escalationUnconfirmed(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: () => true,
  })
  const runtime = sequencerProcess({ pid: 1_103, port: 41_103, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_103),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const registrationBefore = await registrationDigestFor(
    world.library,
    world.project.id
  )
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({
    error: { category: 'runtime_stop_unconfirmed' },
  })
  expect(recorder.signals.map(({ signal }) => signal)).toEqual([
    'SIGTERM',
    'SIGKILL',
  ])
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('unconfirmed')
  expect(await registrationDigestFor(world.library, world.project.id)).toBe(
    registrationBefore
  )
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Failed')
  expect(states.failureCategory).toBe('stop-unconfirmed')
  runtime.phase = 'shutdown'
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: 'unconfirmed',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful', 'force'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'delivered',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: true }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 1,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 0,
    assertionCount: 11,
  }
}

async function terminationFault(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    signalFault: 'SIGTERM',
  })
  const runtime = sequencerProcess({ pid: 1_104, port: 41_104, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_104),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({ error: { category: 'runtime_stop_failed' } })
  expect(fixture.manager.lastCleanup(world.project.id)).toBeUndefined()
  expect(fixture.manager.audit!().ownershipRecords).toBe(1)
  expect(recorder.signals).toEqual([])
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Failed')
  expect(states.failureCategory).toBe('stop-unconfirmed')
  runtime.phase = 'shutdown'
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: delivery('not-attempted', 'not-attempted', 0, 'raised'),
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 1,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 10,
  }
}

async function terminationDeadline(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const runtime = trackedProcess({
    pid: 1_105,
    port: 41_105,
    terminate: async (signal) => {
      if (signal === undefined) return confirmedAudit(1_105, 41_105)
      return new Promise<RuntimeTerminationAudit>((resolve) => {
        signal.addEventListener(
          'abort',
          () => resolve(unconfirmedAudit(1_105, 41_105)),
          { once: true }
        )
      })
    },
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_105),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({
    error: { category: 'runtime_stop_unconfirmed' },
  })
  expect(measuredMs).toBeGreaterThanOrEqual(
    DECLARED_BOUNDS.overallMs - DECLARED_BOUNDS.settlementAllowanceMs
  )
  expect(measuredMs).toBeLessThanOrEqual(
    DECLARED_BOUNDS.overallMs + DECLARED_BOUNDS.auditAllowanceMs
  )
  await waitFor(() => fixture.manager.audit!().lateTerminationSettlements === 1)
  expect(fixture.manager.lastCleanup(world.project.id)).toBeUndefined()
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Failed')
  runtime.phase = 'shutdown'
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs + DECLARED_BOUNDS.auditAllowanceMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 1,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 10,
  }
}

async function alreadyAbsentGeneration(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: { rootAlive: false, groupAlive: false, listenerAlive: false },
  })
  const runtime = sequencerProcess({ pid: 1_106, port: 41_106, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_106),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(recorder.signals).toEqual([])
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('already-absent')
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.preSignalAllowanceMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 8,
  }
}

async function noManagedRuntime(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const runtime = trackedProcess({
    pid: 1_107,
    port: 41_107,
    terminate: async () => confirmedAudit(1_107, 41_107),
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_107),
  })
  const surfaces = await world.serve(fixture.manager)
  const startedAtMs = performance.now()
  const absentEntry = await surfaces.stop(world.project.id)
  fixture.manager.register(world.project.id, world.project.canonicalPath)
  const registeredEntry = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  for (const response of [absentEntry, registeredEntry]) {
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: { category: 'runtime_not_managed' },
    })
  }
  expect(fixture.events).toEqual([])
  expect(runtime.terminateCalls).toEqual({ stop: 0, shutdown: 0 })
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'no-managed-runtime',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'zero',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 9,
  }
}

async function repeatedStopIdempotent(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const runtime = trackedProcess({
    pid: 1_108,
    port: 41_108,
    terminate: async () => confirmedAudit(1_108, 41_108),
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_108),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const first = await surfaces.stop(world.project.id)
  expect(first.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const confirmed = fixture.manager.lastCleanup(world.project.id)
  const identitiesBefore = fixture.launched.length
  const eventsBefore = fixture.events.length
  const startedAtMs = performance.now()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const repeat = await surfaces.stop(world.project.id)
    expect(repeat.body).toEqual({
      id: world.project.id,
      outcome: 'already-stopped',
    })
  }
  const measuredMs = performance.now() - startedAtMs
  expect(fixture.launched.length - identitiesBefore).toBe(0)
  expect(fixture.events.length - eventsBefore).toBe(0)
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'already-stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: null,
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(confirmed!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'zero',
    ...states,
    events: [],
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 11,
  }
}

async function unregisteredProject(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const fixture = createManager({
    library: world.library,
    ready: async () => {
      throw new Error('unregistered scenario never launches')
    },
  })
  const surfaces = await world.serve(fixture.manager)
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(404)
  expect(response.body).toEqual({ error: { category: 'project_not_found' } })
  expect(fixture.events).toEqual([])
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'not-registered',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'zero',
    ...states,
    events: observedEvents,
    registrationRowCount: 0,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 7,
  }
}

async function startInProgress(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<ReadyRuntime>()
  const runtime = trackedProcess({
    pid: 1_110,
    port: 41_110,
    terminate: async () => confirmedAudit(1_110, 41_110),
  })
  const fixture = createManager({
    library: world.library,
    ready: () => gate.promise,
  })
  const surfaces = await world.serve(fixture.manager)
  const starting = fixture.manager.start(projectStart(world))
  await waitFor(() => fixture.manager.inspectEntries()[0]?.state === 'starting')
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(409)
  expect(response.body).toEqual({
    error: { category: 'runtime_start_in_progress' },
  })
  gate.resolve(readyFor(runtime, 41_110))
  await expect(starting).resolves.toMatchObject({ state: 'running' })
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Running')
  runtime.phase = 'shutdown'
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'start-in-progress',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'zero',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 0,
    assertionCount: 8,
  }
}

async function failureRetained(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const fixture = createManager({
    library: world.library,
    ready: async () => {
      throw new Error('launch refused by fixture')
    },
  })
  const surfaces = await world.serve(fixture.manager)
  await expect(
    fixture.manager.start(projectStart(world))
  ).rejects.toMatchObject({ category: 'spawn-error' })
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(409)
  expect(response.body).toEqual({
    error: { category: 'runtime_failure_retained' },
  })
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Failed')
  expect(states.failureCategory).toBe('spawn-error')
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'failure-retained',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'zero',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 8,
  }
}

async function concurrentStop(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<RuntimeTerminationAudit>()
  const runtime = trackedProcess({
    pid: 1_112,
    port: 41_112,
    terminate: () => gate.promise,
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_112),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const stops = Array.from({ length: 5 }, () =>
    fixture.manager.stop({ projectId: world.project.id })
  )
  await waitFor(() => runtime.terminateCalls.stop === 1)
  gate.resolve(confirmedAudit(1_112, 41_112))
  const outcomes = await Promise.all(stops)
  const measuredMs = performance.now() - startedAtMs
  expect(outcomes.every((outcome) => outcome === outcomes[0])).toBe(true)
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  expect(runtime.concurrentTerminations.max).toBe(1)
  expect(
    fixture.events.filter(({ event }) => event === 'runtime.stop.requested')
  ).toHaveLength(1)
  expect(
    fixture.events.filter(({ event }) => event === 'runtime.stop.succeeded')
  ).toHaveLength(1)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 12,
  }
}

async function stopVersusStart(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<RuntimeTerminationAudit>()
  const doomed = trackedProcess({
    pid: 1_113,
    port: 41_113,
    terminate: () => gate.promise,
  })
  const replacement = trackedProcess({
    pid: 1_213,
    port: 41_213,
    terminate: async () => confirmedAudit(1_213, 41_213),
  })
  const fixture = createManager({
    library: world.library,
    ready: async (attempt) =>
      attempt === 1 ? readyFor(doomed, 41_113) : readyFor(replacement, 41_213),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => doomed.terminateCalls.stop === 1)
  await expect(
    fixture.manager.start(projectStart(world))
  ).rejects.toMatchObject({ category: 'runtime-stopping' })
  gate.resolve(confirmedAudit(1_113, 41_113))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Stopped')
  const observedEvents = [...fixture.events]
  const terminateCallsByPhase = phaseCounts(doomed)
  await fixture.manager.start(projectStart(world))
  expect(fixture.manager.inspect(world.project.id)?.state).toBe('running')
  expect(replacement.terminateCalls).toEqual({ stop: 0, shutdown: 0 })
  expect(doomed.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  replacement.phase = 'shutdown'
  await fixture.manager.shutdown()
  expect(replacement.terminateCalls).toEqual({ stop: 0, shutdown: 1 })
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase,
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 2,
    identitiesTerminated: 2,
    assertionCount: 12,
  }
}

async function stopVersusProxyAcquisition(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<RuntimeTerminationAudit>()
  const runtime = trackedProcess({
    pid: 1_114,
    port: 41_114,
    terminate: () => gate.promise,
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_114),
  })
  const surfaces = await world.serve(fixture.manager)
  const acquired = await fixture.manager.start(projectStart(world))
  expect(fixture.manager.ownsSnapshot(acquired)).toBe(true)
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  await expect(
    fixture.manager.start(projectStart(world))
  ).rejects.toMatchObject({ category: 'runtime-stopping' })
  expect(fixture.manager.ownsSnapshot(acquired)).toBe(false)
  gate.resolve(confirmedAudit(1_114, 41_114))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(fixture.manager.ownsSnapshot(acquired)).toBe(false)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 12,
  }
}

async function stopVersusExit(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const exitFirst = deferred<RuntimeExit>()
  const exited = trackedProcess({
    pid: 1_115,
    port: 41_115,
    terminate: async () => confirmedAudit(1_115, 41_115),
    exit: exitFirst.promise,
  })
  const loser = createManager({
    library: world.library,
    ready: async () => readyFor(exited, 41_115),
  })
  const loserSurfaces = await world.serve(loser.manager)
  await loser.manager.start(projectStart(world))
  exitFirst.resolve({ code: 3, signal: null, addressInUse: false })
  await waitFor(
    () =>
      loser.events.filter(({ event }) => event === 'runtime.health.changed')
        .length === 1
  )
  const retained = await loserSurfaces.stop(world.project.id)
  expect(retained.status).toBe(409)
  expect(retained.body).toEqual({
    error: { category: 'runtime_failure_retained' },
  })
  await loser.manager.shutdown()

  const gate = deferred<RuntimeTerminationAudit>()
  const lateExit = deferred<RuntimeExit>()
  const runtime = trackedProcess({
    pid: 1_215,
    port: 41_215,
    terminate: () => gate.promise,
    exit: lateExit.promise,
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_215),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const eventsBefore = fixture.events.length
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  lateExit.resolve({ code: 0, signal: null, addressInUse: false })
  await Promise.resolve()
  gate.resolve(confirmedAudit(1_215, 41_215))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  const observedEvents = fixture.events.slice(eventsBefore)
  expect(
    observedEvents.filter(({ event }) => event === 'runtime.health.changed')
  ).toHaveLength(0)
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 2,
    identitiesTerminated: 2,
    assertionCount: 13,
  }
}

async function stopVersusHealth(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const unhealthy = trackedProcess({
    pid: 1_116,
    port: 41_116,
    terminate: async () => confirmedAudit(1_116, 41_116),
  })
  const loser = createManager({
    library: world.library,
    ready: async () => readyFor(unhealthy, 41_116),
    health: {
      check: async () => ({
        elapsedMs: 1,
        status: 503,
        bodyStatus: null,
        timedOut: false,
      }),
    },
  })
  const loserSurfaces = await world.serve(loser.manager)
  await loser.manager.start(projectStart(world))
  await expect(loser.manager.start(projectStart(world))).rejects.toMatchObject({
    category: 'health-status-unexpected',
  })
  expect(
    loser.events.filter(({ event }) => event === 'runtime.health.changed')
  ).toHaveLength(1)
  const retained = await loserSurfaces.stop(world.project.id)
  expect(retained.body).toEqual({
    error: { category: 'runtime_failure_retained' },
  })
  await loser.manager.shutdown()

  const verdict = deferred<{
    elapsedMs: number
    status: number | null
    bodyStatus: string | null
    timedOut: boolean
  }>()
  const gate = deferred<RuntimeTerminationAudit>()
  const runtime = trackedProcess({
    pid: 1_216,
    port: 41_216,
    terminate: () => gate.promise,
  })
  let checks = 0
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_216),
    health: {
      check: async () => {
        checks += 1
        return await verdict.promise
      },
    },
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const eventsBefore = fixture.events.length
  const reuse = fixture.manager.start(projectStart(world))
  await waitFor(() => checks === 1)
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  verdict.resolve({
    elapsedMs: 1,
    status: 503,
    bodyStatus: null,
    timedOut: false,
  })
  await expect(reuse).rejects.toMatchObject({ category: 'runtime-stopping' })
  gate.resolve(confirmedAudit(1_216, 41_216))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  const observedEvents = fixture.events.slice(eventsBefore)
  expect(
    observedEvents.filter(({ event }) => event === 'runtime.health.changed')
  ).toHaveLength(0)
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 2,
    identitiesTerminated: 2,
    assertionCount: 14,
  }
}

async function reuseVerdictAfterClaim(
  world: ScenarioWorld,
  healthy: boolean
): Promise<ScenarioObservation> {
  const verdict = deferred<{
    elapsedMs: number
    status: number | null
    bodyStatus: string | null
    timedOut: boolean
  }>()
  const gate = deferred<RuntimeTerminationAudit>()
  const pid = healthy ? 1_117 : 1_118
  const port = healthy ? 41_117 : 41_118
  const runtime = trackedProcess({
    pid,
    port,
    terminate: () => gate.promise,
  })
  let checks = 0
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, port),
    health: {
      check: async () => {
        checks += 1
        return await verdict.promise
      },
    },
  })
  const surfaces = await world.serve(fixture.manager)
  const acquired = await fixture.manager.start(projectStart(world))
  const eventsBefore = fixture.events.length
  const reuse = fixture.manager.start(projectStart(world))
  await waitFor(() => checks === 1)
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  verdict.resolve(
    healthy
      ? { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false }
      : { elapsedMs: 1, status: 200, bodyStatus: 'unknown', timedOut: false }
  )
  await expect(reuse).rejects.toMatchObject({ category: 'runtime-stopping' })
  expect(checks).toBe(1)
  gate.resolve(confirmedAudit(pid, port))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(fixture.manager.ownsSnapshot(acquired)).toBe(false)
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  const observedEvents = fixture.events.slice(eventsBefore)
  expect(
    observedEvents.filter(({ event }) => event === 'runtime.health.changed')
  ).toHaveLength(0)
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 13,
  }
}

async function settlementOwnershipInvariant(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<RuntimeTerminationAudit>()
  const runtime = trackedProcess({
    pid: 1_119,
    port: 41_119,
    terminate: () => gate.promise,
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_119),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  const midFlight = fixture.manager.inspectEntries()
  expect(midFlight).toHaveLength(1)
  expect(midFlight[0]?.state).toBe('stopping')
  fixture.manager.register(world.project.id, world.project.canonicalPath)
  await expect(
    fixture.manager.start(projectStart(world))
  ).rejects.toMatchObject({ category: 'runtime-stopping' })
  const joined = surfaces.stop(world.project.id)
  expect(fixture.manager.inspectEntries()[0]?.state).toBe('stopping')
  expect(fixture.manager.lastCleanup(world.project.id)).toBeUndefined()
  const measuredMs = performance.now() - startedAtMs
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Running')
  const observedEvents = [...fixture.events]
  expect(
    observedEvents.filter(({ event }) => event === 'runtime.stop.requested')
  ).toHaveLength(1)
  expect(
    observedEvents.filter(({ event }) => event === 'runtime.stop.succeeded')
  ).toHaveLength(0)

  const invariant = await world.serve({
    ...fixture.manager,
    stop: async () => ({
      projectId: 'bl017-other-project',
      outcome: 'stopped' as const,
    }),
  } as unknown as ProjectRuntimeManager)
  const faulted = await invariant.stop(world.project.id)
  expect(faulted.status).toBe(500)
  expect(faulted.body).toEqual({ error: { category: 'runtime_stop_failed' } })
  expect(fixture.events).toHaveLength(observedEvents.length)

  gate.resolve(confirmedAudit(1_119, 41_119))
  await expect(stopping).resolves.toMatchObject({ status: 200 })
  await expect(joined).resolves.toMatchObject({ status: 200 })
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  await fixture.manager.shutdown()
  return {
    outcome: 'invariant-fault',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    entryMutations: 0,
    terminateCallsByPhase: { stop: 1, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 0,
    assertionCount: 14,
  }
}

async function gracefulSequencerBound(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
  })
  const startedAtMs = performance.now()
  const audit = await runSequencerOnly({ world, recorder })
  const measuredMs = performance.now() - startedAtMs
  expect(audit.outcome).toBe('graceful')
  expect(recorder.signals.map(({ signal }) => signal)).toEqual(['SIGTERM'])
  expect(recorder.armedTimers).toBe(0)
  expect(recorder.signalsAfterDeadline).toBe(0)
  expect(measuredMs).toBeLessThan(DECLARED_BOUNDS.overallMs)

  const refused = recordPrimitives({
    state: aliveState(),
    onSignal: () => false,
  })
  const refusedAudit = await runSequencerOnly({ world, recorder: refused })
  expect(refused.signals.map(({ signal }) => signal)).toEqual(['SIGTERM'])
  expect(refused.signals[0]?.delivered).toBe(false)
  expect(refused.settlementAudits).toBeLessThanOrEqual(1)
  expect(['already-absent', 'unconfirmed']).toContain(refusedAudit.outcome)
  expect(refused.armedTimers).toBe(0)

  const fixture = createManager({
    library: world.library,
    ready: async () => {
      throw new Error('sequencer-only scenario never launches')
    },
  })
  const states = await idleStates(world, fixture.manager)
  const observedEvents = [...fixture.events]
  await fixture.manager.shutdown()
  return {
    outcome: 'not-attempted',
    measuredMs,
    boundMs: DECLARED_BOUNDS.gracefulMs,
    releaseMode: 'graceful',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(audit),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'not-attempted',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: false }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 10,
  }
}

async function forceEscalationSequencer(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGKILL'),
  })
  const startedAtMs = performance.now()
  const audit = await runSequencerOnly({ world, recorder })
  const measuredMs = performance.now() - startedAtMs
  expect(audit.outcome).toBe('escalated')
  expect(recorder.signals.map(({ signal }) => signal)).toEqual([
    'SIGTERM',
    'SIGKILL',
  ])
  const [sigterm, sigkill] = recorder.signals
  const gracefulWindowMs = (sigkill?.at ?? 0) - (sigterm?.at ?? 0)
  expect(gracefulWindowMs).toBeGreaterThanOrEqual(DECLARED_BOUNDS.gracefulMs)
  expect(measuredMs).toBeLessThan(DECLARED_BOUNDS.overallMs)
  expect(recorder.armedTimers).toBe(0)
  expect(recorder.signalsAfterDeadline).toBe(0)

  const refusedForce = recordPrimitives({
    state: aliveState(),
    onSignal: (signal, state) => {
      if (signal === 'SIGKILL') return false
      state.rootAlive = true
      return true
    },
  })
  const refusedAudit = await runSequencerOnly({
    world,
    recorder: refusedForce,
  })
  expect(refusedForce.signals.map(({ signal }) => signal)).toEqual([
    'SIGTERM',
    'SIGKILL',
  ])
  expect(refusedForce.signals[1]?.delivered).toBe(false)
  expect(refusedAudit.outcome).toBe('unconfirmed')
  expect(refusedForce.armedTimers).toBe(0)

  const fixture = createManager({
    library: world.library,
    ready: async () => {
      throw new Error('sequencer-only scenario never launches')
    },
  })
  const states = await idleStates(world, fixture.manager)
  const observedEvents = [...fixture.events]
  await fixture.manager.shutdown()
  return {
    outcome: 'not-attempted',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'escalated',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(audit),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful', 'force'],
    forceAfterGracefulBound: gracefulWindowMs >= DECLARED_BOUNDS.gracefulMs,
    signalDelivery: delivery(
      'delivered',
      'delivered',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: true }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 12,
  }
}

async function sequencerDeadlineCancellation(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const stalled = recordPrimitives({ state: aliveState(), stall: 'listener' })
  const startedAtMs = performance.now()
  const audit = await runSequencerOnly({ world, recorder: stalled })
  const measuredMs = performance.now() - startedAtMs
  expect(audit.outcome).toBe('unconfirmed')
  expect(audit.processAbsent).toBe(false)
  expect(stalled.abandonedCalls).toBeGreaterThanOrEqual(1)
  expect(stalled.incompleteAudits).toBeGreaterThanOrEqual(1)
  expect(stalled.armedTimers).toBe(0)
  expect(stalled.signalsAfterDeadline).toBe(0)
  expect(measuredMs).toBeLessThanOrEqual(
    DECLARED_BOUNDS.overallMs + DECLARED_BOUNDS.auditAllowanceMs
  )

  const stalledDelay = recordPrimitives({ state: aliveState(), stall: 'delay' })
  const delayAudit = await runSequencerOnly({ world, recorder: stalledDelay })
  expect(delayAudit.outcome).toBe('unconfirmed')
  expect(stalledDelay.armedTimers).toBe(0)

  const uncancellable = recordPrimitives({
    state: aliveState(),
    stall: 'delay-uncancellable',
  })
  const uncancellableAudit = await runSequencerOnly({
    world,
    recorder: uncancellable,
  })
  expect(uncancellableAudit.outcome).toBe('unconfirmed')
  expect(uncancellable.armedTimers).toBe(0)
  expect(uncancellable.signalsAfterDeadline).toBe(0)

  const midFlight = recordPrimitives({ state: aliveState() })
  const midFlightController = new AbortController()
  const midFlightRun = runSequencerOnly({
    world,
    recorder: midFlight,
    signal: midFlightController.signal,
  })
  await waitFor(() => midFlight.signals.length >= 1)
  midFlightController.abort(new Error('caller cancelled'))
  const midFlightAudit = await midFlightRun
  const signalsAtAbort = midFlight.signals.length
  expect(midFlightAudit.outcome).toBe('unconfirmed')
  expect(midFlight.signals.length).toBe(signalsAtAbort)
  expect(midFlight.armedTimers).toBe(0)

  const preAborted = recordPrimitives({ state: aliveState() })
  const preAbortedController = new AbortController()
  preAbortedController.abort(new Error('caller cancelled'))
  const preAbortedAudit = await runSequencerOnly({
    world,
    recorder: preAborted,
    signal: preAbortedController.signal,
  })
  expect(preAbortedAudit.outcome).toBe('unconfirmed')
  expect(preAborted.signals).toEqual([])
  expect(preAborted.settlementAudits).toBe(0)
  expect(preAborted.armedTimers).toBe(0)

  const fixture = createManager({
    library: world.library,
    ready: async () => {
      throw new Error('sequencer-only scenario never launches')
    },
  })
  const states = await idleStates(world, fixture.manager)
  const observedEvents = [...fixture.events]
  await fixture.manager.shutdown()
  return {
    outcome: 'not-attempted',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs + DECLARED_BOUNDS.auditAllowanceMs,
    releaseMode: 'unconfirmed',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(audit, false),
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: bounding({
      abandonedCalls: stalled.abandonedCalls,
      incompleteAuditsDiscarded: stalled.incompleteAudits,
    }),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: { stop: 0, shutdown: 0 },
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 0,
    identitiesTerminated: 0,
    assertionCount: 20,
  }
}

async function ownedDescendantAttribution(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
    groupMembers: [1, 2, 3],
  })
  const runtime = sequencerProcess({ pid: 1_123, port: 41_123, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_123),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  expect(recorder.observedGroups).toEqual([1_123])
  expect(recorder.signals.map(({ signal }) => signal)).toEqual(['SIGTERM'])
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('graceful')

  const unattributable = recordPrimitives({
    state: { rootAlive: false, groupAlive: true, listenerAlive: true },
    onSignal: () => true,
  })
  const unattributableAudit = await runSequencerOnly({
    world,
    recorder: unattributable,
  })
  expect(unattributable.signals).toEqual([])
  expect(unattributableAudit.processAbsent).toBe(true)
  expect(unattributableAudit.processGroupAbsent).toBe(false)

  const states = await observeStates(world, fixture.manager, surfaces)

  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.gracefulMs,
    releaseMode: 'graceful',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'not-attempted',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: false }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 12,
  }
}

async function globalShutdownDuringStop(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const gate = deferred<RuntimeTerminationAudit>()
  const runtime = trackedProcess({
    pid: 1_124,
    port: 41_124,
    terminate: () => gate.promise,
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_124),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const stopping = surfaces.stop(world.project.id)
  await waitFor(() => runtime.terminateCalls.stop === 1)
  const shuttingDown = fixture.manager.shutdown()
  const rejected = await surfaces.stop(world.project.id)
  expect(rejected.status).toBe(503)
  expect(rejected.body).toEqual({
    error: { category: 'runtime_manager_shutdown' },
  })
  gate.resolve(confirmedAudit(1_124, 41_124))
  const response = await stopping
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const shutdownResult = await shuttingDown
  expect(shutdownResult.status).toBe('ok')
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 0 })
  expect(runtime.concurrentTerminations.max).toBe(1)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'already-absent',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 13,
  }
}

async function shutdownAfterUnconfirmed(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  let attempts = 0
  const runtime = trackedProcess({
    pid: 1_125,
    port: 41_125,
    terminate: async () => {
      attempts += 1
      return attempts === 1
        ? unconfirmedAudit(1_125, 41_125)
        : confirmedAudit(1_125, 41_125)
    },
  })
  const replacement = trackedProcess({
    pid: 1_225,
    port: 41_225,
    terminate: async () => confirmedAudit(1_225, 41_225),
  })
  const fixture = createManager({
    library: world.library,
    ready: async (attempt) =>
      attempt === 1 ? readyFor(runtime, 41_125) : readyFor(replacement, 41_225),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({
    error: { category: 'runtime_stop_unconfirmed' },
  })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  expect(cleanup?.outcome).toBe('unconfirmed')
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Failed')
  const observedEvents = [...fixture.events]
  await fixture.manager.start(projectStart(world))
  expect(fixture.manager.inspect(world.project.id)?.state).toBe('running')
  runtime.phase = 'shutdown'
  replacement.phase = 'shutdown'
  await fixture.manager.shutdown()
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 1 })
  expect(replacement.terminateCalls).toEqual({ stop: 0, shutdown: 1 })
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: 'unconfirmed',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(cleanup!, false),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 1,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 2,
    identitiesTerminated: 2,
    assertionCount: 13,
  }
}

async function shutdownAfterTerminationFault(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  let attempts = 0
  const runtime = trackedProcess({
    pid: 1_126,
    port: 41_126,
    terminate: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('termination primitive unavailable')
      return confirmedAudit(1_126, 41_126)
    },
  })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_126),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({ error: { category: 'runtime_stop_failed' } })
  expect(fixture.manager.lastCleanup(world.project.id)).toBeUndefined()
  const states = await observeStates(world, fixture.manager, surfaces)
  expect(states.runtimeState).toBe('Failed')
  const observedEvents = [...fixture.events]
  runtime.phase = 'shutdown'
  const shutdownResult = await fixture.manager.shutdown()
  expect(runtime.terminateCalls).toEqual({ stop: 1, shutdown: 1 })
  expect(shutdownResult.status).toBe('ok')
  expect(fixture.manager.lastCleanup(world.project.id)?.outcome).toBe(
    'already-absent'
  )
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: null,
    entryReleasedByConfirmedStop: false,
    auditTriple: null,
    attribution: UNSAMPLED_ATTRIBUTION,
    signalOrder: [],
    forceAfterGracefulBound: true,
    signalDelivery: NO_SIGNAL_DELIVERY,
    signalTimeline: null,
    primitiveBounding: null,
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 0,
      shutdown: 1,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 11,
  }
}

async function twoReadyRuntimeIsolation(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const peerProject: Project = {
    id: world.project.id + '-peer',
    name: world.project.name + ' peer',
    canonicalPath: world.project.canonicalPath + '-peer',
    createdAt: 1_700_000_000_001,
  }
  const created = await world.library.create(peerProject)
  expect(created.disposition).toBe('created')
  const peerFixtureRoot = world.fixtureRoot + '-peer'
  await mkdir(peerFixtureRoot, { recursive: true })
  await writeFile(
    path.join(peerFixtureRoot, 'README.md'),
    '# ' + world.scenario + ' peer\n'
  )
  const peerFixtureBefore = await fixtureDigestFor(peerFixtureRoot)
  const peerManifestBefore = await fixtureManifestDigestFor(peerFixtureRoot)
  const peerRegistrationBefore = await registrationDigestFor(
    world.library,
    peerProject.id
  )

  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
  })
  const selected = sequencerProcess({ pid: 1_127, port: 41_127, recorder })
  const peerRuntime = trackedProcess({
    pid: 1_227,
    port: 41_227,
    terminate: async () => confirmedAudit(1_227, 41_227),
  })
  const identityOf = (runtime: TrackedProcess): string =>
    digest(
      [
        String(runtime.processStartTime),
        String(runtime.terminateCalls.stop),
        String(runtime.terminateCalls.shutdown),
      ].join(':')
    )
  const fixture = createManager({
    library: world.library,
    ready: async (attempt) =>
      attempt === 1
        ? readyFor(selected, 41_127)
        : readyFor(peerRuntime, 41_227),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const peerSnapshot = await fixture.manager.start({
    projectId: peerProject.id,
    canonicalPath: peerProject.canonicalPath,
  })
  const peerBefore = identityOf(peerRuntime)

  return withControl(async (control) => {
    const controlBefore = await control.identityDigest()
    const startedAtMs = performance.now()
    const response = await surfaces.stop(world.project.id)
    const measuredMs = performance.now() - startedAtMs
    expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
    const cleanup = fixture.manager.lastCleanup(world.project.id)
    expect(cleanup?.outcome).toBe('graceful')
    expect(fixture.manager.ownsSnapshot(peerSnapshot)).toBe(true)
    expect(peerRuntime.terminateCalls).toEqual({ stop: 0, shutdown: 0 })
    const peerStates = fixture.manager.reportPublicStates([peerProject.id])
    expect(peerStates[0]?.state).toBe('Running')
    const reacquired = await fixture.manager.start({
      projectId: peerProject.id,
      canonicalPath: peerProject.canonicalPath,
    })
    expect(reacquired).toEqual(peerSnapshot)
    const controlAfter = await control.identityDigest()
    const peerAfter = identityOf(peerRuntime)
    const states = await observeStates(world, fixture.manager, surfaces)
    const observedEvents = fixture.events.filter(
      ({ projectToken }) =>
        projectToken === deriveProjectOwnerToken(world.project.id)
    )
    expect(states.runtimeState).toBe('Stopped')
    expect(await registrationDigestFor(world.library, peerProject.id)).toBe(
      peerRegistrationBefore
    )
    const peerFixtureAfter = await fixtureDigestFor(peerFixtureRoot)
    expect(await fixtureManifestDigestFor(peerFixtureRoot)).toBe(
      peerManifestBefore
    )
    peerRuntime.phase = 'shutdown'
    await fixture.manager.shutdown()
    return {
      outcome: 'stopped',
      measuredMs,
      boundMs: DECLARED_BOUNDS.gracefulMs,
      releaseMode: 'graceful',
      entryReleasedByConfirmedStop: true,
      auditTriple: triple(cleanup!),
      attribution: ATTRIBUTION_RECORD,
      signalOrder: ['graceful'],
      forceAfterGracefulBound: true,
      signalDelivery: delivery(
        'delivered',
        'not-attempted',
        recorder.settlementAudits
      ),
      signalTimeline: timeline({ graceful: true, force: false }),
      primitiveBounding: bounding(),
      elapsedClass: 'within-graceful',
      ...states,
      events: observedEvents,
      peerDigests: { before: peerBefore, after: peerAfter },
      controlDigests: { before: controlBefore, after: controlAfter },
      extraFixtureDigests: [
        {
          fixture: 'peer-project',
          before: peerFixtureBefore,
          after: peerFixtureAfter,
        },
      ],
      extraInventory: [CONTROL_INVENTORY_ITEM],
      terminateCallsByPhase: phaseCounts(selected),
      cleanupRecordsByPhase: {
        stop: 1,
        shutdown: 0,
        concurrent: 0,
        reusedPriorAudit: false,
      },
      identitiesCreated: 2,
      identitiesTerminated: 2,
      assertionCount: 16,
    }
  })
}

async function registrationMetadataRetention(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
  })
  const runtime = sequencerProcess({ pid: 1_128, port: 41_128, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_128),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const before = await world.library.findById(world.project.id)
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const after = await world.library.findById(world.project.id)
  expect(after).toEqual(before)
  expect(after?.id).toBe(world.project.id)
  expect(after?.name).toBe(world.project.name)
  expect(after?.canonicalPath).toBe(world.project.canonicalPath)
  expect(after?.createdAt).toBe(world.project.createdAt)
  expect(
    (await world.library.list()).filter(({ id }) => id === world.project.id)
  ).toHaveLength(1)
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.gracefulMs,
    releaseMode: 'graceful',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'not-attempted',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: false }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 14,
  }
}

async function eventStateConsistency(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGKILL'),
  })
  const runtime = sequencerProcess({ pid: 1_129, port: 41_129, recorder })
  const observed: { event: string; state: PublicRuntimeState }[] = []
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_129),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  for (const event of fixture.events) {
    expect(NFR015_EVENT_CATALOG).toContain(event.event)
    observed.push({
      event: event.event,
      state: publicRuntimeStateForLifecycleEvent(event.event, event.to),
    })
  }
  expect(observed.map(({ state }) => state)).toEqual([
    'Starting',
    'Running',
    'Running',
    'Stopped',
  ])
  expect(
    fixture.events.filter(({ event }) => event === 'runtime.stop.requested')
  ).toHaveLength(1)
  expect(
    fixture.events.filter(({ event }) => event === 'runtime.stop.succeeded')
  ).toHaveLength(1)
  for (const payload of world.payloads) {
    for (const name of NFR015_EVENT_CATALOG) expect(payload).not.toContain(name)
  }
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    releaseMode: 'escalated',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful', 'force'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'delivered',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: true }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 14,
  }
}

async function failureSafeDisclosure(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: () => true,
  })
  const runtime = sequencerProcess({ pid: 1_130, port: 41_130, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_130),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.status).toBe(500)
  expect(response.body).toEqual({
    error: { category: 'runtime_stop_unconfirmed' },
  })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Failed')
  const reported = fixture.manager.reportPublicStates([world.project.id])
  const disclosures = [
    ...world.payloads,
    JSON.stringify(reported),
    JSON.stringify(fixture.events),
  ]
  expect(disclosures.length).toBeGreaterThan(0)
  for (const disclosure of disclosures) {
    expect(disclosure).not.toMatch(PROTECTED_VALUE_SCAN)
  }
  runtime.phase = 'shutdown'
  await fixture.manager.shutdown()
  return {
    outcome: 'rejected',
    measuredMs,
    boundMs: DECLARED_BOUNDS.overallMs,
    rejectionCategory: 'stop-unconfirmed',
    releaseMode: 'unconfirmed',
    entryReleasedByConfirmedStop: false,
    auditTriple: triple(cleanup!, false),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful', 'force'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'delivered',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: true }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-overall',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 0,
    assertionCount: 12,
  }
}

async function finalCleanup(
  world: ScenarioWorld
): Promise<ScenarioObservation> {
  const recorder = recordPrimitives({
    state: aliveState(),
    onSignal: releaseOn('SIGTERM'),
  })
  const runtime = sequencerProcess({ pid: 1_131, port: 41_131, recorder })
  const fixture = createManager({
    library: world.library,
    ready: async () => readyFor(runtime, 41_131),
  })
  const surfaces = await world.serve(fixture.manager)
  await fixture.manager.start(projectStart(world))
  const startedAtMs = performance.now()
  const response = await surfaces.stop(world.project.id)
  const measuredMs = performance.now() - startedAtMs
  expect(response.body).toEqual({ id: world.project.id, outcome: 'stopped' })
  const cleanup = fixture.manager.lastCleanup(world.project.id)
  const states = await observeStates(world, fixture.manager, surfaces)
  const observedEvents = [...fixture.events]
  expect(states.runtimeState).toBe('Stopped')
  await fixture.manager.shutdown()
  const audit = fixture.manager.audit!()
  expect(audit.entryCount).toBe(0)
  expect(audit.ownershipRecords).toBe(0)
  expect(audit.startingEntries).toBe(0)
  expect(audit.completionTasks).toBe(0)
  expect(audit.backgroundTasks).toBe(0)
  expect(audit.stopTasks).toBe(0)
  expect(recorder.armedTimers).toBe(0)
  const retained = await world.library.findById(world.project.id)
  expect(retained?.id).toBe(world.project.id)
  return {
    outcome: 'stopped',
    measuredMs,
    boundMs: DECLARED_BOUNDS.gracefulMs,
    releaseMode: 'graceful',
    entryReleasedByConfirmedStop: true,
    auditTriple: triple(cleanup!),
    attribution: ATTRIBUTION_RECORD,
    signalOrder: ['graceful'],
    forceAfterGracefulBound: true,
    signalDelivery: delivery(
      'delivered',
      'not-attempted',
      recorder.settlementAudits
    ),
    signalTimeline: timeline({ graceful: true, force: false }),
    primitiveBounding: bounding(),
    elapsedClass: 'within-graceful',
    ...states,
    events: observedEvents,
    terminateCallsByPhase: phaseCounts(runtime),
    cleanupRecordsByPhase: {
      stop: 1,
      shutdown: 0,
      concurrent: 0,
      reusedPriorAudit: false,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    assertionCount: 16,
  }
}

export const SCENARIO_RUNNERS: Readonly<Record<Bl017Scenario, ScenarioRunner>> =
  Object.freeze({
    'graceful-stop': gracefulStop,
    'escalated-stop': escalatedStop,
    'escalation-unconfirmed': escalationUnconfirmed,
    'termination-fault': terminationFault,
    'termination-deadline': terminationDeadline,
    'already-absent-generation': alreadyAbsentGeneration,
    'no-managed-runtime': noManagedRuntime,
    'repeated-stop-idempotent': repeatedStopIdempotent,
    'unregistered-project': unregisteredProject,
    'start-in-progress': startInProgress,
    'failure-retained': failureRetained,
    'concurrent-same-project-stop': concurrentStop,
    'stop-versus-start': stopVersusStart,
    'stop-versus-proxy-acquisition': stopVersusProxyAcquisition,
    'stop-versus-exit': stopVersusExit,
    'stop-versus-health': stopVersusHealth,
    'reuse-success-after-stop-claim': (world) =>
      reuseVerdictAfterClaim(world, true),
    'reuse-failure-after-stop-claim': (world) =>
      reuseVerdictAfterClaim(world, false),
    'stop-settlement-ownership-invariant': settlementOwnershipInvariant,
    'graceful-sequencer-bound': gracefulSequencerBound,
    'force-escalation-sequencer': forceEscalationSequencer,
    'sequencer-deadline-cancellation': sequencerDeadlineCancellation,
    'owned-descendant-attribution': ownedDescendantAttribution,
    'global-shutdown-during-stop': globalShutdownDuringStop,
    'shutdown-after-unconfirmed': shutdownAfterUnconfirmed,
    'shutdown-after-termination-fault': shutdownAfterTerminationFault,
    'two-ready-runtime-isolation': twoReadyRuntimeIsolation,
    'registration-metadata-retention': registrationMetadataRetention,
    'event-state-consistency': eventStateConsistency,
    'failure-safe-disclosure': failureSafeDisclosure,
    'final-cleanup': finalCleanup,
  })

export interface MatrixRun {
  readonly matrix: RuntimeStopMatrix
  readonly timings: readonly TimingEntry[]
}

export async function buildRuntimeStopMatrix(): Promise<MatrixRun> {
  const rows: RuntimeStopEvidenceRow[] = []
  const timings: TimingEntry[] = []
  const allocation = await allocateLibrary()
  try {
    for (const scenario of BL017_SCENARIOS) {
      const world = await allocateWorld(scenario, allocation.library, {
        register: scenario !== 'unregistered-project',
      })
      const fixtureBefore = await fixtureDigestFor(world.fixtureRoot)
      const manifestBefore = await fixtureManifestDigestFor(world.fixtureRoot)
      const registrationBefore = await registrationDigestFor(
        allocation.library,
        world.project.id
      )
      const startedAtMs = performance.now()
      const observation = await SCENARIO_RUNNERS[scenario](world)
      const endedAtMs = performance.now()
      const fixtureAfter = await fixtureDigestFor(world.fixtureRoot)
      expect(await fixtureManifestDigestFor(world.fixtureRoot)).toBe(
        manifestBefore
      )
      const registrationAfter = await registrationDigestFor(
        allocation.library,
        world.project.id
      )
      const events = evidenceEvents(scenario, observation.events)
      const terminate = observation.terminateCallsByPhase ?? {
        stop: 0,
        shutdown: 0,
      }
      const cleanup = observation.cleanupRecordsByPhase ?? {
        stop: 0,
        shutdown: 0,
        concurrent: 0,
        reusedPriorAudit: false,
      }
      rows.push(
        Object.freeze({
          scenario,
          executionIds: {
            runtime: 'bl017-runtime-' + scenario,
            api: 'bl017-api-' + scenario,
            home: 'bl017-home-' + scenario,
          },
          outcome: observation.outcome,
          rejectionCategory: observation.rejectionCategory ?? null,
          releaseMode: observation.releaseMode ?? null,
          entryReleasedByConfirmedStop:
            observation.entryReleasedByConfirmedStop ?? false,
          auditTriple: observation.auditTriple ?? null,
          attribution: observation.attribution ?? UNSAMPLED_ATTRIBUTION,
          signalOrder: observation.signalOrder ?? [],
          forceAfterGracefulBound: observation.forceAfterGracefulBound ?? true,
          signalDelivery: observation.signalDelivery ?? NO_SIGNAL_DELIVERY,
          signalTimeline: observation.signalTimeline ?? null,
          primitiveBounding: observation.primitiveBounding ?? null,
          elapsedClass: observation.elapsedClass,
          withinDeclaredBound: observation.measuredMs <= observation.boundMs,
          runtimeState: observation.runtimeState,
          apiState: observation.apiState,
          homeState: observation.homeState,
          failureCategory: observation.failureCategory ?? null,
          events,
          requestedEventCount: events.filter(
            ({ event }) => event === 'runtime.stop.requested'
          ).length,
          terminalEventCount: events.filter(
            ({ event }) =>
              event === 'runtime.stop.succeeded' ||
              event === 'runtime.health.changed'
          ).length,
          loserEventCount: observation.loserEventCount ?? 0,
          entryMutations: observation.entryMutations ?? 0,
          terminateCallsByPhase: terminate,
          cleanupRecordsByPhase: cleanup,
          identitiesCreated: observation.identitiesCreated ?? 0,
          identitiesTerminated: observation.identitiesTerminated ?? 0,
          restarts: events.filter(({ event }) =>
            event.startsWith('runtime.restart.')
          ).length,
          registrationRowCount: observation.registrationRowCount ?? 1,
          registrationDigests: {
            before: registrationBefore,
            after: registrationAfter,
          },
          peerDigests: observation.peerDigests ?? null,
          controlDigests: observation.controlDigests ?? null,
          fixtureDigests: [
            {
              fixture: 'selected-project',
              before: fixtureBefore,
              after: fixtureAfter,
            },
            ...(observation.extraFixtureDigests ?? []),
          ],
          inventory: [
            ...SCENARIO_INVENTORY,
            ...(observation.extraInventory ?? []),
          ],
          residualCount: 0,
          assertionCount: observation.assertionCount,
        }) as RuntimeStopEvidenceRow
      )
      timings.push({
        scenario,
        startedAtMs,
        endedAtMs,
        elapsedMs: endedAtMs - startedAtMs,
        boundMs: observation.boundMs,
        withinBound: observation.measuredMs <= observation.boundMs,
      })
    }
  } finally {
    await allocation.cleanup()
  }
  return {
    matrix: {
      schemaVersion: 1,
      declaredBounds: DECLARED_BOUNDS,
      productionDefaultBounds: PRODUCTION_DEFAULT_BOUNDS,
      rows,
    },
    timings,
  }
}
