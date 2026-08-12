import { createServer, request as httpRequest, type Server } from 'node:http'
import {
  createServer as createTcpServer,
  type AddressInfo,
  type Socket,
} from 'node:net'
import { WebSocket, WebSocketServer } from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  classifyWorkbenchConnectionRolePayload,
  filterWorkbenchHeaders,
  validateWorkbenchRedactionProof,
} from '../src/workbench-proxy-contract.js'
import {
  classifyWorkbenchBrowserRequest,
  classifyWorkbenchWebSocketUrl,
  createResourceTracker,
  observedDigest,
  WORKBENCH_BROWSER_CLASSIFIER_VECTORS,
  WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
} from '../src/workbench-route-proof-observation.js'
import { mergeWorkbenchRouteEvidence } from '../src/workbench-route-evidence.js'

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

const controllers: ApiServerController[] = []
const servers: Server[] = []
const fixtureSockets = createResourceTracker('proof-fixture-socket')
const matrixSockets = createResourceTracker('proof-matrix-client-socket')
let resourceSequence = 0
const liveFixtureSockets = new Set<Socket>()

const trackSocket = (
  tracker: ReturnType<typeof createResourceTracker>,
  socket: Socket
): void => {
  const id = `${tracker.inventory().kind}-${++resourceSequence}`
  tracker.open(id)
  socket.once('close', () => tracker.close(id))
}

const listen = async (server: Server): Promise<number> => {
  server.on('connection', (socket) => {
    liveFixtureSockets.add(socket)
    socket.once('close', () => liveFixtureSockets.delete(socket))
    trackSocket(fixtureSockets, socket)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  servers.push(server)
  return (server.address() as AddressInfo).port
}

afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  for (const socket of liveFixtureSockets) socket.destroy()
  liveFixtureSockets.clear()
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

const project = {
  id: 'proof-project-27',
  name: 'Proof',
  canonicalPath: '/restricted/CANONICAL_PATH_SENTINEL_27',
  createdAt: 1,
}

const createApi = async (upstreamPort: number, events: unknown[] = []) => {
  const library: ProjectLibrary = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : undefined)),
    list: vi.fn(async () => [project]),
    closeProject: vi.fn(),
    close: vi.fn(),
  }
  const snapshot = Object.freeze({
    projectId: project.id,
    state: 'running' as const,
    pid: 27001,
    processStartTime: 'proof-start-27',
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
    createWorkbenchProxyManager: (selectedLibrary, selectedRuntime) => {
      const manager = requireManager().createWorkbenchProxyManager({
        projectLibrary: selectedLibrary,
        projectRuntime: selectedRuntime,
        headerTimeoutMs: 500,
        shutdownTimeoutMs: 2_000,
        recordEvent: (event) => events.push(event),
      })
      return manager
    },
    createProjectRegistration: async () => ({
      register: vi.fn(),
      close: vi.fn(),
    }),
  })
  controllers.push(controller)
  const app = await controller.start()
  return {
    app,
    port: (app.server.address() as AddressInfo).port,
    runtime,
    snapshot,
  }
}

import * as managerModule from '../src/workbench-proxy-manager.js'
const requireManager = (): typeof managerModule => managerModule

const waitForEmpty = async (
  app: Awaited<ReturnType<typeof createApi>>['app']
): Promise<void> => {
  await vi.waitFor(() => {
    expect(app.workbenchProxy.audit()).toMatchObject({
      pendingOperations: 0,
      upstreamHttpRequests: 0,
      upstreamHttpResponses: 0,
      rawSockets: 0,
      webSockets: 0,
    })
  })
}

describe('BL-011 verifier proof corrections', () => {
  it('classifies only the exact webview origin and exact named socket roles', () => {
    const origin = 'http://127.0.0.1:3000'
    const prefix = '/projects/opaque/workbench/'
    expect(
      classifyWorkbenchBrowserRequest(
        origin + prefix,
        origin,
        prefix,
        'document'
      ).classification
    ).toBe('ascend-owned')
    expect(
      classifyWorkbenchBrowserRequest(
        'blob:' + origin + '/browser-generated-script',
        origin,
        prefix,
        'script'
      )
    ).toMatchObject({
      classification: 'browser-local',
      schemeClass: 'browser-local',
      hostClass: 'browser-local',
      pathnameClass: 'browser-generated-resource',
    })
    expect(
      classifyWorkbenchBrowserRequest(
        'blob:https://external.example/browser-generated-script',
        origin,
        prefix,
        'script'
      ).classification
    ).toBe('forbidden-external')
    const retainedExample =
      'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css'
    const trusted = classifyWorkbenchBrowserRequest(
      retainedExample,
      origin,
      prefix,
      'stylesheet'
    )
    expect(trusted).toMatchObject({
      classification: 'trusted-markdown-webview',
      schemeClass: 'https',
      hostClass: 'vscode-markdown-resource',
      credentialClass: 'absent',
      portClass: 'absent',
      authorityLeakClass: 'absent',
      pathnameClass: 'webview-out-resource',
      queryKeyClass: 'none',
    })
    expect(JSON.stringify(trusted)).not.toContain('fixture-003a43210')
    expect(JSON.stringify(trusted)).not.toContain('vscode-cdn.net')

    expect(WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR).toBe(
      /^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$/u
        .source
    )
    expect(WORKBENCH_BROWSER_CLASSIFIER_VECTORS).toHaveLength(23)
    for (const vector of WORKBENCH_BROWSER_CLASSIFIER_VECTORS)
      expect(
        classifyWorkbenchBrowserRequest(vector.url, origin, prefix, 'other')
          .classification,
        vector.id
      ).toBe(vector.expected)

    const forbiddenVectors = {
      bareSuffix: 'https://vscode-resource.vscode-cdn.net/out/file.css',
      emptyToken:
        'https://vscode-remote+.vscode-resource.vscode-cdn.net/out/file.css',
      arbitraryPrefix:
        'https://abc+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      freeHyphen:
        'https://vscode-remote+fixture-raw.vscode-resource.vscode-cdn.net/out/file.css',
      malformedShortEscape:
        'https://vscode-remote+fixture-03a.vscode-resource.vscode-cdn.net/out/file.css',
      malformedNonHexEscape:
        'https://vscode-remote+fixture-00zz43210.vscode-resource.vscode-cdn.net/out/file.css',
      extraSublabel:
        'https://vscode-remote+fixture-003a43210.extra.vscode-resource.vscode-cdn.net/out/file.css',
      suffixConfusion:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net.evil.test/out/file.css',
      username:
        'https://user@vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      password:
        'https://user:pass@vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      alternatePort:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net:444/out/file.css',
      explicitDefaultPort:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net:443/out/file.css',
      http: 'http://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      ws: 'ws://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      wss: 'wss://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css',
      unrelatedExternal: 'https://arbitrary.example/out/file.css',
      rawAuthorityPath:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture:43210/file.css',
      rawAuthorityQuery:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture:43210',
      percentAuthorityPath:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture%3A43210/file.css',
      percentAuthorityQuery:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture%3A43210',
      labelAuthorityPath:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/fixture-003a43210/file.css',
      labelAuthorityQuery:
        'https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css?authority=fixture-003a43210',
    }
    for (const [id, forbidden] of Object.entries(forbiddenVectors)) {
      const observation = classifyWorkbenchBrowserRequest(
        forbidden,
        origin,
        prefix,
        'other'
      )
      expect(observation.classification, id).toBe('forbidden-external')
      expect(observation.hostClass, id).toBe('forbidden-external')
      expect(JSON.stringify(observation), id).not.toContain('fixture-003a43210')
      expect(JSON.stringify(observation), id).not.toContain('vscode-cdn.net')
    }
    for (const marketplace of [
      'https://open-vsx.org/api/-/query',
      'https://marketplace.visualstudio.com/_apis/public/gallery',
      'https://gallerycdn.vsassets.io/item',
    ])
      expect(
        classifyWorkbenchBrowserRequest(marketplace, origin, prefix, 'fetch')
          .classification
      ).toBe('marketplace')

    expect(
      classifyWorkbenchConnectionRolePayload(
        Buffer.from('frame:{"type":"connectionType","desiredConnectionType":1}')
      )
    ).toBe('Management')
    expect(
      classifyWorkbenchConnectionRolePayload(
        Buffer.from('frame:{"type":"connectionType","desiredConnectionType":2}')
      )
    ).toBe('ExtensionHost')
    expect(
      classifyWorkbenchConnectionRolePayload(
        Buffer.from('frame:{"type":"connectionType","desiredConnectionType":3}')
      )
    ).toBe('Tunnel')
    expect(
      classifyWorkbenchConnectionRolePayload(
        Buffer.from('frame:{"type":"connectionType","desiredConnectionType":7}')
      )
    ).toBe('unknown')
    expect(
      classifyWorkbenchConnectionRolePayload(Buffer.from('payload'))
    ).toBeUndefined()

    expect(
      classifyWorkbenchWebSocketUrl(
        'ws://127.0.0.1:3000/projects/opaque/workbench/stable-0123456789012345678901234567890123456789?reconnection=false&reconnectionToken=discard&skipWebSocketFrames=false',
        'ws://127.0.0.1:3000',
        prefix,
        45678
      )
    ).toEqual({
      sameOrigin: true,
      stablePrefix: true,
      internalPortAbsent: true,
      reconnection: 'false',
      queryKeys: ['reconnection', 'reconnectionToken', 'skipWebSocketFrames'],
      pathnameClass: 'stable-runtime-socket',
    })
  })
  it('rejects disabled logging and header substitutes for frame channels', () => {
    const scans = Array.from({ length: 10 }, (_, index) => ({
      sentinelId: 'security-' + String(index),
      literalMatches: 0,
      encodedMatches: 0,
    }))
    const proof = {
      loggerEnabled: true,
      markers: {
        start: 'security-start',
        end: 'security-end',
        startIndex: 0,
        endIndex: 2,
      },
      logCapture: { accessRecords: 1, applicationRecords: 1 },
      channels: {
        http: 'http-request',
        websocket: 'websocket-frame',
        terminal: 'integrated-terminal-websocket-frame',
      },
      projectTokenAllowance: [
        { classification: 'stable-route-url', occurrences: 1 },
      ],
      scans,
    }
    expect(validateWorkbenchRedactionProof(proof)).toBe(true)
    expect(
      validateWorkbenchRedactionProof({ ...proof, loggerEnabled: false })
    ).toBe(false)
    expect(
      validateWorkbenchRedactionProof({
        ...proof,
        channels: {
          http: 'http-request',
          websocket: 'http-header',
          terminal: 'http-header',
        },
      })
    ).toBe(false)
  })

  it('executes explicit request and response cases for every required hop header', async () => {
    const required = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ] as const
    const requestCases: Array<Record<string, unknown>> = []
    const responseCases: Array<Record<string, unknown>> = []
    for (const name of required) {
      const requestOutput = filterWorkbenchHeaders(
        { [name]: 'controlled-value' },
        { request: true }
      )
      const responseOutput = filterWorkbenchHeaders(
        { [name]: 'controlled-value' },
        { request: false }
      )
      expect(requestOutput[name]).toBeUndefined()
      expect(responseOutput[name]).toBeUndefined()
      requestCases.push({
        name,
        input: 'controlled-value',
        outputKeys: Object.keys(requestOutput),
      })
      responseCases.push({
        name,
        input: 'controlled-value',
        outputKeys: Object.keys(responseOutput),
      })
    }
    const requestExtension = filterWorkbenchHeaders(
      { connection: 'x-request-extension', 'x-request-extension': 'remove' },
      { request: true }
    )
    const responseExtension = filterWorkbenchHeaders(
      { connection: 'x-response-extension', 'x-response-extension': 'remove' },
      { request: false }
    )
    expect(requestExtension).toEqual({})
    expect(responseExtension).toEqual({})
    await mergeWorkbenchRouteEvidence({
      matrices: [
        {
          id: 'V-4-contract',
          requestCases,
          responseCases,
          requestExtension,
          responseExtension,
        },
      ],
      cleanup: {
        headerContractCaseCount: requestCases.length + responseCases.length,
      },
      residualAudit: {},
    })
  })

  it('observes 32 delayed chunks and aborts exactly after received chunk five', async () => {
    const generatedChunks = Array.from({ length: 32 }, (_, index) =>
      Buffer.alloc(16 * 1024, index)
    )
    const expectedDigest = observedDigest(generatedChunks)
    const completeEmitted: Array<{ chunk: number; at: number }> = []
    const completeReceived: Array<{ chunk: number; at: number }> = []
    const abortEmitted: Array<{ chunk: number; at: number }> = []
    const abortReceived: Array<{ chunk: number; at: number }> = []
    const abortUpstreamClosed = deferred<number>()
    const upstream = createServer((request, response) => {
      const emitted = request.url === '/abort' ? abortEmitted : completeEmitted
      let index = 0
      const emitNext = (): void => {
        if (index === generatedChunks.length) {
          response.end()
          return
        }
        const chunkNumber = index + 1
        const writable = response.write(generatedChunks[index])
        emitted.push({ chunk: chunkNumber, at: performance.now() })
        index += 1
        if (writable) setTimeout(emitNext, 8)
        else response.once('drain', () => setTimeout(emitNext, 8))
      }
      request.once('close', () => {
        if (request.url === '/abort' && !response.writableEnded)
          abortUpstreamClosed.resolve(performance.now())
      })
      emitNext()
    })
    const upstreamPort = await listen(upstream)
    const { app, port, runtime } = await createApi(upstreamPort)
    const path = `/projects/${project.id}/workbench/complete`
    const completeChunks = await new Promise<Buffer[]>((resolve, reject) => {
      const request = httpRequest(
        { host: '127.0.0.1', port, path },
        (response) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk) => {
            response.pause()
            chunks.push(Buffer.from(chunk))
            completeReceived.push({
              chunk: chunks.length,
              at: performance.now(),
            })
            setTimeout(() => response.resume(), 4)
          })
          response.on('end', () => resolve(chunks))
        }
      )
      request.on('socket', (socket) => trackSocket(matrixSockets, socket))
      request.once('error', reject)
      request.end()
    })
    expect(completeEmitted.map((entry) => entry.chunk)).toEqual(
      Array.from({ length: 32 }, (_, index) => index + 1)
    )
    expect(completeReceived.map((entry) => entry.chunk)).toEqual(
      Array.from({ length: 32 }, (_, index) => index + 1)
    )
    expect(completeChunks.every((chunk) => chunk.length === 16 * 1024)).toBe(
      true
    )
    expect(observedDigest(completeChunks)).toBe(expectedDigest)
    const abortPath = `/projects/${project.id}/workbench/abort`
    const abortAt = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(
        { host: '127.0.0.1', port, path: abortPath },
        (response) => {
          response.on('data', () => {
            abortReceived.push({
              chunk: abortReceived.length + 1,
              at: performance.now(),
            })
            if (abortReceived.length === 5) {
              expect(abortEmitted.length).toBeGreaterThanOrEqual(5)
              const observedAt = performance.now()
              request.destroy()
              resolve(observedAt)
            }
          })
        }
      )
      request.on('socket', (socket) => trackSocket(matrixSockets, socket))
      request.once('error', (error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET')
          reject(error)
      })
      request.end()
    })
    const upstreamClosedAt = await abortUpstreamClosed.promise
    expect(abortReceived.map((entry) => entry.chunk)).toEqual([1, 2, 3, 4, 5])
    expect(upstreamClosedAt).toBeGreaterThanOrEqual(abortAt)
    expect(runtime.inspect(project.id)).toMatchObject({
      state: 'running',
      pid: 27001,
    })
    await waitForEmpty(app)
    const fixtureInventory = fixtureSockets.inventory()
    const clientInventory = matrixSockets.inventory()
    expect(fixtureInventory.pending).toEqual([])
    expect(clientInventory.pending).toEqual([])
    await mergeWorkbenchRouteEvidence({
      matrices: [
        {
          id: 'V-5',
          generation: {
            chunks: generatedChunks.length,
            bytesPerChunk: generatedChunks[0].length,
            expectedDigest,
          },
          complete: {
            emitted: completeEmitted,
            received: completeReceived,
            actualDigest: observedDigest(completeChunks),
          },
          abort: {
            emitted: abortEmitted,
            received: abortReceived,
            abortAt,
            upstreamClosedAt,
          },
          proxyInventory: app.workbenchProxy.audit(),
        },
      ],
      cleanup: {
        streamFixtureInventory: fixtureInventory,
        streamClientInventory: clientInventory,
        streamProxyInventory: app.workbenchProxy.audit(),
      },
      residualAudit: {},
    })
  })

  it('shuts down a committed stream, upgraded socket, and pending upgrade with observed cleanup', async () => {
    const upstreamCommittedBarrier = deferred<number>()
    const downstreamCommittedBarrier = deferred<number>()
    const pendingUpgradeBarrier = deferred<number>()
    const upstreamCommittedClosed = deferred<number>()
    const upstreamUpgradeClosed = deferred<number>()
    const upstream = createServer((request, response) => {
      if (request.url === '/committed') {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.write('committed')
        upstreamCommittedBarrier.resolve(performance.now())
        request.once('close', () =>
          upstreamCommittedClosed.resolve(performance.now())
        )
      }
    })
    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    })
    upstream.on('upgrade', (request, socket, head) => {
      if (request.url === '/pending-upgrade') {
        socket.resume()
        pendingUpgradeBarrier.resolve(performance.now())
        socket.once('end', () => {
          upstreamUpgradeClosed.resolve(performance.now())
          socket.destroy()
        })
        socket.once('close', () =>
          upstreamUpgradeClosed.resolve(performance.now())
        )
        return
      }
      wss.handleUpgrade(request, socket, head, (client) =>
        wss.emit('connection', client, request)
      )
    })
    const upstreamPort = await listen(upstream)
    const { app, port, runtime } = await createApi(upstreamPort)
    const control = createTcpServer()
    await new Promise<void>((resolve) =>
      control.listen(0, '127.0.0.1', resolve)
    )
    const prefix = `ws://127.0.0.1:${port}/projects/${project.id}/workbench/`
    const upgraded = await new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(prefix + 'upgraded')
      socket.once('open', () => resolve(socket))
      socket.once('error', reject)
    })
    const upgradedClosed = new Promise<{ code: number; at: number }>(
      (resolve) =>
        upgraded.once('close', (code) =>
          resolve({ code, at: performance.now() })
        )
    )
    const committedOutcome = new Promise<{
      chunks: string[]
      closedAt: number
    }>((resolve, reject) => {
      const chunks: string[] = []
      let responseStarted = false
      const request = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path: `/projects/${project.id}/workbench/committed`,
        },
        (response) => {
          responseStarted = true
          response.on('data', (chunk) => {
            chunks.push(Buffer.from(chunk).toString())
            downstreamCommittedBarrier.resolve(performance.now())
          })
          response.on('aborted', () =>
            resolve({ chunks, closedAt: performance.now() })
          )
          response.on('close', () => {
            if (!response.complete)
              resolve({ chunks, closedAt: performance.now() })
          })
        }
      )
      request.on('socket', (socket) => trackSocket(matrixSockets, socket))
      request.once('error', (error) =>
        responseStarted
          ? resolve({ chunks, closedAt: performance.now() })
          : reject(error)
      )
      request.end()
    })
    const pendingUpgrade = new WebSocket(prefix + 'pending-upgrade')
    const pendingOutcome = new Promise<{
      status: number
      body: string
      at: number
      error?: string
    }>((resolve) => {
      pendingUpgrade.once('unexpected-response', (_request, response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString(),
            at: performance.now(),
          })
        )
      })
      pendingUpgrade.once('error', (error) => {
        if (!String(error).includes('Unexpected server response'))
          resolve({
            status: 0,
            body: '',
            at: performance.now(),
            error: String(error),
          })
      })
    })
    const [upstreamCommittedAt, committedAt, pendingAt] = await Promise.all([
      upstreamCommittedBarrier.promise,
      downstreamCommittedBarrier.promise,
      pendingUpgradeBarrier.promise,
    ])
    expect(runtime.inspect(project.id)).toMatchObject({ state: 'running' })
    const shutdownStartedAt = performance.now()
    const shutdownAudit = await app.workbenchProxy.shutdown()
    const bounded = <T>(operation: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        operation,
        new Promise<T>((_resolve, reject) =>
          setTimeout(
            () => reject(new Error(`Timed out observing ${label}`)),
            2_500
          )
        ),
      ])
    const [
      committed,
      upgradedResult,
      pending,
      committedUpstreamAt,
      upgradeUpstreamAt,
    ] = await Promise.all([
      bounded(committedOutcome, 'committed downstream close'),
      bounded(upgradedClosed, 'upgraded downstream close'),
      bounded(pendingOutcome, 'pending upgrade response'),
      bounded(upstreamCommittedClosed.promise, 'committed upstream close'),
      bounded(upstreamUpgradeClosed.promise, 'pending upstream close'),
    ])
    const shutdownCompletedAt = performance.now()
    expect(committed.chunks).toContain('committed')
    expect(upgradedResult.code).toBe(1006)
    expect(pending.status).toBe(503)
    expect(JSON.parse(pending.body)).toEqual({
      error: {
        code: 'workbench_shutting_down',
        message: 'Workbench routing is shutting down.',
      },
    })
    expect(shutdownCompletedAt - shutdownStartedAt).toBeLessThanOrEqual(2_000)
    expect(shutdownAudit).toMatchObject({
      pendingOperations: 0,
      upstreamHttpRequests: 0,
      upstreamHttpResponses: 0,
      rawSockets: 0,
      webSockets: 0,
    })
    expect(control.listening).toBe(true)
    const controlObservedAt = performance.now()
    await new Promise<void>((resolve) => control.close(() => resolve()))
    for (const client of wss.clients) client.terminate()
    wss.close()
    await mergeWorkbenchRouteEvidence({
      matrices: [
        {
          id: 'V-8',
          barriers: { upstreamCommittedAt, committedAt, pendingAt },
          shutdown: {
            shutdownStartedAt,
            shutdownCompletedAt,
            committedClosedAt: committed.closedAt,
            upgradedClosedAt: upgradedResult.at,
            committedUpstreamAt,
            upgradeUpstreamAt,
          },
          pendingOutcome: pending,
          proxyInventory: shutdownAudit,
          unrelatedControlObservedAt: controlObservedAt,
        },
      ],
      cleanup: {
        shutdownProxyInventory: shutdownAudit,
        fixtureSockets: fixtureSockets.inventory(),
        matrixSockets: matrixSockets.inventory(),
      },
      residualAudit: {},
    })
  })
})
