import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { constants, readFileSync } from 'node:fs'
import {
  access,
  mkdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import {
  TERMINAL_COMMANDS,
  TERMINAL_COMMAND_TIMEOUT_MS,
  TERMINAL_TOOL_COMMANDS,
  normalizeTerminalOutput,
  type ExecutableResolution,
  type TerminalCommandSpec,
  type TerminalContext,
} from './workbench-proof-contract.js'
import {
  readProcessStartTime,
  terminateExactProcessGroup,
} from './workbench-proof-runtime.js'

export type TerminalProofErrorCode =
  | 'terminal-executable-missing'
  | 'terminal-command-spawn'
  | 'terminal-command-nonzero'
  | 'terminal-command-timeout'
  | 'terminal-episode-timeout'
  | 'terminal-artifact-write'

export class TerminalProofError extends Error {
  readonly code: TerminalProofErrorCode
  readonly details: Record<string, number | string>

  constructor(
    code: TerminalProofErrorCode,
    message: string,
    details: Record<string, number | string>
  ) {
    super(message)
    this.name = 'TerminalProofError'
    this.code = code
    this.details = details
  }
}

export interface TerminalCommandResult {
  context: TerminalContext
  key: string
  command: string
  executable: string
  args: string[]
  cwd: string
  timeoutMs: number
  exitResult: number
  timedOut: boolean
  raw: { stdout: string; stderr: string }
  normalized: { stdout: string; stderr: string }
  process: { pid: number; startTimeTicks: string }
  cleanup: { exactProcessAbsent: boolean }
}

export interface TerminalRawEvidence {
  version: 1
  context: TerminalContext
  cwd: string
  environment: {
    PATH: string
    resolutions: ExecutableResolution[]
  }
  commands: TerminalCommandResult[]
}

const processIdentityAbsent = async (
  pid: number,
  startTimeTicks: string
): Promise<boolean> => (await readProcessStartTime(pid)) !== startTimeTicks

const readProcessStartTimeImmediately = (pid: number): string | null => {
  try {
    const content = readFileSync('/proc/' + String(pid) + '/stat', 'utf8')
    return content.slice(content.lastIndexOf(')') + 2).split(' ')[19]
  } catch {
    return null
  }
}

export const resolveExecutable = async (
  executable: string,
  pathValue: string
): Promise<string | null> => {
  for (const directory of pathValue.split(path.delimiter)) {
    if (!directory) continue
    const candidate = path.join(directory, executable)
    try {
      await access(candidate, constants.X_OK)
      return await realpath(candidate)
    } catch {
      // Continue through the deterministic PATH search.
    }
  }
  return null
}

export const resolveFixedExecutables = async (
  pathValue: string
): Promise<ExecutableResolution[]> => {
  const executables = [
    ...new Set(TERMINAL_TOOL_COMMANDS.map(({ executable }) => executable)),
  ]
  return Promise.all(
    executables.map(async (executable) => ({
      executable,
      canonicalPath: await resolveExecutable(executable, pathValue),
    }))
  )
}

export const preflightFixedExecutables = async (
  pathValue: string
): Promise<ExecutableResolution[]> => {
  const resolutions = await resolveFixedExecutables(pathValue)
  const missing = resolutions.find(
    ({ canonicalPath }) => canonicalPath === null
  )
  if (missing) {
    throw new TerminalProofError(
      'terminal-executable-missing',
      'Fixed terminal-parity executable is unavailable',
      { executable: missing.executable }
    )
  }
  return resolutions
}

export interface RunTerminalCommandOptions {
  context: TerminalContext
  command: TerminalCommandSpec
  cwd: string
  environment?: NodeJS.ProcessEnv
  timeoutMs?: number
}

export const runTerminalCommand = async (
  options: RunTerminalCommandOptions
): Promise<TerminalCommandResult> => {
  const timeoutMs = options.timeoutMs ?? TERMINAL_COMMAND_TIMEOUT_MS
  const environment = options.environment ?? process.env
  const resolved = await resolveExecutable(
    options.command.executable,
    environment.PATH ?? ''
  )
  if (!resolved) {
    throw new TerminalProofError(
      'terminal-executable-missing',
      'Terminal command executable is unavailable',
      { executable: options.command.executable }
    )
  }

  let child
  try {
    child = spawn(resolved, options.command.args, {
      cwd: options.cwd,
      env: environment,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    throw new TerminalProofError(
      'terminal-command-spawn',
      'Terminal command could not be spawned',
      {
        command: options.command.command,
        context: options.context,
        reason: error instanceof Error ? error.message : 'unknown',
      }
    )
  }

  if (!child.pid) {
    throw new TerminalProofError(
      'terminal-command-spawn',
      'Terminal command process identity is unavailable',
      { command: options.command.command, context: options.context }
    )
  }
  const pid = child.pid
  let startTimeTicks = readProcessStartTimeImmediately(pid)
  if (!startTimeTicks) startTimeTicks = await readProcessStartTime(pid)
  for (let attempt = 0; !startTimeTicks && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5))
    startTimeTicks = await readProcessStartTime(pid)
  }
  if (!startTimeTicks) {
    await terminateExactProcessGroup(pid, Math.min(timeoutMs, 500))
    throw new TerminalProofError(
      'terminal-command-spawn',
      'Terminal command start identity is unavailable',
      { command: options.command.command, context: options.context }
    )
  }

  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk
  })
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })

  let timedOut = false
  let spawnError: Error | null = null
  child.once('error', (error) => {
    spawnError = error
  })
  const exitResult = await new Promise<number>((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true
      void terminateExactProcessGroup(pid, Math.min(timeoutMs, 1_000))
    }, timeoutMs)
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve(code ?? -1)
    })
  })
  const exactProcessAbsent = await processIdentityAbsent(pid, startTimeTicks)

  const capturedSpawnError = spawnError as Error | null
  if (capturedSpawnError) {
    throw new TerminalProofError(
      'terminal-command-spawn',
      'Terminal command spawn failed',
      {
        command: options.command.command,
        context: options.context,
        reason: capturedSpawnError.message,
      }
    )
  }
  if (timedOut) {
    throw new TerminalProofError(
      'terminal-command-timeout',
      'Terminal command exceeded its finite timeout',
      {
        command: options.command.command,
        context: options.context,
        timeoutMs,
      }
    )
  }
  if (!exactProcessAbsent) {
    throw new TerminalProofError(
      'terminal-command-spawn',
      'Terminal command identity remained after exit',
      { command: options.command.command, context: options.context, pid }
    )
  }
  if (exitResult !== 0) {
    throw new TerminalProofError(
      'terminal-command-nonzero',
      'Terminal command returned nonzero',
      {
        command: options.command.command,
        context: options.context,
        exitResult,
      }
    )
  }

  return {
    context: options.context,
    key: options.command.key,
    command: options.command.command,
    executable: options.command.executable,
    args: [...options.command.args],
    cwd: options.cwd,
    timeoutMs,
    exitResult,
    timedOut,
    raw: { stdout, stderr },
    normalized: {
      stdout: normalizeTerminalOutput(stdout),
      stderr: normalizeTerminalOutput(stderr),
    },
    process: { pid, startTimeTicks },
    cleanup: { exactProcessAbsent },
  }
}

export interface CaptureTerminalContextOptions {
  context: TerminalContext
  cwd: string
  environment?: NodeJS.ProcessEnv
  timeoutMs?: number
  commands?: readonly TerminalCommandSpec[]
}

export const captureTerminalContext = async (
  options: CaptureTerminalContextOptions
): Promise<TerminalRawEvidence> => {
  const environment = options.environment ?? process.env
  const pathValue = environment.PATH ?? ''
  const resolutions = await preflightFixedExecutables(pathValue)
  const commands: TerminalCommandResult[] = []
  for (const command of options.commands ?? TERMINAL_COMMANDS) {
    commands.push(
      await runTerminalCommand({
        context: options.context,
        command,
        cwd: options.cwd,
        environment,
        timeoutMs: options.timeoutMs,
      })
    )
  }
  return {
    version: 1,
    context: options.context,
    cwd: options.cwd,
    environment: { PATH: pathValue, resolutions },
    commands,
  }
}

export const writeJsonAtomic = async (
  target: string,
  value: unknown
): Promise<void> => {
  const temporary = target + '.' + randomUUID() + '.tmp'
  try {
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
      mode: 0o600,
    })
    await rename(temporary, target)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw new TerminalProofError(
      'terminal-artifact-write',
      'Terminal parity evidence could not be written atomically',
      {
        target,
        reason: error instanceof Error ? error.message : 'unknown',
      }
    )
  }
}
