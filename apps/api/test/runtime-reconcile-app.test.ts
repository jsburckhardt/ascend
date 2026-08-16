import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { ProjectLibraryInitializationError } from '../src/app.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRegistrationService } from '../src/project-registration.js'
import { build } from './helper.js'

const shutdownResult = {
  status: 'ok' as const,
  audits: [],
  unresolvedAdmissions: [],
}

function library(): ProjectLibrary {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(async () => []),
    closeProject: vi.fn(),
    close: vi.fn(),
  }
}

function registration(): ProjectRegistrationService {
  return { register: vi.fn(), close: vi.fn() }
}

function runtime(
  beginReconciliation: () => Promise<void>
): ProjectRuntimeManager {
  return {
    beginReconciliation,
    register: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    reportPublicStates: vi.fn(() => []),
    inspect: vi.fn(),
    ownsSnapshot: vi.fn(() => false),
    inspectEntries: vi.fn(() => []),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(),
    shutdown: vi.fn(async () => shutdownResult),
  }
}

describe('application runtime reconciliation startup', () => {
  it('requires reconciliation before route registration without a silent skip', async () => {
    const source = await readFile(
      new URL('../src/app.ts', import.meta.url),
      'utf8'
    )
    const reconciliation = source.indexOf(
      'await runtimeManager.beginReconciliation()'
    )
    const firstRoute = source.indexOf('fastify.register(')

    expect(reconciliation).toBeGreaterThan(0)
    expect(firstRoute).toBeGreaterThan(reconciliation)
    expect(source).not.toContain('beginReconciliation?.')
    expect(source).not.toMatch(/if\s*\([^)]*beginReconciliation/u)
  })

  it('calls required reconciliation exactly once during successful startup', async () => {
    const beginReconciliation = vi.fn(async () => undefined)
    const manager = runtime(beginReconciliation)
    const app = await build({
      createProjectLibrary: async () => library(),
      createProjectRegistration: async () => registration(),
      createProjectRuntimeManager: () => manager,
    })

    expect(beginReconciliation).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('fails initialization and shuts the manager down when reconciliation fails', async () => {
    const manager = runtime(
      vi.fn(async () => {
        throw new Error('reconciliation failed')
      })
    )

    await expect(
      build({
        createProjectLibrary: async () => library(),
        createProjectRegistration: async () => registration(),
        createProjectRuntimeManager: () => manager,
      })
    ).rejects.toBeInstanceOf(ProjectLibraryInitializationError)
    expect(manager.shutdown).toHaveBeenCalledTimes(1)
  })
})
