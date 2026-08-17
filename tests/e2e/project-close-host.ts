import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rm, stat } from 'node:fs/promises'
import http from 'node:http'
import { createServer, Socket } from 'node:net'
import path from 'node:path'

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..')
export const BROWSER_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020/browser'
)
export const WEB_BUILD_ROOT = path.join(REPOSITORY_ROOT, 'apps/web/dist')
export const COMPILED_SERVER = path.join(
  REPOSITORY_ROOT,
  'apps/api/dist/server.js'
)
export const BROWSER_EPISODE_PATH = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-020/browser-episode.json'
)

const READY_TIMEOUT_MS = 30_000

export async function disposablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('port allocation failed')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
  return address.port
}

export interface CompiledApi {
  readonly process: ChildProcessWithoutNullStreams
  readonly port: number
  readonly origin: string
  readonly token: string
  readonly logs: string[]
}

/** Boots the repository's compiled API entry point, never an in-process app. */
export async function startCompiledApi(input: {
  readonly databasePath: string
  readonly projectRoot: string
}): Promise<CompiledApi> {
  await stat(COMPILED_SERVER)
  const port = await disposablePort()
  const token = 'ascend-bl020-browser-' + randomUUID().replace(/-/gu, '')
  const child = spawn(process.execPath, [COMPILED_SERVER], {
    cwd: REPOSITORY_ROOT,
    detached: true,
    env: {
      ...process.env,
      ASCEND_HOST: '127.0.0.1',
      ASCEND_PORT: String(port),
      ASCEND_DATABASE_URL: input.databasePath,
      ASCEND_PROJECT_HOME: input.projectRoot,
      ASCEND_PROJECT_ALLOWED_ROOTS: input.projectRoot,
      ASCEND_FRONT_DOOR_TOKEN: token,
      EXTENSIONS_GALLERY: '{}',
    },
    stdio: 'pipe',
  })
  const logs: string[] = []
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (value: string) => logs.push(value))
  child.stderr.on('data', (value: string) => logs.push(value))
  const origin = 'http://127.0.0.1:' + String(port)
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error('the compiled API exited: ' + logs.join(''))
    try {
      const response = await fetch(origin + '/api/projects', {
        signal: AbortSignal.timeout(500),
      })
      if (response.ok) return { process: child, port, origin, token, logs }
    } catch {
      /* bounded readiness retry against the real listener */
    }
    await delay(50)
  }
  throw new Error('the compiled API never became ready: ' + logs.join(''))
}

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function stopCompiledApi(api: CompiledApi): Promise<void> {
  if (api.process.exitCode !== null) return
  const pid = api.process.pid
  if (pid === undefined) return
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    /* the generation already exited */
  }
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline && api.process.exitCode === null) await delay(50)
  if (api.process.exitCode === null) {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      /* the generation exited between the two removals */
    }
  }
}

const CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
})

export interface BrowserHostFaults {
  /** Project ids whose close response the host holds back, in milliseconds. */
  readonly slowCloses: Map<string, number>
  /** Project ids whose close response never reaches the browser. */
  readonly severedCloses: Set<string>
}

export interface BrowserHost {
  readonly origin: string
  readonly faults: BrowserHostFaults
  readonly closeRequests: string[]
  stop(): Promise<void>
}

/**
 * Serves the repository's compiled web build to a real browser and forwards
 * every `/api` and `/projects` exchange to the compiled API, marking the front
 * door exactly as the delivered development host does.
 *
 * The host may hold back or sever a *response* on its own side of the wire.
 * The request itself is always delivered, so the close authority the browser
 * reaches is the compiled product and nothing else.
 */
export async function startBrowserHost(api: CompiledApi): Promise<BrowserHost> {
  await stat(path.join(WEB_BUILD_ROOT, 'index.html'))
  const faults: BrowserHostFaults = {
    slowCloses: new Map<string, number>(),
    severedCloses: new Set<string>(),
  }
  const closeRequests: string[] = []
  const sockets = new Set<Socket>()

  const proxied = (url: string): boolean =>
    url.startsWith('/api/') || url === '/api' || url.startsWith('/projects/')

  const closedProjectId = (method: string, url: string): string | null => {
    if (method !== 'DELETE' || !url.startsWith('/api/projects/')) return null
    const id = url.slice('/api/projects/'.length)
    return id.length === 0 ? null : id
  }

  const server = http.createServer((request, response) => {
    const url = request.url ?? '/'
    if (!proxied(url)) {
      serveStatic(url, response)
      return
    }
    const closing = closedProjectId(request.method ?? 'GET', url)
    if (closing !== null) closeRequests.push(closing)
    const upstream = http.request(
      {
        host: '127.0.0.1',
        port: api.port,
        method: request.method,
        path: url,
        headers: {
          ...request.headers,
          host: '127.0.0.1:' + String(api.port),
          'x-ascend-front-door-authority': request.headers.host ?? '127.0.0.1',
          'x-ascend-front-door-token': api.token,
        },
      },
      (upstreamResponse) => {
        const chunks: Buffer[] = []
        upstreamResponse.on('data', (chunk: Buffer) => chunks.push(chunk))
        upstreamResponse.on('end', () => {
          const settle = (): void => {
            if (closing !== null && faults.severedCloses.has(closing)) {
              request.socket.destroy()
              return
            }
            response.writeHead(
              upstreamResponse.statusCode ?? 502,
              upstreamResponse.headers
            )
            response.end(Buffer.concat(chunks))
          }
          const held =
            closing === null ? undefined : faults.slowCloses.get(closing)
          if (held === undefined) settle()
          else setTimeout(settle, held)
        })
      }
    )
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(502)
      response.end()
    })
    request.pipe(upstream)
  })

  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  server.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '/'
    const upstream = http.request({
      host: '127.0.0.1',
      port: api.port,
      method: request.method,
      path: url,
      headers: {
        ...request.headers,
        host: '127.0.0.1:' + String(api.port),
        'x-ascend-front-door-authority': request.headers.host ?? '127.0.0.1',
        'x-ascend-front-door-token': api.token,
      },
    })
    upstream.on('upgrade', (upstreamResponse, upstreamSocket, upstreamHead) => {
      const headers = Object.entries(upstreamResponse.headers)
        .map(([key, value]) => key + ': ' + String(value) + '\r\n')
        .join('')
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' + headers + '\r\n')
      if (upstreamHead.length > 0) socket.unshift(upstreamHead)
      upstreamSocket.on('error', () => socket.destroy())
      socket.on('error', () => upstreamSocket.destroy())
      upstreamSocket.pipe(socket)
      socket.pipe(upstreamSocket)
    })
    upstream.on('response', () => socket.destroy())
    upstream.on('error', () => socket.destroy())
    if (head.length > 0) upstream.write(head)
    upstream.end()
  })

  const port = await disposablePort()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return {
    origin: 'http://127.0.0.1:' + String(port),
    faults,
    closeRequests,
    async stop() {
      for (const socket of sockets) socket.destroy()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

function serveStatic(url: string, response: http.ServerResponse): void {
  const requested = url.split('?')[0] ?? '/'
  const relative = requested === '/' ? 'index.html' : requested.slice(1)
  const resolved = path.resolve(WEB_BUILD_ROOT, relative)
  const target = resolved.startsWith(WEB_BUILD_ROOT + path.sep)
    ? resolved
    : path.join(WEB_BUILD_ROOT, 'index.html')
  stat(target)
    .then((entry) => {
      const file = entry.isFile()
        ? target
        : path.join(WEB_BUILD_ROOT, 'index.html')
      response.writeHead(200, {
        'content-type':
          CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      createReadStream(file).pipe(response)
    })
    .catch(() => {
      response.writeHead(200, { 'content-type': CONTENT_TYPES['.html']! })
      createReadStream(path.join(WEB_BUILD_ROOT, 'index.html')).pipe(response)
    })
}

export interface RegisteredProject {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
}

export async function registerProject(
  api: CompiledApi,
  canonicalPath: string
): Promise<RegisteredProject> {
  const response = await fetch(api.origin + '/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: canonicalPath }),
  })
  const body = (await response.json()) as {
    readonly project?: { readonly id: string; readonly name: string }
  }
  if (!response.ok || body.project === undefined)
    throw new Error(
      'registration refused with status ' + String(response.status)
    )
  return {
    id: body.project.id,
    name: body.project.name,
    canonicalPath,
  }
}

/** Starts one real workbench runtime through the compiled stable route. */
export async function startRuntime(
  api: CompiledApi,
  project: RegisteredProject
): Promise<void> {
  const shell = await fetch(
    api.origin + '/projects/' + project.id + '/workbench/',
    { headers: { accept: 'text/html' } }
  )
  await shell.text()
  if (!shell.ok)
    throw new Error(
      'the stable route refused navigation with status ' + String(shell.status)
    )
  const document = await fetch(
    api.origin + '/projects/' + project.id + '/workbench/',
    {
      headers: {
        accept: 'text/html',
        'x-ascend-workbench-document': '1',
      },
    }
  )
  await document.text()
  if (!document.ok)
    throw new Error(
      'the stable route refused the workbench document with status ' +
        String(document.status)
    )
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if ((await runtimeState(api, project)) === 'Running') return
    await delay(100)
  }
  throw new Error('the runtime never reached Running')
}

export async function runtimeState(
  api: CompiledApi,
  project: RegisteredProject
): Promise<string | null> {
  const response = await fetch(api.origin + '/api/projects/runtime')
  if (!response.ok) return null
  const body = (await response.json()) as {
    readonly runtimes?: readonly {
      readonly id: string
      readonly state: string
    }[]
  }
  const entry = (body.runtimes ?? []).find((row) => row.id === project.id)
  return entry === undefined ? null : entry.state
}

export async function registrationPresent(
  api: CompiledApi,
  project: RegisteredProject
): Promise<boolean> {
  const response = await fetch(api.origin + '/api/projects')
  const body = (await response.json()) as {
    readonly projects?: readonly { readonly id: string }[]
  }
  return (body.projects ?? []).some((row) => row.id === project.id)
}

export interface WorkbenchIdentity {
  readonly pid: number
  readonly port: number
}

/** Finds the real workbench process the compiled server started. */
export async function discoverWorkbench(
  project: RegisteredProject
): Promise<WorkbenchIdentity> {
  const { deriveProjectOwnerToken } =
    await import('../../apps/api/src/project-runtime-contract.js')
  const token = deriveProjectOwnerToken(project.id)
  const { readdir } = await import('node:fs/promises')
  const entries = await readdir('/proc')
  for (const entry of entries) {
    if (!/^[0-9]+$/u.test(entry)) continue
    const command = await readFile('/proc/' + entry + '/cmdline', 'utf8').catch(
      () => null
    )
    if (command === null) continue
    const argv = command.split('\0')
    const rendered = argv.join(' ')
    if (!rendered.includes(token)) continue
    const bind = argv.find((value) => value.startsWith('127.0.0.1:'))
    const port = bind === undefined ? 0 : Number(bind.split(':')[1])
    if (port > 0) return { pid: Number(entry), port }
  }
  throw new Error('no real workbench process was attributable to the project')
}

/** Removes a workbench outside the product, so release cannot be confirmed. */
export async function severWorkbench(
  workbench: WorkbenchIdentity
): Promise<void> {
  try {
    process.kill(-workbench.pid, 'SIGKILL')
  } catch {
    /* the workbench does not lead its own removal group */
  }
  try {
    process.kill(workbench.pid, 'SIGKILL')
  } catch {
    /* the workbench exited before the removal reached it */
  }
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      process.kill(workbench.pid, 0)
    } catch {
      return
    }
    await delay(50)
  }
  throw new Error('the workbench survived its removal')
}

/** Holds the exact port a released runtime had bound. */
export async function holdPort(
  port: number
): Promise<{ release(): Promise<void> }> {
  const server = createServer()
  const deadline = Date.now() + 10_000
  for (;;) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, '127.0.0.1', () => {
          server.removeAllListeners('error')
          resolve()
        })
      })
      break
    } catch (failure) {
      if (Date.now() > deadline) throw failure
      await delay(100)
    }
  }
  server.on('error', () => undefined)
  return {
    release: () =>
      new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

export async function prepareRoot(): Promise<string> {
  const root = path.join(BROWSER_ROOT, 'episode-' + randomUUID())
  await mkdir(root, { recursive: true })
  return root
}

export async function removeRoot(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true })
}
