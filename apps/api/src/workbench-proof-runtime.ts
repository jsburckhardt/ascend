import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import {
  access,
  mkdir,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { closeSync, constants, openSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  BL001_FIXTURE,
  BL001_RUN_ROOT,
  CODE_SERVER_PATH,
  START_TIMEOUT_MS,
  STOP_TIMEOUT_MS,
} from './workbench-proof-contract.js'

export type ProofErrorCode =
  | 'executable-missing'
  | 'project-missing'
  | 'project-not-directory'
  | 'project-unreadable'
  | 'root-user-forbidden'
  | 'spawn-failed'
  | 'readiness-timeout'
  | 'early-exit'
  | 'invalid-handle'
  | 'state-mismatch'
  | 'stop-timeout'
  | 'cancelled'

export interface DiscoveredProofIdentity {
  runId: string
  pid: number | null
  startTimeTicks: string | null
  url: string | null
}

export class ProofError extends Error {
  readonly code: ProofErrorCode
  readonly details: Record<string, number | string>
  readonly discoveredIdentity: DiscoveredProofIdentity | null

  constructor(
    code: ProofErrorCode,
    message: string,
    details: Record<string, number | string> = {},
    discoveredIdentity: DiscoveredProofIdentity | null = null
  ) {
    super(message)
    this.name = 'ProofError'
    this.code = code
    this.details = details
    this.discoveredIdentity = discoveredIdentity
  }
}

export interface ProofHandle {
  version: 1
  pid: number
  url: string
  runId: string
  startTimeTicks: string
}

interface RuntimeState extends ProofHandle {
  projectPath: string
}

export interface StartProofOptions {
  executablePath?: string
  projectPath?: string
  runRoot?: string
  startupTimeoutMs?: number
  environmentOverrides?: NodeJS.ProcessEnv
  signal?: AbortSignal
}

export interface StopProofOptions {
  runRoot?: string
  stopTimeoutMs?: number
}

export interface StartProofResult {
  handle: ProofHandle
  projectPath: string
  argv: string[]
  readinessStatus: number
  elapsedMs: number
}

export interface StopProofResult {
  alreadyAbsent: boolean
  elapsedMs: number
}

const abortReason = (signal?: AbortSignal): string =>
  signal?.reason instanceof Error
    ? signal.reason.message
    : typeof signal?.reason === 'string'
      ? signal.reason
      : 'operation-cancelled'

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw new ProofError('cancelled', abortReason(signal))
}

const delay = async (
  milliseconds: number,
  signal?: AbortSignal
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ProofError('cancelled', abortReason(signal)))
      return
    }
    const timer = setTimeout(finish, milliseconds)
    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(new ProofError('cancelled', abortReason(signal)))
    }
    function finish() {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })

const statePath = (runRoot: string, runId: string): string =>
  path.join(runRoot, runId, 'state.json')

const processGroupExists = (pgid: number): boolean => {
  try {
    process.kill(-pgid, 0)
    return true
  } catch {
    return false
  }
}

export const readProcessStartTime = async (
  pid: number
): Promise<string | null> => {
  try {
    const content = await readFile('/proc/' + String(pid) + '/stat', 'utf8')
    const fields = content.slice(content.lastIndexOf(')') + 2).split(' ')
    return fields[19]
  } catch {
    return null
  }
}

const identityMatches = async (handle: ProofHandle): Promise<boolean> =>
  (await readProcessStartTime(handle.pid)) === handle.startTimeTicks

export const terminateExactProcessIdentity = async (
  identity: { pid: number; startTimeTicks: string },
  timeoutMs: number
): Promise<void> => {
  const matches = async () =>
    (await readProcessStartTime(identity.pid)) === identity.startTimeTicks
  if (!(await matches())) return
  try {
    process.kill(identity.pid, 'SIGTERM')
  } catch {
    return
  }
  const termDeadline = Date.now() + Math.max(50, Math.floor(timeoutMs / 2))
  while (Date.now() < termDeadline && (await matches())) await delay(25)
  if (!(await matches())) return
  try {
    process.kill(identity.pid, 'SIGKILL')
  } catch {
    return
  }
  const killDeadline = Date.now() + Math.max(50, Math.ceil(timeoutMs / 2))
  while (Date.now() < killDeadline && (await matches())) await delay(25)
  if (await matches())
    throw new ProofError('stop-timeout', 'Attributed process did not stop', {
      pid: identity.pid,
      timeoutMs,
    })
}

export const parseLoopbackUrl = (content: string): string | null => {
  const match = content.match(/http:[/][/]127[.]0[.]0[.]1:[0-9]+[/]?/u)
  if (!match) return null
  const url = new URL(match[0])
  return url.href
}

export const parseProofHandle = (content: string): ProofHandle => {
  let value: unknown
  try {
    value = JSON.parse(content)
  } catch {
    throw new ProofError('invalid-handle', 'Handle is not valid JSON')
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    (value as Partial<ProofHandle>).version !== 1 ||
    !Number.isInteger((value as Partial<ProofHandle>).pid) ||
    typeof (value as Partial<ProofHandle>).url !== 'string' ||
    typeof (value as Partial<ProofHandle>).runId !== 'string' ||
    !/^[0-9a-f-]{36}$/u.test((value as Partial<ProofHandle>).runId ?? '') ||
    typeof (value as Partial<ProofHandle>).startTimeTicks !== 'string'
  ) {
    throw new ProofError(
      'invalid-handle',
      'Handle does not match version 1 schema'
    )
  }

  const handle = value as ProofHandle
  let url: URL
  try {
    url = new URL(handle.url)
  } catch {
    throw new ProofError('invalid-handle', 'Handle URL is invalid')
  }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
    throw new ProofError('invalid-handle', 'Handle URL must use loopback HTTP')
  }
  return handle
}

export const validateProjectPath = async (
  inputPath: string
): Promise<string> => {
  let canonicalPath: string
  try {
    canonicalPath = await realpath(inputPath)
  } catch {
    throw new ProofError('project-missing', 'Project path does not exist', {
      path: inputPath,
    })
  }

  const projectStat = await stat(canonicalPath)
  if (!projectStat.isDirectory()) {
    throw new ProofError(
      'project-not-directory',
      'Project path is not a directory',
      {
        path: canonicalPath,
      }
    )
  }
  try {
    await access(canonicalPath, constants.R_OK)
  } catch {
    throw new ProofError('project-unreadable', 'Project path is not readable', {
      path: canonicalPath,
    })
  }
  return canonicalPath
}

const validateExecutable = async (executablePath: string): Promise<void> => {
  try {
    await access(executablePath, constants.X_OK)
  } catch {
    throw new ProofError(
      'executable-missing',
      'code-server executable is unavailable',
      {
        executablePath,
      }
    )
  }
}

const buildEnvironment = (
  executablePath: string,
  overrides: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv => {
  const user = os.userInfo()
  return {
    HOME: user.homedir,
    USER: user.username,
    LOGNAME: user.username,
    SHELL: user.shell || '/bin/bash',
    LANG: process.env.LANG ?? 'C.UTF-8',
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
    PATH:
      path.dirname(executablePath) +
      ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    ...overrides,
  }
}

const readinessStatus = async (
  url: string,
  signal?: AbortSignal
): Promise<number | null> => {
  try {
    const response = await fetch(url, { redirect: 'manual', signal })
    return response.status
  } catch {
    return null
  }
}

export const terminateExactProcessGroup = async (
  pgid: number,
  timeoutMs: number
): Promise<void> => {
  if (!processGroupExists(pgid)) return
  try {
    process.kill(-pgid, 'SIGTERM')
  } catch {
    return
  }

  const termDeadline = Date.now() + Math.max(50, Math.floor(timeoutMs / 2))
  while (Date.now() < termDeadline && processGroupExists(pgid)) {
    await delay(25)
  }
  if (!processGroupExists(pgid)) return

  try {
    process.kill(-pgid, 'SIGKILL')
  } catch {
    return
  }
  const killDeadline = Date.now() + Math.max(50, Math.ceil(timeoutMs / 2))
  while (Date.now() < killDeadline && processGroupExists(pgid)) {
    await delay(25)
  }
  if (processGroupExists(pgid)) {
    throw new ProofError('stop-timeout', 'Managed process group did not stop', {
      pgid,
      timeoutMs,
    })
  }
}

export const startWorkbenchProof = async (
  options: StartProofOptions = {}
): Promise<StartProofResult> => {
  throwIfAborted(options.signal)
  const startedAt = Date.now()
  const executablePath = options.executablePath ?? CODE_SERVER_PATH
  const projectPath = await validateProjectPath(
    options.projectPath ?? BL001_FIXTURE
  )
  await validateExecutable(executablePath)
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    throw new ProofError(
      'root-user-forbidden',
      'code-server cannot run as root'
    )
  }

  const runRoot = options.runRoot ?? BL001_RUN_ROOT
  const timeoutMs = options.startupTimeoutMs ?? START_TIMEOUT_MS
  const runId = randomUUID()
  const runDirectory = path.join(runRoot, runId)
  await mkdir(runDirectory, { recursive: true })
  const launchLog = path.join(runDirectory, 'launch.log')
  const logDescriptor = openSync(launchLog, 'a')
  const argv = [
    '--bind-addr',
    '127.0.0.1:0',
    '--auth',
    'none',
    '--disable-telemetry',
    '--disable-update-check',
    '--disable-workspace-trust',
    '--user-data-dir',
    path.join(runDirectory, 'user-data'),
    '--extensions-dir',
    path.join(runDirectory, 'extensions'),
    projectPath,
  ]

  let child
  try {
    child = spawn(executablePath, argv, {
      cwd: projectPath,
      detached: true,
      env: buildEnvironment(executablePath, options.environmentOverrides),
      stdio: ['ignore', logDescriptor, logDescriptor],
    })
  } catch (error) {
    closeSync(logDescriptor)
    await rm(runDirectory, { recursive: true, force: true })
    throw new ProofError('spawn-failed', 'code-server could not be spawned', {
      reason: error instanceof Error ? error.message : 'unknown',
    })
  }
  closeSync(logDescriptor)

  let spawnError: unknown
  let observedExitCode: number | null = child.exitCode
  let resolveObservedExit!: (exitCode: number) => void
  const exitObserved = new Promise<number>((resolve) => {
    resolveObservedExit = resolve
  })
  child.once('error', (error) => {
    spawnError = error
  })
  child.once('exit', (exitCode) => {
    observedExitCode = exitCode ?? -1
    resolveObservedExit(observedExitCode)
  })
  child.unref()

  const childExitCode = async (): Promise<number | null> => {
    if (observedExitCode !== null) return observedExitCode
    if (child.exitCode !== null) return child.exitCode
    if (child.signalCode !== null) return -1
    if (child.pid === undefined) return -1
    try {
      const stat = await readFile(
        '/proc/' + String(child.pid) + '/stat',
        'utf8'
      )
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
      // Under full-gate load, Node can reap a fast exit after the deadline.
      // Inspect proc state so an already-zombie child cannot become a timeout.
      if (fields[0] !== 'Z') return null
      const waitStatus = Number(fields[49])
      return Number.isInteger(waitStatus) ? (waitStatus >> 8) & 0xff : -1
    } catch {
      return exitObserved
    }
  }
  const throwIfChildExited = async (): Promise<void> => {
    // Cooperative cancellation owns classification even when terminating the
    // child makes its exit observable at the same boundary.
    throwIfAborted(options.signal)
    const exitCode = await childExitCode()
    // Abort can terminate the child while childExitCode is awaiting the exit
    // event. Re-check after observation so cooperative cancellation owns the
    // boundary instead of racing into an early-exit classification.
    throwIfAborted(options.signal)
    if (exitCode !== null) {
      throw new ProofError(
        'early-exit',
        'code-server exited before readiness',
        {
          exitCode,
        }
      )
    }
  }

  let discovered: DiscoveredProofIdentity = {
    runId,
    pid: child.pid ?? null,
    startTimeTicks: null,
    url: null,
  }
  let cancellationCleanup: Promise<void> | null = null
  const cancelChild = () => {
    if (!child.pid) return
    const childPid = child.pid
    cancellationCleanup ??= (async () => {
      // Preserve the exact identity before cooperative termination. Under
      // full-suite load the abort callback can win the first proc read.
      const identityDeadline = Date.now() + 250
      let startTimeTicks = discovered.startTimeTicks
      while (!startTimeTicks && Date.now() < identityDeadline) {
        startTimeTicks = await readProcessStartTime(childPid)
        if (!startTimeTicks) await delay(5)
      }
      if (startTimeTicks) discovered = { ...discovered, startTimeTicks }
      await terminateExactProcessGroup(childPid, STOP_TIMEOUT_MS)
    })()
  }
  options.signal?.addEventListener('abort', cancelChild, { once: true })

  try {
    let startTimeTicks: string | null = null
    const identityDeadline = Date.now() + 1_000
    while (!startTimeTicks && Date.now() < identityDeadline) {
      startTimeTicks = await readProcessStartTime(child.pid ?? -1)
      if (!startTimeTicks) {
        await throwIfChildExited()
        await delay(10, options.signal)
      }
    }
    discovered = { ...discovered, startTimeTicks }
    if (!child.pid || !startTimeTicks) {
      await throwIfChildExited()
      throw new ProofError(
        'spawn-failed',
        'Spawned process identity is unavailable'
      )
    }

    const deadline = startedAt + timeoutMs
    let url: string | null = null
    while (Date.now() < deadline) {
      throwIfAborted(options.signal)
      if (spawnError instanceof Error) {
        throw new ProofError('spawn-failed', 'code-server spawn failed', {
          reason: spawnError.message,
        })
      }
      await throwIfChildExited()

      const output = await readFile(launchLog, 'utf8')
      url = parseLoopbackUrl(output)
      if (url) {
        discovered = { ...discovered, url }
        const handle: ProofHandle = {
          version: 1,
          pid: child.pid,
          url,
          runId,
          startTimeTicks,
        }
        const state: RuntimeState = { ...handle, projectPath }
        await writeFile(
          statePath(runRoot, runId),
          JSON.stringify(state) + '\n',
          {
            mode: 0o600,
          }
        )
        const status = await readinessStatus(url, options.signal)
        if (status !== null && status >= 200 && status < 400) {
          return {
            handle,
            projectPath,
            argv,
            readinessStatus: status,
            elapsedMs: Date.now() - startedAt,
          }
        }
      }
      await delay(50, options.signal)
    }

    await throwIfChildExited()
    throw new ProofError(
      'readiness-timeout',
      'code-server readiness timed out',
      {
        timeoutMs,
      }
    )
  } catch (error) {
    let cleanupError: unknown
    if (child.pid)
      await (
        cancellationCleanup ??
        terminateExactProcessGroup(child.pid, STOP_TIMEOUT_MS)
      ).catch((failure) => {
        cleanupError = failure
      })
    await rm(runDirectory, { recursive: true, force: true }).catch(
      (failure) => {
        cleanupError ??= failure
      }
    )
    const original =
      error instanceof ProofError
        ? error
        : new ProofError(
            'spawn-failed',
            error instanceof Error ? error.message : 'code-server start failed'
          )
    throw new ProofError(
      original.code,
      original.message,
      {
        ...original.details,
        ...(cleanupError
          ? {
              cleanupFailure:
                cleanupError instanceof Error
                  ? cleanupError.message
                  : String(cleanupError),
            }
          : {}),
      },
      discovered
    )
  } finally {
    options.signal?.removeEventListener('abort', cancelChild)
  }
}

export const stopWorkbenchProof = async (
  handleInput: ProofHandle | string,
  options: StopProofOptions = {}
): Promise<StopProofResult> => {
  const startedAt = Date.now()
  const handle =
    typeof handleInput === 'string'
      ? parseProofHandle(handleInput)
      : parseProofHandle(JSON.stringify(handleInput))
  const runRoot = options.runRoot ?? BL001_RUN_ROOT
  const runDirectory = path.join(runRoot, handle.runId)
  let state: RuntimeState | null = null

  try {
    state = JSON.parse(
      await readFile(statePath(runRoot, handle.runId), 'utf8')
    ) as RuntimeState
  } catch {
    if (!(await identityMatches(handle))) {
      return { alreadyAbsent: true, elapsedMs: Date.now() - startedAt }
    }
    throw new ProofError(
      'state-mismatch',
      'Managed state is missing for live handle',
      {
        pid: handle.pid,
      }
    )
  }

  if (
    state.pid !== handle.pid ||
    state.url !== handle.url ||
    state.startTimeTicks !== handle.startTimeTicks ||
    state.runId !== handle.runId
  ) {
    throw new ProofError(
      'state-mismatch',
      'Handle does not match managed state',
      {
        pid: handle.pid,
      }
    )
  }

  const matches = await identityMatches(handle)
  if (matches) {
    await terminateExactProcessGroup(
      handle.pid,
      options.stopTimeoutMs ?? STOP_TIMEOUT_MS
    )
  }
  await rm(runDirectory, { recursive: true, force: true })
  return {
    alreadyAbsent: !matches,
    elapsedMs: Date.now() - startedAt,
  }
}
