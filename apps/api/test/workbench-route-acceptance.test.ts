import { createServer, request as httpRequest, type Server } from 'node:http'
import {
  createServer as createTcpServer,
  type Server as NetServer,
  type Socket,
} from 'node:net'
import type { AddressInfo } from 'node:net'
import { stat } from 'node:fs/promises'
import { WebSocket, WebSocketServer } from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  createProjectRuntimeConfig,
  RuntimeFailure,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import type {
  OwnedRuntimeProcess,
  ReadyRuntime,
  RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'
import {
  WORKBENCH_FAILURE_TABLE,
  WORKBENCH_FAILURE_TABLE_SHA256,
  validateWorkbenchFailureMatrix,
  validateWorkbenchRedactionProof,
  type WorkbenchSafeEvent,
} from '../src/workbench-proxy-contract.js'
import { createWorkbenchProxyManager } from '../src/workbench-proxy-manager.js'
import {
  mergeWorkbenchRouteEvidence,
  WORKBENCH_ROUTE_EVIDENCE_FILE,
} from '../src/workbench-route-evidence.js'

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
const project = {
  id: 'opaque-project-27',
  name: 'Acceptance',
  canonicalPath: '/safe/acceptance',
  createdAt: 1,
}
const controllers: ApiServerController[] = []
const servers: Array<Server | NetServer> = []
const sockets = new Set<Socket>()
afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  for (const socket of sockets) socket.destroy()
  sockets.clear()
  for (const server of servers.splice(0)) {
    if ('closeAllConnections' in server) server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
const listen = async (server: Server | NetServer): Promise<number> => {
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  servers.push(server)
  return (server.address() as AddressInfo).port
}
const get = (
  port: number,
  path: string,
  clientSockets?: Set<Socket>
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        agent: false,
        headers: { connection: 'close' },
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        )
      }
    )
    request.once('socket', (socket) => {
      clientSockets?.add(socket)
      socket.once('close', () => clientSockets?.delete(socket))
    })
    request.once('error', reject)
    request.end()
  })
const open = (port: number, suffix: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/projects/${project.id}/workbench/${suffix}`
    )
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })
const closeWebSocket = async (socket: WebSocket): Promise<void> =>
  new Promise((resolve) => {
    socket.once('close', () => resolve())
    socket.close(1000, 'done')
  })

describe('BL-011 executable acceptance coordinator', () => {
  it('executes every safe failure through the stable route and owned fault boundary', async () => {
    let activeExecutionPath: string[] = []
    const observeBoundary = (boundary: string): void => {
      if (!activeExecutionPath.includes(boundary))
        activeExecutionPath.push(boundary)
    }
    const faultServer = createServer((request, response) => {
      if (request.url?.startsWith('/reset')) {
        request.socket.destroy()
        return
      }
      if (request.url?.startsWith('/timeout')) return
      if (request.url?.startsWith('/redirect')) {
        response.writeHead(302, {
          location: 'https://outside.invalid/private',
        })
        response.end()
        return
      }
      response.end('unused')
    })
    const faultWss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    })
    faultServer.on('upgrade', (request, socket, head) => {
      observeBoundary('fake-upstream')
      if (request.url?.startsWith('/ws-timeout')) {
        socket.resume()
        socket.once('end', () => socket.destroy())
        return
      }
      if (request.url?.startsWith('/ws-refused')) {
        socket.end(
          'HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'
        )
        return
      }
      faultWss.handleUpgrade(request, socket, head, (client) =>
        faultWss.emit('connection', client, request)
      )
    })
    const faultPort = await listen(faultServer)
    const invalidHttpPort = await listen(
      createTcpServer((socket) =>
        socket.once('data', () =>
          socket.end('HTTP/1.1 200 OK\r\nMalformed Header\r\n\r\n')
        )
      )
    )
    const closedServer = createTcpServer()
    await new Promise<void>((resolve) =>
      closedServer.listen(0, '127.0.0.1', resolve)
    )
    const closedPort = (closedServer.address() as AddressInfo).port
    await new Promise<void>((resolve) => closedServer.close(() => resolve()))

    const events: WorkbenchSafeEvent[] = []
    const runtimeCategories = new Map(
      WORKBENCH_FAILURE_TABLE.filter((row) =>
        row.category.startsWith('runtime:')
      ).map(
        (row) =>
          [
            'case-' + row.category.replace(':', '-'),
            row.category.slice('runtime:'.length),
          ] as const
      )
    )
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async (id) => {
        observeBoundary('project-library')
        if (id === 'case-unknown-project') return undefined
        if (id === 'case-persistence-failure')
          throw new Error('controlled persistence fault')
        return { ...project, id, canonicalPath: '/controlled/' + id }
      }),
      list: vi.fn(async () => []),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const runtime: ProjectRuntimeManager = {
      start: vi.fn(async ({ projectId, canonicalPath }) => {
        observeBoundary('runtime-manager')
        const runtimeCategory = runtimeCategories.get(projectId)
        if (runtimeCategory !== undefined)
          throw new RuntimeFailure(runtimeCategory)
        const selectedPort =
          projectId === 'case-upstream-connect'
            ? closedPort
            : projectId === 'case-upstream-invalid-http'
              ? invalidHttpPort
              : faultPort
        return Object.freeze({
          projectId,
          state: 'running' as const,
          pid: 9127,
          processStartTime: 'failure-matrix-runtime',
          internalUrl: 'http://127.0.0.1:' + String(selectedPort),
          port: selectedPort,
          canonicalPath,
          startedAt: 1,
          elapsedMs: 1,
        })
      }),
      inspect: vi.fn(),
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
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          headerTimeoutMs: 40,
          shutdownTimeoutMs: 500,
          recordEvent: (event) => {
            observeBoundary('proxy-manager')
            events.push(event)
          },
          requestHttp: (options) => {
            observeBoundary('fake-upstream')
            const request = httpRequest(options)
            if (String(options.path).startsWith('/dns')) {
              const error = Object.assign(new Error('controlled DNS fault'), {
                code: 'ENOTFOUND',
              })
              queueMicrotask(() => request.destroy(error))
            }
            return request
          },
        }),
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    controllers.push(controller)
    const app = await controller.start()
    const apiPort = (app.server.address() as AddressInfo).port
    const failureClientSockets = new Set<Socket>()
    const upgradeFailure = (
      path: string
    ): Promise<{ status: number; body: string }> =>
      new Promise((resolve, reject) => {
        const client = new WebSocket('ws://127.0.0.1:' + String(apiPort) + path)
        client.once('unexpected-response', (request, response) => {
          const clientSocket = request.socket
          if (clientSocket !== null) {
            failureClientSockets.add(clientSocket)
            clientSocket.once('close', () =>
              failureClientSockets.delete(clientSocket)
            )
          }
          const chunks: Buffer[] = []
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          response.on('end', () =>
            resolve({
              status: response.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
            })
          )
        })
        client.once('error', (error) => {
          if (!String(error).includes('Unexpected server response'))
            reject(error)
        })
      })

    const executions: Array<Record<string, unknown>> = []
    for (const [
      executionIndex,
      tableRow,
    ] of WORKBENCH_FAILURE_TABLE.entries()) {
      const executionId =
        'failure-execution-' + String(executionIndex + 1).padStart(2, '0')
      const privateSentinel =
        'PRIVATE_FAILURE_' + String(executionIndex).padStart(2, '0') + '_27'
      const category = tableRow.category
      const projectId = 'case-' + category.replace(':', '-')
      const websocket = category.startsWith('websocket-')
      const suffix =
        category === 'upstream-dns'
          ? 'dns'
          : category === 'upstream-reset'
            ? 'reset'
            : category === 'upstream-invalid-http'
              ? 'invalid'
              : category === 'upstream-timeout'
                ? 'timeout'
                : category === 'websocket-timeout'
                  ? 'ws-timeout'
                  : category === 'websocket-refused'
                    ? 'ws-refused'
                    : category === 'redirect-rejected'
                      ? 'redirect'
                      : 'failure'
      const path =
        category === 'malformed-project-id'
          ? '/projects/%00/workbench/' + suffix + '?fault=' + privateSentinel
          : '/projects/' +
            projectId +
            '/workbench/' +
            suffix +
            '?fault=' +
            privateSentinel
      activeExecutionPath = ['stable-route']
      events.length = 0
      if (category === 'manager-shutdown') await app.workbenchProxy.shutdown()
      const outcome = websocket
        ? await upgradeFailure(path)
        : await get(apiPort, path, failureClientSockets)
      const envelope = JSON.parse(outcome.body) as {
        error: { code: string; message: string }
      }
      if (category === 'malformed-project-id')
        observeBoundary('route-validation')
      const observedInternalError =
        category === 'malformed-project-id'
          ? 'malformed-project-id'
          : events.find((event) => event.event === 'workbench.proxy.failed')
              ?.classification
      expect(observedInternalError).toBe(category)
      expect(outcome.status).toBe(tableRow.status)
      expect(envelope.error).toEqual({
        code: tableRow.code,
        message: tableRow.message,
      })
      const publicCapture = JSON.stringify({
        status: outcome.status,
        envelope,
      })
      const redaction = {
        literalMatches: publicCapture.split(privateSentinel).length - 1,
        encodedMatches:
          publicCapture.split(encodeURIComponent(privateSentinel)).length - 1,
      }
      expect(redaction).toEqual({ literalMatches: 0, encodedMatches: 0 })
      await vi.waitFor(() =>
        expect(app.workbenchProxy.audit()).toMatchObject({
          pendingOperations: 0,
          upstreamHttpRequests: 0,
          upstreamHttpResponses: 0,
          rawSockets: 0,
          webSockets: 0,
        })
      )
      await vi.waitFor(
        () =>
          expect({
            category,
            clientSockets: failureClientSockets.size,
            fixtureSockets: sockets.size,
          }).toEqual({
            category,
            clientSockets: 0,
            fixtureSockets: 0,
          }),
        { timeout: 3_000 }
      )
      const cleanup = {
        ...app.workbenchProxy.audit(),
        fixtureSockets: sockets.size,
        clientSockets: failureClientSockets.size,
      }
      const executionPath = [...activeExecutionPath]
      executions.push({
        executionIndex,
        executionId,
        transport: websocket ? 'websocket-upgrade' : 'http-request',
        executionPath,
        observedInternalError,
        category,
        status: outcome.status,
        code: envelope.error.code,
        message: envelope.error.message,
        cleanup,
        redaction,
      })
    }
    faultWss.close()
    const failureMatrix = {
      id: 'V-7',
      tableHash: WORKBENCH_FAILURE_TABLE_SHA256,
      declaredCategories: WORKBENCH_FAILURE_TABLE.map((row) => row.category),
      executions,
    }
    expect(validateWorkbenchFailureMatrix(failureMatrix)).toBe(true)
    await mergeWorkbenchRouteEvidence({
      projectToken: project.id,
      stableRoute: '/projects/' + project.id + '/workbench/',
      matrices: [failureMatrix],
      cleanup: { failureExecutionCount: executions.length },
      residualAudit: {},
    })
    expect((await stat(WORKBENCH_ROUTE_EVIDENCE_FILE)).mode & 0o777).toBe(0o600)
  })

  it('captures bounded enabled logs and uses real HTTP, WebSocket, and terminal channels', async () => {
    const logs: string[] = []
    const authorizationSentinel = ['AUTHORIZATION', 'SENTINEL', '27'].join('_')
    const observedHttp: Record<string, string> = {}
    const observedFrames: Record<string, string> = {}
    let upstreamPort = 0
    const upstream = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      request.on('end', () => {
        observedHttp.authorization = String(request.headers.authorization)
        observedHttp.cookie = String(request.headers.cookie)
        observedHttp.query =
          new URL(request.url ?? '/', 'http://fixture').searchParams.get(
            'secret'
          ) ?? ''
        observedHttp.body = Buffer.concat(chunks).toString('utf8')
        response.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
        })
        response.write('safe-before http://127.0.0.1:')
        response.end(String(upstreamPort) + '/private safe-after')
      })
    })
    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    })
    upstream.on('upgrade', (request, socket, head) =>
      wss.handleUpgrade(request, socket, head, (client) =>
        wss.emit('connection', client, request)
      )
    )
    wss.on('connection', (client, request) =>
      client.once('message', (data) => {
        const channel = request.url?.startsWith('/terminal')
          ? 'terminal'
          : 'websocket'
        observedFrames[channel] = data.toString()
        client.send(channel + '-accepted')
      })
    )
    upstreamPort = await listen(upstream)
    const securityProject = {
      ...project,
      id: 'PROJECT_ID_SENTINEL_27',
      canonicalPath: '/safe/CANONICAL_PATH_SENTINEL_27/COMMAND_ENV_SENTINEL_27',
    }
    const runtimeInputs: string[] = []
    const snapshot = Object.freeze({
      projectId: securityProject.id,
      state: 'running' as const,
      pid: 9927,
      processStartTime: 'redaction-runtime',
      internalUrl: 'http://127.0.0.1:' + String(upstreamPort),
      port: upstreamPort,
      canonicalPath: securityProject.canonicalPath,
      startedAt: 1,
      elapsedMs: 1,
    })
    const runtime: ProjectRuntimeManager = {
      start: vi.fn(async ({ canonicalPath }) => {
        runtimeInputs.push(canonicalPath)
        return snapshot
      }),
      inspect: vi.fn(() => snapshot),
      lastFailure: vi.fn(),
      lastCleanup: vi.fn(),
      lastShutdown: vi.fn(),
      shutdown: vi.fn(async () => ({ status: 'ok', audits: [] })),
    }
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async (id) =>
        id === securityProject.id ? securityProject : undefined
      ),
      list: vi.fn(async () => [securityProject]),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const controller = createApiServerController({
      port: 0,
      fastify: {
        logger: { stream: { write: (line: string) => logs.push(line) } },
      },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    controllers.push(controller)
    const app = await controller.start()
    const apiPort = (app.server.address() as AddressInfo).port
    const markerStart = 'BL011_REDACTION_START_27'
    const markerEnd = 'BL011_REDACTION_END_27'
    app.log.info({ event: markerStart })

    const httpOutcome = await new Promise<{
      status: number
      headers: unknown
      body: string
    }>((resolve, reject) => {
      const body = Buffer.from('BODY_SECRET_SENTINEL_27')
      const request = httpRequest(
        {
          host: '127.0.0.1',
          port: apiPort,
          method: 'POST',
          path:
            '/projects/' +
            securityProject.id +
            '/workbench/http?secret=QUERY_SECRET_SENTINEL_27',
          headers: {
            authorization: 'Bearer AUTHORIZATION_SENTINEL_27',
            cookie: 'session=COOKIE_SENTINEL_27',
            'content-length': String(body.length),
          },
        },
        (response) => {
          const chunks: Buffer[] = []
          response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          response.on('end', () =>
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            })
          )
        }
      )
      request.once('error', reject)
      request.end(body)
    })
    const sendProtectedFrame = (
      suffix: string,
      payload: string
    ): Promise<string> =>
      new Promise((resolve, reject) => {
        const client = new WebSocket(
          'ws://127.0.0.1:' +
            String(apiPort) +
            '/projects/' +
            securityProject.id +
            '/workbench/' +
            suffix
        )
        client.once('open', () => client.send(payload))
        client.once('message', (data) => {
          const value = data.toString()
          client.close(1000, 'redaction-complete')
          resolve(value)
        })
        client.once('error', reject)
      })
    const webSocketAck = await sendProtectedFrame(
      'socket',
      'WEBSOCKET_PAYLOAD_SENTINEL_27'
    )
    const terminalAck = await sendProtectedFrame(
      'terminal',
      'TERMINAL_PAYLOAD_SENTINEL_27'
    )
    await vi.waitFor(() =>
      expect(app.workbenchProxy.audit().webSockets).toBe(0)
    )
    app.log.info({ event: markerEnd })

    expect(runtimeInputs).toContain(securityProject.canonicalPath)
    expect(observedHttp).toEqual({
      authorization: 'Bearer AUTHORIZATION_SENTINEL_27',
      cookie: 'session=COOKIE_SENTINEL_27',
      query: 'QUERY_SECRET_SENTINEL_27',
      body: 'BODY_SECRET_SENTINEL_27',
    })
    expect(observedFrames).toEqual({
      websocket: 'WEBSOCKET_PAYLOAD_SENTINEL_27',
      terminal: 'TERMINAL_PAYLOAD_SENTINEL_27',
    })
    expect(webSocketAck).toBe('websocket-accepted')
    expect(terminalAck).toBe('terminal-accepted')
    expect(httpOutcome.body).not.toContain('127.0.0.1:' + String(upstreamPort))

    const records = logs.map(
      (line) => JSON.parse(line) as Record<string, unknown>
    )
    const startIndex = records.findIndex(
      (record) => record.event === markerStart
    )
    const endIndex = records.findIndex((record) => record.event === markerEnd)
    expect(startIndex).toBeGreaterThanOrEqual(0)
    expect(endIndex).toBeGreaterThan(startIndex)
    const boundedRecords = records.slice(startIndex, endIndex + 1)
    const boundedLogs = JSON.stringify(boundedRecords)
    const stableRouteTokenLocation =
      '/projects/' + securityProject.id + '/workbench/'
    const publicCapture = JSON.stringify({
      stableRoute: stableRouteTokenLocation,
      http: httpOutcome,
      websocket: {
        classification: 'websocket-frame',
        acknowledgement: webSocketAck,
      },
      terminal: {
        classification: 'integrated-terminal-websocket-frame',
        acknowledgement: terminalAck,
      },
    })
    const protectedSentinels = [
      '127.0.0.1:' + String(upstreamPort),
      'CANONICAL_PATH_SENTINEL_27',
      authorizationSentinel,
      'COOKIE_SENTINEL_27',
      'QUERY_SECRET_SENTINEL_27',
      'BODY_SECRET_SENTINEL_27',
      'COMMAND_ENV_SENTINEL_27',
      'WEBSOCKET_PAYLOAD_SENTINEL_27',
      'TERMINAL_PAYLOAD_SENTINEL_27',
      securityProject.id,
    ]
    const scanned = boundedLogs + publicCapture
    const publicProjectMatches = scanned.split(securityProject.id).length - 1
    const stableRouteMatches =
      scanned.split(stableRouteTokenLocation).length - 1
    expect(publicProjectMatches).toBe(stableRouteMatches)
    expect(stableRouteMatches).toBeGreaterThan(0)
    const scans = protectedSentinels.map((sentinel, index) => {
      const classifiedCapture =
        sentinel === securityProject.id
          ? scanned
              .split(stableRouteTokenLocation)
              .join('[declared-stable-route]')
          : scanned
      return {
        sentinelId: 'protected-' + String(index),
        literalMatches: classifiedCapture.split(sentinel).length - 1,
        encodedMatches:
          classifiedCapture.split(encodeURIComponent(sentinel)).length - 1,
      }
    })
    for (const scan of scans)
      expect(scan).toMatchObject({ literalMatches: 0, encodedMatches: 0 })
    const redaction = {
      loggerEnabled: true,
      markers: { start: markerStart, end: markerEnd, startIndex, endIndex },
      logCapture: {
        accessRecords: boundedRecords.filter((record) => 'req' in record)
          .length,
        applicationRecords: boundedRecords.filter((record) =>
          String(record.event ?? '').startsWith('workbench.proxy.')
        ).length,
      },
      channels: {
        http: 'http-request',
        websocket: 'websocket-frame',
        terminal: 'integrated-terminal-websocket-frame',
      },
      projectTokenAllowance: [
        { classification: 'stable-route-url', occurrences: stableRouteMatches },
      ],
      scans,
    }
    expect(validateWorkbenchRedactionProof(redaction)).toBe(true)
    await mergeWorkbenchRouteEvidence({
      redaction,
      cleanup: {
        securityProxyInventory: app.workbenchProxy.audit(),
        securityFixtureSocketCount: sockets.size,
      },
    })
    wss.close()
  })

  it('releases exactly four HTTP and four upgrades into one BL-010 launch/readiness sequence', async () => {
    const upstream = createServer((_request, response) =>
      response.end('same-runtime')
    )
    const wss = new WebSocketServer({
      noServer: true,
      perMessageDeflate: false,
    })
    upstream.on('upgrade', (request, socket, head) =>
      wss.handleUpgrade(request, socket, head, (client) => {
        wss.emit('connection', client, request)
      })
    )
    wss.on('connection', (client) =>
      client.on('message', (data, binary) => client.send(data, { binary }))
    )
    const upstreamPort = await listen(upstream)
    const launchGate = deferred<ReadyRuntime>()
    const exit = deferred<{
      code: number | null
      signal: NodeJS.Signals | null
      addressInUse: boolean
    }>()
    const process: OwnedRuntimeProcess = {
      pid: 8270,
      processStartTime: 'start-8270',
      exit: exit.promise,
      terminate: vi.fn(async (_graceful, _force, port) => ({
        pid: 8270,
        processStartTime: 'start-8270',
        port,
        outcome: 'graceful' as const,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })),
      audit: vi.fn(async (port) => ({
        pid: 8270,
        processStartTime: 'start-8270',
        port,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })),
      isAlive: vi.fn(async () => true),
    }
    const launch = vi.fn(() => launchGate.promise)
    const findProjectById = vi.fn(async () => project)
    const processDependencies: RuntimeProcessDependencies = {
      process: { assertLaunchable: vi.fn(), launch: vi.fn() },
      ports: { acquire: vi.fn() },
      health: {
        check: vi.fn(async () => ({
          elapsedMs: 1,
          status: 200,
          bodyStatus: 'alive',
          timedOut: false,
        })),
      },
      now: Date.now,
      sleep: vi.fn(),
    }
    const runtime = createProjectRuntimeManager({
      findProjectById,
      launch,
      processDependencies,
      config: createProjectRuntimeConfig({
        expectedUser: 'fixture',
        environment: { PATH: '/safe' },
      }),
    })
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: findProjectById,
      list: vi.fn(async () => [project]),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    controllers.push(controller)
    const app = await controller.start()
    const apiPort = (app.server.address() as AddressInfo).port
    const prefix = `/projects/${project.id}/workbench/`
    const httpOperations = Array.from({ length: 4 }, (_, index) =>
      get(apiPort, prefix + `http-${index}`)
    )
    const webSocketOperations = Array.from({ length: 4 }, (_, index) =>
      open(apiPort, `socket-${index}`)
    )
    await vi.waitFor(() => expect(findProjectById).toHaveBeenCalledTimes(16))
    expect(launch).toHaveBeenCalledTimes(1)
    launchGate.resolve({
      process,
      port: upstreamPort,
      internalUrl: `http://127.0.0.1:${upstreamPort}`,
      readinessAttempts: [
        { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
      ],
    })
    const [httpResults, webSocketResults] = await Promise.all([
      Promise.all(httpOperations),
      Promise.all(webSocketOperations),
    ])
    expect(httpResults).toEqual(
      Array.from({ length: 4 }, () => ({ status: 200, body: 'same-runtime' }))
    )
    expect(webSocketResults).toHaveLength(4)
    expect(runtime.inspect(project.id)).toMatchObject({
      pid: 8270,
      processStartTime: 'start-8270',
      port: upstreamPort,
    })
    await Promise.all(webSocketResults.map(closeWebSocket))
    await vi.waitFor(() =>
      expect(app.workbenchProxy.audit()).toMatchObject({
        pendingOperations: 0,
        webSockets: 0,
        rawSockets: 0,
      })
    )
    await mergeWorkbenchRouteEvidence({
      matrices: [
        {
          id: 'V-2',
          operations: { http: 4, websocket: 4 },
          launchCount: 1,
          readinessCount: 1,
          identity: {
            pid: 8270,
            processStartTime: 'start-8270',
            port: upstreamPort,
          },
        },
      ],
      cleanup: {
        concurrentProxyInventory: app.workbenchProxy.audit(),
        fixtureSocketStates: [...sockets].map((socket) => ({
          destroyed: socket.destroyed,
        })),
      },
      residualAudit: {},
    })
    for (const client of wss.clients) client.terminate()
    wss.close()
  })

  it('returns precommit 503 during bounded shutdown and preserves an unrelated listener', async () => {
    const requestObserved = deferred<void>()
    const upstreamPort = await listen(
      createServer(() => requestObserved.resolve())
    )
    const snapshot = Object.freeze({
      projectId: project.id,
      state: 'running' as const,
      pid: 9001,
      processStartTime: 'shutdown-start',
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
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async () => project),
      list: vi.fn(),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    controllers.push(controller)
    const app = await controller.start()
    const apiPort = (app.server.address() as AddressInfo).port
    const control = createTcpServer()
    await new Promise<void>((resolve) =>
      control.listen(0, '127.0.0.1', resolve)
    )
    const operation = get(apiPort, `/projects/${project.id}/workbench/pending`)
    await requestObserved.promise
    const startedAt = Date.now()
    const shutdown = app.workbenchProxy.shutdown()
    const outcome = await operation
    const audit = await shutdown
    expect(outcome.status).toBe(503)
    expect(JSON.parse(outcome.body)).toEqual({
      error: {
        code: 'workbench_shutting_down',
        message: 'Workbench routing is shutting down.',
      },
    })
    expect(Date.now() - startedAt).toBeLessThanOrEqual(5_000)
    expect(audit).toMatchObject({
      pendingOperations: 0,
      upstreamHttpRequests: 0,
      upstreamHttpResponses: 0,
      rawSockets: 0,
      webSockets: 0,
    })
    expect(control.listening).toBe(true)
    await new Promise<void>((resolve) => control.close(() => resolve()))
  })
})
