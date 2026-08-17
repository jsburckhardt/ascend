import { sql } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import {
  ProjectCloseError,
  createProjectCloseService,
  type ProjectCloseServiceDependencies,
} from '../src/project-close.js'
import { createProjectLibrary } from '../src/project-library.js'
import {
  deriveProjectOwnerToken,
  type ProjectRuntimeCloseInput,
  type RuntimeCloseOutcome,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type { WorkbenchProxyAudit } from '../src/workbench-proxy-manager.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

const target = {
  id: ' target <script> ',
  name: 'Target',
  canonicalPath: '/fixture/target',
  createdAt: 1,
}
const sibling = {
  id: 's',
  name: 'Sibling',
  canonicalPath: '/fixture/sibling',
  createdAt: 2,
}

const CLEAR_AUDIT: WorkbenchProxyAudit = Object.freeze({
  shuttingDown: false,
  pendingOperations: 0,
  upstreamHttpRequests: 0,
  upstreamHttpResponses: 0,
  rawSockets: 0,
  webSockets: 0,
})

/** The two proxy members the close service is permitted to read, and no more. */
function proxyDouble(): ProjectCloseServiceDependencies['proxy'] & {
  readonly closeProject: ReturnType<typeof vi.fn>
  readonly audit: ReturnType<typeof vi.fn>
} {
  return {
    closeProject: vi.fn(async () => CLEAR_AUDIT),
    audit: vi.fn(() => CLEAR_AUDIT),
  }
}

/**
 * A typed manager `close` double that never bypasses the service: it records the
 * single input object and only runs the injected callables when the scenario
 * tells it to, so durable removal stays under test control.
 */
function runtimeDouble(
  run: (input: ProjectRuntimeCloseInput) => Promise<RuntimeCloseOutcome>
): ProjectCloseServiceDependencies['runtime'] & {
  readonly close: ReturnType<typeof vi.fn>
  readonly inputs: readonly ProjectRuntimeCloseInput[]
} {
  const inputs: ProjectRuntimeCloseInput[] = []
  const close = vi.fn(async (input: ProjectRuntimeCloseInput) => {
    inputs.push(input)
    return run(input)
  })
  return { close, inputs }
}

describe('ProjectCloseService', () => {
  it('rejects malformed input before touching runtime, proxy, or library', async () => {
    const library = { closeProject: vi.fn() }
    const proxy = proxyDouble()
    const runtime = runtimeDouble(async ({ projectId }) =>
      Object.freeze({
        outcome: 'closed' as const,
        projectId,
        releasedGenerations: 0,
      })
    )
    const service = createProjectCloseService({ library, runtime, proxy })

    const invalid = await service
      .closeProject('')
      .catch((error: unknown) => error)
    expect(invalid).toBeInstanceOf(ProjectCloseError)
    expect(invalid).toMatchObject({ category: 'invalid_project_id' })
    await expect(
      (service.closeProject as unknown as (id: unknown) => Promise<unknown>)(
        undefined
      )
    ).rejects.toMatchObject({ category: 'invalid_project_id' })

    expect(runtime.close).not.toHaveBeenCalled()
    expect(proxy.closeProject).not.toHaveBeenCalled()
    expect(proxy.audit).not.toHaveBeenCalled()
    expect(library.closeProject).not.toHaveBeenCalled()
  })

  it('composes all four close input members at one call site and removes only through commitRemoval', async () => {
    const library = {
      closeProject: vi.fn(async () => ({
        disposition: 'closed' as const,
        id: 'opaque',
      })),
    }
    const proxy = proxyDouble()
    const drainSignal = new AbortController().signal
    const runtime = runtimeDouble(async (input) => {
      // Nothing durable has happened yet: the manager owns the ordering.
      expect(library.closeProject).not.toHaveBeenCalled()
      const drained = await input.drainConnections(drainSignal)
      expect(drained).toBe(CLEAR_AUDIT)
      const audited = input.auditConnections()
      expect(audited).toBe(CLEAR_AUDIT)
      expect(library.closeProject).not.toHaveBeenCalled()
      const removal = await input.commitRemoval()
      expect(removal).toEqual({ disposition: 'closed', id: 'opaque' })
      return Object.freeze({
        outcome: 'closed' as const,
        projectId: input.projectId,
        releasedGenerations: 1,
      })
    })
    const service = createProjectCloseService({ library, runtime, proxy })

    await expect(service.closeProject('opaque')).resolves.toEqual({
      outcome: 'closed',
      projectId: 'opaque',
      releasedGenerations: 1,
    })

    expect(runtime.close).toHaveBeenCalledOnce()
    const [input] = runtime.inputs
    expect(input).toBeDefined()
    expect(Object.keys(input!).sort()).toEqual([
      'auditConnections',
      'commitRemoval',
      'drainConnections',
      'projectId',
    ])
    expect(input!.projectId).toBe('opaque')
    for (const member of [
      'drainConnections',
      'auditConnections',
      'commitRemoval',
    ] as const) {
      expect(typeof input![member]).toBe('function')
    }
    // `auditConnections` is a synchronous thunk, so the manager can call it
    // inside its confirmation region.
    expect(input!.auditConnections()).toBe(CLEAR_AUDIT)
    expect(proxy.closeProject).toHaveBeenCalledWith('opaque', drainSignal)
    expect(proxy.audit).toHaveBeenCalledWith(deriveProjectOwnerToken('opaque'))
    expect(proxy.audit.mock.calls.every(([token]) => token !== 'opaque')).toBe(
      true
    )
    expect(library.closeProject).toHaveBeenCalledOnce()
    expect(library.closeProject).toHaveBeenCalledWith('opaque')
  })

  it('performs no durable removal when the manager never commits', async () => {
    const library = { closeProject: vi.fn() }
    const proxy = proxyDouble()
    const runtime = runtimeDouble(async ({ projectId }) =>
      Object.freeze({
        outcome: 'rejected' as const,
        projectId,
        category: 'release-unconfirmed' as const,
      })
    )
    const service = createProjectCloseService({ library, runtime, proxy })

    await expect(service.closeProject('opaque')).resolves.toEqual({
      outcome: 'rejected',
      projectId: 'opaque',
      category: 'release-unconfirmed',
    })
    expect(library.closeProject).not.toHaveBeenCalled()
  })

  it('propagates an infrastructure fault to the manager without leaking it', async () => {
    const secret = 'SELECT secret FROM projects /private/database stack'
    const library = {
      closeProject: vi.fn(async () => {
        throw new Error(secret)
      }),
    }
    const proxy = proxyDouble()
    const runtime = runtimeDouble(async (input) => {
      const faulted = await input.commitRemoval().then(
        () => undefined,
        (error: unknown) => error
      )
      expect(faulted).toBeInstanceOf(Error)
      return Object.freeze({
        outcome: 'rejected' as const,
        projectId: input.projectId,
        category: 'removal-failed' as const,
      })
    })
    const service = createProjectCloseService({ library, runtime, proxy })
    const outcome = await service.closeProject('opaque')

    expect(outcome).toEqual({
      outcome: 'rejected',
      projectId: 'opaque',
      category: 'removal-failed',
    })
    expect(JSON.stringify(outcome)).not.toContain('SELECT secret')

    // The safe categories the route publishes stay redacted in themselves.
    const safe = new ProjectCloseError('project_close_failed')
    expect(safe.message).toBe('Project close failed')
    expect(safe).not.toHaveProperty('cause')
    expect(String(safe)).not.toContain(secret)
  })

  it('removes one stable ID, reports repeated absence, and persists restart absence', async () => {
    const context = await allocateDatabaseTestContext('bl020-close-service')
    let library = await createProjectLibrary(context.databasePath)
    const proxy = proxyDouble()
    const runtime = createProjectRuntimeManager({
      findProjectById: (id) => library.findById(id),
    })
    try {
      await library.create(target)
      await library.create(sibling)
      const service = createProjectCloseService({ library, runtime, proxy })

      await expect(service.closeProject(target.id)).resolves.toEqual({
        outcome: 'closed',
        projectId: target.id,
        releasedGenerations: 0,
      })
      await expect(service.closeProject(target.id)).resolves.toEqual({
        outcome: 'already-absent',
        projectId: target.id,
        released: true,
      })
      expect(await library.list()).toEqual([sibling])
      library.close()
      library.close()
      library = await createProjectLibrary(context.databasePath)
      expect(await library.list()).toEqual([sibling])
    } finally {
      await runtime.shutdown()
      library.close()
      await context.cleanup()
    }
  })

  it('reports removal-failed and keeps the row when the real DELETE is rolled back', async () => {
    const context = await allocateDatabaseTestContext('bl020-close-rollback')
    let library = await createProjectLibrary(context.databasePath)
    try {
      await library.create(target)
      await library.create(sibling)
      library.close()
      const resource = createDatabase(context.databasePath)
      await resource.database.run(
        sql.raw(
          `CREATE TRIGGER close_abort AFTER DELETE ON projects BEGIN SELECT RAISE(ABORT, 'private-trigger-sentinel'); END`
        )
      )
      resource.close()
      library = await createProjectLibrary(context.databasePath)
      const runtime = createProjectRuntimeManager({
        findProjectById: (id) => library.findById(id),
      })
      try {
        const before = await library.list()
        const outcome = await createProjectCloseService({
          library,
          runtime,
          proxy: proxyDouble(),
        }).closeProject(target.id)
        expect(outcome).toEqual({
          outcome: 'rejected',
          projectId: target.id,
          category: 'removal-failed',
        })
        expect(JSON.stringify(outcome)).not.toContain(
          'private-trigger-sentinel'
        )
        expect(await library.list()).toEqual(before)
      } finally {
        await runtime.shutdown()
      }
    } finally {
      library.close()
      await context.cleanup()
    }
  })
})
