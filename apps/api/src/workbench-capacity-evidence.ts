import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import {
  CAPACITY_EVIDENCE_ROOT,
  type CapacityRunRecord,
  type CapacitySamplesEvidence,
  type CapacityWorkloadsEvidence,
  validateCapacityEvidence,
} from './workbench-capacity-contract.js'

const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n'
const atomicWrite = async (target: string, content: string): Promise<void> => {
  const temporary = target + '.tmp-' + process.pid
  try {
    await writeFile(temporary, content, { flag: 'wx' })
    await rename(temporary, target)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined)
    throw error
  }
}
const average = (values: number[]): string =>
  values.length
    ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)
    : 'n/a'
const maximum = (values: number[]): string =>
  values.length ? Math.max(...values).toFixed(2) : 'n/a'
export const renderCapacityComparison = (
  run: CapacityRunRecord,
  samples: CapacitySamplesEvidence,
  workloads: CapacityWorkloadsEvidence
): string => {
  const splitCompleteness = Boolean(run.finalCleanup)
  const lines = [
    '# Workbench capacity baseline ' + run.runId,
    '',
    'Three-member gate: **' +
      (run.threeMemberGate.passed ? 'passed' : 'failed') +
      '**',
    'Overall disposition: **' + run.overallDisposition + '**',
    '',
    splitCompleteness
      ? '| Cohort | Requested | Ready | Failed | Unstarted | Workload pass/fail | Host retained/absent | Process trees retained/absent | Missing reasons | Host load avg/max | Host available KiB min | Process CPU avg/max % | Process RSS KiB avg/max | Responsiveness | Cleanup / integrity | Findings | Gate |'
      : '| Cohort | Requested | Ready | Failed | Unstarted | Workload pass/fail | Samples retained/absent | Host load avg/max | Host available KiB min | Process CPU avg/max % | Process RSS KiB avg/max | Responsiveness | Cleanup / integrity | Findings | Gate |',
    splitCompleteness
      ? '|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---|---|---|'
      : '|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|',
  ]
  for (const cohort of run.cohorts) {
    const cohortSamples = samples.samples.filter(
      ({ cohort: value }) => value === cohort.requested
    )
    const hostSamples = cohortSamples.flatMap(({ host }) =>
      host ? [host] : []
    )
    const processSamples = cohortSamples.flatMap(({ processTrees }) =>
      processTrees.flatMap(({ sample }) => (sample ? [sample] : []))
    )
    const cohortWorkloads = workloads.workloads.filter(
      ({ cohort: value }) => value === cohort.requested
    )
    const counts = {
      ready: cohort.slots.filter(({ state }) => state === 'ready').length,
      failed: cohort.slots.filter(({ state }) => state === 'failed').length,
      unstarted: cohort.slots.filter(({ state }) => state === 'unstarted')
        .length,
      passed: cohortWorkloads.filter(({ status }) => status === 'passed')
        .length,
    }
    const load = hostSamples.map(({ loadAverage }) => loadAverage[0])
    const available = hostSamples.map(
      ({ availableMemoryKiB }) => availableMemoryKiB
    )
    const cpu = processSamples.map(({ cpuPercent }) => cpuPercent)
    const rss = processSamples.map(({ rssKiB }) => rssKiB)
    const hostRetained = cohortSamples.filter(({ host }) => host).length
    const processEntries = cohortSamples.flatMap(
      ({ processTrees }) => processTrees
    )
    const processRetained = processEntries.filter(({ sample }) => sample).length
    const missingReasons = [
      ...cohortSamples.flatMap(({ absentReason }) =>
        absentReason ? [absentReason] : []
      ),
      ...processEntries.flatMap(({ absentReason }) =>
        absentReason ? [absentReason] : []
      ),
    ]
    const responsive =
      cohort.preProbe.passed &&
      cohort.postCleanupProbe.passed &&
      hostSamples.every(({ responsiveness }) => responsiveness.passed)
    const completenessColumns = splitCompleteness
      ? hostRetained +
        '/' +
        (cohortSamples.length - hostRetained) +
        ' | ' +
        processRetained +
        '/' +
        (processEntries.length - processRetained) +
        ' | ' +
        ([...new Set(missingReasons)].join('; ') || 'none')
      : hostRetained + '/' + (cohortSamples.length - hostRetained)
    lines.push(
      '| ' +
        cohort.requested +
        ' | ' +
        cohort.requested +
        ' | ' +
        counts.ready +
        ' | ' +
        counts.failed +
        ' | ' +
        counts.unstarted +
        ' | ' +
        counts.passed +
        '/' +
        (cohortWorkloads.length - counts.passed) +
        ' | ' +
        completenessColumns +
        ' | ' +
        average(load) +
        '/' +
        maximum(load) +
        ' | ' +
        (available.length ? Math.min(...available) : 'n/a') +
        ' | ' +
        average(cpu) +
        '/' +
        maximum(cpu) +
        ' | ' +
        average(rss) +
        '/' +
        maximum(rss) +
        ' | ' +
        (responsive ? 'passed' : 'failed') +
        ' | ' +
        (cohort.cleanup.passed ? 'passed' : 'failed') +
        ' / ' +
        (cohort.integrity.passed ? 'passed' : 'failed') +
        ' | ' +
        (cohort.findings.join('; ') || 'none') +
        ' | ' +
        cohort.gateStatus +
        ' |'
    )
  }
  lines.push(
    '',
    '## Exit reasons',
    '',
    ...(run.exitReasons.length
      ? run.exitReasons.map((reason) => '- ' + reason)
      : ['- none']),
    ''
  )
  return lines.join('\n')
}

export const writeCapacityEvidence = async (
  run: CapacityRunRecord,
  samples: CapacitySamplesEvidence,
  workloads: CapacityWorkloadsEvidence,
  validate = true
): Promise<string> => {
  if (validate) validateCapacityEvidence(run, samples, workloads)
  await mkdir(CAPACITY_EVIDENCE_ROOT, { recursive: true })
  const directory = path.join(CAPACITY_EVIDENCE_ROOT, run.runId)
  await mkdir(directory)
  const comparison = renderCapacityComparison(run, samples, workloads)
  try {
    await atomicWrite(path.join(directory, 'run.json'), json(run))
    await atomicWrite(path.join(directory, 'samples.json'), json(samples))
    await atomicWrite(path.join(directory, 'workloads.json'), json(workloads))
    await atomicWrite(path.join(directory, 'comparison.md'), comparison)
  } catch (error) {
    throw new Error(
      'capacity-evidence-write-failed:' +
        (error instanceof Error ? error.message : 'unknown')
    )
  }
  return directory
}
export const readCapacityEvidence = async (
  directory: string
): Promise<{
  run: CapacityRunRecord
  samples: CapacitySamplesEvidence
  workloads: CapacityWorkloadsEvidence
  comparison: string
}> => ({
  run: JSON.parse(
    await readFile(path.join(directory, 'run.json'), 'utf8')
  ) as CapacityRunRecord,
  samples: JSON.parse(
    await readFile(path.join(directory, 'samples.json'), 'utf8')
  ) as CapacitySamplesEvidence,
  workloads: JSON.parse(
    await readFile(path.join(directory, 'workloads.json'), 'utf8')
  ) as CapacityWorkloadsEvidence,
  comparison: await readFile(path.join(directory, 'comparison.md'), 'utf8'),
})
export const listRetainedCapacityRuns = async (): Promise<string[]> => {
  try {
    return (await readdir(CAPACITY_EVIDENCE_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(CAPACITY_EVIDENCE_ROOT, entry.name))
      .sort()
  } catch {
    return []
  }
}
