import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, realpath, rm, stat } from 'node:fs/promises'
import os from 'node:os'
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
  MVP_OVERALL_TOLERANCE_MS,
  MVP_SECTION_TIMEOUTS_MS,
  digestMvpPerformance,
  type MvpHostIdentity,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_RESULT_ROOT,
  createMvpPlan,
  type MvpPlan,
  type MvpSummary,
} from '../mvp-performance-contract.js'
import {
  atomicWriteMvpJson,
  finalizeInterruptedMvpAttemptJournal,
  finalizeMvpAttemptJournal,
  readMvpAttempts,
  recoverMvpAttemptJournal,
  summarizeMvpPerformance,
  writeMvpPlan,
} from '../mvp-performance-evidence.js'
import {
  acquireMvpPerformanceGuard,
  checkMvpPerformancePrerequisites,
  clearStaleMvpPerformanceGuard,
  inspectMvpPerformanceGuard,
  readMvpDesignatedHostIdentity,
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
  hostIdentity(): Promise<MvpHostIdentity>
  writePlan(plan: MvpPlan): Promise<string>
  acquire(plan: MvpPlan): Promise<unknown>
  release(runId: string): Promise<void>
  browser(
    runId: string,
    timeoutMs: number
  ): Promise<{ code: number | null; stdout: string; stderr: string }>
  continuity(
    runId: string,
    planHash: string,
    signal?: AbortSignal
  ): Promise<ContinuitySectionRecord>
  capacity(
    runId: string,
    planHash: string,
    signal?: AbortSignal
  ): Promise<IntegratedCapacityRecord>
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
        detached: true,
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
      if (child.pid) {
        process.kill(-child.pid, 'SIGTERM')
        setTimeout(() => {
          if (child.pid && child.exitCode === null)
            process.kill(-child.pid, 'SIGKILL')
        }, 5_000).unref()
      }
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
  hostIdentity: readMvpDesignatedHostIdentity,
  writePlan: writeMvpPlan,
  acquire: acquireMvpPerformanceGuard,
  release: releaseMvpPerformanceGuard,
  browser: runBrowser,
  continuity: (runId, planHash, signal) =>
    runMvpContinuitySection(runId, planHash, { signal }),
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
interface MvpSectionExecution {
  name: string
  boundMs: number
  startedElapsedMs: number
  endedElapsedMs: number | null
  status: 'in-progress' | 'complete' | 'failed' | 'timed-out'
  partialEvidenceRetained: boolean
}
const readJson = async <T>(target: string): Promise<T> =>
  JSON.parse(await readFile(target, 'utf8')) as T
const scanMvpRunProcesses = async (runId: string): Promise<number[]> => {
  const matches: number[] = []
  const ownUid = process.getuid?.()
  for (const entry of await readdir('/proc', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[0-9]+$/u.test(entry.name)) continue
    const processRoot = path.join('/proc', entry.name)
    try {
      const status = await readFile(path.join(processRoot, 'status'), 'utf8')
      const uid = Number(status.match(/^Uid:\s+([0-9]+)/mu)?.[1])
      if (ownUid !== undefined && uid !== ownUid) continue
      const environment = await readFile(path.join(processRoot, 'environ'))
      if (
        environment
          .toString('utf8')
          .split('\0')
          .includes('BL015_RUN_ID=' + runId)
      )
        matches.push(Number(entry.name))
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'EACCES' && code !== 'EPERM')
        throw error
    }
  }
  return matches.sort((a, b) => a - b)
}
export const recoverInterruptedMvpPerformance = async (
  runId: string,
  fixtureRootOverride: string | null,
  io: Io = ioDefault
): Promise<number> => {
  if (!/^[0-9a-f-]{36}$/u.test(runId))
    throw new Error('interrupted-run-id-invalid')
  const guard = await inspectMvpPerformanceGuard()
  if (guard.state !== 'stale' || guard.record?.runId !== runId)
    throw new Error('interrupted-run-stale-guard-required')
  const publicRoot = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
  const restrictedRoot = path.join(MVP_PERFORMANCE_RESULT_ROOT, runId)
  const plan = await readJson<MvpPlan>(path.join(publicRoot, 'plan.json'))
  if (plan.planHash !== guard.record.planHash)
    throw new Error('interrupted-run-plan-guard-mismatch')
  const ownership = await readJson<{ fixtureRoot?: string }>(
    path.join(restrictedRoot, 'recovery-ownership.json')
  ).catch((error) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  })
  const fixtureRoot = fixtureRootOverride ?? ownership?.fixtureRoot
  if (!fixtureRoot) throw new Error('interrupted-run-fixture-root-required')
  const resolvedFixtureRoot = await realpath(fixtureRoot)
  const expectedPrefix = path.join(os.tmpdir(), 'ascend-bl015-navigation-')
  if (!resolvedFixtureRoot.startsWith(expectedPrefix))
    throw new Error('interrupted-run-fixture-root-invalid')
  const liveBefore = await scanMvpRunProcesses(runId)
  if (liveBefore.length)
    throw new Error('interrupted-run-processes-still-active')
  const recovered = await finalizeInterruptedMvpAttemptJournal(
    runId,
    plan.planHash
  )
  const incompleteAttemptId = String(recovered.inProgress?.attemptId ?? '')
  const invalidArtifacts: Array<{
    file: string
    bytes: number
    digest: string
  }> = []
  if (incompleteAttemptId)
    for (const suffix of ['.png', '.zip']) {
      const target = path.join(restrictedRoot, incompleteAttemptId + suffix)
      try {
        const metadata = await stat(target)
        const content = await readFile(target)
        invalidArtifacts.push({
          file: path.basename(target),
          bytes: metadata.size,
          digest: digestMvpPerformance(content),
        })
        await rm(target)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
    }
  await rm(resolvedFixtureRoot, { recursive: true, force: true })
  const liveAfter = await scanMvpRunProcesses(runId)
  const fixtureRootAbsent = await stat(resolvedFixtureRoot).then(
    () => false,
    (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true
      throw error
    }
  )
  if (liveAfter.length || !fixtureRootAbsent)
    throw new Error('interrupted-run-cleanup-residual')
  const sectionStatus = await readJson<{
    sections: Array<Record<string, unknown>>
    [key: string]: unknown
  }>(path.join(publicRoot, 'section-status.json'))
  sectionStatus.sections = sectionStatus.sections.map((section) =>
    section.status === 'in-progress'
      ? {
          ...section,
          status: 'failed',
          partialEvidenceRetained: true,
          recoveryEndedAt: new Date().toISOString(),
        }
      : section
  )
  await atomicWriteMvpJson(
    path.join(publicRoot, 'section-status.json'),
    sectionStatus
  )
  const priorHostVerification = await readJson<Record<string, unknown>>(
    path.join(publicRoot, 'host-verification.json')
  )
  const recoveryHost = await readMvpDesignatedHostIdentity()
  await atomicWriteMvpJson(path.join(publicRoot, 'host-verification.json'), {
    ...priorHostVerification,
    recoveryEnd: recoveryHost,
    recoveryEndDigest: digestMvpPerformance(recoveryHost),
    recoveryEndMatchesDeclaration:
      JSON.stringify(recoveryHost) === JSON.stringify(plan.designatedHost),
    successfulRunEndUnavailable: true,
  })
  await atomicWriteMvpJson(path.join(publicRoot, 'run-status.json'), {
    schemaVersion: 1,
    runId,
    status: 'failed',
    stage: 'cold-warm',
    failure: 'controller-interrupted-machine-restart',
    overallBoundMs: plan.timeoutsMs.overall,
    overallToleranceMs: plan.timeoutsMs.overallTolerance,
    partialEvidenceRetained: true,
    completedAttemptIds: recovered.attempts.map((attempt) => attempt.attemptId),
    inProgress: recovered.inProgress,
    invalidCheckpoints: recovered.invalidCheckpoints,
    invalidArtifacts,
    fabricatedAttempts: 0,
    resumable: false,
    recoveryDecision: 'retained-partial-new-run-required',
    sections: sectionStatus.sections,
  })
  const cleanupAudit = {
    schemaVersion: 1,
    runId,
    basis: 'stale-exact-owner-run-id-process-scan-and-explicit-fixture-root',
    staleGuardOwnerPid: guard.record.pid,
    liveRunProcessesBefore: liveBefore,
    liveRunProcessesAfter: liveAfter,
    removedFixtureRoot: resolvedFixtureRoot,
    fixtureRootAbsent,
    invalidArtifacts,
    completedAttemptIds: recovered.attempts.map((attempt) => attempt.attemptId),
    invalidCheckpoints: recovered.invalidCheckpoints,
    complete: true,
    residuals: 0,
    guardAbsentAfterClear: false,
  }
  await atomicWriteMvpJson(
    path.join(publicRoot, 'recovery-cleanup-audit.json'),
    cleanupAudit
  )
  await clearStaleMvpPerformanceGuard(cleanupAudit)
  await atomicWriteMvpJson(
    path.join(publicRoot, 'recovery-cleanup-audit.json'),
    { ...cleanupAudit, guardAbsentAfterClear: true }
  )
  io.stdout(
    JSON.stringify({
      command: 'measure-mvp-performance',
      status: 'interrupted-run-retained',
      runId,
      completedAttemptIds: cleanupAudit.completedAttemptIds,
      invalidAttemptId: incompleteAttemptId || null,
      recoveryDecision: 'retained-partial-new-run-required',
    })
  )
  return 0
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
  const sections: MvpSectionExecution[] = []
  let guarded = false
  let stage = 'plan'
  let result = 1
  const elapsed = () => deps.nowMs() - started
  const persistSections = () =>
    atomicWriteMvpJson(path.join(root, 'section-status.json'), {
      schemaVersion: 1,
      runId,
      overallBoundMs: plan.timeoutsMs.overall,
      overallToleranceMs: plan.timeoutsMs.overallTolerance,
      sections,
    })
  const bounded = async <T>(
    name: string,
    boundMs: number,
    operation: (signal: AbortSignal, effectiveBoundMs: number) => Promise<T>,
    reserveFinalization = true
  ): Promise<T> => {
    const remaining =
      plan.timeoutsMs.overall -
      elapsed() -
      (reserveFinalization
        ? plan.timeoutsMs.sections.cleanupAndFinalization
        : 0)
    const effectiveBoundMs = Math.max(1, Math.min(boundMs, remaining))
    const row: MvpSectionExecution = {
      name,
      boundMs,
      startedElapsedMs: elapsed(),
      endedElapsedMs: null,
      status: 'in-progress',
      partialEvidenceRetained: false,
    }
    sections.push(row)
    await persistSections()
    const controller = new AbortController()
    let timer: NodeJS.Timeout | undefined
    try {
      const timeout = new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new Error('section-timeout:' + name)
          controller.abort(error)
          reject(error)
        }, effectiveBoundMs)
      })
      const value = await Promise.race([
        operation(controller.signal, effectiveBoundMs),
        timeout,
      ])
      row.status = 'complete'
      return value
    } catch (error) {
      row.status = controller.signal.aborted ? 'timed-out' : 'failed'
      row.partialEvidenceRetained = true
      throw error
    } finally {
      if (timer) clearTimeout(timer)
      row.endedElapsedMs = elapsed()
      await persistSections()
    }
  }
  await deps.writePlan(plan)
  try {
    await deps.acquire(plan)
    guarded = true
    stage = 'prerequisites'
    const prerequisites = await bounded(
      'prerequisites',
      MVP_SECTION_TIMEOUTS_MS.prerequisites,
      async () => deps.prerequisites()
    )
    await atomicWriteMvpJson(
      path.join(root, 'prerequisites.json'),
      prerequisites
    )
    const startIdentity = prerequisites.hostIdentity
    const startDigest = startIdentity
      ? digestMvpPerformance(startIdentity)
      : null
    await atomicWriteMvpJson(path.join(root, 'host-verification.json'), {
      schemaVersion: 1,
      runId,
      declaration: plan.designatedHost,
      start: startIdentity,
      startDigest,
      startMatchesDeclaration:
        JSON.stringify(startIdentity) === JSON.stringify(plan.designatedHost),
      end: null,
      endDigest: null,
      endMatchesStart: false,
      endMatchesDeclaration: false,
    })
    if (!prerequisites.passed || !startIdentity) {
      await atomicWriteMvpJson(path.join(root, 'run-status.json'), {
        schemaVersion: 1,
        runId,
        status: 'prerequisite-failed',
        stage,
        failure: prerequisites.failure,
        attempts: 0,
        sections,
      })
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
    stage = 'cold-warm'
    const browser = await bounded(
      'cold-warm',
      MVP_SECTION_TIMEOUTS_MS.cold + MVP_SECTION_TIMEOUTS_MS.warm,
      async (_signal, boundMs) => deps.browser(runId, boundMs)
    )
    await finalizeMvpAttemptJournal(runId, plan.planHash)
    if (browser.code !== 0)
      throw new Error(
        'cold-warm-controller-nonzero:' +
          String(browser.code) +
          ':' +
          browser.stderr.slice(-1000)
      )
    stage = 'continuity'
    const continuity = await bounded(
      'continuity',
      MVP_SECTION_TIMEOUTS_MS.continuity,
      async (signal) => deps.continuity(runId, plan.planHash, signal)
    )
    stage = 'capacity'
    const capacity = await bounded(
      'capacity',
      MVP_SECTION_TIMEOUTS_MS.capacity,
      async (signal) => deps.capacity(runId, plan.planHash, signal)
    )
    stage = 'cleanup-and-finalization'
    const summary = await bounded(
      'cleanup-and-finalization',
      MVP_SECTION_TIMEOUTS_MS.cleanupAndFinalization,
      async () => {
        const attempts = await deps.attempts(runId)
        const approval =
          approvalOverride === undefined
            ? await approvalArgument()
            : approvalOverride
        const summarized = await deps.summarize({
          plan,
          attempts,
          continuity,
          capacity,
          approval,
        })
        const endIdentity = await deps.hostIdentity()
        const endDigest = digestMvpPerformance(endIdentity)
        await atomicWriteMvpJson(path.join(root, 'host-verification.json'), {
          schemaVersion: 1,
          runId,
          declaration: plan.designatedHost,
          start: startIdentity,
          startDigest,
          startMatchesDeclaration: true,
          end: endIdentity,
          endDigest,
          endMatchesStart: endDigest === startDigest,
          endMatchesDeclaration:
            JSON.stringify(endIdentity) === JSON.stringify(plan.designatedHost),
        })
        if (
          endDigest !== startDigest ||
          JSON.stringify(endIdentity) !== JSON.stringify(plan.designatedHost)
        )
          throw new Error('designated-host-identity-changed')
        return summarized
      },
      false
    )
    stage = 'complete'
    if (elapsed() > MVP_OVERALL_TIMEOUT_MS + MVP_OVERALL_TOLERANCE_MS)
      throw new Error('overall-timeout-exceeded')
    await atomicWriteMvpJson(path.join(root, 'run-status.json'), {
      schemaVersion: 1,
      runId,
      status: 'complete',
      stage,
      elapsedMs: elapsed(),
      overallBoundMs: MVP_OVERALL_TIMEOUT_MS,
      overallToleranceMs: MVP_OVERALL_TOLERANCE_MS,
      sections,
      overallDisposition: summary.overallDisposition,
    })
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
    let recovery: Awaited<ReturnType<typeof recoverMvpAttemptJournal>> = {
      checkpoints: [],
      inProgress: null,
      invalidCheckpoints: [],
    }
    try {
      await finalizeMvpAttemptJournal(runId, plan.planHash)
      recovery = await recoverMvpAttemptJournal(runId, plan.planHash)
    } catch {
      /* no browser attempt journal existed */
    }
    await atomicWriteMvpJson(path.join(root, 'run-status.json'), {
      schemaVersion: 1,
      runId,
      status: 'failed',
      stage,
      elapsedMs: elapsed(),
      overallBoundMs: MVP_OVERALL_TIMEOUT_MS,
      overallToleranceMs: MVP_OVERALL_TOLERANCE_MS,
      failure: error instanceof Error ? error.message : 'unknown',
      partialEvidenceRetained: true,
      completedAttemptIds: recovery.checkpoints.map(
        (value) => value.attempt.attemptId
      ),
      inProgress: recovery.inProgress,
      fabricatedAttempts: 0,
      sections,
    })
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
    if (elapsed() > MVP_OVERALL_TIMEOUT_MS + MVP_OVERALL_TOLERANCE_MS)
      result = 1
  }
  return result
}

if (
  process.argv[1] &&
  import.meta.url === new URL('file:' + process.argv[1]).href
) {
  const recoveryIndex = process.argv.indexOf('--recover-interrupted')
  if (recoveryIndex >= 0) {
    const recoveryRunId = process.argv[recoveryIndex + 1]
    if (!recoveryRunId) throw new Error('interrupted-run-id-required')
    const fixtureIndex = process.argv.indexOf('--fixture-root')
    process.exitCode = await recoverInterruptedMvpPerformance(
      recoveryRunId,
      fixtureIndex >= 0 ? (process.argv[fixtureIndex + 1] ?? null) : null
    )
  } else process.exitCode = await runMvpPerformanceCli()
}
