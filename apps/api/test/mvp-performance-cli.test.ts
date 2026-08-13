import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runMvpPerformanceCli } from '../src/cli/measure-mvp-performance.js'
import { MVP_PERFORMANCE_EVIDENCE_ROOT } from '../src/mvp-performance-contract.js'
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
  it('owns one serial section order, one overall bound, partial retention, and no approval creation', async () => {
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'apps/api/src/cli/measure-mvp-performance.ts'),
      'utf8'
    )
    const positions = [
      "stage='cold-warm'",
      "stage='continuity'",
      "stage='capacity'",
      "stage='summary'",
    ].map((value) => source.replace(/\s/gu, '').indexOf(value))
    expect(positions.every((value) => value >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(source).toContain('MVP_OVERALL_TIMEOUT_MS')
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
