import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer, Socket } from 'node:net'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { DEFAULT_DATABASE_PATH } from '../../apps/api/src/db/client.js'
import { createProjectLibrary } from '../../apps/api/src/project-library.js'
import { snapshotFixture } from '../../apps/api/test/project-registration-fixture-helper.js'
import {
  processGroupAbsent,
  stopOwnedProcessGroup,
  type OwnedProcessGroupStopResult,
} from '../../apps/api/test/helpers/project-home-process-group.js'
import {
  BL008_CLEANUP_EVIDENCE_PATH,
  OPEN_PROJECT_CLEANUP_SCENARIOS,
  runOpenProjectCleanupMatrix,
} from '../../apps/api/test/helpers/open-project-cleanup.js'

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..')
export const BL008_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-008/open-project'
)
const DATABASE_ROOT = path.join(BL008_EVIDENCE_ROOT, 'databases')
const FIXTURE_ROOT = path.join(BL008_EVIDENCE_ROOT, 'fixtures')
const EPISODE_PATH = path.join(BL008_EVIDENCE_ROOT, 'episode.json')
const CLOSE_FAULT_EPISODE_PATH = path.join(
  BL008_EVIDENCE_ROOT,
  'close-fault-episode.json'
)
const DATABASE_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const
const GRACEFUL_EXIT_TIMEOUT_MS = 10_000
const START_TIMEOUT_MS = 15_000

interface OwnedChild {
  process: ChildProcessWithoutNullStreams
  label: string
  output: string
}

async function disposablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Disposable port allocation failed')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
  return address.port
}

function startChild(
  label: string,
  args: readonly string[],
  environment: NodeJS.ProcessEnv
): OwnedChild {
  const child = spawn('pnpm', [...args], {
    cwd: REPOSITORY_ROOT,
    detached: true,
    env: environment,
    stdio: 'pipe',
  })
  const owned: OwnedChild = { process: child, label, output: '' }
  const append = (chunk: string): void => {
    owned.output = (owned.output + chunk).slice(-20_000)
  }
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  return owned
}

async function waitForHttp(url: string, child: OwnedChild): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.process.exitCode !== null || child.process.signalCode !== null)
      throw new Error(child.label + ' exited before readiness: ' + child.output)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.status >= 200 && response.status < 500) return
    } catch {
      /* bounded readiness retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(child.label + ' did not become ready: ' + child.output)
}

async function listenerAbsent(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket()
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
    socket.connect(port, '127.0.0.1')
  })
}

async function pathAbsent(target: string): Promise<boolean> {
  return access(target).then(
    () => false,
    () => true
  )
}

async function keyboardSubmit(
  page: import('@playwright/test').Page,
  pathValue: string
): Promise<void> {
  const input = page.getByRole('textbox', { name: 'Host path' })
  if (
    !(await input.evaluate((element) => element === document.activeElement))
  ) {
    while (
      !(await input.evaluate((element) => element === document.activeElement))
    )
      await page.keyboard.press('Shift+Tab')
  }
  await page.keyboard.press('Control+A')
  await page.keyboard.type(pathValue)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
}

test.describe.configure({ mode: 'serial', retries: 0 })
test.setTimeout(90_000)

test('uses only the keyboard to register, reconcile, correct, and open Workbench with owned cleanup', async ({
  page,
}) => {
  await mkdir(DATABASE_ROOT, { recursive: true })
  await mkdir(FIXTURE_ROOT, { recursive: true })
  await rm(EPISODE_PATH, { force: true })
  await rm(BL008_CLEANUP_EVIDENCE_PATH, { force: true })
  const databasePath = path.join(
    DATABASE_ROOT,
    'open-project-' + randomUUID() + '.db'
  )
  const fixtureRoot = path.join(FIXTURE_ROOT, 'episode-' + randomUUID())
  const firstPath = path.join(fixtureRoot, 'first project')
  const secondPath = path.join(fixtureRoot, 'second <script> project')
  const equivalentPath = path.join(fixtureRoot, 'first-link')
  const missingPath = path.join(fixtureRoot, 'missing')
  await mkdir(firstPath, { recursive: true })
  await mkdir(secondPath, { recursive: true })
  await writeFile(path.join(firstPath, 'content.txt'), 'first unchanged')
  await writeFile(path.join(secondPath, 'content.txt'), 'second unchanged')
  await symlink(firstPath, equivalentPath)
  const manifestBefore = await snapshotFixture(fixtureRoot)
  if (path.resolve(databasePath) === path.resolve(DEFAULT_DATABASE_PATH))
    throw new Error('BL-008 refused the developer database')
  for (const target of [databasePath, fixtureRoot]) {
    const root = target === databasePath ? DATABASE_ROOT : FIXTURE_ROOT
    const relative = path.relative(root, target)
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('BL-008 allocation escaped its root')
  }
  const databaseFiles = DATABASE_SUFFIXES.map((suffix) => databasePath + suffix)
  const apiPort = await disposablePort()
  const webPort = await disposablePort()
  const apiUrl = 'http://127.0.0.1:' + apiPort
  const webUrl = 'http://127.0.0.1:' + webPort
  let api: OwnedChild | undefined
  let web: OwnedChild | undefined
  let apiGroup: number | undefined
  let webGroup: number | undefined
  let postCount = 0
  let deleteCount = 0
  let documentNavigations = 0
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/projects'
    )
      postCount += 1
    if (
      request.method() === 'DELETE' &&
      new URL(request.url()).pathname.startsWith('/api/projects/')
    )
      deleteCount += 1
  })
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) documentNavigations += 1
  })
  const summary: Record<string, boolean | number> = {
    keyboardOnly: false,
    created: false,
    equivalentExisting: false,
    invalidAssociated: false,
    corrected: false,
    stableIdentity: false,
    noReload: false,
    openNavigation: false,
    closeCancelled: false,
    closeConfirmed: false,
    authoritativeClose: false,
    fixtureIntegrity: false,
    durableRows: 0,
    ownedCleanup: false,
  }
  let apiStop: OwnedProcessGroupStopResult | undefined
  let webStop: OwnedProcessGroupStopResult | undefined
  try {
    api = startChild(
      'Ascend API',
      [
        '--filter',
        '@ascend/api',
        'exec',
        'tsx',
        '../../tests/e2e/project-home-api-launcher.ts',
      ],
      {
        ...process.env,
        ASCEND_HOST: '127.0.0.1',
        ASCEND_PORT: String(apiPort),
        ASCEND_DATABASE_URL: databasePath,
        ASCEND_PROJECT_HOME: fixtureRoot,
        ASCEND_PROJECT_ALLOWED_ROOTS: fixtureRoot,
      }
    )
    apiGroup = api.process.pid
    if (apiGroup === undefined)
      throw new Error('API process identity unavailable')
    await waitForHttp(apiUrl + '/', api)
    web = startChild(
      'Ascend web',
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
      { ...process.env, ASCEND_E2E_API_TARGET: apiUrl }
    )
    webGroup = web.process.pid
    if (webGroup === undefined)
      throw new Error('Web process identity unavailable')
    await waitForHttp(webUrl + '/', web)

    await page.goto(webUrl + '/')
    await expect(page.getByRole('textbox', { name: 'Host path' })).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: 'Host path' })).toBeFocused()
    const baselineNavigations = documentNavigations

    await keyboardSubmit(page, firstPath)
    const firstOpen = page.getByRole('button', { name: 'Open first project' })
    await expect(firstOpen).toBeFocused()
    await expect(page.getByRole('status')).toContainText('Project created')
    const firstId = await firstOpen.getAttribute('data-project-id')
    summary.created = true

    await keyboardSubmit(page, equivalentPath)
    await expect(firstOpen).toBeFocused()
    await expect(page.getByRole('status')).toContainText('already registered')
    expect(await firstOpen.getAttribute('data-project-id')).toBe(firstId)
    await expect(page.getByRole('listitem')).toHaveCount(1)
    summary.equivalentExisting = true
    summary.stableIdentity = true

    await keyboardSubmit(page, missingPath)
    const input = page.getByRole('textbox', { name: 'Host path' })
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await input.getAttribute('aria-describedby')
    expect(describedBy).toContain('host-path-error')
    await expect(page.getByRole('alert')).toContainText('does not exist')
    await expect(page.getByRole('listitem')).toHaveCount(1)
    summary.invalidAssociated = true

    await keyboardSubmit(page, secondPath)
    const secondOpen = page.getByRole('button', {
      name: 'Open second <script> project',
    })
    await expect(secondOpen).toBeFocused()
    await expect(page.getByRole('listitem')).toHaveCount(2)
    summary.corrected = true
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', {
        name: 'Stop second <script> project workbench',
      })
    ).toBeFocused()
    await page.keyboard.press('Tab')
    const secondClose = page.getByRole('button', {
      name: 'Close second <script> project',
    })
    await expect(secondClose).toBeFocused()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', {
      name: 'Close second <script> project?',
    })
    await expect(dialog).toContainText(
      'Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted.'
    )
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(secondClose).toBeFocused()
    expect(deleteCount).toBe(0)
    summary.closeCancelled = true

    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(secondClose).toBeHidden()
    await expect(page.locator('#workbench-opening-status')).toContainText(
      'second <script> project: Project closed.'
    )
    await expect(page.locator('[data-close-lane-project-id]')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Close first project' })
    ).toBeFocused()
    expect(deleteCount).toBe(1)
    summary.closeConfirmed = true
    const authoritative = await fetch(apiUrl + '/api/projects')
    const authoritativeBody = (await authoritative.json()) as {
      projects: Array<{ id: string }>
    }
    expect(authoritativeBody.projects.map(({ id }) => id)).toEqual([firstId])
    summary.authoritativeClose = true

    expect(postCount).toBe(4)
    expect(documentNavigations).toBe(baselineNavigations)
    summary.noReload = true
    await firstOpen.focus()
    await expect(firstOpen).toBeFocused()
    await page.keyboard.press('Enter')
    const expectedWorkbenchPath =
      '/projects/' + encodeURIComponent(firstId ?? '') + '/workbench/'
    await expect(page).toHaveURL(webUrl + expectedWorkbenchPath)
    expect(documentNavigations).toBe(baselineNavigations + 1)
    summary.openNavigation = true
    summary.keyboardOnly = true
    expect(await snapshotFixture(fixtureRoot)).toEqual(manifestBefore)
    summary.fixtureIntegrity = true

    apiStop = await stopOwnedProcessGroup(api, GRACEFUL_EXIT_TIMEOUT_MS)
    api = undefined
    const library = await createProjectLibrary(databasePath)
    try {
      summary.durableRows = (await library.list()).length
      expect(summary.durableRows).toBe(1)
    } finally {
      library.close()
    }
  } finally {
    apiStop ??= await stopOwnedProcessGroup(api, GRACEFUL_EXIT_TIMEOUT_MS)
    webStop = await stopOwnedProcessGroup(web, GRACEFUL_EXIT_TIMEOUT_MS)
    const apiListenerAbsent = await listenerAbsent(apiPort)
    const webListenerAbsent = await listenerAbsent(webPort)
    const apiGroupAbsent =
      apiGroup === undefined || (await processGroupAbsent(apiGroup))
    const webGroupAbsent =
      webGroup === undefined || (await processGroupAbsent(webGroup))
    for (const file of databaseFiles) await rm(file, { force: true })
    const databaseAbsent = (
      await Promise.all(databaseFiles.map(pathAbsent))
    ).every(Boolean)
    await rm(fixtureRoot, { recursive: true, force: true })
    const fixtureAbsent = await pathAbsent(fixtureRoot)
    summary.ownedCleanup =
      apiStop.graceful &&
      webStop.graceful &&
      apiListenerAbsent &&
      webListenerAbsent &&
      apiGroupAbsent &&
      webGroupAbsent &&
      databaseAbsent &&
      fixtureAbsent
    await mkdir(BL008_EVIDENCE_ROOT, { recursive: true })
    await writeFile(EPISODE_PATH, JSON.stringify(summary, null, 2))
    expect(summary.ownedCleanup).toBe(true)
    expect(summary.fixtureIntegrity).toBe(true)
  }
})

test('recovers from a controlled close persistence fault in real Chromium', async ({
  page,
}) => {
  await mkdir(DATABASE_ROOT, { recursive: true })
  await mkdir(FIXTURE_ROOT, { recursive: true })
  await rm(CLOSE_FAULT_EPISODE_PATH, { force: true })
  const databasePath = path.join(
    DATABASE_ROOT,
    'close-fault-' + randomUUID() + '.db'
  )
  const fixtureRoot = path.join(FIXTURE_ROOT, 'close-fault-' + randomUUID())
  const projectPath = path.join(fixtureRoot, 'fault project')
  await mkdir(projectPath, { recursive: true })
  await writeFile(path.join(projectPath, 'sentinel.txt'), 'fault unchanged')
  const manifestBefore = await snapshotFixture(fixtureRoot)
  if (path.resolve(databasePath) === path.resolve(DEFAULT_DATABASE_PATH)) {
    throw new Error('BL-009 refused the developer database')
  }
  const databaseFiles = DATABASE_SUFFIXES.map((suffix) => databasePath + suffix)
  const apiPort = await disposablePort()
  const webPort = await disposablePort()
  const apiUrl = 'http://127.0.0.1:' + apiPort
  const webUrl = 'http://127.0.0.1:' + webPort
  let api: OwnedChild | undefined
  let web: OwnedChild | undefined
  let apiGroup: number | undefined
  let webGroup: number | undefined
  let deletes = 0
  page.on('request', (request) => {
    if (request.method() === 'DELETE') deletes += 1
  })
  const summary: Record<string, boolean | number> = {
    knownFailure: false,
    sameIdRetry: false,
    eventualClose: false,
    fixtureIntegrity: false,
    ownedCleanup: false,
    deleteRequests: 0,
  }
  try {
    api = startChild(
      'Ascend API close fault',
      [
        '--filter',
        '@ascend/api',
        'exec',
        'tsx',
        '../../tests/e2e/project-home-api-launcher.ts',
        '--close-fault-once',
      ],
      {
        ...process.env,
        ASCEND_HOST: '127.0.0.1',
        ASCEND_PORT: String(apiPort),
        ASCEND_DATABASE_URL: databasePath,
        ASCEND_PROJECT_HOME: fixtureRoot,
        ASCEND_PROJECT_ALLOWED_ROOTS: fixtureRoot,
      }
    )
    apiGroup = api.process.pid
    if (apiGroup === undefined)
      throw new Error('API process identity unavailable')
    await waitForHttp(apiUrl + '/', api)
    web = startChild(
      'Ascend web close fault',
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
      { ...process.env, ASCEND_E2E_API_TARGET: apiUrl }
    )
    webGroup = web.process.pid
    if (webGroup === undefined)
      throw new Error('Web process identity unavailable')
    await waitForHttp(webUrl + '/', web)

    await page.goto(webUrl + '/')
    await expect(page.getByRole('textbox', { name: 'Host path' })).toBeVisible()
    await page.keyboard.press('Tab')
    await keyboardSubmit(page, projectPath)
    await expect(
      page.getByRole('button', { name: 'Open fault project' })
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Stop fault project workbench' })
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('button', { name: 'Close fault project' })
    ).toBeFocused()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeHidden()
    const lane = page.locator('[data-close-lane-project-id]')
    await expect(lane).toHaveCount(1)
    await expect(
      lane.getByRole('status', { name: 'Close status for fault project' })
    ).toContainText('The project could not be closed. Retry this project.')
    await expect(page.locator('#workbench-opening-status')).toContainText(
      'fault project: The project could not be closed. Retry this project.'
    )
    const retry = page.getByRole('button', {
      name: 'Retry close fault project',
    })
    await expect(retry).toBeFocused()
    await expect(
      page.getByRole('button', { exact: true, name: 'Close fault project' })
    ).toBeVisible()
    summary.knownFailure = true
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused()
    expect(deletes).toBe(2)
    summary.deleteRequests = deletes
    summary.sameIdRetry = true
    const authoritative = await fetch(apiUrl + '/api/projects')
    expect(await authoritative.json()).toEqual({ projects: [] })
    summary.eventualClose = true
    expect(await snapshotFixture(fixtureRoot)).toEqual(manifestBefore)
    summary.fixtureIntegrity = true
  } finally {
    const apiStop = await stopOwnedProcessGroup(api, GRACEFUL_EXIT_TIMEOUT_MS)
    const webStop = await stopOwnedProcessGroup(web, GRACEFUL_EXIT_TIMEOUT_MS)
    const listenersAbsent =
      (await listenerAbsent(apiPort)) && (await listenerAbsent(webPort))
    const groupsAbsent =
      (apiGroup === undefined || (await processGroupAbsent(apiGroup))) &&
      (webGroup === undefined || (await processGroupAbsent(webGroup)))
    for (const file of databaseFiles) await rm(file, { force: true })
    const databaseAbsent = (
      await Promise.all(databaseFiles.map(pathAbsent))
    ).every(Boolean)
    await rm(fixtureRoot, { recursive: true, force: true })
    const fixtureAbsent = await pathAbsent(fixtureRoot)
    summary.ownedCleanup =
      apiStop.graceful &&
      webStop.graceful &&
      listenersAbsent &&
      groupsAbsent &&
      databaseAbsent &&
      fixtureAbsent
    await writeFile(CLOSE_FAULT_EPISODE_PATH, JSON.stringify(summary, null, 2))
    expect(summary.fixtureIntegrity).toBe(true)
    expect(summary.ownedCleanup).toBe(true)
  }
})

test('executes retained startup, assertion, timeout, interrupted, and descendant cleanup scenarios', async () => {
  const matrix = await runOpenProjectCleanupMatrix()
  expect(matrix.executedScenarioCount).toBe(5)
  for (const scenario of OPEN_PROJECT_CLEANUP_SCENARIOS) {
    const evidence = matrix.scenarios[scenario]
    expect(evidence.executed).toBe(true)
    expect(evidence.injectedFailureObserved).toBe(true)
    expect(evidence.processGroupsAbsent).toBe(true)
    expect(evidence.listenersAbsent).toBe(true)
    expect(evidence.databaseAndSidecarsAbsent).toBe(true)
    expect(evidence.fixturesAbsent).toBe(true)
    expect(evidence.teardownClean).toBe(true)
  }
  expect(matrix.scenarios.survivingDescendant.ownerCleanupPassed).toBe(false)
  expect(matrix.scenarios.survivingDescendant.survivingDescendantDetected).toBe(
    true
  )
  expect(
    matrix.scenarios.survivingDescendant.survivingDescendantsAfterTeardown
  ).toBe(0)
})
