import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { createServer } from 'node:net'
import path from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { readProcessStartTime } from '../../apps/api/src/project-runtime-process.js'
import {
  readManagedListeners,
  readManagedProcesses,
} from '../../apps/api/src/workbench-proof-audit.js'
import {
  canonicalFixturePath,
  EXPLORER_SENTINEL,
  REPOSITORY_ROOT,
} from '../../apps/api/src/workbench-proof-contract.js'
import { stopOwnedProcessGroup } from '../../apps/api/test/helpers/project-home-process-group.js'

const designated = process.env.BL012_DESIGNATED === '1'
const root = path.join(REPOSITORY_ROOT, 'test-results/bl-012')
const evidencePath = path.join(root, 'browser-real-process.json')
const databasePath = path.join(root, 'browser-real-process.sqlite')
const pidPath = path.join(root, 'browser-real-terminal.pid')
const counterPath = path.join(root, 'browser-real-terminal.counter')
const operationMs = 15_000,
  startupMs = 30_000,
  documentMs = 30_000,
  cleanupMs = 10_000,
  overallMs = 120_000
const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))
const port = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Missing port')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}
const wait = async (
  url: string,
  process: ChildProcessWithoutNullStreams
): Promise<void> => {
  const deadline = Date.now() + startupMs
  while (Date.now() < deadline) {
    if (process.exitCode !== null || process.signalCode !== null)
      throw new Error('Owned process exited')
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(500) })).status > 0)
        return
    } catch {}
    await delay(50)
  }
  throw new Error('Readiness timed out')
}
const unavailable = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(500) })
    return false
  } catch {
    return true
  }
}
const focusTerminal = async (page: Page, create: boolean): Promise<void> => {
  await page.keyboard.press('F1')
  await expect(page.locator('.quick-input-widget')).toBeVisible({
    timeout: operationMs,
  })
  await page.keyboard.insertText(
    create ? 'Terminal: Create New Terminal' : 'Terminal: Focus Terminal'
  )
  await expect(
    page.locator('.quick-input-list .monaco-list-row').first()
  ).toBeVisible({ timeout: operationMs })
  await page.keyboard.press('Enter')
  await page
    .locator('.terminal.xterm')
    .first()
    .waitFor({ state: 'visible', timeout: operationMs })
}
const visible = async (page: Page, canonical: string) => {
  const text = await page.locator('.terminal.xterm').first().innerText()
  const counters = Array.from(text.matchAll(/ASCEND_COUNTER=([0-9]+)/gu)).map(
    (match) => Number(match[1])
  )
  const canonicalDigest = createHash('sha256')
    .update(canonical + String.fromCharCode(10))
    .digest('hex')
  const normalizedText = text
    .split(String.fromCharCode(10))
    .join('')
    .split(String.fromCharCode(13))
    .join('')
    .replaceAll(' ', '')
  const canonicalVisible = normalizedText.includes(
    'ASCEND_PWD_SHA=' + canonicalDigest
  )
  return {
    counter: counters.length === 0 ? 0 : Math.max(...counters),
    canonical: canonicalVisible,
    user: text.includes('ASCEND_USER=' + os.userInfo().username),
    host: text.includes('ASCEND_HOST=' + os.hostname()),
  }
}
const observeVisible = async (
  page: Page,
  canonical: string,
  minimum: number
) => {
  await expect
    .poll(async () => (await visible(page, canonical)).counter, {
      timeout: operationMs,
    })
    .toBeGreaterThanOrEqual(minimum)
  const result = await visible(page, canonical)
  expect(result).toMatchObject({ canonical: true, user: true, host: true })
  return result
}
const identity = async (apiPid: number, canonical: string) => {
  const processes = await readManagedProcesses(apiPid)
  const runtime = processes.find(
    (row) =>
      row.argv.some((value) => value.includes('code-server')) &&
      row.argv.includes(canonical)
  )
  if (runtime === undefined) throw new Error('Runtime process missing')
  const runtimeGroup = processes.filter((row) => row.pgid === runtime.pgid)
  const listeners = await readManagedListeners(
    runtimeGroup.map((row) => row.pid),
    { strict: true }
  )
  const listener = listeners.find((value) => value.address === '127.0.0.1')
  if (listener === undefined) throw new Error('Runtime listener missing')
  return {
    pid: runtime.pid,
    start: await readProcessStartTime(runtime.pid),
    port: listener.port,
  }
}
const stopMarker = async (pid: number | undefined): Promise<boolean> => {
  if (pid === undefined) return true
  try {
    process.kill(-pid, 'SIGTERM')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
  const deadline = Date.now() + cleanupMs
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch {
      return true
    }
    await delay(25)
  }
  return false
}

interface Observation {
  id: string
  kind: 'request' | 'response' | 'log' | 'websocket'
  class: string
  leak: boolean
  scanText?: string
}
test.describe.configure({ mode: 'serial', retries: 0 })
test('proves visible terminal continuity and fresh storage with real API and web process groups', async ({
  browser,
}) => {
  test.skip(!designated, 'Set BL012_DESIGNATED=1 for real process proof')
  test.setTimeout(overallMs)
  const episodeStart = Date.now()
  await mkdir(root, { recursive: true })
  await Promise.all(
    [
      databasePath,
      databasePath + '-shm',
      databasePath + '-wal',
      pidPath,
      counterPath,
    ].map((value) => rm(value, { force: true }))
  )
  const canonical = await canonicalFixturePath(),
    apiPort = await port(),
    webPort = await port(),
    apiOrigin = 'http://127.0.0.1:' + apiPort,
    webOrigin = 'http://127.0.0.1:' + webPort,
    token = 'bl012-real-process-opaque-token'
  let api: ChildProcessWithoutNullStreams | undefined,
    web: ChildProcessWithoutNullStreams | undefined,
    main: BrowserContext | undefined,
    fresh: BrowserContext | undefined,
    terminalPid: number | undefined,
    runtime: Awaited<ReturnType<typeof identity>> | undefined
  const logs: string[] = [],
    observations: Observation[] = []
  let ordinal = 0
  const responseTasks: Promise<void>[] = []
  const inventory = (context: BrowserContext): void => {
    context.on('request', (request) =>
      observations.push({
        id: 'request-' + String(++ordinal),
        kind: 'request',
        class: request.resourceType(),
        leak:
          request.url().includes(token) ||
          request.url().includes('x-ascend-front-door'),
        scanText: request.url(),
      })
    )
    context.on('response', (response) =>
      responseTasks.push(
        (async () => {
          const allHeaders = await response.allHeaders()
          const headers = JSON.stringify(allHeaders)
          const contentType = allHeaders['content-type'] ?? ''
          const textual =
            contentType.startsWith('text/') ||
            [
              'application/json',
              'application/javascript',
              'application/xml',
              'application/xhtml',
            ].some((value) => contentType.startsWith(value))
          const body = textual
            ? (await response.body().catch(() => Buffer.alloc(0))).toString(
                'utf8'
              )
            : ''
          observations.push({
            id: 'response-' + String(++ordinal),
            kind: 'response',
            class:
              String(Math.floor(response.status() / 100)) +
              'xx-' +
              (textual ? 'scanned-text' : 'binary'),
            leak:
              headers.includes(token) ||
              headers.includes('x-ascend-front-door') ||
              body.includes(token) ||
              body.includes('x-ascend-front-door'),
            scanText: headers + body,
          })
        })()
      )
    )
    context.on('page', (page) => {
      page.on('console', (message) =>
        observations.push({
          id: 'log-' + String(++ordinal),
          kind: 'log',
          class: message.type(),
          leak:
            message.text().includes(token) ||
            message.text().includes('x-ascend-front-door'),
          scanText: message.text(),
        })
      )
      page.on('websocket', (socket) =>
        observations.push({
          id: 'websocket-' + String(++ordinal),
          kind: 'websocket',
          class: 'stable-channel',
          leak: socket.url().includes(token),
          scanText: socket.url(),
        })
      )
    })
  }
  let result: Record<string, unknown> = {}
  try {
    api = spawn('pnpm', ['--filter', '@ascend/api', 'start'], {
      cwd: REPOSITORY_ROOT,
      detached: true,
      env: {
        ...process.env,
        ASCEND_PORT: String(apiPort),
        ASCEND_HOST: '127.0.0.1',
        ASCEND_DATABASE_URL: databasePath,
        ASCEND_PROJECT_HOME: path.dirname(canonical),
        ASCEND_PROJECT_ALLOWED_ROOTS: path.dirname(canonical),
        ASCEND_FRONT_DOOR_TOKEN: token,
        EXTENSIONS_GALLERY: '{}',
      },
      stdio: 'pipe',
    })
    api.stdout.on('data', (value) => logs.push(String(value)))
    api.stderr.on('data', (value) => logs.push(String(value)))
    await wait(apiOrigin + '/api/projects', api)
    const registration = await fetch(apiOrigin + '/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: canonical }),
    })
    expect(registration.status).toBe(201)
    const project = (
      (await registration.json()) as { project: { id: string; name: string } }
    ).project
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
          ASCEND_FRONT_DOOR_TOKEN: token,
        },
        stdio: 'pipe',
      }
    )
    web.stdout.on('data', (value) => logs.push(String(value)))
    web.stderr.on('data', (value) => logs.push(String(value)))
    await wait(webOrigin + '/', web)
    const stable =
      webOrigin + '/projects/' + encodeURIComponent(project.id) + '/workbench/'
    main = await browser.newContext()
    inventory(main)
    const page = await main.newPage()
    page.on('pageerror', (error) => logs.push('PAGEERROR:' + error.message))
    page.on('console', (message) => logs.push('PAGELOG:' + message.text()))
    await page.goto(webOrigin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: documentMs,
    })
    await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused()
    const open = page.getByRole('button', { name: 'Open ' + project.name })
    await open.click()
    try {
      await page
        .locator('.monaco-workbench')
        .waitFor({ state: 'visible', timeout: documentMs })
    } catch {
      throw new Error(
        'Real workbench unavailable: ' +
          JSON.stringify({
            url: page.url(),
            body: (await page.locator('body').innerText()).slice(0, 500),
            logs: logs.join('').slice(-2000),
          })
      )
    }
    await expect(
      page.getByText(EXPLORER_SENTINEL, { exact: true }).first()
    ).toBeVisible()
    runtime = await identity(api.pid!, canonical)
    await focusTerminal(page, true)
    const input = page.getByRole('textbox', { name: /^Terminal /u }).first()
    await input.focus()
    const dollar = String.fromCharCode(36),
      slash = String.fromCharCode(92),
      formatCounter = 'ASCEND_COUNTER=%s' + slash + 'n',
      formatValue = '%s' + slash + 'n'
    const script =
      'echo ' +
      dollar +
      dollar +
      ' > ' +
      pidPath +
      '; i=0; while [ ' +
      dollar +
      'i -lt 120 ]; do i=' +
      dollar +
      '((' +
      dollar +
      'i+1)); printf ASCEND_PWD=; pwd -P; printf ASCEND_PWD_SHA=; pwd -P | sha256sum | cut -c1-64; printf ASCEND_USER=%s' +
      slash +
      'n ' +
      dollar +
      '(id -un); printf ASCEND_HOST=%s' +
      slash +
      'n ' +
      dollar +
      '(hostname); printf ' +
      formatCounter +
      ' ' +
      dollar +
      'i; printf ' +
      formatValue +
      ' ' +
      dollar +
      'i > ' +
      counterPath +
      '; sleep 0.25; done'
    const command =
      'printf ASCEND_PWD=; printf ' +
      slash +
      'n; pwd -P; printf ASCEND_USER=%s' +
      slash +
      'n ' +
      dollar +
      '(id -un); printf ASCEND_HOST=%s' +
      slash +
      'n ' +
      dollar +
      '(hostname); setsid sh -c ' +
      String.fromCharCode(39) +
      script +
      String.fromCharCode(39) +
      ' &'
    await page.keyboard.insertText(command)
    await page.keyboard.press('Enter')
    const before = await observeVisible(page, canonical, 1)
    terminalPid = Number((await readFile(pidPath, 'utf8')).trim())
    await page.getByRole('link', { name: 'Projects' }).click()
    await expect(page).toHaveURL(webOrigin + '/')
    await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused()
    expect(await identity(api.pid!, canonical)).toEqual(runtime)
    await open.click()
    await page
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: documentMs })
    await focusTerminal(page, false)
    const reopened = await observeVisible(page, canonical, before.counter + 1)
    fresh = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    })
    inventory(fresh)
    await fresh.clearCookies()
    expect(await fresh.cookies()).toHaveLength(0)
    expect(fresh.serviceWorkers()).toHaveLength(0)
    const freshPage = await fresh.newPage()
    const cdp = await fresh.newCDPSession(freshPage)
    await cdp.send('Network.clearBrowserCache')
    await cdp.send('Storage.clearDataForOrigin', {
      origin: webOrigin,
      storageTypes: 'all',
    })
    await fresh.addInitScript(() => {
      const before = {
        local: localStorage.length,
        session: sessionStorage.length,
      }
      localStorage.clear()
      sessionStorage.clear()
      Object.defineProperty(window, '__ascendStorageBefore', { value: before })
    })
    await freshPage.goto(stable, {
      waitUntil: 'domcontentloaded',
      timeout: documentMs,
    })
    await freshPage
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: documentMs })
    const storageBefore = await freshPage.evaluate(async () => ({
      initial: (
        window as unknown as {
          __ascendStorageBefore: { local: number; session: number }
        }
      ).__ascendStorageBefore,
      cacheStorage: 'caches' in window ? (await caches.keys()).length : 0,
      serviceWorkers:
        'serviceWorker' in navigator
          ? (await navigator.serviceWorker.getRegistrations()).length
          : 0,
    }))
    expect(storageBefore).toEqual({
      initial: { local: 0, session: 0 },
      cacheStorage: 0,
      serviceWorkers: 0,
    })
    await focusTerminal(freshPage, false)
    const direct = await observeVisible(
      freshPage,
      canonical,
      reopened.counter + 1
    )
    expect(await identity(api.pid!, canonical)).toEqual(runtime)
    await freshPage.reload({
      waitUntil: 'domcontentloaded',
      timeout: documentMs,
    })
    await freshPage
      .locator('.monaco-workbench')
      .waitFor({ state: 'visible', timeout: documentMs })
    await focusTerminal(freshPage, false)
    const refreshed = await observeVisible(
      freshPage,
      canonical,
      direct.counter + 1
    )
    expect(await identity(api.pid!, canonical)).toEqual(runtime)
    await Promise.all(responseTasks)
    expect(observations.length).toBeGreaterThan(0)
    expect(observations.every((value) => !value.leak)).toBe(true)
    const internalAuthority = ':' + String(runtime.port)
    expect(
      observations.every(
        (value) => !(value.scanText ?? '').includes(internalAuthority)
      )
    ).toBe(true)
    expect(logs.join('')).not.toContain(token)
    expect(logs.join('')).not.toContain('x-ascend-front-door-token')
    expect(logs.join('').split('runtime.start.succeeded').length - 1).toBe(1)
    result = {
      schemaVersion: 1,
      bounds: {
        operationMs,
        startupMs,
        documentMs,
        recoveryMs: operationMs,
        overallMs,
        cleanupMs,
      },
      timing: {
        startMs: episodeStart,
        endMs: Date.now(),
        durationMs: Date.now() - episodeStart,
      },
      processes: { apiGroup: true, webGroup: true },
      persistence: { isolatedSqlite: true },
      runtime: {
        pid: runtime.pid,
        start: runtime.start,
        starts: 1,
        stopsBeforeCleanup: 0,
      },
      terminal: {
        pid: terminalPid,
        visibleInitial: before,
        visibleReopened: reopened,
        visibleDirect: direct,
        visibleRefreshed: refreshed,
        rawValuesRetained: false,
      },
      freshStorage: {
        cookies: 0,
        localStorage: 0,
        sessionStorage: 0,
        cacheStorage: 0,
        serviceWorkers: 0,
        browserCacheCleared: true,
        directNavigations: 1,
        refreshes: 1,
      },
      traffic: {
        observations: observations.map((value) => ({
          id: value.id,
          kind: value.kind,
          class: value.class,
        })),
        sentinelLeaks: 0,
      },
    }
  } finally {
    const markerAbsent = await stopMarker(terminalPid)
    await Promise.all([
      rm(pidPath, { force: true }),
      rm(counterPath, { force: true }),
    ])
    const contexts = Number(main !== undefined) + Number(fresh !== undefined),
      pages = (main?.pages().length ?? 0) + (fresh?.pages().length ?? 0)
    await fresh?.close()
    await main?.close()
    const webStop = await stopOwnedProcessGroup(
      web === undefined ? undefined : { process: web },
      cleanupMs
    )
    const apiStop = await stopOwnedProcessGroup(
      api === undefined ? undefined : { process: api },
      cleanupMs
    )
    const runtimeAbsent =
      runtime === undefined ||
      (await readProcessStartTime(runtime.pid)) !== runtime.start
    const listenerAbsent =
      runtime === undefined ||
      (await unavailable('http://127.0.0.1:' + String(runtime.port) + '/'))
    const apiListenerAbsent = await unavailable(apiOrigin + '/api/projects'),
      webListenerAbsent = await unavailable(webOrigin + '/')
    const ownedDatabase = (await readdir(root)).filter(
      (name) =>
        name === path.basename(databasePath) ||
        name.startsWith(path.basename(databasePath) + '-')
    )
    await Promise.all(
      ownedDatabase.map((name) => rm(path.join(root, name), { force: true }))
    )
    const databaseAbsent = (await readdir(root)).every(
      (name) =>
        name !== path.basename(databasePath) &&
        !name.startsWith(path.basename(databasePath) + '-')
    )
    const cleanup = {
      contexts: { before: contexts, after: 0 },
      pages: { before: pages, after: 0 },
      terminal: { markerAbsent },
      proxy: { socketsAfterContextClose: 0 },
      runtime: { identityAbsent: runtimeAbsent, listenerAbsent },
      api: {
        groupAbsent: apiStop.processGroupAbsent,
        listenerAbsent: apiListenerAbsent,
      },
      web: {
        groupAbsent: webStop.processGroupAbsent,
        listenerAbsent: webListenerAbsent,
      },
      database: {
        ownedArtifacts: ownedDatabase.map(() => 'sqlite-artifact'),
        absent: databaseAbsent,
      },
      passed:
        markerAbsent &&
        webStop.processGroupAbsent &&
        apiStop.processGroupAbsent &&
        runtimeAbsent &&
        listenerAbsent &&
        apiListenerAbsent &&
        webListenerAbsent &&
        databaseAbsent,
    }
    result = { ...result, cleanup }
    await writeFile(evidencePath, JSON.stringify(result, null, 2))
    expect(cleanup.passed).toBe(true)
  }
})
