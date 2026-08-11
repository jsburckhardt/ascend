import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, Socket } from 'node:net'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { DEFAULT_DATABASE_PATH } from '../../apps/api/src/db/client.js'
import { createProjectLibrary } from '../../apps/api/src/project-library.js'
import type { Project } from '../../apps/api/src/project-persistence.js'
import {
  processGroupAbsent,
  stopOwnedProcessGroup,
  type OwnedProcessGroupStopResult,
} from '../../apps/api/test/helpers/project-home-process-group.js'

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../..')
const EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-007/project-home'
)
const DATABASE_ROOT = path.join(EVIDENCE_ROOT, 'databases')
const EPISODE_PATH = path.join(EVIDENCE_ROOT, 'episode.json')
const GRACEFUL_EXIT_TIMEOUT_MS = 10_000
const START_TIMEOUT_MS = 15_000
const DATABASE_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const

interface OwnedChild {
  readonly process: ChildProcessWithoutNullStreams
  readonly label: string
  output: string
}

interface EpisodeSummary {
  emptyState: boolean
  loadingState: boolean
  populatedState: boolean
  seededIdentityMatch: boolean
  keyboardOpen: boolean
  deferredStatus: boolean
  urlUnchanged: boolean
  openRequestFree: boolean
  faultState: boolean
  retrySucceeded: boolean
  retryRequestCount: boolean
  apiGracefulExit: boolean
  webGracefulExit: boolean
  apiListenerAbsent: boolean
  webListenerAbsent: boolean
  apiProcessGroupsAbsent: boolean
  webProcessGroupAbsent: boolean
  databaseArtifactsAbsent: boolean
  observedBoundedResult: boolean
}

async function disposablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Disposable port allocation failed')
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  })
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
    if (child.process.exitCode !== null || child.process.signalCode !== null) {
      throw new Error(child.label + ' exited before readiness: ' + child.output)
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (response.status >= 200 && response.status < 500) return
    } catch {
      // Readiness is retried only within the fixed startup bound.
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(child.label + ' did not become ready: ' + child.output)
}

async function stopChild(
  child: OwnedChild | undefined
): Promise<OwnedProcessGroupStopResult> {
  return stopOwnedProcessGroup(child, GRACEFUL_EXIT_TIMEOUT_MS)
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

const seededProjects: Project[] = [
  {
    id: 'e2e-alpha',
    name: 'E2E Alpha',
    canonicalPath: '/projects/e2e alpha',
    createdAt: 1_786_407_000_000,
  },
  {
    id: 'e2e-beta',
    name: 'E2E Beta',
    canonicalPath: '/projects/e2e beta',
    createdAt: 1_786_407_000_000,
  },
]

test.describe.configure({ mode: 'serial', retries: 0 })
test.setTimeout(90_000)

test('owns real API and web while proving Project Home empty, populated, and retry states', async ({
  page,
}) => {
  await mkdir(DATABASE_ROOT, { recursive: true })
  await rm(EPISODE_PATH, { force: true })
  const databasePath = path.join(
    DATABASE_ROOT,
    'project-home-' + randomUUID() + '.db'
  )
  if (path.resolve(databasePath) === path.resolve(DEFAULT_DATABASE_PATH)) {
    throw new Error('BL-007 browser test refused the developer database')
  }
  const relativeDatabase = path.relative(DATABASE_ROOT, databasePath)
  if (relativeDatabase.startsWith('..') || path.isAbsolute(relativeDatabase)) {
    throw new Error('BL-007 database escaped its disposable root')
  }
  const databaseFiles = DATABASE_SUFFIXES.map((suffix) => databasePath + suffix)
  const apiPort = await disposablePort()
  const webPort = await disposablePort()
  const apiUrl = 'http://127.0.0.1:' + apiPort
  const webUrl = 'http://127.0.0.1:' + webPort
  const baseEnvironment = {
    ...process.env,
    ASCEND_HOST: '127.0.0.1',
    ASCEND_PORT: String(apiPort),
    ASCEND_DATABASE_URL: databasePath,
  }
  const summary: EpisodeSummary = {
    emptyState: false,
    loadingState: false,
    populatedState: false,
    seededIdentityMatch: false,
    keyboardOpen: false,
    deferredStatus: false,
    urlUnchanged: false,
    openRequestFree: false,
    faultState: false,
    retrySucceeded: false,
    retryRequestCount: false,
    apiGracefulExit: true,
    webGracefulExit: true,
    apiListenerAbsent: false,
    webListenerAbsent: false,
    apiProcessGroupsAbsent: false,
    webProcessGroupAbsent: false,
    databaseArtifactsAbsent: false,
    observedBoundedResult: false,
  }
  let api: OwnedChild | undefined
  let web: OwnedChild | undefined
  const apiProcessGroupIds: number[] = []
  let webProcessGroupId: number | undefined
  let projectListRequests = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/projects') {
      projectListRequests += 1
    }
  })

  const startApi = async (fault = false): Promise<void> => {
    const args = [
      '--filter',
      '@ascend/api',
      'exec',
      'tsx',
      '../../tests/e2e/project-home-api-launcher.ts',
      '--delay-list',
    ]
    if (fault) args.push('--fault-once')
    api = startChild('Ascend API', args, baseEnvironment)
    if (api.process.pid === undefined) {
      throw new Error('Ascend API process-group identity is unavailable')
    }
    apiProcessGroupIds.push(api.process.pid)
    await waitForHttp(apiUrl + '/', api)
  }
  const stopApi = async (): Promise<void> => {
    const stopped = await stopChild(api)
    summary.apiGracefulExit = stopped.graceful && summary.apiGracefulExit
    api = undefined
  }

  try {
    const playwrightConfiguration = await readFile(
      path.join(REPOSITORY_ROOT, 'playwright.config.ts'),
      'utf8'
    )
    expect(playwrightConfiguration).not.toContain('webServer:')

    await startApi()
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
    if (web.process.pid === undefined) {
      throw new Error('Ascend web process-group identity is unavailable')
    }
    webProcessGroupId = web.process.pid
    await waitForHttp(webUrl + '/', web)

    await page.goto(webUrl + '/')
    await expect(page.getByRole('status')).toContainText(
      'Loading registered projects'
    )
    summary.loadingState = true
    await expect(
      page.getByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    summary.emptyState = true

    await stopApi()
    const library = await createProjectLibrary(databasePath)
    try {
      for (const project of seededProjects) {
        await library.create(project)
      }
    } finally {
      library.close()
    }
    await startApi()
    await page.reload()
    const cards = page.getByRole('listitem')
    await expect(cards).toHaveCount(seededProjects.length)
    summary.populatedState = true
    const identities = await page
      .getByRole('button', { name: /^Open /u })
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('data-project-id'))
      )
    expect(identities).toEqual(seededProjects.map(({ id }) => id))
    summary.seededIdentityMatch = true

    const firstOpen = page.getByRole('button', { name: 'Open E2E Alpha' })
    const secondOpen = page.getByRole('button', { name: 'Open E2E Beta' })
    await firstOpen.focus()
    await page.keyboard.press('Tab')
    await expect(secondOpen).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(firstOpen).toBeFocused()
    const beforeOpenUrl = page.url()
    const beforeOpenRequests = projectListRequests
    await page.keyboard.press('Enter')
    summary.keyboardOpen = true
    await expect(page.getByRole('status')).toContainText(
      'E2E Alpha: Opening is not available in BL-007.'
    )
    summary.deferredStatus = true
    summary.urlUnchanged = page.url() === beforeOpenUrl
    summary.openRequestFree = projectListRequests === beforeOpenRequests
    expect(summary.urlUnchanged).toBe(true)
    expect(summary.openRequestFree).toBe(true)

    await stopApi()
    await startApi(true)
    const beforeFaultRequests = projectListRequests
    await page.reload()
    await expect(page.getByRole('alert')).toContainText(
      'Projects could not be loaded'
    )
    summary.faultState = true
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(cards).toHaveCount(seededProjects.length)
    summary.retrySucceeded = true
    summary.retryRequestCount = projectListRequests - beforeFaultRequests === 2
    expect(summary.retryRequestCount).toBe(true)
    summary.observedBoundedResult = true
  } finally {
    await stopApi()
    const webStop = await stopChild(web)
    summary.webGracefulExit = webStop.graceful
    summary.apiListenerAbsent = await listenerAbsent(apiPort)
    summary.webListenerAbsent = await listenerAbsent(webPort)
    summary.apiProcessGroupsAbsent = (
      await Promise.all(apiProcessGroupIds.map(processGroupAbsent))
    ).every(Boolean)
    summary.webProcessGroupAbsent =
      webProcessGroupId === undefined ||
      (await processGroupAbsent(webProcessGroupId))
    for (const file of databaseFiles) await rm(file, { force: true })
    summary.databaseArtifactsAbsent = (
      await Promise.all(databaseFiles.map(pathAbsent))
    ).every(Boolean)
    await mkdir(EVIDENCE_ROOT, { recursive: true })
    await writeFile(EPISODE_PATH, JSON.stringify(summary, null, 2) + '\n')
    expect(summary.apiGracefulExit).toBe(true)
    expect(summary.webGracefulExit).toBe(true)
    expect(summary.apiListenerAbsent).toBe(true)
    expect(summary.webListenerAbsent).toBe(true)
    expect(summary.apiProcessGroupsAbsent).toBe(true)
    expect(summary.webProcessGroupAbsent).toBe(true)
    expect(summary.databaseArtifactsAbsent).toBe(true)
  }
})
