import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface OwnedProcessGroup {
  readonly process: ChildProcessWithoutNullStreams
}

export interface OwnedProcessGroupStopResult {
  readonly childExited: boolean
  readonly graceful: boolean
  readonly processGroupAbsent: boolean
}

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const processGroupId = async (pid: number): Promise<number | null> => {
  try {
    const stat = await readFile(path.join('/proc', String(pid), 'stat'), 'utf8')
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    return Number(fields[2])
  } catch {
    return null
  }
}

export const readProcessGroupMembers = async (
  groupId: number
): Promise<number[]> => {
  const processIds = (await readdir('/proc'))
    .filter((entry) => /^[0-9]+$/u.test(entry))
    .map(Number)
  const identities = await Promise.all(
    processIds.map(async (pid) => ({ pid, groupId: await processGroupId(pid) }))
  )
  return identities
    .filter((identity) => identity.groupId === groupId)
    .map((identity) => identity.pid)
    .sort((left, right) => left - right)
}

export const processGroupAbsent = async (groupId: number): Promise<boolean> =>
  (await readProcessGroupMembers(groupId)).length === 0

const waitForProcessGroupAbsence = async (
  groupId: number,
  timeoutMs: number
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  do {
    if (await processGroupAbsent(groupId)) return true
    await delay(20)
  } while (Date.now() < deadline)
  return processGroupAbsent(groupId)
}

const waitForChildExit = async (
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number
): Promise<boolean> => {
  if (child.exitCode !== null || child.signalCode !== null) return true
  return new Promise((resolve) => {
    const onExit = (): void => {
      clearTimeout(timer)
      resolve(true)
    }
    const timer = setTimeout(() => {
      child.off('exit', onExit)
      resolve(false)
    }, timeoutMs)
    child.once('exit', onExit)
  })
}

const signalProcessGroup = (groupId: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(-groupId, signal)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
}

export const stopOwnedProcessGroup = async (
  owned: OwnedProcessGroup | undefined,
  timeoutMs: number
): Promise<OwnedProcessGroupStopResult> => {
  const groupId = owned?.process.pid
  if (owned === undefined || groupId === undefined) {
    return { childExited: true, graceful: true, processGroupAbsent: true }
  }

  if (!(await processGroupAbsent(groupId))) {
    signalProcessGroup(groupId, 'SIGTERM')
  }
  const [childExitedGracefully, groupExitedGracefully] = await Promise.all([
    waitForChildExit(owned.process, timeoutMs),
    waitForProcessGroupAbsence(groupId, timeoutMs),
  ])
  const graceful = childExitedGracefully && groupExitedGracefully

  if (!groupExitedGracefully) signalProcessGroup(groupId, 'SIGKILL')
  const [childExited, processGroupIsAbsent] = await Promise.all([
    waitForChildExit(owned.process, 2_000),
    waitForProcessGroupAbsence(groupId, 2_000),
  ])
  return {
    childExited,
    graceful,
    processGroupAbsent: processGroupIsAbsent,
  }
}
