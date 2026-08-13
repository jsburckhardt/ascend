import { createHash } from 'node:crypto'
import path from 'node:path'
import {
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
} from './workbench-capacity-contract.js'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'
import {
  BL014_FIXTURES,
  BL014_INITIAL_START_ORDER,
  BL014_RESOURCE_CLASSES,
  BL014_TRANSITION_ORDER,
  BL014_WORKFLOW_EXPECTATIONS,
} from './session-switching-contract.js'

export const MVP_PERFORMANCE_SCHEMA_VERSION = 1 as const
export const MVP_PERFORMANCE_WORK_ITEM = path.join(
  REPOSITORY_ROOT,
  'project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance'
)
export const MVP_PERFORMANCE_EVIDENCE_ROOT = path.join(
  MVP_PERFORMANCE_WORK_ITEM,
  'implementation/evidence'
)
export const MVP_PERFORMANCE_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-015'
)
export const MVP_PERFORMANCE_GUARD = path.join(
  MVP_PERFORMANCE_RESULT_ROOT,
  'active-run.json'
)
export const MVP_COLD_ORDER = Object.freeze(['A', 'B', 'C', 'A', 'B'] as const)
export const MVP_WARM_ORDER = Object.freeze([
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
] as const)
export const MVP_CONTINUITY_RUNS = 3
export const MVP_CAPACITY_COHORTS = Object.freeze([3, 5, 10] as const)
export const MVP_COLD_TIMEOUT_MS = 45_000
export const MVP_WARM_TIMEOUT_MS = 15_000
export const MVP_ARTIFACT_TIMEOUT_MS = 5_000
export const MVP_COLD_CLEANUP_TIMEOUT_MS = 10_000
export const MVP_WARM_REUSE_TIMEOUT_MS = 5_000
export const MVP_OVERALL_TIMEOUT_MS = 2_400_000
export const MVP_COLD_TARGET_MS = 15_000
export const MVP_WARM_TARGET_MS = 2_000
export const MVP_EVENTS = Object.freeze([
  'activation',
  'runtime-start-requested',
  'runtime-health-ready',
  'stable-document-ready',
  'explorer-sentinel-ready',
  'terminal-prompt-ready',
  'workbench-usable',
] as const)
export type MvpAttemptKind = 'cold' | 'warm'
export type MetricDisposition = 'met' | 'blocker' | 'miss-accepted'
export type ReleaseDisposition = 'met' | 'blocker'

export interface MvpPlan {
  schemaVersion: 1
  runId: string
  declaredAt: string
  declaredMonotonicNs: string
  controllerClock: {
    source: 'process.hrtime.bigint'
    unit: 'nanoseconds'
    precision: 'integer'
    presentation: 'milliseconds-rounded-to-three-decimals'
  }
  order: {
    sections: ['cold', 'warm', 'continuity', 'capacity']
    cold: readonly string[]
    warm: readonly string[]
    continuity: number
    capacity: readonly number[]
  }
  events: readonly string[]
  timeoutsMs: {
    coldAttempt: number
    warmAttempt: number
    artifactCapture: number
    coldCleanup: number
    warmReuseAudit: number
    overall: number
  }
  targetsMs: { cold: number; warm: number }
  cache: {
    cold: 'fresh-context-cleared-cache-origin-storage-no-runtime-prestart'
    warm: 'one-retained-cache-context-running-runtime'
  }
  formulas: {
    duration: '(endNs-startNs)/1000000'
    median: 'conventional-sorted-middle-average-for-even-count'
    p95: 'nearest-rank-ceil(0.95*n)'
    statisticalSet: 'successful-total-or-timeout-bound-only'
    metric2: 'continuity-passed/3'
  }
  failureRules: {
    retries: 0
    timeout: 'configured-bound-enters-statistics'
    nonTimeout: 'failure-and-miss-excluded-from-statistics'
    preStart: 'failure-and-miss-no-duration'
    artifact: 'evidence-failure-retained'
    defaultMiss: 'blocker'
  }
  fixtures: {
    projects: typeof BL014_FIXTURES
    bl014InitialStartOrder: typeof BL014_INITIAL_START_ORDER
    bl014Transitions: typeof BL014_TRANSITION_ORDER
    bl014Workflows: typeof BL014_WORKFLOW_EXPECTATIONS
    bl014ResourceClasses: typeof BL014_RESOURCE_CLASSES
  }
  capacityMethod: {
    baselineRunId: string
    cohorts: readonly number[]
    probe: typeof CAPACITY_PROBE
    sampleOffsetsMs: typeof CAPACITY_SAMPLE_OFFSETS_MS
    workloadDurationMs: number
    workloadTimeoutMs: number
    workloadOutputLimitBytes: number
    units: readonly string[]
  }
  planHash: string
}
export interface MvpRuntimeIdentity {
  projectToken: string
  identityDigest: string
  pidDigest: string
  startDigest: string
  portToken: string
}
export interface MvpAttempt {
  schemaVersion: 1
  runId: string
  planHash: string
  attemptId: string
  kind: MvpAttemptKind
  ordinal: number
  project: string
  retry: 0
  startedAt: string
  host: Record<string, unknown>
  versions: { node: string; chromium: string; codeServer: string }
  browser: {
    context: 'fresh' | 'retained'
    cache: 'cleared' | 'retained'
    originStorage: 'cleared' | 'retained'
    prewarmedRuntime: boolean
  }
  precheck: { passed: boolean; load: number[]; availableMemoryKiB: number }
  runtime: MvpRuntimeIdentity | null
  stableUrl: string
  clock: 'process.hrtime.bigint'
  eventsNs: Partial<Record<(typeof MVP_EVENTS)[number], string>>
  phasesNs: Record<string, string>
  observedTotalNs: string | null
  statisticalTotalNs: string | null
  status: 'success' | 'timeout' | 'failed' | 'pre-start-failed'
  failureClass: string | null
  targetMs: number
  targetMet: boolean
  artifacts: {
    screenshot: 'captured' | 'failed' | 'unavailable'
    trace: 'captured' | 'failed' | 'unavailable'
    network: 'captured' | 'failed' | 'unavailable'
    manifestId: string
  }
  boundary: {
    kind: 'absence' | 'reuse'
    passed: boolean
    measuredResiduals: number
    expectedIdentityCount: number
  }
  homeReturned: boolean
}
export interface MvpSectionStatistics {
  orderedAttemptIds: string[]
  sortedSourceAttemptIds: string[]
  sourceDurationsNs: string[]
  medianNs: string | null
  p95Ns: string | null
  maximumNs: string | null
  failures: number
  preStartFailures: number
  identityChanges: number
  targetMisses: number
}
export interface MvpSummary {
  schemaVersion: 1
  runId: string
  planHash: string
  measurementHash: string
  completedAt: string
  cold: MvpSectionStatistics
  warm: MvpSectionStatistics
  continuity: {
    successes: number
    total: 3
    metric2: number
    disposition: MetricDisposition
  }
  capacity: Array<{
    cohort: number
    ready: number
    workloadsPassed: number
    requiredSamplesComplete: boolean
    responsivenessPassed: boolean
    cleanupPassed: boolean
    gate: 'met' | 'blocker' | 'finding'
  }>
  metrics: {
    nfr002Metric4: MetricDisposition
    nfr001Metric3: MetricDisposition
    continuityMetric2: MetricDisposition
    nfr003Capacity3: MetricDisposition
  }
  overallDisposition: ReleaseDisposition
  approval: null | {
    approver: string
    reason: string
    risk: string
    followUpBacklogId: string
    evidenceHash: string
    createdAt: string
  }
}
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, entry) =>
    !entry || typeof entry !== 'object' || Array.isArray(entry)
      ? entry
      : Object.fromEntries(
          Object.entries(entry as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b)
          )
        )
  )
export const digestMvpPerformance = (value: unknown): string =>
  createHash('sha256').update(canonical(value)).digest('hex')
export const milliseconds = (nanoseconds: string | bigint): number =>
  Number(BigInt(nanoseconds)) / 1_000_000
export const presentMilliseconds = (nanoseconds: string | bigint): number =>
  Number(milliseconds(nanoseconds).toFixed(3))

export const createMvpPlan = (
  runId: string,
  declaredAt: string,
  declaredMonotonicNs: bigint,
  baselineRunId = '853037e6-5dab-43cf-bcf8-61f1e8bbdb18'
): MvpPlan => {
  const body = {
    schemaVersion: 1 as const,
    runId,
    declaredAt,
    declaredMonotonicNs: declaredMonotonicNs.toString(),
    controllerClock: {
      source: 'process.hrtime.bigint' as const,
      unit: 'nanoseconds' as const,
      precision: 'integer' as const,
      presentation: 'milliseconds-rounded-to-three-decimals' as const,
    },
    order: {
      sections: ['cold', 'warm', 'continuity', 'capacity'] as [
        'cold',
        'warm',
        'continuity',
        'capacity',
      ],
      cold: MVP_COLD_ORDER,
      warm: MVP_WARM_ORDER,
      continuity: MVP_CONTINUITY_RUNS,
      capacity: MVP_CAPACITY_COHORTS,
    },
    events: MVP_EVENTS,
    timeoutsMs: {
      coldAttempt: MVP_COLD_TIMEOUT_MS,
      warmAttempt: MVP_WARM_TIMEOUT_MS,
      artifactCapture: MVP_ARTIFACT_TIMEOUT_MS,
      coldCleanup: MVP_COLD_CLEANUP_TIMEOUT_MS,
      warmReuseAudit: MVP_WARM_REUSE_TIMEOUT_MS,
      overall: MVP_OVERALL_TIMEOUT_MS,
    },
    targetsMs: { cold: MVP_COLD_TARGET_MS, warm: MVP_WARM_TARGET_MS },
    cache: {
      cold: 'fresh-context-cleared-cache-origin-storage-no-runtime-prestart' as const,
      warm: 'one-retained-cache-context-running-runtime' as const,
    },
    formulas: {
      duration: '(endNs-startNs)/1000000' as const,
      median: 'conventional-sorted-middle-average-for-even-count' as const,
      p95: 'nearest-rank-ceil(0.95*n)' as const,
      statisticalSet: 'successful-total-or-timeout-bound-only' as const,
      metric2: 'continuity-passed/3' as const,
    },
    failureRules: {
      retries: 0 as const,
      timeout: 'configured-bound-enters-statistics' as const,
      nonTimeout: 'failure-and-miss-excluded-from-statistics' as const,
      preStart: 'failure-and-miss-no-duration' as const,
      artifact: 'evidence-failure-retained' as const,
      defaultMiss: 'blocker' as const,
    },
    fixtures: {
      projects: BL014_FIXTURES,
      bl014InitialStartOrder: BL014_INITIAL_START_ORDER,
      bl014Transitions: BL014_TRANSITION_ORDER,
      bl014Workflows: BL014_WORKFLOW_EXPECTATIONS,
      bl014ResourceClasses: BL014_RESOURCE_CLASSES,
    },
    capacityMethod: {
      baselineRunId,
      cohorts: MVP_CAPACITY_COHORTS,
      probe: CAPACITY_PROBE,
      sampleOffsetsMs: CAPACITY_SAMPLE_OFFSETS_MS,
      workloadDurationMs: CAPACITY_WORKLOAD_DURATION_MS,
      workloadTimeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
      workloadOutputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
      units: ['cpu-percent-proc-ticks', 'rss-kib', 'load-1-5-15', 'memory-kib'],
    },
  } satisfies Omit<MvpPlan, 'planHash'>
  return { ...body, planHash: digestMvpPerformance(body) }
}
export const medianNs = (values: bigint[]): bigint | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2n
}
export const nearestRankP95Ns = (values: bigint[]): bigint | null => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return sorted[Math.ceil(0.95 * sorted.length) - 1]!
}
export const calculateSectionStatistics = (
  attempts: MvpAttempt[],
  targetMs: number,
  expectedIdentities?: Map<string, string>
): MvpSectionStatistics => {
  const sources = attempts
    .flatMap((a) =>
      a.statisticalTotalNs === null
        ? []
        : [{ id: a.attemptId, value: BigInt(a.statisticalTotalNs) }]
    )
    .sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
  const values = sources.map((x) => x.value),
    median = medianNs(values),
    p95 = nearestRankP95Ns(values),
    maximum = values.length ? values.reduce((a, b) => (b > a ? b : a)) : null
  return {
    orderedAttemptIds: attempts.map((a) => a.attemptId),
    sortedSourceAttemptIds: sources.map((x) => x.id),
    sourceDurationsNs: sources.map((x) => x.value.toString()),
    medianNs: median?.toString() ?? null,
    p95Ns: p95?.toString() ?? null,
    maximumNs: maximum?.toString() ?? null,
    failures: attempts.filter((a) => a.status !== 'success').length,
    preStartFailures: attempts.filter((a) => a.status === 'pre-start-failed')
      .length,
    identityChanges: expectedIdentities
      ? attempts.filter(
          (a) => expectedIdentities.get(a.project) !== a.runtime?.identityDigest
        ).length
      : 0,
    targetMisses: attempts.filter(
      (a) =>
        a.status !== 'success' ||
        milliseconds(a.statisticalTotalNs ?? '0') > targetMs
    ).length,
  }
}
export const metricDisposition = (
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
export class MvpEvidenceError extends Error {
  constructor(
    readonly classification: string,
    message = classification
  ) {
    super(message)
    this.name = 'MvpEvidenceError'
  }
}
const invalid = (condition: unknown, classification: string): void => {
  if (!condition) throw new MvpEvidenceError(classification)
}
const validNs = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9]+$/u.test(value)
export const validateMvpPlan = (plan: MvpPlan): void => {
  const { planHash, ...body } = plan
  invalid(planHash === digestMvpPerformance(body), 'plan-hash-mismatch')
  invalid(
    JSON.stringify(plan.order.sections) ===
      JSON.stringify(['cold', 'warm', 'continuity', 'capacity']) &&
      JSON.stringify(plan.order.cold) === JSON.stringify(MVP_COLD_ORDER) &&
      JSON.stringify(plan.order.warm) === JSON.stringify(MVP_WARM_ORDER) &&
      JSON.stringify(plan.order.capacity) ===
        JSON.stringify(MVP_CAPACITY_COHORTS),
    'order-mismatch'
  )
  invalid(
    plan.targetsMs.cold === MVP_COLD_TARGET_MS &&
      plan.targetsMs.warm === MVP_WARM_TARGET_MS,
    'threshold-substitution'
  )
  invalid(plan.failureRules.retries === 0, 'retry-detected')
  invalid(
    plan.controllerClock.source === 'process.hrtime.bigint',
    'mixed-clock'
  )
}
export const validateMvpAttempts = (
  plan: MvpPlan,
  attempts: MvpAttempt[]
): void => {
  const expected = [...MVP_COLD_ORDER, ...MVP_WARM_ORDER]
  invalid(attempts.length === expected.length, 'missing-or-duplicate-attempt')
  invalid(
    new Set(attempts.map((a) => a.attemptId)).size === attempts.length,
    'missing-or-duplicate-attempt'
  )
  invalid(
    JSON.stringify(attempts.map((a) => a.project)) === JSON.stringify(expected),
    'order-mismatch'
  )
  for (const [index, a] of attempts.entries()) {
    invalid(a.ordinal === index + 1, 'order-mismatch')
    invalid(a.retry === 0, 'retry-detected')
    invalid(
      a.runId === plan.runId && a.planHash === plan.planHash,
      'plan-substitution'
    )
    invalid(a.clock === 'process.hrtime.bigint', 'mixed-clock')
    invalid(
      a.targetMs ===
        (a.kind === 'cold' ? MVP_COLD_TARGET_MS : MVP_WARM_TARGET_MS),
      'threshold-substitution'
    )
    const start = a.eventsNs.activation,
      end = a.eventsNs['workbench-usable']
    if (a.status === 'pre-start-failed') {
      invalid(
        a.observedTotalNs === null && a.statisticalTotalNs === null,
        'pre-start-duration-violation'
      )
    } else {
      invalid(validNs(start), 'assigned-timing')
      if (end !== undefined) invalid(validNs(end), 'assigned-timing')
      if (validNs(start) && validNs(end)) {
        const total = BigInt(end) - BigInt(start)
        invalid(
          total >= 0n && a.observedTotalNs === total.toString(),
          'assigned-timing'
        )
      }
    }
    if (a.status === 'timeout') {
      const bound =
        BigInt(a.kind === 'cold' ? MVP_COLD_TIMEOUT_MS : MVP_WARM_TIMEOUT_MS) *
        1_000_000n
      invalid(
        a.statisticalTotalNs === bound.toString(),
        'timeout-bound-mismatch'
      )
    }
    if (a.status === 'failed')
      invalid(a.statisticalTotalNs === null, 'non-timeout-failure-inclusion')
    invalid(
      a.artifacts.screenshot !== 'unavailable' &&
        a.artifacts.trace !== 'unavailable' &&
        a.artifacts.network !== 'unavailable',
      'missing-artifact'
    )
    invalid(a.boundary.passed, 'cleanup-leakage')
    if (a.kind === 'cold') {
      invalid(
        !a.browser.prewarmedRuntime && a.boundary.kind === 'absence',
        'cold-identity-violation'
      )
    } else invalid(a.boundary.kind === 'reuse', 'warm-identity-violation')
  }
}
export const assertPublicEvidenceSafe = (value: unknown): void => {
  invalid(
    !/(?:127[.]0[.]0[.]1:[0-9]+|localhost:[0-9]+|canonicalPath|internalUrl|authorization|cookie|password|secret|token=)/iu.test(
      JSON.stringify(value)
    ),
    'unsafe-disclosure'
  )
}
