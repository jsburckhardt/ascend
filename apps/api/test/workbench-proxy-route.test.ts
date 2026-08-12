import { request as httpRequest } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { createApiServerController } from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  createWorkbenchProxyManager,
  type WorkbenchProxyManager,
} from '../src/workbench-proxy-manager.js'

const project = {
  id: 'route-project',
  name: 'Route',
  canonicalPath: '/safe/project',
  createdAt: 1,
}

const get = async (
  port: number,
  path: string
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, path, method: 'GET' },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        )
      }
    )
    request.once('error', reject)
    request.end()
  })

describe('stable workbench route lifecycle', () => {
  it('uses finite defaults, rejects invalid bounds, and memoizes empty shutdown', async () => {
    const dependencies = {
      projectLibrary: {} as ProjectLibrary,
      projectRuntime: {} as ProjectRuntimeManager,
    }
    const manager = createWorkbenchProxyManager(dependencies)
    expect(manager.audit()).toEqual({
      shuttingDown: false,
      pendingOperations: 0,
      upstreamHttpRequests: 0,
      upstreamHttpResponses: 0,
      rawSockets: 0,
      webSockets: 0,
    })
    const firstShutdown = manager.shutdown()
    expect(manager.shutdown()).toBe(firstShutdown)
    await expect(firstShutdown).resolves.toMatchObject({
      shuttingDown: true,
      pendingOperations: 0,
    })
    for (const bounds of [
      { headerTimeoutMs: 0 },
      { headerTimeoutMs: Number.NaN },
      { shutdownTimeoutMs: 0 },
      { shutdownTimeoutMs: Number.NaN },
    ])
      expect(() =>
        createWorkbenchProxyManager({ ...dependencies, ...bounds })
      ).toThrow('Workbench proxy bounds must be positive integers')
  })

  it('owns base and descendant routes and closes proxy before runtime and persistence', async () => {
    const order: string[] = []
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async () => project),
      list: vi.fn(async () => [project]),
      closeProject: vi.fn(),
      close: vi.fn(() => order.push('library')),
    }
    const runtime: ProjectRuntimeManager = {
      start: vi.fn(),
      inspect: vi.fn(),
      lastFailure: vi.fn(),
      lastCleanup: vi.fn(),
      lastShutdown: vi.fn(),
      shutdown: vi.fn(async () => {
        order.push('runtime')
        return { status: 'ok', audits: [] }
      }),
    }
    const routes: unknown[] = []
    const proxy: WorkbenchProxyManager = {
      handleHttp: vi.fn(async (_request, response, route) => {
        routes.push(route)
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end('proxied')
      }),
      handleUpgrade: vi.fn(),
      shutdown: vi.fn(async () => {
        order.push('proxy')
        return proxy.audit()
      }),
      audit: () => ({
        shuttingDown: false,
        pendingOperations: 0,
        upstreamHttpRequests: 0,
        upstreamHttpResponses: 0,
        rawSockets: 0,
        webSockets: 0,
      }),
    }
    const controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createWorkbenchProxyManager: () => proxy,
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: () => order.push('registration'),
      }),
    })
    const server = await controller.start()
    const address = server.server.address()
    if (address === null || typeof address === 'string')
      throw new Error('Missing API address')
    expect(server.server.listenerCount('upgrade')).toBe(1)
    await expect(
      get(address.port, '/projects/route-project/workbench/')
    ).resolves.toEqual({ status: 200, body: 'proxied' })
    await expect(
      get(address.port, '/projects/route-project/workbench/nested/file.js?x=1')
    ).resolves.toEqual({ status: 200, body: 'proxied' })
    expect(routes).toEqual([
      {
        projectId: 'route-project',
        prefix: '/projects/route-project/workbench/',
        upstreamPath: '/',
      },
      {
        projectId: 'route-project',
        prefix: '/projects/route-project/workbench/',
        upstreamPath: '/nested/file.js?x=1',
      },
    ])
    await controller.stop()
    expect(order).toEqual(['proxy', 'runtime', 'registration', 'library'])
    expect(server.server.listenerCount('upgrade')).toBe(0)
  })

  it.each(['../x', '%2f', '%5c', '%00', 'x'.repeat(129)])(
    'returns the exact malformed-ID failure for %s',
    async (id) => {
      const controller = createApiServerController({
        port: 0,
        fastify: { logger: false },
      })
      const server = await controller.start()
      const address = server.server.address()
      if (address === null || typeof address === 'string')
        throw new Error('Missing API address')
      const result = await get(address.port, `/projects/${id}/workbench/`)
      expect(result.status).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        error: {
          code: 'invalid_project_id',
          message: 'Project ID is invalid.',
        },
      })
      await controller.stop()
    }
  )
})
