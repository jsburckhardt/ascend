import { describe, expect, it, vi } from 'vitest'
import type { PublicRuntimeReport } from '../src/project-runtime-contract.js'
import {
  RuntimeStopInvariantError,
  type RuntimeStopOutcome,
} from '../src/project-runtime-contract.js'
import type {
  ProjectRuntimeManager,
  RuntimeShutdownResult,
} from '../src/project-runtime-manager.js'
import {
  PROJECT_RUNTIME_STOP_FAILED_EVENT,
  PROJECT_RUNTIME_STOP_REJECTED_EVENT,
  RUNTIME_STOP_BODY_LIMIT_BYTES,
  RUNTIME_STOP_ROUTE_ERROR_CATEGORIES,
} from '../src/routes/project-runtime-stop.js'
import { build } from './helper.js'

const shutdownResult: RuntimeShutdownResult = { status: 'ok', audits: [] }

function runtime(
  implementation: (
    projectId: string
  ) => RuntimeStopOutcome | Promise<RuntimeStopOutcome>
): ProjectRuntimeManager {
  return {
    beginReconciliation: async () => undefined,
    register: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(({ projectId }) => implementation(projectId)),
    close: async () => {
      throw new Error('stop routing does not close projects')
    },
    reportPublicStates: vi.fn(
      (projectIds: readonly string[]): PublicRuntimeReport[] =>
        projectIds.map((projectId) => ({ projectId, state: 'Stopped' }))
    ),
    inspect: vi.fn(),
    ownsSnapshot: vi.fn(() => false),
    inspectEntries: vi.fn(() => []),
    audit: vi.fn(() => ({
      shuttingDown: false,
      entryCount: 0,
      startingEntries: 0,
      ownershipRecords: 0,
      completionTasks: 0,
      backgroundTasks: 0,
      stopTasks: 0,
      completionTaskSettlements: 0,
      backgroundTaskSettlements: 0,
      lateTerminationSettlements: 0,
    })),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(() => shutdownResult),
    shutdown: vi.fn(async () => shutdownResult),
  }
}

const stopped = (projectId: string): RuntimeStopOutcome => ({
  outcome: 'stopped',
  projectId,
  release: 'graceful',
  audit: {
    outcome: 'graceful',
    pid: 111,
    processStartTime: 'protected-start-time',
    port: 45_678,
    processAbsent: true,
    processGroupAbsent: true,
    listenerAbsent: true,
  },
})

describe('POST /api/projects/:id/runtime/stop', () => {
  it.each([
    ['stopped', stopped('selected')],
    [
      'already-stopped',
      { outcome: 'already-stopped', projectId: 'selected' } as const,
    ],
  ])('returns the exact %s success envelope', async (outcome, result) => {
    const projectRuntime = runtime(() => result)
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: 'selected', outcome })
    expect(Object.keys(response.json()).sort()).toEqual(['id', 'outcome'])
    for (const prohibited of [
      'state',
      'release',
      'audit',
      'pid',
      'port',
      'protected-start-time',
    ]) {
      expect(response.body).not.toContain(prohibited)
    }
    expect(projectRuntime.stop).toHaveBeenCalledOnce()
    expect(projectRuntime.stop).toHaveBeenCalledWith({
      projectId: 'selected',
    })
  })

  it.each([
    ['not-registered', 404, 'project_not_found'],
    ['no-managed-runtime', 409, 'runtime_not_managed'],
    ['start-in-progress', 409, 'runtime_start_in_progress'],
    ['failure-retained', 409, 'runtime_failure_retained'],
    ['stop-unconfirmed', 500, 'runtime_stop_unconfirmed'],
    ['manager-shutdown', 503, 'runtime_manager_shutdown'],
    ['reconcile-in-progress', 409, 'runtime_reconcile_in_progress'],
    ['reconcile-unresolved', 409, 'runtime_reconcile_unresolved'],
  ] as const)('maps %s to %i %s', async (rejection, status, category) => {
    const logs: string[] = []
    const projectRuntime = runtime((projectId) => ({
      outcome: 'rejected',
      projectId,
      category: rejection,
    }))
    const app = await build({
      logger: {
        level: 'warn',
        stream: { write: (line: string) => logs.push(line) },
      },
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
    })
    expect(response.statusCode).toBe(status)
    expect(response.json()).toEqual({ error: { category } })
    expect(Object.keys(response.json()).sort()).toEqual(['error'])
    expect(Object.keys(response.json().error).sort()).toEqual(['category'])
    expect(RUNTIME_STOP_ROUTE_ERROR_CATEGORIES).toContain(category)
    const logged = logs.join('')
    expect(logged).toContain(PROJECT_RUNTIME_STOP_REJECTED_EVENT)
    expect(logged).toContain(category)
    expect(logged).not.toContain('runtime.stop.failed')
  })

  it.each([
    ['absent body and content type', {}],
    ['empty JSON object', { payload: {} }],
  ])('accepts an %s', async (_label, request) => {
    const projectRuntime = runtime(stopped)
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
      ...request,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: 'selected',
      outcome: 'stopped',
    })
  })

  it.each([
    ['non-empty JSON body', { payload: { force: true } }],
    [
      'oversized body',
      {
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          padding: 'x'.repeat(RUNTIME_STOP_BODY_LIMIT_BYTES),
        }),
      },
    ],
    [
      'wrong media type',
      {
        headers: { 'content-type': 'text/plain' },
        payload: 'not-an-operation',
      },
    ],
    ['query field', { query: { force: 'true' } }],
  ])('rejects a %s without delegation', async (_label, request) => {
    const projectRuntime = runtime(stopped)
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
      ...request,
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: { category: 'invalid_stop_request' },
    })
    expect(projectRuntime.stop).not.toHaveBeenCalled()
  })

  it.each([
    '/api/projects/runtime/stop',
    '/api/projects//runtime/stop',
    '/api/projects/%/runtime/stop',
  ])('rejects a missing, empty, or undecodable ID: %s', async (url) => {
    const projectRuntime = runtime(stopped)
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({ method: 'POST', url })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: { category: 'invalid_project_id' },
    })
    expect(projectRuntime.stop).not.toHaveBeenCalled()
  })

  it.each([
    ['generic fault', new Error('SECRET_RUNTIME_STACK')],
    ['invariant fault', new RuntimeStopInvariantError()],
  ])('fails closed for a %s', async (_label, error) => {
    const logs: string[] = []
    const projectRuntime = runtime(async () => {
      throw error
    })
    const app = await build({
      logger: {
        level: 'error',
        stream: { write: (line: string) => logs.push(line) },
      },
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
    })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { category: 'runtime_stop_failed' },
    })
    expect(response.json()).not.toHaveProperty('id')
    expect(response.json()).not.toHaveProperty('outcome')
    const observable = JSON.stringify({
      body: response.body,
      headers: response.headers,
      logs,
    })
    expect(observable).toContain(PROJECT_RUNTIME_STOP_FAILED_EVENT)
    expect(observable).not.toContain('SECRET_RUNTIME_STACK')
    expect(observable).not.toContain('Runtime stop ownership invariant failed')
  })

  it('fails closed when the manager returns a mismatched project ID', async () => {
    const projectRuntime = runtime(() => ({
      outcome: 'already-stopped',
      projectId: 'peer',
    }))
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
    })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { category: 'runtime_stop_failed' },
    })
  })

  it('registers exactly one selected stop handler', async () => {
    const projectRuntime = runtime(stopped)
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/stop',
    })
    expect(response.statusCode).toBe(200)
    expect(projectRuntime.stop).toHaveBeenCalledOnce()
  })
})
