import {
  request as nodeHttpRequest,
  type ClientRequest,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import type { Socket } from 'node:net'
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import type { ProjectLibrary } from './project-library.js'
import {
  RuntimeFailure,
  type RuntimeSnapshot,
} from './project-runtime-contract.js'
import type { ProjectRuntimeManager } from './project-runtime-manager.js'
import {
  RedirectRejectedError,
  WORKBENCH_HEADER_TIMEOUT_MS,
  WORKBENCH_SHUTDOWN_TIMEOUT_MS,
  filterWorkbenchHeaders,
  rewriteServiceWorkerAllowed,
  rewriteWorkbenchCookie,
  rewriteWorkbenchRedirect,
  serializeWorkbenchEvent,
  workbenchFailure,
  workbenchFailureEnvelope,
  type StableWorkbenchRoute,
  type WorkbenchFailureCategory,
  type WorkbenchPublicFailure,
  type WorkbenchSafeEvent,
} from './workbench-proxy-contract.js'

export interface WorkbenchProxyAudit {
  readonly shuttingDown: boolean
  readonly pendingOperations: number
  readonly upstreamHttpRequests: number
  readonly upstreamHttpResponses: number
  readonly rawSockets: number
  readonly webSockets: number
}

export interface WorkbenchProxyManager {
  handleHttp(
    request: IncomingMessage,
    response: ServerResponse,
    route: StableWorkbenchRoute
  ): Promise<void>
  handleUpgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
    route: StableWorkbenchRoute
  ): Promise<void>
  shutdown(): Promise<WorkbenchProxyAudit>
  audit(): WorkbenchProxyAudit
}

export interface WorkbenchProxyManagerDependencies {
  readonly projectLibrary: ProjectLibrary
  readonly projectRuntime: ProjectRuntimeManager
  readonly headerTimeoutMs?: number
  readonly shutdownTimeoutMs?: number
  readonly now?: () => number
  readonly recordEvent?: (event: WorkbenchSafeEvent) => void
  readonly recordWebSocketDiagnostic?: (diagnostic: {
    side: 'downstream' | 'upstream'
    event: 'close' | 'error'
    code?: number
    classification?: string
  }) => void
}

class UpstreamTimeoutError extends Error {}

function classifyRuntime(error: unknown): WorkbenchFailureCategory {
  return error instanceof RuntimeFailure
    ? error.category === 'manager-shutdown'
      ? 'manager-shutdown'
      : `runtime:${error.category}`
    : 'upstream-connect'
}

function classifyHttpError(error: unknown): WorkbenchFailureCategory {
  if (error instanceof UpstreamTimeoutError) return 'upstream-timeout'
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : ''
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'upstream-dns'
  if (code === 'ECONNRESET' || code === 'EPIPE') return 'upstream-reset'
  if (code.startsWith('HPE_')) return 'upstream-invalid-http'
  return 'upstream-connect'
}

function sendHttpFailure(
  response: ServerResponse,
  failure: WorkbenchPublicFailure
): void {
  if (response.headersSent || response.destroyed) {
    response.destroy()
    return
  }
  const body = Buffer.from(JSON.stringify(workbenchFailureEnvelope(failure)))
  response.writeHead(failure.status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
  })
  response.end(body)
}

function sendUpgradeFailure(
  socket: Socket,
  failure: WorkbenchPublicFailure
): void {
  if (socket.destroyed) return
  const body = Buffer.from(JSON.stringify(workbenchFailureEnvelope(failure)))
  socket.end(
    `HTTP/1.1 ${failure.status} ${failure.status === 504 ? 'Gateway Timeout' : failure.status === 503 ? 'Service Unavailable' : 'Bad Gateway'}\r\n` +
      'Content-Type: application/json; charset=utf-8\r\n' +
      `Content-Length: ${body.length}\r\n` +
      'Cache-Control: no-store\r\nConnection: close\r\n\r\n' +
      body.toString('utf8')
  )
}

function safeTarget(snapshot: RuntimeSnapshot): URL {
  if (
    snapshot.state !== 'running' ||
    snapshot.internalUrl === null ||
    snapshot.port === null
  ) {
    throw new RuntimeFailure('canonical-path-invariant')
  }
  const target = new URL(snapshot.internalUrl)
  if (
    target.protocol !== 'http:' ||
    target.hostname !== '127.0.0.1' ||
    Number(target.port) !== snapshot.port
  ) {
    throw new RuntimeFailure('canonical-path-invariant')
  }
  return target
}

export function createWorkbenchProxyManager(
  dependencies: WorkbenchProxyManagerDependencies
): WorkbenchProxyManager {
  const now = dependencies.now ?? Date.now
  const recordEvent = dependencies.recordEvent ?? (() => undefined)
  const recordWebSocketDiagnostic =
    dependencies.recordWebSocketDiagnostic ?? (() => undefined)
  const headerTimeoutMs =
    dependencies.headerTimeoutMs ?? WORKBENCH_HEADER_TIMEOUT_MS
  const shutdownTimeoutMs =
    dependencies.shutdownTimeoutMs ?? WORKBENCH_SHUTDOWN_TIMEOUT_MS
  if (
    !Number.isSafeInteger(headerTimeoutMs) ||
    headerTimeoutMs <= 0 ||
    !Number.isSafeInteger(shutdownTimeoutMs) ||
    shutdownTimeoutMs <= 0
  ) {
    throw new Error('Workbench proxy bounds must be positive integers')
  }
  const pending = new Set<AbortController>()
  const httpRequests = new Set<ClientRequest>()
  const httpResponses = new Set<IncomingMessage>()
  const rawSockets = new Set<Socket>()
  const webSockets = new Set<WebSocket>()
  const downstreamServer = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  })
  let shuttingDown = false
  let shutdownPromise: Promise<WorkbenchProxyAudit> | undefined

  const audit = (): WorkbenchProxyAudit =>
    Object.freeze({
      shuttingDown,
      pendingOperations: pending.size,
      upstreamHttpRequests: httpRequests.size,
      upstreamHttpResponses: httpResponses.size,
      rawSockets: rawSockets.size,
      webSockets: webSockets.size,
    })

  const emit = (event: WorkbenchSafeEvent): void =>
    recordEvent(serializeWorkbenchEvent(event))

  const stableAuthority = (request: IncomingMessage): string => {
    const address =
      request.socket.localAddress === '::ffff:127.0.0.1'
        ? '127.0.0.1'
        : (request.socket.localAddress ?? '127.0.0.1')
    const host = address.includes(':') ? `[${address}]` : address
    return request.socket.localPort === undefined
      ? host
      : host + ':' + String(request.socket.localPort)
  }

  const addTrustedOriginHeaders = (
    headers: Record<string, string | string[]>,
    request: IncomingMessage,
    prefix: string
  ): void => {
    const authority = stableAuthority(request)
    headers.host = authority
    headers['x-forwarded-host'] = authority
    headers['x-forwarded-proto'] = 'http'
    headers['x-forwarded-prefix'] = prefix
  }

  const resolveTarget = async (
    route: StableWorkbenchRoute,
    signal: AbortSignal
  ): Promise<URL> => {
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    let project
    try {
      project = await dependencies.projectLibrary.findById(route.projectId)
    } catch {
      throw workbenchFailure('persistence-failure')
    }
    if (project === undefined) throw workbenchFailure('unknown-project')
    if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
    return safeTarget(
      await dependencies.projectRuntime.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
        signal,
      })
    )
  }

  const failureFrom = (error: unknown): WorkbenchPublicFailure => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error &&
      'message' in error
    ) {
      return error as WorkbenchPublicFailure
    }
    if (shuttingDown) return workbenchFailure('manager-shutdown')
    return workbenchFailure(classifyRuntime(error))
  }

  const handleHttp = async (
    request: IncomingMessage,
    response: ServerResponse,
    route: StableWorkbenchRoute
  ): Promise<void> => {
    const startedAt = now()
    const controller = new AbortController()
    pending.add(controller)
    emit({
      event: 'workbench.proxy.started',
      projectId: route.projectId,
      transport: 'http',
      elapsedMs: 0,
    })
    let upstreamRequest: ClientRequest | undefined
    try {
      const target = await resolveTarget(route, controller.signal)
      if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
      const headers = filterWorkbenchHeaders(request.headers, { request: true })
      addTrustedOriginHeaders(headers, request, route.prefix)
      await new Promise<void>((resolve) => {
        let settled = false
        const finish = (): void => {
          if (settled) return
          settled = true
          resolve()
        }
        upstreamRequest = nodeHttpRequest({
          protocol: 'http:',
          hostname: '127.0.0.1',
          port: Number(target.port),
          method: request.method,
          path: route.upstreamPath,
          headers,
        })
        httpRequests.add(upstreamRequest)
        const timeout = setTimeout(
          () => upstreamRequest?.destroy(new UpstreamTimeoutError()),
          headerTimeoutMs
        )
        const cleanupRequest = (): void => {
          clearTimeout(timeout)
          if (upstreamRequest !== undefined)
            httpRequests.delete(upstreamRequest)
        }
        upstreamRequest.once('response', (upstreamResponse) => {
          clearTimeout(timeout)
          httpResponses.add(upstreamResponse)
          try {
            const responseHeaders = filterWorkbenchHeaders(
              upstreamResponse.headers,
              { request: false }
            )
            const location = upstreamResponse.headers.location
            if (location !== undefined)
              responseHeaders.location = rewriteWorkbenchRedirect(
                location,
                route.prefix,
                target.host,
                route.upstreamPath
              )
            const cookies = upstreamResponse.headers['set-cookie']
            if (cookies !== undefined)
              responseHeaders['set-cookie'] = cookies.map((cookie) =>
                rewriteWorkbenchCookie(cookie, route.prefix)
              )
            const serviceWorker =
              upstreamResponse.headers['service-worker-allowed']
            if (typeof serviceWorker === 'string')
              responseHeaders['service-worker-allowed'] =
                rewriteServiceWorkerAllowed(serviceWorker, route.prefix)
            response.writeHead(
              upstreamResponse.statusCode ?? 502,
              responseHeaders
            )
          } catch (error) {
            httpResponses.delete(upstreamResponse)
            upstreamResponse.destroy()
            const failure =
              error instanceof RedirectRejectedError
                ? workbenchFailure('redirect-rejected')
                : workbenchFailure('upstream-invalid-http')
            sendHttpFailure(response, failure)
            finish()
            return
          }
          upstreamResponse.once('end', finish)
          upstreamResponse.once('close', () => {
            httpResponses.delete(upstreamResponse)
            if (!response.writableEnded && !response.destroyed)
              response.destroy()
            finish()
          })
          upstreamResponse.once('error', () => {
            if (!response.headersSent)
              sendHttpFailure(response, workbenchFailure('upstream-reset'))
            else response.destroy()
            finish()
          })
          upstreamResponse.pipe(response)
        })
        upstreamRequest.once('error', (error) => {
          cleanupRequest()
          sendHttpFailure(
            response,
            workbenchFailure(
              shuttingDown ? 'manager-shutdown' : classifyHttpError(error)
            )
          )
          finish()
        })
        upstreamRequest.once('close', cleanupRequest)
        request.once('aborted', () => upstreamRequest?.destroy())
        response.once('close', () => {
          if (!response.writableEnded) upstreamRequest?.destroy()
        })
        controller.signal.addEventListener(
          'abort',
          () => upstreamRequest?.destroy(),
          { once: true }
        )
        request.pipe(upstreamRequest)
      })
      emit({
        event: 'workbench.proxy.completed',
        projectId: route.projectId,
        transport: 'http',
        elapsedMs: now() - startedAt,
      })
    } catch (error) {
      const failure = failureFrom(error)
      sendHttpFailure(response, failure)
      emit({
        event: 'workbench.proxy.failed',
        projectId: route.projectId,
        transport: 'http',
        elapsedMs: now() - startedAt,
        classification: failure.category,
      })
    } finally {
      pending.delete(controller)
    }
  }

  const waitForWritable = async (target: WebSocket): Promise<void> => {
    const deadline = now() + headerTimeoutMs
    while (target.bufferedAmount > 64 * 1024) {
      if (target.readyState !== WebSocket.OPEN || now() >= deadline)
        throw new Error('WebSocket backpressure timed out')
      await new Promise((resolve) => setTimeout(resolve, 2))
    }
  }

  const forwardMessage = async (
    target: WebSocket,
    data: RawData,
    binary: boolean
  ): Promise<void> => {
    await waitForWritable(target)
    await new Promise<void>((resolve, reject) =>
      target.send(data, { binary }, (error) =>
        error ? reject(error) : resolve()
      )
    )
  }

  const bridge = (left: WebSocket, right: WebSocket): void => {
    webSockets.add(left)
    webSockets.add(right)
    let leftQueue = Promise.resolve()
    let rightQueue = Promise.resolve()
    const cleanup = (): void => {
      if (left.readyState === WebSocket.CLOSED) webSockets.delete(left)
      if (right.readyState === WebSocket.CLOSED) webSockets.delete(right)
    }
    left.on('message', (data, binary) => {
      leftQueue = leftQueue
        .then(() => forwardMessage(right, data, binary))
        .catch(() => right.terminate())
    })
    right.on('message', (data, binary) => {
      rightQueue = rightQueue
        .then(() => forwardMessage(left, data, binary))
        .catch(() => left.terminate())
    })
    left.on('ping', (data) => {
      if (right.readyState === WebSocket.OPEN) right.ping(data)
    })
    right.on('ping', (data) => {
      if (left.readyState === WebSocket.OPEN) left.ping(data)
    })
    left.on('pong', (data) => {
      if (right.readyState === WebSocket.OPEN) right.pong(data)
    })
    right.on('pong', (data) => {
      if (left.readyState === WebSocket.OPEN) left.pong(data)
    })
    left.on('close', (code, reason) => {
      recordWebSocketDiagnostic({ side: 'downstream', event: 'close', code })
      if (right.readyState === WebSocket.OPEN) {
        if (code === 1006) right.terminate()
        else right.close(code, reason)
      }
      cleanup()
    })
    right.on('close', (code, reason) => {
      recordWebSocketDiagnostic({ side: 'upstream', event: 'close', code })
      if (left.readyState === WebSocket.OPEN) {
        if (code === 1006) left.terminate()
        else left.close(code, reason)
      }
      cleanup()
    })
    left.on('error', (error) => {
      recordWebSocketDiagnostic({
        side: 'downstream',
        event: 'error',
        classification: error.name,
      })
      if (right.readyState < WebSocket.CLOSING) right.terminate()
    })
    right.on('error', (error) => {
      recordWebSocketDiagnostic({
        side: 'upstream',
        event: 'error',
        classification:
          error.name +
          ':' +
          ((error as NodeJS.ErrnoException).code ?? 'unknown'),
      })
      if (left.readyState < WebSocket.CLOSING) left.terminate()
    })
  }

  const handleUpgrade = async (
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
    route: StableWorkbenchRoute
  ): Promise<void> => {
    const startedAt = now()
    const controller = new AbortController()
    pending.add(controller)
    rawSockets.add(socket)
    socket.once('close', () => rawSockets.delete(socket))
    emit({
      event: 'workbench.proxy.started',
      projectId: route.projectId,
      transport: 'websocket',
      elapsedMs: 0,
    })
    let upstream: WebSocket | undefined
    try {
      const target = await resolveTarget(route, controller.signal)
      if (shuttingDown) throw new RuntimeFailure('manager-shutdown')
      const wsUrl = new URL(route.upstreamPath, target)
      wsUrl.protocol = 'ws:'
      const headers = filterWorkbenchHeaders(request.headers, {
        request: true,
        upgrade: true,
      })
      delete headers.connection
      delete headers.upgrade
      delete headers['sec-websocket-key']
      delete headers['sec-websocket-version']
      delete headers['sec-websocket-protocol']
      delete headers['sec-websocket-extensions']
      addTrustedOriginHeaders(headers, request, route.prefix)
      const websocketHeaders = Object.fromEntries(
        Object.entries(headers).map(([name, value]) => [
          name,
          Array.isArray(value)
            ? value.join(name === 'cookie' ? '; ' : ', ')
            : value,
        ])
      )
      try {
        upstream = new WebSocket(wsUrl, {
          headers: websocketHeaders,
          perMessageDeflate: false,
        })
      } catch (error) {
        const failure = error as NodeJS.ErrnoException
        recordWebSocketDiagnostic({
          side: 'upstream',
          event: 'error',
          classification:
            'construction-' + failure.name + ':' + (failure.code ?? 'unknown'),
        })
        throw error
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(workbenchFailure('websocket-timeout')),
          headerTimeoutMs
        )
        const done = (action: () => void): void => {
          clearTimeout(timer)
          action()
        }
        upstream?.once('open', () => done(resolve))
        upstream?.once('unexpected-response', (_request, response) => {
          response.resume()
          recordWebSocketDiagnostic({
            side: 'upstream',
            event: 'error',
            classification:
              'handshake-status-' + String(response.statusCode ?? 0),
          })
          done(() => reject(workbenchFailure('websocket-refused')))
        })
        upstream?.once('error', (error) => {
          recordWebSocketDiagnostic({
            side: 'upstream',
            event: 'error',
            classification:
              'handshake-' +
              error.name +
              ':' +
              ((error as NodeJS.ErrnoException).code ?? 'unknown'),
          })
          done(() => reject(workbenchFailure('websocket-refused')))
        })
        socket.once('close', () =>
          done(() => reject(new RuntimeFailure('caller-cancelled')))
        )
        controller.signal.addEventListener(
          'abort',
          () => done(() => reject(new RuntimeFailure('manager-shutdown'))),
          { once: true }
        )
      })
      if (socket.destroyed || shuttingDown)
        throw new RuntimeFailure(
          shuttingDown ? 'manager-shutdown' : 'caller-cancelled'
        )
      await new Promise<void>((resolve, reject) => {
        downstreamServer.handleUpgrade(request, socket, head, (downstream) => {
          bridge(downstream, upstream as WebSocket)
          resolve()
        })
        socket.once('error', reject)
      })
      emit({
        event: 'workbench.proxy.completed',
        projectId: route.projectId,
        transport: 'websocket',
        elapsedMs: now() - startedAt,
      })
    } catch (error) {
      upstream?.terminate()
      const failure = failureFrom(error)
      sendUpgradeFailure(socket, failure)
      emit({
        event: 'workbench.proxy.failed',
        projectId: route.projectId,
        transport: 'websocket',
        elapsedMs: now() - startedAt,
        classification: failure.category,
      })
    } finally {
      pending.delete(controller)
    }
  }

  const shutdown = (): Promise<WorkbenchProxyAudit> => {
    shutdownPromise ??= (async () => {
      shuttingDown = true
      for (const controller of pending) controller.abort()
      for (const request of httpRequests) request.destroy()
      for (const response of httpResponses) response.destroy()
      for (const webSocket of webSockets) webSocket.terminate()
      for (const socket of rawSockets) socket.destroy()
      const deadline = now() + shutdownTimeoutMs
      while (
        (pending.size > 0 ||
          httpRequests.size > 0 ||
          httpResponses.size > 0 ||
          webSockets.size > 0 ||
          rawSockets.size > 0) &&
        now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      for (const webSocket of webSockets) webSocket.terminate()
      for (const socket of rawSockets) socket.destroy()
      webSockets.clear()
      rawSockets.clear()
      return audit()
    })()
    return shutdownPromise
  }

  return { handleHttp, handleUpgrade, shutdown, audit }
}
