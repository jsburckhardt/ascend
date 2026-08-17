import { describe, expect, it, vi } from 'vitest'
import type {
  RuntimeRestartOutcome,
  RuntimeStopOutcome,
} from '../src/project-runtime-contract.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import { WORKBENCH_FAILURE_TABLE } from '../src/workbench-proxy-contract.js'
import { build } from './helper.js'

const shutdown = { status: 'ok' as const, audits: [], unresolvedAdmissions: [] }
const runtime = (
  stop: RuntimeStopOutcome,
  restart: RuntimeRestartOutcome
): ProjectRuntimeManager => ({
  beginReconciliation: async () => undefined,
  register: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(async () => stop),
  restart: vi.fn(async () => restart),
  close: async () => {
    throw new Error('reconciliation routing does not close projects')
  },
  reportPublicStates: vi.fn(() => []),
  inspect: vi.fn(),
  ownsSnapshot: vi.fn(() => false),
  inspectEntries: vi.fn(() => []),
  lastFailure: vi.fn(),
  lastCleanup: vi.fn(),
  lastShutdown: vi.fn(),
  shutdown: vi.fn(async () => shutdown),
})

describe('runtime reconciliation public routing', () => {
  it.each(['reconcile-in-progress', 'reconcile-unresolved'] as const)(
    'maps Stop %s to the fixed 409 category',
    async (category) => {
      const projectRuntime = runtime(
        { outcome: 'rejected', projectId: 'selected', category },
        { outcome: 'rejected', projectId: 'selected', category }
      )
      const app = await build({
        createProjectRuntimeManager: () => projectRuntime,
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/selected/runtime/stop',
      })
      expect(response.statusCode).toBe(409)
      expect(response.json()).toEqual({
        error: {
          category:
            category === 'reconcile-in-progress'
              ? 'runtime_reconcile_in_progress'
              : 'runtime_reconcile_unresolved',
        },
      })
      await app.close()
    }
  )

  it.each(['reconcile-in-progress', 'reconcile-unresolved'] as const)(
    'maps Restart %s to the fixed 409 category',
    async (category) => {
      const projectRuntime = runtime(
        { outcome: 'rejected', projectId: 'selected', category },
        { outcome: 'rejected', projectId: 'selected', category }
      )
      const app = await build({
        createProjectRuntimeManager: () => projectRuntime,
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects/selected/runtime/restart',
      })
      expect(response.statusCode).toBe(409)
      expect(response.json()).toEqual({
        error: {
          category:
            category === 'reconcile-in-progress'
              ? 'runtime_reconcile_in_progress'
              : 'runtime_reconcile_unresolved',
        },
      })
      await app.close()
    }
  )

  it('publishes only the fixed safe workbench failure', () => {
    expect(
      WORKBENCH_FAILURE_TABLE.find(
        ({ category }) => category === 'runtime:reconcile-unconfirmed'
      )
    ).toEqual({
      category: 'runtime:reconcile-unconfirmed',
      status: 503,
      code: 'workbench_reconcile_unconfirmed',
      message: 'Workbench recovery could not be confirmed.',
    })
  })
})
