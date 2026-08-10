import { describe, expect, it } from 'vitest'
import { BL001_FIXTURE } from '../src/workbench-proof-contract.js'
import {
  CAPACITY_SAMPLE_OFFSETS_MS,
  type CapacitySlot,
  type ProbeResult,
} from '../src/workbench-capacity-contract.js'
import {
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
  processIdentities: [{ pid: 1000 + slot, startTimeTicks: '10' }],
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
  })

  it('does not replace missed, non-overlapped, zero-ready, or safety-stop positions', async () => {
    const lateClock = new FakeClock()
    lateClock.late = 1_001
    const missed = await sampleCapacityWindow({
      runId,
      cohort: 3,
      window: 'idle',
      slots: [readySlot()],
      clock: lateClock,
      stopReason: () => null,
      onProbeFailure: () => undefined,
      probe: passedProbe,
      readHost: host,
      inspectTree: inspect,
    })
    expect(missed.samples[0]).toMatchObject({
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
})
