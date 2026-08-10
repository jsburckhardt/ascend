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
  ProofError,
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

interface ManagedMember {
  slot: CapacitySlot
  handle: ProofHandle | null
  processes: Map<string, ProcessIdentity>
  listeners: Map<string, ManagedListenerRow>
  controller?: WorkloadController
}
export interface CapacityCoordinatorDependencies {
  clock: CapacityClock
  start: (
    slot: number,
    cohort: number,
    signal: AbortSignal
  ) => Promise<StartProofResult>
  stop: (handle: ProofHandle) => Promise<void>
  cleanupIdentity: (identity: ProcessIdentity) => Promise<void>
  probe: (clock: CapacityClock, signal?: AbortSignal) => Promise<ProbeResult>
  snapshot: (signal?: AbortSignal) => Promise<FixtureSnapshot>
  inspect: typeof inspectCapacityProcessTree
  listeners: (pids: number[]) => Promise<ManagedListenerRow[]>
  audit: typeof auditAttributedResources
  sample: typeof sampleCapacityWindow
  workload: typeof startCapacityWorkload
  timedOut: () => boolean
  signal: AbortSignal
}
const realDependencies = (
  startedMonotonicMs: number,
  signal: AbortSignal
): CapacityCoordinatorDependencies => ({
  clock: realCapacityClock,
  start: async (_slot, _cohort, operationSignal) =>
    startWorkbenchProof({
      projectPath: CAPACITY_FIXTURE,
      runRoot: CAPACITY_MEMBER_STATE_ROOT,
      startupTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
      signal: operationSignal,
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
  listeners: (pids) => readManagedListeners(pids, { strict: true }),
  audit: auditAttributedResources,
  sample: sampleCapacityWindow,
  workload: startCapacityWorkload,
  timedOut: () =>
    performance.now() - startedMonotonicMs >= CAPACITY_OVERALL_TIMEOUT_MS,
  signal,
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
  clock: CapacityClock,
  status: WorkloadResult['status'] = 'cancelled'
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
  status,
  stdout: '',
  stderr: reason,
})
const failedProbe = (clock: CapacityClock, reason: string): ProbeResult => ({
  command: '/usr/bin/true',
  timeoutMs: 1_000,
  startedAt: clock.wall().toISOString(),
  endedAt: clock.wall().toISOString(),
  passed: false,
  exitCode: null,
  reason,
})
const incompleteIntegrity = (reason: string): IntegrityResult => ({
  complete: false,
  passed: false,
  treeMembershipEqual: false,
  sentinelHashesEqual: false,
  details: [reason],
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
  member: ManagedMember,
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
  finalCleanup: CleanupResult
}
export const coordinateCapacityRun = async (
  runId: string,
  overrides: Partial<CapacityCoordinatorDependencies> = {}
): Promise<CoordinatedCapacity> => {
  const started = performance.now()
  const fallbackController = new AbortController()
  const signal = overrides.signal ?? fallbackController.signal
  const deps = { ...realDependencies(started, signal), ...overrides, signal }
  const allSamples: ScheduledSample[] = []
  const allWorkloads: WorkloadResult[] = []
  const cohorts: CapacityCohortRecord[] = []
  const allStartedProcesses = new Map<string, ProcessIdentity>()
  const allStartedListeners = new Map<string, ManagedListenerRow>()
  const allWorkloadProcesses = new Map<string, ProcessIdentity>()
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
    if (!deps.timedOut() && !deps.signal.aborted) return false
    deadlineBreached = true
    safetyStopReason ??= 'overall-timeout'
    return true
  }

  for (const requested of CAPACITY_COHORTS) {
    checkDeadline()
    let before: FixtureSnapshot = { paths: [], sentinelHashes: {} }
    let beforeFailure: string | null = null
    try {
      before = await deps.snapshot(deps.signal)
    } catch (error) {
      beforeFailure =
        'before-fixture-inspection-failed:' +
        (error instanceof Error ? error.message : 'unknown')
      safetyStopReason ??= beforeFailure
    }
    checkDeadline()
    let preProbe: ProbeResult
    try {
      preProbe = await deps.probe(deps.clock, deps.signal)
    } catch (error) {
      preProbe = failedProbe(
        deps.clock,
        'pre-cohort-probe-execution-failed:' +
          (error instanceof Error ? error.message : 'unknown')
      )
    }
    checkDeadline()
    if (!preProbe.passed)
      latchProbe(preProbe.reason ?? 'pre-cohort probe failed')
    const slots: CapacitySlot[] = []
    const members: ManagedMember[] = []
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
        const startedMember = await deps.start(
          slotNumber,
          requested,
          deps.signal
        )
        const rootIdentity = {
          pid: startedMember.handle.pid,
          startTimeTicks: startedMember.handle.startTimeTicks,
        }
        const slot: CapacitySlot = {
          ...failedSlot(
            runId,
            requested,
            slotNumber,
            attemptedAt,
            'capacity-attribution-pending'
          ),
          runtimeRunId: startedMember.handle.runId,
          pid: startedMember.handle.pid,
          startTimeTicks: startedMember.handle.startTimeTicks,
          url: startedMember.handle.url,
          readinessStatus: startedMember.readinessStatus,
          processIdentities: [rootIdentity],
        }
        const member: ManagedMember = {
          slot,
          handle: startedMember.handle,
          processes: new Map([[processKey(rootIdentity), rootIdentity]]),
          listeners: new Map(),
        }
        slots.push(slot)
        members.push(member)
        if (checkDeadline()) {
          slot.reason = 'overall-timeout-during-member-start'
          continue
        }

        let inspected: Awaited<ReturnType<typeof deps.inspect>>
        try {
          inspected = await deps.inspect(startedMember.handle.pid)
        } catch (error) {
          slot.reason =
            'process-inspection-failed:' +
            (error instanceof Error ? error.message : 'unknown')
          continue
        }
        if (!inspected.ok) {
          slot.reason = 'process-inspection-failed:' + inspected.reason
          continue
        }
        const identities = inspected.rows.map(({ pid, startTimeTicks }) => ({
          pid,
          startTimeTicks,
        }))
        recordAttribution(member, identities, [])

        let listeners: ManagedListenerRow[]
        try {
          listeners = await deps.listeners(inspected.rows.map(({ pid }) => pid))
        } catch (error) {
          slot.reason =
            'listener-attribution-failed:' +
            (error instanceof Error ? error.message : 'unknown')
          continue
        }
        recordAttribution(member, [], listeners)
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
          slot.reason = 'listener-attribution-or-distinctness-failed'
          continue
        }
        usedPorts.add(port)
        usedRootPids.add(startedMember.handle.pid)
        usedListenerOwnerPids.add(listener.pid)
        Object.assign(slot, {
          state: 'ready' as const,
          reason: null,
          attemptEndedAt: deps.clock.wall().toISOString(),
          listener,
          readinessAchieved: true,
        })
      } catch (error) {
        const slot = failedSlot(
          runId,
          requested,
          slotNumber,
          attemptedAt,
          error instanceof Error ? error.message : 'member-start-failed'
        )
        const discovered =
          error instanceof ProofError ? error.discoveredIdentity : null
        if (discovered) {
          slot.runtimeRunId = discovered.runId
          slot.pid = discovered.pid
          slot.startTimeTicks = discovered.startTimeTicks
          slot.url = discovered.url
          if (discovered.pid && discovered.startTimeTicks)
            slot.processIdentities = [
              {
                pid: discovered.pid,
                startTimeTicks: discovered.startTimeTicks,
              },
            ]
          const handle =
            discovered.pid && discovered.startTimeTicks && discovered.url
              ? {
                  version: 1 as const,
                  runId: discovered.runId,
                  pid: discovered.pid,
                  startTimeTicks: discovered.startTimeTicks,
                  url: discovered.url,
                }
              : null
          members.push({
            slot,
            handle,
            processes: new Map(
              slot.processIdentities.map((identity) => [
                processKey(identity),
                identity,
              ])
            ),
            listeners: new Map(),
          })
        }
        if (
          error instanceof ProofError &&
          typeof error.details.cleanupFailure === 'string'
        )
          slot.reason += ':start-cleanup-failed:' + error.details.cleanupFailure
        slots.push(slot)
        checkDeadline()
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
      try {
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
          signal: deps.signal,
        })
        idleAnchor = idle.anchorMonotonicMs
        idleEnd = idle.endedMonotonicMs
        allSamples.push(...idle.samples)
      } catch (error) {
        const reason =
          'idle-sampling-failed:' +
          (error instanceof Error ? error.message : 'unknown')
        safetyStopReason ??= reason
        idleAnchor = deps.clock.now()
        idleEnd = idleAnchor
        allSamples.push(
          ...absentWindow(runId, requested, 'idle', targets, reason, idleAnchor)
        )
      }
      checkDeadline()
    }
    if (!safetyStopReason) {
      for (const member of members.filter(
        ({ slot }) => slot.readinessAchieved
      )) {
        try {
          member.controller = await deps.workload({
            runId,
            cohort: requested,
            slot: member.slot.slot,
            cwd: CAPACITY_FIXTURE,
            clock: deps.clock,
            signal: deps.signal,
          })
          checkDeadline()
        } catch (error) {
          allWorkloads.push(
            cancelledWorkload(
              runId,
              requested,
              member.slot.slot,
              error instanceof Error ? error.message : 'workload-spawn-failed',
              deps.clock,
              deps.signal.aborted ? 'cancelled' : 'spawn-failed'
            )
          )
        }
      }
      activeAnchor = deps.clock.now()
      try {
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
          signal: deps.signal,
          workloadRunning: (slot, at) =>
            members
              .find((member) => member.slot.slot === slot)
              ?.controller?.isRunning(at) ?? false,
        })
        activeAnchor = active.anchorMonotonicMs
        activeEnd = active.endedMonotonicMs
        allSamples.push(...active.samples)
      } catch (error) {
        const reason =
          'active-sampling-failed:' +
          (error instanceof Error ? error.message : 'unknown')
        safetyStopReason ??= reason
        activeAnchor = deps.clock.now()
        activeEnd = activeAnchor
        allSamples.push(
          ...absentWindow(
            runId,
            requested,
            'active',
            targets,
            reason,
            activeAnchor
          )
        )
      }
      checkDeadline()
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
      for (const member of members.filter(({ slot }) => slot.readinessAchieved))
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
        try {
          allWorkloads.push(await member.controller.finish())
        } catch (error) {
          allWorkloads.push(
            cancelledWorkload(
              runId,
              requested,
              member.slot.slot,
              'workload-result-failed:' +
                (error instanceof Error ? error.message : 'unknown'),
              deps.clock,
              deps.signal.aborted ? 'cancelled' : 'spawn-failed'
            )
          )
        }
        checkDeadline()
      }
    const cleanup = emptyCleanup()
    const cleanupDetails: string[] = []
    for (const member of members) {
      if (!member.handle) continue
      try {
        const inspected = await deps.inspect(member.handle.pid)
        if (!inspected.ok) {
          cleanupDetails.push(
            'post-start-process-inspection:' +
              member.slot.slot +
              ':' +
              inspected.reason
          )
          if (member.slot.readinessAchieved) {
            member.slot.state = 'failed'
            member.slot.unexpectedExit =
              inspected.reason === 'root-process-absent'
            member.slot.reason = member.slot.unexpectedExit
              ? 'unexpected-exit:root-process-absent'
              : 'process-tree-inspection-failed:' + inspected.reason
          }
          continue
        }
        recordAttribution(
          member,
          inspected.rows.map(({ pid, startTimeTicks }) => ({
            pid,
            startTimeTicks,
          })),
          []
        )
        try {
          const listeners = await deps.listeners(
            inspected.rows.map(({ pid }) => pid)
          )
          recordAttribution(member, [], listeners)
        } catch (error) {
          cleanupDetails.push(
            'post-start-listener-attribution:' +
              member.slot.slot +
              ':' +
              (error instanceof Error ? error.message : 'unknown')
          )
          if (member.slot.readinessAchieved) {
            member.slot.state = 'failed'
            member.slot.reason =
              'listener-attribution-failed:' +
              (error instanceof Error ? error.message : 'unknown')
          }
        }
      } catch (error) {
        cleanupDetails.push(
          'post-start-process-inspection:' +
            member.slot.slot +
            ':' +
            (error instanceof Error ? error.message : 'unknown')
        )
        if (member.slot.readinessAchieved) {
          member.slot.state = 'failed'
          member.slot.reason =
            'process-tree-inspection-failed:' +
            (error instanceof Error ? error.message : 'unknown')
        }
      }
    }
    for (const member of [...members].reverse()) {
      if (member.controller)
        await member.controller
          .cancel()
          .catch((error) =>
            cleanupDetails.push('workload-cleanup:' + String(error))
          )
      if (member.handle)
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
    let auditsComplete = true
    const audits: Array<{
      processIdentitiesAbsent: boolean
      listenersAbsent: boolean
    }> = []
    for (const member of members) {
      try {
        audits.push(
          await deps.audit(
            [...member.processes.values()],
            [...member.listeners.values()]
          )
        )
      } catch (error) {
        auditsComplete = false
        cleanupDetails.push(
          'cleanup-audit-failed:' +
            member.slot.slot +
            ':' +
            (error instanceof Error ? error.message : 'unknown')
        )
      }
    }
    cleanup.processIdentitiesAbsent =
      auditsComplete &&
      audits.every(({ processIdentitiesAbsent }) => processIdentitiesAbsent)
    cleanup.listenersAbsent =
      auditsComplete && audits.every(({ listenersAbsent }) => listenersAbsent)
    const workloadAudits: Array<{
      processIdentitiesAbsent: boolean
      listenersAbsent: boolean
    }> = []
    for (const member of members) {
      if (!member.controller?.identity) continue
      try {
        workloadAudits.push(await deps.audit([member.controller.identity], []))
      } catch (error) {
        auditsComplete = false
        cleanupDetails.push(
          'workload-audit-failed:' +
            member.slot.slot +
            ':' +
            (error instanceof Error ? error.message : 'unknown')
        )
      }
    }
    cleanup.workloadIdentitiesAbsent =
      auditsComplete &&
      workloadAudits.every(
        ({ processIdentitiesAbsent }) => processIdentitiesAbsent
      )
    cleanup.complete = auditsComplete
    cleanup.details = cleanupDetails
    cleanup.passed =
      cleanup.complete &&
      cleanup.processIdentitiesAbsent &&
      cleanup.listenersAbsent &&
      cleanup.workloadIdentitiesAbsent &&
      cleanupDetails.length === 0
    for (const member of members) {
      for (const identity of member.processes.values())
        allStartedProcesses.set(processKey(identity), identity)
      for (const listener of member.listeners.values())
        allStartedListeners.set(listenerKey(listener), listener)
      if (member.controller?.identity)
        allWorkloadProcesses.set(
          processKey(member.controller.identity),
          member.controller.identity
        )
    }
    let integrity: IntegrityResult
    if (beforeFailure) integrity = incompleteIntegrity(beforeFailure)
    else {
      try {
        integrity = fixtureIntegrity(before, await deps.snapshot())
      } catch (error) {
        integrity = incompleteIntegrity(
          'after-fixture-inspection-failed:' +
            (error instanceof Error ? error.message : 'unknown')
        )
      }
    }
    let postCleanupProbe: ProbeResult
    try {
      postCleanupProbe = await deps.probe(deps.clock, deps.signal)
    } catch (error) {
      postCleanupProbe = failedProbe(
        deps.clock,
        'post-cleanup-probe-execution-failed:' +
          (error instanceof Error ? error.message : 'unknown')
      )
    }
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
  const finalCleanup = emptyCleanup()
  try {
    const resourceAudit = await deps.audit(
      [...allStartedProcesses.values()],
      [...allStartedListeners.values()]
    )
    const workloadAudit = await deps.audit(
      [...allWorkloadProcesses.values()],
      []
    )
    finalCleanup.complete = true
    finalCleanup.processIdentitiesAbsent = resourceAudit.processIdentitiesAbsent
    finalCleanup.listenersAbsent = resourceAudit.listenersAbsent
    finalCleanup.workloadIdentitiesAbsent =
      workloadAudit.processIdentitiesAbsent
    finalCleanup.passed =
      finalCleanup.processIdentitiesAbsent &&
      finalCleanup.listenersAbsent &&
      finalCleanup.workloadIdentitiesAbsent
  } catch (error) {
    finalCleanup.details.push(
      'final-cleanup-audit-failed:' +
        (error instanceof Error ? error.message : 'unknown')
    )
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
    ...(!finalCleanup.passed ? ['final-cleanup-failed'] : []),
    ...(deadlineBreached ? ['overall-timeout'] : []),
  ]
  return {
    cohorts,
    samples: { version: 1, runId, samples: allSamples },
    workloads: { version: 1, runId, workloads: allWorkloads },
    safetyStopReason,
    threeMemberGate: frozenGate,
    exitReasons: [...new Set(exitReasons)],
    finalCleanup,
  }
}

export const applyCapacityDisposition = (
  run: CapacityRunRecord
): CapacityRunRecord => ({
  ...run,
  overallDisposition: run.exitReasons.length === 0 ? 'passed' : 'failed',
})
