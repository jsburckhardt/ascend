import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  RuntimeFailure,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRegistrationService } from '../src/project-registration.js'
import { build } from './helper.js'

const project = {
  id: 'lifecycle-project',
  name: 'Lifecycle Project',
  canonicalPath: '/projects/lifecycle',
  createdAt: 1,
}
const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
  gracefulShutdownMs: 7,
  forceShutdownMs: 11,
})
const healthy: RuntimeProcessDependencies = {
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

function neverExit(): Promise<never> {
  return new Promise(() => undefined)
}

describe('project runtime lifecycle integration', () => {
  it('constructs one manager and shuts it down before persistence owners', async () => {
    const order: string[] = []
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async () => undefined),
      list: vi.fn(async () => []),
      closeProject: vi.fn(),
      close: vi.fn(() => order.push('library')),
    }
    const registration: ProjectRegistrationService = {
      register: vi.fn(),
      close: vi.fn(() => order.push('registration')),
    }
    const manager: ProjectRuntimeManager = {
      register: vi.fn(),
      start: vi.fn(),
      ownsSnapshot: vi.fn(() => true),
      inspect: vi.fn(),
      inspectEntries: vi.fn(() => []),
      lastFailure: vi.fn(),
      lastCleanup: vi.fn(),
      lastShutdown: vi.fn(),
      shutdown: vi.fn(async () => {
        order.push('runtime')
      }),
    }
    const createManager = vi.fn(() => manager)
    const app = await build({
      createProjectLibrary: async () => library,
      createProjectRegistration: async () => registration,
      createProjectRuntimeManager: createManager,
    })
    expect(createManager).toHaveBeenCalledTimes(1)
    expect(app.projectRuntime).toBe(manager)
    await app.close()
    expect(order).toEqual(['runtime', 'registration', 'library'])
  })

  it('joins bounded shutdown, rejects new starts, and cancels an in-flight start', async () => {
    const events: unknown[] = []
    const launch = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new RuntimeFailure('manager-shutdown')),
            { once: true }
          )
        })
    )
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies: healthy,
      launch,
      recordEvent: (event) => events.push(event),
    })
    const start = manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    const shutdown = manager.shutdown()
    expect(manager.shutdown()).toBe(shutdown)
    expect(manager.shutdown()).toBe(shutdown)
    await expect(start).rejects.toMatchObject({ category: 'manager-shutdown' })
    await shutdown
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'manager-shutdown' })
    expect(events).toHaveLength(2)
    expect(events).toEqual([
      {
        event: 'runtime.start.requested',
        projectToken: deriveProjectOwnerToken(project.id),
        from: 'stopped',
        to: 'starting',
        elapsedMs: expect.any(Number),
      },
      {
        event: 'runtime.start.failed',
        projectToken: deriveProjectOwnerToken(project.id),
        from: 'starting',
        to: 'failed',
        elapsedMs: expect.any(Number),
        classification: 'manager-shutdown',
      },
    ])
    expect(JSON.stringify(events)).not.toContain(project.canonicalPath)
  })

  it('cleans a launch that resolves after manager shutdown begins', async () => {
    const terminate = vi.fn(async (_graceful, _force, port) => ({
      pid: 500,
      processStartTime: '5000',
      port,
      outcome: 'graceful' as const,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    }))
    const owned: OwnedRuntimeProcess = {
      pid: 500,
      processStartTime: '5000',
      exit: neverExit(),
      terminate,
      audit: vi.fn(async (port) => ({
        pid: 500,
        processStartTime: '5000',
        port,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })),
      isAlive: vi.fn(async () => true),
    }
    let resolveLaunch!: (runtime: ReadyRuntime) => void
    const launch = vi.fn(
      () =>
        new Promise<ReadyRuntime>((resolve) => {
          resolveLaunch = resolve
        })
    )
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies: healthy,
      launch,
    })
    const start = manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    const rejectedStart = expect(start).rejects.toMatchObject({
      category: 'manager-shutdown',
    })
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(1))
    const shutdown = manager.shutdown()
    resolveLaunch({
      process: owned,
      port: 42500,
      internalUrl: 'http://127.0.0.1:42500',
      readinessAttempts: [],
    })
    await rejectedStart
    await shutdown
    expect(terminate).toHaveBeenCalledTimes(1)
    expect(manager.inspect(project.id)).toBeUndefined()
    expect(manager.lastShutdown()?.status).toBe('ok')
  })

  it('terminates each exact running owner once with finite escalation bounds', async () => {
    let settleExit!: () => void
    const exit = new Promise<never>((_resolve) => {
      settleExit = () => _resolve(undefined as never)
    })
    const terminate = vi.fn(async (_graceful, _force, port) => {
      settleExit()
      return {
        pid: 501,
        processStartTime: '5010',
        port,
        outcome: 'graceful' as const,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      }
    })
    const owned: OwnedRuntimeProcess = {
      pid: 501,
      processStartTime: '5010',
      exit,
      terminate,
      audit: vi.fn(async (port) => ({
        pid: 501,
        processStartTime: '5010',
        port,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })),
      isAlive: vi.fn(async () => true),
    }
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      config,
      processDependencies: healthy,
      launch: vi.fn(async () => ({
        process: owned,
        port: 42501,
        internalUrl: 'http://127.0.0.1:42501',
        readinessAttempts: [],
      })),
    })
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await Promise.all([
      manager.shutdown(),
      manager.shutdown(),
      manager.shutdown(),
    ])
    expect(terminate).toHaveBeenCalledTimes(1)
    expect(terminate).toHaveBeenCalledWith(7, 11, 42501)
    expect(manager.inspect(project.id)).toBeUndefined()
  })
})
