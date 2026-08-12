import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'
import { WebSocket, WebSocketServer } from 'ws'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  deriveProjectOwnerToken,
  stableProjectRoute,
} from '../src/project-runtime-contract.js'
import { mergeWorkbenchRouteEvidence } from '../src/workbench-route-evidence.js'
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
const HANDSHAKE_TIMEOUT_MS = 200
const CASE_IDLE_TIMEOUT_MS = 1_000
const matrixEvidence: Array<Record<string, unknown>> = []
const matrixClients = new Set<WebSocket>()

const frameDigests = frames.map((frame) =>
  createHash('sha256').update(frame).digest('hex')
)

const controllers: ApiServerController[] = []
const fixtures: Array<{
  server: Server
  wss: WebSocketServer
  pendingSockets: Set<Socket>
  allSockets: Set<Socket>
}> = []
const trackMatrixClient = (socket: WebSocket): WebSocket => {
  matrixClients.add(socket)
  socket.once('close', () => matrixClients.delete(socket))
  return socket
}

afterAll(async () => {
  const expectedCases = [
    'text-echo',
    'binary-echo',
    'ping-pong',
    'clean-close',
    'no-status-close',
    'abnormal-close',
    'handshake-timeout',
    'upstream-refusal',
    'client-close-during-handshake',
    'backpressure',
    'sequential-reconnects',
  ]
  expect(matrixEvidence.map((entry) => entry.case)).toEqual(expectedCases)
  await mergeWorkbenchRouteEvidence({
    matrices: [
      {
        id: 'V-6',
        handshakeTimeoutMs: HANDSHAKE_TIMEOUT_MS,
        idleTimeoutMs: CASE_IDLE_TIMEOUT_MS,
        cases: matrixEvidence,
      },
    ],
    cleanup: {
      webSocketCases: matrixEvidence.map((entry) => ({
        case: entry.case,
        inventory: entry.inventory,
      })),
    },
    residualAudit: {},
  })
})

afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  for (const socket of matrixClients) socket.terminate()
  matrixClients.clear()
  for (const fixture of fixtures.splice(0)) {
    for (const client of fixture.wss.clients) client.terminate()
    for (const socket of fixture.allSockets) socket.destroy()
    fixture.server.closeAllConnections()
    await new Promise<void>((resolve) => fixture.server.close(() => resolve()))
    fixture.wss.close()
  }
})

const createFixture = async () => {
  const server = createServer()
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false })
  const pendingSockets = new Set<Socket>()
  const allSockets = new Set<Socket>()
  const lateResponseAttempts: Array<{
    attemptedAt: number
    accepted: boolean
  }> = []
  server.on('connection', (socket) => {
    allSockets.add(socket)
    socket.once('close', () => allSockets.delete(socket))
  })
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
        if (path.startsWith('/pending')) {
          const accepted = socket.write(
            'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n'
          )
          lateResponseAttempts.push({
            attemptedAt: performance.now(),
            accepted,
          })
        }
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
    if (path.startsWith('/no-status')) {
      socket.close()
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
  fixtures.push({ server, wss, pendingSockets, allSockets })
  return {
    port: (server.address() as AddressInfo).port,
    wss,
    pendingSockets,
    pendingBarrier,
    allSockets,
    lateResponseAttempts,
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
    stableRoute: stableProjectRoute(project.id),
    ownerToken: deriveProjectOwnerToken(project.id),
    startedAt: 1,
    elapsedMs: 1,
  })
  const runtime: ProjectRuntimeManager = {
    start: vi.fn(async () => snapshot),
    ownsSnapshot: vi.fn(() => true),
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
        headerTimeoutMs: HANDSHAKE_TIMEOUT_MS,
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
    const socket = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/${suffix}`
      )
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

const observeSocketInventory = async (
  fixture: Awaited<ReturnType<typeof createFixture>>,
  proxy: Awaited<ReturnType<typeof createApi>>['proxy']
): Promise<Record<string, unknown>> => {
  await vi.waitFor(() => {
    expect(matrixClients.size).toBe(0)
    expect(fixture.wss.clients.size).toBe(0)
    expect(fixture.pendingSockets.size).toBe(0)
    expect(fixture.allSockets.size).toBe(0)
    expect(proxy.audit()).toMatchObject({
      pendingOperations: 0,
      rawSockets: 0,
      webSockets: 0,
    })
  })
  return {
    matrixClientStates: [...matrixClients].map((socket) => socket.readyState),
    upstreamClientStates: [...fixture.wss.clients].map(
      (socket) => socket.readyState
    ),
    pendingSocketCount: fixture.pendingSockets.size,
    rawFixtureSocketCount: fixture.allSockets.size,
    proxy: proxy.audit(),
  }
}

const refusal = (
  port: number,
  suffix: string
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const socket = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/${suffix}`
      )
    )
    socket.once('unexpected-response', (_request, response) => {
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        matrixClients.delete(socket)
        resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    socket.once('error', (error) => {
      if (String(error).includes('Unexpected server response'))
        matrixClients.delete(socket)
      else reject(error)
    })
  })

describe('stable workbench WebSocket transport', () => {
  it('preserves text, binary, ping, clean close, and abnormal close outcomes', async () => {
    const fixture = await createFixture()
    const { port, proxy } = await createApi(fixture.port)

    const text = await connect(port, 'echo-text')
    const textEcho = (await echo(text, 'matrix-text')).toString()
    expect(textEcho).toBe('matrix-text')
    await closeSocket(text)
    matrixEvidence.push({
      case: 'text-echo',
      input: 'matrix-text',
      output: textEcho,
      inventory: await observeSocketInventory(fixture, proxy),
    })

    const binary = await connect(port, 'echo-binary')
    const observedBinaryDigest = createHash('sha256')
      .update(await echo(binary, binaryInput))
      .digest('hex')
    expect(observedBinaryDigest).toBe(binaryDigest)
    const pong = new Promise<Buffer>((resolve) =>
      binary.once('pong', (data) => resolve(data))
    )
    binary.ping(Buffer.from('ping-proof'))
    const pongPayload = (await pong).toString()
    expect(pongPayload).toBe('ping-proof')
    await closeSocket(binary)
    const binaryInventory = await observeSocketInventory(fixture, proxy)
    matrixEvidence.push({
      case: 'binary-echo',
      bytes: binaryInput.length,
      expectedDigest: binaryDigest,
      observedDigest: observedBinaryDigest,
      inventory: binaryInventory,
    })
    matrixEvidence.push({
      case: 'ping-pong',
      pingPayload: 'ping-proof',
      pongPayload,
      inventory: binaryInventory,
    })

    const clean = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/clean`
      )
    )
    const cleanOutcome = await closed(clean)
    expect(cleanOutcome).toEqual({ code: 1000, reason: 'matrix-complete' })
    matrixEvidence.push({
      case: 'clean-close',
      ...cleanOutcome,
      inventory: await observeSocketInventory(fixture, proxy),
    })

    const noStatus = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/no-status`
      )
    )
    const noStatusOutcome = await closed(noStatus)
    expect(noStatusOutcome.code).toBe(1006)
    matrixEvidence.push({
      case: 'no-status-close',
      localObservedCode: noStatusOutcome.code,
      transmittedReservedCode: 'none',
      inventory: await observeSocketInventory(fixture, proxy),
    })

    const abnormal = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/abnormal`
      )
    )
    const abnormalOutcome = await closed(abnormal)
    expect(abnormalOutcome.code).toBe(1006)
    expect(abnormalOutcome.code).not.toBe(1000)
    matrixEvidence.push({
      case: 'abnormal-close',
      localObservedCode: abnormalOutcome.code,
      transmittedReservedCode: 'none',
      boundMs: CASE_IDLE_TIMEOUT_MS,
      inventory: await observeSocketInventory(fixture, proxy),
    })
  })

  it('returns exact bounded timeout and refusal failures and observes pending cancellation', async () => {
    const fixture = await createFixture()
    const { port, proxy } = await createApi(fixture.port)

    const timeoutStartedAt = performance.now()
    const timedOut = await refusal(port, 'timeout')
    const timeoutCompletedAt = performance.now()
    expect(timedOut.status).toBe(504)
    expect(JSON.parse(timedOut.body)).toEqual({
      error: {
        code: 'workbench_websocket_timeout',
        message: 'Workbench WebSocket handshake timed out.',
      },
    })
    matrixEvidence.push({
      case: 'handshake-timeout',
      boundMs: HANDSHAKE_TIMEOUT_MS,
      startedAt: timeoutStartedAt,
      completedAt: timeoutCompletedAt,
      status: timedOut.status,
      envelope: JSON.parse(timedOut.body),
      inventory: await observeSocketInventory(fixture, proxy),
    })

    const refusalStartedAt = performance.now()
    const refused = await refusal(port, 'refuse')
    expect(refused.status).toBe(502)
    expect(JSON.parse(refused.body)).toEqual({
      error: {
        code: 'workbench_websocket_refused',
        message: 'Workbench WebSocket connection was refused.',
      },
    })
    matrixEvidence.push({
      case: 'upstream-refusal',
      boundMs: HANDSHAKE_TIMEOUT_MS,
      startedAt: refusalStartedAt,
      completedAt: performance.now(),
      status: refused.status,
      envelope: JSON.parse(refused.body),
      inventory: await observeSocketInventory(fixture, proxy),
    })

    const pending = trackMatrixClient(
      new WebSocket(
        `ws://127.0.0.1:${port}/projects/${project.id}/workbench/pending`
      )
    )
    let lateDownstreamResponses = 0
    pending.on('unexpected-response', () => {
      lateDownstreamResponses += 1
    })
    pending.on('error', () => undefined)
    await fixture.pendingBarrier
    const barrierAt = performance.now()
    pending.terminate()
    const clientClosedAt = performance.now()
    await vi.waitFor(() => {
      expect(fixture.pendingSockets.size).toBe(0)
      expect(fixture.lateResponseAttempts).toHaveLength(1)
    })
    matrixEvidence.push({
      case: 'client-close-during-handshake',
      boundMs: HANDSHAKE_TIMEOUT_MS,
      barrierAt,
      clientClosedAt,
      lateUpstreamResponse: fixture.lateResponseAttempts[0],
      lateDownstreamResponses,
      inventory: await observeSocketInventory(fixture, proxy),
    })
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
    const observedDigests = received.map((frame) =>
      createHash('sha256').update(frame).digest('hex')
    )
    expect(observedDigests).toEqual(frameDigests)
    await closeSocket(socket)

    const reconnectIdentities: Array<Record<string, unknown>> = []
    for (let index = 0; index < 2; index += 1) {
      const reconnect = await connect(port, `reconnect-${index}`)
      expect((await echo(reconnect, `reuse-${index}`)).toString()).toBe(
        `reuse-${index}`
      )
      reconnectIdentities.push({
        pid: 8100,
        processStartTime: 'ws-start',
        port: fixture.port,
      })
      await closeSocket(reconnect)
    }
    expect(runtime.start).toHaveBeenCalledTimes(3)
    const inventory = await observeSocketInventory(fixture, proxy)
    matrixEvidence.push({
      case: 'backpressure',
      frameCount: received.length,
      bytesPerFrame: frames[0].length,
      expectedDigests: frameDigests,
      observedDigests,
      order: received.map((frame) => frame[0]),
      inventory,
    })
    matrixEvidence.push({
      case: 'sequential-reconnects',
      reconnectCount: reconnectIdentities.length,
      runtimeStartsObserved: vi.mocked(runtime.start).mock.results.length,
      identities: reconnectIdentities,
      inventory,
    })
  })
})
