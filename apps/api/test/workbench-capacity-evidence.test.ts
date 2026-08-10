import { randomUUID } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CAPACITY_COHORTS,
  CAPACITY_EVIDENCE_ROOT,
  CAPACITY_OVERALL_TIMEOUT_MS,
  CAPACITY_PROBE,
  CAPACITY_WORKLOAD_COMMAND,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  relativeEvidencePaths,
  validateCapacityEvidence,
  type CapacityCohortRecord,
  type CapacityRunRecord,
  type CapacitySamplesEvidence,
  type CapacitySlot,
} from '../src/workbench-capacity-contract.js'
import {
  readCapacityEvidence,
  renderCapacityComparison,
  writeCapacityEvidence,
} from '../src/workbench-capacity-evidence.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})
const probe = {
  command: '/usr/bin/true',
  timeoutMs: 1_000,
  startedAt: '2026-08-10T00:00:00.000Z',
  endedAt: '2026-08-10T00:00:00.001Z',
  passed: true,
  exitCode: 0,
  reason: null,
}
const fixture = { paths: ['sentinel'], sentinelHashes: { sentinel: 'hash' } }
const evidence = () => {
  const runId = randomUUID()
  const samples: CapacitySamplesEvidence = { version: 1, runId, samples: [] }
  const cohorts: CapacityCohortRecord[] = CAPACITY_COHORTS.map((requested) => {
    const slots: CapacitySlot[] = Array.from(
      { length: requested },
      (_, index) => ({
        runId,
        cohort: requested,
        slot: index + 1,
        state: 'failed',
        reason: 'controlled finding',
        attemptStartedAt: '2026-08-10T00:00:00.000Z',
        attemptEndedAt: '2026-08-10T00:00:00.001Z',
        readinessTimeoutMs: 30_000,
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
    )
    for (const window of ['idle', 'active'] as const)
      for (let position = 0; position < 5; position += 1)
        samples.samples.push({
          runId,
          cohort: requested,
          window,
          position: position as 0 | 1 | 2 | 3 | 4,
          targetOffsetMs: position * 1000,
          targetMonotonicMs: position * 1000,
          actualMonotonicMs: null,
          host: null,
          processTrees: [],
          absentReason: 'controlled absence',
        })
    return {
      runId,
      requested,
      slots,
      preProbe: probe,
      postCleanupProbe: probe,
      idleAnchorMonotonicMs: 0,
      idleEndedMonotonicMs: 5000,
      activeAnchorMonotonicMs: 5000,
      activeEndedMonotonicMs: 10000,
      cleanup: {
        complete: true,
        passed: true,
        processIdentitiesAbsent: true,
        listenersAbsent: true,
        workloadIdentitiesAbsent: true,
        details: [],
      },
      integrity: {
        complete: true,
        passed: true,
        treeMembershipEqual: true,
        sentinelHashesEqual: true,
        details: [],
      },
      complete: true,
      findings: ['controlled finding'],
      gateStatus: requested === 3 ? 'failed' : 'not-applicable',
      gateBlockers: requested === 3 ? ['all three members were not ready'] : [],
    }
  })
  const run: CapacityRunRecord = {
    version: 1,
    runId,
    startedAt: '2026-08-10T00:00:00.000Z',
    endedAt: '2026-08-10T00:00:01.000Z',
    overallTimeoutMs: CAPACITY_OVERALL_TIMEOUT_MS,
    prerequisites: [],
    host: null,
    probeDefinition: CAPACITY_PROBE,
    workloadDefinition: {
      command: CAPACITY_WORKLOAD_COMMAND,
      durationMs: CAPACITY_WORKLOAD_DURATION_MS,
      timeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
      outputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
    },
    measurementMethod: 'controlled',
    fixture: { before: fixture, after: fixture, unchanged: true },
    cohorts,
    safetyStopReason: null,
    threeMemberGate: {
      passed: false,
      blockers: ['all three members were not ready'],
    },
    overallDisposition: 'failed',
    exitReasons: ['three-member-gate-failed'],
    evidence: relativeEvidencePaths(runId),
  }
  return {
    run,
    samples,
    workloads: { version: 1 as const, runId, workloads: [] },
  }
}

describe('capacity evidence retention', () => {
  it('atomically round-trips raw JSON and reproducible concise comparison', async () => {
    const value = evidence()
    const directory = path.join(CAPACITY_EVIDENCE_ROOT, value.run.runId)
    directories.push(directory)
    await expect(
      writeCapacityEvidence(value.run, value.samples, value.workloads)
    ).resolves.toBe(directory)
    const retained = await readCapacityEvidence(directory)
    expect(retained.run.runId).toBe(value.run.runId)
    expect(retained.comparison).toBe(
      renderCapacityComparison(value.run, value.samples, value.workloads)
    )
    expect(retained.comparison).toContain(
      '| Cohort | Requested | Ready | Failed | Unstarted | Workload pass/fail | Samples retained/absent'
    )
    expect(
      await readFile(path.join(directory, 'samples.json'), 'utf8')
    ).toContain(value.run.runId)
  })

  it('accepts explicit findings but rejects omitted positions and mixed IDs', () => {
    const value = evidence()
    expect(() =>
      validateCapacityEvidence(value.run, value.samples, value.workloads)
    ).not.toThrow()
    value.samples.samples.pop()
    expect(() =>
      validateCapacityEvidence(value.run, value.samples, value.workloads)
    ).toThrow('schedule is incomplete')
  })

  it('requires every readiness-achieved process tree or an explicit absence', () => {
    const value = evidence()
    const slot = value.run.cohorts[0].slots[0]
    Object.assign(slot, {
      state: 'ready',
      reason: null,
      pid: 123,
      runtimeRunId: randomUUID(),
      listener: { address: '127.0.0.1', port: 4321, pid: 123, inode: '1' },
      readinessAchieved: true,
      processIdentities: [{ pid: 123, startTimeTicks: '1' }],
      attributedListeners: [
        { address: '127.0.0.1', port: 4321, pid: 123, inode: '1' },
      ],
    })
    for (const sample of value.samples.samples.filter(
      ({ cohort }) => cohort === 1
    ))
      sample.processTrees = [
        { slot: 1, sample: null, absentReason: 'controlled process absence' },
      ]
    value.workloads.workloads.push({
      runId: value.run.runId,
      cohort: 1,
      slot: 1,
      command: 'node workload',
      executable: process.execPath,
      args: [],
      cwd: '/fixture',
      timeoutMs: 10_000,
      outputLimitBytes: 4_096,
      pid: 456,
      startTimeTicks: '2',
      startedAt: value.run.startedAt,
      endedAt: value.run.endedAt,
      startMonotonicMs: 0,
      endMonotonicMs: 1,
      exitCode: 0,
      status: 'passed',
      stdout: '',
      stderr: '',
    })
    expect(() =>
      validateCapacityEvidence(value.run, value.samples, value.workloads)
    ).not.toThrow()
    value.samples.samples[0].processTrees = []
    expect(() =>
      validateCapacityEvidence(value.run, value.samples, value.workloads)
    ).toThrow('schedule is incomplete')
  })

  it('keeps evidence write collisions failure-shaped and exposes only root recipes', async () => {
    const value = evidence()
    const directory = path.join(CAPACITY_EVIDENCE_ROOT, value.run.runId)
    directories.push(directory)
    await writeCapacityEvidence(value.run, value.samples, value.workloads)
    await expect(
      writeCapacityEvidence(value.run, value.samples, value.workloads)
    ).rejects.toThrow()
    const justfile = await readFile(
      path.join(REPOSITORY_ROOT, 'justfile'),
      'utf8'
    )
    expect(justfile).toContain('proof-workbench-capacity:')
    expect(justfile).toContain('proof-workbench-capacity-audit:')
    expect(justfile).toContain('just proof-workbench-capacity-audit')
  })

  it('rejects each omitted completeness boundary explicitly', () => {
    const invalidIdentity = evidence()
    invalidIdentity.run.runId = 'invalid'
    expect(() =>
      validateCapacityEvidence(
        invalidIdentity.run,
        invalidIdentity.samples,
        invalidIdentity.workloads
      )
    ).toThrow('identity')

    const missingSlot = evidence()
    missingSlot.run.cohorts[0].slots.pop()
    expect(() =>
      validateCapacityEvidence(
        missingSlot.run,
        missingSlot.samples,
        missingSlot.workloads
      )
    ).toThrow('slot evidence')

    const missingReason = evidence()
    missingReason.run.cohorts[0].slots[0].reason = null
    expect(() =>
      validateCapacityEvidence(
        missingReason.run,
        missingReason.samples,
        missingReason.workloads
      )
    ).toThrow('slot is invalid')

    const incompleteReady = evidence()
    incompleteReady.run.cohorts[0].slots[0].state = 'ready'
    incompleteReady.run.cohorts[0].slots[0].reason = null
    incompleteReady.run.cohorts[0].slots[0].readinessAchieved = true
    expect(() =>
      validateCapacityEvidence(
        incompleteReady.run,
        incompleteReady.samples,
        incompleteReady.workloads
      )
    ).toThrow('Ready slot metadata')

    const missingWorkload = evidence()
    Object.assign(missingWorkload.run.cohorts[0].slots[0], {
      state: 'ready',
      reason: null,
      pid: 123,
      runtimeRunId: randomUUID(),
      listener: { address: '127.0.0.1', port: 4321, pid: 123, inode: '1' },
      readinessAchieved: true,
      processIdentities: [{ pid: 123, startTimeTicks: '1' }],
      attributedListeners: [
        { address: '127.0.0.1', port: 4321, pid: 123, inode: '1' },
      ],
    })
    for (const sample of missingWorkload.samples.samples.filter(
      ({ cohort }) => cohort === 1
    ))
      sample.processTrees = [
        { slot: 1, sample: null, absentReason: 'controlled absence' },
      ]
    expect(() =>
      validateCapacityEvidence(
        missingWorkload.run,
        missingWorkload.samples,
        missingWorkload.workloads
      )
    ).toThrow('workload evidence')

    const incompleteCleanup = evidence()
    incompleteCleanup.run.cohorts[0].cleanup.complete = false
    expect(() =>
      validateCapacityEvidence(
        incompleteCleanup.run,
        incompleteCleanup.samples,
        incompleteCleanup.workloads
      )
    ).toThrow('final audit')
  })
})
