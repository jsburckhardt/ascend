import { spawn } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MVP_CONTINUITY_RUNS,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_RESULT_ROOT,
  digestMvpPerformance,
} from './mvp-performance-contract.js'
import { validateSessionSwitchingEvidence } from './session-switching-contract.js'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

export interface ContinuityRunRecord {
  ordinal: number
  attemptId: string
  retry: 0
  sourceExecutionId: string | null
  passed: boolean
  failure: string | null
  publicDigest: string | null
  restrictedDigest: string | null
  stateCrossingOrLoss: boolean
  cleanupPassed: boolean
}
export interface ContinuitySectionRecord {
  schemaVersion: 1
  runId: string
  planHash: string
  exactController: 'tests/e2e/session-switching.spec.ts'
  count: 3
  runs: ContinuityRunRecord[]
}
interface ExecuteResult {
  code: number | null
  stdout: string
  stderr: string
}
const executeExact = async (): Promise<ExecuteResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        'tests/e2e/session-switching.spec.ts',
        '--project=chromium',
        '--workers=1',
        '--retries=0',
      ],
      {
        cwd: REPOSITORY_ROOT,
        env: {
          ...process.env,
          EXTENSIONS_GALLERY: '{}',
          BL014_DESIGNATED: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    let stdout = '',
      stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (value: string) => {
      stdout = (stdout + value).slice(-32768)
    })
    child.stderr.on('data', (value: string) => {
      stderr = (stderr + value).slice(-32768)
    })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code, stdout, stderr }))
  })
export const runMvpContinuitySection = async (
  runId: string,
  planHash: string,
  overrides: {
    execute?: () => Promise<ExecuteResult>
    sourceRoot?: string
  } = {}
): Promise<ContinuitySectionRecord> => {
  const execute = overrides.execute ?? executeExact
  const sourceRoot =
    overrides.sourceRoot ??
    path.join(REPOSITORY_ROOT, 'test-results/bl-014/session-switching')
  const publicTarget = path.join(
    MVP_PERFORMANCE_EVIDENCE_ROOT,
    runId,
    'continuity'
  )
  const restrictedTarget = path.join(
    MVP_PERFORMANCE_RESULT_ROOT,
    runId,
    'continuity'
  )
  await mkdir(publicTarget, { recursive: true })
  await mkdir(restrictedTarget, { recursive: true })
  const runs: ContinuityRunRecord[] = []
  for (let ordinal = 1; ordinal <= MVP_CONTINUITY_RUNS; ordinal += 1) {
    const executed = await execute()
    let publicValue: Record<string, unknown> | null = null
    let restrictedValue: Record<string, unknown> | null = null
    let failure: string | null = null
    try {
      publicValue = JSON.parse(
        await readFile(path.join(sourceRoot, 'switching-browser.json'), 'utf8')
      ) as Record<string, unknown>
      restrictedValue = JSON.parse(
        await readFile(
          path.join(sourceRoot, 'restricted-authority.json'),
          'utf8'
        )
      ) as Record<string, unknown>
    } catch (error) {
      failure =
        'continuity-artifact-unavailable:' +
        (error instanceof Error ? error.message : 'unknown')
    }
    const valid =
      executed.code === 0 &&
      publicValue !== null &&
      restrictedValue !== null &&
      validateSessionSwitchingEvidence(publicValue, restrictedValue)
    if (!valid && !failure)
      failure =
        executed.code === 0
          ? 'continuity-evidence-invalid'
          : 'continuity-controller-nonzero:' + String(executed.code)
    const publicDigest = publicValue ? digestMvpPerformance(publicValue) : null,
      restrictedDigest = restrictedValue
        ? digestMvpPerformance(restrictedValue)
        : null
    if (publicValue)
      await writeFile(
        path.join(publicTarget, 'run-' + ordinal + '.json'),
        JSON.stringify(publicValue, null, 2) + '\n'
      )
    if (restrictedValue) {
      const target = path.join(
        restrictedTarget,
        'run-' + ordinal + '-restricted.json'
      )
      await writeFile(target, JSON.stringify(restrictedValue, null, 2) + '\n', {
        mode: 0o600,
      })
      await chmod(target, 0o600)
    }
    const execution = publicValue?.execution as { id?: string } | undefined
    const cleanup = publicValue?.cleanup as
      | {
          resources?: Array<{ after?: number }>
          projects?: Array<{ residuals?: number }>
        }
      | undefined
    const cleanupPassed = Boolean(
      cleanup?.resources?.every((row) => row.after === 0) &&
      cleanup.projects?.every((row) => row.residuals === 0)
    )
    runs.push({
      ordinal,
      attemptId: 'continuity-' + ordinal,
      retry: 0,
      sourceExecutionId: execution?.id ?? null,
      passed: valid && cleanupPassed,
      failure,
      publicDigest,
      restrictedDigest,
      stateCrossingOrLoss: !valid,
      cleanupPassed,
    })
  }
  const section: ContinuitySectionRecord = {
    schemaVersion: 1,
    runId,
    planHash,
    exactController: 'tests/e2e/session-switching.spec.ts',
    count: 3,
    runs,
  }
  await writeFile(
    path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'continuity.json'),
    JSON.stringify(section, null, 2) + '\n'
  )
  return section
}
