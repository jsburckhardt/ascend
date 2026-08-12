import { createHash } from 'node:crypto'
import { lstat, readFile, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { createConnection } from 'node:net'
import os from 'node:os'
import { expect, test, type BrowserContext } from '@playwright/test'
import {
  createApiServerController,
  type ApiServerController,
} from '../../apps/api/src/api-server.js'
import type { ProjectLibrary } from '../../apps/api/src/project-library.js'
import { createProjectRuntimeConfig } from '../../apps/api/src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../../apps/api/src/project-runtime-manager.js'
import { createWorkbenchProxyManager } from '../../apps/api/src/workbench-proxy-manager.js'
import {
  assertObservedInventoryEmpty,
  classifyWorkbenchBrowserRequest,
  classifyWorkbenchWebSocketUrl,
  createResourceTracker,
  scanSentinels,
  WORKBENCH_BROWSER_CLASSIFIER_VECTORS,
  WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
} from '../../apps/api/src/workbench-route-proof-observation.js'
import { mergeWorkbenchRouteEvidence } from '../../apps/api/src/workbench-route-evidence.js'
import {
  WORKBENCH_ROUTE_TERMINAL_INPUT,
  WORKBENCH_ROUTE_TERMINAL_SHA256,
  WORKBENCH_ROUTE_TERMINAL_TEMP,
} from '../../apps/api/src/cli/workbench-route-terminal-proof.js'
import { PRESENTATION_VIEWPORT } from '../../apps/api/src/workbench-presentation-contract.js'
import {
  canonicalFixturePath,
  EXPLORER_SENTINEL,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
} from '../../apps/api/src/workbench-proof-contract.js'

const designated = process.env.BL011_DESIGNATED === '1'
test.describe.configure({ mode: 'serial', retries: 0 })

const listenerAbsent = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(500)
    socket.once('connect', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(true))
    socket.once('timeout', () => {
      socket.destroy()
      resolve(true)
    })
  })

const previewVisible = async (context: BrowserContext): Promise<boolean> => {
  for (const page of context.pages()) {
    for (const frame of page.frames()) {
      try {
        if (
          await frame
            .getByText(MARKDOWN_RENDERED_SENTINEL, { exact: true })
            .first()
            .isVisible()
        )
          return true
      } catch {
        // The webview can replace a frame while Preview initializes.
      }
    }
  }
  return false
}

test('real Chromium derives three stable-route operations and proves observed cleanup', async ({
  browser,
}) => {
  test.skip(
    !designated,
    'Set BL011_DESIGNATED=1 for the designated real workbench proof'
  )
  test.setTimeout(90_000)
  const canonicalPath = await canonicalFixturePath()
  const project = {
    id: 'bl011-opaque-project',
    name: 'BL-011',
    canonicalPath,
    createdAt: Date.now(),
  }
  const library: ProjectLibrary = {
    create: async () => ({ disposition: 'created', project }),
    findById: async (id) => (id === project.id ? project : undefined),
    list: async () => [project],
    closeProject: async () => ({ disposition: 'closed', id: project.id }),
    close: () => undefined,
  }
  expect(process.env.EXTENSIONS_GALLERY).toBe('{}')
  const proxyEvents: unknown[] = []
  const socketRoleObservations: Array<{
    connectionOrdinal: number
    role: 'Management' | 'ExtensionHost' | 'unknown'
  }> = []
  let controller: ApiServerController | undefined
  const contextTracker = createResourceTracker('browser-context')
  const pageTracker = createResourceTracker('browser-page')
  const requestTracker = createResourceTracker('browser-request')
  const webSocketTracker = createResourceTracker('browser-websocket')
  const networkRequests: Array<{
    id: string
    contextId: string
    url: string
    resourceType: string
  }> = []
  const networkResponses: Array<{
    url: string
    status: number
    headers: Record<string, string>
    bodyDigest?: string
    bodyAuthorityMatches?: number
    bodyError?: string
  }> = []
  const responseCaptures: Promise<void>[] = []
  const capturedResponseBodies: Array<{
    record: (typeof networkResponses)[number]
    body: Buffer
  }> = []
  const webSocketEvents: Array<{ id: string; contextId: string; url: string }> =
    []
  let safeRequestObservations: Array<Record<string, unknown>> = []
  const safeWebviewFrameObservations: Array<Record<string, unknown>> = []
  const observedFrameShapes: Array<Record<string, unknown>> = []
  let safeWebSocketObservations: Array<Record<string, unknown>> = []
  let marketplaceRequestCount = 0
  let forbiddenRequestCount = 0
  const browserDiagnostics: string[] = []
  const identities: Array<{
    pid: number | null
    processStartTime: string | null
    port: number | null
  }> = []
  const contexts: BrowserContext[] = []
  let explorerObservations = 0
  let previewObservations = 0
  let terminal: Record<string, unknown> | undefined
  let internalPort = 0
  let origin = ''
  let prefix = ''
  let requestSequence = 0
  let webSocketSequence = 0
  let app: Awaited<ReturnType<ApiServerController['start']>> | undefined
  let classifierVectorManifest: {
    acceptedIds: string[]
    rejectedIds: string[]
  } = { acceptedIds: [], rejectedIds: [] }

  try {
    controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: (projectLibrary, recordEvent) => {
        const defaults = createProjectRuntimeConfig()
        return createProjectRuntimeManager({
          findProjectById: (id) => projectLibrary.findById(id),
          recordEvent,
          config: createProjectRuntimeConfig({
            environment: {
              ...defaults.environment,
              EXTENSIONS_GALLERY: process.env.EXTENSIONS_GALLERY,
            },
          }),
        })
      },
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          recordWebSocketDiagnostic: (diagnostic) =>
            proxyEvents.push(diagnostic),
          recordWebSocketRole: (observation) =>
            socketRoleObservations.push(observation),
          recordEvent: (event) => proxyEvents.push(event),
        }),
      createProjectRegistration: async () => ({
        register: async () => ({ category: 'path_not_found', field: 'path' }),
        close: () => undefined,
      }),
    })
    app = await controller.start()
    const address = app.server.address() as AddressInfo
    origin = `http://127.0.0.1:${address.port}`
    prefix = `/projects/${project.id}/workbench/`
    const navigationUrl = origin + prefix
    const classifierVectorResults = WORKBENCH_BROWSER_CLASSIFIER_VECTORS.map(
      (vector) => ({
        id: vector.id,
        expected: vector.expected,
        actual: classifyWorkbenchBrowserRequest(
          vector.url,
          origin,
          prefix,
          'other'
        ).classification,
      })
    )
    for (const result of classifierVectorResults)
      expect(result.actual, result.id).toBe(result.expected)
    classifierVectorManifest = {
      acceptedIds: classifierVectorResults
        .filter((result) => result.actual === 'trusted-markdown-webview')
        .map((result) => result.id),
      rejectedIds: classifierVectorResults
        .filter((result) => result.actual === 'forbidden-external')
        .map((result) => result.id),
    }
    expect(classifierVectorManifest.acceptedIds).toEqual([
      'trusted-retained-hostname',
    ])
    expect(classifierVectorManifest.rejectedIds).toHaveLength(22)

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const contextId = `context-${attempt}`
      const context = await browser.newContext({
        viewport: PRESENTATION_VIEWPORT,
        storageState: { cookies: [], origins: [] },
      })
      contexts.push(context)
      contextTracker.open(contextId)
      context.once('close', () => {
        contextTracker.close(contextId)
        for (const request of networkRequests.filter(
          (entry) => entry.contextId === contextId
        ))
          if (requestTracker.inventory().pending.includes(request.id))
            requestTracker.close(request.id)
        for (const socket of webSocketEvents.filter(
          (entry) => entry.contextId === contextId
        ))
          if (webSocketTracker.inventory().pending.includes(socket.id))
            webSocketTracker.close(socket.id)
      })
      const requestIds = new WeakMap<object, string>()
      context.on('request', (request) => {
        const id = `request-${++requestSequence}`
        requestIds.set(request, id)
        requestTracker.open(id)
        networkRequests.push({
          id,
          contextId,
          url: request.url(),
          resourceType: request.resourceType(),
        })
      })
      const closeRequest = (request: object): void => {
        const id = requestIds.get(request)
        if (id !== undefined && requestTracker.inventory().pending.includes(id))
          requestTracker.close(id)
      }
      context.on('requestfinished', closeRequest)
      context.on('requestfailed', (request) => {
        closeRequest(request)
        browserDiagnostics.push(
          `failed:${request.failure()?.errorText}:${request.url()}`
        )
      })
      context.on('response', (response) => {
        const record = {
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
        } as (typeof networkResponses)[number]
        networkResponses.push(record)
        responseCaptures.push(
          response
            .body()
            .then((body) => {
              record.bodyDigest = createHash('sha256')
                .update(body)
                .digest('hex')
              capturedResponseBodies.push({ record, body })
            })
            .catch((error) => {
              record.bodyError = (error as Error).name
            })
        )
      })
      const page = await context.newPage()
      const pageId = `page-${attempt}`
      pageTracker.open(pageId)
      page.once('close', () => pageTracker.close(pageId))
      page.on('response', (response) => {
        if (response.status() >= 400)
          browserDiagnostics.push(
            `response:${response.status()}:${response.url()}`
          )
      })
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type()))
          browserDiagnostics.push(`console:${message.type()}:${message.text()}`)
      })
      page.on('websocket', (socket) => {
        const id = `websocket-${++webSocketSequence}`
        webSocketTracker.open(id)
        webSocketEvents.push({ id, contextId, url: socket.url() })
        socket.once('close', () => webSocketTracker.close(id))
        socket.on('socketerror', (error) =>
          browserDiagnostics.push(`websocket:${error}:${socket.url()}`)
        )
      })

      const response = await page.goto(navigationUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      expect(response?.status()).toBeGreaterThanOrEqual(200)
      expect(response?.status()).toBeLessThan(400)
      try {
        await page
          .locator('.monaco-workbench')
          .waitFor({ state: 'visible', timeout: 15_000 })
      } catch {
        const safeDiagnostics = browserDiagnostics
          .slice(-20)
          .map((entry) =>
            entry
              .replace(/https?:\/\/[^/\s]+/gu, '[origin]')
              .replace(/:[0-9]{4,5}/gu, ':[port]')
          )
        const responseStatuses = networkResponses.slice(-20).map((entry) => ({
          status: entry.status,
          pathname: new URL(entry.url).pathname,
        }))
        throw new Error(
          'Workbench did not initialize: ' +
            JSON.stringify({ safeDiagnostics, responseStatuses })
        )
      }
      await page
        .getByText(EXPLORER_SENTINEL, { exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
      explorerObservations += 1
      await page.getByText(MARKDOWN_FIXTURE, { exact: true }).first().click()
      await page
        .getByRole('button', { name: /^Open Preview to the Side/u })
        .click()
      await expect
        .poll(() => previewVisible(context), { timeout: 15_000 })
        .toBe(true)
      previewObservations += 1
      for (const observedPage of context.pages())
        for (const frame of observedPage.frames()) {
          const frameUrl = frame.url()
          if (!frameUrl.startsWith('http')) continue
          const observation = classifyWorkbenchBrowserRequest(
            frameUrl,
            origin,
            prefix,
            'webview-frame'
          )
          observedFrameShapes.push({ contextId, ...observation })
          if (observation.classification === 'trusted-markdown-webview')
            safeWebviewFrameObservations.push({ contextId, ...observation })
        }

      if (attempt === 3) {
        await page.keyboard.press('Control+Shift+Backquote')
        await page
          .locator('.terminal.xterm')
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 })
        await rm(WORKBENCH_ROUTE_TERMINAL_TEMP, { force: true })
        const command =
          'setsid /workspaces/ascend/node_modules/.bin/tsx /workspaces/ascend/apps/api/src/cli/workbench-route-terminal-proof.ts\n'
        await page.keyboard.insertText(command)
        await page.keyboard.press('Enter')
        await expect
          .poll(
            async () => {
              try {
                return JSON.parse(
                  await readFile(WORKBENCH_ROUTE_TERMINAL_TEMP, 'utf8')
                ) as Record<string, unknown>
              } catch (error) {
                if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                  return undefined
                throw error
              }
            },
            { timeout: 45_000 }
          )
          .toMatchObject({
            expectedSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
            actualSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
            passed: true,
          })
        terminal = JSON.parse(
          await readFile(WORKBENCH_ROUTE_TERMINAL_TEMP, 'utf8')
        ) as Record<string, unknown>
        expect(terminal).toMatchObject({
          input: WORKBENCH_ROUTE_TERMINAL_INPUT,
          bytes: 256 * 1024,
          expectedSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
          actualSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
          hostname: os.hostname(),
          user: 'vscode',
          cwd: canonicalPath,
          passed: true,
        })
        await rm(WORKBENCH_ROUTE_TERMINAL_TEMP, { force: true })
      }
      const snapshot = app.projectRuntime.inspect(project.id)
      expect(snapshot).toMatchObject({ state: 'running', canonicalPath })
      internalPort = snapshot?.port ?? 0
      identities.push({
        pid: snapshot?.pid ?? null,
        processStartTime: snapshot?.processStartTime ?? null,
        port: snapshot?.port ?? null,
      })
      await context.close()
      contexts.splice(contexts.indexOf(context), 1)
    }

    await Promise.all(responseCaptures)
    for (const capture of capturedResponseBodies)
      capture.record.bodyAuthorityMatches =
        capture.body.toString('latin1').split(`:${internalPort}`).length - 1
    const navigationEvents = networkRequests.filter(
      (event) =>
        event.resourceType === 'document' && event.url === navigationUrl
    )
    const navigationCountsByContext = new Map<string, number>()
    for (const event of navigationEvents)
      navigationCountsByContext.set(
        event.contextId,
        (navigationCountsByContext.get(event.contextId) ?? 0) + 1
      )
    const webSocketCountsByContext = new Map<string, number>()
    for (const event of webSocketEvents)
      webSocketCountsByContext.set(
        event.contextId,
        (webSocketCountsByContext.get(event.contextId) ?? 0) + 1
      )
    const navigationRetries = [...navigationCountsByContext.values()].reduce(
      (total, count) => total + Math.max(0, count - 1),
      0
    )
    const reconnectRetries = webSocketEvents.filter(
      (event) => new URL(event.url).searchParams.get('reconnection') === 'true'
    ).length
    const retryAttempts = navigationRetries + reconnectRetries
    expect({
      navigationAttempts: navigationEvents.length,
      webSocketAttempts: webSocketCountsByContext.size,
      webSocketNetworkConnections: webSocketEvents.length,
      retryAttempts,
    }).toEqual({
      navigationAttempts: 3,
      webSocketAttempts: 3,
      webSocketNetworkConnections: 6,
      retryAttempts: 0,
    })
    expect([...webSocketCountsByContext.values()]).toEqual([2, 2, 2])
    expect(
      new Set(identities.map((identity) => JSON.stringify(identity))).size
    ).toBe(1)
    expect(explorerObservations).toBe(3)
    expect(previewObservations).toBe(3)
    expect(terminal).toBeDefined()

    await expect
      .poll(() => socketRoleObservations.length, { timeout: 10_000 })
      .toBe(6)
    const webSocketOrigin = origin.replace(/^http/u, 'ws')
    safeRequestObservations = networkRequests.map((event) => ({
      id: event.id,
      contextId: event.contextId,
      ...classifyWorkbenchBrowserRequest(
        event.url,
        origin,
        prefix,
        event.resourceType
      ),
    }))
    const trustedWebviewRequests = safeRequestObservations.filter(
      (event) => event.classification === 'trusted-markdown-webview'
    )
    marketplaceRequestCount = safeRequestObservations.filter(
      (event) => event.classification === 'marketplace'
    ).length
    forbiddenRequestCount = safeRequestObservations.filter(
      (event) => event.classification === 'forbidden-external'
    ).length
    expect(
      trustedWebviewRequests.length + safeWebviewFrameObservations.length,
      JSON.stringify({
        requestShapes: safeRequestObservations.filter(
          (event) => event.classification !== 'ascend-owned'
        ),
        frameShapes: observedFrameShapes,
      })
    ).toBeGreaterThan(0)
    expect(marketplaceRequestCount).toBe(0)
    const forbiddenRequestShapes = safeRequestObservations
      .filter((event) => event.classification === 'forbidden-external')
      .map(({ id: _id, contextId: _contextId, ...shape }) => shape)
    expect(forbiddenRequestCount, JSON.stringify(forbiddenRequestShapes)).toBe(
      0
    )

    const roles = [...socketRoleObservations].sort(
      (left, right) => left.connectionOrdinal - right.connectionOrdinal
    )
    expect(roles.map((entry) => entry.connectionOrdinal)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
    safeWebSocketObservations = webSocketEvents.map((event, index) => ({
      id: event.id,
      contextId: event.contextId,
      role: roles[index]?.role ?? 'unknown',
      ...classifyWorkbenchWebSocketUrl(
        event.url,
        webSocketOrigin,
        prefix,
        internalPort
      ),
    }))
    for (const observation of safeWebSocketObservations)
      expect(observation).toMatchObject({
        sameOrigin: true,
        stablePrefix: true,
        internalPortAbsent: true,
        reconnection: 'false',
        queryKeys: ['reconnection', 'reconnectionToken', 'skipWebSocketFrames'],
        pathnameClass: 'stable-runtime-socket',
      })
    expect(
      safeWebSocketObservations.filter((event) => event.role === 'Management')
    ).toHaveLength(3)
    expect(
      safeWebSocketObservations.filter(
        (event) => event.role === 'ExtensionHost'
      )
    ).toHaveLength(3)
    expect(
      safeWebSocketObservations.filter((event) => event.role === 'unknown')
    ).toHaveLength(0)
    for (const contextId of ['context-1', 'context-2', 'context-3'])
      expect(
        safeWebSocketObservations
          .filter((event) => event.contextId === contextId)
          .map((event) => event.role)
          .sort()
      ).toEqual(['ExtensionHost', 'Management'])
    expect(new Set(webSocketEvents.map((event) => event.url)).size).toBe(
      webSocketEvents.length
    )

    for (const event of networkRequests)
      expect(event.url).not.toContain(':' + String(internalPort))
    for (const response of networkResponses) {
      expect(response.url).not.toContain(':' + String(internalPort))
      expect(response.bodyAuthorityMatches ?? 0).toBe(0)
    }
    expect(
      browserDiagnostics.filter(
        (entry) =>
          entry.startsWith('external-origin:') ||
          entry.includes(':' + String(internalPort))
      )
    ).toEqual([])
  } finally {
    await rm(WORKBENCH_ROUTE_TERMINAL_TEMP, { force: true })
    await Promise.all(contexts.map((context) => context.close()))
    await controller?.stop()
  }

  if (controller === undefined || app === undefined)
    throw new Error('Browser proof did not start')
  const listenerProbe = {
    port: internalPort,
    absent: await listenerAbsent(internalPort),
  }
  expect(listenerProbe.absent).toBe(true)
  expect(controller.server.projectRuntime.lastShutdown()).toMatchObject({
    status: 'ok',
  })
  const inventories = {
    contexts: contextTracker.inventory(),
    pages: pageTracker.inventory(),
    requests: requestTracker.inventory(),
    webSockets: webSocketTracker.inventory(),
  }
  for (const inventory of Object.values(inventories))
    assertObservedInventoryEmpty(inventory)
  const proxyInventory = controller.server.workbenchProxy.audit()
  expect(proxyInventory).toMatchObject({
    pendingOperations: 0,
    upstreamHttpRequests: 0,
    upstreamHttpResponses: 0,
    rawSockets: 0,
    webSockets: 0,
  })
  const navigationUrl = origin + prefix
  const navigationEvents = networkRequests.filter(
    (event) => event.resourceType === 'document' && event.url === navigationUrl
  )
  const navigationCountsByContext = new Map<string, number>()
  for (const event of navigationEvents)
    navigationCountsByContext.set(
      event.contextId,
      (navigationCountsByContext.get(event.contextId) ?? 0) + 1
    )
  const webSocketCountsByContext = new Map<string, number>()
  for (const event of webSocketEvents)
    webSocketCountsByContext.set(
      event.contextId,
      (webSocketCountsByContext.get(event.contextId) ?? 0) + 1
    )
  const navigationRetries = [...navigationCountsByContext.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0
  )
  const reconnectRetries = webSocketEvents.filter(
    (event) => new URL(event.url).searchParams.get('reconnection') === 'true'
  ).length
  const retryAttempts = navigationRetries + reconnectRetries
  let terminalArtifactPresent = true
  try {
    await lstat(WORKBENCH_ROUTE_TERMINAL_TEMP)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      terminalArtifactPresent = false
    else throw error
  }
  const safeNetworkResponses = networkResponses.map((response) => ({
    ...classifyWorkbenchBrowserRequest(
      response.url,
      origin,
      prefix,
      networkRequests.find((request) => request.url === response.url)
        ?.resourceType ?? 'unknown'
    ),
    status: response.status,
    bodyDigest: response.bodyDigest,
    bodyAuthorityMatches: response.bodyAuthorityMatches ?? 0,
    bodyError: response.bodyError,
  }))
  const browserPublicCapture = JSON.stringify({
    networkRequests,
    networkResponses: networkResponses.map(
      ({
        url,
        status,
        headers,
        bodyDigest,
        bodyAuthorityMatches,
        bodyError,
      }) => ({
        url,
        status,
        headers,
        bodyDigest,
        bodyAuthorityMatches,
        bodyError,
      })
    ),
    proxyEvents,
    browserDiagnostics,
  })
  const browserScans = scanSentinels(browserPublicCapture, {
    internalAuthority: `127.0.0.1:${internalPort}`,
    canonicalPath,
    terminalPayload: 'TERMINAL_PAYLOAD_SENTINEL_27',
  })
  for (const scan of browserScans)
    expect(scan).toMatchObject({ literalMatches: 0, encodedMatches: 0 })
  await mergeWorkbenchRouteEvidence({
    projectToken: project.id,
    stableRoute: prefix,
    browser: {
      capturedCounts: {
        navigationAttempts: navigationEvents.length,
        webSocketAttempts: webSocketCountsByContext.size,
        webSocketNetworkConnections: webSocketEvents.length,
        retryAttempts,
      },
      classifierVectorManifest,
      identities,
      requestInventory: safeRequestObservations,
      responseInventory: safeNetworkResponses,
      socketInventory: safeWebSocketObservations,
      originPolicy: {
        ascendOwned: 'same-origin-stable-prefix',
        trustedExternal: WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
        everyOtherExternal: 'forbidden',
      },
      trustedWebviewRequestCount: safeRequestObservations.filter(
        (event) => event.classification === 'trusted-markdown-webview'
      ).length,
      browserLocalRequestCount: safeRequestObservations.filter(
        (event) => event.classification === 'browser-local'
      ).length,
      trustedWebviewFrameInventory: safeWebviewFrameObservations,
      marketplaceRequestCount,
      forbiddenRequestCount,
      socketRoleCounts: { Management: 3, ExtensionHost: 3, unknown: 0 },
      extensionGallery: '{}',
      explorerObservations,
      previewObservations,
      terminal,
      scans: browserScans,
    },
    cleanup: {
      browserInventories: inventories,
      proxyInventory,
      runtimeShutdown: controller.server.projectRuntime.lastShutdown(),
      listenerProbe,
      runState: {
        apiListening: controller.server.server.listening,
        terminalArtifactPresent,
      },
    },
    residualAudit: {},
  })
})
