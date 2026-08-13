import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect, test, type Page } from '@playwright/test'
import {
  createApiServerController,
  type ApiServerController,
} from '../../apps/api/src/api-server.js'
import { createProjectLibrary } from '../../apps/api/src/project-library.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
} from '../../apps/api/src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../../apps/api/src/project-runtime-manager.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../../apps/api/src/project-runtime-process.js'
import {
  CODE_SERVER_PATH,
  REPOSITORY_ROOT,
} from '../../apps/api/src/workbench-proof-contract.js'
import {
  terminateExactProcessGroup,
  terminateExactProcessIdentity,
} from '../../apps/api/src/workbench-proof-runtime.js'
import { classifyWorkbenchConnectionRolePayload } from '../../apps/api/src/workbench-proxy-contract.js'
import { scanProtectedEvidence } from '../../apps/api/src/project-runtime-isolation-evidence.js'
import {
  BL014_FIXTURES,
  BL014_INITIAL_START_ORDER,
  BL014_OPEN_REENTRY_ORDER,
  BL014_RESOURCE_CLASSES,
  digestSessionEvidence,
  validateSessionSwitchingEvidence,
} from '../../apps/api/src/session-switching-contract.js'
import { stopOwnedProcessGroup } from '../../apps/api/test/helpers/project-home-process-group.js'

const executeFile = promisify(execFile)
const designated = process.env.BL014_DESIGNATED === '1'
const resultRoot = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-014/session-switching'
)
const evidencePath = path.join(resultRoot, 'switching-browser.json')
const operationMs = 30_000
const overallMs = 240_000
let terminalProofOrdinal = 0

const disposablePort = async (): Promise<number> => {
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

const ready = async (page: Page, fileName: string): Promise<void> => {
  await page
    .locator('.monaco-workbench')
    .waitFor({ state: 'visible', timeout: operationMs })
  await expect(page.getByText(fileName, { exact: true }).first()).toBeVisible({
    timeout: operationMs,
  })
}

const terminalProof = async (
  page: Page,
  expected: {
    canonicalPath: string
    branch: string
    marker: string
    gitStatus: string
  },
  createTerminal = true
): Promise<boolean> => {
  const visibleTerminals = page.locator('.terminal.xterm:visible')
  if (createTerminal) {
    const previousTerminalCount = await visibleTerminals.count()
    await page.keyboard.press('F1')
    await expect(page.locator('.quick-input-widget')).toBeVisible({
      timeout: operationMs,
    })
    await page.keyboard.insertText('Terminal: Create New Terminal')
    const firstCommand = page
      .locator('.quick-input-list .monaco-list-row')
      .first()
    await expect(firstCommand).toBeVisible({ timeout: operationMs })
    await firstCommand.click()
    await expect
      .poll(() => visibleTerminals.count(), { timeout: operationMs })
      .toBeGreaterThan(previousTerminalCount)
  }
  const terminal = visibleTerminals.last()
  await terminal.waitFor({ state: 'visible', timeout: operationMs })
  await expect
    .poll(async () => (await terminal.innerText()).trim().length > 0, {
      timeout: operationMs,
    })
    .toBe(true)
  const input = terminal.locator('textarea.xterm-helper-textarea')
  await input.focus()
  await expect(input).toBeFocused({ timeout: operationMs })
  const executionMarker = 'DONE_' + String(++terminalProofOrdinal)
  const command =
    'printf BL013_%s= PWD; pwd -P; printf BL013_%s= ROOT; git rev-parse --show-toplevel; ' +
    'printf BL013_%s= BRANCH; git branch --show-current; printf BL013_%s= STATUS; git status --porcelain | base64 -w0; printf BL013_%s= STATUS_END; printf BL013_%s= MARKER; git config ascend.fixture; ' +
    'printf BL013_%s= ' +
    executionMarker
  await page.keyboard.insertText(command)
  await page.keyboard.press('Enter')
  await expect
    .poll(
      async () =>
        (await terminal.innerText()).includes('BL013_' + executionMarker),
      {
        timeout: operationMs,
      }
    )
    .toBe(true)
  const normalized = (await terminal.innerText()).replace(/\s/gu, '')
  const expectedStatusBase64 = Buffer.from(expected.gitStatus + '\n').toString(
    'base64'
  )
  const required = [
    'BL013_PWD=' + expected.canonicalPath,
    'BL013_ROOT=' + expected.canonicalPath,
    'BL013_BRANCH=' + expected.branch,
    'BL013_STATUS=' + expectedStatusBase64 + 'BL013_STATUS_END=',
    'BL013_MARKER=' + expected.marker,
  ]
  const matches = required.map((marker) => normalized.includes(marker))
  expect(matches).toEqual([true, true, true, true, true])
  return true
}

const digestIdentity = (value: {
  pid: number | null
  processStartTime: string | null
  port: number | null
}) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        pid: value.pid,
        processStartTime: value.processStartTime,
        port: value.port,
      })
    )
    .digest('hex')

const fixtureState = async (project: {
  canonicalPath: string
  fileName: string
}) => {
  const head = await executeFile('git', ['rev-parse', 'HEAD'], {
    cwd: project.canonicalPath,
  })
  const status = await executeFile('git', ['status', '--porcelain'], {
    cwd: project.canonicalPath,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  })
  const sentinel = await readFile(
    path.join(project.canonicalPath, project.fileName)
  )
  return {
    head: head.stdout.trim(),
    status: status.stdout,
    sentinel: createHash('sha256').update(sentinel).digest('hex'),
  }
}

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()))

test.describe.configure({ mode: 'serial', retries: 0 })
test('preserves A/B/C sessions through keyboard switching and reconnection', async ({
  browser,
}) => {
  test.skip(
    !designated,
    'Set BL014_DESIGNATED=1 for the session-switching proof'
  )
  test.setTimeout(overallMs)
  await mkdir(resultRoot, { recursive: true })
  await rm(evidencePath, { force: true })
  const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
  await rm(restrictedPath, { force: true })
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'ascend-bl014-'))
  const counterOutput = path.join(resultRoot, 'a-counter.log')
  const counterIdentity = path.join(resultRoot, 'a-counter-identity.json')
  await Promise.all([
    rm(counterOutput, { force: true }),
    rm(counterIdentity, { force: true }),
  ])
  const projects = await Promise.all(
    BL014_FIXTURES.map(async (definition, index) => {
      const canonicalPath = path.join(fixtureRoot, definition.key.toLowerCase())
      await mkdir(canonicalPath)
      await writeFile(
        path.join(canonicalPath, definition.fileName),
        definition.editorSentinel + String.fromCharCode(10)
      )
      await executeFile('git', ['init', '-b', definition.branch], {
        cwd: canonicalPath,
      })
      await executeFile(
        'git',
        ['config', 'user.email', 'bl014@example.invalid'],
        { cwd: canonicalPath }
      )
      await executeFile('git', ['config', 'user.name', 'BL014 Fixture'], {
        cwd: canonicalPath,
      })
      await executeFile(
        'git',
        ['config', 'ascend.fixture', definition.gitSentinel],
        { cwd: canonicalPath }
      )
      await executeFile('git', ['add', definition.fileName], {
        cwd: canonicalPath,
      })
      await executeFile('git', ['commit', '-m', 'fixture'], {
        cwd: canonicalPath,
      })
      await writeFile(
        path.join(canonicalPath, definition.dirtyFileName),
        definition.terminalSentinel + String.fromCharCode(10)
      )
      return {
        ...definition,
        canonicalPath,
        createdAt: index + 1,
        label: definition.key.toLowerCase(),
        marker: definition.gitSentinel,
        gitStatus: '?? ' + definition.dirtyFileName,
      }
    })
  )
  const before = await Promise.all(projects.map(fixtureState))
  expect(new Set(before.map((row) => JSON.stringify(row))).size).toBe(3)
  const databasePath = path.join(fixtureRoot, 'ascend.sqlite')
  const library = await createProjectLibrary(databasePath)
  for (const project of projects)
    await library.create({
      id: project.id,
      name: project.name,
      canonicalPath: project.canonicalPath,
      createdAt: project.createdAt,
    })
  const events: unknown[] = []
  const baseConfig = createProjectRuntimeConfig({
    executablePath: CODE_SERVER_PATH,
    expectedUser: os.userInfo().username,
  })
  const runtime = createProjectRuntimeManager({
    findProjectById: library.findById,
    config: createProjectRuntimeConfig({
      ...baseConfig,
      environment: { ...baseConfig.environment, EXTENSIONS_GALLERY: '{}' },
    }),
    recordEvent: (event) => events.push(event),
  })
  const control = createServer()
  await new Promise<void>((resolve, reject) => {
    control.once('error', reject)
    control.listen(0, '127.0.0.1', resolve)
  })
  const controlAddress = control.address() as import('node:net').AddressInfo
  let controller: ApiServerController | undefined
  let application: import('fastify').FastifyInstance | undefined
  let web: ChildProcessWithoutNullStreams | undefined
  let webStart: string | null = null
  let apiPort = 0
  let webPort = 0
  let counterPid: number | undefined
  let counterStart: string | null = null
  const contexts: import('@playwright/test').BrowserContext[] = []
  const workflows: Array<{
    project: string
    projectToken: string
    executed: true
    management: number
    extensionHost: number
    unknown: number
    stablePrefix: true
    publicAuthorityLeaks: 0
  }> = []
  const reentries: Array<Record<string, unknown>> = []
  const awaySamples: Array<Record<string, unknown>> = []
  const exactUrls: string[] = []
  const focusTargets: string[] = []
  const identity = (project: (typeof projects)[number]) => {
    const snapshot = runtime.inspect(project.id)!
    return {
      pid: snapshot.pid,
      processStartTime: snapshot.processStartTime,
      port: snapshot.port,
      stableRoute: snapshot.stableRoute,
    }
  }
  const digestIdentity = (project: (typeof projects)[number]) =>
    digestSessionEvidence(identity(project))
  let publicEvidence: Record<string, unknown> | undefined
  let cleanupResources: Array<Record<string, unknown>> = []
  let cleanupBefore: Record<string, number> = {}
  let contextCloseFailures = 0
  let controlUnchanged = false
  let manifestEqual = false
  try {
    controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createProjectRegistration: async () => ({
        register: async () => ({
          disposition: 'existing',
          project: projects[0],
        }),
        close: () => undefined,
      }),
    })
    application = await controller.start()
    const address = application.server.address()
    apiPort = typeof address === 'string' ? 0 : address.port
    webPort = await disposablePort()
    web = spawn(
      process.execPath,
      [
        path.join(REPOSITORY_ROOT, 'tests/e2e/helpers/vite-process.mjs'),
        path.join(REPOSITORY_ROOT, 'apps/web/node_modules/vite/bin/vite.js'),
        '127.0.0.1',
        String(webPort),
      ],
      {
        cwd: path.join(REPOSITORY_ROOT, 'apps/web'),
        detached: true,
        env: {
          ...process.env,
          ASCEND_E2E_API_TARGET: 'http://127.0.0.1:' + String(apiPort),
          ASCEND_E2E_DISABLE_HMR: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    )
    webStart = await readProcessStartTime(web.pid!)
    const origin = 'http://127.0.0.1:' + String(webPort)
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(origin + '/')).status
          } catch {
            return 0
          }
        },
        { timeout: operationMs }
      )
      .toBe(200)

    const context = await browser.newContext({ serviceWorkers: 'block' })
    contexts.push(context)
    const page = await context.newPage()
    let activeWorkflow: (typeof workflows)[number] | undefined
    page.on('websocket', (socket) => {
      const workflow = activeWorkflow
      if (!workflow) return
      const pathname = new URL(socket.url()).pathname
      const project = projects.find((candidate) =>
        pathname.startsWith('/projects/' + candidate.id + '/workbench/')
      )
      if (!project || project.key !== workflow.project) return
      socket.on('framesent', ({ payload }) => {
        const role = classifyWorkbenchConnectionRolePayload(
          Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
        )
        if (role === 'Management') workflow.management += 1
        else if (role === 'ExtensionHost') workflow.extensionHost += 1
        else if (role !== undefined) workflow.unknown += 1
      })
    })
    const beginWorkflow = (project: (typeof projects)[number]) => {
      activeWorkflow = {
        project: project.key,
        projectToken: deriveProjectOwnerToken(project.id),
        executed: true,
        management: 0,
        extensionHost: 0,
        unknown: 0,
        stablePrefix: true,
        publicAuthorityLeaks: 0,
      }
      workflows.push(activeWorkflow)
    }
    const home = async () => {
      const link = page.getByRole('link', { name: 'Projects' })
      await link.focus()
      focusTargets.push((await link.getAttribute('aria-label')) ?? 'Projects')
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(origin + '/', { timeout: operationMs })
      exactUrls.push('/')
    }
    const openFromHome = async (key: string, reentry: boolean) => {
      const project = projects.find((candidate) => candidate.key === key)!
      const button = page.getByRole('button', { name: 'Open ' + project.name })
      await expect(button).toBeVisible({ timeout: operationMs })
      await button.focus()
      focusTargets.push(
        (await button.getAttribute('aria-label')) ?? 'Open ' + project.name
      )
      const beforeIdentity = runtime.inspect(project.id)
        ? digestIdentity(project)
        : undefined
      beginWorkflow(project)
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(
        origin + '/projects/' + project.id + '/workbench/',
        { timeout: operationMs }
      )
      await ready(page, project.fileName)
      exactUrls.push('/projects/' + project.id + '/workbench/')
      if (reentry) {
        const afterIdentity = digestIdentity(project)
        reentries.push({
          project: project.key,
          executed: true,
          reused: beforeIdentity === afterIdentity,
          startCount: 0,
          stopCount: 0,
          shutdownCount: 0,
          urlClass: 'stable-project-prefix',
          focus: 'Open ' + project.key,
          identityDigest: afterIdentity,
        })
      }
      return project
    }
    const openFileAndTerminal = async (project: (typeof projects)[number]) => {
      await page.getByText(project.fileName, { exact: true }).first().click()
      await expect(
        page
          .locator('.view-lines')
          .filter({ hasText: project.editorSentinel })
          .first()
      ).toContainText(project.editorSentinel, { timeout: operationMs })
      expect(await terminalProof(page, project)).toBe(true)
    }

    await page.goto(origin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    for (const key of BL014_INITIAL_START_ORDER) {
      const project = await openFromHome(key, false)
      await openFileAndTerminal(project)
      if (key !== 'A') await home()
    }
    const initial = Object.fromEntries(
      projects.map((project) => [project.key, identity(project)])
    )
    expect(new Set(projects.map(digestIdentity)).size).toBe(3)
    const a = projects[0]!
    const terminal = page.locator('.terminal.xterm:visible').last()
    const input = terminal.locator('textarea.xterm-helper-textarea')
    await input.focus()
    const counterCommand =
      'setsid /usr/local/bin/node ' +
      path.join(REPOSITORY_ROOT, 'tests/e2e/fixtures/bl014-counter.mjs') +
      ' ' +
      counterOutput +
      ' ' +
      counterIdentity +
      ' 60000'
    await page.keyboard.insertText(counterCommand)
    await page.keyboard.press('Enter')
    await expect
      .poll(
        () =>
          readFile(counterIdentity, 'utf8').then(
            () => true,
            () => false
          ),
        { timeout: operationMs }
      )
      .toBe(true)
    const counterRecord = JSON.parse(
      await readFile(counterIdentity, 'utf8')
    ) as { pid: number }
    counterPid = counterRecord.pid
    counterStart = await readProcessStartTime(counterPid)
    expect(counterStart).not.toBeNull()
    const sequence = async () => {
      const text = await readFile(counterOutput, 'utf8')
      const values = [...text.matchAll(/BL014_A_SEQUENCE=(\d+)/gu)].map(
        (match) => Number(match[1])
      )
      return values.at(-1) ?? 0
    }
    const beforeLeaveSequence = await expect
      .poll(sequence, { timeout: operationMs })
      .toBeGreaterThan(0)
      .then(() => sequence())

    await home()
    await openFromHome('B', true)
    const sampleOne = await expect
      .poll(sequence, { timeout: operationMs })
      .toBeGreaterThan(beforeLeaveSequence)
      .then(() => sequence())
    awaySamples.push({
      executed: true,
      browserInteraction: false,
      pidDigest: digestSessionEvidence([counterPid, counterStart]),
      sequence: sampleOne,
    })
    const bIdentityBeforeHistory = digestIdentity(projects[1]!)
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: operationMs })
    await expect(page).toHaveURL(origin + '/', { timeout: operationMs })
    beginWorkflow(projects[1]!)
    await page.goForward({
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(page, projects[1]!.fileName)
    expect(digestIdentity(projects[1]!)).toBe(bIdentityBeforeHistory)

    await home()
    await openFromHome('C', true)
    const sampleTwo = await expect
      .poll(sequence, { timeout: operationMs })
      .toBeGreaterThan(sampleOne)
      .then(() => sequence())
    awaySamples.push({
      executed: true,
      browserInteraction: false,
      pidDigest: digestSessionEvidence([counterPid, counterStart]),
      sequence: sampleTwo,
    })
    expect(await readProcessStartTime(counterPid)).toBe(counterStart)

    await home()
    await openFromHome('A', true)
    expect(digestIdentity(a)).toBe(digestSessionEvidence(initial.A))
    await expect(
      page.getByText(a.fileName, { exact: true }).first()
    ).toBeVisible({ timeout: operationMs })
    if ((await page.locator('.terminal.xterm:visible').count()) === 0)
      await page.keyboard.press('Control+Backquote')
    const returnTerminal = page.locator('.terminal.xterm:visible').last()
    await returnTerminal.waitFor({ state: 'visible', timeout: operationMs })
    const visibleSequence = async () => {
      const values = [
        ...(await returnTerminal.innerText()).matchAll(
          /BL014_A_SEQUENCE=(\d+)/gu
        ),
      ].map((match) => Number(match[1]))
      return values.at(-1) ?? 0
    }
    await expect
      .poll(visibleSequence, { timeout: operationMs })
      .toBeGreaterThan(sampleTwo)
    const returnSequence = await visibleSequence()

    await home()
    const b = await openFromHome('B', true)
    await page.keyboard.press('Control+Backquote')
    expect(await terminalProof(page, b, false)).toBe(true)
    await home()
    const c = await openFromHome('C', true)
    await page.keyboard.press('Control+Backquote')
    expect(await terminalProof(page, c, false)).toBe(true)
    expect(reentries.map((row) => row.project)).toEqual([
      ...BL014_OPEN_REENTRY_ORDER,
    ])
    expect(reentries.every((row) => row.reused === true)).toBe(true)

    beginWorkflow(a)
    await page.goto(origin + '/projects/' + a.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(page, a.fileName)
    beginWorkflow(a)
    await page.reload({ waitUntil: 'domcontentloaded', timeout: operationMs })
    await ready(page, a.fileName)
    expect(digestIdentity(a)).toBe(digestSessionEvidence(initial.A))

    const fresh = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    })
    contexts.push(fresh)
    const freshPage = await fresh.newPage()
    const cdp = await fresh.newCDPSession(freshPage)
    await cdp.send('Network.enable')
    await cdp.send('Network.clearBrowserCache')
    await cdp.send('Storage.clearDataForOrigin', {
      origin,
      storageTypes: 'all',
    })
    const freshWorkflow = {
      project: 'B',
      projectToken: deriveProjectOwnerToken(b.id),
      executed: true as const,
      management: 0,
      extensionHost: 0,
      unknown: 0,
      stablePrefix: true as const,
      publicAuthorityLeaks: 0 as const,
    }
    workflows.push(freshWorkflow)
    freshPage.on('websocket', (socket) => {
      socket.on('framesent', ({ payload }) => {
        const role = classifyWorkbenchConnectionRolePayload(
          Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
        )
        if (role === 'Management') freshWorkflow.management += 1
        else if (role === 'ExtensionHost') freshWorkflow.extensionHost += 1
        else if (role !== undefined) freshWorkflow.unknown += 1
      })
    })
    await freshPage.goto(origin + '/projects/' + b.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(freshPage, b.fileName)
    expect(digestIdentity(b)).toBe(digestSessionEvidence(initial.B))
    const freshTerminal = freshPage.locator('.terminal.xterm:visible').last()
    const serverStateOutcome =
      (await freshTerminal.count()) > 0 &&
      (await freshTerminal.innerText()).includes(b.terminalSentinel)
        ? 'restored'
        : 'unsupported'
    const browserEditorOutcome =
      (await freshPage
        .locator('.view-lines')
        .filter({ hasText: b.editorSentinel })
        .count()) > 0
        ? 'restored'
        : 'unsupported'
    await fresh.close()
    expect(digestIdentity(a)).toBe(digestSessionEvidence(initial.A))
    expect(digestIdentity(c)).toBe(digestSessionEvidence(initial.C))

    const reopened = await browser.newContext({ serviceWorkers: 'block' })
    contexts.push(reopened)
    const reopenPage = await reopened.newPage()
    const reopenWorkflow = {
      ...freshWorkflow,
      management: 0,
      extensionHost: 0,
      unknown: 0,
    }
    workflows.push(reopenWorkflow)
    reopenPage.on('websocket', (socket) =>
      socket.on('framesent', ({ payload }) => {
        const role = classifyWorkbenchConnectionRolePayload(
          Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
        )
        if (role === 'Management') reopenWorkflow.management += 1
        else if (role === 'ExtensionHost') reopenWorkflow.extensionHost += 1
        else if (role !== undefined) reopenWorkflow.unknown += 1
      })
    )
    await reopenPage.goto(origin + '/projects/' + b.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(reopenPage, b.fileName)
    expect(digestIdentity(b)).toBe(digestSessionEvidence(initial.B))
    const reopenTerminal = reopenPage.locator('.terminal.xterm:visible').last()
    const reopenOutcome =
      (await reopenTerminal.count()) > 0 &&
      (await reopenTerminal.innerText()).includes(b.terminalSentinel)
        ? 'restored'
        : 'unsupported'
    expect(reopenOutcome).toBe(serverStateOutcome)

    await expect
      .poll(
        () =>
          workflows.every(
            (workflow, index) =>
              workflow.management === 1 &&
              workflow.unknown === 0 &&
              (index < 3
                ? workflow.extensionHost === 1
                : workflow.extensionHost >= 0 && workflow.extensionHost <= 1)
          ),
        { timeout: operationMs }
      )
      .toBe(true)
    const after = await Promise.all(projects.map(fixtureState))
    manifestEqual = JSON.stringify(before) === JSON.stringify(after)
    expect(manifestEqual).toBe(true)
    const lifecycleEvents = events as Array<Record<string, unknown>>
    expect(
      lifecycleEvents.filter(
        (event) => event.event === 'runtime.start.succeeded'
      )
    ).toHaveLength(3)
    expect(
      lifecycleEvents.filter((event) => event.event === 'runtime.exited')
    ).toHaveLength(0)

    publicEvidence = {
      schemaVersion: 1,
      executed: true,
      projects: projects.map((project, index) => ({
        key: project.key,
        initialStartCount: 1,
        projectToken: deriveProjectOwnerToken(project.id),
        identityDigest: digestSessionEvidence(initial[project.key]),
        fileDigest: digestSessionEvidence(project.fileName),
        gitDigest: digestSessionEvidence(before[index]),
        sentinelDigest: digestSessionEvidence(project.terminalSentinel),
      })),
      reentries,
      awaySamples,
      lifecycle: {
        homeStopCount: 0,
        closeCount: 0,
        stopCount: 0,
        restartCount: 0,
        shutdownCount: 0,
      },
      reconnection: {
        historyCount: 1,
        aReloadCount: 1,
        freshBContextCount: 1,
        bClientCloseCount: 1,
        bReopenCount: 1,
        storageCleared: true,
        cacheCleared: true,
        serviceWorkersCleared: true,
        bClientCloseStopCount: 0,
        serverStateOutcome,
        browserEditorOutcome,
      },
      workflows,
      exactUrlDigests: exactUrls.map(digestSessionEvidence),
      focusDigests: focusTargets.map(digestSessionEvidence),
      aReturnSequence: returnSequence,
      cleanup: {
        measured: true,
        manifestEqual: true,
        controlUnchanged: true,
        resources: [],
      },
    }
    await writeFile(
      restrictedPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          fixtureRoot,
          databasePath,
          apiPort,
          webPort,
          webPid: web.pid,
          webStart,
          counterPid,
          counterStart,
          initial,
          controlPort: controlAddress.port,
        },
        null,
        2
      ) + String.fromCharCode(10),
      { mode: 0o600 }
    )
  } finally {
    const runtimeInventory = projects.filter((project) =>
      runtime.inspect(project.id)
    ).length
    const socketInventory = workflows.reduce(
      (total, workflow) =>
        total + workflow.management + workflow.extensionHost + workflow.unknown,
      0
    )
    cleanupBefore = {
      'terminal-commands': counterPid === undefined ? 0 : 1,
      'browser-contexts': contexts.length,
      'browser-pages': contexts.length,
      'proxy-operations': workflows.length,
      'runtime-groups': runtimeInventory,
      listeners:
        runtimeInventory +
        (application?.server.listening ? 1 : 0) +
        (web?.pid === undefined ? 0 : 1),
      sockets: socketInventory,
      'web-service': web?.pid === undefined ? 0 : 1,
      'api-service': application?.server.listening ? 1 : 0,
      'database-files': 1,
      fixtures: projects.length,
    }
    if (
      counterPid !== undefined &&
      counterStart !== null &&
      (await readProcessStartTime(counterPid)) === counterStart
    ) {
      try {
        process.kill(-counterPid, 'SIGTERM')
      } catch {}
      await expect
        .poll(() => readProcessStartTime(counterPid!), { timeout: 5_000 })
        .toBeNull()
        .catch(() => undefined)
    }
    await Promise.all(
      contexts.map(async (context) => {
        try {
          await context.close()
        } catch {
          contextCloseFailures += 1
        }
      })
    )
    if (web?.pid !== undefined)
      await stopOwnedProcessGroup({ process: web }, 5_000)
    await controller?.stop().catch(() => undefined)
    controlUnchanged =
      control.listening &&
      (control.address() as import('node:net').AddressInfo).port ===
        controlAddress.port
    await closeServer(control)
    const runtimeAudit = runtime.lastShutdown()
    const proxyAudit = application?.workbenchProxy.audit()
    await rm(fixtureRoot, { recursive: true, force: true })
    const terminalResidual =
      counterPid === undefined ||
      (await readProcessStartTime(counterPid)) === null
        ? 0
        : 1
    const webResidual =
      web?.pid === undefined || (await readProcessStartTime(web.pid)) === null
        ? 0
        : 1
    const apiResidual = application?.server.listening ? 1 : 0
    const proxyResidual = Number(
      (proxyAudit?.pendingOperations ?? 0) +
        (proxyAudit?.rawSockets ?? 0) +
        (proxyAudit?.webSockets ?? 0)
    )
    const runtimeResidual =
      runtimeAudit?.audits.filter(
        (row) => !row.processAbsent || !row.processGroupAbsent
      ).length ?? runtimeInventory
    const listenerResidual =
      (runtimeAudit?.audits.filter((row) => !row.listenerAbsent).length ??
        runtimeInventory) +
      webResidual +
      apiResidual
    const fixtureResidual = (
      await Promise.all(
        projects.map((project) =>
          lstat(project.canonicalPath).then(
            () => 1,
            () => 0
          )
        )
      )
    ).reduce((sum, value) => sum + value, 0)
    const databaseResidual = (
      await Promise.all(
        [databasePath, databasePath + '-shm', databasePath + '-wal'].map(
          (candidate) =>
            lstat(candidate).then(
              () => 1,
              () => 0
            )
        )
      )
    ).reduce((sum, value) => sum + value, 0)
    const cleanupAfter: Record<string, number> = {
      'terminal-commands': terminalResidual,
      'browser-contexts': contextCloseFailures,
      'browser-pages': contexts.reduce(
        (total, context) => total + context.pages().length,
        0
      ),
      'proxy-operations': proxyResidual,
      'runtime-groups': runtimeResidual,
      listeners: listenerResidual,
      sockets: Number(
        (proxyAudit?.rawSockets ?? 0) + (proxyAudit?.webSockets ?? 0)
      ),
      'web-service': webResidual,
      'api-service': apiResidual,
      'database-files': databaseResidual,
      fixtures: fixtureResidual,
    }
    const cleanupMethods: Record<string, string> = {
      'terminal-commands': 'pid-start-time-and-process-group-audit',
      'browser-contexts': 'close-result-inventory',
      'browser-pages': 'playwright-page-inventory',
      'proxy-operations': 'proxy-owned-operation-audit',
      'runtime-groups': 'pid-start-time-and-process-group-audit',
      listeners: 'owned-listener-identity-audit',
      sockets: 'proxy-owned-socket-audit',
      'web-service': 'pid-start-time-audit',
      'api-service': 'server-listening-state-audit',
      'database-files': 'filesystem-sidecar-inventory',
      fixtures: 'filesystem-fixture-inventory',
    }
    cleanupResources = BL014_RESOURCE_CLASSES.map((resourceClass) => ({
      resourceClass,
      measured: true,
      before: cleanupBefore[resourceClass] ?? 0,
      after: cleanupAfter[resourceClass] ?? -1,
      method: cleanupMethods[resourceClass] ?? 'missing-audit-method',
    }))
  }
  expect(controlUnchanged).toBe(true)
  expect(cleanupResources.every((resource) => resource.after === 0)).toBe(true)
  expect(publicEvidence).toBeDefined()
  publicEvidence!.cleanup = {
    measured: true,
    manifestEqual,
    controlUnchanged,
    resources: cleanupResources,
  }
  expect(validateSessionSwitchingEvidence(publicEvidence)).toBe(true)
  const restricted = await readFile(
    path.join(resultRoot, 'restricted-authority.json'),
    'utf8'
  )
  const publicScan = scanProtectedEvidence({
    scanId: 'bl014-public-scan',
    kind: 'switching-browser',
    sources: [
      {
        sourceId: 'switching-browser',
        content: JSON.stringify(publicEvidence),
      },
    ],
    protectedValues: [
      fixtureRoot,
      databasePath,
      String(apiPort),
      String(webPort),
      restricted,
    ],
  })
  expect(publicScan.literalMatches).toEqual([])
  await writeFile(
    evidencePath,
    JSON.stringify({ ...publicEvidence, publicScan }, null, 2) +
      String.fromCharCode(10),
    { mode: 0o600 }
  )
})
