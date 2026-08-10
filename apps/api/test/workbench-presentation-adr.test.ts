import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { materializeSelectedPresentationDecision } from '../src/workbench-presentation-adr.js'
import {
  PRESENTATION_PREREQUISITES,
  PRESENTATION_SLOTS,
  PRESENTATION_VIEWPORT,
  type PresentationComparisonRecord,
} from '../src/workbench-presentation-contract.js'

const comparison = (
  disposition: PresentationComparisonRecord['disposition'] = 'full-page selected'
): PresentationComparisonRecord => {
  const selectedCandidate =
    disposition === 'embedded selected'
      ? 'embedded'
      : disposition === 'full-page selected'
        ? 'full-page'
        : null
  const eligible = disposition === 'selection tie'
  return {
    version: 1,
    comparisonId: randomUUID(),
    prerequisites: PRESENTATION_PREREQUISITES.map((name) => ({
      name,
      passed: true,
      detail: 'passed',
    })),
    host: {
      ubuntuVersion: 'Ubuntu 24.04.4 LTS',
      hostname: 'host',
      user: 'vscode',
      chromiumName: 'chromium',
      chromiumVersion: '151',
      codeServerVersion: '4.131.0',
      viewport: PRESENTATION_VIEWPORT,
    },
    slots: PRESENTATION_SLOTS.map((slot) => ({
      ...slot,
      status: 'started',
      runId: randomUUID(),
      recordReference: 'attempt.json',
    })),
    candidates: {
      embedded: {
        eligible:
          eligible ||
          selectedCandidate === 'embedded' ||
          selectedCandidate === 'full-page',
        blockingCount: 9,
        nonBlockingCount: 30,
        elapsedMs: eligible || selectedCandidate ? [10, 20, 30] : [],
        medianElapsedMs: eligible || selectedCandidate ? 20 : null,
      },
      'full-page': {
        eligible: eligible || selectedCandidate === 'full-page',
        blockingCount: 6,
        nonBlockingCount: 36,
        elapsedMs:
          eligible || selectedCandidate === 'full-page' ? [20, 30, 40] : [],
        medianElapsedMs:
          eligible || selectedCandidate === 'full-page' ? 30 : null,
      },
    },
    stopReason: null,
    selectedCandidate,
    disposition,
  }
}
const setup = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bl003-adr-'))
  const architectureDirectory = path.join(root, 'ADR')
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(architectureDirectory)
  )
  const templatePath = path.join(
    architectureDirectory,
    'ADR-260101-template.md'
  )
  const decisionLogPath = path.join(architectureDirectory, 'DECISION-LOG.md')
  await writeFile(
    templatePath,
    [
      '# template',
      '## Status',
      '## Context',
      '## Decision',
      '## Alternatives',
      '## Consequences',
      '## Related Issues',
      '## References',
      '',
    ].join('\n')
  )
  await writeFile(
    decisionLogPath,
    '# Decision Log\n\n## ADRs\n\n## Core-Components\n\n## Decisions\n'
  )
  return { architectureDirectory, templatePath, decisionLogPath }
}

describe('BL-003 conditional ADR materialization', () => {
  it('creates one Accepted template-shaped ADR and actionable decision-log entries idempotently', async () => {
    const paths = await setup()
    const selected = comparison()
    const first = await materializeSelectedPresentationDecision({
      ...paths,
      comparison: selected,
      utcDate: '260810',
    })
    const second = await materializeSelectedPresentationDecision({
      ...paths,
      comparison: selected,
      utcDate: '260810',
    })
    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(first.path).toBe(second.path)
    const content = await readFile(first.path!, 'utf8')
    for (const heading of [
      '## Status',
      '## Context',
      '## Decision',
      '## Alternatives',
      '## Consequences',
      '## Related Issues',
      '## References',
    ])
      expect(content).toContain(heading)
    expect(content).toContain('Accepted')
    expect(content).toContain(selected.comparisonId)
    expect(content).toContain('authoritative')
    expect(content).toContain('non-authoritative')
    expect(content).toContain('Use full-page')
    expect(content).toContain('Reject embedded')
    const log = await readFile(paths.decisionLogPath, 'utf8')
    expect(
      log.match(/ADR-260810-full-page-browser-workbench-presentation/gu)
    ).toHaveLength(4)
    expect(log).toContain('Use full-page')
    expect(log).toContain('Reject embedded')
  })

  it.each(['selection tie', 'no viable candidate'] as const)(
    'creates no Accepted ADR or log selection for %s',
    async (disposition) => {
      const paths = await setup()
      expect(
        await materializeSelectedPresentationDecision({
          ...paths,
          comparison: comparison(disposition),
          utcDate: '260810',
        })
      ).toEqual({ created: false, path: null })
      expect(await readdir(paths.architectureDirectory)).toEqual([
        'ADR-260101-template.md',
        'DECISION-LOG.md',
      ])
      expect(await readFile(paths.decisionLogPath, 'utf8')).not.toContain(
        'Use full-page'
      )
    }
  )

  it('fails instead of overwriting a conflicting same-day ADR', async () => {
    const paths = await setup()
    await writeFile(
      path.join(
        paths.architectureDirectory,
        'ADR-260810-full-page-browser-workbench-presentation.md'
      ),
      'conflict'
    )
    await expect(
      materializeSelectedPresentationDecision({
        ...paths,
        comparison: comparison(),
        utcDate: '260810',
      })
    ).rejects.toThrow('conflicts')
  })
})
