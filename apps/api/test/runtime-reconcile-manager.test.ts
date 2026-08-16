import { describe, expect, it, vi } from 'vitest'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  type InstalledRuntimeIdentity,
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
      pids: [pid, listenerPid],
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
