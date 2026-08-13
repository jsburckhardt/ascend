import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runMvpContinuitySection } from '../src/mvp-performance-continuity.js'
import * as contract from '../src/session-switching-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

describe('BL-015 continuity coordinator', () => {
  it('executes the exact BL-014 controller three serial times without retry', async () => {
    const source = await mkdtemp(path.join(os.tmpdir(), 'bl015-continuity-'))
    await mkdir(source, { recursive: true })
    await writeFile(
      path.join(source, 'switching-browser.json'),
      JSON.stringify({
        execution: { id: 'execution' },
        cleanup: { resources: [{ after: 0 }], projects: [{ residuals: 0 }] },
      })
    )
    await writeFile(
      path.join(source, 'restricted-authority.json'),
      JSON.stringify({ executionId: 'execution' }),
      { mode: 0o600 }
    )
    const execute = vi.fn(async () => ({
      code: 0,
      stdout: 'passed',
      stderr: '',
    }))
    const validator = vi
      .spyOn(contract, 'validateSessionSwitchingEvidence')
      .mockReturnValue(true)
    try {
      const result = await runMvpContinuitySection('test-continuity', 'plan', {
        execute,
        sourceRoot: source,
      })
      expect(execute).toHaveBeenCalledTimes(3)
      expect(result.runs.map((row) => row.ordinal)).toEqual([1, 2, 3])
      expect(result.runs.every((row) => row.retry === 0 && row.passed)).toBe(
        true
      )
    } finally {
      validator.mockRestore()
      await rm(source, { recursive: true, force: true })
      await rm(
        path.join(
          REPOSITORY_ROOT,
          'project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance/implementation/evidence/test-continuity'
        ),
        { recursive: true, force: true }
      )
      await rm(
        path.join(REPOSITORY_ROOT, 'test-results/bl-015/test-continuity'),
        {
          recursive: true,
          force: true,
        }
      )
    }
  })
  it('executes and retains all three failed planned runs without retrying', async () => {
    const source = await mkdtemp(
      path.join(os.tmpdir(), 'bl015-continuity-fail-')
    )
    const execute = vi.fn(async () => ({
      code: 1,
      stdout: '',
      stderr: 'failure',
    }))
    try {
      const result = await runMvpContinuitySection(
        'test-continuity-failure',
        'plan',
        { execute, sourceRoot: source }
      )
      expect(execute).toHaveBeenCalledTimes(3)
      expect(result.runs).toHaveLength(3)
      expect(
        result.runs.every((row) =>
          row.failure?.includes('artifact-unavailable')
        )
      ).toBe(true)
      expect(result.runs.every((row) => row.retry === 0)).toBe(true)
    } finally {
      await rm(source, { recursive: true, force: true })
      await rm(
        path.join(
          REPOSITORY_ROOT,
          'project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance/implementation/evidence/test-continuity-failure'
        ),
        { recursive: true, force: true }
      )
      await rm(
        path.join(
          REPOSITORY_ROOT,
          'test-results/bl-015/test-continuity-failure'
        ),
        {
          recursive: true,
          force: true,
        }
      )
    }
  })
})
