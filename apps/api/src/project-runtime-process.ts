import { spawn } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { createConnection, createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeFailure,
  type ProjectRuntimeConfig,
  type RuntimeFailureCategory,
  type RuntimeFailureDiagnostics,
} from './project-runtime-contract.js'

class RuntimeAddressInUseError extends Error {}

export interface RuntimeExit {
  readonly code: number | null
  readonly signal: NodeJS.Signals | null
  readonly addressInUse: boolean
}

export type RuntimeTerminationOutcome =
  'already-absent' | 'graceful' | 'escalated' | 'unconfirmed'

export interface RuntimeResourceAudit {
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly processAbsent: boolean
  readonly processGroupAbsent: boolean
  readonly listenerAbsent: boolean
}

export interface RuntimeTerminationAudit extends RuntimeResourceAudit {
  readonly outcome: RuntimeTerminationOutcome
}

export interface OwnedRuntimeProcess {
  readonly pid: number
  readonly processStartTime: string
  readonly exit: Promise<RuntimeExit>
  terminate(
    gracefulMs: number,
    forceMs: number,
    port: number,
    signal?: AbortSignal
  ): Promise<RuntimeTerminationAudit>
  audit(port: number): Promise<RuntimeResourceAudit>
  isAlive(): Promise<boolean>
}

export interface RuntimeProcessAdapter {
  assertLaunchable(config: ProjectRuntimeConfig): Promise<void>
  launch(input: {
    readonly config: ProjectRuntimeConfig
    readonly canonicalPath: string
    readonly ownerToken: string
    readonly port: number
  }): Promise<OwnedRuntimeProcess>
}

export interface RuntimePortProvider {
  acquire(): Promise<number>
}

export interface HealthAttempt {
  readonly elapsedMs: number
  readonly status: number | null
  readonly bodyStatus: string | null
  readonly timedOut: boolean
}

export interface RuntimeHealthAdapter {
  check(
    url: string,
    timeoutMs: number,
    signal: AbortSignal
  ): Promise<HealthAttempt>
}

export interface RuntimeProcessDependencies {
  readonly process: RuntimeProcessAdapter
  readonly ports: RuntimePortProvider
  readonly health: RuntimeHealthAdapter
  readonly now: () => number
  readonly sleep: (milliseconds: number, signal: AbortSignal) => Promise<void>
}

export interface ReadyRuntime {
  readonly process: OwnedRuntimeProcess
  readonly port: number
  readonly internalUrl: string
  readonly readinessAttempts: readonly HealthAttempt[]
}

export interface RuntimeOwnershipRecord {
  readonly process: OwnedRuntimeProcess
  readonly port: number
}

export interface RuntimeDeadlineScheduler {
  now(): number
  scheduleDeadline(milliseconds: number, onDeadline: () => void): () => void
}

export interface RuntimeTerminationPrimitives extends RuntimeDeadlineScheduler {
  readProcessStartTime(pid: number, signal: AbortSignal): Promise<string | null>
  readProcessGroupMembers(
    processGroupId: number,
    signal: AbortSignal
  ): Promise<readonly number[]>
  listenerIsAbsent(port: number, signal: AbortSignal): Promise<boolean>
  delay(milliseconds: number, signal: AbortSignal): Promise<void>
  signalProcessGroup(processGroupId: number, signal: NodeJS.Signals): boolean
}

export async function readProcessStartTime(
  pid: number,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const content = await readFile('/proc/' + String(pid) + '/stat', {
      encoding: 'utf8',
      ...(signal === undefined ? {} : { signal }),
    })
    return content.slice(content.lastIndexOf(')') + 2).split(' ')[19] ?? null
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    return null
  }
}

async function runtimeDelay(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const finish = (): void => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }
    const cancel = (): void => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

export async function readProcessGroupMembers(
  processGroupId: number,
  signal?: AbortSignal
): Promise<readonly number[]> {
  signal?.throwIfAborted()
  let entries: string[]
  try {
    entries = await readdir('/proc')
  } catch (error) {
    if (signal?.aborted) throw signal.reason ?? error
    throw error
  }
  const members: number[] = []
  for (const entry of entries) {
    signal?.throwIfAborted()
    if (!/^\d+$/u.test(entry)) continue
    try {
      const content = await readFile('/proc/' + entry + '/stat', {
        encoding: 'utf8',
        ...(signal === undefined ? {} : { signal }),
      })
      const fields = content.slice(content.lastIndexOf(')') + 2).split(' ')
      if (Number(fields[2]) === processGroupId) members.push(Number(entry))
    } catch (error) {
      if (signal?.aborted) throw signal.reason ?? error
      // The process exited during the bounded scan.
    }
  }
  return Object.freeze(members)
}

type BoundedPrimitiveResult<T> =
  Readonly<{ completed: true; value: T }> | Readonly<{ completed: false }>

async function runBoundedPrimitive<T>(input: {
  readonly deadlineAt: number
  readonly parentSignal: AbortSignal
  readonly primitives: RuntimeTerminationPrimitives
  readonly call: (signal: AbortSignal) => Promise<T>
}): Promise<BoundedPrimitiveResult<T>> {
  if (
    input.parentSignal.aborted ||
    input.primitives.now() >= input.deadlineAt
  ) {
    return Object.freeze({ completed: false })
  }

  const controller = new AbortController()
  const abortFromParent = (): void =>
    controller.abort(input.parentSignal.reason)
  input.parentSignal.addEventListener('abort', abortFromParent, { once: true })
  if (input.parentSignal.aborted) abortFromParent()
  const cancelDeadline = input.primitives.scheduleDeadline(
    Math.max(0, input.deadlineAt - input.primitives.now()),
    () => controller.abort()
  )
  let settleAbort!: () => void
  const aborted = new Promise<Readonly<{ completed: false }>>((resolve) => {
    settleAbort = () => resolve(Object.freeze({ completed: false }))
    controller.signal.addEventListener('abort', settleAbort, { once: true })
    if (controller.signal.aborted) settleAbort()
  })
  const pending = Promise.resolve().then(() => input.call(controller.signal))
  try {
    const result = await Promise.race([
      pending.then((value) =>
        Object.freeze({ completed: true as const, value })
      ),
      aborted,
    ])
    if (!result.completed) {
      void pending.then(
        () => undefined,
        () => undefined
      )
    }
    return result
  } finally {
    cancelDeadline()
    input.parentSignal.removeEventListener('abort', abortFromParent)
    controller.signal.removeEventListener('abort', settleAbort)
    controller.abort()
  }
}

const nonConfirmingAudit = (
  pid: number,
  processStartTime: string,
  port: number
): RuntimeResourceAudit =>
  Object.freeze({
    pid,
    processStartTime,
    port,
    processAbsent: false,
    processGroupAbsent: false,
    listenerAbsent: false,
  })

const confirmsRelease = (audit: RuntimeResourceAudit): boolean =>
  audit.processAbsent && audit.processGroupAbsent && audit.listenerAbsent

async function auditRuntimeResource(input: {
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly deadlineAt: number
  readonly parentSignal: AbortSignal
  readonly primitives: RuntimeTerminationPrimitives
}): Promise<RuntimeResourceAudit | undefined> {
  const processStart = await runBoundedPrimitive({
    deadlineAt: input.deadlineAt,
    parentSignal: input.parentSignal,
    primitives: input.primitives,
    call: (signal) => input.primitives.readProcessStartTime(input.pid, signal),
  })
  if (!processStart.completed) return undefined
  const members = await runBoundedPrimitive({
    deadlineAt: input.deadlineAt,
    parentSignal: input.parentSignal,
    primitives: input.primitives,
    call: (signal) =>
      input.primitives.readProcessGroupMembers(input.pid, signal),
  })
  if (!members.completed) return undefined
  const listener = await runBoundedPrimitive({
    deadlineAt: input.deadlineAt,
    parentSignal: input.parentSignal,
    primitives: input.primitives,
    call: (signal) => input.primitives.listenerIsAbsent(input.port, signal),
  })
  if (!listener.completed) return undefined
  return Object.freeze({
    pid: input.pid,
    processStartTime: input.processStartTime,
    port: input.port,
    processAbsent: processStart.value !== input.processStartTime,
    processGroupAbsent: members.value.length === 0,
    listenerAbsent: listener.value,
  })
}

export interface RuntimeTerminationRequest {
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly gracefulMs: number
  readonly forceMs: number
  readonly auditAllowanceMs: number
  readonly signal?: AbortSignal
  readonly primitives?: RuntimeTerminationPrimitives
}

export async function terminateOwnedRuntimeGroup(
  request: RuntimeTerminationRequest
): Promise<RuntimeTerminationAudit> {
  const primitives = request.primitives ?? defaultRuntimeTerminationPrimitives
  const startedAt = primitives.now()
  const controller = new AbortController()
  const fallback = nonConfirmingAudit(
    request.pid,
    request.processStartTime,
    request.port
  )
  if (request.signal?.aborted) {
    controller.abort(request.signal.reason)
    return Object.freeze({ ...fallback, outcome: 'unconfirmed' })
  }

  const overallDeadlineAt =
    startedAt + request.gracefulMs + request.forceMs + request.auditAllowanceMs
  const deadlineReached = (): void => controller.abort()
  const cancelOverallDeadline = primitives.scheduleDeadline(
    Math.max(0, overallDeadlineAt - primitives.now()),
    deadlineReached
  )
  const cancelFromCaller = (): void => controller.abort(request.signal?.reason)
  request.signal?.addEventListener('abort', cancelFromCaller, { once: true })
  let lastCompletedAudit: RuntimeResourceAudit | undefined
  const settlementAllowanceMs = Math.max(
    1,
    Math.floor(request.auditAllowanceMs / 10)
  )
  const preSignalDeadlineAt =
    startedAt + request.auditAllowanceMs - settlementAllowanceMs

  const audit = async (
    deadlineAt: number
  ): Promise<RuntimeResourceAudit | undefined> => {
    const result = await auditRuntimeResource({
      pid: request.pid,
      processStartTime: request.processStartTime,
      port: request.port,
      deadlineAt,
      parentSignal: controller.signal,
      primitives,
    })
    if (result !== undefined) lastCompletedAudit = result
    return result
  }
  const unconfirmed = (): RuntimeTerminationAudit =>
    Object.freeze({
      ...(lastCompletedAudit ?? fallback),
      outcome: 'unconfirmed',
    })

  try {
    const initial = await audit(preSignalDeadlineAt)
    if (initial === undefined) return unconfirmed()
    if (confirmsRelease(initial))
      return Object.freeze({ ...initial, outcome: 'already-absent' })

    const identity = await runBoundedPrimitive({
      deadlineAt: preSignalDeadlineAt,
      parentSignal: controller.signal,
      primitives,
      call: (signal) => primitives.readProcessStartTime(request.pid, signal),
    })
    if (
      !identity.completed ||
      identity.value !== request.processStartTime ||
      controller.signal.aborted ||
      primitives.now() > preSignalDeadlineAt
    ) {
      return unconfirmed()
    }

    let attributable = true
    const gracefulDelivered = primitives.signalProcessGroup(
      request.pid,
      'SIGTERM'
    )
    const gracefulSignalAt = primitives.now()
    if (!gracefulDelivered) {
      const refusedAudit = await audit(
        Math.min(gracefulSignalAt + request.gracefulMs, overallDeadlineAt)
      )
      return Object.freeze({
        ...(refusedAudit ?? lastCompletedAudit ?? fallback),
        outcome:
          refusedAudit !== undefined && confirmsRelease(refusedAudit)
            ? 'already-absent'
            : 'unconfirmed',
      })
    }

    const gracefulDeadlineAt = gracefulSignalAt + request.gracefulMs
    while (
      !controller.signal.aborted &&
      primitives.now() < gracefulDeadlineAt
    ) {
      const waited = await runBoundedPrimitive({
        deadlineAt: gracefulDeadlineAt,
        parentSignal: controller.signal,
        primitives,
        call: (signal) =>
          primitives.delay(RUNTIME_TERMINATION_POLL_INTERVAL_MS, signal),
      })
      if (!waited.completed) break
      const current = await audit(gracefulDeadlineAt)
      if (current === undefined) break
      if (confirmsRelease(current))
        return Object.freeze({ ...current, outcome: 'graceful' })
      if (!current.processAbsent) attributable = true
      if (current.processAbsent && current.processGroupAbsent)
        attributable = false
    }
    if (controller.signal.aborted || !attributable) return unconfirmed()

    const forceIdentity = await runBoundedPrimitive({
      deadlineAt: Math.min(
        gracefulDeadlineAt + settlementAllowanceMs,
        overallDeadlineAt
      ),
      parentSignal: controller.signal,
      primitives,
      call: (signal) => primitives.readProcessStartTime(request.pid, signal),
    })
    if (!forceIdentity.completed || controller.signal.aborted)
      return unconfirmed()
    if (forceIdentity.value === request.processStartTime) attributable = true
    if (!attributable) return unconfirmed()

    const forceDelivered = primitives.signalProcessGroup(request.pid, 'SIGKILL')
    const forceSignalAt = primitives.now()
    if (!forceDelivered) return unconfirmed()
    const forceDeadlineAt = forceSignalAt + request.forceMs
    while (!controller.signal.aborted && primitives.now() < forceDeadlineAt) {
      const waited = await runBoundedPrimitive({
        deadlineAt: forceDeadlineAt,
        parentSignal: controller.signal,
        primitives,
        call: (signal) =>
          primitives.delay(RUNTIME_TERMINATION_POLL_INTERVAL_MS, signal),
      })
      if (!waited.completed) break
      const current = await audit(forceDeadlineAt)
      if (current === undefined) break
      if (confirmsRelease(current))
        return Object.freeze({ ...current, outcome: 'escalated' })
    }
    return unconfirmed()
  } finally {
    cancelOverallDeadline()
    request.signal?.removeEventListener('abort', cancelFromCaller)
    controller.abort()
  }
}

export async function loopbackListenerIsAbsent(
  port: number,
  signal?: AbortSignal
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = (value: boolean): void => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', cancel)
      socket.destroy()
      resolve(value)
    }
    const cancel = (): void => {
      if (settled) return
      settled = true
      socket.destroy()
      reject(signal?.reason ?? new Error('Runtime listener audit aborted'))
    }
    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener('abort', cancel, { once: true })
    socket.setTimeout(250)
    socket.once('connect', () => finish(false))
    socket.once('error', () => finish(true))
    socket.once('timeout', () => finish(true))
  })
}

export const defaultRuntimeTerminationPrimitives: RuntimeTerminationPrimitives =
  Object.freeze<RuntimeTerminationPrimitives>({
    readProcessStartTime: (pid, signal) => readProcessStartTime(pid, signal),
    readProcessGroupMembers: (processGroupId, signal) =>
      readProcessGroupMembers(processGroupId, signal),
    listenerIsAbsent: (port, signal) => loopbackListenerIsAbsent(port, signal),
    delay: runtimeDelay,
    signalProcessGroup(processGroupId, signal) {
      try {
        process.kill(-processGroupId, signal)
        return true
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
        throw error
      }
    },
    now: () => performance.now(),
    scheduleDeadline(milliseconds, onDeadline) {
      const timer = setTimeout(onDeadline, Math.max(0, milliseconds))
      return () => clearTimeout(timer)
    },
  })

export const defaultRuntimeDeadlineScheduler: RuntimeDeadlineScheduler =
  defaultRuntimeTerminationPrimitives

const RUNTIME_TERMINATION_POLL_INTERVAL_MS = 20

export const nodeRuntimePortProvider: RuntimePortProvider = {
  acquire: async () =>
    new Promise<number>((resolve, reject) => {
      const listener = createServer()
      listener.once('error', reject)
      listener.listen(0, '127.0.0.1', () => {
        const address = listener.address()
        if (address === null || typeof address === 'string') {
          listener.close()
          reject(new Error('Loopback port allocation failed'))
          return
        }
        listener.close((error) =>
          error === undefined ? resolve(address.port) : reject(error)
        )
      })
    }),
}

export function buildRuntimeArgv(
  canonicalPath: string,
  port: number,
  userDataPath?: string
): string[] {
  return [
    '--bind-addr',
    '127.0.0.1:' + String(port),
    '--auth',
    'none',
    '--disable-telemetry',
    '--disable-update-check',
    '--disable-workspace-trust',
    '--disable-proxy',
    ...(userDataPath === undefined ? [] : ['--user-data-dir', userDataPath]),
    canonicalPath,
  ]
}

export function createNodeRuntimeProcessAdapter(
  primitives: RuntimeTerminationPrimitives = defaultRuntimeTerminationPrimitives
): RuntimeProcessAdapter {
  return {
    async assertLaunchable(config) {
      const user = os.userInfo()
      if (user.username !== config.expectedUser || user.uid === 0) {
        throw new RuntimeFailure('spawn-error')
      }
      try {
        await access(config.executablePath, fsConstants.X_OK)
      } catch {
        throw new RuntimeFailure('executable-missing')
      }
    },
    async launch({ config, canonicalPath, ownerToken, port }) {
      const userDataPath = path.join(
        os.tmpdir(),
        'ascend-runtime-data',
        ownerToken + '-' + String(port)
      )
      await mkdir(userDataPath, { recursive: true, mode: 0o700 })
      const argv = buildRuntimeArgv(canonicalPath, port, userDataPath)
      let child
      try {
        child = spawn(config.executablePath, argv, {
          cwd: canonicalPath,
          detached: true,
          env: config.environment,
          stdio: ['ignore', 'ignore', 'pipe'],
        })
      } catch {
        throw new RuntimeFailure('spawn-error')
      }
      let diagnosticOutput = ''
      child.stderr?.setEncoding('utf8')
      child.stderr?.on('data', (chunk: string) => {
        if (diagnosticOutput.length < 4_096) {
          diagnosticOutput += chunk.slice(0, 4_096 - diagnosticOutput.length)
        }
      })
      const spawnError = new Promise<never>((_, reject) => {
        child.once('error', (error: NodeJS.ErrnoException) => {
          reject(
            new RuntimeFailure(
              error.code === 'ENOENT' ? 'executable-missing' : 'spawn-error'
            )
          )
        })
      })
      const pid = child.pid
      if (pid === undefined) throw new RuntimeFailure('spawn-error')
      const exit = new Promise<RuntimeExit>((resolve) => {
        child.once('exit', (code, signal) =>
          resolve({
            code,
            signal,
            addressInUse: /EADDRINUSE|address already in use/iu.test(
              diagnosticOutput
            ),
          })
        )
      })
      let processStartTime: string | null = null
      const identityDeadline = Date.now() + 1_000
      while (processStartTime === null && Date.now() < identityDeadline) {
        processStartTime = await Promise.race([
          readProcessStartTime(pid),
          spawnError,
          exit.then(() => null),
        ])
        if (processStartTime === null && child.exitCode === null)
          await runtimeDelay(10, new AbortController().signal)
        if (child.exitCode !== null || child.signalCode !== null) break
      }
      if (processStartTime === null) {
        const early = await Promise.race([exit, spawnError])
        if (early.addressInUse) {
          throw new RuntimeAddressInUseError()
        }
        throw new RuntimeFailure(
          early.signal === null ? 'early-exit-code' : 'early-exit-signal',
          early.signal === null
            ? { exitCode: early.code ?? -1 }
            : { signal: early.signal }
        )
      }
      child.unref()
      void exit.then(() => rm(userDataPath, { recursive: true, force: true }))
      return {
        pid,
        processStartTime,
        exit,
        terminate: async (gracefulMs, forceMs, port, signal) => {
          try {
            return await terminateOwnedRuntimeGroup({
              pid,
              processStartTime,
              port,
              gracefulMs,
              forceMs,
              auditAllowanceMs: config.stopAuditAllowanceMs,
              ...(signal === undefined ? {} : { signal }),
              primitives,
            })
          } finally {
            await rm(userDataPath, { recursive: true, force: true })
          }
        },
        audit: async (port) => {
          const controller = new AbortController()
          const deadlineAt = primitives.now() + config.stopAuditAllowanceMs
          const cancelDeadline = primitives.scheduleDeadline(
            config.stopAuditAllowanceMs,
            () => controller.abort()
          )
          try {
            return (
              (await auditRuntimeResource({
                pid,
                processStartTime,
                port,
                deadlineAt,
                parentSignal: controller.signal,
                primitives,
              })) ?? nonConfirmingAudit(pid, processStartTime, port)
            )
          } finally {
            cancelDeadline()
            controller.abort()
          }
        },
        isAlive: async () =>
          (await primitives.readProcessStartTime(
            pid,
            new AbortController().signal
          )) === processStartTime,
      }
    },
  }
}

export const nodeRuntimeProcessAdapter: RuntimeProcessAdapter =
  createNodeRuntimeProcessAdapter()

export const fetchRuntimeHealthAdapter: RuntimeHealthAdapter = {
  async check(url, timeoutMs, signal) {
    const startedAt = Date.now()
    const timeout = new AbortController()
    const timer = setTimeout(() => timeout.abort(), timeoutMs)
    const combined = AbortSignal.any([signal, timeout.signal])
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: combined,
      })
      let bodyStatus: string | null = null
      try {
        const body = (await response.json()) as { status?: unknown }
        if (typeof body.status === 'string') bodyStatus = body.status
      } catch {
        bodyStatus = null
      }
      return {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        bodyStatus,
        timedOut: false,
      }
    } catch {
      return {
        elapsedMs: Date.now() - startedAt,
        status: null,
        bodyStatus: null,
        timedOut: timeout.signal.aborted,
      }
    } finally {
      clearTimeout(timer)
    }
  },
}

export const defaultRuntimeProcessDependencies: RuntimeProcessDependencies = {
  process: nodeRuntimeProcessAdapter,
  ports: nodeRuntimePortProvider,
  health: fetchRuntimeHealthAdapter,
  now: Date.now,
  sleep: (milliseconds, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason)
        return
      }
      const timer = setTimeout(finish, milliseconds)
      function finish() {
        signal.removeEventListener('abort', cancel)
        resolve()
      }
      function cancel() {
        clearTimeout(timer)
        reject(signal.reason)
      }
      signal.addEventListener('abort', cancel, { once: true })
    }),
}

function failure(
  category: RuntimeFailureCategory,
  diagnostics: RuntimeFailureDiagnostics = {}
): RuntimeFailure {
  return new RuntimeFailure(category, diagnostics)
}

const abortFailure = (signal: AbortSignal): RuntimeFailure =>
  signal.reason instanceof RuntimeFailure
    ? signal.reason
    : failure('manager-shutdown')

export async function launchReadyRuntime(input: {
  readonly config: ProjectRuntimeConfig
  readonly canonicalPath: string
  readonly ownerToken: string
  readonly signal: AbortSignal
  readonly dependencies?: RuntimeProcessDependencies
  readonly onOwned?: (record: RuntimeOwnershipRecord) => void
  readonly onCleanup?: (audit: RuntimeTerminationAudit) => void
}): Promise<ReadyRuntime> {
  const dependencies = input.dependencies ?? defaultRuntimeProcessDependencies
  await dependencies.process.assertLaunchable(input.config)
  let lastPort: number | undefined
  for (
    let attempt = 1;
    attempt <= input.config.collisionAttempts;
    attempt += 1
  ) {
    if (input.signal.aborted) throw abortFailure(input.signal)
    const port = await dependencies.ports.acquire()
    lastPort = port
    let owned: OwnedRuntimeProcess
    try {
      owned = await dependencies.process.launch({
        config: input.config,
        canonicalPath: input.canonicalPath,
        ownerToken: input.ownerToken,
        port,
      })
    } catch (error) {
      if (error instanceof RuntimeAddressInUseError) continue
      throw error
    }
    input.onOwned?.({ process: owned, port })
    const internalUrl = 'http://127.0.0.1:' + String(port)
    const attempts: HealthAttempt[] = []
    const startedAt = dependencies.now()
    let collided = false
    let lastHealthFailure: RuntimeFailure | undefined
    try {
      while (dependencies.now() - startedAt < input.config.readinessTimeoutMs) {
        if (input.signal.aborted) throw abortFailure(input.signal)
        const verdict = await Promise.race([
          dependencies.health.check(
            internalUrl + PROJECT_RUNTIME_DEFAULTS.healthPath,
            input.config.healthAttemptTimeoutMs,
            input.signal
          ),
          owned.exit.then((exit) => {
            if (exit.addressInUse) return { collision: true as const }
            throw failure(
              exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
              exit.signal === null
                ? { exitCode: exit.code ?? -1 }
                : { signal: exit.signal }
            )
          }),
        ])
        if ('collision' in verdict) {
          collided = true
          const cleanup = await owned.terminate(
            input.config.gracefulShutdownMs,
            input.config.forceShutdownMs,
            port
          )
          input.onCleanup?.(cleanup)
          break
        }
        attempts.push(verdict)
        if (verdict.status === PROJECT_RUNTIME_DEFAULTS.healthStatus) {
          if (
            verdict.bodyStatus !== null &&
            PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses.includes(
              verdict.bodyStatus as 'alive' | 'expired'
            )
          ) {
            return {
              process: owned,
              port,
              internalUrl,
              readinessAttempts: Object.freeze(attempts),
            }
          }
          lastHealthFailure = failure('health-body-unexpected', {
            attemptCount: attempts.length,
          })
        } else if (verdict.status !== null) {
          lastHealthFailure = failure('health-status-unexpected', {
            healthStatus: verdict.status,
            attemptCount: attempts.length,
          })
        }
        await dependencies.sleep(input.config.pollIntervalMs, input.signal)
      }
      if (collided) continue
      if (lastHealthFailure !== undefined) throw lastHealthFailure
      throw failure('readiness-timeout', {
        timeoutMs: input.config.readinessTimeoutMs,
        attemptCount: attempts.length,
      })
    } catch (error) {
      const cleanup = await owned.terminate(
        input.config.gracefulShutdownMs,
        input.config.forceShutdownMs,
        port
      )
      input.onCleanup?.(cleanup)
      throw error instanceof RuntimeFailure
        ? error
        : input.signal.aborted
          ? abortFailure(input.signal)
          : failure('manager-shutdown')
    }
  }
  throw failure('address-in-use-exhausted', {
    attemptCount: input.config.collisionAttempts,
    ...(lastPort === undefined ? {} : { port: lastPort }),
  })
}
