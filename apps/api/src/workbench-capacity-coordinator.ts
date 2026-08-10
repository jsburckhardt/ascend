import { performance } from 'node:perf_hooks'
import {
  CAPACITY_COHORTS,
  CAPACITY_FIXTURE,
  CAPACITY_MEMBER_STATE_ROOT,
  CAPACITY_MEMBER_TIMEOUT_MS,
  CAPACITY_OVERALL_TIMEOUT_MS,
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
  type ListenerIdentity,
  type ProbeResult,
  type ProcessIdentity,
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
  terminateExactProcessIdentity,
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
  processes: Map<string, ProcessIdentity>
  listeners: Map<string, ManagedListenerRow>
  controller?: WorkloadController
}
export interface CapacityCoordinatorDependencies {
  clock: CapacityClock
  start: (slot: number, cohort: number) => Promise<StartProofResult>
  stop: (handle: ProofHandle) => Promise<void>
  cleanupIdentity: (identity: ProcessIdentity) => Promise<void>
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
  cleanupIdentity: async (identity) => {
    await terminateExactProcessIdentity(identity, 1_000)
  },
  probe: runResponsivenessProbe,
  snapshot: snapshotFixture,
  inspect: inspectCapacityProcessTree,
  listeners: readManagedListeners,
  audit: auditAttributedResources,
  sample: sampleCapacityWindow,
  workload: startCapacityWorkload,
  timedOut: () =>
    performance.now() - startedMonotonicMs >= CAPACITY_OVERALL_TIMEOUT_MS,
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
  readinessAchieved: false,
  processIdentities: [],
  attributedListeners: [],
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
  targets: CapacitySlot[],
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
    processTrees: targets.map(({ slot }) => ({
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
const processKey = ({ pid, startTimeTicks }: ProcessIdentity) =>
  String(pid) + ':' + startTimeTicks
const listenerKey = ({ address, port, pid, inode }: ListenerIdentity) =>
  address + ':' + port + ':' + pid + ':' + inode
const recordAttribution = (
  member: ReadyMember,
  processes: ProcessIdentity[],
  listeners: ListenerIdentity[]
) => {
  for (const identity of processes)
    member.processes.set(processKey(identity), identity)
  for (const listener of listeners)
    member.listeners.set(listenerKey(listener), listener)
  member.slot.processIdentities = [...member.processes.values()]
  member.slot.attributedListeners = [...member.listeners.values()]
}
const positionEvidenceComplete = (
  position: ScheduledSample,
  targets: CapacitySlot[]
): boolean => {
  if (!position.host && !position.absentReason) return false
  const bySlot = new Map(position.processTrees.map((tree) => [tree.slot, tree]))
  return (
    bySlot.size === targets.length &&
    targets.every(({ slot }) => {
      const tree = bySlot.get(slot)
      return Boolean(tree && (tree.sample || tree.absentReason))
    })
  )
}
const cohortEvidenceComplete = (
  requested: number,
  slots: CapacitySlot[],
  samples: ScheduledSample[],
  workloads: WorkloadResult[],
  cleanup: CleanupResult,
  integrity: IntegrityResult,
  deadlineBreached: boolean
): boolean => {
  const targets = slots.filter(({ readinessAchieved }) => readinessAchieved)
  const schedulesComplete = (['idle', 'active'] as const).every((window) => {
    const positions = samples.filter((sample) => sample.window === window)
    return (
      positions.length === 5 &&
      positions.every(
        (position, index) =>
          position.position === index &&
          positionEvidenceComplete(position, targets)
      )
    )
  })
  return (
    !deadlineBreached &&
    slots.length === requested &&
    slots.every(({ state, reason }) => state === 'ready' || Boolean(reason)) &&
    schedulesComplete &&
    targets.every(({ slot }) =>
      workloads.some((workload) => workload.slot === slot)
    ) &&
    cleanup.complete &&
    integrity.complete
  )
}
const collectFindings = (
  cohort: Pick<
    CapacityCohortRecord,
    | 'slots'
    | 'preProbe'
    | 'postCleanupProbe'
    | 'cleanup'
    | 'integrity'
    | 'complete'
  >,
  samples: ScheduledSample[],
  workloads: WorkloadResult[],
  deadlineBreached: boolean
): string[] => {
  const targets = cohort.slots.filter(
    ({ readinessAchieved }) => readinessAchieved
  )
  const missingScheduledEvidence = (['idle', 'active'] as const).flatMap(
    (window) => {
      const positions = samples.filter((sample) => sample.window === window)
      return CAPACITY_SAMPLE_OFFSETS_MS.flatMap((_offset, position) => {
        const scheduled = positions.find(
          (sample) => sample.position === position
        )
        if (!scheduled)
          return [window + '[' + position + ']:missing-sample-record']
        const recordedSlots = new Set(
          scheduled.processTrees.map(({ slot }) => slot)
        )
        return targets
          .filter(({ slot }) => !recordedSlots.has(slot))
          .map(
            ({ slot }) =>
              window +
              '[' +
              position +
              ']:process-tree-' +
              slot +
              ':missing-sample-record'
          )
      })
    }
  )
  const findings = [
    ...missingScheduledEvidence,
    ...cohort.slots
      .filter(({ state }) => state !== 'ready')
      .map(({ slot, reason }) => 'slot ' + slot + ':' + reason),
    ...cohort.slots
      .filter(({ unexpectedExit }) => unexpectedExit)
      .map(({ slot }) => 'unexpected-exit:' + slot),
    ...workloads
      .filter(({ status }) => status !== 'passed')
      .map(({ slot, status }) => 'workload ' + slot + ':' + status),
    ...samples.flatMap((sample) => [
      ...(!sample.host
        ? [
            sample.window +
              '[' +
              sample.position +
              ']:host-missing:' +
              sample.absentReason,
          ]
        : !sample.host.responsiveness.passed
          ? [
              sample.window +
                '[' +
                sample.position +
                ']:probe-failed:' +
                sample.host.responsiveness.reason,
            ]
          : []),
      ...sample.processTrees
        .filter(({ sample: tree }) => !tree)
        .map(
          ({ slot, absentReason }) =>
            sample.window +
            '[' +
            sample.position +
            ']:process-tree-' +
            slot +
            ':' +
            absentReason
        ),
    ]),
    ...(!cohort.preProbe.passed
      ? ['pre-cohort-probe-failed:' + cohort.preProbe.reason]
      : []),
    ...(!cohort.postCleanupProbe.passed
      ? ['post-cleanup-probe-failed:' + cohort.postCleanupProbe.reason]
      : []),
    ...(!cohort.cleanup.passed ? ['cleanup-failed'] : []),
    ...(!cohort.integrity.passed ? ['fixture-integrity-failed'] : []),
    ...(!cohort.complete ? ['incomplete-evidence'] : []),
    ...(deadlineBreached ? ['overall-timeout'] : []),
  ]
  return [...new Set(findings)]
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
    cohort.slots.some(({ reason }) =>
      reason?.includes('listener-attribution-or-distinctness-failed')
    )
  )
    blockers.push('member PID, listener-owner PID, or port was not distinct')
  if (
    new Set(ready.map(({ pid }) => pid)).size !== ready.length ||
    new Set(ready.map(({ listener }) => listener?.port)).size !==
      ready.length ||
    new Set(ready.map(({ listener }) => listener?.pid)).size !== ready.length
  )
    blockers.push('member PID, listener-owner PID, or port was not distinct')
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
  if (cohort.slots.some(({ unexpectedExit }) => unexpectedExit))
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
  if (!cohort.complete) blockers.push('cohort evidence was incomplete')
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
  let deadlineBreached = false
  let frozenGate = {
    passed: false,
    blockers: ['three-member cohort was not completed'],
  }
  const latchProbe = (reason: string) => {
    safetyStopReason ??= 'responsiveness-safety-stop:' + reason
  }
  const checkDeadline = () => {
    if (!deps.timedOut()) return false
    deadlineBreached = true
    safetyStopReason ??= 'overall-timeout'
    return true
  }

  for (const requested of CAPACITY_COHORTS) {
    checkDeadline()
    const before = await deps.snapshot()
    checkDeadline()
    const preProbe = await deps.probe(deps.clock)
    checkDeadline()
    if (!preProbe.passed)
      latchProbe(preProbe.reason ?? 'pre-cohort probe failed')
    const slots: CapacitySlot[] = []
    const members: ReadyMember[] = []
    const usedPorts = new Set<number>()
    const usedRootPids = new Set<number>()
    const usedListenerOwnerPids = new Set<number>()
    for (let slotNumber = 1; slotNumber <= requested; slotNumber += 1) {
      checkDeadline()
      if (safetyStopReason) {
        slots.push(
          unstartedSlot(runId, requested, slotNumber, safetyStopReason)
        )
        continue
      }
      const attemptedAt = deps.clock.wall().toISOString()
      try {
        const startedMember = await deps.start(slotNumber, requested)
        checkDeadline()
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
        const matchingListeners = listeners.filter(
          (entry) => entry.port === port
        )
        const listener = matchingListeners[0]
        if (
          matchingListeners.length !== 1 ||
          !listener ||
          usedPorts.has(port) ||
          usedRootPids.has(startedMember.handle.pid) ||
          usedListenerOwnerPids.has(listener.pid) ||
          !inspected.rows.some(({ pid }) => pid === listener.pid)
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
        usedRootPids.add(startedMember.handle.pid)
        usedListenerOwnerPids.add(listener.pid)
        const identities = inspected.rows.map(({ pid, startTimeTicks }) => ({
          pid,
          startTimeTicks,
        }))
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
          readinessAchieved: true,
          processIdentities: identities,
          attributedListeners: listeners,
          unexpectedExit: false,
        }
        const member: ReadyMember = {
          slot,
          handle: startedMember.handle,
          processes: new Map(
            identities.map((identity) => [processKey(identity), identity])
          ),
          listeners: new Map(
            listeners.map((identity) => [listenerKey(identity), identity])
          ),
        }
        slots.push(slot)
        members.push(member)
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
    const targets = slots.filter(({ readinessAchieved }) => readinessAchieved)
    const onAttribution = (
      slotNumber: number,
      processes: ProcessIdentity[],
      listeners: ListenerIdentity[]
    ) => {
      const member = members.find(({ slot }) => slot.slot === slotNumber)
      if (member) recordAttribution(member, processes, listeners)
    }
    let idleAnchor: number | null = null
    let idleEnd: number | null = null
    let activeAnchor: number | null = null
    let activeEnd: number | null = null
    if (safetyStopReason) {
      idleAnchor = deps.clock.now()
      allSamples.push(
        ...absentWindow(
          runId,
          requested,
          'idle',
          targets,
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
        onProbeFailure: latchProbe,
        probe: deps.probe,
        inspectTree: deps.inspect,
        inspectListeners: deps.listeners,
        onAttribution,
      })
      checkDeadline()
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
          checkDeadline()
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
        onProbeFailure: latchProbe,
        probe: deps.probe,
        inspectTree: deps.inspect,
        inspectListeners: deps.listeners,
        onAttribution,
        workloadRunning: (slot, at) =>
          members
            .find((member) => member.slot.slot === slot)
            ?.controller?.isRunning(at) ?? false,
      })
      checkDeadline()
      activeAnchor = active.anchorMonotonicMs
      activeEnd = active.endedMonotonicMs
      allSamples.push(...active.samples)
    } else {
      activeAnchor = deps.clock.now()
      activeEnd = activeAnchor + 5_000
      allSamples.push(
        ...absentWindow(
          runId,
          requested,
          'active',
          targets,
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
      if (member.controller) {
        allWorkloads.push(await member.controller.finish())
        checkDeadline()
      }
    for (const member of members) {
      try {
        const inspected = await deps.inspect(member.handle.pid)
        if (!inspected.ok) {
          member.slot.state = 'failed'
          member.slot.unexpectedExit =
            inspected.reason === 'root-process-absent'
          member.slot.reason = member.slot.unexpectedExit
            ? 'unexpected-exit:root-process-absent'
            : 'process-tree-inspection-failed:' + inspected.reason
          continue
        }
        const listeners = await deps.listeners(
          inspected.rows.map(({ pid }) => pid)
        )
        recordAttribution(
          member,
          inspected.rows.map(({ pid, startTimeTicks }) => ({
            pid,
            startTimeTicks,
          })),
          listeners
        )
      } catch (error) {
        member.slot.state = 'failed'
        member.slot.reason =
          'process-tree-inspection-failed:' +
          (error instanceof Error ? error.message : 'unknown')
      }
    }
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
      for (const identity of [...member.processes.values()].reverse())
        await deps
          .cleanupIdentity(identity)
          .catch((error) =>
            cleanupDetails.push(
              'attributed-process-cleanup:' + identity.pid + ':' + String(error)
            )
          )
    }
    const audits = await Promise.all(
      members.map((member) =>
        deps.audit(
          [...member.processes.values()],
          [...member.listeners.values()]
        )
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
    checkDeadline()
    if (!postCleanupProbe.passed)
      latchProbe(postCleanupProbe.reason ?? 'post-cleanup probe failed')
    const cohortSamples = allSamples.filter(
      ({ cohort }) => cohort === requested
    )
    const cohortWorkloads = allWorkloads.filter(
      ({ cohort }) => cohort === requested
    )
    const complete = cohortEvidenceComplete(
      requested,
      slots,
      cohortSamples,
      cohortWorkloads,
      cleanup,
      integrity,
      deadlineBreached
    )
    const cohort: CapacityCohortRecord = {
      runId,
      requested,
      slots,
      preProbe,
      postCleanupProbe,
      idleAnchorMonotonicMs: idleAnchor,
      idleEndedMonotonicMs: idleEnd,
      activeAnchorMonotonicMs: activeAnchor,
      activeEndedMonotonicMs: activeEnd,
      cleanup,
      integrity,
      complete,
      findings: [],
      gateStatus: 'not-applicable',
      gateBlockers: [],
    }
    cohort.findings = collectFindings(
      cohort,
      cohortSamples,
      cohortWorkloads,
      deadlineBreached
    )
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
  checkDeadline()
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
    ...(deadlineBreached ? ['overall-timeout'] : []),
  ]
  return {
    cohorts,
    samples: { version: 1, runId, samples: allSamples },
    workloads: { version: 1, runId, workloads: allWorkloads },
    safetyStopReason,
    threeMemberGate: frozenGate,
    exitReasons: [...new Set(exitReasons)],
  }
}

export const applyCapacityDisposition = (
  run: CapacityRunRecord
): CapacityRunRecord => ({
  ...run,
  overallDisposition: run.exitReasons.length === 0 ? 'passed' : 'failed',
})
