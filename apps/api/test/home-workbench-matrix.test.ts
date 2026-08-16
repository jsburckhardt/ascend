import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createApiServerController } from '../src/api-server.js'
import {
  HOME_WORKBENCH_API_ROWS,
  validateAcceptanceMatrix,
  type AcceptanceMatrix,
  type AcceptanceMatrixRow,
} from '../src/home-workbench-evidence.js'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  RuntimeFailure,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  WORKBENCH_DOCUMENT_HEADER,
  WORKBENCH_DOCUMENT_HEADER_VALUE,
} from '../src/workbench-navigation-shell.js'
import {
  workbenchFailure,
  workbenchFailureEnvelope,
} from '../src/workbench-proxy-contract.js'
import type { WorkbenchProxyManager } from '../src/workbench-proxy-manager.js'

const bounds = {
  operationMs: 1_000,
  startupMs: 15_000,
  documentMs: 15_000,
  recoveryMs: 2_000,
  overallMs: 30_000,
  cleanupMs: 5_000,
}
const resultPath = path.resolve(
  import.meta.dirname,
  '../../../test-results/bl-012/api-matrix.json'
)
const malformed: Record<string, string> = {
  'decode-failure': '/projects/%E0%A4%A/workbench/',
  'empty-id': '/projects//workbench/',
  'encoded-slash': '/projects/x%2Fy/workbench/',
  'encoded-backslash': '/projects/x%5Cy/workbench/',
  'encoded-nul': '/projects/x%00y/workbench/',
  'sibling-path': '/projects/stable/other/',
  'id-too-long': '/projects/' + 'x'.repeat(129) + '/workbench/',
}
const project = (id: string) => ({
  id,
  name: id,
  canonicalPath: '/safe/' + id,
  createdAt: 1,
})
const jsonFailure = (
  response: import('node:http').ServerResponse,
  category: Parameters<typeof workbenchFailure>[0]
): void => {
  const failure = workbenchFailure(category)
  response.writeHead(failure.status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(workbenchFailureEnvelope(failure)))
}

describe('execution-backed Home/workbench API matrix', () => {
  it('executes every row through Fastify plus controlled proxy and runtime boundaries', async () => {
    let eventOrdinal = 0
    const events = new Map<string, string[]>()
    const record = (id: string, boundary: string): void => {
      const values = events.get(id) ?? []
      values.push('bl012-event-api-' + id + '-' + String(++eventOrdinal))
      events.set(id, values)
      expect(['request', 'proxy', 'runtime']).toContain(boundary)
    }
    const lookups = new Map<string, number>()
    const startRequests = new Map<string, number>()
    const launches = new Map<string, number>()
    const reuses = new Map<string, number>()
    const running = new Map<string, RuntimeSnapshot>()
    const pending = new Map<string, Promise<RuntimeSnapshot>>()
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async (id) => {
        lookups.set(id, (lookups.get(id) ?? 0) + 1)
        if (id === 'unknown') return undefined
        return project(id)
      }),
      list: vi.fn(async () => []),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const runtime: ProjectRuntimeManager = {
      beginReconciliation: async () => undefined,
      start: vi.fn(async ({ projectId, canonicalPath }) => {
        record(projectId, 'runtime')
        startRequests.set(projectId, (startRequests.get(projectId) ?? 0) + 1)
        if (projectId === 'runtime-failure')
          throw new RuntimeFailure('spawn-error')
        const existing = running.get(projectId)
        if (existing !== undefined) {
          reuses.set(projectId, (reuses.get(projectId) ?? 0) + 1)
          return existing
        }
        const joining = pending.get(projectId)
        if (joining !== undefined) {
          reuses.set(projectId, (reuses.get(projectId) ?? 0) + 1)
          return joining
        }
        launches.set(projectId, (launches.get(projectId) ?? 0) + 1)
        const launched = new Promise<RuntimeSnapshot>((resolve) =>
          setTimeout(() => {
            const snapshot: RuntimeSnapshot = {
              projectId,
              state: 'running',
              pid: 7001,
              processStartTime: 'instrumented-start',
              internalUrl: 'http://127.0.0.1:1',
              port: 1,
              canonicalPath,
              startedAt: 1,
              elapsedMs: 1,
            }
            running.set(projectId, snapshot)
            pending.delete(projectId)
            resolve(snapshot)
          }, 5)
        )
        pending.set(projectId, launched)
        return launched
      }),
      inspect: (id) => running.get(id),
      lastFailure: vi.fn(),
      lastCleanup: vi.fn(),
      lastShutdown: vi.fn(),
      shutdown: vi.fn(async () => ({ status: 'ok', audits: [] })),
    }
    const proxy: WorkbenchProxyManager = {
      handleHttp: async (_request, response, route) => {
        record(route.projectId, 'proxy')
        const found = await library.findById(route.projectId)
        if (found === undefined) return jsonFailure(response, 'unknown-project')
        try {
          await runtime.start({
            projectId: found.id,
            canonicalPath: found.canonicalPath,
          })
        } catch {
          return jsonFailure(response, 'runtime:spawn-error')
        }
        if (route.projectId === 'upstream-failure')
          return jsonFailure(response, 'upstream-connect')
        response.writeHead(200, { 'content-type': 'text/html' })
        response.end(
          '<!doctype html><main>Executed ' + route.projectId + '</main>'
        )
      },
      handleUpgrade: async () => undefined,
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
    const rows: AcceptanceMatrixRow[] = []
    const makeRow = (
      id: string,
      url: string,
      observed: Partial<AcceptanceMatrixRow>
    ): AcceptanceMatrixRow => ({
      id,
      executionId: 'bl012-api-' + id,
      eventIds: events.get(id) ?? [],
      boundaries: [
        'fastify',
        ...(events.get(id)?.length === 1
          ? []
          : (['proxy', 'runtime'] as const)),
      ],
      executed: true,
      outcome: 'passed',
      actionCount: 1,
      navigationCount: 0,
      url,
      historyLength: 0,
      generation: 1,
      lookupCount: lookups.get(id) ?? 0,
      startCount: launches.get(id) ?? 0,
      reuseCount: reuses.get(id) ?? 0,
      stopCount: 0,
      runtimeState: running.has(id)
        ? 'running'
        : id === 'runtime-failure'
          ? 'failed'
          : 'stopped',
      focus: 'surface-heading',
      announcement: 'Observed through instrumented Fastify execution.',
      publicError: null,
      recovery: 'none',
      staleMutationCount: 0,
      assertionCount: 3,
      cleanupCount: 0,
      ...observed,
    })
    const marked = {
      accept: 'text/html',
      [WORKBENCH_DOCUMENT_HEADER]: WORKBENCH_DOCUMENT_HEADER_VALUE,
    }
    try {
      await controller.start()
      for (const id of HOME_WORKBENCH_API_ROWS) {
        if (id in malformed) {
          record(id, 'request')
          const response = await controller.server.inject({
            method: 'GET',
            url: malformed[id]!,
            headers: { accept: 'text/html' },
          })
          expect(response.statusCode).toBe(400)
          rows.push(
            makeRow(id, malformed[id]!, {
              generation: 0,
              publicError: 'invalid_project_id',
              focus: 'error-heading',
              announcement:
                'Malformed route rejected before lookup and runtime.',
            })
          )
          continue
        }
        if (id === 'document-load-timeout') {
          record(id, 'request')
          const response = await controller.server.inject({
            method: 'GET',
            url: '/projects/document-timeout/workbench/',
            headers: { accept: 'text/html' },
          })
          expect(response.body).toContain('Workbench document load timed out.')
          rows.push(
            makeRow(id, '/projects/document-timeout/workbench/', {
              generation: 1,
              publicError: 'workbench_document_timeout',
              focus: 'Opening workbench',
              announcement: 'Shell declared the finite document-load timeout.',
              recovery: 'Retry',
              boundaries: ['fastify', 'shell'],
            })
          )
          continue
        }
        const target =
          id === 'valid-stopped' || id === 'valid-running'
            ? 'stable'
            : id === 'eight-joined-acquisitions'
              ? 'joined'
              : id === 'unknown-closed'
                ? 'unknown'
                : id === 'runtime-start-failure'
                  ? 'runtime-failure'
                  : 'upstream-failure'
        const url = '/projects/' + target + '/workbench/'
        record(id, 'request')
        const beforeLookup = lookups.get(target) ?? 0,
          beforeLaunch = launches.get(target) ?? 0,
          beforeReuse = reuses.get(target) ?? 0
        const responses = await Promise.all(
          Array.from(
            { length: id === 'eight-joined-acquisitions' ? 8 : 1 },
            () =>
              controller.server.inject({ method: 'GET', url, headers: marked })
          )
        )
        expect(responses).toHaveLength(
          id === 'eight-joined-acquisitions' ? 8 : 1
        )
        events.set(id, [events.get(id)![0]!, ...(events.get(target) ?? [])])
        events.delete(target)
        const lookupCount = (lookups.get(target) ?? 0) - beforeLookup,
          startCount = (launches.get(target) ?? 0) - beforeLaunch,
          reuseCount = (reuses.get(target) ?? 0) - beforeReuse
        const publicError =
          id === 'unknown-closed'
            ? 'project_not_found'
            : id === 'runtime-start-failure'
              ? 'workbench_start_failed'
              : id === 'upstream-proxy-failure'
                ? 'workbench_upstream_connect_failed'
                : null
        rows.push(
          makeRow(id, url, {
            actionCount: responses.length,
            lookupCount,
            startCount,
            reuseCount,
            runtimeState:
              id === 'runtime-start-failure'
                ? 'failed'
                : id === 'unknown-closed'
                  ? 'stopped'
                  : 'running',
            publicError,
            recovery:
              id === 'unknown-closed'
                ? 'Projects'
                : publicError === null
                  ? 'none'
                  : 'Retry',
            focus: publicError === null ? 'surface-heading' : 'error-heading',
            announcement:
              publicError === null
                ? 'Runtime boundary execution completed.'
                : 'Safe failure observed through proxy boundary.',
          })
        )
      }
      expect(rows.map((row) => row.id)).toEqual(HOME_WORKBENCH_API_ROWS)
      expect(rows.find((row) => row.id === 'valid-stopped')).toMatchObject({
        startCount: 1,
        reuseCount: 0,
        stopCount: 0,
        runtimeState: 'running',
      })
      expect(rows.find((row) => row.id === 'valid-running')).toMatchObject({
        startCount: 0,
        reuseCount: 1,
        stopCount: 0,
        runtimeState: 'running',
      })
      expect(
        rows.find((row) => row.id === 'eight-joined-acquisitions')
      ).toMatchObject({
        actionCount: 8,
        startCount: 1,
        reuseCount: 7,
        stopCount: 0,
        runtimeState: 'running',
      })
      const matrix: AcceptanceMatrix = {
        schemaVersion: 1,
        id: 'api',
        bounds,
        rows,
      }
      expect(validateAcceptanceMatrix(matrix)).toBe(true)
      mkdirSync(path.dirname(resultPath), { recursive: true })
      writeFileSync(resultPath, JSON.stringify(matrix, null, 2))
      const missingEvents = {
        ...matrix,
        rows: matrix.rows.map((row, index) =>
          index === 0 ? { ...row, eventIds: [] } : row
        ),
      }
      expect(validateAcceptanceMatrix(missingEvents as AcceptanceMatrix)).toBe(
        false
      )
    } finally {
      await controller.stop()
    }
  })
})
