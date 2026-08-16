import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BL019_EPISODE_PHASES,
  BL019_MUTATION_CLASSES,
  BL019_SOURCE_GUARD_CODES,
  validateReconcileEpisode,
  validateRuntimeReconcileMatrix,
  validateSelectedReconcileSource,
  type Bl019SourceGuardCode,
  type ReconcileApiGeneration,
  type ReconcileEpisode,
  type ReconcileEpisodeTeardown,
  type RuntimeReconcileEvidenceProject,
  type RuntimeReconcileEvidenceRow,
  type RuntimeReconcileMatrix,
  type SelectedReconcileSources,
} from '../src/runtime-reconcile-evidence.js'
import { buildRuntimeReconcileMatrix } from './runtime-reconcile-fixtures.js'

const root = path.resolve(import.meta.dirname, '../../..')
const source = (relative: string): Promise<string> =>
  readFile(path.join(root, relative), 'utf8')
const sources = async (): Promise<SelectedReconcileSources> => {
  const [
    contract,
    process_,
    manager,
    app,
    stopRoute,
    restartRoute,
    workbenchContract,
    webState,
    webStop,
    webRestart,
    matrixFixtures,
    designated,
    controlWitness,
  ] = await Promise.all([
    source('apps/api/src/project-runtime-contract.ts'),
    source('apps/api/src/project-runtime-process.ts'),
    source('apps/api/src/project-runtime-manager.ts'),
    source('apps/api/src/app.ts'),
    source('apps/api/src/routes/project-runtime-stop.ts'),
    source('apps/api/src/routes/project-runtime-restart.ts'),
    source('apps/api/src/workbench-proxy-contract.ts'),
    source('apps/web/src/runtime-state.ts'),
    source('apps/web/src/runtime-stop.ts'),
    source('apps/web/src/runtime-restart.ts'),
    source('apps/api/test/runtime-reconcile-fixtures.ts'),
    source('apps/api/test/runtime-reconcile-designated.test.ts'),
    source('apps/api/test/runtime-reconcile-control-witness.ts'),
  ])
  return {
    contract,
    process: process_,
    manager,
    app,
    stopRoute,
    restartRoute,
    workbenchContract,
    webState,
    webStop,
    webRestart,
    matrixFixtures,
    designated,
    controlWitness,
  }
}

const mutateRow = (
  matrix: RuntimeReconcileMatrix,
  id: RuntimeReconcileEvidenceRow['id'],
  changes: Partial<RuntimeReconcileEvidenceRow>
): RuntimeReconcileMatrix => ({
  ...matrix,
  rows: matrix.rows.map((row) =>
    row.id === id ? { ...row, ...changes } : row
  ),
})
const mutateProject = (
  matrix: RuntimeReconcileMatrix,
  id: RuntimeReconcileEvidenceRow['id'],
  changes: Partial<RuntimeReconcileEvidenceProject>
): RuntimeReconcileMatrix => ({
  ...matrix,
  rows: matrix.rows.map((row) =>
    row.id === id
      ? {
          ...row,
          projects: row.projects.map((project, index) =>
            index === 0 ? { ...project, ...changes } : project
          ),
        }
      : row
  ),
})

describe('BL-019 reconciliation evidence source guards', () => {
  it('accepts thirteen production sources and declares twenty guards', async () => {
    expect(BL019_SOURCE_GUARD_CODES).toHaveLength(20)
    expect(Object.keys(await sources())).toHaveLength(13)
    expect(validateSelectedReconcileSource(await sources())).toEqual({
      accepted: true,
      violations: [],
    })
  })

  it('rejects one targeted negative control for every guard', async () => {
    const baseline = await sources()
    const corruptions: Readonly<
      Record<Bl019SourceGuardCode, SelectedReconcileSources>
    > = {
      'reconcile-deadline-trusted-scheduler': {
        ...baseline,
        manager: baseline.manager.replaceAll(
          'deadlineScheduler.scheduleDeadline',
          'untrustedDeadline'
        ),
      },
      'reconcile-bound-origin-arithmetic': {
        ...baseline,
        contract: baseline.contract.replaceAll(
          'config.reconcileStartupHeadroomMs +',
          '1 +'
        ),
      },
      'reconcile-no-signal-before-adoption': {
        ...baseline,
        manager: baseline.manager + '\nsignalProcessGroup(input.candidate.pid)',
      },
      'reconcile-conjunctive-attribution': {
        ...baseline,
        manager: baseline.manager.replace(
          'candidateIdentity.uid !== currentUid',
          'false'
        ),
      },
      'reconcile-launcher-prefix-derived': {
        ...baseline,
        manager:
          baseline.manager + '\ncandidateArgv[0] !== config.executablePath',
      },
      'reconcile-identity-reread': {
        ...baseline,
        manager: baseline.manager.replace(
          'const second = await runReconciliationBounded',
          'const later = await runReconciliationBounded'
        ),
      },
      'reconcile-listener-group-scoped': {
        ...baseline,
        process: baseline.process.replaceAll(
          'resolveGroupListenerOwner',
          'resolveLeaderListenerOwner'
        ),
      },
      'reconcile-absence-requires-complete-scan': {
        ...baseline,
        manager: baseline.manager.replace(
          'if (discovery.value.complete)',
          'if (true)'
        ),
      },
      'reconcile-startup-required': {
        ...baseline,
        app: baseline.app.replace(
          'await runtimeManager.beginReconciliation()',
          'await runtimeManager.beginReconciliation?.()'
        ),
      },
      'reconcile-blocked-start-refuses-launch': {
        ...baseline,
        manager: baseline.manager.replaceAll(
          "current.failure.category === 'reconcile-unconfirmed'",
          'false'
        ),
      },
      'reconcile-blocked-controls-reject': {
        ...baseline,
        manager: baseline.manager.replaceAll(
          "category: 'reconcile-unresolved'",
          "category: 'failure-retained'"
        ),
      },
      'reconcile-pending-controls-reject': {
        ...baseline,
        manager: baseline.manager.replaceAll(
          "category: 'reconcile-in-progress'",
          "category: 'start-in-progress'"
        ),
      },
      'reconcile-no-lifecycle-success-fabrication': {
        ...baseline,
        manager: baseline.manager.replace(
          "input.outcome === 'adopted'",
          'false'
        ),
      },
      'reconcile-no-adopted-exit-task': {
        ...baseline,
        manager: baseline.manager.replace(
          'const observeReconciliation',
          'backgroundTasks.add(process.exit)\n  const observeReconciliation'
        ),
      },
      'reconcile-shutdown-aborts': {
        ...baseline,
        manager: baseline.manager.replace(
          "settlePendingReconciliations('manager-shutdown')",
          "settlePendingReconciliations('deadline-exceeded')"
        ),
      },
      'runtime-child-stderr-file-fd': {
        ...baseline,
        process: baseline.process.replace(
          "stdio: ['ignore', 'ignore', stderrHandle.fd]",
          "stdio: ['ignore', 'ignore', 'pipe']"
        ),
      },
      'reconcile-no-persisted-runtime-state': {
        ...baseline,
        manager: baseline.manager + '\npersistReconciliation()',
      },
      'reconcile-privacy-public-surfaces': {
        ...baseline,
        workbenchContract: baseline.workbenchContract.replaceAll(
          'workbench_reconcile_unconfirmed',
          'private_runtime_detail'
        ),
      },
      'reconcile-matrix-observed-rows': {
        ...baseline,
        matrixFixtures:
          baseline.matrixFixtures + "\nconst expected = 'adopted'",
      },
      'reconcile-designated-real-api': {
        ...baseline,
        designated: baseline.designated.replaceAll(
          'API_COMPILED_ENTRY',
          'PLACEHOLDER_ENTRY'
        ),
      },
    }
    for (const code of BL019_SOURCE_GUARD_CODES)
      expect(
        validateSelectedReconcileSource(corruptions[code]).violations
      ).toContain(code)
  })
})

describe('BL-019 matrix mutation classes', () => {
  it('rejects all twelve independently named mutation classes', async () => {
    const baseline = await buildRuntimeReconcileMatrix()
    const adopted = baseline.rows.find(({ id }) => id === 'S-03')!
    const mutations: Readonly<
      Record<(typeof BL019_MUTATION_CLASSES)[number], RuntimeReconcileMatrix>
    > = {
      'M-1': { ...baseline, rows: baseline.rows.slice(1) },
      'M-2': mutateProject(baseline, 'S-06', { publicState: 'Running' }),
      'M-3': mutateProject(baseline, 'S-07', { refusalReason: null }),
      'M-4': mutateRow(baseline, 'S-03', { residualCount: 0 }),
      'M-5': mutateRow(baseline, 'S-03', { elapsedMs: 0 }),
      'M-6': mutateRow(baseline, 'S-03', {
        eventCount: adopted.eventCount + 1,
      }),
      'M-7': mutateRow(baseline, 'S-03', { outcome: 'absent' }),
      'M-8': {
        ...baseline,
        privacy: { ...baseline.privacy, matches: ['protected-value'] },
      },
      'M-9': mutateProject(baseline, 'S-03', { listenerAttributed: 0 }),
      'M-10': mutateRow(baseline, 'S-03', { boundMs: 15_000 }),
      'M-11': mutateRow(baseline, 'S-58', { adoptedLiveness: 'alive' }),
      'M-12': mutateRow(baseline, 'S-03', {
        execution: {
          ...adopted.execution,
          probeHealthByProject: {},
        },
      }),
    }
    for (const mutation of BL019_MUTATION_CLASSES)
      expect(
        validateRuntimeReconcileMatrix(mutations[mutation]).violations
      ).toContain(mutation)
  })

  it('rejects project-keyed readiness swaps, missing keys, and class violations', async () => {
    const baseline = await buildRuntimeReconcileMatrix()
    const mixed = baseline.rows.find(({ id }) => id === 'S-57')!
    const [first, second] = mixed.projects
    const valid = mixed.execution.probeHealthByProject
    expect(valid[first!.projectToken]).toBeGreaterThanOrEqual(1)
    expect(valid[second!.projectToken]).toBe(0)
    const corruptions = [
      {
        [first!.projectToken]: valid[second!.projectToken]!,
        [second!.projectToken]: valid[first!.projectToken]!,
      },
      { [first!.projectToken]: valid[first!.projectToken]! },
      { ...valid, 'bl019-project-foreign': 0 },
      { ...valid, [second!.projectToken]: 1 },
      { ...valid, [first!.projectToken]: 0 },
    ]
    for (const probeHealthByProject of corruptions) {
      const mutated = mutateRow(baseline, 'S-57', {
        execution: { ...mixed.execution, probeHealthByProject },
      })
      expect(validateRuntimeReconcileMatrix(mutated).violations).toContain(
        'M-12'
      )
    }
  })
})

const probe = (residual: number | null, probeCompleted = true) => ({
  probeCompleted,
  residual,
})
const teardown = (
  status: ReconcileEpisodeTeardown['status'],
  residual = 0,
  complete = true
): ReconcileEpisodeTeardown => ({
  status,
  probes: {
    apiProcesses: probe(residual, complete),
    workbenchProcesses: probe(0),
    attributableDescendants: probe(0),
    listeners: probe(0),
    activeRequests: probe(0),
    disposableFixtures: probe(0),
  },
})

const generation = (name: string): ReconcileApiGeneration => ({
  generation: name,
  pid: 10_001,
  processStartTime: 'start-10001',
  argv: ['/usr/bin/node', '/repo/apps/api/dist/server.js'],
  listenerPort: 31_001,
  listenerInode: '101',
  listenerOwnerPid: 10_001,
  httpRequests: { issued: 1, succeeded: 1 },
  database: {
    path: '/tmp/bl019.sqlite',
    bytes: 1,
    projectRowsObserved: 0,
  },
  boundMs: 15_000,
  settlementElapsedMs: 1,
  pendingObserved: false,
})

const episode = (): ReconcileEpisode => ({
  schemaVersion: 1,
  measurementOrigin: 'api-process-spawn',
  phaseOrder: BL019_EPISODE_PHASES,
  startupControl: {
    boundMs: 4_000,
    spawnToFirstResponseMs: 1,
    created: 0,
    signalsSent: 0,
    generation: generation('startup'),
  },
  controlSubepisode: {
    generations: [generation('C0'), generation('C1')],
    controls: [
      {
        listenerPort: null,
        id: 'C-1',
        identity: { pid: 20_001, processStartTime: 'start-20001' },
        markers: { pathMarker: 'project-one', tokenMarker: null },
        candidateCountForItsProject: 1,
        settledPublicState: 'Failed',
        publicFailureCategory: 'reconcile-unconfirmed',
        declaredRefusalReason: 'launcher-prefix-mismatch',
        observedRefusalReason: 'launcher-prefix-mismatch',
        acquisitionStatus: 503,
        stopStatus: 409,
        restartStatus: 409,
        lifecycleEvents: 0,
        launches: 0,
        signalsSent: 0,
        observedAlive: true,
        adopted: false,
        identityUnchangedBeforeTeardown: true,
      },
    ],
    residuals: {
      controlProcesses: probe(0),
      apiProcesses: probe(0),
      listeners: probe(0),
      runtimeDataPaths: probe(0),
      disposableFixtures: probe(0),
    },
    teardown: { status: 'proven-clear' },
    clearedBeforePhase: 'P0d',
  },
  apiGenerations: [generation('0')],
  workbenches: [],
  controls: [
    {
      id: 'C-2',
      identity: { pid: 20_002, processStartTime: 'start-20002' },
      listenerPort: 32_002,
      markers: { pathMarker: null, tokenMarker: null },
      observedAlive: true,
      adopted: false,
      signalsSent: 0,
    },
  ],
  activeRequests: [],
  disposablePaths: ['/tmp/bl019'],
  residualCount: null,
  teardown: teardown('proven-clear'),
})

describe('BL-019 episode authenticity and teardown evidence', () => {
  it('accepts the complete observed episode and classifies teardown failures', () => {
    expect(validateReconcileEpisode(episode())).toEqual({
      accepted: true,
      violations: [],
    })
    expect(
      validateReconcileEpisode({ ...episode(), teardown: null }).violations
    ).toContain('teardown-null')
    expect(
      validateReconcileEpisode({
        ...episode(),
        teardown: teardown('unproven', 0, false),
      }).violations
    ).toContain('teardown-unproven')
    expect(
      validateReconcileEpisode({
        ...episode(),
        teardown: teardown('residual-present', 1),
      }).violations
    ).toContain('teardown-residual-present')
  })

  it('rejects each authentic-generation, control-isolation, and phase defect by name', () => {
    const baseline = episode()
    const baseGeneration = baseline.apiGenerations[0]!
    const control = baseline.controlSubepisode!.controls[0]!
    const cases: readonly [string, ReconcileEpisode][] = [
      [
        'generation-not-compiled-api',
        {
          ...baseline,
          apiGenerations: [
            {
              ...baseGeneration,
              argv: ['/usr/bin/node', '/tmp/placeholder.js'],
            },
          ],
        },
      ],
      [
        'generation-eval-spawn',
        {
          ...baseline,
          apiGenerations: [
            { ...baseGeneration, argv: ['/usr/bin/node', '-e', 'void 0'] },
          ],
        },
      ],
      [
        'generation-listener-unobserved',
        {
          ...baseline,
          apiGenerations: [
            { ...baseGeneration, listenerOwnerPid: baseGeneration.pid + 1 },
          ],
        },
      ],
      [
        'generation-http-absent',
        {
          ...baseline,
          apiGenerations: [
            { ...baseGeneration, httpRequests: { issued: 1, succeeded: 0 } },
          ],
        },
      ],
      [
        'generation-database-unobserved',
        {
          ...baseline,
          apiGenerations: [
            {
              ...baseGeneration,
              database: { ...baseGeneration.database, bytes: 0 },
            },
          ],
        },
      ],
      ['control-subepisode-missing', { ...baseline, controlSubepisode: null }],
      [
        'control-not-sole-candidate',
        {
          ...baseline,
          controlSubepisode: {
            ...baseline.controlSubepisode!,
            controls: [{ ...control, candidateCountForItsProject: 2 }],
          },
        },
      ],
      [
        'control-settlement-mismatch',
        {
          ...baseline,
          controlSubepisode: {
            ...baseline.controlSubepisode!,
            controls: [{ ...control, settledPublicState: 'Running' }],
          },
        },
      ],
      [
        'control-signalled',
        {
          ...baseline,
          controlSubepisode: {
            ...baseline.controlSubepisode!,
            controls: [{ ...control, signalsSent: 1 }],
          },
        },
      ],
      [
        'control-not-cleared-before-main-episode',
        {
          ...baseline,
          controlSubepisode: {
            ...baseline.controlSubepisode!,
            clearedBeforePhase: 'P7',
          },
        },
      ],
      [
        'main-episode-control-candidate-bearing',
        {
          ...baseline,
          controls: [
            {
              ...baseline.controls[0]!,
              markers: { pathMarker: 'foreign', tokenMarker: null },
            },
          ],
        },
      ],
      [
        'phase-order-mismatch',
        { ...baseline, phaseOrder: BL019_EPISODE_PHASES.slice(0, -1) },
      ],
    ]
    for (const [reason, artifact] of cases)
      expect(validateReconcileEpisode(artifact).violations).toContain(reason)
  })
})
