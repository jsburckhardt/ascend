import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
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
  id: 'project-1',
  name: 'Project One',
  canonicalPath: '/projects/one',
  createdAt: 1,
}

function readyRuntime(
  pid: number,
  terminateAudit?: RuntimeTerminationAudit
): ReadyRuntime & {
  readonly process: OwnedRuntimeProcess
} {
  const exit = deferred<RuntimeExit>()
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    terminate: vi.fn(async (_graceful, _force, port) => {
      const audit =
        terminateAudit ??
        ({
          pid,
          processStartTime: String(pid * 10),
          port,
          outcome: 'graceful',
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        } as const)
      return audit
    }),
    audit: vi.fn(async (port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    isAlive: vi.fn(async () => true),
  }
  return {
    process,
    port: 42_000 + pid,
    internalUrl: 'http://127.0.0.1:' + String(42_000 + pid),
    readinessAttempts: [],
  }
}

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
  gracefulShutdownMs: 5,
  forceShutdownMs: 5,
  stopAuditAllowanceMs: 5,
})

function managerFixture(
  ready: ReadyRuntime,
  input: {
    readonly find?: typeof project | undefined
    readonly sleep?: RuntimeProcessDependencies['sleep']
  } = {}
) {
  const events: RuntimeSafeLifecycleEvent[] = []
  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: vi.fn(async () => undefined),
      launch: vi.fn(),
    },
    ports: { acquire: vi.fn() },
    health: {
      check: vi.fn(async () => ({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      })),
    },
    now: vi.fn(() => 1),
    sleep:
      input.sleep ??
      vi.fn(
        (_milliseconds, signal) =>
          new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            })
          })
      ),
  }
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async () =>
      Object.hasOwn(input, 'find') ? input.find : project
    ),
    config,
    processDependencies,
    launch: vi.fn(async () => ready),
    now: vi.fn(() => 10),
    recordEvent: (event) => events.push(event),
  })
  return { manager, events, processDependencies }
}

async function start(
  manager: ReturnType<typeof createProjectRuntimeManager>
): Promise<void> {
  await manager.start({
    projectId: project.id,
    canonicalPath: project.canonicalPath,
  })
}

describe('project runtime selected stop', () => {
  it('distinguishes no managed runtime from a confirmed repeated stop', async () => {
    const fixture = managerFixture(readyRuntime(101))
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'no-managed-runtime',
    })
    await start(fixture.manager)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'stopped',
      projectId: project.id,
      release: 'graceful',
    })
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toEqual({ outcome: 'already-stopped', projectId: project.id })
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      { projectId: project.id, state: 'Stopped' },
    ])
    expect(fixture.events.map(({ event }) => event)).toEqual([
      'runtime.start.requested',
      'runtime.start.succeeded',
      'runtime.stop.requested',
      'runtime.stop.succeeded',
    ])
  })

  it('joins concurrent stops into one termination', async () => {
    const ready = readyRuntime(102)
    const gate = deferred<RuntimeTerminationAudit>()
    vi.mocked(ready.process.terminate).mockReturnValue(gate.promise)
    const fixture = managerFixture(ready)
    await start(fixture.manager)
    const stops = Array.from({ length: 5 }, () =>
      fixture.manager.stop({ projectId: project.id })
    )
    await vi.waitFor(() =>
      expect(ready.process.terminate).toHaveBeenCalledTimes(1)
    )
    gate.resolve({
      pid: 102,
      processStartTime: '1020',
      port: ready.port,
      outcome: 'graceful',
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })
    const outcomes = await Promise.all(stops)
    expect(outcomes.every((outcome) => outcome === outcomes[0])).toBe(true)
    expect(
      fixture.events.filter(({ event }) => event === 'runtime.stop.requested')
    ).toHaveLength(1)
    expect(
      fixture.events.filter(({ event }) => event === 'runtime.stop.succeeded')
    ).toHaveLength(1)
  })

  it('retains failed state and ownership when release is unconfirmed', async () => {
    const ready = readyRuntime(103, {
      pid: 103,
      processStartTime: '1030',
      port: 42_103,
      outcome: 'unconfirmed',
      processAbsent: false,
      processGroupAbsent: false,
      listenerAbsent: false,
    })
    const fixture = managerFixture(ready)
    await start(fixture.manager)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'stop-unconfirmed',
      release: 'unconfirmed',
    })
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      {
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'stop-unconfirmed',
      },
    ])
    expect(fixture.manager.audit!().ownershipRecords).toBe(1)
    expect(fixture.events.at(-1)).toMatchObject({
      event: 'runtime.health.changed',
      from: 'stopping',
      to: 'failed',
      classification: 'stop-unconfirmed',
    })
  })

  it('settles a never-returning termination at the manager backstop', async () => {
    const ready = readyRuntime(104)
    vi.mocked(ready.process.terminate).mockImplementation(
      (_graceful, _force, _port, signal) =>
        new Promise<RuntimeTerminationAudit>((resolve) => {
          signal?.addEventListener(
            'abort',
            () =>
              resolve({
                pid: 104,
                processStartTime: '1040',
                port: ready.port,
                outcome: 'unconfirmed',
                processAbsent: false,
                processGroupAbsent: false,
                listenerAbsent: false,
              }),
            { once: true }
          )
        })
    )
    const fixture = managerFixture(ready, {
      sleep: vi.fn(async () => undefined),
    })
    await start(fixture.manager)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'stop-unconfirmed',
    })
    await vi.waitFor(() =>
      expect(fixture.manager.audit!().lateTerminationSettlements).toBe(1)
    )
    expect(fixture.manager.lastCleanup(project.id)).toBeUndefined()
  })

  it('returns bounded rejections for missing, starting, and failed entries', async () => {
    const missing = managerFixture(readyRuntime(105), { find: undefined })
    await expect(
      missing.manager.stop({ projectId: 'missing' })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: 'missing',
      category: 'not-registered',
    })

    const startingReady = deferred<ReadyRuntime>()
    const fixture = managerFixture(readyRuntime(106))
    const held = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies: fixture.processDependencies,
      launch: vi.fn(() => startingReady.promise),
    })
    const starting = held.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await vi.waitFor(() =>
      expect(held.inspectEntries()[0]?.state).toBe('starting')
    )
    await expect(held.stop({ projectId: project.id })).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'start-in-progress',
    })
    startingReady.reject(new Error('fixture stop'))
    await expect(starting).rejects.toMatchObject({ category: 'spawn-error' })
    await expect(held.stop({ projectId: project.id })).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'failure-retained',
    })
  })
})
