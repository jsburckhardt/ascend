import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { processIdentityAbsent } from '../src/workbench-proof-audit.js'
import {
  BL001_FIXTURE,
  REPOSITORY_ROOT,
} from '../src/workbench-proof-contract.js'
import {
  CAPACITY_SAMPLE_OFFSETS_MS,
  type CapacitySlot,
  type ProbeResult,
} from '../src/workbench-capacity-contract.js'
import {
  runResponsivenessProbe,
  sampleCapacityWindow,
  startCapacityWorkload,
  type CapacityClock,
} from '../src/workbench-capacity-sampling.js'

class FakeClock implements CapacityClock {
  value = 100
  wallValue = Date.parse('2026-08-10T00:00:00.000Z')
  late = 0
  now() {
    return this.value
  }
  wall() {
    return new Date(this.wallValue + this.value)
  }
  async sleep(milliseconds: number) {
    this.value += Math.max(0, milliseconds) + this.late
    this.late = 0
  }
}
const runId = '00000000-0000-4000-8000-000000000011'
const readySlot = (slot = 1): CapacitySlot => ({
  runId,
  cohort: 3,
  slot,
  state: 'ready',
  reason: null,
  attemptStartedAt: '2026-08-10T00:00:00.000Z',
  attemptEndedAt: '2026-08-10T00:00:01.000Z',
  readinessTimeoutMs: 30_000,
  runtimeRunId: '00000000-0000-4000-8000-000000000021',
  pid: 1000 + slot,
  startTimeTicks: '10',
  url: 'http://127.0.0.1:4001/',
  readinessStatus: 200,
  listener: {
    address: '127.0.0.1',
    port: 4000 + slot,
    pid: 1000 + slot,
    inode: String(slot),
  },
  readinessAchieved: true,
  processIdentities: [{ pid: 1000 + slot, startTimeTicks: '10' }],
  attributedListeners: [
    {
      address: '127.0.0.1',
      port: 4000 + slot,
      pid: 1000 + slot,
      inode: String(slot),
    },
  ],
  unexpectedExit: false,
})
const passedProbe = (clock: CapacityClock): Promise<ProbeResult> =>
  Promise.resolve({
    command: '/usr/bin/true',
    timeoutMs: 1_000,
    startedAt: clock.wall().toISOString(),
    endedAt: clock.wall().toISOString(),
    passed: true,
    exitCode: 0,
    reason: null,
  })
const inspect = async (rootPid: number) => ({
  ok: true as const,
  rootPid,
  rows: [
    { pid: rootPid, ppid: 1, startTimeTicks: '10', cpuTicks: 20, rssKiB: 512 },
  ],
})
const host = async () => ({
  loadAverage: [1, 2, 3] as [number, number, number],
  availableMemoryKiB: 1000,
  usedMemoryKiB: 2000,
})

describe('capacity sampling and workload', () => {
  it('schedules exactly five idle positions and holds the five-second boundary', async () => {
    const clock = new FakeClock()
    let ticks = 0
    const result = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock,
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: passedProbe,
      readHost: host,
      inspectTree: async (pid) => {
        ticks += 10
        return {
          ok: true as const,
          rootPid: pid,
          rows: [
            {
              pid,
              ppid: 1,
              startTimeTicks: '10',
              cpuTicks: ticks,
              rssKiB: 512,
            },
          ],
        }
      },
    })
    expect(result.samples.map(({ targetOffsetMs }) => targetOffsetMs)).toEqual(
      CAPACITY_SAMPLE_OFFSETS_MS
    )
    expect(
      result.samples.every(
        ({ host: sample, processTrees }) =>
          Boolean(sample) && Boolean(processTrees[0].sample)
      )
    ).toBe(true)
    expect(result.samples[1].processTrees[0].sample).toMatchObject({
      rootPid: 1001,
      cpuPercent: 10,
      rssKiB: 512,
      memberPids: [1001],
    })
    expect(result.endedMonotonicMs - result.anchorMonotonicMs).toBe(5_000)
    expect(
      result.samples.every(
        ({ actualMonotonicMs, targetMonotonicMs }) =>
          actualMonotonicMs !== null && actualMonotonicMs >= targetMonotonicMs
      )
    ).toBe(true)
  })

  it('does not replace missed, non-overlapped, zero-ready, or safety-stop positions', async () => {
    const lateClock = new FakeClock()
    let missedProbeCalls = 0
    const missed = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock: lateClock,
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: async (clock) => {
        if (++missedProbeCalls === 1) lateClock.late = 1_001
        return passedProbe(clock)
      },
      readHost: host,
      inspectTree: inspect,
    })
    expect(missed.samples[1]).toMatchObject({
      actualMonotonicMs: null,
      absentReason: 'missed target position',
    })
    const zero = await sampleCapacityWindow({
      runId,
      cohort: 5,
      window: 'active',
      slots: [],
      clock: new FakeClock(),
      stopReason: () => null,
      onProbeFailure: () => undefined,
    })
    expect(zero.samples).toHaveLength(5)
    expect(zero.endedMonotonicMs - zero.anchorMonotonicMs).toBe(5_000)
    expect(
      zero.samples.every(
        ({ absentReason }) => absentReason === 'no ready workload'
      )
    ).toBe(true)
    const active = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'active',
      slots: [readySlot()],
      clock: new FakeClock(),
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: passedProbe,
      readHost: host,
      inspectTree: inspect,
      workloadRunning: () => false,
    })
    expect(
      active.samples.every(
        ({ processTrees }) =>
          processTrees[0].absentReason === 'workload did not overlap position'
      )
    ).toBe(true)
    const stopped = await sampleCapacityWindow({
      runId,
      cohort: 10,
      window: 'idle',
      slots: [readySlot()],
      clock: new FakeClock(),
      stopReason: () => 'probe safety stop',
      onProbeFailure: () => undefined,
      probe: passedProbe,
      readHost: host,
      inspectTree: inspect,
    })
    expect(
      stopped.samples.every(
        ({ absentReason }) => absentReason === 'probe safety stop'
      )
    ).toBe(true)
  })

  it('latches the first failed scheduled responsiveness probe', async () => {
    const reasons: string[] = []
    let calls = 0
    const result = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock: new FakeClock(),
      stopReason: () => null,
      onProbeFailure: (reason) => reasons.push(reason),
      probe: async (clock) => ({
        ...(await passedProbe(clock)),
        passed: ++calls !== 1,
        exitCode: calls === 1 ? 1 : 0,
        reason: calls === 1 ? 'probe-nonzero:1' : null,
      }),
      readHost: host,
      inspectTree: inspect,
    })
    expect(result.samples[0].host?.responsiveness.passed).toBe(false)
    expect(reasons).toEqual(['probe-nonzero:1'])
  })

  it('runs one bounded repository workload with complete identity and streams', async () => {
    const controller = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      durationMs: 50,
      timeoutMs: 1_000,
    })
    expect(controller.identity).toMatchObject({
      pid: expect.any(Number),
      startTimeTicks: expect.any(String),
    })
    const result = await controller.finish()
    expect(result).toMatchObject({
      command: expect.stringContaining('workbench-capacity-workload.mjs'),
      cwd: BL001_FIXTURE,
      status: 'passed',
      exitCode: 0,
      stdout: 'capacity-workload-complete\n',
      stderr: '',
      outputLimitBytes: 4_096,
    })
    expect(result.endMonotonicMs).toBeGreaterThanOrEqual(
      result.startMonotonicMs
    )
  })

  it('retains workload timeout and output overflow as explicit results', async () => {
    const timed = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      durationMs: 500,
      timeoutMs: 20,
    })
    await expect(timed.finish()).resolves.toMatchObject({
      status: 'timeout',
      exitCode: null,
    })
    const overflow = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      durationMs: 10,
      timeoutMs: 1_000,
      outputLimitBytes: 10,
    })
    const overflowResult = await overflow.finish()
    expect(overflowResult).toMatchObject({
      status: 'output-overflow',
      outputLimitBytes: 10,
    })
    expect(Buffer.byteLength(overflowResult.stdout)).toBeLessThanOrEqual(10)
  })

  it('enforces one combined stdout and stderr byte limit', async () => {
    const result = await (
      await startCapacityWorkload({
        runId,
        cohort: 1,
        slot: 1,
        cwd: BL001_FIXTURE,
        timeoutMs: 1_000,
        outputLimitBytes: 4_096,
        scriptPath: path.join(
          REPOSITORY_ROOT,
          'apps/api/test/fixtures/workbench-capacity-combined-output.mjs'
        ),
      })
    ).finish()
    expect(result.status).toBe('output-overflow')
    expect(result.stdout.length).toBeGreaterThan(0)
    expect(result.stderr.length).toBeGreaterThan(0)
    expect(
      Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)
    ).toBe(4_096)
  })

  it('returns spawn failure and cancellation as complete workload results', async () => {
    const spawnFailure = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      spawnProcess: (() => {
        throw new Error('controlled-workload-spawn-failure')
      }) as typeof spawn,
    })
    await expect(spawnFailure.finish()).resolves.toMatchObject({
      status: 'spawn-failed',
      pid: null,
      stderr: 'controlled-workload-spawn-failure',
    })

    const controller = new AbortController()
    const workload = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      durationMs: 5_000,
      timeoutMs: 6_000,
      signal: controller.signal,
    })
    expect(workload.identity).not.toBeNull()
    controller.abort(new Error('overall-timeout'))
    const result = await workload.finish()
    expect(result.status).toBe('cancelled')
    expect(result.pid).toBe(workload.identity?.pid)
    await expect(processIdentityAbsent(workload.identity!)).resolves.toBe(true)
  })

  it('returns all explicit sample absences when aborted during a scheduled probe', async () => {
    const controller = new AbortController()
    let probes = 0
    const result = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock: new FakeClock(),
      signal: controller.signal,
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: async (clock) => {
        if (++probes === 1) controller.abort(new Error('overall-timeout'))
        return {
          ...(await passedProbe(clock)),
          passed: false,
          exitCode: null,
          reason: 'probe-cancelled:overall-timeout',
        }
      },
      readHost: host,
      inspectTree: inspect,
    })
    expect(result.samples).toHaveLength(5)
    expect(
      result.samples.every(
        ({ host: sample, absentReason, processTrees }) =>
          sample === null &&
          absentReason === 'overall-timeout' &&
          processTrees[0].absentReason === 'overall-timeout'
      )
    ).toBe(true)
  })

  it('cancels responsiveness probes and pre-aborted workloads cooperatively', async () => {
    const probeController = new AbortController()
    probeController.abort(new Error('overall-timeout'))
    await expect(
      runResponsivenessProbe(new FakeClock(), probeController.signal)
    ).resolves.toMatchObject({
      passed: false,
      exitCode: null,
      reason: 'probe-cancelled:overall-timeout',
    })

    const workloadController = new AbortController()
    workloadController.abort('overall-timeout')
    const workload = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      signal: workloadController.signal,
    })
    await expect(workload.finish()).resolves.toMatchObject({
      status: 'cancelled',
      pid: null,
      stderr: 'overall-timeout',
    })
  })

  it('retains nonzero workload and host/process inspection absences', async () => {
    const nonzero = await startCapacityWorkload({
      runId,
      cohort: 1,
      slot: 1,
      cwd: BL001_FIXTURE,
      timeoutMs: 1_000,
      scriptPath: path.join(
        REPOSITORY_ROOT,
        'apps/api/test/fixtures/workbench-capacity-nonzero.mjs'
      ),
    })
    await expect(nonzero.finish()).resolves.toMatchObject({
      status: 'nonzero',
      exitCode: 7,
      stderr: 'controlled-nonzero\n',
    })

    let inspections = 0
    const sampled = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock: new FakeClock(),
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: passedProbe,
      readHost: async () => {
        throw new Error('controlled-host-inspection-failure')
      },
      inspectTree: async (pid) => {
        if (++inspections === 1)
          return {
            ok: false as const,
            rootPid: pid,
            reason: 'controlled-baseline-failure',
          }
        return inspect(pid)
      },
      inspectListeners: async () => {
        throw new Error('controlled-listener-attribution-failure')
      },
    })
    expect(sampled.samples.every(({ host: sample }) => sample === null)).toBe(
      true
    )
    expect(sampled.samples[0].absentReason).toBe(
      'controlled-host-inspection-failure'
    )
    expect(sampled.samples[0].processTrees[0].absentReason).toContain(
      'controlled-listener-attribution-failure'
    )
  })
})
