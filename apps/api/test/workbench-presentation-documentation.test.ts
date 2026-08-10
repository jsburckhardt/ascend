import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'
import {
  WORKBENCH_PRESENTATION_COMPARISON,
  validateAttemptRecord,
  validateComparisonRecord,
} from '../src/workbench-presentation-contract.js'
import { selectPresentation } from '../src/workbench-presentation-selector.js'

describe('BL-003 retained evidence and documentation consistency', () => {
  it('validates six retained attempts and recomputes the frozen selection', async () => {
    const comparison = validateComparisonRecord(
      JSON.parse(await readFile(WORKBENCH_PRESENTATION_COMPARISON, 'utf8'))
    )
    expect(comparison.slots).toHaveLength(6)
    expect(
      comparison.slots.every(
        (slot) => slot.status === 'started' && Boolean(slot.runId)
      )
    ).toBe(true)
    const attempts = await Promise.all(
      comparison.slots.map(async (slot) => {
        const record = validateAttemptRecord(
          JSON.parse(
            await readFile(
              path.join(REPOSITORY_ROOT, slot.recordReference!),
              'utf8'
            )
          )
        )
        await expect(
          readFile(
            path.join(REPOSITORY_ROOT, record.evidence.rawBrowserEvents),
            'utf8'
          )
        ).resolves.toContain(record.runId)
        for (const reference of Object.values(record.evidence))
          await expect(
            readFile(path.join(REPOSITORY_ROOT, reference), 'utf8')
          ).resolves.not.toHaveLength(0)
        return record
      })
    )
    expect(attempts.every((attempt) => attempt.finalStatus === 'passed')).toBe(
      true
    )
    expect(selectPresentation(attempts)).toMatchObject({
      disposition: comparison.disposition,
      selectedCandidate: comparison.selectedCandidate,
      candidates: comparison.candidates,
    })
  })

  it('keeps README, runbook, harness discovery, Accepted ADR, and decision log aligned with the comparison', async () => {
    const comparison = validateComparisonRecord(
      JSON.parse(await readFile(WORKBENCH_PRESENTATION_COMPARISON, 'utf8'))
    )
    const files = await Promise.all(
      [
        'README.md',
        'docs/README.md',
        'docs/workbench-proof.md',
        '.harness/engineering-harness.md',
        'project/architecture/ADR/ADR-260810-' +
          comparison.selectedCandidate +
          '-browser-workbench-presentation.md',
        'project/architecture/ADR/DECISION-LOG.md',
      ].map((name) => readFile(path.join(REPOSITORY_ROOT, name), 'utf8'))
    )
    const joined = files.join('\n')
    expect(joined).toContain(comparison.disposition)
    expect(joined).toContain(
      String(comparison.candidates.embedded.blockingCount) + ' blocking'
    )
    expect(joined).toContain(
      String(comparison.candidates['full-page'].blockingCount) + ' blocking'
    )
    expect(joined).toContain(comparison.comparisonId)
    expect(joined).toContain('1440 by 900')
    expect(joined).toContain('fresh')
    expect(joined).toContain('no-retry')
    expect(joined).toContain('selection tie')
    expect(joined).toContain('no viable candidate')
    expect(joined).toContain('authoritative desktop')
    expect(joined).toContain('non-authoritative')
    expect(joined).toContain('Project Home')
  })
})
