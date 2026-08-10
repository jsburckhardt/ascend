import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'
import {
  WORKBENCH_PRESENTATION_COMPARISON,
  validateComparisonRecord,
} from '../workbench-presentation-contract.js'
import { materializeSelectedPresentationDecision } from '../workbench-presentation-adr.js'

const comparison = validateComparisonRecord(
  JSON.parse(await readFile(WORKBENCH_PRESENTATION_COMPARISON, 'utf8'))
)
const result = await materializeSelectedPresentationDecision({
  comparison,
  architectureDirectory: path.join(REPOSITORY_ROOT, 'project/architecture/ADR'),
  decisionLogPath: path.join(
    REPOSITORY_ROOT,
    'project/architecture/ADR/DECISION-LOG.md'
  ),
  templatePath: path.join(
    REPOSITORY_ROOT,
    'project/architecture/ADR/ADR-260101-template.md'
  ),
  utcDate: '260810',
})
process.stdout.write(
  JSON.stringify({
    status: 'ok',
    disposition: comparison.disposition,
    ...result,
  }) + '\n'
)
