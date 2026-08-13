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
import { stopOwnedProcessGroup } from '../../apps/api/test/helpers/project-home-process-group.js'

const executeFile = promisify(execFile)
const designated = process.env.BL013_DESIGNATED === '1'
const resultRoot = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-013/runtime-isolation'
)
const evidencePath = path.join(resultRoot, 'three-project-chromium.json')
const operationMs = 30_000
const overallMs = 120_000
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
test('keeps three Git workbenches isolated and explicitly replaces only B', async ({
  browser,
}) => {
  test.skip(!designated, 'Set BL013_DESIGNATED=1 for the three-project proof')
  test.setTimeout(overallMs)
  await mkdir(resultRoot, { recursive: true })
  await rm(evidencePath, { force: true })
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'ascend-bl013-'))
  const projects = await Promise.all(
    ['a', 'b', 'c'].map(async (label, index) => {
      const canonicalPath = path.join(fixtureRoot, label)
      const branch = 'branch-' + label
      const marker = 'fixture-' + label
      const fileName = label.toUpperCase() + '-SENTINEL.txt'
      await mkdir(canonicalPath)
      await writeFile(
        path.join(canonicalPath, fileName),
        'EDITOR_' + label.toUpperCase() + '_SENTINEL\n'
      )
      await executeFile('git', ['init', '-b', branch], { cwd: canonicalPath })
      await executeFile(
        'git',
        ['config', 'user.email', 'bl013@example.invalid'],
        { cwd: canonicalPath }
      )
      await executeFile('git', ['config', 'user.name', 'BL013 Fixture'], {
        cwd: canonicalPath,
      })
      await executeFile('git', ['config', 'ascend.fixture', marker], {
        cwd: canonicalPath,
      })
      await executeFile('git', ['add', fileName], { cwd: canonicalPath })
      await executeFile('git', ['commit', '-m', 'fixture'], {
        cwd: canonicalPath,
      })
      const dirtyFileName = label + '-dirty.txt'
      const gitStatus = '?? ' + dirtyFileName
      await writeFile(
        path.join(canonicalPath, dirtyFileName),
        'dirty-' + label + '\n'
      )
      return {
        id: 'bl013-' + label,
        name: 'Fixture ' + label.toUpperCase(),
        canonicalPath,
        createdAt: index + 1,
        label,
        branch,
        marker,
        fileName,
        editorSentinel: 'EDITOR_' + label.toUpperCase() + '_SENTINEL',
        gitStatus,
      }
    })
  )
  const before = await Promise.all(projects.map(fixtureState))
  expect(before.map(({ status }) => status.trimEnd())).toEqual(
    projects.map(({ gitStatus }) => gitStatus)
  )
  expect(new Set(before.map(({ status }) => status)).size).toBe(3)
  const databasePath = path.join(fixtureRoot, 'ascend.sqlite')
  const library = await createProjectLibrary(databasePath)
  for (const project of projects) await library.create(project)
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
  let controller: ApiServerController | undefined
  let application: import('fastify').FastifyInstance | undefined
  let web: ChildProcessWithoutNullStreams | undefined
  let webProcessStartTime: string | null = null
  let apiPort = 0
  let webPort = 0
  const contexts: import('@playwright/test').BrowserContext[] = []
  const socketCounts = new Map<string, number>()
  const socketRoles = new Map(
    projects.map((project) => [
      project.id,
      { Management: 0, ExtensionHost: 0, unknown: 0 },
    ])
  )
  const terminalExecutions: string[] = []
  const cleanupMeasurements: Record<string, unknown> = {}
  let cleanupPassed = false
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
    const app = application
    const address = app.server.address()
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
    webProcessStartTime = await readProcessStartTime(web.pid!)
    await expect
      .poll(
        async () => {
          try {
            return (await fetch('http://127.0.0.1:' + String(webPort) + '/'))
              .status
          } catch {
            return 0
          }
        },
        { timeout: operationMs }
      )
      .toBe(200)
    const trackProjectSockets = (
      page: Page,
      project: (typeof projects)[number]
    ): void => {
      page.on('websocket', (socket) => {
        if (
          !new URL(socket.url()).pathname.startsWith(
            '/projects/' + project.id + '/workbench/'
          )
        )
          return
        socketCounts.set(project.id, (socketCounts.get(project.id) ?? 0) + 1)
        let roleObserved = false
        socket.on('framesent', ({ payload }) => {
          if (roleObserved) return
          const role = classifyWorkbenchConnectionRolePayload(
            Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
          )
          if (role === undefined) return
          roleObserved = true
          const counts = socketRoles.get(project.id)!
          if (role === 'Management' || role === 'ExtensionHost')
            counts[role] += 1
          else counts.unknown += 1
        })
      })
    }
    const pages = await Promise.all(
      projects.map(async (project) => {
        const context = await browser.newContext()
        contexts.push(context)
        const page = await context.newPage()
        trackProjectSockets(page, project)
        await page.goto(
          'http://127.0.0.1:' +
            String(webPort) +
            '/projects/' +
            project.id +
            '/workbench/',
          { waitUntil: 'domcontentloaded', timeout: operationMs }
        )
        await ready(page, project.fileName)
        await page.getByText(project.fileName, { exact: true }).first().click()
        await expect(
          page
            .locator('.view-lines')
            .filter({ hasText: project.editorSentinel })
            .first()
        ).toContainText(project.editorSentinel, { timeout: operationMs })
        expect(await terminalProof(page, project)).toBe(true)
        terminalExecutions.push('initial-' + project.label)
        return page
      })
    )
    await expect
      .poll(
        () => projects.map((project) => ({ ...socketRoles.get(project.id)! })),
        { timeout: operationMs }
      )
      .toEqual(
        projects.map(() => ({ Management: 1, ExtensionHost: 1, unknown: 0 }))
      )
    const initialSocketRoles = Object.fromEntries(
      projects.map((project) => [
        project.label,
        { ...socketRoles.get(project.id)! },
      ])
    )
    const initial = Object.fromEntries(
      projects.map((project) => {
        const snapshot = runtime.inspect(project.id)!
        return [
          project.label,
          {
            pid: snapshot.pid,
            processStartTime: snapshot.processStartTime,
            port: snapshot.port,
          },
        ]
      })
    ) as Record<
      string,
      {
        pid: number | null
        processStartTime: string | null
        port: number | null
      }
    >
    expect(new Set(Object.values(initial).map(digestIdentity)).size).toBe(3)
    for (const project of projects) {
      const reused = await runtime.start({
        projectId: project.id,
        canonicalPath: project.canonicalPath,
      })
      expect(digestIdentity(reused)).toBe(
        digestIdentity(initial[project.label])
      )
    }
    const b = projects[1]
    const oldB = runtime.inspect(b.id)!
    expect(await readProcessStartTime(oldB.pid!)).toBe(oldB.processStartTime)
    const bTermination = (async () => {
      await terminateExactProcessGroup(oldB.pid!, 2_000)
      await terminateExactProcessIdentity(
        { pid: oldB.pid!, startTimeTicks: oldB.processStartTime! },
        2_000
      )
    })()
    await pages[1].close()
    await contexts[1].close()
    await bTermination
    await expect
      .poll(() => runtime.inspect(b.id)?.state, { timeout: operationMs })
      .toBe('failed')
    expect(digestIdentity(runtime.inspect(projects[0].id)!)).toBe(
      digestIdentity(initial.a)
    )
    expect(digestIdentity(runtime.inspect(projects[2].id)!)).toBe(
      digestIdentity(initial.c)
    )
    const peerTerminalAfterCrash: boolean[] = []
    for (const index of [0, 2]) {
      const passed = await terminalProof(pages[index], projects[index], false)
      terminalExecutions.push('after-b-crash-' + projects[index].label)
      peerTerminalAfterCrash.push(passed)
    }
    expect(peerTerminalAfterCrash).toEqual([true, true])
    const replacement = await runtime.start({
      projectId: b.id,
      canonicalPath: b.canonicalPath,
    })
    expect(digestIdentity(replacement)).not.toBe(digestIdentity(initial.b))
    expect(digestIdentity(runtime.inspect(projects[0].id)!)).toBe(
      digestIdentity(initial.a)
    )
    expect(digestIdentity(runtime.inspect(projects[2].id)!)).toBe(
      digestIdentity(initial.c)
    )
    contexts[1] = await browser.newContext()
    pages[1] = await contexts[1].newPage()
    trackProjectSockets(pages[1], b)
    await pages[1].goto(
      'http://127.0.0.1:' +
        String(webPort) +
        '/projects/' +
        b.id +
        '/workbench/',
      { waitUntil: 'domcontentloaded', timeout: operationMs }
    )
    await ready(pages[1], b.fileName)
    expect(await terminalProof(pages[1], b)).toBe(true)
    terminalExecutions.push('replacement-b')
    await expect
      .poll(() => ({ ...socketRoles.get(b.id)! }), { timeout: operationMs })
      .toEqual({ Management: 2, ExtensionHost: 2, unknown: 0 })
    expect({ ...socketRoles.get(projects[0].id)! }).toEqual({
      Management: 1,
      ExtensionHost: 1,
      unknown: 0,
    })
    expect({ ...socketRoles.get(projects[2].id)! }).toEqual({
      Management: 1,
      ExtensionHost: 1,
      unknown: 0,
    })
    const finalSocketRoles = Object.fromEntries(
      projects.map((project) => [
        project.label,
        { ...socketRoles.get(project.id)! },
      ])
    )
    const after = await Promise.all(projects.map(fixtureState))
    const integrity = before.map((state, index) =>
      JSON.stringify(state) === JSON.stringify(after[index]) ? 0 : 1
    )
    expect(integrity).toEqual([0, 0, 0])
    expect(control.listening).toBe(true)
    const replacementSnapshot = runtime.inspect(b.id)!
    const lifecycleEvents = events.map((event, index) => ({
      ...(event as Record<string, unknown>),
      executionId: 'chromium-lifecycle',
      eventId: 'chromium-event-' + String(index + 1),
    }))
    const restrictedEvidence = {
      schemaVersion: 2,
      suite: 'BL-013',
      fixtureRoot,
      databasePaths: [
        databasePath,
        databasePath + '-wal',
        databasePath + '-shm',
      ],
      api: { listenerPort: apiPort, processId: process.pid },
      web: {
        listenerPort: webPort,
        processId: web.pid,
        processStartTime: webProcessStartTime,
      },
      runtimes: projects.map((project) => {
        const current = runtime.inspect(project.id)!
        return {
          projectToken: current.ownerToken,
          initial: initial[project.label],
          current: {
            pid: current.pid,
            processStartTime: current.processStartTime,
            port: current.port,
          },
          stableRoute: current.stableRoute,
        }
      }),
      control: {
        listenerPort: (control.address() as import('node:net').AddressInfo)
          .port,
        survivedOwnedCleanup: control.listening,
      },
      browser: {
        ownership: 'playwright-runner',
        ownedContexts: contexts.length,
      },
      proxyInventoryBeforeCleanup: app.workbenchProxy.audit(),
      terminalExecutionIds: [...terminalExecutions],
      socketRoles: { initial: initialSocketRoles, final: finalSocketRoles },
      lifecycleEventDigest: digestIdentity({
        pid: events.length,
        processStartTime: digestIdentity(replacementSnapshot),
        port: null,
      }),
    }
    await writeFile(
      path.join(resultRoot, 'restricted-authority.json'),
      JSON.stringify(restrictedEvidence, null, 2) + '\n',
      { mode: 0o600 }
    )
    const publicBase = {
      schemaVersion: 2,
      scope:
        'immediate concurrent isolation only; no BL-014 session continuity claim',
      executionId: 'chromium-three-project-isolation',
      projects: projects.map((project) => ({
        projectToken: deriveProjectOwnerToken(project.id),
        stableRouteDigest: digestIdentity({
          pid: project.id.length,
          processStartTime: runtime.inspect(project.id)!.stableRoute,
          port: null,
        }),
        initialIdentityDigest: digestIdentity(initial[project.label]),
        currentIdentityDigest: digestIdentity(runtime.inspect(project.id)!),
        explorer: true,
        editor: true,
        terminal: true,
        git: true,
        gitStatusExact:
          before[projects.indexOf(project)].status.trimEnd() ===
          project.gitStatus,
        gitStatusDigest: createHash('sha256')
          .update(before[projects.indexOf(project)].status)
          .digest('hex'),
        socketCount: socketCounts.get(project.id) ?? 0,
        initialSocketRoles: initialSocketRoles[project.label],
        finalSocketRoles: finalSocketRoles[project.label],
      })),
      pairwiseDistinct: true,
      distinctGitStatuses:
        new Set(before.map(({ status }) => status)).size === 3,
      bFailure: {
        outcome: 'typed-failed',
        oldIdentityDigest: digestIdentity(initial.b),
        eventObserved: lifecycleEvents.some(
          (event) =>
            event.event === 'runtime.exited' &&
            event.projectToken === deriveProjectOwnerToken(b.id)
        ),
      },
      bReplacement: {
        outcome: 'one-explicit-new-identity',
        identityDigest: digestIdentity(replacement),
        routeDigest: digestIdentity({
          pid: b.id.length,
          processStartTime: replacement.stableRoute,
          port: null,
        }),
        projectToken: replacement.ownerToken,
      },
      peerTerminalAfterCrash,
      peersUnchanged: true,
      lifecycleEvents,
      terminalExecutionCount: terminalExecutions.length,
      fixtureIntegrityDifferences: integrity,
      cleanup: { pending: true },
    }
    const protectedValues = [
      fixtureRoot,
      ...projects.flatMap((project) => [
        project.id,
        project.canonicalPath,
        project.branch,
        project.marker,
        project.editorSentinel,
      ]),
      ...Object.values(initial).map((identity) => String(identity.port)),
      String(replacement.port),
    ]
    const publicRedaction = scanProtectedEvidence({
      scanId: 'chromium-public-protected-scan',
      kind: 'chromium-public-artifact',
      sources: [
        {
          sourceId: 'three-project-chromium',
          content: JSON.stringify(publicBase),
        },
      ],
      protectedValues,
    })
    expect(publicRedaction.literalMatches).toEqual([])
    expect(publicRedaction.encodedMatches).toEqual([])
    await writeFile(
      evidencePath,
      JSON.stringify({ ...publicBase, publicRedaction }, null, 2) + '\n',
      { mode: 0o600 }
    )
  } finally {
    await Promise.all(
      contexts.map((context) => context.close().catch(() => undefined))
    )
    const browserContextResiduals = contexts.flatMap((context) =>
      context.pages()
    ).length
    if (web?.pid !== undefined)
      await stopOwnedProcessGroup({ process: web }, 5_000)
    const webProcessResidual =
      web?.pid === undefined || webProcessStartTime === null
        ? 0
        : (await readProcessStartTime(web.pid)) === webProcessStartTime
          ? 1
          : 0
    await controller?.stop().catch(() => undefined)
    const proxyAudit = application?.workbenchProxy.audit()
    const audit = runtime.lastShutdown()
    const runtimeResiduals =
      audit?.audits.filter(
        (row) =>
          !row.processAbsent || !row.processGroupAbsent || !row.listenerAbsent
      ).length ?? 1
    const controlSurvived = control.listening
    expect(controlSurvived).toBe(true)
    await closeServer(control)
    const controlCleaned = !control.listening
    await rm(fixtureRoot, { recursive: true, force: true })
    const fixtureResidual = await lstat(fixtureRoot).then(
      () => 1,
      () => 0
    )
    const databaseResiduals = (
      await Promise.all(
        [databasePath, databasePath + '-wal', databasePath + '-shm'].map(
          (file) =>
            lstat(file).then(
              () => true,
              () => false
            )
        )
      )
    ).filter(Boolean).length
    const listenerResiduals = (
      await Promise.all([
        loopbackListenerIsAbsent(apiPort),
        loopbackListenerIsAbsent(webPort),
        ...(audit?.audits ?? []).map((row) =>
          Promise.resolve(row.listenerAbsent)
        ),
      ])
    ).filter((absent) => !absent).length
    const proxyOperationResiduals =
      proxyAudit === undefined
        ? 1
        : proxyAudit.pendingOperations +
          proxyAudit.upstreamHttpRequests +
          proxyAudit.upstreamHttpResponses
    const proxySocketResiduals =
      proxyAudit === undefined
        ? 1
        : proxyAudit.rawSockets + proxyAudit.webSockets
    const terminalResiduals =
      terminalExecutions.length === 6
        ? 0
        : Math.abs(6 - terminalExecutions.length)
    Object.assign(cleanupMeasurements, {
      measurementId: 'chromium-cleanup-measurement',
      measured: true,
      checks: [
        {
          resourceClass: 'browser-groups',
          before: contexts.length,
          after: browserContextResiduals,
          method: 'playwright-context-page-inventory',
          executed: true,
        },
        {
          resourceClass: 'proxy-operations',
          before: [...socketCounts.values()].reduce(
            (sum, count) => sum + count,
            0
          ),
          after: proxyOperationResiduals,
          method: 'proxy-manager-audit',
          executed: true,
        },
        {
          resourceClass: 'runtime-processes',
          before: audit?.audits.length ?? 0,
          after: runtimeResiduals,
          method: 'exact-pid-start-identity-audit',
          executed: true,
        },
        {
          resourceClass: 'process-groups',
          before: (audit?.audits.length ?? 0) + (web === undefined ? 0 : 1),
          after: runtimeResiduals + webProcessResidual,
          method: 'exact-process-group-and-start-identity-audit',
          executed: true,
        },
        {
          resourceClass: 'listeners',
          before: (audit?.audits.length ?? 0) + 2,
          after: listenerResiduals,
          method: 'exact-loopback-listener-connect-audit',
          executed: true,
        },
        {
          resourceClass: 'sockets',
          before: [...socketCounts.values()].reduce(
            (sum, count) => sum + count,
            0
          ),
          after: proxySocketResiduals,
          method: 'proxy-and-browser-socket-inventory',
          executed: true,
        },
        {
          resourceClass: 'databases',
          before: 1,
          after: databaseResiduals,
          method: 'sqlite-database-and-sidecar-lstat',
          executed: true,
        },
        {
          resourceClass: 'fixtures',
          before: projects.length,
          after: fixtureResidual,
          method: 'fixture-root-lstat-after-manifest-check',
          executed: true,
        },
        {
          resourceClass: 'terminal-commands',
          before: terminalExecutions.length,
          after: terminalResiduals,
          method: 'terminal-execution-id-settlement-inventory',
          executed: true,
        },
        {
          resourceClass: 'background-work',
          before: events.length + terminalExecutions.length,
          after: proxyOperationResiduals + runtimeResiduals,
          method: 'proxy-and-runtime-owner-settlement-audit',
          executed: true,
        },
      ],
      unrelatedControlSurvived: controlSurvived,
      unrelatedControlCleaned: controlCleaned,
    })
    cleanupPassed =
      audit?.status === 'ok' &&
      (cleanupMeasurements.checks as Array<{ after: number }>).every(
        ({ after }) => after === 0
      ) &&
      controlSurvived &&
      controlCleaned
  }
  expect(cleanupPassed).toBe(true)
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8')) as Record<
    string,
    unknown
  >
  evidence.cleanup = cleanupMeasurements
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n', {
    mode: 0o600,
  })
  const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
  const restricted = JSON.parse(
    await readFile(restrictedPath, 'utf8')
  ) as Record<string, unknown>
  restricted.cleanup = cleanupMeasurements
  await writeFile(restrictedPath, JSON.stringify(restricted, null, 2) + '\n', {
    mode: 0o600,
  })
})
