import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
const decisionId = (date: string, candidate: string): string =>
  'ADR-' + date + '-' + candidate + '-browser-workbench-presentation'
const evidenceReference =
  '../../work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/comparison.json'

const selectionReason = (comparison: PresentationComparisonRecord): string => {
  const selected = comparison.selectedCandidate!
  const rejected = selected === 'embedded' ? 'full-page' : 'embedded'
  if (!comparison.candidates[rejected].eligible)
    return selected + ' was the only eligible candidate.'
  const measures = [
    ['blocking browser protocol violations', 'blockingCount'],
    ['non-blocking warning occurrences', 'nonBlockingCount'],
    ['median elapsed milliseconds', 'medianElapsedMs'],
  ] as const
  for (const [label, key] of measures) {
    const selectedValue = comparison.candidates[selected][key]
    const rejectedValue = comparison.candidates[rejected][key]
    if (selectedValue !== rejectedValue)
      return (
        'The ordered selector chose it at the first strict tie-breaker: fewer ' +
        label +
        ' (' +
        String(selectedValue) +
        ' versus ' +
        String(rejectedValue) +
        ').'
      )
  }
  throw new Error('Selected comparison has no decisive eligibility or measure')
}

const adrContent = (
  comparison: PresentationComparisonRecord,
  id: string
): string => {
  const selected = comparison.selectedCandidate!
  const rejected = selected === 'embedded' ? 'full-page' : 'embedded'
  const selectedEvidence = comparison.candidates[selected]
  return [
    '# ' + id + ': Select the ' + selected + ' Browser Workbench Presentation',
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
      '. Embedded eligibility was ' +
      String(comparison.candidates.embedded.eligible) +
      ' and full-page eligibility was ' +
      String(comparison.candidates['full-page'].eligible) +
      '. Embedded retained ' +
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
      ' code-server with a minimal Ascend header as the browser workbench presentation for authoritative desktop Chromium workflows. ' +
      selectionReason(comparison) +
      ' Reject ' +
      rejected +
      ' for this decision.',
    '',
    'This decision selects presentation only. Project Home, stable routing or proxy integration, runtime management, lifecycle UI, polished UI, and tablet acceptance remain outside BL-003. Tablet validation is a separate non-authoritative follow-up.',
    '',
    '## Alternatives',
    '',
    '| Alternative | Pros | Cons | Why Rejected |',
    '|-------------|------|------|--------------|',
    '| Embedded code-server in an Ascend surface | Keeps Ascend chrome continuously visible | Requires frame-policy handling | ' +
      (selected === 'embedded'
        ? 'Selected by retained evidence'
        : 'Rejected by retained evidence') +
      ' |',
    '| Full-page code-server with a minimal Ascend header | Preserves top-level workbench behavior | Requires later product navigation and lifecycle integration | ' +
      (selected === 'full-page'
        ? 'Selected by retained evidence'
        : 'Rejected by retained evidence') +
      ' |',
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
  const id = decisionId(options.utcDate, comparison.selectedCandidate)
  const target = path.join(options.architectureDirectory, id + '.md')
  const template = await readFile(options.templatePath, 'utf8')
  const content = adrContent(comparison, id)
  const templateHeadings = template.match(/^## .+$/gmu) ?? []
  if (!templateHeadings.every((heading) => content.includes(heading)))
    throw new Error('Materialized ADR does not preserve the template sections')
  await mkdir(options.architectureDirectory, { recursive: true })
  const rejected =
    comparison.selectedCandidate === 'embedded' ? 'full-page' : 'embedded'
  const staleId = decisionId(options.utcDate, rejected)
  const staleTarget = path.join(options.architectureDirectory, staleId + '.md')
  if (await exists(staleTarget)) {
    const stale = await readFile(staleTarget, 'utf8')
    if (!stale.includes(comparison.comparisonId))
      throw new Error(
        'Existing BL-003 ADR conflicts with the frozen comparison'
      )
    await rm(staleTarget)
  }
  const created = !(await exists(target))
  if (!created) {
    const existing = await readFile(target, 'utf8')
    if (
      !existing.includes(comparison.comparisonId) ||
      !existing.includes('Use ' + comparison.selectedCandidate)
    )
      throw new Error(
        'Existing BL-003 ADR conflicts with the frozen comparison'
      )
  }
  await writeFile(target, content)
  let log = await readFile(options.decisionLogPath, 'utf8')
  log =
    log
      .split('\n')
      .filter(
        (line) =>
          !line.includes(
            'ADR-' +
              options.utcDate +
              '-embedded-browser-workbench-presentation'
          ) &&
          !line.includes(
            'ADR-' +
              options.utcDate +
              '-full-page-browser-workbench-presentation'
          ) &&
          !/^\| (43|44|45) \|/u.test(line)
      )
      .join('\n')
      .trimEnd() + '\n'
  const selectedLabel =
    comparison.selectedCandidate === 'full-page' ? 'Full-Page' : 'Embedded'
  const date =
    '20' +
    options.utcDate.slice(0, 2) +
    '-' +
    options.utcDate.slice(2, 4) +
    '-' +
    options.utcDate.slice(4, 6)
  const adrRow =
    '| ' +
    id +
    ' | Select the ' +
    selectedLabel +
    ' Browser Workbench Presentation | Accepted | ' +
    date +
    ' |'
  const section = '\n\n## Core-Components'
  log = log.replace(section, '\n' + adrRow + section)
  const decisions = [
    '| 43 | Use ' +
      comparison.selectedCandidate +
      ' code-server with a minimal Ascend header for authoritative desktop Chromium workbench presentation | ' +
      id +
      ' | ' +
      date +
      ' |',
    '| 44 | Reject ' +
      rejected +
      ' code-server presentation based on the retained ordered selection evidence | ' +
      id +
      ' | ' +
      date +
      ' |',
    '| 45 | Keep tablet validation non-authoritative and defer product routing and lifecycle integration | ' +
      id +
      ' | ' +
      date +
      ' |',
  ]
  for (const decision of decisions) log = log.trimEnd() + '\n' + decision + '\n'
  await writeFile(options.decisionLogPath, log)
  return { created, path: target }
}
