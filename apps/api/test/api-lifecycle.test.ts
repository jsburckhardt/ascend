import { createServer, Socket } from 'node:net'
import { describe, expect, it, vi } from 'vitest'
import {
  API_START_FAILED_EVENT,
  ApiStartupError,
  createApiServerController,
  startApiProcess,
} from '../src/api-server.js'
import { PROJECT_LIBRARY_INITIALIZATION_FAILED } from '../src/app.js'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

async function disposablePort(): Promise<number> {
  const listener = createServer()
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', resolve)
  })
  const address = listener.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Disposable listener did not expose a TCP port')
  }
  await new Promise<void>((resolve, reject) => {
    listener.close((error) => (error === undefined ? resolve() : reject(error)))
  })
  return address.port
}

async function listenerIsAbsent(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket()
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(true))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
    socket.connect(port, '127.0.0.1')
  })
}

const persistedProject = {
  id: 'restart-project',
  name: 'Restart Project',
  canonicalPath: '/projects/restart',
  createdAt: 1_786_406_950_000,
}

describe('API project-library lifecycle', () => {
  it('migrates before listening, preserves records across restart, and joins repeated shutdown', async () => {
    const context = await allocateDatabaseTestContext('api-lifecycle')
    const firstTelemetryStop = vi.fn(async () => undefined)
    const first = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: () => createProjectLibrary(context.databasePath),
      stopTelemetry: firstTelemetryStop,
    })
    try {
      const firstServer = await first.start()
      await expect(
        firstServer.projectLibrary.create(persistedProject)
      ).resolves.toEqual({
        disposition: 'created',
        project: persistedProject,
      })

      const firstStop = first.stop()
      expect(first.stop()).toBe(firstStop)
      expect(first.stop()).toBe(firstStop)
      await firstStop
      expect(firstTelemetryStop).toHaveBeenCalledTimes(1)

      const second = createApiServerController({
        port: 0,
        fastify: { logger: false },
        createProjectLibrary: () => createProjectLibrary(context.databasePath),
      })
      const secondServer = await second.start()
      await expect(secondServer.projectLibrary.list()).resolves.toEqual([
        persistedProject,
      ])
      await second.stop()
    } finally {
      await first.stop()
      await context.cleanup()
    }
  })

  it('closes the library exactly once for repeated shutdown requests', async () => {
    const close = vi.fn()
    const library: ProjectLibrary = {
      create: vi.fn(),
      list: vi.fn(async () => []),
      close,
    }
    const controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
    })
    await controller.start()
    await Promise.all([controller.stop(), controller.stop(), controller.stop()])
    expect(close).toHaveBeenCalledTimes(1)
  })

  it.each([
    'SECRET_INIT_SENTINEL',
    'SELECT * FROM hidden_projects',
    'STACK_INIT_SENTINEL at internalFunction',
    '/private/database/path/INIT_SENTINEL.sqlite',
  ])(
    'fails safely before listening without exposing initialization detail: %s',
    async (sentinel) => {
      const port = await disposablePort()
      const events: unknown[] = []
      const controller = createApiServerController({
        port,
        fastify: { logger: false },
        createProjectLibrary: async () => {
          throw new Error(sentinel)
        },
        recordStartupFailure: (event) => events.push(event),
      })

      await expect(startApiProcess(controller)).resolves.toBe(1)
      const failure = await controller.start().catch((error: unknown) => error)
      expect(failure).toBeInstanceOf(ApiStartupError)
      expect(failure).toMatchObject({
        category: PROJECT_LIBRARY_INITIALIZATION_FAILED,
      })
      expect(events).toEqual([
        {
          event: API_START_FAILED_EVENT,
          category: PROJECT_LIBRARY_INITIALIZATION_FAILED,
        },
      ])
      expect(
        JSON.stringify({ failure: String(failure), events })
      ).not.toContain(sentinel)
      await expect(listenerIsAbsent(port)).resolves.toBe(true)
    }
  )
})
