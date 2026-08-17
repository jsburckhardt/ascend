import { describe, expect, it, vi } from 'vitest'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
  type ProjectRuntimeCloseInput,
  type ProjectRuntimeConfig,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeOwnershipRecord,
  RuntimeProcessDependencies,
  RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'
import type { WorkbenchProxyAudit } from '../src/workbench-proxy-manager.js'

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

const project = {
  id: 'project-1',
  name: 'Project One',
  canonicalPath: '/projects/one',
  createdAt: 1,
}

const clearAudit: WorkbenchProxyAudit = Object.freeze({
  shuttingDown: false,
  pendingOperations: 0,
  upstreamHttpRequests: 0,
  upstreamHttpResponses: 0,
  rawSockets: 0,
  webSockets: 0,
})

const busyAudit: WorkbenchProxyAudit = Object.freeze({
  ...clearAudit,
  rawSockets: 1,
})

function readyRuntime(
  pid: number,
  audits: readonly Partial<RuntimeTerminationAudit>[] = [],
  aliveGate?: Promise<boolean>
): ReadyRuntime & {
  readonly process: OwnedRuntimeProcess
  readonly settleExit: () => void
} {
  const exit = deferred<RuntimeExit>()
  const queue = [...audits]
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    terminate: vi.fn(async (_graceful, _force, port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      outcome: 'graceful' as const,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
      ...queue.shift(),
    })),
    audit: vi.fn(async (port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    isAlive: vi.fn(async () => (aliveGate === undefined ? true : aliveGate)),
  }
  return {
    process,
    port: 42_000 + pid,
    internalUrl: 'http://127.0.0.1:' + String(42_000 + pid),
    readinessAttempts: [],
    settleExit: () => exit.resolve({ code: 0, signal: null }),
  }
}

const baseConfig = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
  gracefulShutdownMs: 5,
  forceShutdownMs: 5,
  stopAuditAllowanceMs: 5,
})

function managerFixture(
  runtimes: readonly ReadyRuntime[],
  input: {
    readonly find?: typeof project | undefined
    readonly config?: ProjectRuntimeConfig
  } = {}
) {
  const events: RuntimeSafeLifecycleEvent[] = []
  const queue = [...runtimes]
  // Retains the launch callbacks so a test can force an ownership arrival for a
  // generation whose start has already settled, which is the only way to reach
  // the claimed and sealed registration seams from a production callback.
  let reportOwned: ((record: RuntimeOwnershipRecord) => void) | undefined
  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: vi.fn(async () => undefined),
      launch: vi.fn(),
    },
    ports: { acquire: vi.fn() },
    health: {
      check: vi.fn(async () => ({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive' as const,
        timedOut: false,
      })),
    },
    now: vi.fn(() => 1),
    sleep: vi.fn(
      (_milliseconds, signal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          })
        })
    ),
  }
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async () =>
      Object.hasOwn(input, 'find') ? input.find : project
    ),
    config: input.config ?? baseConfig,
    processDependencies,
    launch: vi.fn(async (request) => {
      reportOwned = request.onOwned
      return queue.shift() ?? runtimes[runtimes.length - 1]!
    }),
    now: vi.fn(() => 10),
    recordEvent: (event) => events.push(event),
  })
  return {
    manager,
    events,
    processDependencies,
    reportOwned: (record: RuntimeOwnershipRecord): void => {
      if (reportOwned === undefined)
        throw new Error('no launch recorded an ownership callback')
      reportOwned(record)
    },
  }
}

function closeInput(
  overrides: Partial<ProjectRuntimeCloseInput> = {}
): ProjectRuntimeCloseInput & {
  readonly drainConnections: ReturnType<typeof vi.fn>
  readonly auditConnections: ReturnType<typeof vi.fn>
  readonly commitRemoval: ReturnType<typeof vi.fn>
} {
  const drainConnections = vi.fn(async () => clearAudit)
  const auditConnections = vi.fn(() => clearAudit)
  const commitRemoval = vi.fn(async () => ({
    disposition: 'closed' as const,
    id: project.id,
  }))
  return {
    projectId: project.id,
    drainConnections,
    auditConnections,
    commitRemoval,
    ...overrides,
  } as ProjectRuntimeCloseInput & {
    readonly drainConnections: ReturnType<typeof vi.fn>
    readonly auditConnections: ReturnType<typeof vi.fn>
    readonly commitRemoval: ReturnType<typeof vi.fn>
  }
}

async function start(
  manager: ReturnType<typeof createProjectRuntimeManager>
): Promise<void> {
  await manager.start({
    projectId: project.id,
    canonicalPath: project.canonicalPath,
  })
}

describe('project runtime manager close authority', () => {
  it('releases a running runtime, removes the registration, and retires the id', async () => {
    const ready = readyRuntime(101)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const input = closeInput()

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'closed',
      projectId: project.id,
      releasedGenerations: 1,
      audits: [
        {
          pid: 101,
          processStartTime: '1010',
          port: ready.port,
          outcome: 'graceful',
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        },
      ],
    })
    expect(input.drainConnections).toHaveBeenCalledTimes(1)
    expect(input.auditConnections).toHaveBeenCalledTimes(1)
    expect(input.commitRemoval).toHaveBeenCalledTimes(1)
    expect(ready.process.terminate).toHaveBeenCalledTimes(1)
    const audit = fixture.manager.audit()
    expect(audit.entryCount).toBe(0)
    expect(audit.ownershipRecords).toBe(0)
    expect(audit.closeClaims).toEqual([])
    expect(audit.closeTasks).toBe(0)
    expect(audit.retiredProjects).toBe(1)
    expect(audit.lateCloseSettlements).toBe(0)
    expect(fixture.manager.lastCleanup(project.id)).toBeUndefined()
    expect(
      fixture.events.some((event) => event.event.startsWith('runtime.'))
    ).toBe(true)
    expect(
      fixture.events.filter((event) => event.event === 'runtime.health.changed')
    ).toEqual([])
  })

  it('removes a stopped project with no signal, probe, or termination', async () => {
    const ready = readyRuntime(102)
    const fixture = managerFixture([ready])
    fixture.manager.register(project.id, project.canonicalPath)
    const input = closeInput()

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'closed',
      projectId: project.id,
      releasedGenerations: 0,
    })
    expect(ready.process.terminate).not.toHaveBeenCalled()
    expect(ready.process.audit).not.toHaveBeenCalled()
    expect(fixture.manager.audit().retiredProjects).toBe(1)
  })

  it('reports persisted absence as a successful no-op', async () => {
    const fixture = managerFixture([readyRuntime(103)], { find: undefined })
    const input = closeInput()

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'already-absent',
      projectId: project.id,
      released: false,
    })
    expect(input.drainConnections).not.toHaveBeenCalled()
    expect(input.commitRemoval).not.toHaveBeenCalled()
  })

  it('refuses transient lifecycle states in the fixed admission order', async () => {
    const ready = readyRuntime(104)
    const fixture = managerFixture([ready])
    const starting = fixture.manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await expect(fixture.manager.close(closeInput())).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'start-in-progress',
    })
    await starting

    const stopping = fixture.manager.stop({ projectId: project.id })
    await expect(fixture.manager.close(closeInput())).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'stop-in-progress',
    })
    await stopping
    expect(fixture.manager.audit().closeClaims).toEqual([])
  })

  it('refuses acquisition and control while a claim is installed', async () => {
    const ready = readyRuntime(105)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const closing = fixture.manager.close(input)
    await Promise.resolve()

    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({
        projectId: project.id,
        frozenOwnershipCardinality: 1,
        sweepUnits: 1,
        lateWork: 0,
        sealed: false,
      }),
    ])
    await expect(
      fixture.manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'runtime-closing' })
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'close-in-progress',
    })
    await expect(
      fixture.manager.restart({ projectId: project.id })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'close-in-progress',
    })
    expect(() =>
      fixture.manager.register(project.id, project.canonicalPath)
    ).toThrow(RuntimeFailure)
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      { projectId: project.id, state: 'Running' },
    ])

    // Four caller-visible refusals, none of them identity-bearing: they are
    // counted for evidence only and leave the claim confirmable.
    expect(fixture.manager.audit().refusedLateAcquisitions).toBe(4)
    expect(fixture.manager.audit().lateCloseSettlements).toBe(0)
    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({ lateWork: 0, sealed: false }),
    ])

    drain.resolve(clearAudit)
    await expect(closing).resolves.toMatchObject({ outcome: 'closed' })
    expect(fixture.manager.audit().closeClaims).toEqual([])
  })

  it('joins contenders onto one claim and reports success exactly once', async () => {
    const ready = readyRuntime(106)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const winner = fixture.manager.close(input)
    await Promise.resolve()
    const contenders = [
      fixture.manager.close(input),
      fixture.manager.close(input),
    ]
    drain.resolve(clearAudit)

    await expect(winner).resolves.toMatchObject({ outcome: 'closed' })
    for (const contender of contenders)
      await expect(contender).resolves.toEqual({
        outcome: 'already-absent',
        projectId: project.id,
        released: true,
      })
    expect(input.commitRemoval).toHaveBeenCalledTimes(1)
    expect(ready.process.terminate).toHaveBeenCalledTimes(1)
  })

  it('refuses an over-cap frozen ownership cardinality with no effect', async () => {
    const first = readyRuntime(107, [{ processAbsent: false }])
    const second = readyRuntime(108)
    const fixture = managerFixture([first, second], {
      config: createProjectRuntimeConfig({
        expectedUser: 'fixture-user',
        environment: { PATH: '/safe/bin' },
        gracefulShutdownMs: 5,
        forceShutdownMs: 5,
        stopAuditAllowanceMs: 5,
        closeOwnershipSweepCap: 1,
      }),
    })
    await start(fixture.manager)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({ category: 'stop-unconfirmed' })
    await start(fixture.manager)
    expect(fixture.manager.audit().ownershipRecords).toBe(2)

    const input = closeInput()
    const events = fixture.events.length
    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'ownership-cardinality-exceeded',
    })
    expect(input.drainConnections).not.toHaveBeenCalled()
    expect(input.auditConnections).not.toHaveBeenCalled()
    expect(input.commitRemoval).not.toHaveBeenCalled()
    expect(second.process.terminate).not.toHaveBeenCalled()
    expect(fixture.events).toHaveLength(events)
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      { projectId: project.id, state: 'Running' },
    ])
    expect(fixture.manager.audit().closeClaims).toEqual([])
    expect(fixture.manager.audit().retiredProjects).toBe(0)
  })

  it('sweeps every frozen ownership record for the project', async () => {
    const first = readyRuntime(109, [{ processAbsent: false }])
    const second = readyRuntime(110)
    const fixture = managerFixture([first, second])
    await start(fixture.manager)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({ category: 'stop-unconfirmed' })
    await start(fixture.manager)
    expect(fixture.manager.audit().ownershipRecords).toBe(2)

    await expect(fixture.manager.close(closeInput())).resolves.toMatchObject({
      outcome: 'closed',
      releasedGenerations: 2,
    })
    expect(first.process.terminate).toHaveBeenCalledTimes(2)
    expect(second.process.terminate).toHaveBeenCalledTimes(1)
    expect(fixture.manager.audit().ownershipRecords).toBe(0)
  })

  it('re-drains once when the final observation is not clear', async () => {
    const ready = readyRuntime(111)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const observations = [busyAudit, clearAudit]
    const input = closeInput({
      auditConnections: vi.fn(() => observations.shift() ?? clearAudit),
    })

    await expect(fixture.manager.close(input)).resolves.toMatchObject({
      outcome: 'closed',
    })
    expect(input.drainConnections).toHaveBeenCalledTimes(2)
    expect(input.auditConnections).toHaveBeenCalledTimes(2)
  })

  it('retains a running runtime as failed when the drain never clears', async () => {
    const ready = readyRuntime(112)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const input = closeInput({ drainConnections: vi.fn(async () => busyAudit) })

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'release-unconfirmed',
      failureCategory: 'close-release-unconfirmed',
    })
    expect(input.commitRemoval).not.toHaveBeenCalled()
    expect(ready.process.terminate).not.toHaveBeenCalled()
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      {
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'close-release-unconfirmed',
      },
    ])
    expect(
      fixture.events.filter((event) => event.event === 'runtime.health.changed')
    ).toEqual([
      expect.objectContaining({
        event: 'runtime.health.changed',
        from: 'running',
        to: 'failed',
        classification: 'close-release-unconfirmed',
      }),
    ])
    expect(fixture.manager.audit().ownershipRecords).toBe(1)
    expect(fixture.manager.audit().closeClaims).toEqual([])
  })

  it('retains a failed runtime with no lifecycle event when the drain never clears', async () => {
    const ready = readyRuntime(113, [{ processAbsent: false }])
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    await fixture.manager.stop({ projectId: project.id })
    const events = fixture.events.length
    const input = closeInput({ drainConnections: vi.fn(async () => busyAudit) })

    await expect(fixture.manager.close(input)).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'release-unconfirmed',
    })
    expect(fixture.events).toHaveLength(events)
    expect(fixture.manager.lastFailure(project.id)?.category).toBe(
      'close-release-unconfirmed'
    )
  })

  it('reports a removal fault as stopped and keeps the registration claimable', async () => {
    const ready = readyRuntime(114)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const input = closeInput({
      commitRemoval: vi.fn(async () => {
        throw new Error('durable removal failed')
      }),
    })

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'removal-failed',
      audits: [expect.objectContaining({ pid: 114 })],
    })
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      { projectId: project.id, state: 'Stopped' },
    ])
    expect(fixture.manager.audit().ownershipRecords).toBe(0)
    expect(fixture.manager.audit().retiredProjects).toBe(0)
    expect(fixture.manager.audit().closeClaims).toEqual([])
  })

  it('retires the project when the durable row was already absent', async () => {
    const ready = readyRuntime(115)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const input = closeInput({
      commitRemoval: vi.fn(async () => ({
        disposition: 'project_not_found' as const,
      })),
    })

    await expect(fixture.manager.close(input)).resolves.toEqual({
      outcome: 'already-absent',
      projectId: project.id,
      released: true,
    })
    expect(fixture.manager.audit().retiredProjects).toBe(1)
  })

  it('refuses every acquisition for a retired project', async () => {
    const ready = readyRuntime(116)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    await expect(fixture.manager.close(closeInput())).resolves.toMatchObject({
      outcome: 'closed',
    })

    await expect(
      fixture.manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'unknown-project' })
    expect(() =>
      fixture.manager.register(project.id, project.canonicalPath)
    ).toThrow(RuntimeFailure)
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'not-registered',
    })
    await expect(
      fixture.manager.restart({ projectId: project.id })
    ).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'no-managed-runtime',
    })
    expect(fixture.manager.audit().entryCount).toBe(0)
  })

  it('settles an in-flight close as manager-shutdown and leaves no claim', async () => {
    const ready = readyRuntime(117)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const closing = fixture.manager.close(input)
    await Promise.resolve()

    const shutdown = fixture.manager.shutdown()
    await expect(closing).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'manager-shutdown',
    })
    drain.resolve(clearAudit)
    ready.settleExit()
    await shutdown
    expect(input.commitRemoval).not.toHaveBeenCalled()
    expect(fixture.manager.audit().closeClaims).toEqual([])
    expect(fixture.manager.audit().closeTasks).toBe(0)
  })

  it('rejects a close requested after shutdown began', async () => {
    const ready = readyRuntime(118)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    ready.settleExit()
    await fixture.manager.shutdown()

    await expect(fixture.manager.close(closeInput())).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'manager-shutdown',
    })
  })

  it('accounts a settlement that arrives after retirement without applying it', async () => {
    const ready = readyRuntime(119)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    await expect(fixture.manager.close(closeInput())).resolves.toMatchObject({
      outcome: 'closed',
    })
    const events = fixture.events.length

    ready.settleExit()
    await Promise.resolve()
    await Promise.resolve()

    expect(fixture.manager.audit().lateCloseSettlements).toBe(1)
    expect(fixture.manager.audit().entryCount).toBe(0)
    expect(fixture.events).toHaveLength(events)
    expect(fixture.manager.lastCleanup(project.id)).toBeUndefined()
  })

  it('closes one project without observing or mutating a peer', async () => {
    const peer = {
      id: 'project-2',
      name: 'Project Two',
      canonicalPath: '/projects/two',
      createdAt: 2,
    }
    const owned = readyRuntime(120)
    const peerReady = readyRuntime(121)
    const events: RuntimeSafeLifecycleEvent[] = []
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async (projectId: string) =>
        projectId === peer.id ? peer : project
      ),
      config: baseConfig,
      processDependencies: managerFixture([owned]).processDependencies,
      launch: vi.fn(async (request: { readonly canonicalPath: string }) =>
        request.canonicalPath === peer.canonicalPath ? peerReady : owned
      ),
      now: vi.fn(() => 10),
      recordEvent: (event) => events.push(event),
    })
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await manager.start({
      projectId: peer.id,
      canonicalPath: peer.canonicalPath,
    })

    await expect(manager.close(closeInput())).resolves.toMatchObject({
      outcome: 'closed',
      releasedGenerations: 1,
    })
    expect(peerReady.process.terminate).not.toHaveBeenCalled()
    expect(peerReady.process.audit).not.toHaveBeenCalled()
    expect(manager.reportPublicStates([project.id, peer.id])).toEqual([
      { projectId: project.id, state: 'Stopped' },
      { projectId: peer.id, state: 'Running' },
    ])
    expect(manager.audit().ownershipRecords).toBe(1)
    expect(manager.audit().entryCount).toBe(1)
    await expect(manager.stop({ projectId: peer.id })).resolves.toMatchObject({
      outcome: 'stopped',
    })
  })
})

describe('project runtime manager close late-work accounting', () => {
  it('confirms after a held reuse acquisition is refused at its post-await recheck', async () => {
    const alive = deferred<boolean>()
    const ready = readyRuntime(122, [], alive.promise)
    const fixture = managerFixture([ready])
    await start(fixture.manager)

    const reuse = fixture.manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await Promise.resolve()
    expect(ready.process.isAlive).toHaveBeenCalledTimes(1)

    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const closing = fixture.manager.close(input)
    await Promise.resolve()
    expect(fixture.manager.audit().closeClaims).toHaveLength(1)

    alive.resolve(true)
    await expect(reuse).rejects.toMatchObject({ category: 'runtime-closing' })
    expect(fixture.manager.audit().refusedLateAcquisitions).toBe(1)
    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({ lateWork: 0 }),
    ])

    drain.resolve(clearAudit)
    await expect(closing).resolves.toMatchObject({ outcome: 'closed' })
    expect(input.commitRemoval).toHaveBeenCalledTimes(1)
    expect(fixture.manager.audit().lateCloseSettlements).toBe(0)
  })

  it('fails closed on a connection the refused acquisition left behind', async () => {
    const alive = deferred<boolean>()
    const ready = readyRuntime(123, [], alive.promise)
    const fixture = managerFixture([ready])
    await start(fixture.manager)

    const reuse = fixture.manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await Promise.resolve()
    const input = closeInput({
      drainConnections: vi.fn(async () => busyAudit),
      auditConnections: vi.fn(() => busyAudit),
    })
    const closing = fixture.manager.close(input)
    await Promise.resolve()
    alive.resolve(true)
    await expect(reuse).rejects.toMatchObject({ category: 'runtime-closing' })

    await expect(closing).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'release-unconfirmed',
    })
    // The connection, not the refusal, is the reason: the refusal was counted
    // as an acquisition and never raised the claim's identity-bearing late work.
    expect(fixture.manager.audit().refusedLateAcquisitions).toBe(1)
    expect(fixture.manager.audit().lateCloseSettlements).toBe(0)
    expect(input.commitRemoval).not.toHaveBeenCalled()
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      {
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'close-release-unconfirmed',
      },
    ])
  })

  it('fails closed when an ownership record is registered under the claim', async () => {
    const ready = readyRuntime(124)
    const late = readyRuntime(125)
    const fixture = managerFixture([ready])
    await start(fixture.manager)

    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const closing = fixture.manager.close(input)
    await Promise.resolve()

    fixture.reportOwned({ process: late.process, port: late.port })
    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({ lateWork: 1 }),
    ])
    drain.resolve(clearAudit)

    await expect(closing).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'release-unconfirmed',
    })
    // The sweep released the identity, so only the identity-bearing late-work
    // clause can be the reason the close refused to remove the registration.
    expect(late.process.terminate).toHaveBeenCalledTimes(1)
    expect(fixture.manager.audit().ownershipRecords).toBe(0)
    expect(fixture.manager.audit().lateCloseSettlements).toBe(1)
    expect(fixture.manager.audit().refusedLateAcquisitions).toBe(0)
    expect(input.commitRemoval).not.toHaveBeenCalled()
  })

  it('quarantines an identity registered inside the confirmation-to-removal seal', async () => {
    const ready = readyRuntime(126)
    const late = readyRuntime(127)
    const fixture = managerFixture([ready])
    await start(fixture.manager)

    const removal = deferred<{ disposition: 'closed'; id: string }>()
    let removalCalled!: () => void
    const removalStarted = new Promise<void>((resolve) => {
      removalCalled = resolve
    })
    const input = closeInput({
      commitRemoval: vi.fn(() => {
        removalCalled()
        return removal.promise
      }),
    })
    const closing = fixture.manager.close(input)
    await removalStarted
    expect(input.commitRemoval).toHaveBeenCalledTimes(1)
    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({ sealed: true, lateWork: 0 }),
    ])

    fixture.reportOwned({ process: late.process, port: late.port })
    expect(fixture.manager.audit().ownershipRecords).toBe(0)
    expect(fixture.manager.audit().quarantinedOwnershipRecords).toBe(1)
    expect(fixture.manager.audit().lateCloseSettlements).toBe(1)
    expect(fixture.manager.audit().closeClaims).toEqual([
      expect.objectContaining({ sealed: true, lateWork: 1 }),
    ])

    removal.resolve({ disposition: 'closed', id: project.id })
    await expect(closing).resolves.toMatchObject({ outcome: 'closed' })
    expect(fixture.manager.audit().ownershipRecords).toBe(0)
    expect(fixture.manager.audit().quarantinedOwnershipRecords).toBe(1)

    // The quarantined identity stays reachable by the shutdown sweep, so a
    // removed project never leaves an owned resource behind.
    ready.settleExit()
    await expect(fixture.manager.shutdown()).resolves.toMatchObject({
      status: 'ok',
    })
    expect(late.process.terminate).toHaveBeenCalledTimes(1)
  })

  it('refuses the owning close its own install while the claim is sealed', async () => {
    const ready = readyRuntime(128)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const removalFault = new Error('durable removal threw synchronously')
    const input = closeInput({
      commitRemoval: vi.fn(() => {
        throw removalFault
      }),
    })

    await expect(fixture.manager.close(input)).rejects.toBe(removalFault)
    // The seal is lifted only on the removal-failed branch, so the close's own
    // unconfirmed-release install is refused and nothing is written or emitted.
    expect(fixture.manager.lastFailure(project.id)).toBeUndefined()
    expect(fixture.manager.audit().lateCloseSettlements).toBe(1)
    expect(fixture.manager.audit().closeClaims).toEqual([])
    expect(
      fixture.events.filter((event) => event.event === 'runtime.health.changed')
    ).toEqual([])
  })

  it('lifts the seal on the removal-failed branch so the released entry installs', async () => {
    const ready = readyRuntime(129)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const input = closeInput({
      commitRemoval: vi.fn(async () => {
        throw new Error('durable removal failed')
      }),
    })

    await expect(fixture.manager.close(input)).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'removal-failed',
    })
    expect(fixture.manager.reportPublicStates([project.id])).toEqual([
      { projectId: project.id, state: 'Stopped' },
    ])
    expect(fixture.manager.audit().entryCount).toBe(1)
    expect(fixture.manager.audit().retiredProjects).toBe(0)
    expect(fixture.manager.audit().closeClaims).toEqual([])
  })

  it('settles an in-flight close at shutdown and keeps its refusal accounting', async () => {
    const ready = readyRuntime(130)
    const fixture = managerFixture([ready])
    await start(fixture.manager)
    const drain = deferred<WorkbenchProxyAudit>()
    const input = closeInput({ drainConnections: vi.fn(() => drain.promise) })
    const closing = fixture.manager.close(input)
    await Promise.resolve()
    await expect(
      fixture.manager.stop({ projectId: project.id })
    ).resolves.toMatchObject({ category: 'close-in-progress' })

    const shutdown = fixture.manager.shutdown()
    await expect(closing).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'manager-shutdown',
    })
    drain.resolve(clearAudit)
    ready.settleExit()
    await shutdown
    expect(fixture.manager.audit().closeClaims).toEqual([])
    expect(fixture.manager.audit().closeTasks).toBe(0)
    expect(fixture.manager.audit().refusedLateAcquisitions).toBe(1)
    expect(input.commitRemoval).not.toHaveBeenCalled()
  })
})

describe('project runtime manager entry-install authority', () => {
  it('writes the entry map from exactly one place, inside installEntry', async () => {
    const { readFile } = await import('node:fs/promises')
    const source = await readFile(
      new URL('../src/project-runtime-manager.ts', import.meta.url),
      'utf8'
    )
    const writes = source.match(/entries\.set\(/gu) ?? []
    expect(writes).toHaveLength(1)

    const helperStart = source.indexOf('const installEntry = (')
    expect(helperStart).toBeGreaterThan(-1)
    const bodyStart = source.indexOf('=> {', helperStart)
    const bodyEnd = source.indexOf('\n  }', bodyStart)
    const helperBody = source.slice(bodyStart, bodyEnd)
    expect(helperBody).toContain('entries.set(projectId, entry)')
    expect(source.indexOf('entries.set(')).toBeGreaterThan(bodyStart)
    expect(source.indexOf('entries.set(')).toBeLessThan(bodyEnd)

    // Every install site observes the helper result: it either branches without
    // emitting, registering, recording, or reporting success, or asserts with
    // its own path's invariant error.
    // A discarded result begins a statement, so the last non-whitespace
    // character before the call would close the previous one. An observed result
    // is negated, assigned, returned, or passed into a condition.
    const observing = new Set(['!', '=', '(', 'n', '&', '|'])
    const callSites = [
      ...source.matchAll(/(?<![\w.])(?:installEntry|failEntry)\(/gu),
    ]
    expect(callSites.length).toBeGreaterThan(8)
    for (const site of callSites) {
      const line = source.slice(0, site.index).split('\n').length
      const preceding = source.slice(0, site.index).trimEnd()
      expect(preceding.at(-1), site[0] + ' at line ' + String(line)).toBeOneOf([
        ...observing,
      ])
    }
  })
})
