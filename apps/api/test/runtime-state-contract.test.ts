import { describe, expect, it, vi } from 'vitest'
import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_STATES,
  RuntimeFailure,
  createProjectRuntimeConfig,
  publicRuntimeState,
  publicRuntimeStateForLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeProcessDependencies,
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

function readyRuntime(pid: number): ReadyRuntime {
  const exit = deferred<RuntimeExit>()
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    isAlive: vi.fn(async () => true),
    terminate: vi.fn(async (_graceful, _force, port) => {
      exit.resolve({ code: 0, signal: null, addressInUse: false })
      return {
        pid,
        processStartTime: String(pid * 10),
        port,
        outcome: 'graceful' as const,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      }
    }),
    audit: vi.fn(async (port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
  }
  return {
    process,
    port: 43_000 + pid,
    internalUrl: 'http://127.0.0.1:' + String(43_000 + pid),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
}

const projects = [
  {
    id: 'registered',
    name: 'Registered',
    canonicalPath: '/safe/registered',
    createdAt: 1,
  },
  {
    id: 'starting',
    name: 'Starting',
    canonicalPath: '/safe/starting',
    createdAt: 2,
  },
  {
    id: 'running',
    name: 'Running',
    canonicalPath: '/safe/running',
    createdAt: 3,
  },
  { id: 'failed', name: 'Failed', canonicalPath: '/safe/failed', createdAt: 4 },
] as const

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
})

describe('public runtime state contract', () => {
  it('maps only the four public states and validates lifecycle outcomes', () => {
    expect(PUBLIC_RUNTIME_STATES).toEqual([
      'Stopped',
      'Starting',
      'Running',
      'Failed',
    ])
    expect([
      publicRuntimeState(undefined),
      publicRuntimeState('registered'),
      ...RUNTIME_STATES.map(publicRuntimeState),
    ]).toEqual(['Stopped', 'Stopped', 'Starting', 'Running', 'Failed'])
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.start.requested', 'starting')
    ).toBe('Starting')
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.start.succeeded', 'running')
    ).toBe('Running')
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.start.failed', 'failed')
    ).toBe('Failed')
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.health.changed', 'failed')
    ).toBe('Failed')
    expect(() =>
      publicRuntimeStateForLifecycleEvent('runtime.start.succeeded', 'failed')
    ).toThrow('does not match')
  })

  it('reports one frozen ordered side-effect-free projection', async () => {
    const startingGate = deferred<ReadyRuntime>()
    const startingReady = readyRuntime(601)
    const runningReady = readyRuntime(602)
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
      sleep: vi.fn(),
    }
    const recordEvent = vi.fn()
    const launch = vi.fn(
      async ({ canonicalPath }: { canonicalPath: string }) => {
        if (canonicalPath === '/safe/starting') return startingGate.promise
        if (canonicalPath === '/safe/running') return runningReady
        throw new RuntimeFailure('spawn-error')
      }
    )
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async (id) =>
        projects.find((item) => item.id === id)
      ),
      config,
      processDependencies,
      launch,
      recordEvent,
    })

    manager.register('registered', '/safe/registered')
    const starting = manager.start({
      projectId: 'starting',
      canonicalPath: '/safe/starting',
    })
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    await manager.start({
      projectId: 'running',
      canonicalPath: '/safe/running',
    })
    await expect(
      manager.start({ projectId: 'failed', canonicalPath: '/safe/failed' })
    ).rejects.toMatchObject({ category: 'spawn-error' })

    vi.clearAllMocks()
    const before = manager.audit!()
    const reports = manager.reportPublicStates([
      'unknown',
      'registered',
      'starting',
      'running',
      'failed',
    ])
    const after = manager.audit!()

    expect(reports).toEqual([
      { projectId: 'unknown', state: 'Stopped' },
      { projectId: 'registered', state: 'Stopped' },
      { projectId: 'starting', state: 'Starting' },
      { projectId: 'running', state: 'Running' },
      {
        projectId: 'failed',
        state: 'Failed',
        failureCategory: 'spawn-error',
      },
    ])
    expect(Object.isFrozen(reports)).toBe(true)
    expect(reports.every(Object.isFrozen)).toBe(true)
    expect(reports.map((report) => Object.keys(report).sort())).toEqual([
      ['projectId', 'state'],
      ['projectId', 'state'],
      ['projectId', 'state'],
      ['projectId', 'state'],
      ['failureCategory', 'projectId', 'state'],
    ])
    expect(before).toEqual(after)
    expect(launch).not.toHaveBeenCalled()
    expect(processDependencies.process.assertLaunchable).not.toHaveBeenCalled()
    expect(processDependencies.process.launch).not.toHaveBeenCalled()
    expect(processDependencies.ports.acquire).not.toHaveBeenCalled()
    expect(processDependencies.health.check).not.toHaveBeenCalled()
    expect(processDependencies.sleep).not.toHaveBeenCalled()
    expect(recordEvent).not.toHaveBeenCalled()

    startingGate.resolve(startingReady)
    await starting
    await manager.shutdown()
  })
})
