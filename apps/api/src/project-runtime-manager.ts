import type { Project } from './project-persistence.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeFailure,
  RuntimeStopInvariantError,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  publicRuntimeState,
  runtimeStopOverallBoundMs,
  serializeRuntimeEvent,
  stableProjectRoute,
  type PublicRuntimeReport,
  type ProjectRuntimeConfig,
  type RuntimeEntryState,
  type RuntimeLifecycleEvent,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
  type RuntimeStopOutcome,
} from './project-runtime-contract.js'
import {
  defaultRuntimeProcessDependencies,
  launchReadyRuntime,
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

export interface ProjectRuntimeTerminationAudit extends RuntimeTerminationAudit {
  readonly projectToken: string
}

export interface RuntimeShutdownResult {
  readonly status: 'ok' | 'failed'
  readonly audits: readonly ProjectRuntimeTerminationAudit[]
}

export type ProjectRuntimeEntryState = RuntimeEntryState

export interface ProjectRuntimeEntryInspection {
  readonly projectId: string
  readonly projectToken: string
  readonly canonicalPath: string
  readonly state: ProjectRuntimeEntryState
  readonly snapshot?: RuntimeSnapshot
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
}

export interface ProjectRuntimeManager {
  register(projectId: string, canonicalPath: string): void
  start(input: ProjectRuntimeStartInput): Promise<RuntimeSnapshot>
  stop(input: { readonly projectId: string }): Promise<RuntimeStopOutcome>
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
}

type ProjectRuntimeEntry =
  RegisteredEntry | StartingEntry | RunningEntry | StoppingEntry | FailedEntry

interface ManagedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly generation: symbol
}

const freezeSnapshot = (snapshot: RuntimeSnapshot): RuntimeSnapshot =>
  Object.freeze(snapshot)

export function createProjectRuntimeManager(
  dependencies: ProjectRuntimeManagerDependencies
): ProjectRuntimeManager {
  const config = dependencies.config ?? createProjectRuntimeConfig()
  const processDependencies =
    dependencies.processDependencies ?? defaultRuntimeProcessDependencies
  const launch = dependencies.launch ?? launchReadyRuntime
  const now = dependencies.now ?? Date.now
  const recordEvent = dependencies.recordEvent ?? (() => undefined)
  const entries = new Map<string, ProjectRuntimeEntry>()
  const cleanupOutcomes = new Map<string, RuntimeTerminationAudit>()
  const ownership = new Map<string, ManagedOwnership>()
  const completionTasks = new Set<Promise<RuntimeSnapshot>>()
  const backgroundTasks = new Set<Promise<void>>()
  const stopTasks = new Set<Promise<RuntimeStopOutcome>>()
  let completionTaskSettlements = 0
  let backgroundTaskSettlements = 0
  let lateTerminationSettlements = 0
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
    startedAt: number
  ): void => {
    const elapsedMs = Math.max(0, now() - startedAt)
    entries.set(projectId, {
      state: 'failed',
      projectId,
      canonicalPath,
      generation,
      failure,
      snapshot: freezeSnapshot({ ...snapshot, state: 'failed', elapsedMs }),
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
        if (entry.state === 'starting')
          entry.controller.abort(new RuntimeFailure('manager-shutdown'))
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
      shutdownResult = Object.freeze({
        status: audited.every(
          (audit) =>
            audit.processAbsent &&
            audit.processGroupAbsent &&
            audit.listenerAbsent
        )
          ? 'ok'
          : 'failed',
        audits: Object.freeze(audited),
      })
      return shutdownResult
    })()
    return shutdownPromise
  }

  return {
    register,
    start,
    stop,
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
        completionTaskSettlements,
        backgroundTaskSettlements,
        lateTerminationSettlements,
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
