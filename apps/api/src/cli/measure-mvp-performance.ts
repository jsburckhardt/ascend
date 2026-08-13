import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  runIntegratedCapacitySection,
  type IntegratedCapacityRecord,
} from '../mvp-performance-capacity.js'
import {
  runMvpContinuitySection,
  type ContinuitySectionRecord,
} from '../mvp-performance-continuity.js'
import {
  MVP_OVERALL_TIMEOUT_MS,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  createMvpPlan,
  type MvpPlan,
  type MvpSummary,
} from '../mvp-performance-contract.js'
import {
  readMvpAttempts,
  summarizeMvpPerformance,
  writeMvpPlan,
} from '../mvp-performance-evidence.js'
import {
  acquireMvpPerformanceGuard,
  checkMvpPerformancePrerequisites,
  releaseMvpPerformanceGuard,
  type MvpPrerequisiteResult,
} from '../mvp-performance-prerequisites.js'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'

interface Io {
  stdout(value: string): void
  stderr(value: string): void
}
interface Dependencies {
  runId(): string
  nowNs(): bigint
  nowMs(): number
  prerequisites(): Promise<MvpPrerequisiteResult>
  writePlan(plan: MvpPlan): Promise<string>
  acquire(plan: MvpPlan): Promise<unknown>
  release(runId: string): Promise<void>
  browser(
    runId: string,
    timeoutMs: number
  ): Promise<{ code: number | null; stdout: string; stderr: string }>
  continuity(runId: string, planHash: string): Promise<ContinuitySectionRecord>
  capacity(runId: string, planHash: string): Promise<IntegratedCapacityRecord>
  attempts(runId: string): ReturnType<typeof readMvpAttempts>
  summarize: typeof summarizeMvpPerformance
}
const ioDefault: Io = {
  stdout: (value) => process.stdout.write(value + '\n'),
  stderr: (value) => process.stderr.write(value + '\n'),
}
const runBrowser = async (
  runId: string,
  timeoutMs: number
): Promise<{ code: number | null; stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        'tests/e2e/mvp-performance.spec.ts',
        '--project=chromium',
        '--workers=1',
        '--retries=0',
      ],
      {
        cwd: REPOSITORY_ROOT,
        env: {
          ...process.env,
          EXTENSIONS_GALLERY: '{}',
          BL015_DESIGNATED: '1',
          BL015_RUN_ID: runId,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    let stdout = '',
      stderr = '',
      timedOut = false
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (value: string) => {
      stdout = (stdout + value).slice(-32768)
    })
    child.stderr.on('data', (value: string) => {
      stderr = (stderr + value).slice(-32768)
    })
    const timer = setTimeout(() => {
      timedOut = true
      if (child.pid) process.kill(child.pid, 'SIGTERM')
    }, timeoutMs)
    child.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      resolve({ code: timedOut ? 124 : code, stdout, stderr })
    })
  })
const defaults: Dependencies = {
  runId: randomUUID,
  nowNs: () => process.hrtime.bigint(),
  nowMs: () => Date.now(),
  prerequisites: checkMvpPerformancePrerequisites,
  writePlan: writeMvpPlan,
  acquire: acquireMvpPerformanceGuard,
  release: releaseMvpPerformanceGuard,
  browser: runBrowser,
  continuity: runMvpContinuitySection,
  capacity: runIntegratedCapacitySection,
  attempts: readMvpAttempts,
  summarize: summarizeMvpPerformance,
}
const approvalArgument = async (): Promise<MvpSummary['approval']> => {
  const index = process.argv.indexOf('--approval')
  if (index < 0) return null
  const target = process.argv[index + 1]
  if (!target) throw new Error('approval-path-required')
  return JSON.parse(
    await readFile(path.resolve(target), 'utf8')
  ) as NonNullable<MvpSummary['approval']>
}
export const runMvpPerformanceCli = async (
  io: Io = ioDefault,
  overrides: Partial<Dependencies> = {},
  approvalOverride?: MvpSummary['approval']
): Promise<number> => {
  const deps = { ...defaults, ...overrides }
  const runId = deps.runId()
  const started = deps.nowMs()
  const plan = createMvpPlan(runId, new Date().toISOString(), deps.nowNs())
  const root = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
  let guarded = false
  let stage = 'plan'
  let result = 1
  await deps.writePlan(plan)
  try {
    await deps.acquire(plan)
    guarded = true
    stage = 'prerequisites'
    const prerequisites = await deps.prerequisites()
    await writeFile(
      path.join(root, 'prerequisites.json'),
      JSON.stringify(prerequisites, null, 2) + '\n'
    )
    if (!prerequisites.passed) {
      await writeFile(
        path.join(root, 'run-status.json'),
        JSON.stringify(
          {
            schemaVersion: 1,
            runId,
            status: 'prerequisite-failed',
            stage,
            failure: prerequisites.failure,
            attempts: 0,
          },
          null,
          2
        ) + '\n'
      )
      io.stderr(
        JSON.stringify({
          command: 'measure-mvp-performance',
          status: 'prerequisite-failed',
          runId,
          failure: prerequisites.failure,
          attempts: 0,
        })
      )
      return 2
    }
    const remaining = () =>
      Math.max(1, MVP_OVERALL_TIMEOUT_MS - (deps.nowMs() - started))
    stage = 'cold-warm'
    const browser = await deps.browser(runId, remaining())
    if (browser.code !== 0)
      throw new Error(
        'cold-warm-controller-nonzero:' +
          String(browser.code) +
          ':' +
          browser.stderr.slice(-1000)
      )
    stage = 'continuity'
    const continuity = await deps.continuity(runId, plan.planHash)
    stage = 'capacity'
    const capacity = await deps.capacity(runId, plan.planHash)
    stage = 'summary'
    const attempts = await deps.attempts(runId)
    const approval =
      approvalOverride === undefined
        ? await approvalArgument()
        : approvalOverride
    const summary = await deps.summarize({
      plan,
      attempts,
      continuity,
      capacity,
      approval,
    })
    stage = 'complete'
    await writeFile(
      path.join(root, 'run-status.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          runId,
          status: 'complete',
          stage,
          elapsedMs: deps.nowMs() - started,
          overallBoundMs: MVP_OVERALL_TIMEOUT_MS,
          overallDisposition: summary.overallDisposition,
        },
        null,
        2
      ) + '\n'
    )
    io.stdout(
      JSON.stringify({
        command: 'measure-mvp-performance',
        status: 'ok',
        runId,
        evidence: path.relative(REPOSITORY_ROOT, root),
        summary,
      })
    )
    result = 0
  } catch (error) {
    await mkdir(root, { recursive: true })
    await writeFile(
      path.join(root, 'run-status.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          runId,
          status: 'failed',
          stage,
          elapsedMs: deps.nowMs() - started,
          overallBoundMs: MVP_OVERALL_TIMEOUT_MS,
          failure: error instanceof Error ? error.message : 'unknown',
          partialEvidenceRetained: true,
        },
        null,
        2
      ) + '\n'
    )
    io.stderr(
      JSON.stringify({
        command: 'measure-mvp-performance',
        status: 'failed',
        runId,
        stage,
        error: error instanceof Error ? error.message : 'unknown',
        partialEvidenceRetained: true,
      })
    )
    result = 1
  } finally {
    if (guarded)
      try {
        await deps.release(runId)
      } catch (error) {
        io.stderr(
          JSON.stringify({
            command: 'measure-mvp-performance',
            status: 'guard-release-failed',
            runId,
            error: String(error),
          })
        )
        result = 1
      }
  }
  return result
}
if (
  process.argv[1] &&
  import.meta.url === new URL('file:' + process.argv[1]).href
)
  process.exitCode = await runMvpPerformanceCli()
