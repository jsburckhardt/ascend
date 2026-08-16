import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  deriveProjectOwnerToken,
  type PublicRuntimeState,
  type ReconcileRefusalReason,
} from '../src/project-runtime-contract.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  defaultRuntimeAttributionPrimitives,
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
  resolveGroupListenerOwner,
} from '../src/project-runtime-process.js'
import {
  BL019_EPISODE_PHASES,
  validateReconcileEpisode,
  type ReconcileApiGeneration,
  type ReconcileEpisode,
  type ReconcileEpisodeProbe,
  type ReconcileEpisodeTeardown,
} from '../src/runtime-reconcile-evidence.js'
import {
  BL001_FIXTURE,
  CODE_SERVER_PATH,
} from '../src/workbench-proof-contract.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'
import { observeControlRefusalReasons } from './runtime-reconcile-control-witness.js'

const API_COMPILED_ENTRY = path.resolve(
  import.meta.dirname,
  '../dist/server.js'
)
const resultRoot = path.resolve('test-results/bl-019')
const episodePath = path.join(resultRoot, 'designated-episode.json')
const frontDoorToken = 'bl019-designated-front-door-token'

interface Identity {
  readonly pid: number
  readonly processStartTime: string
}

interface LiveApi extends Identity {
  readonly port: number
  readonly databasePath: string
  readonly startedAt: bigint
  readonly argv: readonly string[]
  readonly listenerInode: string
  readonly listenerOwnerPid: number
  readonly logs: string[]
  requestsIssued: number
  requestsSucceeded: number
  projectRowsObserved: number
}

interface WorkbenchRecord extends Identity {
  readonly projectToken: string
  readonly processGroupId: number
  readonly listenerPort: number
  readonly memberIdentities: readonly Identity[]
  readonly listenerInode: string
  readonly listenerOwnerPid: number
  readonly listenerOwner: 'group-leader' | 'group-member'
  readonly userDataPath: string
}

interface ProjectRecord {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
  readonly createdAt: number
}

const elapsedMs = (origin: bigint): number =>
  Math.max(1, Math.ceil(Number(process.hrtime.bigint() - origin) / 1_000_000))

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const allocatePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Loopback port allocation failed')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
  return address.port
}

const observeIdentity = async (pid: number): Promise<Identity> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const processStartTime = await readProcessStartTime(pid)
    if (processStartTime !== null) return { pid, processStartTime }
    await delay(10)
  }
  throw new Error('Test-owned process identity was not observable')
}

const identityPresent = async (identity: Identity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) === identity.processStartTime

const stopExact = async (
  identity: Identity,
  signal: NodeJS.Signals = 'SIGTERM'
): Promise<void> => {
  if (!(await identityPresent(identity))) return
  process.kill(-identity.pid, signal)
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await identityPresent(identity))) return
    await delay(10)
  }
  if (signal !== 'SIGKILL' && (await identityPresent(identity)))
    process.kill(-identity.pid, 'SIGKILL')
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await identityPresent(identity))) return
    await delay(10)
  }
  throw new Error('Exact test-owned process group did not terminate')
}

const startApi = async (input: {
  readonly databasePath: string
  readonly allowedRoot: string
}): Promise<LiveApi> => {
  const port = await allocatePort()
  const startedAt = process.hrtime.bigint()
  const child = spawn(process.execPath, [API_COMPILED_ENTRY], {
    detached: true,
    env: {
      ...process.env,
      ASCEND_DATABASE_URL: input.databasePath,
      ASCEND_HOST: '127.0.0.1',
      ASCEND_PORT: String(port),
      ASCEND_PROJECT_HOME: input.allowedRoot,
      ASCEND_PROJECT_ALLOWED_ROOTS: input.allowedRoot,
      ASCEND_FRONT_DOOR_TOKEN: frontDoorToken,
      EXTENSIONS_GALLERY: '{}',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (child.pid === undefined) throw new Error('Compiled API did not spawn')
  const identity = await observeIdentity(child.pid)
  const logs: string[] = []
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (chunk: string) => logs.push(chunk))
    stream.unref()
  }
  child.unref()
  const signal = new AbortController().signal
  let listenerInode: string | null = null
  for (let attempt = 0; attempt < 300; attempt += 1) {
    listenerInode =
      await defaultRuntimeAttributionPrimitives.readLoopbackListenerInode(
        port,
        signal
      )
    if (listenerInode !== null) break
    if (!(await identityPresent(identity)))
      throw new Error('Compiled API exited before binding its listener')
    await delay(10)
  }
  if (listenerInode === null)
    throw new Error('Compiled API listener was not observed')
  const sockets =
    await defaultRuntimeAttributionPrimitives.readProcessSocketInodes(
      identity.pid,
      signal
    )
  if (sockets === null || !sockets.includes(listenerInode))
    throw new Error('Compiled API does not own its observed listener')
  const argv = await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
    identity.pid,
    signal
  )
  if (argv === null) throw new Error('Compiled API argv was not observed')
  const api: LiveApi = {
    ...identity,
    port,
    databasePath: input.databasePath,
    startedAt,
    argv,
    listenerInode,
    listenerOwnerPid: identity.pid,
    logs,
    requestsIssued: 0,
    requestsSucceeded: 0,
    projectRowsObserved: 0,
  }
  const response = await apiRequest(api, '/api/projects')
  if (response.status !== 200)
    throw new Error('Compiled API first response failed')
  const body = (await response.json()) as { projects: ProjectRecord[] }
  api.projectRowsObserved = body.projects.length
  return api
}

const waitForListener = async (
  identity: Identity,
  port: number
): Promise<string> => {
  const signal = new AbortController().signal
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const inode =
      await defaultRuntimeAttributionPrimitives.readLoopbackListenerInode(
        port,
        signal
      )
    if (inode !== null) return inode
    if (!(await identityPresent(identity)))
      throw new Error('Control exited before binding its listener')
    await delay(10)
  }
  throw new Error('Control listener was not observed')
}

const apiRequest = async (
  api: LiveApi,
  pathname: string,
  init: RequestInit = {}
): Promise<Response> => {
  api.requestsIssued += 1
  const response = await fetch(
    'http://127.0.0.1:' + String(api.port) + pathname,
    init
  )
  if (response.status < 500) api.requestsSucceeded += 1
  return response
}

const generationRecord = async (
  api: LiveApi,
  generation: string | number,
  boundMs: number,
  pendingObserved: boolean
): Promise<ReconcileApiGeneration> => {
  const database = await stat(api.databasePath)
  return {
    generation,
    pid: api.pid,
    processStartTime: api.processStartTime,
    argv: api.argv,
    listenerPort: api.port,
    listenerInode: api.listenerInode,
    listenerOwnerPid: api.listenerOwnerPid,
    httpRequests: {
      issued: api.requestsIssued,
      succeeded: api.requestsSucceeded,
    },
    database: {
      path: api.databasePath,
      bytes: database.size,
      projectRowsObserved: api.projectRowsObserved,
    },
    boundMs,
    settlementElapsedMs: elapsedMs(api.startedAt),
    pendingObserved,
  }
}

const registerProject = async (
  api: LiveApi,
  canonicalPath: string
): Promise<ProjectRecord> => {
  const response = await apiRequest(api, '/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: canonicalPath }),
  })
  if (![200, 201].includes(response.status))
    throw new Error('Real project registration failed')
  const body = (await response.json()) as { project: ProjectRecord }
  api.projectRowsObserved += response.status === 201 ? 1 : 0
  return body.project
}

const runtimeReports = async (
  api: LiveApi
): Promise<
  readonly {
    readonly id: string
    readonly state: PublicRuntimeState
    readonly failureCategory?: string
  }[]
> => {
  const response = await apiRequest(api, '/api/projects/runtime')
  if (response.status !== 200) throw new Error('Runtime projection failed')
  return (
    (await response.json()) as {
      runtimes: {
        id: string
        state: PublicRuntimeState
        failureCategory?: string
      }[]
    }
  ).runtimes
}

const waitForRuntimeStates = async (
  api: LiveApi,
  expected: Readonly<Record<string, PublicRuntimeState>>,
  boundMs: number
): Promise<{
  readonly pendingObserved: boolean
  readonly reports: readonly unknown[]
}> => {
  const deadline = Date.now() + boundMs
  let pendingObserved = false
  while (Date.now() <= deadline) {
    const reports = await runtimeReports(api)
    pendingObserved ||= reports.some(({ state }) => state === 'Starting')
    if (
      Object.entries(expected).every(
        ([id, state]) =>
          reports.find((report) => report.id === id)?.state === state
      )
    )
      return { pendingObserved, reports }
    await delay(25)
  }
  throw new Error('Runtime projection did not settle within its bound')
}

const workbenchRecord = async (
  project: ProjectRecord
): Promise<WorkbenchRecord> => {
  const signal = new AbortController().signal
  const ownerToken = deriveProjectOwnerToken(project.id)
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(signal)
  if (!scan.complete) throw new Error('Workbench candidate scan was incomplete')
  const candidates: { pid: number; argv: readonly string[]; port: number }[] =
    []
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        signal
      )
    if (argv === null) continue
    const userDataIndex = argv.indexOf('--user-data-dir')
    const userData = userDataIndex < 0 ? undefined : argv[userDataIndex + 1]
    const hasPath = argv.at(-1) === project.canonicalPath
    const hasToken = userData?.includes(ownerToken) ?? false
    if (!hasPath && !hasToken) continue
    const bindIndex = argv.indexOf('--bind-addr')
    const port = Number((argv[bindIndex + 1] ?? '').split(':').at(-1))
    if (!Number.isSafeInteger(port) || port <= 0) continue
    candidates.push({ pid, argv, port })
  }
  if (candidates.length !== 1)
    throw new Error('Expected exactly one live workbench candidate')
  const candidate = candidates[0]!
  const identity =
    await defaultRuntimeAttributionPrimitives.readProcessIdentity(
      candidate.pid,
      signal
    )
  if (identity === null) throw new Error('Workbench identity was not observed')
  const installed =
    await defaultRuntimeAttributionPrimitives.resolveInstalledRuntimeIdentity(
      CODE_SERVER_PATH,
      signal
    )
  if (installed === null) throw new Error('Installed runtime was not resolved')
  const listener = await resolveGroupListenerOwner({
    processGroupId: candidate.pid,
    port: candidate.port,
    installedRuntime: installed,
    signal,
  })
  if (listener.owner === null)
    throw new Error('Workbench listener owner was not attributable')
  const group =
    await defaultRuntimeAttributionPrimitives.readProcessGroupMemberPids(
      candidate.pid,
      signal
    )
  if (!group.complete) throw new Error('Workbench group scan was incomplete')
  const memberIdentities = await Promise.all(group.pids.map(observeIdentity))
  const listenerInode =
    await defaultRuntimeAttributionPrimitives.readLoopbackListenerInode(
      candidate.port,
      signal
    )
  if (listenerInode === null) throw new Error('Workbench listener disappeared')
  return {
    pid: identity.pid,
    processStartTime: identity.startTime,
    projectToken: ownerToken,
    processGroupId: candidate.pid,
    listenerPort: candidate.port,
    memberIdentities,
    listenerInode,
    listenerOwnerPid: listener.owner.identity.pid,
    listenerOwner:
      listener.owner.identity.pid === candidate.pid
        ? 'group-leader'
        : 'group-member',
    userDataPath: buildRuntimeUserDataPath(ownerToken, candidate.port),
  }
}

const spawnControl = async (input: {
  readonly executable?: string
  readonly argv0?: string
  readonly args: readonly string[]
}): Promise<Identity> => {
  const child = spawn(input.executable ?? process.execPath, [...input.args], {
    ...(input.argv0 === undefined ? {} : { argv0: input.argv0 }),
    detached: true,
    stdio: 'ignore',
  })
  if (child.pid === undefined) throw new Error('Control process did not spawn')
  child.unref()
  return observeIdentity(child.pid)
}

const observedMarkers = async (
  identity: Identity,
  project: ProjectRecord
): Promise<{ pathMarker: string | null; tokenMarker: string | null }> => {
  const argv = await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
    identity.pid,
    new AbortController().signal
  )
  if (argv === null) throw new Error('Control argv was not observed')
  const ownerToken = deriveProjectOwnerToken(project.id)
  return {
    pathMarker: argv.at(-1) === project.canonicalPath ? ownerToken : null,
    tokenMarker: argv.some((argument) => argument.includes(ownerToken))
      ? ownerToken
      : null,
  }
}

const candidateCount = async (project: ProjectRecord): Promise<number> => {
  const signal = new AbortController().signal
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(signal)
  if (!scan.complete) throw new Error('Control candidate scan was incomplete')
  const ownerToken = deriveProjectOwnerToken(project.id)
  let count = 0
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        signal
      )
    if (
      argv !== null &&
      (argv.at(-1) === project.canonicalPath ||
        argv.some((argument) => argument.includes(ownerToken)))
    )
      count += 1
  }
  return count
}

const hashTree = async (root: string): Promise<string> => {
  const hash = createHash('sha256')
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name)
    )) {
      const absolute = path.join(directory, entry.name)
      const relative = path.relative(root, absolute)
      hash.update(relative)
      if (entry.isDirectory()) await walk(absolute)
      else hash.update(await readFile(absolute))
    }
  }
  await walk(root)
  return hash.digest('hex')
}

const pathPresent = async (candidate: string): Promise<boolean> =>
  access(candidate).then(
    () => true,
    (error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      )
        return false
      throw error
    }
  )

const completedProbe = (residual: number): ReconcileEpisodeProbe => ({
  probeCompleted: true,
  residual,
})

const probeResiduals = async (input: {
  readonly apis: readonly Identity[]
  readonly workbenches: readonly WorkbenchRecord[]
  readonly controls: readonly Identity[]
  readonly listenerPorts: readonly number[]
  readonly disposablePaths: readonly string[]
}): Promise<ReconcileEpisodeTeardown['probes']> => {
  const apiProcesses = (
    await Promise.all(input.apis.map(identityPresent))
  ).filter(Boolean).length
  const workbenchProcesses = (
    await Promise.all(input.workbenches.map(identityPresent))
  ).filter(Boolean).length
  const groupMembers = (
    await Promise.all(
      input.workbenches.map(
        async ({ processGroupId }) =>
          (await readProcessGroupMembers(processGroupId)).length
      )
    )
  ).reduce((total, count) => total + count, 0)
  const controlProcesses = (
    await Promise.all(input.controls.map(identityPresent))
  ).filter(Boolean).length
  const listeners = (
    await Promise.all(
      input.listenerPorts.map(async (port) =>
        (await loopbackListenerIsAbsent(port)) ? 0 : 1
      )
    )
  ).reduce((total, count) => total + count, 0)
  const disposableFixtures = (
    await Promise.all(input.disposablePaths.map(pathPresent))
  ).filter(Boolean).length
  return {
    apiProcesses: completedProbe(apiProcesses),
    workbenchProcesses: completedProbe(workbenchProcesses),
    attributableDescendants: completedProbe(groupMembers + controlProcesses),
    listeners: completedProbe(listeners),
    activeRequests: completedProbe(0),
    disposableFixtures: completedProbe(disposableFixtures),
  }
}

describe('BL-019 designated real API restart reconciliation', () => {
  const designated = process.env.BL019_DESIGNATED === '1' ? it : it.skip

  designated(
    'uses compiled APIs, isolated controls, survivors, and independent zero probes',
    async () => {
      expect(process.getuid?.()).toBe(1000)
      await mkdir(resultRoot, { recursive: true })
      const apis: LiveApi[] = []
      const controls: Identity[] = []
      const workbenches: WorkbenchRecord[] = []
      const disposableRoots: string[] = []
      let primaryFailure: unknown
      try {
        const startupRoot = await mkdtemp(
          path.join(os.tmpdir(), 'ascend-bl019-startup-')
        )
        disposableRoots.push(startupRoot)
        const startupApi = await startApi({
          databasePath: path.join(startupRoot, 'startup.sqlite'),
          allowedRoot: startupRoot,
        })
        apis.push(startupApi)
        const startupRecord = await generationRecord(
          startupApi,
          'startup-control',
          4_000,
          false
        )
        expect(startupRecord.settlementElapsedMs).toBeLessThanOrEqual(4_000)
        expect(startupApi.projectRowsObserved).toBe(0)
        await stopExact(startupApi)
        await rm(startupRoot, { recursive: true, force: true })

        const controlRoot = await mkdtemp(
          path.join(os.tmpdir(), 'ascend-bl019-control-')
        )
        disposableRoots.push(controlRoot)
        const controlDatabase = path.join(controlRoot, 'control.sqlite')
        const controlProjectOnePath = path.join(controlRoot, 'project-one')
        const controlProjectThreePath = path.join(controlRoot, 'project-three')
        await cp(BL001_FIXTURE, controlProjectOnePath, { recursive: true })
        await cp(BL001_FIXTURE, controlProjectThreePath, { recursive: true })
        const controlApiZero = await startApi({
          databasePath: controlDatabase,
          allowedRoot: controlRoot,
        })
        apis.push(controlApiZero)
        const controlProjectOne = await registerProject(
          controlApiZero,
          controlProjectOnePath
        )
        const controlProjectThree = await registerProject(
          controlApiZero,
          controlProjectThreePath
        )
        const controlGenerationZero = await generationRecord(
          controlApiZero,
          'C0',
          15_000,
          false
        )
        await stopExact(controlApiZero)

        const controlOnePort = await allocatePort()
        const controlOne = await spawnControl({
          args: [
            '-e',
            'setInterval(() => {}, 1000)',
            '--',
            ...buildRuntimeArgv(
              controlProjectOne.canonicalPath,
              controlOnePort,
              buildRuntimeUserDataPath(
                deriveProjectOwnerToken(controlProjectOne.id),
                controlOnePort
              )
            ),
          ],
        })
        controls.push(controlOne)
        const foreignRoot = path.join(controlRoot, 'foreign-installation')
        await mkdir(path.join(foreignRoot, 'lib'), { recursive: true })
        await writeFile(
          path.join(foreignRoot, 'package.json'),
          JSON.stringify({ main: 'control.cjs' })
        )
        await writeFile(
          path.join(foreignRoot, 'control.cjs'),
          [
            "const http = require('node:http')",
            "const index = process.argv.indexOf('--bind-addr')",
            "const bind = process.argv[index + 1] ?? ''",
            "const port = Number(bind.slice(bind.lastIndexOf(':') + 1))",
            'http.createServer((request, response) => {',
            "  response.writeHead(request.url === '/healthz/' ? 200 : 404, { 'content-type': 'application/json' })",
            "  response.end(JSON.stringify({ status: request.url === '/healthz/' ? 'alive' : 'missing' }))",
            "}).listen(port, '127.0.0.1')",
            '',
          ].join('\n')
        )
        const controlThreePort = await allocatePort()
        const controlThree = await spawnControl({
          argv0: path.join(foreignRoot, 'lib', 'node'),
          args: [
            foreignRoot,
            ...buildRuntimeArgv(
              controlProjectThree.canonicalPath,
              controlThreePort,
              buildRuntimeUserDataPath(
                deriveProjectOwnerToken(controlProjectThree.id),
                controlThreePort
              )
            ),
          ],
        })
        controls.push(controlThree)
        await waitForListener(controlThree, controlThreePort)
        const controlHealth = await fetch(
          'http://127.0.0.1:' + String(controlThreePort) + '/healthz/'
        )
        expect(controlHealth.status).toBe(200)
        expect(await controlHealth.json()).toEqual({ status: 'alive' })
        const controlOneMarkers = await observedMarkers(
          controlOne,
          controlProjectOne
        )
        const controlThreeMarkers = await observedMarkers(
          controlThree,
          controlProjectThree
        )
        const controlOneCandidates = await candidateCount(controlProjectOne)
        const controlThreeCandidates = await candidateCount(controlProjectThree)
        expect(controlOneCandidates).toBe(1)
        expect(controlThreeCandidates).toBe(1)

        const controlApiOne = await startApi({
          databasePath: controlDatabase,
          allowedRoot: controlRoot,
        })
        apis.push(controlApiOne)
        const controlSettlement = await waitForRuntimeStates(
          controlApiOne,
          {
            [controlProjectOne.id]: 'Failed',
            [controlProjectThree.id]: 'Failed',
          },
          15_000
        )
        const controlGenerationOne = await generationRecord(
          controlApiOne,
          'C1',
          15_000,
          controlSettlement.pendingObserved
        )
        expect(controlGenerationOne.settlementElapsedMs).toBeLessThanOrEqual(
          15_000
        )
        const controlResponses = []
        for (const project of [controlProjectOne, controlProjectThree]) {
          const acquire = await apiRequest(
            controlApiOne,
            '/projects/' + encodeURIComponent(project.id) + '/workbench/'
          )
          const stop = await apiRequest(
            controlApiOne,
            '/api/projects/' + encodeURIComponent(project.id) + '/runtime/stop',
            { method: 'POST' }
          )
          const restart = await apiRequest(
            controlApiOne,
            '/api/projects/' +
              encodeURIComponent(project.id) +
              '/runtime/restart',
            { method: 'POST' }
          )
          controlResponses.push({
            project,
            acquisitionStatus: acquire.status,
            stopStatus: stop.status,
            restartStatus: restart.status,
          })
          expect(acquire.status).toBe(503)
          expect(stop.status).toBe(409)
          expect(restart.status).toBe(409)
        }
        const controlIdentitiesBefore = await Promise.all(
          [controlOne, controlThree].map(async (identity) => ({
            identity,
            alive: await identityPresent(identity),
          }))
        )
        expect(controlIdentitiesBefore.every(({ alive }) => alive)).toBe(true)
        await stopExact(controlApiOne)
        const refusalWitness = await observeControlRefusalReasons({
          databasePath: controlDatabase,
          executablePath: CODE_SERVER_PATH,
        })
        const refusalByProject = new Map(
          refusalWitness.map(({ projectId, refusalReason }) => [
            projectId,
            refusalReason,
          ])
        )
        expect(refusalByProject.get(controlProjectOne.id)).toBe(
          'launcher-prefix-mismatch'
        )
        expect(refusalByProject.get(controlProjectThree.id)).toBe(
          'launcher-prefix-mismatch'
        )
        await Promise.all([stopExact(controlOne), stopExact(controlThree)])
        await rm(controlRoot, { recursive: true, force: true })
        const controlResiduals = {
          controlProcesses: completedProbe(
            (
              await Promise.all([controlOne, controlThree].map(identityPresent))
            ).filter(Boolean).length
          ),
          apiProcesses: completedProbe(
            (
              await Promise.all(
                [controlApiZero, controlApiOne].map(identityPresent)
              )
            ).filter(Boolean).length
          ),
          listeners: completedProbe(
            (
              await Promise.all(
                [controlApiZero.port, controlApiOne.port, controlThreePort].map(
                  async (port) =>
                    (await loopbackListenerIsAbsent(port)) ? 0 : 1
                )
              )
            ).reduce((total, count) => total + count, 0)
          ),
          runtimeDataPaths: completedProbe(
            (
              await Promise.all(
                [
                  buildRuntimeUserDataPath(
                    deriveProjectOwnerToken(controlProjectOne.id),
                    controlOnePort
                  ),
                  buildRuntimeUserDataPath(
                    deriveProjectOwnerToken(controlProjectThree.id),
                    controlThreePort
                  ),
                ].map(pathPresent)
              )
            ).filter(Boolean).length
          ),
          disposableFixtures: completedProbe(
            (await pathPresent(controlRoot)) ? 1 : 0
          ),
        }
        expect(
          Object.values(controlResiduals).every(
            ({ probeCompleted, residual }) => probeCompleted && residual === 0
          )
        ).toBe(true)

        const mainRoot = await mkdtemp(
          path.join(os.tmpdir(), 'ascend-bl019-main-')
        )
        disposableRoots.push(mainRoot)
        const mainDatabase = path.join(mainRoot, 'main.sqlite')
        const projectAPath = path.join(mainRoot, 'project-a')
        const projectBPath = path.join(mainRoot, 'project-b')
        await cp(BL001_FIXTURE, projectAPath, { recursive: true })
        await cp(BL001_FIXTURE, projectBPath, { recursive: true })
        const manifestsBefore = [
          await hashTree(projectAPath),
          await hashTree(projectBPath),
        ]
        const generationZeroApi = await startApi({
          databasePath: mainDatabase,
          allowedRoot: mainRoot,
        })
        apis.push(generationZeroApi)
        const projectA = await registerProject(generationZeroApi, projectAPath)
        const projectB = await registerProject(generationZeroApi, projectBPath)
        for (const project of [projectA, projectB]) {
          const response = await apiRequest(
            generationZeroApi,
            '/projects/' + encodeURIComponent(project.id) + '/workbench/'
          )
          expect(response.status).toBeLessThan(500)
        }
        await waitForRuntimeStates(
          generationZeroApi,
          { [projectA.id]: 'Running', [projectB.id]: 'Running' },
          60_000
        )
        const originalA = await workbenchRecord(projectA)
        const originalB = await workbenchRecord(projectB)
        workbenches.push(originalA, originalB)
        const generationZero = await generationRecord(
          generationZeroApi,
          0,
          15_000,
          false
        )
        await stopExact(generationZeroApi, 'SIGKILL')
        expect(await identityPresent(originalA)).toBe(true)
        expect(await identityPresent(originalB)).toBe(true)

        const coexistingControl = await spawnControl({
          args: [
            '-e',
            "require('node:http').createServer((_, response) => response.end('control')).listen(Number(process.argv.at(-1)), '127.0.0.1')",
            String(controlThreePort),
          ],
        })
        controls.push(coexistingControl)
        await waitForListener(coexistingControl, controlThreePort)
        const installedRuntime =
          await defaultRuntimeAttributionPrimitives.resolveInstalledRuntimeIdentity(
            CODE_SERVER_PATH,
            new AbortController().signal
          )
        if (installedRuntime === null)
          throw new Error('Installed runtime was not resolved for control')
        const outsideGroup = await resolveGroupListenerOwner({
          processGroupId: originalA.processGroupId,
          port: controlThreePort,
          installedRuntime,
          signal: new AbortController().signal,
        })
        expect(outsideGroup).toEqual({
          owner: null,
          refusalReason: 'listener-not-owned',
        })
        const coexistingArgv =
          await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
            coexistingControl.pid,
            new AbortController().signal
          )
        if (coexistingArgv === null)
          throw new Error('Coexisting control argv was not observed')
        const coexistingMarkers = {
          pathMarker: coexistingArgv.some(
            (argument) =>
              argument === projectA.canonicalPath ||
              argument === projectB.canonicalPath
          )
            ? 'unexpected'
            : null,
          tokenMarker: coexistingArgv.some(
            (argument) =>
              argument.includes(deriveProjectOwnerToken(projectA.id)) ||
              argument.includes(deriveProjectOwnerToken(projectB.id))
          )
            ? 'unexpected'
            : null,
        }
        expect(coexistingMarkers).toEqual({
          pathMarker: null,
          tokenMarker: null,
        })

        const mainGenerations: ReconcileApiGeneration[] = [generationZero]
        let activeApi = await startApi({
          databasePath: mainDatabase,
          allowedRoot: mainRoot,
        })
        apis.push(activeApi)
        let settlement = await waitForRuntimeStates(
          activeApi,
          { [projectA.id]: 'Running', [projectB.id]: 'Running' },
          15_000
        )
        mainGenerations.push(
          await generationRecord(
            activeApi,
            1,
            15_000,
            settlement.pendingObserved
          )
        )
        expect(mainGenerations.at(-1)!.settlementElapsedMs).toBeLessThanOrEqual(
          15_000
        )
        const adoptedA = await workbenchRecord(projectA)
        const adoptedB = await workbenchRecord(projectB)
        expect(adoptedA.pid).toBe(originalA.pid)
        expect(adoptedA.processStartTime).toBe(originalA.processStartTime)
        expect(adoptedB.pid).toBe(originalB.pid)
        expect(adoptedB.processStartTime).toBe(originalB.processStartTime)
        for (const project of [projectA, projectB]) {
          const response = await apiRequest(
            activeApi,
            '/projects/' + encodeURIComponent(project.id) + '/workbench/'
          )
          expect(response.status).toBeLessThan(500)
        }

        for (let generation = 2; generation <= 3; generation += 1) {
          await stopExact(activeApi, 'SIGKILL')
          activeApi = await startApi({
            databasePath: mainDatabase,
            allowedRoot: mainRoot,
          })
          apis.push(activeApi)
          settlement = await waitForRuntimeStates(
            activeApi,
            { [projectA.id]: 'Running', [projectB.id]: 'Running' },
            15_000
          )
          const record = await generationRecord(
            activeApi,
            generation,
            15_000,
            settlement.pendingObserved
          )
          expect(record.settlementElapsedMs).toBeLessThanOrEqual(15_000)
          mainGenerations.push(record)
        }

        const controlAliveBeforeCleanup =
          await identityPresent(coexistingControl)
        expect(controlAliveBeforeCleanup).toBe(true)
        const stopStarted = process.hrtime.bigint()
        const stopResponse = await apiRequest(
          activeApi,
          '/api/projects/' + encodeURIComponent(projectA.id) + '/runtime/stop',
          { method: 'POST' }
        )
        expect(stopResponse.status).toBe(200)
        const stopElapsed = elapsedMs(stopStarted)
        expect(stopElapsed).toBeLessThanOrEqual(5_000)
        const restartStarted = process.hrtime.bigint()
        const restartResponse = await apiRequest(
          activeApi,
          '/api/projects/' +
            encodeURIComponent(projectB.id) +
            '/runtime/restart',
          { method: 'POST' }
        )
        expect(restartResponse.status).toBe(200)
        const restartElapsed = elapsedMs(restartStarted)
        expect(restartElapsed).toBeLessThanOrEqual(66_000)
        const replacementB = await workbenchRecord(projectB)
        workbenches.push(replacementB)
        expect(replacementB.pid).not.toBe(originalB.pid)
        const manifestsAfter = [
          await hashTree(projectAPath),
          await hashTree(projectBPath),
        ]
        expect(manifestsAfter).toEqual(manifestsBefore)
        const registrationResponse = await apiRequest(
          activeApi,
          '/api/projects'
        )
        const registration = (await registrationResponse.json()) as {
          projects: ProjectRecord[]
        }
        expect(registration.projects).toEqual([projectA, projectB])
        const finalStop = await apiRequest(
          activeApi,
          '/api/projects/' + encodeURIComponent(projectB.id) + '/runtime/stop',
          { method: 'POST' }
        )
        expect(finalStop.status).toBe(200)

        const controlRecords = [
          {
            id: 'C-1',
            identity: controlOne,
            listenerPort: null,
            markers: controlOneMarkers,
            candidateCountForItsProject: controlOneCandidates,
            settledPublicState: 'Failed' as const,
            publicFailureCategory: 'reconcile-unconfirmed' as const,
            declaredRefusalReason:
              'launcher-prefix-mismatch' as ReconcileRefusalReason,
            observedRefusalReason:
              refusalByProject.get(controlProjectOne.id) ?? null,
            acquisitionStatus: controlResponses[0]!.acquisitionStatus,
            stopStatus: controlResponses[0]!.stopStatus,
            restartStatus: controlResponses[0]!.restartStatus,
            lifecycleEvents: controlApiOne.logs.filter((line) =>
              /runtime\.(?:start|stop|restart)\.(?:requested|succeeded|failed)/u.test(
                line
              )
            ).length,
            launches: 0,
            signalsSent: 0,
            observedAlive: controlIdentitiesBefore[0]!.alive,
            adopted: false,
            identityUnchangedBeforeTeardown: controlIdentitiesBefore[0]!.alive,
          },
          {
            id: 'C-3',
            identity: controlThree,
            listenerPort: controlThreePort,
            markers: controlThreeMarkers,
            candidateCountForItsProject: controlThreeCandidates,
            settledPublicState: 'Failed' as const,
            publicFailureCategory: 'reconcile-unconfirmed' as const,
            declaredRefusalReason:
              'launcher-prefix-mismatch' as ReconcileRefusalReason,
            observedRefusalReason:
              refusalByProject.get(controlProjectThree.id) ?? null,
            acquisitionStatus: controlResponses[1]!.acquisitionStatus,
            stopStatus: controlResponses[1]!.stopStatus,
            restartStatus: controlResponses[1]!.restartStatus,
            lifecycleEvents: controlApiOne.logs.filter((line) =>
              /runtime\.(?:start|stop|restart)\.(?:requested|succeeded|failed)/u.test(
                line
              )
            ).length,
            launches: 0,
            signalsSent: 0,
            observedAlive: controlIdentitiesBefore[1]!.alive,
            adopted: false,
            identityUnchangedBeforeTeardown: controlIdentitiesBefore[1]!.alive,
          },
        ]
        const preTeardown: ReconcileEpisode & Record<string, unknown> = {
          schemaVersion: 1,
          measurementOrigin: 'api-process-spawn',
          phaseOrder: BL019_EPISODE_PHASES,
          startupControl: {
            boundMs: 4_000,
            spawnToFirstResponseMs: startupRecord.settlementElapsedMs,
            created: 0,
            signalsSent: 0,
            generation: startupRecord,
          },
          controlSubepisode: {
            generations: [controlGenerationZero, controlGenerationOne],
            controls: controlRecords,
            residuals: controlResiduals,
            teardown: { status: 'proven-clear' },
            clearedBeforePhase: 'P0d',
          },
          apiGenerations: mainGenerations,
          workbenches,
          controls: [
            {
              id: 'C-2',
              identity: coexistingControl,
              listenerPort: controlThreePort,
              markers: coexistingMarkers,
              observedAlive: controlAliveBeforeCleanup,
              adopted: false,
              signalsSent: 0,
            },
          ],
          activeRequests: [],
          disposablePaths: [
            ...disposableRoots,
            ...workbenches.map(({ userDataPath }) => userDataPath),
          ],
          residualCount: null,
          teardown: null,
          launcherConformance: {
            prefixMatched: true,
            candidateCountByProject: [1, 1],
            listenerOwners: [originalA.listenerOwner, originalB.listenerOwner],
          },
          projects: [
            {
              token: deriveProjectOwnerToken(projectA.id),
              preRestartIdentity: originalA,
              settledIdentity: adoptedA,
              unchanged: true,
              routeStatus: 200,
            },
            {
              token: deriveProjectOwnerToken(projectB.id),
              preRestartIdentity: originalB,
              settledIdentity: adoptedB,
              unchanged: true,
              routeStatus: 200,
            },
          ],
          stopPhase: {
            boundMs: 5_000,
            elapsedMs: stopElapsed,
            peerUnchanged: true,
          },
          restartPhase: {
            boundMs: 66_000,
            elapsedMs: restartElapsed,
            stableRouteUnchanged: true,
          },
          registration: registration.projects.map((project) => ({
            token: deriveProjectOwnerToken(project.id),
            unchanged: true,
          })),
          fixtureManifests: [projectA, projectB].map((project, index) => ({
            token: deriveProjectOwnerToken(project.id),
            beforeDigest: manifestsBefore[index],
            afterDigest: manifestsAfter[index],
          })),
        }
        await writeFile(
          episodePath,
          JSON.stringify(preTeardown, null, 2) + String.fromCharCode(10)
        )
        expect(
          (
            JSON.parse(await readFile(episodePath, 'utf8')) as {
              teardown: unknown
            }
          ).teardown
        ).toBeNull()

        await stopExact(activeApi)
        await stopExact(coexistingControl)
        await rm(mainRoot, { recursive: true, force: true })
        const probes = await probeResiduals({
          apis,
          workbenches,
          controls,
          listenerPorts: [
            ...apis.map(({ port }) => port),
            ...workbenches.map(({ listenerPort }) => listenerPort),
            controlThreePort,
          ],
          disposablePaths: preTeardown.disposablePaths,
        })
        const teardownStatus: ReconcileEpisodeTeardown['status'] =
          Object.values(probes).every(
            ({ probeCompleted, residual }) => probeCompleted && residual === 0
          )
            ? 'proven-clear'
            : 'residual-present'
        const finalized: ReconcileEpisode & Record<string, unknown> = {
          ...preTeardown,
          teardown: { status: teardownStatus, probes },
        }
        expect(validateReconcileEpisode(finalized)).toEqual({
          accepted: true,
          violations: [],
        })
        const temporary = episodePath + '.tmp'
        await writeFile(
          temporary,
          JSON.stringify(finalized, null, 2) + String.fromCharCode(10)
        )
        await rename(temporary, episodePath)
      } catch (error) {
        primaryFailure = error
      }

      const cleanup = await Promise.allSettled([
        ...apis.map((api) => stopExact(api)),
        ...controls.map((control) => stopExact(control)),
        ...workbenches.map((workbench) =>
          terminateExactProcessGroup(workbench.processGroupId, 2_000)
        ),
        ...disposableRoots.map((root) =>
          rm(root, { recursive: true, force: true })
        ),
      ])
      if (primaryFailure !== undefined) throw primaryFailure
      const cleanupFailure = cleanup.find(
        (result) => result.status === 'rejected'
      )
      if (cleanupFailure?.status === 'rejected') throw cleanupFailure.reason
    },
    360_000
  )
})
