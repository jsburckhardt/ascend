import { createHash } from 'node:crypto'
import os from 'node:os'
import type {
  RuntimeTerminationAudit,
  RuntimeTerminationOutcome,
} from './project-runtime-process.js'
import type { WorkbenchProxyAudit } from './workbench-proxy-contract.js'

export const RUNTIME_STATES = ['starting', 'running', 'failed'] as const
export type RuntimeState = (typeof RUNTIME_STATES)[number]

export const RUNTIME_ENTRY_STATES = [
  'registered',
  'starting',
  'running',
  'stopping',
  'restarting',
  'reconciling',
  'failed',
] as const
export type RuntimeEntryState = (typeof RUNTIME_ENTRY_STATES)[number]

export const RUNTIME_LIFECYCLE_TARGETS = [
  'starting',
  'running',
  'failed',
  'stopping',
  'stopped',
  'restarting',
  'reconciling',
] as const
export type RuntimeLifecycleTarget = (typeof RUNTIME_LIFECYCLE_TARGETS)[number]

export const PUBLIC_RUNTIME_STATES = Object.freeze([
  'Stopped',
  'Starting',
  'Running',
  'Failed',
] as const)
export type PublicRuntimeState = (typeof PUBLIC_RUNTIME_STATES)[number]

export interface RuntimeSnapshot {
  readonly projectId: string
  readonly state: RuntimeState
  readonly pid: number | null
  readonly processStartTime: string | null
  readonly internalUrl: string | null
  readonly port: number | null
  readonly canonicalPath: string
  readonly stableRoute: string
  readonly ownerToken: string
  readonly startedAt: number
  readonly elapsedMs: number
}

export const RUNTIME_RESTART_OUTCOMES = Object.freeze([
  'restarted',
  'rejected',
] as const)
export type RuntimeRestartOutcomeName =
  (typeof RUNTIME_RESTART_OUTCOMES)[number]

export const RUNTIME_RESTART_REJECTION_CATEGORIES = Object.freeze([
  'not-registered',
  'no-managed-runtime',
  'start-in-progress',
  'stop-in-progress',
  'release-unconfirmed',
  'replacement-failed',
  'manager-shutdown',
  'reconcile-in-progress',
  'reconcile-unresolved',
  'close-in-progress',
] as const)
export type RuntimeRestartRejectionCategory =
  (typeof RUNTIME_RESTART_REJECTION_CATEGORIES)[number]

export interface RuntimeRestartIdentity {
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
}

export type RuntimeRestartOutcome =
  | Readonly<{
      outcome: 'restarted'
      projectId: string
      priorIdentity?: RuntimeRestartIdentity
      replacementIdentity: RuntimeRestartIdentity
      release?: RuntimeTerminationOutcome
      audit?: RuntimeTerminationAudit
    }>
  | Readonly<{
      outcome: 'rejected'
      projectId: string
      category: RuntimeRestartRejectionCategory
      failureCategory?: RuntimeFailureCategory
      release?: RuntimeTerminationOutcome
      audit?: RuntimeTerminationAudit
      replacementAudit?: RuntimeTerminationAudit
    }>

export class RuntimeRestartInvariantError extends Error {
  constructor() {
    super('Runtime restart ownership invariant failed')
    this.name = 'RuntimeRestartInvariantError'
    delete this.stack
  }
}

export const RUNTIME_CLOSE_OUTCOMES = Object.freeze([
  'closed',
  'already-absent',
  'rejected',
] as const)
export type RuntimeCloseOutcomeName = (typeof RUNTIME_CLOSE_OUTCOMES)[number]

export const RUNTIME_CLOSE_REJECTION_CATEGORIES = Object.freeze([
  'start-in-progress',
  'stop-in-progress',
  'restart-in-progress',
  'reconcile-in-progress',
  'reconcile-unresolved',
  'release-unconfirmed',
  'ownership-cardinality-exceeded',
  'removal-failed',
  'manager-shutdown',
] as const)
export type RuntimeCloseRejectionCategory =
  (typeof RUNTIME_CLOSE_REJECTION_CATEGORIES)[number]

export type RuntimeCloseOutcome =
  | Readonly<{
      outcome: 'closed'
      projectId: string
      releasedGenerations: number
      audits?: readonly RuntimeTerminationAudit[]
    }>
  | Readonly<{
      outcome: 'already-absent'
      projectId: string
      released: boolean
    }>
  | Readonly<{
      outcome: 'rejected'
      projectId: string
      category: RuntimeCloseRejectionCategory
      failureCategory?: RuntimeFailureCategory
      audits?: readonly RuntimeTerminationAudit[]
    }>

export interface ProjectRuntimeCloseInput {
  readonly projectId: string
  readonly drainConnections: (
    signal: AbortSignal
  ) => Promise<WorkbenchProxyAudit>
  readonly auditConnections: () => WorkbenchProxyAudit
  readonly commitRemoval: () => Promise<
    Readonly<
      | { disposition: 'closed'; id: string }
      | { disposition: 'project_not_found' }
    >
  >
}

export class RuntimeCloseInvariantError extends Error {
  constructor() {
    super('Runtime close ownership invariant failed')
    this.name = 'RuntimeCloseInvariantError'
    delete this.stack
  }
}

export const RUNTIME_FAILURE_CATEGORIES = [
  'unknown-project',
  'canonical-path-invariant',
  'spawn-error',
  'executable-missing',
  'early-exit-code',
  'early-exit-signal',
  'address-in-use-exhausted',
  'readiness-timeout',
  'health-status-unexpected',
  'health-body-unexpected',
  'caller-cancelled',
  'manager-shutdown',
  'stop-unconfirmed',
  'runtime-stopping',
  'restart-release-unconfirmed',
  'restart-deadline-exceeded',
  'runtime-restarting',
  'restart-replacement-unconfirmed',
  'reconcile-unconfirmed',
  'runtime-closing',
  'close-release-unconfirmed',
] as const
export type RuntimeFailureCategory = (typeof RUNTIME_FAILURE_CATEGORIES)[number]

export interface PublicRuntimeReport {
  readonly projectId: string
  readonly state: PublicRuntimeState
  readonly failureCategory?: RuntimeFailureCategory
}

export function publicRuntimeState(
  state: RuntimeEntryState | undefined
): PublicRuntimeState {
  switch (state) {
    case undefined:
    case 'registered':
      return 'Stopped'
    case 'starting':
    case 'restarting':
    case 'reconciling':
      return 'Starting'
    case 'running':
    case 'stopping':
      return 'Running'
    case 'failed':
      return 'Failed'
  }
}

export const RUNTIME_FAILURE_MESSAGES: Readonly<
  Record<RuntimeFailureCategory, string>
> = Object.freeze({
  'unknown-project':
    'Project is not registered; refresh the project list and retry.',
  'canonical-path-invariant':
    'Project path no longer matches persisted metadata; register the project again.',
  'spawn-error':
    'Workbench could not start; retry after checking the host runtime.',
  'executable-missing':
    'Workbench executable is unavailable; install the configured code-server version.',
  'early-exit-code':
    'Workbench exited before readiness; correct its configuration and retry.',
  'early-exit-signal':
    'Workbench was signalled before readiness; check host capacity and retry.',
  'address-in-use-exhausted':
    'Loopback ports remained unavailable; release conflicting listeners and retry.',
  'readiness-timeout':
    'Workbench readiness timed out; check host capacity and retry.',
  'health-status-unexpected':
    'Workbench health returned an unexpected status; correct the installation and retry.',
  'health-body-unexpected':
    'Workbench health returned an unexpected body; correct the installation and retry.',
  'caller-cancelled': 'Workbench wait was cancelled; start again when ready.',
  'manager-shutdown':
    'Runtime manager is shutting down; restart Ascend before retrying.',
  'stop-unconfirmed':
    'Workbench release could not be confirmed; retry after the runtime manager reconciles it.',
  'runtime-stopping':
    'Workbench is stopping; wait for the current operation to settle before retrying.',
  'restart-release-unconfirmed':
    'Workbench restart could not release the previous session; retry after the runtime manager reconciles it.',
  'restart-deadline-exceeded':
    'Workbench restart did not finish in time; retry after the runtime manager reconciles it.',
  'runtime-restarting':
    'Workbench is restarting; wait for the current operation to settle before retrying.',
  'restart-replacement-unconfirmed':
    'Workbench restart could not confirm replacement cleanup; retry after the runtime manager reconciles it.',
  'reconcile-unconfirmed':
    'Workbench recovery could not confirm this runtime; restart Ascend after resolving the workbench.',
  'runtime-closing':
    'Workbench is being closed; wait for the close to settle before retrying.',
  'close-release-unconfirmed':
    'Workbench release could not be confirmed during close; retry after the runtime manager reconciles it.',
})

export interface RuntimeFailureDiagnostics {
  readonly attemptCount?: number
  readonly exitCode?: number
  readonly signal?: string
  readonly healthStatus?: number
  readonly timeoutMs?: number
  readonly port?: number
}

const DIAGNOSTIC_KEYS = new Set([
  'attemptCount',
  'exitCode',
  'signal',
  'healthStatus',
  'timeoutMs',
  'port',
])

export class RuntimeFailure extends Error {
  readonly category: RuntimeFailureCategory
  readonly diagnostics: Readonly<RuntimeFailureDiagnostics>

  constructor(
    category: RuntimeFailureCategory,
    diagnostics: RuntimeFailureDiagnostics = {}
  ) {
    super(RUNTIME_FAILURE_MESSAGES[category])
    this.name = 'RuntimeFailure'
    this.category = category
    const safeEntries = Object.entries(diagnostics).filter(
      ([key, value]) =>
        DIAGNOSTIC_KEYS.has(key) &&
        ((typeof value === 'number' && Number.isFinite(value)) ||
          (key === 'signal' &&
            typeof value === 'string' &&
            Object.hasOwn(os.constants.signals, value)))
    )
    delete this.stack
    this.diagnostics = Object.freeze(Object.fromEntries(safeEntries))
  }
}

export function stableProjectRoute(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/workbench/`
}

export function deriveProjectOwnerToken(projectId: string): string {
  return (
    'project-' +
    createHash('sha256').update(projectId).digest('hex').slice(0, 16)
  )
}

function checkedRuntimeBound(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Runtime bounds must be positive integers')
  }
  return value
}

export function runtimeReplacementBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    config.collisionAttempts *
      (config.readinessTimeoutMs + runtimeStopOverallBoundMs(config))
  )
}

export const RECONCILE_OUTCOMES = Object.freeze([
  'adopted',
  'absent',
  'unresolved',
] as const)
export type ReconcileOutcome = (typeof RECONCILE_OUTCOMES)[number]

export const RECONCILE_REFUSAL_REASONS = Object.freeze([
  'ambiguous-candidates',
  'launcher-unresolved',
  'launcher-prefix-mismatch',
  'argv-mismatch',
  'canonical-path-mismatch',
  'owner-token-mismatch',
  'port-mismatch',
  'uid-mismatch',
  'not-group-leader',
  'group-scan-incomplete',
  'listener-absent',
  'listener-not-owned',
  'readiness-unconfirmed',
  'identity-unstable',
  'absence-unconfirmed',
  'scan-incomplete',
  'deadline-exceeded',
  'manager-shutdown',
] as const)
export type ReconcileRefusalReason = (typeof RECONCILE_REFUSAL_REASONS)[number]

export const RECONCILE_ABSENCE_PROOFS = Object.freeze([
  'no-candidate-complete-scan',
  'candidate-audit-triple-absent',
] as const)
export type ReconcileAbsenceProof = (typeof RECONCILE_ABSENCE_PROOFS)[number]

export interface ReconciliationProjectInspection {
  readonly projectToken: string
  readonly outcome: ReconcileOutcome | null
  readonly refusalReason: ReconcileRefusalReason | null
  readonly absenceProof: ReconcileAbsenceProof | null
  readonly settledElapsedMs: number | null
}

export interface ReconciliationInspection {
  readonly phase:
    'not-started' | 'installing' | 'observing' | 'settled' | 'aborted'
  readonly startedAt: number | null
  readonly settledElapsedMs: number | null
  readonly boundMs: number
  readonly scanCompleted: boolean | null
  readonly candidateCount: number | null
  readonly projects: readonly ReconciliationProjectInspection[]
}

export function restartQuarantineReleaseBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    config.collisionAttempts * runtimeStopOverallBoundMs(config)
  )
}

export function runtimeRestartReleaseBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    runtimeStopOverallBoundMs(config) + restartQuarantineReleaseBoundMs(config)
  )
}

export function runtimeRestartOverallBoundMs(
  config: ProjectRuntimeConfig,
  requiresQuarantineResolution: boolean
): number {
  return checkedRuntimeBound(
    (requiresQuarantineResolution
      ? runtimeRestartReleaseBoundMs(config)
      : runtimeStopOverallBoundMs(config)) +
      runtimeReplacementBoundMs(config) +
      config.restartSettlementAllowanceMs
  )
}

function checkedCloseSweepUnits(
  config: ProjectRuntimeConfig,
  sweepUnits: number
): number {
  if (
    !Number.isSafeInteger(sweepUnits) ||
    sweepUnits < 1 ||
    sweepUnits > config.closeOwnershipSweepCap
  ) {
    throw new Error('Runtime close sweep units are outside the configured cap')
  }
  return sweepUnits
}

export function runtimeCloseReleaseBoundMs(
  config: ProjectRuntimeConfig,
  requiresQuarantineResolution: boolean,
  sweepUnits: number
): number {
  const units = checkedCloseSweepUnits(config, sweepUnits)
  return checkedRuntimeBound(
    units * runtimeStopOverallBoundMs(config) +
      (requiresQuarantineResolution
        ? restartQuarantineReleaseBoundMs(config)
        : 0)
  )
}

export function runtimeCloseOverallBoundMs(
  config: ProjectRuntimeConfig,
  requiresQuarantineResolution: boolean,
  sweepUnits: number
): number {
  return checkedRuntimeBound(
    runtimeCloseReleaseBoundMs(
      config,
      requiresQuarantineResolution,
      sweepUnits
    ) +
      config.closeDrainAllowanceMs +
      config.closeSettlementAllowanceMs
  )
}

export const RESTART_ADMISSION_PHASES = Object.freeze([
  'launch-pending',
  'materialized-quarantined',
  'absent-confirmed',
  'audited-absent',
] as const)
export type RestartAdmissionPhase = (typeof RESTART_ADMISSION_PHASES)[number]

export const RESTART_QUARANTINE_AUDIT_STATES = Object.freeze([
  'unaudited',
  'reclaiming',
  'audited-absent',
  'audited-unconfirmed',
] as const)
export type RestartQuarantineAuditState =
  (typeof RESTART_QUARANTINE_AUDIT_STATES)[number]

export interface RuntimeUnresolvedAdmission {
  readonly projectToken: string
  readonly admissionId: string
  readonly phase: RestartAdmissionPhase
}

export const RUNTIME_LIFECYCLE_EVENTS = Object.freeze([
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
] as const)
export type RuntimeLifecycleEventName =
  (typeof RUNTIME_LIFECYCLE_EVENTS)[number]

export interface RuntimeLifecycleEvent {
  readonly event: RuntimeLifecycleEventName
  readonly projectId: string
  readonly from: RuntimeLifecycleTarget
  readonly to: RuntimeLifecycleTarget
  readonly elapsedMs: number
  readonly classification?: RuntimeFailureCategory
}

const PUBLIC_STATE_BY_LIFECYCLE_EVENT: Readonly<
  Record<RuntimeLifecycleEvent['event'], PublicRuntimeState>
> = Object.freeze({
  'runtime.start.requested': 'Starting',
  'runtime.start.succeeded': 'Running',
  'runtime.start.failed': 'Failed',
  'runtime.health.changed': 'Failed',
  'runtime.stop.requested': 'Running',
  'runtime.stop.succeeded': 'Stopped',
  'runtime.restart.requested': 'Starting',
  'runtime.restart.succeeded': 'Running',
  'runtime.restart.failed': 'Failed',
  'runtime.reconcile.requested': 'Starting',
  'runtime.reconcile.succeeded': 'Running',
  'runtime.reconcile.absent': 'Stopped',
  'runtime.reconcile.failed': 'Failed',
})

export function publicRuntimeStateForLifecycleTarget(
  target: RuntimeLifecycleTarget
): PublicRuntimeState {
  switch (target) {
    case 'stopped':
      return 'Stopped'
    case 'stopping':
      return 'Running'
    case 'starting':
    case 'restarting':
    case 'reconciling':
    case 'running':
    case 'failed':
      return publicRuntimeState(target)
  }
}

export function publicRuntimeStateForLifecycleEvent(
  event: RuntimeLifecycleEvent['event'],
  to: RuntimeLifecycleEvent['to']
): PublicRuntimeState {
  const state = publicRuntimeStateForLifecycleTarget(to)
  if (PUBLIC_STATE_BY_LIFECYCLE_EVENT[event] !== state) {
    throw new Error('Runtime lifecycle event does not match its target state')
  }
  return state
}

export const PROJECT_RUNTIME_DEFAULTS = Object.freeze({
  executablePath: '/home/vscode/.local/bin/code-server',
  expectedUser: 'vscode',
  collisionAttempts: 3,
  healthPath: '/healthz/',
  healthStatus: 200,
  healthBodyStatuses: ['alive', 'expired'] as const,
  healthAttemptTimeoutMs: 1_000,
  readinessTimeoutMs: 15_000,
  pollIntervalMs: 50,
  gracefulShutdownMs: 2_000,
  forceShutdownMs: 2_000,
  stopAuditAllowanceMs: 1_000,
  restartSettlementAllowanceMs: 1_000,
  reconcileScanAllowanceMs: 2_000,
  reconcileAttributionAllowanceMs: 1_000,
  reconcileReadinessBoundMs: 7_000,
  reconcileSettlementAllowanceMs: 1_000,
  reconcileStartupHeadroomMs: 3_000,
  reconcileResponseAllowanceMs: 1_000,
  closeDrainAllowanceMs: 5_000,
  closeSettlementAllowanceMs: 1_000,
  closeOwnershipSweepCap: 4,
})

export interface ProjectRuntimeConfig {
  readonly executablePath: string
  readonly expectedUser: string
  readonly environment: Readonly<NodeJS.ProcessEnv>
  readonly collisionAttempts: number
  readonly healthAttemptTimeoutMs: number
  readonly readinessTimeoutMs: number
  readonly pollIntervalMs: number
  readonly gracefulShutdownMs: number
  readonly forceShutdownMs: number
  readonly stopAuditAllowanceMs: number
  readonly restartSettlementAllowanceMs: number
  readonly reconcileScanAllowanceMs: number
  readonly reconcileAttributionAllowanceMs: number
  readonly reconcileReadinessBoundMs: number
  readonly reconcileSettlementAllowanceMs: number
  readonly reconcileStartupHeadroomMs: number
  readonly reconcileResponseAllowanceMs: number
  readonly closeDrainAllowanceMs: number
  readonly closeSettlementAllowanceMs: number
  readonly closeOwnershipSweepCap: number
}

export function createProjectRuntimeConfig(
  overrides: Partial<ProjectRuntimeConfig> = {}
): ProjectRuntimeConfig {
  const user = os.userInfo()
  const executablePath =
    overrides.executablePath ?? PROJECT_RUNTIME_DEFAULTS.executablePath
  const environment = Object.freeze(
    overrides.environment ?? {
      HOME: user.homedir,
      USER: user.username,
      LOGNAME: user.username,
      SHELL: user.shell || '/bin/bash',
      LANG: process.env.LANG ?? 'C.UTF-8',
      PATH:
        executablePath.slice(0, Math.max(0, executablePath.lastIndexOf('/'))) +
        ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      ...(process.env.XDG_RUNTIME_DIR === undefined
        ? {}
        : { XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR }),
    }
  )
  const config = {
    executablePath,
    expectedUser:
      overrides.expectedUser ?? PROJECT_RUNTIME_DEFAULTS.expectedUser,
    environment,
    collisionAttempts:
      overrides.collisionAttempts ?? PROJECT_RUNTIME_DEFAULTS.collisionAttempts,
    healthAttemptTimeoutMs:
      overrides.healthAttemptTimeoutMs ??
      PROJECT_RUNTIME_DEFAULTS.healthAttemptTimeoutMs,
    readinessTimeoutMs:
      overrides.readinessTimeoutMs ??
      PROJECT_RUNTIME_DEFAULTS.readinessTimeoutMs,
    pollIntervalMs:
      overrides.pollIntervalMs ?? PROJECT_RUNTIME_DEFAULTS.pollIntervalMs,
    gracefulShutdownMs:
      overrides.gracefulShutdownMs ??
      PROJECT_RUNTIME_DEFAULTS.gracefulShutdownMs,
    forceShutdownMs:
      overrides.forceShutdownMs ?? PROJECT_RUNTIME_DEFAULTS.forceShutdownMs,
    stopAuditAllowanceMs:
      overrides.stopAuditAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.stopAuditAllowanceMs,
    restartSettlementAllowanceMs:
      overrides.restartSettlementAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.restartSettlementAllowanceMs,
    reconcileScanAllowanceMs:
      overrides.reconcileScanAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileScanAllowanceMs,
    reconcileAttributionAllowanceMs:
      overrides.reconcileAttributionAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileAttributionAllowanceMs,
    reconcileReadinessBoundMs:
      overrides.reconcileReadinessBoundMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileReadinessBoundMs,
    reconcileSettlementAllowanceMs:
      overrides.reconcileSettlementAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileSettlementAllowanceMs,
    reconcileStartupHeadroomMs:
      overrides.reconcileStartupHeadroomMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileStartupHeadroomMs,
    reconcileResponseAllowanceMs:
      overrides.reconcileResponseAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.reconcileResponseAllowanceMs,
    closeDrainAllowanceMs:
      overrides.closeDrainAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.closeDrainAllowanceMs,
    closeSettlementAllowanceMs:
      overrides.closeSettlementAllowanceMs ??
      PROJECT_RUNTIME_DEFAULTS.closeSettlementAllowanceMs,
    closeOwnershipSweepCap:
      overrides.closeOwnershipSweepCap ??
      PROJECT_RUNTIME_DEFAULTS.closeOwnershipSweepCap,
  }
  for (const value of [
    config.collisionAttempts,
    config.healthAttemptTimeoutMs,
    config.readinessTimeoutMs,
    config.pollIntervalMs,
    config.gracefulShutdownMs,
    config.forceShutdownMs,
    config.stopAuditAllowanceMs,
    config.restartSettlementAllowanceMs,
    config.reconcileScanAllowanceMs,
    config.reconcileAttributionAllowanceMs,
    config.reconcileReadinessBoundMs,
    config.reconcileSettlementAllowanceMs,
    config.reconcileStartupHeadroomMs,
    config.reconcileResponseAllowanceMs,
    config.closeDrainAllowanceMs,
    config.closeSettlementAllowanceMs,
    config.closeOwnershipSweepCap,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error('Runtime bounds must be positive integers')
    }
  }
  return Object.freeze(config)
}

export function runtimeStopOverallBoundMs(
  config: ProjectRuntimeConfig
): number {
  return (
    config.gracefulShutdownMs +
    config.forceShutdownMs +
    config.stopAuditAllowanceMs
  )
}

export function reconciliationOverallBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    config.reconcileScanAllowanceMs +
      config.reconcileAttributionAllowanceMs +
      config.reconcileReadinessBoundMs +
      config.reconcileSettlementAllowanceMs
  )
}

export function reconciliationEndToEndBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    config.reconcileStartupHeadroomMs +
      reconciliationOverallBoundMs(config) +
      config.reconcileResponseAllowanceMs
  )
}

export function reconciliationStartupControlBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    config.reconcileStartupHeadroomMs + config.reconcileResponseAllowanceMs
  )
}

export function workbenchAcquisitionBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(runtimeReplacementBoundMs(config))
}

export function acquisitionAcrossReconciliationBoundMs(
  config: ProjectRuntimeConfig
): number {
  return checkedRuntimeBound(
    reconciliationOverallBoundMs(config) + workbenchAcquisitionBoundMs(config)
  )
}

export const RUNTIME_STOP_OUTCOMES = Object.freeze([
  'stopped',
  'already-stopped',
  'rejected',
] as const)
export type RuntimeStopOutcomeName = (typeof RUNTIME_STOP_OUTCOMES)[number]

export const RUNTIME_STOP_REJECTION_CATEGORIES = Object.freeze([
  'not-registered',
  'no-managed-runtime',
  'start-in-progress',
  'restart-in-progress',
  'failure-retained',
  'stop-unconfirmed',
  'manager-shutdown',
  'reconcile-in-progress',
  'reconcile-unresolved',
  'close-in-progress',
] as const)
export type RuntimeStopRejectionCategory =
  (typeof RUNTIME_STOP_REJECTION_CATEGORIES)[number]

export type RuntimeStopOutcome =
  | Readonly<{
      outcome: 'stopped'
      projectId: string
      release: RuntimeTerminationOutcome
      audit: RuntimeTerminationAudit
    }>
  | Readonly<{
      outcome: 'already-stopped'
      projectId: string
    }>
  | Readonly<{
      outcome: 'rejected'
      projectId: string
      category: RuntimeStopRejectionCategory
      release?: RuntimeTerminationOutcome
      audit?: RuntimeTerminationAudit
    }>

export class RuntimeStopInvariantError extends Error {
  constructor() {
    super('Runtime stop ownership invariant failed')
    this.name = 'RuntimeStopInvariantError'
    delete this.stack
  }
}

export interface RuntimeSafeLifecycleEvent {
  readonly event: RuntimeLifecycleEvent['event']
  readonly projectToken: string
  readonly from: RuntimeLifecycleEvent['from']
  readonly to: RuntimeLifecycleEvent['to']
  readonly elapsedMs: number
  readonly classification?: RuntimeFailureCategory
}

export function serializeRuntimeEvent(
  event: RuntimeLifecycleEvent
): RuntimeSafeLifecycleEvent {
  return Object.freeze({
    event: event.event,
    projectToken: deriveProjectOwnerToken(event.projectId),
    from: event.from,
    to: event.to,
    elapsedMs: Math.max(0, Math.floor(event.elapsedMs)),
    ...(event.classification === undefined
      ? {}
      : { classification: event.classification }),
  })
}
