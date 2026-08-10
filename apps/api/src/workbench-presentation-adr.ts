import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  validateComparisonRecord,
  type PresentationComparisonRecord,
} from './workbench-presentation-contract.js'

export interface MaterializeDecisionOptions {
  comparison: PresentationComparisonRecord
  architectureDirectory: string
  decisionLogPath: string
  templatePath: string
  utcDate: string
}
const exists = async (target: string): Promise<boolean> => {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}
const decisionId = (date: string): string =>
  'ADR-' + date + '-full-page-browser-workbench-presentation'
const evidenceReference =
  '../../work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/comparison.json'

const adrContent = (
  comparison: PresentationComparisonRecord,
  id: string
): string => {
  const selected = comparison.selectedCandidate!
  const rejected = selected === 'embedded' ? 'full-page' : 'embedded'
  const selectedEvidence = comparison.candidates[selected]
  const rejectedEvidence = comparison.candidates[rejected]
  return [
    '# ' + id + ': Select the Full-Page Browser Workbench Presentation',
    '',
    '## Status',
    '',
    'Accepted',
    '',
    '## Context',
    '',
    'BL-003 compared exactly two proof-only presentations on the authoritative Ubuntu 24.04 desktop Chromium host: code-server embedded in a minimal Ascend surface and top-level full-page code-server with a minimal Ascend header. Both candidates ran the same three fresh no-retry attempts, 1440 by 900 viewport, BL-001 fixture, code-server 4.131.0 configuration, browser observers, fixed Explorer/Preview/keyboard/clipboard scenario, BL-002 terminal parity, integrity checks, and exact cleanup.',
    '',
    'The retained comparison is ' +
      comparison.comparisonId +
      ' at ' +
      evidenceReference +
      '. Both candidates were eligible. Embedded retained ' +
      String(comparison.candidates.embedded.blockingCount) +
      ' blocking and ' +
      String(comparison.candidates.embedded.nonBlockingCount) +
      ' non-blocking occurrences with median ' +
      String(comparison.candidates.embedded.medianElapsedMs) +
      ' ms. Full-page retained ' +
      String(comparison.candidates['full-page'].blockingCount) +
      ' blocking and ' +
      String(comparison.candidates['full-page'].nonBlockingCount) +
      ' non-blocking occurrences with median ' +
      String(comparison.candidates['full-page'].medianElapsedMs) +
      ' ms.',
    '',
    '## Decision',
    '',
    'Use ' +
      selected +
      ' code-server with a minimal Ascend header as the browser workbench presentation for authoritative desktop Chromium workflows. The ordered selector chose it at the first strict tie-breaker: fewer retained blocking browser protocol violations (' +
      String(selectedEvidence.blockingCount) +
      ' versus ' +
      String(rejectedEvidence.blockingCount) +
      '). Reject ' +
      rejected +
      ' for this decision.',
    '',
    'This decision selects presentation only. Project Home, stable routing or proxy integration, runtime management, lifecycle UI, polished UI, and tablet acceptance remain outside BL-003. Tablet validation is a separate non-authoritative follow-up.',
    '',
    '## Alternatives',
    '',
    '| Alternative | Pros | Cons | Why Rejected |',
    '|-------------|------|------|--------------|',
    '| Embedded code-server in an Ascend surface | Keeps Ascend chrome continuously visible | Retained more blocking browser protocol violations in the fixed desktop comparison | Lost the first ordered tie-breaker |',
    '| Full-page code-server with a minimal Ascend header | Preserves top-level workbench behavior and passed all three attempts | Requires later product navigation and lifecycle integration | Selected by retained evidence |',
    '',
    '## Consequences',
    '',
    '### Positive',
    '- Desktop presentation work can proceed from retained browser and parity evidence.',
    '- code-server remains responsible for Explorer, Preview, terminal, and editing behavior.',
    '',
    '### Negative',
    '- Later work must design product routing, navigation, and lifecycle integration without changing this proof result.',
    '- The selected candidate retained ' +
      String(selectedEvidence.nonBlockingCount) +
      ' non-blocking warning occurrences that remain visible evidence.',
    '',
    '### Neutral',
    '- Tablet behavior remains separate and non-authoritative.',
    '',
    '## Related Issues',
    '',
    '- [#9](https://github.com/jsburckhardt/ascend/issues/9)',
    '',
    '## References',
    '',
    '- [Retained BL-003 comparison](' + evidenceReference + ')',
    '- [Workbench proof runbook](../../../docs/workbench-proof.md)',
    '',
  ].join('\n')
}

export const materializeSelectedPresentationDecision = async (
  options: MaterializeDecisionOptions
): Promise<{ created: boolean; path: string | null }> => {
  const comparison = validateComparisonRecord(options.comparison)
  if (!comparison.selectedCandidate) return { created: false, path: null }
  const id = decisionId(options.utcDate)
  const target = path.join(options.architectureDirectory, id + '.md')
  const template = await readFile(options.templatePath, 'utf8')
  const content = adrContent(comparison, id)
  const templateHeadings = template.match(/^## .+$/gmu) ?? []
  if (!templateHeadings.every((heading) => content.includes(heading)))
    throw new Error('Materialized ADR does not preserve the template sections')
  if (await exists(target)) {
    const existing = await readFile(target, 'utf8')
    if (
      existing.includes(comparison.comparisonId) &&
      existing.includes('Use ' + comparison.selectedCandidate)
    )
      return { created: false, path: target }
    throw new Error('Existing BL-003 ADR conflicts with the frozen comparison')
  }
  await mkdir(options.architectureDirectory, { recursive: true })
  await writeFile(target, content)
  let log = await readFile(options.decisionLogPath, 'utf8')
  const adrRow =
    '| ' +
    id +
    ' | Select the Full-Page Browser Workbench Presentation | Accepted | 2026-08-10 |'
  if (!log.includes('| ' + id + ' |')) {
    const section = '\n\n## Core-Components'
    log = log.replace(section, '\n' + adrRow + section)
  }
  const decisions = [
    '| 43 | Use full-page code-server with a minimal Ascend header for authoritative desktop Chromium workbench presentation | ' +
      id +
      ' | 2026-08-10 |',
    '| 44 | Reject embedded code-server presentation because it retained more blocking browser protocol violations | ' +
      id +
      ' | 2026-08-10 |',
    '| 45 | Keep tablet validation non-authoritative and defer product routing and lifecycle integration | ' +
      id +
      ' | 2026-08-10 |',
  ]
  for (const decision of decisions)
    if (!log.includes(decision)) log = log.trimEnd() + '\n' + decision + '\n'
  await writeFile(options.decisionLogPath, log)
  return { created: true, path: target }
}
