import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'
import { WebSocket, WebSocketServer } from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'

const project = {
  id: 'ws-project',
  name: 'WS',
  canonicalPath: '/safe/ws',
  createdAt: 1,
}
const binaryInput = Buffer.alloc(64 * 1024)
for (let index = 0; index < binaryInput.length; index += 1)
  binaryInput[index] = (index * 17 + 11) % 256
const binaryDigest = createHash('sha256').update(binaryInput).digest('hex')
const frames = Array.from({ length: 16 }, (_, index) =>
  Buffer.alloc(32 * 1024, index + 1)
)
const frameDigests = frames.map((frame) =>
  createHash('sha256').update(frame).digest('hex')
)

const controllers: ApiServerController[] = []
const fixtures: Array<{
  server: Server
  wss: WebSocketServer
  pendingSockets: Set<Socket>
}> = []
afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  for (const fixture of fixtures.splice(0)) {
    for (const client of fixture.wss.clients) client.terminate()
    for (const socket of fixture.pendingSockets ?? []) socket.destroy()
    fixture.server.closeAllConnections()
    await new Promise<void>((resolve) => fixture.server.close(() => resolve()))
    fixture.wss.close()
  }
})

const createFixture = async () => {
  const server = createServer()
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false })
  const pendingSockets = new Set<Socket>()
  let pendingObserved: (() => void) | undefined
  const pendingBarrier = new Promise<void>((resolve) => {
    pendingObserved = resolve
  })
  server.on('upgrade', (request, socket, head) => {
    const path = request.url ?? ''
    if (path.startsWith('/timeout') || path.startsWith('/pending')) {
      pendingSockets.add(socket)
      socket.resume()
      socket.once('end', () => {
        pendingSockets.delete(socket)
        socket.destroy()
      })
      socket.once('close', () => pendingSockets.delete(socket))
      if (path.startsWith('/pending')) pendingObserved?.()
      return
    }
    if (path.startsWith('/refuse')) {
      socket.end(
        'HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'
      )
      return
    }
    wss.handleUpgrade(request, socket, head, (client) =>
      wss.emit('connection', client, request)
    )
  })
  wss.on('connection', (socket, request) => {
    const path = request.url ?? ''
    if (path.startsWith('/clean')) {
      socket.close(1000, 'matrix-complete')
      return
    }
    if (path.startsWith('/abnormal')) {
      setTimeout(() => socket.terminate(), 10)
      return
    }
    socket.on('message', (data, binary) => socket.send(data, { binary }))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  fixtures.push({ server, wss, pendingSockets })
  return {
    port: (server.address() as AddressInfo).port,
    wss,
    pendingSockets,
    pendingBarrier,
  }
}

const createApi = async (upstreamPort: number) => {
  const library: ProjectLibrary = {
    create: vi.fn(),
    findById: vi.fn(async () => project),
    list: vi.fn(async () => [project]),
    closeProject: vi.fn(),
    close: vi.fn(),
  }
  const snapshot = Object.freeze({
    projectId: project.id,
    state: 'running' as const,
    pid: 8100,
    processStartTime: 'ws-start',
    internalUrl: `http://127.0.0.1:${upstreamPort}`,
    port: upstreamPort,
    canonicalPath: project.canonicalPath,
    startedAt: 1,
    elapsedMs: 1,
  })
  const runtime: ProjectRuntimeManager = {
    start: vi.fn(async () => snapshot),
    inspect: vi.fn(() => snapshot),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(),
    shutdown: vi.fn(async () => ({ status: 'ok', audits: [] })),
  }
  const controller = createApiServerController({
    port: 0,
    fastify: { logger: false },
    createProjectLibrary: async () => library,
    createProjectRuntimeManager: () => runtime,
    createWorkbenchProxyManager: (projectLibrary, projectRuntime) => {
      const { createWorkbenchProxyManager } = requireProxyManager()
      return createWorkbenchProxyManager({
        projectLibrary,
        projectRuntime,
        headerTimeoutMs: 200,
        shutdownTimeoutMs: 500,
      })
    },
    createProjectRegistration: async () => ({
      register: vi.fn(),
      close: vi.fn(),
    }),
  })
  controllers.push(controller)
  const app = await controller.start()
  return {
    port: (app.server.address() as AddressInfo).port,
    runtime,
    proxy: app.workbenchProxy,
  }
}

const requireProxyManager =
  (): typeof import('../src/workbench-proxy-manager.js') => {
    return proxyManagerModule
  }
import * as proxyManagerModule from '../src/workbench-proxy-manager.js'

const connect = (port: number, suffix: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/${suffix}`
    )
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })
const closed = (socket: WebSocket): Promise<{ code: number; reason: string }> =>
  new Promise((resolve) =>
    socket.once('close', (code, reason) =>
      resolve({ code, reason: reason.toString() })
    )
  )
const echo = (socket: WebSocket, data: string | Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    socket.once('message', (message) => resolve(Buffer.from(message)))
    socket.send(data, (error) => {
      if (error) reject(error)
    })
  })
const closeSocket = async (socket: WebSocket): Promise<void> => {
  if (socket.readyState === WebSocket.CLOSED) return
  const done = closed(socket)
  socket.close(1000, 'client-done')
  await done
}

const refusal = (
  port: number,
  suffix: string
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/${suffix}`
    )
    socket.once('unexpected-response', (_request, response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () =>
        resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      )
    })
    socket.once('error', (error) => {
      if (!String(error).includes('Unexpected server response')) reject(error)
    })
  })

describe('stable workbench WebSocket transport', () => {
  it('preserves text, binary, ping, clean close, and abnormal close outcomes', async () => {
    const fixture = await createFixture()
    const { port } = await createApi(fixture.port)
    const text = await connect(port, 'echo-text')
    expect((await echo(text, 'matrix-text')).toString()).toBe('matrix-text')
    await closeSocket(text)
    const binary = await connect(port, 'echo-binary')
    expect(
      createHash('sha256')
        .update(await echo(binary, binaryInput))
        .digest('hex')
    ).toBe(binaryDigest)
    const pong = new Promise<Buffer>((resolve) =>
      binary.once('pong', (data) => resolve(data))
    )
    binary.ping(Buffer.from('ping-proof'))
    expect((await pong).toString()).toBe('ping-proof')
    await closeSocket(binary)
    const clean = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/clean`
    )
    const cleanOutcome = await closed(clean)
    expect(cleanOutcome).toEqual({ code: 1000, reason: 'matrix-complete' })
    const abnormal = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/abnormal`
    )
    const abnormalOutcome = await closed(abnormal)
    expect(abnormalOutcome.code).toBe(1006)
    expect(abnormalOutcome.code).not.toBe(1000)
  })

  it('returns exact bounded timeout/refusal failures and cancels a pending client handshake', async () => {
    const fixture = await createFixture()
    const { port } = await createApi(fixture.port)
    const timedOut = await refusal(port, 'timeout')
    expect(timedOut.status).toBe(504)
    expect(JSON.parse(timedOut.body)).toEqual({
      error: {
        code: 'workbench_websocket_timeout',
        message: 'Workbench WebSocket handshake timed out.',
      },
    })
    await vi.waitFor(() => expect(fixture.pendingSockets.size).toBe(0))
    const refused = await refusal(port, 'refuse')
    expect(refused.status).toBe(502)
    expect(JSON.parse(refused.body)).toEqual({
      error: {
        code: 'workbench_websocket_refused',
        message: 'Workbench WebSocket connection was refused.',
      },
    })
    const pending = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/pending`
    )
    pending.on('error', () => undefined)
    await fixture.pendingBarrier
    pending.terminate()
    await vi.waitFor(() => expect(fixture.pendingSockets.size).toBe(0))
  })

  it('preserves 16 ordered backpressure frames and reuses one runtime for two reconnects', async () => {
    const fixture = await createFixture()
    const { port, runtime, proxy } = await createApi(fixture.port)
    const socket = await connect(port, 'backpressure')
    const received: Buffer[] = []
    const all = new Promise<void>((resolve) =>
      socket.on('message', (data) => {
        received.push(Buffer.from(data))
        if (received.length === frames.length) resolve()
      })
    )
    for (const frame of frames)
      await new Promise<void>((resolve, reject) =>
        socket.send(frame, (error) => (error ? reject(error) : resolve()))
      )
    await all
    expect(
      received.map((frame) => createHash('sha256').update(frame).digest('hex'))
    ).toEqual(frameDigests)
    await closeSocket(socket)
    for (let index = 0; index < 2; index += 1) {
      const reconnect = await connect(port, `reconnect-${index}`)
      expect((await echo(reconnect, `reuse-${index}`)).toString()).toBe(
        `reuse-${index}`
      )
      await closeSocket(reconnect)
    }
    expect(runtime.start).toHaveBeenCalledTimes(3)
    await vi.waitFor(() =>
      expect(proxy.audit()).toMatchObject({
        webSockets: 0,
        rawSockets: 0,
        pendingOperations: 0,
      })
    )
    expect(fixture.wss.clients.size).toBe(0)
  })
})
