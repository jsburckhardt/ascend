import { spawn } from 'node:child_process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RUNTIME_FAILURE_CATEGORIES,
  RuntimeFailure,
  createProjectRuntimeConfig,
  serializeRuntimeEvent,
} from '../src/project-runtime-contract.js'
import { createProjectLibrary } from '../src/project-library.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  defaultRuntimeProcessDependencies,
  launchReadyRuntime,
  nodeRuntimePortProvider,
  nodeRuntimeProcessAdapter,
  readProcessStartTime,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeExit,
  type RuntimeOwnershipRecord,
  type RuntimeProcessDependencies,
  type RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import {
  assertExecutableMatrixArtifact,
  captureRecursiveManifest,
  recursiveManifestDifferenceCount,
  type MatrixExecution,
} from './project-runtime-evidence.js'

const requiredCases = [
  'unknown-project',
  'canonical-path-invariant',
  'eight-call-single-flight',
  'healthy-reuse',
  'port-collision',
  'address-exhaustion',
  'spawn-error',
  'executable-missing',
  'early-exit-code',
  'early-exit-signal',
  'readiness-timeout',
  'health-status',
  'health-body',
  'caller-cancellation',
  'manager-shutdown',
  'failed-attempt-retry',
  'post-running-exit',
  'bounded-diagnostics',
  'redaction-sentinels',
  'exact-process-ownership',
  'idempotent-shutdown',
  'unrelated-listener-survival',
  'project-file-integrity',
  'persistence-minimization',
  'union-residual-audit',
] as const

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

function virtualRuntime(pid: number, port: number) {
  const exited = deferred<RuntimeExit>()
  let alive = true
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exited.promise,
    isAlive: vi.fn(async () => alive),
    audit: vi.fn(async (auditPort) => ({
      pid,
      processStartTime: String(pid * 10),
      port: auditPort,
      processAbsent: !alive,
      processGroupAbsent: !alive,
      listenerAbsent: !alive,
    })),
    terminate: vi.fn(async (_graceful, _force, auditPort) => {
      alive = false
      exited.resolve({ code: 0, signal: null, addressInUse: false })
      return {
        pid,
        processStartTime: String(pid * 10),
        port: auditPort,
        outcome: 'graceful' as const,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      }
    }),
  }
  const ready: ReadyRuntime = {
    process,
    port,
    internalUrl: 'http://127.0.0.1:' + String(port),
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
  return {
    process,
    ready,
    exit(exit: RuntimeExit) {
      alive = false
      exited.resolve(exit)
    },
  }
}

const healthyDependencies: RuntimeProcessDependencies = {
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
  now: Date.now,
  sleep: vi.fn(),
}

const executablePath = new URL('fixtures/fake-code-server.mjs', import.meta.url)
  .pathname

function realConfig(
  mode: string,
  overrides: Parameters<typeof createProjectRuntimeConfig>[0] = {}
) {
  return createProjectRuntimeConfig({
    executablePath,
    expectedUser: 'vscode',
    environment: {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      BL001_FAKE_MODE: mode,
    },
    readinessTimeoutMs: 250,
    healthAttemptTimeoutMs: 200,
    pollIntervalMs: 10,
    gracefulShutdownMs: 250,
    forceShutdownMs: 750,
    ...overrides,
  })
}

async function waitForOwnership(
  records: RuntimeOwnershipRecord[],
  count = 1
): Promise<void> {
  await vi.waitFor(() => expect(records).toHaveLength(count), { timeout: 2000 })
}

function observe(name: string, actual: unknown) {
  return { name, actual }
}

describe('project runtime executable acceptance matrix', () => {
  const executable = process.env.BL010_ACCEPTANCE === '1' ? it : it.skip
  it('guards executable matrix artifacts against assertion-only shapes', () => {
    expect(() =>
      assertExecutableMatrixArtifact(
        { version: 1, executedCases: requiredCases },
        requiredCases
      )
    ).toThrow('Assertion-only matrix keys are prohibited')
    const valid = {
      version: 2,
      executions: requiredCases.map((caseName) => ({
        case: caseName,
        invocationCount: 1,
        observations: [{ name: 'result', actual: 0 }],
      })),
    }
    expect(() =>
      assertExecutableMatrixArtifact(valid, requiredCases)
    ).not.toThrow()
    for (const invalid of [
      null,
      { version: 1, executions: [] },
      { version: 2, executions: [null] },
      {
        version: 2,
        executions: [
          { case: 'unknown-project', invocationCount: 0, observations: [] },
        ],
      },
      {
        version: 2,
        executions: [
          {
            case: 'unknown-project',
            invocationCount: 1,
            observations: [{}],
          },
        ],
      },
      {
        version: 2,
        executions: [
          {
            case: 'duplicate',
            invocationCount: 1,
            observations: [{ name: 'result', actual: 0 }],
          },
          {
            case: 'duplicate',
            invocationCount: 1,
            observations: [{ name: 'result', actual: 0 }],
          },
        ],
      },
    ]) {
      expect(() =>
        assertExecutableMatrixArtifact(invalid, requiredCases)
      ).toThrow()
    }
  })

  it('captures recursive membership bytes permissions links and timestamps', async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), 'bl-010-manifest-'))
    try {
      await mkdir(path.join(fixture, 'nested'))
      await writeFile(
        path.join(fixture, 'nested', 'bytes.bin'),
        Buffer.from([1, 2])
      )
      await chmod(path.join(fixture, 'nested', 'bytes.bin'), 0o640)
      await symlink('nested/bytes.bin', path.join(fixture, 'bytes-link'))
      const captured = await captureRecursiveManifest(fixture)
      expect(captured.entries).toEqual([
        expect.objectContaining({
          path: 'bytes-link',
          kind: 'symlink',
          mode: expect.any(Number),
          mtimeNs: expect.any(String),
          ctimeNs: expect.any(String),
          bytesSha256: null,
          linkTarget: 'nested/bytes.bin',
        }),
        expect.objectContaining({ path: 'nested', kind: 'directory' }),
        expect.objectContaining({
          path: path.join('nested', 'bytes.bin'),
          kind: 'file',
          mode: 0o640,
          bytesSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
          linkTarget: null,
        }),
      ])
    } finally {
      await rm(fixture, { recursive: true, force: true })
    }
  })

  executable(
    'executes every named path and retains concrete manifests and audits',
    async () => {
      const fixture = await mkdtemp(path.join(os.tmpdir(), 'bl-010-project-'))
      const context = await allocateDatabaseTestContext('runtime-acceptance')
      const evidencePath = path.resolve(
        'test-results/bl-010/project-runtime/fake-matrix.json'
      )
      const executions = new Map<string, MatrixExecution>()
      const manifests: Record<
        string,
        {
          before: RecursiveManifest
          after: RecursiveManifest
          differenceCount: number
        }
      > = {}
      const allAudits: RuntimeTerminationAudit[] = []
      const add = (
        caseName: string,
        ...observations: ReturnType<typeof observe>[]
      ) => {
        expect(executions.has(caseName)).toBe(false)
        executions.set(caseName, {
          case: caseName,
          invocationCount: 1,
          observations,
        })
      }
      const aroundManifest = async (
        name: string,
        operation: () => Promise<void>
      ): Promise<void> => {
        const before = await captureRecursiveManifest(fixture)
        await operation()
        const after = await captureRecursiveManifest(fixture)
        const differenceCount = recursiveManifestDifferenceCount(before, after)
        expect(after).toEqual(before)
        manifests[name] = { before, after, differenceCount }
      }

      await mkdir(path.dirname(evidencePath), { recursive: true })
      try {
        await mkdir(path.join(fixture, 'nested'))
        await writeFile(
          path.join(fixture, 'README.md'),
          '# untouched fixture' + String.fromCharCode(10)
        )
        await writeFile(
          path.join(fixture, 'nested', 'bytes.bin'),
          Buffer.from([0, 1, 2, 255])
        )
        await chmod(path.join(fixture, 'nested', 'bytes.bin'), 0o640)
        await symlink(
          '../README.md',
          path.join(fixture, 'nested', 'readme-link')
        )

        const project = {
          id: 'matrix-project',
          name: 'Matrix Project',
          canonicalPath: fixture,
          createdAt: 1,
        }
        const noLaunch = vi.fn()
        const unknown = createProjectRuntimeManager({
          findProjectById: async () => undefined,
          launch: noLaunch,
          config: realConfig('project-runtime'),
        })
        const unknownFailure = await unknown
          .start({ projectId: 'missing', canonicalPath: fixture })
          .catch((error: unknown) => error as RuntimeFailure)
        expect(unknownFailure.category).toBe('unknown-project')
        add('unknown-project', observe('category', unknownFailure.category))

        const mismatch = createProjectRuntimeManager({
          findProjectById: async () => project,
          launch: noLaunch,
          config: realConfig('project-runtime'),
        })
        const mismatchFailure = await mismatch
          .start({ projectId: project.id, canonicalPath: fixture + '-other' })
          .catch((error: unknown) => error as RuntimeFailure)
        expect(mismatchFailure.category).toBe('canonical-path-invariant')
        expect(noLaunch).not.toHaveBeenCalled()
        add(
          'canonical-path-invariant',
          observe('category', mismatchFailure.category),
          observe('launchCount', noLaunch.mock.calls.length)
        )

        await aroundManifest('successful-start-and-reuse', async () => {
          const one = virtualRuntime(610, 42610)
          const launch = vi.fn(async () => one.ready)
          const manager = createProjectRuntimeManager({
            findProjectById: async () => project,
            processDependencies: healthyDependencies,
            launch,
            config: realConfig('project-runtime'),
          })
          const calls = Array.from({ length: 8 }, () =>
            manager.start({
              projectId: project.id,
              canonicalPath: project.canonicalPath,
            })
          )
          const snapshots = await Promise.all(calls)
          expect(launch).toHaveBeenCalledTimes(1)
          expect(new Set(snapshots.map((snapshot) => snapshot.pid)).size).toBe(
            1
          )
          add(
            'eight-call-single-flight',
            observe('callerCount', snapshots.length),
            observe('launchCount', launch.mock.calls.length),
            observe('pid', snapshots[0]?.pid)
          )
          const reused = await manager.start({
            projectId: project.id,
            canonicalPath: project.canonicalPath,
          })
          expect(reused).toBe(snapshots[0])
          add(
            'healthy-reuse',
            observe('pid', reused.pid),
            observe('port', reused.port),
            observe('launchCountAfterReuse', launch.mock.calls.length)
          )
          allAudits.push(...(await manager.shutdown()).audits)
        })

        const unrelated = createServer()
        await new Promise<void>((resolve, reject) => {
          unrelated.once('error', reject)
          unrelated.listen(0, '127.0.0.1', resolve)
        })
        const unrelatedAddress = unrelated.address()
        if (unrelatedAddress === null || typeof unrelatedAddress === 'string') {
          throw new Error('Unrelated listener address unavailable')
        }
        let collisionLaunchCount = 0
        const collisionProcess = {
          ...nodeRuntimeProcessAdapter,
          launch: async (
            input: Parameters<typeof nodeRuntimeProcessAdapter.launch>[0]
          ) => {
            collisionLaunchCount += 1
            return nodeRuntimeProcessAdapter.launch(input)
          },
        }
        const collisionPorts = [unrelatedAddress.port, unrelatedAddress.port]
        const collisionResult = await launchReadyRuntime({
          config: realConfig('project-runtime'),
          canonicalPath: fixture,
          signal: new AbortController().signal,
          dependencies: {
            ...defaultRuntimeProcessDependencies,
            process: collisionProcess,
            ports: {
              acquire: async () =>
                collisionPorts.shift() ?? nodeRuntimePortProvider.acquire(),
            },
          },
        })
        expect(collisionLaunchCount).toBe(3)
        add(
          'port-collision',
          observe('attemptCount', collisionLaunchCount),
          observe('selectedPort', collisionResult.port)
        )
        allAudits.push(
          await collisionResult.process.terminate(
            250,
            750,
            collisionResult.port
          )
        )

        let exhaustedLaunchCount = 0
        const exhaustionProcess = {
          ...nodeRuntimeProcessAdapter,
          launch: async (
            input: Parameters<typeof nodeRuntimeProcessAdapter.launch>[0]
          ) => {
            exhaustedLaunchCount += 1
            return nodeRuntimeProcessAdapter.launch(input)
          },
        }
        const exhaustionFailure = await launchReadyRuntime({
          config: realConfig('project-runtime'),
          canonicalPath: fixture,
          signal: new AbortController().signal,
          dependencies: {
            ...defaultRuntimeProcessDependencies,
            process: exhaustionProcess,
            ports: { acquire: async () => unrelatedAddress.port },
          },
        }).catch((error: unknown) => error as RuntimeFailure)
        expect(exhaustionFailure.category).toBe('address-in-use-exhausted')
        expect(unrelated.listening).toBe(true)
        add(
          'address-exhaustion',
          observe('category', exhaustionFailure.category),
          observe('attemptCount', exhaustedLaunchCount),
          observe('controlPort', unrelatedAddress.port)
        )

        const spawnFailure = await launchReadyRuntime({
          config: realConfig('project-runtime', { expectedUser: 'wrong-user' }),
          canonicalPath: fixture,
          signal: new AbortController().signal,
        }).catch((error: unknown) => error as RuntimeFailure)
        expect(spawnFailure.category).toBe('spawn-error')
        add('spawn-error', observe('category', spawnFailure.category))

        const missingFailure = await launchReadyRuntime({
          config: createProjectRuntimeConfig({
            executablePath: '/missing/bl-010-code-server',
            expectedUser: 'vscode',
          }),
          canonicalPath: fixture,
          signal: new AbortController().signal,
        }).catch((error: unknown) => error as RuntimeFailure)
        expect(missingFailure.category).toBe('executable-missing')
        add('executable-missing', observe('category', missingFailure.category))

        for (const [mode, caseName, category] of [
          ['early-exit', 'early-exit-code', 'early-exit-code'],
          ['early-signal', 'early-exit-signal', 'early-exit-signal'],
          ['timeout', 'readiness-timeout', 'readiness-timeout'],
          [
            'project-runtime-health-status',
            'health-status',
            'health-status-unexpected',
          ],
          [
            'project-runtime-health-body',
            'health-body',
            'health-body-unexpected',
          ],
        ] as const) {
          const owned: RuntimeOwnershipRecord[] = []
          const cleanups: RuntimeTerminationAudit[] = []
          const failure = await launchReadyRuntime({
            config: realConfig(mode),
            canonicalPath: fixture,
            signal: new AbortController().signal,
            onOwned: (record) => owned.push(record),
            onCleanup: (audit) => cleanups.push(audit),
          }).catch((error: unknown) => error as RuntimeFailure)
          expect(failure.category).toBe(category)
          expect(cleanups.every((audit) => audit.processAbsent)).toBe(true)
          allAudits.push(...cleanups)
          add(
            caseName,
            observe('category', failure.category),
            observe('ownedPidCount', owned.length),
            observe('cleanupAudits', cleanups)
          )
        }

        await aroundManifest('caller-cancellation', async () => {
          const oneRecords: RuntimeOwnershipRecord[] = []
          const oneManager = createProjectRuntimeManager({
            findProjectById: async () => project,
            config: realConfig('project-runtime-delayed-ready'),
            launch: (input) =>
              launchReadyRuntime({
                ...input,
                config: realConfig('project-runtime-delayed-ready'),
                onOwned: (record) => {
                  oneRecords.push(record)
                  input.onOwned?.(record)
                },
                onCleanup: input.onCleanup,
              }),
          })
          const cancelled = new AbortController()
          const cancelledWait = oneManager
            .start({
              projectId: project.id,
              canonicalPath: fixture,
              signal: cancelled.signal,
            })
            .catch((error: unknown) => error as RuntimeFailure)
          const continuingWait = oneManager.start({
            projectId: project.id,
            canonicalPath: fixture,
          })
          await waitForOwnership(oneRecords)
          cancelled.abort()
          const cancelledFailure = await cancelledWait
          const continuing = await continuingWait
          expect(cancelledFailure.category).toBe('caller-cancelled')
          expect(continuing.state).toBe('running')
          allAudits.push(...(await oneManager.shutdown()).audits)

          const allRecords: RuntimeOwnershipRecord[] = []
          let allLaunchCount = 0
          const allManager = createProjectRuntimeManager({
            findProjectById: async () => project,
            config: realConfig('project-runtime-health-body'),
            launch: (input) => {
              const mode =
                allLaunchCount++ === 0
                  ? 'project-runtime-health-body'
                  : 'project-runtime'
              return launchReadyRuntime({
                ...input,
                config: realConfig(mode),
                onOwned: (record) => {
                  allRecords.push(record)
                  input.onOwned?.(record)
                },
                onCleanup: input.onCleanup,
              })
            },
          })
          const allControllers = [new AbortController(), new AbortController()]
          const allWaits = allControllers.map((controller) =>
            allManager
              .start({
                projectId: project.id,
                canonicalPath: fixture,
                signal: controller.signal,
              })
              .catch((error: unknown) => error as RuntimeFailure)
          )
          await waitForOwnership(allRecords)
          for (const controller of allControllers) controller.abort()
          const callerFailures = await Promise.all(allWaits)
          expect(
            callerFailures.every(
              (failure) => failure.category === 'caller-cancelled'
            )
          ).toBe(true)
          await vi.waitFor(() =>
            expect(allManager.inspect(project.id)?.state).toBe('failed')
          )
          const failedIdentity = allRecords[0]
          const failedAudit = await failedIdentity?.process.audit(
            failedIdentity.port
          )
          expect(failedAudit).toMatchObject({
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: true,
          })
          const stateBeforeRetry = allManager.inspect(project.id)?.state
          expect(stateBeforeRetry).toBe('failed')
          const retry = await allManager.start({
            projectId: project.id,
            canonicalPath: fixture,
          })
          expect(retry.pid).not.toBe(failedIdentity?.process.pid)
          expect(allManager.inspect(project.id)?.state).toBe('running')
          allAudits.push(...(await allManager.shutdown()).audits)
          add(
            'caller-cancellation',
            observe('oneCallerCategory', cancelledFailure.category),
            observe('continuingPid', continuing.pid),
            observe(
              'allCallerCategories',
              callerFailures.map((failure) => failure.category)
            ),
            observe('failedOwnedAudit', failedAudit),
            observe('retryPid', retry.pid),
            observe('stateBeforeRetry', stateBeforeRetry),
            observe(
              'staleRunningInstallCount',
              stateBeforeRetry === 'running' ? 1 : 0
            )
          )
        })

        await aroundManifest('failed-start-and-retry', async () => {
          const records: RuntimeOwnershipRecord[] = []
          let launchCount = 0
          const manager = createProjectRuntimeManager({
            findProjectById: async () => project,
            config: realConfig('project-runtime-health-body'),
            launch: (input) => {
              const mode =
                launchCount++ === 0
                  ? 'project-runtime-health-body'
                  : 'project-runtime'
              return launchReadyRuntime({
                ...input,
                config: realConfig(mode),
                onOwned: (record) => {
                  records.push(record)
                  input.onOwned?.(record)
                },
                onCleanup: input.onCleanup,
              })
            },
          })
          const calls = Array.from({ length: 8 }, () =>
            manager
              .start({ projectId: project.id, canonicalPath: fixture })
              .catch((error: unknown) => error as RuntimeFailure)
          )
          const failures = await Promise.all(calls)
          expect(failures.every((failure) => failure === failures[0])).toBe(
            true
          )
          const failedRecord = records[0]
          const failedAudit = await failedRecord?.process.audit(
            failedRecord.port
          )
          expect(failedAudit).toMatchObject({
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: true,
          })
          const retries = Array.from({ length: 8 }, () =>
            manager.start({ projectId: project.id, canonicalPath: fixture })
          )
          const retrySnapshots = await Promise.all(retries)
          expect(
            new Set(retrySnapshots.map((snapshot) => snapshot.pid)).size
          ).toBe(1)
          expect(retrySnapshots[0]?.pid).not.toBe(failedRecord?.process.pid)
          add(
            'failed-attempt-retry',
            observe('participatingCallers', failures.length),
            observe('sharedFailureIdentityCount', new Set(failures).size),
            observe('category', failures[0]?.category),
            observe('failedOwnedPid', failedRecord?.process.pid),
            observe('failedOwnedPort', failedRecord?.port),
            observe('failedOwnedAudit', failedAudit),
            observe('retryCallers', retrySnapshots.length),
            observe('freshPid', retrySnapshots[0]?.pid),
            observe('launchCount', launchCount)
          )
          allAudits.push(...(await manager.shutdown()).audits)
        })

        await aroundManifest('post-running-exit-and-replacement', async () => {
          const records: RuntimeOwnershipRecord[] = []
          let launchCount = 0
          const manager = createProjectRuntimeManager({
            findProjectById: async () => project,
            config: realConfig('project-runtime'),
            launch: (input) => {
              launchCount += 1
              return launchReadyRuntime({
                ...input,
                config: realConfig('project-runtime'),
                onOwned: (record) => {
                  records.push(record)
                  input.onOwned?.(record)
                },
                onCleanup: input.onCleanup,
              })
            },
          })
          const first = await manager.start({
            projectId: project.id,
            canonicalPath: fixture,
          })
          if (first.pid === null) throw new Error('Running PID unavailable')
          process.kill(-first.pid, 'SIGTERM')
          await vi.waitFor(() =>
            expect(manager.inspect(project.id)?.state).toBe('failed')
          )
          expect(launchCount).toBe(1)
          const replacement = await manager.start({
            projectId: project.id,
            canonicalPath: fixture,
          })
          expect(replacement.pid).not.toBe(first.pid)
          add(
            'post-running-exit',
            observe('exitedPid', first.pid),
            observe('automaticLaunchCount', 1),
            observe('replacementPid', replacement.pid),
            observe('explicitLaunchCount', launchCount),
            observe('exitCleanup', manager.lastCleanup(project.id))
          )
          allAudits.push(...(await manager.shutdown()).audits)
        })

        const diagnostics = new RuntimeFailure('readiness-timeout', {
          timeoutMs: 250,
          attemptCount: 4,
          port: 42000,
        })
        expect(Object.keys(diagnostics.diagnostics).sort()).toEqual([
          'attemptCount',
          'port',
          'timeoutMs',
        ])
        add(
          'bounded-diagnostics',
          observe('category', diagnostics.category),
          observe('diagnosticKeys', Object.keys(diagnostics.diagnostics).sort())
        )

        const protectedValues = [
          'SECRET_BL010_SENTINEL',
          'COMMAND_BL010_SENTINEL',
          'ENVIRONMENT_BL010_SENTINEL',
          'SOURCE_BL010_SENTINEL',
          'TERMINAL_BL010_SENTINEL',
          'OUTPUT_BL010_SENTINEL',
          'STACK_BL010_SENTINEL',
          'RAW_ERROR_BL010_SENTINEL',
          'REDACTION_BL010_SENTINEL',
        ]
        const event = serializeRuntimeEvent({
          event: 'runtime.start.failed',
          projectId: project.id,
          from: 'starting',
          to: 'failed',
          elapsedMs: 12,
          classification: 'spawn-error',
        })
        const eventText = JSON.stringify(event)
        const sentinelMatches = protectedValues.filter((sentinel) =>
          eventText.includes(sentinel)
        ).length
        expect(sentinelMatches).toBe(0)
        expect(eventText).not.toContain(fixture)
        add(
          'redaction-sentinels',
          observe('sentinelMatches', sentinelMatches),
          observe('eventKeys', Object.keys(event).sort()),
          observe('rawPathMatches', eventText.includes(fixture) ? 1 : 0)
        )

        await aroundManifest('manager-shutdown', async () => {
          const shutdownProjects = [
            'cooperative',
            'escalated',
            'in-flight',
          ].map((id) => ({ ...project, id, name: id }))
          const records: RuntimeOwnershipRecord[] = []
          let launchCount = 0
          const modes = [
            'project-runtime',
            'project-runtime-ignore-term',
            'project-runtime-delayed-ready',
          ]
          const manager = createProjectRuntimeManager({
            findProjectById: async (id) =>
              shutdownProjects.find((candidate) => candidate.id === id),
            config: realConfig('project-runtime', {
              gracefulShutdownMs: 100,
              forceShutdownMs: 750,
            }),
            launch: (input) => {
              const mode = modes[launchCount++] ?? 'project-runtime'
              return launchReadyRuntime({
                ...input,
                config: realConfig(mode, {
                  gracefulShutdownMs: 100,
                  forceShutdownMs: 750,
                }),
                onOwned: (record) => {
                  records.push(record)
                  input.onOwned?.(record)
                },
                onCleanup: input.onCleanup,
              })
            },
          })
          await manager.start({
            projectId: 'cooperative',
            canonicalPath: fixture,
          })
          await manager.start({
            projectId: 'escalated',
            canonicalPath: fixture,
          })
          const inFlight = manager
            .start({ projectId: 'in-flight', canonicalPath: fixture })
            .catch((error: unknown) => error as RuntimeFailure)
          await waitForOwnership(records, 3)

          const controlListener = createServer()
          await new Promise<void>((resolve, reject) => {
            controlListener.once('error', reject)
            controlListener.listen(0, '127.0.0.1', resolve)
          })
          const controlProcess = spawn(
            process.execPath,
            ['-e', 'setInterval(() => undefined, 1000)'],
            { detached: true, stdio: 'ignore' }
          )
          controlProcess.unref()
          const controlPid = controlProcess.pid
          if (controlPid === undefined)
            throw new Error('Control PID unavailable')
          let controlStart = await readProcessStartTime(controlPid)
          await vi.waitFor(async () => {
            controlStart = await readProcessStartTime(controlPid)
            expect(controlStart).not.toBeNull()
          })
          try {
            const firstShutdown = manager.shutdown()
            expect(manager.shutdown()).toBe(firstShutdown)
            expect(manager.shutdown()).toBe(firstShutdown)
            const result = await firstShutdown
            const inFlightFailure = await inFlight
            expect(inFlightFailure.category).toBe('manager-shutdown')
            expect(result.status).toBe('ok')
            expect(result.audits).toHaveLength(3)
            expect(result.audits.every((audit) => audit.processAbsent)).toBe(
              true
            )
            expect(
              result.audits.every((audit) => audit.processGroupAbsent)
            ).toBe(true)
            expect(result.audits.every((audit) => audit.listenerAbsent)).toBe(
              true
            )
            expect(
              result.audits.some((audit) => audit.outcome === 'graceful')
            ).toBe(true)
            expect(
              result.audits.some((audit) => audit.outcome === 'escalated')
            ).toBe(true)
            expect(controlListener.listening).toBe(true)
            expect(await readProcessStartTime(controlPid)).toBe(controlStart)
            await new Promise<void>((resolve) => setTimeout(resolve, 20))
            expect(
              shutdownProjects.map((candidate) => manager.inspect(candidate.id))
            ).toEqual([undefined, undefined, undefined])
            add(
              'manager-shutdown',
              observe('inFlightCategory', inFlightFailure.category),
              observe('auditCount', result.audits.length),
              observe(
                'outcomes',
                result.audits.map((audit) => audit.outcome)
              ),
              observe('status', result.status)
            )
            add(
              'exact-process-ownership',
              observe(
                'pidIdentities',
                result.audits.map((audit) => ({
                  pid: audit.pid,
                  processStartTime: audit.processStartTime,
                  port: audit.port,
                }))
              ),
              observe('absenceAudits', result.audits)
            )
            add(
              'idempotent-shutdown',
              observe('joinedCallCount', 3),
              observe('sameResultObject', manager.lastShutdown() === result),
              observe('auditCount', result.audits.length)
            )
            add(
              'unrelated-listener-survival',
              observe('listenerStillListening', controlListener.listening),
              observe('processIdentity', {
                pid: controlPid,
                processStartTime: controlStart,
              }),
              observe('processIdentityAfterShutdown', {
                pid: controlPid,
                processStartTime: await readProcessStartTime(controlPid),
              })
            )
            allAudits.push(...result.audits)
          } finally {
            await new Promise<void>((resolve) =>
              controlListener.close(() => resolve())
            )
            await terminateExactProcessGroup(controlPid, 1000)
          }
        })

        const library = await createProjectLibrary(context.databasePath)
        await library.create(project)
        const persisted = await library.findById(project.id)
        const rows = await library.list()
        library.close()
        const databaseBytes = await readFile(context.databasePath)
        const runtimeTerms = [
          'processStartTime',
          'internalUrl',
          'elapsedMs',
          'manager-shutdown',
        ]
        const databaseRuntimeMatches = runtimeTerms.filter((term) =>
          databaseBytes.includes(Buffer.from(term))
        ).length
        expect(persisted).toEqual(project)
        expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
          'canonicalPath',
          'createdAt',
          'id',
          'name',
        ])
        expect(databaseRuntimeMatches).toBe(0)
        add(
          'persistence-minimization',
          observe('rowCount', rows.length),
          observe('projectKeys', Object.keys(rows[0] ?? {}).sort()),
          observe('databaseRuntimeMatches', databaseRuntimeMatches)
        )

        expect(
          Object.values(manifests).every((value) => value.differenceCount === 0)
        ).toBe(true)
        add(
          'project-file-integrity',
          observe('episodeNames', Object.keys(manifests).sort()),
          observe(
            'differenceCounts',
            Object.fromEntries(
              Object.entries(manifests).map(([name, value]) => [
                name,
                value.differenceCount,
              ])
            )
          ),
          observe(
            'manifestEntryCounts',
            Object.fromEntries(
              Object.entries(manifests).map(([name, value]) => [
                name,
                value.before.entries.length,
              ])
            )
          )
        )

        const residualAudits = allAudits.filter(
          (audit) =>
            !audit.processAbsent ||
            !audit.processGroupAbsent ||
            !audit.listenerAbsent
        )
        expect(residualAudits).toEqual([])
        add(
          'union-residual-audit',
          observe('auditedIdentityCount', allAudits.length),
          observe('residualCount', residualAudits.length),
          observe('residualAudits', residualAudits)
        )

        const orderedExecutions = requiredCases.map((caseName) => {
          const execution = executions.get(caseName)
          if (execution === undefined) {
            throw new Error('Missing executable matrix case: ' + caseName)
          }
          return execution
        })
        const artifact = {
          version: 2 as const,
          generatedFrom: 'project-runtime-acceptance.test.ts',
          bounds: {
            concurrentCalls: 8,
            collisionAttempts: PROJECT_RUNTIME_DEFAULTS.collisionAttempts,
            readinessMs: PROJECT_RUNTIME_DEFAULTS.readinessTimeoutMs,
            healthAttemptMs: PROJECT_RUNTIME_DEFAULTS.healthAttemptTimeoutMs,
            gracefulShutdownMs: PROJECT_RUNTIME_DEFAULTS.gracefulShutdownMs,
            forceShutdownMs: PROJECT_RUNTIME_DEFAULTS.forceShutdownMs,
          },
          typedFailureCategories: RUNTIME_FAILURE_CATEGORIES,
          executions: orderedExecutions,
          manifests,
          persistence: {
            rowCount: rows.length,
            projectKeys: Object.keys(rows[0] ?? {}).sort(),
            databaseRuntimeMatches,
          },
          privacy: {
            sentinelMatches,
            rawCanonicalPathEventMatches: eventText.includes(fixture) ? 1 : 0,
          },
          unionResiduals: {
            auditedIdentityCount: allAudits.length,
            residualCount: residualAudits.length,
            residualAudits,
          },
        }
        assertExecutableMatrixArtifact(artifact, requiredCases)
        await writeFile(
          evidencePath,
          JSON.stringify(artifact, null, 2) + String.fromCharCode(10)
        )
      } finally {
        await context.cleanup()
        await rm(fixture, { recursive: true, force: true })
      }
    },
    30000
  )
})
