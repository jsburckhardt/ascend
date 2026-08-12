import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { auditProjectRuntimeIsolation } from '../project-runtime-isolation-audit.js'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'

const result = await auditProjectRuntimeIsolation()
const target = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-013/runtime-isolation/residual-audit.json'
)
await mkdir(path.dirname(target), { recursive: true })
await writeFile(target, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
process.stdout.write(JSON.stringify(result) + '\n')
if (result.status !== 'pass') process.exitCode = 1
