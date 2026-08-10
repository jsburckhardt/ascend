import path from 'node:path'
import {
  REPOSITORY_ROOT,
  BL001_FIXTURE,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
} from './workbench-proof-contract.js'

export const CAPACITY_COHORTS = [1, 3, 5, 10] as const
export const CAPACITY_MEMBER_TIMEOUT_MS = 30_000
export const CAPACITY_OVERALL_TIMEOUT_MS = 1_200_000
export const CAPACITY_PROBE = {
  executable: '/usr/bin/true',
  args: [] as string[],
  command: '/usr/bin/true',
  timeoutMs: 1_000,
} as const
export const CAPACITY_IDLE_STABILIZATION_MS = 5_000
export const CAPACITY_SAMPLE_OFFSETS_MS = [
  0, 1_000, 2_000, 3_000, 4_000,
] as const
export const CAPACITY_WORKLOAD_DURATION_MS = 7_000
export const CAPACITY_WORKLOAD_TIMEOUT_MS = 10_000
export const CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES = 4_096
export const CAPACITY_WORKLOAD_SCRIPT = path.join(
  REPOSITORY_ROOT,
  'apps/api/src/workbench-capacity-workload.mjs'
)
export const CAPACITY_WORKLOAD_COMMAND =
  process.execPath + ' ' + CAPACITY_WORKLOAD_SCRIPT
export const CAPACITY_WORK_ITEM_ROOT = path.join(
  REPOSITORY_ROOT,
  'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline'
)
export const CAPACITY_EVIDENCE_ROOT = path.join(
  CAPACITY_WORK_ITEM_ROOT,
  'implementation/evidence'
)
export const CAPACITY_ACTIVE_GUARD = path.join(
  CAPACITY_EVIDENCE_ROOT,
  '.active-run.json'
)
export const CAPACITY_MEMBER_STATE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-004/members'
)
export const CAPACITY_FIXTURE = BL001_FIXTURE
export const CAPACITY_CODE_SERVER_PATH = CODE_SERVER_PATH
export const CAPACITY_CODE_SERVER_VERSION = CODE_SERVER_VERSION

export const CAPACITY_PREREQUISITES = [
  'ubuntu-24.04.4',
  'hostname-03f809395a5d',
  'non-root-vscode-uid-1000',
  'repository-workspaces-ascend',
  'code-server-4.131.0',
  'fixture-readable',
  'proc-readable',
  'cgroup-v2-readable',
] as const
export type CapacityPrerequisite = (typeof CAPACITY_PREREQUISITES)[number]
export type SlotState = 'ready' | 'failed' | 'unstarted'
export type SampleWindow = 'idle' | 'active'

export interface CapacityHostContext {
  ubuntuVersion: string
  hostname: string
  user: string
  uid: number
  repository: string
  codeServerPath: string
  codeServerVersion: string
  procReadable: boolean
  cgroup: {
    version: 'v2'
    path: string
    cpuMax: string
    cpusetEffective: string
    memoryMax: string
    memoryHigh: string
    swapMax: string
    pidsMax: string
  }
}
export interface PrerequisiteRecord {
  name: CapacityPrerequisite
  passed: boolean
  detail: string
}
export interface ProbeResult {
  command: string
  timeoutMs: number
  startedAt: string
  endedAt: string
  passed: boolean
  exitCode: number | null
  reason: string | null
}
export interface ListenerIdentity {
  address: string
  port: number
  pid: number
  inode: string
}
export interface ProcessIdentity {
  pid: number
  startTimeTicks: string
}
export interface CapacitySlot {
  runId: string
  cohort: number
  slot: number
  state: SlotState
  reason: string | null
  attemptStartedAt: string | null
  attemptEndedAt: string | null
  readinessTimeoutMs: number
  runtimeRunId: string | null
  pid: number | null
  startTimeTicks: string | null
  url: string | null
  readinessStatus: number | null
  listener: ListenerIdentity | null
  processIdentities: ProcessIdentity[]
  unexpectedExit: boolean
}
export interface ProcessTreeSample {
  timestamp: string
  monotonicMs: number
  rootPid: number
  cpuPercent: number
  rssKiB: number
  memberPids: number[]
}
export interface HostSample {
  timestamp: string
  monotonicMs: number
  loadAverage: [number, number, number]
  availableMemoryKiB: number
  usedMemoryKiB: number
  responsiveness: ProbeResult
}
export interface ScheduledSample {
  runId: string
  cohort: number
  window: SampleWindow
  position: 0 | 1 | 2 | 3 | 4
  targetOffsetMs: number
  targetMonotonicMs: number
  actualMonotonicMs: number | null
  host: HostSample | null
  processTrees: Array<{
    slot: number
    sample: ProcessTreeSample | null
    absentReason: string | null
  }>
  absentReason: string | null
}
export interface WorkloadResult {
  runId: string
  cohort: number
  slot: number
  command: string
  executable: string
  args: string[]
  cwd: string
  timeoutMs: number
  outputLimitBytes: number
  pid: number | null
  startTimeTicks: string | null
  startedAt: string
  endedAt: string
  startMonotonicMs: number
  endMonotonicMs: number
  exitCode: number | null
  status:
    | 'passed'
    | 'nonzero'
    | 'timeout'
    | 'spawn-failed'
    | 'output-overflow'
    | 'cancelled'
  stdout: string
  stderr: string
}
export interface CleanupResult {
  complete: boolean
  passed: boolean
  processIdentitiesAbsent: boolean
  listenersAbsent: boolean
  workloadIdentitiesAbsent: boolean
  details: string[]
}
export interface IntegrityResult {
  complete: boolean
  passed: boolean
  treeMembershipEqual: boolean
  sentinelHashesEqual: boolean
  details: string[]
}
export interface CapacityCohortRecord {
  runId: string
  requested: number
  slots: CapacitySlot[]
  preProbe: ProbeResult
  postCleanupProbe: ProbeResult
  idleAnchorMonotonicMs: number | null
  idleEndedMonotonicMs: number | null
  activeAnchorMonotonicMs: number | null
  cleanup: CleanupResult
  integrity: IntegrityResult
  complete: boolean
  findings: string[]
  gateStatus: 'not-applicable' | 'passed' | 'failed'
  gateBlockers: string[]
}
export interface CapacityRunRecord {
  version: 1
  runId: string
  startedAt: string
  endedAt: string
  overallTimeoutMs: number
  prerequisites: PrerequisiteRecord[]
  host: CapacityHostContext | null
  probeDefinition: typeof CAPACITY_PROBE
  workloadDefinition: {
    command: string
    durationMs: number
    timeoutMs: number
    outputLimitBytes: number
  }
  measurementMethod: string
  fixture: {
    before: { paths: string[]; sentinelHashes: Record<string, string> }
    after: { paths: string[]; sentinelHashes: Record<string, string> }
    unchanged: boolean
  }
  cohorts: CapacityCohortRecord[]
  safetyStopReason: string | null
  threeMemberGate: { passed: boolean; blockers: string[] }
  overallDisposition: 'passed' | 'failed'
  exitReasons: string[]
  evidence: {
    run: string
    samples: string
    workloads: string
    comparison: string
  }
}
export interface CapacitySamplesEvidence {
  version: 1
  runId: string
  samples: ScheduledSample[]
}
export interface CapacityWorkloadsEvidence {
  version: 1
  runId: string
  workloads: WorkloadResult[]
}

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value
  )

export const validateCapacityEvidence = (
  run: CapacityRunRecord,
  samples: CapacitySamplesEvidence,
  workloads: CapacityWorkloadsEvidence
): void => {
  if (run.version !== 1 || !isUuid(run.runId))
    throw new Error('Capacity run identity is invalid')
  if (samples.runId !== run.runId || workloads.runId !== run.runId)
    throw new Error('Capacity evidence mixes run IDs')
  if (
    run.cohorts.map(({ requested }) => requested).join(',') !==
    CAPACITY_COHORTS.join(',')
  )
    throw new Error('Capacity cohort order is invalid')
  for (const cohort of run.cohorts) {
    if (cohort.runId !== run.runId || cohort.slots.length !== cohort.requested)
      throw new Error(
        'Cohort ' + cohort.requested + ' slot evidence is incomplete'
      )
    cohort.slots.forEach((slot, index) => {
      if (
        slot.runId !== run.runId ||
        slot.slot !== index + 1 ||
        (slot.state !== 'ready' && !slot.reason)
      )
        throw new Error('Cohort slot is invalid')
      if (
        slot.state === 'ready' &&
        (!slot.pid || !slot.runtimeRunId || !slot.listener || slot.reason)
      )
        throw new Error('Ready slot metadata is incomplete')
    })
    for (const window of ['idle', 'active'] as const) {
      const positions = samples.samples.filter(
        (sample) =>
          sample.cohort === cohort.requested && sample.window === window
      )
      if (
        positions.length !== 5 ||
        positions.some(
          (position, index) =>
            position.position !== index ||
            position.runId !== run.runId ||
            (!position.host && !position.absentReason)
        )
      )
        throw new Error('Cohort schedule is incomplete')
    }
    const readySlots = cohort.slots.filter(({ state }) => state === 'ready')
    if (
      readySlots.some(
        (slot) =>
          !workloads.workloads.some(
            (workload) =>
              workload.cohort === cohort.requested &&
              workload.slot === slot.slot &&
              workload.runId === run.runId
          )
      )
    )
      throw new Error('Cohort workload evidence is incomplete')
    if (!cohort.cleanup.complete || !cohort.integrity.complete)
      throw new Error('Cohort final audit is incomplete')
  }
}

export const relativeEvidencePaths = (runId: string) => {
  const base = path.posix.join(
    'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence',
    runId
  )
  return {
    run: base + '/run.json',
    samples: base + '/samples.json',
    workloads: base + '/workloads.json',
    comparison: base + '/comparison.md',
  }
}
