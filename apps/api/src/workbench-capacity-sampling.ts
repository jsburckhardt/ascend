import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import {
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_SCRIPT,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  type CapacitySlot,
  type HostSample,
  type ListenerIdentity,
  type ProbeResult,
  type ProcessIdentity,
  type ProcessTreeSample,
  type SampleWindow,
  type ScheduledSample,
  type WorkloadResult,
} from './workbench-capacity-contract.js'
import {
  inspectCapacityProcessTree,
  readManagedListeners,
} from './workbench-proof-audit.js'
import {
  readProcessStartTime,
  terminateExactProcessGroup,
} from './workbench-proof-runtime.js'

export interface CapacityClock {
  now(): number
  wall(): Date
  sleep(milliseconds: number, signal?: AbortSignal): Promise<void>
}
export const realCapacityClock: CapacityClock = {
  now: () => performance.now(),
  wall: () => new Date(),
  sleep: (milliseconds, signal) =>
    new Promise((resolve) => {
      if (signal?.aborted) {
        resolve()
        return
      }
      const timer = setTimeout(finish, Math.max(0, milliseconds))
      const onAbort = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      function finish() {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    }),
}

const capacityCancellationReason = (signal?: AbortSignal): string | null => {
  if (!signal?.aborted) return null
  return signal.reason instanceof Error
    ? signal.reason.message
    : typeof signal.reason === 'string'
      ? signal.reason
      : 'operation-cancelled'
}

export const runResponsivenessProbe = async (
  clock: CapacityClock = realCapacityClock,
  signal?: AbortSignal
): Promise<ProbeResult> => {
  const startedAt = clock.wall().toISOString()
  return new Promise((resolve) => {
    let settled = false
    let timedOut = false
    let cancellation: string | null = null
    let child: ReturnType<typeof spawn> | null = null
    let timer: NodeJS.Timeout | null = null
    const onAbort = () => {
      cancellation = 'probe-cancelled:' + capacityCancellationReason(signal)
      if (child?.pid) child.kill('SIGKILL')
      else finish(null, cancellation)
    }
    const finish = (exitCode: number | null, reason: string | null) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
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
    if (signal?.aborted) {
      finish(null, 'probe-cancelled:' + capacityCancellationReason(signal))
      return
    }
    child = spawn(CAPACITY_PROBE.executable, CAPACITY_PROBE.args, {
      stdio: 'ignore',
    })
    signal?.addEventListener('abort', onAbort, { once: true })
    timer = setTimeout(() => {
      timedOut = true
      if (child?.pid) child.kill('SIGKILL')
    }, CAPACITY_PROBE.timeoutMs)
    child.once('error', (error) =>
      finish(null, 'probe-spawn-failed:' + error.message)
    )
    child.once('close', (code) =>
      finish(
        code,
        cancellation ??
          (timedOut
            ? 'probe-timeout'
            : code === 0
              ? null
              : 'probe-nonzero:' + String(code))
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
const sleepUntil = async (
  clock: CapacityClock,
  targetMonotonicMs: number,
  signal?: AbortSignal
): Promise<void> => {
  while (clock.now() < targetMonotonicMs && !signal?.aborted)
    await clock.sleep(targetMonotonicMs - clock.now(), signal)
}
export interface SampleWindowOptions {
  runId: string
  cohort: number
  window: SampleWindow
  slots: CapacitySlot[]
  clock?: CapacityClock
  stopReason: () => string | null
  probe?: (clock: CapacityClock, signal?: AbortSignal) => Promise<ProbeResult>
  onProbeFailure: (reason: string) => void
  workloadRunning?: (slot: number, atMonotonicMs: number) => boolean
  inspectTree?: typeof inspectCapacityProcessTree
  inspectListeners?: typeof readManagedListeners
  signal?: AbortSignal
  onAttribution?: (
    slot: number,
    processes: ProcessIdentity[],
    listeners: ListenerIdentity[]
  ) => void
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
  const inspectListeners = options.inspectListeners ?? readManagedListeners
  const readHost = options.readHost ?? readHostFacts
  const ready = options.slots.filter(
    ({ readinessAchieved }) => readinessAchieved
  )
  const samples: ScheduledSample[] = []
  const baselines = new Map<number, CpuBaseline>()
  const baselineFailures = new Map<number, string>()

  const inspectAttributed = async (slot: CapacitySlot) => {
    const inspected = await inspectTree(slot.pid ?? -1)
    if (!inspected.ok) return inspected
    const processes = inspected.rows.map(({ pid, startTimeTicks }) => ({
      pid,
      startTimeTicks,
    }))
    options.onAttribution?.(slot.slot, processes, [])
    const listeners = await inspectListeners(
      inspected.rows.map(({ pid }) => pid)
    )
    options.onAttribution?.(slot.slot, [], listeners)
    return inspected
  }

  for (const slot of ready) {
    try {
      const inspected = await inspectAttributed(slot)
      if (inspected.ok)
        baselines.set(slot.slot, {
          ticks: inspected.rows.reduce((sum, row) => sum + row.cpuTicks, 0),
          monotonicMs: clock.now(),
        })
      else baselineFailures.set(slot.slot, inspected.reason)
    } catch (error) {
      baselineFailures.set(
        slot.slot,
        'attribution-inspection-failed:' +
          (error instanceof Error ? error.message : 'unknown')
      )
    }
  }

  const anchor = clock.now()
  for (let index = 0; index < CAPACITY_SAMPLE_OFFSETS_MS.length; index += 1) {
    const targetOffsetMs = CAPACITY_SAMPLE_OFFSETS_MS[index]
    const target = anchor + targetOffsetMs
    await sleepUntil(clock, target, options.signal)
    const positionStarted = clock.now()
    const stop =
      options.stopReason() ?? capacityCancellationReason(options.signal)
    const noReadyWorkload = options.window === 'active' && ready.length === 0
    if (stop || noReadyWorkload || positionStarted >= target + 1_000) {
      const reason =
        stop ??
        (noReadyWorkload ? 'no ready workload' : 'missed target position')
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

    const probeResult = await probe(clock, options.signal)
    if (!probeResult.passed)
      options.onProbeFailure(
        probeResult.reason ?? 'responsiveness probe failed'
      )
    const afterProbeStop =
      options.stopReason() ?? capacityCancellationReason(options.signal)
    if (afterProbeStop) {
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
          absentReason: afterProbeStop,
        })),
        absentReason: afterProbeStop,
      })
      continue
    }
    let host: HostSample | null = null
    let hostFailure: string | null = null
    try {
      const facts = await readHost()
      const hostMonotonicMs = clock.now()
      host = {
        timestamp: clock.wall().toISOString(),
        monotonicMs: hostMonotonicMs,
        ...facts,
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
        !options.workloadRunning?.(slot.slot, positionStarted)
      ) {
        processTrees.push({
          slot: slot.slot,
          sample: null,
          absentReason: 'workload did not overlap position',
        })
        continue
      }
      try {
        const inspected = await inspectAttributed(slot)
        if (!inspected.ok) {
          processTrees.push({
            slot: slot.slot,
            sample: null,
            absentReason: inspected.reason,
          })
          baselineFailures.set(slot.slot, inspected.reason)
          continue
        }
        const sampledAt = clock.now()
        const ticks = inspected.rows.reduce((sum, row) => sum + row.cpuTicks, 0)
        const baseline = baselines.get(slot.slot)
        if (!baseline) {
          const reason =
            'cpu-baseline-unavailable:' +
            (baselineFailures.get(slot.slot) ?? 'process-inspection-failed')
          baselines.set(slot.slot, { ticks, monotonicMs: sampledAt })
          baselineFailures.delete(slot.slot)
          processTrees.push({
            slot: slot.slot,
            sample: null,
            absentReason: reason,
          })
          continue
        }
        const elapsed = sampledAt - baseline.monotonicMs
        const tree: ProcessTreeSample = {
          timestamp: clock.wall().toISOString(),
          monotonicMs: sampledAt,
          rootPid: slot.pid ?? -1,
          cpuPercent:
            elapsed > 0
              ? (Math.max(0, ticks - baseline.ticks) /
                  100 /
                  (elapsed / 1_000)) *
                100
              : 0,
          rssKiB: inspected.rows.reduce((sum, row) => sum + row.rssKiB, 0),
          memberPids: inspected.rows.map(({ pid }) => pid),
        }
        baselines.set(slot.slot, { ticks, monotonicMs: sampledAt })
        baselineFailures.delete(slot.slot)
        processTrees.push({ slot: slot.slot, sample: tree, absentReason: null })
      } catch (error) {
        processTrees.push({
          slot: slot.slot,
          sample: null,
          absentReason:
            'attribution-inspection-failed:' +
            (error instanceof Error ? error.message : 'unknown'),
        })
      }
    }
    samples.push({
      runId: options.runId,
      cohort: options.cohort,
      window: options.window,
      position: index as 0 | 1 | 2 | 3 | 4,
      targetOffsetMs,
      targetMonotonicMs: target,
      actualMonotonicMs: positionStarted,
      host,
      processTrees,
      absentReason: hostFailure,
    })
  }
  await sleepUntil(clock, anchor + 5_000, options.signal)
  return { anchorMonotonicMs: anchor, endedMonotonicMs: clock.now(), samples }
}

export interface WorkloadController {
  identity: { pid: number; startTimeTicks: string } | null
  startedMonotonicMs: number
  isRunning(atMonotonicMs: number): boolean
  finish(): Promise<WorkloadResult>
  cancel(reason?: string): Promise<void>
}

const immediateWorkloadController = (
  result: WorkloadResult
): WorkloadController => ({
  identity: null,
  startedMonotonicMs: result.startMonotonicMs,
  isRunning: () => false,
  finish: async () => result,
  cancel: async () => undefined,
})

export const startCapacityWorkload = async (input: {
  runId: string
  cohort: number
  slot: number
  cwd: string
  clock?: CapacityClock
  durationMs?: number
  timeoutMs?: number
  outputLimitBytes?: number
  scriptPath?: string
  signal?: AbortSignal
  spawnProcess?: typeof spawn
}): Promise<WorkloadController> => {
  const clock = input.clock ?? realCapacityClock
  const startedAt = clock.wall().toISOString()
  const startedMonotonicMs = clock.now()
  const durationMs = input.durationMs ?? CAPACITY_WORKLOAD_DURATION_MS
  const timeoutMs = input.timeoutMs ?? CAPACITY_WORKLOAD_TIMEOUT_MS
  const outputLimit =
    input.outputLimitBytes ?? CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES
  const scriptPath = input.scriptPath ?? CAPACITY_WORKLOAD_SCRIPT
  const baseResult = (
    status: WorkloadResult['status'],
    stderr: string
  ): WorkloadResult => ({
    runId: input.runId,
    cohort: input.cohort,
    slot: input.slot,
    command: process.execPath + ' ' + scriptPath,
    executable: process.execPath,
    args: [scriptPath, String(durationMs)],
    cwd: input.cwd,
    timeoutMs,
    outputLimitBytes: outputLimit,
    pid: null,
    startTimeTicks: null,
    startedAt,
    endedAt: clock.wall().toISOString(),
    startMonotonicMs: startedMonotonicMs,
    endMonotonicMs: clock.now(),
    exitCode: null,
    status,
    stdout: '',
    stderr,
  })
  if (input.signal?.aborted)
    return immediateWorkloadController(
      baseResult(
        'cancelled',
        capacityCancellationReason(input.signal) ?? 'operation-cancelled'
      )
    )

  let child: ReturnType<typeof spawn>
  try {
    child = (input.spawnProcess ?? spawn)(
      process.execPath,
      [scriptPath, String(durationMs)],
      {
        cwd: input.cwd,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  } catch (error) {
    return immediateWorkloadController(
      baseResult(
        'spawn-failed',
        error instanceof Error ? error.message : 'workload spawn failed'
      )
    )
  }

  const pid = child.pid ?? null
  let startTimeTicks: string | null = null
  let stdout = Buffer.alloc(0)
  let stderr = Buffer.alloc(0)
  let capturedBytes = 0
  let overflow = false
  let timedOut = false
  let cancelled = false
  let spawnFailure: string | null = pid ? null : 'workload pid unavailable'
  let terminationFailure: string | null = null
  let endedMonotonicMs: number | null = null
  let termination: Promise<void> | null = null
  const terminate = (): Promise<void> => {
    if (!pid) return Promise.resolve()
    termination ??= terminateExactProcessGroup(pid, 500).catch((error) => {
      terminationFailure =
        error instanceof Error ? error.message : 'workload cleanup failed'
      throw error
    })
    return termination
  }
  const onAbort = () => {
    cancelled = true
    void terminate().catch(() => undefined)
  }
  input.signal?.addEventListener('abort', onAbort, { once: true })
  const capture = (stream: 'stdout' | 'stderr', value: Buffer | string) => {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
    const remaining = Math.max(0, outputLimit - capturedBytes)
    const retained = chunk.subarray(0, remaining)
    if (stream === 'stdout') stdout = Buffer.concat([stdout, retained])
    else stderr = Buffer.concat([stderr, retained])
    capturedBytes += retained.length
    if (retained.length < chunk.length) {
      overflow = true
      void terminate().catch(() => undefined)
    }
  }
  child.stdout?.on('data', (chunk: Buffer) => capture('stdout', chunk))
  child.stderr?.on('data', (chunk: Buffer) => capture('stderr', chunk))
  child.once('error', (error) => {
    spawnFailure = error.message
    capture('stderr', error.message)
  })
  const resultPromise = new Promise<WorkloadResult>((resolve) => {
    const timer = setTimeout(() => {
      timedOut = true
      void terminate().catch(() => undefined)
    }, timeoutMs)
    child.once('close', (code) => {
      clearTimeout(timer)
      input.signal?.removeEventListener('abort', onAbort)
      endedMonotonicMs = clock.now()
      const status = overflow
        ? 'output-overflow'
        : timedOut
          ? 'timeout'
          : spawnFailure
            ? 'spawn-failed'
            : cancelled
              ? 'cancelled'
              : code === 0
                ? 'passed'
                : 'nonzero'
      resolve({
        ...baseResult(status, stderr.toString('utf8')),
        pid,
        startTimeTicks,
        endedAt: clock.wall().toISOString(),
        endMonotonicMs: endedMonotonicMs,
        exitCode: code,
        stdout: stdout.toString('utf8'),
        stderr:
          stderr.toString('utf8') +
          (terminationFailure ? '\ncleanup-failed:' + terminationFailure : ''),
      })
    })
  })

  for (
    let index = 0;
    pid && !startTimeTicks && index < 20 && !input.signal?.aborted;
    index += 1
  ) {
    startTimeTicks = await readProcessStartTime(pid)
    if (!startTimeTicks) await clock.sleep(5, input.signal)
  }
  if (input.signal?.aborted) onAbort()

  return {
    identity: pid && startTimeTicks ? { pid, startTimeTicks } : null,
    startedMonotonicMs,
    isRunning: (at) =>
      Boolean(pid && !endedMonotonicMs && at >= startedMonotonicMs),
    finish: () => resultPromise,
    cancel: async () => {
      cancelled = true
      await terminate()
      await resultPromise
    },
  }
}
