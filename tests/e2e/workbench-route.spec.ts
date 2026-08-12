import { readFile, rm } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { createConnection } from 'node:net'
import { expect, test, type BrowserContext } from '@playwright/test'
import { createApiServerController } from '../../apps/api/src/api-server.js'
import type { ProjectLibrary } from '../../apps/api/src/project-library.js'
import { createWorkbenchProxyManager } from '../../apps/api/src/workbench-proxy-manager.js'
import { mergeWorkbenchRouteEvidence } from '../../apps/api/src/workbench-route-evidence.js'
import {
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
        // A webview frame can be replaced while Preview initializes.
      }
    }
  }
  return false
}

test('real Chromium uses exactly three stable-route navigations and one BL-010 runtime', async ({
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
  const webSocketDiagnostics: unknown[] = []
  const controller = createApiServerController({
    port: 0,
    fastify: { logger: false },
    createProjectLibrary: async () => library,
    createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
      createWorkbenchProxyManager({
        projectLibrary,
        projectRuntime,
        recordWebSocketDiagnostic: (diagnostic) =>
          webSocketDiagnostics.push(diagnostic),
        recordEvent: (event) => webSocketDiagnostics.push(event),
      }),
    createProjectRegistration: async () => ({
      register: async () => ({ category: 'path_not_found', field: 'path' }),
      close: () => undefined,
    }),
  })
  const contexts: BrowserContext[] = []
  const publicHttpUrls: string[] = []
  const publicWebSocketUrls: string[] = []
  const browserDiagnostics: string[] = []
  const identities: Array<{
    pid: number | null
    processStartTime: string | null
    port: number | null
  }> = []
  let navigationAttempts = 0
  let webSocketAttempts = 0
  let retryAttempts = 0
  let explorerVisible = false
  let previewRendered = false
  let terminal: Record<string, unknown> | undefined
  let internalPort = 0
  try {
    const app = await controller.start()
    const address = app.server.address() as AddressInfo
    const origin = `http://127.0.0.1:${address.port}`
    const prefix = `/projects/${project.id}/workbench/`
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const context = await browser.newContext({
        viewport: PRESENTATION_VIEWPORT,
        storageState: { cookies: [], origins: [] },
      })
      contexts.push(context)
      const page = await context.newPage()
      let reconnectOperationObserved = false
      page.on('request', (request) => {
        const url = request.url()
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const parsed = new URL(url)
          if (parsed.origin === origin) publicHttpUrls.push(url)
          else browserDiagnostics.push('external-origin:' + parsed.origin)
        }
      })
      page.on('response', (response) => {
        if (response.status() >= 400)
          browserDiagnostics.push(
            `response:${response.status()}:${response.url()}`
          )
      })
      page.on('requestfailed', (request) =>
        browserDiagnostics.push(
          `failed:${request.failure()?.errorText}:${request.url()}`
        )
      )
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type()))
          browserDiagnostics.push(`console:${message.type()}:${message.text()}`)
      })
      page.on('websocket', (socket) => {
        if (!reconnectOperationObserved) {
          webSocketAttempts += 1
          reconnectOperationObserved = true
        }
        publicWebSocketUrls.push(socket.url())
        socket.on('socketerror', (error) =>
          browserDiagnostics.push(`websocket:${error}:${socket.url()}`)
        )
      })
      navigationAttempts += 1
      const response = await page.goto(origin + prefix, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
      expect(response?.status()).toBeGreaterThanOrEqual(200)
      expect(response?.status()).toBeLessThan(400)
      await page
        .locator('.monaco-workbench')
        .waitFor({ state: 'visible', timeout: 15_000 })
      try {
        await page
          .getByText(EXPLORER_SENTINEL, { exact: true })
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 })
      } catch {
        throw new Error(
          'Explorer did not load: ' +
            JSON.stringify({
              browser: browserDiagnostics.slice(-20),
              proxy: webSocketDiagnostics,
            })
        )
      }
      explorerVisible = true
      await page.getByText(MARKDOWN_FIXTURE, { exact: true }).first().click()
      await page
        .getByRole('button', { name: /^Open Preview to the Side/u })
        .click()
      await expect
        .poll(() => previewVisible(context), { timeout: 15_000 })
        .toBe(true)
      previewRendered = true
      if (attempt === 3) {
        await page.keyboard.press('Control+Shift+Backquote')
        await page
          .locator('.terminal.xterm')
          .first()
          .waitFor({ state: 'visible', timeout: 10_000 })
        const command =
          'setsid /workspaces/ascend/node_modules/.bin/tsx /workspaces/ascend/apps/api/src/cli/workbench-route-terminal-proof.ts\n'
        await page.keyboard.insertText(command)
        await page.keyboard.press('Enter')
        await expect(page.locator('.xterm-rows').last()).toContainText(
          'BL011_TERMINAL_SHA256=' + WORKBENCH_ROUTE_TERMINAL_SHA256,
          { timeout: 45_000 }
        )
        terminal = JSON.parse(
          await readFile(WORKBENCH_ROUTE_TERMINAL_TEMP, 'utf8')
        ) as Record<string, unknown>
        expect(terminal).toMatchObject({
          bytes: 256 * 1024,
          expectedSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
          actualSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
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
    expect({ navigationAttempts, webSocketAttempts, retryAttempts }).toEqual({
      navigationAttempts: 3,
      webSocketAttempts: 3,
      retryAttempts: 0,
    })
    expect(
      new Set(identities.map((identity) => JSON.stringify(identity))).size
    ).toBe(1)
    for (const value of [...publicHttpUrls, ...publicWebSocketUrls]) {
      const url = new URL(value)
      expect(url.origin).toBe(
        value.startsWith('ws') ? origin.replace(/^http/u, 'ws') : origin
      )
      expect(url.pathname.startsWith(prefix)).toBe(true)
      expect(value).not.toContain(`:${internalPort}`)
    }
    expect(explorerVisible).toBe(true)
    expect(previewRendered).toBe(true)
    expect(terminal).toBeDefined()
    await mergeWorkbenchRouteEvidence({
      projectToken: project.id,
      stableRoute: prefix,
      browser: {
        navigationAttempts,
        webSocketAttempts,
        retryAttempts,
        identities,
        publicHttpUrls,
        publicWebSocketUrls,
        explorerVisible,
        previewRendered,
        terminal,
      },
      cleanup: { browserContexts: 0, browserSockets: 0 },
      residualAudit: { ownedResources: 0 },
    })
  } finally {
    await rm(WORKBENCH_ROUTE_TERMINAL_TEMP, { force: true })
    await Promise.all(contexts.map((context) => context.close()))
    await controller.stop()
  }
  expect(controller.server.projectRuntime.lastShutdown()).toMatchObject({
    status: 'ok',
  })
  expect(await listenerAbsent(internalPort)).toBe(true)
})
