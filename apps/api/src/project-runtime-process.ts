import { spawn } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
} from 'node:fs/promises'
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
  readonly attribution: RuntimeAttributionPrimitives
  readonly termination?: RuntimeTerminationPrimitives
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

export interface InstalledRuntimeIdentity {
  readonly launcherRealPath: string
  readonly installationRoot: string
  readonly interpreterPath: string
  readonly launcherArgvPrefix: readonly [string, string]
}

export interface RuntimeProcessIdentity {
  readonly pid: number
  readonly processGroupId: number
  readonly uid: number
  readonly startTime: string
}

export interface RuntimeCandidatePidScan {
  readonly pids: readonly number[]
  readonly complete: boolean
}

export interface RuntimeProcessGroupScan {
  readonly pids: readonly number[]
  readonly complete: boolean
}

export interface RuntimeAttributionPrimitives {
  resolveInstalledRuntimeIdentity(
    executablePath: string,
    signal: AbortSignal
  ): Promise<InstalledRuntimeIdentity | null>
  listRuntimeCandidatePids(
    signal: AbortSignal
  ): Promise<RuntimeCandidatePidScan>
  readProcessIdentity(
    pid: number,
    signal: AbortSignal
  ): Promise<RuntimeProcessIdentity | null>
  readProcessCommandLine(
    pid: number,
    signal: AbortSignal
  ): Promise<readonly string[] | null>
  readProcessGroupMemberPids(
    processGroupId: number,
    signal: AbortSignal
  ): Promise<RuntimeProcessGroupScan>
  readLoopbackListenerInode(
    port: number,
    signal: AbortSignal
  ): Promise<string | null>
  readProcessSocketInodes(
    pid: number,
    signal: AbortSignal
  ): Promise<readonly string[] | null>
}

export interface RuntimeGroupListenerOwner {
  readonly identity: RuntimeProcessIdentity
  readonly argv: readonly string[]
}

export type RuntimeGroupListenerResolution =
  | Readonly<{ owner: RuntimeGroupListenerOwner; refusalReason: null }>
  | Readonly<{
      owner: null
      refusalReason:
        'group-scan-incomplete' | 'listener-absent' | 'listener-not-owned'
    }>

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

export const defaultRuntimeAttributionPrimitives: RuntimeAttributionPrimitives =
  Object.freeze<RuntimeAttributionPrimitives>({
    async resolveInstalledRuntimeIdentity(executablePath, signal) {
      try {
        signal.throwIfAborted()
        const launcherRealPath = await realpath(executablePath)
        signal.throwIfAborted()
        const installationRoot = path.dirname(path.dirname(launcherRealPath))
        const interpreterPath = path.join(installationRoot, 'lib', 'node')
        await access(interpreterPath, fsConstants.X_OK)
        signal.throwIfAborted()
        return Object.freeze({
          launcherRealPath,
          installationRoot,
          interpreterPath,
          launcherArgvPrefix: Object.freeze([
            interpreterPath,
            installationRoot,
          ]) as readonly [string, string],
        })
      } catch {
        return null
      }
    },
    async listRuntimeCandidatePids(signal) {
      try {
        signal.throwIfAborted()
        const entries = await readdir('/proc')
        signal.throwIfAborted()
        const pids = entries
          .filter((entry) => /^\d+$/u.test(entry))
          .map(Number)
          .sort((left, right) => left - right)
        return Object.freeze({ pids: Object.freeze(pids), complete: true })
      } catch {
        return Object.freeze({ pids: Object.freeze([]), complete: false })
      }
    },
    async readProcessIdentity(pid, signal) {
      try {
        signal.throwIfAborted()
        const [statContent, statusContent] = await Promise.all([
          readFile('/proc/' + String(pid) + '/stat', {
            encoding: 'utf8',
            signal,
          }),
          readFile('/proc/' + String(pid) + '/status', {
            encoding: 'utf8',
            signal,
          }),
        ])
        const fields = statContent
          .slice(statContent.lastIndexOf(')') + 2)
          .split(' ')
        const uidMatch = /^Uid:\s+(\d+)/mu.exec(statusContent)
        const processGroupId = Number(fields[2])
        const startTime = fields[19]
        const uid = uidMatch === null ? Number.NaN : Number(uidMatch[1])
        if (
          !Number.isSafeInteger(processGroupId) ||
          processGroupId <= 0 ||
          startTime === undefined ||
          !Number.isSafeInteger(uid) ||
          uid < 0
        ) {
          return null
        }
        return Object.freeze({ pid, processGroupId, uid, startTime })
      } catch {
        return null
      }
    },
    async readProcessCommandLine(pid, signal) {
      try {
        signal.throwIfAborted()
        const content = await readFile('/proc/' + String(pid) + '/cmdline', {
          signal,
        })
        signal.throwIfAborted()
        const argv = content
          .toString('utf8')
          .split('\0')
          .filter((value) => value.length > 0)
        return argv.length === 0 ? null : Object.freeze(argv)
      } catch {
        return null
      }
    },
    async readProcessGroupMemberPids(processGroupId, signal) {
      const scan = await this.listRuntimeCandidatePids(signal)
      if (!scan.complete)
        return Object.freeze({ pids: Object.freeze([]), complete: false })
      const pids: number[] = []
      let complete = true
      for (const pid of scan.pids) {
        if (signal.aborted) {
          complete = false
          break
        }
        const identity = await this.readProcessIdentity(pid, signal)
        if (identity === null) {
          if (signal.aborted) complete = false
          continue
        }
        if (identity.processGroupId === processGroupId) pids.push(pid)
      }
      return Object.freeze({ pids: Object.freeze(pids), complete })
    },
    async readLoopbackListenerInode(port, signal) {
      const portHex = port.toString(16).toUpperCase().padStart(4, '0')
      const loopbackAddresses = new Set([
        '0100007F',
        '00000000000000000000000001000000',
      ])
      const inodes = new Set<string>()
      let observedTable = false
      for (const table of ['/proc/net/tcp', '/proc/net/tcp6']) {
        try {
          signal.throwIfAborted()
          const content = await readFile(table, { encoding: 'utf8', signal })
          observedTable = true
          for (const line of content.split('\n').slice(1)) {
            const columns = line.trim().split(/\s+/u)
            if (columns.length < 10 || columns[3] !== '0A') continue
            const separator = columns[1]?.lastIndexOf(':') ?? -1
            if (separator < 0) continue
            const address = columns[1]?.slice(0, separator)
            const candidatePort = columns[1]?.slice(separator + 1)
            const inode = columns[9]
            if (
              address !== undefined &&
              candidatePort === portHex &&
              loopbackAddresses.has(address) &&
              inode !== undefined &&
              /^\d+$/u.test(inode)
            ) {
              inodes.add(inode)
            }
          }
        } catch {
          if (signal.aborted) return null
        }
      }
      return observedTable && inodes.size === 1
        ? (inodes.values().next().value ?? null)
        : null
    },
    async readProcessSocketInodes(pid, signal) {
      try {
        signal.throwIfAborted()
        const descriptors = await readdir('/proc/' + String(pid) + '/fd')
        const inodes = new Set<string>()
        for (const descriptor of descriptors) {
          signal.throwIfAborted()
          try {
            const target = await readlink(
              '/proc/' + String(pid) + '/fd/' + descriptor
            )
            const match = /^socket:\[(\d+)\]$/u.exec(target)
            if (match?.[1] !== undefined) inodes.add(match[1])
          } catch {
            if (signal.aborted) return null
          }
        }
        return Object.freeze([...inodes])
      } catch {
        return null
      }
    },
  })

function pathIsWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, path.resolve(candidate))
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))
  )
}

const listenerRefusal = (
  refusalReason:
    'group-scan-incomplete' | 'listener-absent' | 'listener-not-owned'
): RuntimeGroupListenerResolution =>
  Object.freeze({ owner: null, refusalReason })

export async function resolveGroupListenerOwner(input: {
  readonly processGroupId: number
  readonly port: number
  readonly installedRuntime: InstalledRuntimeIdentity
  readonly signal: AbortSignal
  readonly primitives?: RuntimeAttributionPrimitives
}): Promise<RuntimeGroupListenerResolution> {
  const primitives = input.primitives ?? defaultRuntimeAttributionPrimitives
  const group = await primitives.readProcessGroupMemberPids(
    input.processGroupId,
    input.signal
  )
  if (!group.complete) return listenerRefusal('group-scan-incomplete')
  const listenerInode = await primitives.readLoopbackListenerInode(
    input.port,
    input.signal
  )
  if (listenerInode === null) return listenerRefusal('listener-absent')

  const holders: RuntimeGroupListenerOwner[] = []
  for (const pid of group.pids) {
    const [identity, argv, socketInodes] = await Promise.all([
      primitives.readProcessIdentity(pid, input.signal),
      primitives.readProcessCommandLine(pid, input.signal),
      primitives.readProcessSocketInodes(pid, input.signal),
    ])
    if (identity === null || argv === null || socketInodes === null) {
      return listenerRefusal('listener-not-owned')
    }
    if (!socketInodes.includes(listenerInode)) continue
    const currentUid =
      typeof process.getuid === 'function' ? process.getuid() : -1
    const conforming =
      currentUid > 0 &&
      identity.uid === currentUid &&
      identity.processGroupId === input.processGroupId &&
      argv[0] === input.installedRuntime.interpreterPath &&
      argv[1] !== undefined &&
      pathIsWithin(input.installedRuntime.installationRoot, argv[1])
    if (!conforming) return listenerRefusal('listener-not-owned')
    holders.push(Object.freeze({ identity, argv }))
  }
  return holders.length === 1
    ? Object.freeze({ owner: holders[0]!, refusalReason: null })
    : listenerRefusal('listener-not-owned')
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

export function buildRuntimeUserDataPath(
  ownerToken: string,
  port: number
): string {
  return path.join(
    os.tmpdir(),
    'ascend-runtime-data',
    ownerToken + '-' + String(port)
  )
}

async function readRuntimeDiagnostic(stderrPath: string): Promise<string> {
  let handle
  try {
    handle = await open(stderrPath, 'r')
    const buffer = Buffer.alloc(4_096)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } catch {
    return ''
  } finally {
    await handle?.close()
  }
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
      const userDataPath = buildRuntimeUserDataPath(ownerToken, port)
      const stderrPath = path.join(userDataPath, 'runtime-stderr.log')
      await mkdir(userDataPath, { recursive: true, mode: 0o700 })
      const argv = buildRuntimeArgv(canonicalPath, port, userDataPath)
      let child
      try {
        const stderrHandle = await open(stderrPath, 'a', 0o600)
        try {
          child = spawn(config.executablePath, argv, {
            cwd: canonicalPath,
            detached: true,
            env: config.environment,
            stdio: ['ignore', 'ignore', stderrHandle.fd],
          })
        } finally {
          await stderrHandle.close()
        }
      } catch {
        await rm(userDataPath, { recursive: true, force: true })
        throw new RuntimeFailure('spawn-error')
      }
      const spawnError = new Promise<never>((_, reject) => {
        child.once('error', (error: NodeJS.ErrnoException) => {
          void rm(userDataPath, { recursive: true, force: true })
          reject(
            new RuntimeFailure(
              error.code === 'ENOENT' ? 'executable-missing' : 'spawn-error'
            )
          )
        })
      })
      const pid = child.pid
      if (pid === undefined) {
        await rm(userDataPath, { recursive: true, force: true })
        throw new RuntimeFailure('spawn-error')
      }
      const exit = new Promise<RuntimeExit>((resolve) => {
        child.once('exit', (code, signal) => {
          void readRuntimeDiagnostic(stderrPath).then((diagnosticOutput) =>
            resolve({
              code,
              signal,
              addressInUse: /EADDRINUSE|address already in use/iu.test(
                diagnosticOutput
              ),
            })
          )
        })
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

export function adoptOwnedRuntimeProcess(input: {
  readonly config: ProjectRuntimeConfig
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly ownerToken: string
  readonly primitives?: RuntimeTerminationPrimitives
  readonly attribution?: RuntimeAttributionPrimitives
}): OwnedRuntimeProcess {
  const primitives = input.primitives ?? defaultRuntimeTerminationPrimitives
  const attribution = input.attribution ?? defaultRuntimeAttributionPrimitives
  const userDataPath = buildRuntimeUserDataPath(input.ownerToken, input.port)
  let settleExit!: (exit: RuntimeExit) => void
  let settled = false
  const exit = new Promise<RuntimeExit>((resolve) => {
    settleExit = resolve
  })
  const settleAbsent = (): void => {
    if (settled) return
    settled = true
    settleExit(Object.freeze({ code: null, signal: null, addressInUse: false }))
  }
  const audit = async (port: number): Promise<RuntimeResourceAudit> => {
    const controller = new AbortController()
    const deadlineAt = primitives.now() + input.config.stopAuditAllowanceMs
    const cancelDeadline = primitives.scheduleDeadline(
      input.config.stopAuditAllowanceMs,
      () => controller.abort()
    )
    try {
      return (
        (await auditRuntimeResource({
          pid: input.pid,
          processStartTime: input.processStartTime,
          port,
          deadlineAt,
          parentSignal: controller.signal,
          primitives,
        })) ?? nonConfirmingAudit(input.pid, input.processStartTime, port)
      )
    } finally {
      cancelDeadline()
      controller.abort()
    }
  }
  return Object.freeze({
    pid: input.pid,
    processStartTime: input.processStartTime,
    exit,
    async terminate(
      gracefulMs: number,
      forceMs: number,
      port: number,
      signal?: AbortSignal
    ) {
      const result = await terminateOwnedRuntimeGroup({
        pid: input.pid,
        processStartTime: input.processStartTime,
        port,
        gracefulMs,
        forceMs,
        auditAllowanceMs: input.config.stopAuditAllowanceMs,
        ...(signal === undefined ? {} : { signal }),
        primitives,
      })
      if (result.processAbsent) settleAbsent()
      await rm(userDataPath, { recursive: true, force: true })
      return result
    },
    audit,
    async isAlive() {
      const identity = await attribution.readProcessIdentity(
        input.pid,
        new AbortController().signal
      )
      const alive = identity?.startTime === input.processStartTime
      if (!alive) {
        settleAbsent()
        await rm(userDataPath, { recursive: true, force: true })
      }
      return alive
    },
  })
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
  attribution: defaultRuntimeAttributionPrimitives,
  termination: defaultRuntimeTerminationPrimitives,
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
