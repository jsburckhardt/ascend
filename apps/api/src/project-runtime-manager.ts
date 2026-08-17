import type { Project } from './project-persistence.js'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RuntimeCloseInvariantError,
  RuntimeFailure,
  RuntimeRestartInvariantError,
  RuntimeStopInvariantError,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  publicRuntimeState,
  reconciliationOverallBoundMs,
  runtimeCloseOverallBoundMs,
  runtimeCloseReleaseBoundMs,
  runtimeRestartOverallBoundMs,
  runtimeRestartReleaseBoundMs,
  runtimeStopOverallBoundMs,
  serializeRuntimeEvent,
  stableProjectRoute,
  type PublicRuntimeReport,
  type ProjectRuntimeCloseInput,
  type ProjectRuntimeConfig,
  type ReconcileAbsenceProof,
  type ReconcileRefusalReason,
  type ReconciliationInspection,
  type ReconciliationProjectInspection,
  type RestartAdmissionPhase,
  type RestartQuarantineAuditState,
  type RuntimeCloseOutcome,
  type RuntimeCloseRejectionCategory,
  type RuntimeEntryState,
  type RuntimeLifecycleEvent,
  type RuntimeRestartIdentity,
  type RuntimeRestartOutcome,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
  type RuntimeStopOutcome,
  type RuntimeUnresolvedAdmission,
} from './project-runtime-contract.js'
import {
  adoptOwnedRuntimeProcess,
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  defaultRuntimeDeadlineScheduler,
  defaultRuntimeProcessDependencies,
  launchReadyRuntime,
  resolveGroupListenerOwner,
  type InstalledRuntimeIdentity,
  type RuntimeAttributionPrimitives,
  type RuntimeDeadlineScheduler,
  type ReadyRuntime,
  type RuntimeOwnershipRecord,
  type RuntimeProcessDependencies,
  type RuntimeResourceAudit,
  type RuntimeTerminationAudit,
} from './project-runtime-process.js'
import type { WorkbenchProxyAudit } from './workbench-proxy-manager.js'

export interface ProjectRuntimeStartInput {
  readonly projectId: string
  readonly canonicalPath: string
  readonly signal?: AbortSignal
}

interface ReconcilingEntry {
  readonly state: 'reconciling'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly snapshot: RuntimeSnapshot
  readonly controller: AbortController
  readonly settlement: Promise<void>
  readonly settle: () => void
}

interface RestartingEntry {
  readonly state: 'restarting'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeRestartOutcome>
  readonly controller: AbortController
}

export interface ProjectRuntimeTerminationAudit extends RuntimeTerminationAudit {
  readonly projectToken: string
}

interface PendingReplacementAdmission {
  readonly projectId: string
  readonly restartGeneration: symbol
  readonly admissionId: string
  readonly canonicalPath: string
  readonly ownerToken: string
  readonly admittedAt: number
  phase: RestartAdmissionPhase
  ownedReported: boolean
  readonly resolution: Promise<void>
  resolvedPhase: RestartAdmissionPhase | undefined
}

interface QuarantinedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly restartGeneration: symbol
  readonly admissionId: string
  auditState: RestartQuarantineAuditState
}

export interface RuntimeShutdownResult {
  readonly status: 'ok' | 'failed'
  readonly audits: readonly ProjectRuntimeTerminationAudit[]
  readonly unresolvedAdmissions: readonly RuntimeUnresolvedAdmission[]
}

export type ProjectRuntimeEntryState = RuntimeEntryState

export interface ProjectRuntimeEntryInspection {
  readonly projectId: string
  readonly projectToken: string
  readonly canonicalPath: string
  readonly state: ProjectRuntimeEntryState
  readonly snapshot?: RuntimeSnapshot
  readonly pendingAdmissionId?: string
  readonly pendingAdmissionPhase?: RestartAdmissionPhase
  readonly waiterCount: number
}

export interface ProjectRuntimeCloseClaimInspection {
  readonly projectId: string
  readonly projectToken: string
  readonly frozenOwnershipCardinality: number
  readonly sweepUnits: number
  readonly lateWork: number
  readonly sealed: boolean
}

export interface ProjectRuntimeManagerAudit {
  readonly shuttingDown: boolean
  readonly entryCount: number
  readonly startingEntries: number
  readonly ownershipRecords: number
  readonly completionTasks: number
  readonly backgroundTasks: number
  readonly stopTasks: number
  readonly completionTaskSettlements: number
  readonly backgroundTaskSettlements: number
  readonly lateTerminationSettlements: number
  readonly lateReplacementSettlements?: number
  readonly restartTasks?: number
  readonly pendingAdmissions?: number
  readonly quarantinedOwnershipRecords?: number
  readonly quarantineCleanupRecords?: number
  readonly admissionResolutions?: number
  readonly closeTasks?: number
  readonly closeClaims?: readonly ProjectRuntimeCloseClaimInspection[]
  readonly retiredProjects?: number
  readonly lateCloseSettlements?: number
  readonly refusedLateAcquisitions?: number
}

export interface ProjectRuntimeManager {
  beginReconciliation(): Promise<void>
  inspectReconciliation?(): ReconciliationInspection
  register(projectId: string, canonicalPath: string): void
  start(input: ProjectRuntimeStartInput): Promise<RuntimeSnapshot>
  stop(input: { readonly projectId: string }): Promise<RuntimeStopOutcome>
  restart(input: { readonly projectId: string }): Promise<RuntimeRestartOutcome>
  close(input: ProjectRuntimeCloseInput): Promise<RuntimeCloseOutcome>
  reportPublicStates(
    projectIds: readonly string[]
  ): readonly PublicRuntimeReport[]
  inspect(projectId: string): RuntimeSnapshot | undefined
  ownsSnapshot(snapshot: RuntimeSnapshot): boolean
  inspectEntries(): readonly ProjectRuntimeEntryInspection[]
  audit?(): ProjectRuntimeManagerAudit
  lastFailure(projectId: string): RuntimeFailure | undefined
  lastCleanup(projectId: string): RuntimeTerminationAudit | undefined
  lastShutdown(): RuntimeShutdownResult | undefined
  shutdown(): Promise<RuntimeShutdownResult>
}

export interface ProjectRuntimeManagerDependencies {
  readonly findProjectById: (id: string) => Promise<Project | undefined>
  readonly listProjects?: () => Promise<readonly Project[]>
  readonly config?: ProjectRuntimeConfig
  readonly processDependencies?: RuntimeProcessDependencies
  readonly launch?: (input: {
    readonly config: ProjectRuntimeConfig
    readonly canonicalPath: string
    readonly ownerToken: string
    readonly signal: AbortSignal
    readonly dependencies: RuntimeProcessDependencies
    readonly onOwned?: (record: RuntimeOwnershipRecord) => void
    readonly onCleanup?: (audit: RuntimeTerminationAudit) => void
  }) => Promise<ReadyRuntime>
  readonly now?: () => number
  readonly recordEvent?: (event: RuntimeSafeLifecycleEvent) => void
  readonly deadlineScheduler?: RuntimeDeadlineScheduler
}

interface RegisteredEntry {
  readonly state: 'registered'
  readonly projectId: string
  readonly canonicalPath: string
  readonly released: boolean
}

interface StartingEntry {
  readonly state: 'starting'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly controller: AbortController
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeSnapshot>
  readonly waiters: Set<symbol>
}

interface RunningEntry {
  readonly state: 'running'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly ready: ReadyRuntime
  readonly snapshot: RuntimeSnapshot
  readonly adopted?: true
}

interface StoppingEntry {
  readonly state: 'stopping'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly ready: ReadyRuntime
  readonly snapshot: RuntimeSnapshot
  readonly operation: Promise<RuntimeStopOutcome>
}

interface FailedEntry {
  readonly state: 'failed'
  readonly projectId: string
  readonly canonicalPath: string
  readonly generation: symbol
  readonly snapshot: RuntimeSnapshot
  readonly failure: RuntimeFailure
  readonly pendingAdmissionId?: string
}

type ProjectRuntimeEntry =
  | RegisteredEntry
  | ReconcilingEntry
  | StartingEntry
  | RunningEntry
  | StoppingEntry
  | RestartingEntry
  | FailedEntry

/** Exclusive per-project close claim. It is orthogonal to the entry it claims:
 * the entry keeps its own state and keeps projecting truthfully while the claim
 * is installed. `claimedEntry` is captured by reference — `undefined` included —
 * inside the same synchronous section that installs the claim, so confirmation
 * can compare generation identity rather than a state label. `sealed` closes the
 * confirmation-to-removal window structurally: it is set by the last statement
 * of the confirmation region and refuses every entry install for the subject,
 * the owning close included, while durable removal is in flight. */
interface CloseClaim {
  readonly projectId: string
  readonly controller: AbortController
  readonly settlement: Promise<RuntimeCloseOutcome>
  readonly claimedEntry: ProjectRuntimeEntry | undefined
  installedRegisteredEntry: RegisteredEntry | undefined
  frozenOwnershipCardinality: number
  sweepUnits: number
  lateWork: number
  sealed: boolean
}

interface ReconcileCandidate {
  readonly pid: number
  readonly argv: readonly string[]
  readonly port: number
}

type CandidateAttribution =
  | Readonly<{
      ok: true
      candidateIdentity: Readonly<{
        pid: number
        processGroupId: number
        uid: number
        startTime: string
      }>
      candidateArgv: readonly string[]
      ownerIdentity: Readonly<{
        pid: number
        processGroupId: number
        uid: number
        startTime: string
      }>
    }>
  | Readonly<{ ok: false; reason: ReconcileRefusalReason }>

interface MutableReconciliationProjectInspection {
  readonly projectToken: string
  outcome: 'adopted' | 'absent' | 'unresolved' | null
  refusalReason: ReconcileRefusalReason | null
  absenceProof: ReconcileAbsenceProof | null
  settledElapsedMs: number | null
}

type BoundedReconciliationResult<T> =
  Readonly<{ completed: true; value: T }> | Readonly<{ completed: false }>

interface ManagedOwnership extends RuntimeOwnershipRecord {
  readonly projectId: string
  readonly generation: symbol
}

const freezeSnapshot = (snapshot: RuntimeSnapshot): RuntimeSnapshot =>
  Object.freeze(snapshot)

function abortedPromise(signal: AbortSignal): {
  readonly promise: Promise<
    Readonly<{ kind: 'phase-aborted'; reason: unknown }>
  >
  cancel(): void
} {
  let cancel = (): void => undefined
  const promise = new Promise<
    Readonly<{ kind: 'phase-aborted'; reason: unknown }>
  >((resolve) => {
    const settle = (): void =>
      resolve(Object.freeze({ kind: 'phase-aborted', reason: signal.reason }))
    if (signal.aborted) {
      settle()
      return
    }
    signal.addEventListener('abort', settle, { once: true })
    cancel = () => signal.removeEventListener('abort', settle)
  })
  return { promise, cancel }
}

export function createProjectRuntimeManager(
  dependencies: ProjectRuntimeManagerDependencies
): ProjectRuntimeManager {
  const config = dependencies.config ?? createProjectRuntimeConfig()
  const processDependencies =
    dependencies.processDependencies ?? defaultRuntimeProcessDependencies
  const launch = dependencies.launch ?? launchReadyRuntime
  const now = dependencies.now ?? Date.now
  const recordEvent = dependencies.recordEvent ?? (() => undefined)
  const listProjects = dependencies.listProjects ?? (async () => [])
  const deadlineScheduler =
    dependencies.deadlineScheduler ?? defaultRuntimeDeadlineScheduler
  const entries = new Map<string, ProjectRuntimeEntry>()
  const cleanupOutcomes = new Map<string, RuntimeTerminationAudit>()
  const ownership = new Map<string, ManagedOwnership>()
  const completionTasks = new Set<Promise<RuntimeSnapshot>>()
  const backgroundTasks = new Set<Promise<void>>()
  const stopTasks = new Set<Promise<RuntimeStopOutcome>>()
  const restartTasks = new Set<Promise<RuntimeRestartOutcome>>()
  const pendingAdmissions = new Map<string, PendingReplacementAdmission>()
  const pendingAdmissionResolvers = new Map<string, () => void>()
  const pendingAdmissionOwnedKeys = new Map<string, Set<string>>()
  const detachedAdmissionIds = new Set<string>()
  const quarantinedOwnership = new Map<string, QuarantinedOwnership>()
  const quarantineCleanups = new Map<string, RuntimeTerminationAudit>()
  const quarantineTerminationAttempts = new Map<string, number>()
  const quarantineReclamations = new Map<string, Promise<void>>()
  const closeClaims = new Map<string, CloseClaim>()
  const closeTasks = new Set<Promise<RuntimeCloseOutcome>>()
  const retiredProjects = new Set<string>()
  let admissionSequence = 0
  let admissionResolutions = 0
  let completionTaskSettlements = 0
  let backgroundTaskSettlements = 0
  let lateTerminationSettlements = 0
  let lateReplacementSettlements = 0
  let lateCloseSettlements = 0
  let refusedLateAcquisitions = 0
  let shutdownPromise: Promise<RuntimeShutdownResult> | undefined
  let shutdownResult: RuntimeShutdownResult | undefined
  let shuttingDown = false
  let reconciliationInstallation: Promise<void> | undefined
  let reconciliationController: AbortController | undefined
  let reconciliationCancelDeadline: (() => void) | undefined
  let reconciliationPhase: ReconciliationInspection['phase'] = 'not-started'
  let reconciliationStartedAt: number | null = null
  let reconciliationSettledElapsedMs: number | null = null
  let reconciliationScanCompleted: boolean | null = null
  let reconciliationCandidateCount: number | null = null
  let reconciliationProjectOrder: readonly string[] = Object.freeze([])
  const reconciliationProjects = new Map<
    string,
    MutableReconciliationProjectInspection
  >()

  const ownershipKey = (record: RuntimeOwnershipRecord): string =>
    [record.process.pid, record.process.processStartTime, record.port].join(':')

  /** A settlement that arrives for a claimed or retired project is accounted,
   * never applied: it installs nothing, emits nothing, records no cleanup, and
   * makes the arriving work visible to the close confirmation predicate. */
  const accountLateCloseSettlement = (projectId: string): void => {
    lateCloseSettlements += 1
    const claim = closeClaims.get(projectId)
    if (claim !== undefined) claim.lateWork += 1
  }

  /** A reconciliation observation that arrives for a project a close already
   * retired, or one a close currently claims, has no caller to settle: the
   * reconciling entry it was observing is gone. It is still identity-bearing
   * work that arrived late, so it is accounted exactly as every other stale
   * settlement is — installing nothing, emitting nothing, recording no
   * cleanup, and touching no other project. */
  const accountLateReconciliationObservation = (projectId: string): void => {
    if (retiredProjects.has(projectId) || closeClaims.has(projectId))
      accountLateCloseSettlement(projectId)
  }

  const closeClaimFailure = (projectId: string): RuntimeFailure | undefined =>
    closeClaims.has(projectId)
      ? new RuntimeFailure('runtime-closing')
      : undefined

  /** A refusal raised before the caller installed an entry, registered or
   * revived ownership, created a pending admission, minted a generation, or
   * returned a snapshot created no identity-bearing state. It is the mechanism
   * working, so it is counted for evidence only: it never raises `lateWork` and
   * the confirmation predicate never reads this counter. */
  const refuseAcquisition = <T>(refusal: T): T => {
    refusedLateAcquisitions += 1
    return refusal
  }

  /** The authorisation an install may present. A close's own claim authorises
   * its rollback install only while that claim is unsealed: once the
   * confirmation region seals it, durable removal is in flight and no entry may
   * be installed behind it by any caller, the owning close included. */
  const ownerAuthorises = (projectId: string, owner?: CloseClaim): boolean =>
    owner !== undefined && closeClaims.get(projectId) === owner && !owner.sealed

  /** Single refusal rule for every entry-installing and acquisition seam: a
   * retired project is unknown, and a project claimed by another close is
   * closing. `runtime-closing` is an acquisition failure only and is never
   * installed as an entry failure category. */
  const entryInstallRefusal = (
    projectId: string,
    owner?: CloseClaim
  ): RuntimeFailure | undefined => {
    if (retiredProjects.has(projectId))
      return new RuntimeFailure('unknown-project')
    if (ownerAuthorises(projectId, owner)) return undefined
    return closeClaimFailure(projectId)
  }

  /** The only entry write in the manager. Every install consults the retirement
   * set, the claim map, and the claim seal first. A refused install had already
   * materialised the generation it was about to install, so it is
   * identity-bearing late work: it accounts a late settlement, raises the
   * claim's `lateWork`, and mutates nothing. */
  const installEntry = (
    projectId: string,
    entry: ProjectRuntimeEntry,
    owner?: CloseClaim
  ): boolean => {
    if (entryInstallRefusal(projectId, owner) !== undefined) {
      accountLateCloseSettlement(projectId)
      return false
    }
    entries.set(projectId, entry)
    return true
  }

  /** Quarantine key for an identity that arrived while its project's claim was
   * sealed. It is namespaced by project rather than by a replacement admission,
   * because no admission exists on this path. */
  const sealedCloseAdmissionId = (projectId: string): string =>
    'close-seal:' + deriveProjectOwnerToken(projectId)

  /** An exact `pid:processStartTime:port` identity reported after the sweep
   * cardinality was frozen is identity-bearing late work. While the claim is
   * sealed the identity must not enter the ownership index behind an in-flight
   * removal, so it is quarantined instead: still reachable by the manager
   * shutdown sweep, never orphaned, and never owned by a removed project. */
  const registerOwnership = (
    projectId: string,
    generation: symbol,
    record: RuntimeOwnershipRecord
  ): void => {
    const claim = closeClaims.get(projectId)
    if (claim?.sealed === true) {
      const admissionId = sealedCloseAdmissionId(projectId)
      quarantinedOwnership.set(restartQuarantineKey(admissionId, record), {
        projectId,
        restartGeneration: generation,
        admissionId,
        process: record.process,
        port: record.port,
        auditState: 'unaudited',
      })
      accountLateCloseSettlement(projectId)
      return
    }
    ownership.set(ownershipKey(record), { projectId, generation, ...record })
    if (claim !== undefined || retiredProjects.has(projectId))
      accountLateCloseSettlement(projectId)
  }

  const auditConfirmsAbsence = (audit: RuntimeResourceAudit): boolean =>
    audit.processAbsent && audit.processGroupAbsent && audit.listenerAbsent

  const runtimeIdentity = (
    record: RuntimeOwnershipRecord
  ): RuntimeRestartIdentity =>
    Object.freeze({
      pid: record.process.pid,
      processStartTime: record.process.processStartTime,
      port: record.port,
    })

  const ownedReadyFor = (
    entry: RunningEntry | StoppingEntry | FailedEntry
  ): ReadyRuntime | undefined => {
    if (entry.state === 'running' || entry.state === 'stopping')
      return entry.ready
    if (
      entry.snapshot.pid === null ||
      entry.snapshot.processStartTime === null ||
      entry.snapshot.port === null ||
      entry.snapshot.internalUrl === null
    ) {
      return undefined
    }
    const record = ownership.get(
      [
        entry.snapshot.pid,
        entry.snapshot.processStartTime,
        entry.snapshot.port,
      ].join(':')
    )
    if (record?.generation !== entry.generation) return undefined
    return {
      process: record.process,
      port: record.port,
      internalUrl: entry.snapshot.internalUrl,
      readinessAttempts: [],
    }
  }

  const admissionOwnedKeys = (
    admission: PendingReplacementAdmission
  ): Set<string> => {
    let keys = pendingAdmissionOwnedKeys.get(admission.admissionId)
    if (keys === undefined) {
      keys = new Set<string>()
      pendingAdmissionOwnedKeys.set(admission.admissionId, keys)
    }
    return keys
  }

  const resolveAdmission = (admission: PendingReplacementAdmission): void => {
    if (
      admission.phase === 'launch-pending' ||
      admission.resolvedPhase !== undefined
    )
      return
    admission.resolvedPhase = admission.phase
    admissionResolutions += 1
    pendingAdmissionResolvers.get(admission.admissionId)?.()
    pendingAdmissionResolvers.delete(admission.admissionId)
  }

  const finishAdmission = (admission: PendingReplacementAdmission): void => {
    if (pendingAdmissions.get(admission.projectId) !== admission) return
    resolveAdmission(admission)
    pendingAdmissions.delete(admission.projectId)
    pendingAdmissionOwnedKeys.delete(admission.admissionId)
    detachedAdmissionIds.delete(admission.admissionId)
  }

  const maybeFinishDetachedAdmission = (
    admission: PendingReplacementAdmission
  ): void => {
    const ownedKeys = admissionOwnedKeys(admission)
    if (
      !detachedAdmissionIds.has(admission.admissionId) ||
      admission.phase === 'launch-pending'
    )
      return
    const retained = [...quarantinedOwnership.values()].some(
      (record) => record.admissionId === admission.admissionId
    )
    if (retained) {
      resolveAdmission(admission)
      return
    }
    if (ownedKeys.size > 0) return
    admission.phase = admission.ownedReported
      ? 'audited-absent'
      : 'absent-confirmed'
    if (detachedAdmissionIds.has(admission.admissionId)) {
      resolveAdmission(admission)
      return
    }
    finishAdmission(admission)
  }

  const restartQuarantineKey = (
    admissionId: string,
    record: RuntimeOwnershipRecord
  ): string => `${admissionId}|${ownershipKey(record)}`

  const quarantineForProject = (
    projectId: string
  ): readonly [string, QuarantinedOwnership][] =>
    [...quarantinedOwnership.entries()].filter(
      ([, record]) => record.projectId === projectId
    )

  const quarantineOwnership = (
    admission: PendingReplacementAdmission,
    record: ManagedOwnership | QuarantinedOwnership,
    auditState: RestartQuarantineAuditState = 'unaudited',
    terminationAttempts = 0,
    audit?: RuntimeTerminationAudit
  ): string => {
    const identityKey = ownershipKey(record)
    const key = restartQuarantineKey(admission.admissionId, record)
    const recordGeneration =
      'restartGeneration' in record
        ? record.restartGeneration
        : record.generation
    if (ownership.get(identityKey)?.generation === recordGeneration)
      ownership.delete(identityKey)
    admission.ownedReported = true
    admissionOwnedKeys(admission).add(identityKey)
    admission.phase = 'materialized-quarantined'
    const existing = quarantinedOwnership.get(key)
    quarantinedOwnership.set(key, {
      projectId: record.projectId,
      restartGeneration: recordGeneration,
      admissionId: admission.admissionId,
      process: record.process,
      port: record.port,
      auditState: existing?.auditState ?? auditState,
    })
    quarantineTerminationAttempts.set(
      key,
      Math.max(quarantineTerminationAttempts.get(key) ?? 0, terminationAttempts)
    )
    if (audit !== undefined)
      quarantineCleanups.set(key, Object.freeze({ ...audit }))
    return key
  }

  const removeConfirmedQuarantine = (
    key: string,
    record: QuarantinedOwnership
  ): void => {
    record.auditState = 'audited-absent'
    quarantinedOwnership.delete(key)
    quarantineReclamations.delete(key)
    quarantineTerminationAttempts.delete(key)
    const admission = pendingAdmissions.get(record.projectId)
    if (admission?.admissionId !== record.admissionId) return
    admissionOwnedKeys(admission).delete(ownershipKey(record))
    maybeFinishDetachedAdmission(admission)
  }

  const reclaimQuarantine = async (key: string): Promise<void> => {
    const record = quarantinedOwnership.get(key)
    if (record === undefined) return
    if (record.auditState === 'reclaiming') {
      await quarantineReclamations.get(key)
      return
    }
    const priorAttempts = quarantineTerminationAttempts.get(key) ?? 0
    if (priorAttempts >= 2) return
    record.auditState = 'reclaiming'
    quarantineTerminationAttempts.set(key, priorAttempts + 1)
    const reclamation = record.process
      .terminate(config.gracefulShutdownMs, config.forceShutdownMs, record.port)
      .then(
        (audit) => {
          quarantineCleanups.set(key, Object.freeze({ ...audit }))
          if (auditConfirmsAbsence(audit)) {
            removeConfirmedQuarantine(key, record)
            return
          }
          record.auditState = 'audited-unconfirmed'
        },
        () => {
          record.auditState = 'audited-unconfirmed'
        }
      )
    quarantineReclamations.set(key, reclamation)
    await reclamation
  }

  const reclaimProjectQuarantine = async (projectId: string): Promise<void> => {
    await Promise.all(
      quarantineForProject(projectId).map(([key]) => reclaimQuarantine(key))
    )
    const admission = pendingAdmissions.get(projectId)
    if (admission !== undefined) maybeFinishDetachedAdmission(admission)
  }

  const createPendingAdmission = (
    projectId: string,
    restartGeneration: symbol,
    canonicalPath: string,
    ownerToken: string
  ): PendingReplacementAdmission => {
    if (pendingAdmissions.has(projectId))
      throw new RuntimeRestartInvariantError()
    let resolve!: () => void
    const resolution = new Promise<void>((settle) => {
      resolve = settle
    })
    const admissionId = `${deriveProjectOwnerToken(projectId)}:a${String(
      ++admissionSequence
    )}`
    const admission: PendingReplacementAdmission = {
      projectId,
      restartGeneration,
      admissionId,
      canonicalPath,
      ownerToken,
      admittedAt: deadlineScheduler.now(),
      phase: 'launch-pending',
      ownedReported: false,
      resolution,
      resolvedPhase: undefined,
    }
    pendingAdmissionResolvers.set(admissionId, resolve)
    pendingAdmissionOwnedKeys.set(admissionId, new Set<string>())
    pendingAdmissions.set(projectId, admission)
    return admission
  }

  const recordCleanup = (
    projectId: string,
    audit: RuntimeTerminationAudit
  ): void => {
    cleanupOutcomes.set(projectId, Object.freeze({ ...audit }))
  }

  const emit = (event: RuntimeLifecycleEvent): void => {
    recordEvent(serializeRuntimeEvent(event))
  }

  /** Phase 7. The stable project ID is never reissued, so the tombstone is a
   * permanent refusal for every later install, acquisition, and settlement. */
  const retireProject = (projectId: string): void => {
    entries.delete(projectId)
    cleanupOutcomes.delete(projectId)
    retiredProjects.add(projectId)
  }

  const register = (projectId: string, canonicalPath: string): void => {
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const refusal = entryInstallRefusal(projectId)
    if (refusal !== undefined) throw refuseAcquisition(refusal)
    const current = entries.get(projectId)
    if (current !== undefined) {
      if (current.canonicalPath !== canonicalPath)
        throw new RuntimeFailure('canonical-path-invariant')
      return
    }
    // Unrefusable by construction: the refusal above is evaluated in this same
    // synchronous section, so no claim, seal, or tombstone can appear between.
    if (
      !installEntry(projectId, {
        state: 'registered',
        projectId,
        canonicalPath,
        released: false,
      })
    )
      throw new RuntimeCloseInvariantError()
  }

  const waitForStarting = (
    entry: StartingEntry,
    signal?: AbortSignal
  ): Promise<RuntimeSnapshot> => {
    const waiter = Symbol(entry.projectId)
    entry.waiters.add(waiter)
    let settled = false
    const release = (): void => {
      if (settled) return
      settled = true
      entry.waiters.delete(waiter)
    }
    if (signal?.aborted) {
      release()
      if (entry.waiters.size === 0 && entries.get(entry.projectId) === entry)
        entry.controller.abort(new RuntimeFailure('caller-cancelled'))
      return Promise.reject(new RuntimeFailure('caller-cancelled'))
    }
    return new Promise<RuntimeSnapshot>((resolve, reject) => {
      const cancel = (): void => {
        release()
        if (entry.waiters.size === 0 && entries.get(entry.projectId) === entry)
          entry.controller.abort(new RuntimeFailure('caller-cancelled'))
        reject(new RuntimeFailure('caller-cancelled'))
      }
      signal?.addEventListener('abort', cancel, { once: true })
      entry.operation.then(
        (snapshot) => {
          signal?.removeEventListener('abort', cancel)
          release()
          resolve(snapshot)
        },
        (error: unknown) => {
          signal?.removeEventListener('abort', cancel)
          release()
          reject(error)
        }
      )
    })
  }

  const failEntry = (
    projectId: string,
    canonicalPath: string,
    generation: symbol,
    snapshot: RuntimeSnapshot,
    failure: RuntimeFailure,
    startedAt: number,
    pendingAdmissionId?: string,
    owner?: CloseClaim
  ): boolean => {
    const elapsedMs = Math.max(0, now() - startedAt)
    return installEntry(
      projectId,
      {
        state: 'failed',
        projectId,
        canonicalPath,
        generation,
        failure,
        snapshot: freezeSnapshot({ ...snapshot, state: 'failed', elapsedMs }),
        ...(pendingAdmissionId === undefined ? {} : { pendingAdmissionId }),
      },
      owner
    )
  }

  const runReconciliationBounded = async <T>(input: {
    readonly milliseconds: number
    readonly parentSignal: AbortSignal
    readonly call: (signal: AbortSignal) => Promise<T>
  }): Promise<BoundedReconciliationResult<T>> => {
    if (input.parentSignal.aborted) return Object.freeze({ completed: false })
    const controller = new AbortController()
    const abortFromParent = (): void =>
      controller.abort(input.parentSignal.reason)
    input.parentSignal.addEventListener('abort', abortFromParent, {
      once: true,
    })
    if (input.parentSignal.aborted) abortFromParent()
    let settleAborted!: () => void
    const aborted = new Promise<Readonly<{ completed: false }>>((resolve) => {
      settleAborted = () => resolve(Object.freeze({ completed: false }))
      controller.signal.addEventListener('abort', settleAborted, { once: true })
    })
    const cancelDeadline = deadlineScheduler.scheduleDeadline(
      input.milliseconds,
      () => controller.abort()
    )
    const pending = Promise.resolve()
      .then(() => input.call(controller.signal))
      .then(
        (value) => Object.freeze({ completed: true as const, value }),
        () => Object.freeze({ completed: false as const })
      )
    try {
      const result = await Promise.race([pending, aborted])
      if (!result.completed)
        void pending.then(
          () => undefined,
          () => undefined
        )
      return result
    } finally {
      cancelDeadline()
      input.parentSignal.removeEventListener('abort', abortFromParent)
      controller.signal.removeEventListener('abort', settleAborted)
      controller.abort()
    }
  }

  const awaitTrustedReconciliationDelay = (
    milliseconds: number,
    signal: AbortSignal
  ): Promise<void> => {
    if (signal.aborted) return Promise.resolve()
    return new Promise<void>((resolve) => {
      let settled = false
      let cancelDeadline = (): void => undefined
      const settle = (): void => {
        if (settled) return
        settled = true
        cancelDeadline()
        signal.removeEventListener('abort', settle)
        resolve()
      }
      signal.addEventListener('abort', settle, { once: true })
      if (signal.aborted) {
        settle()
        return
      }
      cancelDeadline = deadlineScheduler.scheduleDeadline(
        Math.max(0, milliseconds),
        settle
      )
      if (settled) cancelDeadline()
    })
  }

  const inspectReconciliation = (): ReconciliationInspection =>
    Object.freeze({
      phase: reconciliationPhase,
      startedAt: reconciliationStartedAt,
      settledElapsedMs: reconciliationSettledElapsedMs,
      boundMs: reconciliationOverallBoundMs(config),
      scanCompleted: reconciliationScanCompleted,
      candidateCount: reconciliationCandidateCount,
      projects: Object.freeze(
        reconciliationProjectOrder.map((projectId) => {
          const inspection = reconciliationProjects.get(projectId)
          if (inspection === undefined)
            throw new Error('Reconciliation inspection invariant failed')
          return Object.freeze({
            ...inspection,
          }) satisfies ReconciliationProjectInspection
        })
      ),
    })

  const finishReconciliationIfSettled = (): void => {
    if (
      reconciliationProjectOrder.some(
        (projectId) => reconciliationProjects.get(projectId)?.outcome === null
      )
    ) {
      return
    }
    reconciliationCancelDeadline?.()
    reconciliationCancelDeadline = undefined
    if (reconciliationPhase !== 'aborted') reconciliationPhase = 'settled'
    reconciliationSettledElapsedMs =
      reconciliationStartedAt === null
        ? 0
        : Math.max(0, deadlineScheduler.now() - reconciliationStartedAt)
  }

  const settleReconciliation = (input: {
    readonly entry: ReconcilingEntry
    readonly outcome: 'adopted' | 'absent' | 'unresolved'
    readonly refusalReason?: ReconcileRefusalReason
    readonly absenceProof?: ReconcileAbsenceProof
    readonly ready?: ReadyRuntime
  }): void => {
    const installed = entries.get(input.entry.projectId)
    if (
      installed !== input.entry ||
      installed.state !== 'reconciling' ||
      installed.generation !== input.entry.generation
    ) {
      return
    }
    const inspection = reconciliationProjects.get(input.entry.projectId)
    if (inspection === undefined || inspection.outcome !== null) return
    const elapsedMs =
      reconciliationStartedAt === null
        ? 0
        : Math.max(0, deadlineScheduler.now() - reconciliationStartedAt)
    inspection.outcome = input.outcome
    inspection.refusalReason = input.refusalReason ?? null
    inspection.absenceProof = input.absenceProof ?? null
    inspection.settledElapsedMs = elapsedMs

    if (input.refusalReason === 'manager-shutdown') {
      reconciliationPhase = 'aborted'
      input.entry.settle()
      finishReconciliationIfSettled()
      return
    }

    if (input.outcome === 'adopted' && input.ready !== undefined) {
      const snapshot = freezeSnapshot({
        ...input.entry.snapshot,
        state: 'running',
        pid: input.ready.process.pid,
        processStartTime: input.ready.process.processStartTime,
        internalUrl: input.ready.internalUrl,
        port: input.ready.port,
        elapsedMs,
      })
      const adoptedEntry: RunningEntry = {
        state: 'running',
        projectId: input.entry.projectId,
        canonicalPath: input.entry.canonicalPath,
        generation: input.entry.generation,
        ready: input.ready,
        snapshot,
        adopted: true,
      }
      registerOwnership(
        input.entry.projectId,
        input.entry.generation,
        input.ready
      )
      if (installEntry(input.entry.projectId, adoptedEntry)) {
        emit({
          event: 'runtime.reconcile.succeeded',
          projectId: input.entry.projectId,
          from: 'reconciling',
          to: 'running',
          elapsedMs,
        })
      }
    } else if (input.outcome === 'absent') {
      if (
        installEntry(input.entry.projectId, {
          state: 'registered',
          projectId: input.entry.projectId,
          canonicalPath: input.entry.canonicalPath,
          released: true,
        })
      ) {
        emit({
          event: 'runtime.reconcile.absent',
          projectId: input.entry.projectId,
          from: 'reconciling',
          to: 'stopped',
          elapsedMs,
        })
      }
    } else {
      const failure = new RuntimeFailure('reconcile-unconfirmed')
      if (
        failEntry(
          input.entry.projectId,
          input.entry.canonicalPath,
          input.entry.generation,
          input.entry.snapshot,
          failure,
          input.entry.snapshot.startedAt
        )
      ) {
        emit({
          event: 'runtime.reconcile.failed',
          projectId: input.entry.projectId,
          from: 'reconciling',
          to: 'failed',
          elapsedMs,
          classification: failure.category,
        })
      }
    }
    input.entry.settle()
    finishReconciliationIfSettled()
  }

  const settlePendingReconciliations = (
    refusalReason: ReconcileRefusalReason
  ): void => {
    for (const projectId of reconciliationProjectOrder) {
      const entry = entries.get(projectId)
      if (entry?.state === 'reconciling')
        settleReconciliation({
          entry,
          outcome: 'unresolved',
          refusalReason,
        })
      else accountLateReconciliationObservation(projectId)
    }
  }

  const auditCandidateAbsence = async (input: {
    readonly candidate: ReconcileCandidate
    readonly processStartTime: string
    readonly controller: AbortController
    readonly attribution: RuntimeAttributionPrimitives
  }): Promise<boolean> => {
    const audit = await runReconciliationBounded({
      milliseconds: config.reconcileSettlementAllowanceMs,
      parentSignal: input.controller.signal,
      call: async (signal) => {
        const [identity, group, listenerInode] = await Promise.all([
          input.attribution.readProcessIdentity(input.candidate.pid, signal),
          input.attribution.readProcessGroupMemberPids(
            input.candidate.pid,
            signal
          ),
          input.attribution.readLoopbackListenerInode(
            input.candidate.port,
            signal
          ),
        ])
        return (
          identity?.startTime !== input.processStartTime &&
          group.complete &&
          group.pids.length === 0 &&
          listenerInode === null
        )
      },
    })
    return audit.completed && audit.value
  }

  const attributeReconcileCandidate = async (input: {
    readonly entry: ReconcilingEntry
    readonly candidate: ReconcileCandidate
    readonly installedRuntime: InstalledRuntimeIdentity
    readonly attribution: RuntimeAttributionPrimitives
  }): Promise<CandidateAttribution> => {
    const result = await runReconciliationBounded({
      milliseconds: config.reconcileAttributionAllowanceMs,
      parentSignal: input.entry.controller.signal,
      call: async (signal): Promise<CandidateAttribution> => {
        const [candidateIdentity, candidateArgv] = await Promise.all([
          input.attribution.readProcessIdentity(input.candidate.pid, signal),
          input.attribution.readProcessCommandLine(input.candidate.pid, signal),
        ])
        if (candidateIdentity === null || candidateArgv === null)
          return Object.freeze({ ok: false, reason: 'identity-unstable' })
        const currentUid =
          typeof process.getuid === 'function' ? process.getuid() : -1
        if (currentUid <= 0 || candidateIdentity.uid !== currentUid)
          return Object.freeze({ ok: false, reason: 'uid-mismatch' })
        if (
          candidateArgv[0] !== input.installedRuntime.launcherArgvPrefix[0] ||
          candidateArgv[1] !== input.installedRuntime.launcherArgvPrefix[1]
        ) {
          return Object.freeze({
            ok: false,
            reason: 'launcher-prefix-mismatch',
          })
        }
        if (candidateArgv.at(-1) !== input.entry.canonicalPath)
          return Object.freeze({ ok: false, reason: 'canonical-path-mismatch' })
        const userDataIndex = candidateArgv.indexOf('--user-data-dir')
        const expectedUserDataPath = buildRuntimeUserDataPath(
          input.entry.snapshot.ownerToken,
          input.candidate.port
        )
        if (
          userDataIndex < 0 ||
          candidateArgv[userDataIndex + 1] !== expectedUserDataPath
        ) {
          return Object.freeze({ ok: false, reason: 'owner-token-mismatch' })
        }
        const bindIndex = candidateArgv.indexOf('--bind-addr')
        if (
          bindIndex < 0 ||
          candidateArgv[bindIndex + 1] !==
            '127.0.0.1:' + String(input.candidate.port)
        ) {
          return Object.freeze({ ok: false, reason: 'port-mismatch' })
        }
        const expectedArgv = buildRuntimeArgv(
          input.entry.canonicalPath,
          input.candidate.port,
          expectedUserDataPath
        )
        if (
          candidateArgv.length !== expectedArgv.length + 2 ||
          candidateArgv
            .slice(input.installedRuntime.launcherArgvPrefix.length)
            .some((value, index) => value !== expectedArgv[index])
        ) {
          return Object.freeze({ ok: false, reason: 'argv-mismatch' })
        }
        if (candidateIdentity.processGroupId !== input.candidate.pid)
          return Object.freeze({ ok: false, reason: 'not-group-leader' })
        const listener = await resolveGroupListenerOwner({
          processGroupId: input.candidate.pid,
          port: input.candidate.port,
          installedRuntime: input.installedRuntime,
          signal,
          primitives: input.attribution,
        })
        if (listener.owner === null)
          return Object.freeze({
            ok: false,
            reason: listener.refusalReason,
          })
        return Object.freeze({
          ok: true,
          candidateIdentity,
          candidateArgv,
          ownerIdentity: listener.owner.identity,
        })
      },
    })
    return result.completed
      ? result.value
      : Object.freeze({ ok: false, reason: 'deadline-exceeded' })
  }

  const probeCandidateReadiness = async (input: {
    readonly entry: ReconcilingEntry
    readonly candidate: ReconcileCandidate
  }): Promise<boolean> => {
    const readinessDeadlineAt =
      deadlineScheduler.now() + config.reconcileReadinessBoundMs
    const result = await runReconciliationBounded({
      milliseconds: config.reconcileReadinessBoundMs,
      parentSignal: input.entry.controller.signal,
      call: async (signal) => {
        while (!signal.aborted) {
          const verdict = await processDependencies.health.check(
            'http://127.0.0.1:' +
              String(input.candidate.port) +
              PROJECT_RUNTIME_DEFAULTS.healthPath,
            config.healthAttemptTimeoutMs,
            signal
          )
          if (
            verdict.status === PROJECT_RUNTIME_DEFAULTS.healthStatus &&
            verdict.bodyStatus !== null &&
            PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses.includes(
              verdict.bodyStatus as 'alive' | 'expired'
            )
          ) {
            return true
          }
          await awaitTrustedReconciliationDelay(
            Math.max(
              0,
              Math.min(
                config.pollIntervalMs,
                readinessDeadlineAt - deadlineScheduler.now()
              )
            ),
            signal
          )
          if (signal.aborted) return false
        }
        return false
      },
    })
    return result.completed && result.value
  }

  const reconcileCandidate = async (input: {
    readonly entry: ReconcilingEntry
    readonly candidate: ReconcileCandidate
    readonly installedRuntime: InstalledRuntimeIdentity
    readonly attribution: RuntimeAttributionPrimitives
  }): Promise<void> => {
    const first = await attributeReconcileCandidate(input)
    if (!first.ok) {
      if (
        first.reason === 'identity-unstable' ||
        first.reason === 'listener-absent'
      ) {
        const processStartTime =
          (
            await input.attribution.readProcessIdentity(
              input.candidate.pid,
              input.entry.controller.signal
            )
          )?.startTime ?? ''
        if (processStartTime.length === 0) {
          settleReconciliation({
            entry: input.entry,
            outcome: 'unresolved',
            refusalReason: 'absence-unconfirmed',
          })
          return
        }
        if (
          await auditCandidateAbsence({
            candidate: input.candidate,
            processStartTime,
            controller: input.entry.controller,
            attribution: input.attribution,
          })
        ) {
          settleReconciliation({
            entry: input.entry,
            outcome: 'absent',
            absenceProof: 'candidate-audit-triple-absent',
          })
          return
        }
      }
      settleReconciliation({
        entry: input.entry,
        outcome: 'unresolved',
        refusalReason: first.reason,
      })
      return
    }

    const ready = await probeCandidateReadiness(input)
    const second = await runReconciliationBounded({
      milliseconds: config.reconcileAttributionAllowanceMs,
      parentSignal: input.entry.controller.signal,
      call: async (signal) => {
        const [identity, argv, listener] = await Promise.all([
          input.attribution.readProcessIdentity(input.candidate.pid, signal),
          input.attribution.readProcessCommandLine(input.candidate.pid, signal),
          resolveGroupListenerOwner({
            processGroupId: input.candidate.pid,
            port: input.candidate.port,
            installedRuntime: input.installedRuntime,
            signal,
            primitives: input.attribution,
          }),
        ])
        return { identity, argv, listener }
      },
    })
    const stable =
      second.completed &&
      second.value.identity?.startTime === first.candidateIdentity.startTime &&
      second.value.argv !== null &&
      second.value.argv.length === first.candidateArgv.length &&
      second.value.argv.every(
        (value, index) => value === first.candidateArgv[index]
      ) &&
      second.value.listener.owner?.identity.pid === first.ownerIdentity.pid &&
      second.value.listener.owner.identity.startTime ===
        first.ownerIdentity.startTime
    if (!stable) {
      if (
        await auditCandidateAbsence({
          candidate: input.candidate,
          processStartTime: first.candidateIdentity.startTime,
          controller: input.entry.controller,
          attribution: input.attribution,
        })
      ) {
        settleReconciliation({
          entry: input.entry,
          outcome: 'absent',
          absenceProof: 'candidate-audit-triple-absent',
        })
      } else {
        settleReconciliation({
          entry: input.entry,
          outcome: 'unresolved',
          refusalReason: second.completed
            ? 'identity-unstable'
            : 'absence-unconfirmed',
        })
      }
      return
    }
    if (!ready) {
      settleReconciliation({
        entry: input.entry,
        outcome: 'unresolved',
        refusalReason: 'readiness-unconfirmed',
      })
      return
    }

    const process = adoptOwnedRuntimeProcess({
      config,
      pid: first.candidateIdentity.pid,
      processStartTime: first.candidateIdentity.startTime,
      port: input.candidate.port,
      ownerToken: input.entry.snapshot.ownerToken,
      attribution: input.attribution,
      primitives: processDependencies.termination,
    })
    settleReconciliation({
      entry: input.entry,
      outcome: 'adopted',
      ready: Object.freeze({
        process,
        port: input.candidate.port,
        internalUrl: 'http://127.0.0.1:' + String(input.candidate.port),
        readinessAttempts: Object.freeze([]),
      }),
    })
  }

  const observeReconciliation = async (
    installedRuntime: InstalledRuntimeIdentity,
    controller: AbortController
  ): Promise<void> => {
    const attribution = processDependencies.attribution
    const discovery = await runReconciliationBounded({
      milliseconds: config.reconcileScanAllowanceMs,
      parentSignal: controller.signal,
      call: async (signal) => {
        const scan = await attribution.listRuntimeCandidatePids(signal)
        const candidates = new Map<string, ReconcileCandidate[]>()
        for (const projectId of reconciliationProjectOrder)
          candidates.set(projectId, [])
        let complete = scan.complete
        for (const pid of scan.pids) {
          const argv = await attribution.readProcessCommandLine(pid, signal)
          if (argv === null) continue
          const userDataIndex = argv.indexOf('--user-data-dir')
          const userDataPath =
            userDataIndex < 0 ? undefined : argv[userDataIndex + 1]
          const bindIndex = argv.indexOf('--bind-addr')
          const bindMatch = /^127\.0\.0\.1:(\d+)$/u.exec(
            bindIndex < 0 ? '' : (argv[bindIndex + 1] ?? '')
          )
          const bindPort = bindMatch === null ? undefined : Number(bindMatch[1])
          for (const projectId of reconciliationProjectOrder) {
            const entry = entries.get(projectId)
            if (entry?.state !== 'reconciling') continue
            const base =
              userDataPath === undefined
                ? ''
                : userDataPath.slice(userDataPath.lastIndexOf('/') + 1)
            const portSeparator = base.lastIndexOf('-')
            const ownerPort =
              portSeparator < 0
                ? undefined
                : Number(base.slice(portSeparator + 1))
            const hasOwnerMarker = base.includes(entry.snapshot.ownerToken)
            const hasCanonicalMarker = argv.at(-1) === entry.canonicalPath
            if (!hasOwnerMarker && !hasCanonicalMarker) continue
            const port = ownerPort ?? bindPort
            if (
              typeof port !== 'number' ||
              !Number.isSafeInteger(port) ||
              port <= 0 ||
              port > 65_535
            )
              continue
            candidates.get(projectId)?.push(Object.freeze({ pid, argv, port }))
          }
        }
        return { candidates, complete }
      },
    })

    if (!discovery.completed) {
      reconciliationScanCompleted = false
      reconciliationCandidateCount = 0
      settlePendingReconciliations('scan-incomplete')
      return
    }
    reconciliationScanCompleted = discovery.value.complete
    reconciliationCandidateCount = [
      ...discovery.value.candidates.values(),
    ].reduce((count, candidates) => count + candidates.length, 0)
    const tasks: Promise<void>[] = []
    for (const projectId of reconciliationProjectOrder) {
      const entry = entries.get(projectId)
      if (entry?.state !== 'reconciling') continue
      const candidates = discovery.value.candidates.get(projectId) ?? []
      if (candidates.length === 0) {
        if (discovery.value.complete)
          settleReconciliation({
            entry,
            outcome: 'absent',
            absenceProof: 'no-candidate-complete-scan',
          })
        else
          settleReconciliation({
            entry,
            outcome: 'unresolved',
            refusalReason: 'scan-incomplete',
          })
        continue
      }
      if (candidates.length > 1) {
        settleReconciliation({
          entry,
          outcome: 'unresolved',
          refusalReason: 'ambiguous-candidates',
        })
        continue
      }
      tasks.push(
        reconcileCandidate({
          entry,
          candidate: candidates[0]!,
          installedRuntime,
          attribution,
        })
      )
    }
    await Promise.all(tasks)
  }

  const beginReconciliation = (): Promise<void> => {
    reconciliationInstallation ??= (async () => {
      if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
      reconciliationPhase = 'installing'
      const projects = await listProjects()
      if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
      reconciliationProjectOrder = Object.freeze(
        projects.map((project) => project.id)
      )
      reconciliationScanCompleted = projects.length === 0 ? true : null
      reconciliationCandidateCount = projects.length === 0 ? 0 : null
      if (projects.length === 0) {
        reconciliationStartedAt = deadlineScheduler.now()
        reconciliationPhase = 'settled'
        reconciliationSettledElapsedMs = Math.max(
          0,
          deadlineScheduler.now() - reconciliationStartedAt
        )
        return
      }

      const identityController = new AbortController()
      const identity = await runReconciliationBounded({
        milliseconds: config.reconcileAttributionAllowanceMs,
        parentSignal: identityController.signal,
        call: (signal) =>
          processDependencies.attribution.resolveInstalledRuntimeIdentity(
            config.executablePath,
            signal
          ),
      })
      identityController.abort()
      reconciliationStartedAt = deadlineScheduler.now()
      const controller = new AbortController()
      reconciliationController = controller
      const installedProjectIds: string[] = []
      for (const project of projects) {
        if (entries.has(project.id))
          throw new Error('Reconciliation entry installation invariant failed')
        const generation = Symbol(project.id)
        let settle!: () => void
        const settlement = new Promise<void>((resolve) => {
          settle = resolve
        })
        const snapshot = freezeSnapshot({
          projectId: project.id,
          state: 'starting',
          pid: null,
          processStartTime: null,
          internalUrl: null,
          port: null,
          canonicalPath: project.canonicalPath,
          stableRoute: stableProjectRoute(project.id),
          ownerToken: deriveProjectOwnerToken(project.id),
          startedAt: now(),
          elapsedMs: 0,
        })
        if (
          !installEntry(project.id, {
            state: 'reconciling',
            projectId: project.id,
            canonicalPath: project.canonicalPath,
            generation,
            snapshot,
            controller,
            settlement,
            settle,
          })
        )
          continue
        installedProjectIds.push(project.id)
        reconciliationProjects.set(project.id, {
          projectToken: snapshot.ownerToken,
          outcome: null,
          refusalReason: null,
          absenceProof: null,
          settledElapsedMs: null,
        })
        emit({
          event: 'runtime.reconcile.requested',
          projectId: project.id,
          from: 'stopped',
          to: 'reconciling',
          elapsedMs: 0,
        })
      }
      reconciliationProjectOrder = Object.freeze([...installedProjectIds])
      reconciliationCancelDeadline = deadlineScheduler.scheduleDeadline(
        reconciliationOverallBoundMs(config),
        () => {
          controller.abort()
          settlePendingReconciliations('deadline-exceeded')
        }
      )
      if (!identity.completed || identity.value === null) {
        settlePendingReconciliations('launcher-unresolved')
        return
      }
      reconciliationPhase = 'observing'
      void observeReconciliation(identity.value, controller).then(
        () => undefined,
        () => settlePendingReconciliations('scan-incomplete')
      )
    })()
    return reconciliationInstallation
  }

  const waitForReconciliation = (
    entry: ReconcilingEntry,
    signal?: AbortSignal
  ): Promise<void> => {
    if (signal?.aborted)
      return Promise.reject(new RuntimeFailure('caller-cancelled'))
    return new Promise<void>((resolve, reject) => {
      const cancel = (): void => reject(new RuntimeFailure('caller-cancelled'))
      signal?.addEventListener('abort', cancel, { once: true })
      entry.settlement.then(() => {
        signal?.removeEventListener('abort', cancel)
        if (shuttingDown) reject(new RuntimeFailure('manager-shutdown'))
        else resolve()
      })
    })
  }

  const transitionRunningToFailed = async (
    entry: RunningEntry,
    failure: RuntimeFailure,
    cleanup: 'terminate' | 'audit'
  ): Promise<Readonly<{ claimed: boolean; failure: RuntimeFailure }>> => {
    if (shuttingDown) {
      return Object.freeze({
        claimed: false,
        failure: new RuntimeFailure('manager-shutdown'),
      })
    }
    // A retired project is unknown, and a claimed project belongs to the close
    // that is releasing it: the settlement installs nothing and emits nothing.
    // Only the retired case is late work — the claimed case is the close's own
    // termination reporting back through the exit path it just triggered.
    if (retiredProjects.has(entry.projectId)) {
      lateCloseSettlements += 1
      return Object.freeze({
        claimed: false,
        failure: new RuntimeFailure('unknown-project'),
      })
    }
    const closing = closeClaimFailure(entry.projectId)
    if (closing !== undefined)
      return Object.freeze({ claimed: false, failure: closing })
    const installed = entries.get(entry.projectId)
    if (
      installed !== entry ||
      installed.state !== 'running' ||
      installed.generation !== entry.generation
    ) {
      return Object.freeze({
        claimed: false,
        failure:
          installed?.state === 'failed' &&
          installed.generation === entry.generation
            ? installed.failure
            : failure,
      })
    }

    if (
      !failEntry(
        entry.projectId,
        entry.canonicalPath,
        entry.generation,
        entry.snapshot,
        failure,
        entry.snapshot.startedAt
      )
    ) {
      return Object.freeze({
        claimed: false,
        failure: entryInstallRefusal(entry.projectId) ?? failure,
      })
    }
    emit({
      event: 'runtime.health.changed',
      projectId: entry.projectId,
      from: 'running',
      to: 'failed',
      elapsedMs: Math.max(0, now() - entry.snapshot.startedAt),
      classification: failure.category,
    })
    const audit =
      cleanup === 'terminate'
        ? await entry.ready.process.terminate(
            config.gracefulShutdownMs,
            config.forceShutdownMs,
            entry.ready.port
          )
        : {
            ...(await entry.ready.process.audit(entry.ready.port)),
            outcome: 'already-absent' as const,
          }
    recordCleanup(entry.projectId, audit)
    return Object.freeze({ claimed: true, failure })
  }

  const reuseOwnershipFailure = (
    current: RunningEntry
  ): RuntimeFailure | undefined => {
    if (shuttingDown) return new RuntimeFailure('manager-shutdown')
    const installed = entries.get(current.projectId)
    if (
      installed === current &&
      installed.state === 'running' &&
      installed.generation === current.generation
    ) {
      return undefined
    }
    if (installed?.state === 'failed') return installed.failure
    return new RuntimeFailure('runtime-stopping')
  }

  const stop = async (input: {
    readonly projectId: string
  }): Promise<RuntimeStopOutcome> => {
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'not-registered',
      })
    }
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    if (retiredProjects.has(input.projectId)) {
      const refused: RuntimeStopOutcome = Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'not-registered',
      })
      return refuseAcquisition(refused)
    }
    if (closeClaims.has(input.projectId)) {
      const refused: RuntimeStopOutcome = Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'close-in-progress',
      })
      return refuseAcquisition(refused)
    }

    const current = entries.get(input.projectId)
    if (current?.state === 'reconciling') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'reconcile-in-progress',
      })
    }
    if (
      current === undefined ||
      (current.state === 'registered' && !current.released)
    ) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    if (current.state === 'registered') {
      return Object.freeze({
        outcome: 'already-stopped',
        projectId: input.projectId,
      })
    }
    if (current.state === 'starting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'start-in-progress',
      })
    }
    if (current.state === 'failed') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category:
          current.failure.category === 'reconcile-unconfirmed'
            ? 'reconcile-unresolved'
            : 'failure-retained',
      })
    }
    if (current.state === 'restarting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'restart-in-progress',
      })
    }
    if (current.state === 'stopping') return current.operation

    let stopping!: StoppingEntry
    const terminationController = new AbortController()
    const deadlineController = new AbortController()
    const installUnconfirmedFailure = (): void => {
      if (entries.get(input.projectId) !== stopping) {
        throw new RuntimeStopInvariantError()
      }
      const failure = new RuntimeFailure('stop-unconfirmed')
      // Unrefusable by construction: the identity recheck above dominates this
      // install with no suspension between them, and close admission refuses a
      // `stopping` entry, so no claim or tombstone can exist here.
      if (
        !failEntry(
          stopping.projectId,
          stopping.canonicalPath,
          stopping.generation,
          stopping.snapshot,
          failure,
          stopping.snapshot.startedAt
        )
      ) {
        throw new RuntimeStopInvariantError()
      }
      emit({
        event: 'runtime.health.changed',
        projectId: stopping.projectId,
        from: 'stopping',
        to: 'failed',
        elapsedMs: Math.max(0, now() - stopping.snapshot.startedAt),
        classification: failure.category,
      })
    }

    const operation = Promise.resolve().then(
      async (): Promise<RuntimeStopOutcome> => {
        const termination = stopping.ready.process.terminate(
          config.gracefulShutdownMs,
          config.forceShutdownMs,
          stopping.ready.port,
          terminationController.signal
        )
        const boundedTermination = termination.then((audit) =>
          Object.freeze({ kind: 'audit' as const, audit })
        )
        const deadline = processDependencies
          .sleep(runtimeStopOverallBoundMs(config), deadlineController.signal)
          .then(() => Object.freeze({ kind: 'deadline' as const }))

        try {
          const result = await Promise.race([boundedTermination, deadline])
          if (result.kind === 'deadline') {
            terminationController.abort()
            void termination.then(
              () => {
                lateTerminationSettlements += 1
              },
              () => {
                lateTerminationSettlements += 1
              }
            )
            installUnconfirmedFailure()
            return Object.freeze({
              outcome: 'rejected',
              projectId: stopping.projectId,
              category: 'stop-unconfirmed',
            })
          }

          deadlineController.abort()
          if (entries.get(input.projectId) !== stopping) {
            throw new RuntimeStopInvariantError()
          }
          recordCleanup(stopping.projectId, result.audit)
          if (
            result.audit.processAbsent &&
            result.audit.processGroupAbsent &&
            result.audit.listenerAbsent
          ) {
            const key = ownershipKey(stopping.ready)
            const record = ownership.get(key)
            if (record?.generation === stopping.generation)
              ownership.delete(key)
            if (
              !installEntry(stopping.projectId, {
                state: 'registered',
                projectId: stopping.projectId,
                canonicalPath: stopping.canonicalPath,
                released: true,
              })
            ) {
              throw new RuntimeStopInvariantError()
            }
            emit({
              event: 'runtime.stop.succeeded',
              projectId: stopping.projectId,
              from: 'stopping',
              to: 'stopped',
              elapsedMs: Math.max(0, now() - stopping.snapshot.startedAt),
            })
            return Object.freeze({
              outcome: 'stopped',
              projectId: stopping.projectId,
              release: result.audit.outcome,
              audit: result.audit,
            })
          }

          installUnconfirmedFailure()
          return Object.freeze({
            outcome: 'rejected',
            projectId: stopping.projectId,
            category: 'stop-unconfirmed',
            release: result.audit.outcome,
            audit: result.audit,
          })
        } catch (error) {
          deadlineController.abort()
          terminationController.abort()
          if (error instanceof RuntimeStopInvariantError) throw error
          installUnconfirmedFailure()
          throw error
        }
      }
    )

    stopping = {
      state: 'stopping',
      projectId: current.projectId,
      canonicalPath: current.canonicalPath,
      generation: current.generation,
      ready: current.ready,
      snapshot: current.snapshot,
      operation,
    }
    // Unrefusable by construction: the close-claim and retirement refusals above
    // are evaluated in this same synchronous section as the entry read.
    if (!installEntry(input.projectId, stopping))
      throw new RuntimeStopInvariantError()
    emit({
      event: 'runtime.stop.requested',
      projectId: input.projectId,
      from: 'running',
      to: 'stopping',
      elapsedMs: Math.max(0, now() - current.snapshot.startedAt),
    })
    stopTasks.add(operation)
    void operation.then(
      () => stopTasks.delete(operation),
      () => stopTasks.delete(operation)
    )
    return operation
  }

  const restart = async (input: {
    readonly projectId: string
  }): Promise<RuntimeRestartOutcome> => {
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'not-registered',
      })
    }
    if (shuttingDown) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'manager-shutdown',
      })
    }
    if (retiredProjects.has(input.projectId)) {
      const refused: RuntimeRestartOutcome = Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
      return refuseAcquisition(refused)
    }
    if (closeClaims.has(input.projectId)) {
      const refused: RuntimeRestartOutcome = Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'close-in-progress',
      })
      return refuseAcquisition(refused)
    }

    const current = entries.get(input.projectId)
    if (current?.state === 'reconciling') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'reconcile-in-progress',
      })
    }
    if (current === undefined || current.state === 'registered') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    if (current.state === 'starting') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'start-in-progress',
      })
    }
    if (current.state === 'stopping') {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'stop-in-progress',
      })
    }
    if (current.state === 'restarting') return current.operation
    if (
      current.state === 'failed' &&
      current.failure.category === 'reconcile-unconfirmed'
    ) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'reconcile-unresolved',
      })
    }

    const priorAdmission = pendingAdmissions.get(input.projectId)
    const priorReady = ownedReadyFor(current)
    if (current.state === 'running' && priorReady === undefined) {
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'no-managed-runtime',
      })
    }
    const requiresQuarantineResolution =
      priorAdmission !== undefined ||
      quarantineForProject(input.projectId).length > 0
    const releaseBoundMs = requiresQuarantineResolution
      ? runtimeRestartReleaseBoundMs(config)
      : runtimeStopOverallBoundMs(config)
    const overallBoundMs = runtimeRestartOverallBoundMs(
      config,
      requiresQuarantineResolution
    )

    const generation = Symbol(input.projectId)
    const phaseController = new AbortController()
    const phaseAbort = abortedPromise(phaseController.signal)
    const startedAt = now()
    const stableRoute = stableProjectRoute(input.projectId)
    const ownerToken = deriveProjectOwnerToken(input.projectId)
    const restartingSnapshot = freezeSnapshot({
      projectId: input.projectId,
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: current.canonicalPath,
      stableRoute,
      ownerToken,
      startedAt,
      elapsedMs: 0,
    })
    let restarting!: RestartingEntry
    let operationSettled = false
    let gateConfirmed = false
    let replacementBlockReason: RuntimeFailure | undefined
    const replacementAttemptAudits = new Map<string, RuntimeTerminationAudit>()
    const lastReplacementAudit = (): RuntimeTerminationAudit | undefined =>
      [...replacementAttemptAudits.values()].at(-1)

    let fireReleaseDeadline!: () => void
    const releaseDeadline = new Promise<Readonly<{ kind: 'release-deadline' }>>(
      (resolve) => {
        fireReleaseDeadline = () =>
          resolve(Object.freeze({ kind: 'release-deadline' }))
      }
    )
    let fireOverallDeadline!: () => void
    const overallDeadline = new Promise<Readonly<{ kind: 'overall-deadline' }>>(
      (resolve) => {
        fireOverallDeadline = () =>
          resolve(Object.freeze({ kind: 'overall-deadline' }))
      }
    )
    const cancelReleaseDeadline = deadlineScheduler.scheduleDeadline(
      releaseBoundMs,
      fireReleaseDeadline
    )
    const cancelOverallDeadline = deadlineScheduler.scheduleDeadline(
      overallBoundMs,
      fireOverallDeadline
    )

    const installFailure = (
      failure: RuntimeFailure,
      snapshot: RuntimeSnapshot = restartingSnapshot,
      failureGeneration: symbol = generation,
      pendingAdmissionId?: string
    ): void => {
      if (entries.get(input.projectId) !== restarting)
        throw new RuntimeRestartInvariantError()
      operationSettled = true
      // Unrefusable by construction: the identity recheck above dominates this
      // install with no suspension between them, and close admission refuses a
      // `restarting` entry.
      if (
        !failEntry(
          input.projectId,
          current.canonicalPath,
          failureGeneration,
          snapshot,
          failure,
          startedAt,
          pendingAdmissionId
        )
      ) {
        throw new RuntimeRestartInvariantError()
      }
      emit({
        event: 'runtime.restart.failed',
        projectId: input.projectId,
        from: 'restarting',
        to: 'failed',
        elapsedMs: Math.max(0, now() - startedAt),
        classification: failure.category,
      })
    }

    const releaseFailure = (): RuntimeFailure =>
      new RuntimeFailure('restart-release-unconfirmed', {
        timeoutMs: releaseBoundMs,
      })

    const releaseFailureOutcome = (
      failure: RuntimeFailure,
      audit?: RuntimeTerminationAudit
    ): RuntimeRestartOutcome => {
      if (!phaseController.signal.aborted) phaseController.abort(failure)
      installFailure(
        failure,
        current.snapshot,
        current.generation,
        priorAdmission?.admissionId
      )
      return Object.freeze({
        outcome: 'rejected',
        projectId: input.projectId,
        category: 'release-unconfirmed',
        failureCategory: failure.category,
        ...(audit === undefined ? {} : { release: audit.outcome, audit }),
      })
    }

    const operation = Promise.resolve().then(
      async (): Promise<RuntimeRestartOutcome> => {
        const deadlineFailure = new RuntimeFailure(
          'restart-deadline-exceeded',
          { timeoutMs: overallBoundMs }
        )

        try {
          if (
            priorAdmission !== undefined ||
            quarantineForProject(input.projectId).length > 0
          ) {
            const releasePriorAdmission = async (): Promise<
              Readonly<{ kind: 'released' }>
            > => {
              await reclaimProjectQuarantine(input.projectId)
              const installedAdmission = pendingAdmissions.get(input.projectId)
              if (installedAdmission !== undefined) {
                await installedAdmission.resolution
                if (
                  installedAdmission.phase === 'absent-confirmed' ||
                  installedAdmission.phase === 'audited-absent'
                )
                  finishAdmission(installedAdmission)
              }
              if (quarantineForProject(input.projectId).length > 0)
                await new Promise<void>(() => undefined)
              return Object.freeze({ kind: 'released' })
            }
            const admissionResult = await Promise.race([
              releasePriorAdmission(),
              releaseDeadline,
              overallDeadline,
              phaseAbort.promise,
            ])
            if (admissionResult.kind === 'phase-aborted') {
              const failure =
                admissionResult.reason instanceof RuntimeFailure
                  ? admissionResult.reason
                  : new RuntimeFailure('manager-shutdown')
              installFailure(
                failure,
                current.snapshot,
                current.generation,
                priorAdmission?.admissionId
              )
              return Object.freeze({
                outcome: 'rejected',
                projectId: input.projectId,
                category:
                  failure.category === 'manager-shutdown'
                    ? 'manager-shutdown'
                    : 'release-unconfirmed',
                failureCategory: failure.category,
              })
            }
            if (
              admissionResult.kind === 'release-deadline' ||
              admissionResult.kind === 'overall-deadline'
            )
              return releaseFailureOutcome(releaseFailure())
          }

          let releaseAudit: RuntimeTerminationAudit | undefined
          if (priorReady !== undefined) {
            const release = priorReady.process.terminate(
              config.gracefulShutdownMs,
              config.forceShutdownMs,
              priorReady.port,
              phaseController.signal
            )
            const boundedRelease = release.then(
              (audit) => Object.freeze({ kind: 'audit' as const, audit }),
              (error: unknown) =>
                Object.freeze({ kind: 'release-fault' as const, error })
            )
            const releaseResult = await Promise.race([
              boundedRelease,
              releaseDeadline,
              overallDeadline,
              phaseAbort.promise,
            ])
            if (releaseResult.kind === 'phase-aborted') {
              void release.then(
                () => {
                  lateTerminationSettlements += 1
                },
                () => {
                  lateTerminationSettlements += 1
                }
              )
              const failure =
                releaseResult.reason instanceof RuntimeFailure
                  ? releaseResult.reason
                  : new RuntimeFailure('manager-shutdown')
              installFailure(
                failure,
                current.snapshot,
                current.generation,
                priorAdmission?.admissionId
              )
              return Object.freeze({
                outcome: 'rejected',
                projectId: input.projectId,
                category:
                  failure.category === 'manager-shutdown'
                    ? 'manager-shutdown'
                    : 'release-unconfirmed',
                failureCategory: failure.category,
              })
            }
            if (
              releaseResult.kind === 'release-deadline' ||
              releaseResult.kind === 'overall-deadline'
            ) {
              const failure = releaseFailure()
              phaseController.abort(failure)
              void release.then(
                () => {
                  lateTerminationSettlements += 1
                },
                () => {
                  lateTerminationSettlements += 1
                }
              )
              return releaseFailureOutcome(failure)
            }
            if (releaseResult.kind === 'release-fault') {
              const failure = releaseFailure()
              releaseFailureOutcome(failure)
              throw releaseResult.error
            }
            releaseAudit = releaseResult.audit
            recordCleanup(input.projectId, releaseAudit)
            if (!auditConfirmsAbsence(releaseAudit)) {
              return releaseFailureOutcome(
                new RuntimeFailure('restart-release-unconfirmed'),
                releaseAudit
              )
            }
            const priorKey = ownershipKey(priorReady)
            const priorRecord = ownership.get(priorKey)
            if (priorRecord?.generation === current.generation)
              ownership.delete(priorKey)
          }
          gateConfirmed = true
          cancelReleaseDeadline()
          if (phaseController.signal.aborted) {
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : new RuntimeFailure('manager-shutdown')
            installFailure(failure)
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                failure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: failure.category,
            })
          }

          const admission = createPendingAdmission(
            input.projectId,
            generation,
            current.canonicalPath,
            ownerToken
          )
          const restartOnOwned = (record: RuntimeOwnershipRecord): void => {
            const managed: ManagedOwnership = {
              projectId: input.projectId,
              generation,
              ...record,
            }
            const key = ownershipKey(record)
            admission.ownedReported = true
            admissionOwnedKeys(admission).add(key)
            if (
              !operationSettled &&
              entries.get(input.projectId) === restarting
            ) {
              registerOwnership(input.projectId, generation, record)
              return
            }
            quarantineOwnership(admission, managed)
          }
          const restartOnCleanup = (audit: RuntimeTerminationAudit): void => {
            const identityKey = [
              audit.pid,
              audit.processStartTime,
              audit.port,
            ].join(':')
            replacementAttemptAudits.set(
              identityKey,
              Object.freeze({ ...audit })
            )
            const quarantineEntry = quarantineForProject(input.projectId).find(
              ([, record]) =>
                record.admissionId === admission.admissionId &&
                ownershipKey(record) === identityKey
            )
            const owned = ownership.get(identityKey)
            const active =
              !operationSettled && entries.get(input.projectId) === restarting
            if (auditConfirmsAbsence(audit)) {
              if (owned?.generation === generation)
                ownership.delete(identityKey)
              if (quarantineEntry !== undefined)
                removeConfirmedQuarantine(
                  quarantineEntry[0],
                  quarantineEntry[1]
                )
              admissionOwnedKeys(admission).delete(identityKey)
              maybeFinishDetachedAdmission(admission)
              return
            }
            const record =
              owned?.generation === generation ? owned : quarantineEntry?.[1]
            if (record === undefined) throw new RuntimeRestartInvariantError()
            quarantineOwnership(
              admission,
              record,
              'audited-unconfirmed',
              1,
              audit
            )
            if (!active) return
            const failure = new RuntimeFailure(
              'restart-replacement-unconfirmed'
            )
            replacementBlockReason = failure
            phaseController.abort(failure)
          }

          const launchPromise = launch({
            config,
            canonicalPath: current.canonicalPath,
            ownerToken,
            signal: phaseController.signal,
            dependencies: processDependencies,
            onOwned: restartOnOwned,
            onCleanup: restartOnCleanup,
          })
          const launchResult = await Promise.race([
            launchPromise.then(
              (ready) => Object.freeze({ kind: 'ready' as const, ready }),
              (error: unknown) =>
                Object.freeze({ kind: 'failure' as const, error })
            ),
            overallDeadline,
            phaseAbort.promise,
          ])

          if (
            launchResult.kind === 'overall-deadline' ||
            launchResult.kind === 'phase-aborted'
          ) {
            if (launchResult.kind === 'overall-deadline')
              phaseController.abort(deadlineFailure)
            if (!gateConfirmed) return releaseFailureOutcome(releaseFailure())
            const settlementFailure =
              launchResult.kind === 'phase-aborted' &&
              launchResult.reason instanceof RuntimeFailure
                ? launchResult.reason
                : phaseController.signal.reason instanceof RuntimeFailure
                  ? phaseController.signal.reason
                  : deadlineFailure
            detachedAdmissionIds.add(admission.admissionId)
            for (const identityKey of [...admissionOwnedKeys(admission)]) {
              const record = ownership.get(identityKey)
              if (record !== undefined) quarantineOwnership(admission, record)
            }
            const replacementAudit = lastReplacementAudit()
            if (replacementAudit !== undefined)
              recordCleanup(input.projectId, replacementAudit)
            installFailure(
              settlementFailure,
              restartingSnapshot,
              generation,
              admission.admissionId
            )
            void launchPromise.then(
              async (ready) => {
                lateReplacementSettlements += 1
                const identityKey = ownershipKey(ready)
                if (!admissionOwnedKeys(admission).has(identityKey))
                  restartOnOwned(ready)
                const entry = quarantineForProject(input.projectId).find(
                  ([, record]) =>
                    record.admissionId === admission.admissionId &&
                    ownershipKey(record) === identityKey
                )
                if (entry !== undefined) await reclaimQuarantine(entry[0])
                maybeFinishDetachedAdmission(admission)
              },
              () => {
                lateReplacementSettlements += 1
                if (!admission.ownedReported) {
                  admission.phase = 'absent-confirmed'
                } else if (
                  admissionOwnedKeys(admission).size === 0 &&
                  quarantineForProject(input.projectId).every(
                    ([, record]) => record.admissionId !== admission.admissionId
                  )
                ) {
                  admission.phase = 'audited-absent'
                }
                maybeFinishDetachedAdmission(admission)
              }
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                settlementFailure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: settlementFailure.category,
              ...(releaseAudit === undefined
                ? {}
                : {
                    release: releaseAudit.outcome,
                    audit: releaseAudit,
                  }),
            })
          }

          if (launchResult.kind === 'failure') {
            for (const identityKey of [...admissionOwnedKeys(admission)]) {
              const record = ownership.get(identityKey)
              if (record !== undefined) quarantineOwnership(admission, record)
            }
            if (
              admissionOwnedKeys(admission).size === 0 &&
              quarantineForProject(input.projectId).every(
                ([, record]) => record.admissionId !== admission.admissionId
              )
            )
              admission.phase = admission.ownedReported
                ? 'audited-absent'
                : 'absent-confirmed'
            resolveAdmission(admission)
            maybeFinishDetachedAdmission(admission)
            const replacementAudit = lastReplacementAudit()
            if (replacementAudit !== undefined)
              recordCleanup(input.projectId, replacementAudit)
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : (replacementBlockReason ??
                  (launchResult.error instanceof RuntimeFailure
                    ? launchResult.error
                    : undefined))
            if (failure === undefined) {
              installFailure(
                new RuntimeFailure('spawn-error'),
                restartingSnapshot,
                generation,
                pendingAdmissions.get(input.projectId)?.admissionId
              )
              throw launchResult.error
            }
            installFailure(
              failure,
              restartingSnapshot,
              generation,
              pendingAdmissions.get(input.projectId)?.admissionId
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category: 'replacement-failed',
              failureCategory: failure.category,
              ...(releaseAudit === undefined
                ? {}
                : {
                    release: releaseAudit.outcome,
                    audit: releaseAudit,
                  }),
            })
          }

          const ready = launchResult.ready
          const replacementKey = ownershipKey(ready)
          if (!admissionOwnedKeys(admission).has(replacementKey))
            restartOnOwned(ready)
          if (
            shuttingDown ||
            phaseController.signal.reason instanceof RuntimeFailure
          ) {
            detachedAdmissionIds.add(admission.admissionId)
            const record = ownership.get(replacementKey)
            if (record !== undefined)
              await reclaimQuarantine(quarantineOwnership(admission, record))
            const failure =
              phaseController.signal.reason instanceof RuntimeFailure
                ? phaseController.signal.reason
                : new RuntimeFailure('manager-shutdown')
            installFailure(
              failure,
              restartingSnapshot,
              generation,
              pendingAdmissions.get(input.projectId)?.admissionId
            )
            return Object.freeze({
              outcome: 'rejected',
              projectId: input.projectId,
              category:
                failure.category === 'manager-shutdown'
                  ? 'manager-shutdown'
                  : 'replacement-failed',
              failureCategory: failure.category,
            })
          }

          const replacementAudit = lastReplacementAudit()
          if (replacementAudit !== undefined)
            recordCleanup(input.projectId, replacementAudit)
          admissionOwnedKeys(admission).delete(replacementKey)
          admission.phase = 'absent-confirmed'
          finishAdmission(admission)
          const snapshot = freezeSnapshot({
            projectId: input.projectId,
            state: 'running',
            pid: ready.process.pid,
            processStartTime: ready.process.processStartTime,
            internalUrl: ready.internalUrl,
            port: ready.port,
            canonicalPath: current.canonicalPath,
            stableRoute,
            ownerToken,
            startedAt,
            elapsedMs: Math.max(0, now() - startedAt),
          })
          const entry: RunningEntry = {
            state: 'running',
            projectId: input.projectId,
            canonicalPath: current.canonicalPath,
            generation,
            ready,
            snapshot,
          }
          if (entries.get(input.projectId) !== restarting)
            throw new RuntimeRestartInvariantError()
          operationSettled = true
          if (!installEntry(input.projectId, entry))
            throw new RuntimeRestartInvariantError()
          emit({
            event: 'runtime.restart.succeeded',
            projectId: input.projectId,
            from: 'restarting',
            to: 'running',
            elapsedMs: snapshot.elapsedMs,
          })
          const exitTask = ready.process.exit.then(async (exit) => {
            const failure = new RuntimeFailure(
              exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
              exit.signal === null
                ? { exitCode: exit.code ?? -1 }
                : { signal: exit.signal }
            )
            await transitionRunningToFailed(entry, failure, 'audit')
          })
          backgroundTasks.add(exitTask)
          void exitTask.then(
            () => {
              backgroundTasks.delete(exitTask)
              backgroundTaskSettlements += 1
            },
            () => {
              backgroundTasks.delete(exitTask)
              backgroundTaskSettlements += 1
            }
          )
          return Object.freeze({
            outcome: 'restarted',
            projectId: input.projectId,
            ...(priorReady === undefined
              ? {}
              : { priorIdentity: runtimeIdentity(priorReady) }),
            replacementIdentity: runtimeIdentity(ready),
            ...(releaseAudit === undefined
              ? {}
              : {
                  release: releaseAudit.outcome,
                  audit: releaseAudit,
                }),
          })
        } finally {
          phaseAbort.cancel()
          cancelReleaseDeadline()
          cancelOverallDeadline()
        }
      }
    )

    restarting = {
      state: 'restarting',
      projectId: input.projectId,
      canonicalPath: current.canonicalPath,
      generation,
      snapshot: restartingSnapshot,
      operation,
      controller: phaseController,
    }
    // Unrefusable by construction: the close-claim and retirement refusals above
    // are evaluated in this same synchronous section as the entry read.
    if (!installEntry(input.projectId, restarting))
      throw new RuntimeRestartInvariantError()
    emit({
      event: 'runtime.restart.requested',
      projectId: input.projectId,
      from: current.state,
      to: 'restarting',
      elapsedMs: Math.max(0, now() - current.snapshot.startedAt),
    })
    restartTasks.add(operation)
    void operation.then(
      () => restartTasks.delete(operation),
      () => restartTasks.delete(operation)
    )
    return operation
  }

  const ownershipRecordsFor = (
    projectId: string
  ): readonly [string, ManagedOwnership][] =>
    [...ownership.entries()].filter(
      ([, record]) => record.projectId === projectId
    )

  const proxyAuditIsClear = (audit: WorkbenchProxyAudit): boolean =>
    audit.pendingOperations === 0 &&
    audit.upstreamHttpRequests === 0 &&
    audit.upstreamHttpResponses === 0 &&
    audit.rawSockets === 0 &&
    audit.webSockets === 0

  const closeRejection = (
    projectId: string,
    category: RuntimeCloseRejectionCategory,
    audits: readonly RuntimeTerminationAudit[] = [],
    failureCategory?: RuntimeFailure['category']
  ): RuntimeCloseOutcome =>
    Object.freeze({
      outcome: 'rejected' as const,
      projectId,
      category,
      ...(failureCategory === undefined ? {} : { failureCategory }),
      ...(audits.length === 0 ? {} : { audits: Object.freeze([...audits]) }),
    })

  const closeSignal = <Kind extends string>(
    kind: Kind
  ): Readonly<{
    promise: Promise<Readonly<{ kind: Kind }>>
    fire: () => void
  }> => {
    let fire!: () => void
    const promise = new Promise<Readonly<{ kind: Kind }>>((resolve) => {
      fire = () => resolve(Object.freeze({ kind }))
    })
    return Object.freeze({ promise, fire })
  }

  const runClose = async (
    input: ProjectRuntimeCloseInput,
    claim: CloseClaim,
    requiresQuarantineResolution: boolean
  ): Promise<RuntimeCloseOutcome> => {
    const projectId = input.projectId
    const audits: RuntimeTerminationAudit[] = []
    const releasedKeys = new Set<string>()
    const drainController = new AbortController()
    const phaseAbort = abortedPromise(claim.controller.signal)
    const drainDeadline = closeSignal('drain-deadline')
    const releaseDeadline = closeSignal('release-deadline')
    const overallDeadline = closeSignal('overall-deadline')
    // One drain deadline covers both permitted drains; the release and overall
    // deadlines are cardinality-aware through the frozen, validated sweep units.
    const cancelDrainDeadline = deadlineScheduler.scheduleDeadline(
      config.closeDrainAllowanceMs,
      () => {
        drainController.abort(new RuntimeFailure('close-release-unconfirmed'))
        drainDeadline.fire()
      }
    )
    const cancelReleaseDeadline = deadlineScheduler.scheduleDeadline(
      runtimeCloseReleaseBoundMs(
        config,
        requiresQuarantineResolution,
        claim.sweepUnits
      ),
      releaseDeadline.fire
    )
    const cancelOverallDeadline = deadlineScheduler.scheduleDeadline(
      runtimeCloseOverallBoundMs(
        config,
        requiresQuarantineResolution,
        claim.sweepUnits
      ),
      () => {
        drainController.abort(new RuntimeFailure('close-release-unconfirmed'))
        overallDeadline.fire()
      }
    )

    /** Retains the runtime as an unconfirmed release. A claimed `running`
     * subject is the only truthful running-to-failed transition in the close
     * region, so it is the only one that emits. */
    const installCloseFailure = (): void => {
      const installed = entries.get(projectId)
      const subject =
        installed !== undefined &&
        claim.installedRegisteredEntry !== undefined &&
        Object.is(installed, claim.installedRegisteredEntry)
          ? claim.claimedEntry
          : installed
      if (subject === undefined) return
      if (subject.state !== 'running' && subject.state !== 'failed') return
      const failure = new RuntimeFailure('close-release-unconfirmed')
      const reported = failEntry(
        projectId,
        subject.canonicalPath,
        subject.generation,
        subject.snapshot,
        failure,
        subject.snapshot.startedAt,
        undefined,
        claim
      )
      if (!reported || subject.state !== 'running') return
      emit({
        event: 'runtime.health.changed',
        projectId,
        from: 'running',
        to: 'failed',
        elapsedMs: Math.max(0, now() - subject.snapshot.startedAt),
        classification: failure.category,
      })
    }

    const unconfirmed = (): RuntimeCloseOutcome => {
      installCloseFailure()
      return closeRejection(
        projectId,
        'release-unconfirmed',
        audits,
        'close-release-unconfirmed'
      )
    }

    const drain = (): Promise<
      | Readonly<{ kind: 'drained'; audit: WorkbenchProxyAudit }>
      | Readonly<{ kind: 'drain-faulted'; error: unknown }>
      | Readonly<{ kind: 'drain-deadline' }>
      | Readonly<{ kind: 'overall-deadline' }>
      | Readonly<{ kind: 'phase-aborted'; reason: unknown }>
    > =>
      Promise.race([
        input.drainConnections(drainController.signal).then(
          (audit) => Object.freeze({ kind: 'drained' as const, audit }),
          (error) => Object.freeze({ kind: 'drain-faulted' as const, error })
        ),
        drainDeadline.promise,
        overallDeadline.promise,
        phaseAbort.promise,
      ])

    const releaseOwnership = async (
      record: Pick<ManagedOwnership, 'process' | 'port'>,
      key: string
    ): Promise<RuntimeTerminationAudit> => {
      const audit = await record.process.terminate(
        config.gracefulShutdownMs,
        config.forceShutdownMs,
        record.port,
        claim.controller.signal
      )
      recordCleanup(projectId, audit)
      audits.push(audit)
      releasedKeys.add(key)
      if (auditConfirmsAbsence(audit)) ownership.delete(key)
      return audit
    }

    try {
      const drained = await drain()
      if (shuttingDown)
        return closeRejection(projectId, 'manager-shutdown', audits)
      if (drained.kind === 'drain-faulted') throw drained.error
      if (drained.kind !== 'drained' || !proxyAuditIsClear(drained.audit))
        return unconfirmed()

      const resolveAdmissions = async (): Promise<
        Readonly<{ kind: 'resolved' }>
      > => {
        await reclaimProjectQuarantine(projectId)
        const installedAdmission = pendingAdmissions.get(projectId)
        if (installedAdmission !== undefined) {
          await installedAdmission.resolution
          if (
            installedAdmission.phase === 'absent-confirmed' ||
            installedAdmission.phase === 'audited-absent'
          )
            finishAdmission(installedAdmission)
        }
        return Object.freeze({ kind: 'resolved' as const })
      }
      const admissionResult = await Promise.race([
        resolveAdmissions(),
        releaseDeadline.promise,
        overallDeadline.promise,
        phaseAbort.promise,
      ])
      if (shuttingDown)
        return closeRejection(projectId, 'manager-shutdown', audits)
      if (admissionResult.kind !== 'resolved') return unconfirmed()

      const claimedRuntime = entries.get(projectId)
      if (
        claimedRuntime !== undefined &&
        (claimedRuntime.state === 'running' ||
          claimedRuntime.state === 'failed')
      ) {
        const ready = ownedReadyFor(claimedRuntime)
        if (ready !== undefined)
          await releaseOwnership(ready, ownershipKey(ready))
      }
      if (shuttingDown)
        return closeRejection(projectId, 'manager-shutdown', audits)

      // Sweep every remaining frozen ownership record for this project,
      // including multi-ownership with no quarantined identity. Peers are never
      // read, probed, or signalled.
      for (const [key, record] of ownershipRecordsFor(projectId)) {
        if (releasedKeys.has(key)) continue
        const recordedAudit = cleanupOutcomes.get(projectId)
        if (
          recordedAudit !== undefined &&
          [
            recordedAudit.pid,
            recordedAudit.processStartTime,
            recordedAudit.port,
          ].join(':') === key &&
          auditConfirmsAbsence(recordedAudit)
        ) {
          audits.push(recordedAudit)
          releasedKeys.add(key)
          ownership.delete(key)
          continue
        }
        await releaseOwnership(record, key)
        if (shuttingDown)
          return closeRejection(projectId, 'manager-shutdown', audits)
      }

      let observed = input.auditConnections()
      if (!proxyAuditIsClear(observed)) {
        const redrained = await drain()
        if (shuttingDown)
          return closeRejection(projectId, 'manager-shutdown', audits)
        if (redrained.kind === 'drain-faulted') throw redrained.error
        if (redrained.kind !== 'drained') return unconfirmed()
        observed = input.auditConnections()
      }

      const currentEntry = entries.get(projectId)
      const liveConnectionsClear = proxyAuditIsClear(observed)
      const ownershipClear = ownershipRecordsFor(projectId).length === 0
      const quarantineClear = quarantineForProject(projectId).length === 0
      const pendingClear = !pendingAdmissions.has(projectId)
      const lifecycleClear =
        (currentEntry === undefined ||
          currentEntry.state === 'registered' ||
          currentEntry.state === 'running' ||
          currentEntry.state === 'failed') &&
        pendingClear &&
        claim.lateWork === 0
      const releaseAuditsConfirm = audits.every((audit) =>
        auditConfirmsAbsence(audit)
      )
      const generationIdentity =
        Object.is(currentEntry, claim.claimedEntry) ||
        (claim.installedRegisteredEntry !== undefined &&
          Object.is(currentEntry, claim.installedRegisteredEntry))
      const notRetired = !retiredProjects.has(projectId)
      if (!(
        liveConnectionsClear &&
        ownershipClear &&
        quarantineClear &&
        pendingClear &&
        lifecycleClear &&
        releaseAuditsConfirm &&
        generationIdentity &&
        notRetired
      ))
        return unconfirmed()
      claim.sealed = true
      const removal = input.commitRemoval()
      const releasedGenerations = releasedKeys.size
      const disposition = await removal.then(
        (result) => Object.freeze({ kind: 'settled' as const, result }),
        (error) => Object.freeze({ kind: 'faulted' as const, error })
      )
      if (disposition.kind === 'faulted') {
        // Clause 7 already proved the current entry is the one this close
        // claimed, so a project that had no entry keeps having none.
        if (currentEntry !== undefined) {
          const releasedEntry: RegisteredEntry = {
            state: 'registered',
            projectId,
            canonicalPath: currentEntry.canonicalPath,
            released: true,
          }
          claim.sealed = false
          if (installEntry(projectId, releasedEntry, claim))
            claim.installedRegisteredEntry = releasedEntry
        }
        return closeRejection(projectId, 'removal-failed', audits)
      }
      retireProject(projectId)
      return disposition.result.disposition === 'closed'
        ? Object.freeze({
            outcome: 'closed' as const,
            projectId,
            releasedGenerations,
            ...(audits.length === 0
              ? {}
              : { audits: Object.freeze([...audits]) }),
          })
        : Object.freeze({
            outcome: 'already-absent' as const,
            projectId,
            released: releasedGenerations > 0,
          })
    } catch (error) {
      // A fault leaves the runtime exactly as an unconfirmed release and is
      // then surfaced; it is never reported as a settled close.
      if (shuttingDown)
        return closeRejection(projectId, 'manager-shutdown', audits)
      installCloseFailure()
      throw error
    } finally {
      phaseAbort.cancel()
      cancelDrainDeadline()
      cancelReleaseDeadline()
      cancelOverallDeadline()
    }
  }

  const close = async (
    input: ProjectRuntimeCloseInput
  ): Promise<RuntimeCloseOutcome> => {
    const projectId = input.projectId
    if (shuttingDown) return closeRejection(projectId, 'manager-shutdown')
    const persisted = await dependencies.findProjectById(projectId)
    if (shuttingDown) return closeRejection(projectId, 'manager-shutdown')
    if (persisted === undefined) {
      return Object.freeze({
        outcome: 'already-absent' as const,
        projectId,
        released: retiredProjects.has(projectId),
      })
    }
    const contended = closeClaims.get(projectId)
    if (contended !== undefined) {
      const winner = await contended.settlement
      return winner.outcome === 'closed'
        ? Object.freeze({
            outcome: 'already-absent' as const,
            projectId,
            released: true,
          })
        : winner
    }
    const current = entries.get(projectId)
    if (current?.state === 'reconciling')
      return closeRejection(projectId, 'reconcile-in-progress')
    if (
      current?.state === 'failed' &&
      current.failure.category === 'reconcile-unconfirmed'
    )
      return closeRejection(projectId, 'reconcile-unresolved')
    if (current?.state === 'starting')
      return closeRejection(projectId, 'start-in-progress')
    if (current?.state === 'restarting')
      return closeRejection(projectId, 'restart-in-progress')
    if (current?.state === 'stopping')
      return closeRejection(projectId, 'stop-in-progress')

    // One synchronous section: read the entry, install the claim, and freeze the
    // ownership cardinality with no suspension in between.
    let settleClaim!: (outcome: RuntimeCloseOutcome) => void
    let faultClaim!: (error: unknown) => void
    const settlement = new Promise<RuntimeCloseOutcome>((resolve, reject) => {
      settleClaim = resolve
      faultClaim = reject
    })
    void settlement.catch(() => undefined)
    const claim: CloseClaim = {
      projectId,
      controller: new AbortController(),
      settlement,
      claimedEntry: current,
      installedRegisteredEntry: undefined,
      frozenOwnershipCardinality: 0,
      sweepUnits: 1,
      lateWork: 0,
      sealed: false,
    }
    closeClaims.set(projectId, claim)
    claim.frozenOwnershipCardinality = ownershipRecordsFor(projectId).length
    const requiresQuarantineResolution =
      pendingAdmissions.has(projectId) ||
      quarantineForProject(projectId).length > 0
    if (claim.frozenOwnershipCardinality > config.closeOwnershipSweepCap) {
      closeClaims.delete(projectId)
      const refused = closeRejection(
        projectId,
        'ownership-cardinality-exceeded'
      )
      settleClaim(refused)
      return refused
    }
    claim.sweepUnits = Math.max(1, claim.frozenOwnershipCardinality)
    if (closeClaims.get(projectId) !== claim)
      throw new RuntimeCloseInvariantError()

    const task = (async (): Promise<RuntimeCloseOutcome> => {
      try {
        const outcome = await runClose(
          input,
          claim,
          requiresQuarantineResolution
        )
        settleClaim(outcome)
        return outcome
      } catch (error) {
        faultClaim(error)
        throw error
      } finally {
        if (closeClaims.get(projectId) === claim) closeClaims.delete(projectId)
      }
    })()
    closeTasks.add(task)
    void task.then(
      () => closeTasks.delete(task),
      () => closeTasks.delete(task)
    )
    return task
  }

  const start = async (
    input: ProjectRuntimeStartInput
  ): Promise<RuntimeSnapshot> => {
    if (input.signal?.aborted) throw new RuntimeFailure('caller-cancelled')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const persisted = await dependencies.findProjectById(input.projectId)
    if (persisted === undefined) throw new RuntimeFailure('unknown-project')
    if (persisted.canonicalPath !== input.canonicalPath)
      throw new RuntimeFailure('canonical-path-invariant')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    const admissionRefusal = entryInstallRefusal(input.projectId)
    if (admissionRefusal !== undefined)
      throw refuseAcquisition(admissionRefusal)

    let current = entries.get(input.projectId)
    if (current?.state === 'reconciling') {
      await waitForReconciliation(current, input.signal)
      const reconciledRefusal = entryInstallRefusal(input.projectId)
      if (reconciledRefusal !== undefined)
        throw refuseAcquisition(reconciledRefusal)
      current = entries.get(input.projectId)
    }
    if (
      current?.state === 'failed' &&
      current.failure.category === 'reconcile-unconfirmed'
    ) {
      throw current.failure
    }
    register(input.projectId, input.canonicalPath)
    current = entries.get(input.projectId)
    if (current?.state === 'starting') {
      const joined = await waitForStarting(current, input.signal)
      const joinRefusal = entryInstallRefusal(input.projectId)
      if (joinRefusal !== undefined) throw refuseAcquisition(joinRefusal)
      return joined
    }

    if (current?.state === 'running') {
      const alive = await current.ready.process.isAlive()
      const livenessCloseRefusal = entryInstallRefusal(current.projectId)
      if (livenessCloseRefusal !== undefined)
        throw refuseAcquisition(livenessCloseRefusal)
      const livenessOwnershipFailure = reuseOwnershipFailure(current)
      if (livenessOwnershipFailure !== undefined) throw livenessOwnershipFailure
      if (alive) {
        const healthController = new AbortController()
        const verdict = await processDependencies.health.check(
          current.ready.internalUrl + PROJECT_RUNTIME_DEFAULTS.healthPath,
          config.healthAttemptTimeoutMs,
          healthController.signal
        )
        const healthCloseRefusal = entryInstallRefusal(current.projectId)
        if (healthCloseRefusal !== undefined)
          throw refuseAcquisition(healthCloseRefusal)
        const healthOwnershipFailure = reuseOwnershipFailure(current)
        if (healthOwnershipFailure !== undefined) throw healthOwnershipFailure
        if (
          verdict.status === PROJECT_RUNTIME_DEFAULTS.healthStatus &&
          verdict.bodyStatus !== null &&
          PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses.includes(
            verdict.bodyStatus as 'alive' | 'expired'
          )
        ) {
          if (input.signal?.aborted)
            throw new RuntimeFailure('caller-cancelled')
          const reuseRefusal = entryInstallRefusal(current.projectId)
          if (reuseRefusal !== undefined) throw refuseAcquisition(reuseRefusal)
          return current.snapshot
        }
        const failure = new RuntimeFailure(
          verdict.status !== PROJECT_RUNTIME_DEFAULTS.healthStatus
            ? 'health-status-unexpected'
            : 'health-body-unexpected',
          verdict.status === null ? {} : { healthStatus: verdict.status }
        )
        const result = await transitionRunningToFailed(
          current,
          failure,
          'terminate'
        )
        throw result.failure
      }
      const failure = current.adopted
        ? new RuntimeFailure('reconcile-unconfirmed')
        : new RuntimeFailure('early-exit-code', { exitCode: -1 })
      const result = await transitionRunningToFailed(
        current,
        failure,
        current.adopted ? 'audit' : 'terminate'
      )
      throw result.failure
    }
    if (current?.state === 'stopping')
      throw new RuntimeFailure('runtime-stopping')
    if (current?.state === 'restarting')
      throw new RuntimeFailure('runtime-restarting')

    const generation = Symbol(input.projectId)
    const controller = new AbortController()
    const startedAt = now()
    const stableRoute = stableProjectRoute(input.projectId)
    const ownerToken = deriveProjectOwnerToken(input.projectId)
    const startingSnapshot = freezeSnapshot({
      projectId: input.projectId,
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: input.canonicalPath,
      stableRoute,
      ownerToken,
      startedAt,
      elapsedMs: 0,
    })
    emit({
      event: 'runtime.start.requested',
      projectId: input.projectId,
      from: current?.state === 'failed' ? 'failed' : 'stopped',
      to: 'starting',
      elapsedMs: 0,
    })

    let starting!: StartingEntry
    const operation = Promise.resolve().then(async () => {
      try {
        const ready = await launch({
          config,
          canonicalPath: input.canonicalPath,
          ownerToken,
          signal: controller.signal,
          dependencies: processDependencies,
          onOwned: (record) =>
            registerOwnership(input.projectId, generation, record),
          onCleanup: (audit) => recordCleanup(input.projectId, audit),
        })
        registerOwnership(input.projectId, generation, ready)
        if (shuttingDown || controller.signal.aborted) {
          recordCleanup(
            input.projectId,
            await ready.process.terminate(
              config.gracefulShutdownMs,
              config.forceShutdownMs,
              ready.port
            )
          )
          throw new RuntimeFailure(
            shuttingDown ? 'manager-shutdown' : 'caller-cancelled'
          )
        }
        const snapshot = freezeSnapshot({
          projectId: input.projectId,
          state: 'running',
          pid: ready.process.pid,
          processStartTime: ready.process.processStartTime,
          internalUrl: ready.internalUrl,
          port: ready.port,
          canonicalPath: input.canonicalPath,
          stableRoute,
          ownerToken,
          startedAt,
          elapsedMs: Math.max(0, now() - startedAt),
        })
        const entry: RunningEntry = {
          state: 'running',
          projectId: input.projectId,
          canonicalPath: input.canonicalPath,
          generation,
          ready,
          snapshot,
        }
        if (!installEntry(input.projectId, entry)) {
          throw (
            entryInstallRefusal(input.projectId) ??
            new RuntimeFailure('runtime-closing')
          )
        }
        emit({
          event: 'runtime.start.succeeded',
          projectId: input.projectId,
          from: 'starting',
          to: 'running',
          elapsedMs: snapshot.elapsedMs,
        })
        const exitTask = ready.process.exit.then(async (exit) => {
          const failure = new RuntimeFailure(
            exit.signal === null ? 'early-exit-code' : 'early-exit-signal',
            exit.signal === null
              ? { exitCode: exit.code ?? -1 }
              : { signal: exit.signal }
          )
          await transitionRunningToFailed(entry, failure, 'audit')
        })
        backgroundTasks.add(exitTask)
        void exitTask.then(
          () => {
            backgroundTasks.delete(exitTask)
            backgroundTaskSettlements += 1
          },
          () => {
            backgroundTasks.delete(exitTask)
            backgroundTaskSettlements += 1
          }
        )
        return snapshot
      } catch (error) {
        const failure =
          error instanceof RuntimeFailure
            ? error
            : new RuntimeFailure('spawn-error')
        let reported = false
        if (!shuttingDown) {
          reported = failEntry(
            input.projectId,
            input.canonicalPath,
            generation,
            startingSnapshot,
            failure,
            startedAt
          )
        }
        if (reported || shuttingDown) {
          emit({
            event: 'runtime.start.failed',
            projectId: input.projectId,
            from: 'starting',
            to: 'failed',
            elapsedMs: Math.max(0, now() - startedAt),
            classification: failure.category,
          })
        }
        throw failure
      }
    })
    completionTasks.add(operation)
    void operation.then(
      () => {
        completionTasks.delete(operation)
        completionTaskSettlements += 1
      },
      () => {
        completionTasks.delete(operation)
        completionTaskSettlements += 1
      }
    )
    starting = {
      state: 'starting',
      projectId: input.projectId,
      canonicalPath: input.canonicalPath,
      generation,
      controller,
      snapshot: startingSnapshot,
      operation,
      waiters: new Set(),
    }
    // Unrefusable by construction: `register` above evaluated the same refusal
    // in this synchronous section, so no claim, seal, or tombstone can appear.
    if (!installEntry(input.projectId, starting))
      throw new RuntimeCloseInvariantError()
    return waitForStarting(starting, input.signal)
  }

  const shutdown = (): Promise<RuntimeShutdownResult> => {
    shutdownPromise ??= (async () => {
      shuttingDown = true
      if (reconciliationController !== undefined) {
        reconciliationPhase = 'aborted'
        reconciliationController.abort(new RuntimeFailure('manager-shutdown'))
        settlePendingReconciliations('manager-shutdown')
      }
      // In-flight closes settle as `manager-shutdown` and release their claims
      // before the ownership sweep reads any state they could still mutate.
      while (closeTasks.size > 0) {
        for (const claim of closeClaims.values())
          claim.controller.abort(new RuntimeFailure('manager-shutdown'))
        await Promise.allSettled([...closeTasks])
      }
      const entriesAtShutdown = [...entries.values()]
      for (const entry of entriesAtShutdown)
        if (entry.state === 'starting' || entry.state === 'restarting')
          entry.controller.abort(new RuntimeFailure('manager-shutdown'))
      await Promise.allSettled([...restartTasks])
      const terminationOutcomes = new Map<string, RuntimeTerminationAudit>()
      await Promise.all(
        entriesAtShutdown.map(async (entry) => {
          if (entry.state !== 'running') return
          const audit = await entry.ready.process.terminate(
            config.gracefulShutdownMs,
            config.forceShutdownMs,
            entry.ready.port
          )
          terminationOutcomes.set(ownershipKey(entry.ready), audit)
          recordCleanup(entry.projectId, audit)
        })
      )
      await Promise.allSettled(
        entriesAtShutdown
          .filter((entry): entry is StartingEntry => entry.state === 'starting')
          .map((entry) => entry.operation)
      )
      await Promise.allSettled([...stopTasks])
      for (const record of ownership.values()) {
        const key = ownershipKey(record)
        if (terminationOutcomes.has(key)) continue
        const prior = cleanupOutcomes.get(record.projectId)
        if (
          prior !== undefined &&
          [prior.pid, prior.processStartTime, prior.port].join(':') === key &&
          prior.processAbsent &&
          prior.processGroupAbsent &&
          prior.listenerAbsent
        ) {
          terminationOutcomes.set(key, prior)
          continue
        }
        const audit = await record.process.terminate(
          config.gracefulShutdownMs,
          config.forceShutdownMs,
          record.port
        )
        terminationOutcomes.set(key, audit)
        recordCleanup(record.projectId, audit)
      }
      const audited: ProjectRuntimeTerminationAudit[] = []
      for (const [key, record] of ownership) {
        const resource: RuntimeResourceAudit = await record.process.audit(
          record.port
        )
        const termination = terminationOutcomes.get(key)
        audited.push(
          Object.freeze({
            ...resource,
            outcome: termination?.outcome ?? 'already-absent',
            projectToken: deriveProjectOwnerToken(record.projectId),
          })
        )
      }
      for (const [key, record] of quarantinedOwnership) {
        await reclaimQuarantine(key)
        const audit = quarantineCleanups.get(key)
        if (audit !== undefined)
          audited.push(
            Object.freeze({
              ...audit,
              projectToken: deriveProjectOwnerToken(record.projectId),
            })
          )
      }
      // Completion operations can register ownership, and process-exit handlers can
      // mutate entries. Await both tracked sets until their own settlement
      // handlers remove every task; zero is observed rather than assigned.
      while (completionTasks.size > 0 || backgroundTasks.size > 0) {
        await Promise.allSettled([...completionTasks, ...backgroundTasks])
        await Promise.resolve()
      }
      for (const entry of entriesAtShutdown)
        if (entries.get(entry.projectId) === entry || shuttingDown)
          entries.delete(entry.projectId)
      for (const key of ownership.keys()) ownership.delete(key)
      for (const admission of [...pendingAdmissions.values()]) {
        if (
          admission.phase !== 'launch-pending' &&
          quarantineForProject(admission.projectId).length === 0
        ) {
          admission.phase = admission.ownedReported
            ? 'audited-absent'
            : 'absent-confirmed'
          finishAdmission(admission)
        }
      }
      const unresolvedAdmissions = Object.freeze(
        [...pendingAdmissions.values()].map((admission) =>
          Object.freeze({
            projectToken: deriveProjectOwnerToken(admission.projectId),
            admissionId: admission.admissionId,
            phase: admission.phase,
          })
        )
      )
      shutdownResult = Object.freeze({
        status:
          audited.every((audit) => auditConfirmsAbsence(audit)) &&
          unresolvedAdmissions.length === 0 &&
          quarantinedOwnership.size === 0
            ? 'ok'
            : 'failed',
        audits: Object.freeze(audited),
        unresolvedAdmissions,
      })
      return shutdownResult
    })()
    return shutdownPromise
  }

  return {
    beginReconciliation,
    inspectReconciliation,
    register,
    start,
    stop,
    restart,
    close,
    reportPublicStates(projectIds) {
      return Object.freeze(
        projectIds.map((projectId) => {
          const entry = entries.get(projectId)
          const state = publicRuntimeState(entry?.state)
          return Object.freeze({
            projectId,
            state,
            ...(state === 'Failed' && entry?.state === 'failed'
              ? { failureCategory: entry.failure.category }
              : {}),
          })
        })
      )
    },
    inspect(projectId) {
      const entry = entries.get(projectId)
      return entry !== undefined && entry.state !== 'registered'
        ? entry.snapshot
        : undefined
    },
    ownsSnapshot(snapshot) {
      const entry = entries.get(snapshot.projectId)
      return entry?.state === 'running' && entry.snapshot === snapshot
    },
    inspectEntries() {
      return Object.freeze(
        [...entries.values()].map((entry) =>
          Object.freeze({
            projectId: entry.projectId,
            projectToken: deriveProjectOwnerToken(entry.projectId),
            canonicalPath: entry.canonicalPath,
            state: entry.state,
            ...(entry.state === 'registered'
              ? {}
              : { snapshot: entry.snapshot }),
            ...(entry.state === 'failed' &&
            entry.pendingAdmissionId !== undefined
              ? {
                  pendingAdmissionId: entry.pendingAdmissionId,
                  ...(pendingAdmissions.get(entry.projectId)?.phase ===
                  undefined
                    ? {}
                    : {
                        pendingAdmissionPhase: pendingAdmissions.get(
                          entry.projectId
                        )!.phase,
                      }),
                }
              : {}),
            waiterCount: entry.state === 'starting' ? entry.waiters.size : 0,
          })
        )
      )
    },
    audit() {
      return Object.freeze({
        shuttingDown,
        entryCount: entries.size,
        startingEntries: [...entries.values()].filter(
          (entry) => entry.state === 'starting'
        ).length,
        ownershipRecords: ownership.size,
        completionTasks: completionTasks.size,
        backgroundTasks: backgroundTasks.size,
        stopTasks: stopTasks.size,
        restartTasks: restartTasks.size,
        pendingAdmissions: pendingAdmissions.size,
        quarantinedOwnershipRecords: quarantinedOwnership.size,
        quarantineCleanupRecords: quarantineCleanups.size,
        admissionResolutions,
        completionTaskSettlements,
        backgroundTaskSettlements,
        lateTerminationSettlements,
        lateReplacementSettlements,
        closeTasks: closeTasks.size,
        closeClaims: Object.freeze(
          [...closeClaims.values()].map((claim) =>
            Object.freeze({
              projectId: claim.projectId,
              projectToken: deriveProjectOwnerToken(claim.projectId),
              frozenOwnershipCardinality: claim.frozenOwnershipCardinality,
              sweepUnits: claim.sweepUnits,
              lateWork: claim.lateWork,
              sealed: claim.sealed,
            })
          )
        ),
        retiredProjects: retiredProjects.size,
        lateCloseSettlements,
        refusedLateAcquisitions,
      })
    },
    lastFailure(projectId) {
      const entry = entries.get(projectId)
      return entry?.state === 'failed' ? entry.failure : undefined
    },
    lastCleanup(projectId) {
      return cleanupOutcomes.get(projectId)
    },
    lastShutdown() {
      return shutdownResult
    },
    shutdown,
  }
}
