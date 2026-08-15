import { describe, expect, it, vi } from 'vitest'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeDeadlineScheduler,
  RuntimeExit,
  RuntimeProcessDependencies,
  RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

const project = {
  id: 'project-1',
  name: 'Project One',
  canonicalPath: '/projects/one',
  createdAt: 1,
}

function readyRuntime(
  pid: number,
  audit?: RuntimeTerminationAudit
): ReadyRuntime & {
  readonly process: OwnedRuntimeProcess
  settleExit(): void
} {
  const exit = deferred<RuntimeExit>()
  const port = 42_000 + pid
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    terminate: vi.fn(async () => {
      return (
        audit ?? {
          pid,
          processStartTime: String(pid * 10),
          port,
          outcome: 'graceful',
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        }
      )
    }),
    audit: vi.fn(async () => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    isAlive: vi.fn(async () => true),
  }
  return {
    process,
    port,
    internalUrl: `http://127.0.0.1:${String(port)}`,
    readinessAttempts: [],
    settleExit: () =>
      exit.resolve({ code: 0, signal: null, addressInUse: false }),
  }
}

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
  collisionAttempts: 3,
  readinessTimeoutMs: 15,
  gracefulShutdownMs: 2,
  forceShutdownMs: 2,
  stopAuditAllowanceMs: 1,
  restartSettlementAllowanceMs: 1,
})

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
      bodyStatus: 'alive',
      timedOut: false,
    })),
  },
  now: vi.fn(() => 1),
  sleep: vi.fn(async () => undefined),
}

function fixture(
  launch: ReturnType<typeof vi.fn>,
  deadlineScheduler?: RuntimeDeadlineScheduler
) {
  const events: RuntimeSafeLifecycleEvent[] = []
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async () => project),
    config,
    processDependencies,
    launch,
    deadlineScheduler,
    now: vi.fn(() => 10),
    recordEvent: (event) => events.push(event),
  })
  return { manager, events }
}

interface RecordedDeadline {
  readonly milliseconds: number
  readonly fire: () => void
  readonly cancel: ReturnType<typeof vi.fn>
}

function recordingScheduler(): {
  readonly scheduler: RuntimeDeadlineScheduler
  readonly deadlines: RecordedDeadline[]
} {
  const deadlines: RecordedDeadline[] = []
  return {
    deadlines,
    scheduler: {
      now: () => 0,
      scheduleDeadline(milliseconds, onDeadline) {
        const cancel = vi.fn()
        deadlines.push({ milliseconds, fire: onDeadline, cancel })
        return cancel
      },
    },
  }
}

describe('project runtime restart manager', () => {
  it('joins eight callers, releases once, and installs one replacement', async () => {
    const prior = readyRuntime(101)
    const replacement = readyRuntime(102)
    const gate = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(gate.promise)
    const { manager, events } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    const restarts = Array.from({ length: 8 }, () =>
      manager.restart({ projectId: project.id })
    )
    await vi.waitFor(() =>
      expect(prior.process.terminate).toHaveBeenCalledOnce()
    )
    gate.resolve(replacement)
    const outcomes = await Promise.all(restarts)

    expect(outcomes.every((outcome) => outcome === outcomes[0])).toBe(true)
    expect(outcomes[0]).toMatchObject({
      outcome: 'restarted',
      projectId: project.id,
      priorIdentity: { pid: 101 },
      replacementIdentity: { pid: 102 },
    })
    expect(manager.inspect(project.id)).toMatchObject({
      state: 'running',
      pid: 102,
    })
    expect(manager.audit()).toMatchObject({
      ownershipRecords: 1,
      pendingAdmissions: 0,
    })
    expect(
      events
        .filter(({ event }) => event.startsWith('runtime.restart.'))
        .map(({ event }) => event)
    ).toEqual(['runtime.restart.requested', 'runtime.restart.succeeded'])
  })

  it('rejects unconfirmed release and retains the exact failed identity', async () => {
    const prior = readyRuntime(103, {
      pid: 103,
      processStartTime: '1030',
      port: 42_103,
      outcome: 'unconfirmed',
      processAbsent: false,
      processGroupAbsent: false,
      listenerAbsent: false,
    })
    const launch = vi.fn().mockResolvedValueOnce(prior)
    const { manager } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'release-unconfirmed',
      failureCategory: 'restart-release-unconfirmed',
    })
    expect(manager.inspect(project.id)).toMatchObject({
      state: 'failed',
      pid: 103,
      port: 42_103,
    })
    expect(launch).toHaveBeenCalledOnce()
  })

  it('prefers the phase abort reason for non-confirming replacement cleanup', async () => {
    const prior = readyRuntime(104)
    const collided = readyRuntime(105)
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockImplementationOnce(async (input) => {
        input.onOwned?.(collided)
        input.onCleanup?.({
          pid: collided.process.pid,
          processStartTime: collided.process.processStartTime,
          port: collided.port,
          outcome: 'unconfirmed',
          processAbsent: false,
          processGroupAbsent: false,
          listenerAbsent: false,
        })
        throw new RuntimeFailure('address-in-use-exhausted')
      })
    const { manager } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'replacement-failed',
      failureCategory: 'restart-replacement-unconfirmed',
    })
  })

  it('returns at the trusted deadline and quarantines late materialization', async () => {
    let deadline: (() => void) | undefined
    const scheduler: RuntimeDeadlineScheduler = {
      now: () => 0,
      scheduleDeadline: vi.fn((_milliseconds, onDeadline) => {
        deadline = onDeadline
        return vi.fn()
      }),
    }
    const prior = readyRuntime(106)
    const late = readyRuntime(107)
    const launchGate = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(launchGate.promise)
    const { manager } = fixture(launch, scheduler)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    const restarting = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(launch).toHaveBeenCalledTimes(2))
    deadline?.()
    await expect(restarting).resolves.toMatchObject({
      outcome: 'rejected',
      failureCategory: 'restart-deadline-exceeded',
    })
    expect(manager.audit()).toMatchObject({ pendingAdmissions: 1 })

    launchGate.resolve(late)
    await vi.waitFor(() =>
      expect(manager.audit()).toMatchObject({
        pendingAdmissions: 1,
        admissionResolutions: 1,
      })
    )
    expect(manager.inspectEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          projectId: project.id,
          pendingAdmissionPhase: 'audited-absent',
        }),
      ])
    )
    expect(late.process.terminate).toHaveBeenCalledOnce()
  })

  it('keeps Stop and Open explicit while a restart owns the project', async () => {
    const prior = readyRuntime(108)
    const gate = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(gate.promise)
    const { manager } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    const restarting = manager.restart({ projectId: project.id })
    await vi.waitFor(() =>
      expect(prior.process.terminate).toHaveBeenCalledOnce()
    )

    await expect(manager.stop({ projectId: project.id })).resolves.toEqual({
      outcome: 'rejected',
      projectId: project.id,
      category: 'restart-in-progress',
    })
    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'runtime-restarting' })

    gate.resolve(readyRuntime(109))
    await restarting
  })

  it('restarts a retained failure that has no prior ownership record', async () => {
    const replacement = readyRuntime(111)
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new RuntimeFailure('spawn-error'))
      .mockResolvedValueOnce(replacement)
    const { manager } = fixture(launch)

    await expect(
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'spawn-error' })
    expect(manager.reportPublicStates([project.id])).toEqual([
      {
        projectId: project.id,
        state: 'Failed',
        failureCategory: 'spawn-error',
      },
    ])

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'restarted',
      replacementIdentity: { pid: 111 },
    })
  })

  it('arms and cancels one release and one overall trusted deadline', async () => {
    const prior = readyRuntime(112)
    const replacementGate = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(replacementGate.promise)
    const { scheduler, deadlines } = recordingScheduler()
    const { manager } = fixture(launch, scheduler)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    const restarting = manager.restart({ projectId: project.id })
    await vi.waitFor(() =>
      expect(deadlines.map(({ milliseconds }) => milliseconds)).toEqual([5, 66])
    )
    await vi.waitFor(() => expect(deadlines[0]?.cancel).toHaveBeenCalledOnce())
    expect(deadlines[1]?.cancel).not.toHaveBeenCalled()

    replacementGate.resolve(readyRuntime(113))
    await restarting
    expect(deadlines[0]?.cancel).toHaveBeenCalled()
    expect(deadlines[1]?.cancel).toHaveBeenCalledOnce()
  })

  it('bounds an unresolved predecessor admission as an unconfirmed release', async () => {
    const prior = readyRuntime(114)
    const abandoned = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(abandoned.promise)
    const { scheduler, deadlines } = recordingScheduler()
    const { manager } = fixture(launch, scheduler)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    const first = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(deadlines).toHaveLength(2))
    deadlines[1]!.fire()
    await expect(first).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'replacement-failed',
      failureCategory: 'restart-deadline-exceeded',
    })

    const retry = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(deadlines).toHaveLength(4))
    expect(deadlines.slice(2).map(({ milliseconds }) => milliseconds)).toEqual([
      20, 81,
    ])
    deadlines[2]!.fire()
    await expect(retry).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'release-unconfirmed',
      failureCategory: 'restart-release-unconfirmed',
    })
    expect(launch).toHaveBeenCalledTimes(2)
    expect(manager.audit()).toMatchObject({ pendingAdmissions: 1 })
  })

  it('holds an immediate retry until a late predecessor is audited absent', async () => {
    const prior = readyRuntime(115)
    const abandoned = deferred<ReadyRuntime>()
    const late = readyRuntime(116)
    const replacement = readyRuntime(117)
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(abandoned.promise)
      .mockResolvedValueOnce(replacement)
    const { scheduler, deadlines } = recordingScheduler()
    const { manager } = fixture(launch, scheduler)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    const first = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(deadlines).toHaveLength(2))
    deadlines[1]!.fire()
    await first

    const retry = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(deadlines).toHaveLength(4))
    expect(launch).toHaveBeenCalledTimes(2)
    abandoned.resolve(late)
    await vi.waitFor(() =>
      expect(late.process.terminate).toHaveBeenCalledOnce()
    )
    await expect(retry).resolves.toMatchObject({
      outcome: 'restarted',
      replacementIdentity: { pid: 117 },
    })
    expect(launch).toHaveBeenCalledTimes(3)
    expect(manager.audit()).toMatchObject({
      pendingAdmissions: 0,
      ownershipRecords: 1,
    })
  })

  it('quarantines non-confirming cleanup until a later restart reclaims it', async () => {
    const prior = readyRuntime(118)
    const collided = readyRuntime(119)
    const replacement = readyRuntime(120)
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockImplementationOnce(async (input) => {
        input.onOwned?.(collided)
        input.onCleanup?.({
          pid: collided.process.pid,
          processStartTime: collided.process.processStartTime,
          port: collided.port,
          outcome: 'unconfirmed',
          processAbsent: false,
          processGroupAbsent: false,
          listenerAbsent: false,
        })
        throw new RuntimeFailure('readiness-timeout')
      })
      .mockResolvedValueOnce(replacement)
    const { manager } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      failureCategory: 'restart-replacement-unconfirmed',
    })
    expect(collided.process.terminate).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(manager.audit()).toMatchObject({
        pendingAdmissions: 1,
        admissionResolutions: 1,
      })
    )
    expect(manager.inspectEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          projectId: project.id,
          pendingAdmissionPhase: 'materialized-quarantined',
        }),
      ])
    )

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'restarted',
      replacementIdentity: { pid: 120 },
    })
    expect(collided.process.terminate).toHaveBeenCalledOnce()
    expect(manager.audit()).toMatchObject({
      pendingAdmissions: 0,
      ownershipRecords: 1,
    })
  })

  it('retains the prior generation so an unconfirmed release can be retried', async () => {
    const prior = readyRuntime(121)
    vi.mocked(prior.process.terminate)
      .mockResolvedValueOnce({
        pid: 121,
        processStartTime: '1210',
        port: 42_121,
        outcome: 'unconfirmed',
        processAbsent: false,
        processGroupAbsent: false,
        listenerAbsent: false,
      })
      .mockResolvedValueOnce({
        pid: 121,
        processStartTime: '1210',
        port: 42_121,
        outcome: 'graceful',
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockResolvedValueOnce(readyRuntime(122))
    const { manager } = fixture(launch)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })

    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      category: 'release-unconfirmed',
    })
    await expect(
      manager.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'restarted',
      replacementIdentity: { pid: 122 },
    })
    expect(prior.process.terminate).toHaveBeenCalledTimes(2)
  })

  it('reports an unresolved admission instead of awaiting its launch at shutdown', async () => {
    const prior = readyRuntime(123)
    const abandoned = deferred<ReadyRuntime>()
    const launch = vi
      .fn()
      .mockResolvedValueOnce(prior)
      .mockReturnValueOnce(abandoned.promise)
    const { scheduler, deadlines } = recordingScheduler()
    const { manager } = fixture(launch, scheduler)
    await manager.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    const restarting = manager.restart({ projectId: project.id })
    await vi.waitFor(() => expect(deadlines).toHaveLength(2))
    prior.settleExit()

    const shuttingDown = manager.shutdown()
    deadlines[1]!.fire()
    await expect(restarting).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'manager-shutdown',
    })
    await expect(shuttingDown).resolves.toMatchObject({
      status: 'failed',
      unresolvedAdmissions: [
        {
          phase: 'launch-pending',
        },
      ],
    })
    expect(manager.audit()).toMatchObject({
      pendingAdmissions: 1,
      restartTasks: 0,
    })
  })
})
