import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import {
  readManagedListeners,
  readManagedProcesses,
} from '../../apps/api/src/workbench-proof-audit.js'
import {
  HOME_WORKBENCH_MARGIN_MS,
  HOME_WORKBENCH_OVERALL_MS,
  HOME_WORKBENCH_STEP_BOUNDS_MS,
  HomeWorkbenchTiming,
  waitForProcessHttpReady,
} from '../e2e/home-workbench-timing.js'

const disposablePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Missing disposable port')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

const ownsExactListener = async (
  rootPid: number,
  port: number
): Promise<boolean> => {
  const processes = await readManagedProcesses(rootPid)
  const discovered = await readManagedListeners(
    processes.map((process) => process.pid)
  )
  const candidate = discovered.find(
    (listener) => listener.address === '127.0.0.1' && listener.port === port
  )
  if (candidate === undefined) return false
  return (await readManagedListeners([candidate.pid], { strict: true })).some(
    (listener) =>
      listener.address === '127.0.0.1' &&
      listener.port === port &&
      listener.inode === candidate.inode
  )
}

const fakeSource = `
const http = require("node:http")
const port = Number(process.argv[1])
process.on("message", (message) => {
  if (message === "emit-hint") {
    process.stdout.write("Local: http://127.0.0.1:" + port + "/" + String.fromCharCode(10))
    process.send?.({ event: "hint-emitted" })
  }
  if (message !== "listen") return
  http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" })
    response.end("<div id=" + String.fromCharCode(34) + "root" + String.fromCharCode(34) + "></div>")
  }).listen(port, "127.0.0.1")
})
setInterval(() => undefined, 1_000)
`

const spawnFake = (port: number): ChildProcessWithoutNullStreams =>
  spawn(process.execPath, ['-e', fakeSource, String(port)], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  }) as ChildProcessWithoutNullStreams

const stopFake = async (
  child: ChildProcessWithoutNullStreams
): Promise<void> => {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  await exited
}

const readiness = (
  child: ChildProcessWithoutNullStreams,
  port: number,
  timeoutMs: number,
  signal?: AbortSignal
) =>
  waitForProcessHttpReady(child, {
    url: 'http://127.0.0.1:' + port + '/',
    label: 'Fake web',
    timeoutMs,
    logHint: 'Local:',
    expectedStatus: 200,
    expectedBody: '<div id="root"></div>',
    ownsListener: () => ownsExactListener(child.pid!, port),
    signal,
    pollIntervalMs: 5,
  })

describe('Home/workbench overall timing contract', () => {
  it('derives one finite overall bound from every step plus bounded margin', () => {
    expect(HOME_WORKBENCH_OVERALL_MS).toBe(
      Object.values(HOME_WORKBENCH_STEP_BOUNDS_MS).reduce(
        (total, bound) => total + bound,
        HOME_WORKBENCH_MARGIN_MS
      )
    )
    expect(HOME_WORKBENCH_OVERALL_MS).toBe(220_000)
  })

  it('retains the exact slow step and fails without retry when its bound is exceeded', () => {
    const timing = new HomeWorkbenchTiming()
    const startMs = Date.now() - HOME_WORKBENCH_STEP_BOUNDS_MS.history - 1
    expect(() => timing.record('history', startMs)).toThrow(
      'Home/workbench step history exceeded its finite 25000 ms bound'
    )
    expect(timing.steps).toEqual([
      expect.objectContaining({
        name: 'history',
        boundMs: 25_000,
        outcome: 'timed-out',
      }),
    ])
  })

  it('treats Local output as a hint until the exact listener serves Home', async () => {
    const port = await disposablePort()
    const child = spawnFake(port)
    let settled = false
    const ready = readiness(child, port, 2_000).finally(() => {
      settled = true
    })
    try {
      const hinted = once(child, 'message')
      child.send('emit-hint')
      await hinted
      await new Promise<void>((resolve) => setImmediate(resolve))
      expect(settled).toBe(false)
      child.send('listen')
      const evidence = await ready
      expect(evidence.logHintAtMs).not.toBeNull()
      expect(evidence.listenerReadyAtMs).toBeGreaterThanOrEqual(
        evidence.logHintAtMs!
      )
    } finally {
      await stopFake(child)
    }
  })

  it('times out when a hinted process never owns the listener and cleans up', async () => {
    const port = await disposablePort()
    const child = spawnFake(port)
    try {
      const pending = readiness(child, port, 80)
      child.send('emit-hint')
      await expect(pending).rejects.toThrow('Fake web HTTP readiness timed out')
    } finally {
      await stopFake(child)
    }
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true)
  })

  it('rejects an early process exit before readiness', async () => {
    const port = await disposablePort()
    const child = spawn(
      process.execPath,
      ['-e', 'console.log("Local:"); process.exit(3)'],
      { stdio: 'pipe' }
    )
    await expect(readiness(child, port, 1_000)).rejects.toThrow(
      'Fake web exited before HTTP readiness'
    )
    expect(child.exitCode).toBe(3)
  })

  it('rejects cancellation and leaves exact process cleanup to the owner', async () => {
    const port = await disposablePort()
    const child = spawnFake(port)
    const controller = new AbortController()
    try {
      const pending = readiness(child, port, 2_000, controller.signal)
      const hinted = once(child, 'message')
      child.send('emit-hint')
      await hinted
      controller.abort()
      await expect(pending).rejects.toThrow('Fake web readiness was cancelled')
    } finally {
      await stopFake(child)
    }
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true)
  })
})
