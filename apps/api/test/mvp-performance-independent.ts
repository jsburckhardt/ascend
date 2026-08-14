import type { IntegratedCapacityRecord } from '../src/mvp-performance-capacity.js'
import type {
  MvpAttempt,
  MvpSectionStatistics,
} from '../src/mvp-performance-contract.js'
import type { ScheduledSample } from '../src/workbench-capacity-contract.js'

export const testRecomputePhases = (attempt: MvpAttempt) => {
  const order = [
    'activation',
    'runtime-start-requested',
    'runtime-health-ready',
    'stable-document-ready',
    'explorer-sentinel-ready',
    'terminal-prompt-ready',
    'workbench-usable',
  ] as const
  const phases: Record<string, string> = {}
  for (let index = 1; index < order.length; index += 1) {
    const before = attempt.eventsNs[order[index - 1]!]
    const after = attempt.eventsNs[order[index]!]
    if (before !== undefined && after !== undefined)
      phases[order[index - 1] + '-to-' + order[index]] = (
        BigInt(after) - BigInt(before)
      ).toString()
  }
  const start = attempt.eventsNs.activation
  const end = attempt.eventsNs['workbench-usable']
  if (start !== undefined && end !== undefined)
    phases.total = (BigInt(end) - BigInt(start)).toString()
  return phases
}
export const testRecomputeSection = (
  attempts: MvpAttempt[],
  targetMs: number,
  expected?: Map<string, string>
): MvpSectionStatistics => {
  const sources = attempts
    .flatMap((attempt) =>
      attempt.statisticalTotalNs === null
        ? []
        : [{ id: attempt.attemptId, value: BigInt(attempt.statisticalTotalNs) }]
    )
    .sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0))
  const values = sources.map((source) => source.value)
  const middle = Math.floor(values.length / 2)
  const median = !values.length
    ? null
    : values.length % 2
      ? values[middle]!
      : (values[middle - 1]! + values[middle]!) / 2n
  return {
    orderedAttemptIds: attempts.map((attempt) => attempt.attemptId),
    sortedSourceAttemptIds: sources.map((source) => source.id),
    sourceDurationsNs: values.map(String),
    medianNs: median?.toString() ?? null,
    p95Ns: values[Math.ceil(values.length * 0.95) - 1]?.toString() ?? null,
    maximumNs: values.at(-1)?.toString() ?? null,
    failures: attempts.filter((attempt) => attempt.status !== 'success').length,
    preStartFailures: attempts.filter(
      (attempt) => attempt.status === 'pre-start-failed'
    ).length,
    identityChanges: expected
      ? attempts.filter(
          (attempt) =>
            expected.get(attempt.project) !== attempt.runtime?.identityDigest
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
type Field = IntegratedCapacityRecord['comparison'][number]['field']
const fields: readonly Field[] = [
  'load1Average',
  'minimumAvailableMemoryKiB',
  'runtimeCpuAveragePercent',
  'runtimeRssAverageKiB',
]
const raw = (samples: ScheduledSample[], field: Field) => {
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
  const value =
    field === 'minimumAvailableMemoryKiB'
      ? Math.min(...values)
      : values.reduce((sum, item) => sum + item, 0) / values.length
  return { sampleCount: values.length, value: Number(value.toFixed(6)) }
}
export const testRecomputeDeltas = (input: {
  baselineRunId: string
  currentRunId: string
  method: string
  baselineSamples: ScheduledSample[]
  cohorts: IntegratedCapacityRecord['cohorts']
}): IntegratedCapacityRecord['comparison'] => [
  ...fields.map((field) => ({
    cohort: 'historical-1' as const,
    field,
    classification: 'not-comparable' as const,
    reason: 'BL-015 has no fresh one-member cohort raw source',
    baseline: {
      runId: input.baselineRunId,
      method: input.method,
      sourceFile:
        'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/' +
        input.baselineRunId +
        '/samples.json',
      ...raw(
        input.baselineSamples.filter((sample) => sample.cohort === 1),
        field
      ),
    },
    current: null,
    delta: null,
  })),
  ...[3, 5, 10].flatMap((cohort) =>
    fields.map((field) => {
      const baseline = raw(
        input.baselineSamples.filter((sample) => sample.cohort === cohort),
        field
      )
      const current = raw(
        input.cohorts.find((row) => row.cohort === cohort)!.samples,
        field
      )
      const runtime = field.startsWith('runtime')
      return {
        cohort,
        field,
        classification: runtime
          ? ('comparable' as const)
          : ('directional-only' as const),
        reason: runtime
          ? 'identical BL-004 proc sampling field formula schedule units and runtime-tree scope'
          : 'same raw host field and schedule but BL-015 includes integrated API and web service load',
        baseline: {
          runId: input.baselineRunId,
          method: input.method,
          sourceFile:
            'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/' +
            input.baselineRunId +
            '/samples.json',
          ...baseline,
        },
        current: {
          runId: input.currentRunId,
          method: runtime
            ? input.method
            : input.method +
              '; integrated API and web services included in host totals',
          sourceFile:
            'project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance/implementation/evidence/' +
            input.currentRunId +
            '/capacity.json',
          ...current,
        },
        delta: Number((current.value - baseline.value).toFixed(6)),
      }
    })
  ),
]
