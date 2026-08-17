import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  BROWSER_EPISODE_PATH,
  BROWSER_ROOT,
  discoverWorkbench,
  holdPort,
  prepareRoot,
  registrationPresent,
  registerProject,
  removeRoot,
  runtimeState,
  severWorkbench,
  startBrowserHost,
  startCompiledApi,
  startRuntime,
  stopCompiledApi,
  type BrowserHost,
  type CompiledApi,
  type RegisteredProject,
} from './project-close-host.js'

test.describe.configure({ mode: 'serial', retries: 0 })
test.setTimeout(180_000)

interface BrowserEpisodeClaims {
  runningDialog: boolean
  failedDialog: boolean
  peerControlsAvailable: boolean
  successAnnouncement: boolean
  failureAnnouncement: boolean
  unknownAnnouncement: boolean
  focusRecovered: string[]
  unknownResolvedClosed: boolean
  unknownResolvedRetained: boolean
  preCloseSocketSevered: boolean
  routeErrorRendered: boolean
}

const claims: BrowserEpisodeClaims = {
  runningDialog: false,
  failedDialog: false,
  peerControlsAvailable: false,
  successAnnouncement: false,
  failureAnnouncement: false,
  unknownAnnouncement: false,
  focusRecovered: [],
  unknownResolvedClosed: false,
  unknownResolvedRetained: false,
  preCloseSocketSevered: false,
  routeErrorRendered: false,
}

let api: CompiledApi
let host: BrowserHost
let root: string
let databasePath: string

/** Moves focus with the keyboard alone until the target holds it. */
async function focusByKeyboard(page: Page, target: Locator): Promise<void> {
  for (let press = 0; press < 80; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement))
      return
    await page.keyboard.press('Tab')
  }
  throw new Error('the keyboard never reached the target control')
}

async function activate(page: Page, target: Locator): Promise<void> {
  await focusByKeyboard(page, target)
  await page.keyboard.press('Enter')
}

const closeButton = (page: Page, project: RegisteredProject): Locator =>
  page.getByRole('button', { exact: true, name: 'Close ' + project.name })

const announcement = (page: Page): Locator =>
  page.locator('[role="status"]').first()

const card = (page: Page, project: RegisteredProject): Locator =>
  page.locator('[data-runtime-project-id="' + project.id + '"]')

async function createProject(name: string): Promise<RegisteredProject> {
  const canonical = path.join(root, name)
  await mkdir(canonical, { recursive: true })
  await writeFile(path.join(canonical, 'content.txt'), name)
  return registerProject(api, canonical)
}

test.beforeAll(async () => {
  await mkdir(BROWSER_ROOT, { recursive: true })
  root = await prepareRoot()
  databasePath = path.join(root, 'browser-episode.db')
  api = await startCompiledApi({ databasePath, projectRoot: root })
  host = await startBrowserHost(api)
})

test.afterAll(async () => {
  await writeFile(
    BROWSER_EPISODE_PATH,
    JSON.stringify(
      {
        evidenceId: 'bl-020-browser-episode',
        compiledWebBuild: true,
        compiledApiEntryPoint: true,
        realBrowser: 'chromium',
        keyboardOnly: true,
        claims,
      },
      null,
      2
    ) + '\n'
  )
  await host.stop()
  await stopCompiledApi(api)
  await removeRoot(root)
})

test('closes a Running card with the keyboard while peer controls stay usable', async ({
  page,
}) => {
  const subject = await createProject('running-subject')
  const peer = await createProject('running-peer')
  await startRuntime(api, subject)
  await startRuntime(api, peer)
  await page.goto(host.origin + '/')
  await expect(card(page, subject)).toHaveAttribute(
    'data-runtime-state',
    'Running'
  )

  await activate(page, closeButton(page, subject))
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Close ' + subject.name + '?' })
  ).toBeVisible()
  claims.runningDialog = true

  await activate(page, dialog.getByRole('button', { name: 'Cancel' }))
  await expect(dialog).toBeHidden()
  await expect(closeButton(page, subject)).toBeFocused()
  claims.focusRecovered.push('close')

  host.faults.slowCloses.set(subject.id, 1_500)
  await activate(page, closeButton(page, subject))
  await expect(dialog).toBeVisible()
  await activate(page, dialog.getByRole('button', { name: 'Confirm' }))
  const lane = page.locator(
    '[data-close-lane-project-id="' + subject.id + '"] [data-close-phase]'
  )
  await expect(lane).toHaveAttribute('data-close-phase', 'pending')
  await expect(closeButton(page, subject)).toBeDisabled()
  for (const name of [
    'Close ' + peer.name,
    'Stop ' + peer.name + ' workbench',
    'Restart ' + peer.name + ' workbench',
  ])
    await expect(page.getByRole('button', { exact: true, name })).toBeEnabled()
  claims.peerControlsAvailable = true

  await expect(announcement(page)).toHaveText(
    subject.name + ': Project closed.',
    { timeout: 30_000 }
  )
  claims.successAnnouncement = true
  await expect(closeButton(page, subject)).toHaveCount(0)
  expect(await registrationPresent(api, subject)).toBe(false)
  expect(await runtimeState(api, peer)).toBe('Running')
  host.faults.slowCloses.delete(subject.id)
})

test('announces a refused close on a Failed card and closes it once release is confirmable', async ({
  page,
}) => {
  const subject = await createProject('failed-subject')
  await startRuntime(api, subject)
  const workbench = await discoverWorkbench(subject)
  await severWorkbench(workbench)
  const held = await holdPort(workbench.port)

  await page.goto(host.origin + '/')
  await expect(card(page, subject)).toHaveAttribute(
    'data-runtime-state',
    'Failed',
    { timeout: 30_000 }
  )

  await activate(page, closeButton(page, subject))
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Close ' + subject.name + '?' })
  ).toBeVisible()
  claims.failedDialog = true

  await activate(page, dialog.getByRole('button', { name: 'Confirm' }))
  await expect(announcement(page)).toHaveText(
    subject.name +
      ': Ascend could not confirm the workbench release. Retry this project.',
    { timeout: 30_000 }
  )
  claims.failureAnnouncement = true
  const retry = page.getByRole('button', {
    name: 'Retry close ' + subject.name,
  })
  await expect(retry).toBeFocused()
  claims.focusRecovered.push('close-retry')
  expect(await registrationPresent(api, subject)).toBe(true)

  await held.release()
  await activate(page, retry)
  await expect(announcement(page)).toHaveText(
    subject.name + ': Project closed.',
    { timeout: 30_000 }
  )
  expect(await registrationPresent(api, subject)).toBe(false)
})

test('resolves an unknown close outcome against both authoritative observations', async ({
  page,
}) => {
  const closed = await createProject('unknown-closed')
  const retained = await createProject('unknown-retained')
  await startRuntime(api, closed)
  await startRuntime(api, retained)
  const retainedWorkbench = await discoverWorkbench(retained)
  await severWorkbench(retainedWorkbench)
  const held = await holdPort(retainedWorkbench.port)

  await page.goto(host.origin + '/')
  host.faults.severedCloses.add(closed.id)
  await activate(page, closeButton(page, closed))
  const dialog = page.getByRole('dialog')
  await activate(page, dialog.getByRole('button', { name: 'Confirm' }))
  await expect(announcement(page)).toHaveText(
    closed.name +
      ': Close outcome unknown. Refresh projects to determine the result.',
    { timeout: 30_000 }
  )
  claims.unknownAnnouncement = true
  const refreshClosed = page.getByRole('button', {
    name: 'Refresh close result for ' + closed.name,
  })
  await expect(refreshClosed).toBeFocused()
  claims.focusRecovered.push('close-refresh')
  await activate(page, refreshClosed)
  await expect(closeButton(page, closed)).toHaveCount(0, { timeout: 30_000 })
  expect(await registrationPresent(api, closed)).toBe(false)
  claims.unknownResolvedClosed = true

  host.faults.severedCloses.add(retained.id)
  await activate(page, closeButton(page, retained))
  await activate(page, dialog.getByRole('button', { name: 'Confirm' }))
  await expect(announcement(page)).toHaveText(
    retained.name +
      ': Close outcome unknown. Refresh projects to determine the result.',
    { timeout: 30_000 }
  )
  const refreshRetained = page.getByRole('button', {
    name: 'Refresh close result for ' + retained.name,
  })
  await activate(page, refreshRetained)
  await expect(closeButton(page, retained)).toBeVisible({ timeout: 30_000 })
  expect(await registrationPresent(api, retained)).toBe(true)
  claims.unknownResolvedRetained = true
  await held.release()
  host.faults.severedCloses.clear()
})

test('severs a pre-close workbench connection and renders the route error afterwards', async ({
  page,
}) => {
  const subject = await createProject('socket-subject')
  await startRuntime(api, subject)
  await page.goto(host.origin + '/')

  const socketState = await page.evaluate(async (id: string) => {
    const socket = new WebSocket(
      'ws://' + window.location.host + '/projects/' + id + '/workbench/'
    )
    const opened = await new Promise<boolean>((resolve) => {
      socket.addEventListener('open', () => resolve(true), { once: true })
      socket.addEventListener('error', () => resolve(false), { once: true })
      setTimeout(() => resolve(false), 10_000)
    })
    const holder = window as unknown as { __ascendSocket?: WebSocket }
    holder.__ascendSocket = socket
    return { opened, readyState: socket.readyState }
  }, subject.id)
  expect(socketState.opened).toBe(true)

  await activate(page, closeButton(page, subject))
  const dialog = page.getByRole('dialog')
  await activate(page, dialog.getByRole('button', { name: 'Confirm' }))
  await expect(announcement(page)).toHaveText(
    subject.name + ': Project closed.',
    { timeout: 30_000 }
  )

  const severed = await page.evaluate(async () => {
    const holder = window as unknown as { __ascendSocket?: WebSocket }
    const socket = holder.__ascendSocket
    if (socket === undefined) return { closed: false, sendRefused: false }
    const closedNow = await new Promise<boolean>((resolve) => {
      if (socket.readyState > WebSocket.OPEN) {
        resolve(true)
        return
      }
      socket.addEventListener('close', () => resolve(true), { once: true })
      setTimeout(() => resolve(socket.readyState > WebSocket.OPEN), 15_000)
    })
    let sendRefused = false
    try {
      socket.send('bl-020')
      sendRefused = socket.readyState > WebSocket.OPEN
    } catch {
      sendRefused = true
    }
    return { closed: closedNow, sendRefused }
  })
  expect(severed.closed).toBe(true)
  expect(severed.sendRefused).toBe(true)
  claims.preCloseSocketSevered = true

  await page.goto(host.origin + '/projects/' + subject.id + '/workbench/')
  await expect(
    page.getByRole('heading', { name: 'Workbench unavailable' })
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Project is not registered.')).toBeVisible()
  expect(await runtimeState(api, subject)).toBeNull()
  claims.routeErrorRendered = true
  expect(await registrationPresent(api, subject)).toBe(false)
})
