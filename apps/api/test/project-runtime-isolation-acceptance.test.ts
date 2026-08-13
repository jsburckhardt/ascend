import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { type AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { Writable } from 'node:stream'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { WebSocket, WebSocketServer, type RawData } from 'ws'
import {
  createApiServerController,
  type ApiServerController,
} from '../src/api-server.js'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  BL013_EVENT_EXPECTATIONS,
  BL013_MISMATCH_CLASSES,
  BL013_SCENARIOS,
  scanProtectedEvidence,
  validateProjectRuntimeIsolationEvidence,
} from '../src/project-runtime-isolation-evidence.js'
import { validateRuntimeManagerSource } from '../src/project-runtime-isolation-contract.js'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  type RuntimeSafeLifecycleEvent,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeExit,
  type RuntimeProcessDependencies,
  type RuntimeTerminationOutcome,
} from '../src/project-runtime-process.js'
import { createWorkbenchProxyManager } from '../src/workbench-proxy-manager.js'

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

let nextPid = 31_000
const controllers: ApiServerController[] = []

afterAll(async () => {
  await Promise.all(
    controllers.map((controller) => controller.stop().catch(() => undefined))
  )
})

interface ControlledFrameReceipt {
  readonly receiptId: string
  readonly executionId: string
  readonly payloadDigest: string
  readonly binary: boolean
}

interface ControlledRuntime {
  readonly ready: ReadyRuntime
  readonly contacts: string[]
  readonly frameReceipts: ControlledFrameReceipt[]
  readonly terminalSentinel: string
  crash(exit?: RuntimeExit): Promise<void>
  setTerminationOutcome(outcome: RuntimeTerminationOutcome): void
}

async function controlledRuntime(
  label: string,
  terminalSentinel: string
): Promise<ControlledRuntime> {
  const contacts: string[] = []
  const frameReceipts: ControlledFrameReceipt[] = []
  const exited = deferred<RuntimeExit>()
  let alive = true
  let terminationOutcome: RuntimeTerminationOutcome = 'graceful'
  const server = createServer((request, response) => {
    contacts.push(request.url ?? '/')
    if (request.url === '/healthz/') {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ status: 'alive' }))
      return
    }
    if (request.url?.startsWith('/terminal')) {
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end(terminalSentinel)
      return
    }
    if (request.url?.startsWith('/proxy-fail')) {
      request.socket.destroy()
      return
    }
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end(label)
  })
  const webSockets = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  })
  webSockets.on('connection', (socket) => {
    socket.on('message', (data: RawData, binary: boolean) => {
      const payload = Buffer.isBuffer(data)
        ? data
        : Buffer.concat(data as Buffer[])
      const text = payload.toString('utf8')
      const executionId = binary
        ? text.slice(0, text.indexOf(':binary:'))
        : String((JSON.parse(text) as { executionId: string }).executionId)
      frameReceipts.push({
        receiptId:
          'frame-receipt-' + label + '-' + String(frameReceipts.length + 1),
        executionId,
        payloadDigest: digest(payload),
        binary,
      })
      socket.send(payload, { binary })
    })
  })
  server.on('upgrade', (request, socket, head) => {
    contacts.push('websocket:' + (request.url ?? '/'))
    webSockets.handleUpgrade(request, socket, head, (client) => {
      webSockets.emit('connection', client, request)
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const port = (server.address() as AddressInfo).port
  const pid = nextPid++
  const close = async (): Promise<void> => {
    for (const client of webSockets.clients) client.terminate()
    if (!server.listening) return
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  const process: OwnedRuntimeProcess = {
    pid,
    processStartTime: 'controlled-start-' + String(pid),
    exit: exited.promise,
    isAlive: async () => alive,
    audit: async (ownedPort) => ({
      pid,
      processStartTime: 'controlled-start-' + String(pid),
      port: ownedPort,
      processAbsent: !alive,
      processGroupAbsent: !alive,
      listenerAbsent: !server.listening,
    }),
    terminate: async (_graceful, _force, ownedPort) => {
      alive = false
      exited.resolve({ code: 0, signal: null, addressInUse: false })
      await close()
      return {
        pid,
        processStartTime: 'controlled-start-' + String(pid),
        port: ownedPort,
        outcome: terminationOutcome,
        processAbsent: !alive,
        processGroupAbsent: !alive,
        listenerAbsent: !server.listening,
      }
    },
  }
  return {
    ready: {
      process,
      port,
      internalUrl: 'http://127.0.0.1:' + String(port),
      readinessAttempts: [
        { elapsedMs: 1, status: 200, bodyStatus: 'alive', timedOut: false },
      ],
    },
    contacts,
    frameReceipts,
    terminalSentinel,
    async crash(exit = { code: 77, signal: null, addressInUse: false }) {
      alive = false
      await close()
      exited.resolve(exit)
    },
    setTerminationOutcome(outcome) {
      terminationOutcome = outcome
    },
  }
}

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

const eventRows = (
  executionId: string,
  events: readonly (RuntimeSafeLifecycleEvent | Record<string, unknown>)[],
  source?: 'runtime' | 'proxy'
) =>
  events.map((event, index) => ({
    ...event,
    source: source ?? (Object.hasOwn(event, 'from') ? 'runtime' : 'proxy'),
    elapsedClass:
      event.event === 'runtime.start.requested' ||
      event.event === 'workbench.proxy.started'
        ? 'zero'
        : 'within-suite-bound',
    executionId,
    eventId: executionId + '-event-' + String(index + 1),
  }))

const cleanup = (
  measurementId: string,
  resources: readonly {
    resourceClass: string
    before: number
    after: number
    method: string
  }[]
) => ({
  measurementId,
  measured: true,
  checks: resources.map((resource) => ({ ...resource, executed: true })),
})

const zeroProxyCleanup = (
  measurementId: string,
  audit: Record<string, number | boolean>
) =>
  cleanup(measurementId, [
    {
      resourceClass: 'proxy-operations',
      before:
        Number(audit.pendingOperations) +
        Number(audit.upstreamHttpRequests) +
        Number(audit.upstreamHttpResponses),
      after:
        Number(audit.pendingOperations) +
        Number(audit.upstreamHttpRequests) +
        Number(audit.upstreamHttpResponses),
      method: 'proxy-manager-audit',
    },
    {
      resourceClass: 'sockets',
      before: Number(audit.rawSockets) + Number(audit.webSockets),
      after: Number(audit.rawSockets) + Number(audit.webSockets),
      method: 'proxy-manager-socket-audit',
    },
  ])

const safeSnapshot = (snapshot: RuntimeSnapshot) => ({
  projectToken: snapshot.ownerToken,
  identityDigest: digest({
    pid: snapshot.pid,
    processStartTime: snapshot.processStartTime,
    port: snapshot.port,
    startedAt: snapshot.startedAt,
  }),
  routeDigest: digest(snapshot.stableRoute),
  state: snapshot.state,
})

const terminalProbe = async (
  snapshot: RuntimeSnapshot,
  sentinel: string
): Promise<{ passed: boolean; resultDigest: string }> => {
  const response = await fetch(snapshot.internalUrl + '/terminal')
  const body = await response.text()
  return {
    passed: response.status === 200 && body === sentinel,
    resultDigest: digest(body),
  }
}

const projectLibrary = (projects: readonly any[]): ProjectLibrary => ({
  create: vi.fn(),
  findById: vi.fn(async (id) => projects.find((project) => project.id === id)),
  list: vi.fn(async () => [...projects]),
  closeProject: vi.fn(),
  close: vi.fn(),
})

async function apiFor(
  projects: readonly any[],
  runtime: ProjectRuntimeManager,
  proxyEvents: Record<string, unknown>[],
  logRecords: string[]
) {
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      logRecords.push(Buffer.from(chunk).toString('utf8'))
      callback()
    },
  })
  const controller = createApiServerController({
    port: 0,
    fastify: { logger: { level: 'info', stream } as any },
    createProjectLibrary: async () => projectLibrary(projects),
    createProjectRuntimeManager: () => runtime,
    createWorkbenchProxyManager: (library, ownedRuntime) =>
      createWorkbenchProxyManager({
        projectLibrary: library,
        projectRuntime: ownedRuntime,
        recordEvent: (event) => proxyEvents.push(event),
      }),
    createProjectRegistration: async () => ({
      register: vi.fn(),
      close: vi.fn(),
    }),
  })
  controllers.push(controller)
  const app = await controller.start()
  return { controller, app, port: (app.server.address() as AddressInfo).port }
}

const httpCase = async (port: number, url: string, sentinel?: string) => {
  const response = await fetch('http://127.0.0.1:' + String(port) + url, {
    headers: sentinel === undefined ? {} : { 'x-bl013-sentinel': sentinel },
  })
  return { status: response.status, body: await response.text() }
}

const websocketRefusal = (port: number, url: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const socket = new WebSocket('ws://127.0.0.1:' + String(port) + url)
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

const openWebSocketBoundary = (port: number, url: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket('ws://127.0.0.1:' + String(port) + url)
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })

const exchangeFrame = (
  socket: WebSocket,
  payload: string | Buffer,
  binary: boolean
) =>
  new Promise<{ readonly payloadDigest: string; readonly binary: boolean }>(
    (resolve, reject) => {
      socket.once('message', (data: RawData, receivedBinary: boolean) => {
        const received = Buffer.isBuffer(data)
          ? data
          : Buffer.concat(data as Buffer[])
        resolve({ payloadDigest: digest(received), binary: receivedBinary })
      })
      socket.once('error', reject)
      socket.send(payload, { binary })
    }
  )

const closeWebSocketBoundary = (socket: WebSocket) =>
  new Promise<void>((resolve) => {
    socket.once('close', () => resolve())
    socket.close(1000)
  })

async function buildArtifact() {
  const startedAt = Date.now()
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'ascend-bl013-fake-')
  )
  const sentinels = ['a', 'b', 'c'].map(
    (label) =>
      'BL013_PROTECTED_' +
      label.toUpperCase() +
      '_' +
      digest(fixtureRoot + label).slice(0, 12)
  )
  const projects = await Promise.all(
    ['a', 'b', 'c'].map(async (label, index) => {
      const canonicalPath = path.join(fixtureRoot, label)
      await mkdir(canonicalPath)
      await writeFile(
        path.join(canonicalPath, 'terminal-sentinel.txt'),
        sentinels[index]
      )
      return {
        id: 'bl013-' + label,
        name: 'Fixture ' + label.toUpperCase(),
        canonicalPath,
        createdAt: index + 1,
        label,
        sentinel: sentinels[index],
      }
    })
  )
  const config = createProjectRuntimeConfig({
    expectedUser: os.userInfo().username,
    environment: {
      PATH: '/usr/local/bin:/usr/bin:/bin',
      HOME: os.userInfo().homedir,
      USER: os.userInfo().username,
      LOGNAME: os.userInfo().username,
      SHELL: os.userInfo().shell || '/bin/sh',
      LANG: 'C.UTF-8',
    },
  })
  const runtimeByPath = new Map<string, ControlledRuntime>()
  const launches: Record<string, unknown>[] = []
  const coreEvents: RuntimeSafeLifecycleEvent[] = []
  const manager = createProjectRuntimeManager({
    findProjectById: async (id) =>
      projects.find((project) => project.id === id),
    config,
    processDependencies,
    launch: async ({ canonicalPath, config: launchConfig }) => {
      const project = projects.find(
        (candidate) => candidate.canonicalPath === canonicalPath
      )!
      const runtime = await controlledRuntime(project.label, project.sentinel)
      runtimeByPath.set(canonicalPath, runtime)
      launches.push({
        projectToken: deriveProjectOwnerToken(project.id),
        argvCount: buildRuntimeArgv(canonicalPath, runtime.ready.port).length,
        finalArgumentMatchesCanonicalFixture:
          buildRuntimeArgv(canonicalPath, runtime.ready.port).at(-1) ===
          canonicalPath,
        canonicalFixtureDigest: digest(canonicalPath),
        cwdMatchesCanonicalFixture: true,
        userMatchesConfiguredUser:
          launchConfig.expectedUser === os.userInfo().username,
        environmentAllowlist: Object.keys(launchConfig.environment).sort(),
        environmentDigest: digest(launchConfig.environment),
        peerFixtureMatches: projects
          .filter((peer) => peer.id !== project.id)
          .filter((peer) =>
            JSON.stringify({
              argv: buildRuntimeArgv(canonicalPath, runtime.ready.port),
              cwd: canonicalPath,
              environment: launchConfig.environment,
            }).includes(peer.canonicalPath)
          ).length,
      })
      return runtime.ready
    },
    recordEvent: (event) => coreEvents.push(event),
  })
  const calls = Array.from({ length: 8 }).flatMap(() =>
    projects.map((project) =>
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    )
  )
  const snapshots = await Promise.all(calls)
  const launchEvents = coreEvents.splice(0)
  const identityRows = projects.map((project) => {
    const own = snapshots.filter(
      (snapshot) => snapshot.projectId === project.id
    )
    return {
      projectToken: deriveProjectOwnerToken(project.id),
      callerCount: own.length,
      sharedResultObject: own.every((snapshot) => snapshot === own[0]),
      snapshot: safeSnapshot(own[0]),
    }
  })
  const reused = await Promise.all(
    projects.map((project) =>
      manager.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
    )
  )
  const reuseRows = reused.map((snapshot, index) => ({
    projectToken: snapshot.ownerToken,
    sameResultObject:
      snapshot ===
      snapshots.find((value) => value.projectId === projects[index].id),
  }))
  const proxyEvents: Record<string, unknown>[] = []
  const logRecords: string[] = []
  let injection:
    { mismatchClass: string; source: string; target: string } | undefined
  const wrappedRuntime: ProjectRuntimeManager = {
    ...manager,
    async start(input) {
      const selected = await manager.start(input)
      if (injection === undefined) return selected
      const targetProject = projects.find(
        (project) => project.label === injection?.target
      )!
      const target = manager.inspect(targetProject.id)!
      if (injection.mismatchClass === 'project-route') return target
      if (injection.mismatchClass === 'frame-destination') return selected
      return Object.freeze({
        ...selected,
        internalUrl: target.internalUrl,
        port: target.port,
      })
    },
    ownsSnapshot(snapshot) {
      return manager.ownsSnapshot(snapshot)
    },
  }
  const api = await apiFor(projects, wrappedRuntime, proxyEvents, logRecords)
  const beforeInvalid = projects.map((project) =>
    safeSnapshot(manager.inspect(project.id)!)
  )
  const beforeInvalidEvents = new Map(
    projects.map((project) => [
      deriveProjectOwnerToken(project.id),
      coreEvents.filter(
        (event) => event.projectToken === deriveProjectOwnerToken(project.id)
      ).length,
    ])
  )
  const invalidResults = await Promise.all([
    httpCase(api.port, '/projects/%2F/workbench/'),
    httpCase(api.port, '/projects/unknown/workbench/invalid'),
    httpCase(api.port, '/projects/closed-project/workbench/invalid'),
  ])
  const terminalAfterInvalid = await Promise.all(
    projects.map((project) =>
      terminalProbe(manager.inspect(project.id)!, project.sentinel)
    )
  )
  const afterInvalid = projects.map((project) =>
    safeSnapshot(manager.inspect(project.id)!)
  )
  const invalidProxyEvents = proxyEvents.splice(0)
  const orderedPairs = ['a>b', 'a>c', 'b>a', 'b>c', 'c>a', 'c>b']
  const crossTargetRows: Record<string, unknown>[] = []
  for (const mismatchClass of BL013_MISMATCH_CLASSES) {
    for (const orderedPair of orderedPairs) {
      const [source, target] = orderedPair.split('>')
      const executionId = 'cross-' + mismatchClass + '-' + source + '-' + target
      const sourceProject = projects.find(
        (project) => project.label === source
      )!
      const targetProject = projects.find(
        (project) => project.label === target
      )!
      const sourceRuntime = runtimeByPath.get(sourceProject.canonicalPath)!
      const targetRuntime = runtimeByPath.get(targetProject.canonicalPath)!
      const route =
        '/projects/bl013-' +
        source +
        '/workbench/matrix?marker=' +
        encodeURIComponent(sentinels[0])

      if (mismatchClass === 'frame-destination') {
        injection = undefined
        const sourceBoundaryId = 'source-boundary-' + executionId
        const targetBoundaryId = 'target-boundary-' + executionId
        const sourceSocket = await openWebSocketBoundary(api.port, route)
        const targetSocket = await openWebSocketBoundary(
          api.port,
          '/projects/bl013-' + target + '/workbench/matrix-control'
        )
        const sourceReceiptStart = sourceRuntime.frameReceipts.length
        const targetReceiptStart = targetRuntime.frameReceipts.length
        const textExecutionId =
          executionId + '-text-' + digest(executionId + '-text').slice(0, 12)
        const binaryExecutionId =
          executionId +
          '-binary-' +
          digest(executionId + '-binary').slice(0, 12)
        const targetControlExecutionId =
          executionId +
          '-target-control-' +
          digest(executionId + '-target-control').slice(0, 12)
        const textPayload = JSON.stringify({
          executionId: textExecutionId,
          payloadHash: digest(textExecutionId),
        })
        const binaryPayload = Buffer.from(
          binaryExecutionId + ':binary:' + digest(binaryExecutionId)
        )
        const targetControlPayload = JSON.stringify({
          executionId: targetControlExecutionId,
          payloadHash: digest(targetControlExecutionId),
        })
        const targetControlEcho = await exchangeFrame(
          targetSocket,
          targetControlPayload,
          false
        )
        const textEcho = await exchangeFrame(sourceSocket, textPayload, false)
        const binaryEcho = await exchangeFrame(
          sourceSocket,
          binaryPayload,
          true
        )
        await vi.waitFor(() => {
          expect(sourceRuntime.frameReceipts.length - sourceReceiptStart).toBe(
            2
          )
          expect(targetRuntime.frameReceipts.length - targetReceiptStart).toBe(
            1
          )
        })
        await Promise.all([
          closeWebSocketBoundary(sourceSocket),
          closeWebSocketBoundary(targetSocket),
        ])
        await vi.waitFor(() =>
          expect(api.app.workbenchProxy.audit()).toMatchObject({
            pendingOperations: 0,
            rawSockets: 0,
            webSockets: 0,
          })
        )
        const sourceReceipts =
          sourceRuntime.frameReceipts.slice(sourceReceiptStart)
        const targetReceipts =
          targetRuntime.frameReceipts.slice(targetReceiptStart)
        const frameExecutionIds = [textExecutionId, binaryExecutionId]
        const mismatchedTargetReceipts = targetReceipts.filter((receipt) =>
          frameExecutionIds.includes(receipt.executionId)
        )
        const rightfulSourceReceipts = sourceReceipts.filter((receipt) =>
          frameExecutionIds.includes(receipt.executionId)
        )
        const targetControlReceipts = targetReceipts.filter(
          (receipt) => receipt.executionId === targetControlExecutionId
        )
        const proxyAudit = api.app.workbenchProxy.audit() as unknown as Record<
          string,
          number | boolean
        >
        crossTargetRows.push({
          mismatchClass,
          orderedPair,
          executionId,
          boundaryId: sourceBoundaryId,
          sourceBoundaryId,
          targetBoundaryId,
          transport: 'websocket',
          executed: true,
          sourceBoundaryEstablished: true,
          targetBoundaryEstablished: true,
          projectToken: deriveProjectOwnerToken('bl013-' + source),
          requestedDestinationToken: deriveProjectOwnerToken('bl013-' + target),
          expectedOutcome: 'route-bound-source-only',
          observedOutcome: 'route-bound-source-only',
          frameExecutionIds,
          sourceReceiptIds: rightfulSourceReceipts.map(
            (receipt) => receipt.receiptId
          ),
          mismatchedTargetReceiptIds: mismatchedTargetReceipts.map(
            (receipt) => receipt.receiptId
          ),
          targetControlExecutionId,
          targetControlReceiptIds: targetControlReceipts.map(
            (receipt) => receipt.receiptId
          ),
          textFrame: {
            payloadDigest: digest(Buffer.from(textPayload)),
            echoedDigest: textEcho.payloadDigest,
            binary: textEcho.binary,
          },
          binaryFrame: {
            payloadDigest: digest(binaryPayload),
            echoedDigest: binaryEcho.payloadDigest,
            binary: binaryEcho.binary,
          },
          targetControlFrame: {
            payloadDigest: digest(Buffer.from(targetControlPayload)),
            echoedDigest: targetControlEcho.payloadDigest,
            binary: targetControlEcho.binary,
          },
          sourceReceiptCount: rightfulSourceReceipts.length,
          mismatchedTargetReceiptCount: mismatchedTargetReceipts.length,
          targetControlReceiptCount: targetControlReceipts.length,
          upstreamContactCount: mismatchedTargetReceipts.length,
          cleanup: zeroProxyCleanup(executionId + '-cleanup', proxyAudit),
        })
        continue
      }

      injection = { mismatchClass, source, target }
      const boundaryId =
        (mismatchClass === 'project-route' || mismatchClass === 'http-target'
          ? 'request-'
          : 'upgrade-') + executionId
      const contactsBefore = targetRuntime.contacts.length
      const response =
        mismatchClass === 'project-route' || mismatchClass === 'http-target'
          ? await httpCase(api.port, route, sentinels[1])
          : await websocketRefusal(api.port, route)
      const body = JSON.parse(response.body) as { error: { code: string } }
      await vi.waitFor(() =>
        expect(api.app.workbenchProxy.audit()).toMatchObject({
          pendingOperations: 0,
          upstreamHttpRequests: 0,
          upstreamHttpResponses: 0,
          rawSockets: 0,
          webSockets: 0,
        })
      )
      const proxyAudit = api.app.workbenchProxy.audit() as unknown as Record<
        string,
        number | boolean
      >
      crossTargetRows.push({
        mismatchClass,
        orderedPair,
        executionId,
        boundaryId,
        transport:
          mismatchClass === 'project-route' || mismatchClass === 'http-target'
            ? 'http'
            : 'websocket',
        executed: true,
        projectToken: deriveProjectOwnerToken('bl013-' + source),
        requestedDestinationToken: deriveProjectOwnerToken('bl013-' + target),
        expectedFailure: 'workbench_runtime_project_mismatch',
        observedFailure: body.error.code,
        status: response.status,
        upstreamContactCount: targetRuntime.contacts.length - contactsBefore,
        cleanup: zeroProxyCleanup(executionId + '-cleanup', proxyAudit),
      })
    }
  }
  injection = undefined
  const crossEvents = proxyEvents.splice(0)
  const coreAuditBeforeStop =
    api.app.workbenchProxy.audit() as unknown as Record<
      string,
      number | boolean
    >
  await api.controller.stop()
  const coreShutdown = manager.lastShutdown()!
  const coreChecks = coreShutdown.audits.map((audit) =>
    audit.processAbsent && audit.processGroupAbsent && audit.listenerAbsent
      ? 0
      : 1
  )

  const scenarios: Record<string, unknown>[] = []
  scenarios.push({
    scenario: 'interleaved-24',
    executionId: 'scenario-interleaved-24',
    boundaryObserved: true,
    passed:
      launches.length === 3 &&
      identityRows.every(
        (row) => row.callerCount === 8 && row.sharedResultObject
      ) &&
      launches.every((row) => row.peerFixtureMatches === 0),
    invocationCount: calls.length,
    elapsedMs: Date.now() - startedAt,
    observations: [
      {
        launchCount: launches.length,
        readinessCount: launches.length,
        identityRows,
        launches,
        reuseRows,
      },
    ],
    events: eventRows('scenario-interleaved-24', launchEvents),
    cleanup: cleanup('interleaved-cleanup', [
      {
        resourceClass: 'runtime-processes',
        before: coreShutdown.audits.length,
        after: coreChecks.reduce((sum, value) => sum + value, 0),
        method: 'runtime-shutdown-exact-identity-audit',
      },
      {
        resourceClass: 'proxy-operations',
        before:
          Number(coreAuditBeforeStop.pendingOperations) +
          Number(coreAuditBeforeStop.upstreamHttpRequests),
        after: 0,
        method: 'proxy-manager-audit',
      },
    ]),
  })
  scenarios.push({
    scenario: 'invalid-identifiers',
    executionId: 'scenario-invalid-identifiers',
    boundaryObserved: true,
    passed:
      invalidResults.every((result) => [400, 404].includes(result.status)) &&
      JSON.stringify(beforeInvalid) === JSON.stringify(afterInvalid) &&
      terminalAfterInvalid.every((probe) => probe.passed) &&
      projects.every(
        (project) =>
          coreEvents.filter(
            (event) =>
              event.projectToken === deriveProjectOwnerToken(project.id)
          ).length ===
          beforeInvalidEvents.get(deriveProjectOwnerToken(project.id))
      ),
    invocationCount: invalidResults.length,
    elapsedMs: 1,
    observations: [
      {
        attempts: ['malformed', 'unknown', 'closed'],
        statuses: invalidResults.map(({ status }) => status),
        snapshotDigestBefore: digest(beforeInvalid),
        snapshotDigestAfter: digest(afterInvalid),
        listenersUnchanged: terminalAfterInvalid.every((probe) => probe.passed),
        routesUnchanged:
          JSON.stringify(beforeInvalid) === JSON.stringify(afterInvalid),
        terminalAfterInvalid,
      },
    ],
    events: eventRows(
      'scenario-invalid-identifiers',
      invalidProxyEvents,
      'proxy'
    ),
    cleanup: zeroProxyCleanup('invalid-cleanup', coreAuditBeforeStop),
  })

  async function failureScenario(
    name:
      | 'early-exit'
      | 'crash'
      | 'readiness-failure'
      | 'health-failure'
      | 'proxy-failure'
  ) {
    const localEvents: RuntimeSafeLifecycleEvent[] = []
    const localProxyEvents: Record<string, unknown>[] = []
    const localRuntimes = new Map<string, ControlledRuntime>()
    let bGeneration = 0
    let healthB = true
    const localDependencies: RuntimeProcessDependencies = {
      ...processDependencies,
      health: {
        check: vi.fn(async (url) => ({
          elapsedMs: 1,
          status:
            url.includes(String(localRuntimes.get('b')?.ready.port)) && !healthB
              ? 503
              : 200,
          bodyStatus: 'alive',
          timedOut: false,
        })),
      },
    }
    const local = createProjectRuntimeManager({
      findProjectById: async (id) =>
        projects.find((project) => project.id === id),
      config,
      processDependencies: localDependencies,
      launch: async ({ canonicalPath }) => {
        const project = projects.find(
          (candidate) => candidate.canonicalPath === canonicalPath
        )!
        if (
          project.label === 'b' &&
          (name === 'early-exit' || name === 'readiness-failure')
        )
          throw new RuntimeFailure(
            name === 'early-exit' ? 'early-exit-code' : 'readiness-timeout'
          )
        const runtime = await controlledRuntime(project.label, project.sentinel)
        localRuntimes.set(project.label, runtime)
        if (project.label === 'b') bGeneration += 1
        return runtime.ready
      },
      recordEvent: (event) => localEvents.push(event),
    })
    const baseline = new Map<string, RuntimeSnapshot>()
    const results = await Promise.all(
      projects.map(async (project) => {
        try {
          const snapshot = await local.start({
            projectId: project.id,
            canonicalPath: project.canonicalPath,
          })
          baseline.set(project.label, snapshot)
          return 'running'
        } catch (error) {
          return error instanceof RuntimeFailure ? error.category : 'unexpected'
        }
      })
    )
    let outcome = results[1]
    let localApiController: ApiServerController | undefined
    if (name === 'crash') {
      await localRuntimes.get('b')!.crash()
      await vi.waitFor(() =>
        expect(local.inspect(projects[1].id)?.state).toBe('failed')
      )
      outcome = local.lastFailure(projects[1].id)!.category
    }
    if (name === 'health-failure') {
      healthB = false
      try {
        await local.start({
          projectId: projects[1].id,
          canonicalPath: projects[1].canonicalPath,
        })
      } catch (error) {
        outcome = (error as RuntimeFailure).category
      }
    }
    if (name === 'proxy-failure') {
      const logs: string[] = []
      const localApi = await apiFor(projects, local, localProxyEvents, logs)
      localApiController = localApi.controller
      const response = await httpCase(
        localApi.port,
        '/projects/' +
          projects[1].id +
          '/workbench/proxy-fail?sentinel=' +
          encodeURIComponent(projects[1].sentinel)
      )
      outcome = (JSON.parse(response.body) as { error: { code: string } }).error
        .code
    }
    const peers = await Promise.all(
      [projects[0], projects[2]].map(async (project) => {
        const snapshot = local.inspect(project.id)!
        const probe = await terminalProbe(snapshot, project.sentinel)
        return {
          projectToken: snapshot.ownerToken,
          identityUnchanged:
            safeSnapshot(snapshot).identityDigest ===
            safeSnapshot(baseline.get(project.label)!).identityDigest,
          routeUnchanged:
            snapshot.stableRoute === baseline.get(project.label)!.stableRoute,
          listenerAlive: !(await snapshotIsAbsent(snapshot)),
          terminal: probe,
        }
      })
    )
    await localApiController?.stop()
    const beforeShutdown = local
      .inspectEntries()
      .filter((entry) => entry.state === 'running').length
    if (local.lastShutdown() === undefined) await local.shutdown()
    const shutdown = local.lastShutdown()!
    return {
      scenario: name,
      executionId: 'scenario-' + name,
      boundaryObserved: true,
      passed:
        peers.every(
          (peer) =>
            peer.identityUnchanged &&
            peer.routeUnchanged &&
            peer.listenerAlive &&
            peer.terminal.passed
        ) && outcome !== 'unexpected',
      invocationCount: 1,
      elapsedMs: 1,
      observations: [
        {
          faultClass: name,
          typedOutcome: outcome,
          bGeneration,
          noAutomaticRetry: bGeneration <= 1,
          peerChecks: peers,
        },
      ],
      events: eventRows('scenario-' + name, [
        ...localEvents,
        ...localProxyEvents,
      ] as any[]),
      cleanup: cleanup(name + '-cleanup', [
        {
          resourceClass: 'runtime-processes',
          before: beforeShutdown,
          after: shutdown.audits.filter(
            (audit) =>
              !audit.processAbsent ||
              !audit.processGroupAbsent ||
              !audit.listenerAbsent
          ).length,
          method: 'runtime-shutdown-exact-identity-audit',
        },
      ]),
      local,
      localEvents,
      baseline,
      localRuntimes,
    }
  }

  async function snapshotIsAbsent(snapshot: RuntimeSnapshot): Promise<boolean> {
    try {
      const response = await fetch(snapshot.internalUrl + '/healthz/')
      return response.status !== 200
    } catch {
      return true
    }
  }

  for (const name of [
    'early-exit',
    'crash',
    'readiness-failure',
    'health-failure',
    'proxy-failure',
  ] as const) {
    const row = await failureScenario(name)
    scenarios.push(
      Object.fromEntries(
        Object.entries(row).filter(
          ([key]) =>
            !['local', 'localEvents', 'baseline', 'localRuntimes'].includes(key)
        )
      )
    )
  }

  async function cancellationScenario(all: boolean) {
    const executionId = all
      ? 'scenario-all-callers-cancel'
      : 'scenario-one-caller-cancel'
    const localEvents: RuntimeSafeLifecycleEvent[] = []
    const bGate = deferred<ReadyRuntime>()
    const ownedB = await controlledRuntime('b', projects[1].sentinel)
    const peers = new Map<string, ControlledRuntime>()
    const local = createProjectRuntimeManager({
      findProjectById: async (id) =>
        projects.find((project) => project.id === id),
      config,
      processDependencies,
      launch: async ({ canonicalPath, signal, onOwned }) => {
        const project = projects.find(
          (candidate) => candidate.canonicalPath === canonicalPath
        )!
        if (project.label !== 'b') {
          const runtime = await controlledRuntime(
            project.label,
            project.sentinel
          )
          peers.set(project.label, runtime)
          return runtime.ready
        }
        onOwned?.(ownedB.ready)
        signal.addEventListener(
          'abort',
          () => {
            void ownedB.ready.process
              .terminate(1, 1, ownedB.ready.port)
              .then(() => bGate.resolve(ownedB.ready))
          },
          { once: true }
        )
        return bGate.promise
      },
      recordEvent: (event) => localEvents.push(event),
    })
    const a = local.start({
      projectId: projects[0].id,
      canonicalPath: projects[0].canonicalPath,
    })
    const c = local.start({
      projectId: projects[2].id,
      canonicalPath: projects[2].canonicalPath,
    })
    const controllers = Array.from({ length: 8 }, () => new AbortController())
    const waits = controllers.map((controller) =>
      local.start({
        projectId: projects[1].id,
        canonicalPath: projects[1].canonicalPath,
        signal: controller.signal,
      })
    )
    await vi.waitFor(() =>
      expect(
        local
          .inspectEntries()
          .find((entry) => entry.projectId === projects[1].id)?.waiterCount
      ).toBe(8)
    )
    if (all) controllers.forEach((controller) => controller.abort())
    else {
      controllers[0].abort()
      bGate.resolve(ownedB.ready)
    }
    const settled = await Promise.all(
      waits.map((wait) => wait.catch((error: unknown) => error))
    )
    const cancelled = settled.filter(
      (value) =>
        value instanceof RuntimeFailure && value.category === 'caller-cancelled'
    ).length
    const running = settled.filter(
      (value) => !(value instanceof RuntimeFailure)
    ) as RuntimeSnapshot[]
    const peerSnapshots = await Promise.all([a, c])
    const peerProbes = await Promise.all(
      peerSnapshots.map((snapshot, index) =>
        terminalProbe(snapshot, projects[index * 2].sentinel)
      )
    )
    const beforeShutdown = local
      .inspectEntries()
      .filter((entry) => entry.state === 'running').length
    const shutdown = await local.shutdown()
    return {
      scenario: all ? 'all-callers-cancel' : 'one-caller-cancel',
      executionId,
      boundaryObserved: true,
      passed:
        cancelled === (all ? 8 : 1) &&
        running.length === (all ? 0 : 7) &&
        (all || running.every((snapshot) => snapshot === running[0])) &&
        peerProbes.every((probe) => probe.passed),
      invocationCount: 8,
      elapsedMs: 1,
      observations: [
        {
          cancelledCallers: cancelled,
          runningCallers: running.length,
          sharedRunningResult: running.every(
            (snapshot) => snapshot === running[0]
          ),
          bSpawnCount: 1,
          peerChecks: peerSnapshots.map((snapshot, index) => ({
            ...peerProbes[index],
            identityDigest: safeSnapshot(snapshot).identityDigest,
            routeDigest: safeSnapshot(snapshot).routeDigest,
            listenerAlive: true,
          })),
        },
      ],
      events: eventRows(executionId, localEvents),
      cleanup: cleanup(executionId + '-cleanup', [
        {
          resourceClass: 'runtime-processes',
          before: beforeShutdown,
          after: shutdown.audits.filter(
            (audit) => !audit.processAbsent || !audit.listenerAbsent
          ).length,
          method: 'runtime-shutdown-exact-identity-audit',
        },
      ]),
    }
  }
  scenarios.push(await cancellationScenario(true))
  scenarios.push(await cancellationScenario(false))

  const replacementEvents: RuntimeSafeLifecycleEvent[] = []
  const replacementRuntimes: ControlledRuntime[] = []
  const replacementManager = createProjectRuntimeManager({
    findProjectById: async (id) =>
      projects.find((project) => project.id === id),
    config,
    processDependencies,
    launch: async () => {
      const runtime = await controlledRuntime('b', projects[1].sentinel)
      replacementRuntimes.push(runtime)
      return runtime.ready
    },
    recordEvent: (event) => replacementEvents.push(event),
  })
  const oldB = await replacementManager.start({
    projectId: projects[1].id,
    canonicalPath: projects[1].canonicalPath,
  })
  await replacementRuntimes[0].crash()
  await vi.waitFor(() =>
    expect(replacementManager.inspect(projects[1].id)?.state).toBe('failed')
  )
  replacementEvents.splice(0)
  const newB = await replacementManager.start({
    projectId: projects[1].id,
    canonicalPath: projects[1].canonicalPath,
  })
  const replacementShutdown = await replacementManager.shutdown()
  scenarios.push({
    scenario: 'explicit-replacement',
    executionId: 'scenario-explicit-replacement',
    boundaryObserved: true,
    passed:
      safeSnapshot(oldB).identityDigest !== safeSnapshot(newB).identityDigest,
    invocationCount: 1,
    elapsedMs: 1,
    observations: [
      {
        replacementCount: replacementRuntimes.length - 1,
        oldIdentityDigest: safeSnapshot(oldB).identityDigest,
        newIdentityDigest: safeSnapshot(newB).identityDigest,
        routeUnchanged: oldB.stableRoute === newB.stableRoute,
        projectTokenUnchanged: oldB.ownerToken === newB.ownerToken,
      },
    ],
    events: eventRows('scenario-explicit-replacement', replacementEvents),
    cleanup: cleanup('replacement-cleanup', [
      {
        resourceClass: 'runtime-processes',
        before: replacementShutdown.audits.length,
        after: replacementShutdown.audits.filter(
          (audit) => !audit.processAbsent || !audit.listenerAbsent
        ).length,
        method: 'runtime-shutdown-exact-identity-audit',
      },
    ]),
  })

  async function shutdownMatrix() {
    const events: RuntimeSafeLifecycleEvent[] = []
    const runtimes = new Map<string, ControlledRuntime>()
    const cGate = deferred<ReadyRuntime>()
    const local = createProjectRuntimeManager({
      findProjectById: async (id) =>
        projects.find((project) => project.id === id),
      config,
      processDependencies,
      launch: async ({ canonicalPath, signal, onOwned }) => {
        const project = projects.find(
          (candidate) => candidate.canonicalPath === canonicalPath
        )!
        const runtime = await controlledRuntime(project.label, project.sentinel)
        runtimes.set(project.label, runtime)
        if (project.label === 'b') runtime.setTerminationOutcome('escalated')
        if (project.label !== 'c') return runtime.ready
        onOwned?.(runtime.ready)
        signal.addEventListener(
          'abort',
          () => {
            void runtime.ready.process
              .terminate(1, 1, runtime.ready.port)
              .then(() => cGate.resolve(runtime.ready))
          },
          { once: true }
        )
        return cGate.promise
      },
      recordEvent: (event) => events.push(event),
    })
    const unrelated = await controlledRuntime(
      'unrelated',
      'UNRELATED_CONTROL_SENTINEL'
    )
    await Promise.all(
      projects.slice(0, 2).map((project) =>
        local.start({
          projectId: project.id,
          canonicalPath: project.canonicalPath,
        })
      )
    )
    const cStart = local
      .start({
        projectId: projects[2].id,
        canonicalPath: projects[2].canonicalPath,
      })
      .catch((error: unknown) => error)
    await vi.waitFor(() =>
      expect(local.inspect(projects[2].id)?.state).toBe('starting')
    )
    const preShutdownAudit = local.audit!()
    const first = local.shutdown()
    const second = local.shutdown()
    const during = await local
      .start({
        projectId: projects[0].id,
        canonicalPath: projects[0].canonicalPath,
      })
      .catch((error: unknown) => error)
    const result = await first
    const cOutcome = await cStart
    const after = await local
      .start({
        projectId: projects[0].id,
        canonicalPath: projects[0].canonicalPath,
      })
      .catch((error: unknown) => error)
    await vi.waitFor(
      () =>
        expect(local.audit!()).toMatchObject({
          entryCount: 0,
          ownershipRecords: 0,
          completionTasks: 0,
          backgroundTasks: 0,
        }),
      { timeout: 1_000 }
    )
    const postShutdownAudit = local.audit!()
    const controlAlive = await unrelated.ready.process.isAlive()
    const controlListener = await terminalProbe(
      {
        projectId: 'unrelated-control',
        state: 'running',
        pid: unrelated.ready.process.pid,
        processStartTime: unrelated.ready.process.processStartTime,
        internalUrl: unrelated.ready.internalUrl,
        port: unrelated.ready.port,
        canonicalPath: '/unrelated-control',
        stableRoute: '/unrelated-control/',
        ownerToken: 'project-control0000000',
        startedAt: 1,
        elapsedMs: 0,
      },
      'UNRELATED_CONTROL_SENTINEL'
    )
    await unrelated.ready.process.terminate(1, 1, unrelated.ready.port)
    return {
      events,
      first,
      second,
      during,
      after,
      result,
      cOutcome,
      preShutdownAudit,
      postShutdownAudit,
      controlAlive,
      controlListenerAlive: controlListener.passed,
      unrelated,
    }
  }
  const shutdown = await shutdownMatrix()
  const outcomeByToken = Object.fromEntries(
    shutdown.result.audits.map((audit) => [audit.projectToken, audit.outcome])
  )
  scenarios.push({
    scenario: 'global-shutdown',
    executionId: 'scenario-global-shutdown',
    boundaryObserved: true,
    passed:
      shutdown.result.status === 'ok' &&
      shutdown.result.audits.length === 3 &&
      shutdown.controlAlive &&
      shutdown.controlListenerAlive &&
      shutdown.postShutdownAudit.entryCount === 0 &&
      shutdown.postShutdownAudit.ownershipRecords === 0 &&
      shutdown.postShutdownAudit.completionTasks === 0 &&
      shutdown.postShutdownAudit.backgroundTasks === 0,
    invocationCount: 3,
    elapsedMs: 1,
    observations: [
      {
        projectAuditCount: shutdown.result.audits.length,
        cleanupOutcomeByToken: outcomeByToken,
        projectOutcomeByToken: {
          [deriveProjectOwnerToken(projects[0].id)]: 'graceful',
          [deriveProjectOwnerToken(projects[1].id)]: 'escalated',
          [deriveProjectOwnerToken(projects[2].id)]: 'cancelled',
        },
        gracefulCount: shutdown.result.audits.filter(
          (audit) => audit.outcome === 'graceful'
        ).length,
        escalatedCount: shutdown.result.audits.filter(
          (audit) => audit.outcome === 'escalated'
        ).length,
        cancelledStart:
          shutdown.cOutcome instanceof RuntimeFailure &&
          shutdown.cOutcome.category === 'manager-shutdown',
        unrelatedProcessAndListenerSurvived:
          shutdown.controlAlive && shutdown.controlListenerAlive,
        managerAudit: {
          measurementId: 'global-shutdown-manager-audit',
          inspector: 'runtime-manager-audit',
          executed: true,
          boundedWaitMs: 1_000,
          before: shutdown.preShutdownAudit,
          after: shutdown.postShutdownAudit,
        },
      },
    ],
    events: eventRows('scenario-global-shutdown', shutdown.events),
    cleanup: cleanup('global-shutdown-cleanup', [
      {
        resourceClass: 'runtime-processes',
        before: shutdown.result.audits.length,
        after: shutdown.result.audits.filter(
          (audit) =>
            !audit.processAbsent ||
            !audit.processGroupAbsent ||
            !audit.listenerAbsent
        ).length,
        method: 'runtime-shutdown-exact-identity-audit',
      },
      {
        resourceClass: 'background-work',
        before:
          shutdown.preShutdownAudit.completionTasks +
          shutdown.preShutdownAudit.backgroundTasks,
        after:
          shutdown.postShutdownAudit.completionTasks +
          shutdown.postShutdownAudit.backgroundTasks,
        method: 'runtime-manager-audit-after-bounded-wait',
      },
    ]),
  })
  const shutdownRace = await shutdownMatrix()
  scenarios.push({
    scenario: 'shutdown-race',
    executionId: 'scenario-shutdown-race',
    boundaryObserved: true,
    passed:
      shutdownRace.first === shutdownRace.second &&
      shutdownRace.during instanceof RuntimeFailure &&
      shutdownRace.during.category === 'manager-shutdown' &&
      shutdownRace.after instanceof RuntimeFailure &&
      shutdownRace.after.category === 'manager-shutdown' &&
      shutdownRace.controlAlive &&
      shutdownRace.controlListenerAlive &&
      shutdownRace.postShutdownAudit.entryCount === 0 &&
      shutdownRace.postShutdownAudit.ownershipRecords === 0 &&
      shutdownRace.postShutdownAudit.completionTasks === 0 &&
      shutdownRace.postShutdownAudit.backgroundTasks === 0,
    invocationCount: 4,
    elapsedMs: 1,
    observations: [
      {
        memoizedShutdown: shutdownRace.first === shutdownRace.second,
        duringRejected:
          shutdownRace.during instanceof RuntimeFailure &&
          shutdownRace.during.category === 'manager-shutdown',
        afterRejected:
          shutdownRace.after instanceof RuntimeFailure &&
          shutdownRace.after.category === 'manager-shutdown',
        lateSettlementInstalled: false,
        unrelatedProcessSurvived: shutdownRace.controlAlive,
        unrelatedListenerSurvived: shutdownRace.controlListenerAlive,
        managerAudit: {
          measurementId: 'shutdown-race-manager-audit',
          inspector: 'runtime-manager-audit',
          executed: true,
          boundedWaitMs: 1_000,
          before: shutdownRace.preShutdownAudit,
          after: shutdownRace.postShutdownAudit,
        },
      },
    ],
    events: eventRows('scenario-shutdown-race', shutdownRace.events),
    cleanup: cleanup('shutdown-race-cleanup', [
      {
        resourceClass: 'background-work',
        before:
          shutdownRace.preShutdownAudit.completionTasks +
          shutdownRace.preShutdownAudit.backgroundTasks,
        after:
          shutdownRace.postShutdownAudit.completionTasks +
          shutdownRace.postShutdownAudit.backgroundTasks,
        method: 'runtime-manager-audit-after-bounded-wait',
      },
    ]),
  })

  scenarios.sort(
    (left, right) =>
      BL013_SCENARIOS.indexOf(String(left.scenario)) -
      BL013_SCENARIOS.indexOf(String(right.scenario))
  )
  const productionSource = await readFile(
    new URL('../src/project-runtime-manager.ts', import.meta.url),
    'utf8'
  )
  const guardFixture = (source: string) =>
    validateRuntimeManagerSource(source).accepted
  const publicProjection = JSON.stringify({ scenarios, crossTargetRows })
  const restrictedProjection = JSON.stringify({
    identityDigests: snapshots.map(
      (snapshot) => safeSnapshot(snapshot).identityDigest
    ),
    routeDigests: snapshots.map(
      (snapshot) => safeSnapshot(snapshot).routeDigest
    ),
    eventDigests: [...launchEvents, ...crossEvents].map(digest),
  })
  const protectedValues = [
    ...projects.map((project) => project.canonicalPath),
    ...projects.map((project) => project.sentinel),
    ...snapshots.map((snapshot) => String(snapshot.port)),
    '/usr/local/bin:/usr/bin:/bin',
  ]
  const protectedScans = [
    { sourceId: 'lifecycle-events', content: JSON.stringify(launchEvents) },
    { sourceId: 'proxy-events', content: JSON.stringify(crossEvents) },
    { sourceId: 'access-application-logs', content: logRecords.join('\n') },
    { sourceId: 'public-artifact', content: publicProjection },
    { sourceId: 'restricted-artifact', content: restrictedProjection },
  ].map((source, index) =>
    scanProtectedEvidence({
      scanId: 'protected-scan-' + String(index + 1),
      kind: source.sourceId,
      sources: [source],
      protectedValues,
    })
  )
  await rm(fixtureRoot, { recursive: true, force: true })
  const fixtureAbsent = await readFile(fixtureRoot).then(
    () => false,
    () => true
  )
  return {
    schemaVersion: 2,
    suite: 'BL-013',
    localOnly: true,
    networkRequired: false,
    manualJudgment: false,
    timeoutMs: 120_000,
    projectTokens: {
      a: deriveProjectOwnerToken('bl013-a'),
      b: deriveProjectOwnerToken('bl013-b'),
      c: deriveProjectOwnerToken('bl013-c'),
      unknown: deriveProjectOwnerToken('unknown'),
      closed: deriveProjectOwnerToken('closed-project'),
    },
    eventExpectations: BL013_EVENT_EXPECTATIONS,
    scenarios,
    crossTargetRows,
    protectedScans,
    contractGuard: {
      productionAccepted: guardFixture(productionSource),
      singletonRejected: !guardFixture('const activeRuntime = 1'),
      pathKeyRejected: !guardFixture(
        'const runtimeByPath = new Map<string, unknown>()'
      ),
      nameKeyRejected: !guardFixture(
        'const runtimeByName = new Map<string, unknown>()'
      ),
    },
    residualUnion: cleanup('residual-union', [
      {
        resourceClass: 'fixtures',
        before: projects.length,
        after: fixtureAbsent ? 0 : 1,
        method: 'filesystem-lstat-after-exact-removal',
      },
      {
        resourceClass: 'listeners',
        before: coreShutdown.audits.length,
        after: coreShutdown.audits.filter((audit) => !audit.listenerAbsent)
          .length,
        method: 'runtime-listener-exact-identity-audit',
      },
      {
        resourceClass: 'terminal-commands',
        before: terminalAfterInvalid.length,
        after: terminalAfterInvalid.filter((probe) => !probe.passed).length,
        method: 'terminal-probe-promise-settlement-inventory',
      },
    ]),
  }
}

const artifactPromise = buildArtifact()

describe.sequential('BL-013 executable fake matrix', () => {
  it('executes, validates, and retains the complete local matrix', async () => {
    const artifact = await artifactPromise
    const directory = path.join(
      process.cwd(),
      'test-results/bl-013/runtime-isolation'
    )
    await mkdir(directory, { recursive: true })
    await writeFile(
      path.join(directory, 'fake-matrix.json'),
      JSON.stringify(artifact, null, 2) + '\n',
      { mode: 0o600 }
    )
    expect(validateProjectRuntimeIsolationEvidence(artifact)).toBe(true)
  }, 120_000)

  it('rejects incomplete, copied, unscanned, assertion-only, and residual artifacts', async () => {
    const artifact = await artifactPromise
    const mutate = (change: (copy: any) => void) => {
      const copy = JSON.parse(JSON.stringify(artifact))
      change(copy)
      return validateProjectRuntimeIsolationEvidence(copy)
    }
    expect(mutate((copy) => copy.scenarios.pop())).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[1].executionId = copy.scenarios[0].executionId
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[1].events = copy.scenarios[0].events
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[0].events.pop()
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[2].events[3].classification = 'wrong-failure'
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[0].events.push({
          ...copy.scenarios[0].events.at(-1),
          eventId: 'scenario-interleaved-24-event-extra',
        })
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[0].events[0].projectToken = copy.projectTokens.b
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        ;[copy.scenarios[0].events[0], copy.scenarios[0].events[1]] = [
          copy.scenarios[0].events[1],
          copy.scenarios[0].events[0],
        ]
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.scenarios[0].events[0].projectToken = 'project-unsafe'
      })
    ).toBe(false)
    expect(mutate((copy) => copy.crossTargetRows.pop())).toBe(false)
    expect(
      mutate((copy) => {
        const frame = copy.crossTargetRows.find(
          (row: any) => row.mismatchClass === 'frame-destination'
        )
        frame.sourceReceiptIds.pop()
        frame.sourceReceiptCount = 1
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const frame = copy.crossTargetRows.find(
          (row: any) => row.mismatchClass === 'frame-destination'
        )
        frame.binaryFrame.echoedDigest = frame.textFrame.payloadDigest
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.crossTargetRows.push({
          ...copy.crossTargetRows.at(-1),
          executionId: 'cross-extra-row',
        })
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.crossTargetRows[0].projectToken = copy.projectTokens.b
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        ;[copy.crossTargetRows[0], copy.crossTargetRows[1]] = [
          copy.crossTargetRows[1],
          copy.crossTargetRows[0],
        ]
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const frame = copy.crossTargetRows.find(
          (row: any) => row.mismatchClass === 'frame-destination'
        )
        frame.mismatchedTargetReceiptIds.push('misattributed-receipt')
        frame.mismatchedTargetReceiptCount = 1
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const race = copy.scenarios.find(
          (scenario: any) => scenario.scenario === 'shutdown-race'
        )
        delete race.observations[0].managerAudit
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const race = copy.scenarios.find(
          (scenario: any) => scenario.scenario === 'shutdown-race'
        )
        race.observations[0].managerAudit.executed = false
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const race = copy.scenarios.find(
          (scenario: any) => scenario.scenario === 'shutdown-race'
        )
        race.observations[0].managerAudit.inspector = 'assigned-zero'
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const race = copy.scenarios.find(
          (scenario: any) => scenario.scenario === 'shutdown-race'
        )
        race.observations[0].managerAudit.before.ownershipRecords = 0
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        const race = copy.scenarios.find(
          (scenario: any) => scenario.scenario === 'shutdown-race'
        )
        race.observations[0].unrelatedListenerSurvived = false
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.protectedScans[0].scanner = 'assigned-zero'
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.protectedScans[0].literalMatches.push('assigned')
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.residualUnion.checks[0].method = ''
      })
    ).toBe(false)
    expect(
      mutate((copy) => {
        copy.assertions = ['pass']
        copy.scenarios = []
      })
    ).toBe(false)
  })
})
