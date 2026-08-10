import { createServer, type Server } from 'node:http'
import type { Frame, Page } from '@playwright/test'
import { BrowserEventObserver } from '../../apps/api/src/workbench-presentation-browser-events.js'
import type { PresentationCandidate } from '../../apps/api/src/workbench-presentation-contract.js'
import {
  EXPLORER_SENTINEL,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
} from '../../apps/api/src/workbench-proof-contract.js'

export type WorkbenchTarget = Page | Frame
export interface PresentationAdapter {
  navigate: () => Promise<{ status: number; target: WorkbenchTarget }>
  close: () => Promise<void>
}
const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
const listen = async (server: Server): Promise<number> =>
  new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string')
        reject(new Error('Embedded proof listener address is unavailable'))
      else resolve(address.port)
    })
  })

const safeBrowserUrl = (value: string): string => {
  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (/token|credential|secret/iu.test(key))
        url.searchParams.set(key, '[redacted]')
    }
    return url.href
  } catch {
    return value
  }
}

export const attachBrowserEventObserver = (
  page: Page,
  observer: BrowserEventObserver
): void => {
  page.on('response', (response) =>
    observer.record({
      kind: 'response',
      url: safeBrowserUrl(response.url()),
      status: response.status(),
      detail: response.request().resourceType(),
    })
  )
  page.on('requestfailed', (request) =>
    observer.record({
      kind: 'request-failed',
      url: safeBrowserUrl(request.url()),
      detail: request.failure()?.errorText ?? 'request failed',
    })
  )
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error')
      observer.record({
        kind: 'console',
        url: message.location().url
          ? safeBrowserUrl(message.location().url)
          : null,
        detail: message.text(),
      })
  })
  page.on('pageerror', (error) =>
    observer.record({ kind: 'page-error', detail: error.message })
  )
  page.on('websocket', (socket) => {
    observer.record({
      kind: 'websocket-open',
      url: safeBrowserUrl(socket.url()),
      detail: 'opened',
    })
    socket.on('socketerror', (error) =>
      observer.record({
        kind: 'websocket-error',
        url: safeBrowserUrl(socket.url()),
        detail: error,
      })
    )
    socket.on('close', () =>
      observer.record({
        kind: 'websocket-close',
        url: safeBrowserUrl(socket.url()),
        detail: 'closed',
      })
    )
  })
}

const waitForEmbeddedWorkbench = async (
  page: Page,
  workbenchUrl: string
): Promise<Frame> => {
  const expected = new URL(workbenchUrl)
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const frame = page.frames().find((candidate) => {
      if (candidate === page.mainFrame()) return false
      try {
        const url = new URL(candidate.url())
        return url.hostname === expected.hostname && url.port === expected.port
      } catch {
        return false
      }
    })
    if (frame) return frame
    await page.waitForTimeout(25)
  }
  throw new Error('Embedded workbench frame did not attach')
}

export const createPresentationAdapter = async (
  candidate: PresentationCandidate,
  page: Page,
  workbenchUrl: string
): Promise<PresentationAdapter> => {
  if (candidate === 'full-page')
    return {
      navigate: async () => {
        const response = await page.goto(workbenchUrl, {
          waitUntil: 'domcontentloaded',
        })
        await page.evaluate(() => {
          const header = document.createElement('header')
          header.id = 'ascend-proof-header'
          header.textContent = 'Ascend Workbench Presentation Proof'
          Object.assign(header.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            height: '24px',
            zIndex: '999999',
            background: '#111827',
            color: '#fff',
            font: '12px sans-serif',
            padding: '4px 8px',
            pointerEvents: 'none',
          })
          document.body.append(header)
        })
        return { status: response?.status() ?? 0, target: page }
      },
      close: async () => undefined,
    }

  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    })
    response.end(
      '<!doctype html><html><head><title>Ascend embedded proof</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}header{height:28px;background:#111827;color:white;font:12px sans-serif;padding:6px 8px;box-sizing:border-box}iframe{display:block;border:0;width:100%;height:calc(100% - 28px)}</style></head><body><header>Ascend Workbench Presentation Proof</header><iframe id=workbench src=' +
        workbenchUrl +
        '></iframe></body></html>'
    )
  })
  const port = await listen(server)
  return {
    navigate: async () => {
      const response = await page.goto(
        'http://127.0.0.1:' + String(port) + '/',
        { waitUntil: 'domcontentloaded' }
      )
      return {
        status: response?.status() ?? 0,
        target: await waitForEmbeddedWorkbench(page, workbenchUrl),
      }
    },
    close: async () => closeServer(server),
  }
}

const renderedPreviewIsVisible = async (page: Page): Promise<boolean> => {
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue
    try {
      if (
        await frame
          .getByText(MARKDOWN_RENDERED_SENTINEL, { exact: true })
          .first()
          .isVisible()
      )
        return true
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Frame was detached')
      )
        continue
      throw error
    }
  }
  return false
}

export const presentationWorkbenchActions = (
  page: Page,
  target: () => WorkbenchTarget
) => ({
  findExplorerSentinel: async (): Promise<void> => {
    await target()
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: 15_000 })
    await target()
      .getByText(EXPLORER_SENTINEL, { exact: true })
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
  },
  openMarkdownFixture: async (): Promise<void> => {
    await target().getByText(MARKDOWN_FIXTURE, { exact: true }).first().click()
  },
  observeRenderedPreview: async (): Promise<void> => {
    await target()
      .getByRole('button', { name: /^Open Preview to the Side/u })
      .click()
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      if (await renderedPreviewIsVisible(page)) return
      await page.waitForTimeout(25)
    }
    throw new Error('Rendered Preview sentinel was not visible')
  },
  keyboardFocusExplorer: async (): Promise<void> => {
    await page.keyboard.press('Control+Shift+E')
    await target()
      .getByText(EXPLORER_SENTINEL, { exact: true })
      .first()
      .waitFor({ state: 'visible' })
  },
  keyboardEnterPreview: async (): Promise<void> => {
    await page.keyboard.press('Control+2')
    if (!(await renderedPreviewIsVisible(page)))
      throw new Error('Keyboard did not enter the Preview editor')
  },
  keyboardLeavePreview: async (): Promise<void> => {
    await page.keyboard.press('Control+Shift+E')
    await target()
      .getByText(EXPLORER_SENTINEL, { exact: true })
      .first()
      .waitFor({ state: 'visible' })
  },
  openIntegratedTerminal: async (): Promise<void> => {
    await page.keyboard.press('Control+Shift+Backquote')
    await target()
      .locator('.terminal.xterm')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
  },
  clipboardRoundTrip: async (token: string): Promise<boolean> => {
    await page.keyboard.insertText(token)
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+C')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Control+V')
    const rows = target().locator('.xterm-rows').last()
    const deadline = Date.now() + 5_000
    let observed = false
    while (Date.now() < deadline) {
      if ((await rows.innerText()).includes(token)) {
        observed = true
        break
      }
      await page.waitForTimeout(25)
    }
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    return observed
  },
})
