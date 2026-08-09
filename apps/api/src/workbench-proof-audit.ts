import { readdir, readFile, readlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ProofHandle } from './workbench-proof-runtime.js'

export interface ManagedProcessRow {
  pid: number
  ppid: number
  pgid: number
  realUid: number
  effectiveUid: number
  user: string
  argv: string[]
}

export interface ManagedListenerRow {
  address: string
  port: number
  pid: number
  inode: string
}

interface ProcIdentity {
  pid: number
  ppid: number
  pgid: number
}

interface ProcListener {
  address: string
  port: number
  inode: string
}

const listProcPids = async (): Promise<number[]> =>
  (await readdir('/proc', { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^[0-9]+$/u.test(entry.name))
    .map((entry) => Number(entry.name))

const readIdentity = async (pid: number): Promise<ProcIdentity | null> => {
  try {
    const stat = await readFile(path.join('/proc', String(pid), 'stat'), 'utf8')
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    return { pid, ppid: Number(fields[1]), pgid: Number(fields[2]) }
  } catch {
    return null
  }
}

const readUser = async (
  pid: number
): Promise<{ realUid: number; effectiveUid: number; user: string }> => {
  const status = await readFile(
    path.join('/proc', String(pid), 'status'),
    'utf8'
  )
  const match = status.match(/^Uid:\s+([0-9]+)\s+([0-9]+)/mu)
  if (!match) throw new Error('Managed process UID is unavailable')
  const realUid = Number(match[1])
  const effectiveUid = Number(match[2])
  const current = os.userInfo()
  return {
    realUid,
    effectiveUid,
    user:
      current.uid === effectiveUid ? current.username : String(effectiveUid),
  }
}

const readArgv = async (pid: number): Promise<string[]> =>
  (await readFile(path.join('/proc', String(pid), 'cmdline'), 'utf8'))
    .split('\0')
    .filter(Boolean)

export const readManagedProcesses = async (
  rootPid: number
): Promise<ManagedProcessRow[]> => {
  const identities = (
    await Promise.all((await listProcPids()).map(readIdentity))
  ).filter((identity): identity is ProcIdentity => identity !== null)
  const managed = new Set<number>([rootPid])
  let changed = true
  while (changed) {
    changed = false
    for (const identity of identities) {
      if (managed.has(identity.ppid) && !managed.has(identity.pid)) {
        managed.add(identity.pid)
        changed = true
      }
    }
  }

  const rows: ManagedProcessRow[] = []
  for (const identity of identities.filter((entry) => managed.has(entry.pid))) {
    try {
      rows.push({
        ...identity,
        ...(await readUser(identity.pid)),
        argv: await readArgv(identity.pid),
      })
    } catch {
      // A process may exit during the bounded audit; absent rows need no cleanup.
    }
  }
  return rows.sort((left, right) => left.pid - right.pid)
}

export const decodeListenerAddress = (hex: string): string => {
  if (hex === '0100007F') return '127.0.0.1'
  if (hex === '00000000000000000000000001000000') return '::1'
  return hex
}

const readProcListeners = async (): Promise<ProcListener[]> => {
  const listeners: ProcListener[] = []
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    const lines = (await readFile(file, 'utf8')).trim().split('\n').slice(1)
    for (const line of lines) {
      const fields = line.trim().split(/\s+/u)
      if (fields[3] !== '0A') continue
      const [address, portHex] = fields[1].split(':')
      listeners.push({
        address: decodeListenerAddress(address),
        port: Number.parseInt(portHex, 16),
        inode: fields[9],
      })
    }
  }
  return listeners
}

export const readManagedListeners = async (
  pids: number[]
): Promise<ManagedListenerRow[]> => {
  const owners = new Map<string, number>()
  for (const pid of pids) {
    let descriptors: string[] = []
    try {
      descriptors = await readdir(path.join('/proc', String(pid), 'fd'))
    } catch {
      continue
    }
    for (const descriptor of descriptors) {
      try {
        const target = await readlink(
          path.join('/proc', String(pid), 'fd', descriptor)
        )
        const match = target.match(/^socket:\[([0-9]+)\]$/u)
        if (match) owners.set(match[1], pid)
      } catch {
        // File descriptors can close while they are inspected.
      }
    }
  }
  return (await readProcListeners())
    .filter((listener) => owners.has(listener.inode))
    .map((listener) => ({ ...listener, pid: owners.get(listener.inode)! }))
    .sort((left, right) => left.port - right.port)
}

export interface HandleCleanupAudit {
  exactProcessAbsent: boolean
  listenerAbsent: boolean
}

export const auditHandleCleanup = async (
  handle: ProofHandle
): Promise<HandleCleanupAudit> => {
  let sameProcess = false
  try {
    const stat = await readFile(
      path.join('/proc', String(handle.pid), 'stat'),
      'utf8'
    )
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    sameProcess = fields[19] === handle.startTimeTicks
  } catch {
    sameProcess = false
  }
  const port = Number(new URL(handle.url).port)
  const listenerExists = (await readProcListeners()).some(
    (listener) => listener.port === port
  )
  return {
    exactProcessAbsent: !sameProcess,
    listenerAbsent: !listenerExists,
  }
}

export const auditHandleAbsent = async (
  handle: ProofHandle
): Promise<boolean> => {
  const audit = await auditHandleCleanup(handle)
  return audit.exactProcessAbsent && audit.listenerAbsent
}
