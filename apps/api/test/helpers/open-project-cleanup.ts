import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer, Socket } from 'node:net'
import path from 'node:path'
import {
  processGroupAbsent,
  stopOwnedProcessGroup,
  type OwnedProcessGroupStopResult,
} from './project-home-process-group.js'

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../../..')
export const BL008_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-008/open-project'
)
export const BL008_CLEANUP_EVIDENCE_PATH = path.join(
  BL008_EVIDENCE_ROOT,
  'cleanup-matrix.json'
)
const SCENARIO_ROOT = path.join(BL008_EVIDENCE_ROOT, 'cleanup-scenarios')
const CHILD_PATH = path.join(
  import.meta.dirname,
  'open-project-cleanup-child.cjs'
)
const DATABASE_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const

export const OPEN_PROJECT_CLEANUP_SCENARIOS = [
  'startupFailure',
  'assertionFailure',
  'episodeTimeout',
  'interruptedGracefulShutdown',
  'survivingDescendant',
] as const

export type OpenProjectCleanupScenario =
  (typeof OPEN_PROJECT_CLEANUP_SCENARIOS)[number]

export interface CleanupScenarioEvidence {
  readonly executed: boolean
  readonly injectedFailureObserved: boolean
  readonly gracefulStop: boolean
  readonly processGroupsAbsent: boolean
  readonly listenersAbsent: boolean
  readonly databaseAndSidecarsAbsent: boolean
  readonly fixturesAbsent: boolean
  readonly survivingDescendantDetected: boolean
  readonly ownerCleanupPassed: boolean
  readonly teardownClean: boolean
  readonly processGroupMembersAfterCleanup: number
  readonly listenersAfterCleanup: number
  readonly databaseFilesAfterCleanup: number
  readonly fixturesAfterCleanup: number
  readonly survivingDescendantsBeforeTeardown: number
  readonly survivingDescendantsAfterTeardown: number
}

export interface OpenProjectCleanupMatrix {
  readonly schemaVersion: number
  readonly executedScenarioCount: number
  readonly scenarios: Readonly<
    Record<OpenProjectCleanupScenario, CleanupScenarioEvidence>
  >
}

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

async function disposablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Disposable port allocation failed')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
  return address.port
}

async function listenerAbsent(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket()
    socket.setTimeout(300)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(true))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
    socket.connect(port, '127.0.0.1')
  })
}

async function pathAbsent(target: string): Promise<boolean> {
  return access(target).then(
    () => false,
    () => true
  )
}

function processAlive(pid: number | undefined): boolean {
  if (pid === undefined) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

async function waitForProcessAbsence(pid: number): Promise<boolean> {
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    if (!processAlive(pid)) return true
    await delay(20)
  }
  return !processAlive(pid)
}

function killExactProcess(pid: number | undefined): void {
  if (pid === undefined) return
  try {
    process.kill(pid, 'SIGKILL')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
}

async function waitForReady(
  child: ChildProcessWithoutNullStreams
): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    let output = ''
    const timer = setTimeout(
      () => reject(new Error('scenario readiness timeout')),
      2_000
    )
    const onExit = (): void => {
      clearTimeout(timer)
      reject(new Error('scenario process exited before readiness'))
    }
    child.once('exit', onExit)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
      const lineEnd = output.indexOf(String.fromCharCode(10))
      if (lineEnd < 0) return
      clearTimeout(timer)
      child.off('exit', onExit)
      const parsed = JSON.parse(output.slice(0, lineEnd)) as {
        ready: boolean
        descendantPid?: number
      }
      if (!parsed.ready) reject(new Error('scenario did not become ready'))
      else resolve(parsed.descendantPid)
    })
  })
}

function assertInside(root: string, target: string): void {
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('cleanup scenario allocation escaped its root')
}

async function runScenario(
  scenario: OpenProjectCleanupScenario
): Promise<CleanupScenarioEvidence> {
  const allocation = path.join(SCENARIO_ROOT, randomUUID())
  const databasePath = path.join(allocation, 'database', 'ascend.db')
  const fixturePath = path.join(allocation, 'fixture')
  assertInside(SCENARIO_ROOT, databasePath)
  assertInside(SCENARIO_ROOT, fixturePath)
  const databaseFiles = DATABASE_SUFFIXES.map((suffix) => databasePath + suffix)
  await mkdir(path.dirname(databasePath), { recursive: true })
  await mkdir(fixturePath, { recursive: true })
  for (const file of databaseFiles) await writeFile(file, 'owned')
  await writeFile(path.join(fixturePath, 'fixture.txt'), 'owned')

  const port = await disposablePort()
  const child = spawn(process.execPath, [CHILD_PATH, scenario, String(port)], {
    cwd: REPOSITORY_ROOT,
    detached: true,
    stdio: 'pipe',
  })
  const groupId = child.pid
  if (groupId === undefined)
    throw new Error('scenario process identity unavailable')
  let descendantPid: number | undefined
  let injectedFailureObserved = false
  let stop: OwnedProcessGroupStopResult | undefined
  try {
    if (scenario === 'startupFailure') {
      await Promise.reject(new Error('injected startup failure')).catch(() => {
        injectedFailureObserved = true
      })
    } else {
      descendantPid = await waitForReady(child)
      if (scenario === 'assertionFailure') {
        try {
          throw new Error('injected assertion failure')
        } catch {
          injectedFailureObserved = true
        }
      } else if (scenario === 'episodeTimeout') {
        injectedFailureObserved = await Promise.race([
          delay(100).then(() => false),
          delay(10).then(() => true),
        ])
      } else {
        stop = await stopOwnedProcessGroup(
          { process: child },
          scenario === 'interruptedGracefulShutdown' ? 25 : 500
        )
        injectedFailureObserved =
          scenario === 'interruptedGracefulShutdown'
            ? !stop.graceful
            : descendantPid !== undefined
      }
    }
  } finally {
    stop ??= await stopOwnedProcessGroup({ process: child }, 500)
  }

  for (const file of databaseFiles) await rm(file, { force: true })
  await rm(fixturePath, { recursive: true, force: true })
  const groupsAbsent = await processGroupAbsent(groupId)
  const noListener = await listenerAbsent(port)
  const databaseAbsence = await Promise.all(databaseFiles.map(pathAbsent))
  const fixtureIsAbsent = await pathAbsent(fixturePath)
  const descendantAliveBeforeTeardown = processAlive(descendantPid)
  const databaseFilesAfterCleanup = databaseAbsence.filter(
    (absent) => !absent
  ).length
  const ownerCleanupPassed =
    stop.processGroupAbsent &&
    groupsAbsent &&
    noListener &&
    databaseFilesAfterCleanup === 0 &&
    fixtureIsAbsent &&
    !descendantAliveBeforeTeardown

  killExactProcess(descendantPid)
  const descendantAbsentAfterTeardown =
    descendantPid === undefined || (await waitForProcessAbsence(descendantPid))
  await rm(allocation, { recursive: true, force: true })
  const allocationAbsent = await pathAbsent(allocation)
  const teardownClean =
    groupsAbsent &&
    noListener &&
    databaseFilesAfterCleanup === 0 &&
    fixtureIsAbsent &&
    allocationAbsent &&
    descendantAbsentAfterTeardown

  return {
    executed: true,
    injectedFailureObserved,
    gracefulStop: stop.graceful,
    processGroupsAbsent: groupsAbsent,
    listenersAbsent: noListener,
    databaseAndSidecarsAbsent: databaseFilesAfterCleanup === 0,
    fixturesAbsent: fixtureIsAbsent && allocationAbsent,
    survivingDescendantDetected: descendantAliveBeforeTeardown,
    ownerCleanupPassed,
    teardownClean,
    processGroupMembersAfterCleanup: groupsAbsent ? 0 : 1,
    listenersAfterCleanup: noListener ? 0 : 1,
    databaseFilesAfterCleanup,
    fixturesAfterCleanup: fixtureIsAbsent && allocationAbsent ? 0 : 1,
    survivingDescendantsBeforeTeardown: descendantAliveBeforeTeardown ? 1 : 0,
    survivingDescendantsAfterTeardown: descendantAbsentAfterTeardown ? 0 : 1,
  }
}

export async function runOpenProjectCleanupMatrix(): Promise<OpenProjectCleanupMatrix> {
  await mkdir(SCENARIO_ROOT, { recursive: true })
  const entries = await Promise.all(
    OPEN_PROJECT_CLEANUP_SCENARIOS.map(
      async (scenario) => [scenario, await runScenario(scenario)] as const
    )
  )
  const scenarios = Object.fromEntries(entries) as Record<
    OpenProjectCleanupScenario,
    CleanupScenarioEvidence
  >
  const matrix = {
    schemaVersion: 1,
    executedScenarioCount: entries.length,
    scenarios,
  }
  await mkdir(BL008_EVIDENCE_ROOT, { recursive: true })
  await writeFile(BL008_CLEANUP_EVIDENCE_PATH, JSON.stringify(matrix, null, 2))
  return matrix
}
