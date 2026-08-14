import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createMvpPlan } from '../src/mvp-performance-contract.js'
import {
  acquireMvpPerformanceGuard,
  checkMvpPerformancePrerequisites,
  clearStaleMvpPerformanceGuard,
  inspectMvpPerformanceGuard,
  releaseMvpPerformanceGuard,
} from '../src/mvp-performance-prerequisites.js'

describe('BL-015 exclusive ownership', () => {
  it('accepts every documented designated-host prerequisite', async () => {
    const result = await checkMvpPerformancePrerequisites()
    expect(result.passed).toBe(true)
    expect(result.records.every((record) => record.passed)).toBe(true)
    expect(result.attempts).toBe(0)
  })
  it('serializes one mode-0600 owner and rejects interleaving without overwrite', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'bl015-guard-'))
    const guard = path.join(root, 'active.json')
    const plan = createMvpPlan(
      '00000000-0000-4000-8000-000000000035',
      new Date().toISOString(),
      1n
    )
    try {
      await acquireMvpPerformanceGuard(plan, guard)
      await expect(acquireMvpPerformanceGuard(plan, guard)).rejects.toThrow(
        'active-run-conflict'
      )
      expect(JSON.parse(await readFile(guard, 'utf8')).runId).toBe(plan.runId)
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('active')
      await expect(
        clearStaleMvpPerformanceGuard(
          { runId: plan.runId, complete: true, residuals: 0 },
          guard
        )
      ).rejects.toThrow('cleanup-audit-required')
      await releaseMvpPerformanceGuard(plan.runId, guard)
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('absent')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('retains stale ownership until an exact zero-residual audit is supplied', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'bl015-stale-'))
    const guard = path.join(root, 'active.json')
    try {
      await writeFile(
        guard,
        JSON.stringify({
          runId: 'stale-run',
          pid: 99999999,
          processStartTime: '1',
          planHash: 'hash',
          acquiredAt: new Date().toISOString(),
        }),
        { mode: 0o600 }
      )
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('stale')
      await expect(
        clearStaleMvpPerformanceGuard(
          { runId: 'stale-run', complete: false, residuals: 0 },
          guard
        )
      ).rejects.toThrow('cleanup-audit-required')
      await clearStaleMvpPerformanceGuard(
        { runId: 'stale-run', complete: true, residuals: 0 },
        guard
      )
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('absent')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it('classifies malformed owners and rejects mismatched cleanup authority', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'bl015-guard-invalid-'))
    const guard = path.join(root, 'active.json')
    try {
      await writeFile(guard, '{}', { mode: 0o600 })
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('malformed')
      await writeFile(guard, '{', { mode: 0o600 })
      expect((await inspectMvpPerformanceGuard(guard)).state).toBe('malformed')
      await writeFile(
        guard,
        JSON.stringify({
          runId: 'stale-run',
          pid: 99999999,
          processStartTime: '1',
          planHash: 'hash',
          acquiredAt: new Date().toISOString(),
        }),
        { mode: 0o600 }
      )
      await expect(
        releaseMvpPerformanceGuard('other-run', guard)
      ).rejects.toThrow('owner-mismatch')
      await expect(
        clearStaleMvpPerformanceGuard(
          { runId: 'other-run', complete: true, residuals: 0 },
          guard
        )
      ).rejects.toThrow('cleanup-audit-required')
      await expect(
        clearStaleMvpPerformanceGuard(
          { runId: 'stale-run', complete: true, residuals: 1 },
          guard
        )
      ).rejects.toThrow('cleanup-audit-required')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
