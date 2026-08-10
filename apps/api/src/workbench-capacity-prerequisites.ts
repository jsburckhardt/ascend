import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import {
  access,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  CAPACITY_ACTIVE_GUARD,
  CAPACITY_CODE_SERVER_PATH,
  CAPACITY_CODE_SERVER_VERSION,
  CAPACITY_EVIDENCE_ROOT,
  CAPACITY_FIXTURE,
  CAPACITY_PREREQUISITES,
  type CapacityHostContext,
  type CapacityPrerequisite,
  type PrerequisiteRecord,
} from './workbench-capacity-contract.js'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

const readTrimmed = async (target: string): Promise<string> =>
  (await readFile(target, 'utf8')).trim()
const runBounded = async (
  executable: string,
  args: string[],
  timeoutMs: number
): Promise<{ code: number | null; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (value: string) => {
      stdout += value
    })
    child.stderr.on('data', (value: string) => {
      stderr += value
    })
    const timer = setTimeout(() => {
      if (child.pid) child.kill('SIGKILL')
    }, timeoutMs)
    child.once('error', (error) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve({ code: null, stdout, stderr: error.message })
      }
    })
    child.once('close', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve({ code, stdout, stderr })
      }
    })
  })

export const acquireCapacityGuard = async (
  runId: string,
  guardPath = CAPACITY_ACTIVE_GUARD
): Promise<void> => {
  await mkdir(path.dirname(guardPath), { recursive: true })
  try {
    await writeFile(
      guardPath,
      JSON.stringify({
        runId,
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }) + '\n',
      { flag: 'wx', mode: 0o600 }
    )
  } catch {
    throw new Error('capacity-active-run-conflict')
  }
}
export const releaseCapacityGuard = async (
  runId: string,
  guardPath = CAPACITY_ACTIVE_GUARD
): Promise<void> => {
  try {
    const current = JSON.parse(await readFile(guardPath, 'utf8')) as {
      runId?: string
    }
    if (current.runId !== runId)
      throw new Error('capacity-active-run-owner-mismatch')
    await rm(guardPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
}

export interface PrerequisiteCheck {
  records: PrerequisiteRecord[]
  host: CapacityHostContext | null
  stopReason: string | null
}
export const checkCapacityPrerequisites =
  async (): Promise<PrerequisiteCheck> => {
    const records: PrerequisiteRecord[] = []
    let host: CapacityHostContext | null = null
    const facts = new Map<
      CapacityPrerequisite,
      { passed: boolean; detail: string }
    >()
    let osRelease = ''
    try {
      osRelease = await readTrimmed('/etc/os-release')
    } catch {
      osRelease = 'unreadable'
    }
    facts.set('ubuntu-24.04.4', {
      passed:
        /VERSION_ID="24[.]04"/u.test(osRelease) &&
        /VERSION="24[.]04[.]4 LTS/u.test(osRelease),
      detail:
        osRelease.match(/^PRETTY_NAME=(.*)$/mu)?.[1]?.replaceAll('"', '') ??
        'unavailable',
    })
    facts.set('hostname-03f809395a5d', {
      passed: os.hostname() === '03f809395a5d',
      detail: os.hostname(),
    })
    const user = os.userInfo()
    facts.set('non-root-vscode-uid-1000', {
      passed: user.username === 'vscode' && user.uid === 1000,
      detail: user.username + ':' + user.uid,
    })
    let repository = 'unavailable'
    try {
      repository = await realpath(REPOSITORY_ROOT)
    } catch {
      /* recorded below */
    }
    facts.set('repository-workspaces-ascend', {
      passed: repository === '/workspaces/ascend',
      detail: repository,
    })
    let codeVersion = 'unavailable'
    try {
      await access(CAPACITY_CODE_SERVER_PATH, constants.X_OK)
      const result = await runBounded(
        CAPACITY_CODE_SERVER_PATH,
        ['--version'],
        5_000
      )
      codeVersion = result.stdout.trim().split(/\s+/u)[0] ?? ''
    } catch {
      /* recorded below */
    }
    facts.set('code-server-4.131.0', {
      passed: codeVersion === CAPACITY_CODE_SERVER_VERSION,
      detail: codeVersion,
    })
    let fixture = 'unreadable'
    try {
      fixture = await realpath(CAPACITY_FIXTURE)
      await access(fixture, constants.R_OK)
    } catch {
      /* recorded below */
    }
    facts.set('fixture-readable', {
      passed: fixture === CAPACITY_FIXTURE,
      detail: fixture,
    })
    let procReadable = true
    try {
      await Promise.all(
        [
          '/proc/self/stat',
          '/proc/net/tcp',
          '/proc/meminfo',
          '/proc/loadavg',
        ].map((target) => readFile(target))
      )
    } catch {
      procReadable = false
    }
    facts.set('proc-readable', {
      passed: procReadable,
      detail: procReadable
        ? 'required /proc files readable'
        : 'required /proc file unavailable',
    })
    const cgroupFiles = {
      cpuMax: 'cpu.max',
      cpusetEffective: 'cpuset.cpus.effective',
      memoryMax: 'memory.max',
      memoryHigh: 'memory.high',
      swapMax: 'memory.swap.max',
      pidsMax: 'pids.max',
    } as const
    const cgroupValues: Record<keyof typeof cgroupFiles, string> = {
      cpuMax: '',
      cpusetEffective: '',
      memoryMax: '',
      memoryHigh: '',
      swapMax: '',
      pidsMax: '',
    }
    let cgroupReadable = true
    try {
      for (const [key, file] of Object.entries(cgroupFiles) as Array<
        [keyof typeof cgroupFiles, string]
      >)
        cgroupValues[key] = await readTrimmed(path.join('/sys/fs/cgroup', file))
    } catch {
      cgroupReadable = false
    }
    facts.set('cgroup-v2-readable', {
      passed:
        cgroupReadable &&
        (await readTrimmed('/proc/self/cgroup').catch(() => '')) === '0::/',
      detail: cgroupReadable
        ? JSON.stringify(cgroupValues)
        : 'cgroup-v2 context unavailable',
    })
    for (const name of CAPACITY_PREREQUISITES) {
      const result = facts.get(name) ?? {
        passed: false,
        detail: 'check missing',
      }
      records.push({ name, ...result })
      if (!result.passed)
        return {
          records,
          host: null,
          stopReason: 'prerequisite-failed:' + name,
        }
    }
    host = {
      ubuntuVersion: records[0].detail,
      hostname: os.hostname(),
      user: user.username,
      uid: user.uid,
      repository,
      codeServerPath: CAPACITY_CODE_SERVER_PATH,
      codeServerVersion: codeVersion,
      procReadable,
      cgroup: { version: 'v2', path: '/', ...cgroupValues },
    }
    return { records, host, stopReason: null }
  }

export const ensureEvidenceRoot = async (): Promise<void> => {
  await mkdir(CAPACITY_EVIDENCE_ROOT, { recursive: true })
}
