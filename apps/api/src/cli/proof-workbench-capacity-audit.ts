import { access } from 'node:fs/promises'
import { CAPACITY_ACTIVE_GUARD } from '../workbench-capacity-contract.js'
import {
  listRetainedCapacityRuns,
  readCapacityEvidence,
  renderCapacityComparison,
} from '../workbench-capacity-evidence.js'
import {
  listenerIdentityAbsent,
  processIdentityAbsent,
} from '../workbench-proof-audit.js'
import { snapshotFixture } from '../workbench-proof-contract.js'

export const runCapacityAuditCli = async (
  write: (value: string) => void = (value) => process.stdout.write(value + '\n')
): Promise<number> => {
  const failures: string[] = []
  try {
    await access(CAPACITY_ACTIVE_GUARD)
    failures.push('active-run-guard-present')
  } catch {
    /* expected */
  }
  const directories = await listRetainedCapacityRuns()
  const currentFixture = await snapshotFixture()
  for (const directory of directories) {
    try {
      const evidence = await readCapacityEvidence(directory)
      if (evidence.run.cohorts.length === 4) {
        if (
          renderCapacityComparison(
            evidence.run,
            evidence.samples,
            evidence.workloads
          ) !== evidence.comparison
        )
          failures.push('comparison-drift:' + evidence.run.runId)
        if (
          !evidence.run.fixture.unchanged ||
          JSON.stringify(evidence.run.fixture.after) !==
            JSON.stringify(currentFixture)
        )
          failures.push('fixture-integrity:' + evidence.run.runId)
        for (const slot of evidence.run.cohorts.flatMap(({ slots }) => slots)) {
          if (
            !(
              await Promise.all(
                slot.processIdentities.map(processIdentityAbsent)
              )
            ).every(Boolean)
          )
            failures.push(
              'managed-process-present:' +
                evidence.run.runId +
                ':' +
                slot.cohort +
                ':' +
                slot.slot
            )
          for (const listener of slot.attributedListeners ??
            (slot.listener ? [slot.listener] : []))
            if (!(await listenerIdentityAbsent(listener)))
              failures.push(
                'managed-listener-present:' +
                  evidence.run.runId +
                  ':' +
                  slot.cohort +
                  ':' +
                  slot.slot +
                  ':' +
                  listener.pid
              )
        }
        for (const workload of evidence.workloads.workloads)
          if (
            workload.pid &&
            workload.startTimeTicks &&
            !(await processIdentityAbsent({
              pid: workload.pid,
              startTimeTicks: workload.startTimeTicks,
            }))
          )
            failures.push(
              'workload-present:' +
                evidence.run.runId +
                ':' +
                workload.cohort +
                ':' +
                workload.slot
            )
      }
    } catch (error) {
      failures.push(
        'evidence-invalid:' +
          directory +
          ':' +
          (error instanceof Error ? error.message : 'unknown')
      )
    }
  }
  write(
    JSON.stringify({
      event: 'workbench.capacity.audit',
      passed: failures.length === 0,
      retainedRuns: directories.length,
      activeGuardAbsent: !failures.includes('active-run-guard-present'),
      attributedResourcesAbsent: !failures.some((failure) =>
        failure.includes('present:')
      ),
      fixtureIntegrityUnchanged: !failures.some((failure) =>
        failure.startsWith('fixture-integrity')
      ),
      failures,
    })
  )
  return failures.length ? 1 : 0
}
if (
  process.argv[1] &&
  import.meta.url === new URL('file:' + process.argv[1]).href
)
  process.exitCode = await runCapacityAuditCli()
