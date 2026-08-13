import { describe, expect, it } from 'vitest'
import {
  MVP_CAPACITY_COHORTS,
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_OVERALL_TIMEOUT_MS,
  MVP_WARM_ORDER,
  calculateSectionStatistics,
  createMvpPlan,
  medianNs,
  metricDisposition,
  nearestRankP95Ns,
  presentMilliseconds,
  validateMvpAttempts,
  validateMvpPlan,
  type MvpAttempt,
} from '../src/mvp-performance-contract.js'

const plan = createMvpPlan(
  '00000000-0000-4000-8000-000000000035',
  '2026-08-13T12:00:00.000Z',
  1n
)
const attempt = (
  kind: 'cold' | 'warm',
  ordinal: number,
  project: string,
  durationMs: number
): MvpAttempt => {
  const start = BigInt(ordinal) * 1_000_000_000n
  const total = BigInt(durationMs) * 1_000_000n
  return {
    schemaVersion: 1,
    runId: plan.runId,
    planHash: plan.planHash,
    attemptId: kind + '-' + ordinal,
    kind,
    ordinal,
    project,
    retry: 0,
    startedAt: plan.declaredAt,
    host: { cgroup: 'v2' },
    versions: { node: '22', chromium: '1', codeServer: '4.131.0' },
    browser: {
      context: kind === 'cold' ? 'fresh' : 'retained',
      cache: kind === 'cold' ? 'cleared' : 'retained',
      originStorage: kind === 'cold' ? 'cleared' : 'retained',
      prewarmedRuntime: false,
    },
    precheck: { passed: true, load: [0, 0, 0], availableMemoryKiB: 1 },
    runtime: {
      projectToken: 'project-safe',
      identityDigest: 'identity-' + project,
      pidDigest: 'pid',
      startDigest: 'start',
      portToken: 'port-token',
    },
    stableUrl: '/projects/bl015-' + project + '/workbench/',
    clock: 'process.hrtime.bigint',
    eventsNs: {
      activation: start.toString(),
      'runtime-start-requested': (start + 1n).toString(),
      'runtime-health-ready': (start + 2n).toString(),
      'stable-document-ready': (start + 3n).toString(),
      'explorer-sentinel-ready': (start + 4n).toString(),
      'terminal-prompt-ready': (start + total).toString(),
      'workbench-usable': (start + total).toString(),
    },
    phasesNs: { total: total.toString() },
    observedTotalNs: total.toString(),
    statisticalTotalNs: total.toString(),
    status: 'success',
    failureClass: null,
    targetMs: kind === 'cold' ? 15_000 : 2_000,
    targetMet: durationMs <= (kind === 'cold' ? 15_000 : 2_000),
    artifacts: {
      screenshot: 'captured',
      trace: 'captured',
      network: 'captured',
      manifestId: 'artifact-' + ordinal,
    },
    boundary: {
      kind: kind === 'cold' ? 'absence' : 'reuse',
      passed: true,
      measuredResiduals: 0,
      expectedIdentityCount: kind === 'cold' ? 0 : 1,
    },
    homeReturned: kind === 'warm',
  }
}
const completeAttempts = () => [
  ...MVP_COLD_ORDER.map((project, index) =>
    attempt('cold', index + 1, project, 1000 + index)
  ),
  ...MVP_WARM_ORDER.map((project, index) =>
    attempt('warm', index + 6, project, 100 + index)
  ),
]

describe('BL-015 immutable measurement contract', () => {
  it('freezes exact orders, bounds, methods, formulas, targets, and no retry before attempts', () => {
    expect(() => validateMvpPlan(plan)).not.toThrow()
    expect(plan.order.cold).toEqual(['A', 'B', 'C', 'A', 'B'])
    expect(plan.order.warm).toEqual([
      'A',
      'B',
      'C',
      'A',
      'B',
      'C',
      'A',
      'B',
      'C',
      'A',
    ])
    expect(plan.order.capacity).toEqual(MVP_CAPACITY_COHORTS)
    expect(plan.timeoutsMs.overall).toBe(MVP_OVERALL_TIMEOUT_MS)
    expect(plan.targetsMs.cold).toBe(MVP_COLD_TARGET_MS)
    expect(plan.failureRules.retries).toBe(0)
    expect(plan.capacityMethod.sampleOffsetsMs).toEqual([
      0, 1000, 2000, 3000, 4000,
    ])
  })
  it('accepts the exact ledger and rejects contract mutations', () => {
    const rows = completeAttempts()
    expect(() => validateMvpAttempts(plan, rows)).not.toThrow()
    const mutation = (
      change: (row: MvpAttempt) => void,
      classification: string
    ) => {
      const copy = structuredClone(rows)
      change(copy[0]!)
      expect(() => validateMvpAttempts(plan, copy)).toThrowError(classification)
    }
    mutation((row) => {
      row.retry = 1 as 0
    }, 'retry-detected')
    mutation((row) => {
      row.clock = 'Date.now' as 'process.hrtime.bigint'
    }, 'mixed-clock')
    mutation((row) => {
      row.targetMs = 1
    }, 'threshold-substitution')
    mutation((row) => {
      row.browser.prewarmedRuntime = true
    }, 'cold-identity-violation')
    mutation((row) => {
      row.artifacts.trace = 'unavailable'
    }, 'missing-artifact')
    mutation((row) => {
      row.boundary.passed = false
    }, 'cleanup-leakage')
  })
})

describe('BL-015 monotonic calculations and disposition', () => {
  it('uses conventional odd/even median, nearest-rank p95, and three-decimal presentation', () => {
    expect(medianNs([])).toBeNull()
    expect(nearestRankP95Ns([])).toBeNull()
    expect(medianNs([1n, 9n, 3n])).toBe(3n)
    expect(medianNs([1n, 3n, 5n, 9n])).toBe(4n)
    expect(nearestRankP95Ns([5n, 1n, 4n, 2n, 3n])).toBe(5n)
    expect(nearestRankP95Ns([10n, 1n, 9n, 2n, 8n, 3n, 7n, 4n, 6n, 5n])).toBe(
      10n
    )
    expect(presentMilliseconds(1_234_567n)).toBe(1.235)
  })
  it('includes timeout bounds, excludes other failures, retains source IDs, and counts misses', () => {
    const rows = [
      attempt('cold', 1, 'A', 100),
      attempt('cold', 2, 'B', 200),
      attempt('cold', 3, 'C', 300),
      attempt('cold', 4, 'A', 400),
      attempt('cold', 5, 'B', 500),
    ]
    rows[1]!.status = 'timeout'
    rows[1]!.failureClass = 'attempt-timeout'
    rows[1]!.statisticalTotalNs = String(45_000 * 1_000_000)
    rows[2]!.status = 'failed'
    rows[2]!.failureClass = 'artifact-capture'
    rows[2]!.statisticalTotalNs = null
    rows[3]!.status = 'pre-start-failed'
    rows[3]!.failureClass = 'health-precheck'
    rows[3]!.eventsNs = {}
    rows[3]!.observedTotalNs = null
    rows[3]!.statisticalTotalNs = null
    const result = calculateSectionStatistics(rows, 15_000)
    expect(result.sourceDurationsNs).toHaveLength(3)
    expect(result.p95Ns).toBe(String(45_000 * 1_000_000))
    expect(result.failures).toBe(3)
    expect(result.preStartFailures).toBe(1)
    expect(result.targetMisses).toBe(3)
    expect(result.orderedAttemptIds).toEqual(rows.map((row) => row.attemptId))
  })
  it('defaults misses to blocker and validates a post-run approval hash', () => {
    const completedAt = '2026-08-13T12:00:00.000Z'
    expect(metricDisposition(true, null, 'hash', completedAt)).toBe('met')
    expect(metricDisposition(false, null, 'hash', completedAt)).toBe('blocker')
    expect(
      metricDisposition(
        false,
        {
          approver: 'Release owner',
          reason: 'bounded risk',
          risk: 'startup target miss',
          followUpBacklogId: 'BL-999',
          evidenceHash: 'hash',
          createdAt: '2026-08-13T12:00:01.000Z',
        },
        'hash',
        completedAt
      )
    ).toBe('miss-accepted')
    const approval = {
      approver: 'Release owner',
      reason: 'bounded risk',
      risk: 'startup target miss',
      followUpBacklogId: 'BL-999',
      evidenceHash: 'hash',
      createdAt: '2026-08-13T12:00:01.000Z',
    }
    for (const invalid of [
      { ...approval, approver: '' },
      { ...approval, reason: '' },
      { ...approval, risk: '' },
      { ...approval, followUpBacklogId: 'issue-999' },
      { ...approval, createdAt: completedAt },
    ])
      expect(metricDisposition(false, invalid, 'hash', completedAt)).toBe(
        'blocker'
      )

    expect(
      metricDisposition(
        false,
        {
          approver: 'Release owner',
          reason: 'bounded risk',
          risk: 'startup target miss',
          followUpBacklogId: 'BL-999',
          evidenceHash: 'wrong',
          createdAt: '2026-08-13T12:00:01.000Z',
        },
        'hash',
        completedAt
      )
    ).toBe('blocker')
  })
})
