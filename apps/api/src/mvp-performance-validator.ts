import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import {
  MVP_CAPACITY_COHORTS,
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_DESIGNATED_HOST,
  MVP_EVENTS,
  MVP_OVERALL_TIMEOUT_MS,
  MVP_OVERALL_TOLERANCE_MS,
  MVP_PERFORMANCE_RESULT_ROOT,
  MVP_SECTION_TIMEOUTS_MS,
  MVP_WARM_ORDER,
  MVP_WARM_TARGET_MS,
  MvpEvidenceError,
  assertPublicEvidenceSafe,
  digestMvpPerformance,
  validateMvpPlan,
  type MetricDisposition,
  type MvpAttempt,
  type MvpPlan,
  type MvpSectionStatistics,
  type MvpSummary,
} from './mvp-performance-contract.js'
import type { ContinuitySectionRecord } from './mvp-performance-continuity.js'
import type { IntegratedCapacityRecord } from './mvp-performance-capacity.js'
import type { ScheduledSample } from './workbench-capacity-contract.js'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

interface ArtifactFileRecord {
  status: string
  digest: string | null
  restrictedPath: string
  requiredMode: '0600'
  protectedData: true
}
export interface MvpEvidenceBundle {
  plan: MvpPlan
  attempts: MvpAttempt[]
  continuity: ContinuitySectionRecord
  capacity: IntegratedCapacityRecord
  summary: MvpSummary
  artifacts: {
    runId: string
    artifacts: Array<{
      attemptId: string
      screenshot: ArtifactFileRecord
      trace: ArtifactFileRecord
      network: { status: string; entries: unknown[] }
    }>
  }
  recomputation: Record<string, unknown>
  residual: {
    complete: boolean
    attemptBoundaries: Array<{
      attemptId: string
      passed: boolean
      residuals: number
    }>
    continuity: Array<{ attemptId: string; cleanupPassed: boolean }>
    capacity: { total: number }
  }
  hostVerification: {
    declaration: unknown
    start: unknown
    startDigest: string | null
    startMatchesDeclaration: boolean
    end: unknown
    endDigest: string | null
    endMatchesStart: boolean
    endMatchesDeclaration: boolean
  }
  sectionStatus: {
    overallBoundMs: number
    overallToleranceMs: number
    sections: Array<{
      name: string
      boundMs: number
      startedElapsedMs: number
      endedElapsedMs: number | null
      status: string
      partialEvidenceRetained: boolean
    }>
  }
  runStatus: {
    status: string
    elapsedMs: number
    overallBoundMs: number
    overallToleranceMs: number
  }
  recovery: {
    completedAttemptIds: string[]
    inProgress: unknown
    fabricatedAttempts: number
  }
  baseline: {
    runId: string
    measurementMethod: string
    samples: ScheduledSample[]
  }
}
const requireEvidence = (condition: unknown, classification: string): void => {
  if (!condition) throw new MvpEvidenceError(classification)
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)
const validNs = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9]+$/u.test(value)
const sortedBigints = (values: Array<{ id: string; value: bigint }>) =>
  [...values].sort((a, b) =>
    a.value < b.value ? -1 : a.value > b.value ? 1 : 0
  )
const independentlyRecomputeSection = (
  attempts: MvpAttempt[],
  targetMs: number,
  expectedIdentities?: Map<string, string>
): MvpSectionStatistics => {
  const sources = sortedBigints(
    attempts.flatMap((attempt) =>
      attempt.statisticalTotalNs === null
        ? []
        : [{ id: attempt.attemptId, value: BigInt(attempt.statisticalTotalNs) }]
    )
  )
  const values = sources.map((source) => source.value)
  const middle = Math.floor(values.length / 2)
  const median = !values.length
    ? null
    : values.length % 2
      ? values[middle]!
      : (values[middle - 1]! + values[middle]!) / 2n
  const p95 = values.length
    ? values[Math.ceil(0.95 * values.length) - 1]!
    : null
  const maximum = values.length
    ? values.reduce((prior, value) => (value > prior ? value : prior))
    : null
  return {
    orderedAttemptIds: attempts.map((attempt) => attempt.attemptId),
    sortedSourceAttemptIds: sources.map((source) => source.id),
    sourceDurationsNs: sources.map((source) => source.value.toString()),
    medianNs: median?.toString() ?? null,
    p95Ns: p95?.toString() ?? null,
    maximumNs: maximum?.toString() ?? null,
    failures: attempts.filter((attempt) => attempt.status !== 'success').length,
    preStartFailures: attempts.filter(
      (attempt) => attempt.status === 'pre-start-failed'
    ).length,
    identityChanges: expectedIdentities
      ? attempts.filter(
          (attempt) =>
            expectedIdentities.get(attempt.project) !==
            attempt.runtime?.identityDigest
        ).length
      : 0,
    targetMisses: attempts.filter(
      (attempt) =>
        attempt.status !== 'success' ||
        (attempt.statisticalTotalNs !== null &&
          BigInt(attempt.statisticalTotalNs) > BigInt(targetMs) * 1_000_000n)
    ).length,
  }
}
const independentlyValidateAttempt = (
  plan: MvpPlan,
  attempt: MvpAttempt,
  index: number,
  expectedProject: string
): void => {
  requireEvidence(attempt.ordinal === index + 1, 'order-mismatch')
  requireEvidence(attempt.project === expectedProject, 'order-mismatch')
  requireEvidence(attempt.retry === 0, 'retry-detected')
  requireEvidence(
    attempt.runId === plan.runId && attempt.planHash === plan.planHash,
    'plan-substitution'
  )
  requireEvidence(attempt.clock === 'process.hrtime.bigint', 'mixed-clock')
  requireEvidence(
    equal(attempt.host, plan.designatedHost),
    'host-identity-mismatch'
  )
  requireEvidence(
    attempt.targetMs ===
      (attempt.kind === 'cold' ? MVP_COLD_TARGET_MS : MVP_WARM_TARGET_MS),
    'threshold-substitution'
  )
  const observed = MVP_EVENTS.flatMap((name) => {
    const value = attempt.eventsNs[name]
    return value === undefined ? [] : [{ name, value }]
  })
  requireEvidence(
    observed.every((event) => validNs(event.value)) &&
      observed.every(
        (event, position) =>
          position === 0 ||
          BigInt(event.value) >= BigInt(observed[position - 1]!.value)
      ),
    'phase-order-mismatch'
  )
  if (attempt.status === 'success')
    requireEvidence(observed.length === MVP_EVENTS.length, 'phase-missing')
  const phaseNames: string[] = []
  let sum = 0n
  for (let position = 1; position < MVP_EVENTS.length; position += 1) {
    const beforeName = MVP_EVENTS[position - 1]!
    const afterName = MVP_EVENTS[position]!
    const before = attempt.eventsNs[beforeName]
    const after = attempt.eventsNs[afterName]
    if (before !== undefined && after !== undefined) {
      const duration = BigInt(after) - BigInt(before)
      const phaseName = beforeName + '-to-' + afterName
      phaseNames.push(phaseName)
      requireEvidence(
        attempt.phasesNs[phaseName] === duration.toString(),
        'phase-duration-mismatch'
      )
      sum += duration
    }
  }
  const start = attempt.eventsNs.activation
  const end = attempt.eventsNs['workbench-usable']
  if (attempt.status === 'pre-start-failed') {
    requireEvidence(
      attempt.observedTotalNs === null && attempt.statisticalTotalNs === null,
      'pre-start-duration-violation'
    )
  } else requireEvidence(validNs(start), 'assigned-timing')
  if (validNs(start) && validNs(end)) {
    const total = BigInt(end) - BigInt(start)
    phaseNames.push('total')
    requireEvidence(total >= 0n, 'phase-order-mismatch')
    requireEvidence(
      attempt.observedTotalNs === total.toString(),
      'assigned-timing'
    )
    requireEvidence(
      attempt.phasesNs.total === total.toString(),
      'phase-total-mismatch'
    )
    requireEvidence(sum === total, 'phase-sum-mismatch')
  }
  requireEvidence(
    equal(Object.keys(attempt.phasesNs).sort(), phaseNames.sort()),
    'phase-duration-mismatch'
  )
  if (attempt.status === 'timeout') {
    const bound =
      BigInt(
        attempt.kind === 'cold'
          ? plan.timeoutsMs.coldAttempt
          : plan.timeoutsMs.warmAttempt
      ) * 1_000_000n
    requireEvidence(
      attempt.statisticalTotalNs === bound.toString(),
      'timeout-bound-mismatch'
    )
  }
  if (attempt.status === 'failed')
    requireEvidence(
      attempt.statisticalTotalNs === null,
      'non-timeout-failure-inclusion'
    )
  requireEvidence(attempt.boundary.passed, 'cleanup-leakage')
  if (attempt.kind === 'cold') {
    requireEvidence(
      !attempt.browser.prewarmedRuntime &&
        attempt.boundary.kind === 'absence' &&
        attempt.precheck.runtimeAudit === null &&
        attempt.boundary.runtimeAudit === null,
      'cold-identity-violation'
    )
  } else {
    requireEvidence(
      attempt.boundary.kind === 'reuse',
      'warm-identity-violation'
    )
    for (const audit of [
      attempt.precheck.runtimeAudit,
      attempt.boundary.runtimeAudit,
    ]) {
      requireEvidence(audit !== null, 'warm-runtime-audit-missing')
      requireEvidence(audit?.healthPassed, 'warm-health-failed')
      requireEvidence(audit?.identityUnchanged, 'warm-identity-violation')
      requireEvidence(audit?.listenerCount === 1, 'warm-listener-mismatch')
      requireEvidence(
        audit?.duplicateRuntimeCount === 0,
        'warm-duplicate-runtime'
      )
      requireEvidence(
        audit?.transientResourceCount === 0,
        'warm-transient-resource'
      )
    }
  }
}
const independentMetricDisposition = (
  complete: boolean,
  approval: MvpSummary['approval'],
  measurementHash: string,
  completedAt: string
): MetricDisposition => {
  if (complete) return 'met'
  if (!approval) return 'blocker'
  return approval.approver.trim().length > 0 &&
    approval.reason.trim().length > 0 &&
    approval.risk.trim().length > 0 &&
    /^BL-[0-9]+$/u.test(approval.followUpBacklogId) &&
    approval.evidenceHash === measurementHash &&
    Date.parse(approval.createdAt) > Date.parse(completedAt)
    ? 'miss-accepted'
    : 'blocker'
}
type DeltaField = IntegratedCapacityRecord['comparison'][number]['field']
const roundedRaw = (value: number): number => Number(value.toFixed(6))
const independentRawMetric = (
  samples: ScheduledSample[],
  field: DeltaField
): { sampleCount: number; value: number } => {
  const hosts = samples.flatMap((sample) => (sample.host ? [sample.host] : []))
  const trees = samples.flatMap((sample) =>
    sample.processTrees.flatMap((tree) => (tree.sample ? [tree.sample] : []))
  )
  const values =
    field === 'load1Average'
      ? hosts.map((host) => host.loadAverage[0]!)
      : field === 'minimumAvailableMemoryKiB'
        ? hosts.map((host) => host.availableMemoryKiB)
        : field === 'runtimeCpuAveragePercent'
          ? trees.map((tree) => tree.cpuPercent)
          : trees.map((tree) => tree.rssKiB)
  requireEvidence(values.length > 0, 'capacity-delta-source-empty')
  const value =
    field === 'minimumAvailableMemoryKiB'
      ? Math.min(...values)
      : values.reduce((sum, item) => sum + item, 0) / values.length
  return { sampleCount: values.length, value: roundedRaw(value) }
}
const DELTA_FIELDS: readonly DeltaField[] = [
  'load1Average',
  'minimumAvailableMemoryKiB',
  'runtimeCpuAveragePercent',
  'runtimeRssAverageKiB',
]
const independentlyRecomputeDeltas = (bundle: MvpEvidenceBundle) => {
  const expected: IntegratedCapacityRecord['comparison'] = [
    ...DELTA_FIELDS.map((field) => ({
      cohort: 'historical-1' as const,
      field,
      classification: 'not-comparable' as const,
      reason: 'BL-015 has no fresh one-member cohort raw source',
      baseline: {
        runId: bundle.baseline.runId,
        method: bundle.baseline.measurementMethod,
        sourceFile:
          'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/' +
          bundle.baseline.runId +
          '/samples.json',
        ...independentRawMetric(
          bundle.baseline.samples.filter((sample) => sample.cohort === 1),
          field
        ),
      },
      current: null,
      delta: null,
    })),
    ...MVP_CAPACITY_COHORTS.flatMap((cohort) =>
      DELTA_FIELDS.map((field) => {
        const baseline = independentRawMetric(
          bundle.baseline.samples.filter((sample) => sample.cohort === cohort),
          field
        )
        const current = independentRawMetric(
          bundle.capacity.cohorts.find((row) => row.cohort === cohort)!.samples,
          field
        )
        const runtimeField = field.startsWith('runtime')
        return {
          cohort,
          field,
          classification: runtimeField
            ? ('comparable' as const)
            : ('directional-only' as const),
          reason: runtimeField
            ? 'identical BL-004 proc sampling field formula schedule units and runtime-tree scope'
            : 'same raw host field and schedule but BL-015 includes integrated API and web service load',
          baseline: {
            runId: bundle.baseline.runId,
            method: bundle.baseline.measurementMethod,
            sourceFile:
              'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/' +
              bundle.baseline.runId +
              '/samples.json',
            ...baseline,
          },
          current: {
            runId: bundle.plan.runId,
            method: runtimeField
              ? bundle.baseline.measurementMethod
              : bundle.baseline.measurementMethod +
                '; integrated API and web services included in host totals',
            sourceFile: path.join(
              'project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance/implementation/evidence',
              bundle.plan.runId,
              'capacity.json'
            ),
            ...current,
          },
          delta: roundedRaw(current.value - baseline.value),
        }
      })
    ),
  ]
  return expected
}
const validateSectionAndOverallBounds = (bundle: MvpEvidenceBundle): void => {
  const expected = [
    ['prerequisites', MVP_SECTION_TIMEOUTS_MS.prerequisites],
    ['cold-warm', MVP_SECTION_TIMEOUTS_MS.cold + MVP_SECTION_TIMEOUTS_MS.warm],
    ['continuity', MVP_SECTION_TIMEOUTS_MS.continuity],
    ['capacity', MVP_SECTION_TIMEOUTS_MS.capacity],
    [
      'cleanup-and-finalization',
      MVP_SECTION_TIMEOUTS_MS.cleanupAndFinalization,
    ],
  ] as const
  requireEvidence(
    bundle.sectionStatus.overallBoundMs === MVP_OVERALL_TIMEOUT_MS &&
      bundle.sectionStatus.overallToleranceMs === MVP_OVERALL_TOLERANCE_MS &&
      bundle.runStatus.overallBoundMs === MVP_OVERALL_TIMEOUT_MS &&
      bundle.runStatus.overallToleranceMs === MVP_OVERALL_TOLERANCE_MS &&
      bundle.runStatus.elapsedMs <=
        MVP_OVERALL_TIMEOUT_MS + MVP_OVERALL_TOLERANCE_MS,
    'section-or-overall-bound-mismatch'
  )
  requireEvidence(
    bundle.sectionStatus.sections.length === expected.length,
    'section-or-overall-bound-mismatch'
  )
  for (const [index, [name, bound]] of expected.entries()) {
    const row = bundle.sectionStatus.sections[index]!
    requireEvidence(
      row.name === name &&
        row.boundMs === bound &&
        row.status === 'complete' &&
        row.endedElapsedMs !== null &&
        row.endedElapsedMs >= row.startedElapsedMs &&
        row.endedElapsedMs - row.startedElapsedMs <=
          bound + MVP_OVERALL_TOLERANCE_MS &&
        (index === 0 ||
          row.startedElapsedMs >=
            bundle.sectionStatus.sections[index - 1]!.endedElapsedMs!),
      'section-or-overall-bound-mismatch'
    )
  }
}
export const validateMvpInterruptedEvidence = (input: {
  runStatus: Record<string, unknown>
  recovery: MvpEvidenceBundle['recovery']
  sectionStatus: MvpEvidenceBundle['sectionStatus']
}): void => {
  requireEvidence(
    input.runStatus.status === 'failed' &&
      input.runStatus.partialEvidenceRetained === true &&
      input.recovery.fabricatedAttempts === 0 &&
      input.recovery.completedAttemptIds.length <= 15 &&
      input.sectionStatus.sections.some(
        (section) =>
          section.status === 'failed' || section.status === 'timed-out'
      ),
    'interrupted-partial-evidence-invalid'
  )
}
export const validateMvpEvidenceBundle = (
  bundle: MvpEvidenceBundle
): { status: 'valid'; measurementHash: string } => {
  validateMvpPlan(bundle.plan)
  requireEvidence(
    bundle.attempts.length === 15 &&
      new Set(bundle.attempts.map((attempt) => attempt.attemptId)).size === 15,
    'missing-or-duplicate-attempt'
  )
  const expectedProjects = [...MVP_COLD_ORDER, ...MVP_WARM_ORDER]
  bundle.attempts.forEach((attempt, index) =>
    independentlyValidateAttempt(
      bundle.plan,
      attempt,
      index,
      expectedProjects[index]!
    )
  )
  requireEvidence(
    equal(bundle.hostVerification.declaration, MVP_DESIGNATED_HOST) &&
      equal(bundle.hostVerification.start, MVP_DESIGNATED_HOST) &&
      equal(bundle.hostVerification.end, MVP_DESIGNATED_HOST) &&
      bundle.hostVerification.startDigest ===
        digestMvpPerformance(bundle.hostVerification.start) &&
      bundle.hostVerification.endDigest ===
        bundle.hostVerification.startDigest &&
      bundle.hostVerification.startMatchesDeclaration &&
      bundle.hostVerification.endMatchesStart &&
      bundle.hostVerification.endMatchesDeclaration,
    'host-identity-mismatch'
  )
  validateSectionAndOverallBounds(bundle)
  requireEvidence(
    bundle.recovery.fabricatedAttempts === 0 &&
      bundle.recovery.inProgress === null &&
      equal(
        bundle.recovery.completedAttemptIds,
        bundle.attempts.map((attempt) => attempt.attemptId)
      ),
    'interrupted-partial-evidence-invalid'
  )
  const cold = bundle.attempts.slice(0, MVP_COLD_ORDER.length)
  const warm = bundle.attempts.slice(MVP_COLD_ORDER.length)
  const identities = new Map<string, string>()
  for (const attempt of warm) {
    requireEvidence(attempt.runtime !== null, 'warm-identity-violation')
    const prior = identities.get(attempt.project)
    if (prior)
      requireEvidence(
        prior === attempt.runtime!.identityDigest,
        'warm-identity-violation'
      )
    else identities.set(attempt.project, attempt.runtime!.identityDigest)
  }
  const coldStats = independentlyRecomputeSection(cold, MVP_COLD_TARGET_MS)
  const warmStats = independentlyRecomputeSection(
    warm,
    MVP_WARM_TARGET_MS,
    identities
  )
  requireEvidence(
    bundle.summary.cold.failures === coldStats.failures &&
      bundle.summary.warm.failures === warmStats.failures &&
      bundle.summary.cold.preStartFailures === coldStats.preStartFailures &&
      bundle.summary.warm.preStartFailures === warmStats.preStartFailures,
    'omitted-failure'
  )
  requireEvidence(
    bundle.summary.cold.medianNs === coldStats.medianNs &&
      bundle.summary.warm.medianNs === warmStats.medianNs,
    'median-formula-mismatch'
  )
  requireEvidence(
    bundle.summary.cold.p95Ns === coldStats.p95Ns &&
      bundle.summary.warm.p95Ns === warmStats.p95Ns,
    'p95-formula-mismatch'
  )
  requireEvidence(
    equal(
      bundle.summary.cold.sortedSourceAttemptIds,
      coldStats.sortedSourceAttemptIds
    ) &&
      equal(
        bundle.summary.warm.sortedSourceAttemptIds,
        warmStats.sortedSourceAttemptIds
      ),
    'source-id-mismatch'
  )
  requireEvidence(
    equal(bundle.summary.cold, coldStats),
    'cold-statistics-mismatch'
  )
  requireEvidence(
    equal(bundle.summary.warm, warmStats),
    'warm-statistics-mismatch'
  )
  requireEvidence(
    bundle.artifacts.runId === bundle.plan.runId &&
      bundle.artifacts.artifacts.length === bundle.attempts.length,
    'missing-artifact'
  )
  for (const attempt of bundle.attempts) {
    const matches = bundle.artifacts.artifacts.filter(
      (artifact) => artifact.attemptId === attempt.attemptId
    )
    requireEvidence(matches.length === 1, 'missing-artifact')
    const artifact = matches[0]!
    for (const [kind, file] of [
      ['screenshot', artifact.screenshot],
      ['trace', artifact.trace],
    ] as const) {
      requireEvidence(
        file.status === attempt.artifacts[kind] &&
          file.requiredMode === '0600' &&
          file.protectedData === true &&
          file.restrictedPath.startsWith(
            'test-results/bl-015/' + bundle.plan.runId + '/'
          ) &&
          !file.restrictedPath.includes('..'),
        'artifact-mode-content-or-path'
      )
    }
    requireEvidence(
      artifact.network.status === attempt.artifacts.network,
      'missing-artifact'
    )
  }
  requireEvidence(
    bundle.continuity.runId === bundle.plan.runId &&
      bundle.continuity.planHash === bundle.plan.planHash &&
      bundle.continuity.runs.length === 3 &&
      bundle.continuity.runs.every(
        (row, index) => row.ordinal === index + 1 && row.retry === 0
      ) &&
      new Set(bundle.continuity.runs.map((row) => row.sourceExecutionId))
        .size === 3,
    'continuity-invalid'
  )
  const continuitySuccesses = bundle.continuity.runs.filter(
    (row) => row.passed && !row.stateCrossingOrLoss && row.cleanupPassed
  ).length
  requireEvidence(
    bundle.summary.continuity.successes === continuitySuccesses &&
      bundle.summary.continuity.metric2 === continuitySuccesses / 3,
    'continuity-formula-mismatch'
  )
  requireEvidence(
    equal(
      bundle.capacity.cohorts.map((row) => row.cohort),
      MVP_CAPACITY_COHORTS
    ),
    'capacity-order-mismatch'
  )
  const independentCapacity = bundle.capacity.cohorts.map((row) => {
    requireEvidence(
      row.retry === 0 &&
        row.fixtureCopies === row.cohort &&
        row.fixtureManifestDigests.length === row.cohort &&
        new Set(row.fixtureManifestDigests).size === 1 &&
        row.slots.length === row.cohort &&
        row.samples.length === 10 &&
        row.samples.every(
          (sample) =>
            sample.host !== null &&
            sample.host !== undefined &&
            sample.processTrees.length === row.ready &&
            sample.processTrees.every(
              (tree) => tree.sample !== null && tree.sample !== undefined
            )
        ) &&
        row.workloads.length === row.cohort,
      'capacity-fixture-or-retry'
    )
    const workloadsPassed = row.workloads.filter(
      (workload) => workload.status === 'passed'
    ).length
    const complete =
      row.ready === row.cohort &&
      workloadsPassed === row.cohort &&
      row.requiredSamplesComplete &&
      row.responsivenessPassed &&
      row.cleanupPassed &&
      row.failures.length === 0
    requireEvidence(
      row.gate ===
        (row.cohort === 3 ? (complete ? 'met' : 'blocker') : 'finding'),
      'capacity-gate-mismatch'
    )
    return {
      cohort: row.cohort,
      ready: row.ready,
      workloadsPassed,
      requiredSamplesComplete: row.requiredSamplesComplete,
      responsivenessPassed: row.responsivenessPassed,
      cleanupPassed: row.cleanupPassed,
      gate: row.gate,
    }
  })
  requireEvidence(
    equal(bundle.summary.capacity, independentCapacity),
    'capacity-summary-mismatch'
  )
  requireEvidence(
    bundle.baseline.runId === bundle.plan.capacityMethod.baselineRunId &&
      bundle.capacity.method.baselineRunId === bundle.baseline.runId &&
      bundle.capacity.method.baselineMeasurementMethod ===
        bundle.baseline.measurementMethod,
    'capacity-source-mismatch'
  )
  const deltas = independentlyRecomputeDeltas(bundle)
  requireEvidence(
    equal(bundle.capacity.comparison, deltas),
    'capacity-delta-mismatch'
  )
  const measurementHash = digestMvpPerformance({
    planHash: bundle.plan.planHash,
    attempts: bundle.attempts,
    continuity: bundle.continuity,
    capacity: bundle.capacity,
  })
  requireEvidence(
    bundle.summary.measurementHash === measurementHash,
    'measurement-hash-mismatch'
  )
  const coldComplete =
    cold.length === 5 &&
    coldStats.failures === 0 &&
    coldStats.p95Ns !== null &&
    BigInt(coldStats.p95Ns) <= BigInt(MVP_COLD_TARGET_MS) * 1_000_000n
  const warmComplete =
    warm.length === 10 &&
    warmStats.failures === 0 &&
    warmStats.identityChanges === 0 &&
    warmStats.p95Ns !== null &&
    BigInt(warmStats.p95Ns) <= BigInt(MVP_WARM_TARGET_MS) * 1_000_000n
  const capacityComplete =
    bundle.capacity.cohorts.find((row) => row.cohort === 3)?.gate === 'met'
  const expectedMetrics = {
    nfr002Metric4: independentMetricDisposition(
      coldComplete,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    nfr001Metric3: independentMetricDisposition(
      warmComplete,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    continuityMetric2: independentMetricDisposition(
      continuitySuccesses === 3,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    nfr003Capacity3: independentMetricDisposition(
      capacityComplete,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
  }
  requireEvidence(
    equal(bundle.summary.metrics, expectedMetrics),
    'invalid-or-autonomous-approval'
  )
  const overallDisposition = Object.values(expectedMetrics).some(
    (value) => value === 'blocker'
  )
    ? 'blocker'
    : 'met'
  requireEvidence(
    bundle.summary.overallDisposition === overallDisposition,
    'incorrect-overall-disposition'
  )
  const expectedRecomputation = {
    schemaVersion: 1,
    runId: bundle.plan.runId,
    measurementHash,
    sourceAttemptIds: bundle.attempts.map((attempt) => attempt.attemptId),
    cold: coldStats,
    warm: warmStats,
    continuitySuccesses,
    capacity: independentCapacity,
    capacityDeltas: deltas,
    metrics: expectedMetrics,
    overallDisposition,
    matched: true,
  }
  requireEvidence(
    equal(bundle.recomputation, expectedRecomputation),
    'recomputation-mismatch'
  )
  requireEvidence(
    bundle.residual.complete &&
      bundle.residual.capacity.total === 0 &&
      bundle.residual.attemptBoundaries.length === bundle.attempts.length &&
      bundle.residual.attemptBoundaries.every(
        (row) => row.passed && row.residuals === 0
      ) &&
      bundle.residual.continuity.length === 3 &&
      bundle.residual.continuity.every((row) => row.cleanupPassed),
    'cleanup-leakage'
  )
  assertPublicEvidenceSafe(bundle)
  return { status: 'valid', measurementHash }
}
const walkFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(root, entry.name)
      return entry.isDirectory() ? walkFiles(target) : Promise.resolve([target])
    })
  )
  return nested.flat()
}
export const validateMvpArtifactFiles = async (
  bundle: MvpEvidenceBundle,
  publicRoot: string
): Promise<{
  restrictedFiles: number
  restrictedProtectedMatches: number
  publicProtectedMatches: 0
}> => {
  const restrictedRoot = path.join(
    MVP_PERFORMANCE_RESULT_ROOT,
    bundle.plan.runId
  )
  const gitignore = await readFile(
    path.join(REPOSITORY_ROOT, '.gitignore'),
    'utf8'
  )
  requireEvidence(
    gitignore.split('\n').includes('test-results/'),
    'artifact-mode-content-or-path'
  )
  const restrictedFiles = await walkFiles(restrictedRoot)
  let restrictedProtectedMatches = 0
  requireEvidence(restrictedFiles.length > 0, 'missing-artifact')
  for (const target of restrictedFiles)
    requireEvidence(
      ((await lstat(target)).mode & 0o777) === 0o600 &&
        path
          .resolve(target)
          .startsWith(path.resolve(restrictedRoot) + path.sep),
      'artifact-mode-content-or-path'
    )
  for (const artifact of bundle.artifacts.artifacts)
    for (const file of [artifact.screenshot, artifact.trace]) {
      const target = path.resolve(REPOSITORY_ROOT, file.restrictedPath)
      requireEvidence(
        target.startsWith(path.resolve(restrictedRoot) + path.sep),
        'artifact-mode-content-or-path'
      )
      const content = await readFile(target)
      if (file.status === 'captured')
        requireEvidence(
          digestMvpPerformance(content) === file.digest,
          'artifact-content-mismatch'
        )
      else requireEvidence(file.digest === null, 'artifact-content-mismatch')
      restrictedProtectedMatches +=
        content
          .toString('latin1')
          .match(
            /(?:127[.]0[.]0[.]1:[0-9]+|\/tmp\/ascend-bl015|canonicalPath|internalUrl)/gu
          )?.length ?? 0
    }
  const publicFiles = await walkFiles(publicRoot)
  for (const target of publicFiles) {
    const content = await readFile(target, 'utf8').catch(() => '')
    requireEvidence(
      !/(?:127[.]0[.]0[.]1:[0-9]+|localhost:[0-9]+|\/tmp\/ascend-bl015|canonicalPath|internalUrl|authorization|password|secret|token=)/iu.test(
        content
      ),
      'unsafe-disclosure'
    )
  }
  return {
    restrictedFiles: restrictedFiles.length,
    restrictedProtectedMatches,
    publicProtectedMatches: 0,
  }
}
