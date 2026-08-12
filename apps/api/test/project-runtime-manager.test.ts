import { describe, expect, it, vi } from 'vitest'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

interface Deferred<T> {
  promise: Promise<T>
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

function runtime(pid: number) {
  const exited = deferred<RuntimeExit>()
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exited.promise,
    terminate: vi.fn(async (_graceful, _force, port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      outcome: 'graceful' as const,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
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
  const ready: ReadyRuntime = {
    process,
    port: 42000 + pid,
    internalUrl: 'http://127.0.0.1:' + String(42000 + pid),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
  return { ready, process, exited }
}

const project = {
  id: 'project-1',
  name: 'Project One',
  canonicalPath: '/projects/one',
  createdAt: 1,
}

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
  now: Date.now,
  sleep: vi.fn(),
}

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
})

describe('project runtime manager', () => {
  it('single-flights exactly eight starts and health-checks reuse', async () => {
    const gate = deferred<ReadyRuntime>()
    const launch = vi.fn(() => gate.promise)
    const first = runtime(101)
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies,
      launch,
      now: vi.fn(() => 100),
    })
    const calls = Array.from({ length: 8 }, () =>
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    )
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    expect(manager.inspect(project.id)?.state).toBe('starting')
    gate.resolve(first.ready)
    const snapshots = await Promise.all(calls)
    expect(new Set(snapshots.map((snapshot) => snapshot.pid))).toEqual(
      new Set([101])
    )
    expect(new Set(snapshots.map((snapshot) => snapshot.port))).toEqual(
      new Set([42101])
    )
    expect(snapshots.every((snapshot) => snapshot === snapshots[0])).toBe(true)
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).resolves.toBe(snapshots[0])
    expect(launch).toHaveBeenCalledTimes(1)
    expect(processDependencies.health.check).toHaveBeenCalledTimes(1)
    await manager.shutdown()
  })

  it('validates unknown IDs and exact persisted paths before launch', async () => {
    const launch = vi.fn()
    const unknown = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => undefined),
      config,
      processDependencies,
      launch,
    })
    await expect(
      unknown.start({
        projectId: 'missing',
        canonicalPath: '/projects/missing',
      })
    ).rejects.toMatchObject({ category: 'unknown-project' })
    const mismatch = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies,
      launch,
    })
    await expect(
      mismatch.start({
        projectId: project.id,
        canonicalPath: '/projects/other',
      })
    ).rejects.toMatchObject({ category: 'canonical-path-invariant' })
    expect(launch).not.toHaveBeenCalled()
  })

  it('cancels only one caller while the shared start satisfies others', async () => {
    const gate = deferred<ReadyRuntime>()
    const launch = vi.fn(() => gate.promise)
    const first = runtime(102)
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies,
      launch,
    })
    const cancelled = new AbortController()
    const cancelledWait = manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
      signal: cancelled.signal,
    })
    const continuingWait = manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    cancelled.abort()
    await expect(cancelledWait).rejects.toMatchObject({
      category: 'caller-cancelled',
    })
    gate.resolve(first.ready)
    await expect(continuingWait).resolves.toMatchObject({ pid: 102 })
    expect(first.process.terminate).not.toHaveBeenCalled()
    expect(launch).toHaveBeenCalledTimes(1)
    await manager.shutdown()
  })

  it('shares one failure object, evicts it, and single-flights retry', async () => {
    const firstFailure = deferred<ReadyRuntime>()
    const retryGate = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockImplementationOnce(() => firstFailure.promise)
      .mockImplementationOnce(() => retryGate.promise)
    const replacement = runtime(104)
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies,
      launch,
    })
    const participatingSignal = new AbortController()
    const calls = Array.from({ length: 8 }, (_, index) =>
      manager
        .start({
          projectId: project.id,
          canonicalPath: project.canonicalPath,
          ...(index === 0 ? { signal: participatingSignal.signal } : {}),
        })
        .catch((error: unknown) => error)
    )
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    const failure = new RuntimeFailure('spawn-error')
    firstFailure.reject(failure)
    const failures = await Promise.all(calls)
    expect(failures.every((value) => value === failure)).toBe(true)
    expect(manager.inspect(project.id)?.state).toBe('failed')
    expect(manager.lastFailure(project.id)).toBe(failure)

    const retries = Array.from({ length: 8 }, () =>
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    )
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(2))
    retryGate.resolve(replacement.ready)
    const snapshots = await Promise.all(retries)
    expect(snapshots.every((snapshot) => snapshot.pid === 104)).toBe(true)
    expect(launch).toHaveBeenCalledTimes(2)
    await manager.shutdown()
  })

  it.each([
    { code: 4, signal: null, addressInUse: false },
    { code: null, signal: 'SIGTERM', addressInUse: false },
  ] as const)(
    'evicts a post-running code or signal exit without auto-retry',
    async (exit) => {
      const first = runtime(105)
      const replacement = runtime(106)
      const launch = vi
        .fn()
        .mockResolvedValueOnce(first.ready)
        .mockResolvedValueOnce(replacement.ready)
      const manager = createProjectRuntimeManager({
        findProjectById: vi.fn(async () => project),
        config,
        processDependencies,
        launch,
      })
      await expect(
        manager.start({
          projectId: project.id,
          canonicalPath: project.canonicalPath,
        })
      ).resolves.toMatchObject({ pid: 105 })
      first.exited.resolve(exit)
      await vi.waitFor(() =>
        expect(manager.inspect(project.id)?.state).toBe('failed')
      )
      expect(launch).toHaveBeenCalledTimes(1)
      expect(manager.lastFailure(project.id)?.category).toBe(
        exit.signal === null ? 'early-exit-code' : 'early-exit-signal'
      )
      await expect(
        manager.start({
          projectId: project.id,
          canonicalPath: project.canonicalPath,
        })
      ).resolves.toMatchObject({ pid: 106 })
      expect(launch).toHaveBeenCalledTimes(2)
      await manager.shutdown()
    }
  )

  it('rejects an already-cancelled caller and replaces an unhealthy runtime', async () => {
    const first = runtime(107)
    const replacement = runtime(108)
    vi.mocked(first.process.isAlive).mockResolvedValue(false)
    const launch = vi
      .fn()
      .mockResolvedValueOnce(first.ready)
      .mockResolvedValueOnce(replacement.ready)
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies,
      launch,
    })
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
        signal: cancelled.signal,
      })
    ).rejects.toMatchObject({ category: 'caller-cancelled' })
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).resolves.toMatchObject({ pid: 108 })
    expect(first.process.terminate).toHaveBeenCalledTimes(1)
    expect(manager.lastFailure('unknown')).toBeUndefined()
    expect(manager.inspect('unknown')).toBeUndefined()
    await manager.shutdown()
  })
})
