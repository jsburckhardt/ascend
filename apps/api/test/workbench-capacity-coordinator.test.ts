import { describe, expect, it } from 'vitest'
import type { CapacityCoordinatorDependencies } from '../src/workbench-capacity-coordinator.js'
import { coordinateCapacityRun } from '../src/workbench-capacity-coordinator.js'
import type {
  CapacityClock,
  WorkloadController,
} from '../src/workbench-capacity-sampling.js'
import type {
  ProbeResult,
  ScheduledSample,
  WorkloadResult,
} from '../src/workbench-capacity-contract.js'

const runId = '00000000-0000-4000-8000-000000000011'
class Clock implements CapacityClock {
  value = 0
  now() {
    return this.value
  }
  wall() {
    return new Date(Date.parse('2026-08-10T00:00:00Z') + this.value)
  }
  async sleep(ms: number) {
    this.value += Math.max(0, ms)
  }
}
const probe = (passed = true): ProbeResult => ({
  command: '/usr/bin/true',
  timeoutMs: 1_000,
  startedAt: '2026-08-10T00:00:00.000Z',
  endedAt: '2026-08-10T00:00:00.001Z',
  passed,
  exitCode: passed ? 0 : 1,
  reason: passed ? null : 'probe-nonzero:1',
})
const snapshot = { paths: ['a'], sentinelHashes: { a: 'hash' } }
const sampleRows = (
  input: Parameters<CapacityCoordinatorDependencies['sample']>[0]
) => {
  const anchor = input.clock?.now() ?? 0
  const ready = input.slots.filter(({ state }) => state === 'ready')
  const samples: ScheduledSample[] = [0, 1, 2, 3, 4].map((position) => ({
    runId: input.runId,
    cohort: input.cohort,
    window: input.window,
    position: position as 0 | 1 | 2 | 3 | 4,
    targetOffsetMs: position * 1000,
    targetMonotonicMs: anchor + position * 1000,
    actualMonotonicMs: anchor + position * 1000,
    absentReason: null,
    host: {
      timestamp: '2026-08-10T00:00:00.000Z',
      monotonicMs: anchor + position * 1000,
      loadAverage: [1, 2, 3],
      availableMemoryKiB: 100,
      usedMemoryKiB: 200,
      responsiveness: probe(),
    },
    processTrees: ready.map(({ slot, pid }) => ({
      slot,
      absentReason: null,
      sample: {
        timestamp: '2026-08-10T00:00:00.000Z',
        monotonicMs: anchor + position * 1000,
        rootPid: pid ?? -1,
        cpuPercent: 1,
        rssKiB: 10,
        memberPids: [pid ?? -1],
      },
    })),
  }))
  return {
    anchorMonotonicMs: anchor,
    endedMonotonicMs: anchor + 5000,
    samples,
  }
}
const workloadResult = (
  cohort: number,
  slot: number,
  status: WorkloadResult['status'] = 'passed'
): WorkloadResult => ({
  runId,
  cohort,
  slot,
  command: 'node workload',
  executable: process.execPath,
  args: [],
  cwd: '/workspaces/ascend/tests/fixtures/bl-001/workbench project;BL-001',
  timeoutMs: 10_000,
  outputLimitBytes: 4096,
  pid: 9000 + slot,
  startTimeTicks: '20',
  startedAt: '2026-08-10T00:00:00.000Z',
  endedAt: '2026-08-10T00:00:07.000Z',
  startMonotonicMs: 0,
  endMonotonicMs: 7000,
  exitCode: status === 'passed' ? 0 : 1,
  status,
  stdout: '',
  stderr: '',
})
const dependencies = (
  options: {
    failStart?: (cohort: number, slot: number) => boolean
    failProbeCall?: number
    workloadStatus?: (cohort: number, slot: number) => WorkloadResult['status']
  } = {}
) => {
  const calls: string[] = []
  let probeCalls = 0
  const clock = new Clock()
  const deps: Partial<CapacityCoordinatorDependencies> = {
    clock,
    timedOut: () => false,
    snapshot: async () => snapshot,
    probe: async () => probe(++probeCalls !== options.failProbeCall),
    start: async (slot, cohort) => {
      calls.push('start:' + cohort + ':' + slot)
      if (options.failStart?.(cohort, slot))
        throw new Error('controlled-start-failure')
      const pid = cohort * 100 + slot
      return {
        handle: {
          version: 1,
          pid,
          url: 'http://127.0.0.1:' + (4000 + pid) + '/',
          runId: '00000000-0000-4000-8000-' + String(pid).padStart(12, '0'),
          startTimeTicks: '10',
        },
        projectPath: '/fixture',
        argv: [],
        readinessStatus: 200,
        elapsedMs: 1,
      }
    },
    stop: async (handle) => {
      calls.push('stop:' + handle.pid)
    },
    inspect: async (pid) => ({
      ok: true,
      rootPid: pid,
      rows: [{ pid, ppid: 1, startTimeTicks: '10', cpuTicks: 1, rssKiB: 10 }],
    }),
    listeners: async (pids) => [
      {
        address: '127.0.0.1',
        port: 4000 + pids[0],
        pid: pids[0],
        inode: String(pids[0]),
      },
    ],
    audit: async () => ({
      processIdentitiesAbsent: true,
      listenersAbsent: true,
    }),
    sample: async (input) => sampleRows(input),
    workload: async (input) => {
      const result = workloadResult(
        input.cohort,
        input.slot,
        options.workloadStatus?.(input.cohort, input.slot)
      )
      const controller: WorkloadController = {
        identity: { pid: result.pid!, startTimeTicks: result.startTimeTicks! },
        startedMonotonicMs: 0,
        isRunning: () => true,
        finish: async () => result,
        cancel: async () => undefined,
      }
      return controller
    },
  }
  return { deps, calls }
}

describe('capacity cohort coordinator', () => {
  it('attempts 1/3/5/10 serially and continues after an ordinary member failure', async () => {
    const controlled = dependencies({
      failStart: (cohort, slot) => cohort === 3 && slot === 2,
    })
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(result.cohorts.map(({ requested }) => requested)).toEqual([
      1, 3, 5, 10,
    ])
    expect(
      controlled.calls.filter((value) => value.startsWith('start:'))
    ).toEqual([
      'start:1:1',
      'start:3:1',
      'start:3:2',
      'start:3:3',
      ...Array.from({ length: 5 }, (_, index) => 'start:5:' + (index + 1)),
      ...Array.from({ length: 10 }, (_, index) => 'start:10:' + (index + 1)),
    ])
    expect(result.cohorts[1].slots.map(({ state }) => state)).toEqual([
      'ready',
      'failed',
      'ready',
    ])
    expect(result.cohorts.every(({ complete }) => complete)).toBe(true)
    expect(result.threeMemberGate.passed).toBe(false)
  })

  it('latches a responsiveness stop and synthesizes every ordered unstarted slot and position', async () => {
    const controlled = dependencies({ failProbeCall: 1 })
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(
      controlled.calls.filter((value) => value.startsWith('start:'))
    ).toEqual([])
    expect(
      result.cohorts
        .flatMap(({ slots }) => slots)
        .every(
          ({ state, reason }) =>
            state === 'unstarted' &&
            reason?.includes('responsiveness-safety-stop')
        )
    ).toBe(true)
    expect(result.samples.samples).toHaveLength(40)
    expect(
      result.samples.samples.every(({ absentReason }) =>
        absentReason?.includes('responsiveness-safety-stop')
      )
    ).toBe(true)
  })

  it('freezes the passing three-member gate while five/ten failures remain findings', async () => {
    const controlled = dependencies({
      failStart: (cohort, slot) => cohort === 5 && slot === 2,
      workloadStatus: (cohort, slot) =>
        cohort === 10 && slot === 4 ? 'nonzero' : 'passed',
    })
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(result.threeMemberGate).toEqual({ passed: true, blockers: [] })
    expect(result.cohorts[2].findings).toContain(
      'slot 2:controlled-start-failure'
    )
    expect(result.cohorts[3].findings).toContain('workload 4:nonzero')
    expect(result.exitReasons).toEqual([])
  })

  it('keeps overall timeout, cleanup leakage, and fixture mutation failure-shaped', async () => {
    const timed = dependencies()
    timed.deps.timedOut = () => true
    const timedResult = await coordinateCapacityRun(runId, timed.deps)
    expect(timedResult.exitReasons).toContain('overall-timeout')
    expect(
      timedResult.cohorts
        .flatMap(({ slots }) => slots)
        .every(({ state }) => state === 'unstarted')
    ).toBe(true)
    expect(timedResult.cohorts.every(({ complete }) => !complete)).toBe(true)
    expect(
      timedResult.cohorts.every(({ findings }) =>
        findings.includes('incomplete-evidence')
      )
    ).toBe(true)

    const leaked = dependencies()
    leaked.deps.audit = async () => ({
      processIdentitiesAbsent: false,
      listenersAbsent: true,
    })
    const leakedResult = await coordinateCapacityRun(runId, leaked.deps)
    expect(leakedResult.exitReasons).toContain('cleanup-failed:1')
    expect(
      leakedResult.cohorts[1].slots.every(({ state }) => state === 'unstarted')
    ).toBe(true)

    const mutated = dependencies()
    let snapshots = 0
    mutated.deps.snapshot = async () =>
      ++snapshots === 2
        ? { paths: ['mutated'], sentinelHashes: { a: 'changed' } }
        : snapshot
    const mutatedResult = await coordinateCapacityRun(runId, mutated.deps)
    expect(mutatedResult.exitReasons).toContain('integrity-failed:1')
    expect(mutatedResult.cohorts[0].integrity).toMatchObject({
      complete: true,
      passed: false,
    })
  })

  it('retains process inspection failures without success-shaped slots', async () => {
    const controlled = dependencies()
    controlled.deps.inspect = async (pid) => ({
      ok: false,
      rootPid: pid,
      reason: 'controlled-inspection-failure',
    })
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(result.cohorts[0].slots[0]).toMatchObject({
      state: 'failed',
      reason: 'process-inspection-failed:controlled-inspection-failure',
    })
    expect(result.cohorts[1].slots).toHaveLength(3)
  })

  it('names strict three-member workload, sample, and probe gate blockers', async () => {
    const workloadFailure = dependencies({
      workloadStatus: (cohort, slot) =>
        cohort === 3 && slot === 1 ? 'nonzero' : 'passed',
    })
    const workloadResult = await coordinateCapacityRun(
      runId,
      workloadFailure.deps
    )
    expect(workloadResult.threeMemberGate.blockers).toContain(
      'member workload failed'
    )

    const sampleFailure = dependencies()
    sampleFailure.deps.sample = async (input) => {
      const result = sampleRows(input)
      if (input.cohort === 3 && input.window === 'active')
        result.samples[0].processTrees = []
      return result
    }
    const sampleResult = await coordinateCapacityRun(runId, sampleFailure.deps)
    expect(sampleResult.threeMemberGate.blockers).toContain(
      'active samples or responsiveness were incomplete'
    )

    const probeFailure = dependencies({ failProbeCall: 4 })
    const probeResult = await coordinateCapacityRun(runId, probeFailure.deps)
    expect(probeResult.threeMemberGate.blockers).toContain(
      'required responsiveness probe failed'
    )
  })

  it('tracks and cleans identities and listener owners discovered during sampling', async () => {
    const controlled = dependencies()
    const cleaned: number[] = []
    const audited: number[][] = []
    controlled.deps.cleanupIdentity = async ({ pid }) => {
      cleaned.push(pid)
    }
    controlled.deps.audit = async (processes) => {
      audited.push(processes.map(({ pid }) => pid))
      return { processIdentitiesAbsent: true, listenersAbsent: true }
    }
    controlled.deps.sample = async (input) => {
      for (const slot of input.slots.filter(({ state }) => state === 'ready'))
        input.onAttribution?.(
          slot.slot,
          [
            { pid: slot.pid!, startTimeTicks: '10' },
            { pid: slot.pid! + 10_000, startTimeTicks: 'later' },
          ],
          [
            slot.listener!,
            {
              address: '127.0.0.1',
              port: slot.listener!.port + 10_000,
              pid: slot.pid! + 10_000,
              inode: 'later-' + slot.pid,
            },
          ]
        )
      return sampleRows(input)
    }
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(result.cohorts[0].slots[0].processIdentities).toContainEqual({
      pid: 10_101,
      startTimeTicks: 'later',
    })
    expect(result.cohorts[0].slots[0].attributedListeners).toContainEqual(
      expect.objectContaining({ pid: 10_101, inode: 'later-101' })
    )
    expect(cleaned).toContain(10_101)
    expect(audited.some((pids) => pids.includes(10_101))).toBe(true)
  })

  it('rejects a repeated listener-owner PID and includes it in the three-member gate', async () => {
    const controlled = dependencies()
    controlled.deps.inspect = async (pid) => ({
      ok: true,
      rootPid: pid,
      rows: [
        { pid, ppid: 1, startTimeTicks: '10', cpuTicks: 1, rssKiB: 10 },
        { pid: 777, ppid: pid, startTimeTicks: '11', cpuTicks: 1, rssKiB: 10 },
      ],
    })
    controlled.deps.listeners = async (pids) => [
      {
        address: '127.0.0.1',
        port: 4000 + pids[0],
        pid: 777,
        inode: String(pids[0]),
      },
    ]
    const result = await coordinateCapacityRun(runId, controlled.deps)
    expect(result.cohorts[1].slots.map(({ state }) => state)).toEqual([
      'ready',
      'failed',
      'failed',
    ])
    expect(result.threeMemberGate.blockers).toContain(
      'all three members were not ready'
    )
    expect(result.threeMemberGate.blockers).toContain(
      'member PID, listener-owner PID, or port was not distinct'
    )
  })

  it('removes unexpected exits from ready counts and records findings', async () => {
    const controlled = dependencies()
    const calls = new Map<number, number>()
    controlled.deps.inspect = async (pid) => {
      const count = (calls.get(pid) ?? 0) + 1
      calls.set(pid, count)
      return count === 1
        ? {
            ok: true,
            rootPid: pid,
            rows: [
              {
                pid,
                ppid: 1,
                startTimeTicks: '10',
                cpuTicks: 1,
                rssKiB: 10,
              },
            ],
          }
        : { ok: false, rootPid: pid, reason: 'root-process-absent' }
    }
    const result = await coordinateCapacityRun(runId, controlled.deps)
    const first = result.cohorts[0]
    expect(first.slots[0]).toMatchObject({
      state: 'failed',
      readinessAchieved: true,
      unexpectedExit: true,
      reason: 'unexpected-exit:root-process-absent',
    })
    expect(first.findings).toContain('unexpected-exit:1')
    expect(first.slots.filter(({ state }) => state === 'ready')).toHaveLength(0)
  })

  it('records probe, process-tree, missing-sample, and incomplete findings', async () => {
    const controlled = dependencies()
    controlled.deps.sample = async (input) => {
      const result = sampleRows(input)
      if (input.cohort === 5 && input.window === 'idle') {
        result.samples[0].host!.responsiveness = probe(false)
        result.samples[1].processTrees[0] = {
          slot: 1,
          sample: null,
          absentReason: 'controlled-process-tree-failure',
        }
      }
      if (input.cohort === 5 && input.window === 'active')
        result.samples[0].processTrees = []
      return result
    }
    const result = await coordinateCapacityRun(runId, controlled.deps)
    const findings = result.cohorts[2].findings.join('\n')
    expect(findings).toContain('probe-failed')
    expect(findings).toContain('controlled-process-tree-failure')
    expect(findings).toContain('incomplete-evidence')
    expect(result.cohorts[2].complete).toBe(false)
    expect(result.exitReasons).toContain('cohort-incomplete:5')
  })
})
