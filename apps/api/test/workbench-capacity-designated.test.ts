import { describe, expect, it } from 'vitest'
import {
  listRetainedCapacityRuns,
  readCapacityEvidence,
  renderCapacityComparison,
} from '../src/workbench-capacity-evidence.js'
import { validateCapacityEvidence } from '../src/workbench-capacity-contract.js'

const DESIGNATED_RUN_ID = 'e7757a3f-54ec-4ea7-9399-713e91f49719'
describe('designated-host workbench capacity baseline', () => {
  it('recomputes complete 1/3/5/10 evidence, gate, findings, and disposition', async () => {
    const directories = await listRetainedCapacityRuns()
    const designated = directories.find((directory) =>
      directory.endsWith(DESIGNATED_RUN_ID)
    )
    expect(designated).toBeDefined()
    const evidence = await readCapacityEvidence(designated!)
    expect(evidence.run.runId).toBe(DESIGNATED_RUN_ID)
    expect(() =>
      validateCapacityEvidence(
        evidence.run,
        evidence.samples,
        evidence.workloads
      )
    ).not.toThrow()
    expect(evidence.run.cohorts.map(({ requested }) => requested)).toEqual([
      1, 3, 5, 10,
    ])
    expect(evidence.run.cohorts.flatMap(({ slots }) => slots)).toHaveLength(19)
    expect(
      evidence.run.cohorts
        .flatMap(({ slots }) => slots)
        .every(
          ({ state, unexpectedExit }) => state === 'ready' && !unexpectedExit
        )
    ).toBe(true)
    expect(evidence.samples.samples).toHaveLength(40)
    expect(
      evidence.samples.samples.every(
        ({ host, absentReason }) => Boolean(host) && absentReason === null
      )
    ).toBe(true)
    expect(evidence.workloads.workloads).toHaveLength(19)
    expect(
      evidence.workloads.workloads.every(({ status }) => status === 'passed')
    ).toBe(true)
    expect(evidence.run.threeMemberGate).toEqual({ passed: true, blockers: [] })
    expect(evidence.run.overallDisposition).toBe('passed')
    expect(evidence.run.exitReasons).toEqual([])
    expect(evidence.run.fixture.unchanged).toBe(true)
    expect(evidence.run.host?.cgroup).toMatchObject({
      cpuMax: 'max 100000',
      memoryMax: 'max',
      memoryHigh: 'max',
      swapMax: 'max',
      pidsMax: 'max',
    })
    expect(evidence.comparison).toBe(
      renderCapacityComparison(
        evidence.run,
        evidence.samples,
        evidence.workloads
      )
    )
  })
})
