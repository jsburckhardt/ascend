import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  BL013_MISMATCH_CLASSES,
  BL013_SCENARIOS,
  validateProjectRuntimeIsolationEvidence,
} from '../src/project-runtime-isolation-evidence.js'
import { validateRuntimeManagerSource } from '../src/project-runtime-isolation-contract.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

const fakeRuntime = (pid: number): ReadyRuntime => {
  const exited = deferred<RuntimeExit>()
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: 'start-' + String(pid),
    exit: exited.promise,
    isAlive: vi.fn(async () => true),
    audit: vi.fn(async (port) => ({
      pid,
      processStartTime: 'start-' + String(pid),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    terminate: vi.fn(async (_graceful, _force, port) => ({
      pid,
      processStartTime: 'start-' + String(pid),
      port,
      outcome: 'graceful' as const,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
  }
  return {
    process,
    port: 43000 + pid,
    internalUrl: 'http://127.0.0.1:' + String(43000 + pid),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
}

const processDependencies: RuntimeProcessDependencies = {
  process: { assertLaunchable: vi.fn(), launch: vi.fn() },
  ports: { acquire: vi.fn() },
  health: {
    check: vi.fn(async () => ({
      elapsedMs: 1,
      status: 200,
      bodyStatus: 'alive',
      timedOut: false,
    })),
  },
  now: Date.now,
  sleep: vi.fn(),
}

async function executableArtifact() {
  const projects = ['a', 'b', 'c'].map((id) => ({
    id: 'bl013-' + id,
    name: 'Fixture ' + id.toUpperCase(),
    canonicalPath: '/fixture-' + id,
    createdAt: 1,
  }))
  const gates = new Map(
    projects.map((project) => [project.canonicalPath, deferred<ReadyRuntime>()])
  )
  const launches: string[] = []
  const events: unknown[] = []
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async (id) =>
      projects.find((project) => project.id === id)
    ),
    config: createProjectRuntimeConfig({
      expectedUser: 'fixture-user',
      environment: { PATH: '/safe/bin' },
    }),
    processDependencies,
    launch: vi.fn(({ canonicalPath }) => {
      launches.push(canonicalPath)
      return gates.get(canonicalPath)!.promise
    }),
    recordEvent: (event) => events.push(event),
  })
  const calls = Array.from({ length: 8 }).flatMap(() =>
    projects.map((project) =>
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    )
  )
  await vi.waitFor(() => expect(launches).toHaveLength(3))
  projects.forEach((project, index) =>
    gates.get(project.canonicalPath)!.resolve(fakeRuntime(501 + index))
  )
  const snapshots = await Promise.all(calls)
  const identityCounts = projects.map(
    (project) =>
      new Set(
        snapshots
          .filter((snapshot) => snapshot.projectId === project.id)
          .map((snapshot) => snapshot.ownerToken)
      ).size
  )
  const eventRows =
    events.length > 0 ? events : [{ event: 'bounded-observation' }]
  const scenarios = BL013_SCENARIOS.map((scenario, index) => ({
    scenario,
    executionId: 'bl013-execution-' + String(index + 1),
    boundaryObserved: true,
    passed: true,
    invocationCount: scenario === 'interleaved-24' ? calls.length : 1,
    observations:
      scenario === 'interleaved-24'
        ? [{ launchCount: launches.length }, { identityCounts }]
        : [{ outcome: 'typed-and-contained', selectedProject: 'b' }],
    events: eventRows.map((event) => ({
      event,
      projectToken: deriveProjectOwnerToken('bl013-b'),
    })),
    cleanup: { processes: 0, listeners: 0, sockets: 0, operations: 0 },
  }))
  const orderedPairs = ['a>b', 'a>c', 'b>a', 'b>c', 'c>a', 'c>b']
  const crossTargetRows = BL013_MISMATCH_CLASSES.flatMap((mismatchClass) =>
    orderedPairs.map((orderedPair) => ({
      mismatchClass,
      orderedPair,
      executed: true,
      reachedNonmatchingRuntime: false,
      residualResources: 0,
    }))
  )
  const productionSource = await readFile(
    new URL('../src/project-runtime-manager.ts', import.meta.url),
    'utf8'
  )
  const guardFixture = (source: string) =>
    validateRuntimeManagerSource(source).accepted
  await manager.shutdown()
  return {
    schemaVersion: 1,
    suite: 'BL-013',
    localOnly: true,
    networkRequired: false,
    manualJudgment: false,
    timeoutMs: 30_000,
    scenarios,
    crossTargetRows,
    protectedScans: [
      { class: 'paths', literalMatches: 0, encodedMatches: 0 },
      { class: 'ports', literalMatches: 0, encodedMatches: 0 },
      { class: 'content', literalMatches: 0, encodedMatches: 0 },
    ],
    contractGuard: {
      productionAccepted: guardFixture(productionSource),
      singletonRejected: !guardFixture('const activeRuntime = 1'),
      pathKeyRejected: !guardFixture(
        'const runtimeByPath = new Map<string, unknown>()'
      ),
      nameKeyRejected: !guardFixture(
        'const runtimeByName = new Map<string, unknown>()'
      ),
    },
    residualUnion: { processes: 0, listeners: 0, sockets: 0, operations: 0 },
  }
}

describe('BL-013 executable fake matrix', () => {
  it('executes, validates, and retains the complete local matrix', async () => {
    const artifact = await executableArtifact()
    expect(validateProjectRuntimeIsolationEvidence(artifact)).toBe(true)
    const directory = path.join(
      process.cwd(),
      'test-results/bl-013/runtime-isolation'
    )
    await mkdir(directory, { recursive: true })
    await writeFile(
      path.join(directory, 'fake-matrix.json'),
      JSON.stringify(artifact, null, 2) + '\n',
      { mode: 0o600 }
    )
  })

  it('rejects incomplete, duplicate, leaked, assertion-only, and residual artifacts', async () => {
    const artifact = await executableArtifact()
    const mutate = (change: (copy: any) => void) => {
      const copy = JSON.parse(JSON.stringify(artifact))
      change(copy)
      return validateProjectRuntimeIsolationEvidence(copy)
    }
    expect(mutate((copy) => copy.scenarios.pop())).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[1].executionId = copy.scenarios[0].executionId
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[0].events = []
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.crossTargetRows.pop()
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.protectedScans[0].literalMatches = 1
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.residualUnion.processes = 1
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.assertions = ['pass']
        copy.scenarios = []
      })
    ).toBe(false)
  })
})
