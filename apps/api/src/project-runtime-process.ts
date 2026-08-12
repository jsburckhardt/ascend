import { spawn } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access, readFile, readdir } from 'node:fs/promises'
import { createConnection, createServer } from 'node:net'
import os from 'node:os'
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
  'already-absent' | 'graceful' | 'escalated'

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
    port: number
  ): Promise<RuntimeTerminationAudit>
  audit(port: number): Promise<RuntimeResourceAudit>
  isAlive(): Promise<boolean>
}

export interface RuntimeProcessAdapter {
  assertLaunchable(config: ProjectRuntimeConfig): Promise<void>
  launch(input: {
    readonly config: ProjectRuntimeConfig
    readonly canonicalPath: string
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

export async function readProcessStartTime(
  pid: number
): Promise<string | null> {
  try {
    const content = await readFile('/proc/' + String(pid) + '/stat', 'utf8')
    return content.slice(content.lastIndexOf(')') + 2).split(' ')[19] ?? null
  } catch {
    return null
  }
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function processGroupIsAbsent(processGroupId: number): Promise<boolean> {
  let entries: string[]
  try {
    entries = await readdir('/proc')
  } catch {
    return false
  }
  for (const entry of entries) {
    if (!/^\d+$/u.test(entry)) continue
    try {
      const content = await readFile('/proc/' + entry + '/stat', 'utf8')
      const fields = content.slice(content.lastIndexOf(')') + 2).split(' ')
      if (Number(fields[2]) === processGroupId) return false
    } catch {
      // The process exited during the bounded scan.
    }
  }
  return true
}

async function auditRuntimeResource(
  pid: number,
  startTime: string,
  port: number
): Promise<RuntimeResourceAudit> {
  return {
    pid,
    processStartTime: startTime,
    port,
    processAbsent: (await readProcessStartTime(pid)) !== startTime,
    processGroupAbsent: await processGroupIsAbsent(pid),
    listenerAbsent: await loopbackListenerIsAbsent(port),
  }
}

async function terminateGroup(
  pid: number,
  startTime: string,
  port: number,
  gracefulMs: number,
  forceMs: number
): Promise<RuntimeTerminationAudit> {
  const alive = async () => (await readProcessStartTime(pid)) === startTime
  const initial = await auditRuntimeResource(pid, startTime, port)
  if (
    initial.processAbsent &&
    initial.processGroupAbsent &&
    initial.listenerAbsent
  ) {
    return { ...initial, outcome: 'already-absent' }
  }
  if (await alive()) {
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      // The exact owner exited between identity validation and signalling.
    }
  }
  const gracefulDeadline = Date.now() + gracefulMs
  let audit = await auditRuntimeResource(pid, startTime, port)
  while (
    Date.now() < gracefulDeadline &&
    (!audit.processAbsent || !audit.processGroupAbsent || !audit.listenerAbsent)
  ) {
    await delay(20)
    audit = await auditRuntimeResource(pid, startTime, port)
  }
  if (audit.processAbsent && audit.processGroupAbsent && audit.listenerAbsent) {
    return { ...audit, outcome: 'graceful' }
  }
  if (!audit.processGroupAbsent) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      // The exact owned group exited between audit and escalation.
    }
  }
  const forceDeadline = Date.now() + forceMs
  while (
    Date.now() < forceDeadline &&
    (!audit.processAbsent || !audit.processGroupAbsent || !audit.listenerAbsent)
  ) {
    await delay(20)
    audit = await auditRuntimeResource(pid, startTime, port)
  }
  return { ...audit, outcome: 'escalated' }
}

export async function loopbackListenerIsAbsent(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(250)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(true))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
  })
}

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
  port: number
): string[] {
  return [
    '--bind-addr',
    '127.0.0.1:' + String(port),
    '--auth',
    'none',
    '--disable-telemetry',
    '--disable-update-check',
    '--disable-workspace-trust',
    canonicalPath,
  ]
}

export const nodeRuntimeProcessAdapter: RuntimeProcessAdapter = {
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
  async launch({ config, canonicalPath, port }) {
    const argv = buildRuntimeArgv(canonicalPath, port)
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
      if (processStartTime === null && child.exitCode === null) await delay(10)
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
    return {
      pid,
      processStartTime,
      exit,
      terminate: (gracefulMs, forceMs, port) =>
        terminateGroup(pid, processStartTime, port, gracefulMs, forceMs),
      audit: (port) => auditRuntimeResource(pid, processStartTime, port),
      isAlive: async () =>
        (await readProcessStartTime(pid)) === processStartTime,
    }
  },
}

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

export async function launchReadyRuntime(input: {
  readonly config: ProjectRuntimeConfig
  readonly canonicalPath: string
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
    if (input.signal.aborted) throw failure('manager-shutdown')
    const port = await dependencies.ports.acquire()
    lastPort = port
    let owned: OwnedRuntimeProcess
    try {
      owned = await dependencies.process.launch({
        config: input.config,
        canonicalPath: input.canonicalPath,
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
        if (input.signal.aborted) throw failure('manager-shutdown')
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
        : failure('manager-shutdown')
    }
  }
  throw failure('address-in-use-exhausted', {
    attemptCount: input.config.collisionAttempts,
    ...(lastPort === undefined ? {} : { port: lastPort }),
  })
}
