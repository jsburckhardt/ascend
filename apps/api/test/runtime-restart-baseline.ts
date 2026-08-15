import { createHash } from 'node:crypto'

import {
  BL018_ATTRIBUTION_CLAIM,
  BL018_PRODUCTION_DEFAULT_BOUNDS,
  BL018_SCENARIOS,
  type Bl018Scenario,
  type RuntimeRestartEvidenceRow,
  type RuntimeRestartMatrix,
} from '../src/runtime-restart-evidence.js'

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

/**
 * A schema-complete, validator-clean matrix used by the T-8 unit tests to
 * prove one rejection per validator rule. It is a declared fixture, not
 * executed evidence: the committed acceptance artifact is produced by the
 * executed matrix run.
 */
export function baselineRow(
  scenario: Bl018Scenario
): RuntimeRestartEvidenceRow {
  const bounds = BL018_PRODUCTION_DEFAULT_BOUNDS
  const pair = {
    before: digest(scenario),
    after: digest(scenario),
  }
  return {
    scenario,
    executionIds: {
      runtime: 'bl018-runtime-' + scenario,
      api: 'bl018-api-' + scenario,
      home: 'bl018-home-' + scenario,
    },
    outcome: 'restarted',
    rejectionCategory: null,
    eligibility: { entryState: 'running', accepted: true },
    priorResourceClass: 'live-record',
    releaseMode: 'graceful',
    signalDelivery: 'delivered',
    releaseAuditTriple: {
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
      complete: true,
    },
    gate: {
      passed: true,
      gateConfirmed: true,
      launchAfterGate: true,
      spawnsBeforeGate: 0,
    },
    deadlines: {
      releaseArm: {
        source: 'trusted-scheduler',
        declaredMs: bounds.releaseMs,
        cancelled: true,
      },
      overallArm: {
        source: 'trusted-scheduler',
        declaredMs: bounds.overallMs,
        cancelled: true,
      },
      fired: 'none',
      abortReasonCategory: null,
    },
    replacementAuditState: 'none',
    replacementAuditTriple: null,
    priorIdentity: 'bl018-identity-g1',
    replacementIdentity: 'bl018-identity-g2',
    distinctIdentity: true,
    attribution: {
      ownedGroupSampled: true,
      ceilingRecorded: true,
      claim: BL018_ATTRIBUTION_CLAIM,
    },
    stateSeries: [
      { phase: 'accept', runtime: 'Running', api: 'Running', home: 'Running' },
      {
        phase: 'post-release',
        runtime: 'Starting',
        api: 'Starting',
        home: 'Starting',
      },
      {
        phase: 'post-launch',
        runtime: 'Running',
        api: 'Running',
        home: 'Running',
      },
      { phase: 'settled', runtime: 'Running', api: 'Running', home: 'Running' },
    ],
    elapsedClass: 'within-overall',
    withinDeclaredBound: true,
    runtimeState: 'Running',
    apiState: 'Running',
    homeState: 'Running',
    failureCategory: null,
    events: [
      {
        id: 'bl018-event-' + scenario + '-1',
        event: 'runtime.restart.requested',
        from: 'running',
        to: 'restarting',
        publicState: 'Starting',
        classification: null,
        elapsedClass: 'within-overall',
      },
      {
        id: 'bl018-event-' + scenario + '-2',
        event: 'runtime.restart.succeeded',
        from: 'restarting',
        to: 'running',
        publicState: 'Running',
        classification: null,
        elapsedClass: 'within-overall',
      },
    ],
    requestedEventCount: 1,
    terminalEventCount: 1,
    preAcceptEventCount: 0,
    loserEventCount: 0,
    foreignEventCount: 0,
    joinedCallers: 0,
    acceptedRestarts: 1,
    releasePhaseTerminations: 1,
    replacementLaunches: 1,
    entryMutations: 0,
    terminateCallsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    cleanupRecordsByPhase: {
      restartRelease: 1,
      restartReplacement: 0,
      shutdown: 0,
    },
    identitiesCreated: 1,
    identitiesTerminated: 1,
    staleSettlements: [],
    connections: null,
    registrationRowCount: 1,
    registrationDigests: pair,
    peerDigests: null,
    controlDigests: pair,
    fixtureDigests: [
      { fixture: 'selected-project', before: pair.before, after: pair.after },
    ],
    inventory: [
      {
        item: 'managed workbench runtime generation and its loopback listener',
        itemClass: 'runtime-process-and-listener',
        ownership: 'validation-owned-temporary',
      },
      {
        item: 'unrelated control process and control listener',
        itemClass: 'unrelated-control',
        ownership: 'validation-owned-temporary',
      },
      {
        item: 'project registration row and database sidecars',
        itemClass: 'registration-resource',
        ownership: 'product-registration-during-scenario',
      },
      {
        item: 'two disposable project fixture trees',
        itemClass: 'disposable-fixture',
        ownership: 'validation-owned-temporary',
      },
    ],
    admission: {
      createdBeforeLaunch: true,
      admissionsCreated: 1,
      admissionId: 'bl018-admission-1',
      phaseAtSettlement: 'absent-confirmed',
      resolution: 'absent-confirmed',
      resolvedBy: 'continuation',
      resolutionOrder: 'before-gate',
      createdProcessCount: 1,
      deletions: 1,
    },
    quarantine: {
      recordCount: 0,
      auditStates: [],
      terminationAttempts: 0,
      reattempts: 0,
      reattemptClaims: 0,
      deletions: 0,
      concurrentAttempts: 0,
      createdByInstalledCleanup: 0,
    },
    replacementAttempts: {
      launchAttempts: 1,
      portsAcquired: 1,
      portsAcquiredAfterAbort: 0,
      cleanupAudits: 0,
      confirmingCleanups: 0,
      nonConfirmingCleanups: 0,
      ownershipDeletions: 0,
      ownershipRecordsAfterSettlement: 1,
      attemptAuditKeys: [],
      attemptAuditOverwrites: 0,
      projectKeyedCleanupWrites: 1,
      settlementReasonSource: 'none',
      launchRejectionCategory: null,
    },
    lateCallbacks: {
      ownedAfterSettlement: 0,
      cleanupAfterSettlement: 0,
      ownershipMapMutations: 0,
      entryMutations: 0,
      currentCleanupMutations: 0,
      eventsEmitted: 0,
      quarantineWrites: 0,
    },
    taskSets: {
      abandonedLaunchInCompletionTasks: false,
      abandonedLaunchInBackgroundTasks: false,
      abandonedLaunchInRestartTasks: false,
      restartTasksAwaitedByShutdown: true,
    },
    shutdown: null,
    residualCount: 0,
    teardownResidualCount: 0,
    assertionCount: 12,
  }
}

export function baselineMatrix(): RuntimeRestartMatrix {
  return {
    schemaVersion: 1,
    declaredBounds: BL018_PRODUCTION_DEFAULT_BOUNDS,
    productionDefaultBounds: BL018_PRODUCTION_DEFAULT_BOUNDS,
    rows: BL018_SCENARIOS.map(baselineRow),
  }
}

export function withRow(
  matrix: RuntimeRestartMatrix,
  scenario: Bl018Scenario,
  mutate: (row: RuntimeRestartEvidenceRow) => RuntimeRestartEvidenceRow
): RuntimeRestartMatrix {
  return {
    ...matrix,
    rows: matrix.rows.map((row) =>
      row.scenario === scenario ? mutate(row) : row
    ),
  }
}
