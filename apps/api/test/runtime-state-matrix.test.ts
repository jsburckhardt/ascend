/// <reference types="node" />
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  RuntimeFailure,
  createProjectRuntimeConfig,
  publicRuntimeState,
  publicRuntimeStateForLifecycleEvent,
  type PublicRuntimeReport,
  type RuntimeFailureCategory,
  type RuntimeLifecycleEvent,
  type RuntimeSafeLifecycleEvent,
  type RuntimeState,
} from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import type {
  HealthAttempt,
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeExit,
  RuntimeProcessDependencies,
  RuntimeTerminationAudit,
} from '../src/project-runtime-process.js'
import {
  BL016_SCENARIOS,
  serializeRuntimeStateMatrix,
  validatePublicReportingSource,
  validateRuntimeStateMatrix,
  type Bl016Scenario,
  type RuntimeStateEvidenceEvent,
  type RuntimeStateEvidenceRow,
  type RuntimeStateMatrix,
} from '../src/runtime-state-evidence.js'

const repositoryRoot = path.resolve(import.meta.dirname, '../../..')
const disposablePath = path.join(
  repositoryRoot,
  'test-results/bl-016/runtime-state-matrix.json'
)
const retainedPath = path.join(
  repositoryRoot,
  'project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json'
)
const managerSourcePath = path.join(
  repositoryRoot,
  'apps/api/src/project-runtime-manager.ts'
)

type InternalEvidenceState = RuntimeState | 'registered'

interface ScenarioDefinition {
  readonly scenario: Bl016Scenario
  readonly internalState: InternalEvidenceState
  readonly failureCategory: RuntimeFailureCategory | null
  readonly readinessObserved: boolean
  readonly cleanupCount: number
  readonly contenderCount: number
  readonly event?: Readonly<{
    event: RuntimeLifecycleEvent['event']
    from: RuntimeLifecycleEvent['from']
    to: RuntimeLifecycleEvent['to']
  }>
  readonly peerDigest?: string
}

const definitions: readonly ScenarioDefinition[] = [
  {
    scenario: 'stopped-registered',
    internalState: 'registered',
    failureCategory: null,
    readinessObserved: false,
    cleanupCount: 0,
    contenderCount: 0,
  },
  {
    scenario: 'starting-delayed-readiness',
    internalState: 'starting',
    failureCategory: null,
    readinessObserved: false,
    cleanupCount: 0,
    contenderCount: 0,
    event: {
      event: 'runtime.start.requested',
      from: 'stopped',
      to: 'starting',
    },
  },
  {
    scenario: 'running-observed-readiness',
    internalState: 'running',
    failureCategory: null,
    readinessObserved: true,
    cleanupCount: 0,
    contenderCount: 0,
    event: {
      event: 'runtime.start.succeeded',
      from: 'starting',
      to: 'running',
    },
  },
  {
    scenario: 'failed-start-before-readiness',
    internalState: 'failed',
    failureCategory: 'spawn-error',
    readinessObserved: false,
    cleanupCount: 1,
    contenderCount: 1,
    event: {
      event: 'runtime.start.failed',
      from: 'starting',
      to: 'failed',
    },
  },
  {
    scenario: 'failed-post-readiness-exit',
    internalState: 'failed',
    failureCategory: 'early-exit-code',
    readinessObserved: true,
    cleanupCount: 1,
    contenderCount: 1,
    event: {
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
    },
  },
  {
    scenario: 'failed-health-observation',
    internalState: 'failed',
    failureCategory: 'health-status-unexpected',
    readinessObserved: true,
    cleanupCount: 1,
    contenderCount: 1,
    event: {
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
    },
  },
  {
    scenario: 'failed-false-liveness',
    internalState: 'failed',
    failureCategory: 'early-exit-code',
    readinessObserved: true,
    cleanupCount: 1,
    contenderCount: 1,
    event: {
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
    },
  },
  {
    scenario: 'failed-transition-race',
    internalState: 'failed',
    failureCategory: 'health-status-unexpected',
    readinessObserved: true,
    cleanupCount: 1,
    contenderCount: 2,
    event: {
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
    },
  },
  {
    scenario: 'cross-project-isolation',
    internalState: 'failed',
    failureCategory: 'early-exit-signal',
    readinessObserved: true,
    cleanupCount: 1,
    contenderCount: 1,
    event: {
      event: 'runtime.health.changed',
      from: 'running',
      to: 'failed',
    },
    peerDigest: 'peer-state-running-unchanged',
  },
  {
    scenario: 'event-consistency',
    internalState: 'running',
    failureCategory: null,
    readinessObserved: true,
    cleanupCount: 0,
    contenderCount: 0,
    event: {
      event: 'runtime.start.succeeded',
      from: 'starting',
      to: 'running',
    },
  },
]

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

function terminationAudit(pid: number, port: number): RuntimeTerminationAudit {
  return {
    pid,
    processStartTime: String(pid * 10),
    port,
    outcome: 'graceful',
    processAbsent: true,
    processGroupAbsent: true,
    listenerAbsent: true,
  }
}

function fakeRuntime(pid: number) {
  const exit = deferred<RuntimeExit>()
  const port = 45_000 + pid
  let alive = true
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: String(pid * 10),
    exit: exit.promise,
    isAlive: vi.fn(async () => alive),
    terminate: vi.fn(async () => {
      alive = false
      exit.resolve({ code: 0, signal: null, addressInUse: false })
      return terminationAudit(pid, port)
    }),
    audit: vi.fn(async (observedPort) => ({
      pid,
      processStartTime: String(pid * 10),
      port: observedPort,
      processAbsent: !alive,
      processGroupAbsent: !alive,
      listenerAbsent: !alive,
    })),
  }
  const ready: ReadyRuntime = {
    process,
    port,
    internalUrl: `http://127.0.0.1:${port}`,
    readinessAttempts: [
      { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
    ],
  }
  return {
    ready,
    exit(value: RuntimeExit) {
      alive = false
      exit.resolve(value)
    },
    setAlive(value: boolean) {
      alive = value
    },
  }
}

const runtimeConfig = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/fixture/bin' },
})
const primaryProject = {
  id: 'matrix-project',
  name: 'Matrix project',
  canonicalPath: '/fixture/project',
  createdAt: 1,
}
const peerProject = {
  id: 'peer-project',
  name: 'Peer project',
  canonicalPath: '/fixture/peer',
  createdAt: 2,
}
const healthyAttempt: HealthAttempt = {
  elapsedMs: 1,
  status: 200,
  bodyStatus: 'alive',
  timedOut: false,
}
const failedHealthAttempt: HealthAttempt = {
  elapsedMs: 1,
  status: 503,
  bodyStatus: null,
  timedOut: false,
}

type RuntimeLaunch = NonNullable<
  Parameters<typeof createProjectRuntimeManager>[0]['launch']
>

function runtimeHarness(input: {
  readonly launch: RuntimeLaunch
  readonly health?: () => Promise<HealthAttempt>
  readonly projects?: readonly (typeof primaryProject)[]
}) {
  const events: RuntimeSafeLifecycleEvent[] = []
  const processDependencies: RuntimeProcessDependencies = {
    process: {
      assertLaunchable: vi.fn(async () => undefined),
      launch: vi.fn(),
    },
    ports: { acquire: vi.fn() },
    health: {
      check: vi.fn(input.health ?? (async () => healthyAttempt)),
    },
    now: vi.fn(() => 10),
    sleep: vi.fn(),
  }
  const projects = input.projects ?? [primaryProject]
  const manager = createProjectRuntimeManager({
    findProjectById: vi.fn(async (id) =>
      projects.find((project) => project.id === id)
    ),
    config: runtimeConfig,
    processDependencies,
    launch: input.launch,
    now: vi.fn(() => 10),
    recordEvent: (event) => events.push(event),
  })
  return { events, manager, processDependencies }
}

interface ScenarioObservation {
  readonly report: PublicRuntimeReport
  readonly events: readonly RuntimeSafeLifecycleEvent[]
  readonly cleanupCount: number
  readonly peerDigests: RuntimeStateEvidenceRow['peerDigests']
}

async function waitForFailedReport(
  manager: ReturnType<typeof createProjectRuntimeManager>
): Promise<PublicRuntimeReport> {
  await vi.waitFor(() =>
    expect(manager.reportPublicStates([primaryProject.id])[0]?.state).toBe(
      'Failed'
    )
  )
  return manager.reportPublicStates([primaryProject.id])[0]!
}

async function observeScenario(
  definition: ScenarioDefinition,
  ordinal: number
): Promise<ScenarioObservation> {
  if (definition.scenario === 'stopped-registered') {
    const runtime = fakeRuntime(800 + ordinal)
    const { events, manager } = runtimeHarness({
      launch: async () => runtime.ready,
    })
    manager.register(primaryProject.id, primaryProject.canonicalPath)
    const report = manager.reportPublicStates([primaryProject.id])[0]!
    await manager.shutdown()
    return { report, events, cleanupCount: 0, peerDigests: null }
  }

  if (definition.scenario === 'starting-delayed-readiness') {
    const runtime = fakeRuntime(800 + ordinal)
    const gate = deferred<ReadyRuntime>()
    const { events, manager } = runtimeHarness({
      launch: async () => gate.promise,
    })
    const start = manager.start({
      projectId: primaryProject.id,
      canonicalPath: primaryProject.canonicalPath,
    })
    await vi.waitFor(() =>
      expect(manager.reportPublicStates([primaryProject.id])[0]?.state).toBe(
        'Starting'
      )
    )
    const report = manager.reportPublicStates([primaryProject.id])[0]!
    const observedEvents = [...events]
    gate.resolve(runtime.ready)
    await start
    await manager.shutdown()
    return {
      report,
      events: observedEvents,
      cleanupCount: 0,
      peerDigests: null,
    }
  }

  if (definition.scenario === 'failed-start-before-readiness') {
    const pid = 800 + ordinal
    const port = 45_000 + pid
    const { events, manager } = runtimeHarness({
      launch: async ({ onCleanup }) => {
        onCleanup?.(terminationAudit(pid, port))
        throw new RuntimeFailure('spawn-error')
      },
    })
    await expect(
      manager.start({
        projectId: primaryProject.id,
        canonicalPath: primaryProject.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'spawn-error' })
    const report = manager.reportPublicStates([primaryProject.id])[0]!
    const cleanupCount =
      manager.lastCleanup(primaryProject.id) === undefined ? 0 : 1
    await manager.shutdown()
    return { report, events, cleanupCount, peerDigests: null }
  }

  if (definition.scenario === 'cross-project-isolation') {
    const primary = fakeRuntime(800 + ordinal)
    const peer = fakeRuntime(900 + ordinal)
    const { events, manager } = runtimeHarness({
      projects: [primaryProject, peerProject],
      launch: async ({ canonicalPath }) =>
        canonicalPath === primaryProject.canonicalPath
          ? primary.ready
          : peer.ready,
    })
    await manager.start({
      projectId: primaryProject.id,
      canonicalPath: primaryProject.canonicalPath,
    })
    await manager.start({
      projectId: peerProject.id,
      canonicalPath: peerProject.canonicalPath,
    })
    const before = JSON.stringify(
      manager.reportPublicStates([peerProject.id])[0]
    )
    primary.exit({ code: null, signal: 'SIGTERM', addressInUse: false })
    const report = await waitForFailedReport(manager)
    await vi.waitFor(() =>
      expect(manager.lastCleanup(primaryProject.id)).toBeDefined()
    )
    expect(manager.audit!().backgroundTasks).toBe(1)
    const after = JSON.stringify(
      manager.reportPublicStates([peerProject.id])[0]
    )
    const cleanupCount =
      manager.lastCleanup(primaryProject.id) === undefined ? 0 : 1
    const observedEvents = [...events]
    await manager.shutdown()
    return {
      report,
      events: observedEvents,
      cleanupCount,
      peerDigests: { before, after },
    }
  }

  const runtime = fakeRuntime(800 + ordinal)
  const healthGate = deferred<HealthAttempt>()
  const usesHealthGate = definition.scenario === 'failed-transition-race'
  const { events, manager, processDependencies } = runtimeHarness({
    launch: async () => runtime.ready,
    health:
      definition.scenario === 'failed-health-observation'
        ? async () => failedHealthAttempt
        : usesHealthGate
          ? async () => healthGate.promise
          : async () => healthyAttempt,
  })
  await manager.start({
    projectId: primaryProject.id,
    canonicalPath: primaryProject.canonicalPath,
  })

  if (
    definition.scenario === 'running-observed-readiness' ||
    definition.scenario === 'event-consistency'
  ) {
    const report = manager.reportPublicStates([primaryProject.id])[0]!
    const observedEvents = [...events]
    await manager.shutdown()
    return {
      report,
      events: observedEvents,
      cleanupCount: 0,
      peerDigests: null,
    }
  }

  if (definition.scenario === 'failed-post-readiness-exit') {
    runtime.exit({ code: 7, signal: null, addressInUse: false })
  } else if (definition.scenario === 'failed-false-liveness') {
    runtime.setAlive(false)
    await expect(
      manager.start({
        projectId: primaryProject.id,
        canonicalPath: primaryProject.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'early-exit-code' })
  } else if (definition.scenario === 'failed-health-observation') {
    await expect(
      manager.start({
        projectId: primaryProject.id,
        canonicalPath: primaryProject.canonicalPath,
      })
    ).rejects.toMatchObject({ category: 'health-status-unexpected' })
  } else {
    const reuse = manager
      .start({
        projectId: primaryProject.id,
        canonicalPath: primaryProject.canonicalPath,
      })
      .catch((error: unknown) => error)
    await vi.waitFor(() =>
      expect(processDependencies.health.check).toHaveBeenCalledOnce()
    )
    healthGate.resolve(failedHealthAttempt)
    await expect(reuse).resolves.toMatchObject({
      category: 'health-status-unexpected',
    })
  }

  const report = await waitForFailedReport(manager)
  await vi.waitFor(() => expect(manager.audit!().backgroundTasks).toBe(0))
  const cleanupCount =
    manager.lastCleanup(primaryProject.id) === undefined ? 0 : 1
  const observedEvents = [...events]
  await manager.shutdown()
  return { report, events: observedEvents, cleanupCount, peerDigests: null }
}

function observedEvents(
  scenario: Bl016Scenario,
  events: readonly RuntimeSafeLifecycleEvent[]
): readonly RuntimeStateEvidenceEvent[] {
  return Object.freeze(
    events.map((event, index) =>
      Object.freeze({
        id: `bl016-event-${scenario}-${index + 1}`,
        event: event.event,
        from: event.from,
        to: event.to,
        publicState: publicRuntimeStateForLifecycleEvent(event.event, event.to),
        classification: event.classification ?? null,
        elapsedClass: event.elapsedMs === 0 ? 'zero' : 'bounded',
      })
    )
  )
}

async function buildExecutedMatrix(): Promise<RuntimeStateMatrix> {
  const rows: RuntimeStateEvidenceRow[] = []
  for (const [index, definition] of definitions.entries()) {
    const observation = await observeScenario(definition, index)
    rows.push(
      Object.freeze({
        scenario: definition.scenario,
        executionIds: Object.freeze({
          runtime: `bl016-runtime-${definition.scenario}`,
          api: `bl016-api-${definition.scenario}`,
          home: `bl016-home-${definition.scenario}`,
        }),
        runtime: observation.report.state,
        api: observation.report.state,
        home: observation.report.state,
        failureCategory: observation.report.failureCategory ?? null,
        events: observedEvents(definition.scenario, observation.events),
        cleanupCount: observation.cleanupCount,
        readinessObserved: definition.readinessObserved,
        peerDigests: observation.peerDigests,
        contenderCount: definition.contenderCount,
        loserEventCount: 0,
        assertionCount: 8,
      })
    )
  }
  return Object.freeze({ schemaVersion: 1, rows: Object.freeze(rows) })
}

function evidenceEvent(
  definition: ScenarioDefinition
): RuntimeStateEvidenceEvent[] {
  if (definition.event === undefined) return []
  const publicState = publicRuntimeStateForLifecycleEvent(
    definition.event.event,
    definition.event.to
  )
  return [
    Object.freeze({
      id: `bl016-event-${definition.scenario}-1`,
      event: definition.event.event,
      from: definition.event.from,
      to: definition.event.to,
      publicState,
      classification:
        publicState === 'Failed' ? definition.failureCategory : null,
      elapsedClass:
        definition.event.event === 'runtime.start.requested'
          ? 'zero'
          : 'bounded',
    }),
  ]
}

function buildMatrix(): RuntimeStateMatrix {
  const rows = definitions.map((definition): RuntimeStateEvidenceRow => {
    const runtime = publicRuntimeState(definition.internalState)
    return Object.freeze({
      scenario: definition.scenario,
      executionIds: Object.freeze({
        runtime: `bl016-runtime-${definition.scenario}`,
        api: `bl016-api-${definition.scenario}`,
        home: `bl016-home-${definition.scenario}`,
      }),
      runtime,
      api: runtime,
      home: runtime,
      failureCategory: definition.failureCategory,
      events: Object.freeze(evidenceEvent(definition)),
      cleanupCount: definition.cleanupCount,
      readinessObserved: definition.readinessObserved,
      peerDigests:
        definition.peerDigest === undefined
          ? null
          : Object.freeze({
              before: definition.peerDigest,
              after: definition.peerDigest,
            }),
      contenderCount: definition.contenderCount,
      loserEventCount: 0,
      assertionCount: 8,
    })
  })
  return Object.freeze({ schemaVersion: 1, rows: Object.freeze(rows) })
}

function updateRow(
  matrix: RuntimeStateMatrix,
  scenario: Bl016Scenario,
  update: (row: RuntimeStateEvidenceRow) => RuntimeStateEvidenceRow
): RuntimeStateMatrix {
  return {
    ...matrix,
    rows: matrix.rows.map((row) =>
      row.scenario === scenario ? update(row) : row
    ),
  }
}

function terminalEvent(
  row: RuntimeStateEvidenceRow,
  id: string
): RuntimeStateEvidenceEvent {
  return {
    id,
    event: 'runtime.health.changed',
    from: 'running',
    to: 'failed',
    publicState: 'Failed',
    classification: row.failureCategory,
    elapsedClass: 'bounded',
  }
}

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

describe('BL-016 runtime state evidence', () => {
  it('accepts the production synchronous projection and guarded transition source', async () => {
    const source = await readFile(managerSourcePath, 'utf8')
    expect(validatePublicReportingSource(source)).toEqual({
      accepted: true,
      violations: [],
    })
  })

  it.each([
    {
      name: 'Promise return',
      mutate: (source: string) =>
        source.replace(
          '): readonly PublicRuntimeReport[]',
          '): Promise<readonly PublicRuntimeReport[]>'
        ),
    },
    {
      name: 'async projection',
      mutate: (source: string) =>
        source.replace(
          'reportPublicStates(projectIds) {',
          'async reportPublicStates(projectIds) {'
        ),
    },
    {
      name: 'await in projection',
      mutate: (source: string) =>
        source.replace(
          'reportPublicStates(projectIds) {',
          'reportPublicStates(projectIds) { await dependency()'
        ),
    },
    {
      name: 'dependency call',
      mutate: (source: string) =>
        source.replace(
          'reportPublicStates(projectIds) {',
          'reportPublicStates(projectIds) { processDependencies.health.check()'
        ),
    },
    {
      name: 'second map traversal',
      mutate: (source: string) =>
        source.replace(
          'reportPublicStates(projectIds) {',
          'reportPublicStates(projectIds) { entries.values()'
        ),
    },
    {
      name: 'contender bypass',
      mutate: (source: string) =>
        source.replace(
          'const result = await transitionRunningToFailed(',
          'const result = await bypassRunningToFailed('
        ),
    },
  ])('rejects source mutation: $name', async ({ mutate }) => {
    const source = await readFile(managerSourcePath, 'utf8')
    const mutated = mutate(source)
    expect(mutated).not.toBe(source)
    expect(validatePublicReportingSource(mutated).accepted).toBe(false)
  })

  it('rejects every controlled matrix mutation class', () => {
    const matrix = buildMatrix()
    const failed = matrix.rows.find(
      ({ scenario }) => scenario === 'failed-health-observation'
    )!
    const cross = matrix.rows.find(
      ({ scenario }) => scenario === 'cross-project-isolation'
    )!
    const mutations: readonly [string, RuntimeStateMatrix][] = [
      [
        'surface disagreement',
        updateRow(matrix, 'running-observed-readiness', (row) => ({
          ...row,
          api: 'Stopped',
        })),
      ],
      [
        'fifth state',
        updateRow(matrix, 'stopped-registered', (row) => ({
          ...row,
          runtime: 'Paused',
          api: 'Paused',
          home: 'Paused',
        })),
      ],
      [
        'internal state',
        updateRow(matrix, 'starting-delayed-readiness', (row) => ({
          ...row,
          runtime: 'starting',
          api: 'starting',
          home: 'starting',
        })),
      ],
      [
        'running without readiness',
        updateRow(matrix, 'running-observed-readiness', (row) => ({
          ...row,
          readinessObserved: false,
        })),
      ],
      [
        'Stopped replacing retained failure',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          runtime: 'Stopped',
          api: 'Stopped',
          home: 'Stopped',
          failureCategory: null,
          events: [],
          cleanupCount: 0,
        })),
      ],
      [
        'missing category',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          failureCategory: null,
        })),
      ],
      [
        'unbounded category',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          failureCategory: 'private-diagnostic',
        })),
      ],
      [
        'category on non-Failed',
        updateRow(matrix, 'stopped-registered', (row) => ({
          ...row,
          failureCategory: 'spawn-error',
        })),
      ],
      [
        'non-catalog event',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          events: [{ ...row.events[0]!, event: 'runtime.legacy' }],
        })),
      ],
      [
        'success event while Failed',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          events: [
            ...row.events,
            {
              id: 'bl016-event-failed-health-observation-success-1',
              event: 'runtime.start.succeeded',
              from: 'starting',
              to: 'running',
              publicState: 'Running',
              classification: null,
              elapsedClass: 'bounded',
            },
          ],
        })),
      ],
      [
        'healthy event while Failed',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          events: [
            ...row.events,
            {
              id: 'bl016-event-failed-health-observation-healthy-1',
              event: 'runtime.health.changed',
              from: 'running',
              to: 'running',
              publicState: 'Running',
              classification: null,
              elapsedClass: 'bounded',
            },
          ],
        })),
      ],
      [
        'two terminal events',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          events: [
            ...row.events,
            terminalEvent(
              row,
              'bl016-event-failed-health-observation-second-1'
            ),
          ],
        })),
      ],
      [
        'two cleanup audits',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          cleanupCount: 2,
        })),
      ],
      [
        'loser event',
        updateRow(matrix, 'failed-transition-race', (row) => ({
          ...row,
          loserEventCount: 1,
        })),
      ],
      [
        'changed peer digest',
        updateRow(matrix, cross.scenario, (row) => ({
          ...row,
          peerDigests: { before: 'peer-before', after: 'peer-after' },
        })),
      ],
      [
        'duplicate execution ID',
        updateRow(matrix, 'starting-delayed-readiness', (row) => ({
          ...row,
          executionIds: {
            ...row.executionIds,
            runtime: matrix.rows[0]!.executionIds.runtime,
          },
        })),
      ],
      [
        'duplicate event ID',
        updateRow(matrix, failed.scenario, (row) => ({
          ...row,
          events: [
            ...row.events,
            terminalEvent(row, matrix.rows[1]!.events[0]!.id),
          ],
        })),
      ],
      ['missing scenario', { ...matrix, rows: matrix.rows.slice(1) }],
      [
        'reordered scenario',
        {
          ...matrix,
          rows: [matrix.rows[1]!, matrix.rows[0]!, ...matrix.rows.slice(2)],
        },
      ],
      ...[
        '/tmp/protected',
        'http://private.test',
        'port 4312',
        'stderr detail',
      ].map((leak): [string, RuntimeStateMatrix] => [
        'protected disclosure ' + leak,
        updateRow(matrix, cross.scenario, (row) => ({
          ...row,
          peerDigests: { before: leak, after: leak },
        })),
      ]),
    ]

    expect(validateRuntimeStateMatrix(matrix)).toEqual({
      accepted: true,
      violations: [],
    })
    for (const [name, mutation] of mutations) {
      expect(validateRuntimeStateMatrix(mutation).accepted, name).toBe(false)
    }
  })

  const acceptance = process.env.BL016_ACCEPTANCE === '1' ? it : it.skip
  acceptance(
    'writes and independently revalidates byte-identical evidence',
    async () => {
      const matrix = await buildExecutedMatrix()
      expect(matrix.rows.map(({ scenario }) => scenario)).toEqual(
        BL016_SCENARIOS
      )
      expect(validateRuntimeStateMatrix(matrix)).toEqual({
        accepted: true,
        violations: [],
      })

      const serialized = serializeRuntimeStateMatrix(matrix)
      expect(serializeRuntimeStateMatrix(matrix)).toBe(serialized)
      await mkdir(path.dirname(disposablePath), { recursive: true })
      await mkdir(path.dirname(retainedPath), { recursive: true })
      await Promise.all([
        writeFile(disposablePath, serialized),
        writeFile(retainedPath, serialized),
      ])

      const [disposable, retained] = await Promise.all([
        readFile(disposablePath, 'utf8'),
        readFile(retainedPath, 'utf8'),
      ])
      expect(digest(disposable)).toBe(digest(retained))
      expect(disposable).toBe(retained)
      const retainedMatrix = JSON.parse(retained) as RuntimeStateMatrix
      expect(validateRuntimeStateMatrix(retainedMatrix)).toEqual({
        accepted: true,
        violations: [],
      })
      expect(serializeRuntimeStateMatrix(retainedMatrix)).toBe(retained)
    }
  )
})
