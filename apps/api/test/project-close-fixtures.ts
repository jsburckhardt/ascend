/// <reference types="node" />
import { createHash, randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { spawn as spawnChild, type ChildProcess } from 'node:child_process'
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import { createConnection, type AddressInfo, type Socket } from 'node:net'
import { existsSync } from 'node:fs'
import {
  chmod,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocket, WebSocketServer } from 'ws'
import { expect } from 'vitest'

import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import { createProjectCloseService } from '../src/project-close.js'
import { PROJECT_CLOSED_EVENT } from '../src/routes/projects.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeFailure,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  runtimeCloseOverallBoundMs,
  runtimeCloseReleaseBoundMs,
  runtimeStopOverallBoundMs,
  stableProjectRoute,
  type ProjectRuntimeConfig,
  type PublicRuntimeState,
  type RuntimeCloseOutcome,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
  type ProjectRuntimeCloseClaimInspection,
  type ProjectRuntimeEntryState,
} from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  defaultRuntimeAttributionPrimitives,
  fetchRuntimeHealthAdapter,
  loopbackListenerIsAbsent,
  readProcessStartTime,
  type HealthAttempt,
  type InstalledRuntimeIdentity,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeAttributionPrimitives,
  type RuntimeDeadlineScheduler,
  type RuntimeExit,
  type RuntimeProcessDependencies,
  type RuntimeTerminationAudit,
  type RuntimeTerminationOutcome,
  type RuntimeTerminationPrimitives,
} from '../src/project-runtime-process.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import {
  createWorkbenchProxyManager,
  type WorkbenchProxyManager,
} from '../src/workbench-proxy-manager.js'
import {
  BL020_ADMITTED_CLOSE_DEADLINE_ARMS,
  BL020_PRIMITIVE_CALLS,
  BL020_PROXY_AUDIT_COUNTS,
  BL020_RESIDUAL_CLASSES,
  BL020_SCENARIO_BOUNDS,
  BL020_SCENARIO_GROUPS,
  bl020BoundValueMs,
  deriveCloseAdmissionWitness,
  type Bl020ClosePhase,
  type Bl020CloseSeam,
  type Bl020PrimitiveCall,
  type Bl020ProxyAuditCount,
  type Bl020ResidualClass,
  type Bl020ScenarioGroup,
  type Bl020ScenarioId,
  type CloseAdmissionObservation,
  type CloseComponentWitness,
  type CloseConfirmationRecord,
  type CloseControlObservation,
  type CloseFixtureManifest,
  type CloseManagerAudit,
  type CloseRefusedAcquisition,
  type CloseRegistrationDigest,
  type ClosePeerObservation,
  type CloseTeardownProbe,
  type CloseTeardownRecord,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'

export const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)
export const BL020_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020'
)
/**
 * Fixture trees are materialized under a per-worker segment. Two lanes may
 * legitimately execute the same scenario identifiers at the same time — the
 * mutation lane derives its baseline from real edge executions — and each
 * world removes exactly the trees it created, so the segment keeps one
 * worker's teardown from deleting another worker's live fixture.
 */
export const BL020_FIXTURE_ROOT = path.join(
  BL020_RESULT_ROOT,
  'fixtures',
  'worker-' +
    String(process.pid) +
    '-' +
    (process.env['VITEST_WORKER_ID'] ?? '0')
)
export const DISPOSABLE_MATRIX_PATH = path.join(
  BL020_RESULT_ROOT,
  'close-matrix.json'
)
export const RETAINED_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence'
)
export const RETAINED_MATRIX_PATH = path.join(
  RETAINED_EVIDENCE_ROOT,
  'close-matrix.json'
)
export const COMPONENT_LANE_PATH = path.join(
  BL020_RESULT_ROOT,
  'close-component-matrix.json'
)

/**
 * The matrix declares production default bounds, so every row is measured
 * against the value a deployed close would carry rather than a shrunken test
 * value. Only the pacing primitives below are fixture-owned.
 */
export const matrixConfig: ProjectRuntimeConfig = createProjectRuntimeConfig()

export const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

/** Opaque, stable, and never a raw identity: the committed artifact's alphabet. */
export const opaque = (prefix: string, value: string): string =>
  prefix + '-' + digest(value).slice(0, 16)

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
  void promise.catch(() => undefined)
  return { promise, resolve, reject }
}

export interface DeadlineArm {
  readonly declaredMs: number
  /** The monotonic instant production armed this deadline. */
  readonly armedAt: number
  /**
   * Which primitive armed it. The manager arms its own close deadlines
   * through the injected scheduler; the termination primitives arm the
   * graceful and force deadlines through the same scheduler, so the two are
   * distinguished at the arming site rather than by comparing declared values.
   */
  readonly owner: DeadlineOwner
  cancelled: boolean
  fired: boolean
  fire(): void
}

export type DeadlineOwner = 'runtime' | 'termination'

export interface RecordingScheduler extends RuntimeDeadlineScheduler {
  readonly arms: DeadlineArm[]
  advance(milliseconds: number): void
  /** Runs `arm` attributing every deadline it schedules to `owner`. */
  asOwner<T>(owner: DeadlineOwner, arm: () => T): T
}

/**
 * Deadlines are armed exactly as production arms them and fire only when a
 * scenario fires them, so a bounded refusal is observed rather than waited for.
 * Each arm is attributed to the close invocation whose asynchronous context
 * armed it, which is how an admitted close is recognised: only `runClose`
 * arms three manager deadlines.
 */
export function recordingScheduler(): RecordingScheduler {
  const arms: DeadlineArm[] = []
  let offset = 0
  let owner: DeadlineOwner = 'runtime'
  const monotonic = (): number => Math.round(performance.now())
  return {
    arms,
    now: () => monotonic() + offset,
    advance: (milliseconds) => {
      offset += milliseconds
    },
    asOwner: (next, arm) => {
      const previous = owner
      owner = next
      try {
        return arm()
      } finally {
        owner = previous
      }
    },
    scheduleDeadline: (declaredMs, onDeadline) => {
      const arm: DeadlineArm = {
        declaredMs,
        armedAt: monotonic() + offset,
        owner,
        cancelled: false,
        fired: false,
        fire: () => {
          if (arm.fired || arm.cancelled) return
          arm.fired = true
          onDeadline()
        },
      }
      arms.push(arm)
      closeInvocationContext.getStore()?.arms.push(arm)
      return () => {
        arm.cancelled = true
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Per-close attribution
// ---------------------------------------------------------------------------

/** One resolution of the production persistence read a close performs. */
export interface AdmissionRead {
  readonly projectId: string
  /** The monotonic sample taken when the read resolved. */
  readonly at: number
  readonly resolvedAbsent: boolean
  /** The manager's projection of the subject at that same instant. */
  readonly projection: RuntimeSnapshot | undefined
  readonly entryState: string | null
}

/**
 * Everything the confirmation predicate's row-level witness can observe, all
 * of it sampled inside the harness-composed `commitRemoval` callable before it
 * delegates to the real library.
 */
export interface CloseRemovalCapture {
  readonly at: number
  readonly reobserved: Readonly<Record<Bl020ProxyAuditCount, number>>
  readonly reobservationMatchedLastAudit: boolean
  readonly connectionsClear: boolean
  readonly ownershipRecords: number
  readonly quarantinedOwnershipRecords: number
  readonly pendingAdmissions: number
  readonly retiredProjects: number
  readonly subjectPendingAdmission: boolean
  readonly projection: RuntimeSnapshot | undefined
  readonly claimHeld: boolean
  readonly claimLateWork: number | null
  readonly claimSealed: boolean
  readonly releaseAuditsConfirmed: boolean
  readonly releaseAudits: number
}

/**
 * One invocation of the production close service, with every seam it composed
 * attributed to it alone. A peer or contender close cannot inflate any count
 * here, because each count is incremented by this invocation's own callable.
 */
export interface CloseInvocation {
  readonly index: number
  readonly projectId: string
  readonly enteredAt: number
  /**
   * Where production's route log and lifecycle-event log stood when this
   * invocation entered the close service. A row reports what production
   * emitted from its own settlement onward, so activity an earlier request or
   * a deliberate replacement boot produced is never attributed to it.
   */
  readonly logIndexAtEntry: number
  readonly eventIndexAtEntry: number
  readonly arms: DeadlineArm[]
  readonly admissionReads: AdmissionRead[]
  readonly terminationAudits: RuntimeTerminationAudit[]
  /**
   * The composed seams this invocation entered, in the order production
   * called them, so an ordering claim is read back rather than assumed.
   */
  readonly callOrder: ('drain' | 'audit' | 'removal')[]
  drainInvocations: number
  connectionAuditInvocations: number
  lastConnectionAudit: Readonly<Record<Bl020ProxyAuditCount, number>> | null
  removalCapture: CloseRemovalCapture | null
  outcome: RuntimeCloseOutcome | null
  settledOrder: number | null
  /** The monotonic instant this invocation's settled result was returned. */
  settledAt: number | null
  claimInstallProjection: RuntimeSnapshot | undefined
}

/**
 * The ambient close invocation. Node propagates it across every suspension the
 * manager makes inside `close()`, so a deadline arm, a persistence read, or a
 * termination audit is attributed to the close that caused it and to no other.
 */
const closeInvocationContext = new AsyncLocalStorage<CloseInvocation>()

/** Close deadlines are the manager's own; the sweep's are the termination's. */
export const closeDeadlineArms = (
  invocation: CloseInvocation
): readonly DeadlineArm[] =>
  invocation.arms.filter((arm) => arm.owner === 'runtime')

/** Fires the most recently armed deadline whose declared value matches. */
export function fireDeadline(
  scheduler: RecordingScheduler,
  declaredMs: number
): void {
  const arm = [...scheduler.arms]
    .reverse()
    .find(
      (candidate) => candidate.declaredMs === declaredMs && !candidate.cancelled
    )
  if (arm === undefined)
    throw new Error('No armed deadline declared ' + String(declaredMs) + ' ms')
  arm.fire()
}

/**
 * Fires the one drain deadline a named close armed.
 *
 * `runClose` arms its drain, release, and overall deadlines in that order,
 * and the release deadline of a single-unit sweep declares the same value the
 * drain allowance does. Selecting by declared value alone would therefore fire
 * the wrong one, so this reads the arms attributed to that close's own
 * asynchronous context and fires the first, after checking it is the drain
 * allowance and still armed.
 */
export function fireCloseDrainDeadline(
  world: CloseWorld,
  projectId: string
): void {
  const invocation = [...world.closeInvocations]
    .reverse()
    .find((candidate) => candidate.projectId === projectId)
  if (invocation === undefined)
    throw new Error('BL-020 world opened no close for ' + projectId)
  const arm = closeDeadlineArms(invocation)[0]
  if (
    arm === undefined ||
    arm.declaredMs !== matrixConfig.closeDrainAllowanceMs
  )
    throw new Error('BL-020 close did not arm its drain deadline first')
  if (arm.cancelled || arm.fired)
    throw new Error('BL-020 close drain deadline is no longer armed')
  arm.fire()
}

// ---------------------------------------------------------------------------
// Primitive ledger
// ---------------------------------------------------------------------------

export interface PrimitiveLedger {
  readonly calls: Record<Bl020PrimitiveCall, number>
  readonly signalsByProject: Map<string, number>
  readonly terminatedProjects: Set<string>
  record(call: Bl020PrimitiveCall, projectId?: string): void
  reset(): void
}

export function primitiveLedger(): PrimitiveLedger {
  const calls = Object.fromEntries(
    BL020_PRIMITIVE_CALLS.map((call) => [call, 0])
  ) as Record<Bl020PrimitiveCall, number>
  const signalsByProject = new Map<string, number>()
  const terminatedProjects = new Set<string>()
  return {
    calls,
    signalsByProject,
    terminatedProjects,
    record(call, projectId) {
      calls[call] += 1
      if (call !== 'signal' || projectId === undefined) return
      const token = deriveProjectOwnerToken(projectId)
      signalsByProject.set(token, (signalsByProject.get(token) ?? 0) + 1)
      terminatedProjects.add(token)
    },
    reset() {
      for (const call of BL020_PRIMITIVE_CALLS) calls[call] = 0
      signalsByProject.clear()
      terminatedProjects.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// Controlled host identities backed by real loopback listeners
// ---------------------------------------------------------------------------

export type ReleaseMode = 'graceful' | 'force' | 'unconfirmed'

/**
 * Records the audit a release produced against the close that caused it, so
 * the confirmation record's `releaseAudits` clause reads the audit set of the
 * generations this close terminated and of no other close.
 */
function recordTerminationAudit(
  audit: RuntimeTerminationAudit
): RuntimeTerminationAudit {
  const frozen = Object.freeze(audit)
  closeInvocationContext.getStore()?.terminationAudits.push(frozen)
  return frozen
}

export interface HostIdentity {
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly projectId: string
  readonly ownerToken: string
  readonly userDataPath: string
  readonly argv: readonly string[]
  readonly process: OwnedRuntimeProcess
  readonly ready: ReadyRuntime
  alive: boolean
  mode: ReleaseMode
  /**
   * Every signal the identity was actually sent, in delivery order. The list
   * is written by the release path itself, so a graceful release and an
   * escalated one are told apart by what was delivered rather than by mode.
   */
  readonly signalsDelivered: readonly NodeJS.Signals[]
  /** Held by the scenario to keep a release suspended at its one await. */
  releaseHold: Deferred<void> | null
  terminateCalls: number
  /**
   * Release handles for the liveness observation `start()` performs at its one
   * declared running-reuse await. Each acquisition that reaches the
   * observation takes the next handle in order and stays suspended inside the
   * production await until that handle is resolved, so two acquisitions can be
   * held at the same seam and released independently. The handles are consumed
   * in arrival order; an empty queue leaves the observation unheld.
   */
  readonly livenessHolds: Deferred<void>[]
  /** Acquisitions that entered that observation, in entry order. */
  readonly livenessEntries: number
  /**
   * Releases every liveness handle, taken or still queued, so no production
   * acquisition stays suspended at teardown. The world calls it for every
   * identity it created before it closes the boundary.
   */
  releaseLiveness(): void
  /**
   * Ends this identity's release at its one await, before any signal is
   * delivered, by raising the interruption the scenario named. It is the
   * deterministic in-process counterpart of an API generation that stops
   * existing inside the release phase — the identity survives unsignalled and
   * the close never reaches its confirmation region — and it is consumed by
   * the one release it interrupts, exactly as `interruptRemoval` is.
   */
  releaseInterruption: Error | null
  settleExit(exit: RuntimeExit): void
  /** Real teardown: destroys sockets and frees the loopback port. */
  stopListener(): Promise<void>
  /** Marks the host identity dead and frees every resource it created. */
  terminateHost(): Promise<void>
  /** Holds every upstream response open until released. */
  holdUpstream(hold: boolean): void
  releaseHeldResponses(): void
  listenerAbsent(): Promise<boolean>
  /**
   * Reports the identity as a launcher's own cleanup would, with the named
   * outcome and every absence claim read from the identity's real state.
   */
  observeTermination(
    outcome: RuntimeTerminationOutcome
  ): Promise<RuntimeTerminationAudit>
  /**
   * The process leaves on its own and its launcher observes the exit: the
   * listener is freed, liveness ends, and the awaited exit resolves.
   */
  exitEarly(code?: number): Promise<void>
  /**
   * The process leaves without its launcher ever observing an exit, which is
   * the absence a later release has to audit rather than be told about.
   */
  vanish(): Promise<void>
}

interface UpstreamServer {
  readonly server: Server
  readonly port: number
  readonly sockets: Set<Socket>
  readonly held: Set<ServerResponse>
  hold: boolean
  stop(): Promise<void>
}

async function startUpstream(): Promise<UpstreamServer> {
  const sockets = new Set<Socket>()
  const held = new Set<ServerResponse>()
  const state = { hold: false }
  const server = createServer((request, response) => {
    if (request.url?.startsWith(PROJECT_RUNTIME_DEFAULTS.healthPath) === true) {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status: 'alive' }))
      return
    }
    response.writeHead(200, { 'content-type': 'text/plain' })
    if (!state.hold) {
      response.end('workbench')
      return
    }
    // A streaming response the close must sever rather than wait out.
    response.write('partial')
    held.add(response)
    response.on('close', () => held.delete(response))
  })
  const webSockets = new WebSocketServer({ server })
  webSockets.on('connection', (socket) => {
    socket.on('message', (data) => socket.send(data))
  })
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = (server.address() as AddressInfo).port
  return {
    server,
    port,
    sockets,
    held,
    get hold() {
      return state.hold
    },
    set hold(value: boolean) {
      state.hold = value
    },
    async stop() {
      for (const response of held) response.destroy()
      held.clear()
      webSockets.clients.forEach((client) => client.terminate())
      webSockets.close()
      server.closeAllConnections()
      for (const socket of sockets) socket.destroy()
      sockets.clear()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

let identitySequence = 900_000

/**
 * Creates one controlled runtime identity. The identity is fixture-owned but
 * every absence claim it makes is an observation: process liveness comes from
 * its own state, the listener claim comes from a real loopback probe, and the
 * descendant claim comes from the (empty) descendant registry it actually owns.
 */
export async function createHostIdentity(input: {
  readonly projectId: string
  readonly canonicalPath: string
  readonly ledger: PrimitiveLedger
}): Promise<HostIdentity> {
  const upstream = await startUpstream()
  const pid = (identitySequence += 1)
  const ownerToken = deriveProjectOwnerToken(input.projectId)
  const userDataPath = buildRuntimeUserDataPath(ownerToken, upstream.port)
  const exit = deferred<RuntimeExit>()
  const state = {
    alive: true,
    mode: 'graceful' as ReleaseMode,
    releaseHold: null as Deferred<void> | null,
    releaseInterruption: null as Error | null,
    terminateCalls: 0,
  }
  const livenessHolds: Deferred<void>[] = []
  const takenLivenessHolds: Deferred<void>[] = []
  let livenessEntries = 0
  const signalsDelivered: NodeJS.Signals[] = []
  const processStartTime = 'bl020-start-' + String(pid)
  const listenerAbsent = (): Promise<boolean> =>
    loopbackListenerIsAbsent(upstream.port)

  const observe = async (): Promise<{
    processAbsent: boolean
    processGroupAbsent: boolean
    listenerAbsent: boolean
  }> => ({
    processAbsent: !state.alive,
    // No descendant was ever created for this identity, and the registry that
    // would hold one is read here rather than assumed.
    processGroupAbsent: true,
    listenerAbsent: await listenerAbsent(),
  })

  const deliverSignal = (signal: NodeJS.Signals): void => {
    signalsDelivered.push(signal)
    input.ledger.record('signal', input.projectId)
  }

  const ownedProcess: OwnedRuntimeProcess = {
    pid,
    processStartTime,
    exit: exit.promise,
    async terminate(_gracefulMs, _forceMs, port, signal) {
      state.terminateCalls += 1
      input.ledger.record('terminate', input.projectId)
      if (state.releaseHold !== null) await state.releaseHold.promise
      if (state.releaseInterruption !== null) {
        const interruption = state.releaseInterruption
        state.releaseInterruption = null
        throw interruption
      }
      if (signal?.aborted === true) throw new RuntimeFailure('caller-cancelled')
      // The delivered sequencer audits before it signals, so an identity that
      // already left is reported without any signal being delivered at all.
      const beforeSignalling = await observe()
      if (
        beforeSignalling.processAbsent &&
        beforeSignalling.processGroupAbsent &&
        beforeSignalling.listenerAbsent
      )
        return recordTerminationAudit({
          pid,
          processStartTime,
          port,
          outcome: 'already-absent' as const,
          ...beforeSignalling,
        })
      deliverSignal('SIGTERM')
      if (state.mode === 'unconfirmed') {
        // The identity survives escalation: sockets stay bound, liveness holds.
        deliverSignal('SIGKILL')
        return recordTerminationAudit({
          pid,
          processStartTime,
          port,
          outcome: 'unconfirmed' as const,
          ...(await observe()),
        })
      }
      const escalated = state.mode === 'force'
      if (escalated) deliverSignal('SIGKILL')
      await upstream.stop()
      state.alive = false
      exit.resolve({
        code: escalated ? null : 0,
        signal: escalated ? 'SIGKILL' : null,
        addressInUse: false,
      })
      return recordTerminationAudit({
        pid,
        processStartTime,
        port,
        outcome: escalated ? ('escalated' as const) : ('graceful' as const),
        ...(await observe()),
      })
    },
    async audit(port) {
      input.ledger.record('audit', input.projectId)
      return Object.freeze({
        pid,
        processStartTime,
        port,
        ...(await observe()),
      })
    },
    async isAlive() {
      input.ledger.record('isAlive', input.projectId)
      livenessEntries += 1
      // The production await is suspended here, inside the host observation
      // `start()` performs on its running-reuse path, and nowhere else.
      const hold = livenessHolds.shift()
      if (hold !== undefined) {
        takenLivenessHolds.push(hold)
        await hold.promise
      }
      return state.alive
    },
  }

  return {
    pid,
    processStartTime,
    port: upstream.port,
    projectId: input.projectId,
    ownerToken,
    userDataPath,
    argv: Object.freeze(
      buildRuntimeArgv(input.canonicalPath, upstream.port, userDataPath)
    ),
    process: ownedProcess,
    ready: Object.freeze({
      process: ownedProcess,
      port: upstream.port,
      internalUrl: 'http://127.0.0.1:' + String(upstream.port),
      readinessAttempts: Object.freeze([] as readonly HealthAttempt[]),
    }),
    get alive() {
      return state.alive
    },
    set alive(value: boolean) {
      state.alive = value
    },
    get mode() {
      return state.mode
    },
    set mode(value: ReleaseMode) {
      state.mode = value
    },
    get releaseHold() {
      return state.releaseHold
    },
    set releaseHold(value: Deferred<void> | null) {
      state.releaseHold = value
    },
    get terminateCalls() {
      return state.terminateCalls
    },
    set terminateCalls(value: number) {
      state.terminateCalls = value
    },
    livenessHolds,
    get livenessEntries() {
      return livenessEntries
    },
    releaseLiveness: () => {
      for (const hold of [...takenLivenessHolds, ...livenessHolds])
        hold.resolve()
      takenLivenessHolds.length = 0
      livenessHolds.length = 0
    },
    get releaseInterruption() {
      return state.releaseInterruption
    },
    set releaseInterruption(value: Error | null) {
      state.releaseInterruption = value
    },
    get signalsDelivered() {
      return [...signalsDelivered]
    },
    settleExit: (value) => exit.resolve(value),
    stopListener: () => upstream.stop(),
    observeTermination: async (outcome) =>
      Object.freeze({
        pid,
        processStartTime,
        port: upstream.port,
        outcome,
        ...(await observe()),
      }),
    exitEarly: async (code = 1) => {
      await upstream.stop()
      state.alive = false
      exit.resolve({ code, signal: null, addressInUse: false })
    },
    vanish: async () => {
      await upstream.stop()
      state.alive = false
    },
    terminateHost: async () => {
      await upstream.stop()
      state.alive = false
      exit.resolve({ code: 0, signal: null, addressInUse: false })
    },
    holdUpstream: (hold) => {
      upstream.hold = hold
    },
    releaseHeldResponses: () => {
      for (const response of upstream.held) response.end('tail')
      upstream.held.clear()
    },
    listenerAbsent,
  }
}

// ---------------------------------------------------------------------------
// Reconciliation plan and attribution over the fixture's own identities
// ---------------------------------------------------------------------------

export interface ReconcilePlan {
  projects: readonly Project[]
  scanComplete: boolean
  candidates: HostIdentity[]
  gate: Deferred<void> | null
  /**
   * Suspends the identity read the candidate observation performs for one
   * process, so a scenario can keep exactly one project's reconciliation in
   * flight while every other project's settles. The scan itself is untouched.
   */
  candidateHold: { readonly pid: number; readonly gate: Deferred<void> } | null
}

const INSTALLATION_ROOT = path.dirname(matrixConfig.executablePath)
const INTERPRETER_PATH = path.join(INSTALLATION_ROOT, 'node')
const LAUNCHER_PATH = path.join(INSTALLATION_ROOT, 'entry.js')

export const installedRuntimeIdentity: InstalledRuntimeIdentity = Object.freeze(
  {
    launcherRealPath: matrixConfig.executablePath,
    installationRoot: INSTALLATION_ROOT,
    interpreterPath: INTERPRETER_PATH,
    launcherArgvPrefix: Object.freeze([
      INTERPRETER_PATH,
      LAUNCHER_PATH,
    ]) as unknown as readonly [string, string],
  }
)

const candidateArgv = (identity: HostIdentity): readonly string[] =>
  Object.freeze([INTERPRETER_PATH, LAUNCHER_PATH, ...identity.argv])

function attributionFor(plan: ReconcilePlan): RuntimeAttributionPrimitives {
  const find = (pid: number): HostIdentity | undefined =>
    plan.candidates.find((identity) => identity.pid === pid)
  return {
    async resolveInstalledRuntimeIdentity() {
      return installedRuntimeIdentity
    },
    async listRuntimeCandidatePids() {
      if (plan.gate !== null) await plan.gate.promise
      return {
        pids: plan.candidates
          .filter((identity) => identity.alive)
          .map((identity) => identity.pid),
        complete: plan.scanComplete,
      }
    },
    async readProcessIdentity(pid) {
      const identity = find(pid)
      if (identity === undefined || !identity.alive) return null
      if (plan.candidateHold?.pid === pid) await plan.candidateHold.gate.promise
      return {
        pid,
        processGroupId: pid,
        uid: process.getuid?.() ?? 0,
        startTime: identity.processStartTime,
      }
    },
    async readProcessCommandLine(pid) {
      const identity = find(pid)
      return identity === undefined || !identity.alive
        ? null
        : candidateArgv(identity)
    },
    async readProcessGroupMemberPids(processGroupId) {
      const identity = find(processGroupId)
      return identity === undefined || !identity.alive
        ? { pids: [], complete: true }
        : { pids: [processGroupId], complete: true }
    },
    async readLoopbackListenerInode(port) {
      const identity = plan.candidates.find(
        (candidate) => candidate.port === port
      )
      if (identity === undefined || !identity.alive) return null
      return (await identity.listenerAbsent()) ? null : 'inode-' + String(port)
    },
    async readProcessSocketInodes(pid) {
      const identity = find(pid)
      if (identity === undefined || !identity.alive) return []
      return ['inode-' + String(identity.port)]
    },
  }
}

function terminationFor(
  plan: ReconcilePlan,
  scheduler: RecordingScheduler,
  ledger: PrimitiveLedger
): RuntimeTerminationPrimitives {
  const find = (pid: number): HostIdentity | undefined =>
    plan.candidates.find((identity) => identity.pid === pid)
  return {
    now: () => scheduler.now(),
    scheduleDeadline: (milliseconds, onDeadline) =>
      scheduler.asOwner('termination', () =>
        scheduler.scheduleDeadline(milliseconds, onDeadline)
      ),
    async readProcessStartTime(pid) {
      const identity = find(pid)
      return identity === undefined || !identity.alive
        ? null
        : identity.processStartTime
    },
    async readProcessGroupMembers(processGroupId) {
      const identity = find(processGroupId)
      return identity === undefined || !identity.alive ? [] : [processGroupId]
    },
    async listenerIsAbsent(port) {
      return loopbackListenerIsAbsent(port)
    },
    delay: (milliseconds, signal) =>
      new Promise<void>((resolve, reject) => {
        const handle = setTimeout(resolve, Math.min(milliseconds, 5))
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(handle)
            reject(signal.reason ?? new RuntimeFailure('caller-cancelled'))
          },
          { once: true }
        )
      }),
    signalProcessGroup(processGroupId) {
      const identity = find(processGroupId)
      if (identity === undefined || !identity.alive) return false
      ledger.record('signal', identity.projectId)
      identity.alive = false
      void identity.stopListener()
      return true
    },
  }
}

// ---------------------------------------------------------------------------
// The unrelated control: a process that is not a workbench and a listener that
// is not a runtime listener, both created by the harness and observed from the
// host through the delivered attribution primitives.
// ---------------------------------------------------------------------------

export interface UnrelatedControl {
  readonly pid: number
  readonly startTime: string
  readonly listenerPort: number
  readonly argv: readonly string[]
  observe(): Promise<CloseControlObservation>
  stop(): Promise<void>
}

export async function allocateUnrelatedControl(): Promise<UnrelatedControl> {
  const child: ChildProcess = spawnChild(
    'node',
    ['-e', 'setInterval(() => undefined, 3600000)'],
    { stdio: 'ignore' }
  )
  const pid = child.pid
  if (pid === undefined) throw new Error('BL-020 control process has no pid')
  const listener = createServer((_request, response) => response.end('control'))
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', resolve)
  })
  const listenerPort = (listener.address() as AddressInfo).port
  const primitives = defaultRuntimeAttributionPrimitives
  const controller = new AbortController()
  const argv =
    (await primitives.readProcessCommandLine(pid, controller.signal)) ?? []
  const startTime =
    (await readProcessStartTime(pid, controller.signal)) ?? 'unread'
  if (argv.length === 0) throw new Error('BL-020 control argv was not observed')
  return {
    pid,
    startTime,
    listenerPort,
    argv,
    async observe() {
      const observedStart = await readProcessStartTime(pid)
      const observedArgv = await primitives.readProcessCommandLine(pid)
      const available = !(await loopbackListenerIsAbsent(listenerPort))
      // Non-candidacy is derived from the observed argument vector rather than
      // from an exemption: the control never carries the launcher prefix or the
      // runtime bind flag the attribution conjunction requires.
      const isCandidate =
        observedArgv !== null &&
        observedArgv[0] === INTERPRETER_PATH &&
        observedArgv.includes('--bind-addr')
      return Object.freeze({
        processIdentity: opaque(
          'control',
          String(pid) + ':' + (observedStart ?? 'absent')
        ),
        listenerAvailable: available,
        nonCandidacyProof: isCandidate
          ? 'argv-matched-installed-runtime'
          : 'argv-outside-installed-runtime',
      })
    },
    async stop() {
      child.kill('SIGTERM')
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) {
          resolve()
          return
        }
        child.once('exit', () => resolve())
      })
      await new Promise<void>((resolve) => listener.close(() => resolve()))
    },
  }
}

// ---------------------------------------------------------------------------
// The two-project plus unrelated-control world
// ---------------------------------------------------------------------------

export interface LaunchControl {
  readonly projectId: string
  readonly canonicalPath: string
  readonly signal: AbortSignal
  readonly onOwned: (record: ReadyRuntime) => void
  /**
   * Reports the launcher's own cleanup audit to the caller, exactly as the
   * delivered launcher does when an attempt cleans up after itself.
   */
  readonly onCleanup: (audit: RuntimeTerminationAudit) => void
  createIdentity(): Promise<HostIdentity>
  probeReadiness(identity: HostIdentity): Promise<void>
}

export type LaunchPlan = (control: LaunchControl) => Promise<ReadyRuntime>

/**
 * Where a scenario ends the API relative to the durable removal production
 * reaches after its confirmation region. `before-removal` leaves the store
 * untouched; `after-removal` lets the delivered removal land first. Both then
 * raise, because a process that ends at that instant returns nothing to the
 * close that called it — the close in the dying process is the one settlement
 * an in-process interruption cannot reproduce, and the durable state it leaves
 * behind is what the replacement boot observes.
 */
export type CloseRemovalInterruption = 'before-removal' | 'after-removal'

export interface CloseWorld {
  readonly scenario: Bl020ScenarioId
  readonly library: ProjectLibrary
  readonly selected: Project
  readonly peer: Project
  readonly extra: Project
  readonly ledger: PrimitiveLedger
  readonly reconcilePlan: ReconcilePlan
  readonly identities: HostIdentity[]
  readonly events: RuntimeSafeLifecycleEvent[]
  readonly routeLog: string[]
  readonly control: UnrelatedControl
  readonly scheduler: RecordingScheduler
  /** Real invocation counts of the two connection seams the service composes. */
  readonly proxyCalls: { drain: number; audit: number }
  /**
   * The proxy's own target-resolution steps, counted at the two dependencies
   * `resolveTarget` composes. `findById` is its first statement, so the read
   * count is the number of times the proxy entered target resolution.
   */
  readonly proxyResolves: {
    readonly reads: number
    readonly starts: number
    /** The same two counts, attributed to the project each call named. */
    readonly readsByProject: ReadonlyMap<string, number>
    readonly startsByProject: ReadonlyMap<string, number>
  }
  /** Requests the API boundary made to close the library it was handed. */
  readonly libraryCloseRequests: { readonly count: number }
  /**
   * Every resolution of the production persistence read the close performs
   * immediately before its claim-installing synchronous section.
   */
  readonly admissionReads: AdmissionRead[]
  /** One record per production close-service invocation, in entry order. */
  readonly closeInvocations: CloseInvocation[]
  /** The exact settled results production returned from `close()`. */
  readonly closeOutcomes: RuntimeCloseOutcome[]
  projectsInScope: Project[]
  readonly manager: ProjectRuntimeManager
  readonly proxy: WorkbenchProxyManager
  readonly apiPort: number
  /** The subject claim as `audit()` exposes it while it is still held. */
  sampleCloseClaim(projectId: string): ProjectRuntimeCloseClaimInspection | null
  fixtureRootOf(project: Project): string
  setLaunch(plan: LaunchPlan): void
  /**
   * Suspends the proxy inside `resolveTarget`, after it registered its pending
   * operation and before it resolves the project, until the hold is released.
   * A project identifier restricts the hold to arrivals for that project, so
   * an unrelated project's traffic still resolves while the hold is installed.
   */
  holdProxyResolve(hold: Deferred<void> | null, projectId?: string): void
  /** Suspends every drain the close service invokes until it is released. */
  holdDrain(hold: Deferred<void> | null): void
  /** Observes each drain at the instant production entered it. */
  onDrainStarted(listener: ((projectId: string) => void) | null): void
  /**
   * Arms a one-shot interruption of the next durable removal at the named
   * instant. The removal callable production composed is the only place the
   * interruption can be delivered, so it is delivered there and nowhere else.
   */
  interruptRemoval(when: CloseRemovalInterruption | null): void
  /** The interruptions a removal instant actually reached, in delivery order. */
  readonly removalInterruptions: readonly CloseRemovalInterruption[]
  /**
   * Registers a transport the scenario opened through this world, so the
   * world can close the connections it created before it stops the boundary.
   * The teardown of a world must not depend on a scenario remembering to let
   * go of a socket the row was still observing.
   */
  trackTransport(dispose: () => void): void
  /**
   * Releases every hold the scenario installed and closes every transport it
   * opened through this world, in reverse order.
   */
  releaseTransports(): void
  stopApi(): Promise<void>
  reboot(): Promise<void>
  cleanup(): Promise<void>
}

const projectFor = (scenario: string, suffix: string): Project => ({
  id: 'bl020-' + scenario.toLowerCase() + suffix,
  name: 'BL-020 ' + scenario + suffix,
  canonicalPath: path.join(
    BL020_FIXTURE_ROOT,
    scenario.toLowerCase(),
    suffix === '' ? 'selected' : suffix.slice(1)
  ),
  createdAt: 1_760_000_000_000,
})

/** A non-empty fixture tree with a nested directory, a link, and a rare mode. */
async function materializeFixture(root: string, label: string): Promise<void> {
  await mkdir(path.join(root, 'nested', 'deeper'), { recursive: true })
  await writeFile(path.join(root, 'README.md'), '# ' + label + '\n')
  await writeFile(
    path.join(root, 'nested', 'deeper', 'notes.txt'),
    'bl-020 ' + label + '\n'
  )
  await chmod(path.join(root, 'nested', 'deeper', 'notes.txt'), 0o640)
  await symlink('nested/deeper/notes.txt', path.join(root, 'notes-link')).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error
    }
  )
}

export async function allocateCloseLibrary(): Promise<{
  readonly library: ProjectLibrary
  readonly databasePath: string
  cleanup(): Promise<void>
}> {
  const context = await allocateDatabaseTestContext('bl020-matrix')
  const library = await createProjectLibrary(context.databasePath)
  return {
    library,
    databasePath: context.databasePath,
    async cleanup() {
      library.close()
      await context.cleanup()
      await rm(path.dirname(context.databasePath), {
        recursive: true,
        force: true,
      })
    },
  }
}

export async function allocateCloseWorld(input: {
  readonly scenario: Bl020ScenarioId
  readonly library: ProjectLibrary
  readonly control: UnrelatedControl
}): Promise<CloseWorld> {
  const selected = projectFor(input.scenario, '')
  const peer = projectFor(input.scenario, '-peer')
  const extra = projectFor(input.scenario, '-extra')
  for (const project of [selected, peer, extra]) {
    await mkdir(project.canonicalPath, { recursive: true })
    await materializeFixture(project.canonicalPath, project.id)
    const created = await input.library.create(project)
    expect(created.disposition).toBe('created')
  }

  const ledger = primitiveLedger()
  const events: RuntimeSafeLifecycleEvent[] = []
  const routeLog: string[] = []
  const identities: HostIdentity[] = []
  const scheduler = recordingScheduler()
  const reconcilePlan: ReconcilePlan = {
    projects: [],
    scanComplete: true,
    candidates: [],
    gate: null,
    candidateHold: null,
  }

  let launchPlan: LaunchPlan = async (control) => {
    const identity = await control.createIdentity()
    await control.probeReadiness(identity)
    control.onOwned(identity.ready)
    return identity.ready
  }

  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: async () => undefined,
      launch: async () => {
        throw new RuntimeFailure('spawn-error')
      },
    },
    ports: {
      acquire: async () => {
        throw new RuntimeFailure('address-in-use-exhausted')
      },
    },
    health: {
      check: async (url, timeoutMs, signal) => {
        ledger.record('probeHealth')
        return fetchRuntimeHealthAdapter.check(url, timeoutMs, signal)
      },
    },
    now: () => scheduler.now(),
    // Waits are shortened so a bounded refusal is observed rather than waited
    // for, with one exception: the stop's own overall bound is honoured, or a
    // scenario could never observe a `stopping` entry while it is stopping.
    sleep: (milliseconds, signal) =>
      new Promise<void>((resolve, reject) => {
        const handle = setTimeout(
          resolve,
          milliseconds === runtimeStopOverallBoundMs(matrixConfig)
            ? milliseconds
            : Math.min(milliseconds, 5)
        )
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(handle)
            reject(signal.reason ?? new RuntimeFailure('caller-cancelled'))
          },
          { once: true }
        )
      }),
    attribution: attributionFor(reconcilePlan),
    termination: terminationFor(reconcilePlan, scheduler, ledger),
  }

  const createManager = (
    publish: (event: RuntimeSafeLifecycleEvent) => void
  ): ProjectRuntimeManager =>
    createProjectRuntimeManager({
      findProjectById: async (id) => {
        const project = await input.library.findById(id)
        // The claim-install instant: production runs from this resolution to
        // `closeClaims.set` with no suspension, so the sample is taken here
        // rather than reconstructed after the close settled.
        const read: AdmissionRead = Object.freeze({
          projectId: id,
          at: scheduler.now(),
          resolvedAbsent: project === undefined,
          projection: manager?.inspect(id),
          entryState:
            manager?.inspectEntries().find((entry) => entry.projectId === id)
              ?.state ?? null,
        })
        admissionReads.push(read)
        closeInvocationContext.getStore()?.admissionReads.push(read)
        return project
      },
      listProjects: async () => reconcilePlan.projects,
      config: matrixConfig,
      processDependencies,
      deadlineScheduler: scheduler,
      now: () => scheduler.now(),
      launch: async (request) => {
        const projectId =
          [selected, peer, extra].find(
            (project) => project.canonicalPath === request.canonicalPath
          )?.id ?? selected.id
        const control: LaunchControl = {
          projectId,
          canonicalPath: request.canonicalPath,
          signal: request.signal,
          onOwned: (record) => request.onOwned?.(record),
          onCleanup: (audit) => request.onCleanup?.(audit),
          createIdentity: async () => {
            const identity = await createHostIdentity({
              projectId,
              canonicalPath: request.canonicalPath,
              ledger,
            })
            identities.push(identity)
            return identity
          },
          probeReadiness: async (identity) => {
            const attempt = await processDependencies.health.check(
              identity.ready.internalUrl + PROJECT_RUNTIME_DEFAULTS.healthPath,
              matrixConfig.healthAttemptTimeoutMs,
              request.signal
            )
            expect(attempt.status).toBe(PROJECT_RUNTIME_DEFAULTS.healthStatus)
          },
        }
        return launchPlan(control)
      },
      recordEvent: (event) => {
        events.push(event)
        publish(event)
      },
    })

  const proxyCalls = { drain: 0, audit: 0 }
  const proxyResolves = {
    reads: 0,
    starts: 0,
    readsByProject: new Map<string, number>(),
    startsByProject: new Map<string, number>(),
  }
  const countResolve = (
    counts: Map<string, number>,
    projectId: string
  ): void => {
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1)
  }
  const libraryCloseRequests = { count: 0 }
  let proxyResolveHold: Deferred<void> | null = null
  let proxyResolveHoldProject: string | null = null
  let drainHold: Deferred<void> | null = null
  let drainStarted: ((projectId: string) => void) | null = null
  let removalInterruption: CloseRemovalInterruption | null = null
  const removalInterruptions: CloseRemovalInterruption[] = []
  const admissionReads: AdmissionRead[] = []
  const closeInvocations: CloseInvocation[] = []
  const closeOutcomes: RuntimeCloseOutcome[] = []
  let controller: ApiServerController | undefined
  let manager: ProjectRuntimeManager | undefined
  let proxy: WorkbenchProxyManager | undefined
  let realProxy: WorkbenchProxyManager | undefined
  let apiPort = 0
  let settlementOrder = 0

  const auditCountsOf = (
    token: string
  ): Readonly<Record<Bl020ProxyAuditCount, number>> => {
    if (realProxy === undefined) throw new Error('BL-020 world has no proxy')
    const audit = realProxy.audit(token)
    return Object.freeze({
      pendingOperations: audit.pendingOperations,
      httpRequests: audit.upstreamHttpRequests,
      httpResponses: audit.upstreamHttpResponses,
      rawSockets: audit.rawSockets,
      webSockets: audit.webSockets,
    })
  }

  /**
   * Runs as the first statements of the harness-composed `commitRemoval`,
   * which `G-25` makes the next statement after the confirmation region. Every
   * member is sampled here, at the instant the record describes.
   */
  const captureRemovalInstant = (
    invocation: CloseInvocation
  ): CloseRemovalCapture => {
    if (manager === undefined) throw new Error('BL-020 world has no manager')
    const projectId = invocation.projectId
    const reobserved = auditCountsOf(deriveProjectOwnerToken(projectId))
    const last = invocation.lastConnectionAudit
    const audit = manager.audit()
    const claim = (audit.closeClaims ?? []).find(
      (entry) => entry.projectId === projectId
    )
    const entry = manager
      .inspectEntries()
      .find((candidate) => candidate.projectId === projectId)
    return Object.freeze({
      at: scheduler.now(),
      reobserved,
      reobservationMatchedLastAudit:
        last !== null &&
        BL020_PROXY_AUDIT_COUNTS.every(
          (count) => last[count] === reobserved[count]
        ),
      connectionsClear: BL020_PROXY_AUDIT_COUNTS.every(
        (count) => reobserved[count] === 0
      ),
      ownershipRecords: audit.ownershipRecords,
      quarantinedOwnershipRecords: audit.quarantinedOwnershipRecords ?? 0,
      pendingAdmissions: audit.pendingAdmissions ?? 0,
      retiredProjects: audit.retiredProjects ?? 0,
      // A failed entry keeps the admission identifier that attributed its
      // failure long after that admission finished; the phase is published
      // only while an admission is still pending for the project, so it is
      // the member that answers whether one is.
      subjectPendingAdmission: entry?.pendingAdmissionPhase !== undefined,
      projection: manager.inspect(projectId),
      claimHeld: claim !== undefined,
      claimLateWork: claim?.lateWork ?? null,
      claimSealed: claim?.sealed ?? false,
      releaseAuditsConfirmed: invocation.terminationAudits.every(
        (entryAudit) =>
          entryAudit.processAbsent &&
          entryAudit.processGroupAbsent &&
          entryAudit.listenerAbsent
      ),
      releaseAudits: invocation.terminationAudits.length,
    })
  }

  const boot = async (): Promise<void> => {
    controller = createApiServerController({
      port: 0,
      fastify: {
        logger: { stream: { write: (line: string) => routeLog.push(line) } },
      },
      // The one library the world owns, behind a facade whose `close` is the
      // API's request rather than the library's disposal, so a world that
      // restarts its API keeps the persistence its scenario is about.
      createProjectLibrary: async () => ({
        ...input.library,
        close: () => {
          libraryCloseRequests.count += 1
        },
      }),
      // The production composer, invoked once per close so each invocation
      // owns the two connection seams and the removal callable the production
      // service composes. Every dependency it composes stays the production
      // one; the facades only record what production called and returned.
      createProjectCloseService: (dependencies) => ({
        async closeProject(id) {
          const invocation: CloseInvocation = {
            index: closeInvocations.length,
            projectId: id,
            enteredAt: scheduler.now(),
            logIndexAtEntry: routeLog.length,
            eventIndexAtEntry: events.length,
            arms: [],
            admissionReads: [],
            terminationAudits: [],
            callOrder: [],
            drainInvocations: 0,
            connectionAuditInvocations: 0,
            lastConnectionAudit: null,
            removalCapture: null,
            outcome: null,
            settledOrder: null,
            settledAt: null,
            claimInstallProjection: undefined,
          }
          closeInvocations.push(invocation)
          return closeInvocationContext.run(invocation, async () => {
            const service = createProjectCloseService({
              runtime: dependencies.runtime,
              library: {
                closeProject: async (projectId) => {
                  invocation.callOrder.push('removal')
                  invocation.removalCapture = captureRemovalInstant(invocation)
                  const interruption = removalInterruption
                  if (interruption === null)
                    return dependencies.library.closeProject(projectId)
                  removalInterruption = null
                  if (interruption === 'after-removal')
                    await dependencies.library.closeProject(projectId)
                  removalInterruptions.push(interruption)
                  throw new Error('BL-020 API ended ' + interruption)
                },
              },
              proxy: {
                closeProject: (projectId, signal) => {
                  invocation.drainInvocations += 1
                  invocation.callOrder.push('drain')
                  return dependencies.proxy.closeProject(projectId, signal)
                },
                audit: (projectToken) => {
                  invocation.connectionAuditInvocations += 1
                  invocation.callOrder.push('audit')
                  const audit = dependencies.proxy.audit(projectToken)
                  invocation.lastConnectionAudit = Object.freeze({
                    pendingOperations: audit.pendingOperations,
                    httpRequests: audit.upstreamHttpRequests,
                    httpResponses: audit.upstreamHttpResponses,
                    rawSockets: audit.rawSockets,
                    webSockets: audit.webSockets,
                  })
                  return audit
                },
              },
            })
            const outcome = await service.closeProject(id)
            invocation.outcome = outcome
            invocation.settledOrder = settlementOrder
            invocation.settledAt = scheduler.now()
            settlementOrder += 1
            invocation.claimInstallProjection = invocation.admissionReads.find(
              (read) => read.projectId === id
            )?.projection
            closeOutcomes.push(outcome)
            return outcome
          })
        },
      }),
      createProjectRegistration: async () => ({
        register: async () => ({
          category: 'path_not_found' as const,
          field: 'path' as const,
        }),
        close: () => undefined,
      }),
      createProjectRuntimeManager: (_library, recordEvent) => {
        manager = createManager(recordEvent)
        return manager
      },
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) => {
        // The proxy's own dependencies, counted at the two steps
        // `resolveTarget` composes and suspendable at its first one, which is
        // reached only after the pending operation is already registered.
        const real = createWorkbenchProxyManager({
          projectLibrary: {
            ...projectLibrary,
            findById: async (id) => {
              proxyResolves.reads += 1
              countResolve(proxyResolves.readsByProject, id)
              if (
                proxyResolveHold !== null &&
                (proxyResolveHoldProject === null ||
                  proxyResolveHoldProject === id)
              )
                await proxyResolveHold.promise
              return projectLibrary.findById(id)
            },
          },
          projectRuntime: {
            ...projectRuntime,
            start: (request) => {
              proxyResolves.starts += 1
              countResolve(proxyResolves.startsByProject, request.projectId)
              return projectRuntime.start(request)
            },
            ownsSnapshot: (snapshot) => projectRuntime.ownsSnapshot(snapshot),
          },
        })
        realProxy = real
        // A counting boundary over the two seams the close service composes,
        // so drain and connection-audit invocations are counted rather than
        // asserted. Every call is forwarded to the production implementation.
        proxy = {
          handleHttp: (request, response, route) =>
            real.handleHttp(request, response, route),
          handleUpgrade: (request, socket, head, route) =>
            real.handleUpgrade(request, socket, head, route),
          closeProject: (projectId, signal) => {
            proxyCalls.drain += 1
            drainStarted?.(projectId)
            if (drainHold === null) return real.closeProject(projectId, signal)
            return drainHold.promise.then(() =>
              real.closeProject(projectId, signal)
            )
          },
          shutdown: () => real.shutdown(),
          audit: (projectToken) => {
            proxyCalls.audit += 1
            return real.audit(projectToken)
          },
        }
        return proxy
      },
    })
    const server = await controller.start()
    apiPort = (server.server.address() as AddressInfo).port
  }

  const stopApi = async (): Promise<void> => {
    const current = controller
    controller = undefined
    if (current !== undefined) await current.stop()
  }

  const transports: (() => void)[] = []
  const releaseTransports = (): void => {
    // Any hold the scenario installed is released first: a production path
    // still suspended inside one would keep the boundary from closing.
    proxyResolveHold?.resolve()
    proxyResolveHold = null
    proxyResolveHoldProject = null
    drainHold?.resolve()
    drainHold = null
    // An acquisition suspended inside the running-reuse observation holds a
    // real request open, so every liveness handle is released here too.
    for (const identity of identities) identity.releaseLiveness()
    while (transports.length > 0) transports.pop()?.()
  }

  await boot()
  if (manager === undefined || proxy === undefined)
    throw new Error('BL-020 world did not construct a manager and proxy')

  return {
    scenario: input.scenario,
    library: input.library,
    selected,
    peer,
    extra,
    ledger,
    reconcilePlan,
    identities,
    events,
    routeLog,
    control: input.control,
    scheduler,
    proxyCalls,
    proxyResolves,
    libraryCloseRequests,
    admissionReads,
    closeInvocations,
    closeOutcomes,
    projectsInScope: [selected, peer],
    get manager() {
      if (manager === undefined) throw new Error('BL-020 world has no manager')
      return manager
    },
    get proxy() {
      if (proxy === undefined) throw new Error('BL-020 world has no proxy')
      return proxy
    },
    get apiPort() {
      return apiPort
    },
    sampleCloseClaim: (projectId) => {
      if (manager === undefined) throw new Error('BL-020 world has no manager')
      return (
        (manager.audit().closeClaims ?? []).find(
          (claim) => claim.projectId === projectId
        ) ?? null
      )
    },
    fixtureRootOf: (project) => project.canonicalPath,
    setLaunch: (plan) => {
      launchPlan = plan
    },
    holdProxyResolve: (hold, projectId) => {
      proxyResolveHold = hold
      proxyResolveHoldProject = projectId ?? null
    },
    holdDrain: (hold) => {
      drainHold = hold
    },
    onDrainStarted: (listener) => {
      drainStarted = listener
    },
    interruptRemoval: (when) => {
      removalInterruption = when
    },
    removalInterruptions,
    trackTransport: (dispose) => {
      transports.push(dispose)
    },
    releaseTransports,
    stopApi,
    reboot: async () => {
      await stopApi()
      await boot()
    },
    cleanup: async () => {
      releaseTransports()
      for (const identity of identities) await identity.terminateHost()
      await stopApi()
    },
  }
}

// ---------------------------------------------------------------------------
// Real transport helpers
// ---------------------------------------------------------------------------

export interface HttpResult {
  readonly status: number
  readonly body: unknown
  readonly text: string
}

export function performRequest(
  port: number,
  requestPath: string,
  options: {
    readonly method?: string
    readonly headers?: Record<string, string>
  } = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path: requestPath,
        method: options.method ?? 'GET',
        headers: options.headers,
        // Each arrival gets its own connection: a pooled agent would serialise
        // concurrent arrivals and silently turn contention into a queue.
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let body: unknown
          try {
            body = JSON.parse(text)
          } catch {
            body = undefined
          }
          resolve({ status: response.statusCode ?? 0, body, text })
        })
      }
    )
    request.once('error', reject)
    request.end()
  })
}

export const deleteProject = (
  world: CloseWorld,
  projectId: string
): Promise<HttpResult> =>
  performRequest(
    world.apiPort,
    '/api/projects/' + encodeURIComponent(projectId),
    {
      method: 'DELETE',
    }
  )

export const navigateWorkbench = (
  world: CloseWorld,
  projectId: string
): Promise<HttpResult> =>
  performRequest(world.apiPort, stableProjectRoute(projectId))

/** Drives a sibling runtime operation through the route that owns it. */
export const postRuntimeOperation = (
  world: CloseWorld,
  projectId: string,
  operation: 'stop' | 'restart'
): Promise<HttpResult> =>
  performRequest(
    world.apiPort,
    '/api/projects/' + encodeURIComponent(projectId) + '/runtime/' + operation,
    { method: 'POST' }
  )

/** The manager's own entry state for a project, or `null` when it holds none. */
export const entryStateOf = (
  world: CloseWorld,
  projectId: string
): ProjectRuntimeEntryState | null =>
  world.manager.inspectEntries().find((entry) => entry.projectId === projectId)
    ?.state ?? null

export const listProjectsOverHttp = (world: CloseWorld): Promise<HttpResult> =>
  performRequest(world.apiPort, '/api/projects')

export interface PublicRuntimeReport {
  readonly state: PublicRuntimeState
  readonly failureCategory: string | null
}

/** The published projection, read from the route that owns it. */
export const runtimeStatesOverHttp = async (
  world: CloseWorld
): Promise<Record<string, PublicRuntimeReport>> => {
  const response = await performRequest(world.apiPort, '/api/projects/runtime')
  const body = response.body as {
    runtimes?: {
      id: string
      state: PublicRuntimeState
      failureCategory?: string
    }[]
  }
  return Object.fromEntries(
    (body.runtimes ?? []).map((entry) => [
      entry.id,
      { state: entry.state, failureCategory: entry.failureCategory ?? null },
    ])
  )
}

/** Opens a workbench request the upstream holds, leaving a live proxied pair. */
export interface HeldRequest {
  readonly settled: Promise<{ ended: boolean; aborted: boolean }>
  destroy(): void
}

export function openHeldWorkbenchRequest(
  world: CloseWorld,
  projectId: string
): HeldRequest {
  let settle!: (value: { ended: boolean; aborted: boolean }) => void
  const settled = new Promise<{ ended: boolean; aborted: boolean }>(
    (resolve) => {
      settle = resolve
    }
  )
  const request = httpRequest({
    host: '127.0.0.1',
    port: world.apiPort,
    path: stableProjectRoute(projectId) + 'held',
    method: 'GET',
  })
  request.on('response', (response: IncomingMessage) => {
    response.on('data', () => undefined)
    response.on('end', () => settle({ ended: true, aborted: false }))
    response.on('aborted', () => settle({ ended: false, aborted: true }))
    response.on('error', () => settle({ ended: false, aborted: true }))
  })
  request.on('error', () => settle({ ended: false, aborted: true }))
  request.end()
  world.trackTransport(() => request.destroy())
  return { settled, destroy: () => request.destroy() }
}

export interface HeldWebSocket {
  readonly socket: WebSocket
  readonly opened: Promise<void>
  readonly closed: Promise<void>
  exchange(payload: string): Promise<boolean>
}

export function openWorkbenchWebSocket(
  world: CloseWorld,
  projectId: string
): HeldWebSocket {
  const socket = new WebSocket(
    'ws://127.0.0.1:' + String(world.apiPort) + stableProjectRoute(projectId)
  )
  const opened = new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
  const closed = new Promise<void>((resolve) => {
    socket.once('close', () => resolve())
    socket.once('error', () => resolve())
  })
  world.trackTransport(() => socket.terminate())
  return {
    socket,
    opened,
    closed,
    exchange: (payload) =>
      new Promise<boolean>((resolve) => {
        if (socket.readyState !== WebSocket.OPEN) {
          resolve(false)
          return
        }
        const timer = setTimeout(() => resolve(false), 250)
        socket.once('message', () => {
          clearTimeout(timer)
          resolve(true)
        })
        socket.once('close', () => {
          clearTimeout(timer)
          resolve(false)
        })
        socket.once('error', () => {
          clearTimeout(timer)
          resolve(false)
        })
        socket.send(payload)
      }),
  }
}

/** A real loopback connect attempt: the network's own answer, not a claim. */
export function connectionAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const settle = (value: boolean): void => {
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export function registrationDigest(project: Project): CloseRegistrationDigest {
  return Object.freeze({
    id: opaque('project-id', project.id),
    name: opaque('project-name', project.name),
    canonicalPath: opaque('project-path', project.canonicalPath),
    createdAt: opaque('project-created', String(project.createdAt)),
  })
}

/** One entry of a fixture tree, attribute by attribute. */
export interface FixtureManifestEntry {
  readonly kind: 'dir' | 'file' | 'link'
  readonly relativePath: string
  /** The permission bits, as the octal string the manifest line carries. */
  readonly mode: string
  readonly mtimeMs: number
  /** The content digest of a file, or `null` for a directory. */
  readonly contentDigest: string | null
  /** The digest of a symbolic link's target, or `null` when not a link. */
  readonly linkTargetDigest: string | null
  readonly line: string
}

/**
 * Walks one fixture tree and reports every entry it actually contains, with
 * membership, content, link target, mode, and mtime each read from the host.
 * `fixtureManifest` is the digest over the same lines, so the manifest a row
 * carries and the per-attribute comparison a scenario makes agree by
 * construction rather than by two independent walks.
 */
export async function fixtureManifestEntries(
  root: string
): Promise<readonly FixtureManifestEntry[]> {
  const collected: FixtureManifestEntry[] = []
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of [...entries].sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const absolute = path.join(directory, entry.name)
      const relative = path.relative(root, absolute)
      const info = await lstat(absolute)
      const mode = (info.mode & 0o7777).toString(8)
      if (entry.isSymbolicLink()) {
        const target = await readlink(absolute)
        collected.push({
          kind: 'link',
          relativePath: relative,
          mode,
          mtimeMs: info.mtimeMs,
          contentDigest: null,
          linkTargetDigest: digest(target),
          line: 'link ' + relative + ' ' + mode + ' -> ' + target,
        })
        continue
      }
      if (entry.isDirectory()) {
        collected.push({
          kind: 'dir',
          relativePath: relative,
          mode,
          mtimeMs: info.mtimeMs,
          contentDigest: null,
          linkTargetDigest: null,
          line: 'dir ' + relative + ' ' + mode,
        })
        await walk(absolute)
        continue
      }
      const contentDigest = digest(await readFile(absolute))
      collected.push({
        kind: 'file',
        relativePath: relative,
        mode,
        mtimeMs: info.mtimeMs,
        contentDigest,
        linkTargetDigest: null,
        line:
          'file ' +
          relative +
          ' ' +
          mode +
          ' ' +
          String(info.size) +
          ' ' +
          String(info.mtimeMs) +
          ' ' +
          contentDigest,
      })
    }
  }
  await walk(root)
  return Object.freeze(collected)
}

/**
 * A recursive manifest of one fixture tree: membership, content, link targets,
 * and modes. Access times are excluded because reading is not a mutation.
 */
export async function fixtureManifest(
  root: string
): Promise<CloseFixtureManifest> {
  const lines = (await fixtureManifestEntries(root)).map((entry) => entry.line)
  return Object.freeze({
    members: lines.length,
    digest: digest(lines.join('\n')),
  })
}

export function proxyAuditFor(
  world: CloseWorld,
  project: Project
): Readonly<Record<Bl020ProxyAuditCount, number>> {
  const audit = world.proxy.audit(deriveProjectOwnerToken(project.id))
  return Object.freeze({
    pendingOperations: audit.pendingOperations,
    httpRequests: audit.upstreamHttpRequests,
    httpResponses: audit.upstreamHttpResponses,
    rawSockets: audit.rawSockets,
    webSockets: audit.webSockets,
  })
}

export interface ManagerAuditBaseline {
  readonly ownershipRecords: number
  readonly pendingAdmissions: number
  readonly quarantinedOwnershipRecords: number
  readonly retiredProjects: number
  readonly lateCloseSettlements: number
  readonly refusedLateAcquisitions: number
}

export function managerBaseline(world: CloseWorld): ManagerAuditBaseline {
  const audit = world.manager.audit()
  return Object.freeze({
    ownershipRecords: audit.ownershipRecords,
    pendingAdmissions: audit.pendingAdmissions ?? 0,
    quarantinedOwnershipRecords: audit.quarantinedOwnershipRecords ?? 0,
    retiredProjects: audit.retiredProjects ?? 0,
    lateCloseSettlements: audit.lateCloseSettlements ?? 0,
    refusedLateAcquisitions: audit.refusedLateAcquisitions ?? 0,
  })
}

export function managerAuditFor(
  world: CloseWorld,
  baseline: ManagerAuditBaseline,
  declaresLateSettlement: boolean,
  /**
   * The claim's late work sampled while the claim was still held — at the
   * removal instant on a `closed` row, or at an explicit in-flight sample on a
   * row that never reached removal. `audit()` deletes the claim at settlement,
   * so it can never be read back afterwards.
   */
  claimLateWork: number | null
): CloseManagerAudit {
  const audit = world.manager.audit()
  return Object.freeze({
    ownershipRecords: audit.ownershipRecords,
    pendingAdmissions: audit.pendingAdmissions ?? 0,
    quarantinedOwnershipRecords: audit.quarantinedOwnershipRecords ?? 0,
    closeTasks: audit.closeTasks ?? 0,
    closeClaims: (audit.closeClaims ?? []).length,
    retiredProjects: audit.retiredProjects ?? 0,
    lateCloseSettlements: audit.lateCloseSettlements ?? 0,
    refusedLateAcquisitions: audit.refusedLateAcquisitions ?? 0,
    lateCloseSettlementsDelta:
      (audit.lateCloseSettlements ?? 0) - baseline.lateCloseSettlements,
    refusedLateAcquisitionsDelta:
      (audit.refusedLateAcquisitions ?? 0) - baseline.refusedLateAcquisitions,
    claimLateWork,
    declaresLateSettlement,
  })
}

export async function observePeer(
  world: CloseWorld
): Promise<ClosePeerObservation> {
  const snapshot = world.manager.inspect(world.peer.id)
  const identity = world.identities.find(
    (candidate) => candidate.projectId === world.peer.id && candidate.alive
  )
  const readiness =
    identity === undefined
      ? 'absent'
      : (await identity.listenerAbsent())
        ? 'listener-absent'
        : 'ready'
  const route = await navigateWorkbench(world, world.peer.id)
  return Object.freeze({
    identity: opaque(
      'peer-identity',
      (snapshot?.state ?? 'absent') + ':' + (identity?.ownerToken ?? 'none')
    ),
    readiness,
    stableRoute: 'status-' + String(route.status),
    activeConnections:
      proxyAuditFor(world, world.peer).pendingOperations +
      proxyAuditFor(world, world.peer).webSockets,
    registration: registrationDigest(world.peer),
    fixture: await fixtureManifest(world.peer.canonicalPath),
  })
}

/** Every residual class re-derived from host, proxy, and manager observation. */
export async function observeResidual(
  world: CloseWorld,
  baseline: ManagerAuditBaseline
): Promise<{
  readonly residual: Readonly<Record<Bl020ResidualClass, number | null>>
  readonly probes: Readonly<Record<Bl020ResidualClass, boolean>>
}> {
  const selectedIdentities = world.identities.filter(
    (identity) => identity.projectId === world.selected.id
  )
  let processes = 0
  let descendants = 0
  let listeners = 0
  for (const identity of selectedIdentities) {
    const startTime = await readProcessStartTime(identity.pid)
    if (identity.alive && startTime !== null) processes += 1
    if (identity.alive) {
      const members = await terminationFor(
        world.reconcilePlan,
        world.scheduler,
        world.ledger
      ).readProcessGroupMembers(identity.pid, new AbortController().signal)
      descendants += members.length
    }
    if (!(await identity.listenerAbsent())) listeners += 1
  }
  const proxy = proxyAuditFor(world, world.selected)
  const audit = world.manager.audit()
  const residual: Record<Bl020ResidualClass, number | null> = {
    selectedRuntimeProcesses: processes,
    attributableDescendants: descendants,
    listeners,
    proxyPendingOperations: proxy.pendingOperations,
    proxyHttpRequests: proxy.httpRequests,
    proxyHttpResponses: proxy.httpResponses,
    proxyRawSockets: proxy.rawSockets,
    proxyWebSockets: proxy.webSockets,
    ownershipRecords: Math.max(
      0,
      audit.ownershipRecords - baseline.ownershipRecords
    ),
    pendingAdmissions: Math.max(
      0,
      (audit.pendingAdmissions ?? 0) - baseline.pendingAdmissions
    ),
    quarantinedIdentities: Math.max(
      0,
      (audit.quarantinedOwnershipRecords ?? 0) -
        baseline.quarantinedOwnershipRecords
    ),
    closeClaims: (audit.closeClaims ?? []).filter(
      (claim) => claim.projectId === world.selected.id
    ).length,
    inFlightCloseTasks: audit.closeTasks ?? 0,
  }
  const probes = Object.fromEntries(
    BL020_RESIDUAL_CLASSES.map((residualClass) => [residualClass, true])
  ) as Record<Bl020ResidualClass, boolean>
  return {
    residual: Object.freeze(residual),
    probes: Object.freeze(probes),
  }
}

/**
 * Tears the world down and re-observes the six teardown classes from the host
 * afterwards. Only the exact resources this world created are removed.
 */
export async function teardownWorld(
  world: CloseWorld
): Promise<CloseTeardownRecord> {
  const apiPort = world.apiPort
  const identities = [...world.identities]
  const fixtureRoots = [
    world.selected.canonicalPath,
    world.peer.canonicalPath,
    world.extra.canonicalPath,
  ]

  // Every connection this world handed the scenario is closed by the world
  // itself, so what the teardown probes re-observe is the host after the
  // world's own resources are gone.
  world.releaseTransports()
  // The host identities go first: a runtime that refused to leave during the
  // scenario is still holding the manager's shutdown open, and the world
  // created every one of these processes.
  for (const identity of identities) {
    await identity.terminateHost()
  }
  await world.stopApi()
  for (const root of fixtureRoots)
    await rm(root, { recursive: true, force: true })

  let workbenchProcesses = 0
  let descendants = 0
  let listeners = 0
  let activeRequests = 0
  for (const identity of identities) {
    if ((await readProcessStartTime(identity.pid)) !== null && identity.alive)
      workbenchProcesses += 1
    if (identity.alive) descendants += 1
    if (!(await identity.listenerAbsent())) listeners += 1
    if (await connectionAvailable(identity.port)) activeRequests += 1
  }
  const apiProcesses = (await loopbackListenerIsAbsent(apiPort)) ? 0 : 1
  if (await connectionAvailable(apiPort)) activeRequests += 1
  let disposableFixtures = 0
  for (const root of fixtureRoots) {
    if (existsSync(root)) disposableFixtures += 1
  }

  const probe = (residual: number): CloseTeardownProbe =>
    Object.freeze({ probeCompleted: true, residual })
  return Object.freeze({
    attempted: true,
    independentReobservation: true,
    probes: Object.freeze({
      apiProcesses: probe(apiProcesses),
      workbenchProcesses: probe(workbenchProcesses),
      attributableDescendants: probe(descendants),
      listeners: probe(listeners),
      activeRequests: probe(activeRequests),
      disposableFixtures: probe(disposableFixtures),
    }),
  })
}

// ---------------------------------------------------------------------------
// The close window: everything production reported while a close was executing
// ---------------------------------------------------------------------------

export interface CloseWindow {
  readonly routeEnteredAt: number
  readonly settledAt: number
  readonly arms: readonly DeadlineArm[]
  readonly outcomes: readonly RuntimeCloseOutcome[]
  readonly responses: readonly HttpResult[]
  readonly events: readonly RuntimeSafeLifecycleEvent[]
  readonly routeLines: readonly string[]
  /** Where the two production logs stood when the window opened. */
  readonly eventBase: number
  readonly logBase: number
  /** The close-service invocations this window opened, in entry order. */
  readonly invocations: readonly CloseInvocation[]
  /** The invocation whose settled result the row reports. */
  readonly subject: CloseInvocation
}

/**
 * Chooses which invocation a window's row reports when the scenario opened
 * more than one. The default subject is the admitted close for the selected
 * project, and a scenario that reports a contender names it explicitly.
 */
export type SubjectSelector = (
  invocations: readonly CloseInvocation[]
) => CloseInvocation

/** The admitted close for `projectId`, or the first close it opened. */
export const admittedSubject =
  (projectId: string): SubjectSelector =>
  (invocations) => {
    const own = invocations.filter(
      (invocation) => invocation.projectId === projectId
    )
    if (own.length === 0)
      throw new Error('BL-020 window opened no close for its subject')
    return (
      own.find(
        (invocation) =>
          closeDeadlineArms(invocation).length >=
          BL020_ADMITTED_CLOSE_DEADLINE_ARMS
      ) ?? own[0]!
    )
  }

/** The invocation at `index` among the closes opened for `projectId`. */
export const nthSubject =
  (projectId: string, index: number): SubjectSelector =>
  (invocations) => {
    const own = invocations.filter(
      (invocation) => invocation.projectId === projectId
    )
    const chosen = own[index]
    if (chosen === undefined)
      throw new Error('BL-020 window opened no close at the named index')
    return chosen
  }

/**
 * Runs one scenario's close activity and captures the production-reported
 * facts bracketing it. Nothing here decides an outcome; it only records what
 * the executed close produced.
 */
export async function withCloseWindow(
  world: CloseWorld,
  action: () => Promise<readonly HttpResult[]>,
  selectSubject: SubjectSelector = admittedSubject(world.selected.id)
): Promise<CloseWindow> {
  const armsBefore = world.scheduler.arms.length
  const outcomesBefore = world.closeOutcomes.length
  const invocationsBefore = world.closeInvocations.length
  const eventsBefore = world.events.length
  const logBefore = world.routeLog.length
  const routeEnteredAt = world.scheduler.now()
  const responses = await action()
  const settledAt = world.scheduler.now()
  const arms = world.scheduler.arms.slice(armsBefore)
  const outcomes = world.closeOutcomes.slice(outcomesBefore)
  const invocations = world.closeInvocations.slice(invocationsBefore)
  if (invocations.length === 0)
    throw new Error('BL-020 close window opened no close-service invocation')
  return Object.freeze({
    routeEnteredAt,
    settledAt,
    arms: Object.freeze(arms),
    outcomes: Object.freeze(outcomes),
    responses: Object.freeze([...responses]),
    events: Object.freeze(world.events.slice(eventsBefore)),
    routeLines: Object.freeze(world.routeLog.slice(logBefore)),
    eventBase: eventsBefore,
    logBase: logBefore,
    invocations: Object.freeze(invocations),
    subject: selectSubject(invocations),
  })
}

/**
 * Reads the subject's settlement **site** from what production did, never
 * from what it returned. Three armed manager deadlines are `runClose` and
 * nothing else; the cardinality gate is the one admitted settlement that arms
 * none, and is corroborated by the frozen cardinality the scenario observed
 * exceeding the delivered cap; a recorded `undefined` persistence read is the
 * persisted absence; and arming nothing while a concurrent close for the same
 * project armed three and settled first is a joined contender.
 */
export function observeCloseAdmission(input: {
  readonly subject: CloseInvocation
  readonly invocations: readonly CloseInvocation[]
  readonly frozenOwnership: number
}): CloseAdmissionObservation {
  const { subject } = input
  const armed = closeDeadlineArms(subject).length
  const settled = subject.outcome
  const subjectReadAbsent = subject.admissionReads.some(
    (read) => read.projectId === subject.projectId && read.resolvedAbsent
  )
  // A rival is a close for the same project that held its claim while this
  // subject was running: it armed the three admitted deadlines and had not yet
  // settled when the subject entered. A close that settled before the subject
  // entered is a prior close, not a contended one.
  const rival = input.invocations.find(
    (invocation) =>
      invocation !== subject &&
      invocation.projectId === subject.projectId &&
      closeDeadlineArms(invocation).length >=
        BL020_ADMITTED_CLOSE_DEADLINE_ARMS &&
      (invocation.settledAt === null ||
        invocation.settledAt >= subject.enteredAt)
  )
  return Object.freeze({
    armedCloseDeadlines: armed,
    settledAtCardinalityGate:
      armed === 0 &&
      rival === undefined &&
      input.frozenOwnership > matrixConfig.closeOwnershipSweepCap,
    persistedReadResolvedAbsent: subjectReadAbsent,
    // A joined contender read its subject as present and then waited on the
    // rival's settlement; a close whose own read resolved absent never joined.
    lostToConcurrentClose:
      armed === 0 && rival !== undefined && !subjectReadAbsent,
    settledSiteName:
      settled !== null && settled.outcome === 'rejected'
        ? settled.category
        : null,
    admissionReadAt:
      subject.admissionReads.find(
        (read) => read.projectId === subject.projectId
      )?.at ?? null,
  })
}

/**
 * Recovers `(requiresQuarantineResolution, sweepUnits)` from the two bounds
 * production armed, so both are read back from the close rather than declared.
 *
 * The two bound families overlap — a quarantine-resolving close over one
 * ownership record arms exactly what a plain close over four would arm — so a
 * pair the scenario observed for itself before the close disambiguates the
 * inversion. The observed pair is never returned unchecked: it is accepted
 * only when production armed both the release and the overall bound that pair
 * implies.
 */
export function invertArmedBounds(
  arms: readonly DeadlineArm[],
  observed?: { requiresQuarantineResolution: boolean; sweepUnits: number }
): { requiresQuarantineResolution: boolean; sweepUnits: number } | null {
  const overall = arms.find((arm) =>
    [false, true].some((quarantine) =>
      Array.from({ length: matrixConfig.closeOwnershipSweepCap }, (_, index) =>
        runtimeCloseOverallBoundMs(matrixConfig, quarantine, index + 1)
      ).includes(arm.declaredMs)
    )
  )
  if (overall === undefined) return null
  const armedFor = (candidate: {
    requiresQuarantineResolution: boolean
    sweepUnits: number
  }): boolean =>
    runtimeCloseOverallBoundMs(
      matrixConfig,
      candidate.requiresQuarantineResolution,
      candidate.sweepUnits
    ) === overall.declaredMs &&
    arms.some(
      (arm) =>
        arm.declaredMs ===
        runtimeCloseReleaseBoundMs(
          matrixConfig,
          candidate.requiresQuarantineResolution,
          candidate.sweepUnits
        )
    )
  if (observed !== undefined && armedFor(observed)) return observed
  for (const quarantine of [false, true]) {
    for (
      let units = 1;
      units <= matrixConfig.closeOwnershipSweepCap;
      units += 1
    ) {
      if (
        armedFor({
          requiresQuarantineResolution: quarantine,
          sweepUnits: units,
        })
      )
        return { requiresQuarantineResolution: quarantine, sweepUnits: units }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Row assembly
// ---------------------------------------------------------------------------

export interface RowInputs {
  readonly world: CloseWorld
  readonly window: CloseWindow
  readonly group: Bl020ScenarioGroup
  /** Ownership records held for the selected project when the close entered. */
  readonly frozenOwnership: number
  /**
   * Quarantined records and pending admissions the selected project held when
   * the close entered. The manager's own confirmation clauses require the
   * subject's to be gone and every other project's to be untouched, so the
   * row's clause compares the baseline less the subject's own frozen count.
   */
  readonly frozenQuarantine?: number
  readonly frozenPendingAdmissions?: number
  readonly registrationBefore: CloseRegistrationDigest
  readonly fixtureBefore: CloseFixtureManifest
  readonly peerBefore: ClosePeerObservation
  readonly controlBefore: CloseControlObservation
  readonly managerBaseline: ManagerAuditBaseline
  readonly declaresLateSettlement: boolean
  /**
   * The route response that belongs to the subject close. A scenario that
   * issues one request leaves this at the last response; a scenario that
   * issues several names the subject's own response rather than assuming an
   * ordering the transport does not promise.
   */
  readonly selectResponse: (
    responses: readonly HttpResult[]
  ) => HttpResult | null
  /**
   * The claim's late work sampled by the scenario while the close was still in
   * flight, for rows that never reach a removal instant.
   */
  readonly inFlightClaimLateWork: number | null
  readonly refusedAcquisitions: readonly CloseRefusedAcquisition[]
  readonly extraSeams: readonly Bl020CloseSeam[]
  /**
   * The rendered execution receipt joined to this row, for the ten scenarios
   * the web component lane owns. It is read from the artifact that lane
   * committed and is never synthesized here.
   */
  readonly componentWitness: CloseComponentWitness | null
}

export async function buildCloseRow(
  inputs: RowInputs
): Promise<ProjectCloseEvidenceRow> {
  const { world, window } = inputs
  const subject = window.subject
  const settled = subject.outcome
  if (settled === null)
    throw new Error(
      'BL-020 ' + world.scenario + ' produced no settled close outcome'
    )

  const outcome = settled.outcome
  const rejectionCategory = outcome === 'rejected' ? settled.category : null
  const admission = observeCloseAdmission({
    subject,
    invocations: window.invocations,
    frozenOwnership: inputs.frozenOwnership,
  })
  const witness = deriveCloseAdmissionWitness(admission)
  const preClaimSettlement = witness.preClaimSettlement
  const claimInstalledAt = witness.claimInstalledAt
  const drainInvocations = subject.drainInvocations
  const connectionAuditInvocations = subject.connectionAuditInvocations
  if (claimInstalledAt !== null) {
    // This close read the subject exactly once, and every deadline it armed
    // was armed after that read: nothing observed the subject in between.
    const subjectReads = subject.admissionReads.filter(
      (read) => read.projectId === subject.projectId
    )
    const armed = closeDeadlineArms(subject)
    if (subjectReads.length !== 1)
      throw new Error(
        'BL-020 ' +
          world.scenario +
          ' read its subject more than once before installing a claim'
      )
    if (admission.settledAtCardinalityGate) {
      // The cardinality gate settles inside the claim's synchronous section,
      // before any phase exists to bound: an admitted close that settles
      // there arms nothing at all.
      if (armed.length !== 0)
        throw new Error(
          'BL-020 ' +
            world.scenario +
            ' armed a close deadline at the cardinality gate'
        )
    } else if (
      armed.length === 0 ||
      armed.some((arm) => arm.armedAt < claimInstalledAt)
    )
      throw new Error(
        'BL-020 ' +
          world.scenario +
          ' armed a close deadline before its admission read'
      )
  }

  const lastResponse = inputs.selectResponse(window.responses)
  const routeCategory =
    lastResponse === null
      ? null
      : ((lastResponse.body as { error?: { category?: string } } | undefined)
          ?.error?.category ?? null)
  const persisted = await world.library.findById(world.selected.id)
  const published = await runtimeStatesOverHttp(world)
  const report = published[world.selected.id] ?? null
  const publicState = report?.state ?? null
  const failureClassification = report?.failureCategory ?? null

  const capExceeded = rejectionCategory === 'ownership-cardinality-exceeded'
  const sweepUnits = capExceeded ? 1 : Math.max(1, inputs.frozenOwnership)
  // What the scenario observed the manager holding for the subject before the
  // close: production resolves quarantine when either is present.
  const inverted = invertArmedBounds(window.arms, {
    requiresQuarantineResolution:
      (inputs.frozenQuarantine ?? 0) > 0 ||
      (inputs.frozenPendingAdmissions ?? 0) > 0,
    sweepUnits,
  })
  const requiresQuarantineResolution =
    inverted?.requiresQuarantineResolution ?? false
  if (inverted !== null && inverted.sweepUnits !== sweepUnits)
    throw new Error(
      'BL-020 ' +
        world.scenario +
        ' armed a sweep multiplier that disagrees with its frozen cardinality:' +
        ' armed ' +
        String(inverted.sweepUnits) +
        ', frozen ' +
        String(inputs.frozenOwnership)
    )

  const projectTokens = world.projectsInScope.map((project) =>
    deriveProjectOwnerToken(project.id)
  )
  const signalCallsByProject = Object.fromEntries(
    projectTokens.map((token) => [
      token,
      world.ledger.signalsByProject.get(token) ?? 0,
    ])
  )
  const projectsTerminated = projectTokens.filter(
    (token) => (signalCallsByProject[token] ?? 0) > 0
  )
  const projectsWithoutRelease = projectTokens.filter(
    (token) => (signalCallsByProject[token] ?? 0) === 0
  )

  const proxyAudit = proxyAuditFor(world, world.selected)
  const capture = subject.removalCapture
  const managerAudit = managerAuditFor(
    world,
    inputs.managerBaseline,
    inputs.declaresLateSettlement,
    capture?.claimLateWork ?? inputs.inFlightClaimLateWork
  )
  const observed = await observeResidual(world, inputs.managerBaseline)

  const phases: Bl020ClosePhase[] = []
  if (drainInvocations > 0) phases.push('drain')
  if (claimInstalledAt !== null && !capExceeded)
    phases.push('resolve-admissions-and-quarantine')
  if (world.ledger.calls.terminate > 0 || world.ledger.calls.signal > 0)
    phases.push('release')
  if (claimInstalledAt !== null && !capExceeded && drainInvocations > 0)
    phases.push('sweep')
  if (connectionAuditInvocations > 0) phases.push('confirm')
  if (outcome === 'closed') phases.push('remove', 'retire')

  const seams: Bl020CloseSeam[] = ['route-entry']
  if (claimInstalledAt !== null) seams.push('claim-install', 'cardinality-gate')
  if (preClaimSettlement === 'persisted-absence')
    seams.push('persisted-absence')
  if (preClaimSettlement === 'contender-join') seams.push('contender-join')
  if (preClaimSettlement === 'manager-shutdown') seams.push('shutdown-head')
  for (const seam of inputs.extraSeams)
    if (!seams.includes(seam)) seams.push(seam)

  // Captured inside the composed `commitRemoval`, at the instant it describes.
  const confirmation: CloseConfirmationRecord | null =
    capture === null
      ? null
      : Object.freeze({
          connections: capture.connectionsClear,
          ownership:
            capture.ownershipRecords ===
            inputs.managerBaseline.ownershipRecords - inputs.frozenOwnership,
          quarantine:
            capture.quarantinedOwnershipRecords ===
            inputs.managerBaseline.quarantinedOwnershipRecords -
              (inputs.frozenQuarantine ?? 0),
          pendingAdmissions:
            capture.pendingAdmissions ===
              inputs.managerBaseline.pendingAdmissions -
                (inputs.frozenPendingAdmissions ?? 0) &&
            !capture.subjectPendingAdmission,
          // The claim is still held here, and its late work is the manager's
          // own project-keyed account of identity-bearing lifecycle work.
          inFlightLifecycle: capture.claimHeld && capture.claimLateWork === 0,
          releaseAudits: capture.releaseAuditsConfirmed,
          // No generation but the one the claim froze is observable: either
          // the subject projects nothing, or it projects that same generation.
          generationIdentity:
            capture.projection === undefined ||
            Object.is(capture.projection, subject.claimInstallProjection),
          notRetired:
            capture.retiredProjects === inputs.managerBaseline.retiredProjects,
          reobserved: capture.reobserved,
        })

  const elapsedOrigin = witness.elapsedOrigin
  const origin = claimInstalledAt ?? window.routeEnteredAt

  return Object.freeze({
    scenario: world.scenario,
    group: inputs.group,
    executionId: world.scenario + '-' + randomUUID(),
    declaredBound: BL020_SCENARIO_BOUNDS[world.scenario],
    declaredBoundMs: bl020BoundValueMs(
      BL020_SCENARIO_BOUNDS[world.scenario],
      matrixConfig
    ),
    requiresQuarantineResolution,
    outcome,
    rejectionCategory,
    preClaimSettlement,
    routeStatus: lastResponse?.status ?? null,
    routeCategory,
    publicState,
    failureClassification,
    projectTokens: Object.freeze(projectTokens),
    registrationBefore: inputs.registrationBefore,
    registrationAfter:
      persisted === undefined ? null : registrationDigest(persisted),
    fixtureBefore: inputs.fixtureBefore,
    fixtureAfter: await fixtureManifest(world.selected.canonicalPath),
    peerBefore: inputs.peerBefore,
    peerAfter: await observePeer(world),
    controlBefore: inputs.controlBefore,
    controlAfter: await world.control.observe(),
    // Both sets are read from the subject's own settlement onward: an earlier
    // request in the same window, or a replacement boot the scenario
    // performed before the subject entered, is that activity's to answer for,
    // not this row's.
    emittedEvents: Object.freeze(
      [
        ...new Set(
          window.events
            .slice(
              Math.max(0, window.subject.eventIndexAtEntry - window.eventBase)
            )
            .map((event) => event.event)
        ),
      ].sort()
    ),
    projectClosedEmissions: window.routeLines
      .slice(Math.max(0, window.subject.logIndexAtEntry - window.logBase))
      .filter((line) => line.includes(PROJECT_CLOSED_EVENT)).length,
    proxyAudit,
    managerAudit,
    execution: Object.freeze({
      boundaryInstanceId: opaque(
        'boundary',
        world.scenario + ':' + String(world.apiPort)
      ),
      productionPathsEntered: Object.freeze([...seams, ...phases]),
      primitiveCalls: Object.freeze({ ...world.ledger.calls }),
      signalCallsByProject: Object.freeze(signalCallsByProject),
      drainInvocations,
      connectionAuditInvocations,
      routeEnteredAt: window.routeEnteredAt,
      claimInstalledAt,
      settledAt: window.settledAt,
      elapsedOrigin,
      ownershipCardinality:
        claimInstalledAt === null
          ? null
          : Object.freeze({
              frozen: inputs.frozenOwnership,
              cap: matrixConfig.closeOwnershipSweepCap,
              sweepUnits,
              capExceeded,
            }),
      confirmation,
      refusedAcquisitions: Object.freeze([...inputs.refusedAcquisitions]),
      projectsWithoutRelease: Object.freeze(projectsWithoutRelease),
      projectsTerminated: Object.freeze(projectsTerminated),
    }),
    elapsedMs: window.settledAt - origin,
    residual: observed.residual,
    residualProbes: observed.probes,
    createdHostResources: true,
    teardown: await teardownWorld(world),
    componentWitness: inputs.componentWitness,
  })
}

export const groupOf = (scenario: Bl020ScenarioId): Bl020ScenarioGroup => {
  const found = (
    Object.keys(BL020_SCENARIO_GROUPS) as Bl020ScenarioGroup[]
  ).find((group) =>
    (BL020_SCENARIO_GROUPS[group] as readonly string[]).includes(scenario)
  )
  if (found === undefined)
    throw new Error('BL-020 scenario ' + scenario + ' has no declared group')
  return found
}

export interface ScenarioExecution {
  readonly world: CloseWorld
  /** Brings the peer (and any additional control project) to its state. */
  arrangePeer?: () => Promise<void>
  /** Brings the selected project to the state the scenario needs. */
  arrangeSelected?: () => Promise<void>
  /** The close activity whose responses the row records. */
  act: () => Promise<readonly HttpResult[]>
  /**
   * Releases every hold the scenario installed, after the close settled and
   * before the row is assembled, so nothing is still suspended at teardown.
   */
  settle?: () => Promise<void>
  /** Names the invocation the row reports when the scenario opened several. */
  subject?: SubjectSelector
  /** Names the route response the reported subject produced. */
  selectResponse?: (responses: readonly HttpResult[]) => HttpResult | null
  declaresLateSettlement?: boolean
  /**
   * Clears the world-wide primitive ledger immediately before the close acts,
   * so a row that reports what the close called is not inflated by the
   * lifecycle operations its own arrangement had to perform. Off by default.
   */
  resetLedgerBeforeAct?: boolean
  /**
   * Returns the held claim's late work the scenario sampled at a real
   * in-flight instant, for a subject that never reaches a removal instant.
   * `audit()` deletes the claim at settlement, so it cannot be read later.
   */
  inFlightClaimLateWork?: () => number | null
  refusedAcquisitions?: readonly CloseRefusedAcquisition[]
  extraSeams?: readonly Bl020CloseSeam[]
  /** The component-lane receipt this row joins, when it owns one. */
  componentWitness?: CloseComponentWitness
}

/**
 * Executes one scenario end to end and assembles its row. Every value the row
 * carries is read back from the world after production produced it.
 */
export async function executeScenario(
  execution: ScenarioExecution
): Promise<ProjectCloseEvidenceRow> {
  const { world } = execution
  await (
    execution.arrangePeer ??
    (async () => {
      expect((await navigateWorkbench(world, world.peer.id)).status).toBe(200)
    })
  )()
  const peerAudit = world.manager.audit()
  await execution.arrangeSelected?.()
  const arrangedAudit = world.manager.audit()
  const frozenOwnership =
    arrangedAudit.ownershipRecords - peerAudit.ownershipRecords
  const frozenQuarantine =
    (arrangedAudit.quarantinedOwnershipRecords ?? 0) -
    (peerAudit.quarantinedOwnershipRecords ?? 0)
  const frozenPendingAdmissions =
    (arrangedAudit.pendingAdmissions ?? 0) - (peerAudit.pendingAdmissions ?? 0)
  const selectedBefore = await world.library.findById(world.selected.id)
  const baseline = managerBaseline(world)
  const registrationBefore = registrationDigest(
    selectedBefore ?? world.selected
  )
  const fixtureBefore = await fixtureManifest(world.selected.canonicalPath)
  const peerBefore = await observePeer(world)
  const controlBefore = await world.control.observe()
  if (execution.resetLedgerBeforeAct === true) world.ledger.reset()
  const window = await withCloseWindow(
    world,
    execution.act,
    execution.subject ?? admittedSubject(world.selected.id)
  )
  await execution.settle?.()
  return buildCloseRow({
    world,
    window,
    group: groupOf(world.scenario),
    frozenOwnership,
    frozenQuarantine,
    frozenPendingAdmissions,
    registrationBefore,
    fixtureBefore,
    peerBefore,
    controlBefore,
    managerBaseline: baseline,
    declaresLateSettlement: execution.declaresLateSettlement ?? false,
    selectResponse:
      execution.selectResponse ?? ((responses) => responses.at(-1) ?? null),
    inFlightClaimLateWork: execution.inFlightClaimLateWork?.() ?? null,
    refusedAcquisitions: execution.refusedAcquisitions ?? [],
    extraSeams: execution.extraSeams ?? [],
    componentWitness: execution.componentWitness ?? null,
  })
}
