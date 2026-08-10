import { randomUUID } from 'node:crypto'
import { access } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
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
import {
  coordinateCapacityRun,
  type CoordinatedCapacity,
} from '../workbench-capacity-coordinator.js'
import { writeCapacityEvidence } from '../workbench-capacity-evidence.js'
import {
  acquireCapacityGuard,
  checkCapacityPrerequisites,
  releaseCapacityGuard,
  type PrerequisiteCheck,
} from '../workbench-capacity-prerequisites.js'
import {
  snapshotFixture,
  type FixtureSnapshot,
} from '../workbench-proof-contract.js'

export interface CapacityCliIo {
  stdout(value: string): void
  stderr(value: string): void
}
export interface CapacityCliDependencies {
  runId: () => string
  now: () => number
  overallTimeoutMs: number
  acquireGuard: (runId: string) => Promise<void>
  releaseGuard: (runId: string) => Promise<void>
  prerequisites: () => Promise<PrerequisiteCheck>
  snapshot: () => Promise<FixtureSnapshot>
  coordinate: (
    runId: string,
    timedOut: () => boolean
  ) => Promise<CoordinatedCapacity>
  write: typeof writeCapacityEvidence
}
const defaultIo: CapacityCliIo = {
  stdout: (value) => process.stdout.write(value + '\n'),
  stderr: (value) => process.stderr.write(value + '\n'),
}
const defaultDependencies: CapacityCliDependencies = {
  runId: randomUUID,
  now: () => performance.now(),
  overallTimeoutMs: CAPACITY_OVERALL_TIMEOUT_MS,
  acquireGuard: acquireCapacityGuard,
  releaseGuard: releaseCapacityGuard,
  prerequisites: checkCapacityPrerequisites,
  snapshot: snapshotFixture,
  coordinate: (runId, timedOut) => coordinateCapacityRun(runId, { timedOut }),
  write: writeCapacityEvidence,
}
class CapacityDeadlineError extends Error {
  constructor() {
    super('overall-timeout')
    this.name = 'CapacityDeadlineError'
  }
}
const failureFixture = (): FixtureSnapshot => ({
  paths: [],
  sentinelHashes: {},
})
const failureRun = (
  runId: string,
  startedAt: string,
  prerequisites: CapacityRunRecord['prerequisites'],
  reason: string,
  fixture: FixtureSnapshot = failureFixture()
): CapacityRunRecord => ({
  version: 1,
  runId,
  startedAt,
  endedAt: new Date().toISOString(),
  overallTimeoutMs: CAPACITY_OVERALL_TIMEOUT_MS,
  prerequisites,
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
  fixture: { before: fixture, after: fixture, unchanged: false },
  cohorts: [],
  safetyStopReason: null,
  threeMemberGate: { passed: false, blockers: [reason] },
  overallDisposition: 'failed',
  exitReasons: [reason],
  evidence: relativeEvidencePaths(runId),
})
export const runCapacityCli = async (
  io: CapacityCliIo = defaultIo,
  overrides: Partial<CapacityCliDependencies> = {}
): Promise<number> => {
  const deps = { ...defaultDependencies, ...overrides }
  const runId = deps.runId()
  const startedAt = new Date().toISOString()
  const deadlineAt = deps.now() + deps.overallTimeoutMs
  const timedOut = () => deps.now() >= deadlineAt
  const bounded = async <T>(operation: () => Promise<T>): Promise<T> => {
    const remaining = deadlineAt - deps.now()
    if (remaining <= 0) throw new CapacityDeadlineError()
    let timer: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        operation(),
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new CapacityDeadlineError()),
            remaining
          )
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  let guarded = false
  let prerequisiteRecords: CapacityRunRecord['prerequisites'] = []
  try {
    try {
      await bounded(() => deps.acquireGuard(runId))
      guarded = true
    } catch (error) {
      if (error instanceof CapacityDeadlineError) throw error
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.isolation.failed',
          runId,
          reason: error instanceof Error ? error.message : 'unknown',
        })
      )
      return 5
    }

    let prerequisites: PrerequisiteCheck
    try {
      prerequisites = await bounded(deps.prerequisites)
      prerequisiteRecords = prerequisites.records
    } catch (error) {
      if (error instanceof CapacityDeadlineError) throw error
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.prerequisite.failed',
          runId,
          reason:
            'prerequisite-check-failed:' +
            (error instanceof Error ? error.message : 'unknown'),
        })
      )
      return 2
    }
    if (prerequisites.stopReason) {
      const fixtureFailure = prerequisites.stopReason.includes('fixture')
      const run = failureRun(
        runId,
        startedAt,
        prerequisites.records,
        prerequisites.stopReason
      )
      await bounded(() =>
        deps.write(
          run,
          { version: 1, runId, samples: [] },
          { version: 1, runId, workloads: [] },
          false
        )
      )
      io.stderr(
        JSON.stringify({
          event: fixtureFailure
            ? 'workbench.capacity.fixture.failed'
            : 'workbench.capacity.prerequisite.failed',
          runId,
          reason: prerequisites.stopReason,
        })
      )
      return fixtureFailure ? 3 : 2
    }

    let fixtureBefore: FixtureSnapshot
    try {
      fixtureBefore = await bounded(deps.snapshot)
    } catch (error) {
      if (error instanceof CapacityDeadlineError) throw error
      const reason =
        'fixture-prerequisite-failed:' +
        (error instanceof Error ? error.message : 'unknown')
      const run = failureRun(runId, startedAt, prerequisites.records, reason)
      await bounded(() =>
        deps.write(
          run,
          { version: 1, runId, samples: [] },
          { version: 1, runId, workloads: [] },
          false
        )
      )
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.fixture.failed',
          runId,
          reason,
        })
      )
      return 3
    }
    const coordinated = await bounded(() => deps.coordinate(runId, timedOut))
    let fixtureAfter: FixtureSnapshot
    try {
      fixtureAfter = await bounded(deps.snapshot)
    } catch (error) {
      if (error instanceof CapacityDeadlineError) throw error
      const reason =
        'fixture-finalization-failed:' +
        (error instanceof Error ? error.message : 'unknown')
      const run = failureRun(
        runId,
        startedAt,
        prerequisites.records,
        reason,
        fixtureBefore
      )
      run.cohorts = coordinated.cohorts
      run.safetyStopReason = coordinated.safetyStopReason
      run.threeMemberGate = coordinated.threeMemberGate
      run.exitReasons = [...new Set([...coordinated.exitReasons, reason])]
      await bounded(() =>
        deps.write(run, coordinated.samples, coordinated.workloads, false)
      )
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.fixture.failed',
          runId,
          reason,
        })
      )
      return 3
    }
    const unchanged =
      JSON.stringify(fixtureBefore) === JSON.stringify(fixtureAfter)
    const exitReasons = [
      ...coordinated.exitReasons,
      ...(!unchanged ? ['final-fixture-integrity-failed'] : []),
      ...(timedOut() ? ['overall-timeout'] : []),
    ]
    const run: CapacityRunRecord = {
      version: 1,
      runId,
      startedAt,
      endedAt: new Date().toISOString(),
      overallTimeoutMs: deps.overallTimeoutMs,
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
      exitReasons: [...new Set(exitReasons)],
      evidence: relativeEvidencePaths(runId),
    }
    await bounded(() =>
      deps.write(run, coordinated.samples, coordinated.workloads)
    )
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
    const deadline = error instanceof CapacityDeadlineError || timedOut()
    io.stderr(
      JSON.stringify({
        event: deadline
          ? 'workbench.capacity.deadline.exceeded'
          : 'workbench.capacity.failed',
        runId,
        code: deadline
          ? 'overall-timeout'
          : error instanceof Error
            ? error.message
            : 'unknown',
        prerequisiteRecords: prerequisiteRecords.length,
      })
    )
    return deadline ? 4 : 1
  } finally {
    if (guarded) {
      const release = deps.releaseGuard(runId).catch((error) =>
        io.stderr(
          JSON.stringify({
            event: 'workbench.capacity.guard.release.failed',
            runId,
            code: String(error),
          })
        )
      )
      const remaining = Math.max(0, deadlineAt - deps.now())
      if (remaining > 0) {
        let releaseTimer: NodeJS.Timeout | undefined
        await Promise.race([
          release,
          new Promise<void>((resolve) => {
            releaseTimer = setTimeout(resolve, remaining)
          }),
        ])
        if (releaseTimer) clearTimeout(releaseTimer)
      } else void release
    }
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
