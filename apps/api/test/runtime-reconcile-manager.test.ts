import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  reconciliationOverallBoundMs,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  type InstalledRuntimeIdentity,
  type RuntimeDeadlineScheduler,
  type RuntimeAttributionPrimitives,
  type RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

const project = Object.freeze({
  id: 'project-reconcile',
  name: 'Reconcile',
  canonicalPath: '/projects/reconcile',
  createdAt: 1,
})
const pid = 41_001
const listenerPid = 41_002
const port = 45_678
const installed: InstalledRuntimeIdentity = Object.freeze({
  launcherRealPath: '/opt/code-server/bin/code-server',
  installationRoot: '/opt/code-server',
  interpreterPath: '/opt/code-server/lib/node',
  launcherArgvPrefix: Object.freeze([
    '/opt/code-server/lib/node',
    '/opt/code-server',
  ]),
})

interface ScheduledDeadline {
  readonly milliseconds: number
  readonly dueAt: number
  readonly callback: () => void
  active: boolean
  cancelled: boolean
}

class DeadlineHarness implements RuntimeDeadlineScheduler {
  private value = 100
  readonly scheduled: ScheduledDeadline[] = []

  now(): number {
    return this.value
  }

  scheduleDeadline(milliseconds: number, callback: () => void): () => void {
    const scheduled: ScheduledDeadline = {
      milliseconds,
      dueAt: this.value + milliseconds,
      callback,
      active: true,
      cancelled: false,
    }
    this.scheduled.push(scheduled)
    return () => {
      scheduled.active = false
      scheduled.cancelled = true
    }
  }

  elapseWithoutFiring(milliseconds: number): void {
    this.value += milliseconds
  }

  advance(milliseconds: number): void {
    this.value += milliseconds
    for (const scheduled of this.scheduled) {
      if (!scheduled.active || scheduled.dueAt > this.value) continue
      scheduled.active = false
      scheduled.callback()
    }
  }
}

function candidateArgv(
  overrides: {
    readonly canonicalPath?: string
    readonly userDataPath?: string
    readonly bindPort?: number
    readonly prefix?: readonly [string, string]
    readonly extra?: readonly string[]
  } = {}
): readonly string[] {
  const ownerToken = deriveProjectOwnerToken(project.id)
  const userDataPath =
    overrides.userDataPath ?? buildRuntimeUserDataPath(ownerToken, port)
  const argv = buildRuntimeArgv(
    overrides.canonicalPath ?? project.canonicalPath,
    overrides.bindPort ?? port,
    userDataPath
  )
  return Object.freeze([
    ...(overrides.prefix ?? installed.launcherArgvPrefix),
    ...argv.slice(0, -1),
    ...(overrides.extra ?? []),
    argv.at(-1)!,
  ])
}

function attribution(
  input: {
    readonly argv?: readonly string[]
    readonly candidates?: readonly number[]
    readonly scanComplete?: boolean
    readonly groupComplete?: boolean
    readonly groupPids?: readonly number[]
    readonly holderPids?: readonly number[]
    readonly installedRuntime?: InstalledRuntimeIdentity | null
  } = {}
): RuntimeAttributionPrimitives {
  const argv = input.argv ?? candidateArgv()
  const holders = input.holderPids ?? [listenerPid]
  return {
    resolveInstalledRuntimeIdentity: vi.fn(async () =>
      input.installedRuntime === undefined ? installed : input.installedRuntime
    ),
    listRuntimeCandidatePids: vi.fn(async () => ({
      pids: input.candidates ?? [pid],
      complete: input.scanComplete ?? true,
    })),
    readProcessIdentity: vi.fn(async (candidatePid) => {
      if (candidatePid !== pid && candidatePid !== listenerPid) return null
      return {
        pid: candidatePid,
        processGroupId: pid,
        uid: process.getuid?.() ?? 1_000,
        startTime: candidatePid === pid ? 'candidate-start' : 'listener-start',
      }
    }),
    readProcessCommandLine: vi.fn(async (candidatePid) =>
      candidatePid === pid || candidatePid === listenerPid ? argv : null
    ),
    readProcessGroupMemberPids: vi.fn(async () => ({
      pids: input.groupPids ?? [pid, listenerPid],
      complete: input.groupComplete ?? true,
    })),
    readLoopbackListenerInode: vi.fn(async () => 'listener-inode'),
    readProcessSocketInodes: vi.fn(async (candidatePid) =>
      holders.includes(candidatePid) ? ['listener-inode'] : []
    ),
  }
}

function processDependencies(
  injected: RuntimeAttributionPrimitives,
  healthCheck = vi.fn(async () => ({
    elapsedMs: 1,
    status: 200,
    bodyStatus: 'alive',
    timedOut: false,
  }))
): RuntimeProcessDependencies {
  return {
    process: {
      assertLaunchable: vi.fn(),
      launch: vi.fn(),
    },
    ports: { acquire: vi.fn(async () => 50_001) },
    health: { check: healthCheck },
    attribution: injected,
    now: Date.now,
    sleep: vi.fn(async () => undefined),
  }
}

async function settled(
  manager: ReturnType<typeof createProjectRuntimeManager>
) {
  await vi.waitFor(() =>
    expect(manager.inspectReconciliation?.().phase).toBe('settled')
  )
  return manager.inspectReconciliation!()
}

describe('project runtime reconciliation manager', () => {
  it('installs once, adopts one exact survivor, and adds no exit watcher', async () => {
    const injected = attribution()
    const events: RuntimeSafeLifecycleEvent[] = []
    const listProjects = vi.fn(async () => [project])
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects,
      processDependencies: processDependencies(injected),
      config: createProjectRuntimeConfig(),
      recordEvent: (event) => events.push(event),
    })

    const first = manager.beginReconciliation()
    const second = manager.beginReconciliation()
    expect(first).toBe(second)
    await first
    const inspection = await settled(manager)

    expect(listProjects).toHaveBeenCalledTimes(1)
    expect(injected.resolveInstalledRuntimeIdentity).toHaveBeenCalledTimes(1)
    expect(manager.inspect(project.id)).toMatchObject({
      state: 'running',
      pid,
      port,
      processStartTime: 'candidate-start',
    })
    expect(manager.audit?.().backgroundTasks).toBe(0)
    expect(events.map(({ event }) => event)).toEqual([
      'runtime.reconcile.requested',
      'runtime.reconcile.succeeded',
    ])
    expect(inspection.projects).toEqual([
      {
        projectToken: deriveProjectOwnerToken(project.id),
        outcome: 'adopted',
        refusalReason: null,
        absenceProof: null,
        settledElapsedMs: expect.any(Number),
      },
    ])
    expect(JSON.stringify(inspection)).not.toMatch(
      /projects\/reconcile|candidate-start|listener-inode|45678|argv|pid/iu
    )

    await manager.shutdown()
  })

  it('settles complete zero-candidate scans as proven absence', async () => {
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: processDependencies(attribution({ candidates: [] })),
    })

    await manager.beginReconciliation()
    const inspection = await settled(manager)

    expect(manager.inspectEntries()).toEqual([
      expect.objectContaining({ projectId: project.id, state: 'registered' }),
    ])
    expect(inspection.projects[0]).toMatchObject({
      outcome: 'absent',
      absenceProof: 'no-candidate-complete-scan',
    })
    await manager.shutdown()
  })

  it.each([
    [
      'incomplete group enumeration',
      { groupComplete: false, groupPids: [pid] },
    ],
    ['complete empty group enumeration', { groupPids: [] }],
    [
      'complete group enumeration missing its leader',
      { groupPids: [listenerPid] },
    ],
  ] as const)(
    'settles %s before listener attribution or readiness',
    async (_label, groupInput) => {
      const injected = attribution(groupInput)
      const healthCheck = vi.fn(async () => ({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      }))
      const dependencies = processDependencies(injected, healthCheck)
      const signalProcessGroup = vi.fn(() => false)
      const manager = createProjectRuntimeManager({
        findProjectById: vi.fn(async () => project),
        listProjects: vi.fn(async () => [project]),
        processDependencies: {
          ...dependencies,
          termination: {
            now: Date.now,
            scheduleDeadline: () => () => undefined,
            readProcessStartTime: vi.fn(async () => null),
            readProcessGroupMembers: vi.fn(async () => []),
            listenerIsAbsent: vi.fn(async () => true),
            delay: vi.fn(async () => undefined),
            signalProcessGroup,
          },
        },
      })

      await manager.beginReconciliation()
      const inspection = await settled(manager)

      expect(inspection.projects[0]).toMatchObject({
        outcome: 'unresolved',
        refusalReason: 'group-scan-incomplete',
      })
      expect(injected.readLoopbackListenerInode).not.toHaveBeenCalled()
      expect(injected.readProcessSocketInodes).not.toHaveBeenCalled()
      expect(healthCheck).not.toHaveBeenCalled()
      expect(dependencies.process.launch).not.toHaveBeenCalled()
      expect(signalProcessGroup).not.toHaveBeenCalled()
      await manager.shutdown()
    }
  )

  it('paces reconciliation readiness with the trusted scheduler and not sleep', async () => {
    const scheduler = new DeadlineHarness()
    const injected = attribution()
    const healthCheck = vi
      .fn()
      .mockResolvedValueOnce({
        elapsedMs: 1,
        status: 503,
        bodyStatus: null,
        timedOut: false,
      })
      .mockResolvedValue({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      })
    const failingSleep = vi.fn(async () => {
      throw new Error('Reconciliation must not call process sleep')
    })
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: {
        ...processDependencies(injected, healthCheck),
        sleep: failingSleep,
      },
      deadlineScheduler: scheduler,
    })

    await manager.beginReconciliation()
    await vi.waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(1))
    const gap = scheduler.scheduled.find(
      ({ active, milliseconds }) =>
        active && milliseconds === createProjectRuntimeConfig().pollIntervalMs
    )
    expect(gap).toBeDefined()
    const beforeGap = scheduler.now()

    scheduler.advance(createProjectRuntimeConfig().pollIntervalMs)
    await vi.waitFor(() => expect(healthCheck).toHaveBeenCalledTimes(2))
    const inspection = await settled(manager)

    expect(scheduler.now() - beforeGap).toBe(
      createProjectRuntimeConfig().pollIntervalMs
    )
    expect(gap?.cancelled).toBe(true)
    expect(failingSleep).not.toHaveBeenCalled()
    expect(inspection.projects[0]).toMatchObject({
      outcome: 'adopted',
      refusalReason: null,
    })
    await manager.shutdown()
  })

  it('clamps and cancels a readiness gap on abort with an inert late callback', async () => {
    const scheduler = new DeadlineHarness()
    const config = createProjectRuntimeConfig()
    const injected = attribution()
    const healthCheck = vi.fn(async () => {
      scheduler.elapseWithoutFiring(config.reconcileReadinessBoundMs - 10)
      return {
        elapsedMs: 1,
        status: 503,
        bodyStatus: null,
        timedOut: false,
      }
    })
    const failingSleep = vi.fn(async () => {
      throw new Error('Reconciliation must not call process sleep')
    })
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: {
        ...processDependencies(injected, healthCheck),
        sleep: failingSleep,
      },
      deadlineScheduler: scheduler,
    })

    await manager.beginReconciliation()
    await vi.waitFor(() =>
      expect(
        scheduler.scheduled.some(
          ({ active, milliseconds }) => active && milliseconds === 10
        )
      ).toBe(true)
    )
    const gap = scheduler.scheduled.find(
      ({ active, milliseconds }) => active && milliseconds === 10
    )!
    scheduler.advance(5)
    expect(healthCheck).toHaveBeenCalledTimes(1)

    await expect(manager.shutdown()).resolves.toMatchObject({ status: 'ok' })
    await vi.waitFor(() => expect(gap.cancelled).toBe(true))
    const beforeLateCallback = manager.inspectReconciliation!()
    const callsBeforeLateCallback = healthCheck.mock.calls.length
    gap.callback()
    await Promise.resolve()
    await Promise.resolve()

    expect(manager.inspectReconciliation!()).toEqual(beforeLateCallback)
    expect(beforeLateCallback).toMatchObject({
      phase: 'aborted',
      projects: [
        {
          outcome: 'unresolved',
          refusalReason: 'manager-shutdown',
        },
      ],
    })
    expect(healthCheck).toHaveBeenCalledTimes(callsBeforeLateCallback)
    expect(failingSleep).not.toHaveBeenCalled()
  })

  it.each([
    [
      'canonical-path-mismatch',
      candidateArgv({ canonicalPath: project.canonicalPath + '-other' }),
    ],
    [
      'owner-token-mismatch',
      candidateArgv({
        userDataPath: buildRuntimeUserDataPath(
          deriveProjectOwnerToken(project.id),
          port
        ).replace('-' + String(port), '-wrong-' + String(port)),
      }),
    ],
    ['port-mismatch', candidateArgv({ bindPort: port + 1 })],
    ['argv-mismatch', candidateArgv({ extra: ['--unexpected'] })],
    [
      'launcher-prefix-mismatch',
      candidateArgv({ prefix: ['/other/lib/node', '/other'] }),
    ],
  ] as const)('refuses %s before adoption', async (reason, argv) => {
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: processDependencies(attribution({ argv })),
    })

    await manager.beginReconciliation()
    const inspection = await settled(manager)

    expect(inspection.projects[0]).toMatchObject({
      outcome: 'unresolved',
      refusalReason: reason,
    })
    expect(manager.lastFailure(project.id)?.category).toBe(
      'reconcile-unconfirmed'
    )
    await manager.shutdown()
  })

  it('fails the whole pass without guessing when launcher identity is unresolved', async () => {
    const manager = createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: processDependencies(
        attribution({ installedRuntime: null })
      ),
    })

    await manager.beginReconciliation()
    const inspection = manager.inspectReconciliation!()
    expect(inspection.projects[0]).toMatchObject({
      outcome: 'unresolved',
      refusalReason: 'launcher-unresolved',
    })
    await manager.shutdown()
  })
})

const heldProject = Object.freeze({
  id: 'project-reconcile-held',
  name: 'Reconcile Held',
  canonicalPath: '/projects/reconcile-held',
  createdAt: 2,
})
const heldPid = 41_101
const heldPort = 45_778

interface Gate {
  readonly promise: Promise<void>
  readonly open: () => void
}

function gate(): Gate {
  let open!: () => void
  const promise = new Promise<void>((resolve) => {
    open = resolve
  })
  return { promise, open }
}

/** Fires exactly one named deadline on demand so a reconciliation bound can be
 * reached without also reaching an unrelated close bound armed on the same
 * scheduler. */
class SelectiveDeadlines implements RuntimeDeadlineScheduler {
  private readonly arms: {
    readonly milliseconds: number
    readonly callback: () => void
    cancelled: boolean
  }[] = []

  now(): number {
    return 100
  }

  scheduleDeadline(milliseconds: number, callback: () => void): () => void {
    const arm = { milliseconds, callback, cancelled: false }
    this.arms.push(arm)
    return () => {
      arm.cancelled = true
    }
  }

  /** Fires the earliest still-armed deadline carrying this bound. Bounds are
   * not unique across subsystems, so callers arm the deadline they mean to
   * fire before any later one can be armed. */
  fireEarliest(milliseconds: number): void {
    const arm = this.arms.find(
      (candidate) =>
        candidate.milliseconds === milliseconds && !candidate.cancelled
    )
    if (arm === undefined)
      throw new Error(`no armed ${String(milliseconds)}ms deadline`)
    arm.cancelled = true
    arm.callback()
  }
}

function argvFor(
  target: Readonly<{ id: string; canonicalPath: string }>,
  targetPort: number
): readonly string[] {
  const userDataPath = buildRuntimeUserDataPath(
    deriveProjectOwnerToken(target.id),
    targetPort
  )
  return Object.freeze([
    ...installed.launcherArgvPrefix,
    ...buildRuntimeArgv(target.canonicalPath, targetPort, userDataPath),
  ])
}

function pairAttribution(): RuntimeAttributionPrimitives {
  const byPid = new Map([
    [pid, { project, port }],
    [heldPid, { project: heldProject, port: heldPort }],
  ])
  return {
    resolveInstalledRuntimeIdentity: vi.fn(async () => installed),
    listRuntimeCandidatePids: vi.fn(async () => ({
      pids: [pid, heldPid],
      complete: true,
    })),
    readProcessIdentity: vi.fn(async (candidatePid: number) =>
      byPid.has(candidatePid)
        ? {
            pid: candidatePid,
            processGroupId: candidatePid,
            uid: process.getuid?.() ?? 1_000,
            startTime: `start-${String(candidatePid)}`,
          }
        : null
    ),
    readProcessCommandLine: vi.fn(async (candidatePid: number) => {
      const found = byPid.get(candidatePid)
      return found === undefined ? null : argvFor(found.project, found.port)
    }),
    readProcessGroupMemberPids: vi.fn(async (groupId: number) => ({
      pids: [groupId],
      complete: true,
    })),
    readLoopbackListenerInode: vi.fn(
      async (listenerPort: number) => `inode-${String(listenerPort)}`
    ),
    readProcessSocketInodes: vi.fn(async (candidatePid: number) => {
      const found = byPid.get(candidatePid)
      return found === undefined ? [] : [`inode-${String(found.port)}`]
    }),
  }
}

function terminationStub(): RuntimeProcessDependencies['termination'] {
  return {
    now: Date.now,
    scheduleDeadline: () => () => undefined,
    readProcessStartTime: vi.fn(async () => null),
    readProcessGroupMembers: vi.fn(async () => []),
    listenerIsAbsent: vi.fn(async () => true),
    delay: vi.fn(async () => undefined),
    signalProcessGroup: vi.fn(() => true),
  }
}

const clearAudit = Object.freeze({
  shuttingDown: false,
  pendingOperations: 0,
  upstreamHttpRequests: 0,
  upstreamHttpResponses: 0,
  rawSockets: 0,
  webSockets: 0,
})

describe('late reconciliation settlement accounting', () => {
  const config = createProjectRuntimeConfig()

  function pairManager(input: {
    readonly readiness: Gate
    readonly scheduler: SelectiveDeadlines
    readonly events: RuntimeSafeLifecycleEvent[]
  }) {
    return createProjectRuntimeManager({
      findProjectById: vi.fn(async (id: string) =>
        id === project.id ? project : heldProject
      ),
      listProjects: vi.fn(async () => [project, heldProject]),
      processDependencies: {
        ...processDependencies(
          pairAttribution(),
          vi.fn(async (url: string) => {
            if (url.includes(String(heldPort))) await input.readiness.promise
            return {
              elapsedMs: 1,
              status: 200,
              bodyStatus: 'alive',
              timedOut: false,
            }
          }) as never
        ),
        termination: terminationStub(),
      },
      config,
      deadlineScheduler: input.scheduler,
      recordEvent: (event) => input.events.push(event),
    })
  }

  it('accounts, without applying, a settlement that arrives after retirement', async () => {
    const readiness = gate()
    const scheduler = new SelectiveDeadlines()
    const events: RuntimeSafeLifecycleEvent[] = []
    const manager = pairManager({ readiness, scheduler, events })
    const commitRemoval = vi.fn(async () =>
      Object.freeze({ disposition: 'closed' as const, id: project.id })
    )

    await manager.beginReconciliation()
    await vi.waitFor(() =>
      expect(manager.inspect(project.id)?.state).toBe('running')
    )

    const closed = await manager.close({
      projectId: project.id,
      drainConnections: async () => clearAudit,
      auditConnections: () => clearAudit,
      commitRemoval,
    })
    expect(closed).toMatchObject({ outcome: 'closed', projectId: project.id })
    expect(manager.audit?.().lateCloseSettlements).toBe(0)

    const eventsBefore = events.length
    const cleanupBefore = manager.lastCleanup(project.id)
    scheduler.fireEarliest(reconciliationOverallBoundMs(config))

    const audited = manager.audit!()
    expect(audited.lateCloseSettlements).toBe(1)
    expect(audited.closeClaims).toEqual([])
    expect(audited.retiredProjects).toBe(1)
    expect(
      events
        .slice(eventsBefore)
        .filter((event) => event.projectId === project.id)
    ).toEqual([])
    expect(manager.inspect(project.id)).toBeUndefined()
    expect(manager.lastCleanup(project.id)).toBe(cleanupBefore)
    expect(commitRemoval).toHaveBeenCalledTimes(1)
    const inspection = manager.inspectReconciliation!()
    expect(inspection.projects[0]).toMatchObject({ outcome: 'adopted' })
    expect(inspection.projects[1]).toMatchObject({
      outcome: 'unresolved',
      refusalReason: 'deadline-exceeded',
    })

    readiness.open()
    await manager.shutdown()
  })

  it('charges an in-flight close for a settlement that arrives while it holds the claim', async () => {
    const readiness = gate()
    const drainRelease = gate()
    const scheduler = new SelectiveDeadlines()
    const events: RuntimeSafeLifecycleEvent[] = []
    const manager = pairManager({ readiness, scheduler, events })
    const commitRemoval = vi.fn(async () =>
      Object.freeze({ disposition: 'closed' as const, id: project.id })
    )
    let drains = 0

    await manager.beginReconciliation()
    await vi.waitFor(() =>
      expect(manager.inspect(project.id)?.state).toBe('running')
    )

    const closing = manager.close({
      projectId: project.id,
      drainConnections: async () => {
        drains += 1
        await drainRelease.promise
        return clearAudit
      },
      auditConnections: () => clearAudit,
      commitRemoval,
    })
    await vi.waitFor(() => expect(drains).toBe(1))
    expect(manager.audit!().lateCloseSettlements).toBe(0)

    scheduler.fireEarliest(reconciliationOverallBoundMs(config))

    const charged = manager.audit!()
    expect(charged.lateCloseSettlements).toBe(1)
    expect(charged.closeClaims).toEqual([
      expect.objectContaining({ projectId: project.id, lateWork: 1 }),
    ])

    drainRelease.open()
    expect(await closing).toMatchObject({
      outcome: 'rejected',
      projectId: project.id,
      category: 'release-unconfirmed',
    })
    expect(commitRemoval).not.toHaveBeenCalled()
    expect(manager.audit!().retiredProjects).toBe(0)

    readiness.open()
    await manager.shutdown()
  })
})
