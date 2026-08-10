import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import {
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_COMMAND,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_SCRIPT,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  type CapacitySlot,
  type HostSample,
  type ProbeResult,
  type ProcessTreeSample,
  type SampleWindow,
  type ScheduledSample,
  type WorkloadResult,
} from './workbench-capacity-contract.js'
import { inspectCapacityProcessTree } from './workbench-proof-audit.js'
import {
  readProcessStartTime,
  terminateExactProcessGroup,
} from './workbench-proof-runtime.js'

export interface CapacityClock {
  now(): number
  wall(): Date
  sleep(milliseconds: number): Promise<void>
}
export const realCapacityClock: CapacityClock = {
  now: () => performance.now(),
  wall: () => new Date(),
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds))),
}

export const runResponsivenessProbe = async (
  clock: CapacityClock = realCapacityClock
): Promise<ProbeResult> => {
  const startedAt = clock.wall().toISOString()
  return new Promise((resolve) => {
    let settled = false
    let timedOut = false
    const child = spawn(CAPACITY_PROBE.executable, CAPACITY_PROBE.args, {
      stdio: 'ignore',
    })
    const timer = setTimeout(() => {
      timedOut = true
      if (child.pid) child.kill('SIGKILL')
    }, CAPACITY_PROBE.timeoutMs)
    const finish = (exitCode: number | null, reason: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        command: CAPACITY_PROBE.command,
        timeoutMs: CAPACITY_PROBE.timeoutMs,
        startedAt,
        endedAt: clock.wall().toISOString(),
        passed: reason === null && exitCode === 0,
        exitCode,
        reason,
      })
    }
    child.once('error', (error) =>
      finish(null, 'probe-spawn-failed:' + error.message)
    )
    child.once('close', (code) =>
      finish(
        code,
        timedOut
          ? 'probe-timeout'
          : code === 0
            ? null
            : 'probe-nonzero:' + String(code)
      )
    )
  })
}

const readHostFacts = async (): Promise<{
  loadAverage: [number, number, number]
  availableMemoryKiB: number
  usedMemoryKiB: number
}> => {
  const [loadText, memoryText] = await Promise.all([
    readFile('/proc/loadavg', 'utf8'),
    readFile('/proc/meminfo', 'utf8'),
  ])
  const load = loadText.trim().split(/\s+/u).slice(0, 3).map(Number)
  const total = Number(memoryText.match(/^MemTotal:\s+([0-9]+)\s+kB$/mu)?.[1])
  const available = Number(
    memoryText.match(/^MemAvailable:\s+([0-9]+)\s+kB$/mu)?.[1]
  )
  if (
    load.length !== 3 ||
    load.some((value) => !Number.isFinite(value)) ||
    !Number.isFinite(total) ||
    !Number.isFinite(available)
  )
    throw new Error('host-inspection-failed')
  return {
    loadAverage: load as [number, number, number],
    availableMemoryKiB: available,
    usedMemoryKiB: total - available,
  }
}

interface CpuBaseline {
  ticks: number
  monotonicMs: number
}
export interface SampleWindowOptions {
  runId: string
  cohort: number
  window: SampleWindow
  slots: CapacitySlot[]
  clock?: CapacityClock
  stopReason: () => string | null
  probe?: (clock: CapacityClock) => Promise<ProbeResult>
  onProbeFailure: (reason: string) => void
  workloadRunning?: (slot: number, atMonotonicMs: number) => boolean
  inspectTree?: typeof inspectCapacityProcessTree
  readHost?: typeof readHostFacts
}
export interface SampleWindowResult {
  anchorMonotonicMs: number
  endedMonotonicMs: number
  samples: ScheduledSample[]
}
export const sampleCapacityWindow = async (
  options: SampleWindowOptions
): Promise<SampleWindowResult> => {
  const clock = options.clock ?? realCapacityClock
  const probe = options.probe ?? runResponsivenessProbe
  const inspectTree = options.inspectTree ?? inspectCapacityProcessTree
  const readHost = options.readHost ?? readHostFacts
  const ready = options.slots.filter(({ state }) => state === 'ready')
  const samples: ScheduledSample[] = []
  const baselines = new Map<number, CpuBaseline>()
  for (const slot of ready) {
    const inspected = await inspectTree(slot.pid ?? -1)
    if (inspected.ok)
      baselines.set(slot.slot, {
        ticks: inspected.rows.reduce((sum, row) => sum + row.cpuTicks, 0),
        monotonicMs: clock.now(),
      })
  }
  const anchor = clock.now()
  for (let index = 0; index < CAPACITY_SAMPLE_OFFSETS_MS.length; index += 1) {
    const targetOffsetMs = CAPACITY_SAMPLE_OFFSETS_MS[index]
    const target = anchor + targetOffsetMs
    if (options.window === 'active' && ready.length === 0) {
      samples.push({
        runId: options.runId,
        cohort: options.cohort,
        window: options.window,
        position: index as 0 | 1 | 2 | 3 | 4,
        targetOffsetMs,
        targetMonotonicMs: target,
        actualMonotonicMs: null,
        host: null,
        processTrees: [],
        absentReason: 'no ready workload',
      })
      continue
    }
    await clock.sleep(target - clock.now())
    const now = clock.now()
    const stop = options.stopReason()
    if (stop || now >= target + 1_000) {
      const reason = stop ?? 'missed target position'
      samples.push({
        runId: options.runId,
        cohort: options.cohort,
        window: options.window,
        position: index as 0 | 1 | 2 | 3 | 4,
        targetOffsetMs,
        targetMonotonicMs: target,
        actualMonotonicMs: null,
        host: null,
        processTrees: ready.map(({ slot }) => ({
          slot,
          sample: null,
          absentReason: reason,
        })),
        absentReason: reason,
      })
      continue
    }
    const actual = now
    const probeResult = await probe(clock)
    if (!probeResult.passed)
      options.onProbeFailure(
        probeResult.reason ?? 'responsiveness probe failed'
      )
    let host: HostSample | null = null
    let hostFailure: string | null = null
    try {
      host = {
        timestamp: clock.wall().toISOString(),
        monotonicMs: actual,
        ...(await readHost()),
        responsiveness: probeResult,
      }
    } catch (error) {
      hostFailure =
        error instanceof Error ? error.message : 'host-inspection-failed'
    }
    const processTrees: ScheduledSample['processTrees'] = []
    for (const slot of ready) {
      if (
        options.window === 'active' &&
        !options.workloadRunning?.(slot.slot, actual)
      ) {
        processTrees.push({
          slot: slot.slot,
          sample: null,
          absentReason: 'workload did not overlap position',
        })
        continue
      }
      const inspected = await inspectTree(slot.pid ?? -1)
      if (!inspected.ok) {
        processTrees.push({
          slot: slot.slot,
          sample: null,
          absentReason: inspected.reason,
        })
        continue
      }
      const ticks = inspected.rows.reduce((sum, row) => sum + row.cpuTicks, 0)
      const baseline = baselines.get(slot.slot)
      const elapsed = baseline ? actual - baseline.monotonicMs : 0
      const tree: ProcessTreeSample = {
        timestamp: clock.wall().toISOString(),
        monotonicMs: actual,
        rootPid: slot.pid ?? -1,
        cpuPercent:
          baseline && elapsed > 0
            ? (Math.max(0, ticks - baseline.ticks) / 100 / (elapsed / 1_000)) *
              100
            : 0,
        rssKiB: inspected.rows.reduce((sum, row) => sum + row.rssKiB, 0),
        memberPids: inspected.rows.map(({ pid }) => pid),
      }
      baselines.set(slot.slot, { ticks, monotonicMs: actual })
      processTrees.push({ slot: slot.slot, sample: tree, absentReason: null })
    }
    samples.push({
      runId: options.runId,
      cohort: options.cohort,
      window: options.window,
      position: index as 0 | 1 | 2 | 3 | 4,
      targetOffsetMs,
      targetMonotonicMs: target,
      actualMonotonicMs: actual,
      host,
      processTrees,
      absentReason: hostFailure,
    })
  }
  if (options.window === 'idle') await clock.sleep(anchor + 5_000 - clock.now())
  return { anchorMonotonicMs: anchor, endedMonotonicMs: clock.now(), samples }
}

export interface WorkloadController {
  identity: { pid: number; startTimeTicks: string } | null
  startedMonotonicMs: number
  isRunning(atMonotonicMs: number): boolean
  finish(): Promise<WorkloadResult>
  cancel(): Promise<void>
}
export const startCapacityWorkload = async (input: {
  runId: string
  cohort: number
  slot: number
  cwd: string
  clock?: CapacityClock
  durationMs?: number
  timeoutMs?: number
  outputLimitBytes?: number
}): Promise<WorkloadController> => {
  const clock = input.clock ?? realCapacityClock
  const startedAt = clock.wall().toISOString()
  const startedMonotonicMs = clock.now()
  const durationMs = input.durationMs ?? CAPACITY_WORKLOAD_DURATION_MS
  const timeoutMs = input.timeoutMs ?? CAPACITY_WORKLOAD_TIMEOUT_MS
  const outputLimit =
    input.outputLimitBytes ?? CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES
  const child = spawn(
    process.execPath,
    [CAPACITY_WORKLOAD_SCRIPT, String(durationMs)],
    { cwd: input.cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const pid = child.pid ?? null
  let startTimeTicks = pid ? await readProcessStartTime(pid) : null
  for (let index = 0; pid && !startTimeTicks && index < 20; index += 1) {
    await clock.sleep(5)
    startTimeTicks = await readProcessStartTime(pid)
  }
  let stdout = ''
  let stderr = ''
  let overflow = false
  let timedOut = false
  let cancelled = false
  let spawnFailure: string | null = pid ? null : 'workload pid unavailable'
  let endedMonotonicMs: number | null = null
  const capture = (current: string, chunk: string) => {
    const bytes = Buffer.byteLength(current + chunk)
    if (bytes > outputLimit) {
      overflow = true
      return (current + chunk).slice(0, outputLimit)
    }
    return current + chunk
  }
  child.stdout?.setEncoding('utf8')
  child.stderr?.setEncoding('utf8')
  child.stdout?.on('data', (chunk: string) => {
    stdout = capture(stdout, chunk)
    if (overflow && pid) void terminateExactProcessGroup(pid, 500)
  })
  child.stderr?.on('data', (chunk: string) => {
    stderr = capture(stderr, chunk)
    if (overflow && pid) void terminateExactProcessGroup(pid, 500)
  })
  child.once('error', (error) => {
    spawnFailure = error.message
  })
  const resultPromise = new Promise<WorkloadResult>((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true
      if (pid) void terminateExactProcessGroup(pid, 500)
    }, timeoutMs)
    child.once('close', (code) => {
      clearTimeout(timer)
      endedMonotonicMs = clock.now()
      const status = cancelled
        ? 'cancelled'
        : overflow
          ? 'output-overflow'
          : timedOut
            ? 'timeout'
            : spawnFailure
              ? 'spawn-failed'
              : code === 0
                ? 'passed'
                : 'nonzero'
      resolve({
        runId: input.runId,
        cohort: input.cohort,
        slot: input.slot,
        command: CAPACITY_WORKLOAD_COMMAND,
        executable: process.execPath,
        args: [CAPACITY_WORKLOAD_SCRIPT, String(durationMs)],
        cwd: input.cwd,
        timeoutMs,
        outputLimitBytes: outputLimit,
        pid,
        startTimeTicks,
        startedAt,
        endedAt: clock.wall().toISOString(),
        startMonotonicMs: startedMonotonicMs,
        endMonotonicMs: endedMonotonicMs,
        exitCode: code,
        status,
        stdout,
        stderr: spawnFailure ? stderr + spawnFailure : stderr,
      })
    })
  })
  return {
    identity: pid && startTimeTicks ? { pid, startTimeTicks } : null,
    startedMonotonicMs,
    isRunning: (at) =>
      Boolean(pid && !endedMonotonicMs && at >= startedMonotonicMs),
    finish: () => resultPromise,
    cancel: async () => {
      cancelled = true
      if (pid) await terminateExactProcessGroup(pid, 500).catch(() => undefined)
      await resultPromise
    },
  }
}
