import { describe, expect, it, vi } from 'vitest'
import { createApiServerController } from '../src/api-server.js'
import {
  BL014_FIXTURES,
  BL014_INITIAL_START_ORDER,
  BL014_OPEN_REENTRY_ORDER,
} from '../src/session-switching-contract.js'
import {
  stableProjectRoute,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type { WorkbenchProxyManager } from '../src/workbench-proxy-manager.js'

const fixtureByKey = new Map(
  BL014_FIXTURES.map((fixture) => [fixture.key, fixture])
)

describe('BL-014 execution-backed navigation and reuse matrix', () => {
  it('executes three starts and exactly five project-local reuses with no lifecycle stop', async () => {
    const running = new Map<string, RuntimeSnapshot>()
    const launches = new Map<string, number>()
    const reuses = new Map<string, number>()
    const stop = vi.fn()
    const shutdown = vi.fn(async () => ({ status: 'ok' as const, audits: [] }))
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async (id) => {
        const fixture = BL014_FIXTURES.find((row) => row.id === id)
        return fixture
          ? {
              id: fixture.id,
              name: fixture.name,
              canonicalPath: '/fixture/' + fixture.key,
              createdAt: 1,
            }
          : undefined
      }),
      list: vi.fn(async () => []),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const runtime: ProjectRuntimeManager = {
      beginReconciliation: async () => undefined,
      register: vi.fn(),
      start: vi.fn(async ({ projectId, canonicalPath }) => {
        const existing = running.get(projectId)
        if (existing) {
          reuses.set(projectId, (reuses.get(projectId) ?? 0) + 1)
          return existing
        }
        launches.set(projectId, (launches.get(projectId) ?? 0) + 1)
        const snapshot: RuntimeSnapshot = Object.freeze({
          projectId,
          state: 'running',
          pid: 8100 + running.size,
          processStartTime: 'start-' + projectId,
          internalUrl: 'http://127.0.0.1:1',
          port: 1 + running.size,
          canonicalPath,
          stableRoute: stableProjectRoute(projectId),
          ownerToken: 'project-0000000000000000',
          startedAt: 1,
          elapsedMs: 1,
        })
        running.set(projectId, snapshot)
        return snapshot
      }),
      close: async () => {
        throw new Error('session switching does not close projects')
      },
      ownsSnapshot: (snapshot) => running.get(snapshot.projectId) === snapshot,
      inspect: (id) => running.get(id),
      inspectEntries: () => [],
      lastFailure: vi.fn(),
      lastCleanup: vi.fn(),
      lastShutdown: vi.fn(),
      shutdown,
    }
    const proxy: WorkbenchProxyManager = {
      handleHttp: async (_request, response, route) => {
        const project = await library.findById(route.projectId)
        if (!project) throw new Error('missing fixture')
        const snapshot = await runtime.start({
          projectId: project.id,
          canonicalPath: project.canonicalPath,
        })
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end(snapshot.stableRoute)
      },
      handleUpgrade: async () => undefined,
      closeProject: async () => {
        throw new Error('session switching does not close proxy sessions')
      },
      shutdown: async () => proxy.audit(),
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
    const execute = async (key: 'A' | 'B' | 'C') => {
      const fixture = fixtureByKey.get(key)!
      const response = await controller.server.inject({
        method: 'GET',
        url: stableProjectRoute(fixture.id),
        headers: { accept: 'text/plain', 'x-ascend-workbench-document': '1' },
      })
      expect(response.statusCode).toBe(200)
      return runtime.inspect(fixture.id)
    }
    try {
      await controller.start()
      for (const key of BL014_INITIAL_START_ORDER) await execute(key)
      const initial = new Map(
        BL014_FIXTURES.map((fixture) => [
          fixture.key,
          runtime.inspect(fixture.id),
        ])
      )
      const ledger = []
      for (const key of BL014_OPEN_REENTRY_ORDER) {
        const snapshot = await execute(key)
        ledger.push({
          key,
          same: snapshot === initial.get(key),
          stopCount: stop.mock.calls.length,
        })
      }
      expect(ledger).toEqual(
        BL014_OPEN_REENTRY_ORDER.map((key) => ({
          key,
          same: true,
          stopCount: 0,
        }))
      )
      expect(
        [...launches.values()].reduce((sum, count) => sum + count, 0)
      ).toBe(3)
      expect([...reuses.values()].reduce((sum, count) => sum + count, 0)).toBe(
        5
      )
      expect(stop).not.toHaveBeenCalled()
    } finally {
      await controller.stop()
    }
    expect(shutdown).toHaveBeenCalledOnce()
  })
})
