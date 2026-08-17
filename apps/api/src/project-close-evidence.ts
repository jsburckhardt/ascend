import {
  createProjectRuntimeConfig,
  PUBLIC_RUNTIME_STATES,
  RUNTIME_CLOSE_OUTCOMES,
  RUNTIME_CLOSE_REJECTION_CATEGORIES,
  reconciliationEndToEndBoundMs,
  restartQuarantineReleaseBoundMs,
  runtimeCloseOverallBoundMs,
  runtimeCloseReleaseBoundMs,
  type ProjectRuntimeConfig,
  type PublicRuntimeState,
  type RuntimeCloseRejectionCategory,
} from './project-runtime-contract.js'

/**
 * BL-020 evidence contract.
 *
 * This module declares the frozen scenario catalog, the source guards, the
 * mutation classes, the bound table, and the validators that refuse any matrix
 * row that could not have been produced by executing production close paths.
 * It deliberately imports nothing from `node:` so the web component matrix can
 * import the same contract.
 */

export const BL020_SCENARIOS = Object.freeze([
  'S-1',
  'S-2',
  'S-3',
  'S-4',
  'S-5',
  'S-6',
  'S-7',
  'S-8',
  'S-9',
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
  'S-67',
  'S-68',
  'S-69',
  'S-70',
  'S-71',
  'S-72',
  'S-73',
  'S-74',
  'S-75',
] as const)
export type Bl020ScenarioId = (typeof BL020_SCENARIOS)[number]

export const BL020_SCENARIO_GROUPS = Object.freeze({
  A: Object.freeze(['S-1', 'S-2', 'S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8']),
  B: Object.freeze(['S-9', 'S-10', 'S-11', 'S-12', 'S-13', 'S-14', 'S-15']),
  C: Object.freeze(['S-16', 'S-17', 'S-18', 'S-19']),
  D: Object.freeze(['S-20', 'S-21', 'S-22', 'S-23', 'S-24']),
  E: Object.freeze(['S-25', 'S-26', 'S-27']),
  F: Object.freeze(['S-28', 'S-29', 'S-30', 'S-31']),
  G: Object.freeze(['S-32', 'S-33', 'S-34', 'S-35', 'S-36', 'S-37']),
  H: Object.freeze(['S-38', 'S-39', 'S-40']),
  I: Object.freeze(['S-41', 'S-42', 'S-43', 'S-44', 'S-45', 'S-46', 'S-47']),
  J: Object.freeze(['S-48', 'S-49', 'S-50', 'S-51', 'S-52']),
  K: Object.freeze(['S-53', 'S-54', 'S-55', 'S-56', 'S-57', 'S-58']),
  L: Object.freeze(['S-59', 'S-60', 'S-61', 'S-62', 'S-63', 'S-64']),
  M: Object.freeze(['S-65', 'S-66']),
  N: Object.freeze(['S-67', 'S-68']),
  O: Object.freeze(['S-69', 'S-70', 'S-71', 'S-72', 'S-73', 'S-74', 'S-75']),
} as const)
export type Bl020ScenarioGroup = keyof typeof BL020_SCENARIO_GROUPS

export const BL020_BOUND_IDS = Object.freeze([
  'B-1',
  'B-2',
  'B-3',
  'B-4',
  'B-5',
  'B-6',
  'B-7',
  'B-8',
  'B-9',
  'B-10',
  'B-11',
  'B-12',
  'B-13',
  'B-14',
  'B-15',
  'B-16',
  'B-17',
  'B-18',
  'B-19',
  'B-20',
] as const)
export type Bl020BoundId = (typeof BL020_BOUND_IDS)[number]

/**
 * Client-side bounds are delivered constants rather than manager arithmetic, so
 * they are declared here as the values the guard cross-checks against
 * `apps/web/src/projects.ts` and `apps/web/src/runtime-state.ts`.
 */
export const BL020_CLIENT_BOUND_MS = Object.freeze({
  projectClose: 45_000,
  projectList: 5_000,
  runtimeState: 5_000,
} as const)

export interface Bl020BoundDeclaration {
  readonly id: Bl020BoundId
  readonly name: string
  readonly requiresQuarantineResolution: boolean | null
  readonly sweepUnits: number | null
  readonly valueMs: number
}

/** Recomputes every declared bound from production constants and functions. */
export function computeBl020Bounds(
  config: ProjectRuntimeConfig = createProjectRuntimeConfig()
): readonly Bl020BoundDeclaration[] {
  const cap = config.closeOwnershipSweepCap
  const declare = (
    id: Bl020BoundId,
    name: string,
    requiresQuarantineResolution: boolean | null,
    sweepUnits: number | null,
    valueMs: number
  ): Bl020BoundDeclaration =>
    Object.freeze({
      id,
      name,
      requiresQuarantineResolution,
      sweepUnits,
      valueMs,
    })
  return Object.freeze([
    declare(
      'B-1',
      'close-drain-allowance',
      null,
      null,
      config.closeDrainAllowanceMs
    ),
    declare(
      'B-2',
      'close-release-one-record-no-quarantine',
      false,
      1,
      runtimeCloseReleaseBoundMs(config, false, 1)
    ),
    declare(
      'B-3',
      'close-release-one-record-quarantine',
      true,
      1,
      runtimeCloseReleaseBoundMs(config, true, 1)
    ),
    declare(
      'B-4',
      'close-settlement-allowance',
      null,
      null,
      config.closeSettlementAllowanceMs
    ),
    declare(
      'B-5',
      'close-overall-one-record-no-quarantine',
      false,
      1,
      runtimeCloseOverallBoundMs(config, false, 1)
    ),
    declare(
      'B-6',
      'close-overall-one-record-quarantine',
      true,
      1,
      runtimeCloseOverallBoundMs(config, true, 1)
    ),
    declare(
      'B-7',
      'close-release-two-records-no-quarantine',
      false,
      2,
      runtimeCloseReleaseBoundMs(config, false, 2)
    ),
    declare(
      'B-8',
      'close-overall-two-records-no-quarantine',
      false,
      2,
      runtimeCloseOverallBoundMs(config, false, 2)
    ),
    declare(
      'B-9',
      'close-release-cap-no-quarantine',
      false,
      cap,
      runtimeCloseReleaseBoundMs(config, false, cap)
    ),
    declare(
      'B-10',
      'close-overall-cap-no-quarantine',
      false,
      cap,
      runtimeCloseOverallBoundMs(config, false, cap)
    ),
    declare(
      'B-11',
      'close-release-cap-quarantine',
      true,
      cap,
      runtimeCloseReleaseBoundMs(config, true, cap)
    ),
    declare(
      'B-12',
      'close-overall-cap-quarantine',
      true,
      cap,
      runtimeCloseOverallBoundMs(config, true, cap)
    ),
    declare(
      'B-13',
      'client-close-timeout',
      null,
      null,
      BL020_CLIENT_BOUND_MS.projectClose
    ),
    declare(
      'B-14',
      'client-list-timeout',
      null,
      null,
      BL020_CLIENT_BOUND_MS.projectList
    ),
    declare(
      'B-15',
      'client-runtime-state-timeout',
      null,
      null,
      BL020_CLIENT_BOUND_MS.runtimeState
    ),
    declare('B-16', 'graceful-shutdown', null, null, config.gracefulShutdownMs),
    declare('B-17', 'force-shutdown', null, null, config.forceShutdownMs),
    declare(
      'B-18',
      'stop-audit-allowance',
      null,
      null,
      config.stopAuditAllowanceMs
    ),
    declare(
      'B-19',
      'quarantine-release',
      null,
      null,
      restartQuarantineReleaseBoundMs(config)
    ),
    declare(
      'B-20',
      'reconciliation-end-to-end',
      null,
      null,
      reconciliationEndToEndBoundMs(config)
    ),
  ])
}

export const BL020_DECLARED_BOUNDS = computeBl020Bounds()

export function bl020BoundValueMs(
  id: Bl020BoundId,
  config: ProjectRuntimeConfig = createProjectRuntimeConfig()
): number {
  const declared = computeBl020Bounds(config).find((bound) => bound.id === id)
  if (declared === undefined)
    throw new Error('Unknown BL-020 bound identifier: ' + id)
  return declared.valueMs
}

const QUARANTINE_BOUND_SCENARIOS: readonly Bl020ScenarioId[] = Object.freeze([
  'S-6',
  'S-11',
  'S-46',
  'S-54',
])
const CLIENT_BOUND_SCENARIOS: readonly Bl020ScenarioId[] = Object.freeze([
  'S-32',
  'S-33',
  'S-34',
  'S-35',
  'S-36',
  'S-37',
  'S-65',
  'S-66',
  'S-72',
  'S-73',
])
/**
 * The ten catalog scenarios whose rendered proof the web component lane owns.
 * They are exactly the client-bound scenarios above, named once so the bound
 * table, the committed-row join, and the lane that executes them cannot drift.
 */
export const BL020_COMPONENT_LANE_SCENARIOS: readonly Bl020ScenarioId[] =
  CLIENT_BOUND_SCENARIOS

/**
 * The scenarios the mutation lane's baseline executes as themselves. Every
 * other catalog identity in that baseline is a structural copy, which is a
 * validator substrate and never committed evidence.
 */
export const BL020_EXECUTED_BASELINE_SCENARIOS = Object.freeze([
  'S-69',
  'S-70',
  'S-71',
  'S-74',
  'S-75',
] as const)
const RECONCILE_BOUND_SCENARIOS: readonly Bl020ScenarioId[] = Object.freeze([
  'S-49',
  'S-55',
])
const TWO_RECORD_BOUND_SCENARIOS: readonly Bl020ScenarioId[] = Object.freeze([
  'S-71',
])

/** The declared bound identifier for every scenario, in catalog order. */
export const BL020_SCENARIO_BOUNDS: Readonly<
  Record<Bl020ScenarioId, Bl020BoundId>
> = Object.freeze(
  Object.fromEntries(
    BL020_SCENARIOS.map((scenario) => [
      scenario,
      QUARANTINE_BOUND_SCENARIOS.includes(scenario)
        ? 'B-6'
        : CLIENT_BOUND_SCENARIOS.includes(scenario)
          ? 'B-13'
          : RECONCILE_BOUND_SCENARIOS.includes(scenario)
            ? 'B-20'
            : TWO_RECORD_BOUND_SCENARIOS.includes(scenario)
              ? 'B-8'
              : 'B-5',
    ])
  ) as Record<Bl020ScenarioId, Bl020BoundId>
)

export const BL020_CLOSE_PHASES = Object.freeze([
  'drain',
  'resolve-admissions-and-quarantine',
  'release',
  'sweep',
  'confirm',
  'remove',
  'retire',
] as const)
export type Bl020ClosePhase = (typeof BL020_CLOSE_PHASES)[number]

/**
 * Named non-phase seams a row may additionally declare. `running-reuse-await`
 * and `starting-join-await` are the two late-acquisition seams of `M-18`.
 */
export const BL020_CLOSE_SEAMS = Object.freeze([
  'route-entry',
  'admission-order',
  'claim-install',
  'cardinality-gate',
  'running-reuse-await',
  'starting-join-await',
  'contender-join',
  'persisted-absence',
  'shutdown-head',
] as const)
export type Bl020CloseSeam = (typeof BL020_CLOSE_SEAMS)[number]

export const BL020_LATE_ACQUISITION_SEAMS: readonly Bl020CloseSeam[] =
  Object.freeze(['running-reuse-await', 'starting-join-await'])

export const BL020_PRIMITIVE_CALLS = Object.freeze([
  'terminate',
  'audit',
  'isAlive',
  'probeHealth',
  'signal',
] as const)
export type Bl020PrimitiveCall = (typeof BL020_PRIMITIVE_CALLS)[number]

export const BL020_RESIDUAL_CLASSES = Object.freeze([
  'selectedRuntimeProcesses',
  'attributableDescendants',
  'listeners',
  'proxyPendingOperations',
  'proxyHttpRequests',
  'proxyHttpResponses',
  'proxyRawSockets',
  'proxyWebSockets',
  'ownershipRecords',
  'pendingAdmissions',
  'quarantinedIdentities',
  'closeClaims',
  'inFlightCloseTasks',
] as const)
export type Bl020ResidualClass = (typeof BL020_RESIDUAL_CLASSES)[number]

export const BL020_CONFIRMATION_CLAUSES = Object.freeze([
  'connections',
  'ownership',
  'quarantine',
  'pendingAdmissions',
  'inFlightLifecycle',
  'releaseAudits',
  'generationIdentity',
  'notRetired',
] as const)
export type Bl020ConfirmationClause =
  (typeof BL020_CONFIRMATION_CLAUSES)[number]

export const BL020_PROXY_AUDIT_COUNTS = Object.freeze([
  'pendingOperations',
  'httpRequests',
  'httpResponses',
  'rawSockets',
  'webSockets',
] as const)
export type Bl020ProxyAuditCount = (typeof BL020_PROXY_AUDIT_COUNTS)[number]

export const BL020_ELAPSED_ORIGINS = Object.freeze([
  'claim',
  'route-entry',
] as const)
export type Bl020ElapsedOrigin = (typeof BL020_ELAPSED_ORIGINS)[number]

export const BL020_TEARDOWN_CLASSES = Object.freeze([
  'apiProcesses',
  'workbenchProcesses',
  'attributableDescendants',
  'listeners',
  'activeRequests',
  'disposableFixtures',
] as const)
export type Bl020TeardownClass = (typeof BL020_TEARDOWN_CLASSES)[number]

/**
 * The nine classes the independent residual audit re-observes after the
 * designated proof, from host, database, filesystem, process, listener, and
 * request observation rather than from any recorded matrix claim.
 */
export const BL020_AUDIT_RESIDUAL_CLASSES = Object.freeze([
  'apiProcesses',
  'workbenchProcesses',
  'attributableDescendants',
  'listeners',
  'proxyConnections',
  'timers',
  'inFlightCloseOperations',
  'databaseSidecars',
  'disposableFixtures',
] as const)
export type Bl020AuditResidualClass =
  (typeof BL020_AUDIT_RESIDUAL_CLASSES)[number]

/** The eleven published close route error categories, in declared order. */
export const BL020_ROUTE_ERROR_CATEGORIES = Object.freeze([
  'invalid_project_id',
  'project_not_found',
  'project_close_failed',
  'runtime_start_in_progress',
  'runtime_stop_in_progress',
  'runtime_restart_in_progress',
  'runtime_reconcile_in_progress',
  'runtime_reconcile_unresolved',
  'runtime_release_unconfirmed',
  'runtime_close_ownership_unresolved',
  'runtime_manager_shutdown',
] as const)
export type Bl020RouteErrorCategory =
  (typeof BL020_ROUTE_ERROR_CATEGORIES)[number]

export const BL020_ROUTE_STATUS_ROWS = 12

/**
 * The row every sibling lifecycle route must publish so a close in progress is
 * refused with its own category rather than a generic conflict.
 */
const CLOSE_IN_PROGRESS_STATUS_ROW =
  /'close-in-progress':\s*\[409,\s*'runtime_close_in_progress'\]/u
export const BL020_PROXY_FAILURE_TABLE_ROWS = 32

/** Prior committed evidence whose bytes this change set must not disturb. */
export const BL020_PRESERVED_EVIDENCE = Object.freeze({
  'test-results/bl-017/runtime-stop-matrix.json':
    'c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3',
  'test-results/bl-018/runtime-restart-matrix.json':
    'fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880',
  'test-results/bl-019/runtime-reconcile-matrix.json':
    '5df04aa72e5d4306685255511747838f96e0b9da9c319dd7668cb769282eea4b',
} as const)

/**
 * The single declared regeneration of section 21: the BL-011 workbench failure
 * matrix `tableHash`, moving off this base-SHA value because
 * `WORKBENCH_FAILURE_TABLE` gains two rows.
 */
export const BL020_REGENERATED_TABLE_BASE_SHA256 =
  '2273128ddfb69c81bbea8b8a09e55706291f433d8d776f09623d13567f633b15'

export const BL020_PUBLIC_STATE_VOCABULARY: readonly PublicRuntimeState[] =
  PUBLIC_RUNTIME_STATES
export const BL020_CLOSE_OUTCOMES = RUNTIME_CLOSE_OUTCOMES
export const BL020_CLOSE_REJECTION_CATEGORIES =
  RUNTIME_CLOSE_REJECTION_CATEGORIES

/**
 * The settled results reachable **before** the claim-installing synchronous
 * section, and therefore the only ones that may carry a null
 * `claimInstalledAt`. Execution of the delivered admission order shows eight,
 * not three: alongside the manager-shutdown head, the persisted absence, and a
 * joined contender, the five sibling-lifecycle refusals of admission steps 4
 * through 8 are all returned by `close()` before the claim is installed.
 */
export const BL020_PRE_CLAIM_SETTLEMENTS = Object.freeze([
  'manager-shutdown',
  'persisted-absence',
  'contender-join',
  'reconcile-in-progress',
  'reconcile-unresolved',
  'start-in-progress',
  'restart-in-progress',
  'stop-in-progress',
] as const)
export type Bl020PreClaimSettlement =
  (typeof BL020_PRE_CLAIM_SETTLEMENTS)[number]

export const BL020_DECLARED_COUNTS = Object.freeze({
  scenarios: 75,
  guards: 28,
  mutations: 18,
  bounds: 20,
  episodes: 7,
  preClaimSettlements: 8,
  selectedSources: 15,
  evidenceWriters: 3,
  productionEntrypoints: 2,
  validationOnlyModules: 5,
  importDeltaViolationCodes: 7,
  closePhases: 7,
  confirmationClauses: 8,
  residualClasses: 13,
  auditResidualClasses: 9,
  primitiveCalls: 5,
  rejectionCategories: 9,
  routeErrorCategories: 11,
  routeStatusRows: 12,
  proxyFailureTableRows: 32,
} as const)

/**
 * The three deadlines an admitted close arms on the injected scheduler — the
 * drain allowance, the cardinality-aware release bound, and the cardinality-
 * aware overall bound. Arming all three is a production observation only
 * `runClose` can make, so it is the witness that a claim was installed.
 */
export const BL020_ADMITTED_CLOSE_DEADLINE_ARMS = 3

/**
 * Everything a scenario observes about **where** its subject close settled.
 * Admission is decided from the first two members alone; the settled category
 * only ever *names* a site whose pre-claim position the observations already
 * established, so no member of this record is a settled-category list.
 */
export interface CloseAdmissionObservation {
  /** Close deadlines the subject armed on the injected scheduler. */
  readonly armedCloseDeadlines: number
  /** The subject settled at the one post-claim cardinality-gate site. */
  readonly settledAtCardinalityGate: boolean
  /** The injected persistence read resolved `undefined` for the subject. */
  readonly persistedReadResolvedAbsent: boolean
  /** A concurrent close for the same project armed its deadlines and won. */
  readonly lostToConcurrentClose: boolean
  /** The site name the subject's own settlement carries, when it has one. */
  readonly settledSiteName: string | null
  /** The monotonic sample the subject's admission read took. */
  readonly admissionReadAt: number | null
}

/**
 * The site-keyed discriminator of action-plan section 15. Admission is read
 * from production observations — three armed close deadlines, or the single
 * post-claim cardinality-gate site — and never from the settled category,
 * because `manager-shutdown` and `already-absent` are each reachable on both
 * sides of the claim and a contender inherits any winner rejection verbatim.
 */
export function derivePreClaimSettlement(
  observation: CloseAdmissionObservation
): Bl020PreClaimSettlement | null {
  if (observation.armedCloseDeadlines >= BL020_ADMITTED_CLOSE_DEADLINE_ARMS)
    return null
  if (observation.settledAtCardinalityGate) return null
  if (observation.lostToConcurrentClose) return 'contender-join'
  if (observation.persistedReadResolvedAbsent) return 'persisted-absence'
  const site = observation.settledSiteName
  if (
    site === null ||
    !(BL020_PRE_CLAIM_SETTLEMENTS as readonly string[]).includes(site)
  )
    throw new Error(
      'BL-020 observed a pre-claim settlement outside the frozen enumeration: ' +
        String(site)
    )
  return site as Bl020PreClaimSettlement
}

export interface CloseAdmissionWitness {
  readonly preClaimSettlement: Bl020PreClaimSettlement | null
  readonly claimInstalledAt: number | null
  readonly elapsedOrigin: Bl020ElapsedOrigin
}

/**
 * The three timing members a row carries, derived together so no row can name
 * a site and still carry a claim instant. `claimInstalledAt` is the monotonic
 * sample the admission read took, because production runs from that resolution
 * to `closeClaims.set` with no suspension.
 */
export function deriveCloseAdmissionWitness(
  observation: CloseAdmissionObservation
): CloseAdmissionWitness {
  const preClaimSettlement = derivePreClaimSettlement(observation)
  const admittedBySite = preClaimSettlement === null
  if (admittedBySite && observation.admissionReadAt === null)
    throw new Error(
      'BL-020 observed an admitted close with no admission-read instant'
    )
  return Object.freeze({
    preClaimSettlement,
    claimInstalledAt: admittedBySite ? observation.admissionReadAt : null,
    elapsedOrigin: admittedBySite ? 'claim' : 'route-entry',
  })
}

// ---------------------------------------------------------------------------
// Source guards
// ---------------------------------------------------------------------------

/** The fifteen implementation sources the structural guards scan. */
export interface SelectedCloseSources {
  readonly runtimeContract: string
  readonly runtimeManager: string
  readonly runtimeProcess: string
  readonly proxyContract: string
  readonly proxyManager: string
  readonly closeService: string
  readonly persistence: string
  readonly library: string
  readonly projectsRoute: string
  readonly stopRoute: string
  readonly restartRoute: string
  readonly app: string
  readonly webProjects: string
  readonly webRuntimeState: string
  readonly webProjectHome: string
}

export const SELECTED_CLOSE_SOURCE_PATHS: Readonly<
  Record<keyof SelectedCloseSources, string>
> = Object.freeze({
  runtimeContract: 'apps/api/src/project-runtime-contract.ts',
  runtimeManager: 'apps/api/src/project-runtime-manager.ts',
  runtimeProcess: 'apps/api/src/project-runtime-process.ts',
  proxyContract: 'apps/api/src/workbench-proxy-contract.ts',
  proxyManager: 'apps/api/src/workbench-proxy-manager.ts',
  closeService: 'apps/api/src/project-close.ts',
  persistence: 'apps/api/src/project-persistence.ts',
  library: 'apps/api/src/project-library.ts',
  projectsRoute: 'apps/api/src/routes/projects.ts',
  stopRoute: 'apps/api/src/routes/project-runtime-stop.ts',
  restartRoute: 'apps/api/src/routes/project-runtime-restart.ts',
  app: 'apps/api/src/app.ts',
  webProjects: 'apps/web/src/projects.ts',
  webRuntimeState: 'apps/web/src/runtime-state.ts',
  webProjectHome: 'apps/web/src/use-project-home.ts',
})

/** The only code permitted to write a committed BL-020 artifact. */
export interface CommittedEvidenceWriters {
  readonly evidenceModule: string
  readonly residualAuditCli: string
  readonly matrixTest: string
}

export const COMMITTED_EVIDENCE_WRITER_PATHS: Readonly<
  Record<keyof CommittedEvidenceWriters, string>
> = Object.freeze({
  evidenceModule: 'apps/api/src/project-close-evidence.ts',
  residualAuditCli: 'apps/api/src/cli/project-close-residual-audit.ts',
  matrixTest: 'apps/api/test/project-close-matrix.test.ts',
})

/**
 * The two processes a deployed Ascend actually starts: the API entry the
 * `justfile` builds and runs, and the browser entry the web bundle is built
 * from. `G-23`'s governed scope is the static import closure of these files,
 * so what the product executes is computed from the repository rather than
 * declared by the file being judged.
 */
export const BL020_PRODUCTION_ENTRYPOINTS = Object.freeze([
  'apps/api/src/server.ts',
  'apps/web/src/main.tsx',
] as const)

/**
 * The only modules outside a test location this Plan ratifies as validation
 * owned. They live under `src/` for build and type-checking reasons and are
 * never imported by a deployed entry point. Membership is a Plan decision
 * recorded here, never a property a module may claim for itself, and growing
 * this list to make a failure go away is a return to Plan.
 */
export const BL020_VALIDATION_ONLY_MODULES = Object.freeze([
  'apps/api/src/cli/project-close-residual-audit.ts',
  'apps/api/src/project-close-evidence.ts',
  'apps/api/src/runtime-stop-evidence.ts',
  'apps/api/src/runtime-restart-evidence.ts',
  'apps/web/src/project-close-component-evidence.ts',
] as const)

/**
 * The seven distinct conditions `G-23` fails on, in the order the guard
 * reports them. Each has its own negative control, so none can pass vacuously
 * and none can absorb another's failure.
 */
export const BL020_IMPORT_DELTA_VIOLATION_CODES = Object.freeze([
  'governed-write-capable-import-added',
  'selected-source-degoverned',
  'changed-file-unmeasured',
  'base-comparison-incomplete',
  'role-misclassified',
  'validation-module-executable',
  'governed-scope-reduced',
] as const)
export type Bl020ImportDeltaViolationCode =
  (typeof BL020_IMPORT_DELTA_VIOLATION_CODES)[number]

export const BL020_GUARD_IDS = Object.freeze([
  'G-1',
  'G-2',
  'G-3',
  'G-4',
  'G-5',
  'G-6',
  'G-7',
  'G-8',
  'G-9',
  'G-10',
  'G-11',
  'G-12',
  'G-13',
  'G-14',
  'G-15',
  'G-16',
  'G-17',
  'G-18',
  'G-19',
  'G-20',
  'G-21',
  'G-22',
  'G-23',
  'G-24',
  'G-25',
  'G-26',
  'G-27',
  'G-28',
] as const)
export type Bl020GuardId = (typeof BL020_GUARD_IDS)[number]

export interface Bl020GuardDeclaration {
  readonly id: Bl020GuardId
  readonly code: string
  /**
   * The frozen source set the guard draws from. `G-23` alone declares
   * `computed`: revision 8 derives its scope from the repository's own entry
   * point closure, so it may not be declared by a fixed file list.
   */
  readonly sourceSet: 'selected' | 'writers' | 'computed'
  readonly scannedFiles: readonly string[]
  readonly kind: 'source' | 'executed' | 'differential'
}

const selectedFiles = (
  ...keys: readonly (keyof SelectedCloseSources)[]
): readonly string[] =>
  Object.freeze(keys.map((key) => SELECTED_CLOSE_SOURCE_PATHS[key]))

export const BL020_GUARDS: readonly Bl020GuardDeclaration[] = Object.freeze([
  {
    id: 'G-1',
    code: 'commit-removal-single-site',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-2',
    code: 'commit-removal-confirmation-dominance',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-3',
    code: 'durable-removal-single-authority',
    sourceSet: 'selected',
    scannedFiles: selectedFiles(
      'closeService',
      'library',
      'persistence',
      'projectsRoute',
      'stopRoute',
      'restartRoute',
      'app',
      'runtimeManager',
      'webProjects',
      'webProjectHome'
    ),
    kind: 'source',
  },
  {
    id: 'G-4',
    code: 'entry-install-single-authority',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-5',
    code: 'close-region-no-fallible-delay',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-6',
    code: 'close-deadline-scheduler-only',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-7',
    code: 'proxy-close-no-self-derived-bound',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('proxyManager'),
    kind: 'source',
  },
  {
    id: 'G-8',
    code: 'proxy-close-token-scoped',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('proxyManager'),
    kind: 'source',
  },
  {
    id: 'G-9',
    code: 'proxy-close-no-global-mutation',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('proxyManager'),
    kind: 'source',
  },
  {
    id: 'G-10',
    code: 'claim-install-no-suspension',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-11',
    code: 'claim-deleted-on-every-settlement',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-12',
    code: 'close-region-no-foreign-lifecycle-name',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-13',
    code: 'close-region-single-lifecycle-emission',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-14',
    code: 'project-closed-single-site',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('projectsRoute'),
    kind: 'source',
  },
  {
    id: 'G-15',
    code: 'project-directory-content-non-mutation',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeProcess', 'library'),
    kind: 'executed',
  },
  {
    id: 'G-16',
    code: 'persistence-schema-unchanged',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('persistence', 'library'),
    kind: 'differential',
  },
  {
    id: 'G-17',
    code: 'delivered-vocabularies-preserved',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeContract'),
    kind: 'source',
  },
  {
    id: 'G-18',
    code: 'workbench-failure-table-exhaustive',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('proxyContract'),
    kind: 'source',
  },
  {
    id: 'G-19',
    code: 'close-route-vocabulary-and-status-map',
    sourceSet: 'selected',
    scannedFiles: selectedFiles(
      'projectsRoute',
      'stopRoute',
      'restartRoute',
      'webProjects',
      'webRuntimeState'
    ),
    kind: 'source',
  },
  {
    id: 'G-20',
    code: 'client-timeout-exceeds-manager-bound',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('webProjects', 'runtimeContract'),
    kind: 'source',
  },
  {
    id: 'G-21',
    code: 'post-await-claim-rechecks',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-22',
    code: 'evidence-writer-redaction',
    sourceSet: 'writers',
    scannedFiles: Object.freeze([
      COMMITTED_EVIDENCE_WRITER_PATHS.evidenceModule,
      COMMITTED_EVIDENCE_WRITER_PATHS.residualAuditCli,
      COMMITTED_EVIDENCE_WRITER_PATHS.matrixTest,
    ]),
    kind: 'source',
  },
  {
    id: 'G-23',
    code: BL020_IMPORT_DELTA_VIOLATION_CODES[0],
    sourceSet: 'computed',
    scannedFiles: Object.freeze([]),
    kind: 'differential',
  },
  {
    id: 'G-24',
    code: 'sweep-units-gated',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeContract', 'runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-25',
    code: 'confirmation-removal-adjacency',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-26',
    code: 'runtime-closing-never-installed',
    sourceSet: 'selected',
    scannedFiles: selectedFiles(
      'runtimeManager',
      'runtimeContract',
      'webRuntimeState'
    ),
    kind: 'source',
  },
  {
    id: 'G-27',
    code: 'sealed-window-discipline',
    sourceSet: 'selected',
    scannedFiles: selectedFiles('runtimeManager'),
    kind: 'source',
  },
  {
    id: 'G-28',
    code: 'admission-site-discrimination',
    sourceSet: 'writers',
    scannedFiles: Object.freeze([
      COMMITTED_EVIDENCE_WRITER_PATHS.evidenceModule,
      COMMITTED_EVIDENCE_WRITER_PATHS.residualAuditCli,
      COMMITTED_EVIDENCE_WRITER_PATHS.matrixTest,
    ]),
    kind: 'source',
  },
])

// --- guard primitives -------------------------------------------------------

function countMatches(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length
}

/**
 * Slices `source` between the first occurrence of `from` and the first
 * occurrence of `to` at or after it. Throws when either anchor is missing so a
 * guard can never pass vacuously against a renamed region.
 */
function sliceBetween(source: string, from: string, to: string): string {
  const start = source.indexOf(from)
  if (start < 0) throw new Error('Missing source anchor: ' + from)
  const end = source.indexOf(to, start + from.length)
  if (end < 0) throw new Error('Missing source anchor: ' + to)
  return source.slice(start, end)
}

/** The lexically declared close region of `G-5`, `G-6`, `G-12`, and `G-13`. */
export function closeRegionSource(runtimeManager: string): string {
  return (
    sliceBetween(
      runtimeManager,
      '  const closeRejection = (',
      '  const start = async ('
    ) +
    sliceBetween(
      runtimeManager,
      '  const retireProject = (projectId: string): void => {',
      '  const register = ('
    )
  )
}

function runClose(runtimeManager: string): string {
  return sliceBetween(
    runtimeManager,
    '  const runClose = async (',
    '  const close = async ('
  )
}

function closeBody(runtimeManager: string): string {
  return sliceBetween(
    runtimeManager,
    '  const close = async (',
    '  const start = async ('
  )
}

function startBody(runtimeManager: string): string {
  return sliceBetween(
    runtimeManager,
    '  const start = async (',
    '    const generation = Symbol(input.projectId)'
  )
}

function proxyCloseBody(proxyManager: string): string {
  return sliceBetween(
    proxyManager,
    '  const closeProject = async (',
    '  const emit = (event: WorkbenchEventInput): void =>'
  )
}

function installEntryBody(runtimeManager: string): string {
  return sliceBetween(
    runtimeManager,
    '  const installEntry = (',
    '  /** Quarantine key for an identity'
  )
}

function registerOwnershipBody(runtimeManager: string): string {
  return sliceBetween(
    runtimeManager,
    '  const registerOwnership = (',
    '  const auditConfirmsAbsence = ('
  )
}

/** The `G-25` region: from the last connection re-observation to removal. */
function confirmationRegion(runtimeManager: string): string {
  const body = runClose(runtimeManager)
  const marker = 'observed = input.auditConnections()'
  const last = body.lastIndexOf(marker)
  if (last < 0) throw new Error('Missing source anchor: ' + marker)
  const removal = body.indexOf('input.commitRemoval()', last)
  if (removal < 0) throw new Error('Missing source anchor: input.commitRemoval')
  return body.slice(last + marker.length, removal)
}

/** Tuple members declared as quoted string literals inside a source slice. */
export function declaredTupleMembers(
  source: string,
  declaration: string
): readonly string[] {
  const start = source.indexOf(declaration)
  if (start < 0) throw new Error('Missing source anchor: ' + declaration)
  const end = source.indexOf('] as const', start)
  if (end < 0) throw new Error('Missing tuple terminator for: ' + declaration)
  return Object.freeze(
    [...source.slice(start, end).matchAll(/'([^']*)'/gu)].map(
      (match) => match[1] ?? ''
    )
  )
}

/** Write-capable filesystem members, frozen by `G-15` and `G-23`. */
export const BL020_WRITE_CAPABLE_FS_MEMBERS = Object.freeze([
  'appendFile',
  'chmod',
  'chown',
  'copyFile',
  'cp',
  'createWriteStream',
  'link',
  'mkdir',
  'mkdtemp',
  'open',
  'rename',
  'rm',
  'rmdir',
  'symlink',
  'truncate',
  'unlink',
  'utimes',
  'writeFile',
] as const)
export type Bl020WriteCapableFsMember =
  (typeof BL020_WRITE_CAPABLE_FS_MEMBERS)[number]

/** Extracts the `node:fs` and `node:fs/promises` import members of a source. */
export function fileSystemImportMembers(source: string): readonly string[] {
  const members = new Set<string>()
  for (const match of source.matchAll(
    /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'node:fs(?:\/promises)?'/gu
  )) {
    for (const raw of (match[1] ?? '').split(',')) {
      const member =
        raw
          .trim()
          .split(/\s+as\s+/u)[0]
          ?.trim() ?? ''
      if (member.length > 0) members.add(member)
    }
  }
  return Object.freeze([...members].sort())
}

export const BL020_DELIVERED_VOCABULARIES = Object.freeze({
  RUNTIME_ENTRY_STATES: Object.freeze([
    'registered',
    'starting',
    'running',
    'stopping',
    'restarting',
    'reconciling',
    'failed',
  ]),
  RUNTIME_LIFECYCLE_TARGETS: Object.freeze([
    'starting',
    'running',
    'failed',
    'stopping',
    'stopped',
    'restarting',
    'reconciling',
  ]),
  PUBLIC_RUNTIME_STATES: Object.freeze([
    'Stopped',
    'Starting',
    'Running',
    'Failed',
  ]),
  RUNTIME_LIFECYCLE_EVENTS: Object.freeze([
    'runtime.start.requested',
    'runtime.start.succeeded',
    'runtime.start.failed',
    'runtime.health.changed',
    'runtime.stop.requested',
    'runtime.stop.succeeded',
    'runtime.restart.requested',
    'runtime.restart.succeeded',
    'runtime.restart.failed',
    'runtime.reconcile.requested',
    'runtime.reconcile.succeeded',
    'runtime.reconcile.absent',
    'runtime.reconcile.failed',
  ]),
} as const)

export interface SelectedCloseSourceGuardInput {
  readonly sources: SelectedCloseSources
  /**
   * Base-SHA text for the differential guards `G-16` and `G-23`. Omitting a
   * member makes those guards report an unproven differential rather than
   * silently passing.
   */
  readonly baseSources?: Partial<SelectedCloseSources>
}

/**
 * Runs every static source guard and returns the violation codes it found.
 * An empty result means all scanned guards accepted the delivered sources.
 */
export function validateSelectedCloseSource(
  input: SelectedCloseSourceGuardInput
): readonly string[] {
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }
  const { sources } = input
  const manager = sources.runtimeManager
  const region = closeRegionSource(manager)
  const run = runClose(manager)
  const closeSection = closeBody(manager)

  // G-1: exactly one lexical `commitRemoval()` invocation site.
  if (countMatches(manager, /input\.commitRemoval\(\)/gu) !== 1)
    fail('commit-removal-single-site')

  // G-2: the removal site is dominated by the confirmation predicate.
  const notRetiredIndex = run.indexOf(
    'const notRetired = !retiredProjects.has(projectId)'
  )
  const predicateIndex = run.indexOf('if (!(', notRetiredIndex)
  const removalIndex = run.indexOf('input.commitRemoval()')
  if (
    notRetiredIndex < 0 ||
    predicateIndex < 0 ||
    removalIndex < 0 ||
    !(notRetiredIndex < predicateIndex && predicateIndex < removalIndex) ||
    !run.slice(predicateIndex, removalIndex).includes('return unconfirmed()')
  )
    fail('commit-removal-confirmation-dominance')

  // G-3: durable removal is named in exactly one place. The close service's
  // `commitRemoval` callable is the sole construction point; the library's own
  // member definition is the durable surface it delegates to and is not a
  // caller. Any other file naming either receiver fails.
  const libraryRemoval = /\b(?:library|projectLibrary)\.closeProject\(/gu
  const repositoryRemoval =
    /\b(?:repository|projectCloseRepository|closeRepository)\.closeProject\(/gu
  const sourceKeys = Object.keys(
    SELECTED_CLOSE_SOURCE_PATHS
  ) as (keyof SelectedCloseSources)[]
  const libraryCallers = sourceKeys.filter((key) =>
    libraryRemoval.test(sources[key])
  )
  const repositoryCallers = sourceKeys.filter((key) =>
    repositoryRemoval.test(sources[key])
  )
  const serviceCommitRemoval = sliceBetween(
    sources.closeService,
    'commitRemoval: () =>',
    '})'
  )
  const libraryMemberDefinition = sliceBetween(
    sources.library,
    'closeProject: (id) =>',
    '\n'
  )
  if (
    JSON.stringify(libraryCallers) !== JSON.stringify(['closeService']) ||
    JSON.stringify(repositoryCallers) !== JSON.stringify(['library']) ||
    countMatches(sources.closeService, libraryRemoval) !== 1 ||
    countMatches(serviceCommitRemoval, libraryRemoval) !== 1 ||
    countMatches(sources.library, repositoryRemoval) !== 1 ||
    countMatches(libraryMemberDefinition, repositoryRemoval) !== 1
  )
    fail('durable-removal-single-authority')

  // G-4: one entry-install authority.
  const install = installEntryBody(manager)
  const installCallSites = [...manager.matchAll(/installEntry\(/gu)].length
  if (
    countMatches(manager, /entries\.set\(/gu) !== 1 ||
    countMatches(install, /entries\.set\(/gu) !== 1 ||
    !install.includes('entryInstallRefusal(projectId, owner)') ||
    installCallSites < 2
  )
    fail('entry-install-single-authority')
  // No `installEntry(` call site may discard its boolean result: each is read
  // by a refusal branch, an assertion, or a returned value.
  const consumingPrefix = /(?:if \(!?|!|\?\?|&&|\|\||return|=|=>|\()$/u
  for (const match of manager.matchAll(/\binstallEntry\(/gu)) {
    const index = match.index
    const preceding = manager.slice(Math.max(0, index - 80), index)
    if (preceding.trimEnd().endsWith('const installEntry')) continue
    if (!consumingPrefix.test(preceding.replace(/\s+/gu, ' ').trimEnd()))
      fail('entry-install-single-authority')
  }

  // G-5: no awaited fallible delay primitive inside the close region.
  if (/await[^\n]*\.sleep\(/u.test(region) || /await\s+delay\(/u.test(region))
    fail('close-region-no-fallible-delay')

  // G-6: every close deadline is armed from the injected scheduler.
  const deadlineArms = countMatches(
    region,
    /deadlineScheduler\.scheduleDeadline\(/gu
  )
  if (
    deadlineArms !== 3 ||
    /\bsetTimeout\(/u.test(region) ||
    /\bsetInterval\(/u.test(region) ||
    /AbortSignal\.timeout\(/u.test(region)
  )
    fail('close-deadline-scheduler-only')

  // G-7: the proxy drain derives no bound of its own. Its only timer is a
  // cancellable fixed re-poll of the settlement predicate.
  const proxyClose = proxyCloseBody(sources.proxyManager)
  const settleGuards = countMatches(
    proxyClose,
    /settled\(\)\s*\|\|\s*signal\.aborted/gu
  )
  if (
    /\bsetInterval\(/u.test(proxyClose) ||
    /scheduleDeadline\(/u.test(proxyClose) ||
    /AbortSignal\.timeout\(/u.test(proxyClose) ||
    /Date\.now\(\)/u.test(proxyClose) ||
    /performance\.now\(\)/u.test(proxyClose) ||
    countMatches(proxyClose, /setTimeout\(/gu) !==
      countMatches(proxyClose, /pollHandle = setTimeout\(check, 1\)/gu) ||
    countMatches(proxyClose, /clearTimeout\(pollHandle\)/gu) !== 1 ||
    countMatches(
      proxyClose,
      /signal\.removeEventListener\('abort', check\)/gu
    ) !== 1 ||
    countMatches(proxyClose, /completed = true/gu) !== 1 ||
    settleGuards !== 1 ||
    countMatches(proxyClose, /\bresolve\(\)/gu) !== settleGuards
  )
    fail('proxy-close-no-self-derived-bound')

  // G-8: every resource map is filtered by the derived project token.
  const selectedCalls = countMatches(proxyClose, /selected\(/gu)
  if (
    !proxyClose.includes(
      'const projectToken = deriveProjectOwnerToken(projectId)'
    ) ||
    !proxyClose.includes('.filter(([, token]) => token === projectToken)') ||
    selectedCalls < 8 ||
    /\bfor \(const [a-zA-Z]+ of (?:pending|httpRequests|httpResponses|rawSockets|webSockets)\)/u.test(
      proxyClose
    )
  )
    fail('proxy-close-token-scoped')

  // G-9: the drain mutates no global proxy state.
  if (
    /shuttingDown\s*=/u.test(proxyClose) ||
    /resolveTarget\(/u.test(proxyClose) ||
    /projectRuntime\.start\(/u.test(proxyClose) ||
    /\.clear\(\)/u.test(proxyClose)
  )
    fail('proxy-close-no-global-mutation')

  // G-10: no suspension between the entry read and the claim install.
  const claimInstall = sliceBetween(
    closeSection,
    'const current = entries.get(projectId)',
    'closeClaims.set(projectId, claim)'
  )
  if (/\bawait\b/u.test(claimInstall)) fail('claim-install-no-suspension')

  // G-11: the claim is deleted on every settlement path including faults.
  const finallyBlock = sliceBetween(
    closeSection,
    '      } finally {',
    '    })()'
  )
  if (
    countMatches(closeSection, /closeClaims\.delete\(projectId\)/gu) !== 2 ||
    !finallyBlock.includes(
      'if (closeClaims.get(projectId) === claim) closeClaims.delete(projectId)'
    ) ||
    !closeSection.includes('faultClaim(error)')
  )
    fail('claim-deleted-on-every-settlement')

  // G-12: no foreign lifecycle event name in the close region.
  if (
    /runtime\.stop\./u.test(region) ||
    /runtime\.restart\./u.test(region) ||
    /runtime\.start\./u.test(region) ||
    /runtime\.reconcile\./u.test(region)
  )
    fail('close-region-no-foreign-lifecycle-name')

  // G-13: the only lifecycle emission in the close region is health-changed.
  const emissions = [...region.matchAll(/emit\(\{/gu)]
  if (
    emissions.length !== 1 ||
    !region
      .slice(emissions[0]?.index ?? 0)
      .startsWith("emit({\n        event: 'runtime.health.changed',")
  )
    fail('close-region-single-lifecycle-emission')

  // G-14: `project.closed` is emitted from exactly one lexical site.
  const closedEmissions = [
    ...sources.projectsRoute.matchAll(/event: PROJECT_CLOSED_EVENT/gu),
  ]
  const closedGuard = sources.projectsRoute.lastIndexOf(
    "if (result.outcome === 'closed') {",
    closedEmissions[0]?.index ?? 0
  )
  if (
    closedEmissions.length !== 1 ||
    closedGuard < 0 ||
    countMatches(sources.projectsRoute, /PROJECT_CLOSED_EVENT/gu) !== 2
  )
    fail('project-closed-single-site')

  // G-16: the close change set adds no persistence schema, migration, or
  // column reference. The surface is the set of schema-table column
  // references, schema imports, and migration invocations, compared against
  // the same files at the base revision.
  const schemaSurface = (text: string): readonly string[] =>
    Object.freeze(
      [
        ...new Set([
          ...[...text.matchAll(/\bprojects\.[A-Za-z_][A-Za-z0-9_]*/gu)].map(
            (match) => match[0]
          ),
          ...[
            ...text.matchAll(
              /(?:CREATE TABLE|ALTER TABLE|CREATE INDEX|DROP TABLE|PRAGMA user_version|sqliteTable\(|migrateDatabase\(|from '\.\/db\/schema\.js'|from '\.\/db\/migrations\.js')/gu
            ),
          ].map((match) => match[0]),
        ]),
      ].sort()
    )
  const basePersistence = input.baseSources?.persistence
  const baseLibrary = input.baseSources?.library
  if (basePersistence === undefined || baseLibrary === undefined) {
    fail('persistence-schema-unchanged')
  } else if (
    schemaSurface(sources.persistence).length === 0 ||
    JSON.stringify(schemaSurface(sources.persistence)) !==
      JSON.stringify(schemaSurface(basePersistence)) ||
    JSON.stringify(schemaSurface(sources.library)) !==
      JSON.stringify(schemaSurface(baseLibrary))
  ) {
    fail('persistence-schema-unchanged')
  }

  // G-17: delivered vocabularies retain their member tuples exactly.
  const contract = sources.runtimeContract
  const vocabularyMatches = (
    declaration: string,
    expected: readonly string[]
  ): boolean =>
    JSON.stringify(declaredTupleMembers(contract, declaration)) ===
    JSON.stringify(expected)
  if (
    !vocabularyMatches(
      'export const RUNTIME_ENTRY_STATES = [',
      BL020_DELIVERED_VOCABULARIES.RUNTIME_ENTRY_STATES
    ) ||
    !vocabularyMatches(
      'export const RUNTIME_LIFECYCLE_TARGETS = [',
      BL020_DELIVERED_VOCABULARIES.RUNTIME_LIFECYCLE_TARGETS
    ) ||
    !vocabularyMatches(
      'export const PUBLIC_RUNTIME_STATES = Object.freeze([',
      BL020_DELIVERED_VOCABULARIES.PUBLIC_RUNTIME_STATES
    ) ||
    !vocabularyMatches(
      'export const RUNTIME_LIFECYCLE_EVENTS = Object.freeze([',
      BL020_DELIVERED_VOCABULARIES.RUNTIME_LIFECYCLE_EVENTS
    )
  )
    fail('delivered-vocabularies-preserved')

  // G-18: the published proxy failure table is exhaustive over the widened
  // proxied union at exactly 32 rows in declared order.
  const table = sliceBetween(
    sources.proxyContract,
    'export const WORKBENCH_FAILURE_TABLE',
    'const failureByCategory = new Map('
  )
  const tableCategories = [...table.matchAll(/\brow\(\s*'([^']+)'/gu)].map(
    (match) => match[1] ?? ''
  )
  const proxiedUnion = declaredTupleMembers(
    contract,
    'export const RUNTIME_FAILURE_CATEGORIES = ['
  )
    .filter((category) => category !== 'manager-shutdown')
    .map((category) => 'runtime:' + category)
  if (
    tableCategories.length !== BL020_PROXY_FAILURE_TABLE_ROWS ||
    new Set(tableCategories).size !== BL020_PROXY_FAILURE_TABLE_ROWS ||
    proxiedUnion.length === 0 ||
    proxiedUnion.some((category) => !tableCategories.includes(category)) ||
    !table.includes('completeFailureRows([')
  )
    fail('workbench-failure-table-exhaustive')

  // G-19: the close route vocabulary and its status map cannot drift apart.
  const routeCategories = declaredTupleMembers(
    sources.projectsRoute,
    'export const PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES = Object.freeze(['
  )
  const resolvedRouteCategories = routeCategories.map((member) =>
    member.length > 0 ? member : ''
  )
  const declaredConstants = [
    'INVALID_PROJECT_ID',
    'PROJECT_NOT_FOUND',
    'PROJECT_CLOSE_FAILED',
  ]
  const routeVocabulary = [
    ...declaredConstants.map((name) => {
      const literal = sources.projectsRoute.match(
        new RegExp('export const ' + name + " = '([^']+)'", 'u')
      )
      return literal?.[1] ?? ''
    }),
    ...resolvedRouteCategories,
  ].filter((member) => member.length > 0)
  const statusMap = sliceBetween(
    sources.projectsRoute,
    'const PROJECT_CLOSE_REJECTION_STATUS = Object.freeze({',
    '} as const)'
  )
  const statusRows = countMatches(statusMap, /^\s+'[a-z-]+':\s*\[/gmu)
  const successRows = countMatches(
    sources.projectsRoute,
    /reply\.code\((?:200|404)\)/gu
  )
  const invalidRows = countMatches(
    sources.projectsRoute,
    /function invalidProjectId|const invalidProjectId/gu
  )
  if (
    JSON.stringify([...new Set(routeVocabulary)].sort()) !==
      JSON.stringify([...BL020_ROUTE_ERROR_CATEGORIES].sort()) ||
    statusRows + successRows + invalidRows !== BL020_ROUTE_STATUS_ROWS ||
    statusRows !== BL020_DECLARED_COUNTS.rejectionCategories ||
    !sources.stopRoute.includes("'runtime_close_in_progress'") ||
    !sources.restartRoute.includes("'runtime_close_in_progress'") ||
    !CLOSE_IN_PROGRESS_STATUS_ROW.test(sources.stopRoute) ||
    !CLOSE_IN_PROGRESS_STATUS_ROW.test(sources.restartRoute) ||
    !sources.webRuntimeState.includes("'close-release-unconfirmed'") ||
    !sources.webRuntimeState.includes("'runtime-closing'")
  )
    fail('close-route-vocabulary-and-status-map')

  // G-20: the client timeout strictly exceeds the manager's cap-evaluated bound.
  const clientTimeout = sources.webProjects.match(
    /export const PROJECT_CLOSE_TIMEOUT_MS = ([0-9_]+) as const/u
  )
  const clientTimeoutMs = Number((clientTimeout?.[1] ?? '').replace(/_/gu, ''))
  const boundConfig = createProjectRuntimeConfig()
  const managerCapBoundMs = runtimeCloseOverallBoundMs(
    boundConfig,
    true,
    boundConfig.closeOwnershipSweepCap
  )
  if (
    !Number.isSafeInteger(clientTimeoutMs) ||
    clientTimeoutMs <= managerCapBoundMs ||
    clientTimeoutMs !== BL020_CLIENT_BOUND_MS.projectClose
  )
    fail('client-timeout-exceeds-manager-bound')

  // G-21: claim rechecks at every admission seam and after every start await.
  const start = startBody(manager)
  const terminalMarkers = [
    'return joined',
    'return current.snapshot',
    'installEntry(',
    'entries.set(',
  ]
  const awaitSegments = start.split(/\bawait\b/u).slice(1)
  const missingRecheck = awaitSegments.some((segment) => {
    const terminal = terminalMarkers
      .map((marker) => segment.indexOf(marker))
      .filter((index) => index >= 0)
    if (terminal.length === 0) return false
    const earliest = Math.min(...terminal)
    return !segment.slice(0, earliest).includes('entryInstallRefusal(')
  })
  const stopSection = sliceBetween(
    manager,
    '  const stop = async (',
    '  const restart = async ('
  )
  const restartSection = sliceBetween(
    manager,
    '  const restart = async (',
    '  const ownershipRecordsFor = ('
  )
  const registerSection = sliceBetween(
    manager,
    '  const register = (projectId: string, canonicalPath: string): void => {',
    '  const waitForStarting = ('
  )
  if (
    missingRecheck ||
    countMatches(start, /entryInstallRefusal\(/gu) !== 6 ||
    countMatches(start, /refuseAcquisition\(/gu) !== 6 ||
    !stopSection.includes('closeClaims.has(input.projectId)') ||
    !restartSection.includes('closeClaims.has(input.projectId)') ||
    !registerSection.includes('entryInstallRefusal(projectId)')
  )
    fail('post-await-claim-rechecks')

  // G-23 is not scanned here. Revision 8 computes its scope from the
  // repository's own entry-point closure rather than from the frozen selected
  // set, so it is measured and asserted by `validateCloseImportDelta` over the
  // whole change set instead of over these fifteen files.

  // G-24: the sweep multiplier is gated, validated, and cap-bounded.
  const sweepCheck = sliceBetween(
    contract,
    'function checkedCloseSweepUnits(',
    'export function runtimeCloseOverallBoundMs('
  )
  if (
    !sweepCheck.includes('!Number.isSafeInteger(sweepUnits)') ||
    !sweepCheck.includes('sweepUnits < 1') ||
    !sweepCheck.includes('sweepUnits > config.closeOwnershipSweepCap') ||
    !sweepCheck.includes(
      'const units = checkedCloseSweepUnits(config, sweepUnits)'
    ) ||
    !sweepCheck.includes('units * runtimeStopOverallBoundMs(config)') ||
    /\bsweepUnits \* runtimeStopOverallBoundMs/u.test(sweepCheck) ||
    !closeSection.includes(
      'claim.sweepUnits = Math.max(1, claim.frozenOwnershipCardinality)'
    ) ||
    !closeSection.includes(
      'if (claim.frozenOwnershipCardinality > config.closeOwnershipSweepCap)'
    )
  )
    fail('sweep-units-gated')

  // G-25: nothing but the predicate, its fail-closed branch, and the seal.
  const adjacency = confirmationRegion(manager)
  const sealIndex = adjacency.indexOf('claim.sealed = true')
  if (
    /\bawait\b/u.test(adjacency) ||
    countMatches(adjacency, /input\./gu) !== 0 ||
    countMatches(adjacency, /claim\.sealed = true/gu) !== 1 ||
    countMatches(adjacency, /\bif \(/gu) !== 1 ||
    countMatches(adjacency, /\breturn\b/gu) !== 1 ||
    !adjacency.includes('return unconfirmed()') ||
    sealIndex < 0 ||
    adjacency.slice(sealIndex).replace(/\s/gu, '') !==
      'claim.sealed=trueconstremoval=' ||
    /\.(?:set|delete|push|add)\(/u.test(adjacency) ||
    /\bemit\(/u.test(adjacency) ||
    /recordCleanup\(/u.test(adjacency)
  )
    fail('confirmation-removal-adjacency')

  // G-26: `runtime-closing` is an acquisition failure only. Every construction
  // of it is consumed by a throw or a refusal expression, never installed as an
  // entry failure category, and the close region installs only
  // `close-release-unconfirmed`.
  const failureCategories = declaredTupleMembers(
    contract,
    'export const RUNTIME_FAILURE_CATEGORIES = ['
  )
  const closingConstructions = [
    ...manager.matchAll(/new RuntimeFailure\('runtime-closing'\)/gu),
  ]
  const refusalPrefix = /(?:throw|\?|\?\?|return)$/u
  const closingIsAlwaysRefused = closingConstructions.every((match) => {
    const preceding = manager
      .slice(Math.max(0, match.index - 80), match.index)
      .replace(/\s+/gu, ' ')
      .trimEnd()
    return refusalPrefix.test(preceding)
  })
  if (
    !failureCategories.includes('runtime-closing') ||
    !failureCategories.includes('close-release-unconfirmed') ||
    closingConstructions.length === 0 ||
    !closingIsAlwaysRefused ||
    /failEntry\([\s\S]{0,240}?'runtime-closing'/u.test(manager) ||
    region.includes("new RuntimeFailure('runtime-closing')") ||
    !region.includes(
      "const failure = new RuntimeFailure('close-release-unconfirmed')"
    ) ||
    !sources.webRuntimeState.includes("'runtime-closing':")
  )
    fail('runtime-closing-never-installed')

  // G-27: the sealed window.
  const ownershipRegistration = registerOwnershipBody(manager)
  const removalFailedBranch = sliceBetween(
    run,
    "if (disposition.kind === 'faulted') {",
    'retireProject(projectId)'
  )
  if (
    !install.includes('entryInstallRefusal(projectId, owner)') ||
    !manager.includes('!owner.sealed') ||
    !ownershipRegistration.includes('claim?.sealed === true') ||
    !ownershipRegistration.includes('quarantinedOwnership.set(') ||
    countMatches(manager, /claim\.sealed = true/gu) !== 1 ||
    countMatches(manager, /claim\.sealed = false/gu) !== 1 ||
    !removalFailedBranch.includes('claim.sealed = false') ||
    removalFailedBranch.indexOf('claim.sealed = false') >
      removalFailedBranch.indexOf(
        'installEntry(projectId, releasedEntry, claim)'
      )
  )
    fail('sealed-window-discipline')

  return Object.freeze(violations)
}

// ---------------------------------------------------------------------------
// Evidence-writer redaction (G-22) and artifact redaction (M-14)
// ---------------------------------------------------------------------------

/**
 * Scans a set of named sources for protected raw values. Returns the
 * `source:value` pairs that matched, so a caller can name the offender.
 */
export function scanProtectedCloseValues(input: {
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

/** Literal shapes no committed BL-020 artifact writer may ever emit. */
const FORBIDDEN_PATTERN_DECLARATION = 'const EVIDENCE_WRITER_FORBIDDEN_PATTERNS'

const EVIDENCE_WRITER_FORBIDDEN_PATTERNS: readonly (readonly [
  string,
  RegExp,
])[] = Object.freeze([
  ['absolute-path', /['"`]\/(?:home|root|workspaces|Users|var|tmp|etc)\//u],
  ['process-identity', /\bprocess\.pid\b|\bchild\.pid\b/u],
  ['port-literal', /\b(?:localhost|127\.0\.0\.1):[0-9]{2,5}\b/u],
  ['command-line', /\bexecPath\b|\bargv\.join\(/u],
  ['environment-value', /process\.env\[[^\]]+\]\s*\+/u],
  ['stack', /\.stack\b/u],
])

/**
 * The pattern table above states the shapes it forbids, so it necessarily
 * contains them. It is the one region of the evidence module the redaction
 * scan removes before reading — nothing else is exempt, and every negative
 * control injects outside it.
 */
function withoutForbiddenPatternDeclaration(source: string): string {
  const start = source.indexOf(FORBIDDEN_PATTERN_DECLARATION)
  if (start < 0) return source
  const end = source.indexOf('\n])\n', start)
  return end < 0 ? source : source.slice(0, start) + source.slice(end + 4)
}

/**
 * `G-22`: no committed evidence writer may emit a raw path, identity, port,
 * authority, command, environment value, credential, or stack.
 */
export function validateCommittedEvidenceWriters(
  writers: CommittedEvidenceWriters
): readonly string[] {
  const violations: string[] = []
  for (const [key, source] of Object.entries(writers)) {
    const scanned =
      key === 'evidenceModule'
        ? withoutForbiddenPatternDeclaration(source)
        : source
    for (const [name, pattern] of EVIDENCE_WRITER_FORBIDDEN_PATTERNS) {
      if (pattern.test(scanned))
        violations.push('evidence-writer-redaction:' + key + ':' + name)
    }
  }
  violations.push(...validateEvidenceWriterAdmissionSites(writers))
  return Object.freeze(violations)
}

/** The bindings that may decide whether a row's subject installed a claim. */
const ADMISSION_DECISION_BINDINGS =
  /const\s+(couldInstallClaim|admittedBySite)\s*=\s*([^\n]+)/gu

/** A settled close result, as a quoted literal a writer might list. */
const SETTLED_RESULT_LITERALS: readonly string[] = Object.freeze(
  (RUNTIME_CLOSE_OUTCOMES as readonly string[]).concat(
    RUNTIME_CLOSE_REJECTION_CATEGORIES
  )
)

/**
 * `G-28`: admission is discriminated by settlement **site**, never by settled
 * category. Over `CommittedEvidenceWriters` this asserts that
 * `BL020_PRE_CLAIM_SETTLEMENTS` is the frozen eight-member tuple in admission
 * order, that both admission-deciding bindings test that member's nullability,
 * and that no writer carries a list, set, or array of settled-category
 * literals it could consult instead.
 */
export function validateEvidenceWriterAdmissionSites(
  writers: CommittedEvidenceWriters
): readonly string[] {
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }
  const declaration =
    'export const BL020_PRE_CLAIM_SETTLEMENTS = Object.freeze(['
  const declared = writers.evidenceModule.includes(declaration)
    ? declaredTupleMembers(writers.evidenceModule, declaration)
    : []
  if (
    JSON.stringify(declared) !==
    JSON.stringify([...BL020_PRE_CLAIM_SETTLEMENTS])
  )
    fail('admission-site-discrimination:enumeration')

  for (const [key, source] of Object.entries(writers)) {
    // The frozen enumeration is a site tuple, not a category list, and is the
    // one declaration this scan must not read as one.
    const scanned =
      key === 'evidenceModule'
        ? source.replace(
            /export const BL020_PRE_CLAIM_SETTLEMENTS = Object\.freeze\(\[[^\]]*\]/u,
            ''
          )
        : source
    for (const group of scanned.matchAll(/\[[^[\]]*\]/gu)) {
      const listed = new Set(
        [...group[0].matchAll(/'([^']*)'/gu)]
          .map((match) => match[1] ?? '')
          .filter((literal) => SETTLED_RESULT_LITERALS.includes(literal))
      )
      if (listed.size > 1)
        fail('admission-site-discrimination:' + key + ':category-list')
    }
    if (!scanned.includes('claimInstalledAt')) continue
    const bindings = [...scanned.matchAll(ADMISSION_DECISION_BINDINGS)]
    if (bindings.length === 0)
      fail('admission-site-discrimination:' + key + ':site-test-absent')
    for (const binding of bindings) {
      const expression = binding[2] ?? ''
      if (
        !expression.includes('preClaimSettlement === null') &&
        !expression.includes('preClaimSettlement !== null')
      )
        fail('admission-site-discrimination:' + key + ':category-derived')
    }
  }
  return Object.freeze(violations)
}

// ---------------------------------------------------------------------------
// Filesystem non-mutation ledger (G-15)
// ---------------------------------------------------------------------------

export interface CloseFilesystemCall {
  readonly member: string
  readonly path: string
  readonly writeCapable: boolean
  /**
   * The repository-relative module the call was made from, recovered from the
   * executed call site. `null` when the caller lies outside the repository.
   */
  readonly origin?: string | null
  /**
   * Whether the recovered call site is an application source module rather
   * than validation code. It is derived from the observed origin, so a call
   * cannot be attributed to the harness by declaring it.
   */
  readonly productModule?: boolean
}

/**
 * One instrumented filesystem module boundary: the frozen write-capable
 * members the module exposes, and the members this instrumentation wrapped.
 * Both are read from the module namespace, so a partially instrumented
 * boundary is reported rather than assumed complete.
 */
export interface CloseFilesystemInstrumentation {
  readonly module: string
  readonly available: readonly string[]
  readonly instrumented: readonly string[]
}

export interface CloseFilesystemLedger {
  /** Every write-capable filesystem call observed during executed closes. */
  readonly calls: readonly CloseFilesystemCall[]
  /** Registered project directory roots that must never be written into. */
  readonly registeredProjectRoots: readonly string[]
  /** The runtime's own ephemeral root and the isolated database directory. */
  readonly permittedRoots: readonly string[]
  readonly instrumented: boolean
  /** Every instrumented module boundary the executed ledger was recorded at. */
  readonly instrumentation: readonly CloseFilesystemInstrumentation[]
}

function isUnder(path: string, root: string): boolean {
  if (root.length === 0) return false
  const normalizedRoot = root.endsWith('/') ? root.slice(0, -1) : root
  return path === normalizedRoot || path.startsWith(normalizedRoot + '/')
}

/**
 * `G-15`: zero write-capable filesystem call may receive a path inside any
 * registered project directory root.
 *
 * The ledger is judged on five relations, each read from an executed run: the
 * frozen write-capable set is instrumented at every module boundary that
 * exposes it; at least one registered project root is under observation; every
 * permitted root lies outside every registered root, so neither family is
 * exempt by its name; no write-capable call at all names a path inside a
 * registered root; and every write-capable call made by an application source
 * module lies inside one of the permitted families.
 */
export function validateCloseFilesystemLedger(
  ledger: CloseFilesystemLedger
): readonly string[] {
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }
  if (!ledger.instrumented) fail('project-directory-content-non-mutation')
  const instrumentedMembers = new Set<string>()
  if (ledger.instrumentation.length === 0)
    fail('project-directory-content-non-mutation')
  for (const boundary of ledger.instrumentation) {
    for (const member of boundary.available) {
      if (!boundary.instrumented.includes(member))
        fail('project-directory-content-non-mutation')
      instrumentedMembers.add(member)
    }
  }
  for (const member of BL020_WRITE_CAPABLE_FS_MEMBERS)
    if (!instrumentedMembers.has(member))
      fail('project-directory-content-non-mutation')
  if (ledger.registeredProjectRoots.length === 0)
    fail('project-directory-content-non-mutation')
  for (const permitted of ledger.permittedRoots) {
    if (ledger.registeredProjectRoots.some((root) => isUnder(permitted, root)))
      fail('project-directory-content-non-mutation')
  }
  for (const call of ledger.calls) {
    if (!call.writeCapable) continue
    if (ledger.registeredProjectRoots.some((root) => isUnder(call.path, root)))
      fail('project-directory-content-non-mutation')
    if (
      call.productModule === true &&
      !ledger.permittedRoots.some((root) => isUnder(call.path, root))
    )
      fail('project-directory-content-non-mutation')
  }
  return Object.freeze(violations)
}

// ---------------------------------------------------------------------------
// Filesystem import delta (G-23)
// ---------------------------------------------------------------------------

/** The source suffixes the change set and the closure are measured over. */
export const BL020_SOURCE_SUFFIXES = Object.freeze([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
] as const)

/** The three roles a changed file can compute to, in precedence order. */
export const BL020_CHANGED_FILE_ROLES = Object.freeze([
  'production',
  'validation-harness',
  'unclassified',
] as const)
export type Bl020ChangedFileRole = (typeof BL020_CHANGED_FILE_ROLES)[number]

/** How the change set touched a file, with a rename kept distinct. */
export type Bl020ChangeType = 'added' | 'modified' | 'renamed'

/** One repository source file, read at the branch head. */
export interface CloseSourceFileFact {
  /** Repository-relative, `/`-separated. */
  readonly file: string
  readonly text: string
}

/**
 * One file the change set adds, modifies, or renames, measured once and
 * independently of every other step. This is the census the measured entry
 * list is checked against.
 */
export interface CloseChangedFileFact {
  readonly file: string
  readonly changeType: Bl020ChangeType
  /**
   * The path the base text is read from: the **pre-rename** path for a rename,
   * the same path for a modification, and `null` for an addition.
   */
  readonly basePath: string | null
  /** The base-revision text read from `basePath`; `null` when unresolved. */
  readonly baseText: string | null
}

/**
 * Everything a measurement supplies. These are facts about the repository —
 * file texts, the git census, and the entry points the walk started from — and
 * every claim in a `CloseImportDelta` is derived from them, so the validator
 * can re-derive the closure, the census agreement, the roles, and the governed
 * scope instead of trusting the measurement.
 */
export interface CloseImportDeltaFacts {
  readonly baseSha: string
  readonly entryPoints: readonly string[]
  readonly sources: readonly CloseSourceFileFact[]
  readonly census: readonly CloseChangedFileFact[]
}

export interface CloseImportDeltaEntry {
  /** The repository-relative file the change set adds, modifies, or renames. */
  readonly file: string
  readonly changeType: Bl020ChangeType
  /** The pre-rename path a rename is compared against, when there is one. */
  readonly basePath: string | null
  /** Whether the file exists at the base revision. */
  readonly presentAtBase: boolean
  /** Whether the base text this comparison needs actually resolved. */
  readonly baseTextResolved: boolean
  /** Its `node:fs` and `node:fs/promises` members at the base revision. */
  readonly baseMembers: readonly string[]
  /** Its members in the change set. */
  readonly headMembers: readonly string[]
  /**
   * The role computed from the step-4 precedence. No file declares its own
   * role: `production` follows from reachability or from the frozen selected
   * set, `validation-harness` from ratified membership or a test location, and
   * anything else is `unclassified`, which is a hard failure.
   */
  readonly role: Bl020ChangedFileRole
  /** Derived from `role === 'production'`, never carried independently. */
  readonly governed: boolean
}

export interface CloseImportDelta extends CloseImportDeltaFacts {
  /** The entry-point closure `K` the measurement computed. */
  readonly closure: readonly string[]
  /** `Governed = (K ∪ SELECTED_CLOSE_SOURCE_PATHS) ∩ C`, as measured. */
  readonly governedScope: readonly string[]
  /** One entry per changed source file, measured against the base revision. */
  readonly entries: readonly CloseImportDeltaEntry[]
}

/**
 * Every static import specifier a module can use to pull another module into a
 * deployed bundle: `import … from '…'`, `export … from '…'`, bare side-effect
 * `import '…'`, and dynamic `import('…')`, in single and double quotes. A
 * grammar that recognises only `from '…'` silently drops bare side-effect
 * imports — `apps/web/src/main.tsx` reaches `./index.css` by exactly that
 * form — and a future production module reached only that way would escape
 * governance entirely, so the narrower grammar is explicitly rejected.
 */
export function closeImportSpecifiers(source: string): readonly string[] {
  const specifiers = new Set<string>()
  const collect = (pattern: RegExp): void => {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1] ?? ''
      if (specifier.length > 0) specifiers.add(specifier)
    }
  }
  // `import … from '…'` and `export … from '…'`, including multi-line member
  // lists, default and namespace bindings, type-only forms, and `export *`.
  collect(/\bfrom\s*['"]([^'"\n]+)['"]/gu)
  // Bare side-effect `import '…'`.
  collect(/(?:^|[\s;})])import\s+['"]([^'"\n]+)['"]/gmu)
  // Dynamic `import('…')`.
  collect(/\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/gu)
  return Object.freeze([...specifiers].sort())
}

/** The last path segment of a repository-relative path. */
export function closeSourceBasename(file: string): string {
  const index = file.lastIndexOf('/')
  return index < 0 ? file : file.slice(index + 1)
}

const closeSourceDirname = (file: string): string => {
  const index = file.lastIndexOf('/')
  return index < 0 ? '' : file.slice(0, index)
}

const joinRepositoryPath = (from: string, specifier: string): string => {
  const segments: string[] = []
  for (const segment of (closeSourceDirname(from) + '/' + specifier).split(
    '/'
  )) {
    if (segment.length === 0 || segment === '.') continue
    if (segment === '..') {
      if (segments.pop() === undefined) return ''
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

/**
 * Resolves one specifier against the files that exist at the branch head: the
 * TypeScript rewrites of an emitted `.js`, `.mjs`, or `.cjs` specifier, the
 * literal path — which is how a bundled stylesheet is reached — each source
 * suffix, and the directory `index` forms. A specifier that does not start
 * with `.` names a package outside the repository and is never followed.
 */
export function resolveCloseImportSpecifier(
  from: string,
  specifier: string,
  exists: (file: string) => boolean
): string | null {
  if (!specifier.startsWith('.')) return null
  const target = joinRepositoryPath(from, specifier)
  if (target.length === 0) return null
  const candidates = [
    target.replace(/\.js$/u, '.ts'),
    target.replace(/\.js$/u, '.tsx'),
    target.replace(/\.mjs$/u, '.mts'),
    target.replace(/\.cjs$/u, '.cts'),
    target,
    ...BL020_SOURCE_SUFFIXES.map((suffix) => target + suffix),
    ...BL020_SOURCE_SUFFIXES.map((suffix) => target + '/index' + suffix),
  ]
  for (const candidate of candidates) if (exists(candidate)) return candidate
  return null
}

/**
 * The least fixed point of the static relative-import relation, walked from
 * the given entry points over the supplied repository texts. The grammar is
 * injectable only so a negative control can prove that a narrower one is
 * rejected; the guard itself always walks with `closeImportSpecifiers`.
 */
export function computeCloseImportClosure(
  sources: readonly CloseSourceFileFact[],
  entryPoints: readonly string[],
  specifiersOf: (source: string) => readonly string[] = closeImportSpecifiers
): readonly string[] {
  const texts = new Map(sources.map((source) => [source.file, source.text]))
  const exists = (file: string): boolean => texts.has(file)
  const reached = new Set<string>()
  const pending = [...entryPoints]
  while (pending.length > 0) {
    const file = pending.pop()
    if (file === undefined || reached.has(file)) continue
    const text = texts.get(file)
    // An entry point the repository does not carry leaves the closure empty
    // rather than silently complete; the guard reports that as a failure.
    if (text === undefined) continue
    reached.add(file)
    for (const specifier of specifiersOf(text)) {
      const resolved = resolveCloseImportSpecifier(file, specifier, exists)
      if (resolved !== null && !reached.has(resolved)) pending.push(resolved)
    }
  }
  return Object.freeze([...reached].sort())
}

const CLOSE_TEST_LOCATION = /^(?:apps\/[^/]+\/test\/|tests\/)/u
const CLOSE_TEST_BASENAME = /\.(?:test|spec)\.[^.]+$/u

/** Whether a path is structurally non-shipped: a test location or name. */
export function closeSourceIsTestLocated(file: string): boolean {
  return (
    CLOSE_TEST_LOCATION.test(file) ||
    CLOSE_TEST_BASENAME.test(closeSourceBasename(file))
  )
}

/**
 * The step-4 precedence, first match winning. Reachability outranks location,
 * so a module placed in a test directory or given a test-shaped name that a
 * deployed entry point can nevertheless reach is `production` and governed,
 * and a module introduced outside a conventional `src/` directory is governed
 * the moment an entry point reaches it. A module this Plan has not ratified
 * and no entry point reaches is `unclassified`, which fails closed.
 */
export function closeChangedFileRole(
  file: string,
  closure: ReadonlySet<string>
): Bl020ChangedFileRole {
  if (
    closure.has(file) ||
    (Object.values(SELECTED_CLOSE_SOURCE_PATHS) as readonly string[]).includes(
      file
    )
  )
    return 'production'
  if (
    (BL020_VALIDATION_ONLY_MODULES as readonly string[]).includes(file) ||
    closeSourceIsTestLocated(file)
  )
    return 'validation-harness'
  return 'unclassified'
}

/**
 * Builds the delta every claim of which is derived from the supplied facts:
 * the closure from the entry points and the repository texts, each role from
 * that closure, and `governed` from the role. Nothing here is a caller
 * assertion, and `validateCloseImportDelta` re-derives all of it.
 */
export function buildCloseImportDelta(
  facts: CloseImportDeltaFacts
): CloseImportDelta {
  const closure = computeCloseImportClosure(facts.sources, facts.entryPoints)
  const reached = new Set(closure)
  const texts = new Map(
    facts.sources.map((source) => [source.file, source.text])
  )
  const entries = facts.census.map((fact) => {
    const presentAtBase = fact.changeType !== 'added'
    const role = closeChangedFileRole(fact.file, reached)
    return Object.freeze({
      file: fact.file,
      changeType: fact.changeType,
      basePath: fact.basePath,
      presentAtBase,
      baseTextResolved: fact.baseText !== null,
      baseMembers:
        presentAtBase && fact.baseText !== null
          ? fileSystemImportMembers(fact.baseText)
          : Object.freeze([]),
      headMembers: fileSystemImportMembers(texts.get(fact.file) ?? ''),
      role,
      governed: role === 'production',
    })
  })
  return Object.freeze({
    baseSha: facts.baseSha,
    entryPoints: Object.freeze([...facts.entryPoints]),
    sources: facts.sources,
    census: facts.census,
    closure,
    governedScope: Object.freeze(
      entries
        .filter((entry) => entry.governed)
        .map((entry) => entry.file)
        .sort()
    ),
    entries: Object.freeze(entries),
  })
}

/** The members a file added, recomputed from its two import sets. */
export function closeImportDeltaAdditions(
  entry: CloseImportDeltaEntry
): readonly string[] {
  return Object.freeze(
    [...entry.headMembers]
      .filter((member) => !entry.baseMembers.includes(member))
      .sort()
  )
}

/** The write-capable members a file added, recomputed from its import sets. */
export function closeImportDeltaWriteCapableAdditions(
  entry: CloseImportDeltaEntry
): readonly string[] {
  return Object.freeze(
    closeImportDeltaAdditions(entry).filter((member) =>
      (BL020_WRITE_CAPABLE_FS_MEMBERS as readonly string[]).includes(member)
    )
  )
}

const sameMembers = (
  left: readonly string[],
  right: readonly string[]
): boolean =>
  left.length === right.length &&
  left.every((member, at) => member === right[at])

/**
 * `G-23`: no file the change set adds, modifies, or renames **inside the
 * governed production scope** may introduce a write-capable `node:fs` or
 * `node:fs/promises` member it did not carry at the base revision. Every other
 * changed file is measured and reported with its computed role and never
 * asserted against, because it is proven unreachable from every deployed entry
 * point.
 *
 * The validator trusts no claim in the delta. It recomputes the entry-point
 * closure from the **frozen** entry points and the supplied repository texts,
 * recomputes each file's base and head member sets from the supplied census
 * blobs, recomputes every role from that closure, and makes the assertion from
 * the recomputed values — so the guard's scope cannot be narrowed by a flag, a
 * relabelled role, an omitted census entry, or a weaker grammar. Failures are
 * reported as the seven distinct codes of `BL020_IMPORT_DELTA_VIOLATION_CODES`,
 * in declaration order.
 */
export function validateCloseImportDelta(
  delta: CloseImportDelta
): readonly Bl020ImportDeltaViolationCode[] {
  const found = new Set<Bl020ImportDeltaViolationCode>()
  const fail = (code: Bl020ImportDeltaViolationCode): void => {
    found.add(code)
  }
  const selected = new Set<string>(Object.values(SELECTED_CLOSE_SOURCE_PATHS))
  const texts = new Map(
    delta.sources.map((source) => [source.file, source.text])
  )

  // A base revision that cannot be named is a base comparison that cannot be
  // made, so the whole differential is unproven rather than vacuously clean.
  if (!/^[0-9a-f]{40}$/u.test(delta.baseSha)) fail('base-comparison-incomplete')

  // The entry points are the frozen pair, and each must exist and be readable
  // at the branch head — a missing one is a failure, never an empty closure.
  const entryPoints = BL020_PRODUCTION_ENTRYPOINTS as readonly string[]
  if (!sameMembers(delta.entryPoints, entryPoints))
    fail('governed-scope-reduced')
  for (const entryPoint of entryPoints) {
    const text = texts.get(entryPoint)
    if (text === undefined || text.trim().length === 0)
      fail('governed-scope-reduced')
  }

  // `K`, recomputed here rather than taken from the measurement. The supplied
  // closure is only ever checked against this one.
  const closure = computeCloseImportClosure(delta.sources, entryPoints)
  const reached = new Set(closure)
  const suppliedClosure = new Set(delta.closure)
  for (const member of closure)
    if (!suppliedClosure.has(member)) fail('governed-scope-reduced')

  // A module this Plan exempted that a deployed entry point can reach, judged
  // over the whole closure rather than over the change set, so an unchanged
  // exempt writer pulled onto an executable path is caught too.
  for (const module of BL020_VALIDATION_ONLY_MODULES)
    if (reached.has(module) || suppliedClosure.has(module))
      fail('validation-module-executable')

  // The measured entry list is exactly the independently measured census `C`.
  if (delta.census.length === 0) fail('changed-file-unmeasured')
  const census = new Map<string, CloseChangedFileFact>()
  for (const fact of delta.census) {
    if (census.has(fact.file)) fail('changed-file-unmeasured')
    census.set(fact.file, fact)
  }
  const measured = new Set<string>()
  for (const entry of delta.entries) {
    if (measured.has(entry.file)) fail('changed-file-unmeasured')
    measured.add(entry.file)
    if (!census.has(entry.file)) fail('changed-file-unmeasured')
  }
  for (const file of census.keys())
    if (!measured.has(file)) fail('changed-file-unmeasured')

  // `Governed ⊇ (K ∩ C)`: a changed file the product can execute is governed,
  // whatever the entry claims.
  const governedFiles = new Set(
    delta.entries.filter((entry) => entry.governed).map((entry) => entry.file)
  )
  for (const file of census.keys())
    if ((reached.has(file) || selected.has(file)) && !governedFiles.has(file))
      fail('governed-scope-reduced')
  const declaredScope = new Set(delta.governedScope)
  for (const file of governedFiles)
    if (!declaredScope.has(file)) fail('governed-scope-reduced')
  for (const file of declaredScope)
    if (!governedFiles.has(file)) fail('governed-scope-reduced')

  for (const entry of delta.entries) {
    const fact = census.get(entry.file)
    if (fact === undefined) continue
    const presentAtBase = fact.changeType !== 'added'
    const baseResolved = fact.baseText !== null

    // The base comparison is complete: a file present at the base resolved its
    // base text — from its pre-rename path when it moved — and a file absent at
    // the base carries an empty base set rather than an assumed one.
    if (
      entry.presentAtBase !== presentAtBase ||
      entry.basePath !== fact.basePath ||
      entry.baseTextResolved !== baseResolved ||
      presentAtBase !== baseResolved ||
      (!presentAtBase && entry.baseMembers.length > 0)
    )
      fail('base-comparison-incomplete')
    const baseMembers =
      presentAtBase && fact.baseText !== null
        ? fileSystemImportMembers(fact.baseText)
        : []
    if (!sameMembers(entry.baseMembers, baseMembers))
      fail('base-comparison-incomplete')

    const headText = texts.get(entry.file)
    if (headText === undefined) {
      // A file the change set names but the measurement never read.
      fail('changed-file-unmeasured')
      continue
    }
    const headMembers = fileSystemImportMembers(headText)
    if (!sameMembers(entry.headMembers, headMembers))
      fail('changed-file-unmeasured')

    // The role is recomputed from the closure, never read from the file.
    const role = closeChangedFileRole(entry.file, reached)
    if (
      !(BL020_CHANGED_FILE_ROLES as readonly string[]).includes(entry.role) ||
      role === 'unclassified' ||
      entry.role === 'unclassified'
    )
      fail('role-misclassified')
    if (
      selected.has(entry.file) &&
      (entry.role !== 'production' || !entry.governed)
    )
      fail('selected-source-degoverned')
    if (entry.role !== role || entry.governed !== (entry.role === 'production'))
      fail('role-misclassified')

    // The assertion, made over the recomputed role and the recomputed member
    // sets. A base that did not resolve has already failed above, and is not
    // reported a second time as an import addition it cannot evidence.
    if (role === 'production' && presentAtBase === baseResolved) {
      const added = headMembers.filter(
        (member) => !baseMembers.includes(member)
      )
      if (
        added.some((member) =>
          (BL020_WRITE_CAPABLE_FS_MEMBERS as readonly string[]).includes(member)
        )
      )
        fail('governed-write-capable-import-added')
    }
  }

  return Object.freeze(
    BL020_IMPORT_DELTA_VIOLATION_CODES.filter((code) => found.has(code))
  )
}

// ---------------------------------------------------------------------------
// Matrix row schema
// ---------------------------------------------------------------------------

export interface CloseRegistrationDigest {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
  readonly createdAt: string
}

export interface CloseConfirmationRecord {
  readonly connections: boolean
  readonly ownership: boolean
  readonly quarantine: boolean
  readonly pendingAdmissions: boolean
  readonly inFlightLifecycle: boolean
  readonly releaseAudits: boolean
  readonly generationIdentity: boolean
  readonly notRetired: boolean
  readonly reobserved: Readonly<Record<Bl020ProxyAuditCount, number>>
}

export interface CloseOwnershipCardinality {
  readonly frozen: number
  readonly cap: number
  readonly sweepUnits: number
  readonly capExceeded: boolean
}

export interface CloseRefusedAcquisition {
  readonly seam: Bl020CloseSeam
  readonly settled: boolean
  readonly classification: string
}

export interface CloseExecutionWitness {
  readonly boundaryInstanceId: string
  readonly productionPathsEntered: readonly string[]
  readonly primitiveCalls: Readonly<Record<Bl020PrimitiveCall, number>>
  readonly signalCallsByProject: Readonly<Record<string, number>>
  readonly drainInvocations: number
  readonly connectionAuditInvocations: number
  readonly routeEnteredAt: number
  readonly claimInstalledAt: number | null
  readonly settledAt: number
  readonly elapsedOrigin: Bl020ElapsedOrigin
  readonly ownershipCardinality: CloseOwnershipCardinality | null
  readonly confirmation: CloseConfirmationRecord | null
  readonly refusedAcquisitions: readonly CloseRefusedAcquisition[]
  /** Projects whose close was refused before phase 3 or owned no runtime. */
  readonly projectsWithoutRelease: readonly string[]
  /** Projects whose owned identity this close terminated. */
  readonly projectsTerminated: readonly string[]
}

export interface CloseManagerAudit {
  readonly ownershipRecords: number
  readonly pendingAdmissions: number
  readonly quarantinedOwnershipRecords: number
  readonly closeTasks: number
  readonly closeClaims: number
  readonly retiredProjects: number
  readonly lateCloseSettlements: number
  readonly refusedLateAcquisitions: number
  readonly lateCloseSettlementsDelta: number
  readonly refusedLateAcquisitionsDelta: number
  readonly claimLateWork: number | null
  readonly declaresLateSettlement: boolean
}

export interface CloseFixtureManifest {
  readonly members: number
  readonly digest: string
}

export interface ClosePeerObservation {
  readonly identity: string
  readonly readiness: string
  readonly stableRoute: string
  readonly activeConnections: number
  readonly registration: CloseRegistrationDigest
  readonly fixture: CloseFixtureManifest
}

export interface CloseControlObservation {
  readonly processIdentity: string
  readonly listenerAvailable: boolean
  readonly nonCandidacyProof: string
}

export interface CloseTeardownProbe {
  readonly probeCompleted: boolean
  readonly residual: number | null
}

export interface CloseTeardownRecord {
  readonly attempted: true
  readonly independentReobservation: true
  readonly probes: Readonly<Record<Bl020TeardownClass, CloseTeardownProbe>>
}

/**
 * The rendered proof a component-lane scenario produced, joined into the
 * committed row of the same scenario.
 *
 * The web lane executes Project Home in jsdom and commits its own artifact.
 * A committed API row for one of those scenarios carries the *exact* receipt
 * of that execution — its run identifier, its execution identifier, its
 * assertion count, its settled outcome, and the admission, render, focus,
 * announcement, dialog, list, runtime-state, and transport witnesses it
 * recorded — so the row states which rendered execution proves its client
 * half rather than implying one. Every member is an integer count, a boolean,
 * an opaque identifier, or a closed vocabulary member, so joining a receipt
 * discloses nothing the component artifact does not already publish.
 */
export interface CloseComponentWitness {
  readonly artifact: 'bl-020-close-component-matrix'
  /** The component lane's own run identifier, minted per execution. */
  readonly runId: string
  /** The component row's execution identifier, which carries `runId`. */
  readonly executionId: string
  /** The component scenario, which must be this row's own scenario. */
  readonly scenario: Bl020ScenarioId
  readonly outcome: 'passed'
  /** The component matrix aggregate's own all-passed judgement. */
  readonly allPassed: boolean
  readonly assertions: number
  readonly cards: number
  readonly admissions: number
  readonly renderedAdmissions: number
  readonly productionPathsEntered: readonly string[]
  readonly dialogOpenings: number
  readonly dialogMaxConcurrent: number
  readonly refusedPeerOpenings: number
  readonly pendingObservations: number
  readonly focusObservations: number
  readonly announcements: number
  readonly namePrefixedAnnouncements: number
  readonly closeRequests: number
  readonly listRequests: number
  readonly listReplacements: number
  readonly runtimeStateRequests: number
  readonly transportInvocations: number
  readonly thenableTransportReturns: number
}

export interface ProjectCloseEvidenceRow {
  readonly scenario: Bl020ScenarioId
  readonly group: Bl020ScenarioGroup
  readonly executionId: string
  readonly declaredBound: Bl020BoundId
  readonly declaredBoundMs: number
  readonly requiresQuarantineResolution: boolean
  readonly outcome: 'closed' | 'already-absent' | 'rejected'
  readonly rejectionCategory: RuntimeCloseRejectionCategory | null
  readonly preClaimSettlement: Bl020PreClaimSettlement | null
  readonly routeStatus: number | null
  readonly routeCategory: string | null
  readonly publicState: PublicRuntimeState | null
  readonly failureClassification: string | null
  readonly projectTokens: readonly string[]
  readonly registrationBefore: CloseRegistrationDigest
  readonly registrationAfter: CloseRegistrationDigest | null
  readonly fixtureBefore: CloseFixtureManifest
  readonly fixtureAfter: CloseFixtureManifest
  readonly peerBefore: ClosePeerObservation
  readonly peerAfter: ClosePeerObservation
  readonly controlBefore: CloseControlObservation
  readonly controlAfter: CloseControlObservation
  readonly emittedEvents: readonly string[]
  readonly projectClosedEmissions: number
  readonly proxyAudit: Readonly<Record<Bl020ProxyAuditCount, number>>
  readonly managerAudit: CloseManagerAudit
  readonly execution: CloseExecutionWitness
  readonly elapsedMs: number
  readonly residual: Readonly<Record<Bl020ResidualClass, number | null>>
  readonly residualProbes: Readonly<Record<Bl020ResidualClass, boolean>>
  readonly createdHostResources: boolean
  readonly teardown: CloseTeardownRecord | null
  /**
   * The joined component receipt, on the ten scenarios the web lane executes,
   * and `null` on every other row. It is never a substitute for this row's own
   * executed close: a component-lane row runs its own API setup and close and
   * joins the receipt of the rendered execution that carries the same scenario.
   */
  readonly componentWitness: CloseComponentWitness | null
}

/**
 * One executed mutation class, reduced to what a committed artifact may carry:
 * the class, the violation it declares, whether the validator killed it, and
 * the value the validator reacted to. No host value, path, identity, or raw
 * evidence payload is admitted here.
 */
export interface ProjectCloseMutationWitness {
  readonly id: Bl020MutationId
  readonly violation: string
  readonly killed: boolean
  readonly witness: string
}

/**
 * The mutation lane's public-safe summary. The lane executes every declared
 * class against a baseline substrate of its own, so the committed matrix
 * publishes only what that execution settled — never a baseline row.
 */
export interface ProjectCloseMutationSummary {
  readonly declared: number
  readonly executed: number
  readonly killed: number
  readonly survived: number
  readonly baselineRows: number
  readonly baselineViolations: readonly string[]
  readonly executedBaselineScenarios: readonly Bl020ScenarioId[]
  readonly witnesses: readonly ProjectCloseMutationWitness[]
}

export interface ProjectCloseMatrixAggregate {
  readonly rows: number
  readonly closed: number
  readonly alreadyAbsent: number
  readonly rejected: number
  readonly executionProduced: number
  readonly zeroResidualRows: number
  readonly confirmedRows: number
}

export interface ProjectCloseMatrix {
  readonly evidenceId: 'bl-020-close-matrix'
  readonly generatedFrom: 'execution'
  /**
   * The task that produced this artifact. `T-11` is the executed scenario
   * matrix; the designated real-host episodes are `T-12`'s to execute and are
   * declared-but-unexecuted here rather than claimed.
   */
  readonly stage: 't-11-scenario-matrix'
  readonly scenarioCount: number
  readonly guardCount: number
  readonly mutationCount: number
  readonly boundCount: number
  readonly preClaimSettlementCount: number
  readonly episodesDeclared: number
  readonly designatedEpisodesExecuted: number
  readonly rows: readonly ProjectCloseEvidenceRow[]
  readonly aggregate: ProjectCloseMatrixAggregate
  /**
   * The mutation execution this run performed, or `null` when the matrix is
   * assembled for a purpose other than commitment. A committed artifact must
   * carry it, and `validateCommittedProjectCloseMatrix` proves it settled
   * every declared class.
   */
  readonly mutations: ProjectCloseMutationSummary | null
}

export function serializeProjectCloseMatrix(
  matrix: ProjectCloseMatrix
): string {
  return JSON.stringify(matrix, null, 2) + String.fromCharCode(10)
}

// ---------------------------------------------------------------------------
// Mutation classes and matrix validator
// ---------------------------------------------------------------------------

export const BL020_MUTATION_CLASSES = Object.freeze([
  { id: 'M-1', violation: 'scenario-catalog-mismatch' },
  { id: 'M-2', violation: 'declared-bound-invalid' },
  { id: 'M-3', violation: 'closed-registration-retained' },
  { id: 'M-4', violation: 'closed-residual-not-zero' },
  { id: 'M-5', violation: 'non-success-registration-mutated' },
  { id: 'M-6', violation: 'removal-failed-public-state' },
  { id: 'M-7', violation: 'release-unconfirmed-projection' },
  { id: 'M-8', violation: 'foreign-lifecycle-event-emitted' },
  { id: 'M-9', violation: 'project-closed-emission-cardinality' },
  { id: 'M-10', violation: 'signal-accounting-invalid' },
  { id: 'M-11', violation: 'teardown-separation-violated' },
  { id: 'M-12', violation: 'peer-observation-changed' },
  { id: 'M-13', violation: 'fixture-manifest-changed' },
  { id: 'M-14', violation: 'protected-value-present' },
  { id: 'M-15', violation: 'confirmation-record-incomplete' },
  { id: 'M-16', violation: 'ownership-cardinality-invalid' },
  { id: 'M-17', violation: 'elapsed-origin-invalid' },
  { id: 'M-18', violation: 'late-acquisition-unexecuted' },
] as const)
export type Bl020MutationId = (typeof BL020_MUTATION_CLASSES)[number]['id']

/** Monotonic samples must sit below this wall-clock floor. */
const WALL_CLOCK_FLOOR_MS = 1e12

/**
 * Lifecycle event families a close must never emit. Exported so a lane can
 * hold its own rows to the same rule the matrix validator applies, instead of
 * discovering the violation only at assembly.
 */
export const BL020_FOREIGN_EVENT_PREFIXES = Object.freeze([
  'runtime.stop.',
  'runtime.restart.',
  'runtime.start.',
  'runtime.reconcile.',
])

export interface ProjectCloseMatrixValidationInput {
  readonly matrix: ProjectCloseMatrix
  readonly config?: ProjectRuntimeConfig
  /**
   * Exact host values that must never appear in the committed artifact. The
   * matrix runner supplies the identities, paths, ports, and authorities it
   * used, so `M-14` scans against real values rather than a heuristic.
   */
  readonly protectedValues?: readonly string[]
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function registrationEquals(
  left: CloseRegistrationDigest,
  right: CloseRegistrationDigest
): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.canonicalPath === right.canonicalPath &&
    left.createdAt === right.createdAt
  )
}

function manifestEquals(
  left: CloseFixtureManifest,
  right: CloseFixtureManifest
): boolean {
  return left.members === right.members && left.digest === right.digest
}

function peerEquals(
  left: ClosePeerObservation,
  right: ClosePeerObservation
): boolean {
  return (
    left.identity === right.identity &&
    left.readiness === right.readiness &&
    left.stableRoute === right.stableRoute &&
    left.activeConnections === right.activeConnections &&
    registrationEquals(left.registration, right.registration) &&
    manifestEquals(left.fixture, right.fixture)
  )
}

/**
 * Refuses any row that could not have been produced by executing production
 * close paths. Every violation is named after the mutation class that owns it.
 */
export function validateProjectCloseMatrix(
  input: ProjectCloseMatrixValidationInput
): readonly string[] {
  const { matrix } = input
  const config = input.config ?? createProjectRuntimeConfig()
  const bounds = computeBl020Bounds(config)
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }

  // M-1: the catalog is frozen, ordered, complete, and free of duplicates.
  const declared = matrix.rows.map((row) => row.scenario)
  if (
    matrix.evidenceId !== 'bl-020-close-matrix' ||
    matrix.generatedFrom !== 'execution' ||
    matrix.stage !== 't-11-scenario-matrix' ||
    matrix.scenarioCount !== BL020_DECLARED_COUNTS.scenarios ||
    matrix.rows.length !== BL020_DECLARED_COUNTS.scenarios ||
    new Set(declared).size !== BL020_DECLARED_COUNTS.scenarios ||
    JSON.stringify(declared) !== JSON.stringify([...BL020_SCENARIOS])
  )
    fail('scenario-catalog-mismatch')
  if (
    new Set(matrix.rows.map((row) => row.executionId)).size !==
    matrix.rows.length
  )
    fail('scenario-catalog-mismatch')

  for (const row of matrix.rows) {
    const execution = row.execution

    // Execution witness: a row with no production path, no boundary instance,
    // or an out-of-range invocation count is not an executed row.
    if (
      typeof execution?.boundaryInstanceId !== 'string' ||
      execution.boundaryInstanceId.length === 0 ||
      !Array.isArray(execution.productionPathsEntered) ||
      execution.productionPathsEntered.length === 0 ||
      execution.productionPathsEntered.some(
        (entered) =>
          !(BL020_CLOSE_PHASES as readonly string[]).includes(entered) &&
          !(BL020_CLOSE_SEAMS as readonly string[]).includes(entered)
      )
    )
      fail('execution-witness-missing')

    // M-15: at most two drains and two connection audits per close, and the
    // eight-clause confirmation record on every closed row.
    if (
      !isCount(execution?.drainInvocations) ||
      execution.drainInvocations > 2 ||
      !isCount(execution?.connectionAuditInvocations) ||
      execution.connectionAuditInvocations > 2
    )
      fail('confirmation-record-incomplete')
    if (row.outcome === 'closed') {
      const confirmation = execution?.confirmation
      if (
        confirmation === null ||
        confirmation === undefined ||
        BL020_CONFIRMATION_CLAUSES.some(
          (clause) => confirmation[clause] !== true
        ) ||
        BL020_PROXY_AUDIT_COUNTS.some(
          (count) => confirmation.reobserved?.[count] !== 0
        )
      )
        fail('confirmation-record-incomplete')
    }

    // M-15, revision 6: the invocation pair a declared late-acquisition seam
    // can produce is the half of the witness the fixture cannot write. A
    // `closed` row that observed a stale first audit re-drained and re-audited;
    // a `release-unconfirmed` row lost its re-drain to the armed deadline and
    // never reached its second audit; and a row declaring no such seam never
    // needed a second drain at all.
    const declaresLateAcquisitionSeam =
      execution?.productionPathsEntered?.some((entered) =>
        (BL020_LATE_ACQUISITION_SEAMS as readonly string[]).includes(entered)
      ) === true
    if (declaresLateAcquisitionSeam) {
      const pair = [
        execution.drainInvocations,
        execution.connectionAuditInvocations,
      ]
      if (row.outcome === 'closed' && JSON.stringify(pair) !== '[2,2]')
        fail('confirmation-record-incomplete')
      if (
        row.rejectionCategory === 'release-unconfirmed' &&
        JSON.stringify(pair) !== '[2,1]'
      )
        fail('confirmation-record-incomplete')
    } else if (execution?.drainInvocations > 1) {
      fail('confirmation-record-incomplete')
    }

    // M-10: per-project signal accounting, attributed rather than assumed.
    const signalMap = execution?.signalCallsByProject ?? {}
    const signalKeys = Object.keys(signalMap).sort()
    if (
      JSON.stringify(signalKeys) !==
        JSON.stringify([...row.projectTokens].sort()) ||
      signalKeys.some((key) => !isCount(signalMap[key])) ||
      execution?.primitiveCalls?.signal === undefined ||
      execution.primitiveCalls.signal <
        signalKeys.reduce((total, key) => total + (signalMap[key] ?? 0), 0) ||
      execution.projectsWithoutRelease.some(
        (token) => signalMap[token] !== 0
      ) ||
      execution.projectsTerminated.some((token) => (signalMap[token] ?? 0) < 1)
    )
      fail('signal-accounting-invalid')

    // M-17: the elapsed origin is inhabitable, never implied.
    const claimInstalledAt = execution?.claimInstalledAt ?? null
    const couldInstallClaim = row.preClaimSettlement === null
    const origin =
      execution?.elapsedOrigin === 'claim'
        ? claimInstalledAt
        : execution?.routeEnteredAt
    if (
      typeof execution?.routeEnteredAt !== 'number' ||
      execution.routeEnteredAt >= WALL_CLOCK_FLOOR_MS ||
      typeof execution.settledAt !== 'number' ||
      execution.settledAt >= WALL_CLOCK_FLOOR_MS ||
      !(BL020_ELAPSED_ORIGINS as readonly string[]).includes(
        execution.elapsedOrigin
      ) ||
      (execution.elapsedOrigin === 'claim') !== (claimInstalledAt !== null) ||
      (claimInstalledAt !== null && !couldInstallClaim) ||
      (claimInstalledAt === null && couldInstallClaim) ||
      (claimInstalledAt !== null &&
        claimInstalledAt < execution.routeEnteredAt) ||
      typeof origin !== 'number' ||
      row.elapsedMs !== execution.settledAt - origin
    )
      fail('elapsed-origin-invalid')

    // M-17, revision 6: the site is a member of the frozen enumeration, agrees
    // with the settled outcome wherever the site determines it, and carries no
    // admission-only witness. The settled category alone can never discriminate:
    // `manager-shutdown` and `already-absent` are reachable on both sides of the
    // claim, and a contender inherits any winner rejection verbatim.
    const site = row.preClaimSettlement
    if (
      site !== null &&
      !(BL020_PRE_CLAIM_SETTLEMENTS as readonly string[]).includes(site)
    )
      fail('elapsed-origin-invalid')
    if (site === 'persisted-absence' && row.outcome !== 'already-absent')
      fail('elapsed-origin-invalid')
    if (
      site !== null &&
      site !== 'persisted-absence' &&
      site !== 'contender-join' &&
      row.rejectionCategory !== site
    )
      fail('elapsed-origin-invalid')
    if (
      site === 'contender-join' &&
      row.rejectionCategory === 'ownership-cardinality-exceeded'
    )
      fail('elapsed-origin-invalid')
    if (
      site !== null &&
      (execution?.confirmation !== null ||
        execution?.ownershipCardinality !== null ||
        execution?.drainInvocations !== 0 ||
        execution?.connectionAuditInvocations !== 0)
    )
      fail('elapsed-origin-invalid')

    // M-2: the declared bound is recomputed, known, and not exceeded.
    const declaredBound = bounds.find((bound) => bound.id === row.declaredBound)
    const expectedBound = BL020_SCENARIO_BOUNDS[row.scenario]
    if (
      declaredBound === undefined ||
      row.declaredBound !== expectedBound ||
      row.declaredBoundMs !== declaredBound.valueMs ||
      !Number.isSafeInteger(row.elapsedMs) ||
      row.elapsedMs < 0 ||
      row.elapsedMs > row.declaredBoundMs
    )
      fail('declared-bound-invalid')

    // M-16: the ownership-cardinality witness, constrained together.
    const cardinality = execution?.ownershipCardinality ?? null
    if (couldInstallClaim) {
      if (
        cardinality === null ||
        !isCount(cardinality.frozen) ||
        cardinality.cap !== config.closeOwnershipSweepCap ||
        !Number.isSafeInteger(cardinality.sweepUnits) ||
        cardinality.sweepUnits < 1 ||
        cardinality.sweepUnits > cardinality.cap ||
        cardinality.capExceeded !== cardinality.frozen > cardinality.cap ||
        cardinality.capExceeded !==
          (row.rejectionCategory === 'ownership-cardinality-exceeded') ||
        (cardinality.capExceeded && cardinality.sweepUnits !== 1) ||
        (!cardinality.capExceeded &&
          cardinality.sweepUnits !== Math.max(1, cardinality.frozen))
      ) {
        fail('ownership-cardinality-invalid')
      } else if (
        row.declaredBound !== 'B-13' &&
        row.declaredBound !== 'B-20' &&
        row.declaredBoundMs !==
          runtimeCloseOverallBoundMs(
            config,
            row.requiresQuarantineResolution,
            cardinality.sweepUnits
          )
      ) {
        fail('ownership-cardinality-invalid')
      }
    } else if (cardinality !== null) {
      fail('ownership-cardinality-invalid')
    }

    // M-3 / M-4: a closed row removed the registration and left nothing behind.
    if (row.outcome === 'closed') {
      if (row.registrationAfter !== null) fail('closed-registration-retained')
      if (row.publicState !== null) fail('closed-registration-retained')
      if (
        BL020_RESIDUAL_CLASSES.some(
          (residualClass) =>
            row.residual[residualClass] !== 0 ||
            row.residualProbes[residualClass] !== true
        )
      )
        fail('closed-residual-not-zero')
    }

    // Residual truthfulness: integer zero with a completed probe, or an
    // explicit withheld claim. A sentinel number is a rejected representation.
    for (const residualClass of BL020_RESIDUAL_CLASSES) {
      const value = row.residual[residualClass]
      const probed = row.residualProbes[residualClass]
      if (value === undefined || probed === undefined) {
        fail('closed-residual-not-zero')
        continue
      }
      if (value === null && probed !== false) fail('closed-residual-not-zero')
      if (value !== null && (!isCount(value) || probed !== true))
        fail('closed-residual-not-zero')
    }

    // M-5: a non-success retains its registration with four identical fields.
    if (row.outcome === 'rejected') {
      if (
        row.registrationAfter === null ||
        !registrationEquals(row.registrationBefore, row.registrationAfter)
      )
        fail('non-success-registration-mutated')
      if (
        row.publicState !== null &&
        !(BL020_PUBLIC_STATE_VOCABULARY as readonly string[]).includes(
          row.publicState
        )
      )
        fail('non-success-registration-mutated')
    }

    // M-6 / M-7: the two retained-failure projections.
    if (
      row.rejectionCategory === 'removal-failed' &&
      row.publicState !== 'Stopped'
    )
      fail('removal-failed-public-state')
    if (
      row.rejectionCategory === 'release-unconfirmed' &&
      (row.publicState !== 'Failed' ||
        row.failureClassification !== 'close-release-unconfirmed')
    )
      fail('release-unconfirmed-projection')

    // M-8: no foreign lifecycle name in the emitted-event set.
    if (
      row.emittedEvents.some((event) =>
        BL020_FOREIGN_EVENT_PREFIXES.some((prefix) => event.startsWith(prefix))
      )
    )
      fail('foreign-lifecycle-event-emitted')

    // M-9: `project.closed` cardinality.
    if (
      !isCount(row.projectClosedEmissions) ||
      row.projectClosedEmissions > 1 ||
      (row.outcome !== 'closed' && row.projectClosedEmissions !== 0)
    )
      fail('project-closed-emission-cardinality')

    // M-11: teardown is separate, independent, and never preassigned.
    const teardown = row.teardown
    if (teardown !== null) {
      if (
        teardown.attempted !== true ||
        teardown.independentReobservation !== true ||
        BL020_TEARDOWN_CLASSES.some((teardownClass) => {
          const probe = teardown.probes[teardownClass]
          return (
            probe === undefined ||
            (probe.probeCompleted !== true && probe.residual !== null) ||
            (probe.probeCompleted === true && !isCount(probe.residual))
          )
        })
      )
        fail('teardown-separation-violated')
      if (
        (BL020_RESIDUAL_CLASSES as readonly string[]).some((residualClass) =>
          Object.hasOwn(teardown.probes, residualClass)
        ) &&
        BL020_TEARDOWN_CLASSES.every(
          (teardownClass) =>
            !(BL020_RESIDUAL_CLASSES as readonly string[]).includes(
              teardownClass
            )
        )
      )
        fail('teardown-separation-violated')
    } else if (!row.createdHostResources) {
      // A scenario that created no host resource legitimately has no teardown.
    }

    // M-12: peer and control observations are unchanged across the close.
    if (
      !peerEquals(row.peerBefore, row.peerAfter) ||
      row.controlBefore.processIdentity !== row.controlAfter.processIdentity ||
      row.controlBefore.listenerAvailable !==
        row.controlAfter.listenerAvailable ||
      row.controlAfter.nonCandidacyProof.length === 0
    )
      fail('peer-observation-changed')

    // M-13: the fixture manifest is non-empty and unchanged.
    if (
      row.fixtureBefore.members === 0 ||
      row.fixtureAfter.members === 0 ||
      !manifestEquals(row.fixtureBefore, row.fixtureAfter) ||
      !manifestEquals(row.peerBefore.fixture, row.peerAfter.fixture)
    )
      fail('fixture-manifest-changed')

    // M-18: a declared late-acquisition seam must be corroborated by the
    // production counter the fixture cannot write.
    const audit = row.managerAudit
    if (declaresLateAcquisitionSeam) {
      if (
        audit === undefined ||
        audit.refusedLateAcquisitionsDelta < 1 ||
        execution.refusedAcquisitions.length === 0 ||
        execution.refusedAcquisitions.some(
          (refusal) =>
            refusal.settled !== true ||
            refusal.classification !== 'runtime-closing' ||
            !(BL020_LATE_ACQUISITION_SEAMS as readonly string[]).includes(
              refusal.seam
            ) ||
            !execution.productionPathsEntered.includes(refusal.seam)
        )
      )
        fail('late-acquisition-unexecuted')
    } else if (execution?.refusedAcquisitions.length > 0) {
      fail('late-acquisition-unexecuted')
    }
    if (audit !== undefined) {
      if (audit.declaresLateSettlement && audit.lateCloseSettlementsDelta < 1)
        fail('late-acquisition-unexecuted')
      if (
        row.outcome === 'closed' &&
        !audit.declaresLateSettlement &&
        audit.lateCloseSettlementsDelta > 0
      )
        fail('late-acquisition-unexecuted')
    }

    // The joined component receipt, whenever a row carries one: it names this
    // row's own scenario, it belongs to the component lane, it carries the run
    // identifier its execution identifier embeds, and every witness it reports
    // is a count an executed rendering produced.
    const componentWitness = row.componentWitness ?? null
    if (componentWitness !== null) {
      const counts = [
        componentWitness.assertions,
        componentWitness.cards,
        componentWitness.admissions,
        componentWitness.renderedAdmissions,
        componentWitness.dialogOpenings,
        componentWitness.dialogMaxConcurrent,
        componentWitness.refusedPeerOpenings,
        componentWitness.pendingObservations,
        componentWitness.focusObservations,
        componentWitness.announcements,
        componentWitness.namePrefixedAnnouncements,
        componentWitness.closeRequests,
        componentWitness.listRequests,
        componentWitness.listReplacements,
        componentWitness.runtimeStateRequests,
        componentWitness.transportInvocations,
        componentWitness.thenableTransportReturns,
      ]
      const paths = componentWitness.productionPathsEntered
      if (
        componentWitness.artifact !== 'bl-020-close-component-matrix' ||
        componentWitness.scenario !== row.scenario ||
        !(BL020_COMPONENT_LANE_SCENARIOS as readonly string[]).includes(
          row.scenario
        ) ||
        typeof componentWitness.runId !== 'string' ||
        componentWitness.runId.length === 0 ||
        typeof componentWitness.executionId !== 'string' ||
        !componentWitness.executionId.includes(componentWitness.runId) ||
        !componentWitness.executionId.includes(row.scenario) ||
        componentWitness.outcome !== 'passed' ||
        componentWitness.allPassed !== true ||
        counts.some((count) => !isCount(count)) ||
        componentWitness.assertions === 0 ||
        componentWitness.admissions === 0 ||
        componentWitness.renderedAdmissions > componentWitness.admissions ||
        componentWitness.focusObservations === 0 ||
        componentWitness.dialogMaxConcurrent > 1 ||
        componentWitness.listReplacements > componentWitness.listRequests ||
        componentWitness.namePrefixedAnnouncements >
          componentWitness.announcements ||
        componentWitness.thenableTransportReturns !==
          componentWitness.transportInvocations ||
        componentWitness.closeRequests +
          componentWitness.listRequests +
          componentWitness.runtimeStateRequests >
          componentWitness.transportInvocations ||
        !Array.isArray(paths) ||
        paths.length === 0 ||
        new Set(paths).size !== paths.length ||
        paths.some((entered) => typeof entered !== 'string' || entered === '')
      )
        fail('component-witness-invalid')
    }
  }

  // Aggregate counts must match the executed rows exactly.
  const closed = matrix.rows.filter((row) => row.outcome === 'closed').length
  const alreadyAbsent = matrix.rows.filter(
    (row) => row.outcome === 'already-absent'
  ).length
  const rejected = matrix.rows.filter(
    (row) => row.outcome === 'rejected'
  ).length
  const zeroResidual = matrix.rows.filter((row) =>
    BL020_RESIDUAL_CLASSES.every(
      (residualClass) => row.residual[residualClass] === 0
    )
  ).length
  const confirmed = matrix.rows.filter(
    (row) => row.execution?.confirmation !== null
  ).length
  if (
    matrix.aggregate.rows !== matrix.rows.length ||
    matrix.aggregate.closed !== closed ||
    matrix.aggregate.alreadyAbsent !== alreadyAbsent ||
    matrix.aggregate.rejected !== rejected ||
    matrix.aggregate.executionProduced !== matrix.rows.length ||
    matrix.aggregate.zeroResidualRows !== zeroResidual ||
    matrix.aggregate.confirmedRows !== confirmed ||
    matrix.guardCount !== BL020_DECLARED_COUNTS.guards ||
    matrix.mutationCount !== BL020_DECLARED_COUNTS.mutations ||
    matrix.boundCount !== BL020_DECLARED_COUNTS.bounds ||
    matrix.preClaimSettlementCount !==
      BL020_DECLARED_COUNTS.preClaimSettlements ||
    matrix.episodesDeclared !== BL020_DECLARED_COUNTS.episodes ||
    // T-12 executes the designated episodes; T-11 may not claim any.
    matrix.designatedEpisodesExecuted !== 0
  )
    fail('scenario-catalog-mismatch')

  // M-14: no protected raw value may appear in the committed artifact.
  const protectedValues = input.protectedValues ?? []
  if (protectedValues.length > 0) {
    const scan = scanProtectedCloseValues({
      sources: { matrix: serializeProjectCloseMatrix(matrix) },
      protectedValues,
    })
    if (scan.matches.length > 0) fail('protected-value-present')
  }

  return Object.freeze(violations)
}

/**
 * The shape `buildCloseRow` mints for a row it assembled from an execution:
 * the scenario it executed, then that execution's own identifier. A row
 * derived from another row — the mutation lane's structural substrate — cannot
 * carry it, which is how a substrate row is refused at the committed boundary.
 */
const EXECUTED_ROW_IDENTITY =
  /^(S-[1-9][0-9]*)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u

/**
 * The rules a *committed* BL-020 matrix must satisfy on top of every rule the
 * matrix validator applies to any matrix.
 *
 * The mutation lane validates a substrate that is deliberately not a committed
 * artifact: five executed edge rows plus structural copies re-keyed to the
 * remaining catalog identities. That substrate must validate clean, so the
 * rules that separate an execution from a copy, require every rendered proof
 * to be joined, and require the mutation execution itself to have settled are
 * stated here rather than in the shared validator.
 */
export function validateCommittedProjectCloseMatrix(
  input: ProjectCloseMatrixValidationInput
): readonly string[] {
  const { matrix } = input
  const violations = [...validateProjectCloseMatrix(input)]
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }

  for (const row of matrix.rows) {
    // Every committed row is an execution of the scenario it names.
    const identity = EXECUTED_ROW_IDENTITY.exec(row.executionId)
    if (identity === null || identity[1] !== row.scenario)
      fail('structural-copy-committed')
    // Every rendered proof the component lane owns is joined to its own row,
    // and no other row may carry one.
    const owed = (BL020_COMPONENT_LANE_SCENARIOS as readonly string[]).includes(
      row.scenario
    )
    if (owed !== (row.componentWitness !== null))
      fail('component-witness-missing')
  }

  const mutations = matrix.mutations
  if (
    mutations === null ||
    mutations === undefined ||
    mutations.declared !== BL020_DECLARED_COUNTS.mutations ||
    mutations.executed !== BL020_DECLARED_COUNTS.mutations ||
    mutations.killed !== BL020_DECLARED_COUNTS.mutations ||
    mutations.survived !== 0 ||
    mutations.baselineViolations.length !== 0 ||
    mutations.baselineRows !== BL020_DECLARED_COUNTS.scenarios ||
    JSON.stringify([...mutations.executedBaselineScenarios]) !==
      JSON.stringify([...BL020_EXECUTED_BASELINE_SCENARIOS]) ||
    mutations.witnesses.length !== BL020_DECLARED_COUNTS.mutations ||
    JSON.stringify(mutations.witnesses.map((entry) => entry.id)) !==
      JSON.stringify(BL020_MUTATION_CLASSES.map((declared) => declared.id)) ||
    mutations.witnesses.some(
      (entry, index) =>
        entry.killed !== true ||
        entry.violation !== BL020_MUTATION_CLASSES[index]?.violation ||
        typeof entry.witness !== 'string' ||
        entry.witness.length === 0
    )
  )
    fail('mutation-execution-incomplete')

  return Object.freeze(violations)
}

// ---------------------------------------------------------------------------
// Designated real-host episodes
// ---------------------------------------------------------------------------

export const BL020_EPISODES = Object.freeze([
  'E-1',
  'E-2',
  'E-3',
  'E-4',
  'E-5',
  'E-6',
  'E-7',
] as const)
export type Bl020EpisodeId = (typeof BL020_EPISODES)[number]

export const BL020_EPISODE_NAMES: Readonly<Record<Bl020EpisodeId, string>> =
  Object.freeze({
    'E-1': 'running-close-exact-release',
    'E-2': 'retained-failed-after-unconfirmed-release',
    'E-3': 'adopted-close-after-api-restart',
    'E-4': 'interruption-between-confirmation-and-removal',
    'E-5': 'interruption-after-removal',
    'E-6': 'interruption-during-release-before-confirmation',
    'E-7': 'one-success-then-three-repeats',
  })

/** The replacement boot's teardown order that `E-6` must observe. */
export const BL020_REPLACEMENT_TEARDOWN_ORDER = Object.freeze([
  'release',
  'terminate',
  'audit',
  'remove',
] as const)

export const BL020_GENERATION_AUTHENTICITY = Object.freeze([
  'compiled-entry-point',
  'placeholder',
  'in-process',
  'synthesized',
  'assigned',
] as const)
export type Bl020GenerationAuthenticity =
  (typeof BL020_GENERATION_AUTHENTICITY)[number]

export const BL020_COMPILED_ENTRY_POINT = 'apps/api/dist/server.js'

/**
 * The thirteen evidence phases every designated episode records, in the only
 * order in which they can have been observed. `P10` captures live resource
 * evidence while the episode's hosts are still running, `P11` records the
 * exact teardown actions and the exact identities each acted on, `P12` is a
 * re-observation performed by a different process than the one that executed
 * the episode, and `P13` is the atomic finalization of the artifact.
 */
export const BL020_EPISODE_PHASES = Object.freeze([
  'P1',
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
export type Bl020EpisodePhase = (typeof BL020_EPISODE_PHASES)[number]

export const BL020_EPISODE_PHASE_NAMES: Readonly<
  Record<Bl020EpisodePhase, string>
> = Object.freeze({
  P1: 'preconditions-observed',
  P2: 'compiled-assets-and-sources-hashed',
  P3: 'real-generation-established',
  P4: 'fixtures-and-registrations-established',
  P5: 'subject-arranged',
  P6: 'expectations-declared',
  P7: 'action-executed-through-compiled-route',
  P8: 'settlement-observed',
  P9: 'durable-and-published-projection-observed',
  P10: 'live-resource-evidence-before-teardown',
  P11: 'teardown-actions-with-exact-targets',
  P12: 'independent-post-teardown-reobservation',
  P13: 'atomic-finalization',
})

/** Every episode row's monotonic readings share this declared origin. */
export const BL020_EPISODE_TIMING_ORIGIN = 'episode-start-monotonic'

/** The teardown actions `P11` must record, in the order they are performed. */
export const BL020_EPISODE_TEARDOWN_ACTIONS = Object.freeze([
  'release-held-connections',
  'stop-api-generations',
  'terminate-workbench-groups',
  'remove-disposable-fixtures',
] as const)
export type Bl020EpisodeTeardownAction =
  (typeof BL020_EPISODE_TEARDOWN_ACTIONS)[number]

/** The live resource classes `P10` must count while the episode is still up. */
export const BL020_EPISODE_LIVE_CLASSES = Object.freeze([
  'apiProcesses',
  'workbenchProcesses',
  'attributableDescendants',
  'listeners',
  'activeRequests',
  'databaseRegistrations',
  'disposableFixtures',
] as const)
export type Bl020EpisodeLiveClass = (typeof BL020_EPISODE_LIVE_CLASSES)[number]

/** The independently collected accounts every episode must carry. */
export const BL020_EPISODE_COLLECTION_CLASSES = Object.freeze([
  'apiProcess',
  'workbenchProcess',
  'workbenchDescendants',
  'listener',
  'activeRequests',
  'databaseRegistration',
  'runtimeRecord',
  'projectRootImmutability',
  'projectRootManifest',
  'peerSurvival',
  'logEvents',
  'publicRouteProjection',
  'proxyReleaseReceipts',
  'managerReleaseReceipts',
] as const)
export type Bl020EpisodeCollectionClass =
  (typeof BL020_EPISODE_COLLECTION_CLASSES)[number]

/** `E-6` revision-7 replacement branches. Absence and `Stopped` are refused. */
export const BL020_REPLACEMENT_BRANCHES = Object.freeze([
  'adopted',
  'unresolved',
] as const)
export type Bl020ReplacementBranch = (typeof BL020_REPLACEMENT_BRANCHES)[number]

/** The exact number of repeated closes `E-7` performs after its success. */
export const BL020_REPEAT_CLOSE_COUNT = 3

/** An opaque alias: a stable public-safe stand-in for a host identity. */
const OPAQUE_ALIAS = /^[a-z][a-z0-9-]*-[0-9a-f]{16}$/u
const DIGEST_PATTERN = /^[0-9a-f]{64}$/u
const RECEIPT_PATTERN = /^receipt-[0-9a-f]{32}$/u
const EXECUTION_PATTERN = /^exec-[0-9a-f]{16}$/u
const RUN_PATTERN = /^run-[0-9a-f]{16}$/u
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u

export interface CloseEpisodeGeneration {
  readonly generationId: string
  readonly authenticity: Bl020GenerationAuthenticity
  readonly entryPoint: string
  readonly argumentVectorObserved: boolean
  readonly listeningSocketAttributed: boolean
  readonly servedRequests: number
  readonly persistenceFileObserved: boolean
}

/** One recorded phase of one episode, with its own real timing. */
export interface CloseEpisodePhaseRecord {
  readonly phase: Bl020EpisodePhase
  readonly name: string
  readonly completed: true
  readonly at: string
  readonly startedAtMs: number
  readonly durationMs: number
  readonly observations: readonly string[]
}

/** A compiled asset the episode executed or served, hashed as it ran. */
export interface CloseCompiledAsset {
  readonly asset: string
  readonly role: 'api-entry-point' | 'api-module' | 'web-asset'
  readonly sha256: string
  readonly bytes: number
  readonly builtBy: string
}

/** A source-set member hashed from the repository tree the episode ran. */
export interface CloseSourceDigest {
  readonly path: string
  readonly sha256: string
  readonly bytes: number
}

/** The independently collected account of one observable class. */
export interface CloseEpisodeCollection {
  readonly collected: true
  readonly collectedBy: string
  readonly observed: number
  readonly expected: number
  readonly agrees: boolean
  readonly detail: string
}

/** Live resource evidence, captured while the episode's hosts still run. */
export interface CloseEpisodeLiveEvidence {
  readonly capturedBeforeTeardown: true
  readonly startedAtMs: number
  readonly classes: Readonly<
    Record<Bl020EpisodeLiveClass, { readonly observed: number }>
  >
  readonly liveIdentities: readonly string[]
}

/** One teardown action and the exact identities it acted on. */
export interface CloseEpisodeTeardownAction {
  readonly action: Bl020EpisodeTeardownAction
  readonly performed: true
  readonly startedAtMs: number
  readonly targets: readonly string[]
  readonly receipt: string
}

/** `P12`: a re-observation performed by a different process. */
export interface CloseEpisodeReobservation {
  readonly observer: 'separate-process'
  readonly observerModule: string
  readonly distinctFromExecutor: true
  readonly startedAtMs: number
  readonly classes: Readonly<Record<Bl020TeardownClass, CloseTeardownProbe>>
  readonly reobservedIdentities: readonly string[]
}

/** `E-6` revision-7 interrupted-close and replacement-boot adoption truth. */
export interface CloseEpisodeInterruption {
  readonly interruptionPoint: string
  readonly survivorIdentity: string
  readonly survivorAliveAfterInterruption: boolean
  readonly survivorHealthyAfterInterruption: boolean
  readonly survivorExactlyAttributable: boolean
  readonly retainedStateBeforeReplacement: 'Failed'
  readonly retainedClassificationBeforeReplacement: 'close-release-unconfirmed'
  readonly branch: Bl020ReplacementBranch
  readonly branchDecidedBy: string
  readonly adoptedIdentity: string | null
  readonly replacementPublishedState: PublicRuntimeState
  readonly replacementEntryState: string
  readonly replacementClassification: string | null
  readonly replacementReportedAbsent: false
  readonly signalAccounts: {
    readonly interruptedClose: number
    readonly replacementReconcile: number
    readonly safeRetry: number
  }
  readonly safeRetryClosedAdoptedSurvivor: boolean
  readonly safeRetrySurvivorAbsentAfter: boolean
}

/** `E-7` one success followed by exactly three repeated real closes. */
export interface CloseEpisodeRepeats {
  readonly successStatus: number
  readonly repeatCount: number
  readonly repeatStatuses: readonly number[]
  readonly repeatCategories: readonly string[]
  readonly runtimeCreationsAfterSuccess: number
  readonly signalsAfterSuccess: number
  readonly mutationsAfterSuccess: number
  readonly eventsAfterSuccess: number
}

/** The execution receipt of one episode. */
export interface CloseEpisodeExecution {
  readonly executionId: string
  readonly receipt: string
  readonly timingOrigin: string
  readonly startedAt: string
  readonly settledAt: string
  readonly durationMs: number
}

export interface CloseEpisodeRecord {
  readonly id: Bl020EpisodeId
  readonly name: string
  readonly execution: CloseEpisodeExecution
  readonly declaredExpectations: readonly string[]
  readonly phases: readonly CloseEpisodePhaseRecord[]
  readonly generations: readonly CloseEpisodeGeneration[]
  readonly settled: boolean
  readonly observations: readonly string[]
  readonly boundIdentities: readonly string[]
  readonly collections: Readonly<
    Record<Bl020EpisodeCollectionClass, CloseEpisodeCollection>
  >
  readonly live: CloseEpisodeLiveEvidence
  readonly teardownActions: readonly CloseEpisodeTeardownAction[]
  readonly reobservation: CloseEpisodeReobservation
  readonly registrationPresentAfter: boolean
  readonly durableRemovalObserved: boolean
  readonly residual: Readonly<Record<Bl020ResidualClass, number | null>>
  readonly residualProbes: Readonly<Record<Bl020ResidualClass, boolean>>
  readonly statuses: readonly number[]
  readonly projectClosedEmissions: number
  readonly signalsAfterInterruption: number | null
  readonly candidateAttributed: boolean | null
  readonly replacementTeardownOrder: readonly string[] | null
  readonly safeRetrySettled: boolean | null
  readonly absenceSurvivesRestart: boolean | null
  readonly interruption: CloseEpisodeInterruption | null
  readonly repeats: CloseEpisodeRepeats | null
}

/** The redaction scan the artifact carries about itself. */
export interface CloseEpisodeRedaction {
  readonly scanned: true
  readonly scannedBytes: number
  readonly hostValuesConsidered: number
  readonly matches: readonly string[]
}

/** `P13`: how the artifact reached its destinations. */
export interface CloseEpisodeFinalization {
  readonly atomic: true
  readonly method: 'staged-write-then-rename'
  readonly destinations: readonly string[]
  readonly identicalBytes: true
  readonly bytes: number
  readonly sha256: string
  readonly stagedLeftovers: number
}

export interface ProjectCloseEpisodeArtifact {
  readonly evidenceId: 'bl-020-designated-episode'
  readonly schemaVersion: number
  readonly runId: string
  readonly timingOrigin: string
  readonly phaseOrder: readonly Bl020EpisodePhase[]
  readonly compiledAssets: readonly CloseCompiledAsset[]
  readonly sources: readonly CloseSourceDigest[]
  readonly episodesDeclared: number
  readonly designatedEpisodesExecuted: number
  readonly allPassed: boolean
  readonly redaction: CloseEpisodeRedaction
  readonly finalization: CloseEpisodeFinalization | null
  readonly finalized: boolean
  readonly episodeCount: number
  readonly episodes: readonly CloseEpisodeRecord[]
  readonly teardown: Readonly<
    Record<Bl020TeardownClass, CloseTeardownProbe>
  > | null
}

export function serializeProjectCloseEpisode(
  artifact: ProjectCloseEpisodeArtifact
): string {
  return JSON.stringify(artifact, null, 2) + String.fromCharCode(10)
}

/** Key-ordered rendering, so a receipt covers content and not key order. */
export function canonicalizeEpisodeValue(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value))
    return '[' + value.map(canonicalizeEpisodeValue).join(',') + ']'
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, member]) => member !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(
      ([key, member]) =>
        JSON.stringify(key) + ':' + canonicalizeEpisodeValue(member)
    )
  return '{' + entries.join(',') + '}'
}

/**
 * The execution identity of one episode, derived from the run it belongs to,
 * the episode it is, and the instants it actually occupied. A row that assigned
 * itself an identifier, copied another episode's, or carried a fixed one cannot
 * reproduce this value.
 */
export function deriveCloseEpisodeExecutionId(
  runId: string,
  episode: Pick<CloseEpisodeRecord, 'id' | 'generations'> & {
    readonly execution: Pick<CloseEpisodeExecution, 'startedAt' | 'settledAt'>
  },
  digest: (value: string) => string
): string {
  const material = [
    runId,
    episode.id,
    episode.execution.startedAt,
    episode.execution.settledAt,
    ...episode.generations.map((generation) => generation.generationId),
  ].join('|')
  return 'exec-' + digest(material).slice(0, 16)
}

/**
 * The execution receipt of one episode: a digest over everything the row
 * claims, bound to the run. Recomputable only from the row itself, so a
 * fabricated, static, hand-assigned, or reused receipt is refused.
 */
export function deriveCloseEpisodeReceipt(
  runId: string,
  episode: CloseEpisodeRecord,
  digest: (value: string) => string
): string {
  const { receipt: _receipt, ...execution } = episode.execution
  const material =
    runId + '|' + canonicalizeEpisodeValue({ ...episode, execution })
  return 'receipt-' + digest(material).slice(0, 32)
}

/** The receipt of one teardown action over its exact target set. */
export function deriveCloseTeardownReceipt(
  executionId: string,
  action: Omit<CloseEpisodeTeardownAction, 'receipt'>,
  digest: (value: string) => string
): string {
  return (
    'receipt-' +
    digest(executionId + '|' + canonicalizeEpisodeValue(action)).slice(0, 32)
  )
}

/** Host filesystem roots no committed episode row may name. */
const EPISODE_HOST_ROOT_SEGMENTS: readonly string[] = Object.freeze([
  'home',
  'root',
  'workspaces',
  'Users',
  'var',
  'tmp',
  'etc',
])

/** Loopback authorities no committed episode row may name. */
const EPISODE_LOOPBACK_HOSTS: readonly string[] = Object.freeze([
  'localhost',
  '127\\.0\\.0\\.1',
])

/**
 * Shapes the serialized artifact may never carry, composed rather than
 * written, so this module states no forbidden literal of its own. The scan is
 * independent of the run: it reads only what was committed, so a row that
 * skipped its own redaction is still refused here.
 */
const EPISODE_DISCLOSURE_SHAPES: readonly (readonly [string, RegExp])[] =
  Object.freeze([
    [
      'absolute-host-path',
      new RegExp('/(?:' + EPISODE_HOST_ROOT_SEGMENTS.join('|') + ')/', 'u'),
    ],
    [
      'loopback-authority',
      new RegExp(
        '(?:' + EPISODE_LOOPBACK_HOSTS.join('|') + ')(?::[0-9]{2,5})?',
        'u'
      ),
    ],
    ['stack-frame', new RegExp('at [\\w$.]+ \\([^)]*:[0-9]+:[0-9]+\\)', 'u')],
    ['raw-exception', new RegExp('[A-Z][A-Za-z]*Error: ', 'u')],
  ])

/**
 * The disclosure shapes one serialized artifact carries, if any. Reported as
 * shape names, never as the matched text, so the report cannot disclose what
 * the artifact should not have carried.
 */
export function scanEpisodeDisclosureShapes(
  serialized: string
): readonly string[] {
  return Object.freeze(
    EPISODE_DISCLOSURE_SHAPES.filter(([, pattern]) =>
      pattern.test(serialized)
    ).map(([name]) => name)
  )
}

/**
 * Refuses a designated episode artifact that is malformed, unfinalized, or not
 * clear. Every claimed API generation must have executed the repository's
 * compiled entry point with host-observed evidence, must carry all thirteen
 * evidence phases in order, must have captured live resource evidence before
 * any teardown action, must have been re-observed from a different process
 * afterwards, and must carry an execution receipt only its own content
 * reproduces. Supplying `digest` additionally recomputes every receipt.
 */
export function validateProjectCloseEpisode(
  artifact: ProjectCloseEpisodeArtifact,
  digest?: (value: string) => string
): readonly string[] {
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }
  if (
    artifact.evidenceId !== 'bl-020-designated-episode' ||
    !Array.isArray(artifact.episodes) ||
    artifact.episodeCount !== BL020_DECLARED_COUNTS.episodes ||
    artifact.episodes.length !== BL020_DECLARED_COUNTS.episodes ||
    artifact.episodesDeclared !== BL020_DECLARED_COUNTS.episodes ||
    artifact.designatedEpisodesExecuted !== BL020_DECLARED_COUNTS.episodes ||
    JSON.stringify(artifact.episodes.map((episode) => episode.id)) !==
      JSON.stringify([...BL020_EPISODES])
  )
    fail('episode-catalog-mismatch')

  if (
    !RUN_PATTERN.test(artifact.runId) ||
    artifact.timingOrigin !== BL020_EPISODE_TIMING_ORIGIN ||
    JSON.stringify(artifact.phaseOrder) !==
      JSON.stringify([...BL020_EPISODE_PHASES])
  )
    fail('episode-run-identity-unproven')

  const expectedSources = [
    ...Object.values(SELECTED_CLOSE_SOURCE_PATHS),
    ...Object.values(COMMITTED_EVIDENCE_WRITER_PATHS),
  ]
  if (
    !Array.isArray(artifact.sources) ||
    artifact.sources.length !== expectedSources.length ||
    JSON.stringify(artifact.sources.map((source) => source.path)) !==
      JSON.stringify(expectedSources) ||
    artifact.sources.some(
      (source) => !DIGEST_PATTERN.test(source.sha256) || source.bytes < 1
    )
  )
    fail('episode-source-hashes-missing')

  const entries = artifact.compiledAssets ?? []
  if (
    entries.length === 0 ||
    !entries.some(
      (asset) =>
        asset.role === 'api-entry-point' &&
        asset.asset === BL020_COMPILED_ENTRY_POINT
    ) ||
    !entries.some((asset) => asset.role === 'web-asset') ||
    entries.some(
      (asset) =>
        !DIGEST_PATTERN.test(asset.sha256) ||
        asset.bytes < 1 ||
        asset.builtBy.length === 0
    )
  )
    fail('episode-compiled-hashes-missing')

  const executionIds = new Set<string>()
  const receipts = new Set<string>()

  for (const episode of artifact.episodes) {
    if (
      BL020_EPISODE_NAMES[episode.id] !== episode.name ||
      episode.settled !== true ||
      episode.observations.length === 0
    )
      fail('episode-unsettled')
    if (
      episode.declaredExpectations.length === 0 ||
      episode.boundIdentities.length === 0 ||
      episode.boundIdentities.some((identity) => !OPAQUE_ALIAS.test(identity))
    )
      fail('episode-expectations-unbound')
    if (episode.generations.length === 0) fail('generation-not-authentic')
    for (const generation of episode.generations) {
      if (
        generation.authenticity !== 'compiled-entry-point' ||
        generation.entryPoint !== BL020_COMPILED_ENTRY_POINT ||
        generation.argumentVectorObserved !== true ||
        generation.listeningSocketAttributed !== true ||
        !isCount(generation.servedRequests) ||
        generation.servedRequests < 1 ||
        generation.persistenceFileObserved !== true
      )
        fail('generation-not-authentic')
    }

    const execution = episode.execution
    if (
      !EXECUTION_PATTERN.test(execution.executionId) ||
      !RECEIPT_PATTERN.test(execution.receipt) ||
      execution.timingOrigin !== BL020_EPISODE_TIMING_ORIGIN ||
      !ISO_INSTANT.test(execution.startedAt) ||
      !ISO_INSTANT.test(execution.settledAt) ||
      !(execution.durationMs > 0) ||
      Date.parse(execution.settledAt) < Date.parse(execution.startedAt)
    )
      fail('episode-execution-receipt-invalid')
    if (
      executionIds.has(execution.executionId) ||
      receipts.has(execution.receipt)
    )
      fail('episode-execution-receipt-reused')
    executionIds.add(execution.executionId)
    receipts.add(execution.receipt)
    if (digest !== undefined) {
      if (
        execution.executionId !==
        deriveCloseEpisodeExecutionId(artifact.runId, episode, digest)
      )
        fail('episode-execution-identifier-not-derived')
      if (
        execution.receipt !==
        deriveCloseEpisodeReceipt(artifact.runId, episode, digest)
      )
        fail('episode-execution-receipt-not-derived')
    }

    if (
      JSON.stringify(episode.phases.map((phase) => phase.phase)) !==
      JSON.stringify([...BL020_EPISODE_PHASES])
    )
      fail('episode-phase-order-invalid')
    let previousPhaseMs = -1
    for (const phase of episode.phases) {
      if (
        phase.completed !== true ||
        BL020_EPISODE_PHASE_NAMES[phase.phase] !== phase.name ||
        !ISO_INSTANT.test(phase.at) ||
        !(phase.startedAtMs >= 0) ||
        !(phase.durationMs >= 0) ||
        phase.observations.length === 0 ||
        phase.startedAtMs < previousPhaseMs
      )
        fail('episode-phase-incomplete')
      previousPhaseMs = phase.startedAtMs
    }

    for (const collectionClass of BL020_EPISODE_COLLECTION_CLASSES) {
      const collection = episode.collections[collectionClass]
      if (
        collection === undefined ||
        collection.collected !== true ||
        collection.collectedBy.length === 0 ||
        collection.agrees !== true ||
        collection.observed !== collection.expected
      )
        fail('episode-collection-incomplete')
    }

    const live = episode.live
    if (
      live === undefined ||
      live.capturedBeforeTeardown !== true ||
      live.liveIdentities.length === 0 ||
      live.liveIdentities.some((identity) => !OPAQUE_ALIAS.test(identity)) ||
      BL020_EPISODE_LIVE_CLASSES.some(
        (liveClass) => !isCount(live.classes[liveClass]?.observed)
      )
    )
      fail('episode-live-evidence-missing')

    if (
      JSON.stringify(episode.teardownActions.map((action) => action.action)) !==
      JSON.stringify([...BL020_EPISODE_TEARDOWN_ACTIONS])
    )
      fail('episode-teardown-actions-inexact')
    let previousActionMs = live?.startedAtMs ?? 0
    for (const action of episode.teardownActions) {
      if (
        action.performed !== true ||
        !RECEIPT_PATTERN.test(action.receipt) ||
        action.targets.length === 0 ||
        new Set(action.targets).size !== action.targets.length ||
        action.targets.some((target) => !OPAQUE_ALIAS.test(target)) ||
        action.startedAtMs < previousActionMs
      )
        fail('episode-teardown-actions-inexact')
      if (live !== undefined && action.startedAtMs < live.startedAtMs)
        fail('episode-teardown-precedes-live-evidence')
      previousActionMs = action.startedAtMs
      if (digest !== undefined) {
        const { receipt: _issued, ...material } = action
        if (
          action.receipt !==
          deriveCloseTeardownReceipt(execution.executionId, material, digest)
        )
          fail('episode-teardown-receipt-not-derived')
      }
    }

    const reobservation = episode.reobservation
    if (
      reobservation === undefined ||
      reobservation.observer !== 'separate-process' ||
      reobservation.distinctFromExecutor !== true ||
      reobservation.observerModule.length === 0 ||
      reobservation.reobservedIdentities.length === 0 ||
      reobservation.startedAtMs < previousActionMs
    )
      fail('episode-reobservation-not-independent')
    else
      for (const teardownClass of BL020_TEARDOWN_CLASSES) {
        const probe = reobservation.classes[teardownClass]
        if (
          probe === undefined ||
          probe.probeCompleted !== true ||
          probe.residual !== 0
        )
          fail('episode-reobservation-not-clear')
      }

    for (const residualClass of BL020_RESIDUAL_CLASSES) {
      if (
        episode.residual[residualClass] !== 0 ||
        episode.residualProbes[residualClass] !== true
      )
        fail('episode-residual-not-clear')
    }
    if (episode.projectClosedEmissions > 1)
      fail('episode-duplicate-side-effect')
  }

  const byId = new Map(
    artifact.episodes.map((episode) => [episode.id, episode])
  )
  const six = byId.get('E-6')
  if (six !== undefined) {
    const interruption = six.interruption
    if (
      six.registrationPresentAfter !== true ||
      six.durableRemovalObserved !== false ||
      six.candidateAttributed !== true ||
      six.signalsAfterInterruption !== 0 ||
      JSON.stringify(six.replacementTeardownOrder) !==
        JSON.stringify([...BL020_REPLACEMENT_TEARDOWN_ORDER]) ||
      six.safeRetrySettled !== true ||
      interruption === null
    )
      fail('episode-interruption-unproven')
    else {
      // Before the replacement boot the retained project is Failed and
      // close-release-unconfirmed, and its survivor is still alive.
      if (
        interruption.retainedStateBeforeReplacement !== 'Failed' ||
        interruption.retainedClassificationBeforeReplacement !==
          'close-release-unconfirmed' ||
        interruption.survivorAliveAfterInterruption !== true ||
        !OPAQUE_ALIAS.test(interruption.survivorIdentity) ||
        interruption.interruptionPoint.length === 0
      )
        fail('episode-interruption-unproven')
      // Three separately kept signal accounts, never one aggregate.
      const accounts = interruption.signalAccounts
      if (
        accounts === undefined ||
        accounts.interruptedClose !== 0 ||
        !isCount(accounts.replacementReconcile) ||
        !isCount(accounts.safeRetry)
      )
        fail('episode-interruption-accounts-missing')
      // A live survivor is never published absent, and never Stopped.
      if (
        interruption.replacementReportedAbsent !== false ||
        interruption.replacementPublishedState === 'Stopped'
      )
        fail('episode-replacement-reported-absent')
      if (interruption.branch === 'adopted') {
        if (
          interruption.survivorHealthyAfterInterruption !== true ||
          interruption.survivorExactlyAttributable !== true ||
          interruption.adoptedIdentity !== interruption.survivorIdentity ||
          interruption.replacementPublishedState !== 'Running' ||
          interruption.replacementEntryState !== 'running' ||
          interruption.replacementClassification !== null ||
          interruption.safeRetryClosedAdoptedSurvivor !== true ||
          interruption.safeRetrySurvivorAbsentAfter !== true ||
          accounts?.safeRetry === 0
        )
          fail('episode-adoption-unproven')
      } else if (interruption.branch === 'unresolved') {
        if (
          interruption.survivorExactlyAttributable !== false ||
          interruption.adoptedIdentity !== null ||
          interruption.replacementPublishedState !== 'Failed' ||
          interruption.branchDecidedBy.length === 0 ||
          interruption.replacementClassification === null
        )
          fail('episode-unresolved-branch-unproven')
      } else fail('episode-replacement-branch-unknown')
    }
  }

  const seven = byId.get('E-7')
  if (seven !== undefined) {
    const repeats = seven.repeats
    if (
      JSON.stringify(seven.statuses) !== JSON.stringify([200, 404, 404, 404]) ||
      seven.projectClosedEmissions !== 1 ||
      seven.absenceSurvivesRestart !== true ||
      repeats === null
    )
      fail('episode-repeat-unproven')
    else if (
      repeats.repeatCount !== BL020_REPEAT_CLOSE_COUNT ||
      repeats.repeatStatuses.length !== BL020_REPEAT_CLOSE_COUNT ||
      repeats.repeatCategories.length !== BL020_REPEAT_CLOSE_COUNT ||
      repeats.successStatus !== 200 ||
      repeats.repeatStatuses.some((status) => status !== 404) ||
      repeats.runtimeCreationsAfterSuccess !== 0 ||
      repeats.signalsAfterSuccess !== 0 ||
      repeats.mutationsAfterSuccess !== 0 ||
      repeats.eventsAfterSuccess !== 0
    )
      fail('episode-repeat-unproven')
  }

  const redaction = artifact.redaction
  if (
    redaction === undefined ||
    redaction.scanned !== true ||
    redaction.scannedBytes < 1 ||
    redaction.hostValuesConsidered < 1 ||
    redaction.matches.length > 0
  )
    fail('episode-protected-value-disclosed')
  if (scanEpisodeDisclosureShapes(JSON.stringify(artifact)).length > 0)
    fail('episode-protected-value-disclosed')

  if (artifact.allPassed !== true) fail('episode-not-all-passed')

  if (artifact.finalized !== true) fail('episode-not-finalized')
  const finalization = artifact.finalization
  if (
    finalization === null ||
    finalization === undefined ||
    finalization.atomic !== true ||
    finalization.method !== 'staged-write-then-rename' ||
    finalization.identicalBytes !== true ||
    finalization.destinations.length < 2 ||
    finalization.stagedLeftovers !== 0 ||
    finalization.bytes < 1 ||
    !DIGEST_PATTERN.test(finalization.sha256)
  )
    fail('episode-finalization-not-atomic')
  const teardown = artifact.teardown
  if (teardown === null) {
    fail('episode-not-finalized')
  } else {
    for (const teardownClass of BL020_TEARDOWN_CLASSES) {
      const probe = teardown[teardownClass]
      if (
        probe === undefined ||
        probe.probeCompleted !== true ||
        probe.residual !== 0
      )
        fail('episode-teardown-not-clear')
    }
  }
  return Object.freeze(violations)
}

/** Shapes the residual-audit CLI refuses by name before it observes anything. */
export function classifyCloseEpisodeArtifact(
  value: unknown,
  digest?: (value: string) => string
): 'usable' | 'malformed' | 'unfinalized' | 'not-clear' {
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as { evidenceId?: unknown }).evidenceId !==
      'bl-020-designated-episode' ||
    !Array.isArray((value as { episodes?: unknown }).episodes)
  )
    return 'malformed'
  const artifact = value as ProjectCloseEpisodeArtifact
  if (artifact.finalized !== true || artifact.teardown === null)
    return 'unfinalized'
  const violations = validateProjectCloseEpisode(artifact, digest)
  if (violations.length > 0) return 'not-clear'
  return 'usable'
}

export interface CloseResidualAuditReport {
  readonly evidenceId: 'bl-020-residual-audit'
  readonly observedIndependently: true
  readonly classes: Readonly<
    Record<Bl020AuditResidualClass, CloseTeardownProbe>
  >
  readonly clear: boolean
}

export function serializeCloseResidualAudit(
  report: CloseResidualAuditReport
): string {
  return JSON.stringify(report, null, 2) + String.fromCharCode(10)
}

export function validateCloseResidualAudit(
  report: CloseResidualAuditReport
): readonly string[] {
  const violations: string[] = []
  if (
    report.evidenceId !== 'bl-020-residual-audit' ||
    report.observedIndependently !== true
  )
    violations.push('residual-audit-malformed')
  for (const auditClass of BL020_AUDIT_RESIDUAL_CLASSES) {
    const probe = report.classes[auditClass]
    if (probe === undefined || probe.probeCompleted !== true)
      violations.push('residual-audit-withheld:' + auditClass)
    else if (probe.residual !== 0)
      violations.push('residual-audit-nonzero:' + auditClass)
  }
  if (report.clear !== (violations.length === 0))
    violations.push('residual-audit-clear-flag-mismatch')
  return Object.freeze(violations)
}
