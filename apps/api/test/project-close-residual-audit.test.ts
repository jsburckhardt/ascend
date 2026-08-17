import { execFile, spawn } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createServer, connect, type Server, type Socket } from 'node:net'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readProcessStartTime } from '../src/project-runtime-process.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..')
const CLI = path.join(
  REPOSITORY_ROOT,
  'apps/api/src/cli/project-close-residual-audit.ts'
)
const DESIGNATED_EPISODE = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020/designated-episode.json'
)
const CASE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020/residual-audit-cases'
)

interface Identity {
  readonly pid: number
  readonly processStartTime: string
}

const emptySidecar = {
  apiIdentities: [],
  workbenchIdentities: [],
  processGroupIds: [],
  listenerPorts: [],
  activeRequestPorts: [],
  databaseSidecarPaths: [],
  disposablePaths: [],
  inFlightCloseOperations: 0,
  timerHandles: 0,
  proxyConnections: 0,
}

async function writeAtomic(destination: string, value: unknown) {
  await mkdir(path.dirname(destination), { recursive: true })
  const staged = destination + '.test-staged'
  await writeFile(
    staged,
    JSON.stringify(value, null, 2) + String.fromCharCode(10)
  )
  await rename(staged, destination)
}

async function runAudit(
  name: string,
  mutate?: (artifact: Record<string, unknown>) => void,
  sidecar: Record<string, unknown> = emptySidecar
): Promise<{
  readonly code: number
  readonly result: Record<string, unknown>
}> {
  const root = path.join(CASE_ROOT, name)
  const episodePath = path.join(root, 'designated-episode.json')
  const artifact = JSON.parse(
    await readFile(DESIGNATED_EPISODE, 'utf8')
  ) as Record<string, unknown>
  mutate?.(artifact)
  await writeAtomic(episodePath, artifact)
  await writeAtomic(path.join(root, 'designated-observations.json'), sidecar)
  const run = await new Promise<{ code: number }>((resolve, reject) => {
    execFile(
      'pnpm',
      ['exec', 'tsx', CLI, episodePath],
      { cwd: REPOSITORY_ROOT },
      (error) => {
        if (error === null) return resolve({ code: 0 })
        const code = (error as { code?: unknown }).code
        if (typeof code === 'number') return resolve({ code })
        reject(error)
      }
    )
  })
  const result = JSON.parse(
    await readFile(path.join(root, 'residual-audit.json'), 'utf8')
  ) as Record<string, unknown>
  return { ...run, result }
}

async function spawnControl(): Promise<{
  readonly identity: Identity
  readonly stop: () => Promise<void>
}> {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  if (child.pid === undefined) throw new Error('control process unavailable')
  const pid = child.pid
  let processStartTime = await readProcessStartTime(pid)
  for (
    let attempt = 0;
    processStartTime === null && attempt < 50;
    attempt += 1
  ) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    processStartTime = await readProcessStartTime(pid)
  }
  if (processStartTime === null)
    throw new Error('control process start time unavailable')
  return {
    identity: { pid, processStartTime },
    stop: async () => terminateExactProcessGroup(pid, 2_000),
  }
}

interface LoopbackPair {
  readonly clientPort: number
  readonly serverPort: number
  /** Ends the client side first, so its ephemeral port enters TIME_WAIT. */
  quiesce(): Promise<void>
  close(): Promise<void>
}

/** The observed state of every non-listening row on one recorded port. */
async function tcpStates(port: number): Promise<readonly string[]> {
  const tables = await Promise.all([
    readFile('/proc/net/tcp', 'utf8'),
    readFile('/proc/net/tcp6', 'utf8'),
  ])
  const portOf = (address: string): number =>
    Number.parseInt(address.slice(address.lastIndexOf(':') + 1), 16)
  return tables
    .flatMap((table) => table.trim().split('\n').slice(1))
    .map((line) => line.trim().split(/\s+/u))
    .filter(
      (fields) =>
        fields.length >= 4 &&
        fields[3] !== '0A' &&
        (portOf(fields[1] ?? '') === port || portOf(fields[2] ?? '') === port)
    )
    .map((fields) => fields[3] as string)
}

/** One real established loopback connection the audit can observe. */
async function openLoopbackPair(): Promise<LoopbackPair> {
  const server: Server = createServer()
  const accepted: Socket[] = []
  server.on('connection', (socket) => accepted.push(socket))
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('loopback listener unavailable')
  const serverPort = address.port
  const client = connect({ host: '127.0.0.1', port: serverPort })
  await new Promise<void>((resolve, reject) => {
    client.once('error', reject)
    client.once('connect', resolve)
  })
  const clientPort = client.localPort
  if (clientPort === undefined) throw new Error('client port unavailable')
  return {
    clientPort,
    serverPort,
    async quiesce() {
      client.end()
      for (const socket of accepted) socket.end()
      const deadline = Date.now() + 20_000
      while (Date.now() < deadline) {
        const states = await tcpStates(clientPort)
        if (states.length > 0 && states.every((state) => state === '06')) return
        await new Promise<void>((resolve) => setTimeout(resolve, 50))
      }
      throw new Error('the client port never reached TIME_WAIT')
    },
    async close() {
      client.destroy()
      for (const socket of accepted) socket.destroy()
      await new Promise<void>((resolve, reject) =>
        server.close((error) =>
          error === undefined ? resolve() : reject(error)
        )
      )
    },
  }
}

describe('BL-020 independent residual audit', () => {
  afterAll(async () => {
    await rm(CASE_ROOT, { recursive: true, force: true })
  })

  it('reports nine independently completed zero probes', async () => {
    const { code, result } = await runAudit('clean')
    expect(code).toBe(0)
    expect(result).toMatchObject({
      command: 'proof-runtime-close-residual-audit',
      status: 'ok',
      evidenceId: 'bl-020-residual-audit',
      observedIndependently: true,
      clear: true,
      violations: [],
      finalizedAtomically: true,
    })
    const classes = result.classes as Record<
      string,
      { probeCompleted: boolean; residual: number }
    >
    expect(Object.keys(classes)).toHaveLength(9)
    expect(
      Object.values(classes).every(
        (probe) => probe.probeCompleted && probe.residual === 0
      )
    ).toBe(true)
    expect(JSON.stringify(result)).not.toContain(REPOSITORY_ROOT)
    expect(result.observer).toMatchObject({
      process: 'separate-cli',
      source: 'apps/api/src/cli/project-close-residual-audit.ts',
    })
  }, 60_000)

  it('re-observes a live API identity instead of copying captured zeroes', async () => {
    const control = await spawnControl()
    try {
      const { code, result } = await runAudit('live-api', undefined, {
        ...emptySidecar,
        apiIdentities: [control.identity],
      })
      expect(code).toBe(1)
      expect(result).toMatchObject({
        status: 'failed',
        classes: {
          apiProcesses: { probeCompleted: true, residual: 1 },
          timers: { probeCompleted: true, residual: 1 },
          inFlightCloseOperations: { probeCompleted: true, residual: 1 },
        },
      })
    } finally {
      await control.stop()
    }
  }, 60_000)

  it.each([
    [
      'malformed',
      (artifact: Record<string, unknown>) => {
        delete artifact.evidenceId
      },
      'artifact-malformed',
    ],
    [
      'unfinalized',
      (artifact: Record<string, unknown>) => {
        artifact.finalized = false
      },
      'artifact-unfinalized',
    ],
    [
      'not-clear',
      (artifact: Record<string, unknown>) => {
        const teardown = artifact.teardown as Record<string, unknown>
        teardown.apiProcesses = { probeCompleted: true, residual: 1 }
      },
      'artifact-not-clear',
    ],
  ])(
    'refuses a %s designated artifact by name',
    async (name, mutate, category) => {
      const { code, result } = await runAudit(name, mutate)
      expect(code).toBe(1)
      expect(result).toMatchObject({ status: 'failed', category })
    }
  )

  it('counts a live connection and excludes only a closed TIME_WAIT tuple', async () => {
    const pair = await openLoopbackPair()
    try {
      // A connection an endpoint still holds is residual and fails the audit.
      const live = await runAudit('live-connection', undefined, {
        ...emptySidecar,
        activeRequestPorts: [pair.serverPort],
      })
      expect(live.code).toBe(1)
      expect(live.result).toMatchObject({
        status: 'failed',
        violations: ['residual-audit-nonzero:proxyConnections'],
      })
      const liveClasses = live.result.classes as Record<
        string,
        { residual: number }
      >
      expect(liveClasses.proxyConnections?.residual).toBeGreaterThan(0)

      // After both endpoints complete their FIN exchange the kernel keeps the
      // tuple for 2xMSL. No socket owns it, so it is not a residual
      // connection and the audit must not report a leak that does not exist.
      await pair.quiesce()
      expect(await tcpStates(pair.clientPort)).not.toEqual([])
      const quiesced = await runAudit('time-wait', undefined, {
        ...emptySidecar,
        activeRequestPorts: [pair.clientPort],
      })
      expect(quiesced.code).toBe(0)
      expect(quiesced.result).toMatchObject({
        status: 'ok',
        clear: true,
        violations: [],
        classes: { proxyConnections: { probeCompleted: true, residual: 0 } },
      })
    } finally {
      await pair.close()
    }
  }, 120_000)

  it('uses host observation primitives and never reads the matrix artifact', async () => {
    const source = await readFile(CLI, 'utf8')
    expect(source).toContain('readProcessStartTime')
    expect(source).toContain('readProcessGroupMembers')
    expect(source).toContain('loopbackListenerIsAbsent')
    expect(source).toContain("readFile('/proc/net/tcp'")
    expect(source).not.toContain('close-matrix.json')
    expect(source).not.toContain('test-results/bl-020/close-matrix')
  })
})
