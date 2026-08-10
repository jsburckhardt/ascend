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
  acquireGuard: (runId: string, signal: AbortSignal) => Promise<void>
  releaseGuard: (runId: string) => Promise<void>
  prerequisites: (signal: AbortSignal) => Promise<PrerequisiteCheck>
  snapshot: (signal?: AbortSignal) => Promise<FixtureSnapshot>
  coordinate: (
    runId: string,
    signal: AbortSignal,
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
  acquireGuard: async (runId, _signal) => acquireCapacityGuard(runId),
  releaseGuard: releaseCapacityGuard,
  prerequisites: checkCapacityPrerequisites,
  snapshot: async (_signal) => snapshotFixture(),
  coordinate: (runId, signal, timedOut) =>
    coordinateCapacityRun(runId, { signal, timedOut }),
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
  finalCleanup: {
    complete: true,
    passed: true,
    processIdentitiesAbsent: true,
    listenersAbsent: true,
    workloadIdentitiesAbsent: true,
    details: [],
  },
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
  const controller = new AbortController()
  const deadlineError = new CapacityDeadlineError()
  const deadlineTimer = setTimeout(
    () => controller.abort(deadlineError),
    Math.max(0, deps.overallTimeoutMs)
  )
  const timedOut = () => controller.signal.aborted || deps.now() >= deadlineAt
  const checkDeadline = () => {
    if (timedOut()) {
      if (!controller.signal.aborted) controller.abort(deadlineError)
      throw deadlineError
    }
  }
  let guarded = false
  let releaseFailed = false
  let result = 1
  let prerequisiteRecords: CapacityRunRecord['prerequisites'] = []
  let retained = false
  let fixtureBefore = failureFixture()
  let coordinated: CoordinatedCapacity | null = null

  try {
    checkDeadline()
    try {
      await deps.acquireGuard(runId, controller.signal)
      checkDeadline()
      guarded = true
    } catch (error) {
      if (timedOut() || error instanceof CapacityDeadlineError) throw error
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.isolation.failed',
          runId,
          reason: error instanceof Error ? error.message : 'unknown',
        })
      )
      result = 5
      return result
    }

    let prerequisites: PrerequisiteCheck
    try {
      prerequisites = await deps.prerequisites(controller.signal)
      checkDeadline()
      prerequisiteRecords = prerequisites.records
    } catch (error) {
      if (timedOut() || error instanceof CapacityDeadlineError) throw error
      const reason =
        'prerequisite-check-failed:' +
        (error instanceof Error ? error.message : 'unknown')
      const run = failureRun(runId, startedAt, prerequisiteRecords, reason)
      await deps.write(
        run,
        { version: 1, runId, samples: [] },
        { version: 1, runId, workloads: [] },
        false
      )
      retained = true
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.prerequisite.failed',
          runId,
          reason,
        })
      )
      result = 2
      return result
    }

    if (prerequisites.stopReason) {
      const fixtureFailure = prerequisites.stopReason.includes('fixture')
      const run = failureRun(
        runId,
        startedAt,
        prerequisites.records,
        prerequisites.stopReason
      )
      await deps.write(
        run,
        { version: 1, runId, samples: [] },
        { version: 1, runId, workloads: [] },
        false
      )
      retained = true
      io.stderr(
        JSON.stringify({
          event: fixtureFailure
            ? 'workbench.capacity.fixture.failed'
            : 'workbench.capacity.prerequisite.failed',
          runId,
          reason: prerequisites.stopReason,
        })
      )
      result = fixtureFailure ? 3 : 2
      return result
    }

    try {
      fixtureBefore = await deps.snapshot(controller.signal)
      checkDeadline()
    } catch (error) {
      if (timedOut() || error instanceof CapacityDeadlineError) throw error
      const reason =
        'fixture-prerequisite-failed:' +
        (error instanceof Error ? error.message : 'unknown')
      const run = failureRun(runId, startedAt, prerequisites.records, reason)
      await deps.write(
        run,
        { version: 1, runId, samples: [] },
        { version: 1, runId, workloads: [] },
        false
      )
      retained = true
      io.stderr(
        JSON.stringify({
          event: 'workbench.capacity.fixture.failed',
          runId,
          reason,
        })
      )
      result = 3
      return result
    }

    coordinated = await deps.coordinate(runId, controller.signal, timedOut)
    if (timedOut() && !controller.signal.aborted)
      controller.abort(deadlineError)

    let fixtureAfter = fixtureBefore
    let fixtureFinalizationReason: string | null = null
    try {
      fixtureAfter = await deps.snapshot()
    } catch (error) {
      fixtureFinalizationReason =
        'fixture-finalization-failed:' +
        (error instanceof Error ? error.message : 'unknown')
    }
    const unchanged =
      !fixtureFinalizationReason &&
      JSON.stringify(fixtureBefore) === JSON.stringify(fixtureAfter)
    const exitReasons = [
      ...coordinated.exitReasons,
      ...(fixtureFinalizationReason ? [fixtureFinalizationReason] : []),
      ...(!unchanged && !fixtureFinalizationReason
        ? ['final-fixture-integrity-failed']
        : []),
      ...(timedOut() ? ['overall-timeout'] : []),
      ...(!coordinated.finalCleanup.passed ? ['final-cleanup-failed'] : []),
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
      finalCleanup: coordinated.finalCleanup,
      evidence: relativeEvidencePaths(runId),
    }
    await deps.write(run, coordinated.samples, coordinated.workloads)
    retained = true
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
        event: timedOut()
          ? 'workbench.capacity.deadline.exceeded'
          : fixtureFinalizationReason
            ? 'workbench.capacity.fixture.failed'
            : 'workbench.capacity.completed',
        runId,
        disposition: run.overallDisposition,
        cohortCount: run.cohorts.length,
        code: timedOut() ? 'overall-timeout' : fixtureFinalizationReason,
        partialEvidenceRetained: timedOut(),
      })
    )
    result = timedOut()
      ? 4
      : fixtureFinalizationReason
        ? 3
        : run.overallDisposition === 'passed'
          ? 0
          : 1
  } catch (error) {
    const deadline = timedOut() || error instanceof CapacityDeadlineError
    if (deadline && !controller.signal.aborted) controller.abort(deadlineError)
    const reason = deadline
      ? 'overall-timeout'
      : error instanceof Error
        ? error.message
        : 'unknown'
    if (guarded && !retained) {
      const run = failureRun(
        runId,
        startedAt,
        prerequisiteRecords,
        reason,
        fixtureBefore
      )
      if (coordinated) {
        run.cohorts = coordinated.cohorts
        run.safetyStopReason = coordinated.safetyStopReason
        run.threeMemberGate = coordinated.threeMemberGate
        run.exitReasons = [...new Set([...coordinated.exitReasons, reason])]
        run.finalCleanup = coordinated.finalCleanup
      }
      await deps
        .write(
          run,
          coordinated?.samples ?? { version: 1, runId, samples: [] },
          coordinated?.workloads ?? { version: 1, runId, workloads: [] },
          false
        )
        .then(() => {
          retained = true
        })
        .catch((writeError) =>
          io.stderr(
            JSON.stringify({
              event: 'workbench.capacity.evidence.failed',
              runId,
              code: String(writeError),
            })
          )
        )
    }
    io.stderr(
      JSON.stringify({
        event: deadline
          ? 'workbench.capacity.deadline.exceeded'
          : 'workbench.capacity.failed',
        runId,
        code: reason,
        prerequisiteRecords: prerequisiteRecords.length,
        partialEvidenceRetained: retained,
      })
    )
    result = deadline ? 4 : 1
  } finally {
    if (guarded) {
      try {
        await deps.releaseGuard(runId)
      } catch (error) {
        releaseFailed = true
        io.stderr(
          JSON.stringify({
            event: 'workbench.capacity.guard.release.failed',
            runId,
            code: String(error),
          })
        )
      }
    }
    clearTimeout(deadlineTimer)
  }
  return timedOut() ? 4 : releaseFailed ? 1 : result
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
