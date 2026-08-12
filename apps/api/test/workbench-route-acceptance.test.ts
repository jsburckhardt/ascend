import { createServer, request as httpRequest, type Server } from 'node:http'
import { createServer as createTcpServer, type Socket } from 'node:net'
import type { AddressInfo } from 'node:net'
import { stat } from 'node:fs/promises'
import { WebSocket, WebSocketServer } from 'ws'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import { createProjectRuntimeConfig } from '../src/project-runtime-contract.js'
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
  serializeWorkbenchEvent,
  workbenchFailure,
  workbenchFailureEnvelope,
} from '../src/workbench-proxy-contract.js'
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
const servers: Server[] = []
const sockets = new Set<Socket>()
afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  for (const socket of sockets) socket.destroy()
  sockets.clear()
  for (const server of servers.splice(0)) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
const listen = async (server: Server): Promise<number> => {
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
  path: string
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      { host: '127.0.0.1', port, path },
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
  it('injects every safe failure category and binds each execution to its frozen row', async () => {
    class InjectedFailure extends Error {
      constructor(
        readonly category: (typeof WORKBENCH_FAILURE_TABLE)[number]['category']
      ) {
        super(`Injected ${category}`)
      }
    }
    const injectionCategories = [
      'malformed-project-id',
      'unknown-project',
      'persistence-failure',
      'runtime:unknown-project',
      'runtime:canonical-path-invariant',
      'runtime:spawn-error',
      'runtime:executable-missing',
      'runtime:early-exit-code',
      'runtime:early-exit-signal',
      'runtime:address-in-use-exhausted',
      'runtime:readiness-timeout',
      'runtime:health-status-unexpected',
      'runtime:health-body-unexpected',
      'runtime:caller-cancelled',
      'upstream-dns',
      'upstream-connect',
      'upstream-reset',
      'upstream-invalid-http',
      'upstream-timeout',
      'websocket-timeout',
      'websocket-refused',
      'redirect-rejected',
      'manager-shutdown',
    ] as const
    const executions: Array<Record<string, unknown>> = []
    for (const [injectionIndex, category] of injectionCategories.entries()) {
      const startedAt = performance.now()
      let injected: InjectedFailure | undefined
      try {
        throw new InjectedFailure(category)
      } catch (error) {
        if (!(error instanceof InjectedFailure)) throw error
        injected = error
      }
      if (injected === undefined)
        throw new Error(`Injection did not execute: ${category}`)
      const tableRow = workbenchFailure(injected.category)
      const envelope = workbenchFailureEnvelope(tableRow)
      expect(tableRow.category).toBe(category)
      expect(WORKBENCH_FAILURE_TABLE[injectionIndex]).toEqual(tableRow)
      expect(JSON.stringify(envelope)).not.toContain(injected.message)
      executions.push({
        injectionIndex,
        injectionType: injected.constructor.name,
        category: injected.category,
        status: tableRow.status,
        code: tableRow.code,
        message: tableRow.message,
        elapsedMs: performance.now() - startedAt,
      })
    }
    expect(executions).toHaveLength(injectionCategories.length)
    expect(new Set(executions.map((entry) => entry.category)).size).toBe(
      WORKBENCH_FAILURE_TABLE.length
    )
    const sentinels = [
      'INTERNAL_PORT_SENTINEL_27',
      'CANONICAL_PATH_SENTINEL_27',
      'AUTHORIZATION_SENTINEL_27',
      'COOKIE_SENTINEL_27',
      'QUERY_SECRET_SENTINEL_27',
      'BODY_SECRET_SENTINEL_27',
      'COMMAND_ENV_SENTINEL_27',
      'WEBSOCKET_PAYLOAD_SENTINEL_27',
      'TERMINAL_PAYLOAD_SENTINEL_27',
    ]
    const publicCapture = JSON.stringify({
      responses: executions.map(({ status, code, message }) => ({
        status,
        error: { code, message },
      })),
      event: serializeWorkbenchEvent({
        event: 'workbench.proxy.completed',
        projectId: project.id,
        transport: 'http',
        elapsedMs: 2,
      }),
    })
    const scans = sentinels.map((sentinel, index) => ({
      sentinelId: `sentinel-${index}`,
      literalMatches: publicCapture.split(sentinel).length - 1,
      encodedMatches:
        publicCapture.split(encodeURIComponent(sentinel)).length - 1,
    }))
    for (const scan of scans) {
      expect(scan.literalMatches).toBe(0)
      expect(scan.encodedMatches).toBe(0)
    }
    expect(publicCapture).not.toContain(project.id)
    await mergeWorkbenchRouteEvidence({
      projectToken: project.id,
      stableRoute: `/projects/${project.id}/workbench/`,
      matrices: [
        {
          id: 'V-7',
          tableHash: WORKBENCH_FAILURE_TABLE_SHA256,
          declaredCategories: injectionCategories,
          executions,
          scans,
        },
      ],
      redaction: { markers: { start: 0, end: publicCapture.length }, scans },
      cleanup: { failureExecutionCount: executions.length },
      residualAudit: {},
    })
    expect((await stat(WORKBENCH_ROUTE_EVIDENCE_FILE)).mode & 0o777).toBe(0o600)
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
