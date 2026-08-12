import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
} from '../src/project-runtime-contract.js'
import { validateRuntimeManagerSource } from '../src/project-runtime-isolation-contract.js'
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

  it('rejects cancellation, marks an unhealthy runtime failed, and replaces explicitly', async () => {
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
    ).rejects.toMatchObject({ category: 'early-exit-code' })
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

  it('holds registered, starting, running, and failed entries in one stable-ID map', async () => {
    const projects = [
      { ...project, id: 'project-a', canonicalPath: '/projects/a' },
      { ...project, id: 'project-b', canonicalPath: '/projects/b' },
      { ...project, id: 'project-c', canonicalPath: '/projects/c' },
    ]
    const bGate = deferred<ReadyRuntime>()
    const a = runtime(201)
    const b = runtime(202)
    const launch = vi.fn(
      async ({ canonicalPath }: { canonicalPath: string }) => {
        if (canonicalPath === '/projects/a') return a.ready
        if (canonicalPath === '/projects/b') return bGate.promise
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
    })
    manager.register('project-d', '/projects/d')
    const aSnapshot = await manager.start({
      projectId: 'project-a',
      canonicalPath: '/projects/a',
    })
    const bStart = manager.start({
      projectId: 'project-b',
      canonicalPath: '/projects/b',
    })
    await expect(
      manager.start({
        projectId: 'project-c',
        canonicalPath: '/projects/c',
      })
    ).rejects.toMatchObject({ category: 'spawn-error' })
    await vi.waitFor(() =>
      expect(
        manager
          .inspectEntries()
          .map(({ state }) => state)
          .sort()
      ).toEqual(['failed', 'registered', 'running', 'starting'])
    )
    expect(Object.isFrozen(aSnapshot)).toBe(true)
    expect(aSnapshot).toMatchObject({
      stableRoute: '/projects/project-a/workbench/',
      ownerToken: expect.stringMatching(/^project-[a-f0-9]{16}$/u),
    })
    bGate.resolve(b.ready)
    await expect(bStart).resolves.toMatchObject({ pid: 202 })
    await manager.shutdown()
  })

  it('rejects singleton and path/name keyed runtime state source fixtures', async () => {
    const production = await readFile(
      new URL('../src/project-runtime-manager.ts', import.meta.url),
      'utf8'
    )
    expect(validateRuntimeManagerSource(production)).toEqual({
      accepted: true,
      violations: [],
    })
    for (const fixture of [
      'const activeRuntime = undefined; const entries = new Map<string, ProjectRuntimeEntry>(); const ownership = new Map<string, ManagedOwnership>()',
      'const runtimeByPath = new Map<string, ProjectRuntimeEntry>(); const entries = new Map<string, ProjectRuntimeEntry>(); const ownership = new Map<string, ManagedOwnership>()',
      'const runtimeByName = new Map<string, ProjectRuntimeEntry>(); const entries = new Map<string, ProjectRuntimeEntry>(); const ownership = new Map<string, ManagedOwnership>()',
      'const entries = new Map<CanonicalPath, ProjectRuntimeEntry>(); const ownership = new Map<string, ManagedOwnership>()',
    ]) {
      expect(validateRuntimeManagerSource(fixture).accepted).toBe(false)
    }
  })

  it('partitions 24 interleaved A/B/C callers and reuses only each healthy identity', async () => {
    const projects = ['a', 'b', 'c'].map((id) => ({
      ...project,
      id: 'project-' + id,
      canonicalPath: '/fixtures/' + id,
    }))
    const gates = new Map(
      projects.map((item) => [item.canonicalPath, deferred<ReadyRuntime>()])
    )
    const ready = new Map([
      ['/fixtures/a', runtime(301)],
      ['/fixtures/b', runtime(302)],
      ['/fixtures/c', runtime(303)],
    ])
    const launches: Array<{
      canonicalPath: string
      user: string
      environment: Readonly<NodeJS.ProcessEnv>
    }> = []
    const launch = vi.fn(
      ({
        canonicalPath,
        config: launchConfig,
      }: {
        canonicalPath: string
        config: typeof config
      }) => {
        launches.push({
          canonicalPath,
          user: launchConfig.expectedUser,
          environment: launchConfig.environment,
        })
        return gates.get(canonicalPath)!.promise
      }
    )
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async (id) =>
        projects.find((item) => item.id === id)
      ),
      config,
      processDependencies,
      launch,
    })
    const calls = Array.from({ length: 8 }).flatMap(() =>
      projects.map((item) => ({
        projectId: item.id,
        promise: manager.start({
          projectId: item.id,
          canonicalPath: item.canonicalPath,
        }),
      }))
    )
    await vi.waitFor(() => {
      expect(launch).toHaveBeenCalledTimes(3)
      expect(
        manager.inspectEntries().filter(({ state }) => state === 'starting')
      ).toHaveLength(3)
      expect(
        manager
          .inspectEntries()
          .map(({ waiterCount }) => waiterCount)
          .sort()
      ).toEqual([8, 8, 8])
    })
    for (const path of ['/fixtures/c', '/fixtures/a', '/fixtures/b'])
      gates.get(path)!.resolve(ready.get(path)!.ready)
    const snapshots = await Promise.all(calls.map(({ promise }) => promise))
    for (const item of projects) {
      const own = calls
        .map(({ projectId }, index) => ({
          projectId,
          snapshot: snapshots[index],
        }))
        .filter(({ projectId }) => projectId === item.id)
        .map(({ snapshot }) => snapshot)
      expect(own).toHaveLength(8)
      expect(own.every((snapshot) => snapshot === own[0])).toBe(true)
      expect(new Set(own.map(({ projectId }) => projectId))).toEqual(
        new Set([item.id])
      )
    }
    expect(new Set(snapshots.map(({ pid }) => pid))).toEqual(
      new Set([301, 302, 303])
    )
    expect(launches).toEqual(
      projects.map((item) => ({
        canonicalPath: item.canonicalPath,
        user: 'fixture-user',
        environment: { PATH: '/safe/bin' },
      }))
    )
    const before = JSON.stringify(manager.inspectEntries())
    for (const item of projects) {
      const reused = await manager.start({
        projectId: item.id,
        canonicalPath: item.canonicalPath,
      })
      expect(reused).toBe(
        snapshots.find(({ projectId }) => projectId === item.id)
      )
    }
    await expect(
      manager.start({
        projectId: 'unknown',
        canonicalPath: '/fixtures/unknown',
      })
    ).rejects.toMatchObject({ category: 'unknown-project' })
    await expect(
      manager.start({ projectId: 'project-a', canonicalPath: '/fixtures/b' })
    ).rejects.toMatchObject({ category: 'canonical-path-invariant' })
    expect(JSON.stringify(manager.inspectEntries())).toBe(before)
    expect(launch).toHaveBeenCalledTimes(3)
    await manager.shutdown()
  })

  it('cancels all eight B waiters and cleans only the orphaned B start', async () => {
    const projects = ['a', 'b', 'c'].map((id) => ({
      ...project,
      id: 'cancel-' + id,
      canonicalPath: '/cancel/' + id,
    }))
    const a = runtime(401)
    const b = runtime(402)
    const c = runtime(403)
    const bStarted = deferred<void>()
    const launch = vi.fn(
      async ({
        canonicalPath,
        signal,
      }: {
        canonicalPath: string
        signal: AbortSignal
      }) => {
        if (canonicalPath === '/cancel/a') return a.ready
        if (canonicalPath === '/cancel/c') return c.ready
        bStarted.resolve()
        return new Promise<ReadyRuntime>((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              void b.process
                .terminate(1, 1, b.ready.port)
                .then(() => reject(new RuntimeFailure('caller-cancelled')))
            },
            { once: true }
          )
        })
      }
    )
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async (id) =>
        projects.find((item) => item.id === id)
      ),
      config,
      processDependencies,
      launch,
    })
    const aStart = manager.start({
      projectId: 'cancel-a',
      canonicalPath: '/cancel/a',
    })
    const cStart = manager.start({
      projectId: 'cancel-c',
      canonicalPath: '/cancel/c',
    })
    const controllers = Array.from({ length: 8 }, () => new AbortController())
    const bStarts = controllers.map((controller) =>
      manager.start({
        projectId: 'cancel-b',
        canonicalPath: '/cancel/b',
        signal: controller.signal,
      })
    )
    await bStarted.promise
    controllers.forEach((controller) => controller.abort())
    const outcomes = await Promise.all(
      bStarts.map((start) => start.catch((error: unknown) => error))
    )
    expect(outcomes).toHaveLength(8)
    expect(
      outcomes.every(
        (error) =>
          error instanceof RuntimeFailure &&
          error.category === 'caller-cancelled'
      )
    ).toBe(true)
    await expect(aStart).resolves.toMatchObject({ pid: 401 })
    await expect(cStart).resolves.toMatchObject({ pid: 403 })
    await vi.waitFor(() => expect(b.process.terminate).toHaveBeenCalledTimes(1))
    expect(a.process.terminate).not.toHaveBeenCalled()
    expect(c.process.terminate).not.toHaveBeenCalled()
    await manager.shutdown()
  })
})
