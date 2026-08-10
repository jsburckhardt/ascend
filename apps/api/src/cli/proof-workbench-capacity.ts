import { randomUUID } from 'node:crypto'
import { access } from 'node:fs/promises'
import {
  CAPACITY_ACTIVE_GUARD,
  CAPACITY_OVERALL_TIMEOUT_MS,
  CAPACITY_PROBE,
  CAPACITY_WORKLOAD_COMMAND,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  relativeEvidencePaths,
  type CapacityRunRecord,
} from '../workbench-capacity-contract.js'
import { coordinateCapacityRun } from '../workbench-capacity-coordinator.js'
import { writeCapacityEvidence } from '../workbench-capacity-evidence.js'
import {
  acquireCapacityGuard,
  checkCapacityPrerequisites,
  releaseCapacityGuard,
} from '../workbench-capacity-prerequisites.js'
import { snapshotFixture } from '../workbench-proof-contract.js'

export interface CapacityCliIo {
  stdout(value: string): void
  stderr(value: string): void
}
const defaultIo: CapacityCliIo = {
  stdout: (value) => process.stdout.write(value + '\n'),
  stderr: (value) => process.stderr.write(value + '\n'),
}
export const runCapacityCli = async (
  io: CapacityCliIo = defaultIo
): Promise<number> => {
  const runId = randomUUID()
  const startedAt = new Date().toISOString()
  let guarded = false
  try {
    await acquireCapacityGuard(runId)
    guarded = true
    const prerequisites = await checkCapacityPrerequisites()
    const fixtureBefore = await snapshotFixture()
    const evidence = relativeEvidencePaths(runId)
    if (prerequisites.stopReason) {
      const run: CapacityRunRecord = {
        version: 1,
        runId,
        startedAt,
        endedAt: new Date().toISOString(),
        overallTimeoutMs: CAPACITY_OVERALL_TIMEOUT_MS,
        prerequisites: prerequisites.records,
        host: null,
        probeDefinition: CAPACITY_PROBE,
        workloadDefinition: {
          command: CAPACITY_WORKLOAD_COMMAND,
          durationMs: CAPACITY_WORKLOAD_DURATION_MS,
          timeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
          outputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
        },
        measurementMethod:
          'Linux /proc process CPU-tick deltas at CLK_TCK=100, summed VmRSS, /proc/loadavg, and MemTotal minus MemAvailable',
        fixture: {
          before: fixtureBefore,
          after: fixtureBefore,
          unchanged: true,
        },
        cohorts: [],
        safetyStopReason: null,
        threeMemberGate: {
          passed: false,
          blockers: [prerequisites.stopReason],
        },
        overallDisposition: 'failed',
        exitReasons: [prerequisites.stopReason],
        evidence,
      }
      await writeCapacityEvidence(
        run,
        { version: 1, runId, samples: [] },
        { version: 1, runId, workloads: [] },
        false
      )
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.prerequisite.failed',
          runId,
          reason: prerequisites.stopReason,
        })
      )
      return 2
    }
    const coordinated = await coordinateCapacityRun(runId)
    const fixtureAfter = await snapshotFixture()
    const unchanged =
      JSON.stringify(fixtureBefore) === JSON.stringify(fixtureAfter)
    const exitReasons = [
      ...coordinated.exitReasons,
      ...(!unchanged ? ['final-fixture-integrity-failed'] : []),
    ]
    const run: CapacityRunRecord = {
      version: 1,
      runId,
      startedAt,
      endedAt: new Date().toISOString(),
      overallTimeoutMs: CAPACITY_OVERALL_TIMEOUT_MS,
      prerequisites: prerequisites.records,
      host: prerequisites.host,
      probeDefinition: CAPACITY_PROBE,
      workloadDefinition: {
        command: CAPACITY_WORKLOAD_COMMAND,
        durationMs: CAPACITY_WORKLOAD_DURATION_MS,
        timeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
        outputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
      },
      measurementMethod:
        'Linux /proc process CPU-tick deltas at CLK_TCK=100 without logical-CPU normalization; summed VmRSS KiB; /proc/loadavg 1/5/15; MemAvailable and MemTotal minus MemAvailable',
      fixture: { before: fixtureBefore, after: fixtureAfter, unchanged },
      cohorts: coordinated.cohorts,
      safetyStopReason: coordinated.safetyStopReason,
      threeMemberGate: coordinated.threeMemberGate,
      overallDisposition: exitReasons.length ? 'failed' : 'passed',
      exitReasons,
      evidence,
    }
    await writeCapacityEvidence(run, coordinated.samples, coordinated.workloads)
    io.stdout(
      JSON.stringify({
        runId,
        disposition: run.overallDisposition,
        threeMemberGate: run.threeMemberGate.passed,
        evidence: run.evidence,
      })
    )
    io.stderr(
      JSON.stringify({
        event: 'workbench.capacity.completed',
        runId,
        disposition: run.overallDisposition,
        cohortCount: run.cohorts.length,
      })
    )
    return run.overallDisposition === 'passed' ? 0 : 1
  } catch (error) {
    io.stderr(
      JSON.stringify({
        event: 'workbench.capacity.failed',
        runId,
        code: error instanceof Error ? error.message : 'unknown',
      })
    )
    return 1
  } finally {
    if (guarded)
      await releaseCapacityGuard(runId).catch((error) =>
        io.stderr(
          JSON.stringify({
            event: 'workbench.capacity.guard.release.failed',
            runId,
            code: String(error),
          })
        )
      )
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL('file:' + process.argv[1]).href
)
  process.exitCode = await runCapacityCli()
export const capacityGuardAbsent = async (): Promise<boolean> => {
  try {
    await access(CAPACITY_ACTIVE_GUARD)
    return false
  } catch {
    return true
  }
}
