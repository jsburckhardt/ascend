import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BL001_FIXTURE, BL001_ROOT } from '../src/workbench-proof-contract.js'
import { readProcessStartTime } from '../src/workbench-proof-runtime.js'
import {
  TerminalProofError,
  captureTerminalContext,
  preflightFixedExecutables,
  runTerminalCommand,
  writeJsonAtomic,
  type TrackedTerminalCommandIdentity,
} from '../src/workbench-proof-terminal.js'

let root = ''
let bin = ''
const fakePath = (): string =>
  bin + path.delimiter + path.dirname(process.execPath)

beforeEach(async () => {
  await mkdir(BL001_ROOT, { recursive: true })
  root = await mkdtemp(path.join(BL001_ROOT, 'terminal-executor-'))
  bin = path.join(root, 'bin')
  await mkdir(bin)
  const executable = path.join(root, 'fake-command.mjs')
  const fakeSource = [
    '#!/usr/bin/env node',
    'import { writeFileSync } from "node:fs"',
    'if (process.env.CAPTURE_FILE) writeFileSync(process.env.CAPTURE_FILE, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }))',
    'if (process.env.FAKE_MODE === "timeout") setInterval(() => undefined, 1000)',
    'else {',
    '  process.stdout.write("  stdout " + process.argv.slice(2).join("|") + "\\r\\n")',
    '  process.stderr.write("stderr\\rline\\r\\n")',
    '  if (process.env.FAKE_MODE === "nonzero") process.exitCode = 23',
    '}',
    '',
  ].join('\n')
  await writeFile(executable, fakeSource)
  await chmod(executable, 0o755)
  for (const name of ['git', 'gh', 'tmux', 'docker', 'copilot']) {
    await symlink(executable, path.join(bin, name))
  }
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('BL-002 shared terminal executor', () => {
  it('captures exact argv, cwd, streams, normalization, identity, and raw references', async () => {
    const captureFile = path.join(root, 'capture.json')
    const environment = {
      ...process.env,
      PATH: fakePath(),
      CAPTURE_FILE: captureFile,
    }
    const command = {
      key: 'git-status',
      executable: 'git',
      args: ['status', '--short'],
      command: 'git status --short',
    }
    const started: TrackedTerminalCommandIdentity[] = []
    const direct = await captureTerminalContext({
      context: 'direct',
      cwd: BL001_FIXTURE,
      environment,
      commands: [command],
      onProcessStarted: (identity) => started.push(identity),
    })
    const integrated = await captureTerminalContext({
      context: 'integrated',
      cwd: BL001_FIXTURE,
      environment,
      commands: [command],
      onProcessStarted: (identity) => started.push(identity),
    })

    expect(started).toHaveLength(2)
    expect(
      started.map(({ context, command: text, pgid, pid }) => ({
        context,
        command: text,
        exactGroup: pgid === pid,
      }))
    ).toEqual([
      { context: 'direct', command: 'git status --short', exactGroup: true },
      {
        context: 'integrated',
        command: 'git status --short',
        exactGroup: true,
      },
    ])
    expect(JSON.parse(await readFile(captureFile, 'utf8'))).toEqual({
      argv: ['status', '--short'],
      cwd: BL001_FIXTURE,
    })
    expect(direct.commands[0]).toMatchObject({
      context: 'direct',
      command: 'git status --short',
      args: ['status', '--short'],
      cwd: BL001_FIXTURE,
      timeoutMs: 5_000,
      exitResult: 0,
      timedOut: false,
      raw: {
        stdout: '  stdout status|--short\r\n',
        stderr: 'stderr\rline\r\n',
      },
      normalized: {
        stdout: '  stdout status|--short\n',
        stderr: 'stderr\nline\n',
      },
      cleanup: { exactProcessAbsent: true },
    })
    expect(integrated.commands[0].normalized).toEqual(
      direct.commands[0].normalized
    )
    expect(Object.keys(direct.environment).sort()).toEqual([
      'PATH',
      'resolutions',
    ])
    expect(direct.environment.resolutions).toHaveLength(5)

    const directPath = path.join(root, 'evidence', 'direct.raw.json')
    const integratedPath = path.join(root, 'evidence', 'integrated.raw.json')
    await writeJsonAtomic(directPath, direct)
    await writeJsonAtomic(integratedPath, integrated)
    await expect(
      readFile(directPath, 'utf8').then(JSON.parse)
    ).resolves.toEqual(direct)
    await expect(
      readFile(integratedPath, 'utf8').then(JSON.parse)
    ).resolves.toEqual(integrated)
  })

  it('distinguishes missing, context-specific nonzero, and bounded timeout', async () => {
    await expect(preflightFixedExecutables('')).rejects.toMatchObject({
      code: 'terminal-executable-missing',
      details: { executable: 'git' },
    })
    const command = {
      key: 'git-version',
      executable: 'git',
      args: ['--version'],
      command: 'git --version',
    }
    for (const context of ['direct', 'integrated'] as const) {
      await expect(
        runTerminalCommand({
          context,
          command,
          cwd: BL001_FIXTURE,
          environment: {
            ...process.env,
            PATH: fakePath(),
            FAKE_MODE: 'nonzero',
          },
        })
      ).rejects.toMatchObject({
        code: 'terminal-command-nonzero',
        details: { command: 'git --version', context, exitResult: 23 },
      })
      await expect(
        runTerminalCommand({
          context,
          command,
          cwd: BL001_FIXTURE,
          timeoutMs: 50,
          environment: {
            ...process.env,
            PATH: fakePath(),
            FAKE_MODE: 'timeout',
          },
        })
      ).rejects.toMatchObject({
        code: 'terminal-command-timeout',
        details: { command: 'git --version', context, timeoutMs: 50 },
      })
    }
  })

  it('terminates the exact command when identity tracking fails', async () => {
    let started: TrackedTerminalCommandIdentity | null = null
    await expect(
      runTerminalCommand({
        context: 'integrated',
        command: {
          key: 'git-version',
          executable: 'git',
          args: ['--version'],
          command: 'git --version',
        },
        cwd: BL001_FIXTURE,
        environment: { ...process.env, PATH: fakePath() },
        onProcessStarted: (identity) => {
          started = identity
          throw new Error('tracker write failed')
        },
      })
    ).rejects.toMatchObject({
      code: 'terminal-artifact-write',
      details: {
        command: 'git --version',
        context: 'integrated',
        reason: 'tracker write failed',
      },
    })
    expect(started).not.toBeNull()
    await expect(readProcessStartTime(started!.pid)).resolves.not.toBe(
      started!.startTimeTicks
    )
    await expect(
      runTerminalCommand({
        context: 'direct',
        command: {
          key: 'git-version',
          executable: 'git',
          args: ['--version'],
          command: 'git --version',
        },
        cwd: BL001_FIXTURE,
        environment: { ...process.env, PATH: fakePath() },
        onProcessStarted: () => {
          throw Object.create(null)
        },
      })
    ).rejects.toMatchObject({
      code: 'terminal-artifact-write',
      details: { reason: 'unknown' },
    })
  })

  it('reports atomic artifact failures without leaving a temporary file', async () => {
    const parent = path.join(root, 'not-a-directory')
    await writeFile(parent, 'file')
    const target = path.join(parent, 'episode.json')
    await expect(
      writeJsonAtomic(target, { result: 'passed' })
    ).rejects.toBeInstanceOf(TerminalProofError)
    await expect(writeJsonAtomic(target, {})).rejects.toMatchObject({
      code: 'terminal-artifact-write',
      details: { target },
    })
  })

  it('uses the process environment and complete command list by default', async () => {
    const evidence = await captureTerminalContext({
      context: 'direct',
      cwd: BL001_FIXTURE,
    })
    expect(evidence.commands.map(({ command }) => command)).toEqual([
      'hostname',
      'id -un',
      'pwd -P',
      'git --version',
      'git status --short',
      'gh --version',
      'tmux -V',
      'docker --version',
      'copilot --version',
    ])
  })

  it('uses direct defaults and rejects an environment without PATH', async () => {
    await expect(
      runTerminalCommand({
        context: 'direct',
        command: {
          key: 'hostname',
          executable: 'hostname',
          args: [],
          command: 'hostname',
        },
        cwd: BL001_FIXTURE,
      })
    ).resolves.toMatchObject({ exitResult: 0, timeoutMs: 5_000 })
    await expect(
      runTerminalCommand({
        context: 'direct',
        command: {
          key: 'missing',
          executable: 'missing',
          args: [],
          command: 'missing',
        },
        cwd: BL001_FIXTURE,
        environment: {},
      })
    ).rejects.toMatchObject({
      code: 'terminal-executable-missing',
      details: { executable: 'missing' },
    })
  })
})
