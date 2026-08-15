import { describe, expect, it, vi } from 'vitest'
import type {
  PublicRuntimeReport,
  RuntimeRestartOutcome,
} from '../src/project-runtime-contract.js'
import type {
  ProjectRuntimeManager,
  RuntimeShutdownResult,
} from '../src/project-runtime-manager.js'
import {
  RUNTIME_RESTART_BODY_LIMIT_BYTES,
  RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES,
} from '../src/routes/project-runtime-restart.js'
import { build } from './helper.js'

const shutdownResult: RuntimeShutdownResult = { status: 'ok', audits: [] }

function runtime(
  implementation: (
    projectId: string
  ) => RuntimeRestartOutcome | Promise<RuntimeRestartOutcome>
): ProjectRuntimeManager {
  return {
    register: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(({ projectId }) => implementation(projectId)),
    reportPublicStates: vi.fn(
      (projectIds: readonly string[]): PublicRuntimeReport[] =>
        projectIds.map((projectId) => ({ projectId, state: 'Stopped' }))
    ),
    inspect: vi.fn(),
    ownsSnapshot: vi.fn(() => false),
    inspectEntries: vi.fn(() => []),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(() => shutdownResult),
    shutdown: vi.fn(async () => shutdownResult),
  }
}

describe('POST /api/projects/:id/runtime/restart', () => {
  it('returns only the exact restarted envelope', async () => {
    const projectRuntime = runtime((projectId) => ({
      outcome: 'restarted',
      projectId,
      priorIdentity: {
        pid: 111,
        processStartTime: 'protected-prior',
        port: 45_678,
      },
      replacementIdentity: {
        pid: 222,
        processStartTime: 'protected-replacement',
        port: 45_679,
      },
      release: 'graceful',
      audit: {
        outcome: 'graceful',
        pid: 111,
        processStartTime: 'protected-prior',
        port: 45_678,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      },
    }))
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/selected/runtime/restart',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: 'selected',
      outcome: 'restarted',
    })
    expect(response.body).not.toMatch(
      /protected|replacementIdentity|priorIdentity|pid|port|release|audit/iu
    )
  })

  it.each([
    ['not-registered', 404, 'project_not_found'],
    ['no-managed-runtime', 409, 'runtime_not_managed'],
    ['start-in-progress', 409, 'runtime_start_in_progress'],
    ['stop-in-progress', 409, 'runtime_stop_in_progress'],
    ['release-unconfirmed', 500, 'runtime_restart_release_unconfirmed'],
    ['replacement-failed', 500, 'runtime_replacement_failed'],
    ['manager-shutdown', 503, 'runtime_manager_shutdown'],
  ] as const)(
    'maps %s without private diagnostics',
    async (category, status, error) => {
      const app = await build({
        createProjectRuntimeManager: () =>
          runtime((projectId) => ({
            outcome: 'rejected',
            projectId,
            category,
            failureCategory: 'restart-replacement-unconfirmed',
          })),
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/selected/runtime/restart',
      })
      expect(response.statusCode).toBe(status)
      expect(response.json()).toEqual({ error: { category: error } })
      expect(response.body).not.toContain('restart-replacement-unconfirmed')
    }
  )

  it.each([
    ['/api/projects/runtime/restart', undefined],
    ['/api/projects//runtime/restart', undefined],
    ['/api/projects/selected/runtime/restart?extra=1', undefined],
    ['/api/projects/selected/runtime/restart', { extra: true }],
  ])('rejects the invalid request %s', async (url, payload) => {
    const projectRuntime = runtime(() => {
      throw new Error('must not run')
    })
    const app = await build({
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject({
      method: 'POST',
      url,
      ...(payload === undefined ? {} : { payload }),
    })
    expect(response.statusCode).toBe(400)
    expect(projectRuntime.restart).not.toHaveBeenCalled()
  })

  it('collapses thrown and mismatched outcomes to one safe failure', async () => {
    for (const implementation of [
      () => {
        throw new Error('SECRET /private port 45678 PID 100')
      },
      () =>
        ({
          outcome: 'restarted',
          projectId: 'other',
          replacementIdentity: {
            pid: 222,
            processStartTime: 'protected',
            port: 45_679,
          },
        }) as const,
    ]) {
      const app = await build({
        createProjectRuntimeManager: () => runtime(implementation),
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/selected/runtime/restart',
      })
      expect(response.statusCode).toBe(500)
      expect(response.json()).toEqual({
        error: { category: 'runtime_restart_failed' },
      })
      expect(response.body).not.toMatch(/SECRET|private|45678|100|protected/iu)
    }
  })

  it('freezes the exact ten-category route vocabulary and body bound', () => {
    expect(RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES).toHaveLength(10)
    expect(new Set(RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES).size).toBe(10)
    expect(RUNTIME_RESTART_BODY_LIMIT_BYTES).toBe(1_024)
  })
})
