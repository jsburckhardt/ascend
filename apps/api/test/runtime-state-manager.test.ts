import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  HealthAttempt,
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeProcessDependencies,
  RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

const project = {
  id: 'race-project',
  name: 'Race project',
  canonicalPath: '/safe/race',
  createdAt: 1,
}

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
})

const healthFailure: HealthAttempt = {
  elapsedMs: 1,
  status: 503,
  bodyStatus: null,
  timedOut: false,
}

function terminationAudit(pid: number, port: number): RuntimeTerminationAudit {
  return {
    pid,
    processStartTime: String(pid * 10),
    port,
    outcome: 'graceful',
    processAbsent: true,
    processGroupAbsent: true,
    listenerAbsent: true,
  }
}

async function runRace(
  contender: 'health' | 'liveness',
  winner: 'exit' | 'reuse'
): Promise<void> {
  const pid = contender === 'health' ? 701 : 702
  const port = 44_000 + pid
  const exit = deferred<RuntimeExit>()
  const liveness = deferred<boolean>()
  const health = deferred<HealthAttempt>()
  const cleanup = deferred<RuntimeTerminationAudit>()
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    isAlive: vi.fn(() =>
      contender === 'health' ? Promise.resolve(true) : liveness.promise
    ),
    terminate: vi.fn(() => cleanup.promise),
    audit: vi.fn(async (observedPort) => ({
      pid,
      processStartTime: String(pid * 10),
      port: observedPort,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
  }
  const ready: ReadyRuntime = {
    process,
    port,
    internalUrl: 'http://127.0.0.1:' + String(port),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: vi.fn(async () => undefined),
      launch: vi.fn(),
    },
    ports: { acquire: vi.fn() },
    health: {
      check: vi.fn(() => health.promise),
    },
    now: vi.fn(() => 20),
    sleep: vi.fn(),
  }
  const events: RuntimeSafeLifecycleEvent[] = []
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async () => project),
    config,
    processDependencies,
    launch: vi.fn(async () => ready),
    now: vi.fn(() => 20),
    recordEvent: (event) => events.push(event),
  })

  await manager.start({
    projectId: project.id,
    canonicalPath: project.canonicalPath,
  })
  const reuse = manager
    .start({ projectId: project.id, canonicalPath: project.canonicalPath })
    .catch((error: unknown) => error)
  if (contender === 'health') {
    await vi.waitFor(() =>
      expect(processDependencies.health.check).toHaveBeenCalledOnce()
    )
  } else {
    await vi.waitFor(() => expect(process.isAlive).toHaveBeenCalledOnce())
  }

  if (winner === 'exit') {
    exit.resolve({ code: 9, signal: null, addressInUse: false })
    await vi.waitFor(() =>
      expect(manager.reportPublicStates([project.id])[0]).toEqual({
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'early-exit-code',
      })
    )
    if (contender === 'health') health.resolve(healthFailure)
    else liveness.resolve(false)
  } else {
    if (contender === 'health') health.resolve(healthFailure)
    else liveness.resolve(false)
    await vi.waitFor(() =>
      expect(manager.reportPublicStates([project.id])[0]?.state).toBe('Failed')
    )
    exit.resolve({ code: 9, signal: null, addressInUse: false })
    await vi.waitFor(() => expect(manager.audit!().backgroundTasks).toBe(0))
    cleanup.resolve(terminationAudit(pid, port))
  }

  const result = await reuse
  const retained = manager.lastFailure(project.id)
  expect(result).toBe(retained)
  expect(retained?.category).toBe(
    winner === 'exit'
      ? 'early-exit-code'
      : contender === 'health'
        ? 'health-status-unexpected'
        : 'early-exit-code'
  )
  await vi.waitFor(() => expect(manager.audit!().backgroundTasks).toBe(0))
  expect(
    events.filter(({ event }) => event === 'runtime.health.changed')
  ).toEqual([
    expect.objectContaining({
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
      classification: retained?.category,
    }),
  ])
  expect(process.terminate).toHaveBeenCalledTimes(winner === 'reuse' ? 1 : 0)
  expect(process.audit).toHaveBeenCalledTimes(winner === 'exit' ? 1 : 0)
  expect(manager.lastCleanup(project.id)?.outcome).toBe(
    winner === 'exit' ? 'already-absent' : 'graceful'
  )
  const firstReport = manager.reportPublicStates([project.id])
  expect(manager.reportPublicStates([project.id])).toEqual(firstReport)
  await manager.shutdown()
  expect(process.terminate).toHaveBeenCalledTimes(winner === 'reuse' ? 1 : 0)
}

describe('guarded running to failed transition', () => {
  it.each([
    ['health', 'exit'],
    ['health', 'reuse'],
    ['liveness', 'exit'],
    ['liveness', 'reuse'],
  ] as const)('settles the %s versus exit race when %s wins', runRace)

  it('emits once before surfacing a cleanup rejection', async () => {
    const pid = 703
    const port = 44_703
    const exit = deferred<RuntimeExit>()
    const cleanupError = new Error('controlled cleanup rejection')
    const process: OwnedRuntimeProcess = {
      pid,
      processStartTime: String(pid * 10),
      exit: exit.promise,
      isAlive: vi.fn(async () => true),
      terminate: vi
        .fn()
        .mockRejectedValueOnce(cleanupError)
        .mockImplementationOnce(async () => terminationAudit(pid, port)),
      audit: vi.fn(async (observedPort) => ({
        pid,
        processStartTime: String(pid * 10),
        port: observedPort,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })),
    }
    const ready: ReadyRuntime = {
      process,
      port,
      internalUrl: 'http://127.0.0.1:' + String(port),
      readinessAttempts: [],
    }
    const events: RuntimeSafeLifecycleEvent[] = []
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      launch: vi.fn(async () => ready),
      processDependencies: {
        process: { assertLaunchable: vi.fn(), launch: vi.fn() },
        ports: { acquire: vi.fn() },
        health: { check: vi.fn(async () => healthFailure) },
        now: vi.fn(() => 1),
        sleep: vi.fn(),
      },
      recordEvent: (event) => events.push(event),
    })
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toBe(cleanupError)
    expect(manager.reportPublicStates([project.id])).toEqual([
      {
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'health-status-unexpected',
      },
    ])
    expect(
      events.filter(({ event }) => event === 'runtime.health.changed')
    ).toHaveLength(1)
    exit.resolve({ code: 9, signal: null, addressInUse: false })
    await vi.waitFor(() => expect(manager.audit!().backgroundTasks).toBe(0))
    await manager.shutdown()
    expect(process.terminate).toHaveBeenCalledTimes(2)
    expect(
      events.filter(({ event }) => event === 'runtime.health.changed')
    ).toHaveLength(1)
  })

  it('suppresses the terminal transition during manager shutdown', async () => {
    const pid = 704
    const port = 44_704
    const exit = deferred<RuntimeExit>()
    const process: OwnedRuntimeProcess = {
      pid,
      processStartTime: String(pid * 10),
      exit: exit.promise,
      isAlive: vi.fn(async () => true),
      terminate: vi.fn(async () => {
        exit.resolve({ code: 0, signal: null, addressInUse: false })
        return terminationAudit(pid, port)
      }),
      audit: vi.fn(async () => terminationAudit(pid, port)),
    }
    const events: RuntimeSafeLifecycleEvent[] = []
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      launch: vi.fn(async () => ({
        process,
        port,
        internalUrl: 'http://127.0.0.1:' + String(port),
        readinessAttempts: [],
      })),
      recordEvent: (event) => events.push(event),
    })
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await manager.shutdown()
    expect(
      events.filter(({ event }) => event === 'runtime.health.changed')
    ).toEqual([])
  })
})
