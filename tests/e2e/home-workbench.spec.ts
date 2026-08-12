import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  createApiServerController,
  type ApiServerController,
} from '../../apps/api/src/api-server.js'
import type { ProjectLibrary } from '../../apps/api/src/project-library.js'
import { createProjectRuntimeConfig } from '../../apps/api/src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../../apps/api/src/project-runtime-manager.js'
import { readProcessStartTime } from '../../apps/api/src/project-runtime-process.js'
import {
  createWorkbenchProxyManager,
  type WorkbenchProxyManager,
} from '../../apps/api/src/workbench-proxy-manager.js'
import {
  classifyWorkbenchBrowserRequest,
  classifyWorkbenchWebSocketUrl,
} from '../../apps/api/src/workbench-route-proof-observation.js'
import {
  canonicalFixturePath,
  EXPLORER_SENTINEL,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
  REPOSITORY_ROOT,
} from '../../apps/api/src/workbench-proof-contract.js'
import { PRESENTATION_VIEWPORT } from '../../apps/api/src/workbench-presentation-contract.js'
import { snapshotFixture } from '../../apps/api/test/project-registration-fixture-helper.js'
import { stopOwnedProcessGroup } from '../../apps/api/test/helpers/project-home-process-group.js'

const designated = process.env.BL012_DESIGNATED === '1'
const RESULT_ROOT = path.join(REPOSITORY_ROOT, 'test-results/bl-012')
const EVIDENCE_PATH = path.join(RESULT_ROOT, 'browser-continuity.json')
const PID_PATH = path.join(RESULT_ROOT, 'terminal-marker.pid')
const COUNTER_PATH = path.join(RESULT_ROOT, 'terminal-marker.counter')
const OPERATION_TIMEOUT_MS = 15_000
const STARTUP_TIMEOUT_MS = 30_000
const DOCUMENT_TIMEOUT_MS = 30_000
const OVERALL_TIMEOUT_MS = 120_000
const CLEANUP_TIMEOUT_MS = 10_000

const disposablePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Missing disposable port')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

const waitForHttp = async (
  url: string,
  child: ChildProcessWithoutNullStreams
): Promise<void> => {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error('Web process exited before readiness')
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('Web process readiness timed out')
}

const previewVisible = async (
  page: import('@playwright/test').Page
): Promise<boolean> => {
  for (const frame of page.frames()) {
    try {
      if (
        await frame
          .getByText(MARKDOWN_RENDERED_SENTINEL, { exact: true })
          .first()
          .isVisible()
      )
        return true
    } catch {}
  }
  return false
}

const waitForCounter = async (minimum: number): Promise<number> => {
  const deadline = Date.now() + OPERATION_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const value = Number((await readFile(COUNTER_PATH, 'utf8')).trim())
      if (Number.isSafeInteger(value) && value >= minimum) return value
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('Terminal marker counter timed out')
}

const stopMarker = async (pid: number | undefined): Promise<boolean> => {
  if (pid === undefined) return true
  try {
    process.kill(-pid, 'SIGTERM')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
  const deadline = Date.now() + CLEANUP_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return false
}

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )

const endpointUnavailable = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(500) })
    return false
  } catch {
    return true
  }
}

const manifestDigest = (manifest: unknown): string =>
  createHash('sha256').update(JSON.stringify(manifest)).digest('hex')

test.describe.configure({ mode: 'serial', retries: 0 })

test('runs exact Home and workbench continuity with isolated deep-link refresh', async ({
  browser,
}) => {
  test.skip(
    !designated,
    'Set BL012_DESIGNATED=1 for the designated Home/workbench proof'
  )
  test.setTimeout(OVERALL_TIMEOUT_MS)
  await mkdir(RESULT_ROOT, { recursive: true })
  await Promise.all([
    rm(PID_PATH, { force: true }),
    rm(COUNTER_PATH, { force: true }),
  ])
  const canonicalPath = await canonicalFixturePath()
  const manifestBefore = await snapshotFixture(canonicalPath)
  const project = {
    id: 'bl012-stable-project',
    name: 'BL-012 <project>',
    canonicalPath,
    createdAt: 1,
  }
  const library: ProjectLibrary = {
    create: async () => ({ disposition: 'existing', project }),
    findById: async (id) => (id === project.id ? project : undefined),
    list: async () => [project],
    closeProject: async () => ({ disposition: 'closed', id: project.id }),
    close: () => undefined,
  }
  const unrelated = createServer()
  await new Promise<void>((resolve, reject) => {
    unrelated.once('error', reject)
    unrelated.listen(0, '127.0.0.1', resolve)
  })
  let controller: ApiServerController | undefined
  let runtime: ProjectRuntimeManager | undefined
  let proxy: WorkbenchProxyManager | undefined
  let web: ChildProcessWithoutNullStreams | undefined
  let apiOrigin: string | undefined
  let webOrigin: string | undefined
  let internalPort: number | undefined
  let context: import('@playwright/test').BrowserContext | undefined
  let isolated: import('@playwright/test').BrowserContext | undefined
  let terminalPid: number | undefined
  const ledger: string[] = []
  const requestTraffic: Array<{ url: string; resourceType: string }> = []
  const socketTraffic: string[] = []
  const socketRoles: string[] = []
  const identities: Array<{
    pid: number | null
    processStartTime: string | null
    port: number | null
  }> = []
  let counterBeforeHome = 0
  let counterAfterHome = 0
  let isolatedCounterBefore = 0
  let isolatedCounterAfter = 0
  let cleanupPassed = false
  try {
    controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: (projectLibrary, recordEvent) => {
        const defaults = createProjectRuntimeConfig()
        runtime = createProjectRuntimeManager({
          findProjectById: (id) => projectLibrary.findById(id),
          recordEvent,
          config: createProjectRuntimeConfig({
            environment: { ...defaults.environment, EXTENSIONS_GALLERY: '{}' },
          }),
        })
        return runtime
      },
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) => {
        proxy = createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          frontDoorToken:
            process.env.ASCEND_FRONT_DOOR_TOKEN ??
            'ascend-development-front-door-v1',
          recordWebSocketRole: (observation) =>
            socketRoles.push(observation.role),
        })
        return proxy
      },
      createProjectRegistration: async () => ({
        register: async () => ({ disposition: 'existing', project }),
        close: () => undefined,
      }),
    })
    const app = await controller.start()
    const apiAddress = app.server.address()
    if (apiAddress === null || typeof apiAddress === 'string')
      throw new Error('Missing API address')
    const webPort = await disposablePort()
    webOrigin = 'http://127.0.0.1:' + webPort
    apiOrigin = 'http://127.0.0.1:' + apiAddress.port
    web = spawn(
      'pnpm',
      [
        '--filter',
        '@ascend/web',
        'exec',
        'vite',
        '--host',
        '127.0.0.1',
        '--port',
        String(webPort),
        '--strictPort',
      ],
      {
        cwd: REPOSITORY_ROOT,
        detached: true,
        env: {
          ...process.env,
          ASCEND_E2E_API_TARGET: apiOrigin,
          ASCEND_E2E_DISABLE_HMR: '1',
        },
        stdio: 'pipe',
      }
    )
    await waitForHttp(webOrigin + '/', web)
    const stablePath =
      '/projects/' + encodeURIComponent(project.id) + '/workbench/'
    const stableUrl = webOrigin + stablePath
    const observeTraffic = (
      observedContext: import('@playwright/test').BrowserContext
    ): void => {
      observedContext.on('request', (request) =>
        requestTraffic.push({
          url: request.url(),
          resourceType: request.resourceType(),
        })
      )
      observedContext.on('page', (observedPage) =>
        observedPage.on('websocket', (socket) =>
          socketTraffic.push(socket.url())
        )
      )
    }
    context = await browser.newContext({ viewport: PRESENTATION_VIEWPORT })
    observeTraffic(context)
    const page = await context.newPage()
    const open = () =>
      page.getByRole('button', { name: 'Open ' + project.name })
    const ready = async (): Promise<void> => {
      try {
        await page.locator('.monaco-workbench').waitFor({
          state: 'visible',
          timeout: DOCUMENT_TIMEOUT_MS,
        })
      } catch {
        throw new Error(
          'Workbench surface unavailable: ' +
            JSON.stringify({
              pathname: new URL(page.url()).pathname,
              title: await page.title(),
              text: (await page.locator('body').innerText()).slice(0, 500),
            })
        )
      }
      const header = page.getByRole('banner', { name: 'Ascend workbench' })
      await expect(header.getByRole('link', { name: 'Projects' })).toBeVisible()
      await expect(header).not.toContainText(
        /Stop|Restart|Close|PID|listener|internal-port/iu
      )
      await expect(
        page.getByText(EXPLORER_SENTINEL, { exact: true }).first()
      ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    }
    const focusExistingTerminal = async (
      targetPage: import('@playwright/test').Page
    ): Promise<void> => {
      await targetPage.keyboard.press('F1')
      await expect(targetPage.locator('.quick-input-widget')).toBeVisible({
        timeout: OPERATION_TIMEOUT_MS,
      })
      await targetPage.keyboard.insertText('Terminal: Focus Terminal')
      await expect(
        targetPage.locator('.quick-input-list .monaco-list-row').first()
      ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
      await targetPage.keyboard.press('Enter')
      await targetPage
        .locator('.terminal.xterm')
        .first()
        .waitFor({ state: 'visible', timeout: OPERATION_TIMEOUT_MS })
    }
    const openIsolatedTerminal = async (
      targetPage: import('@playwright/test').Page
    ): Promise<void> => {
      await targetPage.keyboard.press('F1')
      await expect(targetPage.locator('.quick-input-widget')).toBeVisible({
        timeout: OPERATION_TIMEOUT_MS,
      })
      await targetPage.keyboard.insertText('Terminal: Create New Terminal')
      await expect(
        targetPage.locator('.quick-input-list .monaco-list-row').first()
      ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
      await targetPage.keyboard.press('Enter')
      await targetPage
        .locator('.terminal.xterm')
        .first()
        .waitFor({ state: 'visible', timeout: OPERATION_TIMEOUT_MS })
    }
    const identity = (): {
      pid: number | null
      processStartTime: string | null
      port: number | null
    } => {
      const snapshot = app.projectRuntime.inspect(project.id)
      return {
        pid: snapshot?.pid ?? null,
        processStartTime: snapshot?.processStartTime ?? null,
        port: snapshot?.port ?? null,
      }
    }

    await page.goto(webOrigin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    ledger.push('Home')
    await open().click()
    await expect(page).toHaveURL(stableUrl)
    await ready()
    ledger.push('Workbench-1')
    identities.push(identity())
    await page.getByText(EXPLORER_SENTINEL, { exact: true }).first().click()
    await expect(
      page.getByText(EXPLORER_SENTINEL, { exact: true }).last()
    ).toBeVisible()
    await page.getByText(MARKDOWN_FIXTURE, { exact: true }).first().click()
    await page
      .getByRole('button', { name: /^Open Preview to the Side/u })
      .click()
    await expect
      .poll(() => previewVisible(page), { timeout: OPERATION_TIMEOUT_MS })
      .toBe(true)
    await page.keyboard.press('F1')
    await expect(page.locator('.quick-input-widget')).toBeVisible({
      timeout: OPERATION_TIMEOUT_MS,
    })
    await page.keyboard.insertText('Terminal: Create New Terminal')
    await expect(
      page.getByText('Terminal: Create New Terminal', { exact: true }).first()
    ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    await page.keyboard.press('Enter')
    await page
      .locator('.terminal.xterm')
      .first()
      .waitFor({ state: 'visible', timeout: OPERATION_TIMEOUT_MS })
    const terminalInput = page
      .getByRole('textbox', { name: /^Terminal /u })
      .first()
    await expect(terminalInput).toBeAttached({ timeout: OPERATION_TIMEOUT_MS })
    await terminalInput.focus()
    const quote = String.fromCharCode(39)
    const markerScript =
      'echo $$ > ' +
      JSON.stringify(PID_PATH) +
      '; i=0; while [ $i -lt 120 ]; do i=$((i+1)); printf "%s\\n" $i > ' +
      JSON.stringify(COUNTER_PATH) +
      '; sleep 0.25; done'
    const command =
      'printf "%s\\n" "$PWD"; setsid sh -c ' +
      quote +
      markerScript +
      quote +
      ' >/dev/null 2>&1 &'
    await page.keyboard.insertText(command)
    await page.keyboard.press('Enter')
    await expect(
      page.getByText(canonicalPath, { exact: true }).last()
    ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    counterBeforeHome = await waitForCounter(2)
    terminalPid = Number((await readFile(PID_PATH, 'utf8')).trim())

    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page).toHaveURL(webOrigin + '/')
    ledger.push('Home')
    identities.push(identity())
    counterAfterHome = await waitForCounter(counterBeforeHome + 1)
    expect(() => process.kill(terminalPid!, 0)).not.toThrow()
    expect(() => process.kill(identity().pid!, 0)).not.toThrow()
    await open().click()
    await ready()
    ledger.push('Workbench-2')
    identities.push(identity())
    await expect(
      page.getByText(EXPLORER_SENTINEL, { exact: true }).last()
    ).toBeVisible()
    await expect(
      page
        .getByRole('tab', {
          name: new RegExp('^' + MARKDOWN_FIXTURE + ', preview', 'u'),
        })
        .first()
    ).toBeVisible()
    await focusExistingTerminal(page)
    await expect(
      page.getByText(canonicalPath, { exact: true }).last()
    ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    await ready()
    ledger.push('Refresh')
    identities.push(identity())
    await page.goBack({
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    await expect(page).toHaveURL(webOrigin + '/')
    ledger.push('Back-Home')
    await page.goForward({
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    await ready()
    ledger.push('Forward-Workbench-2')
    identities.push(identity())
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page).toHaveURL(webOrigin + '/')
    ledger.push('Home')
    await open().click()
    await ready()
    ledger.push('Workbench-3')
    identities.push(identity())

    isolated = await browser.newContext({
      viewport: PRESENTATION_VIEWPORT,
      storageState: { cookies: [], origins: [] },
    })
    observeTraffic(isolated)
    expect(isolated.serviceWorkers()).toHaveLength(0)
    expect(await isolated.cookies()).toHaveLength(0)
    const isolatedPage = await isolated.newPage()
    const isolatedRolesBefore = socketRoles.length
    await isolatedPage.goto(stableUrl, {
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    await isolatedPage
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: DOCUMENT_TIMEOUT_MS })
    await expect
      .poll(() => socketRoles.length, { timeout: OPERATION_TIMEOUT_MS })
      .toBeGreaterThanOrEqual(isolatedRolesBefore + 2)
    await expect(
      isolatedPage.getByText(EXPLORER_SENTINEL, { exact: true }).first()
    ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    await openIsolatedTerminal(isolatedPage)
    isolatedCounterBefore = await waitForCounter(counterAfterHome + 1)
    identities.push(identity())
    const isolatedRefreshRolesBefore = socketRoles.length
    await isolatedPage.reload({
      waitUntil: 'domcontentloaded',
      timeout: DOCUMENT_TIMEOUT_MS,
    })
    await isolatedPage
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: DOCUMENT_TIMEOUT_MS })
    await expect
      .poll(() => socketRoles.length, { timeout: OPERATION_TIMEOUT_MS })
      .toBeGreaterThanOrEqual(isolatedRefreshRolesBefore + 2)
    await expect(
      isolatedPage.getByText(EXPLORER_SENTINEL, { exact: true }).first()
    ).toBeVisible({ timeout: OPERATION_TIMEOUT_MS })
    await openIsolatedTerminal(isolatedPage)
    isolatedCounterAfter = await waitForCounter(isolatedCounterBefore + 1)
    identities.push(identity())
    expect(new Set(identities.map((value) => JSON.stringify(value))).size).toBe(
      1
    )
    expect(counterAfterHome).toBeGreaterThan(counterBeforeHome)
    expect(ledger).toEqual([
      'Home',
      'Workbench-1',
      'Home',
      'Workbench-2',
      'Refresh',
      'Back-Home',
      'Forward-Workbench-2',
      'Home',
      'Workbench-3',
    ])
    expect(await snapshotFixture(canonicalPath)).toEqual(manifestBefore)

    const requestClassCounts: Record<string, number> = {}
    for (const request of requestTraffic) {
      const parsed = new URL(request.url)
      const classification =
        parsed.origin === webOrigin && !parsed.pathname.startsWith(stablePath)
          ? 'project-home'
          : classifyWorkbenchBrowserRequest(
              request.url,
              webOrigin,
              stablePath,
              request.resourceType
            ).classification
      expect(classification).not.toBe('forbidden-external')
      expect(classification).not.toBe('marketplace')
      requestClassCounts[classification] =
        (requestClassCounts[classification] ?? 0) + 1
    }
    internalPort = identities[0]?.port ?? undefined
    expect(internalPort).toBeDefined()
    const developmentFrontDoorSockets = socketTraffic.filter(
      (url) => new URL(url).pathname === '/'
    )
    for (const url of developmentFrontDoorSockets) {
      const parsed = new URL(url)
      expect(parsed.origin).toBe(webOrigin.replace('http:', 'ws:'))
      expect(url).not.toContain(':' + String(internalPort))
    }
    const workbenchSocketUrls = socketTraffic.filter(
      (url) => new URL(url).pathname !== '/'
    )
    const socketObservations = workbenchSocketUrls.map((url) =>
      classifyWorkbenchWebSocketUrl(
        url,
        webOrigin.replace('http:', 'ws:'),
        stablePath,
        internalPort!
      )
    )
    for (const observation of socketObservations) {
      expect(observation).toMatchObject({
        sameOrigin: true,
        stablePrefix: true,
        internalPortAbsent: true,
        pathnameClass: 'stable-runtime-socket',
      })
    }
    expect(socketRoles).toContain('Management')
    expect(socketRoles).toContain('ExtensionHost')
    expect(socketRoles).not.toContain('unknown')
    const roleCounts = Object.fromEntries(
      ['Management', 'ExtensionHost', 'Tunnel', 'cancelled-before-control'].map(
        (role) => [role, socketRoles.filter((value) => value === role).length]
      )
    )
    const runtimeIdentity = {
      pid: identities[0]!.pid,
      processStartTime: identities[0]!.processStartTime,
    }
    await writeFile(
      EVIDENCE_PATH,
      JSON.stringify(
        {
          schemaVersion: 1,
          bounds: {
            operationMs: OPERATION_TIMEOUT_MS,
            startupMs: STARTUP_TIMEOUT_MS,
            documentMs: DOCUMENT_TIMEOUT_MS,
            recoveryMs: OPERATION_TIMEOUT_MS,
            overallMs: OVERALL_TIMEOUT_MS,
            cleanupMs: CLEANUP_TIMEOUT_MS,
          },
          ledger,
          history: { workbenchEntries: 3, refreshes: 1, backs: 1, forwards: 1 },
          identityReuse: true,
          runtimeIdentity,
          capabilities: {
            explorer: true,
            markdownPreview: true,
            canonicalDirectory: true,
            knownFileRestored: true,
            projectsControl: true,
            prohibitedHeaderValues: 0,
          },
          terminal: {
            pid: terminalPid,
            aliveOnHome: true,
            counterBeforeHome,
            counterAfterHome,
            outputRemoved: false,
          },
          isolated: {
            directNavigations: 1,
            refreshes: 1,
            storageEmpty: true,
            cookies: 0,
            serviceWorkers: 0,
            integratedTerminal: true,
            canonicalDirectoryContract: true,
            counterBefore: isolatedCounterBefore,
            counterAfter: isolatedCounterAfter,
          },
          traffic: {
            requestClassCounts,
            sockets: socketTraffic.length,
            workbenchSockets: socketObservations.length,
            developmentFrontDoorSockets: developmentFrontDoorSockets.length,
            roleCounts,
            forbidden: 0,
            marketplace: 0,
            internalAuthorityLeaks: 0,
          },
          fixtureIntegrity: true,
        },
        null,
        2
      )
    )
  } finally {
    const markerStopped = await stopMarker(terminalPid)
    await Promise.all([
      rm(PID_PATH, { force: true }),
      rm(COUNTER_PATH, { force: true }),
    ])
    const contextsBeforeClose =
      Number(context !== undefined) + Number(isolated !== undefined)
    const pagesBeforeClose =
      (context?.pages().length ?? 0) + (isolated?.pages().length ?? 0)
    await isolated?.close()
    await context?.close()
    await controller?.stop()
    const proxyAudit = proxy?.audit()
    const runtimeShutdown = runtime?.lastShutdown()
    const apiListenerAbsent =
      apiOrigin === undefined || (await endpointUnavailable(apiOrigin + '/'))
    const runtimeListenerAbsent =
      internalPort === undefined ||
      (await endpointUnavailable('http://127.0.0.1:' + internalPort + '/'))
    const runtimeIdentityAbsent =
      identities[0]?.pid == null ||
      (await readProcessStartTime(identities[0].pid)) !==
        identities[0].processStartTime
    const webStop = await stopOwnedProcessGroup(
      web === undefined ? undefined : { process: web },
      CLEANUP_TIMEOUT_MS
    )
    const webListenerAbsent =
      webOrigin === undefined || (await endpointUnavailable(webOrigin + '/'))
    const unrelatedAlive = unrelated.listening
    await closeServer(unrelated)
    const manifestAfter = await snapshotFixture(canonicalPath)
    const fixtureIntegrity =
      JSON.stringify(manifestAfter) === JSON.stringify(manifestBefore)
    const proxyResourcesAbsent =
      proxyAudit !== undefined &&
      proxyAudit.pendingOperations === 0 &&
      proxyAudit.upstreamHttpRequests === 0 &&
      proxyAudit.upstreamHttpResponses === 0 &&
      proxyAudit.rawSockets === 0 &&
      proxyAudit.webSockets === 0
    cleanupPassed =
      markerStopped &&
      proxyResourcesAbsent &&
      runtimeShutdown?.status === 'ok' &&
      runtimeIdentityAbsent &&
      runtimeListenerAbsent &&
      apiListenerAbsent &&
      webStop.processGroupAbsent &&
      webListenerAbsent &&
      unrelatedAlive &&
      fixtureIntegrity
    if (terminalPid !== undefined) {
      const evidence = JSON.parse(
        await readFile(EVIDENCE_PATH, 'utf8')
      ) as Record<string, unknown>
      await writeFile(
        EVIDENCE_PATH,
        JSON.stringify(
          {
            ...evidence,
            cleanup: {
              contexts: { beforeClose: contextsBeforeClose, afterClose: 0 },
              pages: { beforeClose: pagesBeforeClose, afterClose: 0 },
              terminal: {
                pid: terminalPid,
                markerStopped,
                identityAbsent: markerStopped,
                outputRemoved: true,
              },
              proxy: {
                resourcesAbsent: proxyResourcesAbsent,
                audit: proxyAudit,
              },
              runtime: {
                identityAbsent: runtimeIdentityAbsent,
                listenerAbsent: runtimeListenerAbsent,
                shutdownStatus: runtimeShutdown?.status,
                auditCount: runtimeShutdown?.audits.length,
              },
              api: {
                processOwner: 'test-process',
                listenerAbsent: apiListenerAbsent,
              },
              web: {
                processGroupAbsent: webStop.processGroupAbsent,
                listenerAbsent: webListenerAbsent,
              },
              persistence: {
                mode: 'controlled-in-memory-library',
                sqliteSidecars: [],
              },
              unrelatedListenerSurvived: unrelatedAlive,
              fixture: {
                integrity: fixtureIntegrity,
                beforeDigest: manifestDigest(manifestBefore),
                afterDigest: manifestDigest(manifestAfter),
              },
              markerStopped,
              outputRemoved: true,
              webProcessGroupAbsent: webStop.processGroupAbsent,
              fixtureIntegrity,
            },
          },
          null,
          2
        )
      )
    }
    expect(cleanupPassed).toBe(true)
  }
})
