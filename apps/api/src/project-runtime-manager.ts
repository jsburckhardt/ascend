import type { Project } from './project-persistence.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeFailure,
  RuntimeRestartInvariantError,
  RuntimeStopInvariantError,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  publicRuntimeState,
  runtimeRestartOverallBoundMs,
  runtimeRestartReleaseBoundMs,
  runtimeStopOverallBoundMs,
  serializeRuntimeEvent,
  stableProjectRoute,
  type PublicRuntimeReport,
  type ProjectRuntimeConfig,
  type RestartAdmissionPhase,
  type RestartQuarantineAuditState,
  type RuntimeEntryState,
  type RuntimeLifecycleEvent,
  type RuntimeRestartIdentity,
  type RuntimeRestartOutcome,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
  type RuntimeStopOutcome,
  type RuntimeUnresolvedAdmission,
} from './project-runtime-contract.js'
import {
  defaultRuntimeDeadlineScheduler,
  defaultRuntimeProcessDependencies,
  launchReadyRuntime,
  type RuntimeDeadlineScheduler,
  type ReadyRuntime,
  type RuntimeOwnershipRecord,
  type RuntimeProcessDependencies,
  type RuntimeResourceAudit,
  type RuntimeTerminationAudit,
} from './project-runtime-process.js'

export interface ProjectRuntimeStartInput {
  readonly projectId: string
  readonly canonicalPath: string
  readonly signal?: AbortSignal
}

interface RestartingEntry {
  readonly state: 'restarting'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeRestartOutcome>
  readonly controller: AbortController
}

export interface ProjectRuntimeTerminationAudit extends RuntimeTerminationAudit {
  readonly projectToken: string
}

interface PendingReplacementAdmission {
  readonly projectId: string
  readonly restartGeneration: symbol
  readonly admissionId: string
  readonly canonicalPath: string
  readonly ownerToken: string
  readonly admittedAt: number
  phase: RestartAdmissionPhase
  ownedReported: boolean
  readonly resolution: Promise<void>
  resolvedPhase: RestartAdmissionPhase | undefined
}

interface QuarantinedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly restartGeneration: symbol
  readonly admissionId: string
  auditState: RestartQuarantineAuditState
}

export interface RuntimeShutdownResult {
  readonly status: 'ok' | 'failed'
  readonly audits: readonly ProjectRuntimeTerminationAudit[]
  readonly unresolvedAdmissions: readonly RuntimeUnresolvedAdmission[]
}

export type ProjectRuntimeEntryState = RuntimeEntryState

export interface ProjectRuntimeEntryInspection {
  readonly projectId: string
  readonly projectToken: string
  readonly canonicalPath: string
  readonly state: ProjectRuntimeEntryState
  readonly snapshot?: RuntimeSnapshot
  readonly pendingAdmissionId?: string
  readonly pendingAdmissionPhase?: RestartAdmissionPhase
  readonly waiterCount: number
}

export interface ProjectRuntimeManagerAudit {
  readonly shuttingDown: boolean
  readonly entryCount: number
  readonly startingEntries: number
  readonly ownershipRecords: number
  readonly completionTasks: number
  readonly backgroundTasks: number
  readonly stopTasks: number
  readonly completionTaskSettlements: number
  readonly backgroundTaskSettlements: number
  readonly lateTerminationSettlements: number
  readonly lateReplacementSettlements?: number
  readonly restartTasks?: number
  readonly pendingAdmissions?: number
  readonly quarantinedOwnershipRecords?: number
  readonly quarantineCleanupRecords?: number
  readonly admissionResolutions?: number
}

export interface ProjectRuntimeManager {
  register(projectId: string, canonicalPath: string): void
  start(input: ProjectRuntimeStartInput): Promise<RuntimeSnapshot>
  stop(input: { readonly projectId: string }): Promise<RuntimeStopOutcome>
  restart(input: { readonly projectId: string }): Promise<RuntimeRestartOutcome>
  reportPublicStates(
    projectIds: readonly string[]
  ): readonly PublicRuntimeReport[]
  inspect(projectId: string): RuntimeSnapshot | undefined
  ownsSnapshot(snapshot: RuntimeSnapshot): boolean
  inspectEntries(): readonly ProjectRuntimeEntryInspection[]
  audit?(): ProjectRuntimeManagerAudit
  lastFailure(projectId: string): RuntimeFailure | undefined
  lastCleanup(projectId: string): RuntimeTerminationAudit | undefined
  lastShutdown(): RuntimeShutdownResult | undefined
  shutdown(): Promise<RuntimeShutdownResult>
}

export interface ProjectRuntimeManagerDependencies {
  readonly findProjectById: (id: string) => Promise<Project | undefined>
  readonly config?: ProjectRuntimeConfig
  readonly processDependencies?: RuntimeProcessDependencies
  readonly launch?: (input: {
    readonly config: ProjectRuntimeConfig
    readonly canonicalPath: string
    readonly ownerToken: string
    readonly signal: AbortSignal
    readonly dependencies: RuntimeProcessDependencies
    readonly onOwned?: (record: RuntimeOwnershipRecord) => void
    readonly onCleanup?: (audit: RuntimeTerminationAudit) => void
  }) => Promise<ReadyRuntime>
  readonly now?: () => number
  readonly recordEvent?: (event: RuntimeSafeLifecycleEvent) => void
  readonly deadlineScheduler?: RuntimeDeadlineScheduler
}

interface RegisteredEntry {
  readonly state: 'registered'
  readonly projectId: string
  readonly canonicalPath: string
  readonly released: boolean
}

interface StartingEntry {
  readonly state: 'starting'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly controller: AbortController
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeSnapshot>
  readonly waiters: Set<symbol>
}

interface RunningEntry {
  readonly state: 'running'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly ready: ReadyRuntime
  readonly snapshot: RuntimeSnapshot
}

interface StoppingEntry {
  readonly state: 'stopping'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly ready: ReadyRuntime
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeStopOutcome>
}

interface FailedEntry {
  readonly state: 'failed'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly snapshot: RuntimeSnapshot
  readonly failure: RuntimeFailure
  readonly pendingAdmissionId?: string
}

type ProjectRuntimeEntry =
  | RegisteredEntry
  | StartingEntry
  | RunningEntry
  | StoppingEntry
  | RestartingEntry
  | FailedEntry

interface ManagedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly generation: symbol
}

const freezeSnapshot = (snapshot: RuntimeSnapshot): RuntimeSnapshot =>
  Object.freeze(snapshot)

function abortedPromise(signal: AbortSignal): {
  readonly promise: Promise<
    Readonly<{ kind: 'phase-aborted'; reason: unknown }>
  >
  cancel(): void
} {
  let cancel = (): void => undefined
  const promise = new Promise<
    Readonly<{ kind: 'phase-aborted'; reason: unknown }>
  >((resolve) => {
    const settle = (): void =>
      resolve(Object.freeze({ kind: 'phase-aborted', reason: signal.reason }))
    if (signal.aborted) {
      settle()
      return
    }
    signal.addEventListener('abort', settle, { once: true })
    cancel = () => signal.removeEventListener('abort', settle)
  })
  return { promise, cancel }
}

export function createProjectRuntimeManager(
  dependencies: ProjectRuntimeManagerDependencies
): ProjectRuntimeManager {
  const config = dependencies.config ?? createProjectRuntimeConfig()
  const processDependencies =
    dependencies.processDependencies ?? defaultRuntimeProcessDependencies
  const launch = dependencies.launch ?? launchReadyRuntime
  const now = dependencies.now ?? Date.now
  const recordEvent = dependencies.recordEvent ?? (() => undefined)
  const deadlineScheduler =
    dependencies.deadlineScheduler ?? defaultRuntimeDeadlineScheduler
  const entries = new Map<string, ProjectRuntimeEntry>()
  const cleanupOutcomes = new Map<string, RuntimeTerminationAudit>()
  const ownership = new Map<string, ManagedOwnership>()
  const completionTasks = new Set<Promise<RuntimeSnapshot>>()
  const backgroundTasks = new Set<Promise<void>>()
  const stopTasks = new Set<Promise<RuntimeStopOutcome>>()
  const restartTasks = new Set<Promise<RuntimeRestartOutcome>>()
  const pendingAdmissions = new Map<string, PendingReplacementAdmission>()
  const pendingAdmissionResolvers = new Map<string, () => void>()
  const pendingAdmissionOwnedKeys = new Map<string, Set<string>>()
  const detachedAdmissionIds = new Set<string>()
  const quarantinedOwnership = new Map<string, QuarantinedOwnership>()
  const quarantineCleanups = new Map<string, RuntimeTerminationAudit>()
  const quarantineTerminationAttempts = new Map<string, number>()
  const quarantineReclamations = new Map<string, Promise<void>>()
  let admissionSequence = 0
  let admissionResolutions = 0
  let completionTaskSettlements = 0
  let backgroundTaskSettlements = 0
  let lateTerminationSettlements = 0
  let lateReplacementSettlements = 0
  let shutdownPromise: Promise<RuntimeShutdownResult> | undefined
  let shutdownResult: RuntimeShutdownResult | undefined
  let shuttingDown = false

  const ownershipKey = (record: RuntimeOwnershipRecord): string =>
    [record.process.pid, record.process.processStartTime, record.port].join(':')

  const registerOwnership = (
    projectId: string,
    generation: symbol,
    record: RuntimeOwnershipRecord
  ): void => {
    ownership.set(ownershipKey(record), { projectId, generation, ...record })
  }

  const auditConfirmsAbsence = (audit: RuntimeResourceAudit): boolean =>
    audit.processAbsent && audit.processGroupAbsent && audit.listenerAbsent

  const runtimeIdentity = (
    record: RuntimeOwnershipRecord
  ): RuntimeRestartIdentity =>
    Object.freeze({
      pid: record.process.pid,
      processStartTime: record.process.processStartTime,
      port: record.port,
    })

  const ownedReadyFor = (
    entry: RunningEntry | StoppingEntry | FailedEntry
  ): ReadyRuntime | undefined => {
    if (entry.state === 'running' || entry.state === 'stopping')
      return entry.ready
    if (
      entry.snapshot.pid === null ||
      entry.snapshot.processStartTime === null ||
      entry.snapshot.port === null ||
      entry.snapshot.internalUrl === null
    ) {
      return undefined
    }
    const record = ownership.get(
      [
        entry.snapshot.pid,
        entry.snapshot.processStartTime,
        entry.snapshot.port,
      ].join(':')
    )
    if (record?.generation !== entry.generation) return undefined
    return {
      process: record.process,
      port: record.port,
      internalUrl: entry.snapshot.internalUrl,
      readinessAttempts: [],
    }
  }

  const admissionOwnedKeys = (
    admission: PendingReplacementAdmission
  ): Set<string> => {
    let keys = pendingAdmissionOwnedKeys.get(admission.admissionId)
    if (keys === undefined) {
      keys = new Set<string>()
      pendingAdmissionOwnedKeys.set(admission.admissionId, keys)
    }
    return keys
  }

  const resolveAdmission = (admission: PendingReplacementAdmission): void => {
    if (
      admission.phase === 'launch-pending' ||
      admission.resolvedPhase !== undefined
    )
      return
    admission.resolvedPhase = admission.phase
    admissionResolutions += 1
    pendingAdmissionResolvers.get(admission.admissionId)?.()
    pendingAdmissionResolvers.delete(admission.admissionId)
  }

  const finishAdmission = (admission: PendingReplacementAdmission): void => {
    if (pendingAdmissions.get(admission.projectId) !== admission) return
    resolveAdmission(admission)
    pendingAdmissions.delete(admission.projectId)
    pendingAdmissionOwnedKeys.delete(admission.admissionId)
    detachedAdmissionIds.delete(admission.admissionId)
  }

  const maybeFinishDetachedAdmission = (
    admission: PendingReplacementAdmission
  ): void => {
    const ownedKeys = admissionOwnedKeys(admission)
    if (
      !detachedAdmissionIds.has(admission.admissionId) ||
      admission.phase === 'launch-pending'
    )
      return
    const retained = [...quarantinedOwnership.values()].some(
      (record) => record.admissionId === admission.admissionId
    )
    if (retained) {
      resolveAdmission(admission)
      return
    }
    if (ownedKeys.size > 0) return
    admission.phase = admission.ownedReported
      ? 'audited-absent'
      : 'absent-confirmed'
    if (detachedAdmissionIds.has(admission.admissionId)) {
      resolveAdmission(admission)
      return
    }
    finishAdmission(admission)
  }

  const restartQuarantineKey = (
    admissionId: string,
    record: RuntimeOwnershipRecord
  ): string => `${admissionId}|${ownershipKey(record)}`

  const quarantineForProject = (
    projectId: string
  ): readonly [string, QuarantinedOwnership][] =>
    [...quarantinedOwnership.entries()].filter(
      ([, record]) => record.projectId === projectId
    )

  const quarantineOwnership = (
    admission: PendingReplacementAdmission,
    record: ManagedOwnership | QuarantinedOwnership,
    auditState: RestartQuarantineAuditState = 'unaudited',
    terminationAttempts = 0,
    audit?: RuntimeTerminationAudit
  ): string => {
    const identityKey = ownershipKey(record)
    const key = restartQuarantineKey(admission.admissionId, record)
    const recordGeneration =
      'restartGeneration' in record
        ? record.restartGeneration
        : record.generation
    if (ownership.get(identityKey)?.generation === recordGeneration)
      ownership.delete(identityKey)
    admission.ownedReported = true
    admissionOwnedKeys(admission).add(identityKey)
    admission.phase = 'materialized-quarantined'
    const existing = quarantinedOwnership.get(key)
    quarantinedOwnership.set(key, {
      projectId: record.projectId,
      restartGeneration: recordGeneration,
      admissionId: admission.admissionId,
      process: record.process,
      port: record.port,
      auditState: existing?.auditState ?? auditState,
    })
    quarantineTerminationAttempts.set(
      key,
      Math.max(quarantineTerminationAttempts.get(key) ?? 0, terminationAttempts)
    )
    if (audit !== undefined)
      quarantineCleanups.set(key, Object.freeze({ ...audit }))
    return key
  }

  const removeConfirmedQuarantine = (
    key: string,
    record: QuarantinedOwnership
  ): void => {
    record.auditState = 'audited-absent'
    quarantinedOwnership.delete(key)
    quarantineReclamations.delete(key)
    quarantineTerminationAttempts.delete(key)
    const admission = pendingAdmissions.get(record.projectId)
    if (admission?.admissionId !== record.admissionId) return
    admissionOwnedKeys(admission).delete(ownershipKey(record))
    maybeFinishDetachedAdmission(admission)
  }

  const reclaimQuarantine = async (key: string): Promise<void> => {
    const record = quarantinedOwnership.get(key)
    if (record === undefined) return
    if (record.auditState === 'reclaiming') {
      await quarantineReclamations.get(key)
      return
    }
    const priorAttempts = quarantineTerminationAttempts.get(key) ?? 0
    if (priorAttempts >= 2) return
    record.auditState = 'reclaiming'
    quarantineTerminationAttempts.set(key, priorAttempts + 1)
    const reclamation = record.process
      .terminate(config.gracefulShutdownMs, config.forceShutdownMs, record.port)
      .then(
        (audit) => {
          quarantineCleanups.set(key, Object.freeze({ ...audit }))
          if (auditConfirmsAbsence(audit)) {
            removeConfirmedQuarantine(key, record)
            return
          }
          record.auditState = 'audited-unconfirmed'
        },
        () => {
          record.auditState = 'audited-unconfirmed'
        }
      )
    quarantineReclamations.set(key, reclamation)
    await reclamation
  }

  const reclaimProjectQuarantine = async (projectId: string): Promise<void> => {
    await Promise.all(
      quarantineForProject(projectId).map(([key]) => reclaimQuarantine(key))
    )
    const admission = pendingAdmissions.get(projectId)
    if (admission !== undefined) maybeFinishDetachedAdmission(admission)
  }

  const createPendingAdmission = (
    projectId: string,
    restartGeneration: symbol,
    canonicalPath: string,
    ownerToken: string
  ): PendingReplacementAdmission => {
    if (pendingAdmissions.has(projectId))
      throw new RuntimeRestartInvariantError()
    let resolve!: () => void
    const resolution = new Promise<void>((settle) => {
      resolve = settle
    })
    const admissionId = `${deriveProjectOwnerToken(projectId)}:a${String(
      ++admissionSequence
    )}`
    const admission: PendingReplacementAdmission = {
      projectId,
      restartGeneration,
      admissionId,
      canonicalPath,
      ownerToken,
      admittedAt: deadlineScheduler.now(),
      phase: 'launch-pending',
      ownedReported: false,
      resolution,
      resolvedPhase: undefined,
    }
    pendingAdmissionResolvers.set(admissionId, resolve)
    pendingAdmissionOwnedKeys.set(admissionId, new Set<string>())
    pendingAdmissions.set(projectId, admission)
    return admission
  }

  const recordCleanup = (
    projectId: string,
    audit: RuntimeTerminationAudit
  ): void => {
    cleanupOutcomes.set(projectId, Object.freeze({ ...audit }))
  }

  const emit = (event: RuntimeLifecycleEvent): void => {
    recordEvent(serializeRuntimeEvent(event))
  }

  const register = (projectId: string, canonicalPath: string): void => {
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const current = entries.get(projectId)
    if (current !== undefined) {
      if (current.canonicalPath !== canonicalPath)
        throw new RuntimeFailure('canonical-path-invariant')
      return
    }
    entries.set(projectId, {
      state: 'registered',
      projectId,
      canonicalPath,
      released: false,
    })
  }

  const waitForStarting = (
    entry: StartingEntry,
    signal?: AbortSignal
  ): Promise<RuntimeSnapshot> => {
    const waiter = Symbol(entry.projectId)
    entry.waiters.add(waiter)
    let settled = false
    const release = (): void => {
      if (settled) return
      settled = true
      entry.waiters.delete(waiter)
    }
    if (signal?.aborted) {
      release()
      if (entry.waiters.size === 0 && entries.get(entry.projectId) === entry)
        entry.controller.abort(new RuntimeFailure('caller-cancelled'))
      return Promise.reject(new RuntimeFailure('caller-cancelled'))
    }
    return new Promise<RuntimeSnapshot>((resolve, reject) => {
      const cancel = (): void => {
        release()
        if (entry.waiters.size === 0 && entries.get(entry.projectId) === entry)
          entry.controller.abort(new RuntimeFailure('caller-cancelled'))
        reject(new RuntimeFailure('caller-cancelled'))
      }
      signal?.addEventListener('abort', cancel, { once: true })
      entry.operation.then(
        (snapshot) => {
          signal?.removeEventListener('abort', cancel)
          release()
          resolve(snapshot)
        },
        (error: unknown) => {
          signal?.removeEventListener('abort', cancel)
          release()
          reject(error)
        }
      )
    })
  }

  const failEntry = (
    projectId: string,
    canonicalPath: string,
    generation: symbol,
    snapshot: RuntimeSnapshot,
    failure: RuntimeFailure,
    startedAt: number,
    pendingAdmissionId?: string
  ): void => {
    const elapsedMs = Math.max(0, now() - startedAt)
    entries.set(projectId, {
      state: 'failed',
      projectId,
      canonicalPath,
      generation,
      failure,
      snapshot: freezeSnapshot({ ...snapshot, state: 'failed', elapsedMs }),
      ...(pendingAdmissionId === undefined ? {} : { pendingAdmissionId }),
    })
  }

  const transitionRunningToFailed = async (
    entry: RunningEntry,
    failure: RuntimeFailure,
    cleanup: 'terminate' | 'audit'
  ): Promise<Readonly<{ claimed: boolean; failure: RuntimeFailure }>> => {
    if (shuttingDown) {
      return Object.freeze({
        claimed: false,
        failure: new RuntimeFailure('manager-shutdown'),
      })
    }
    const installed = entries.get(entry.projectId)
    if (
      installed !== entry ||
      installed.state !== 'running' ||
      installed.generation !== entry.generation
    ) {
      return Object.freeze({
        claimed: false,
        failure:
          installed?.state === 'failed' &&
          installed.generation === entry.generation
            ? installed.failure
            : failure,
      })
    }

    failEntry(
      entry.projectId,
      entry.canonicalPath,
      entry.generation,
      entry.snapshot,
      failure,
      entry.snapshot.startedAt
    )
    emit({
      event: 'runtime.health.changed',
      projectId: entry.projectId,
      from: 'running',
      to: 'failed',
      elapsedMs: Math.max(0, now() - entry.snapshot.startedAt),
      classification: failure.category,
    })
    const audit =
      cleanup === 'terminate'
        ? await entry.ready.process.terminate(
            config.gracefulShutdownMs,
            config.forceShutdownMs,
            entry.ready.port
          )
        : {
            ...(await entry.ready.process.audit(entry.ready.port)),
            outcome: 'already-absent' as const,
          }
    recordCleanup(entry.projectId, audit)
    return Object.freeze({ claimed: true, failure })
  }

  const reuseOwnershipFailure = (
    current: RunningEntry
  ): RuntimeFailure | undefined => {
    if (shuttingDown) return new RuntimeFailure('manager-shutdown')
    const installed = entries.get(current.projectId)
    if (
      installed === current &&
      installed.state === 'running' &&
      installed.generation === current.generation
    ) {
      return undefined
    }
    if (installed?.state === 'failed') return installed.failure
    return new RuntimeFailure('runtime-stopping')
  }

  const stop = async (input: {
    readonly projectId: string
  }): Promise<RuntimeStopOutcome> => {
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'not-registered',
      })
    }
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }

    const current = entries.get(input.projectId)
    if (
      current === undefined ||
      (current.state === 'registered' && !current.released)
    ) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    if (current.state === 'registered') {
      return Object.freeze({
        outcome: 'already-stopped',
        projectId: input.projectId,
      })
    }
    if (current.state === 'starting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'start-in-progress',
      })
    }
    if (current.state === 'failed') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'failure-retained',
      })
    }
    if (current.state === 'restarting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'restart-in-progress',
      })
    }
    if (current.state === 'stopping') return current.operation

    let stopping!: StoppingEntry
    const terminationController = new AbortController()
    const deadlineController = new AbortController()
    const installUnconfirmedFailure = (): void => {
      if (entries.get(input.projectId) !== stopping) {
        throw new RuntimeStopInvariantError()
      }
      const failure = new RuntimeFailure('stop-unconfirmed')
      failEntry(
        stopping.projectId,
        stopping.canonicalPath,
        stopping.generation,
        stopping.snapshot,
        failure,
        stopping.snapshot.startedAt
      )
      emit({
        event: 'runtime.health.changed',
        projectId: stopping.projectId,
        from: 'stopping',
        to: 'failed',
        elapsedMs: Math.max(0, now() - stopping.snapshot.startedAt),
        classification: failure.category,
      })
    }

    const operation = Promise.resolve().then(
      async (): Promise<RuntimeStopOutcome> => {
        const termination = stopping.ready.process.terminate(
          config.gracefulShutdownMs,
          config.forceShutdownMs,
          stopping.ready.port,
          terminationController.signal
        )
        const boundedTermination = termination.then((audit) =>
          Object.freeze({ kind: 'audit' as const, audit })
        )
        const deadline = processDependencies
          .sleep(runtimeStopOverallBoundMs(config), deadlineController.signal)
          .then(() => Object.freeze({ kind: 'deadline' as const }))

        try {
          const result = await Promise.race([boundedTermination, deadline])
          if (result.kind === 'deadline') {
            terminationController.abort()
            void termination.then(
              () => {
                lateTerminationSettlements += 1
              },
              () => {
                lateTerminationSettlements += 1
              }
            )
            installUnconfirmedFailure()
            return Object.freeze({
              outcome: 'rejected',
              projectId: stopping.projectId,
              category: 'stop-unconfirmed',
            })
          }

          deadlineController.abort()
          if (entries.get(input.projectId) !== stopping) {
            throw new RuntimeStopInvariantError()
          }
          recordCleanup(stopping.projectId, result.audit)
          if (
            result.audit.processAbsent &&
            result.audit.processGroupAbsent &&
            result.audit.listenerAbsent
          ) {
            const key = ownershipKey(stopping.ready)
            const record = ownership.get(key)
            if (record?.generation === stopping.generation)
              ownership.delete(key)
            entries.set(stopping.projectId, {
              state: 'registered',
              projectId: stopping.projectId,
              canonicalPath: stopping.canonicalPath,
              released: true,
            })
            emit({
              event: 'runtime.stop.succeeded',
              projectId: stopping.projectId,
              from: 'stopping',
              to: 'stopped',
              elapsedMs: Math.max(0, now() - stopping.snapshot.startedAt),
            })
            return Object.freeze({
              outcome: 'stopped',
              projectId: stopping.projectId,
              release: result.audit.outcome,
              audit: result.audit,
            })
          }

          installUnconfirmedFailure()
          return Object.freeze({
            outcome: 'rejected',
            projectId: stopping.projectId,
            category: 'stop-unconfirmed',
            release: result.audit.outcome,
            audit: result.audit,
          })
        } catch (error) {
          deadlineController.abort()
          terminationController.abort()
          if (error instanceof RuntimeStopInvariantError) throw error
          installUnconfirmedFailure()
          throw error
        }
      }
    )

    stopping = {
      state: 'stopping',
      projectId: current.projectId,
      canonicalPath: current.canonicalPath,
      generation: current.generation,
      ready: current.ready,
      snapshot: current.snapshot,
      operation,
    }
    entries.set(input.projectId, stopping)
    emit({
      event: 'runtime.stop.requested',
      projectId: input.projectId,
      from: 'running',
      to: 'stopping',
      elapsedMs: Math.max(0, now() - current.snapshot.startedAt),
    })
    stopTasks.add(operation)
    void operation.then(
      () => stopTasks.delete(operation),
      () => stopTasks.delete(operation)
    )
    return operation
  }

  const restart = async (input: {
    readonly projectId: string
  }): Promise<RuntimeRestartOutcome> => {
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'not-registered',
      })
    }
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }

    const current = entries.get(input.projectId)
    if (current === undefined || current.state === 'registered') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    if (current.state === 'starting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'start-in-progress',
      })
    }
    if (current.state === 'stopping') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'stop-in-progress',
      })
    }
    if (current.state === 'restarting') return current.operation

    const priorAdmission = pendingAdmissions.get(input.projectId)
    const priorReady = ownedReadyFor(current)
    if (current.state === 'running' && priorReady === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    const requiresQuarantineResolution =
      priorAdmission !== undefined ||
      quarantineForProject(input.projectId).length > 0
    const releaseBoundMs = requiresQuarantineResolution
      ? runtimeRestartReleaseBoundMs(config)
      : runtimeStopOverallBoundMs(config)
    const overallBoundMs = runtimeRestartOverallBoundMs(
      config,
      requiresQuarantineResolution
    )

    const generation = Symbol(input.projectId)
    const phaseController = new AbortController()
    const phaseAbort = abortedPromise(phaseController.signal)
    const startedAt = now()
    const stableRoute = stableProjectRoute(input.projectId)
    const ownerToken = deriveProjectOwnerToken(input.projectId)
    const restartingSnapshot = freezeSnapshot({
      projectId: input.projectId,
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: current.canonicalPath,
      stableRoute,
      ownerToken,
      startedAt,
      elapsedMs: 0,
    })
    let restarting!: RestartingEntry
    let operationSettled = false
    let gateConfirmed = false
    let replacementBlockReason: RuntimeFailure | undefined
    const replacementAttemptAudits = new Map<string, RuntimeTerminationAudit>()
    const lastReplacementAudit = (): RuntimeTerminationAudit | undefined =>
      [...replacementAttemptAudits.values()].at(-1)

    let fireReleaseDeadline!: () => void
    const releaseDeadline = new Promise<Readonly<{ kind: 'release-deadline' }>>(
      (resolve) => {
        fireReleaseDeadline = () =>
          resolve(Object.freeze({ kind: 'release-deadline' }))
      }
    )
    let fireOverallDeadline!: () => void
    const overallDeadline = new Promise<Readonly<{ kind: 'overall-deadline' }>>(
      (resolve) => {
        fireOverallDeadline = () =>
          resolve(Object.freeze({ kind: 'overall-deadline' }))
      }
    )
    const cancelReleaseDeadline = deadlineScheduler.scheduleDeadline(
      releaseBoundMs,
      fireReleaseDeadline
    )
    const cancelOverallDeadline = deadlineScheduler.scheduleDeadline(
      overallBoundMs,
      fireOverallDeadline
    )

    const installFailure = (
      failure: RuntimeFailure,
      snapshot: RuntimeSnapshot = restartingSnapshot,
      failureGeneration: symbol = generation,
      pendingAdmissionId?: string
    ): void => {
      if (entries.get(input.projectId) !== restarting)
        throw new RuntimeRestartInvariantError()
      operationSettled = true
      failEntry(
        input.projectId,
        current.canonicalPath,
        failureGeneration,
        snapshot,
        failure,
        startedAt,
        pendingAdmissionId
      )
      emit({
        event: 'runtime.restart.failed',
        projectId: input.projectId,
        from: 'restarting',
        to: 'failed',
        elapsedMs: Math.max(0, now() - startedAt),
        classification: failure.category,
      })
    }

    const releaseFailure = (): RuntimeFailure =>
      new RuntimeFailure('restart-release-unconfirmed', {
        timeoutMs: releaseBoundMs,
      })

    const releaseFailureOutcome = (
      failure: RuntimeFailure,
      audit?: RuntimeTerminationAudit
    ): RuntimeRestartOutcome => {
      if (!phaseController.signal.aborted) phaseController.abort(failure)
      installFailure(
        failure,
        current.snapshot,
        current.generation,
        priorAdmission?.admissionId
      )
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'release-unconfirmed',
        failureCategory: failure.category,
        ...(audit === undefined ? {} : { release: audit.outcome, audit }),
      })
    }

    const operation = Promise.resolve().then(
      async (): Promise<RuntimeRestartOutcome> => {
        const deadlineFailure = new RuntimeFailure(
          'restart-deadline-exceeded',
          { timeoutMs: overallBoundMs }
        )

        try {
          if (
            priorAdmission !== undefined ||
            quarantineForProject(input.projectId).length > 0
          ) {
            const releasePriorAdmission = async (): Promise<
              Readonly<{ kind: 'released' }>
            > => {
              await reclaimProjectQuarantine(input.projectId)
              const installedAdmission = pendingAdmissions.get(input.projectId)
              if (installedAdmission !== undefined) {
                await installedAdmission.resolution
                if (
                  installedAdmission.phase === 'absent-confirmed' ||
                  installedAdmission.phase === 'audited-absent'
                )
                  finishAdmission(installedAdmission)
              }
              if (quarantineForProject(input.projectId).length > 0)
                await new Promise<void>(() => undefined)
              return Object.freeze({ kind: 'released' })
            }
            const admissionResult = await Promise.race([
              releasePriorAdmission(),
              releaseDeadline,
              overallDeadline,
              phaseAbort.promise,
            ])
            if (admissionResult.kind === 'phase-aborted') {
              const failure =
                admissionResult.reason instanceof RuntimeFailure
                  ? admissionResult.reason
                  : new RuntimeFailure('manager-shutdown')
              installFailure(
                failure,
                current.snapshot,
                current.generation,
                priorAdmission?.admissionId
              )
              return Object.freeze({
                outcome: 'rejected',
                projectId: input.projectId,
                category:
                  failure.category === 'manager-shutdown'
                    ? 'manager-shutdown'
                    : 'release-unconfirmed',
                failureCategory: failure.category,
              })
            }
            if (
              admissionResult.kind === 'release-deadline' ||
              admissionResult.kind === 'overall-deadline'
            )
              return releaseFailureOutcome(releaseFailure())
          }

          let releaseAudit: RuntimeTerminationAudit | undefined
          if (priorReady !== undefined) {
            const release = priorReady.process.terminate(
              config.gracefulShutdownMs,
              config.forceShutdownMs,
              priorReady.port,
              phaseController.signal
            )
            const boundedRelease = release.then(
              (audit) => Object.freeze({ kind: 'audit' as const, audit }),
              (error: unknown) =>
                Object.freeze({ kind: 'release-fault' as const, error })
            )
            const releaseResult = await Promise.race([
              boundedRelease,
              releaseDeadline,
              overallDeadline,
              phaseAbort.promise,
            ])
            if (releaseResult.kind === 'phase-aborted') {
              void release.then(
                () => {
                  lateTerminationSettlements += 1
                },
                () => {
                  lateTerminationSettlements += 1
                }
              )
              const failure =
                releaseResult.reason instanceof RuntimeFailure
                  ? releaseResult.reason
                  : new RuntimeFailure('manager-shutdown')
              installFailure(
                failure,
                current.snapshot,
                current.generation,
                priorAdmission?.admissionId
              )
              return Object.freeze({
                outcome: 'rejected',
                projectId: input.projectId,
                category:
                  failure.category === 'manager-shutdown'
                    ? 'manager-shutdown'
                    : 'release-unconfirmed',
                failureCategory: failure.category,
              })
            }
            if (
              releaseResult.kind === 'release-deadline' ||
              releaseResult.kind === 'overall-deadline'
            ) {
              const failure = releaseFailure()
              phaseController.abort(failure)
              void release.then(
                () => {
                  lateTerminationSettlements += 1
                },
                () => {
                  lateTerminationSettlements += 1
                }
              )
              return releaseFailureOutcome(failure)
            }
            if (releaseResult.kind === 'release-fault') {
              const failure = releaseFailure()
              releaseFailureOutcome(failure)
              throw releaseResult.error
            }
            releaseAudit = releaseResult.audit
            recordCleanup(input.projectId, releaseAudit)
            if (!auditConfirmsAbsence(releaseAudit)) {
              return releaseFailureOutcome(
                new RuntimeFailure('restart-release-unconfirmed'),
                releaseAudit
              )
            }
            const priorKey = ownershipKey(priorReady)
            const priorRecord = ownership.get(priorKey)
            if (priorRecord?.generation === current.generation)
              ownership.delete(priorKey)
          }
          gateConfirmed = true
          cancelReleaseDeadline()
          if (phaseController.signal.aborted) {
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : new RuntimeFailure('manager-shutdown')
            installFailure(failure)
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                failure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: failure.category,
            })
          }

          const admission = createPendingAdmission(
            input.projectId,
            generation,
            current.canonicalPath,
            ownerToken
          )
          const restartOnOwned = (record: RuntimeOwnershipRecord): void => {
            const managed: ManagedOwnership = {
              projectId: input.projectId,
              generation,
              ...record,
            }
            const key = ownershipKey(record)
            admission.ownedReported = true
            admissionOwnedKeys(admission).add(key)
            if (
              !operationSettled &&
              entries.get(input.projectId) === restarting
            ) {
              registerOwnership(input.projectId, generation, record)
              return
            }
            quarantineOwnership(admission, managed)
          }
          const restartOnCleanup = (audit: RuntimeTerminationAudit): void => {
            const identityKey = [
              audit.pid,
              audit.processStartTime,
              audit.port,
            ].join(':')
            replacementAttemptAudits.set(
              identityKey,
              Object.freeze({ ...audit })
            )
            const quarantineEntry = quarantineForProject(input.projectId).find(
              ([, record]) =>
                record.admissionId === admission.admissionId &&
                ownershipKey(record) === identityKey
            )
            const owned = ownership.get(identityKey)
            const active =
              !operationSettled && entries.get(input.projectId) === restarting
            if (auditConfirmsAbsence(audit)) {
              if (owned?.generation === generation)
                ownership.delete(identityKey)
              if (quarantineEntry !== undefined)
                removeConfirmedQuarantine(
                  quarantineEntry[0],
                  quarantineEntry[1]
                )
              admissionOwnedKeys(admission).delete(identityKey)
              maybeFinishDetachedAdmission(admission)
              return
            }
            const record =
              owned?.generation === generation ? owned : quarantineEntry?.[1]
            if (record === undefined) throw new RuntimeRestartInvariantError()
            quarantineOwnership(
              admission,
              record,
              'audited-unconfirmed',
              1,
              audit
            )
            if (!active) return
            const failure = new RuntimeFailure(
              'restart-replacement-unconfirmed'
            )
            replacementBlockReason = failure
            phaseController.abort(failure)
          }

          const launchPromise = launch({
            config,
            canonicalPath: current.canonicalPath,
            ownerToken,
            signal: phaseController.signal,
            dependencies: processDependencies,
            onOwned: restartOnOwned,
            onCleanup: restartOnCleanup,
          })
          const launchResult = await Promise.race([
            launchPromise.then(
              (ready) => Object.freeze({ kind: 'ready' as const, ready }),
              (error: unknown) =>
                Object.freeze({ kind: 'failure' as const, error })
            ),
            overallDeadline,
            phaseAbort.promise,
          ])

          if (
            launchResult.kind === 'overall-deadline' ||
            launchResult.kind === 'phase-aborted'
          ) {
            if (launchResult.kind === 'overall-deadline')
              phaseController.abort(deadlineFailure)
            if (!gateConfirmed) return releaseFailureOutcome(releaseFailure())
            const settlementFailure =
              launchResult.kind === 'phase-aborted' &&
              launchResult.reason instanceof RuntimeFailure
                ? launchResult.reason
                : phaseController.signal.reason instanceof RuntimeFailure
                  ? phaseController.signal.reason
                  : deadlineFailure
            detachedAdmissionIds.add(admission.admissionId)
            for (const identityKey of [...admissionOwnedKeys(admission)]) {
              const record = ownership.get(identityKey)
              if (record !== undefined) quarantineOwnership(admission, record)
            }
            const replacementAudit = lastReplacementAudit()
            if (replacementAudit !== undefined)
              recordCleanup(input.projectId, replacementAudit)
            installFailure(
              settlementFailure,
              restartingSnapshot,
              generation,
              admission.admissionId
            )
            void launchPromise.then(
              async (ready) => {
                lateReplacementSettlements += 1
                const identityKey = ownershipKey(ready)
                if (!admissionOwnedKeys(admission).has(identityKey))
                  restartOnOwned(ready)
                const entry = quarantineForProject(input.projectId).find(
                  ([, record]) =>
                    record.admissionId === admission.admissionId &&
                    ownershipKey(record) === identityKey
                )
                if (entry !== undefined) await reclaimQuarantine(entry[0])
                maybeFinishDetachedAdmission(admission)
              },
              () => {
                lateReplacementSettlements += 1
                if (!admission.ownedReported) {
                  admission.phase = 'absent-confirmed'
                } else if (
                  admissionOwnedKeys(admission).size === 0 &&
                  quarantineForProject(input.projectId).every(
                    ([, record]) => record.admissionId !== admission.admissionId
                  )
                ) {
                  admission.phase = 'audited-absent'
                }
                maybeFinishDetachedAdmission(admission)
              }
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                settlementFailure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: settlementFailure.category,
              ...(releaseAudit === undefined
                ? {}
                : {
                    release: releaseAudit.outcome,
                    audit: releaseAudit,
                  }),
            })
          }

          if (launchResult.kind === 'failure') {
            for (const identityKey of [...admissionOwnedKeys(admission)]) {
              const record = ownership.get(identityKey)
              if (record !== undefined) quarantineOwnership(admission, record)
            }
            if (
              admissionOwnedKeys(admission).size === 0 &&
              quarantineForProject(input.projectId).every(
                ([, record]) => record.admissionId !== admission.admissionId
              )
            )
              admission.phase = admission.ownedReported
                ? 'audited-absent'
                : 'absent-confirmed'
            resolveAdmission(admission)
            maybeFinishDetachedAdmission(admission)
            const replacementAudit = lastReplacementAudit()
            if (replacementAudit !== undefined)
              recordCleanup(input.projectId, replacementAudit)
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : (replacementBlockReason ??
                  (launchResult.error instanceof RuntimeFailure
                    ? launchResult.error
                    : undefined))
            if (failure === undefined) {
              installFailure(
                new RuntimeFailure('spawn-error'),
                restartingSnapshot,
                generation,
                pendingAdmissions.get(input.projectId)?.admissionId
              )
              throw launchResult.error
            }
            installFailure(
              failure,
              restartingSnapshot,
              generation,
              pendingAdmissions.get(input.projectId)?.admissionId
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category: 'replacement-failed',
              failureCategory: failure.category,
              ...(releaseAudit === undefined
                ? {}
                : {
                    release: releaseAudit.outcome,
                    audit: releaseAudit,
                  }),
            })
          }

          const ready = launchResult.ready
          const replacementKey = ownershipKey(ready)
          if (!admissionOwnedKeys(admission).has(replacementKey))
            restartOnOwned(ready)
          if (
            shuttingDown ||
            phaseController.signal.reason instanceof RuntimeFailure
          ) {
            detachedAdmissionIds.add(admission.admissionId)
            const record = ownership.get(replacementKey)
            if (record !== undefined)
              await reclaimQuarantine(quarantineOwnership(admission, record))
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : new RuntimeFailure('manager-shutdown')
            installFailure(
              failure,
              restartingSnapshot,
              generation,
              pendingAdmissions.get(input.projectId)?.admissionId
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                failure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: failure.category,
            })
          }

          const replacementAudit = lastReplacementAudit()
          if (replacementAudit !== undefined)
            recordCleanup(input.projectId, replacementAudit)
          admissionOwnedKeys(admission).delete(replacementKey)
          admission.phase = 'absent-confirmed'
          finishAdmission(admission)
          const snapshot = freezeSnapshot({
            projectId: input.projectId,
            state: 'running',
            pid: ready.process.pid,
            processStartTime: ready.process.processStartTime,
            internalUrl: ready.internalUrl,
            port: ready.port,
            canonicalPath: current.canonicalPath,
            stableRoute,
            ownerToken,
            startedAt,
            elapsedMs: Math.max(0, now() - startedAt),
          })
          const entry: RunningEntry = {
            state: 'running',
            projectId: input.projectId,
            canonicalPath: current.canonicalPath,
            generation,
            ready,
            snapshot,
          }
          if (entries.get(input.projectId) !== restarting)
            throw new RuntimeRestartInvariantError()
          operationSettled = true
          entries.set(input.projectId, entry)
          emit({
            event: 'runtime.restart.succeeded',
            projectId: input.projectId,
            from: 'restarting',
            to: 'running',
            elapsedMs: snapshot.elapsedMs,
          })
          const exitTask = ready.process.exit.then(async (exit) => {
            const failure = new RuntimeFailure(
              exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
              exit.signal === null
                ? { exitCode: exit.code ?? -1 }
                : { signal: exit.signal }
            )
            await transitionRunningToFailed(entry, failure, 'audit')
          })
          backgroundTasks.add(exitTask)
          void exitTask.then(
            () => {
              backgroundTasks.delete(exitTask)
              backgroundTaskSettlements += 1
            },
            () => {
              backgroundTasks.delete(exitTask)
              backgroundTaskSettlements += 1
            }
          )
          return Object.freeze({
            outcome: 'restarted',
            projectId: input.projectId,
            ...(priorReady === undefined
              ? {}
              : { priorIdentity: runtimeIdentity(priorReady) }),
            replacementIdentity: runtimeIdentity(ready),
            ...(releaseAudit === undefined
              ? {}
              : {
                  release: releaseAudit.outcome,
                  audit: releaseAudit,
                }),
          })
        } finally {
          phaseAbort.cancel()
          cancelReleaseDeadline()
          cancelOverallDeadline()
        }
      }
    )

    restarting = {
      state: 'restarting',
      projectId: input.projectId,
      canonicalPath: current.canonicalPath,
      generation,
      snapshot: restartingSnapshot,
      operation,
      controller: phaseController,
    }
    entries.set(input.projectId, restarting)
    emit({
      event: 'runtime.restart.requested',
      projectId: input.projectId,
      from: current.state,
      to: 'restarting',
      elapsedMs: Math.max(0, now() - current.snapshot.startedAt),
    })
    restartTasks.add(operation)
    void operation.then(
      () => restartTasks.delete(operation),
      () => restartTasks.delete(operation)
    )
    return operation
  }

  const start = async (
    input: ProjectRuntimeStartInput
  ): Promise<RuntimeSnapshot> => {
    if (input.signal?.aborted) throw new RuntimeFailure('caller-cancelled')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) throw new RuntimeFailure('unknown-project')
    if (persisted.canonicalPath !== input.canonicalPath)
      throw new RuntimeFailure('canonical-path-invariant')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')

    register(input.projectId, input.canonicalPath)
    const current = entries.get(input.projectId)
    if (current?.state === 'starting')
      return waitForStarting(current, input.signal)

    if (current?.state === 'running') {
      const alive = await current.ready.process.isAlive()
      const livenessOwnershipFailure = reuseOwnershipFailure(current)
      if (livenessOwnershipFailure !== undefined) throw livenessOwnershipFailure
      if (alive) {
        const healthController = new AbortController()
        const verdict = await processDependencies.health.check(
          current.ready.internalUrl + PROJECT_RUNTIME_DEFAULTS.healthPath,
          config.healthAttemptTimeoutMs,
          healthController.signal
        )
        const healthOwnershipFailure = reuseOwnershipFailure(current)
        if (healthOwnershipFailure !== undefined) throw healthOwnershipFailure
        if (
          verdict.status === PROJECT_RUNTIME_DEFAULTS.healthStatus &&
          verdict.bodyStatus !== null &&
          PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses.includes(
            verdict.bodyStatus as 'alive' | 'expired'
          )
        ) {
          if (input.signal?.aborted)
            throw new RuntimeFailure('caller-cancelled')
          return current.snapshot
        }
        const failure = new RuntimeFailure(
          verdict.status !== PROJECT_RUNTIME_DEFAULTS.healthStatus
            ? 'health-status-unexpected'
            : 'health-body-unexpected',
          verdict.status === null ? {} : { healthStatus: verdict.status }
        )
        const result = await transitionRunningToFailed(
          current,
          failure,
          'terminate'
        )
        throw result.failure
      }
      const failure = new RuntimeFailure('early-exit-code', { exitCode: -1 })
      const result = await transitionRunningToFailed(
        current,
        failure,
        'terminate'
      )
      throw result.failure
    }
    if (current?.state === 'stopping')
      throw new RuntimeFailure('runtime-stopping')
    if (current?.state === 'restarting')
      throw new RuntimeFailure('runtime-restarting')

    const generation = Symbol(input.projectId)
    const controller = new AbortController()
    const startedAt = now()
    const stableRoute = stableProjectRoute(input.projectId)
    const ownerToken = deriveProjectOwnerToken(input.projectId)
    const startingSnapshot = freezeSnapshot({
      projectId: input.projectId,
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: input.canonicalPath,
      stableRoute,
      ownerToken,
      startedAt,
      elapsedMs: 0,
    })
    emit({
      event: 'runtime.start.requested',
      projectId: input.projectId,
      from: current?.state === 'failed' ? 'failed' : 'stopped',
      to: 'starting',
      elapsedMs: 0,
    })

    let starting!: StartingEntry
    const operation = Promise.resolve().then(async () => {
      try {
        const ready = await launch({
          config,
          canonicalPath: input.canonicalPath,
          ownerToken,
          signal: controller.signal,
          dependencies: processDependencies,
          onOwned: (record) =>
            registerOwnership(input.projectId, generation, record),
          onCleanup: (audit) => recordCleanup(input.projectId, audit),
        })
        registerOwnership(input.projectId, generation, ready)
        if (shuttingDown || controller.signal.aborted) {
          recordCleanup(
            input.projectId,
            await ready.process.terminate(
              config.gracefulShutdownMs,
              config.forceShutdownMs,
              ready.port
            )
          )
          throw new RuntimeFailure(
            shuttingDown ? 'manager-shutdown' : 'caller-cancelled'
          )
        }
        const snapshot = freezeSnapshot({
          projectId: input.projectId,
          state: 'running',
          pid: ready.process.pid,
          processStartTime: ready.process.processStartTime,
          internalUrl: ready.internalUrl,
          port: ready.port,
          canonicalPath: input.canonicalPath,
          stableRoute,
          ownerToken,
          startedAt,
          elapsedMs: Math.max(0, now() - startedAt),
        })
        const entry: RunningEntry = {
          state: 'running',
          projectId: input.projectId,
          canonicalPath: input.canonicalPath,
          generation,
          ready,
          snapshot,
        }
        entries.set(input.projectId, entry)
        emit({
          event: 'runtime.start.succeeded',
          projectId: input.projectId,
          from: 'starting',
          to: 'running',
          elapsedMs: snapshot.elapsedMs,
        })
        const exitTask = ready.process.exit.then(async (exit) => {
          const failure = new RuntimeFailure(
            exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
            exit.signal === null
              ? { exitCode: exit.code ?? -1 }
              : { signal: exit.signal }
          )
          await transitionRunningToFailed(entry, failure, 'audit')
        })
        backgroundTasks.add(exitTask)
        void exitTask.then(
          () => {
            backgroundTasks.delete(exitTask)
            backgroundTaskSettlements += 1
          },
          () => {
            backgroundTasks.delete(exitTask)
            backgroundTaskSettlements += 1
          }
        )
        return snapshot
      } catch (error) {
        const failure =
          error instanceof RuntimeFailure
            ? error
            : new RuntimeFailure('spawn-error')
        if (!shuttingDown) {
          failEntry(
            input.projectId,
            input.canonicalPath,
            generation,
            startingSnapshot,
            failure,
            startedAt
          )
        }
        emit({
          event: 'runtime.start.failed',
          projectId: input.projectId,
          from: 'starting',
          to: 'failed',
          elapsedMs: Math.max(0, now() - startedAt),
          classification: failure.category,
        })
        throw failure
      }
    })
    completionTasks.add(operation)
    void operation.then(
      () => {
        completionTasks.delete(operation)
        completionTaskSettlements += 1
      },
      () => {
        completionTasks.delete(operation)
        completionTaskSettlements += 1
      }
    )
    starting = {
      state: 'starting',
      projectId: input.projectId,
      canonicalPath: input.canonicalPath,
      generation,
      controller,
      snapshot: startingSnapshot,
      operation,
      waiters: new Set(),
    }
    entries.set(input.projectId, starting)
    return waitForStarting(starting, input.signal)
  }

  const shutdown = (): Promise<RuntimeShutdownResult> => {
    shutdownPromise ??= (async () => {
      shuttingDown = true
      const entriesAtShutdown = [...entries.values()]
      for (const entry of entriesAtShutdown)
        if (entry.state === 'starting' || entry.state === 'restarting')
          entry.controller.abort(new RuntimeFailure('manager-shutdown'))
      await Promise.allSettled([...restartTasks])
      const terminationOutcomes = new Map<string, RuntimeTerminationAudit>()
      await Promise.all(
        entriesAtShutdown.map(async (entry) => {
          if (entry.state !== 'running') return
          const audit = await entry.ready.process.terminate(
            config.gracefulShutdownMs,
            config.forceShutdownMs,
            entry.ready.port
          )
          terminationOutcomes.set(ownershipKey(entry.ready), audit)
          recordCleanup(entry.projectId, audit)
        })
      )
      await Promise.allSettled(
        entriesAtShutdown
          .filter((entry): entry is StartingEntry => entry.state === 'starting')
          .map((entry) => entry.operation)
      )
      await Promise.allSettled([...stopTasks])
      for (const record of ownership.values()) {
        const key = ownershipKey(record)
        if (terminationOutcomes.has(key)) continue
        const prior = cleanupOutcomes.get(record.projectId)
        if (
          prior !== undefined &&
          [prior.pid, prior.processStartTime, prior.port].join(':') === key &&
          prior.processAbsent &&
          prior.processGroupAbsent &&
          prior.listenerAbsent
        ) {
          terminationOutcomes.set(key, prior)
          continue
        }
        const audit = await record.process.terminate(
          config.gracefulShutdownMs,
          config.forceShutdownMs,
          record.port
        )
        terminationOutcomes.set(key, audit)
        recordCleanup(record.projectId, audit)
      }
      const audited: ProjectRuntimeTerminationAudit[] = []
      for (const [key, record] of ownership) {
        const resource: RuntimeResourceAudit = await record.process.audit(
          record.port
        )
        const termination = terminationOutcomes.get(key)
        audited.push(
          Object.freeze({
            ...resource,
            outcome: termination?.outcome ?? 'already-absent',
            projectToken: deriveProjectOwnerToken(record.projectId),
          })
        )
      }
      for (const [key, record] of quarantinedOwnership) {
        await reclaimQuarantine(key)
        const audit = quarantineCleanups.get(key)
        if (audit !== undefined)
          audited.push(
            Object.freeze({
              ...audit,
              projectToken: deriveProjectOwnerToken(record.projectId),
            })
          )
      }
      // Completion operations can register ownership, and process-exit handlers can
      // mutate entries. Await both tracked sets until their own settlement
      // handlers remove every task; zero is observed rather than assigned.
      while (completionTasks.size > 0 || backgroundTasks.size > 0) {
        await Promise.allSettled([...completionTasks, ...backgroundTasks])
        await Promise.resolve()
      }
      for (const entry of entriesAtShutdown)
        if (entries.get(entry.projectId) === entry || shuttingDown)
          entries.delete(entry.projectId)
      for (const key of ownership.keys()) ownership.delete(key)
      for (const admission of [...pendingAdmissions.values()]) {
        if (
          admission.phase !== 'launch-pending' &&
          quarantineForProject(admission.projectId).length === 0
        ) {
          admission.phase = admission.ownedReported
            ? 'audited-absent'
            : 'absent-confirmed'
          finishAdmission(admission)
        }
      }
      const unresolvedAdmissions = Object.freeze(
        [...pendingAdmissions.values()].map((admission) =>
          Object.freeze({
            projectToken: deriveProjectOwnerToken(admission.projectId),
            admissionId: admission.admissionId,
            phase: admission.phase,
          })
        )
      )
      shutdownResult = Object.freeze({
        status:
          audited.every((audit) => auditConfirmsAbsence(audit)) &&
          unresolvedAdmissions.length === 0 &&
          quarantinedOwnership.size === 0
            ? 'ok'
            : 'failed',
        audits: Object.freeze(audited),
        unresolvedAdmissions,
      })
      return shutdownResult
    })()
    return shutdownPromise
  }

  return {
    register,
    start,
    stop,
    restart,
    reportPublicStates(projectIds) {
      return Object.freeze(
        projectIds.map((projectId) => {
          const entry = entries.get(projectId)
          const state = publicRuntimeState(entry?.state)
          return Object.freeze({
            projectId,
            state,
            ...(state === 'Failed' && entry?.state === 'failed'
              ? { failureCategory: entry.failure.category }
              : {}),
          })
        })
      )
    },
    inspect(projectId) {
      const entry = entries.get(projectId)
      return entry !== undefined && entry.state !== 'registered'
        ? entry.snapshot
        : undefined
    },
    ownsSnapshot(snapshot) {
      const entry = entries.get(snapshot.projectId)
      return entry?.state === 'running' && entry.snapshot === snapshot
    },
    inspectEntries() {
      return Object.freeze(
        [...entries.values()].map((entry) =>
          Object.freeze({
            projectId: entry.projectId,
            projectToken: deriveProjectOwnerToken(entry.projectId),
            canonicalPath: entry.canonicalPath,
            state: entry.state,
            ...(entry.state === 'registered'
              ? {}
              : { snapshot: entry.snapshot }),
            ...(entry.state === 'failed' &&
            entry.pendingAdmissionId !== undefined
              ? {
                  pendingAdmissionId: entry.pendingAdmissionId,
                  ...(pendingAdmissions.get(entry.projectId)?.phase ===
                  undefined
                    ? {}
                    : {
                        pendingAdmissionPhase: pendingAdmissions.get(
                          entry.projectId
                        )!.phase,
                      }),
                }
              : {}),
            waiterCount: entry.state === 'starting' ? entry.waiters.size : 0,
          })
        )
      )
    },
    audit() {
      return Object.freeze({
        shuttingDown,
        entryCount: entries.size,
        startingEntries: [...entries.values()].filter(
          (entry) => entry.state === 'starting'
        ).length,
        ownershipRecords: ownership.size,
        completionTasks: completionTasks.size,
        backgroundTasks: backgroundTasks.size,
        stopTasks: stopTasks.size,
        restartTasks: restartTasks.size,
        pendingAdmissions: pendingAdmissions.size,
        quarantinedOwnershipRecords: quarantinedOwnership.size,
        quarantineCleanupRecords: quarantineCleanups.size,
        admissionResolutions,
        completionTaskSettlements,
        backgroundTaskSettlements,
        lateTerminationSettlements,
        lateReplacementSettlements,
      })
    },
    lastFailure(projectId) {
      const entry = entries.get(projectId)
      return entry?.state === 'failed' ? entry.failure : undefined
    },
    lastCleanup(projectId) {
      return cleanupOutcomes.get(projectId)
    },
    lastShutdown() {
      return shutdownResult
    },
    shutdown,
  }
}
