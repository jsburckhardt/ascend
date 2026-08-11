import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BL001_FIXTURE,
  BL001_INJECTION_SENTINEL,
  BL001_ROOT,
  REPOSITORY_ROOT,
  snapshotFixture,
} from '../src/workbench-proof-contract.js'
import {
  auditHandleAbsent,
  decodeListenerAddress,
  readManagedListeners,
  readManagedProcesses,
} from '../src/workbench-proof-audit.js'
import {
  startWorkbenchProof,
  stopWorkbenchProof,
  type ProofError,
  type ProofHandle,
  type StartProofOptions,
} from '../src/workbench-proof-runtime.js'
import { runProofStartCli } from '../src/cli/proof-start.js'
import {
  processGroupAbsent,
  readProcessGroupMembers,
  stopOwnedProcessGroup,
} from './helpers/project-home-process-group.js'

const fakeExecutable = path.join(
  REPOSITORY_ROOT,
  'apps/api/test/fixtures/fake-code-server.mjs'
)
const ownedProcessGroupFixture = path.join(
  REPOSITORY_ROOT,
  'apps/api/test/fixtures/owned-process-group.mjs'
)
const temporaryRoots: string[] = []
const activeHandles: Array<{ handle: ProofHandle; runRoot: string }> = []
const activeControls: number[] = []
const activeOwnedGroups = new Set<number>()

const temporaryRoot = async (): Promise<string> => {
  await mkdir(BL001_ROOT, { recursive: true })
  const root = await mkdtemp(path.join(BL001_ROOT, 'failure-'))
  temporaryRoots.push(root)
  return root
}

const startOwnedProcessGroup = async (stubbornDescendant: boolean) => {
  const child = spawn(
    process.execPath,
    [ownedProcessGroupFixture, stubbornDescendant ? 'stubborn' : 'cooperative'],
    { detached: true, stdio: 'pipe' }
  )
  if (child.pid === undefined) throw new Error('Fixture process did not start')
  activeOwnedGroups.add(child.pid)
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject)
    child.stdout.once('data', () => resolve())
  })
  return { process: child as ChildProcessWithoutNullStreams }
}

const exists = async (target: string): Promise<boolean> => {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

const processExists = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const waitForProcessAbsence = async (pid: number): Promise<void> => {
  const deadline = Date.now() + 1_000
  while (processExists(pid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

afterEach(async () => {
  for (const active of activeHandles.splice(0)) {
    await stopWorkbenchProof(active.handle, {
      runRoot: active.runRoot,
      stopTimeoutMs: 500,
    }).catch(() => undefined)
  }
  for (const pid of activeControls.splice(0)) {
    if (processExists(pid)) process.kill(-pid, 'SIGKILL')
  }
  for (const groupId of activeOwnedGroups) {
    try {
      process.kill(-groupId, 'SIGKILL')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
  activeOwnedGroups.clear()
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('workbench proof failures and cleanup boundaries', () => {
  it('decodes designated loopback listener addresses', () => {
    expect(decodeListenerAddress('0100007F')).toBe('127.0.0.1')
    expect(decodeListenerAddress('00000000000000000000000001000000')).toBe(
      '::1'
    )
    expect(decodeListenerAddress('00000000')).toBe('00000000')
  })

  it('returns condition-specific diagnostics for exactly five bounded failures', async () => {
    const fixtureBefore = await snapshotFixture()
    await expect(access(BL001_INJECTION_SENTINEL)).rejects.toThrow()
    const base = await temporaryRoot()
    const regularFile = path.join(base, 'regular-file')
    await writeFile(regularFile, 'not a directory')

    const cases: Array<{
      name: string
      code: string
      options: StartProofOptions
      detail: [string, number | string]
      pidPath?: string
    }> = [
      {
        name: 'missing executable',
        code: 'executable-missing',
        options: {
          executablePath: path.join(base, 'missing-code-server'),
          projectPath: BL001_FIXTURE,
        },
        detail: ['executablePath', path.join(base, 'missing-code-server')],
      },
      {
        name: 'nonexistent project path',
        code: 'project-missing',
        options: {
          executablePath: fakeExecutable,
          projectPath: path.join(base, 'missing-project'),
        },
        detail: ['path', path.join(base, 'missing-project')],
      },
      {
        name: 'regular-file project path',
        code: 'project-not-directory',
        options: { executablePath: fakeExecutable, projectPath: regularFile },
        detail: ['path', regularFile],
      },
      {
        name: 'readiness timeout',
        code: 'readiness-timeout',
        options: {
          executablePath: fakeExecutable,
          projectPath: BL001_FIXTURE,
          startupTimeoutMs: 150,
          environmentOverrides: {
            BL001_FAKE_MODE: 'timeout',
            BL001_CAPTURE_PID: path.join(base, 'timeout.pid'),
            BL001_SECRET_MARKER: 'must-not-leak',
          },
        },
        detail: ['timeoutMs', 150],
        pidPath: path.join(base, 'timeout.pid'),
      },
      {
        name: 'early exit',
        code: 'early-exit',
        options: {
          executablePath: fakeExecutable,
          projectPath: BL001_FIXTURE,
          startupTimeoutMs: 2_000,
          environmentOverrides: {
            BL001_FAKE_MODE: 'early-exit',
            BL001_CAPTURE_PID: path.join(base, 'early.pid'),
          },
        },
        detail: ['exitCode', 23],
        pidPath: path.join(base, 'early.pid'),
      },
    ]

    expect(cases).toHaveLength(5)
    for (const failure of cases) {
      const runRoot = path.join(base, failure.name.replaceAll(' ', '-'), 'runs')
      const stdout: string[] = []
      const stderr: string[] = []
      const exitCode = await runProofStartCli(
        { ...failure.options, runRoot },
        {
          stdout: (value) => stdout.push(value),
          stderr: (value) => stderr.push(value),
        }
      )
      expect(exitCode, failure.name).toBe(1)
      expect(stdout, failure.name).toEqual([])
      expect(stderr, failure.name).toHaveLength(1)
      const diagnostic = JSON.parse(stderr[0])
      expect(diagnostic, failure.name).toMatchObject({
        event: 'runtime.start.failed',
        code: failure.code,
        details: { [failure.detail[0]]: failure.detail[1] },
      })
      expect(stderr[0]).not.toContain('must-not-leak')
      if (await exists(runRoot)) expect(await readdir(runRoot)).toEqual([])
      if (failure.pidPath && (await exists(failure.pidPath))) {
        const pid = Number(await readFile(failure.pidPath, 'utf8'))
        await waitForProcessAbsence(pid)
        expect(processExists(pid), failure.name).toBe(false)
      }
    }

    expect(await snapshotFixture()).toEqual(fixtureBefore)
    await expect(access(BL001_INJECTION_SENTINEL)).rejects.toThrow()
  })

  it('distinguishes a fast early exit from a live readiness timeout', async () => {
    const base = await temporaryRoot()
    const failureFor = async (
      mode: 'early-exit' | 'timeout',
      startupTimeoutMs: number
    ): Promise<ProofError> => {
      try {
        await startWorkbenchProof({
          executablePath: fakeExecutable,
          projectPath: BL001_FIXTURE,
          runRoot: path.join(base, mode),
          startupTimeoutMs,
          environmentOverrides: { BL001_FAKE_MODE: mode },
        })
      } catch (error) {
        return error as ProofError
      }
      throw new Error(mode + ' unexpectedly became ready')
    }

    await expect(failureFor('early-exit', 2_000)).resolves.toMatchObject({
      code: 'early-exit',
      details: { exitCode: 23 },
    })
    await expect(failureFor('timeout', 150)).resolves.toMatchObject({
      code: 'readiness-timeout',
      details: { timeoutMs: 150 },
    })
  })

  it('audits exact ownership, argv, listener, stop, and unrelated survival', async () => {
    const runRoot = await temporaryRoot()
    const control = spawn(
      process.execPath,
      ['-e', 'setInterval(() => undefined, 1000)'],
      {
        detached: true,
        stdio: 'ignore',
      }
    )
    if (!control.pid) throw new Error('Control process did not start')
    control.unref()
    activeControls.push(control.pid)

    const result = await startWorkbenchProof({
      executablePath: fakeExecutable,
      runRoot,
      startupTimeoutMs: 2_000,
      environmentOverrides: { BL001_FAKE_MODE: 'ready' },
    })
    activeHandles.push({ handle: result.handle, runRoot })
    expect(await auditHandleAbsent(result.handle)).toBe(false)
    expect(await readManagedProcesses(-1)).toEqual([])
    expect(await readManagedListeners([-1])).toEqual([])
    const processes = await readManagedProcesses(result.handle.pid)
    const listeners = await readManagedListeners(
      processes.map((entry) => entry.pid)
    )
    const port = Number(new URL(result.handle.url).port)

    expect(processes.length).toBeGreaterThan(0)
    expect(
      processes.every(
        (entry) => entry.realUid === 1000 && entry.effectiveUid === 1000
      )
    ).toBe(true)
    expect(processes.every((entry) => entry.user === 'vscode')).toBe(true)
    expect(
      processes.some(
        (entry) =>
          entry.argv.filter((argument) => argument === BL001_FIXTURE).length ===
          1
      )
    ).toBe(true)
    expect(listeners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: '127.0.0.1', port }),
      ])
    )
    expect(
      listeners.every((entry) => ['127.0.0.1', '::1'].includes(entry.address))
    ).toBe(true)

    await expect(
      stopWorkbenchProof(result.handle, { runRoot })
    ).resolves.toMatchObject({ alreadyAbsent: false })
    await expect(
      stopWorkbenchProof(result.handle, { runRoot })
    ).resolves.toMatchObject({ alreadyAbsent: true })
    expect(await auditHandleAbsent(result.handle)).toBe(true)
    expect(processExists(control.pid)).toBe(true)
  })

  it('observes cooperative Project Home root and descendant cleanup', async () => {
    const owned = await startOwnedProcessGroup(false)
    expect(await readProcessGroupMembers(owned.process.pid!)).toHaveLength(2)

    await expect(stopOwnedProcessGroup(owned, 1_000)).resolves.toEqual({
      childExited: true,
      graceful: true,
      processGroupAbsent: true,
    })
    expect(await processGroupAbsent(owned.process.pid!)).toBe(true)
    activeOwnedGroups.delete(owned.process.pid!)
  })

  it('detects and removes a Project Home descendant that survives root exit', async () => {
    const owned = await startOwnedProcessGroup(true)
    expect(await readProcessGroupMembers(owned.process.pid!)).toHaveLength(2)

    await expect(stopOwnedProcessGroup(owned, 100)).resolves.toEqual({
      childExited: true,
      graceful: false,
      processGroupAbsent: true,
    })
    expect(await processGroupAbsent(owned.process.pid!)).toBe(true)
    activeOwnedGroups.delete(owned.process.pid!)
  })

  it('uses bounded SIGKILL escalation for an exact managed group', async () => {
    const runRoot = await temporaryRoot()
    const result = await startWorkbenchProof({
      executablePath: fakeExecutable,
      runRoot,
      startupTimeoutMs: 2_000,
      environmentOverrides: { BL001_FAKE_MODE: 'ignore-term' },
    })
    activeHandles.push({ handle: result.handle, runRoot })
    await expect(
      stopWorkbenchProof(result.handle, { runRoot, stopTimeoutMs: 500 })
    ).resolves.toMatchObject({ alreadyAbsent: false })
    expect(await auditHandleAbsent(result.handle)).toBe(true)
  })
})
