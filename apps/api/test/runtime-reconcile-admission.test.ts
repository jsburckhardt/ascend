import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  type InstalledRuntimeIdentity,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeAttributionPrimitives,
  type RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

const project = {
  id: 'project-admission',
  name: 'Admission',
  canonicalPath: '/projects/admission',
  createdAt: 1,
}
const pid = 42_001
const listenerPid = 42_002
const port = 45_679
const ownerToken = deriveProjectOwnerToken(project.id)
const installed: InstalledRuntimeIdentity = {
  launcherRealPath: '/opt/code-server/bin/code-server',
  installationRoot: '/opt/code-server',
  interpreterPath: '/opt/code-server/lib/node',
  launcherArgvPrefix: ['/opt/code-server/lib/node', '/opt/code-server'],
}
const argv = [
  ...installed.launcherArgvPrefix,
  ...buildRuntimeArgv(
    project.canonicalPath,
    port,
    buildRuntimeUserDataPath(ownerToken, port)
  ),
]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function attribution(
  input: {
    readonly candidates?: readonly number[]
    readonly launcher?: InstalledRuntimeIdentity | null
    readonly candidateStart?: () => string
  } = {}
): RuntimeAttributionPrimitives {
  return {
    resolveInstalledRuntimeIdentity: vi.fn(async () =>
      input.launcher === undefined ? installed : input.launcher
    ),
    listRuntimeCandidatePids: vi.fn(async () => ({
      pids: input.candidates ?? [pid],
      complete: true,
    })),
    readProcessIdentity: vi.fn(async (candidatePid) => {
      if (candidatePid !== pid && candidatePid !== listenerPid) return null
      return {
        pid: candidatePid,
        processGroupId: pid,
        uid: process.getuid?.() ?? 1_000,
        startTime:
          candidatePid === pid
            ? (input.candidateStart?.() ?? 'candidate-start')
            : 'listener-start',
      }
    }),
    readProcessCommandLine: vi.fn(async (candidatePid) =>
      candidatePid === pid || candidatePid === listenerPid ? argv : null
    ),
    readProcessGroupMemberPids: vi.fn(async () => ({
      pids: [pid, listenerPid],
      complete: true,
    })),
    readLoopbackListenerInode: vi.fn(async () => 'listener-inode'),
    readProcessSocketInodes: vi.fn(async (candidatePid) =>
      candidatePid === listenerPid ? ['listener-inode'] : []
    ),
  }
}

function owned(ownedPid: number): OwnedRuntimeProcess {
  let settleExit!: () => void
  const exit = new Promise<never>((resolve) => {
    settleExit = resolve
  })
  return {
    pid: ownedPid,
    processStartTime: 'launched-start',
    exit,
    terminate: vi.fn(async (_graceful, _force, ownedPort) => {
      settleExit()
      return {
        outcome: 'graceful' as const,
        pid: ownedPid,
        processStartTime: 'launched-start',
        port: ownedPort,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      }
    }),
    audit: vi.fn(async (ownedPort) => ({
      pid: ownedPid,
      processStartTime: 'launched-start',
      port: ownedPort,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    isAlive: vi.fn(async () => true),
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
    process: { assertLaunchable: vi.fn(), launch: vi.fn() },
    ports: { acquire: vi.fn(async () => 50_001) },
    health: { check: healthCheck },
    attribution: injected,
    now: Date.now,
    sleep: vi.fn(async () => undefined),
  }
}

function manager(input: {
  readonly injected: RuntimeAttributionPrimitives
  readonly healthCheck?: RuntimeProcessDependencies['health']['check']
  readonly launch?: (
    input: Parameters<
      NonNullable<Parameters<typeof createProjectRuntimeManager>[0]['launch']>
    >[0]
  ) => Promise<ReadyRuntime>
}) {
  const launch = input.launch ?? vi.fn()
  return {
    launch,
    value: createProjectRuntimeManager({
      findProjectById: vi.fn(async () => project),
      listProjects: vi.fn(async () => [project]),
      processDependencies: processDependencies(
        input.injected,
        input.healthCheck === undefined ? undefined : vi.fn(input.healthCheck)
      ),
      config: createProjectRuntimeConfig(),
      launch,
    }),
  }
}

describe('runtime reconciliation admission', () => {
  it('waits for pending reconciliation and returns the adopted survivor without launch', async () => {
    const gate = deferred<{
      elapsedMs: number
      status: number
      bodyStatus: string
      timedOut: boolean
    }>()
    const healthCheck = vi
      .fn()
      .mockImplementationOnce(async () => gate.promise)
      .mockResolvedValue({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      })
    const { value, launch } = manager({
      injected: attribution(),
      healthCheck,
    })

    await value.beginReconciliation()
    const acquisition = value.start({
      projectId: project.id,
      canonicalPath: project.canonicalPath,
    })
    await Promise.resolve()
    expect(launch).not.toHaveBeenCalled()
    gate.resolve({
      elapsedMs: 1,
      status: 200,
      bodyStatus: 'alive',
      timedOut: false,
    })

    await expect(acquisition).resolves.toMatchObject({ pid, port })
    expect(launch).not.toHaveBeenCalled()
    await value.shutdown()
  })

  it('blocks Start, Stop, and Restart after unresolved reconciliation', async () => {
    const { value, launch } = manager({
      injected: attribution({ launcher: null }),
    })
    await value.beginReconciliation()

    await expect(
      value.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'reconcile-unconfirmed' })
    await expect(value.stop({ projectId: project.id })).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'reconcile-unresolved',
    })
    await expect(
      value.restart({ projectId: project.id })
    ).resolves.toMatchObject({
      outcome: 'rejected',
      category: 'reconcile-unresolved',
    })
    expect(launch).not.toHaveBeenCalled()
    await value.shutdown()
  })

  it('launches once only after complete scan proves the survivor absent', async () => {
    const launched = owned(43_001)
    const launch = vi.fn(async (input) => {
      const ready: ReadyRuntime = {
        process: launched,
        port: 50_001,
        internalUrl: 'http://127.0.0.1:50001',
        readinessAttempts: [],
      }
      input.onOwned?.(ready)
      return ready
    })
    const result = manager({
      injected: attribution({ candidates: [] }),
      launch,
    })
    await result.value.beginReconciliation()
    await vi.waitFor(() =>
      expect(result.value.inspectReconciliation?.().phase).toBe('settled')
    )

    await expect(
      result.value.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).resolves.toMatchObject({ pid: 43_001, port: 50_001 })
    expect(launch).toHaveBeenCalledTimes(1)
    await result.value.shutdown()
  })

  it('corrects recycled adopted identities on demand without signalling them', async () => {
    let startTime = 'candidate-start'
    const kill = vi.spyOn(process, 'kill')
    const { value } = manager({
      injected: attribution({ candidateStart: () => startTime }),
    })
    await value.beginReconciliation()
    await vi.waitFor(() =>
      expect(value.inspectReconciliation?.().phase).toBe('settled')
    )
    startTime = 'recycled-start'

    await expect(
      value.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'reconcile-unconfirmed' })
    expect(kill).not.toHaveBeenCalled()
    kill.mockRestore()
    await value.shutdown()
  })
})
