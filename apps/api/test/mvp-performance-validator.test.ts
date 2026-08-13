import { describe, expect, it } from 'vitest'
import {
  MVP_COLD_ORDER,
  MVP_WARM_ORDER,
  calculateSectionStatistics,
  createMvpPlan,
  digestMvpPerformance,
  type MvpAttempt,
  type MvpSummary,
} from '../src/mvp-performance-contract.js'
import type { MvpEvidenceBundle } from '../src/mvp-performance-validator.js'
import { validateMvpEvidenceBundle } from '../src/mvp-performance-validator.js'

const makeAttempt = (
  plan: ReturnType<typeof createMvpPlan>,
  kind: 'cold' | 'warm',
  ordinal: number,
  project: string,
  duration: number
): MvpAttempt => {
  const start = BigInt(ordinal) * 1_000_000_000n,
    total = BigInt(duration) * 1_000_000n
  return {
    schemaVersion: 1,
    runId: plan.runId,
    planHash: plan.planHash,
    attemptId: kind + '-' + ordinal,
    kind,
    ordinal,
    project,
    retry: 0,
    startedAt: '2026-08-13T12:00:01.000Z',
    host: { cgroup: 'v2' },
    versions: { node: '22', chromium: '1234', codeServer: '4.131.0' },
    browser: {
      context: kind === 'cold' ? 'fresh' : 'retained',
      cache: kind === 'cold' ? 'cleared' : 'retained',
      originStorage: kind === 'cold' ? 'cleared' : 'retained',
      prewarmedRuntime: false,
    },
    precheck: { passed: true, load: [0, 0, 0], availableMemoryKiB: 1 },
    runtime: {
      projectToken: 'project-' + project,
      identityDigest: 'identity-' + project,
      pidDigest: 'pid',
      startDigest: 'start',
      portToken: 'port-safe',
    },
    stableUrl: '/projects/' + project + '/workbench/',
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
    targetMs: kind === 'cold' ? 15000 : 2000,
    targetMet: true,
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
const fixture = (): MvpEvidenceBundle => {
  const plan = createMvpPlan(
    '00000000-0000-4000-8000-000000000035',
    '2026-08-13T12:00:00.000Z',
    1n
  )
  const attempts = [
    ...MVP_COLD_ORDER.map((project, index) =>
      makeAttempt(plan, 'cold', index + 1, project, 1000 + index)
    ),
    ...MVP_WARM_ORDER.map((project, index) =>
      makeAttempt(plan, 'warm', index + 6, project, 100 + index)
    ),
  ]
  const continuity = {
    schemaVersion: 1 as const,
    runId: plan.runId,
    planHash: plan.planHash,
    exactController: 'tests/e2e/session-switching.spec.ts' as const,
    count: 3 as const,
    runs: [1, 2, 3].map((ordinal) => ({
      ordinal,
      attemptId: 'continuity-' + ordinal,
      retry: 0 as const,
      sourceExecutionId: 'execution-' + ordinal,
      passed: true,
      failure: null,
      publicDigest: 'public',
      restrictedDigest: 'restricted',
      stateCrossingOrLoss: false,
      cleanupPassed: true,
    })),
  }
  const capacity = {
    schemaVersion: 1 as const,
    runId: plan.runId,
    planHash: plan.planHash,
    method: {
      integratedProduct: true as const,
      probe: {
        executable: '/usr/bin/true',
        args: [],
        command: '/usr/bin/true',
        timeoutMs: 1000,
      } as const,
      sampleOffsetsMs: [0, 1000, 2000, 3000, 4000] as const,
      workloadDurationMs: 7000,
      workloadTimeoutMs: 10000,
      workloadOutputLimitBytes: 4096,
      runtimeMethodComparableToBl004: true as const,
    },
    cohorts: [3, 5, 10].map((cohort) => ({
      cohort,
      attemptId: 'capacity-' + cohort,
      retry: 0 as const,
      fixtureCopies: cohort,
      fixtureManifestDigests: Array.from({ length: cohort }, () => 'fixture'),
      slots: Array.from({ length: cohort }, (_, index) => ({
        slot: index + 1,
      })) as never,
      samples: [] as never,
      workloads: Array.from({ length: cohort }, (_, index) => ({
        slot: index + 1,
        status: 'passed',
      })) as never,
      preProbePassed: true,
      postProbePassed: true,
      ready: cohort,
      requiredSamplesComplete: true,
      responsivenessPassed: true,
      cleanupPassed: true,
      residuals: 0,
      gate: (cohort === 3 ? 'met' : 'finding') as 'met' | 'finding',
      failures: [],
    })),
    comparison: [
      {
        cohort: 'historical-1',
        classification: 'not-comparable' as const,
        reason: 'no fresh one',
        baseline: 'baseline',
        observed: 'not-run',
      },
      ...[3, 5, 10].flatMap((cohort) => [
        {
          cohort,
          classification: 'comparable' as const,
          reason: 'same runtime method',
          baseline: 'baseline',
          observed: 'observed',
        },
        {
          cohort,
          classification: 'directional-only' as const,
          reason: 'service overhead',
          baseline: 'baseline',
          observed: 'observed',
        },
      ]),
    ],
    finalResidualAudit: {
      complete: true,
      runtimeResiduals: 0,
      listenerResiduals: 0,
      webResiduals: 0,
      databaseResiduals: 0,
      fixtureResiduals: 0,
      total: 0,
    },
  }
  const cold = calculateSectionStatistics(attempts.slice(0, 5), 15000),
    warm = calculateSectionStatistics(
      attempts.slice(5),
      2000,
      new Map([
        ['A', 'identity-A'],
        ['B', 'identity-B'],
        ['C', 'identity-C'],
      ])
    )
  const measurementHash = digestMvpPerformance({
    planHash: plan.planHash,
    attempts,
    continuity,
    capacity,
  })
  const metrics = {
    nfr002Metric4: 'met' as const,
    nfr001Metric3: 'met' as const,
    continuityMetric2: 'met' as const,
    nfr003Capacity3: 'met' as const,
  }
  const summary: MvpSummary = {
    schemaVersion: 1,
    runId: plan.runId,
    planHash: plan.planHash,
    measurementHash,
    completedAt: '2026-08-13T12:01:00.000Z',
    cold,
    warm,
    continuity: { successes: 3, total: 3, metric2: 1, disposition: 'met' },
    capacity: [3, 5, 10].map((cohort) => ({
      cohort,
      ready: cohort,
      workloadsPassed: cohort,
      requiredSamplesComplete: true,
      responsivenessPassed: true,
      cleanupPassed: true,
      gate: cohort === 3 ? 'met' : 'finding',
    })),
    metrics,
    overallDisposition: 'met',
    approval: null,
  }
  return {
    plan,
    attempts,
    continuity,
    capacity,
    summary,
    artifacts: {
      runId: plan.runId,
      artifacts: attempts.map((row) => ({
        attemptId: row.attemptId,
        screenshot: { status: 'captured' },
        trace: { status: 'captured' },
        network: { status: 'captured' },
      })),
    },
    recomputation: {
      measurementHash,
      matched: true,
      sourceAttemptIds: attempts.map((row) => row.attemptId),
    },
    residual: {
      complete: true,
      attemptBoundaries: attempts.map((row) => ({
        attemptId: row.attemptId,
        passed: true,
        residuals: 0,
      })),
      continuity: continuity.runs.map((row) => ({
        attemptId: row.attemptId,
        cleanupPassed: true,
      })),
      capacity: { total: 0 },
    },
  }
}
const rehash = (bundle: MvpEvidenceBundle) => {
  const hash = digestMvpPerformance({
    planHash: bundle.plan.planHash,
    attempts: bundle.attempts,
    continuity: bundle.continuity,
    capacity: bundle.capacity,
  })
  bundle.summary.measurementHash = hash
  bundle.recomputation.measurementHash = hash
}

describe('BL-015 strict evidence validator', () => {
  it('accepts one complete independently recomputable fixture', () => {
    expect(validateMvpEvidenceBundle(fixture())).toMatchObject({
      status: 'valid',
    })
  })
  it('accepts an explicitly retained failed artifact with blocker disposition', () => {
    const bundle = fixture()
    const row = bundle.attempts[14]!
    row.status = 'failed'
    row.failureClass = 'artifact-capture-failed'
    row.statisticalTotalNs = null
    row.targetMet = false
    row.artifacts.trace = 'failed'
    bundle.artifacts.artifacts[14]!.trace.status = 'failed'
    bundle.summary.warm = calculateSectionStatistics(
      bundle.attempts.slice(5),
      2000,
      new Map([
        ['A', 'identity-A'],
        ['B', 'identity-B'],
        ['C', 'identity-C'],
      ])
    )
    bundle.summary.metrics.nfr001Metric3 = 'blocker'
    bundle.summary.overallDisposition = 'blocker'
    rehash(bundle)
    expect(validateMvpEvidenceBundle(bundle)).toMatchObject({ status: 'valid' })
  })
  it('rejects one controlled mutation for every named invalid class', () => {
    const cases: Array<[string, (bundle: MvpEvidenceBundle) => void]> = [
      [
        'missing-or-duplicate-attempt',
        (bundle) => {
          bundle.attempts.pop()
        },
      ],
      [
        'missing-or-duplicate-attempt',
        (bundle) => {
          bundle.attempts[1]!.attemptId = bundle.attempts[0]!.attemptId
        },
      ],
      [
        'order-mismatch',
        (bundle) => {
          bundle.attempts[0]!.project = 'B'
        },
      ],
      [
        'retry-detected',
        (bundle) => {
          bundle.attempts[0]!.retry = 1 as 0
        },
      ],
      [
        'assigned-timing',
        (bundle) => {
          bundle.attempts[0]!.observedTotalNs = '1'
        },
      ],
      [
        'mixed-clock',
        (bundle) => {
          bundle.attempts[0]!.clock = 'Date.now' as 'process.hrtime.bigint'
        },
      ],
      [
        'plan-substitution',
        (bundle) => {
          bundle.attempts[0]!.planHash = 'changed'
        },
      ],
      [
        'threshold-substitution',
        (bundle) => {
          bundle.plan.targetsMs.cold = 1
          const body = { ...bundle.plan } as Record<string, unknown>
          delete body.planHash
          bundle.plan.planHash = digestMvpPerformance(body)
        },
      ],
      [
        'cold-identity-violation',
        (bundle) => {
          bundle.attempts[0]!.browser.prewarmedRuntime = true
        },
      ],
      [
        'warm-identity-violation',
        (bundle) => {
          bundle.attempts[8]!.runtime!.identityDigest = 'changed'
        },
      ],
      [
        'omitted-failure',
        (bundle) => {
          bundle.attempts[0]!.status = 'failed'
          bundle.attempts[0]!.statisticalTotalNs = null
        },
      ],
      [
        'timeout-bound-mismatch',
        (bundle) => {
          bundle.attempts[0]!.status = 'timeout'
          bundle.attempts[0]!.statisticalTotalNs = '1'
        },
      ],
      [
        'non-timeout-failure-inclusion',
        (bundle) => {
          bundle.attempts[0]!.status = 'failed'
        },
      ],
      [
        'pre-start-duration-violation',
        (bundle) => {
          bundle.attempts[0]!.status = 'pre-start-failed'
        },
      ],
      [
        'missing-artifact',
        (bundle) => {
          bundle.artifacts.artifacts.pop()
        },
      ],
      [
        'median-formula-mismatch',
        (bundle) => {
          bundle.summary.cold.medianNs = '1'
        },
      ],
      [
        'p95-formula-mismatch',
        (bundle) => {
          bundle.summary.cold.p95Ns = '1'
        },
      ],
      [
        'source-id-mismatch',
        (bundle) => {
          bundle.summary.cold.sortedSourceAttemptIds.reverse()
        },
      ],
      [
        'invalid-or-autonomous-approval',
        (bundle) => {
          bundle.summary.metrics.nfr002Metric4 = 'miss-accepted'
        },
      ],
      [
        'incorrect-overall-disposition',
        (bundle) => {
          bundle.summary.overallDisposition = 'blocker'
        },
      ],
      [
        'incomparable-capacity-method',
        (bundle) => {
          bundle.capacity.comparison = bundle.capacity.comparison.filter(
            (row) => row.classification !== 'directional-only'
          )
        },
      ],
      [
        'cleanup-leakage',
        (bundle) => {
          bundle.residual.complete = false
        },
      ],
      [
        'unsafe-disclosure',
        (bundle) => {
          bundle.attempts[0]!.host = { canonicalPath: '/private' }
          rehash(bundle)
        },
      ],
      [
        'capacity-order-mismatch',
        (bundle) => {
          bundle.capacity.cohorts.reverse()
        },
      ],
      [
        'capacity-fixture-or-retry',
        (bundle) => {
          bundle.capacity.cohorts[0]!.fixtureManifestDigests[0] = 'drift'
        },
      ],
      [
        'measurement-hash-mismatch',
        (bundle) => {
          bundle.summary.measurementHash = 'wrong'
        },
      ],
      [
        'recomputation-mismatch',
        (bundle) => {
          bundle.recomputation.matched = false
        },
      ],
    ]
    for (const [classification, mutate] of cases) {
      const bundle = fixture()
      mutate(bundle)
      expect(
        () => validateMvpEvidenceBundle(bundle),
        classification
      ).toThrowError(classification)
    }
  })
})
