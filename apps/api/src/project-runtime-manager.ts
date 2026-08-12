import type { Project } from './project-persistence.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeFailure,
  createProjectRuntimeConfig,
  serializeRuntimeEvent,
  type ProjectRuntimeConfig,
  type RuntimeLifecycleEvent,
  type RuntimeSnapshot,
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

export interface RuntimeShutdownResult {
  readonly status: 'ok' | 'failed'
  readonly audits: readonly RuntimeTerminationAudit[]
}

export interface ProjectRuntimeManager {
  start(input: ProjectRuntimeStartInput): Promise<RuntimeSnapshot>
  inspect(projectId: string): RuntimeSnapshot | undefined
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
    readonly signal: AbortSignal
    readonly dependencies: RuntimeProcessDependencies
    readonly onOwned?: (record: RuntimeOwnershipRecord) => void
    readonly onCleanup?: (audit: RuntimeTerminationAudit) => void
  }) => Promise<ReadyRuntime>
  readonly now?: () => number
  readonly recordEvent?: (event: RuntimeLifecycleEvent) => void
}

interface InFlightRuntime {
  readonly generation: symbol
  readonly controller: AbortController
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeSnapshot>
}

interface RunningRuntime {
  readonly generation: symbol
  readonly ready: ReadyRuntime
  readonly snapshot: RuntimeSnapshot
}

interface ManagedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly generation: symbol
}

function callerWait<T>(
  operation: Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  if (signal === undefined) return operation
  if (signal.aborted)
    return Promise.reject(new RuntimeFailure('caller-cancelled'))
  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(new RuntimeFailure('caller-cancelled'))
    signal.addEventListener('abort', cancel, { once: true })
    operation.then(
      (value) => {
        signal.removeEventListener('abort', cancel)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', cancel)
        reject(error)
      }
    )
  })
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
  const inFlight = new Map<string, InFlightRuntime>()
  const running = new Map<string, RunningRuntime>()
  const failed = new Map<string, RuntimeSnapshot>()
  const failureOutcomes = new Map<string, RuntimeFailure>()
  const cleanupOutcomes = new Map<string, RuntimeTerminationAudit>()
  const ownership = new Map<string, ManagedOwnership>()
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

  const start = async (
    input: ProjectRuntimeStartInput
  ): Promise<RuntimeSnapshot> => {
    if (input.signal?.aborted) throw new RuntimeFailure('caller-cancelled')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) throw new RuntimeFailure('unknown-project')
    if (persisted.canonicalPath !== input.canonicalPath) {
      throw new RuntimeFailure('canonical-path-invariant')
    }
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')

    const current = running.get(input.projectId)
    if (current !== undefined) {
      const alive = await current.ready.process.isAlive()
      if (alive) {
        const healthController = new AbortController()
        const verdict = await processDependencies.health.check(
          current.ready.internalUrl + PROJECT_RUNTIME_DEFAULTS.healthPath,
          config.healthAttemptTimeoutMs,
          healthController.signal
        )
        if (
          verdict.status === PROJECT_RUNTIME_DEFAULTS.healthStatus &&
          verdict.bodyStatus !== null &&
          PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses.includes(
            verdict.bodyStatus as 'alive' | 'expired'
          )
        ) {
          return callerWait(Promise.resolve(current.snapshot), input.signal)
        }
      }
      if (running.get(input.projectId)?.generation === current.generation) {
        running.delete(input.projectId)
      }
      recordCleanup(
        input.projectId,
        await current.ready.process.terminate(
          config.gracefulShutdownMs,
          config.forceShutdownMs,
          current.ready.port
        )
      )
    }

    const shared = inFlight.get(input.projectId)
    if (shared !== undefined) return callerWait(shared.operation, input.signal)

    const generation = Symbol(input.projectId)
    const controller = new AbortController()
    const startedAt = now()
    const startingSnapshot: RuntimeSnapshot = Object.freeze({
      projectId: input.projectId,
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: input.canonicalPath,
      startedAt,
      elapsedMs: 0,
    })
    emit({
      event: 'runtime.start.requested',
      projectId: input.projectId,
      from: 'stopped',
      to: 'starting',
      elapsedMs: 0,
    })

    const operation = Promise.resolve().then(async () => {
      try {
        const ready = await launch({
          config,
          canonicalPath: input.canonicalPath,
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
          throw new RuntimeFailure('manager-shutdown')
        }
        const snapshot: RuntimeSnapshot = Object.freeze({
          projectId: input.projectId,
          state: 'running',
          pid: ready.process.pid,
          processStartTime: ready.process.processStartTime,
          internalUrl: ready.internalUrl,
          port: ready.port,
          canonicalPath: input.canonicalPath,
          startedAt,
          elapsedMs: Math.max(0, now() - startedAt),
        })
        const entry: RunningRuntime = { generation, ready, snapshot }
        running.set(input.projectId, entry)
        failed.delete(input.projectId)
        failureOutcomes.delete(input.projectId)
        emit({
          event: 'runtime.start.succeeded',
          projectId: input.projectId,
          from: 'starting',
          to: 'running',
          elapsedMs: snapshot.elapsedMs,
        })
        const exitWork = ready.process.exit.then(async (exit) => {
          if (
            shuttingDown ||
            running.get(input.projectId)?.generation !== generation
          )
            return
          running.delete(input.projectId)
          const elapsedMs = Math.max(0, now() - startedAt)
          failed.set(
            input.projectId,
            Object.freeze({
              ...snapshot,
              state: 'failed',
              elapsedMs,
            })
          )
          failureOutcomes.set(
            input.projectId,
            new RuntimeFailure(
              exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
              exit.signal === null
                ? { exitCode: exit.code ?? -1 }
                : { signal: exit.signal }
            )
          )
          const audit = await ready.process.audit(ready.port)
          recordCleanup(input.projectId, {
            ...audit,
            outcome: 'already-absent',
          })
          emit({
            event: 'runtime.exited',
            projectId: input.projectId,
            from: 'running',
            to: 'failed',
            elapsedMs,
            classification:
              exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
          })
        })
        void exitWork
        return snapshot
      } catch (error) {
        const runtimeFailure =
          error instanceof RuntimeFailure
            ? error
            : new RuntimeFailure('spawn-error')
        const elapsedMs = Math.max(0, now() - startedAt)
        failureOutcomes.set(input.projectId, runtimeFailure)
        failed.set(
          input.projectId,
          Object.freeze({
            ...startingSnapshot,
            state: 'failed',
            elapsedMs,
          })
        )
        emit({
          event: 'runtime.start.failed',
          projectId: input.projectId,
          from: 'starting',
          to: 'failed',
          elapsedMs,
          classification: runtimeFailure.category,
        })
        throw runtimeFailure
      } finally {
        if (inFlight.get(input.projectId)?.generation === generation) {
          inFlight.delete(input.projectId)
        }
      }
    })
    inFlight.set(input.projectId, {
      generation,
      controller,
      snapshot: startingSnapshot,
      operation,
    })
    return callerWait(operation, input.signal)
  }

  const shutdown = (): Promise<RuntimeShutdownResult> => {
    shutdownPromise ??= (async () => {
      shuttingDown = true
      for (const entry of inFlight.values()) entry.controller.abort()
      const runningAtShutdown = [...running.entries()]
      running.clear()
      const terminationOutcomes = new Map<string, RuntimeTerminationAudit>()
      await Promise.all(
        runningAtShutdown.map(async ([projectId, entry]) => {
          const audit = await entry.ready.process.terminate(
            config.gracefulShutdownMs,
            config.forceShutdownMs,
            entry.ready.port
          )
          terminationOutcomes.set(ownershipKey(entry.ready), audit)
          recordCleanup(projectId, audit)
        })
      )
      await Promise.allSettled(
        [...inFlight.values()].map((entry) => entry.operation)
      )
      for (const record of ownership.values()) {
        const key = ownershipKey(record)
        if (terminationOutcomes.has(key)) continue
        const prior = cleanupOutcomes.get(record.projectId)
        if (
          prior !== undefined &&
          [prior.pid, prior.processStartTime, prior.port].join(':') === key
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
      const audited: RuntimeTerminationAudit[] = []
      for (const [key, record] of ownership) {
        const resource: RuntimeResourceAudit = await record.process.audit(
          record.port
        )
        const termination = terminationOutcomes.get(key)
        audited.push(
          Object.freeze({
            ...resource,
            outcome: termination?.outcome ?? 'already-absent',
          })
        )
      }
      for (const [key, termination] of terminationOutcomes) {
        if (
          audited.some(
            (audit) =>
              [audit.pid, audit.processStartTime, audit.port].join(':') === key
          )
        )
          continue
        const record = runningAtShutdown
          .map(([, entry]) => entry.ready)
          .find((ready) => ownershipKey(ready) === key)
        const resource =
          record === undefined
            ? termination
            : await record.process.audit(record.port)
        audited.push(
          Object.freeze({ ...resource, outcome: termination.outcome })
        )
      }
      inFlight.clear()
      failed.clear()
      failureOutcomes.clear()
      ownership.clear()
      cleanupOutcomes.clear()
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
    start,
    inspect(projectId) {
      return (
        running.get(projectId)?.snapshot ??
        inFlight.get(projectId)?.snapshot ??
        failed.get(projectId)
      )
    },
    lastFailure(projectId) {
      return failureOutcomes.get(projectId)
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
