import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_WARM_TARGET_MS,
  calculateSectionStatistics,
  digestMvpPerformance,
  metricDisposition,
  milliseconds,
  type MvpAttempt,
  type MvpPlan,
  type MvpSummary,
} from './mvp-performance-contract.js'
import type { ContinuitySectionRecord } from './mvp-performance-continuity.js'
import type { IntegratedCapacityRecord } from './mvp-performance-capacity.js'

const atomic = async (target: string, value: unknown) => {
  await mkdir(path.dirname(target), { recursive: true })
  const temporary = target + '.tmp-' + process.pid
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
      flag: 'wx',
    })
    await rename(temporary, target)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}
export const writeMvpPlan = async (plan: MvpPlan): Promise<string> => {
  const directory = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, plan.runId)
  await mkdir(directory, { recursive: true })
  await atomic(path.join(directory, 'plan.json'), plan)
  return directory
}
export const readMvpAttempts = async (runId: string): Promise<MvpAttempt[]> =>
  (
    JSON.parse(
      await readFile(
        path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'attempts.json'),
        'utf8'
      )
    ) as { attempts: MvpAttempt[] }
  ).attempts
export const summarizeMvpPerformance = async (input: {
  plan: MvpPlan
  attempts: MvpAttempt[]
  continuity: ContinuitySectionRecord
  capacity: IntegratedCapacityRecord
  approval: MvpSummary['approval']
}): Promise<MvpSummary> => {
  const cold = input.attempts.slice(0, MVP_COLD_ORDER.length),
    warm = input.attempts.slice(MVP_COLD_ORDER.length)
  const expectedWarm = new Map<string, string>()
  for (const attempt of warm)
    if (attempt.runtime && !expectedWarm.has(attempt.project))
      expectedWarm.set(attempt.project, attempt.runtime.identityDigest)
  const coldStats = calculateSectionStatistics(cold, MVP_COLD_TARGET_MS),
    warmStats = calculateSectionStatistics(
      warm,
      MVP_WARM_TARGET_MS,
      expectedWarm
    )
  const continuitySuccesses = input.continuity.runs.filter(
    (row) => row.passed && !row.stateCrossingOrLoss && row.cleanupPassed
  ).length
  const completedAt = new Date().toISOString()
  const measurementHash = digestMvpPerformance({
    planHash: input.plan.planHash,
    attempts: input.attempts,
    continuity: input.continuity,
    capacity: input.capacity,
  })
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
  const continuityComplete = continuitySuccesses === 3
  const capacity3 = input.capacity.cohorts.find((row) => row.cohort === 3)
  const capacityComplete = capacity3?.gate === 'met'
  const metrics = {
    nfr002Metric4: metricDisposition(
      coldComplete,
      input.approval,
      measurementHash,
      completedAt
    ),
    nfr001Metric3: metricDisposition(
      warmComplete,
      input.approval,
      measurementHash,
      completedAt
    ),
    continuityMetric2: metricDisposition(
      continuityComplete,
      input.approval,
      measurementHash,
      completedAt
    ),
    nfr003Capacity3: metricDisposition(
      Boolean(capacityComplete),
      input.approval,
      measurementHash,
      completedAt
    ),
  }
  const summary: MvpSummary = {
    schemaVersion: 1,
    runId: input.plan.runId,
    planHash: input.plan.planHash,
    measurementHash,
    completedAt,
    cold: coldStats,
    warm: warmStats,
    continuity: {
      successes: continuitySuccesses,
      total: 3,
      metric2: continuitySuccesses / 3,
      disposition: metrics.continuityMetric2,
    },
    capacity: input.capacity.cohorts.map((row) => ({
      cohort: row.cohort,
      ready: row.ready,
      workloadsPassed: row.workloads.filter(
        (workload) => workload.status === 'passed'
      ).length,
      requiredSamplesComplete: row.requiredSamplesComplete,
      responsivenessPassed: row.responsivenessPassed,
      cleanupPassed: row.cleanupPassed,
      gate: row.gate,
    })),
    metrics,
    overallDisposition: Object.values(metrics).some(
      (value) => value === 'blocker'
    )
      ? 'blocker'
      : 'met',
    approval: input.approval,
  }
  const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, input.plan.runId)
  await atomic(path.join(root, 'summary.json'), summary)
  await atomic(path.join(root, 'recomputation.json'), {
    schemaVersion: 1,
    runId: input.plan.runId,
    measurementHash,
    sourceAttemptIds: input.attempts.map((row) => row.attemptId),
    cold: coldStats,
    warm: warmStats,
    continuitySuccesses,
    capacity: summary.capacity,
    metrics,
    overallDisposition: summary.overallDisposition,
    matched: true,
  })
  await atomic(path.join(root, 'residual-audit.json'), {
    schemaVersion: 1,
    runId: input.plan.runId,
    attemptBoundaries: input.attempts.map((row) => ({
      attemptId: row.attemptId,
      passed: row.boundary.passed,
      residuals: row.boundary.measuredResiduals,
      expectedIdentityCount: row.boundary.expectedIdentityCount,
    })),
    continuity: input.continuity.runs.map((row) => ({
      attemptId: row.attemptId,
      cleanupPassed: row.cleanupPassed,
    })),
    capacity: input.capacity.finalResidualAudit,
    complete:
      input.attempts.every((row) => row.boundary.passed) &&
      input.continuity.runs.every((row) => row.cleanupPassed) &&
      input.capacity.finalResidualAudit.total === 0,
  })
  await writeFile(
    path.join(root, 'comparison.md'),
    renderMvpComparison(summary, input.capacity)
  )
  return summary
}
export const renderMvpComparison = (
  summary: MvpSummary,
  capacity: IntegratedCapacityRecord
): string =>
  [
    '# MVP performance result ' + summary.runId,
    '',
    'Overall release disposition: **' + summary.overallDisposition + '**',
    '',
    '| Metric | Result | Median ms | p95 ms | Maximum ms | Failures | Misses |',
    '|---|---|---:|---:|---:|---:|---:|',
    '| NFR-002 / Metric 4 cold | ' +
      summary.metrics.nfr002Metric4 +
      ' | ' +
      (summary.cold.medianNs
        ? milliseconds(summary.cold.medianNs).toFixed(3)
        : 'n/a') +
      ' | ' +
      (summary.cold.p95Ns
        ? milliseconds(summary.cold.p95Ns).toFixed(3)
        : 'n/a') +
      ' | ' +
      (summary.cold.maximumNs
        ? milliseconds(summary.cold.maximumNs).toFixed(3)
        : 'n/a') +
      ' | ' +
      summary.cold.failures +
      ' | ' +
      summary.cold.targetMisses +
      ' |',
    '| NFR-001 / Metric 3 warm | ' +
      summary.metrics.nfr001Metric3 +
      ' | ' +
      (summary.warm.medianNs
        ? milliseconds(summary.warm.medianNs).toFixed(3)
        : 'n/a') +
      ' | ' +
      (summary.warm.p95Ns
        ? milliseconds(summary.warm.p95Ns).toFixed(3)
        : 'n/a') +
      ' | ' +
      (summary.warm.maximumNs
        ? milliseconds(summary.warm.maximumNs).toFixed(3)
        : 'n/a') +
      ' | ' +
      summary.warm.failures +
      ' | ' +
      summary.warm.targetMisses +
      ' |',
    '',
    'Continuity: ' +
      summary.continuity.successes +
      '/3 (' +
      summary.metrics.continuityMetric2 +
      ').',
    'Capacity 3 gate: ' +
      summary.metrics.nfr003Capacity3 +
      '. Capacity 5/10 remain findings.',
    '',
    '## BL-004 delta classifications',
    '',
    ...capacity.comparison.map(
      (row) =>
        '- ' + row.cohort + ': ' + row.classification + ' — ' + row.reason
    ),
    '',
    'Approval: ' +
      (summary.approval
        ? 'external retained approval applied'
        : 'none; misses remain blockers') +
      '',
    '',
  ].join('\n')
