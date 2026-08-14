import { describe, expect, it } from 'vitest'
import {
  MVP_COLD_ORDER,
  MVP_WARM_ORDER,
  createMvpPlan,
  digestMvpPerformance,
  type MvpAttempt,
  type MvpSummary,
} from '../src/mvp-performance-contract.js'
import type { IntegratedCapacityRecord } from '../src/mvp-performance-capacity.js'
import type { MvpEvidenceBundle } from '../src/mvp-performance-validator.js'
import {
  validateMvpEvidenceBundle,
  validateMvpInterruptedEvidence,
} from '../src/mvp-performance-validator.js'
import {
  testRecomputeDeltas,
  testRecomputePhases,
  testRecomputeSection,
} from './mvp-performance-independent.js'

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
    host: plan.designatedHost,
    versions: { node: '22', chromium: '1234', codeServer: '4.131.0' },
    browser: {
      context: kind === 'cold' ? 'fresh' : 'retained',
      cache: kind === 'cold' ? 'cleared' : 'retained',
      originStorage: kind === 'cold' ? 'cleared' : 'retained',
      prewarmedRuntime: false,
    },
    precheck: {
      passed: true,
      load: [0, 0, 0],
      availableMemoryKiB: 1,
      runtimeAudit:
        kind === 'warm'
          ? {
              healthPassed: true,
              identityUnchanged: true,
              listenerCount: 1,
              duplicateRuntimeCount: 0,
              transientResourceCount: 0,
            }
          : null,
    },
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
    phasesNs: {
      'activation-to-runtime-start-requested': '1',
      'runtime-start-requested-to-runtime-health-ready': '1',
      'runtime-health-ready-to-stable-document-ready': '1',
      'stable-document-ready-to-explorer-sentinel-ready': '1',
      'explorer-sentinel-ready-to-terminal-prompt-ready': (
        total - 4n
      ).toString(),
      'terminal-prompt-ready-to-workbench-usable': '0',
      total: total.toString(),
    },
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
      runtimeAudit:
        kind === 'warm'
          ? {
              healthPassed: true,
              identityUnchanged: true,
              listenerCount: 1,
              duplicateRuntimeCount: 0,
              transientResourceCount: 0,
            }
          : null,
    },
    homeReturned: kind === 'warm',
  }
}
const samplesFor = (runId: string, cohort: number, base: number) =>
  Array.from({ length: 10 }, (_, index) => ({
    runId,
    cohort,
    window: index < 5 ? 'idle' : 'active',
    position: index % 5,
    targetOffsetMs: (index % 5) * 1000,
    targetMonotonicMs: index * 1000,
    actualMonotonicMs: index * 1000,
    host: {
      timestamp: '2026-08-13T12:00:00.000Z',
      monotonicMs: index * 1000,
      loadAverage: [base + index, 0, 0],
      availableMemoryKiB: base * 1000 - index,
      usedMemoryKiB: 1,
      responsiveness: { passed: true },
    },
    processTrees: Array.from({ length: cohort }, (_, slot) => ({
      slot: slot + 1,
      sample: {
        timestamp: '2026-08-13T12:00:00.000Z',
        monotonicMs: index * 1000,
        rootPid: slot + 1,
        cpuPercent: base + index + slot,
        rssKiB: base * 100 + index + slot,
        memberPids: [slot + 1],
      },
      absentReason: null,
    })),
    absentReason: null,
  })) as never
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
  const baselineRunId = plan.capacityMethod.baselineRunId
  const measurementMethod = 'test raw proc measurement method'
  const baselineSamples = [1, 3, 5, 10].flatMap((cohort) =>
    samplesFor(baselineRunId, cohort, 100 + cohort)
  )
  const cohorts: IntegratedCapacityRecord['cohorts'] = [3, 5, 10].map(
    (cohort) => ({
      cohort,
      attemptId: 'capacity-' + cohort,
      retry: 0 as const,
      fixtureCopies: cohort,
      fixtureManifestDigests: Array.from({ length: cohort }, () => 'fixture'),
      slots: Array.from({ length: cohort }, (_, index) => ({
        slot: index + 1,
      })) as never,
      samples: samplesFor(plan.runId, cohort, 200 + cohort),
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
    })
  )
  const capacity: IntegratedCapacityRecord = {
    schemaVersion: 1,
    runId: plan.runId,
    planHash: plan.planHash,
    method: {
      integratedProduct: true,
      probe: {
        executable: '/usr/bin/true',
        args: [],
        command: '/usr/bin/true',
        timeoutMs: 1000,
      },
      sampleOffsetsMs: [0, 1000, 2000, 3000, 4000],
      workloadDurationMs: 7000,
      workloadTimeoutMs: 10000,
      workloadOutputLimitBytes: 4096,
      runtimeMethodComparableToBl004: true,
      baselineRunId,
      baselineMeasurementMethod: measurementMethod,
    },
    cohorts,
    comparison: testRecomputeDeltas({
      baselineRunId,
      currentRunId: plan.runId,
      method: measurementMethod,
      baselineSamples,
      cohorts,
    }),
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
  const cold = testRecomputeSection(attempts.slice(0, 5), 15000),
    warm = testRecomputeSection(
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
  const hostDigest = digestMvpPerformance(plan.designatedHost)
  const sectionStatus = {
    overallBoundMs: plan.timeoutsMs.overall,
    overallToleranceMs: plan.timeoutsMs.overallTolerance,
    sections: [
      ['prerequisites', plan.timeoutsMs.sections.prerequisites],
      [
        'cold-warm',
        plan.timeoutsMs.sections.cold + plan.timeoutsMs.sections.warm,
      ],
      ['continuity', plan.timeoutsMs.sections.continuity],
      ['capacity', plan.timeoutsMs.sections.capacity],
      [
        'cleanup-and-finalization',
        plan.timeoutsMs.sections.cleanupAndFinalization,
      ],
    ].map(([name, boundMs], index) => ({
      name: String(name),
      boundMs: Number(boundMs),
      startedElapsedMs: index * 100,
      endedElapsedMs: index * 100 + 50,
      status: 'complete',
      partialEvidenceRetained: false,
    })),
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
        screenshot: {
          status: 'captured',
          digest: 'screenshot-digest',
          restrictedPath:
            'test-results/bl-015/' + plan.runId + '/' + row.attemptId + '.png',
          requiredMode: '0600' as const,
          protectedData: true as const,
        },
        trace: {
          status: 'captured',
          digest: 'trace-digest',
          restrictedPath:
            'test-results/bl-015/' + plan.runId + '/' + row.attemptId + '.zip',
          requiredMode: '0600' as const,
          protectedData: true as const,
        },
        network: { status: 'captured', entries: [] },
      })),
    },
    recomputation: {
      schemaVersion: 1,
      runId: plan.runId,
      measurementHash,
      sourceAttemptIds: attempts.map((row) => row.attemptId),
      cold,
      warm,
      continuitySuccesses: 3,
      capacity: summary.capacity,
      capacityDeltas: capacity.comparison,
      metrics,
      overallDisposition: 'met',
      matched: true,
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
    hostVerification: {
      declaration: plan.designatedHost,
      start: plan.designatedHost,
      startDigest: hostDigest,
      startMatchesDeclaration: true,
      end: plan.designatedHost,
      endDigest: hostDigest,
      endMatchesStart: true,
      endMatchesDeclaration: true,
    },
    sectionStatus,
    runStatus: {
      status: 'complete',
      elapsedMs: 500,
      overallBoundMs: plan.timeoutsMs.overall,
      overallToleranceMs: plan.timeoutsMs.overallTolerance,
    },
    recovery: {
      completedAttemptIds: attempts.map((row) => row.attemptId),
      inProgress: null,
      fabricatedAttempts: 0,
    },
    baseline: {
      runId: baselineRunId,
      measurementMethod,
      samples: baselineSamples,
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
  bundle.recomputation = {
    schemaVersion: 1,
    runId: bundle.plan.runId,
    measurementHash: hash,
    sourceAttemptIds: bundle.attempts.map((row) => row.attemptId),
    cold: bundle.summary.cold,
    warm: bundle.summary.warm,
    continuitySuccesses: bundle.summary.continuity.successes,
    capacity: bundle.summary.capacity,
    capacityDeltas: bundle.capacity.comparison,
    metrics: bundle.summary.metrics,
    overallDisposition: bundle.summary.overallDisposition,
    matched: true,
  }
}

describe('BL-015 strict evidence validator', () => {
  it('accepts one complete independently recomputable fixture', () => {
    const bundle = fixture()
    for (const attempt of bundle.attempts)
      expect(attempt.phasesNs).toEqual(testRecomputePhases(attempt))
    expect(validateMvpEvidenceBundle(bundle)).toMatchObject({
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
    bundle.summary.warm = testRecomputeSection(
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
  it('accepts honest interrupted partial evidence and rejects fabricated recovery', () => {
    const bundle = fixture()
    const input = {
      runStatus: { status: 'failed', partialEvidenceRetained: true },
      recovery: {
        completedAttemptIds: bundle.attempts
          .slice(0, 4)
          .map((row) => row.attemptId),
        inProgress: { attemptId: bundle.attempts[4]!.attemptId },
        fabricatedAttempts: 0,
      },
      sectionStatus: {
        ...bundle.sectionStatus,
        sections: bundle.sectionStatus.sections.map((row, index) =>
          index === 1 ? { ...row, status: 'timed-out' } : row
        ),
      },
    }
    expect(() => validateMvpInterruptedEvidence(input)).not.toThrow()
    input.recovery.fabricatedAttempts = 1
    expect(() => validateMvpInterruptedEvidence(input)).toThrowError(
      'interrupted-partial-evidence-invalid'
    )
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
        'capacity-delta-mismatch',
        (bundle) => {
          bundle.capacity.comparison = bundle.capacity.comparison.filter(
            (row) => row.classification !== 'directional-only'
          )
        },
      ],
      [
        'phase-order-mismatch',
        (bundle) => {
          bundle.attempts[0]!.eventsNs['runtime-health-ready'] = '0'
        },
      ],
      [
        'phase-duration-mismatch',
        (bundle) => {
          bundle.attempts[0]!.phasesNs[
            'runtime-start-requested-to-runtime-health-ready'
          ] = '2'
        },
      ],
      [
        'artifact-mode-content-or-path',
        (bundle) => {
          bundle.artifacts.artifacts[0]!.trace.requiredMode = '0644' as '0600'
        },
      ],
      [
        'artifact-mode-content-or-path',
        (bundle) => {
          bundle.artifacts.artifacts[0]!.trace.protectedData = false as true
        },
      ],
      [
        'artifact-mode-content-or-path',
        (bundle) => {
          bundle.artifacts.artifacts[0]!.trace.restrictedPath =
            'project/public-trace.zip'
        },
      ],
      [
        'missing-host-declaration',
        (bundle) => {
          bundle.plan.designatedHost = undefined as never
          const body = { ...bundle.plan } as Record<string, unknown>
          delete body.planHash
          bundle.plan.planHash = digestMvpPerformance(body)
        },
      ],
      [
        'warm-health-failed',
        (bundle) => {
          bundle.attempts[5]!.precheck.runtimeAudit!.healthPassed = false
        },
      ],
      [
        'warm-listener-mismatch',
        (bundle) => {
          bundle.attempts[5]!.boundary.runtimeAudit!.listenerCount = 2
        },
      ],
      [
        'warm-duplicate-runtime',
        (bundle) => {
          bundle.attempts[5]!.precheck.runtimeAudit!.duplicateRuntimeCount = 1
        },
      ],
      [
        'warm-transient-resource',
        (bundle) => {
          bundle.attempts[5]!.boundary.runtimeAudit!.transientResourceCount = 1
        },
      ],
      [
        'capacity-source-mismatch',
        (bundle) => {
          bundle.baseline.runId = 'wrong-baseline-run'
        },
      ],
      [
        'capacity-delta-mismatch',
        (bundle) => {
          bundle.capacity.comparison[4]!.delta = 999
        },
      ],
      [
        'section-or-overall-bound-mismatch',
        (bundle) => {
          bundle.sectionStatus.sections[1]!.boundMs -= 1
        },
      ],
      [
        'section-or-overall-bound-mismatch',
        (bundle) => {
          bundle.runStatus.elapsedMs = bundle.plan.timeoutsMs.overall + 1001
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
          bundle.attempts[0]!.stableUrl += '?token=private'
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
