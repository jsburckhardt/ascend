import { performance } from 'node:perf_hooks'
import {
  CAPACITY_COHORTS,
  CAPACITY_FIXTURE,
  CAPACITY_MEMBER_STATE_ROOT,
  CAPACITY_MEMBER_TIMEOUT_MS,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_COMMAND,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  type CapacityCohortRecord,
  type CapacityRunRecord,
  type CapacitySamplesEvidence,
  type CapacitySlot,
  type CapacityWorkloadsEvidence,
  type CleanupResult,
  type IntegrityResult,
  type ProbeResult,
  type ScheduledSample,
  type WorkloadResult,
} from './workbench-capacity-contract.js'
import {
  auditAttributedResources,
  inspectCapacityProcessTree,
  readManagedListeners,
  type ManagedListenerRow,
} from './workbench-proof-audit.js'
import {
  snapshotFixture,
  type FixtureSnapshot,
} from './workbench-proof-contract.js'
import {
  startWorkbenchProof,
  stopWorkbenchProof,
  type ProofHandle,
  type StartProofResult,
} from './workbench-proof-runtime.js'
import {
  realCapacityClock,
  runResponsivenessProbe,
  sampleCapacityWindow,
  startCapacityWorkload,
  type CapacityClock,
  type WorkloadController,
} from './workbench-capacity-sampling.js'

interface ReadyMember {
  slot: CapacitySlot
  handle: ProofHandle
  listeners: ManagedListenerRow[]
  controller?: WorkloadController
}
export interface CapacityCoordinatorDependencies {
  clock: CapacityClock
  start: (slot: number, cohort: number) => Promise<StartProofResult>
  stop: (handle: ProofHandle) => Promise<void>
  probe: (clock: CapacityClock) => Promise<ProbeResult>
  snapshot: () => Promise<FixtureSnapshot>
  inspect: typeof inspectCapacityProcessTree
  listeners: typeof readManagedListeners
  audit: typeof auditAttributedResources
  sample: typeof sampleCapacityWindow
  workload: typeof startCapacityWorkload
  timedOut: () => boolean
}
const realDependencies = (
  startedMonotonicMs: number
): CapacityCoordinatorDependencies => ({
  clock: realCapacityClock,
  start: async () =>
    startWorkbenchProof({
      projectPath: CAPACITY_FIXTURE,
      runRoot: CAPACITY_MEMBER_STATE_ROOT,
      startupTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
    }),
  stop: async (handle) => {
    await stopWorkbenchProof(handle, { runRoot: CAPACITY_MEMBER_STATE_ROOT })
  },
  probe: runResponsivenessProbe,
  snapshot: snapshotFixture,
  inspect: inspectCapacityProcessTree,
  listeners: readManagedListeners,
  audit: auditAttributedResources,
  sample: sampleCapacityWindow,
  workload: startCapacityWorkload,
  timedOut: () => performance.now() - startedMonotonicMs >= 1_200_000,
})
const emptyCleanup = (): CleanupResult => ({
  complete: false,
  passed: false,
  processIdentitiesAbsent: false,
  listenersAbsent: false,
  workloadIdentitiesAbsent: false,
  details: [],
})
const unstartedSlot = (
  runId: string,
  cohort: number,
  slot: number,
  reason: string
): CapacitySlot => ({
  runId,
  cohort,
  slot,
  state: 'unstarted',
  reason,
  attemptStartedAt: null,
  attemptEndedAt: null,
  readinessTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
  runtimeRunId: null,
  pid: null,
  startTimeTicks: null,
  url: null,
  readinessStatus: null,
  listener: null,
  processIdentities: [],
  unexpectedExit: false,
})
const failedSlot = (
  runId: string,
  cohort: number,
  slot: number,
  startedAt: string,
  reason: string
): CapacitySlot => ({
  ...unstartedSlot(runId, cohort, slot, reason),
  state: 'failed',
  attemptStartedAt: startedAt,
  attemptEndedAt: new Date().toISOString(),
})
const absentWindow = (
  runId: string,
  cohort: number,
  window: 'idle' | 'active',
  ready: CapacitySlot[],
  reason: string,
  anchor: number
): ScheduledSample[] =>
  CAPACITY_SAMPLE_OFFSETS_MS.map((offset, position) => ({
    runId,
    cohort,
    window,
    position: position as 0 | 1 | 2 | 3 | 4,
    targetOffsetMs: offset,
    targetMonotonicMs: anchor + offset,
    actualMonotonicMs: null,
    host: null,
    processTrees: ready.map(({ slot }) => ({
      slot,
      sample: null,
      absentReason: reason,
    })),
    absentReason: reason,
  }))
const cancelledWorkload = (
  runId: string,
  cohort: number,
  slot: number,
  reason: string,
  clock: CapacityClock
): WorkloadResult => ({
  runId,
  cohort,
  slot,
  command: CAPACITY_WORKLOAD_COMMAND,
  executable: process.execPath,
  args: [],
  cwd: CAPACITY_FIXTURE,
  timeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
  outputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  pid: null,
  startTimeTicks: null,
  startedAt: clock.wall().toISOString(),
  endedAt: clock.wall().toISOString(),
  startMonotonicMs: clock.now(),
  endMonotonicMs: clock.now(),
  exitCode: null,
  status: 'cancelled',
  stdout: '',
  stderr: reason,
})
const fixtureIntegrity = (
  before: FixtureSnapshot,
  after: FixtureSnapshot
): IntegrityResult => {
  const treeMembershipEqual =
    JSON.stringify(before.paths) === JSON.stringify(after.paths)
  const sentinelHashesEqual =
    JSON.stringify(before.sentinelHashes) ===
    JSON.stringify(after.sentinelHashes)
  return {
    complete: true,
    passed: treeMembershipEqual && sentinelHashesEqual,
    treeMembershipEqual,
    sentinelHashesEqual,
    details: [
      ...(!treeMembershipEqual ? ['fixture-tree-membership-changed'] : []),
      ...(!sentinelHashesEqual ? ['fixture-sentinel-hash-changed'] : []),
    ],
  }
}

const computeGate = (
  cohort: CapacityCohortRecord,
  samples: ScheduledSample[],
  workloads: WorkloadResult[]
): string[] => {
  const blockers: string[] = []
  const ready = cohort.slots.filter(({ state }) => state === 'ready')
  if (ready.length !== 3) blockers.push('all three members were not ready')
  if (
    new Set(ready.map(({ pid }) => pid)).size !== ready.length ||
    new Set(ready.map(({ listener }) => listener?.port)).size !== ready.length
  )
    blockers.push('member PID or port was not distinct')
  if (
    ready.some(
      ({ readinessStatus, listener }) =>
        !readinessStatus ||
        readinessStatus < 200 ||
        readinessStatus >= 400 ||
        !listener
    )
  )
    blockers.push('readiness or listener attribution failed')
  if (ready.some(({ unexpectedExit }) => unexpectedExit))
    blockers.push('managed member exited unexpectedly')
  if (
    ready.some(
      ({ slot }) =>
        workloads.find(
          (workload) => workload.cohort === 3 && workload.slot === slot
        )?.status !== 'passed'
    )
  )
    blockers.push('member workload failed')
  for (const window of ['idle', 'active'] as const) {
    const positions = samples.filter(
      (sample) => sample.cohort === 3 && sample.window === window
    )
    if (
      positions.length !== 5 ||
      positions.some(
        (sample) =>
          !sample.host ||
          !sample.host.responsiveness.passed ||
          sample.processTrees.length !== 3 ||
          sample.processTrees.some(({ sample: tree }) => !tree)
      )
    )
      blockers.push(window + ' samples or responsiveness were incomplete')
  }
  if (!cohort.preProbe.passed || !cohort.postCleanupProbe.passed)
    blockers.push('required responsiveness probe failed')
  if (!cohort.cleanup.passed || !cohort.integrity.passed)
    blockers.push('cleanup or fixture integrity failed')
  return [...new Set(blockers)]
}

export interface CoordinatedCapacity {
  cohorts: CapacityCohortRecord[]
  samples: CapacitySamplesEvidence
  workloads: CapacityWorkloadsEvidence
  safetyStopReason: string | null
  threeMemberGate: { passed: boolean; blockers: string[] }
  exitReasons: string[]
}
export const coordinateCapacityRun = async (
  runId: string,
  overrides: Partial<CapacityCoordinatorDependencies> = {}
): Promise<CoordinatedCapacity> => {
  const started = performance.now()
  const deps = { ...realDependencies(started), ...overrides }
  const allSamples: ScheduledSample[] = []
  const allWorkloads: WorkloadResult[] = []
  const cohorts: CapacityCohortRecord[] = []
  let safetyStopReason: string | null = null
  let frozenGate = {
    passed: false,
    blockers: ['three-member cohort was not completed'],
  }
  const latch = (reason: string) => {
    safetyStopReason ??= 'responsiveness-safety-stop:' + reason
  }
  for (const requested of CAPACITY_COHORTS) {
    if (deps.timedOut()) safetyStopReason ??= 'overall-timeout'
    const before = await deps.snapshot()
    const preProbe = await deps.probe(deps.clock)
    if (!preProbe.passed) latch(preProbe.reason ?? 'pre-cohort probe failed')
    const slots: CapacitySlot[] = []
    const members: ReadyMember[] = []
    const usedPorts = new Set<number>()
    const usedPids = new Set<number>()
    for (let slotNumber = 1; slotNumber <= requested; slotNumber += 1) {
      if (safetyStopReason) {
        slots.push(
          unstartedSlot(runId, requested, slotNumber, safetyStopReason)
        )
        continue
      }
      const attemptedAt = deps.clock.wall().toISOString()
      try {
        const startedMember = await deps.start(slotNumber, requested)
        const inspected = await deps.inspect(startedMember.handle.pid)
        if (!inspected.ok) {
          await deps.stop(startedMember.handle).catch(() => undefined)
          slots.push(
            failedSlot(
              runId,
              requested,
              slotNumber,
              attemptedAt,
              'process-inspection-failed:' + inspected.reason
            )
          )
          continue
        }
        const listeners = await deps.listeners(
          inspected.rows.map(({ pid }) => pid)
        )
        const port = Number(new URL(startedMember.handle.url).port)
        const listener = listeners.find((entry) => entry.port === port)
        if (
          !listener ||
          usedPorts.has(port) ||
          usedPids.has(startedMember.handle.pid)
        ) {
          await deps.stop(startedMember.handle).catch(() => undefined)
          slots.push(
            failedSlot(
              runId,
              requested,
              slotNumber,
              attemptedAt,
              'listener-attribution-or-distinctness-failed'
            )
          )
          continue
        }
        usedPorts.add(port)
        usedPids.add(startedMember.handle.pid)
        const slot: CapacitySlot = {
          runId,
          cohort: requested,
          slot: slotNumber,
          state: 'ready',
          reason: null,
          attemptStartedAt: attemptedAt,
          attemptEndedAt: deps.clock.wall().toISOString(),
          readinessTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
          runtimeRunId: startedMember.handle.runId,
          pid: startedMember.handle.pid,
          startTimeTicks: startedMember.handle.startTimeTicks,
          url: startedMember.handle.url,
          readinessStatus: startedMember.readinessStatus,
          listener,
          processIdentities: inspected.rows.map(({ pid, startTimeTicks }) => ({
            pid,
            startTimeTicks,
          })),
          unexpectedExit: false,
        }
        slots.push(slot)
        members.push({ slot, handle: startedMember.handle, listeners })
      } catch (error) {
        slots.push(
          failedSlot(
            runId,
            requested,
            slotNumber,
            attemptedAt,
            error instanceof Error ? error.message : 'member-start-failed'
          )
        )
      }
    }
    const ready = slots.filter(({ state }) => state === 'ready')
    let idleAnchor: number | null = null
    let idleEnd: number | null = null
    let activeAnchor: number | null = null
    if (safetyStopReason) {
      idleAnchor = deps.clock.now()
      allSamples.push(
        ...absentWindow(
          runId,
          requested,
          'idle',
          ready,
          safetyStopReason,
          idleAnchor
        )
      )
      idleEnd = idleAnchor + 5_000
    } else {
      const idle = await deps.sample({
        runId,
        cohort: requested,
        window: 'idle',
        slots,
        clock: deps.clock,
        stopReason: () => safetyStopReason,
        onProbeFailure: latch,
        probe: deps.probe,
        inspectTree: deps.inspect,
      })
      idleAnchor = idle.anchorMonotonicMs
      idleEnd = idle.endedMonotonicMs
      allSamples.push(...idle.samples)
    }
    if (!safetyStopReason) {
      for (const member of members) {
        try {
          member.controller = await deps.workload({
            runId,
            cohort: requested,
            slot: member.slot.slot,
            cwd: CAPACITY_FIXTURE,
            clock: deps.clock,
          })
        } catch (error) {
          allWorkloads.push(
            cancelledWorkload(
              runId,
              requested,
              member.slot.slot,
              error instanceof Error ? error.message : 'workload-spawn-failed',
              deps.clock
            )
          )
        }
      }
      activeAnchor = deps.clock.now()
      const active = await deps.sample({
        runId,
        cohort: requested,
        window: 'active',
        slots,
        clock: deps.clock,
        stopReason: () => safetyStopReason,
        onProbeFailure: latch,
        probe: deps.probe,
        inspectTree: deps.inspect,
        workloadRunning: (slot, at) =>
          members
            .find((member) => member.slot.slot === slot)
            ?.controller?.isRunning(at) ?? false,
      })
      activeAnchor = active.anchorMonotonicMs
      allSamples.push(...active.samples)
    } else {
      activeAnchor = deps.clock.now()
      allSamples.push(
        ...absentWindow(
          runId,
          requested,
          'active',
          ready,
          safetyStopReason,
          activeAnchor
        )
      )
      for (const member of members)
        allWorkloads.push(
          cancelledWorkload(
            runId,
            requested,
            member.slot.slot,
            safetyStopReason,
            deps.clock
          )
        )
    }
    for (const member of members)
      if (member.controller) allWorkloads.push(await member.controller.finish())
    for (const member of members)
      member.slot.unexpectedExit = !(await deps.inspect(member.handle.pid)).ok
    const cleanup = emptyCleanup()
    const cleanupDetails: string[] = []
    for (const member of [...members].reverse()) {
      if (member.controller)
        await member.controller
          .cancel()
          .catch((error) =>
            cleanupDetails.push('workload-cleanup:' + String(error))
          )
      await deps
        .stop(member.handle)
        .catch((error) =>
          cleanupDetails.push('member-cleanup:' + String(error))
        )
    }
    const audits = await Promise.all(
      members.map((member) =>
        deps.audit(member.slot.processIdentities, member.listeners)
      )
    )
    cleanup.complete = true
    cleanup.processIdentitiesAbsent = audits.every(
      ({ processIdentitiesAbsent }) => processIdentitiesAbsent
    )
    cleanup.listenersAbsent = audits.every(
      ({ listenersAbsent }) => listenersAbsent
    )
    const workloadAudits = await Promise.all(
      members.flatMap((member) =>
        member.controller?.identity
          ? [deps.audit([member.controller.identity], [])]
          : []
      )
    )
    cleanup.workloadIdentitiesAbsent = workloadAudits.every(
      ({ processIdentitiesAbsent }) => processIdentitiesAbsent
    )
    cleanup.details = cleanupDetails
    cleanup.passed =
      cleanup.processIdentitiesAbsent &&
      cleanup.listenersAbsent &&
      cleanup.workloadIdentitiesAbsent &&
      cleanupDetails.length === 0
    const integrity = fixtureIntegrity(before, await deps.snapshot())
    const postCleanupProbe = await deps.probe(deps.clock)
    if (!postCleanupProbe.passed)
      latch(postCleanupProbe.reason ?? 'post-cleanup probe failed')
    const cohortSamples = allSamples.filter(
      ({ cohort }) => cohort === requested
    )
    const cohortWorkloads = allWorkloads.filter(
      ({ cohort }) => cohort === requested
    )
    const findings = [
      ...slots
        .filter(({ state }) => state !== 'ready')
        .map(({ slot, reason }) => 'slot ' + slot + ':' + reason),
      ...cohortWorkloads
        .filter(({ status }) => status !== 'passed')
        .map(({ slot, status }) => 'workload ' + slot + ':' + status),
      ...cohortSamples
        .filter(({ absentReason }) => absentReason)
        .map(
          ({ window, position, absentReason }) =>
            window + '[' + position + ']:' + absentReason
        ),
    ]
    const cohort: CapacityCohortRecord = {
      runId,
      requested,
      slots,
      preProbe,
      postCleanupProbe,
      idleAnchorMonotonicMs: idleAnchor,
      idleEndedMonotonicMs: idleEnd,
      activeAnchorMonotonicMs: activeAnchor,
      cleanup,
      integrity,
      complete:
        slots.length === requested &&
        cohortSamples.length === 10 &&
        ready.every(({ slot }) =>
          cohortWorkloads.some((workload) => workload.slot === slot)
        ) &&
        cleanup.complete &&
        integrity.complete,
      findings,
      gateStatus: 'not-applicable',
      gateBlockers: [],
    }
    if (requested === 3) {
      const blockers = computeGate(cohort, allSamples, allWorkloads)
      frozenGate = { passed: blockers.length === 0, blockers }
      cohort.gateStatus = frozenGate.passed ? 'passed' : 'failed'
      cohort.gateBlockers = blockers
    }
    if (!cleanup.passed || !integrity.passed)
      safetyStopReason ??= 'unsafe-prior-cohort-finalization:' + requested
    cohorts.push(cohort)
  }
  const exitReasons = [
    ...(!frozenGate.passed ? ['three-member-gate-failed'] : []),
    ...cohorts
      .filter(({ complete }) => !complete)
      .map(({ requested }) => 'cohort-incomplete:' + requested),
    ...cohorts
      .filter(({ cleanup }) => !cleanup.passed)
      .map(({ requested }) => 'cleanup-failed:' + requested),
    ...cohorts
      .filter(({ integrity }) => !integrity.passed)
      .map(({ requested }) => 'integrity-failed:' + requested),
    ...(deps.timedOut() ? ['overall-timeout'] : []),
  ]
  return {
    cohorts,
    samples: { version: 1, runId, samples: allSamples },
    workloads: { version: 1, runId, workloads: allWorkloads },
    safetyStopReason,
    threeMemberGate: frozenGate,
    exitReasons,
  }
}

export const applyCapacityDisposition = (
  run: CapacityRunRecord
): CapacityRunRecord => ({
  ...run,
  overallDisposition: run.exitReasons.length === 0 ? 'passed' : 'failed',
})
