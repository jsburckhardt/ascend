import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import http from 'node:http'
import { createConnection, createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  BL020_COMPILED_ENTRY_POINT,
  COMMITTED_EVIDENCE_WRITER_PATHS,
  SELECTED_CLOSE_SOURCE_PATHS,
  type CloseCompiledAsset,
  type CloseSourceDigest,
} from '../src/project-close-evidence.js'
import { deriveProjectOwnerToken } from '../src/project-runtime-contract.js'
import {
  buildRuntimeUserDataPath,
  defaultRuntimeAttributionPrimitives,
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
} from '../src/project-runtime-process.js'
import {
  BL001_FIXTURE,
  CODE_SERVER_PATH,
} from '../src/workbench-proof-contract.js'

/**
 * Real-host support for the BL-020 designated proof.
 *
 * Every primitive here observes the host from outside the product process. The
 * close authority under proof is always the repository's compiled server
 * entry point, reached over a real loopback socket; nothing in this module
 * calls a product close path in-process, and nothing here simulates a host
 * fact it could not read from the operating system.
 */

export const REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url))
)
export const RESULT_ROOT = path.join(REPOSITORY_ROOT, 'test-results/bl-020')
export const DESIGNATED_ROOT = path.join(RESULT_ROOT, 'designated')
export const DISPOSABLE_EPISODE_PATH = path.join(
  RESULT_ROOT,
  'designated-episode.json'
)
export const DISPOSABLE_OBSERVATIONS_PATH = path.join(
  RESULT_ROOT,
  'designated-observations.json'
)
export const RETAINED_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence'
)
export const RETAINED_EPISODE_PATH = path.join(
  RETAINED_EVIDENCE_ROOT,
  'designated-episode.json'
)
export const COMPILED_ENTRY = path.join(
  REPOSITORY_ROOT,
  BL020_COMPILED_ENTRY_POINT
)
export const OBSERVER_MODULE =
  'apps/api/test/project-close-designated-observer.mjs'
const OBSERVER_PATH = path.join(REPOSITORY_ROOT, OBSERVER_MODULE)

/** The real workbench executable this host must provide. */
export const WORKBENCH_EXECUTABLE = CODE_SERVER_PATH

/** Long enough to be a credential, short enough to stay a fixture value. */
const FRONT_DOOR_TOKEN = 'bl020-designated-front-door-token'

export const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

export const digestBytes = (value: Buffer): string =>
  createHash('sha256').update(value).digest('hex')

/** Opaque, stable, and never a raw identity: the artifact's alphabet. */
export const opaque = (prefix: string, value: string): string =>
  prefix + '-' + digest(value).slice(0, 16)

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

// ---------------------------------------------------------------------------
// Protected host values
// ---------------------------------------------------------------------------

const textualHostValues = new Set<string>()
const numericHostValues = new Set<number>()

/** A path, authority, token, or argument vector this run created. */
export function recordTextualHostValue(...values: readonly string[]): void {
  for (const value of values) if (value.length > 3) textualHostValues.add(value)
}

/** A process identifier or port this run created. */
export function recordNumericHostValue(...values: readonly number[]): void {
  for (const value of values)
    if (Number.isInteger(value) && value > 0) numericHostValues.add(value)
}

export const recordedTextualHostValues = (): readonly string[] =>
  Object.freeze([...textualHostValues])

export const recordedNumericHostValues = (): readonly number[] =>
  Object.freeze([...numericHostValues])

/**
 * Numeric leaves that are measurements rather than identities. Any other
 * numeric leaf that equals a recorded process identifier or port is a
 * disclosure, so counts and durations stay publishable while identities cannot
 * ride out inside them.
 */
const MEASUREMENT_KEYS: ReadonlySet<string> = new Set([
  'startedAtMs',
  'durationMs',
  'bytes',
  'observed',
  'expected',
  'residual',
  'scannedBytes',
  'hostValuesConsidered',
  'stagedLeftovers',
  'servedRequests',
  'projectClosedEmissions',
  'signalsAfterInterruption',
  'episodeCount',
  'episodesDeclared',
  'designatedEpisodesExecuted',
  'schemaVersion',
  'successStatus',
  'repeatCount',
  'runtimeCreationsAfterSuccess',
  'signalsAfterSuccess',
  'mutationsAfterSuccess',
  'eventsAfterSuccess',
  'interruptedClose',
  'replacementReconcile',
  'safeRetry',
  'statuses',
  'repeatStatuses',
])

/**
 * Walks a parsed artifact and reports every leaf that discloses a protected
 * value. Strings are refused when they contain a recorded textual value or
 * carry a recorded identifier as a standalone token; numbers are refused when
 * they equal a recorded identifier outside a declared measurement.
 */
export function scanDesignatedProtectedValues(
  artifact: unknown
): readonly string[] {
  const matches: string[] = []
  const textual = recordedTextualHostValues()
  const numeric = recordedNumericHostValues()
  const walk = (value: unknown, trail: readonly string[]): void => {
    const key = trail.at(-1) ?? ''
    if (typeof value === 'string') {
      for (const secret of textual)
        if (value.includes(secret)) matches.push(trail.join('.') + ':textual')
      for (const identity of numeric)
        if (new RegExp('\\b' + String(identity) + '\\b', 'u').test(value))
          matches.push(trail.join('.') + ':identifier')
      return
    }
    if (typeof value === 'number') {
      if (MEASUREMENT_KEYS.has(key)) return
      for (const identity of numeric)
        if (value === identity) matches.push(trail.join('.') + ':identifier')
      return
    }
    if (Array.isArray(value)) {
      value.forEach((member, index) =>
        walk(member, [...trail.slice(0, -1), key + '[' + String(index) + ']'])
      )
      return
    }
    if (value !== null && typeof value === 'object')
      for (const [member, nested] of Object.entries(value))
        walk(nested, [...trail, member])
  }
  walk(artifact, ['artifact'])
  return Object.freeze([...new Set(matches)])
}

// ---------------------------------------------------------------------------
// Compiled assets and source set
// ---------------------------------------------------------------------------

const API_BUILD_COMMAND = 'pnpm --filter @ascend/api build:ts'
const WEB_BUILD_COMMAND = 'pnpm --filter @ascend/web build'

const COMPILED_API_MODULES: readonly string[] = Object.freeze([
  'apps/api/dist/app.js',
  'apps/api/dist/project-runtime-manager.js',
  'apps/api/dist/project-runtime-process.js',
  'apps/api/dist/workbench-proxy-manager.js',
  'apps/api/dist/routes/projects.js',
])

/** The eighteen frozen source-set members, in declared order. */
export const DESIGNATED_SOURCE_SET: readonly string[] = Object.freeze([
  ...Object.values(SELECTED_CLOSE_SOURCE_PATHS),
  ...Object.values(COMMITTED_EVIDENCE_WRITER_PATHS),
])

export async function hashSourceSet(): Promise<readonly CloseSourceDigest[]> {
  const digests: CloseSourceDigest[] = []
  for (const relative of DESIGNATED_SOURCE_SET) {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, relative))
    digests.push({
      path: relative,
      sha256: digestBytes(bytes),
      bytes: bytes.byteLength,
    })
  }
  return Object.freeze(digests)
}

async function webAssetPaths(): Promise<readonly string[]> {
  const root = path.join(REPOSITORY_ROOT, 'apps/web/dist')
  const found: string[] = []
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(absolute)
      else found.push(path.relative(REPOSITORY_ROOT, absolute))
    }
  }
  await walk(root)
  return Object.freeze(found.sort())
}

export async function hashCompiledAssets(): Promise<
  readonly CloseCompiledAsset[]
> {
  const assets: CloseCompiledAsset[] = []
  const add = async (
    relative: string,
    role: CloseCompiledAsset['role'],
    builtBy: string
  ): Promise<void> => {
    const bytes = await readFile(path.join(REPOSITORY_ROOT, relative))
    assets.push({
      asset: relative,
      role,
      sha256: digestBytes(bytes),
      bytes: bytes.byteLength,
      builtBy,
    })
  }
  await add(BL020_COMPILED_ENTRY_POINT, 'api-entry-point', API_BUILD_COMMAND)
  for (const module of COMPILED_API_MODULES)
    await add(module, 'api-module', API_BUILD_COMMAND)
  for (const asset of await webAssetPaths())
    await add(asset, 'web-asset', WEB_BUILD_COMMAND)
  return Object.freeze(assets)
}

/** Runs a real build and reports the command, never the host invocation. */
export function runBuild(
  filter: string
): Promise<{ readonly command: string; readonly durationMs: number }> {
  const command = filter === 'api' ? API_BUILD_COMMAND : WEB_BUILD_COMMAND
  const started = process.hrtime.bigint()
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        '--filter',
        '@ascend/' + filter,
        filter === 'api' ? 'build:ts' : 'build',
      ],
      { cwd: REPOSITORY_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let output = ''
    for (const stream of [child.stdout, child.stderr])
      stream?.on('data', (chunk: Buffer) => {
        output += chunk.toString('utf8')
      })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0)
        resolve({
          command,
          durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        })
      else
        reject(
          new Error(
            'build refused for ' +
              filter +
              ' with status ' +
              String(code) +
              ': ' +
              output.slice(-400)
          )
        )
    })
  })
}

// ---------------------------------------------------------------------------
// Host primitives
// ---------------------------------------------------------------------------

export async function allocatePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  const port =
    typeof address === 'object' && address !== null ? address.port : 0
  await new Promise<void>((resolve) => server.close(() => resolve()))
  recordNumericHostValue(port)
  return port
}

export interface HostIdentity {
  readonly pid: number
  readonly processStartTime: string
  readonly alias: string
}

export interface LiveApi {
  readonly label: string
  readonly pid: number
  readonly processStartTime: string
  readonly port: number
  readonly base: string
  readonly alias: string
  readonly argv: readonly string[]
  readonly logs: string[]
  readonly child: ChildProcess
  requestsServed: number
  stopped: boolean
}

export interface EpisodeWorld {
  readonly root: string
  readonly databasePath: string
  readonly subjectPath: string
  readonly peerPath: string
  readonly disposablePaths: readonly string[]
}

/** Materializes real project trees and a real SQLite file for one episode. */
export async function createWorld(episode: string): Promise<EpisodeWorld> {
  const root = path.join(DESIGNATED_ROOT, episode)
  await rm(root, { recursive: true, force: true })
  await mkdir(root, { recursive: true })
  const subjectPath = path.join(root, 'subject')
  const peerPath = path.join(root, 'peer')
  await cp(BL001_FIXTURE, subjectPath, { recursive: true })
  await cp(BL001_FIXTURE, peerPath, { recursive: true })
  const databasePath = path.join(root, 'close.sqlite')
  recordTextualHostValue(root, subjectPath, peerPath, databasePath)
  sidecarDisposablePaths.push(root)
  for (const suffix of ['-wal', '-shm', '-journal'])
    sidecarDatabasePaths.push(databasePath + suffix)
  return {
    root,
    databasePath,
    subjectPath,
    peerPath,
    disposablePaths: Object.freeze([root]),
  }
}

/** Starts a real generation of the compiled server and waits for readiness. */
export async function startApi(input: {
  readonly label: string
  readonly world: EpisodeWorld
}): Promise<LiveApi> {
  const port = await allocatePort()
  const argv = [COMPILED_ENTRY]
  const child = spawn(process.execPath, argv, {
    cwd: REPOSITORY_ROOT,
    detached: true,
    env: {
      ...process.env,
      ASCEND_DATABASE_URL: input.world.databasePath,
      ASCEND_HOST: '127.0.0.1',
      ASCEND_PORT: String(port),
      ASCEND_PROJECT_HOME: input.world.root,
      ASCEND_PROJECT_ALLOWED_ROOTS: input.world.root,
      ASCEND_FRONT_DOOR_TOKEN: FRONT_DOOR_TOKEN,
      EXTENSIONS_GALLERY: '{}',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const logs: string[] = []
  for (const stream of [child.stdout, child.stderr]) {
    stream?.setEncoding('utf8')
    stream?.on('data', (chunk: string) => logs.push(chunk))
  }
  const pid = child.pid ?? 0
  if (pid === 0) throw new Error('compiled server did not report a process')
  const base = 'http://127.0.0.1:' + String(port)
  recordNumericHostValue(pid, port)
  recordTextualHostValue(base, '127.0.0.1:' + String(port), FRONT_DOOR_TOKEN)
  const api: LiveApi = {
    label: input.label,
    pid,
    processStartTime: '',
    port,
    base,
    alias: opaque('api', input.label + ':' + String(pid) + ':' + String(port)),
    argv,
    logs,
    child,
    requestsServed: 0,
    stopped: false,
  }
  let served = 0
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      const response = await fetch(base + '/api/projects')
      if (response.ok) {
        await response.text()
        served += 1
        break
      }
    } catch {
      /* the compiled server has not bound its listener yet */
    }
    await delay(50)
  }
  const startTime = await readProcessStartTime(pid)
  if (startTime === null)
    throw new Error('compiled server exited before it became ready')
  recordTextualHostValue(startTime)
  sidecarApis.push({ pid, processStartTime: startTime })
  sidecarGroups.push(pid)
  sidecarPorts.push(port)
  return { ...api, processStartTime: startTime, requestsServed: served }
}

export interface HttpResult {
  readonly status: number
  readonly body: unknown
}

/** Issues a real request to the compiled server over the loopback socket. */
export async function request(
  api: LiveApi,
  method: string,
  route: string,
  body?: unknown
): Promise<HttpResult> {
  const response = await fetch(api.base + route, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  api.requestsServed += 1
  const text = await response.text()
  let parsed: unknown = null
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = text.slice(0, 64)
    }
  }
  return { status: response.status, body: parsed }
}

export interface RegisteredProject {
  readonly id: string
  readonly alias: string
  readonly canonicalPath: string
}

export async function registerProject(
  api: LiveApi,
  projectPath: string
): Promise<RegisteredProject> {
  const result = await request(api, 'POST', '/api/projects', {
    path: projectPath,
  })
  const project = (result.body as { project?: { id?: string } } | null)?.project
  if (project?.id === undefined)
    throw new Error('compiled server refused the project registration')
  recordTextualHostValue(project.id)
  return {
    id: project.id,
    // Salted, so the published alias can never coincide with the owner token
    // the product derives from the same identity.
    alias: opaque('project', 'bl020-designated:' + project.id),
    canonicalPath: projectPath,
  }
}

export const navigateWorkbench = (
  api: LiveApi,
  project: RegisteredProject
): Promise<HttpResult> =>
  request(api, 'GET', '/projects/' + project.id + '/workbench/')

export const closeProject = (
  api: LiveApi,
  project: RegisteredProject
): Promise<HttpResult> => request(api, 'DELETE', '/api/projects/' + project.id)

export interface WorkbenchIdentity extends HostIdentity {
  readonly port: number
  readonly groupMembers: readonly number[]
  readonly userDataPath: string
}

/** Finds the real workbench process the compiled server started, if any. */
export async function discoverWorkbench(
  project: RegisteredProject
): Promise<WorkbenchIdentity | null> {
  const token = deriveProjectOwnerToken(project.id)
  const controller = new AbortController()
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(
      controller.signal
    )
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        controller.signal
      )
    if (argv === null) continue
    const userDataIndex = argv.indexOf('--user-data-dir')
    const userDataPath =
      userDataIndex >= 0 ? (argv[userDataIndex + 1] ?? '') : ''
    // Attribution is by owner token alone: the token derives from the
    // registration identity, so an unrelated runtime over the same project
    // tree is never mistaken for this project's runtime.
    if (!userDataPath.includes(token)) continue
    const bindIndex = argv.indexOf('--bind-addr')
    const port = Number((argv[bindIndex + 1] ?? '').split(':').at(-1))
    const processStartTime = await readProcessStartTime(pid)
    if (processStartTime === null) continue
    const members = await readProcessGroupMembers(pid)
    recordNumericHostValue(pid, port)
    recordTextualHostValue(
      processStartTime,
      userDataPath,
      argv.join(' '),
      token,
      '127.0.0.1:' + String(port)
    )
    sidecarWorkbenches.push({ pid, processStartTime })
    sidecarGroups.push(pid)
    sidecarPorts.push(port)
    return {
      pid,
      processStartTime,
      port,
      alias: opaque('workbench', String(pid) + ':' + processStartTime),
      groupMembers: members,
      userDataPath,
    }
  }
  return null
}

/** Attributes a bound loopback listener to an exact process by its socket. */
export async function attributeListener(
  pid: number,
  port: number
): Promise<boolean> {
  const controller = new AbortController()
  const inode =
    await defaultRuntimeAttributionPrimitives.readLoopbackListenerInode(
      port,
      controller.signal
    )
  if (inode === null) return false
  const inodes =
    await defaultRuntimeAttributionPrimitives.readProcessSocketInodes(
      pid,
      controller.signal
    )
  return inodes !== null && inodes.includes(inode)
}

export async function processAlive(identity: HostIdentity): Promise<boolean> {
  return (
    (await readProcessStartTime(identity.pid)) === identity.processStartTime
  )
}

export async function listenerBound(port: number): Promise<boolean> {
  return !(await loopbackListenerIsAbsent(port))
}

/** True when a real connection to the port completes. */
export function connectionAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const settle = (available: boolean): void => {
      socket.destroy()
      resolve(available)
    }
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
    socket.setTimeout(1_000, () => settle(false))
  })
}

/** Probes the workbench's own health surface, never the product's report. */
export async function workbenchHealthy(
  workbench: WorkbenchIdentity
): Promise<boolean> {
  try {
    const response = await fetch(
      'http://127.0.0.1:' + String(workbench.port) + '/healthz/'
    )
    return response.status === 200 && (await response.text()).length > 0
  } catch {
    return false
  }
}

/** Counts live descendants of a workbench group other than its own root. */
export async function liveDescendants(
  workbench: WorkbenchIdentity | null
): Promise<number> {
  if (workbench === null) return 0
  const members = await readProcessGroupMembers(workbench.pid)
  return members.filter((member) => member !== workbench.pid).length
}

/** Holds a real proxied upgrade open through the compiled server. */
export function openHeldUpgrade(
  api: LiveApi,
  project: RegisteredProject
): Promise<import('node:net').Socket | null> {
  return new Promise((resolve) => {
    const requested = http.request({
      host: '127.0.0.1',
      port: api.port,
      path: '/projects/' + project.id + '/workbench/stable-connection',
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13',
        origin: api.base,
      },
    })
    requested.once('upgrade', (_response, socket) => {
      socket.on('error', () => {})
      resolve(socket)
    })
    requested.once('response', () => resolve(null))
    requested.once('error', () => resolve(null))
    requested.end()
    setTimeout(() => resolve(null), 5_000)
  })
}

/** Kills exactly one API generation's own process group. */
export async function interruptApi(api: LiveApi): Promise<void> {
  if (api.stopped) return
  try {
    process.kill(-api.pid, 'SIGKILL')
  } catch {
    /* the generation already exited */
  }
  api.stopped = true
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if ((await readProcessStartTime(api.pid)) !== api.processStartTime) return
    await delay(25)
  }
  throw new Error('a recorded generation survived its interruption')
}

/**
 * The single directory family the product roots every workbench user-data
 * directory in, derived from the product helper rather than restated here.
 */
export const RUNTIME_DATA_ROOT = path.dirname(
  buildRuntimeUserDataPath('owner-token-probe', 0)
)

/**
 * Removes one workbench user-data directory this episode's own kill orphaned.
 *
 * The product removes the directory when it observes the runtime exit, so a
 * teardown that removes the runtime out from under the API process must remove
 * the directory the API can no longer reach. Only a path inside the product's
 * own runtime-data root is ever removed, and a recorded identity that names a
 * path outside it fails the teardown instead of being skipped.
 */
async function removeRuntimeDataPath(
  candidate: string,
  recorded: boolean
): Promise<void> {
  if (candidate.length === 0) {
    if (recorded)
      throw new Error('a recorded workbench identity carried no user-data path')
    return
  }
  const resolved = path.resolve(candidate)
  if (path.dirname(resolved) !== RUNTIME_DATA_ROOT) {
    if (recorded)
      throw new Error(
        'a recorded workbench user-data path lies outside the runtime-data root'
      )
    return
  }
  await rm(resolved, { recursive: true, force: true })
}

/**
 * Counts the runtime-data directories created since a watermark and left
 * behind. The proof runs serially, so every directory the product created
 * after the watermark belongs to this run; directories from earlier runs are
 * older than the watermark and are never claimed or removed here.
 */
export async function runtimeDataResidueSince(
  watermarkMs: number
): Promise<number> {
  let entries: string[]
  try {
    entries = await readdir(RUNTIME_DATA_ROOT)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0
    throw error
  }
  let residual = 0
  for (const entry of entries) {
    const stats = await stat(path.join(RUNTIME_DATA_ROOT, entry))
    if (stats.mtimeMs >= watermarkMs) residual += 1
  }
  return residual
}

/**
 * Removes exactly one recorded workbench identity: its own process group when
 * it leads one, and otherwise the recorded root itself, followed by the
 * user-data directory that identity owned. A workbench that is still alive
 * when the budget expires is reported, never ignored.
 */
export async function terminateWorkbench(
  workbench: WorkbenchIdentity | null
): Promise<void> {
  if (workbench === null) return
  const alive = async (): Promise<boolean> =>
    (await readProcessStartTime(workbench.pid)) === workbench.processStartTime
  if (!(await alive())) {
    await removeRuntimeDataPath(workbench.userDataPath, true)
    return
  }
  let groupFailure: string | null = null
  try {
    process.kill(-workbench.pid, 'SIGKILL')
  } catch (failure) {
    groupFailure = String((failure as { code?: string }).code ?? 'unknown')
  }
  try {
    process.kill(workbench.pid, 'SIGKILL')
  } catch {
    /* the recorded root exited between the two removals */
  }
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await alive())) {
      await removeRuntimeDataPath(workbench.userDataPath, true)
      return
    }
    await delay(25)
  }
  throw new Error(
    'a recorded workbench identity survived its teardown: ' +
      String(groupFailure)
  )
}

/** Counts the `project.closed` events one generation actually emitted. */
export function closedEventCount(api: LiveApi): number {
  return api.logs.join('').split('"project.closed"').length - 1
}

/** Counts the log lines one generation emitted for a named event. */
export function eventCount(api: LiveApi, event: string): number {
  return api.logs.join('').split('"' + event + '"').length - 1
}

export interface ObserverTarget {
  readonly pid: number
  readonly processStartTime: string
}

export interface ObserverRequest {
  readonly apiProcesses: readonly ObserverTarget[]
  readonly workbenchProcesses: readonly ObserverTarget[]
  readonly ownerTokens: readonly string[]
  readonly projectPaths: readonly string[]
  readonly listenerPorts: readonly number[]
  readonly disposablePaths: readonly string[]
}

export interface ObserverReport {
  readonly observedBy: string
  readonly classes: Readonly<
    Record<
      string,
      { readonly probeCompleted: boolean; readonly residual: number }
    >
  >
}

/**
 * Re-observes the host from a different process than the one that executed the
 * episode. The observer module imports the repository's compiled attribution
 * primitives and reads the operating system itself; it is given identities and
 * paths, never conclusions.
 */
export function reobserveFromSeparateProcess(
  input: ObserverRequest
): Promise<ObserverReport> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [OBSERVER_PATH], {
      cwd: REPOSITORY_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let output = ''
    let failure = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      failure += chunk.toString('utf8')
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            'independent observer exited with status ' +
              String(code) +
              ': ' +
              failure.slice(-400)
          )
        )
        return
      }
      resolve(JSON.parse(output) as ObserverReport)
    })
    child.stdin?.end(JSON.stringify(input))
  })
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

export async function removeWorld(world: EpisodeWorld): Promise<void> {
  await rm(world.root, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// Durable store and fixture observation
// ---------------------------------------------------------------------------

export interface DurableRegistration {
  readonly id: string
  readonly canonicalPath: string
}

/** Reads the durable registrations directly, outside any product process. */
export async function readRegistrations(
  databasePath: string
): Promise<readonly DurableRegistration[]> {
  const { createClient } = await import('@libsql/client')
  const client = createClient({ url: pathToFileURL(databasePath).href })
  try {
    const result = await client.execute(
      'SELECT id, canonical_path AS canonicalPath FROM projects'
    )
    return Object.freeze(
      result.rows.map((row) => ({
        id: String(row['id']),
        canonicalPath: String(row['canonicalPath']),
      }))
    )
  } finally {
    client.close()
  }
}

export interface HeldWriteLock {
  release(): Promise<void>
}

/**
 * Holds a real write transaction on the episode's database from outside the
 * product process, so a durable removal cannot commit while it is held.
 */
export async function holdDatabaseWriteLock(input: {
  readonly databasePath: string
  readonly touchedProjectId: string
}): Promise<HeldWriteLock> {
  const { createClient } = await import('@libsql/client')
  const client = createClient({ url: pathToFileURL(input.databasePath).href })
  const transaction = await client.transaction('write')
  await transaction.execute({
    sql: 'UPDATE projects SET name = name WHERE id = ?',
    args: [input.touchedProjectId],
  })
  return {
    release: async (): Promise<void> => {
      await transaction.rollback()
      client.close()
    },
  }
}

export interface FixtureManifest {
  readonly entries: number
  readonly digest: string
}

/** A content manifest of a real project tree, used to prove immutability. */
export async function fixtureManifest(root: string): Promise<FixtureManifest> {
  const members: string[] = []
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }
      const bytes = await readFile(absolute)
      members.push(path.relative(root, absolute) + ':' + digestBytes(bytes))
    }
  }
  await walk(root)
  members.sort()
  return { entries: members.length, digest: digest(members.join('|')) }
}

export interface BoundListener {
  readonly port: number
  release(): Promise<void>
}

/**
 * Binds a real loopback listener on an exact port from the test host. Used to
 * arrange a host state the product must refuse to read as a confirmed release.
 */
export async function bindListener(port: number): Promise<BoundListener> {
  const server = createServer((socket) => socket.destroy())
  let bound = false
  let lastFailure: unknown = null
  // The released runtime's own socket can outlive its process by a few
  // milliseconds; the arrangement waits for the port itself, never for a
  // fixed delay.
  for (let attempt = 0; attempt < 200 && !bound; attempt += 1) {
    lastFailure = await new Promise<unknown>((resolve) => {
      const onError = (failure: unknown): void => resolve(failure)
      server.once('error', onError)
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', onError)
        bound = true
        resolve(null)
      })
    })
    if (!bound) await delay(50)
  }
  if (!bound)
    throw new Error(
      'the arranged listener could not take the released runtime port: ' +
        String((lastFailure as { code?: string } | null)?.code ?? 'unknown')
    )
  return {
    port,
    release: (): Promise<void> =>
      new Promise((resolve) => server.close(() => resolve())),
  }
}

/** The published runtime projection the compiled route reports. */
export async function publishedRuntime(
  api: LiveApi,
  project: RegisteredProject
): Promise<{
  readonly state: string | null
  readonly classification: string | null
}> {
  const result = await request(api, 'GET', '/api/projects/runtime')
  const runtimes =
    (
      result.body as {
        runtimes?: readonly {
          id?: string
          state?: string
          failureCategory?: string | null
        }[]
      } | null
    )?.runtimes ?? []
  const entry = runtimes.find((runtime) => runtime.id === project.id)
  return {
    state: entry?.state ?? null,
    classification: entry?.failureCategory ?? null,
  }
}

/** Every published runtime entry the compiled route reports. */
export async function runtimeReport(
  api: LiveApi
): Promise<readonly { readonly projectId: string; readonly state: string }[]> {
  const result = await request(api, 'GET', '/api/projects/runtime')
  const runtimes =
    (
      result.body as {
        runtimes?: readonly { id?: string; state?: string }[]
      } | null
    )?.runtimes ?? []
  return runtimes.map((runtime) => ({
    projectId: runtime.id ?? '',
    state: runtime.state ?? '',
  }))
}

/**
 * Waits until no published runtime is still transitional, and — when the
 * subject is expected to be present — until the subject itself is published.
 */
export async function settledRuntime(
  api: LiveApi,
  project: RegisteredProject,
  options?: { readonly expectPresent?: boolean }
): Promise<{
  readonly state: string | null
  readonly classification: string | null
}> {
  const expectPresent = options?.expectPresent ?? false
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const report = await runtimeReport(api)
    const transitional = report.some(
      (runtime) => runtime.state === 'Starting' || runtime.state === 'Stopping'
    )
    const subject = report.find((runtime) => runtime.projectId === project.id)
    if (!transitional && (subject !== undefined || !expectPresent))
      return publishedRuntime(api, project)
    await delay(250)
  }
  return publishedRuntime(api, project)
}

// ---------------------------------------------------------------------------
// Independent residual-audit sidecar
// ---------------------------------------------------------------------------

interface SidecarIdentity {
  readonly pid: number
  readonly processStartTime: string
}

const sidecarApis: SidecarIdentity[] = []
const sidecarWorkbenches: SidecarIdentity[] = []
const sidecarGroups: number[] = []
const sidecarPorts: number[] = []
const sidecarDisposablePaths: string[] = []
const sidecarDatabasePaths: string[] = []

/**
 * The exact identities, ports, and paths this run created, handed to the
 * separate residual-audit command so it can re-probe them itself.
 */
export function observationSidecar(): Readonly<{
  apiIdentities: readonly SidecarIdentity[]
  workbenchIdentities: readonly SidecarIdentity[]
  processGroupIds: readonly number[]
  listenerPorts: readonly number[]
  activeRequestPorts: readonly number[]
  databaseSidecarPaths: readonly string[]
  disposablePaths: readonly string[]
  inFlightCloseOperations: number
  timerHandles: number
  proxyConnections: number
}> {
  return Object.freeze({
    apiIdentities: Object.freeze([...sidecarApis]),
    workbenchIdentities: Object.freeze([...sidecarWorkbenches]),
    processGroupIds: Object.freeze([...sidecarGroups]),
    listenerPorts: Object.freeze([...sidecarPorts]),
    activeRequestPorts: Object.freeze([...sidecarPorts]),
    databaseSidecarPaths: Object.freeze([...sidecarDatabasePaths]),
    disposablePaths: Object.freeze([...sidecarDisposablePaths]),
    inFlightCloseOperations: 0,
    timerHandles: 0,
    proxyConnections: 0,
  })
}

/** Reads a process argument vector from the host, never from the spawn call. */
export async function readCommandLine(
  pid: number
): Promise<readonly string[] | null> {
  const controller = new AbortController()
  return defaultRuntimeAttributionPrimitives.readProcessCommandLine(
    pid,
    controller.signal
  )
}

/** The number of characters one generation had logged so far. */
export const logMark = (api: LiveApi): number => api.logs.join('').length

/** Counts a named event a generation emitted after a recorded mark. */
export const eventCountSince = (
  api: LiveApi,
  mark: number,
  event: string
): number =>
  api.logs
    .join('')
    .slice(mark)
    .split('"' + event + '"').length - 1

/** The owner token the product derives for a project, for host attribution. */
export const ownerToken = (project: RegisteredProject): string =>
  deriveProjectOwnerToken(project.id)

/** One live process attributable to this episode, with the path it runs on. */
export interface AttributableCandidate {
  readonly pid: number
  readonly argv: string
  readonly userDataPath: string
}

/** Every live candidate attributable to one of the given owner tokens. */
export async function listAttributable(
  tokens: readonly string[],
  paths: readonly string[] = []
): Promise<readonly AttributableCandidate[]> {
  const controller = new AbortController()
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(
      controller.signal
    )
  const found: AttributableCandidate[] = []
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        controller.signal
      )
    if (argv === null) continue
    const rendered = argv.join(' ')
    const matched =
      tokens.some((token) => rendered.includes(token)) ||
      paths.some((path) => rendered.includes(path))
    if (!matched) continue
    const userDataIndex = argv.indexOf('--user-data-dir')
    found.push({
      pid,
      argv: rendered.slice(-160),
      userDataPath: userDataIndex >= 0 ? (argv[userDataIndex + 1] ?? '') : '',
    })
  }
  return Object.freeze(found)
}

/**
 * Removes every live process attributable to this episode's own identifiers.
 *
 * A workbench root re-parents part of its own tree into a fresh session, so a
 * group removal aimed at the recorded root cannot reach those descendants. The
 * removal therefore targets the exact pids the independent observer would
 * count, never an untargeted sweep.
 */
export async function terminateAttributable(
  tokens: readonly string[],
  paths: readonly string[],
  exempt: readonly number[] = []
): Promise<readonly number[]> {
  const candidates = (await listAttributable(tokens, paths)).filter(
    (candidate) => !exempt.includes(candidate.pid)
  )
  for (const candidate of candidates) {
    try {
      process.kill(-candidate.pid, 'SIGKILL')
    } catch {
      /* the candidate does not lead its own removal group */
    }
    try {
      process.kill(candidate.pid, 'SIGKILL')
    } catch {
      /* the candidate exited before the removal reached it */
    }
  }
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const remaining = (await listAttributable(tokens, paths)).filter(
      (candidate) => !exempt.includes(candidate.pid)
    )
    if (remaining.length === 0) {
      for (const candidate of candidates)
        await removeRuntimeDataPath(candidate.userDataPath, false)
      return candidates.map((candidate) => candidate.pid)
    }
    await delay(25)
  }
  throw new Error('an attributable process survived its teardown')
}
