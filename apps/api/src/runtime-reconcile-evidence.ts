import {
  PUBLIC_RUNTIME_STATES,
  RECONCILE_ABSENCE_PROOFS,
  RECONCILE_OUTCOMES,
  RECONCILE_REFUSAL_REASONS,
  type PublicRuntimeState,
  type ReconcileAbsenceProof,
  type ReconcileOutcome,
  type ReconcileRefusalReason,
  type ReconciliationInspection,
} from './project-runtime-contract.js'

export const BL019_SCENARIOS = Object.freeze([
  'S-01',
  'S-02',
  'S-03',
  'S-04',
  'S-05',
  'S-06',
  'S-07',
  'S-08',
  'S-09',
  'S-10',
  'S-11',
  'S-12',
  'S-13',
  'S-14',
  'S-15',
  'S-16',
  'S-17',
  'S-18',
  'S-19',
  'S-20',
  'S-21',
  'S-22',
  'S-23',
  'S-24',
  'S-25',
  'S-26',
  'S-27',
  'S-28',
  'S-29',
  'S-30',
  'S-31',
  'S-32',
  'S-33',
  'S-34',
  'S-35',
  'S-36',
  'S-37',
  'S-38',
  'S-39',
  'S-40',
  'S-41',
  'S-42',
  'S-43',
  'S-44',
  'S-45',
  'S-46',
  'S-47',
  'S-48',
  'S-49',
  'S-50',
  'S-51',
  'S-52',
  'S-53',
  'S-54',
  'S-55',
  'S-56',
  'S-57',
  'S-58',
  'S-59',
  'S-60',
  'S-61',
  'S-62',
  'S-63',
  'S-64',
  'S-65',
  'S-66',
] as const)
export type Bl019Scenario = (typeof BL019_SCENARIOS)[number]

export const BL019_SCENARIO_ACS: Readonly<
  Record<Bl019Scenario, readonly string[]>
> = Object.freeze({
  'S-01': Object.freeze(['AC-9', 'AC-18']),
  'S-02': Object.freeze(['AC-3', 'AC-9']),
  'S-03': Object.freeze(['AC-1', 'AC-3']),
  'S-04': Object.freeze(['AC-1', 'AC-16']),
  'S-05': Object.freeze(['AC-1']),
  'S-06': Object.freeze(['AC-3']),
  'S-07': Object.freeze(['AC-10']),
  'S-08': Object.freeze(['AC-10', 'AC-12']),
  'S-09': Object.freeze(['AC-10', 'AC-12']),
  'S-10': Object.freeze(['AC-10', 'AC-12']),
  'S-11': Object.freeze(['AC-10', 'AC-12']),
  'S-12': Object.freeze(['AC-10', 'AC-12']),
  'S-13': Object.freeze(['AC-10', 'AC-12']),
  'S-14': Object.freeze(['AC-10', 'AC-12']),
  'S-15': Object.freeze(['AC-10', 'AC-12']),
  'S-16': Object.freeze(['AC-10', 'AC-12']),
  'S-17': Object.freeze(['AC-10', 'AC-12']),
  'S-18': Object.freeze(['AC-10', 'AC-12']),
  'S-19': Object.freeze(['AC-10', 'AC-12']),
  'S-20': Object.freeze(['AC-3', 'AC-10', 'AC-12']),
  'S-21': Object.freeze(['AC-10', 'AC-12']),
  'S-22': Object.freeze(['AC-3', 'AC-10', 'AC-12']),
  'S-23': Object.freeze(['AC-10', 'AC-11']),
  'S-24': Object.freeze(['AC-10', 'AC-11']),
  'S-25': Object.freeze(['AC-10', 'AC-11']),
  'S-26': Object.freeze(['AC-3', 'AC-10', 'AC-11']),
  'S-27': Object.freeze(['AC-3', 'AC-6']),
  'S-28': Object.freeze(['AC-1', 'AC-10']),
  'S-29': Object.freeze(['AC-3', 'AC-8']),
  'S-30': Object.freeze(['AC-8']),
  'S-31': Object.freeze(['AC-8']),
  'S-32': Object.freeze(['AC-2', 'AC-8']),
  'S-33': Object.freeze(['AC-13']),
  'S-34': Object.freeze(['AC-9']),
  'S-35': Object.freeze(['AC-10', 'AC-13']),
  'S-36': Object.freeze(['AC-2']),
  'S-37': Object.freeze(['AC-2', 'AC-10']),
  'S-38': Object.freeze(['AC-9']),
  'S-39': Object.freeze(['AC-14']),
  'S-40': Object.freeze(['AC-14']),
  'S-41': Object.freeze(['AC-10', 'AC-14']),
  'S-42': Object.freeze(['AC-10', 'AC-14']),
  'S-43': Object.freeze(['AC-4']),
  'S-44': Object.freeze(['AC-5']),
  'S-45': Object.freeze(['AC-4', 'AC-16']),
  'S-46': Object.freeze(['AC-14']),
  'S-47': Object.freeze(['AC-14', 'AC-16']),
  'S-48': Object.freeze(['AC-1', 'AC-18']),
  'S-49': Object.freeze(['AC-15']),
  'S-50': Object.freeze(['AC-15']),
  'S-51': Object.freeze(['AC-15']),
  'S-52': Object.freeze(['AC-15']),
  'S-53': Object.freeze(['AC-17']),
  'S-54': Object.freeze(['AC-17']),
  'S-55': Object.freeze(['AC-17']),
  'S-56': Object.freeze(['AC-6']),
  'S-57': Object.freeze(['AC-16']),
  'S-58': Object.freeze(['AC-3', 'AC-8']),
  'S-59': Object.freeze(['AC-3', 'AC-8']),
  'S-60': Object.freeze(['AC-4']),
  'S-61': Object.freeze(['AC-5']),
  'S-62': Object.freeze(['AC-12']),
  'S-63': Object.freeze(['AC-7']),
  'S-64': Object.freeze(['AC-7']),
  'S-65': Object.freeze(['AC-7']),
  'S-66': Object.freeze(['AC-7']),
})

export const BL019_ELAPSED_CLASSES = Object.freeze([
  'within-bound',
  'over-bound',
] as const)
export const BL019_OUTCOMES = RECONCILE_OUTCOMES
export const BL019_REFUSAL_REASONS = RECONCILE_REFUSAL_REASONS
export const BL019_ABSENCE_PROOFS = RECONCILE_ABSENCE_PROOFS

export const BL019_DECLARED_BOUNDS = Object.freeze({
  reconcileScanAllowanceMs: 2_000,
  reconcileAttributionAllowanceMs: 1_000,
  reconcileReadinessBoundMs: 7_000,
  reconcileSettlementAllowanceMs: 1_000,
  reconcileStartupHeadroomMs: 3_000,
  reconcileResponseAllowanceMs: 1_000,
  reconciliationOverallBoundMs: 11_000,
  reconciliationStartupControlBoundMs: 4_000,
  reconciliationEndToEndBoundMs: 15_000,
  workbenchAcquisitionBoundMs: 60_000,
  acquisitionAcrossReconciliationBoundMs: 71_000,
  runtimeStopOverallBoundMs: 5_000,
  runtimeRestartOverallBoundMs: 66_000,
})

export const BL019_SOURCE_GUARD_CODES = Object.freeze([
  'reconcile-deadline-trusted-scheduler',
  'reconcile-bound-origin-arithmetic',
  'reconcile-no-signal-before-adoption',
  'reconcile-conjunctive-attribution',
  'reconcile-launcher-prefix-derived',
  'reconcile-identity-reread',
  'reconcile-listener-group-scoped',
  'reconcile-absence-requires-complete-scan',
  'reconcile-startup-required',
  'reconcile-blocked-start-refuses-launch',
  'reconcile-blocked-controls-reject',
  'reconcile-pending-controls-reject',
  'reconcile-no-lifecycle-success-fabrication',
  'reconcile-no-adopted-exit-task',
  'reconcile-shutdown-aborts',
  'runtime-child-stderr-file-fd',
  'reconcile-no-persisted-runtime-state',
  'reconcile-privacy-public-surfaces',
  'reconcile-matrix-observed-rows',
  'reconcile-designated-real-api',
] as const)
export type Bl019SourceGuardCode = (typeof BL019_SOURCE_GUARD_CODES)[number]

export const BL019_MUTATION_CLASSES = Object.freeze([
  'M-1',
  'M-2',
  'M-3',
  'M-4',
  'M-5',
  'M-6',
  'M-7',
  'M-8',
  'M-9',
  'M-10',
  'M-11',
  'M-12',
] as const)

export const BL019_PRESERVED_EVIDENCE = Object.freeze([
  Object.freeze({
    issue: 'BL-017',
    path: 'project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json',
    sha256: 'c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3',
  }),
  Object.freeze({
    issue: 'BL-018',
    path: 'project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json',
    sha256: 'fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880',
  }),
])

export const BL019_EPISODE_PHASES = Object.freeze([
  'P0',
  'P0b',
  'P0c',
  'P0d',
  'P1',
  'P1b',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
  'P7',
  'P8',
  'P9',
  'P10',
  'P11',
  'P12',
  'P13',
] as const)

export const BL019_EPISODE_TEARDOWN_STATUSES = Object.freeze([
  'proven-clear',
  'unproven',
  'residual-present',
] as const)

export const BL019_EPISODE_REJECTION_REASONS = Object.freeze([
  'teardown-null',
  'teardown-unproven',
  'teardown-residual-present',
  'generation-not-compiled-api',
  'generation-eval-spawn',
  'generation-listener-unobserved',
  'generation-http-absent',
  'generation-database-unobserved',
  'control-subepisode-missing',
  'control-not-sole-candidate',
  'control-settlement-mismatch',
  'control-signalled',
  'control-not-cleared-before-main-episode',
  'main-episode-control-candidate-bearing',
  'phase-order-mismatch',
] as const)

export const BL019_PRIMITIVE_CALLS = Object.freeze([
  'resolveInstalledRuntimeIdentity',
  'listCandidatePids',
  'readProcessCommandLine',
  'readProcessAttributionIdentity',
  'readProcessGroupMemberPids',
  'readLoopbackListenerInode',
  'readProcessSocketInodes',
  'probeHealth',
] as const)
export type Bl019PrimitiveCall = (typeof BL019_PRIMITIVE_CALLS)[number]

export const BL019_OBSERVED_SOURCES = Object.freeze([
  'manager-inspection',
  'public-projection',
  'event-sink',
  'primitive-ledger',
  'injected-clock',
  'route-response',
  'proxy-publication',
] as const)
export type Bl019ObservedSource = (typeof BL019_OBSERVED_SOURCES)[number]

export interface RuntimeReconcileEvidenceIdentity {
  readonly preRestart: string | null
  readonly settled: string | null
  readonly unchanged: boolean | null
}

export interface RuntimeReconcileEvidenceProject {
  readonly projectToken: string
  readonly outcome: ReconcileOutcome | 'unsettled'
  readonly refusalReason: ReconcileRefusalReason | null
  readonly absenceProof: ReconcileAbsenceProof | null
  readonly publicState: PublicRuntimeState
  readonly postActionPublicState: PublicRuntimeState | null
  readonly publicFailureCategory: 'reconcile-unconfirmed' | null
  readonly identity: RuntimeReconcileEvidenceIdentity
  readonly listenerAttributed: 0 | 1
  readonly listenerOwner: 'group-leader' | 'group-member' | null
  readonly absenceProven: boolean
}

export interface RuntimeReconcileEvidenceEvent {
  readonly event: string
  readonly projectToken: string
  readonly from: string
  readonly to: string
  readonly classification?: string
}

export interface RuntimeReconcileExecution {
  readonly runId: string
  readonly managerInstances: number
  readonly primitiveCalls: Readonly<Record<Bl019PrimitiveCall, number>>
  readonly probeHealthByProject: Readonly<Record<string, number>>
  readonly projectionCalls: number
  readonly eventSinkWrites: number
  readonly observedFrom: readonly Bl019ObservedSource[]
}

export interface RuntimeReconcileEvidenceRow {
  readonly id: Bl019Scenario
  readonly name: string
  readonly acceptanceCriteria: readonly string[]
  readonly projects: readonly RuntimeReconcileEvidenceProject[]
  readonly outcome: ReconcileOutcome | 'mixed' | 'not-applicable'
  readonly publicStates: readonly PublicRuntimeState[]
  readonly declaredActions: readonly (
    'acquire' | 'stop' | 'restart' | 'shutdown'
  )[]
  readonly declaredKills: readonly string[]
  readonly adoptedLiveness:
    'not-applicable' | 'alive' | 'died-observed-stale' | 'died-corrected'
  readonly events: readonly RuntimeReconcileEvidenceEvent[]
  readonly eventCount: number
  readonly listeners: Readonly<{ attributed: number; accumulated: 0 }>
  readonly acquisitions: number
  readonly launches: number
  readonly signalsSent: number
  readonly signalsDelivered: number
  readonly elapsedMs: number
  readonly boundMs: number
  readonly elapsedClass: (typeof BL019_ELAPSED_CLASSES)[number]
  readonly absenceProven: boolean
  readonly residualCount: number | null
  readonly inspection: ReconciliationInspection | null
  readonly execution: RuntimeReconcileExecution
}

export interface RuntimeReconcileMatrix {
  readonly schemaVersion: 1
  readonly declaredBounds: typeof BL019_DECLARED_BOUNDS
  readonly vocabularies: Readonly<{
    outcomes: readonly string[]
    refusalReasons: readonly string[]
    absenceProofs: readonly string[]
    publicStates: readonly string[]
  }>
  readonly rows: readonly RuntimeReconcileEvidenceRow[]
  readonly privacy: Readonly<{
    declaredSources: readonly string[]
    matches: readonly string[]
  }>
}

export interface SelectedReconcileSources {
  readonly contract: string
  readonly process: string
  readonly manager: string
  readonly app: string
  readonly stopRoute: string
  readonly restartRoute: string
  readonly workbenchContract: string
  readonly webState: string
  readonly webStop: string
  readonly webRestart: string
  readonly matrixFixtures: string
  readonly designated: string
  readonly controlWitness: string
}

export interface EvidenceValidationReport {
  readonly accepted: boolean
  readonly violations: readonly string[]
}

const report = (violations: readonly string[]): EvidenceValidationReport =>
  Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze([...violations]),
  })

const quotedLiteral = (source: string, value: string): boolean =>
  source.includes("'" + value + "'") ||
  source.includes('"' + value + '"') ||
  source.includes('`' + value + '`')

export function validateSelectedReconcileSource(
  sources: SelectedReconcileSources
): EvidenceValidationReport {
  const violations: string[] = []
  const requireCode = (code: Bl019SourceGuardCode, accepted: boolean): void => {
    if (!accepted) violations.push(code)
  }
  requireCode(
    'reconcile-deadline-trusted-scheduler',
    sources.manager.includes('deadlineScheduler.scheduleDeadline') &&
      !sources.manager.includes('setInterval(')
  )
  requireCode(
    'reconcile-bound-origin-arithmetic',
    sources.contract.includes('config.reconcileStartupHeadroomMs +') &&
      sources.contract.includes('reconciliationOverallBoundMs(config) +') &&
      sources.contract.includes('config.reconcileScanAllowanceMs +') &&
      sources.contract.includes('config.reconcileAttributionAllowanceMs +') &&
      sources.contract.includes('config.reconcileReadinessBoundMs +') &&
      sources.contract.includes('config.reconcileSettlementAllowanceMs')
  )
  requireCode(
    'reconcile-no-signal-before-adoption',
    sources.manager.includes('adoptOwnedRuntimeProcess({') &&
      !sources.manager.includes('signalProcessGroup(input.candidate.pid')
  )
  requireCode(
    'reconcile-conjunctive-attribution',
    sources.manager.includes('candidateIdentity.uid !== currentUid') &&
      sources.manager.includes('resolveGroupListenerOwner({') &&
      sources.manager.includes('probeCandidateReadiness')
  )
  requireCode(
    'reconcile-launcher-prefix-derived',
    sources.process.includes('resolveInstalledRuntimeIdentity') &&
      sources.process.includes('launcherArgvPrefix') &&
      !sources.manager.includes('candidateArgv[0] !== config.executablePath') &&
      !sources.process.includes('argv[0] === config.executablePath')
  )
  requireCode(
    'reconcile-identity-reread',
    sources.manager.includes('const second = await runReconciliationBounded') &&
      sources.manager.includes('first.ownerIdentity.startTime')
  )
  requireCode(
    'reconcile-listener-group-scoped',
    sources.process.includes('resolveGroupListenerOwner') &&
      sources.process.includes('readProcessGroupMemberPids') &&
      sources.manager.includes('processGroupId: input.candidate.pid') &&
      !sources.process.includes('readProcessSocketInodes(input.processGroupId')
  )
  requireCode(
    'reconcile-absence-requires-complete-scan',
    sources.manager.includes('if (discovery.value.complete)') &&
      sources.manager.includes("absenceProof: 'no-candidate-complete-scan'")
  )
  requireCode(
    'reconcile-startup-required',
    /beginReconciliation\(\): Promise<void>/u.test(sources.manager) &&
      !/beginReconciliation\?\s*\(/u.test(sources.manager) &&
      sources.app.includes('await runtimeManager.beginReconciliation()') &&
      !sources.app.includes('beginReconciliation?.')
  )
  const startSection = sources.manager.slice(
    sources.manager.indexOf('const start = async'),
    sources.manager.indexOf('const shutdown =')
  )
  requireCode(
    'reconcile-blocked-start-refuses-launch',
    startSection.includes(
      "current.failure.category === 'reconcile-unconfirmed'"
    ) &&
      startSection.indexOf(
        "current.failure.category === 'reconcile-unconfirmed'"
      ) < startSection.indexOf('const generation = Symbol(input.projectId)')
  )
  requireCode(
    'reconcile-blocked-controls-reject',
    sources.manager.includes("category: 'reconcile-unresolved'")
  )
  requireCode(
    'reconcile-pending-controls-reject',
    sources.manager.includes("category: 'reconcile-in-progress'")
  )
  requireCode(
    'reconcile-no-lifecycle-success-fabrication',
    sources.manager.includes("event: 'runtime.reconcile.succeeded'") &&
      sources.manager.includes("input.outcome === 'adopted'")
  )
  const adoptedSection = sources.manager.slice(
    sources.manager.indexOf('adoptOwnedRuntimeProcess({'),
    sources.manager.indexOf('const observeReconciliation')
  )
  requireCode(
    'reconcile-no-adopted-exit-task',
    !adoptedSection.includes('backgroundTasks.add') &&
      !adoptedSection.includes('completionTasks.add') &&
      !adoptedSection.includes('setInterval(') &&
      !adoptedSection.includes('setTimeout(') &&
      !adoptedSection.includes('.exit.then(')
  )
  requireCode(
    'reconcile-shutdown-aborts',
    sources.manager.includes("settlePendingReconciliations('manager-shutdown')")
  )
  requireCode(
    'runtime-child-stderr-file-fd',
    sources.process.includes("'runtime-stderr.log'") &&
      sources.process.includes(
        "stdio: ['ignore', 'ignore', stderrHandle.fd]"
      ) &&
      sources.process.includes('await stderrHandle.close()')
  )
  requireCode(
    'reconcile-no-persisted-runtime-state',
    !sources.manager.includes('persistReconciliation') &&
      !sources.contract.includes('ASCEND_RECONCILE')
  )
  requireCode(
    'reconcile-privacy-public-surfaces',
    sources.workbenchContract.includes('workbench_reconcile_unconfirmed') &&
      sources.webState.includes("'reconcile-unconfirmed'") &&
      sources.stopRoute.includes('runtime_reconcile_unresolved') &&
      sources.restartRoute.includes('runtime_reconcile_unresolved') &&
      sources.webStop.includes('runtime_reconcile_in_progress') &&
      sources.webRestart.includes('runtime_reconcile_in_progress')
  )
  const forbiddenFixtureLiterals = [
    ...RECONCILE_OUTCOMES,
    ...RECONCILE_REFUSAL_REASONS,
    ...RECONCILE_ABSENCE_PROOFS,
    ...PUBLIC_RUNTIME_STATES,
    'runtime.reconcile.requested',
    'runtime.reconcile.succeeded',
    'runtime.reconcile.absent',
    'runtime.reconcile.failed',
    'reconcile-unconfirmed',
    'not-applicable',
    'alive',
    'died-observed-stale',
    'died-corrected',
  ]
  requireCode(
    'reconcile-matrix-observed-rows',
    forbiddenFixtureLiterals.every(
      (value) => !quotedLiteral(sources.matrixFixtures, value)
    ) &&
      sources.matrixFixtures.includes('createProjectRuntimeManager(') &&
      sources.matrixFixtures.includes('.inspectReconciliation(') &&
      sources.matrixFixtures.includes('.reportPublicStates(') &&
      !sources.matrixFixtures.includes('runtime-reconcile-matrix.json') &&
      !sources.matrixFixtures.includes('JSON.parse(') &&
      !sources.matrixFixtures.includes('readFile(')
  )
  requireCode(
    'reconcile-designated-real-api',
    sources.designated.includes('API_COMPILED_ENTRY') &&
      !sources.designated.includes('createProjectRuntimeManager') &&
      !sources.designated.includes('buildApp(') &&
      !sources.designated.includes('createApp(') &&
      !sources.designated.includes("from '../src/app.js'") &&
      sources.controlWitness.includes('defaultRuntimeAttributionPrimitives') &&
      sources.controlWitness.includes('createProjectLibrary') &&
      sources.controlWitness.includes('createProjectRuntimeManager(') &&
      !sources.controlWitness.includes('type RuntimeAttributionPrimitives') &&
      !sources.controlWitness.includes(': RuntimeAttributionPrimitives')
  )
  return report(violations)
}

const WALL_CLOCK_FLOOR_MS = 1_000_000_000_000
const opaqueProject = /^bl019-project-[a-z0-9-]+$/u
const opaqueIdentity = /^bl019-identity-[a-z0-9-]+$/u
const opaqueRun = /^bl019-run-[a-z0-9-]+$/u
const reconcileEvent = /^runtime\.reconcile\./u

export function declaredScenarioBound(id: Bl019Scenario): number {
  const sequence = Number(id.slice(2))
  if (id === 'S-01') return BL019_DECLARED_BOUNDS.reconcileResponseAllowanceMs
  if (id === 'S-34')
    return BL019_DECLARED_BOUNDS.acquisitionAcrossReconciliationBoundMs
  if ((sequence >= 33 && sequence <= 38) || id === 'S-59')
    return BL019_DECLARED_BOUNDS.workbenchAcquisitionBoundMs
  if (['S-39', 'S-41', 'S-43', 'S-45', 'S-46', 'S-60', 'S-62'].includes(id))
    return BL019_DECLARED_BOUNDS.runtimeStopOverallBoundMs
  if (['S-40', 'S-42', 'S-44', 'S-47', 'S-61'].includes(id))
    return BL019_DECLARED_BOUNDS.runtimeRestartOverallBoundMs
  return BL019_DECLARED_BOUNDS.reconciliationOverallBoundMs
}

export function deriveRuntimeReconcileOutcome(
  projects: readonly RuntimeReconcileEvidenceProject[]
): RuntimeReconcileEvidenceRow['outcome'] {
  if (projects.length === 0) return 'not-applicable'
  const outcomes = new Set(projects.map(({ outcome }) => outcome))
  if (outcomes.size !== 1 || outcomes.has('unsettled')) return 'mixed'
  return projects[0]!.outcome as ReconcileOutcome
}

export const BL019_UNSETTLED_OUTCOME = 'unsettled' as const
export const BL019_LISTENER_OWNERS = Object.freeze([
  'group-leader',
  'group-member',
] as const)

export function evidenceProjectOutcome(
  inspection: ReconciliationInspection['projects'][number]
): RuntimeReconcileEvidenceProject['outcome'] {
  return inspection.outcome === null ||
    inspection.refusalReason === 'manager-shutdown'
    ? BL019_UNSETTLED_OUTCOME
    : inspection.outcome
}

export function evidencePublicFailureCategory(
  failureCategory: string | undefined
): RuntimeReconcileEvidenceProject['publicFailureCategory'] {
  return failureCategory === 'reconcile-unconfirmed' ? failureCategory : null
}

export function evidenceAbsenceProven(
  inspection: ReconciliationInspection['projects'][number]
): boolean {
  return inspection.outcome === 'absent' && inspection.absenceProof !== null
}

export function deriveAdoptedLiveness(
  row: Pick<
    RuntimeReconcileEvidenceRow,
    'projects' | 'declaredKills' | 'declaredActions'
  >
): RuntimeReconcileEvidenceRow['adoptedLiveness'] {
  if (!row.projects.some(({ outcome }) => outcome === 'adopted'))
    return 'not-applicable'
  if (row.declaredKills.length === 0) return 'alive'
  return row.declaredActions.length === 0
    ? 'died-observed-stale'
    : 'died-corrected'
}

const earlyReadinessRefusals = new Set<ReconcileRefusalReason>([
  'launcher-unresolved',
  'ambiguous-candidates',
  'uid-mismatch',
  'launcher-prefix-mismatch',
  'canonical-path-mismatch',
  'owner-token-mismatch',
  'port-mismatch',
  'argv-mismatch',
  'not-group-leader',
  'group-scan-incomplete',
  'listener-absent',
  'listener-not-owned',
])
const reachedReadinessRefusals = new Set<ReconcileRefusalReason>([
  'readiness-unconfirmed',
  'identity-unstable',
])

const exactRowKeys = Object.freeze([
  'id',
  'name',
  'acceptanceCriteria',
  'projects',
  'outcome',
  'publicStates',
  'declaredActions',
  'declaredKills',
  'adoptedLiveness',
  'events',
  'eventCount',
  'listeners',
  'acquisitions',
  'launches',
  'signalsSent',
  'signalsDelivered',
  'elapsedMs',
  'boundMs',
  'elapsedClass',
  'absenceProven',
  'residualCount',
  'inspection',
  'execution',
])

export function validateRuntimeReconcileMatrix(
  matrix: RuntimeReconcileMatrix
): EvidenceValidationReport {
  const violations = new Set<string>()
  const fail = (code: (typeof BL019_MUTATION_CLASSES)[number]): void => {
    violations.add(code)
  }
  if (
    matrix.schemaVersion !== 1 ||
    JSON.stringify(matrix.declaredBounds) !==
      JSON.stringify(BL019_DECLARED_BOUNDS)
  )
    fail('M-10')
  if (
    matrix.rows.length !== BL019_SCENARIOS.length ||
    matrix.rows.some((row, index) => row.id !== BL019_SCENARIOS[index]) ||
    new Set(matrix.rows.map(({ id }) => id)).size !== BL019_SCENARIOS.length
  )
    fail('M-1')

  const identities = new Set<string>()
  const runIds = new Set<string>()
  const refusalCoverage = new Set<string>()
  const proofCoverage = new Set<string>()
  const ownerCoverage = new Set<string>()
  const stateCoverage = new Set<string>()
  const primitiveKeys = [...BL019_PRIMITIVE_CALLS].sort()

  for (const row of matrix.rows) {
    if (
      JSON.stringify([...Object.keys(row)].sort()) !==
      JSON.stringify([...exactRowKeys].sort())
    )
      fail('M-4')
    if (
      JSON.stringify(row.acceptanceCriteria) !==
        JSON.stringify(BL019_SCENARIO_ACS[row.id]) ||
      row.acceptanceCriteria.length === 0
    )
      fail('M-1')
    if (row.outcome !== deriveRuntimeReconcileOutcome(row.projects)) fail('M-7')
    if (
      JSON.stringify(row.publicStates) !==
      JSON.stringify(row.projects.map(({ publicState }) => publicState))
    )
      fail('M-7')
    const adoptedCount = row.projects.filter(
      ({ outcome }) => outcome === 'adopted'
    ).length
    if (
      row.listeners.attributed !== adoptedCount ||
      row.listeners.accumulated !== 0
    )
      fail('M-7')
    const absenceProven =
      row.projects.length > 0 &&
      row.projects.every(
        (project) =>
          project.outcome === 'absent' && project.absenceProof !== null
      )
    if (
      row.absenceProven !== absenceProven ||
      row.residualCount !== (absenceProven ? 0 : null)
    )
      fail('M-4')
    if (
      !Number.isSafeInteger(row.elapsedMs) ||
      row.elapsedMs <= 0 ||
      row.elapsedMs >= WALL_CLOCK_FLOOR_MS ||
      row.elapsedMs > row.boundMs ||
      row.elapsedClass !== 'within-bound'
    )
      fail('M-5')
    if (
      row.boundMs !== declaredScenarioBound(row.id) ||
      row.boundMs === BL019_DECLARED_BOUNDS.reconciliationEndToEndBoundMs
    )
      fail('M-10')
    if (
      row.eventCount !== row.events.length ||
      row.events.some((event) => !opaqueProject.test(event.projectToken))
    )
      fail('M-6')
    const requested = row.events.filter(
      ({ event }) => event === 'runtime.reconcile.requested'
    ).length
    const terminal = row.events.filter(({ event }) =>
      [
        'runtime.reconcile.succeeded',
        'runtime.reconcile.absent',
        'runtime.reconcile.failed',
      ].includes(event)
    ).length
    if (
      requested !== row.projects.length ||
      terminal !==
        row.projects.filter(({ outcome }) => outcome !== 'unsettled').length ||
      row.events.some(
        ({ event }) =>
          (event.startsWith('runtime.start.') &&
            !row.declaredActions.includes('acquire')) ||
          (event.startsWith('runtime.stop.') &&
            !row.declaredActions.includes('stop')) ||
          (event.startsWith('runtime.restart.') &&
            !row.declaredActions.includes('restart')) ||
          (event === 'runtime.health.changed' &&
            !row.declaredActions.some((action) =>
              ['acquire', 'stop', 'restart'].includes(action)
            ))
      )
    )
      fail('M-6')
    if (row.projects.length > 0 && row.inspection === null) fail('M-9')
    if (row.projects.length === 0 && row.inspection !== null) fail('M-9')
    if (
      (row.declaredActions.length === 0 &&
        (row.launches !== 0 || row.signalsSent !== 0)) ||
      (row.launches > 0 &&
        !row.declaredActions.some((action) =>
          ['acquire', 'restart'].includes(action)
        )) ||
      (row.signalsSent > 0 &&
        !row.declaredActions.some((action) =>
          ['stop', 'restart', 'shutdown'].includes(action)
        )) ||
      row.signalsDelivered > row.signalsSent ||
      [
        row.acquisitions,
        row.launches,
        row.signalsSent,
        row.signalsDelivered,
      ].some((value) => !Number.isSafeInteger(value) || value < 0)
    )
      fail('M-7')

    for (const project of row.projects) {
      stateCoverage.add(project.publicState)
      if (!opaqueProject.test(project.projectToken)) fail('M-8')
      if (project.refusalReason !== null)
        refusalCoverage.add(project.refusalReason)
      if (project.absenceProof !== null) proofCoverage.add(project.absenceProof)
      if (project.listenerOwner !== null)
        ownerCoverage.add(project.listenerOwner)
      if (project.identity.preRestart !== null) {
        if (
          !opaqueIdentity.test(project.identity.preRestart) ||
          identities.has(project.identity.preRestart)
        )
          fail('M-7')
        identities.add(project.identity.preRestart)
      }
      if (
        project.outcome === 'adopted' &&
        (project.identity.unchanged !== true ||
          project.identity.preRestart !== project.identity.settled ||
          project.listenerAttributed !== 1 ||
          project.listenerOwner === null ||
          project.publicState !== 'Running' ||
          project.publicFailureCategory !== null)
      )
        fail('M-9')
      if (
        project.outcome !== 'adopted' &&
        (project.listenerAttributed !== 0 || project.listenerOwner !== null)
      )
        fail('M-9')
      if (
        project.outcome === 'absent' &&
        (project.publicState !== 'Stopped' ||
          project.absenceProof === null ||
          !project.absenceProven)
      )
        fail('M-3')
      if (
        project.outcome === 'unresolved' &&
        (project.publicState !== 'Failed' ||
          project.publicFailureCategory !== 'reconcile-unconfirmed' ||
          project.refusalReason === null)
      )
        fail('M-3')
      if (project.outcome === 'unsettled' && project.publicState !== 'Starting')
        fail('M-2')
      if (
        (row.declaredActions.length === 0) !==
        (project.postActionPublicState === null)
      )
        fail('M-11')
    }

    if (row.adoptedLiveness !== deriveAdoptedLiveness(row)) fail('M-11')
    if (row.adoptedLiveness === 'died-observed-stale') {
      const lastTerminal = row.events.findLastIndex(
        ({ event }) =>
          reconcileEvent.test(event) && event !== 'runtime.reconcile.requested'
      )
      if (
        row.declaredActions.length !== 0 ||
        row.declaredKills.length === 0 ||
        row.events.slice(lastTerminal + 1).length !== 0 ||
        row.projects
          .filter(({ projectToken }) =>
            row.declaredKills.includes(projectToken)
          )
          .some(({ publicState }) => publicState !== 'Running')
      )
        fail('M-11')
    }
    if (row.adoptedLiveness === 'died-corrected') {
      const expected =
        row.id === 'S-62'
          ? 'Failed'
          : row.declaredActions.includes('restart')
            ? 'Running'
            : row.declaredActions.includes('stop')
              ? 'Stopped'
              : 'Failed'
      if (
        row.declaredKills.length === 0 ||
        row.projects
          .filter(({ projectToken }) =>
            row.declaredKills.includes(projectToken)
          )
          .some(
            ({ postActionPublicState }) => postActionPublicState !== expected
          )
      )
        fail('M-11')
    }

    const execution = row.execution
    if (
      execution === null ||
      execution === undefined ||
      !opaqueRun.test(execution.runId) ||
      execution.runId === row.id ||
      runIds.has(execution.runId) ||
      !Number.isSafeInteger(execution.managerInstances) ||
      execution.managerInstances < 1 ||
      JSON.stringify(Object.keys(execution.primitiveCalls).sort()) !==
        JSON.stringify(primitiveKeys) ||
      Object.values(execution.primitiveCalls).some(
        (value) => !Number.isSafeInteger(value) || value < 0
      ) ||
      !Number.isSafeInteger(execution.projectionCalls) ||
      execution.projectionCalls < 0 ||
      execution.eventSinkWrites !== row.events.length ||
      execution.observedFrom.length === 0 ||
      execution.observedFrom.some(
        (source) => !BL019_OBSERVED_SOURCES.includes(source)
      )
    ) {
      fail('M-12')
    } else {
      runIds.add(execution.runId)
      const projectTokens = row.projects.map(({ projectToken }) => projectToken)
      const healthKeys = Object.keys(execution.probeHealthByProject)
      if (
        JSON.stringify([...healthKeys].sort()) !==
          JSON.stringify([...projectTokens].sort()) ||
        Object.values(execution.probeHealthByProject).some(
          (value) => !Number.isSafeInteger(value) || value < 0
        )
      )
        fail('M-12')
      for (const project of row.projects) {
        const probes = execution.probeHealthByProject[project.projectToken]
        if (probes === undefined) {
          fail('M-12')
          continue
        }
        const early =
          (project.outcome === 'unresolved' &&
            project.refusalReason !== null &&
            earlyReadinessRefusals.has(project.refusalReason)) ||
          (project.outcome === 'absent' &&
            project.absenceProof === 'no-candidate-complete-scan')
        const reached =
          project.outcome === 'adopted' ||
          (project.outcome === 'unresolved' &&
            project.refusalReason !== null &&
            reachedReadinessRefusals.has(project.refusalReason))
        if ((early && probes !== 0) || (reached && probes < 1)) fail('M-12')
      }
      const mappedProbes = Object.values(execution.probeHealthByProject).reduce(
        (total, value) => total + value,
        0
      )
      if (
        execution.primitiveCalls.probeHealth < mappedProbes ||
        (execution.managerInstances === 1 &&
          row.declaredActions.length === 0 &&
          execution.primitiveCalls.probeHealth !== mappedProbes)
      )
        fail('M-12')
      if (row.projects.length === 0) {
        if (
          Object.values(execution.primitiveCalls).some(
            (value) => value !== 0
          ) ||
          healthKeys.length !== 0
        )
          fail('M-12')
      } else if (
        execution.primitiveCalls.resolveInstalledRuntimeIdentity < 1 ||
        execution.primitiveCalls.listCandidatePids < 1 ||
        execution.projectionCalls < 1 ||
        !execution.observedFrom.includes('manager-inspection') ||
        !execution.observedFrom.includes('public-projection') ||
        !execution.observedFrom.includes('primitive-ledger') ||
        !execution.observedFrom.includes('injected-clock') ||
        (row.events.length > 0 &&
          !execution.observedFrom.includes('event-sink')) ||
        (row.declaredActions.some((action) =>
          ['stop', 'restart'].includes(action)
        ) &&
          !execution.observedFrom.includes('route-response'))
      )
        fail('M-12')
    }
  }

  if (
    refusalCoverage.size !== RECONCILE_REFUSAL_REASONS.length ||
    proofCoverage.size !== RECONCILE_ABSENCE_PROOFS.length ||
    ownerCoverage.size !== 2
  )
    fail('M-3')
  if (
    JSON.stringify([...stateCoverage].sort()) !==
    JSON.stringify([...PUBLIC_RUNTIME_STATES].sort())
  )
    fail('M-2')
  if (
    matrix.privacy.matches.length !== 0 ||
    matrix.privacy.declaredSources.length === 0
  )
    fail('M-8')
  return report([...violations])
}

export function serializeRuntimeReconcileMatrix(
  matrix: RuntimeReconcileMatrix
): string {
  return JSON.stringify(matrix, null, 2) + String.fromCharCode(10)
}

export function scanProtectedRuntimeEvidenceSources(input: {
  readonly sources: Readonly<Record<string, string>>
  readonly protectedValues: readonly string[]
}): Readonly<{
  declaredSources: readonly string[]
  matches: readonly string[]
}> {
  const declaredSources = Object.keys(input.sources).sort()
  const matches = declaredSources.flatMap((source) =>
    input.protectedValues
      .filter(
        (value) => value.length > 0 && input.sources[source]!.includes(value)
      )
      .map((value) => source + ':' + value)
  )
  return Object.freeze({
    declaredSources: Object.freeze(declaredSources),
    matches: Object.freeze(matches),
  })
}

export interface ReconcileEpisodeProbe {
  readonly probeCompleted: boolean
  readonly residual: number | null
}

export interface ReconcileEpisodeTeardown {
  readonly status: (typeof BL019_EPISODE_TEARDOWN_STATUSES)[number]
  readonly probes: Readonly<
    Record<
      | 'apiProcesses'
      | 'workbenchProcesses'
      | 'attributableDescendants'
      | 'listeners'
      | 'activeRequests'
      | 'disposableFixtures',
      ReconcileEpisodeProbe
    >
  >
}

export interface ReconcileApiGeneration {
  readonly generation: string | number
  readonly pid: number
  readonly processStartTime: string
  readonly argv: readonly string[]
  readonly listenerPort: number
  readonly listenerInode: string
  readonly listenerOwnerPid: number
  readonly httpRequests: Readonly<{ issued: number; succeeded: number }>
  readonly database: Readonly<{
    path: string
    bytes: number
    projectRowsObserved: number | null
  }>
  readonly boundMs: number
  readonly settlementElapsedMs: number
  readonly pendingObserved: boolean
}

export interface ReconcileControlRecord {
  readonly listenerPort: number | null
  readonly id: string
  readonly identity: Readonly<{ pid: number; processStartTime: string }>
  readonly markers: Readonly<{
    pathMarker: string | null
    tokenMarker: string | null
  }>
  readonly candidateCountForItsProject: number
  readonly settledPublicState: PublicRuntimeState
  readonly publicFailureCategory: 'reconcile-unconfirmed' | null
  readonly declaredRefusalReason: ReconcileRefusalReason | null
  readonly observedRefusalReason: ReconcileRefusalReason | null
  readonly acquisitionStatus: number
  readonly stopStatus: number
  readonly restartStatus: number
  readonly lifecycleEvents: number
  readonly launches: number
  readonly signalsSent: number
  readonly observedAlive: boolean
  readonly adopted: boolean
  readonly identityUnchangedBeforeTeardown: boolean
}

export interface ReconcileControlSubepisode {
  readonly generations: readonly ReconcileApiGeneration[]
  readonly controls: readonly ReconcileControlRecord[]
  readonly residuals: Readonly<Record<string, ReconcileEpisodeProbe>>
  readonly teardown: Readonly<{ status: 'proven-clear' }>
  readonly clearedBeforePhase: (typeof BL019_EPISODE_PHASES)[number]
}

export interface ReconcileEpisode {
  readonly schemaVersion: 1
  readonly measurementOrigin: 'api-process-spawn'
  readonly phaseOrder: readonly string[]
  readonly startupControl: Readonly<{
    boundMs: number
    spawnToFirstResponseMs: number
    created: number
    signalsSent: number
    generation: ReconcileApiGeneration
  }>
  readonly controlSubepisode: ReconcileControlSubepisode | null
  readonly apiGenerations: readonly ReconcileApiGeneration[]
  readonly workbenches: readonly Readonly<{
    pid: number
    processStartTime: string
    processGroupId: number
    listenerPort: number
  }>[]
  readonly controls: readonly Readonly<{
    id: string
    identity: Readonly<{ pid: number; processStartTime: string }>
    listenerPort: number | null
    markers: Readonly<{ pathMarker: string | null; tokenMarker: string | null }>
    observedAlive: boolean
    adopted: boolean
    signalsSent: number
  }>[]
  readonly activeRequests: readonly Readonly<{ listenerPort: number }>[]
  readonly disposablePaths: readonly string[]
  readonly residualCount: null
  readonly teardown: ReconcileEpisodeTeardown | null
}

const completedZeroProbe = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false
  const probe = value as Partial<ReconcileEpisodeProbe>
  return probe.probeCompleted === true && probe.residual === 0
}

const generationViolations = (
  generation: ReconcileApiGeneration,
  violations: Set<string>
): void => {
  if (
    !Array.isArray(generation.argv) ||
    typeof generation.argv[1] !== 'string' ||
    !generation.argv[1]
      .replaceAll('\\', '/')
      .endsWith('apps/api/dist/server.js')
  )
    violations.add('generation-not-compiled-api')
  if (
    generation.argv.some((argument) =>
      ['-e', '--eval', '-p', '--print', '--input-type'].includes(argument)
    )
  )
    violations.add('generation-eval-spawn')
  if (
    generation.listenerOwnerPid !== generation.pid ||
    typeof generation.listenerInode !== 'string' ||
    generation.listenerInode.length === 0
  )
    violations.add('generation-listener-unobserved')
  if (
    !Number.isSafeInteger(generation.httpRequests.succeeded) ||
    generation.httpRequests.succeeded < 1 ||
    generation.httpRequests.succeeded > generation.httpRequests.issued
  )
    violations.add('generation-http-absent')
  if (
    typeof generation.database.path !== 'string' ||
    generation.database.path.length === 0 ||
    !Number.isSafeInteger(generation.database.bytes) ||
    generation.database.bytes <= 0 ||
    generation.database.projectRowsObserved === null ||
    !Number.isSafeInteger(generation.database.projectRowsObserved) ||
    generation.database.projectRowsObserved < 0
  )
    violations.add('generation-database-unobserved')
}

export function validateReconcileEpisode(
  episode: Pick<ReconcileEpisode, 'teardown'> & Partial<ReconcileEpisode>
): EvidenceValidationReport {
  const violations = new Set<string>()
  if (
    JSON.stringify(episode.phaseOrder) !== JSON.stringify(BL019_EPISODE_PHASES)
  )
    violations.add('phase-order-mismatch')

  const generations = [
    ...(episode.startupControl?.generation === undefined
      ? []
      : [episode.startupControl.generation]),
    ...(episode.controlSubepisode?.generations ?? []),
    ...(episode.apiGenerations ?? []),
  ]
  for (const generation of generations)
    generationViolations(generation, violations)

  const controlSubepisode = episode.controlSubepisode
  if (controlSubepisode === null || controlSubepisode === undefined) {
    violations.add('control-subepisode-missing')
  } else {
    if (
      controlSubepisode.controls.some(
        ({ candidateCountForItsProject }) => candidateCountForItsProject !== 1
      )
    )
      violations.add('control-not-sole-candidate')
    if (
      controlSubepisode.controls.some(
        (control) =>
          control.settledPublicState !== 'Failed' ||
          control.publicFailureCategory !== 'reconcile-unconfirmed' ||
          control.declaredRefusalReason === null ||
          control.observedRefusalReason !== control.declaredRefusalReason ||
          control.acquisitionStatus !== 503 ||
          control.stopStatus !== 409 ||
          control.restartStatus !== 409 ||
          control.launches !== 0 ||
          control.lifecycleEvents !== 0 ||
          control.adopted
      )
    )
      violations.add('control-settlement-mismatch')
    if (
      controlSubepisode.controls.some(
        (control) =>
          control.signalsSent !== 0 ||
          !control.observedAlive ||
          !control.identityUnchangedBeforeTeardown
      )
    )
      violations.add('control-signalled')
    if (
      controlSubepisode.teardown.status !== 'proven-clear' ||
      !['P0', 'P0b', 'P0c', 'P0d'].includes(
        controlSubepisode.clearedBeforePhase
      ) ||
      Object.keys(controlSubepisode.residuals).length === 0 ||
      Object.values(controlSubepisode.residuals).some(
        (probe) => !completedZeroProbe(probe)
      )
    )
      violations.add('control-not-cleared-before-main-episode')
  }

  if (
    (episode.controls ?? []).some(
      (control) =>
        control.markers.pathMarker !== null ||
        control.markers.tokenMarker !== null
    )
  )
    violations.add('main-episode-control-candidate-bearing')

  if (episode.teardown === null) {
    violations.add('teardown-null')
  } else {
    const probes = Object.values(episode.teardown.probes)
    if (
      probes.length !== 6 ||
      probes.some(
        (probe) =>
          !probe.probeCompleted ||
          !Number.isSafeInteger(probe.residual) ||
          (probe.residual ?? -1) < 0
      )
    ) {
      violations.add('teardown-unproven')
    } else {
      const hasResidual = probes.some(({ residual }) => residual !== 0)
      if (hasResidual || episode.teardown.status === 'residual-present')
        violations.add('teardown-residual-present')
      else if (episode.teardown.status !== 'proven-clear')
        violations.add('teardown-unproven')
    }
  }
  return report([...violations])
}
