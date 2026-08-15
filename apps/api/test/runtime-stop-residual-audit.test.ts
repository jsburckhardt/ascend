import { execFile, spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readProcessStartTime } from '../src/project-runtime-process.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'

const CLI = path.resolve(
  import.meta.dirname,
  '../src/cli/runtime-stop-residual-audit.ts'
)
const CASE_ROOT = path.resolve('test-results/bl-017/residual-audit-cases')

interface RecordedIdentity {
  readonly pid: number
  readonly processStartTime: string
}

const spawnControl = async (): Promise<{
  identity: RecordedIdentity
  stop: () => Promise<void>
}> => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const pid = child.pid
  if (pid === undefined) throw new Error('control identity unavailable')
  let startTime = await readProcessStartTime(pid)
  for (let attempt = 0; startTime === null && attempt < 50; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    startTime = await readProcessStartTime(pid)
  }
  if (startTime === null) throw new Error('control start time unavailable')
  return {
    identity: { pid, processStartTime: startTime },
    stop: async () => {
      await terminateExactProcessGroup(pid, 2000)
    },
  }
}

const freePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('port unavailable')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

const runAudit = async (
  name: string,
  episode: unknown
): Promise<{ code: number; result: Record<string, unknown> }> => {
  const caseRoot = path.join(CASE_ROOT, name)
  await mkdir(caseRoot, { recursive: true })
  const episodePath = path.join(caseRoot, 'designated-episode.json')
  await writeFile(
    episodePath,
    JSON.stringify(episode, null, 2) + String.fromCharCode(10)
  )
  const code = await new Promise<number>((resolve, reject) => {
    execFile(
      'pnpm',
      ['exec', 'tsx', CLI, episodePath],
      { cwd: path.resolve(import.meta.dirname, '..') },
      (error) => {
        if (error === null) return resolve(0)
        const status = (error as { code?: unknown }).code
        if (typeof status === 'number') return resolve(status)
        reject(error)
      }
    )
  })
  const result = JSON.parse(
    await readFile(path.join(caseRoot, 'residual-audit.json'), 'utf8')
  ) as Record<string, unknown>
  return { code, result }
}

describe('BL-017 runtime stop residual audit CLI', () => {
  afterAll(async () => {
    await rm(CASE_ROOT, { recursive: true, force: true })
  })

  it('reports zero residuals and exits zero when every identity is absent', async () => {
    const root = await spawnControl()
    const member = await spawnControl()
    await root.stop()
    await member.stop()
    const port = await freePort()
    const { code, result } = await runAudit('success', {
      schemaVersion: 1,
      attributionCeiling: 'controlled artifact',
      root: root.identity,
      members: [root.identity, member.identity],
      processGroupId: root.identity.pid,
      listenerPort: port,
      audit: {
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      },
    })
    expect(code).toBe(0)
    expect(result).toMatchObject({
      command: 'proof-runtime-stop-residual-audit',
      status: 'ok',
      claimedAbsent: true,
      checked: {
        rootIdentities: 1,
        memberIdentities: 2,
        processGroups: 1,
        listeners: 1,
      },
      residuals: {
        rootIdentity: 0,
        memberIdentities: 0,
        processGroup: 0,
        listeners: 0,
      },
    })
  }, 60000)

  it('exits non-zero when a recorded member identity is still present', async () => {
    const root = await spawnControl()
    const member = await spawnControl()
    await root.stop()
    const port = await freePort()
    try {
      const { code, result } = await runAudit('member-residual', {
        schemaVersion: 1,
        attributionCeiling: 'controlled artifact',
        root: root.identity,
        members: [root.identity, member.identity],
        processGroupId: root.identity.pid,
        listenerPort: port,
        audit: {
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        },
      })
      expect(code).toBe(1)
      expect(result).toMatchObject({
        status: 'failed',
        residuals: { rootIdentity: 0, memberIdentities: 1 },
      })
    } finally {
      await member.stop()
    }
  }, 60000)

  it('exits non-zero when the recorded root identity is still present', async () => {
    const root = await spawnControl()
    const member = await spawnControl()
    await member.stop()
    const port = await freePort()
    try {
      const { code, result } = await runAudit('root-residual', {
        schemaVersion: 1,
        attributionCeiling: 'controlled artifact',
        root: root.identity,
        members: [member.identity],
        processGroupId: member.identity.pid,
        listenerPort: port,
        audit: {
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        },
      })
      expect(code).toBe(1)
      expect(result).toMatchObject({
        status: 'failed',
        residuals: { rootIdentity: 1, memberIdentities: 0 },
      })
    } finally {
      await root.stop()
    }
  }, 60000)
})
