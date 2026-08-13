import {
  MVP_CAPACITY_COHORTS,
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_WARM_TARGET_MS,
  MvpEvidenceError,
  assertPublicEvidenceSafe,
  calculateSectionStatistics,
  digestMvpPerformance,
  metricDisposition,
  milliseconds,
  validateMvpAttempts,
  validateMvpPlan,
  type MvpAttempt,
  type MvpPlan,
  type MvpSummary,
} from './mvp-performance-contract.js'
import type { ContinuitySectionRecord } from './mvp-performance-continuity.js'
import type { IntegratedCapacityRecord } from './mvp-performance-capacity.js'

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
      screenshot: { status: string }
      trace: { status: string }
      network: { status: string }
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
}
const requireEvidence = (condition: unknown, classification: string): void => {
  if (!condition) throw new MvpEvidenceError(classification)
}
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)
export const validateMvpEvidenceBundle = (
  bundle: MvpEvidenceBundle
): { status: 'valid'; measurementHash: string } => {
  validateMvpPlan(bundle.plan)
  validateMvpAttempts(bundle.plan, bundle.attempts)
  requireEvidence(
    bundle.attempts.every(
      (row, index) =>
        new Date(bundle.plan.declaredAt).getTime() <=
          new Date(row.startedAt).getTime() &&
        row.planHash === bundle.plan.planHash &&
        row.ordinal === index + 1
    ),
    'post-run-plan-change'
  )
  const cold = bundle.attempts.slice(0, MVP_COLD_ORDER.length),
    warm = bundle.attempts.slice(MVP_COLD_ORDER.length)
  const identities = new Map<string, string>()
  for (const row of warm) {
    if (!row.runtime) throw new MvpEvidenceError('warm-identity-violation')
    const prior = identities.get(row.project)
    if (prior && prior !== row.runtime.identityDigest)
      throw new MvpEvidenceError('warm-identity-violation')
    identities.set(row.project, row.runtime.identityDigest)
  }
  const coldStats = calculateSectionStatistics(cold, MVP_COLD_TARGET_MS),
    warmStats = calculateSectionStatistics(warm, MVP_WARM_TARGET_MS, identities)
  requireEvidence(
    bundle.summary.cold.failures === coldStats.failures &&
      bundle.summary.warm.failures === warmStats.failures,
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
    bundle.summary.cold.maximumNs === coldStats.maximumNs &&
      bundle.summary.warm.maximumNs === warmStats.maximumNs &&
      bundle.summary.cold.targetMisses === coldStats.targetMisses &&
      bundle.summary.warm.targetMisses === warmStats.targetMisses,
    'formula-mismatch'
  )
  requireEvidence(
    bundle.artifacts.runId === bundle.plan.runId &&
      bundle.artifacts.artifacts.length === bundle.attempts.length &&
      bundle.attempts.every(
        (row) =>
          bundle.artifacts.artifacts.filter(
            (artifact) =>
              artifact.attemptId === row.attemptId &&
              artifact.screenshot.status === row.artifacts.screenshot &&
              artifact.trace.status === row.artifacts.trace &&
              artifact.network.status === row.artifacts.network
          ).length === 1
      ),
    'missing-artifact'
  )
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
  for (const row of bundle.capacity.cohorts) {
    requireEvidence(
      row.retry === 0 &&
        row.fixtureCopies === row.cohort &&
        row.fixtureManifestDigests.length === row.cohort &&
        new Set(row.fixtureManifestDigests).size === 1,
      'capacity-fixture-or-retry'
    )
    requireEvidence(row.slots.length === row.cohort, 'capacity-partial-omitted')
    const expected =
      row.ready === row.cohort &&
      row.workloads.filter((workload) => workload.status === 'passed')
        .length === row.cohort &&
      row.requiredSamplesComplete &&
      row.responsivenessPassed &&
      row.cleanupPassed &&
      row.failures.length === 0
    if (row.cohort === 3)
      requireEvidence(
        row.gate === (expected ? 'met' : 'blocker'),
        'capacity-gate-mismatch'
      )
    else requireEvidence(row.gate === 'finding', 'capacity-gate-mismatch')
    requireEvidence(
      bundle.capacity.comparison.some(
        (entry) =>
          entry.cohort === row.cohort && entry.classification === 'comparable'
      ) &&
        bundle.capacity.comparison.some(
          (entry) =>
            entry.cohort === row.cohort &&
            entry.classification === 'directional-only'
        ),
      'incomparable-capacity-method'
    )
  }
  requireEvidence(
    bundle.capacity.comparison.some(
      (row) =>
        row.cohort === 'historical-1' && row.classification === 'not-comparable'
    ),
    'incomparable-capacity-method'
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
    milliseconds(coldStats.p95Ns) <= MVP_COLD_TARGET_MS
  const warmComplete =
    warm.length === 10 &&
    warmStats.failures === 0 &&
    warmStats.identityChanges === 0 &&
    warmStats.p95Ns !== null &&
    milliseconds(warmStats.p95Ns) <= MVP_WARM_TARGET_MS
  const capacity3 =
    bundle.capacity.cohorts.find((row) => row.cohort === 3)?.gate === 'met'
  const expectedMetrics = {
    nfr002Metric4: metricDisposition(
      coldComplete,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    nfr001Metric3: metricDisposition(
      warmComplete,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    continuityMetric2: metricDisposition(
      continuitySuccesses === 3,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
    nfr003Capacity3: metricDisposition(
      capacity3,
      bundle.summary.approval,
      measurementHash,
      bundle.summary.completedAt
    ),
  }
  requireEvidence(
    equal(bundle.summary.metrics, expectedMetrics),
    'invalid-or-autonomous-approval'
  )
  const overall = Object.values(expectedMetrics).some(
    (value) => value === 'blocker'
  )
    ? 'blocker'
    : 'met'
  requireEvidence(
    bundle.summary.overallDisposition === overall,
    'incorrect-overall-disposition'
  )
  requireEvidence(
    bundle.recomputation.measurementHash === measurementHash &&
      bundle.recomputation.matched === true &&
      equal(
        bundle.recomputation.sourceAttemptIds,
        bundle.attempts.map((row) => row.attemptId)
      ),
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
