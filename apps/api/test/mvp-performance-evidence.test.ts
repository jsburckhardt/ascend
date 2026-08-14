import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { IntegratedCapacityRecord } from '../src/mvp-performance-capacity.js'
import {
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  createMvpPlan,
  metricDisposition,
  type MvpAttempt,
  type MvpSummary,
} from '../src/mvp-performance-contract.js'
import {
  beginMvpAttemptCheckpoint,
  completeMvpAttemptCheckpoint,
  finalizeInterruptedMvpAttemptJournal,
  finalizeMvpAttemptJournal,
  recoverMvpAttemptJournal,
  renderMvpComparison,
  summarizeMvpPerformance,
  writeMvpPlan,
} from '../src/mvp-performance-evidence.js'

const summary = (measured: boolean, approved: boolean): MvpSummary => ({
  schemaVersion: 1,
  runId: 'run',
  planHash: 'plan',
  measurementHash: 'measurement',
  completedAt: '2026-08-13T12:00:00.000Z',
  cold: {
    orderedAttemptIds: [],
    sortedSourceAttemptIds: [],
    sourceDurationsNs: [],
    medianNs: measured ? '1000000' : null,
    p95Ns: measured ? '2000000' : null,
    maximumNs: measured ? '3000000' : null,
    failures: 0,
    preStartFailures: 0,
    identityChanges: 0,
    targetMisses: 0,
  },
  warm: {
    orderedAttemptIds: [],
    sortedSourceAttemptIds: [],
    sourceDurationsNs: [],
    medianNs: measured ? '4000000' : null,
    p95Ns: measured ? '5000000' : null,
    maximumNs: measured ? '6000000' : null,
    failures: 1,
    preStartFailures: 0,
    identityChanges: 0,
    targetMisses: 1,
  },
  continuity: { successes: 3, total: 3, metric2: 1, disposition: 'met' },
  capacity: [],
  metrics: {
    nfr002Metric4: 'met',
    nfr001Metric3: 'blocker',
    continuityMetric2: 'met',
    nfr003Capacity3: 'met',
  },
  overallDisposition: 'blocker',
  approval: approved
    ? {
        approver: 'owner',
        reason: 'reason',
        risk: 'risk',
        followUpBacklogId: 'BL-999',
        evidenceHash: 'measurement',
        createdAt: '2026-08-13T12:00:01.000Z',
      }
    : null,
})
const capacity = {
  comparison: [
    {
      cohort: 3,
      field: 'runtimeCpuAveragePercent',
      classification: 'comparable',
      reason: 'same method',
      baseline: {
        runId: 'base',
        method: 'method',
        sourceFile: 'base.json',
        sampleCount: 1,
        value: 1,
      },
      current: {
        runId: 'run',
        method: 'method',
        sourceFile: 'current.json',
        sampleCount: 1,
        value: 2,
      },
      delta: 1,
    },
    {
      cohort: 'historical-1',
      field: 'runtimeCpuAveragePercent',
      classification: 'not-comparable',
      reason: 'no current one-member cohort',
      baseline: {
        runId: 'base',
        method: 'method',
        sourceFile: 'base.json',
        sampleCount: 1,
        value: 1,
      },
      current: null,
      delta: null,
    },
  ],
} as IntegratedCapacityRecord

describe('BL-015 comparison rendering', () => {
  it('renders measured values and external approval', () => {
    const result = renderMvpComparison(summary(true, true), capacity)
    expect(result).toContain('1.000')
    expect(result).toContain('external retained approval applied')
  })
  it('atomically recovers completed and in-progress attempts without fabrication', async () => {
    const runId = 'test-interrupted-attempt-journal'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const plan = createMvpPlan(runId, '2026-08-13T12:00:00.000Z', 1n)
    const first = {
      runId,
      planHash: plan.planHash,
      attemptId: 'cold-1-A',
      ordinal: 1,
    } as MvpAttempt
    try {
      await writeMvpPlan(plan)
      await beginMvpAttemptCheckpoint({
        runId,
        planHash: plan.planHash,
        attemptId: first.attemptId,
        ordinal: 1,
      })
      await completeMvpAttemptCheckpoint({
        attempt: first,
        artifact: { attemptId: first.attemptId },
      })
      await beginMvpAttemptCheckpoint({
        runId,
        planHash: plan.planHash,
        attemptId: 'cold-2-B',
        ordinal: 2,
      })
      const recovered = await recoverMvpAttemptJournal(runId, plan.planHash)
      expect(recovered.checkpoints.map((row) => row.attempt.attemptId)).toEqual(
        ['cold-1-A']
      )
      expect(recovered.inProgress).toMatchObject({ attemptId: 'cold-2-B' })
      expect(
        await finalizeMvpAttemptJournal(runId, plan.planHash)
      ).toHaveLength(1)
      await expect(
        completeMvpAttemptCheckpoint({
          attempt: { ...first, attemptId: 'cold-2-B', ordinal: 2 },
          artifact: { attemptId: 'cold-2-B' },
        })
      ).rejects.toThrow('attempt-journal-closed')
      expect(
        JSON.parse(
          await readFile(path.join(root, 'attempt-recovery.json'), 'utf8')
        )
      ).toMatchObject({
        completedAttemptIds: ['cold-1-A'],
        inProgress: { attemptId: 'cold-2-B' },
        fabricatedAttempts: 0,
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('retains valid checkpoints and explicitly quarantines a corrupt interrupted attempt', async () => {
    const runId = 'test-corrupt-interrupted-attempt-journal'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const plan = createMvpPlan(runId, '2026-08-13T12:00:00.000Z', 1n)
    const first = {
      runId,
      planHash: plan.planHash,
      attemptId: 'cold-1-A',
      ordinal: 1,
    } as MvpAttempt
    try {
      await writeMvpPlan(plan)
      await completeMvpAttemptCheckpoint({
        attempt: first,
        artifact: { attemptId: first.attemptId },
      })
      await beginMvpAttemptCheckpoint({
        runId,
        planHash: plan.planHash,
        attemptId: 'cold-2-B',
        ordinal: 2,
      })
      const attemptRoot = path.join(root, 'journal', 'attempts')
      await mkdir(attemptRoot, { recursive: true })
      await writeFile(path.join(attemptRoot, '002-cold-2-B.json'), '', {
        mode: 0o600,
      })
      const recovered = await finalizeInterruptedMvpAttemptJournal(
        runId,
        plan.planHash
      )
      expect(recovered.attempts.map((attempt) => attempt.attemptId)).toEqual([
        'cold-1-A',
      ])
      expect(recovered.inProgress).toMatchObject({ attemptId: 'cold-2-B' })
      expect(recovered.invalidCheckpoints).toEqual([
        expect.objectContaining({
          file: '002-cold-2-B.json',
          bytes: 0,
          classification: 'invalid-json',
        }),
      ])
      expect(
        (
          await stat(
            path.join(root, 'journal', 'invalid', '002-cold-2-B.json.invalid')
          )
        ).size
      ).toBe(0)
      expect(
        JSON.parse(
          await readFile(path.join(root, 'attempt-recovery.json'), 'utf8')
        )
      ).toMatchObject({
        completedAttemptIds: ['cold-1-A'],
        inProgress: { attemptId: 'cold-2-B' },
        fabricatedAttempts: 0,
        resumable: false,
        disposition: 'retained-partial-new-run-required',
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('rejects strict journal owner mismatch and classifies it during interrupted recovery', async () => {
    const runId = 'test-owner-mismatch-attempt-journal'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const plan = createMvpPlan(runId, '2026-08-13T12:00:00.000Z', 1n)
    const attemptRoot = path.join(root, 'journal', 'attempts')
    const target = path.join(attemptRoot, '001-cold-1-A.json')
    const attempt = {
      runId,
      planHash: plan.planHash,
      attemptId: 'cold-1-A',
      ordinal: 1,
    } as MvpAttempt
    try {
      await mkdir(attemptRoot, { recursive: true })
      await writeFile(target, '{')
      await expect(
        recoverMvpAttemptJournal(runId, plan.planHash)
      ).rejects.toThrow()
      const invalidJson = await recoverMvpAttemptJournal(runId, plan.planHash, {
        tolerateInvalid: true,
      })
      expect(invalidJson.invalidCheckpoints).toEqual([
        expect.objectContaining({
          file: '001-cold-1-A.json',
          classification: 'invalid-json',
        }),
      ])
      await writeFile(
        target,
        JSON.stringify({
          state: 'complete',
          attempt: { ...attempt, planHash: 'wrong-plan' },
          artifact: { attemptId: attempt.attemptId },
        })
      )
      await expect(
        recoverMvpAttemptJournal(runId, plan.planHash)
      ).rejects.toThrow('attempt-journal-owner-mismatch')
      const tolerant = await recoverMvpAttemptJournal(runId, plan.planHash, {
        tolerateInvalid: true,
      })
      expect(tolerant.inProgress).toBeNull()
      expect(tolerant.invalidCheckpoints).toEqual([
        expect.objectContaining({
          file: '001-cold-1-A.json',
          classification: 'owner-mismatch',
        }),
      ])
      await writeFile(
        target,
        JSON.stringify({
          state: 'complete',
          attempt,
          artifact: { attemptId: attempt.attemptId },
        })
      )
      await beginMvpAttemptCheckpoint({
        runId,
        planHash: plan.planHash,
        attemptId: attempt.attemptId,
        ordinal: 1,
      })
      const completed = await recoverMvpAttemptJournal(runId, plan.planHash)
      expect(completed.checkpoints).toHaveLength(1)
      expect(completed.inProgress).toBeNull()
      const finalized = await finalizeInterruptedMvpAttemptJournal(
        runId,
        plan.planHash
      )
      expect(finalized.invalidCheckpoints).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('recomputes met, blocker, and evidence-bound accepted dispositions from raw records', async () => {
    const runId = 'test-mvp-summary-recomputation'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const plan = createMvpPlan(runId, '2026-08-13T12:00:00.000Z', 1n)
    const projects = [...plan.order.cold, ...plan.order.warm]
    const attempts = projects.map(
      (project, index) =>
        ({
          runId,
          planHash: plan.planHash,
          attemptId: `${index < 5 ? 'cold' : 'warm'}-${index + 1}`,
          ordinal: index + 1,
          project,
          statisticalTotalNs: '500000000',
          status: 'success',
          runtime: index < 5 ? null : { identityDigest: `identity-${project}` },
          boundary: {
            passed: true,
            measuredResiduals: 0,
            expectedIdentityCount: index < 5 ? 0 : 1,
          },
        }) as MvpAttempt
    )
    const continuity = {
      schemaVersion: 1,
      runId,
      planHash: plan.planHash,
      exactController: 'tests/e2e/session-switching.spec.ts',
      count: 3,
      runs: [1, 2, 3].map((ordinal) => ({
        ordinal,
        attemptId: `continuity-${ordinal}`,
        retry: 0,
        sourceExecutionId: `source-${ordinal}`,
        passed: true,
        failure: null,
        publicDigest: `public-${ordinal}`,
        restrictedDigest: `restricted-${ordinal}`,
        stateCrossingOrLoss: false,
        cleanupPassed: true,
      })),
    } as const
    const fullCapacity = {
      schemaVersion: 1,
      runId,
      planHash: plan.planHash,
      cohorts: [
        {
          cohort: 3,
          ready: 3,
          workloads: [{ status: 'passed' }, { status: 'failed' }],
          requiredSamplesComplete: true,
          responsivenessPassed: true,
          cleanupPassed: true,
          gate: 'met',
        },
      ],
      comparison: [],
      finalResidualAudit: { total: 0 },
    } as IntegratedCapacityRecord
    try {
      const met = await summarizeMvpPerformance({
        plan,
        attempts,
        continuity,
        capacity: fullCapacity,
        approval: null,
      })
      expect(met.overallDisposition).toBe('met')
      expect(met.capacity[0]?.workloadsPassed).toBe(1)

      const blockedAttempts = attempts.map((attempt, index) =>
        index === 0
          ? {
              ...attempt,
              status: 'pre-start-failed' as const,
              statisticalTotalNs: null,
              boundary: { ...attempt.boundary, passed: false },
            }
          : index === 5
            ? {
                ...attempt,
                runtime: { identityDigest: 'changed-identity' },
              }
            : attempt
      )
      const blocked = await summarizeMvpPerformance({
        plan,
        attempts: blockedAttempts,
        continuity: {
          ...continuity,
          runs: continuity.runs.map((row, index) =>
            index === 0
              ? { ...row, passed: false, cleanupPassed: false }
              : index === 1
                ? { ...row, stateCrossingOrLoss: true }
                : row
          ),
        },
        capacity: {
          ...fullCapacity,
          cohorts: fullCapacity.cohorts.map((row) => ({
            ...row,
            gate: 'blocker' as const,
          })),
          finalResidualAudit: { total: 1 },
        },
        approval: null,
      })
      expect(blocked.overallDisposition).toBe('blocker')
      expect(blocked.cold.preStartFailures).toBe(1)
      expect(blocked.warm.identityChanges).toBe(3)
      expect(blocked.continuity.successes).toBe(1)

      const accepted = await summarizeMvpPerformance({
        plan,
        attempts: blockedAttempts,
        continuity: {
          ...continuity,
          runs: continuity.runs.map((row, index) =>
            index === 0
              ? { ...row, passed: false, cleanupPassed: false }
              : index === 1
                ? { ...row, stateCrossingOrLoss: true }
                : row
          ),
        },
        capacity: {
          ...fullCapacity,
          cohorts: fullCapacity.cohorts.map((row) => ({
            ...row,
            gate: 'blocker' as const,
          })),
          finalResidualAudit: { total: 1 },
        },
        approval: {
          approver: 'owner',
          reason: 'bounded exception',
          risk: 'documented',
          followUpBacklogId: 'BL-999',
          evidenceHash: blocked.measurementHash,
          createdAt: '2099-08-13T12:00:00.000Z',
        },
      })
      expect(accepted.metrics.nfr002Metric4).toBe('miss-accepted')
      expect(accepted.overallDisposition).toBe('met')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('rejects each incomplete or stale external approval field', () => {
    const completedAt = '2026-08-13T12:00:00.000Z'
    const approval = {
      approver: 'owner',
      reason: 'bounded exception',
      risk: 'documented',
      followUpBacklogId: 'BL-999',
      evidenceHash: 'measurement',
      createdAt: '2026-08-13T12:00:01.000Z',
    }
    expect(metricDisposition(false, null, 'measurement', completedAt)).toBe(
      'blocker'
    )
    for (const mutation of [
      { approver: '' },
      { reason: '' },
      { risk: '' },
      { followUpBacklogId: 'issue-999' },
      { evidenceHash: 'other-measurement' },
      { createdAt: completedAt },
    ])
      expect(
        metricDisposition(
          false,
          { ...approval, ...mutation },
          'measurement',
          completedAt
        )
      ).toBe('blocker')
    expect(metricDisposition(false, approval, 'measurement', completedAt)).toBe(
      'miss-accepted'
    )
    expect(metricDisposition(true, null, 'measurement', completedAt)).toBe(
      'met'
    )
  })
  it('renders unavailable values and default blocker treatment', () => {
    const result = renderMvpComparison(summary(false, false), capacity)
    expect(result).toContain('n/a')
    expect(result).toContain('misses remain blockers')
  })
})
