import { createHash } from 'node:crypto'
import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
  type Server,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  deriveProjectOwnerToken,
  stableProjectRoute,
} from '../src/project-runtime-contract.js'
import { RuntimeFailure } from '../src/project-runtime-contract.js'
import type { ProjectRuntimeManager } from '../src/project-runtime-manager.js'
import { mergeWorkbenchRouteEvidence } from '../src/workbench-route-evidence.js'
import {
  validateWorkbenchRouteHeaderMatrix,
  WORKBENCH_HOP_BY_HOP_HEADERS,
} from '../src/workbench-proxy-contract.js'
import { createWorkbenchProxyManager } from '../src/workbench-proxy-manager.js'

const project = {
  id: 'http-project',
  name: 'HTTP',
  canonicalPath: '/safe/http',
  createdAt: 1,
}
const binaryInput = Buffer.alloc(257 * 1024)
for (let index = 0; index < binaryInput.length; index += 1)
  binaryInput[index] = (index * 31 + 7) % 256
const binaryDigest = createHash('sha256').update(binaryInput).digest('hex')
const streamChunks = Array.from({ length: 32 }, (_, index) =>
  Buffer.alloc(16 * 1024, index)
)
const streamDigest = createHash('sha256')
  .update(Buffer.concat(streamChunks))
  .digest('hex')

interface ResponseRecord {
  status: number
  headers: IncomingHttpHeaders
  body: Buffer
}
const controllers: ApiServerController[] = []
const servers: Server[] = []
afterEach(async () => {
  await Promise.all(
    controllers.splice(0).map((controller) => controller.stop())
  )
  await Promise.all(
    servers.splice(0).map(async (server) => {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    })
  )
})

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  servers.push(server)
  return (server.address() as AddressInfo).port
}

const api = async (
  upstreamPort: number
): Promise<{ port: number; runtime: ProjectRuntimeManager }> => {
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
    pid: 7001,
    processStartTime: 'start-1',
    internalUrl: `http://127.0.0.1:${upstreamPort}`,
    port: upstreamPort,
    canonicalPath: project.canonicalPath,
    stableRoute: stableProjectRoute(project.id),
    ownerToken: deriveProjectOwnerToken(project.id),
    startedAt: 1,
    elapsedMs: 2,
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
    createProjectRegistration: async () => ({
      register: vi.fn(),
      close: vi.fn(),
    }),
  })
  controllers.push(controller)
  const app = await controller.start()
  return { port: (app.server.address() as AddressInfo).port, runtime }
}

const perform = async (
  port: number,
  path: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: Buffer
  } = {}
): Promise<ResponseRecord> =>
  new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          })
        )
      }
    )
    request.once('error', reject)
    if (options.body) request.write(options.body)
    request.end()
  })

describe('stable workbench HTTP transport', () => {
  it('executes the exact nested, HEAD, 257 KiB, and range payload matrix', async () => {
    const observed: Array<{
      method?: string
      url?: string
      host?: string
      digest?: string
    }> = []
    const upstreamPort = await listen(
      createServer((request, response) => {
        const chunks: Buffer[] = []
        request.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        request.on('end', () => {
          const body = Buffer.concat(chunks)
          observed.push({
            method: request.method,
            url: request.url,
            host: request.headers.host,
            digest: createHash('sha256').update(body).digest('hex'),
          })
          if (request.url === '/assets/main.txt?x=1') {
            response.writeHead(200, {
              'content-type': 'text/plain',
              'content-length': String(Buffer.byteLength('nested asset')),
              'cache-control': 'public,max-age=60',
              etag: 'matrix-tag',
            })
            response.end('nested asset')
          } else if (request.method === 'HEAD') {
            response.writeHead(200, {
              'content-length': '12',
              etag: 'head-tag',
            })
            response.end()
          } else if (request.method === 'POST') {
            response.writeHead(201, {
              'content-length': String(body.length),
              'content-type': 'application/octet-stream',
            })
            response.end(body)
          } else {
            response.writeHead(206, {
              'content-range': 'bytes 4-9/16',
              'accept-ranges': 'bytes',
              'content-length': '6',
            })
            response.end(Buffer.from('456789'))
          }
        })
      })
    )
    const { port } = await api(upstreamPort)
    const prefix = `/projects/${project.id}/workbench`
    const nested = await perform(port, prefix + '/assets/main.txt?x=1')
    expect(nested).toMatchObject({ status: 200 })
    expect(nested.body.toString()).toBe('nested asset')
    expect(nested.headers).toMatchObject({
      'content-type': 'text/plain',
      'cache-control': 'public,max-age=60',
      etag: 'matrix-tag',
    })
    expect(nested.headers['content-length']).toBeUndefined()
    expect(nested.headers['transfer-encoding']).toBe('chunked')
    const head = await perform(port, prefix + '/head', { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.body).toHaveLength(0)
    expect(head.headers['content-length']).toBe('12')
    const posted = await perform(port, prefix + '/echo', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(binaryInput.length),
      },
      body: binaryInput,
    })
    expect(posted.status).toBe(201)
    expect(Number(posted.headers['content-length'])).toBe(binaryInput.length)
    expect(createHash('sha256').update(posted.body).digest('hex')).toBe(
      binaryDigest
    )
    const ranged = await perform(port, prefix + '/range', {
      headers: { range: 'bytes=4-9' },
    })
    expect(ranged.status).toBe(206)
    expect(ranged.headers['content-range']).toBe('bytes 4-9/16')
    expect(ranged.headers['accept-ranges']).toBe('bytes')
    expect(ranged.headers['content-length']).toBe('6')
    expect(ranged.body.toString()).toBe('456789')
    expect(observed.map((entry) => entry.url)).toEqual([
      '/assets/main.txt?x=1',
      '/head',
      '/echo',
      '/range',
    ])
    expect(observed[2].digest).toBe(binaryDigest)
    expect(new Set(observed.map((entry) => entry.host))).toEqual(
      new Set([`127.0.0.1:${port}`])
    )
    await mergeWorkbenchRouteEvidence({
      matrices: [
        {
          id: 'V-3',
          declaration: {
            binaryBytes: binaryInput.length,
            expectedBinaryDigest: binaryDigest,
          },
          rows: [
            {
              method: 'GET',
              status: nested.status,
              headers: nested.headers,
              bodyBytes: nested.body.length,
            },
            {
              method: 'HEAD',
              status: head.status,
              headers: head.headers,
              bodyBytes: head.body.length,
            },
            {
              method: 'POST',
              status: posted.status,
              headers: posted.headers,
              bodyBytes: posted.body.length,
              actualDigest: createHash('sha256')
                .update(posted.body)
                .digest('hex'),
            },
            {
              method: 'GET-range',
              status: ranged.status,
              headers: ranged.headers,
              bodyBytes: ranged.body.length,
            },
          ],
          upstreamObservations: observed,
        },
      ],
      cleanup: { payloadObservedRequests: observed.length },
      residualAudit: {},
    })
  })

  it('flushes a complete transformed textual asset before settling', async () => {
    let upstreamPort = 0
    const sourcePrefix = 'const payload = ' + 'x'.repeat(2 * 1024 * 1024)
    const upstream = createServer((_request, response) => {
      const source =
        sourcePrefix +
        '; // http://127.0.0.1:' +
        String(upstreamPort) +
        '/asset'
      response.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'content-length': String(Buffer.byteLength(source)),
      })
      response.end(source)
    })
    upstreamPort = await listen(upstream)
    const { port } = await api(upstreamPort)
    const route = '/projects/' + project.id + '/workbench/'
    const result = await perform(port, route + 'large.js')
    const expected =
      sourcePrefix + '; // http://127.0.0.1:' + String(port) + route + 'asset'
    expect(result.status).toBe(200)
    expect(result.headers['content-length']).toBeUndefined()
    expect(result.body.length).toBe(Buffer.byteLength(expected))
    expect(createHash('sha256').update(result.body).digest('hex')).toBe(
      createHash('sha256').update(expected).digest('hex')
    )
  })

  it('preserves Content-Length only for byte-identical encoded responses', async () => {
    const encodedBody = gzipSync(
      Buffer.from('encoded textual response with byte-identical framing')
    )
    const upstreamPort = await listen(
      createServer((_request, response) => {
        response.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          'content-encoding': 'gzip',
          'content-length': String(encodedBody.length),
        })
        response.end(encodedBody)
      })
    )
    const { port } = await api(upstreamPort)
    const result = await perform(
      port,
      '/projects/' + project.id + '/workbench/encoded'
    )
    expect(result.headers['content-encoding']).toBe('gzip')
    expect(result.headers['content-length']).toBe(String(encodedBody.length))
    expect(result.body).toEqual(encodedBody)
  })

  it('rewrites redirects, cookies, service-worker scope, and target headers', async () => {
    const observedHosts: string[] = []
    let upstreamPort = 0
    upstreamPort = await listen(
      createServer((request, response) => {
        observedHosts.push(String(request.headers.host))
        expect(request.headers.forwarded).toBeUndefined()
        expect(request.headers['x-forwarded-host']).not.toBe('attacker')
        expect(request.headers['x-forwarded-proto']).toBe('http')
        expect(request.headers['x-forwarded-prefix']).toBe(
          `/projects/${project.id}/workbench/`
        )
        expect(request.headers['x-proxy-target']).toBeUndefined()
        if (request.url === '/relative')
          response.writeHead(302, { location: '/login?x=1' }).end()
        else if (request.url === '/absolute')
          response
            .writeHead(302, {
              location: `http://127.0.0.1:${upstreamPort}/login?x=2`,
            })
            .end()
        else if (request.url === '/external')
          response
            .writeHead(302, { location: 'https://different.example/login' })
            .end()
        else
          response
            .writeHead(200, {
              'set-cookie': [
                'root=1; Path=/; Domain=localhost; Secure; HttpOnly; SameSite=Lax',
                'foo=1; Path=/foo',
                'none=1; HttpOnly',
              ],
              'service-worker-allowed': '/',
              'x-end-to-end': 'kept',
              connection: 'x-remove',
              'x-remove': 'gone',
            })
            .end('ok')
      })
    )
    const { port } = await api(upstreamPort)
    const prefix = `/projects/${project.id}/workbench/`
    expect((await perform(port, prefix + 'relative')).headers.location).toBe(
      prefix + 'login?x=1'
    )
    expect((await perform(port, prefix + 'absolute')).headers.location).toBe(
      prefix + 'login?x=2'
    )
    const external = await perform(port, prefix + 'external')
    expect(external.status).toBe(502)
    expect(JSON.parse(external.body.toString())).toEqual({
      error: {
        code: 'workbench_redirect_rejected',
        message: 'Workbench redirect target was rejected.',
      },
    })
    const headers = await perform(port, prefix + 'headers', {
      headers: {
        host: 'attacker.invalid',
        forwarded: 'for=attacker',
        'x-forwarded-host': 'attacker',
        'x-proxy-target': 'http://attacker',
      },
    })
    expect(headers.headers['set-cookie']).toEqual([
      `root=1; Path=${prefix}; Secure; HttpOnly; SameSite=Lax`,
      `foo=1; Path=${prefix}foo`,
      `none=1; HttpOnly; Path=${prefix}`,
    ])
    expect(headers.headers['service-worker-allowed']).toBe(prefix)
    expect(headers.headers['x-end-to-end']).toBe('kept')
    expect(headers.headers['x-remove']).toBeUndefined()
    expect(new Set(observedHosts)).toEqual(new Set([`127.0.0.1:${port}`]))
  })

  it('strips every required hop header bidirectionally through the stable route', async () => {
    const requestObservations = new Map<string, string | undefined>()
    const requestConnectionToken = 'x-bl011-request-connection-token'
    const responseConnectionToken = 'x-bl011-response-connection-token'
    const requestValue = (name: string): string =>
      name === 'connection'
        ? requestConnectionToken
        : name === 'transfer-encoding'
          ? 'gzip, chunked'
          : 'bl011-request-' + name
    const responseValue = (name: string): string =>
      name === 'connection'
        ? responseConnectionToken
        : name === 'transfer-encoding'
          ? 'gzip, chunked'
          : 'bl011-response-' + name
    const upstreamPort = await listen(
      createServer((request, response) => {
        const name = request.url?.slice(1) ?? ''
        requestObservations.set(
          requestConnectionToken,
          Array.isArray(request.headers[requestConnectionToken])
            ? request.headers[requestConnectionToken]?.join(', ')
            : request.headers[requestConnectionToken]
        )
        requestObservations.set(
          name,
          Array.isArray(request.headers[name])
            ? request.headers[name]?.join(', ')
            : request.headers[name]
        )
        const headers: Record<string, string> = {
          'content-type': 'application/octet-stream',
          'content-length': '2',
          [name]: responseValue(name),
        }
        if (name === 'connection')
          headers[responseConnectionToken] = 'remove-response-extension'
        if (name === 'transfer-encoding' || name === 'trailer') {
          delete headers['content-length']
          headers['transfer-encoding'] =
            name === 'transfer-encoding' ? responseValue(name) : 'chunked'
        }
        response.writeHead(200, headers)
        response.end('ok')
      })
    )
    const { port } = await api(upstreamPort)
    const prefix = `/projects/${project.id}/workbench/`
    const requestCases: Array<Record<string, unknown>> = []
    const responseCases: Array<Record<string, unknown>> = []
    let requestConnectionTokenRemoved = false
    let responseConnectionTokenRemoved = false
    for (const name of WORKBENCH_HOP_BY_HOP_HEADERS) {
      const injectedRequestValue = requestValue(name)
      const headers: Record<string, string> = {
        [name]: injectedRequestValue,
      }
      if (name === 'connection')
        headers[requestConnectionToken] = 'remove-request-extension'
      else headers.connection = 'close'
      if (name === 'trailer') headers['transfer-encoding'] = 'chunked'
      const result = await perform(port, prefix + name, { headers })
      const observedRequest = requestObservations.get(name)
      const observedResponse = result.headers[name]
      expect(result.status).toBe(200)
      expect(result.body.toString()).toBe('ok')
      expect(observedRequest).not.toBe(injectedRequestValue)
      expect(observedResponse).not.toBe(responseValue(name))
      if (!['connection', 'transfer-encoding'].includes(name)) {
        expect(observedRequest).toBeUndefined()
        expect(observedResponse).toBeUndefined()
      }
      if (name === 'connection') {
        requestConnectionTokenRemoved =
          requestObservations.get(requestConnectionToken) === undefined
        responseConnectionTokenRemoved =
          result.headers[responseConnectionToken] === undefined
      }
      requestCases.push({
        name,
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: observedRequest !== injectedRequestValue,
      })
      responseCases.push({
        name,
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: observedResponse !== responseValue(name),
      })
    }
    const matrix = {
      id: 'V-4',
      transport: 'stable-route-fake-upstream',
      requestCases,
      responseCases,
      requestConnectionToken: {
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: requestConnectionTokenRemoved,
      },
      responseConnectionToken: {
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: responseConnectionTokenRemoved,
      },
    }
    expect(validateWorkbenchRouteHeaderMatrix(matrix)).toBe(true)
    await mergeWorkbenchRouteEvidence({
      matrices: [matrix],
      cleanup: {
        headerRouteCaseCount: requestCases.length + responseCases.length,
      },
      residualAudit: {},
    })
  })

  it('streams 32 by 16 KiB under delayed consumption and propagates a post-chunk-5 abort', async () => {
    let abortedUpstream = false
    const upstreamPort = await listen(
      createServer((request, response) => {
        let index = 0
        const timer = setInterval(() => {
          if (index === streamChunks.length) {
            clearInterval(timer)
            response.end()
            return
          }
          response.write(streamChunks[index])
          index += 1
        }, 2)
        request.once('close', () => {
          if (!response.writableEnded) {
            abortedUpstream = true
            clearInterval(timer)
          }
        })
      })
    )
    const { port, runtime } = await api(upstreamPort)
    const path = `/projects/${project.id}/workbench/stream`
    const complete = await new Promise<Buffer>((resolve, reject) => {
      httpRequest({ host: '127.0.0.1', port, path }, (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => {
          response.pause()
          chunks.push(Buffer.from(chunk))
          setTimeout(() => response.resume(), 1)
        })
        response.on('end', () => resolve(Buffer.concat(chunks)))
      })
        .once('error', reject)
        .end()
    })
    expect(complete).toHaveLength(32 * 16 * 1024)
    expect(createHash('sha256').update(complete).digest('hex')).toBe(
      streamDigest
    )
    await new Promise<void>((resolve, reject) => {
      const request = httpRequest(
        { host: '127.0.0.1', port, path },
        (response) => {
          let chunks = 0
          response.on('data', () => {
            chunks += 1
            if (chunks === 5) {
              request.destroy()
              resolve()
            }
          })
        }
      )
      request.once('error', (error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET')
          reject(error)
      })
      request.end()
    })
    await vi.waitFor(() => expect(abortedUpstream).toBe(true))
    expect(runtime.inspect(project.id)).toMatchObject({
      state: 'running',
      pid: 7001,
    })
  })

  it('maps lookup, runtime, invariant, connect, and header-timeout faults exactly', async () => {
    const stalledPort = await listen(createServer())
    const resetPort = await listen(
      createServer((request) => request.socket.destroy())
    )
    const library: ProjectLibrary = {
      create: vi.fn(),
      findById: vi.fn(async (id) => {
        if (id === 'unknown') return undefined
        if (id === 'persistence') throw new Error('private database detail')
        return { ...project, id, canonicalPath: '/safe/' + id }
      }),
      list: vi.fn(async () => []),
      closeProject: vi.fn(),
      close: vi.fn(),
    }
    const runtime: ProjectRuntimeManager = {
      start: vi.fn(async ({ projectId, canonicalPath }) => {
        if (projectId === 'runtime-shutdown')
          throw new RuntimeFailure('manager-shutdown')
        if (projectId === 'runtime-timeout')
          throw new RuntimeFailure('readiness-timeout')
        if (projectId === 'runtime-error') throw new Error('private runtime')
        if (projectId === 'bad-state')
          return {
            projectId,
            state: 'stopped' as const,
            pid: null,
            processStartTime: null,
            internalUrl: null,
            port: null,
            canonicalPath,
            stableRoute: stableProjectRoute(projectId),
            ownerToken: deriveProjectOwnerToken(projectId),
            startedAt: null,
            elapsedMs: 0,
          }
        const port =
          projectId === 'header-timeout'
            ? stalledPort
            : projectId === 'reset'
              ? resetPort
              : 1
        return {
          projectId,
          state: 'running' as const,
          pid: 99,
          processStartTime: 'safe',
          internalUrl:
            projectId === 'bad-target'
              ? 'http://localhost:' + String(port)
              : 'http://127.0.0.1:' + String(port),
          port,
          canonicalPath,
          stableRoute: stableProjectRoute(projectId),
          ownerToken: deriveProjectOwnerToken(projectId),
          startedAt: 1,
          elapsedMs: 0,
        }
      }),
      ownsSnapshot: vi.fn(() => true),
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
          headerTimeoutMs: 25,
        }),
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    controllers.push(controller)
    const app = await controller.start()
    const port = (app.server.address() as AddressInfo).port
    const cases = [
      ['unknown', 404, 'project_not_found'],
      ['persistence', 503, 'project_lookup_unavailable'],
      ['runtime-shutdown', 503, 'workbench_shutting_down'],
      ['runtime-timeout', 504, 'workbench_readiness_timeout'],
      ['runtime-error', 502, 'workbench_upstream_connect_failed'],
      ['bad-state', 502, 'workbench_runtime_project_mismatch'],
      ['bad-target', 502, 'workbench_runtime_project_mismatch'],
      ['connect', 502, 'workbench_upstream_connect_failed'],
      ['reset', 502, 'workbench_upstream_reset'],
      ['header-timeout', 504, 'workbench_upstream_timeout'],
    ] as const
    for (const [id, status, code] of cases) {
      const response = await perform(
        port,
        '/projects/' + id + '/workbench/fault'
      )
      expect(response.status).toBe(status)
      expect(JSON.parse(response.body.toString())).toMatchObject({
        error: { code },
      })
      expect(response.body.toString()).not.toContain('private')
    }
  })

  it('refuses partial or misaligned trusted front-door headers before runtime start', async () => {
    const upstreamPort = await listen(createServer())
    const owned = await api(upstreamPort)
    for (const headers of [
      { 'x-ascend-front-door-token': 'wrong-but-bounded-token' },
      {
        'x-ascend-front-door-token': 'ascend-development-front-door-v1',
        'x-ascend-front-door-authority': 'invalid.example:5173',
      },
    ]) {
      const response = await perform(
        owned.port,
        '/projects/http-project/workbench/refused',
        { headers }
      )
      expect(response.status).toBe(502)
      expect(JSON.parse(response.body.toString())).toMatchObject({
        error: { code: 'workbench_upstream_invalid_response' },
      })
    }
    expect(owned.runtime.start).not.toHaveBeenCalled()
  })
})
