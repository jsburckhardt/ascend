import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BL001_FIXTURE,
  BL001_ROOT,
  REPOSITORY_ROOT,
} from '../src/workbench-proof-contract.js'
import {
  ProofError,
  parseLoopbackUrl,
  parseProofHandle,
  readProcessStartTime,
  startWorkbenchProof,
  stopWorkbenchProof,
  validateProjectPath,
} from '../src/workbench-proof-runtime.js'
import { processIdentityAbsent } from '../src/workbench-proof-audit.js'
import { runProofStartCli } from '../src/cli/proof-start.js'
import { runProofStopCli } from '../src/cli/proof-stop.js'

const fakeExecutable = path.join(
  REPOSITORY_ROOT,
  'apps/api/test/fixtures/fake-code-server.mjs'
)
const temporaryRoots: string[] = []

const temporaryRoot = async (): Promise<string> => {
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(BL001_ROOT, { recursive: true })
  )
  const root = await mkdtemp(path.join(BL001_ROOT, 'unit-'))
  temporaryRoots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('workbench proof runtime', () => {
  it('validates projects and loopback handles', async () => {
    await expect(validateProjectPath(BL001_FIXTURE)).resolves.toBe(
      BL001_FIXTURE
    )
    await expect(
      validateProjectPath('/definitely/missing/bl-001')
    ).rejects.toMatchObject({
      code: 'project-missing',
    })

    const root = await temporaryRoot()
    const regularFile = path.join(root, 'regular-file')
    await writeFile(regularFile, 'not a directory')
    await expect(validateProjectPath(regularFile)).rejects.toMatchObject({
      code: 'project-not-directory',
    })
    expect(parseLoopbackUrl('ready http://127.0.0.1:4321/ now')).toBe(
      'http://127.0.0.1:4321/'
    )
    expect(parseLoopbackUrl('http://0.0.0.0:4321/')).toBeNull()
    expect(() => parseProofHandle('{}')).toThrow(ProofError)
    expect(() =>
      parseProofHandle(
        JSON.stringify({
          version: 1,
          pid: 1,
          url: 'not-a-url',
          runId: '00000000-0000-0000-0000-000000000000',
          startTimeTicks: '1',
        })
      )
    ).toThrow(ProofError)
    const validHandle = {
      version: 1,
      pid: 1,
      url: 'http://127.0.0.1:4321/',
      runId: '00000000-0000-0000-0000-000000000000',
      startTimeTicks: '1',
    }
    for (const invalid of [
      null,
      { ...validHandle, version: 2 },
      { ...validHandle, pid: 1.5 },
      { ...validHandle, url: 1 },
      { ...validHandle, runId: 1 },
      { ...validHandle, runId: 'invalid' },
      { ...validHandle, startTimeTicks: 1 },
      { ...validHandle, url: 'https://127.0.0.1:4321/' },
      { ...validHandle, url: 'http://localhost:4321/' },
    ]) {
      expect(() => parseProofHandle(JSON.stringify(invalid))).toThrow(
        ProofError
      )
    }
    expect(() => parseProofHandle('not-json')).toThrow(ProofError)
    await expect(readProcessStartTime(-1)).resolves.toBeNull()

    const stringAbort = new AbortController()
    stringAbort.abort('manual-stop')
    await expect(
      startWorkbenchProof({ signal: stringAbort.signal })
    ).rejects.toMatchObject({ code: 'cancelled', message: 'manual-stop' })
    await expect(
      startWorkbenchProof({
        signal: { aborted: true, reason: 42 } as AbortSignal,
      })
    ).rejects.toMatchObject({
      code: 'cancelled',
      message: 'operation-cancelled',
    })
  })

  it('starts one argument-array process and stops its exact handle twice', async () => {
    const runRoot = await temporaryRoot()
    const capturePath = path.join(runRoot, 'argv.bin')
    const result = await startWorkbenchProof({
      executablePath: fakeExecutable,
      runRoot,
      startupTimeoutMs: 2_000,
      environmentOverrides: {
        BL001_FAKE_MODE: 'ready',
        BL001_CAPTURE_ARGV: capturePath,
      },
    })

    expect(result.readinessStatus).toBe(200)
    expect(result.argv.at(-1)).toBe(BL001_FIXTURE)
    expect((await readFile(capturePath, 'utf8')).split('\0').at(-1)).toBe(
      BL001_FIXTURE
    )
    await expect(
      stopWorkbenchProof(
        { ...result.handle, url: 'http://127.0.0.1:1/' },
        { runRoot }
      )
    ).rejects.toMatchObject({ code: 'state-mismatch' })
    const stateFile = path.join(runRoot, result.handle.runId, 'state.json')
    const state = await readFile(stateFile, 'utf8')
    await rm(stateFile)
    await expect(
      stopWorkbenchProof(result.handle, { runRoot })
    ).rejects.toMatchObject({ code: 'state-mismatch' })
    await writeFile(stateFile, state)
    await expect(
      stopWorkbenchProof(result.handle, { runRoot })
    ).resolves.toMatchObject({
      alreadyAbsent: false,
    })
    await expect(
      stopWorkbenchProof(result.handle, { runRoot })
    ).resolves.toMatchObject({
      alreadyAbsent: true,
    })
  })

  it('emits one handle on CLI stdout and structured lifecycle stderr', async () => {
    const runRoot = await temporaryRoot()
    const stdout: string[] = []
    const stderr: string[] = []
    const exitCode = await runProofStartCli(
      {
        executablePath: fakeExecutable,
        runRoot,
      },
      {
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value),
      }
    )

    expect(exitCode).toBe(0)
    expect(stdout).toHaveLength(1)
    const handle = parseProofHandle(stdout[0])
    expect(JSON.parse(stderr[0])).toMatchObject({
      event: 'runtime.start.succeeded',
      readinessStatus: 200,
    })

    const stopStderr: string[] = []
    await expect(
      runProofStopCli(
        JSON.stringify(handle),
        { runRoot },
        {
          stdout: () => undefined,
          stderr: (value) => stopStderr.push(value),
        }
      )
    ).resolves.toBe(0)
    expect(JSON.parse(stopStderr[0])).toMatchObject({
      event: 'runtime.stop.succeeded',
    })
    const failedStderr: string[] = []
    await expect(
      runProofStopCli(
        'not-json',
        { runRoot },
        { stdout: () => undefined, stderr: (value) => failedStderr.push(value) }
      )
    ).resolves.toBe(1)
    expect(JSON.parse(failedStderr[0])).toMatchObject({
      event: 'runtime.stop.failed',
      code: 'invalid-handle',
    })
  })

  it('retains exact identity on early exit and cooperative start cancellation', async () => {
    const earlyRoot = await temporaryRoot()
    let early: ProofError | null = null
    try {
      await startWorkbenchProof({
        executablePath: fakeExecutable,
        runRoot: earlyRoot,
        startupTimeoutMs: 1_000,
        environmentOverrides: { BL001_FAKE_MODE: 'early-exit' },
      })
    } catch (error) {
      early = error as ProofError
    }
    expect(early).toMatchObject({ code: 'early-exit' })
    expect(early?.discoveredIdentity).toMatchObject({
      pid: expect.any(Number),
      startTimeTicks: expect.any(String),
    })
    await expect(
      processIdentityAbsent({
        pid: early!.discoveredIdentity!.pid!,
        startTimeTicks: early!.discoveredIdentity!.startTimeTicks!,
      })
    ).resolves.toBe(true)

    const cancelledRoot = await temporaryRoot()
    const controller = new AbortController()
    setTimeout(() => controller.abort(new Error('overall-timeout')), 20)
    let cancelled: ProofError | null = null
    try {
      await startWorkbenchProof({
        executablePath: fakeExecutable,
        runRoot: cancelledRoot,
        startupTimeoutMs: 2_000,
        environmentOverrides: { BL001_FAKE_MODE: 'timeout' },
        signal: controller.signal,
      })
    } catch (error) {
      cancelled = error as ProofError
    }
    expect(cancelled).toMatchObject({ code: 'cancelled' })
    expect(cancelled?.discoveredIdentity).toMatchObject({
      pid: expect.any(Number),
      startTimeTicks: expect.any(String),
    })
    await expect(
      processIdentityAbsent({
        pid: cancelled!.discoveredIdentity!.pid!,
        startTimeTicks: cancelled!.discoveredIdentity!.startTimeTicks!,
      })
    ).resolves.toBe(true)
  })

  it('preserves an established identity during later cooperative cancellation', async () => {
    const runRoot = await temporaryRoot()
    const controller = new AbortController()
    setTimeout(() => controller.abort(new Error('overall-timeout')), 250)
    let cancelled: ProofError | null = null
    try {
      await startWorkbenchProof({
        executablePath: fakeExecutable,
        runRoot,
        startupTimeoutMs: 2_000,
        environmentOverrides: { BL001_FAKE_MODE: 'timeout' },
        signal: controller.signal,
      })
    } catch (error) {
      cancelled = error as ProofError
    }
    expect(cancelled).toMatchObject({ code: 'cancelled' })
    expect(cancelled?.discoveredIdentity).toMatchObject({
      pid: expect.any(Number),
      startTimeTicks: expect.any(String),
    })
    await expect(
      processIdentityAbsent({
        pid: cancelled!.discoveredIdentity!.pid!,
        startTimeTicks: cancelled!.discoveredIdentity!.startTimeTicks!,
      })
    ).resolves.toBe(true)
  })
})
