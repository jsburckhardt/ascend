import { constants } from 'node:fs'
import {
  access,
  chmod,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { checkCapacityPrerequisites } from './workbench-capacity-prerequisites.js'
import { readProcessStartTime } from './project-runtime-process.js'
import { BL001_FIXTURE, REPOSITORY_ROOT } from './workbench-proof-contract.js'
import {
  MVP_PERFORMANCE_GUARD,
  MVP_PERFORMANCE_RESULT_ROOT,
  type MvpPlan,
} from './mvp-performance-contract.js'

export interface MvpPrerequisiteRecord {
  name: string
  passed: boolean
  detail: string
}
export interface MvpPrerequisiteResult {
  passed: boolean
  records: MvpPrerequisiteRecord[]
  host: Record<string, unknown>
  versions: { node: string; chromium: string; codeServer: string }
  failure: string | null
  attempts: 0
}
export interface MvpGuardRecord {
  runId: string
  pid: number
  processStartTime: string
  planHash: string
  acquiredAt: string
}
const baseline = path.join(
  REPOSITORY_ROOT,
  'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/853037e6-5dab-43cf-bcf8-61f1e8bbdb18'
)
const chromiumRoot = path.join(os.homedir(), '.cache/ms-playwright')
const chromiumExecutable = async (): Promise<string | null> => {
  try {
    for (const entry of (await readdir(chromiumRoot)).sort().reverse()) {
      const candidates = [
        path.join(chromiumRoot, entry, 'chrome-linux64/chrome'),
        path.join(chromiumRoot, entry, 'chrome-linux/chrome'),
        path.join(chromiumRoot, entry, 'chrome-linux/headless_shell'),
      ]
      for (const candidate of candidates)
        try {
          await access(candidate, constants.X_OK)
          return candidate
        } catch {
          /* continue */
        }
    }
  } catch {
    /* recorded by caller */
  }
  return null
}
const loadAndMemory = async () => {
  const [load, memory] = await Promise.all([
    readFile('/proc/loadavg', 'utf8'),
    readFile('/proc/meminfo', 'utf8'),
  ])
  const loadAverage = load.trim().split(/\s+/u).slice(0, 3).map(Number)
  const availableMemoryKiB = Number(
    memory.match(/^MemAvailable:\s+([0-9]+)\s+kB$/mu)?.[1]
  )
  return { loadAverage, availableMemoryKiB }
}
export const checkMvpPerformancePrerequisites =
  async (): Promise<MvpPrerequisiteResult> => {
    const capacity = await checkCapacityPrerequisites()
    const records: MvpPrerequisiteRecord[] = capacity.records.map((record) => ({
      ...record,
    }))
    const add = (name: string, passed: boolean, detail: string) =>
      records.push({ name, passed, detail })
    const required = [
      path.join(baseline, 'run.json'),
      path.join(baseline, 'samples.json'),
      path.join(baseline, 'workloads.json'),
    ]
    let baselineReady = true
    for (const candidate of required)
      try {
        await access(candidate, constants.R_OK)
      } catch {
        baselineReady = false
      }
    add(
      'bl004-baseline-raw-evidence',
      baselineReady,
      baselineReady
        ? 'retained designated raw baseline available'
        : 'retained designated raw baseline unavailable'
    )
    let fixtureReady = true
    for (const candidate of [
      BL001_FIXTURE,
      path.join(REPOSITORY_ROOT, 'tests/e2e/session-switching.spec.ts'),
    ])
      try {
        await access(candidate, constants.R_OK)
      } catch {
        fixtureReady = false
      }
    add(
      'bl001-and-bl014-fixtures',
      fixtureReady,
      fixtureReady
        ? 'required fixture and exact BL-014 controller available'
        : 'required fixture or BL-014 controller unavailable'
    )
    const chromium = await chromiumExecutable()
    add(
      'chromium-browser-artifact',
      chromium !== null,
      chromium
        ? path.basename(path.dirname(path.dirname(chromium)))
        : 'chromium executable unavailable'
    )
    let resultRootReady = true
    try {
      await mkdir(MVP_PERFORMANCE_RESULT_ROOT, { recursive: true })
      const probe = path.join(
        MVP_PERFORMANCE_RESULT_ROOT,
        '.write-probe-' + process.pid
      )
      await writeFile(probe, 'probe', { flag: 'wx', mode: 0o600 })
      await rm(probe)
    } catch {
      resultRootReady = false
    }
    add(
      'restricted-artifact-storage',
      resultRootReady,
      resultRootReady
        ? 'owner-writable ignored storage available'
        : 'restricted artifact storage unavailable'
    )
    const load = await loadAndMemory().catch(() => ({
      loadAverage: [] as number[],
      availableMemoryKiB: -1,
    }))
    add(
      'host-load-memory-readable',
      load.loadAverage.length === 3 && load.availableMemoryKiB >= 0,
      'load and memory are recorded without eligibility threshold'
    )
    const failed = records.find((record) => !record.passed)
    return {
      passed: !failed,
      records,
      host: {
        designated: !failed,
        hostname: os.hostname(),
        user: os.userInfo().username,
        uid: os.userInfo().uid,
        platform: os.platform(),
        release: os.release(),
        cgroup: capacity.host?.cgroup ?? null,
        preAttemptLoad: load,
      },
      versions: {
        node: process.version,
        chromium: chromium
          ? path.basename(path.dirname(path.dirname(chromium)))
          : 'unavailable',
        codeServer: capacity.host?.codeServerVersion ?? 'unavailable',
      },
      failure: failed ? 'prerequisite-failed:' + failed.name : null,
      attempts: 0,
    }
  }
export const acquireMvpPerformanceGuard = async (
  plan: MvpPlan,
  guardPath = MVP_PERFORMANCE_GUARD
): Promise<MvpGuardRecord> => {
  await mkdir(path.dirname(guardPath), { recursive: true })
  const start = await readProcessStartTime(process.pid)
  if (!start) throw new Error('guard-owner-identity-unavailable')
  const record: MvpGuardRecord = {
    runId: plan.runId,
    pid: process.pid,
    processStartTime: start,
    planHash: plan.planHash,
    acquiredAt: new Date().toISOString(),
  }
  try {
    await writeFile(guardPath, JSON.stringify(record, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    })
    await chmod(guardPath, 0o600)
  } catch {
    throw new Error('mvp-performance-active-run-conflict')
  }
  return record
}
export const releaseMvpPerformanceGuard = async (
  runId: string,
  guardPath = MVP_PERFORMANCE_GUARD
): Promise<void> => {
  const record = JSON.parse(await readFile(guardPath, 'utf8')) as MvpGuardRecord
  if (record.runId !== runId)
    throw new Error('mvp-performance-guard-owner-mismatch')
  await rm(guardPath)
}
export const inspectMvpPerformanceGuard = async (
  guardPath = MVP_PERFORMANCE_GUARD
): Promise<{
  state: 'absent' | 'active' | 'stale' | 'malformed'
  record: MvpGuardRecord | null
}> => {
  try {
    const record = JSON.parse(
      await readFile(guardPath, 'utf8')
    ) as MvpGuardRecord
    if (
      !record.runId ||
      !record.pid ||
      !record.processStartTime ||
      !record.planHash
    )
      return { state: 'malformed', record: null }
    const current = await readProcessStartTime(record.pid)
    return {
      state: current === record.processStartTime ? 'active' : 'stale',
      record,
    }
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? { state: 'absent', record: null }
      : { state: 'malformed', record: null }
  }
}
export const clearStaleMvpPerformanceGuard = async (
  absenceAudit: { runId: string; complete: boolean; residuals: number },
  guardPath = MVP_PERFORMANCE_GUARD
): Promise<void> => {
  const inspected = await inspectMvpPerformanceGuard(guardPath)
  if (
    inspected.state !== 'stale' ||
    !inspected.record ||
    absenceAudit.runId !== inspected.record.runId ||
    !absenceAudit.complete ||
    absenceAudit.residuals !== 0
  )
    throw new Error('stale-owner-cleanup-audit-required')
  await rm(guardPath)
}
