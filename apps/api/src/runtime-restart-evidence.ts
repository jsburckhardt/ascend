import {
  PUBLIC_RUNTIME_STATES,
  RESTART_ADMISSION_PHASES,
  RESTART_QUARANTINE_AUDIT_STATES,
  RUNTIME_ENTRY_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_RESTART_REJECTION_CATEGORIES,
} from './project-runtime-contract.js'
import { NFR015_EVENT_CATALOG } from './runtime-stop-evidence.js'
import { validatePublicReportingSource } from './runtime-state-evidence.js'

export const BL018_SCENARIOS = Object.freeze([
  'running-restart-success',
  'retained-failed-restart-success',
  'retained-failed-restart-after-unsuccessful-restart',
  'retained-failed-absent-resources',
  'release-then-replacement-ordering',
  'distinct-replacement-identity',
  'starting-projection-across-generations',
  'never-stopped-between-generations',
  'readiness-gated-success',
  'stale-connection-severed',
  'fresh-navigation-reaches-replacement',
  'registration-and-fixture-integrity',
  'home-restart-eligibility',
  'home-restart-accessibility-and-focus',
  'home-duplicate-activation-prevented',
  'home-peer-controls-available',
  'restart-event-cardinality',
  'pre-accept-rejection-no-event',
  'outcome-agreement-and-disclosure',
  'release-unconfirmed',
  'release-deadline-unconfirmed',
  'replacement-startup-failure',
  'replacement-readiness-failure',
  'replacement-failure-zero-residual',
  'eight-concurrent-joined-restarts',
  'three-sequential-restarts',
  'post-sequence-zero-residual',
  'unknown-project-restart',
  'stopped-project-restart',
  'start-in-progress-restart',
  'stop-in-progress-restart',
  'manager-shutdown-restart',
  'peer-isolation-running-success',
  'peer-isolation-retained-failed-success',
  'peer-isolation-release-unconfirmed',
  'peer-isolation-replacement-failure',
  'stale-release-settlement',
  'stale-exit-settlement',
  'stale-health-settlement',
  'stale-startup-settlement',
  'stale-proxy-acquisition',
  'home-unknown-outcome',
  'restart-versus-shutdown-inflight',
  'final-cleanup',
  'release-primitive-never-settles',
  'release-primitive-ignores-cancellation',
  'launch-primitive-never-settles',
  'overall-deadline-after-gate',
  'overall-deadline-before-gate',
  'replacement-collision-retry-bound',
  'proxy-reachable-category-rows',
  'deadline-before-launch-resolution-admission',
  'immediate-retry-blocked-until-late-predecessor-audited',
  'pending-admission-never-resolves-retry-bounded',
  'shutdown-bounded-with-unresolved-admission',
  'late-launch-resolves-after-shutdown',
  'late-oncleanup-cannot-overwrite-current-evidence',
  'late-onowned-quarantined-not-owned',
  'absent-confirmed-admission-passes-gate',
  'quarantine-audit-single-attempt-cardinality',
  'collision-cleanup-confirmed-record-deleted',
  'replacement-cleanup-unconfirmed-blocks-and-quarantines',
  'post-quarantine-restart-reclaims-single-prior-handle',
  'replacement-cleanup-evidence-identity-keyed',
] as const)

export type Bl018Scenario = (typeof BL018_SCENARIOS)[number]

export const BL018_RESTART_EVENT_NAMES = Object.freeze([
  'runtime.restart.requested',
  'runtime.restart.succeeded',
  'runtime.restart.failed',
] as const)

export const BL018_OUTCOMES = Object.freeze([
  'restarted',
  'rejected',
  'joined',
  'invariant-fault',
  'not-attempted',
] as const)

export const BL018_PRIOR_RESOURCE_CLASSES = Object.freeze([
  'live-record',
  'absent-record',
  'no-record',
  'pending-admission',
  'quarantined-residual',
] as const)

export const BL018_REPLACEMENT_AUDIT_STATES = Object.freeze([
  'none',
  'audited-absent',
  'unaudited-retained',
  'admission-unresolved',
  'quarantined-unconfirmed',
] as const)

export const BL018_RELEASE_MODES = Object.freeze([
  'already-absent',
  'graceful',
  'escalated',
  'unconfirmed',
] as const)

export const BL018_SIGNAL_DELIVERIES = Object.freeze([
  'delivered',
  'refused',
  'not-attempted',
] as const)

export const BL018_ELAPSED_CLASSES = Object.freeze([
  'zero',
  'within-release',
  'within-overall',
] as const)

export const BL018_DEADLINE_SOURCE = 'trusted-scheduler' as const

export const BL018_DEADLINE_FIRED = Object.freeze([
  'none',
  'release',
  'overall',
] as const)

export const BL018_STATE_PHASES = Object.freeze([
  'accept',
  'post-release',
  'post-launch',
  'settled',
] as const)

export const BL018_ADMISSION_RESOLUTIONS = Object.freeze([
  'none',
  'absent-confirmed',
  'audited-absent',
  'materialized-quarantined',
  'unresolved',
] as const)

export const BL018_ADMISSION_RESOLVERS = Object.freeze([
  'continuation',
  'retry-release',
  'shutdown',
  'none',
] as const)

export const BL018_ADMISSION_RESOLUTION_ORDERS = Object.freeze([
  'before-gate',
  'after-gate',
  'not-resolved',
] as const)

export const BL018_SETTLEMENT_REASON_SOURCES = Object.freeze([
  'phase-abort',
  'launch-error',
  'none',
] as const)

export const BL018_INVENTORY_CLASSES = Object.freeze([
  'runtime-process-and-listener',
  'unrelated-control',
  'registration-resource',
  'disposable-fixture',
] as const)

export const BL018_INVENTORY_OWNERSHIP = Object.freeze([
  'product-registration-during-scenario',
  'validation-owned-temporary',
] as const)

export const BL018_ATTRIBUTION_CLAIM = 'process-group-membership' as const

export const BL018_ATTRIBUTION_CEILING =
  'A descendant that leaves the owned process group before the audit samples it is unattributable; BL-018 neither adopts nor terminates it.' as const

export const BL018_MUTATION_CLASSES = Object.freeze([
  'M-1',
  'M-2',
  'M-3',
  'M-4',
  'M-5',
  'M-6',
  'M-7',
  'M-8',
] as const)

/** The seven revision-1 source-guard rules this issue carried forward. */
export const BL018_BASE_SOURCE_GUARD_CODES = Object.freeze([
  'restart-manager-lifecycle-call',
  'restart-launch-not-gated',
  'restart-registered-entry-install',
  'restart-non-catalog-event-name',
  'restart-foreign-event-emission',
  'restart-public-state-literal',
  'restart-bound-outside-config',
] as const)

/**
 * The sixteen violation codes revisions 2 through 5 added, in the order the
 * action plan introduces them: six deadline and launch-configuration codes plus
 * the workbench exhaustiveness code (7), six admission and late-callback codes
 * (13), two identity-keyed cleanup codes (15), and one settlement-precedence
 * code (16).
 */
export const BL018_ADDED_SOURCE_GUARD_CODES = Object.freeze([
  'restart-fallible-timer',
  'restart-deadline-arm-count',
  'restart-deadline-uncancelled',
  'restart-untyped-abort',
  'restart-inferred-phase',
  'restart-derived-config',
  'workbench-table-not-exhaustive',
  'restart-admission-missing',
  'restart-late-callback-unguarded',
  'restart-quarantine-project-keyed',
  'restart-abandoned-task-tracked',
  'restart-admission-shortcut',
  'restart-detached-continuation-missing',
  'restart-cleanup-not-identity-keyed',
  'restart-unconfirmed-cleanup-not-blocked',
  'restart-settlement-reason-precedence-missing',
] as const)

export const BL018_SOURCE_GUARD_CODES = Object.freeze([
  ...BL018_BASE_SOURCE_GUARD_CODES,
  ...BL018_ADDED_SOURCE_GUARD_CODES,
] as const)

export type Bl018SourceGuardCode = (typeof BL018_SOURCE_GUARD_CODES)[number]

const WALL_CLOCK_FLOOR_MS = 1_000_000_000_000

export interface RuntimeRestartAuditTriple {
  readonly processAbsent: boolean
  readonly processGroupAbsent: boolean
  readonly listenerAbsent: boolean
  readonly complete: boolean
}

export interface RuntimeRestartAttribution {
  readonly ownedGroupSampled: boolean
  readonly ceilingRecorded: boolean
  readonly claim: string
}

export interface RuntimeRestartEligibility {
  readonly entryState: string | null
  readonly accepted: boolean
}

export interface RuntimeRestartGate {
  readonly passed: boolean
  readonly gateConfirmed: boolean
  readonly launchAfterGate: boolean
  readonly spawnsBeforeGate: number
}

export interface RuntimeRestartDeadlineArm {
  readonly source: string
  readonly declaredMs: number
  readonly cancelled: boolean
}

export interface RuntimeRestartDeadlines {
  readonly releaseArm: RuntimeRestartDeadlineArm
  readonly overallArm: RuntimeRestartDeadlineArm
  readonly fired: string
  readonly abortReasonCategory: string | null
}

export interface RuntimeRestartStateObservation {
  readonly phase: string
  readonly runtime: string
  readonly api: string
  readonly home: string
}

export interface RuntimeRestartEvidenceEvent {
  readonly id: string
  readonly event: string
  readonly from: string
  readonly to: string
  readonly publicState: string
  readonly classification: string | null
  readonly elapsedClass: string
}

export interface RuntimeRestartPhaseCounts {
  readonly restartRelease: number
  readonly restartReplacement: number
  readonly shutdown: number
}

export interface RuntimeRestartStaleSettlement {
  readonly settlementClass: string
  readonly appliedToSuccessor: boolean
  readonly successorMutations: number
  readonly successorEvents: number
}

export interface RuntimeRestartConnections {
  readonly priorGenerationUsable: boolean
  readonly freshNavigationReachedReplacement: boolean
  readonly sessionContinuityClaimed: boolean
}

export interface RuntimeRestartDigestPair {
  readonly before: string
  readonly after: string
}

export interface RuntimeRestartFixtureDigest extends RuntimeRestartDigestPair {
  readonly fixture: string
}

export interface RuntimeRestartInventoryItem {
  readonly item: string
  readonly itemClass: string
  readonly ownership: string
}

export interface RuntimeRestartAdmissionRecord {
  readonly createdBeforeLaunch: boolean
  readonly admissionsCreated: number
  readonly admissionId: string | null
  readonly phaseAtSettlement: string | null
  readonly resolution: string
  readonly resolvedBy: string
  readonly resolutionOrder: string
  readonly createdProcessCount: number
  readonly deletions: number
}

export interface RuntimeRestartQuarantineRecord {
  readonly recordCount: number
  readonly auditStates: readonly string[]
  readonly terminationAttempts: number
  readonly reattempts: number
  readonly reattemptClaims: number
  readonly deletions: number
  readonly concurrentAttempts: number
  readonly createdByInstalledCleanup: number
}

export interface RuntimeRestartReplacementAttempts {
  readonly launchAttempts: number
  readonly portsAcquired: number
  readonly portsAcquiredAfterAbort: number
  readonly cleanupAudits: number
  readonly confirmingCleanups: number
  readonly nonConfirmingCleanups: number
  readonly ownershipDeletions: number
  readonly ownershipRecordsAfterSettlement: number
  readonly attemptAuditKeys: readonly string[]
  readonly attemptAuditOverwrites: number
  readonly projectKeyedCleanupWrites: number
  readonly settlementReasonSource: string
  readonly launchRejectionCategory: string | null
}

export interface RuntimeRestartLateCallbacks {
  readonly ownedAfterSettlement: number
  readonly cleanupAfterSettlement: number
  readonly ownershipMapMutations: number
  readonly entryMutations: number
  readonly currentCleanupMutations: number
  readonly eventsEmitted: number
  readonly quarantineWrites: number
}

export interface RuntimeRestartTaskSets {
  readonly abandonedLaunchInCompletionTasks: boolean
  readonly abandonedLaunchInBackgroundTasks: boolean
  readonly abandonedLaunchInRestartTasks: boolean
  readonly restartTasksAwaitedByShutdown: boolean
}

export interface RuntimeRestartShutdownRecord {
  readonly status: string
  readonly unresolvedAdmissionCount: number
  readonly quarantineSwept: number
  readonly awaitedAbandonedLaunch: boolean
  readonly elapsedClass: string
}

export interface RuntimeRestartEvidenceRow {
  readonly scenario: Bl018Scenario
  readonly executionIds: Readonly<{
    runtime: string
    api: string
    home: string
  }>
  readonly outcome: string
  readonly rejectionCategory: string | null
  readonly eligibility: RuntimeRestartEligibility
  readonly priorResourceClass: string
  readonly releaseMode: string | null
  readonly signalDelivery: string
  readonly releaseAuditTriple: RuntimeRestartAuditTriple | null
  readonly gate: RuntimeRestartGate
  readonly deadlines: RuntimeRestartDeadlines
  readonly replacementAuditState: string
  readonly replacementAuditTriple: RuntimeRestartAuditTriple | null
  readonly priorIdentity: string | null
  readonly replacementIdentity: string | null
  readonly distinctIdentity: boolean
  readonly attribution: RuntimeRestartAttribution
  readonly stateSeries: readonly RuntimeRestartStateObservation[]
  readonly elapsedClass: string
  readonly withinDeclaredBound: boolean
  readonly runtimeState: string
  readonly apiState: string
  readonly homeState: string
  readonly failureCategory: string | null
  readonly events: readonly RuntimeRestartEvidenceEvent[]
  readonly requestedEventCount: number
  readonly terminalEventCount: number
  readonly preAcceptEventCount: number
  readonly loserEventCount: number
  readonly foreignEventCount: number
  readonly joinedCallers: number
  readonly acceptedRestarts: number
  readonly releasePhaseTerminations: number
  readonly replacementLaunches: number
  /**
   * Entry-map mutations for the selected project made by any path other than
   * the accepted restart operation itself. Every honest row records zero.
   */
  readonly entryMutations: number
  readonly terminateCallsByPhase: RuntimeRestartPhaseCounts
  readonly cleanupRecordsByPhase: RuntimeRestartPhaseCounts
  readonly identitiesCreated: number
  readonly identitiesTerminated: number
  readonly staleSettlements: readonly RuntimeRestartStaleSettlement[]
  readonly connections: RuntimeRestartConnections | null
  readonly registrationRowCount: number
  readonly registrationDigests: RuntimeRestartDigestPair
  readonly peerDigests: RuntimeRestartDigestPair | null
  readonly controlDigests: RuntimeRestartDigestPair | null
  readonly fixtureDigests: readonly RuntimeRestartFixtureDigest[]
  readonly inventory: readonly RuntimeRestartInventoryItem[]
  readonly admission: RuntimeRestartAdmissionRecord
  readonly quarantine: RuntimeRestartQuarantineRecord
  readonly replacementAttempts: RuntimeRestartReplacementAttempts
  readonly lateCallbacks: RuntimeRestartLateCallbacks
  readonly taskSets: RuntimeRestartTaskSets
  readonly shutdown: RuntimeRestartShutdownRecord | null
  /**
   * Settlement residual knowledge owned by the restart operation. The integer
   * `0` means a completed exact audit observed every in-scope resource absent;
   * `null` is the schema's only representation of a withheld residual claim.
   */
  readonly residualCount: number | null
  /**
   * Validation-owned fixture teardown owned by the harness. Always the integer
   * `0`, and never a manager-side absence claim.
   */
  readonly teardownResidualCount: number
  readonly assertionCount: number
}

export interface RuntimeRestartDeclaredBounds {
  readonly releaseMs: number
  readonly quarantineReleaseMs: number
  readonly restartReleaseMs: number
  readonly replacementMs: number
  readonly settlementAllowanceMs: number
  readonly overallMs: number
  readonly overallWithQuarantineMs: number
  readonly transportMs: number
}

export interface RuntimeRestartMatrix {
  readonly schemaVersion: 1
  readonly declaredBounds: RuntimeRestartDeclaredBounds
  readonly productionDefaultBounds: RuntimeRestartDeclaredBounds
  readonly rows: readonly RuntimeRestartEvidenceRow[]
}

export interface RuntimeRestartValidationReport {
  readonly accepted: boolean
  readonly violations: readonly string[]
}

export interface SelectedRestartSources {
  readonly manager: string
  readonly process: string
  readonly restartRoute: string
  readonly stopRoute: string
  readonly workbenchContract: string
  readonly emittedEventNames: readonly string[]
}

export const BL018_PRODUCTION_DEFAULT_BOUNDS: RuntimeRestartDeclaredBounds =
  Object.freeze({
    releaseMs: 5_000,
    quarantineReleaseMs: 15_000,
    restartReleaseMs: 20_000,
    replacementMs: 60_000,
    settlementAllowanceMs: 1_000,
    overallMs: 66_000,
    overallWithQuarantineMs: 81_000,
    transportMs: 85_000,
  })

const report = (
  violations: readonly string[]
): RuntimeRestartValidationReport =>
  Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze([...violations]),
  })

const countMatches = (source: string, pattern: RegExp): number =>
  source.match(pattern)?.length ?? 0

function balanced(
  source: string,
  openIndex: number,
  open: string,
  close: string
): string | undefined {
  if (source[openIndex] !== open) return undefined
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index]
    if (character === open) depth += 1
    else if (character === close) {
      depth -= 1
      if (depth === 0) return source.slice(openIndex, index + 1)
    }
  }
  return undefined
}

const RESTART_SIGNATURE = 'Promise<RuntimeRestartOutcome> => {'

function restartBody(manager: string): string | undefined {
  const start = manager.indexOf('const restart = async (input: {')
  if (start < 0) return undefined
  const signature = manager.indexOf(RESTART_SIGNATURE, start)
  if (signature < 0) return undefined
  return balanced(manager, signature + RESTART_SIGNATURE.length - 1, '{', '}')
}

function arrowBody(source: string, name: string): string | undefined {
  const marker = 'const ' + name + ' = ('
  const start = source.indexOf(marker)
  if (start < 0) return undefined
  const open = source.indexOf('{', start + marker.length)
  if (open < 0) return undefined
  return balanced(source, open, '{', '}')
}

function callArguments(source: string, marker: string): readonly string[] {
  const calls: string[] = []
  let cursor = source.indexOf(marker)
  while (cursor >= 0) {
    const open = cursor + marker.length - 1
    const block = balanced(source, open, '(', ')')
    if (block !== undefined) calls.push(block.slice(1, -1).trim())
    cursor = source.indexOf(marker, cursor + marker.length)
  }
  return calls
}

const typedFailureNames = (body: string): ReadonlySet<string> => {
  const names = new Set<string>()
  const factories = new Set<string>()
  for (const match of body.matchAll(
    /const (\w+) = \([^)]*\)\s*:\s*RuntimeFailure\s*=>/gu
  )) {
    factories.add(match[1] ?? '')
  }
  for (const match of body.matchAll(
    /(?:const|let)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*new RuntimeFailure\(/gu
  )) {
    names.add(match[1] ?? '')
  }
  for (const match of body.matchAll(/(\w+)\s*:\s*RuntimeFailure\b/gu)) {
    names.add(match[1] ?? '')
  }
  for (const factory of factories) {
    for (const match of body.matchAll(
      new RegExp('(?:const|let)\\s+(\\w+)\\s*=\\s*' + factory + '\\s*\\(', 'gu')
    )) {
      names.add(match[1] ?? '')
    }
  }
  return names
}

function validateDeadlineArming(body: string, violations: string[]): void {
  if (
    /processDependencies\.sleep\(|dependencies\.sleep\(|primitives\.delay\(/u.test(
      body
    )
  )
    violations.push('restart-fallible-timer')
  if (countMatches(body, /scheduleDeadline\(/gu) !== 2)
    violations.push('restart-deadline-arm-count')
  const cancellers = [
    ...body.matchAll(
      /const (\w+) = \w+\.scheduleDeadline\(\s*(\w+),\s*(\w+)\s*\)/gu
    ),
  ]
  if (cancellers.length !== 2) {
    violations.push('restart-deadline-uncancelled')
  } else {
    for (const canceller of cancellers) {
      const name = canceller[1] ?? ''
      if (countMatches(body, new RegExp('\\b' + name + '\\(\\)', 'gu')) === 0)
        violations.push('restart-deadline-uncancelled')
    }
  }
  const boundNames = cancellers.map((canceller) => canceller[2] ?? '')
  for (const boundName of boundNames) {
    const assignment = new RegExp(
      '(?:const|let)\\s+' +
        boundName +
        '\\s*=\\s*([\\s\\S]{0,220}?)\\n\\s*(?:const|let|return|if)\\b',
      'u'
    )
    const match = assignment.exec(body)
    const expression = match?.[1] ?? ''
    if (
      !/runtimeStopOverallBoundMs\(\s*config|runtimeRestartReleaseBoundMs\(\s*config|runtimeRestartOverallBoundMs\(\s*\n?\s*config/u.test(
        expression
      )
    ) {
      violations.push('restart-bound-outside-config')
    }
  }
  if (boundNames.length !== 2) violations.push('restart-bound-outside-config')
  for (const argument of callArguments(body, 'phaseController.abort(')) {
    if (argument.startsWith('new RuntimeFailure(')) continue
    if (typedFailureNames(body).has(argument)) continue
    violations.push('restart-untyped-abort')
  }
}

function validateSettlementBranches(body: string, violations: string[]): void {
  const deadlineStart = body.indexOf("launchResult.kind === 'overall-deadline'")
  const failureStart = body.indexOf("launchResult.kind === 'failure'")
  if (deadlineStart < 0 || failureStart <= deadlineStart) {
    violations.push('restart-inferred-phase')
    violations.push('restart-settlement-reason-precedence-missing')
    return
  }
  const deadlineBranch = body.slice(deadlineStart, failureStart)
  if (
    !/\bgateConfirmed\b/u.test(deadlineBranch) ||
    /\bnow\(\)|Date\.now|performance\.now/u.test(deadlineBranch)
  ) {
    violations.push('restart-inferred-phase')
  }
  const failureBranch = body.slice(failureStart)
  const signalRead = failureBranch.indexOf(
    'phaseController.signal.reason instanceof RuntimeFailure'
  )
  const blockRead = failureBranch.indexOf('replacementBlockReason')
  const launchRead = failureBranch.indexOf(
    'launchResult.error instanceof RuntimeFailure'
  )
  if (
    signalRead < 0 ||
    blockRead < 0 ||
    launchRead < 0 ||
    signalRead > blockRead ||
    blockRead > launchRead
  ) {
    violations.push('restart-settlement-reason-precedence-missing')
  }
}

function validateAdmissionWiring(
  manager: string,
  body: string,
  violations: string[]
): void {
  const launchCalls = [...body.matchAll(/(?:const (\w+) = )?launch\(\{/gu)]
  if (launchCalls.length !== 1) {
    violations.push('restart-admission-missing')
    violations.push('restart-detached-continuation-missing')
    return
  }
  const launchCall = launchCalls[0]!
  const launchIndex = launchCall.index
  const launchPromiseName = launchCall[1] ?? ''
  const admissionCreate = Math.max(
    body.indexOf('pendingAdmissions.set('),
    body.indexOf('createPendingAdmission(')
  )
  const createsIndex =
    manager.indexOf('createPendingAdmission') >= 0 &&
    /const createPendingAdmission[\s\S]*?pendingAdmissions\.set\(/u.test(
      manager
    )
      ? admissionCreate
      : -1
  if (createsIndex < 0 || createsIndex > launchIndex)
    violations.push('restart-admission-missing')

  const launchObject =
    balanced(body, launchIndex + launchCall[0].length - 1, '{', '}') ?? ''
  if (
    !/onOwned:\s*restartOnOwned\b/u.test(launchObject) ||
    !/onCleanup:\s*restartOnCleanup\b/u.test(launchObject)
  ) {
    violations.push('restart-late-callback-unguarded')
  }
  if (!/(?:^|[^:\w])config,/mu.test(launchObject))
    violations.push('restart-derived-config')

  if (launchPromiseName === '') {
    violations.push('restart-detached-continuation-missing')
  } else {
    if (
      countMatches(
        body,
        new RegExp('void ' + launchPromiseName + '\\.then\\(', 'gu')
      ) === 0
    ) {
      violations.push('restart-detached-continuation-missing')
    }
    for (const set of [
      'completionTasks',
      'backgroundTasks',
      'restartTasks',
      'stopTasks',
    ]) {
      if (body.includes(set + '.add(' + launchPromiseName + ')'))
        violations.push('restart-abandoned-task-tracked')
    }
  }

  const admissionRead = body.indexOf('pendingAdmissions.get(input.projectId)')
  const firstTerminate = body.indexOf('.terminate(')
  if (
    admissionRead < 0 ||
    (firstTerminate >= 0 && admissionRead > firstTerminate)
  )
    violations.push('restart-admission-shortcut')
  const requires =
    /const requiresQuarantineResolution =([\s\S]{0,220}?)\n\s*const /u.exec(
      body
    )
  const requiresExpression = requires?.[1] ?? ''
  if (
    !/priorAdmission|pendingAdmissions/u.test(requiresExpression) ||
    !/quarantine/iu.test(requiresExpression)
  ) {
    violations.push('restart-admission-shortcut')
  }
}

function validateRestartCallbacks(body: string, violations: string[]): void {
  const owned = arrowBody(body, 'restartOnOwned')
  const cleanup = arrowBody(body, 'restartOnCleanup')
  if (owned === undefined || cleanup === undefined) {
    violations.push('restart-late-callback-unguarded')
    violations.push('restart-quarantine-project-keyed')
    violations.push('restart-cleanup-not-identity-keyed')
    violations.push('restart-unconfirmed-cleanup-not-blocked')
    return
  }
  const installedGuard = owned.indexOf('!operationSettled')
  const registerIndex = owned.indexOf('registerOwnership(')
  if (
    installedGuard < 0 ||
    registerIndex < 0 ||
    registerIndex < installedGuard ||
    !owned.includes('quarantineOwnership(')
  ) {
    violations.push('restart-quarantine-project-keyed')
  }
  if (
    cleanup.includes('recordCleanup(') ||
    cleanup.includes('registerOwnership(')
  )
    violations.push('restart-quarantine-project-keyed')

  if (
    !/\[\s*audit\.pid,\s*audit\.processStartTime,\s*audit\.port,?\s*\]\s*\.join\(':'\)/u.test(
      cleanup.replace(/\n\s*/gu, ' ').replace(/\s+/gu, ' ')
    )
  ) {
    violations.push('restart-cleanup-not-identity-keyed')
  }
  for (const argument of callArguments(cleanup, 'ownership.delete(')) {
    if (argument !== 'identityKey')
      violations.push('restart-cleanup-not-identity-keyed')
  }
  if (cleanup.includes('ownership.delete(input.projectId'))
    violations.push('restart-cleanup-not-identity-keyed')

  const blockDeclaration =
    /const (\w+) = new RuntimeFailure\(\s*'restart-replacement-unconfirmed'\s*\)/u.exec(
      cleanup
    )
  if (blockDeclaration === null) {
    violations.push('restart-unconfirmed-cleanup-not-blocked')
  } else {
    const name = blockDeclaration[1] ?? ''
    const assignIndex = cleanup.indexOf('replacementBlockReason = ' + name)
    const abortIndex = cleanup.indexOf('phaseController.abort(' + name + ')')
    if (
      assignIndex < 0 ||
      abortIndex < 0 ||
      blockDeclaration.index > assignIndex ||
      assignIndex > abortIndex
    ) {
      violations.push('restart-unconfirmed-cleanup-not-blocked')
    }
  }

  const continuationStart = body.indexOf('void launchPromise.then(')
  if (continuationStart >= 0) {
    const continuation =
      balanced(
        body,
        body.indexOf('(', continuationStart + 'void launchPromise.then'.length),
        '(',
        ')'
      ) ?? ''
    if (
      continuation.includes('recordCleanup(') ||
      continuation.includes('registerOwnership(') ||
      continuation.includes('entries.set(') ||
      continuation.includes('emit(')
    ) {
      violations.push('restart-quarantine-project-keyed')
    }
  }
}

function validateRestartInvariants(body: string, violations: string[]): void {
  if (/[^.\w](?:stop|start)\(\{/u.test(body))
    violations.push('restart-manager-lifecycle-call')
  const gateIndex = body.indexOf('gateConfirmed = true')
  const launchIndex = body.indexOf('launch({')
  if (gateIndex < 0 || launchIndex < 0 || gateIndex > launchIndex)
    violations.push('restart-launch-not-gated')
  if (/state:\s*'registered'/u.test(body))
    violations.push('restart-registered-entry-install')
  for (const match of body.matchAll(/event:\s*'([a-z.]+)'/gu)) {
    const name = match[1] ?? ''
    if (!(BL018_RESTART_EVENT_NAMES as readonly string[]).includes(name))
      violations.push('restart-foreign-event-emission')
  }
}

const STATE_SHAPED_LITERAL = /'([A-Z][a-z]+)'/gu
const publicStates = new Set<string>(PUBLIC_RUNTIME_STATES)

function validateStateLiterals(sources: readonly string[]): readonly string[] {
  const violations: string[] = []
  for (const source of sources) {
    for (const match of source.matchAll(STATE_SHAPED_LITERAL)) {
      const literal = match[1] ?? ''
      if (!publicStates.has(literal))
        violations.push('restart-public-state-literal:' + literal)
    }
  }
  return violations
}

function validateRouteSources(
  restartRoute: string,
  stopRoute: string,
  violations: string[]
): void {
  for (const [source, listName] of [
    [restartRoute, 'RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES'],
    [stopRoute, 'RUNTIME_STOP_ROUTE_ERROR_CATEGORIES'],
  ] as const) {
    const start = source.indexOf(listName + ' = Object.freeze([')
    const end = source.indexOf(']', start)
    if (
      start < 0 ||
      end < 0 ||
      countMatches(source.slice(start, end), /'[a-z_]+'/gu) !== 10
    ) {
      violations.push('restart-bound-outside-config')
    }
  }
  const mapStart = restartRoute.indexOf('const RESTART_REJECTION_STATUS')
  const mapped =
    mapStart < 0
      ? ''
      : (balanced(
          restartRoute,
          restartRoute.indexOf('{', mapStart),
          '{',
          '}'
        ) ?? '')
  for (const category of RUNTIME_RESTART_REJECTION_CATEGORIES) {
    if (countMatches(mapped, new RegExp("'" + category + "':", 'gu')) !== 1)
      violations.push('restart-manager-lifecycle-call')
  }
}

function validateWorkbenchTable(
  workbenchContract: string,
  violations: string[]
): void {
  const start = workbenchContract.indexOf('WORKBENCH_FAILURE_TABLE')
  const runtimeRows =
    start < 0
      ? []
      : [
          ...workbenchContract.slice(start).matchAll(/'runtime:([a-z-]+)'/gu),
        ].map((match) => match[1] ?? '')
  const expected = RUNTIME_FAILURE_CATEGORIES.filter(
    (category) => category !== 'manager-shutdown'
  )
  if (
    runtimeRows.length !== expected.length ||
    expected.some((category, index) => runtimeRows[index] !== category)
  ) {
    violations.push('workbench-table-not-exhaustive')
  }
}

export function validateSelectedRestartSource(
  input: SelectedRestartSources
): RuntimeRestartValidationReport {
  const violations: string[] = []
  const body = restartBody(input.manager)
  if (body === undefined) {
    violations.push('restart-manager-lifecycle-call')
  } else {
    validateDeadlineArming(body, violations)
    validateSettlementBranches(body, violations)
    validateAdmissionWiring(input.manager, body, violations)
    validateRestartCallbacks(body, violations)
    validateRestartInvariants(body, violations)
  }
  if (!/launchReadyRuntime/u.test(input.process))
    violations.push('restart-launch-not-gated')
  validateRouteSources(input.restartRoute, input.stopRoute, violations)
  validateWorkbenchTable(input.workbenchContract, violations)
  violations.push(
    ...validateStateLiterals([
      input.manager,
      input.restartRoute,
      input.stopRoute,
    ])
  )
  violations.push(
    ...validatePublicReportingSource(input.manager).violations.map(
      (violation) => 'restart-public-reporting:' + violation
    )
  )
  const catalog = new Set<string>(NFR015_EVENT_CATALOG)
  for (const name of input.emittedEventNames) {
    if (!catalog.has(name))
      violations.push('restart-non-catalog-event-name:' + name)
  }
  return report(violations)
}

const outcomeSet = new Set<string>(BL018_OUTCOMES)
const priorResourceClassSet = new Set<string>(BL018_PRIOR_RESOURCE_CLASSES)
const replacementAuditStateSet = new Set<string>(BL018_REPLACEMENT_AUDIT_STATES)
const releaseModeSet = new Set<string>(BL018_RELEASE_MODES)
const signalDeliverySet = new Set<string>(BL018_SIGNAL_DELIVERIES)
const elapsedClassSet = new Set<string>(BL018_ELAPSED_CLASSES)
const deadlineFiredSet = new Set<string>(BL018_DEADLINE_FIRED)
const statePhaseSet = new Set<string>(BL018_STATE_PHASES)
const admissionResolutionSet = new Set<string>(BL018_ADMISSION_RESOLUTIONS)
const admissionResolverSet = new Set<string>(BL018_ADMISSION_RESOLVERS)
const admissionResolutionOrderSet = new Set<string>(
  BL018_ADMISSION_RESOLUTION_ORDERS
)
const settlementReasonSourceSet = new Set<string>(
  BL018_SETTLEMENT_REASON_SOURCES
)
const inventoryClassSet = new Set<string>(BL018_INVENTORY_CLASSES)
const inventoryOwnershipSet = new Set<string>(BL018_INVENTORY_OWNERSHIP)
const failureCategorySet = new Set<string>(RUNTIME_FAILURE_CATEGORIES)
const rejectionCategorySet = new Set<string>(
  RUNTIME_RESTART_REJECTION_CATEGORIES
)
const admissionPhaseSet = new Set<string>(RESTART_ADMISSION_PHASES)
const quarantineAuditStateSet = new Set<string>(RESTART_QUARANTINE_AUDIT_STATES)
const eventNameCatalog = new Set<string>(NFR015_EVENT_CATALOG)

const OPAQUE_IDENTITY = /^bl018-identity-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const OPAQUE_ADMISSION = /^bl018-admission-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const OPAQUE_ATTEMPT = /^bl018-attempt-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const OPAQUE_EVENT = /^bl018-event-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const OPAQUE_DIGEST = /^[0-9a-f]{64}$/u

/**
 * The delivered protected-value scan. BL-016 and BL-017 each keep this pattern
 * module-private; BL-018 keeps the same shape so a disclosure regression in one
 * evidence module cannot silently widen another.
 */
const protectedEvidence =
  /(?:\/(?:home|tmp|workspaces|safe|proc)\/|https?:\/\/|wss?:\/\/|127\.0\.0\.1|localhost|canonicalPath|internalUrl|ownerToken|\b(?:pid|port|command|environment|stdout|stderr|diagnostic|credential|secret|token)\b)/iu

const duplicateValues = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length

const isCountedInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isExactZero = (value: unknown): boolean =>
  typeof value === 'number' && Number.isSafeInteger(value) && value === 0

function containsWallClockNumber(value: unknown): boolean {
  if (typeof value === 'number')
    return Number.isFinite(value) && Math.abs(value) >= WALL_CLOCK_FLOOR_MS
  if (Array.isArray(value)) return value.some(containsWallClockNumber)
  if (value !== null && typeof value === 'object')
    return Object.values(value).some(containsWallClockNumber)
  return false
}

/**
 * The action plan's total, ordered residual-claim predicate. `true` means the
 * operation withheld a residual claim, so `residualCount` must be `null`.
 */
export function restartResidualClaimWithheld(
  row: RuntimeRestartEvidenceRow
): boolean {
  if (
    row.replacementAuditState === 'unaudited-retained' ||
    row.replacementAuditState === 'admission-unresolved' ||
    row.replacementAuditState === 'quarantined-unconfirmed'
  ) {
    return true
  }
  if (row.releaseMode === 'unconfirmed') return true
  if (row.admission.resolution === 'unresolved') return true
  if (
    row.quarantine.recordCount !== 0 &&
    row.quarantine.auditStates.some((state) => state !== 'audited-absent')
  ) {
    return true
  }
  return false
}

function validateDeclaredBounds(
  bounds: RuntimeRestartDeclaredBounds,
  label: string,
  fail: (code: string) => void
): void {
  for (const value of Object.values(bounds)) {
    if (!Number.isSafeInteger(value) || value <= 0) fail(label + '-bound-value')
  }
  if (bounds.restartReleaseMs !== bounds.releaseMs + bounds.quarantineReleaseMs)
    fail(label + '-release-bound-composition')
  if (
    bounds.overallMs !==
    bounds.releaseMs + bounds.replacementMs + bounds.settlementAllowanceMs
  ) {
    fail(label + '-overall-bound-composition')
  }
  if (
    bounds.overallWithQuarantineMs !==
    bounds.restartReleaseMs +
      bounds.replacementMs +
      bounds.settlementAllowanceMs
  ) {
    fail(label + '-quarantine-bound-composition')
  }
  if (bounds.transportMs <= bounds.overallWithQuarantineMs)
    fail(label + '-transport-bound-composition')
}

function validateOrdering(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  if (!isExactZero(row.gate.spawnsBeforeGate)) fail('m1-spawn-before-gate')
  if (row.replacementLaunches > 0 && !row.gate.passed)
    fail('m1-launch-without-gate')
  if (row.replacementAttempts.launchAttempts > 0 && !row.gate.launchAfterGate)
    fail('m1-launch-before-gate')
  if (row.gate.passed && !row.gate.gateConfirmed) fail('m1-gate-unconfirmed')
  if (row.gate.passed && row.releaseMode !== 'already-absent') {
    const triple = row.releaseAuditTriple
    if (
      triple === null ||
      !triple.complete ||
      !triple.processAbsent ||
      !triple.processGroupAbsent ||
      !triple.listenerAbsent
    ) {
      fail('m1-gate-passed-without-release-confirmation')
    }
  }
  if (row.gate.passed && row.releaseMode === 'already-absent') {
    if (row.releaseAuditTriple !== null || row.releasePhaseTerminations !== 0)
      fail('m1-already-absent-release-claim')
  }
  if (row.outcome === 'restarted' && row.releaseMode !== 'already-absent') {
    const triple = row.releaseAuditTriple
    if (triple === null || !triple.complete)
      fail('m1-restarted-release-audit-incomplete')
  }
}

function validateStateTruth(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  for (const state of [row.runtimeState, row.apiState, row.homeState]) {
    if (!publicStates.has(state)) fail('m2-state-outside-catalog')
  }
  const seenPhases: string[] = []
  for (const observation of row.stateSeries) {
    if (!statePhaseSet.has(observation.phase)) fail('m2-phase-outside-catalog')
    seenPhases.push(observation.phase)
    const surfaces = [observation.runtime, observation.api, observation.home]
    for (const state of surfaces) {
      if (!publicStates.has(state)) fail('m2-state-outside-catalog')
      if (state === 'Stopped') fail('m2-stopped-observation')
    }
    if (
      observation.phase === 'post-release' &&
      surfaces.some((state) => state === 'Running')
    ) {
      fail('m2-running-before-readiness')
    }
    if (
      observation.phase === 'settled' &&
      row.outcome === 'restarted' &&
      surfaces.some((state) => state !== 'Running')
    ) {
      fail('m2-restarted-settled-not-running')
    }
  }
  const expectedOrder = BL018_STATE_PHASES.filter((phase) =>
    seenPhases.includes(phase)
  )
  if (expectedOrder.some((phase, index) => seenPhases[index] !== phase))
    fail('m2-state-series-order')
}

function validateCardinality(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  let requested = 0
  let terminal = 0
  for (const event of row.events) {
    if (!eventNameCatalog.has(event.event)) fail('m3-non-catalog-event-name')
    if (!(BL018_RESTART_EVENT_NAMES as readonly string[]).includes(event.event))
      fail('m3-foreign-event-name')
    if (event.event === 'runtime.restart.requested') requested += 1
    else terminal += 1
    if (!publicStates.has(event.publicState)) fail('m2-state-outside-catalog')
    if (!elapsedClassSet.has(event.elapsedClass)) fail('m3-event-elapsed-class')
    if (
      event.classification !== null &&
      !failureCategorySet.has(event.classification)
    ) {
      fail('m3-event-classification')
    }
    if (!OPAQUE_EVENT.test(event.id)) fail('m5-event-id-format')
  }
  if (row.requestedEventCount !== requested) fail('m3-requested-event-count')
  if (row.terminalEventCount !== terminal) fail('m3-terminal-event-count')
  if (!isExactZero(row.preAcceptEventCount)) fail('m3-pre-accept-event-count')
  if (!isExactZero(row.loserEventCount)) fail('m3-loser-event-count')
  if (!isExactZero(row.foreignEventCount)) fail('m3-foreign-event-count')
  if (row.acceptedRestarts > 1) fail('m3-accepted-restart-count')
  if (row.outcome === 'restarted' && row.acceptedRestarts !== 1)
    fail('m3-accepted-restart-count')
  if (row.outcome === 'not-attempted' && row.acceptedRestarts !== 0)
    fail('m3-accepted-restart-count')
  if (row.outcome === 'joined' && row.joinedCallers < 1)
    fail('m3-joined-caller-count')
  if (row.releasePhaseTerminations > 1) fail('m3-release-termination-count')
  if (row.replacementLaunches > 1) fail('m3-replacement-launch-count')
  if (!row.eligibility.accepted && (requested !== 0 || terminal !== 0))
    fail('m3-pre-accept-event-emission')
  if (row.outcome === 'restarted' && (requested !== 1 || terminal !== 1))
    fail('m3-restarted-event-cardinality')
  if (row.terminateCallsByPhase.restartRelease > 1)
    fail('m3-release-termination-count')
}

function validateIsolationAndResidual(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  for (const settlement of row.staleSettlements) {
    if (settlement.appliedToSuccessor) fail('m4-stale-settlement-applied')
    if (!isExactZero(settlement.successorMutations))
      fail('m4-stale-settlement-mutation')
    if (!isExactZero(settlement.successorEvents))
      fail('m4-stale-settlement-event')
  }
  for (const [digests, code] of [
    [row.registrationDigests, 'm4-registration-digest-changed'],
    [row.peerDigests, 'm4-peer-digest-changed'],
    [row.controlDigests, 'm4-control-digest-changed'],
  ] as const) {
    if (digests === null) continue
    if (
      !OPAQUE_DIGEST.test(digests.before) ||
      !OPAQUE_DIGEST.test(digests.after)
    )
      fail('m4-digest-format')
    if (digests.before !== digests.after) fail(code)
  }
  for (const fixture of row.fixtureDigests) {
    if (
      !OPAQUE_DIGEST.test(fixture.before) ||
      !OPAQUE_DIGEST.test(fixture.after)
    )
      fail('m4-digest-format')
    if (fixture.before !== fixture.after) fail('m4-fixture-digest-changed')
  }
  if (row.inventory.length === 0) fail('m4-inventory-empty')
  const declaredClasses = new Set<string>()
  for (const item of row.inventory) {
    if (!inventoryClassSet.has(item.itemClass))
      fail('m4-inventory-class-unknown')
    else declaredClasses.add(item.itemClass)
    if (!inventoryOwnershipSet.has(item.ownership))
      fail('m4-inventory-ownership-unknown')
  }
  if (declaredClasses.size !== BL018_INVENTORY_CLASSES.length)
    fail('m4-inventory-class-coverage')
  if (row.connections !== null) {
    if (row.connections.priorGenerationUsable)
      fail('m4-connection-prior-generation-usable')
    if (row.connections.sessionContinuityClaimed)
      fail('m4-session-continuity-claimed')
  }
  if (!isExactZero(row.entryMutations)) fail('m4-entry-mutations')
  if (!elapsedClassSet.has(row.elapsedClass)) fail('m4-elapsed-class')
  if (row.withinDeclaredBound !== true) fail('m4-within-declared-bound')
  if (!row.attribution.ownedGroupSampled) fail('m4-attribution-not-sampled')
  if (!row.attribution.ceilingRecorded) fail('m4-attribution-ceiling-missing')
  if (row.attribution.claim !== BL018_ATTRIBUTION_CLAIM)
    fail('m4-attribution-claim')
  if (
    row.replacementAuditState === 'audited-absent' &&
    (row.replacementAuditTriple === null ||
      !row.replacementAuditTriple.complete ||
      !row.replacementAuditTriple.processAbsent ||
      !row.replacementAuditTriple.processGroupAbsent ||
      !row.replacementAuditTriple.listenerAbsent)
  ) {
    fail('m4-audited-absent-triple-incomplete')
  }

  const withheld = restartResidualClaimWithheld(row)
  const residual: unknown = row.residualCount
  if (residual !== null && !isExactZero(residual))
    fail('m4-residual-count-not-null-or-zero')
  else if (withheld && residual !== null)
    fail('m4-residual-claim-withheld-required')
  else if (!withheld && residual === null)
    fail('m4-residual-claim-zero-required')
  if (!isExactZero(row.teardownResidualCount)) {
    fail(
      withheld
        ? 'm4-teardown-residual-substitution'
        : 'm4-teardown-residual-count'
    )
  }
}

function validateDisclosureAndDeterminism(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  const serialized = JSON.stringify(row)
  if (protectedEvidence.test(serialized)) fail('m5-protected-value')
  if (containsWallClockNumber(row)) fail('m5-wall-clock-value')
  for (const [surface, id] of Object.entries(row.executionIds)) {
    if (id !== 'bl018-' + surface + '-' + row.scenario)
      fail('m5-execution-id-format')
  }
  for (const identity of [row.priorIdentity, row.replacementIdentity]) {
    if (identity !== null && !OPAQUE_IDENTITY.test(identity))
      fail('m5-raw-identity')
  }
  if (
    row.admission.admissionId !== null &&
    !OPAQUE_ADMISSION.test(row.admission.admissionId)
  ) {
    fail('m5-raw-identity')
  }
  for (const key of row.replacementAttempts.attemptAuditKeys) {
    if (!OPAQUE_ATTEMPT.test(key)) fail('m5-raw-identity')
  }
  if (duplicateValues(row.replacementAttempts.attemptAuditKeys))
    fail('m8-attempt-audit-key-cardinality')
  if (duplicateValues(row.events.map(({ id }) => id)))
    fail('m5-duplicate-event-id')
  const distinct =
    row.priorIdentity !== null &&
    row.replacementIdentity !== null &&
    row.priorIdentity !== row.replacementIdentity
  if (row.distinctIdentity !== distinct) fail('m5-identity-distinctness')
}

function validateDeadlineTruth(
  row: RuntimeRestartEvidenceRow,
  bounds: RuntimeRestartDeclaredBounds,
  fail: (code: string) => void
): void {
  const { releaseArm, overallArm, fired, abortReasonCategory } = row.deadlines
  for (const arm of [releaseArm, overallArm]) {
    if (arm.source !== BL018_DEADLINE_SOURCE) fail('m6-deadline-source')
    if (!Number.isSafeInteger(arm.declaredMs) || arm.declaredMs <= 0)
      fail('m6-declared-bound-mismatch')
  }
  if (!deadlineFiredSet.has(fired)) fail('m6-deadline-fired-outside-catalog')
  if (row.eligibility.accepted) {
    if (
      releaseArm.declaredMs !== bounds.releaseMs &&
      releaseArm.declaredMs !== bounds.restartReleaseMs
    ) {
      fail('m6-declared-bound-mismatch')
    }
    if (
      overallArm.declaredMs !== bounds.overallMs &&
      overallArm.declaredMs !== bounds.overallWithQuarantineMs
    ) {
      fail('m6-declared-bound-mismatch')
    }
    if (!releaseArm.cancelled || !overallArm.cancelled)
      fail('m6-deadline-uncancelled')
  }
  if (
    abortReasonCategory !== null &&
    !failureCategorySet.has(abortReasonCategory)
  ) {
    fail('m6-abort-reason-outside-catalog')
  }
  if (fired === 'overall') {
    if (abortReasonCategory === 'manager-shutdown')
      fail('m6-overall-abort-reason-manager-shutdown')
    if (!row.gate.gateConfirmed && row.replacementLaunches > 0)
      fail('m6-deadline-before-gate-launched')
    if (
      row.gate.gateConfirmed &&
      row.failureCategory === 'restart-release-unconfirmed'
    ) {
      fail('m6-deadline-after-gate-category')
    }
  }
  if (
    fired === 'release' &&
    row.failureCategory !== 'restart-release-unconfirmed'
  )
    fail('m6-release-deadline-category')
  if (
    row.replacementAuditState === 'unaudited-retained' &&
    row.residualCount !== null
  ) {
    fail('m6-unaudited-retained-residual-not-null')
  }
}

function validateAdmissionAndQuarantine(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  const { admission, quarantine } = row
  if (!priorResourceClassSet.has(row.priorResourceClass))
    fail('m7-prior-resource-class-unknown')
  if (!replacementAuditStateSet.has(row.replacementAuditState))
    fail('m7-replacement-audit-state-unknown')
  if (!admissionResolutionSet.has(admission.resolution))
    fail('m7-admission-resolution-unknown')
  if (!admissionResolverSet.has(admission.resolvedBy))
    fail('m7-admission-resolver-unknown')
  if (!admissionResolutionOrderSet.has(admission.resolutionOrder))
    fail('m7-admission-resolution-order-unknown')
  if (
    admission.phaseAtSettlement !== null &&
    !admissionPhaseSet.has(admission.phaseAtSettlement)
  ) {
    fail('m7-admission-phase-unknown')
  }
  for (const state of quarantine.auditStates) {
    if (!quarantineAuditStateSet.has(state))
      fail('m7-quarantine-audit-state-unknown')
  }
  if (admission.deletions > 1) fail('m7-admission-deletions-above-one')
  if (admission.admissionsCreated > 1) fail('m7-admissions-created-above-one')
  if (row.outcome === 'joined' && admission.admissionsCreated !== 0)
    fail('m7-joined-admissions-created')
  if (row.outcome === 'restarted' && admission.resolution === 'unresolved')
    fail('m7-restarted-admission-unresolved')
  if (
    row.replacementAuditState === 'admission-unresolved' &&
    row.residualCount !== null
  ) {
    fail('m7-admission-unresolved-residual-not-null')
  }
  if (admission.resolution === 'unresolved' && row.residualCount !== null)
    fail('m7-admission-resolution-unresolved-residual-not-null')
  if (
    row.priorResourceClass === 'no-record' &&
    admission.resolution === 'unresolved'
  ) {
    fail('m7-no-record-with-unresolved-admission')
  }
  // The gate may never pass over an unresolved *predecessor* admission. An
  // admission this restart created may still be unresolved after the gate,
  // which is the deadline-after-gate case the plan records explicitly.
  if (
    row.gate.passed &&
    admission.resolution === 'unresolved' &&
    row.priorResourceClass === 'pending-admission'
  ) {
    fail('m7-gate-passed-with-unresolved-admission')
  }
  // A predecessor admission must resolve before the gate. An admission this
  // restart created resolves with its own launch, which is after the gate.
  if (
    row.gate.passed &&
    admission.resolutionOrder === 'after-gate' &&
    row.priorResourceClass === 'pending-admission'
  ) {
    fail('m7-gate-passed-after-gate-resolution')
  }
  if (
    row.replacementAttempts.launchAttempts > 0 &&
    !admission.createdBeforeLaunch
  ) {
    fail('m7-launch-without-prior-admission')
  }
  for (const value of [
    row.lateCallbacks.ownershipMapMutations,
    row.lateCallbacks.entryMutations,
    row.lateCallbacks.currentCleanupMutations,
    row.lateCallbacks.eventsEmitted,
  ]) {
    if (!isExactZero(value)) fail('m7-late-callback-mutation')
  }
  const confirmedAbsent = quarantine.auditStates.filter(
    (state) => state === 'audited-absent'
  ).length
  if (quarantine.deletions > confirmedAbsent)
    fail('m7-quarantine-deletion-unconfirmed')
  if (!isExactZero(quarantine.concurrentAttempts))
    fail('m7-quarantine-concurrent-attempts')
  if (quarantine.reattempts > quarantine.reattemptClaims)
    fail('m7-quarantine-reattempt-claims')
  if (quarantine.recordCount !== quarantine.auditStates.length)
    fail('m7-quarantine-record-count')
  if (
    row.taskSets.abandonedLaunchInCompletionTasks ||
    row.taskSets.abandonedLaunchInBackgroundTasks ||
    row.taskSets.abandonedLaunchInRestartTasks
  ) {
    fail('m7-abandoned-launch-tracked')
  }
  if (row.taskSets.restartTasksAwaitedByShutdown !== true)
    fail('m7-restart-tasks-not-awaited')
  if (row.shutdown !== null) {
    if (
      row.shutdown.status === 'ok' &&
      row.shutdown.unresolvedAdmissionCount !== 0
    ) {
      fail('m7-shutdown-ok-with-unresolved-admission')
    }
    if (row.shutdown.awaitedAbandonedLaunch)
      fail('m7-shutdown-awaited-abandoned-launch')
    if (!elapsedClassSet.has(row.shutdown.elapsedClass))
      fail('m7-shutdown-elapsed-class')
  }
}

function validateCollisionCleanupIdentity(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  const attempts = row.replacementAttempts
  if (!settlementReasonSourceSet.has(attempts.settlementReasonSource))
    fail('m8-settlement-reason-source-unknown')
  if (
    attempts.launchRejectionCategory !== null &&
    !failureCategorySet.has(attempts.launchRejectionCategory)
  ) {
    fail('m8-launch-rejection-category-unknown')
  }
  if (
    attempts.confirmingCleanups + attempts.nonConfirmingCleanups !==
    attempts.cleanupAudits
  ) {
    fail('m8-cleanup-audit-composition')
  }
  if (attempts.attemptAuditKeys.length !== attempts.cleanupAudits)
    fail('m8-attempt-audit-key-cardinality')
  if (attempts.confirmingCleanups !== attempts.ownershipDeletions)
    fail('m8-confirming-cleanup-without-deletion')
  if (attempts.portsAcquired !== attempts.launchAttempts)
    fail('m8-ports-acquired-below-attempts')
  if (!isExactZero(attempts.portsAcquiredAfterAbort))
    fail('m8-ports-acquired-after-abort')
  if (!isExactZero(attempts.attemptAuditOverwrites))
    fail('m8-attempt-audit-overwrites')
  const executedCleanupPhases =
    row.cleanupRecordsByPhase.restartRelease +
    row.cleanupRecordsByPhase.restartReplacement +
    row.cleanupRecordsByPhase.shutdown
  for (const value of [
    row.cleanupRecordsByPhase.restartRelease,
    row.cleanupRecordsByPhase.restartReplacement,
    row.cleanupRecordsByPhase.shutdown,
  ]) {
    if (value > 1) fail('m8-project-keyed-cleanup-writes')
  }
  if (attempts.projectKeyedCleanupWrites !== executedCleanupPhases)
    fail('m8-project-keyed-cleanup-writes')
  if (attempts.nonConfirmingCleanups > 0) {
    if (quarantineRecordsFromCleanup(row) < attempts.nonConfirmingCleanups)
      fail('m8-non-confirming-cleanup-without-quarantine')
    if (!row.quarantine.auditStates.includes('audited-unconfirmed')) {
      fail('m8-non-confirming-audit-state')
    }
    if (attempts.settlementReasonSource !== 'phase-abort')
      fail('m8-non-confirming-cleanup-without-abort')
    if (attempts.launchRejectionCategory === null)
      fail('m8-non-confirming-launch-rejection-absent')
  }
  if (
    row.outcome === 'restarted' &&
    row.quarantine.auditStates.some((state) => state !== 'audited-absent')
  ) {
    fail('m8-restarted-with-non-absent-quarantine')
  }
  if (
    row.outcome === 'restarted' &&
    attempts.ownershipRecordsAfterSettlement !== 1
  )
    fail('m8-restarted-ownership-records')
  if (row.outcome !== 'restarted' && row.outcome !== 'joined') {
    const retains =
      row.replacementAuditState === 'unaudited-retained' ||
      row.replacementAuditState === 'admission-unresolved' ||
      row.replacementAuditState === 'quarantined-unconfirmed' ||
      row.releaseMode === 'unconfirmed'
    if (retains && attempts.ownershipRecordsAfterSettlement < 1)
      fail('m8-retained-ownership-records')
    if (!retains && attempts.ownershipRecordsAfterSettlement !== 0)
      fail('m8-settled-ownership-records')
  }
  if (row.replacementAuditState === 'quarantined-unconfirmed') {
    if (row.residualCount !== null)
      fail('m8-quarantined-unconfirmed-residual-not-null')
    if (row.outcome === 'restarted')
      fail('m8-quarantined-unconfirmed-outcome-restarted')
    if (
      row.failureCategory !== 'restart-replacement-unconfirmed' &&
      row.failureCategory !== 'restart-deadline-exceeded'
    ) {
      fail('m8-quarantined-unconfirmed-retained-category')
    }
  }
  if (
    row.quarantine.auditStates.some((state) => state !== 'audited-absent') &&
    row.residualCount !== null
  ) {
    fail('m8-quarantine-record-residual-not-null')
  }
  if (
    attempts.settlementReasonSource === 'launch-error' &&
    row.quarantine.createdByInstalledCleanup > 0
  ) {
    fail('m8-settlement-source-launch-error-with-quarantine')
  }
  if (attempts.settlementReasonSource === 'phase-abort') {
    if (row.failureCategory !== row.deadlines.abortReasonCategory)
      fail('m8-phase-abort-category-mismatch')
    if (
      attempts.launchRejectionCategory !== null &&
      row.failureCategory === attempts.launchRejectionCategory &&
      attempts.launchRejectionCategory !== row.deadlines.abortReasonCategory
    ) {
      fail('m8-launch-rejection-category-precedence')
    }
  }
  if (
    attempts.settlementReasonSource === 'launch-error' &&
    row.failureCategory !== attempts.launchRejectionCategory
  ) {
    fail('m8-launch-error-category-mismatch')
  }
  if (row.priorResourceClass === 'no-record' && row.quarantine.recordCount > 0)
    fail('m8-no-record-with-quarantine')
}

const quarantineRecordsFromCleanup = (row: RuntimeRestartEvidenceRow): number =>
  row.quarantine.createdByInstalledCleanup

function validateStructure(
  row: RuntimeRestartEvidenceRow,
  fail: (code: string) => void
): void {
  if (!outcomeSet.has(row.outcome)) fail('structure-outcome-unknown')
  if (
    row.rejectionCategory !== null &&
    !rejectionCategorySet.has(row.rejectionCategory)
  ) {
    fail('structure-rejection-category-unknown')
  }
  if ((row.outcome === 'rejected') !== (row.rejectionCategory !== null))
    fail('structure-rejection-category-agreement')
  if (row.releaseMode !== null && !releaseModeSet.has(row.releaseMode))
    fail('structure-release-mode-unknown')
  if (!signalDeliverySet.has(row.signalDelivery))
    fail('structure-signal-delivery-unknown')
  if (
    row.failureCategory !== null &&
    !failureCategorySet.has(row.failureCategory)
  ) {
    fail('structure-failure-category-unknown')
  }
  if (
    row.eligibility.entryState !== null &&
    !(RUNTIME_ENTRY_STATES as readonly string[]).includes(
      row.eligibility.entryState
    )
  ) {
    fail('structure-entry-state-unknown')
  }
  if (row.eligibility.accepted !== (row.acceptedRestarts === 1))
    fail('structure-eligibility-agreement')
  for (const value of [
    row.joinedCallers,
    row.acceptedRestarts,
    row.releasePhaseTerminations,
    row.replacementLaunches,
    row.identitiesCreated,
    row.identitiesTerminated,
    row.registrationRowCount,
    row.assertionCount,
    row.replacementAttempts.launchAttempts,
    row.replacementAttempts.cleanupAudits,
    row.quarantine.recordCount,
  ]) {
    if (!isCountedInteger(value)) fail('structure-count-not-integer')
  }
  if (row.assertionCount < 1) fail('structure-assertion-count')
}

export function validateRuntimeRestartMatrix(
  matrix: RuntimeRestartMatrix
): RuntimeRestartValidationReport {
  const collected = new Set<string>()
  const fail = (code: string): void => {
    collected.add(code)
  }
  if (matrix.schemaVersion !== 1) fail('schema-version')
  if (matrix.rows.length !== BL018_SCENARIOS.length) fail('scenario-count')
  const scenarios = matrix.rows.map(({ scenario }) => scenario)
  if (BL018_SCENARIOS.some((scenario, index) => scenarios[index] !== scenario))
    fail('m5-scenario-order')
  if (duplicateValues(scenarios)) fail('m5-duplicate-scenario')
  const executionIds = matrix.rows.flatMap((row) =>
    Object.values(row.executionIds)
  )
  if (duplicateValues(executionIds)) fail('m5-duplicate-execution-id')
  validateDeclaredBounds(matrix.declaredBounds, 'declared', fail)
  validateDeclaredBounds(matrix.productionDefaultBounds, 'production', fail)
  for (const [key, value] of Object.entries(BL018_PRODUCTION_DEFAULT_BOUNDS)) {
    if (
      matrix.productionDefaultBounds[
        key as keyof RuntimeRestartDeclaredBounds
      ] !== value
    ) {
      fail('production-bound-drift')
    }
  }
  for (const row of matrix.rows) {
    validateStructure(row, fail)
    validateOrdering(row, fail)
    validateStateTruth(row, fail)
    validateCardinality(row, fail)
    validateIsolationAndResidual(row, fail)
    validateDisclosureAndDeterminism(row, fail)
    validateDeadlineTruth(row, matrix.declaredBounds, fail)
    validateAdmissionAndQuarantine(row, fail)
    validateCollisionCleanupIdentity(row, fail)
  }
  return report([...collected].sort())
}

const orderedTriple = (triple: RuntimeRestartAuditTriple | null): unknown =>
  triple === null
    ? null
    : {
        complete: triple.complete,
        listenerAbsent: triple.listenerAbsent,
        processAbsent: triple.processAbsent,
        processGroupAbsent: triple.processGroupAbsent,
      }

const orderedDigests = (digests: RuntimeRestartDigestPair | null): unknown =>
  digests === null ? null : { after: digests.after, before: digests.before }

const orderedArm = (arm: RuntimeRestartDeadlineArm): unknown => ({
  cancelled: arm.cancelled,
  declaredMs: arm.declaredMs,
  source: arm.source,
})

const orderedBounds = (bounds: RuntimeRestartDeclaredBounds): unknown => ({
  overallMs: bounds.overallMs,
  overallWithQuarantineMs: bounds.overallWithQuarantineMs,
  quarantineReleaseMs: bounds.quarantineReleaseMs,
  releaseMs: bounds.releaseMs,
  replacementMs: bounds.replacementMs,
  restartReleaseMs: bounds.restartReleaseMs,
  settlementAllowanceMs: bounds.settlementAllowanceMs,
  transportMs: bounds.transportMs,
})

const orderedRow = (row: RuntimeRestartEvidenceRow): unknown => ({
  scenario: row.scenario,
  executionIds: {
    api: row.executionIds.api,
    home: row.executionIds.home,
    runtime: row.executionIds.runtime,
  },
  outcome: row.outcome,
  rejectionCategory: row.rejectionCategory,
  eligibility: {
    accepted: row.eligibility.accepted,
    entryState: row.eligibility.entryState,
  },
  priorResourceClass: row.priorResourceClass,
  releaseMode: row.releaseMode,
  signalDelivery: row.signalDelivery,
  releaseAuditTriple: orderedTriple(row.releaseAuditTriple),
  gate: {
    gateConfirmed: row.gate.gateConfirmed,
    launchAfterGate: row.gate.launchAfterGate,
    passed: row.gate.passed,
    spawnsBeforeGate: row.gate.spawnsBeforeGate,
  },
  deadlines: {
    abortReasonCategory: row.deadlines.abortReasonCategory,
    fired: row.deadlines.fired,
    overallArm: orderedArm(row.deadlines.overallArm),
    releaseArm: orderedArm(row.deadlines.releaseArm),
  },
  replacementAuditState: row.replacementAuditState,
  replacementAuditTriple: orderedTriple(row.replacementAuditTriple),
  priorIdentity: row.priorIdentity,
  replacementIdentity: row.replacementIdentity,
  distinctIdentity: row.distinctIdentity,
  attribution: {
    ceilingRecorded: row.attribution.ceilingRecorded,
    claim: row.attribution.claim,
    ownedGroupSampled: row.attribution.ownedGroupSampled,
  },
  stateSeries: row.stateSeries.map((observation) => ({
    api: observation.api,
    home: observation.home,
    phase: observation.phase,
    runtime: observation.runtime,
  })),
  elapsedClass: row.elapsedClass,
  withinDeclaredBound: row.withinDeclaredBound,
  runtimeState: row.runtimeState,
  apiState: row.apiState,
  homeState: row.homeState,
  failureCategory: row.failureCategory,
  events: row.events.map((event) => ({
    classification: event.classification,
    elapsedClass: event.elapsedClass,
    event: event.event,
    from: event.from,
    id: event.id,
    publicState: event.publicState,
    to: event.to,
  })),
  requestedEventCount: row.requestedEventCount,
  terminalEventCount: row.terminalEventCount,
  preAcceptEventCount: row.preAcceptEventCount,
  loserEventCount: row.loserEventCount,
  foreignEventCount: row.foreignEventCount,
  joinedCallers: row.joinedCallers,
  acceptedRestarts: row.acceptedRestarts,
  releasePhaseTerminations: row.releasePhaseTerminations,
  replacementLaunches: row.replacementLaunches,
  entryMutations: row.entryMutations,
  terminateCallsByPhase: {
    restartRelease: row.terminateCallsByPhase.restartRelease,
    restartReplacement: row.terminateCallsByPhase.restartReplacement,
    shutdown: row.terminateCallsByPhase.shutdown,
  },
  cleanupRecordsByPhase: {
    restartRelease: row.cleanupRecordsByPhase.restartRelease,
    restartReplacement: row.cleanupRecordsByPhase.restartReplacement,
    shutdown: row.cleanupRecordsByPhase.shutdown,
  },
  identitiesCreated: row.identitiesCreated,
  identitiesTerminated: row.identitiesTerminated,
  staleSettlements: row.staleSettlements.map((settlement) => ({
    appliedToSuccessor: settlement.appliedToSuccessor,
    settlementClass: settlement.settlementClass,
    successorEvents: settlement.successorEvents,
    successorMutations: settlement.successorMutations,
  })),
  connections:
    row.connections === null
      ? null
      : {
          freshNavigationReachedReplacement:
            row.connections.freshNavigationReachedReplacement,
          priorGenerationUsable: row.connections.priorGenerationUsable,
          sessionContinuityClaimed: row.connections.sessionContinuityClaimed,
        },
  registrationRowCount: row.registrationRowCount,
  registrationDigests: orderedDigests(row.registrationDigests),
  peerDigests: orderedDigests(row.peerDigests),
  controlDigests: orderedDigests(row.controlDigests),
  fixtureDigests: row.fixtureDigests.map((digest) => ({
    after: digest.after,
    before: digest.before,
    fixture: digest.fixture,
  })),
  inventory: row.inventory.map((item) => ({
    item: item.item,
    itemClass: item.itemClass,
    ownership: item.ownership,
  })),
  admission: {
    admissionId: row.admission.admissionId,
    admissionsCreated: row.admission.admissionsCreated,
    createdBeforeLaunch: row.admission.createdBeforeLaunch,
    createdProcessCount: row.admission.createdProcessCount,
    deletions: row.admission.deletions,
    phaseAtSettlement: row.admission.phaseAtSettlement,
    resolution: row.admission.resolution,
    resolutionOrder: row.admission.resolutionOrder,
    resolvedBy: row.admission.resolvedBy,
  },
  quarantine: {
    auditStates: [...row.quarantine.auditStates],
    concurrentAttempts: row.quarantine.concurrentAttempts,
    createdByInstalledCleanup: row.quarantine.createdByInstalledCleanup,
    deletions: row.quarantine.deletions,
    reattemptClaims: row.quarantine.reattemptClaims,
    reattempts: row.quarantine.reattempts,
    recordCount: row.quarantine.recordCount,
    terminationAttempts: row.quarantine.terminationAttempts,
  },
  replacementAttempts: {
    attemptAuditKeys: [...row.replacementAttempts.attemptAuditKeys],
    attemptAuditOverwrites: row.replacementAttempts.attemptAuditOverwrites,
    cleanupAudits: row.replacementAttempts.cleanupAudits,
    confirmingCleanups: row.replacementAttempts.confirmingCleanups,
    launchAttempts: row.replacementAttempts.launchAttempts,
    launchRejectionCategory: row.replacementAttempts.launchRejectionCategory,
    nonConfirmingCleanups: row.replacementAttempts.nonConfirmingCleanups,
    ownershipDeletions: row.replacementAttempts.ownershipDeletions,
    ownershipRecordsAfterSettlement:
      row.replacementAttempts.ownershipRecordsAfterSettlement,
    portsAcquired: row.replacementAttempts.portsAcquired,
    portsAcquiredAfterAbort: row.replacementAttempts.portsAcquiredAfterAbort,
    projectKeyedCleanupWrites:
      row.replacementAttempts.projectKeyedCleanupWrites,
    settlementReasonSource: row.replacementAttempts.settlementReasonSource,
  },
  lateCallbacks: {
    cleanupAfterSettlement: row.lateCallbacks.cleanupAfterSettlement,
    currentCleanupMutations: row.lateCallbacks.currentCleanupMutations,
    entryMutations: row.lateCallbacks.entryMutations,
    eventsEmitted: row.lateCallbacks.eventsEmitted,
    ownedAfterSettlement: row.lateCallbacks.ownedAfterSettlement,
    ownershipMapMutations: row.lateCallbacks.ownershipMapMutations,
    quarantineWrites: row.lateCallbacks.quarantineWrites,
  },
  taskSets: {
    abandonedLaunchInBackgroundTasks:
      row.taskSets.abandonedLaunchInBackgroundTasks,
    abandonedLaunchInCompletionTasks:
      row.taskSets.abandonedLaunchInCompletionTasks,
    abandonedLaunchInRestartTasks: row.taskSets.abandonedLaunchInRestartTasks,
    restartTasksAwaitedByShutdown: row.taskSets.restartTasksAwaitedByShutdown,
  },
  shutdown:
    row.shutdown === null
      ? null
      : {
          awaitedAbandonedLaunch: row.shutdown.awaitedAbandonedLaunch,
          elapsedClass: row.shutdown.elapsedClass,
          quarantineSwept: row.shutdown.quarantineSwept,
          status: row.shutdown.status,
          unresolvedAdmissionCount: row.shutdown.unresolvedAdmissionCount,
        },
  residualCount: row.residualCount,
  teardownResidualCount: row.teardownResidualCount,
  assertionCount: row.assertionCount,
})

export function serializeRuntimeRestartMatrix(
  matrix: RuntimeRestartMatrix
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: matrix.schemaVersion,
        declaredBounds: orderedBounds(matrix.declaredBounds),
        productionDefaultBounds: orderedBounds(matrix.productionDefaultBounds),
        rows: matrix.rows.map(orderedRow),
      },
      null,
      2
    ) + '\n'
  )
}
