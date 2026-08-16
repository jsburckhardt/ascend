import { describe, expect, it, vi } from 'vitest'
import { createApiServerController } from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  WORKBENCH_DOCUMENT_HEADER,
  WORKBENCH_DOCUMENT_HEADER_VALUE,
  WORKBENCH_DOCUMENT_TIMEOUT_MS,
  renderWorkbenchNavigationShell,
  renderWorkbenchRouteError,
} from '../src/workbench-navigation-shell.js'
import type { WorkbenchProxyManager } from '../src/workbench-proxy-manager.js'

const project = {
  id: 'route-project',
  name: 'Route',
  canonicalPath: '/safe/project',
  createdAt: 1,
}

const setup = async () => {
  const library: ProjectLibrary = {
    create: vi.fn(),
    findById: vi.fn(async () => project),
    list: vi.fn(async () => [project]),
    closeProject: vi.fn(),
    close: vi.fn(),
  }
  const runtime: ProjectRuntimeManager = {
    beginReconciliation: async () => undefined,
    start: vi.fn(),
    ownsSnapshot: vi.fn(() => true),
    inspect: vi.fn(),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(),
    shutdown: vi.fn(async () => ({ status: 'ok', audits: [] })),
  }
  const proxy: WorkbenchProxyManager = {
    handleHttp: vi.fn(async (request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(
        request.headers[WORKBENCH_DOCUMENT_HEADER] === undefined
          ? '<html><body>upstream</body></html>'
          : 'marker-leaked'
      )
    }),
    handleUpgrade: vi.fn(),
    shutdown: vi.fn(async () => proxy.audit()),
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
      close: vi.fn(),
    }),
  })
  await controller.start()
  return { controller, server: controller.server, library, runtime, proxy }
}

describe('browser workbench navigation shell', () => {
  it('serves an unmarked base shell and delegates marked same-URL acquisition', async () => {
    const owned = await setup()
    try {
      const shell = await owned.server.inject({
        method: 'GET',
        url: '/projects/route-project/workbench/',
        headers: { accept: 'text/html' },
      })
      expect(shell.statusCode).toBe(200)
      expect(shell.headers['content-type']).toContain('text/html')
      expect(shell.body).toContain('Opening workbench')
      expect(owned.proxy.handleHttp).not.toHaveBeenCalled()

      const acquired = await owned.server.inject({
        method: 'GET',
        url: '/projects/route-project/workbench/',
        headers: {
          accept: 'text/html',
          [WORKBENCH_DOCUMENT_HEADER]: WORKBENCH_DOCUMENT_HEADER_VALUE,
        },
      })
      expect(acquired.statusCode).toBe(200)
      expect(acquired.body).toContain('upstream')
      expect(acquired.body).not.toContain('marker-leaked')
      expect(owned.proxy.handleHttp).toHaveBeenCalledOnce()
    } finally {
      await owned.controller.stop()
    }
  })

  it.each([
    '/projects//workbench/',
    '/projects/%E0%A4%A/workbench/',
    '/projects/x%2Fy/workbench/',
    '/projects/x%5Cy/workbench/',
    '/projects/x%00y/workbench/',
    '/projects/' + 'x'.repeat(129) + '/workbench/',
    '/projects/route-project/other/',
  ])(
    'renders malformed browser route %s before lookup or start',
    async (url) => {
      const owned = await setup()
      try {
        const response = await owned.server.inject({
          method: 'GET',
          url,
          headers: { accept: 'text/html' },
        })
        expect(response.statusCode).toBe(400)
        expect(response.body).toContain('Project route unavailable')
        expect(owned.library.findById).not.toHaveBeenCalled()
        expect(owned.runtime.start).not.toHaveBeenCalled()
        expect(owned.proxy.handleHttp).not.toHaveBeenCalled()
      } finally {
        await owned.controller.stop()
      }
    }
  )

  it('contains bounded generation, timeout, Retry, Projects, header, and safe failures', () => {
    const shell = renderWorkbenchNavigationShell()
    expect(WORKBENCH_DOCUMENT_TIMEOUT_MS).toBe(15_000)
    expect(shell).toContain(WORKBENCH_DOCUMENT_HEADER)
    expect(shell).toContain('generation')
    expect(shell).toContain('AbortController')
    expect(shell).toContain('Workbench document load timed out.')
    expect(shell).toContain('Project is not registered.')
    expect(shell).toContain('ascend-workbench-header')
    expect(shell).toContain('Projects')
    expect(shell).toContain('Retry')
    expect(shell).not.toMatch(
      />Stop<|>Restart<|>Close<|PID:|listener:[ 0-9]|internal-port/u
    )
    expect(renderWorkbenchRouteError()).toContain('role="alert"')
  })
})
