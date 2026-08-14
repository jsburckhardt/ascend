import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  recoverInterruptedMvpPerformance,
  runMvpPerformanceCli,
} from '../src/cli/measure-mvp-performance.js'
import {
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_GUARD,
  MVP_PERFORMANCE_RESULT_ROOT,
  createMvpPlan,
  type MvpAttempt,
} from '../src/mvp-performance-contract.js'
import {
  atomicWriteMvpJson,
  beginMvpAttemptCheckpoint,
  completeMvpAttemptCheckpoint,
  writeMvpPlan,
} from '../src/mvp-performance-evidence.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

describe('BL-015 paved measurement command', () => {
  it('retains a prerequisite-specific zero-attempt record and does not enter any section', async () => {
    const runId = 'test-cli-prerequisite'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const browser = vi.fn()
    const continuity = vi.fn()
    const capacity = vi.fn()
    const release = vi.fn(async () => undefined)
    try {
      const code = await runMvpPerformanceCli(
        { stdout: vi.fn(), stderr: vi.fn() },
        {
          runId: () => runId,
          writePlan: async (plan) => {
            await mkdir(root, { recursive: true })
            await writeFile(path.join(root, 'plan.json'), JSON.stringify(plan))
            return root
          },
          acquire: async () => undefined,
          release,
          prerequisites: async () => ({
            passed: false,
            records: [
              {
                name: 'chromium-browser-artifact',
                passed: false,
                detail: 'unavailable',
              },
            ],
            host: {},
            hostIdentity: null,
            hostIdentityDigest: null,
            versions: {
              node: '22',
              chromium: 'unavailable',
              codeServer: '4.131.0',
            },
            failure: 'prerequisite-failed:chromium-browser-artifact',
            attempts: 0,
          }),
          browser,
          continuity,
          capacity,
        }
      )
      expect(code).toBe(2)
      expect(browser).not.toHaveBeenCalled()
      expect(continuity).not.toHaveBeenCalled()
      expect(capacity).not.toHaveBeenCalled()
      expect(release).toHaveBeenCalledOnce()
      expect(
        JSON.parse(await readFile(path.join(root, 'run-status.json'), 'utf8'))
      ).toMatchObject({ status: 'prerequisite-failed', attempts: 0 })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('records a complete bounded controller outcome with exact host identity', async () => {
    const runId = '00000000-0000-4000-8000-000000000036'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const expectedHost = createMvpPlan(
      runId,
      '2026-08-13T12:00:00.000Z',
      1n
    ).designatedHost
    const stdout = vi.fn()
    const continuity = vi.fn()
    const capacity = vi.fn()
    const summarize = vi.fn()
    continuity.mockResolvedValue({})
    capacity.mockResolvedValue({})
    summarize.mockResolvedValue({ overallDisposition: 'met' })
    let planHash = ''
    try {
      const code = await runMvpPerformanceCli(
        { stdout, stderr: vi.fn() },
        {
          runId: () => runId,
          nowNs: () => 1n,
          nowMs: () => 1,
          writePlan: async (plan) => {
            planHash = plan.planHash
            return writeMvpPlan(plan)
          },
          acquire: async () => undefined,
          release: async () => undefined,
          prerequisites: async () => ({
            passed: true,
            records: [],
            host: {},
            hostIdentity: expectedHost,
            hostIdentityDigest: null,
            versions: {
              node: '22',
              chromium: 'test',
              codeServer: 'test',
            },
            failure: null,
            attempts: 0,
          }),
          hostIdentity: async () => expectedHost,
          browser: async () => {
            const attempt = {
              runId,
              planHash,
              attemptId: 'cold-1-A',
              ordinal: 1,
            } as MvpAttempt
            await completeMvpAttemptCheckpoint({
              attempt,
              artifact: { attemptId: attempt.attemptId },
            })
            return { code: 0, stdout: '', stderr: '' }
          },
          continuity,
          capacity,
          attempts: async () => [],
          summarize,
        },
        null
      )
      expect(code).toBe(0)
      expect(stdout).toHaveBeenCalledWith(
        expect.stringContaining('"status":"ok"')
      )
      expect(
        JSON.parse(await readFile(path.join(root, 'run-status.json'), 'utf8'))
      ).toMatchObject({ status: 'complete', overallDisposition: 'met' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('retains exact failure evidence for controller, host, timeout, and guard failures', async () => {
    const runFailure = async (
      ordinal: number,
      mode: 'browser' | 'host' | 'timeout' | 'release'
    ) => {
      const runId = `00000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`
      const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
      const expectedHost = createMvpPlan(
        runId,
        '2026-08-13T12:00:00.000Z',
        1n
      ).designatedHost
      const stderr = vi.fn()
      const continuity = vi.fn()
      const capacity = vi.fn()
      const summarize = vi.fn()
      continuity.mockResolvedValue({})
      capacity.mockResolvedValue({})
      summarize.mockResolvedValue({ overallDisposition: 'met' })
      let planHash = ''
      let clockCalls = 0
      const code = await runMvpPerformanceCli(
        { stdout: vi.fn(), stderr },
        {
          runId: () => runId,
          nowNs: () => 1n,
          nowMs: () => {
            clockCalls += 1
            return mode === 'timeout' && clockCalls > 1 ? 1_000_000_000 : 1
          },
          writePlan: async (plan) => {
            planHash = plan.planHash
            return writeMvpPlan(plan)
          },
          acquire: async () => undefined,
          release: async () => {
            if (mode === 'release') throw new Error('test-release-failure')
          },
          prerequisites: async () => ({
            passed: true,
            records: [],
            host: {},
            hostIdentity: expectedHost,
            hostIdentityDigest: null,
            versions: {
              node: '22',
              chromium: 'test',
              codeServer: 'test',
            },
            failure: null,
            attempts: 0,
          }),
          hostIdentity: async () =>
            mode === 'host'
              ? {
                  ...expectedHost,
                  hostname: expectedHost.hostname + '-changed',
                }
              : expectedHost,
          browser: async () => {
            if (mode === 'timeout') {
              await new Promise((resolve) => setTimeout(resolve, 10))
              return { code: 0, stdout: '', stderr: '' }
            }
            const attempt = {
              runId,
              planHash,
              attemptId: 'cold-1-A',
              ordinal: 1,
            } as MvpAttempt
            await completeMvpAttemptCheckpoint({
              attempt,
              artifact: { attemptId: attempt.attemptId },
            })
            return {
              code: mode === 'browser' ? 1 : 0,
              stdout: '',
              stderr: 'test-browser',
            }
          },
          continuity,
          capacity,
          attempts: async () => [],
          summarize,
        },
        null
      )
      return { code, root, stderr }
    }

    const browser = await runFailure(37, 'browser')
    const host = await runFailure(38, 'host')
    const timeout = await runFailure(39, 'timeout')
    const release = await runFailure(40, 'release')
    try {
      expect(browser.code).toBe(1)
      expect(browser.stderr).toHaveBeenCalledWith(
        expect.stringContaining('cold-warm-controller-nonzero')
      )
      expect(host.code).toBe(1)
      expect(host.stderr).toHaveBeenCalledWith(
        expect.stringContaining('designated-host-identity-changed')
      )
      expect(timeout.code).toBe(1)
      expect(
        JSON.parse(
          await readFile(path.join(timeout.root, 'section-status.json'), 'utf8')
        ).sections
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'cold-warm', status: 'timed-out' }),
        ])
      )
      expect(release.code).toBe(1)
      expect(release.stderr).toHaveBeenCalledWith(
        expect.stringContaining('guard-release-failed')
      )
    } finally {
      await Promise.all(
        [browser, host, timeout, release].map((result) =>
          rm(result.root, { recursive: true, force: true })
        )
      )
    }
  })
  it('recovers one exact stale interrupted run without resuming or fabricating attempts', async () => {
    const runId = '00000000-0000-4000-8000-000000000035'
    const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
    const restrictedRoot = path.join(MVP_PERFORMANCE_RESULT_ROOT, runId)
    const invalidRoot = await mkdtemp(path.join(os.tmpdir(), 'bl015-invalid-'))
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), 'ascend-bl015-navigation-')
    )
    const stdout = vi.fn()
    let child: ReturnType<typeof spawn> | undefined
    try {
      await expect(
        recoverInterruptedMvpPerformance('invalid', null)
      ).rejects.toThrow('interrupted-run-id-invalid')
      await rm(MVP_PERFORMANCE_GUARD, { force: true })
      await expect(
        recoverInterruptedMvpPerformance(runId, null)
      ).rejects.toThrow('interrupted-run-stale-guard-required')
      const plan = createMvpPlan(runId, '2026-08-13T12:00:00.000Z', 1n)
      await writeMvpPlan(plan)
      await atomicWriteMvpJson(path.join(root, 'host-verification.json'), {
        schemaVersion: 1,
        runId,
        declaration: plan.designatedHost,
        start: plan.designatedHost,
      })
      await atomicWriteMvpJson(path.join(root, 'section-status.json'), {
        schemaVersion: 1,
        runId,
        overallBoundMs: plan.timeoutsMs.overall,
        overallToleranceMs: plan.timeoutsMs.overallTolerance,
        sections: [
          {
            name: 'prerequisites',
            boundMs: plan.timeoutsMs.sections.prerequisites,
            startedElapsedMs: 0,
            endedElapsedMs: 1,
            status: 'complete',
            partialEvidenceRetained: false,
          },
          {
            name: 'cold-warm',
            boundMs:
              plan.timeoutsMs.sections.cold + plan.timeoutsMs.sections.warm,
            startedElapsedMs: 1,
            endedElapsedMs: null,
            status: 'in-progress',
            partialEvidenceRetained: false,
          },
        ],
      })
      await mkdir(path.dirname(MVP_PERFORMANCE_GUARD), { recursive: true })
      await writeFile(
        MVP_PERFORMANCE_GUARD,
        JSON.stringify({
          runId,
          pid: process.pid,
          processStartTime: '0',
          planHash: plan.planHash,
          acquiredAt: '2026-08-13T12:00:00.000Z',
        }),
        { mode: 0o600 }
      )
      await expect(
        recoverInterruptedMvpPerformance(runId, null)
      ).rejects.toThrow('interrupted-run-fixture-root-required')
      await expect(
        recoverInterruptedMvpPerformance(runId, invalidRoot)
      ).rejects.toThrow('interrupted-run-fixture-root-invalid')
      const first = {
        runId,
        planHash: plan.planHash,
        attemptId: 'cold-1-A',
        ordinal: 1,
      } as MvpAttempt
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
      await writeFile(path.join(attemptRoot, '002-cold-2-B.json'), '', {
        mode: 0o600,
      })
      await mkdir(restrictedRoot, { recursive: true })
      await writeFile(path.join(restrictedRoot, 'cold-2-B.png'), '', {
        mode: 0o600,
      })
      await writeFile(path.join(restrictedRoot, 'cold-2-B.zip'), '', {
        mode: 0o600,
      })
      child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        env: { ...process.env, BL015_RUN_ID: runId },
        stdio: 'ignore',
      })
      await new Promise<void>((resolve, reject) => {
        child!.once('spawn', resolve)
        child!.once('error', reject)
      })
      await expect(
        recoverInterruptedMvpPerformance(runId, fixtureRoot)
      ).rejects.toThrow('interrupted-run-processes-still-active')
      child.kill('SIGTERM')
      await new Promise<void>((resolve) => child!.once('exit', () => resolve()))
      child = undefined
      expect(
        await recoverInterruptedMvpPerformance(runId, fixtureRoot, {
          stdout,
          stderr: vi.fn(),
        })
      ).toBe(0)
      expect(stdout).toHaveBeenCalledWith(
        expect.stringContaining('retained-partial-new-run-required')
      )
      expect(
        JSON.parse(await readFile(path.join(root, 'run-status.json'), 'utf8'))
      ).toMatchObject({
        status: 'failed',
        completedAttemptIds: ['cold-1-A'],
        inProgress: { attemptId: 'cold-2-B' },
        fabricatedAttempts: 0,
        resumable: false,
      })
      await expect(readFile(MVP_PERFORMANCE_GUARD)).rejects.toMatchObject({
        code: 'ENOENT',
      })
      await expect(readFile(fixtureRoot)).rejects.toMatchObject({
        code: 'ENOENT',
      })
    } finally {
      child?.kill('SIGTERM')
      await rm(root, { recursive: true, force: true })
      await rm(restrictedRoot, { recursive: true, force: true })
      await rm(invalidRoot, { recursive: true, force: true })
      await rm(fixtureRoot, { recursive: true, force: true })
      await rm(MVP_PERFORMANCE_GUARD, { force: true })
    }
  })
  it('owns one serial section order, one overall bound, partial retention, and no approval creation', async () => {
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'apps/api/src/cli/measure-mvp-performance.ts'),
      'utf8'
    )
    const positions = [
      "stage='cold-warm'",
      "stage='continuity'",
      "stage='capacity'",
      "stage='cleanup-and-finalization'",
    ].map((value) => source.replace(/\s/gu, '').indexOf(value))
    expect(positions.every((value) => value >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(source).toContain('MVP_OVERALL_TIMEOUT_MS')
    expect(source).toContain('MVP_SECTION_TIMEOUTS_MS')
    expect(source).toContain('host-verification.json')
    expect(source).toContain('finalizeMvpAttemptJournal')
    expect(source.replace(/\s/gu, '')).toContain('partialEvidenceRetained:true')
    expect(source).toContain('approvalArgument')
    expect(source).not.toContain('writeApproval')
  })
  it('independently audits copied BL-014 restricted runtime identities', async () => {
    const source = await readFile(
      path.join(
        REPOSITORY_ROOT,
        'apps/api/src/cli/mvp-performance-residual-audit.ts'
      ),
      'utf8'
    )
    expect(source).toContain('continuityIdentities')
    expect(source).toContain('-restricted.json')
  })
})
