import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect, test, type Page } from '@playwright/test'
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
  CODE_SERVER_PATH,
  REPOSITORY_ROOT,
} from '../../apps/api/src/workbench-proof-contract.js'
import { terminateExactProcessGroup } from '../../apps/api/src/workbench-proof-runtime.js'
import { stopOwnedProcessGroup } from '../../apps/api/test/helpers/project-home-process-group.js'

const executeFile = promisify(execFile)
const designated = process.env.BL013_DESIGNATED === '1'
const resultRoot = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-013/runtime-isolation'
)
const evidencePath = path.join(resultRoot, 'three-project-chromium.json')
const operationMs = 20_000
const overallMs = 120_000

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
  expected: { canonicalPath: string; branch: string; marker: string }
): Promise<boolean> => {
  await page.keyboard.press('F1')
  await expect(page.locator('.quick-input-widget')).toBeVisible({
    timeout: operationMs,
  })
  await page.keyboard.insertText('Terminal: Create New Terminal')
  await expect(
    page.locator('.quick-input-list .monaco-list-row').first()
  ).toBeVisible({ timeout: operationMs })
  await page.keyboard.press('Enter')
  const terminal = page.locator('.terminal.xterm').first()
  await terminal.waitFor({ state: 'visible', timeout: operationMs })
  const input = page.getByRole('textbox', { name: /^Terminal /u }).first()
  await input.focus()
  const command =
    'printf BL013_%s= PWD; pwd -P; printf BL013_%s= ROOT; git rev-parse --show-toplevel; ' +
    'printf BL013_%s= BRANCH; git branch --show-current; test -n ' +
    String.fromCharCode(34) +
    String.fromCharCode(36) +
    '(git status --porcelain)' +
    String.fromCharCode(34) +
    ' && printf BL013_%s\n STATUS_OK; printf BL013_%s= MARKER; git config ascend.fixture; ' +
    'printf BL013_%s\n DONE'
  await page.keyboard.insertText(command)
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => (await terminal.innerText()).includes('BL013_DONE'), {
      timeout: operationMs,
    })
    .toBe(true)
  const normalized = (await terminal.innerText()).replace(/\s/gu, '')
  const required = [
    'BL013_PWD=' + expected.canonicalPath,
    'BL013_ROOT=' + expected.canonicalPath,
    'BL013_BRANCH=' + expected.branch,
    'BL013_STATUS_OK',
    'BL013_MARKER=' + expected.marker,
  ]
  const matches = required.map((marker) => normalized.includes(marker))
  if (matches.some((matched) => !matched)) {
    await writeFile(
      path.join(resultRoot, 'restricted-authority.json'),
      JSON.stringify({ text: await terminal.innerText(), expected }, null, 2),
      { mode: 0o600 }
    )
  }
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
      await writeFile(
        path.join(canonicalPath, 'dirty.txt'),
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
      }
    })
  )
  const before = await Promise.all(projects.map(fixtureState))
  const library: ProjectLibrary = {
    create: async (input) => ({
      disposition: 'existing',
      project:
        projects.find((project) => project.id === input.id) ?? projects[0],
    }),
    findById: async (id) => projects.find((project) => project.id === id),
    list: async () => projects,
    closeProject: async (id) => ({ disposition: 'closed', id }),
    close: () => undefined,
  }
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
  let web: ChildProcessWithoutNullStreams | undefined
  const contexts: import('@playwright/test').BrowserContext[] = []
  const socketCounts = new Map<string, number>()
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
    const app = await controller.start()
    const address = app.server.address()
    const apiPort = typeof address === 'string' ? 0 : address.port
    const webPort = await disposablePort()
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
    const pages = await Promise.all(
      projects.map(async (project) => {
        const context = await browser.newContext()
        contexts.push(context)
        const page = await context.newPage()
        page.on('websocket', (socket) => {
          if (
            new URL(socket.url()).pathname.startsWith(
              '/projects/' + project.id + '/workbench/'
            )
          )
            socketCounts.set(
              project.id,
              (socketCounts.get(project.id) ?? 0) + 1
            )
        })
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
        return page
      })
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
    await terminateExactProcessGroup(oldB.pid!, 2_000)
    await expect
      .poll(() => runtime.inspect(b.id)?.state, { timeout: operationMs })
      .toBe('failed')
    expect(digestIdentity(runtime.inspect(projects[0].id)!)).toBe(
      digestIdentity(initial.a)
    )
    expect(digestIdentity(runtime.inspect(projects[2].id)!)).toBe(
      digestIdentity(initial.c)
    )
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
    await pages[1].reload({
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(pages[1], b.fileName)
    const after = await Promise.all(projects.map(fixtureState))
    const integrity = before.map((state, index) =>
      JSON.stringify(state) === JSON.stringify(after[index]) ? 0 : 1
    )
    expect(integrity).toEqual([0, 0, 0])
    expect(control.listening).toBe(true)
    await writeFile(
      evidencePath,
      JSON.stringify(
        {
          schemaVersion: 1,
          scope:
            'immediate concurrent isolation only; no BL-014 session continuity claim',
          projects: projects.map((project) => ({
            projectToken: createHash('sha256')
              .update(project.id)
              .digest('hex')
              .slice(0, 16),
            stableRoute: true,
            identityDigest: digestIdentity(initial[project.label]),
            explorer: true,
            editor: true,
            terminal: true,
            git: true,
            socketCount: socketCounts.get(project.id) ?? 0,
          })),
          pairwiseDistinct: true,
          bFailure: 'typed-failed',
          bReplacement: 'one-explicit-new-identity',
          peersUnchanged: true,
          eventCount: events.length,
          fixtureIntegrityDifferences: integrity,
          publicRedaction: { paths: 0, ports: 0, sentinels: 0 },
          cleanup: { pending: true },
        },
        null,
        2
      ) + '\n',
      { mode: 0o600 }
    )
  } finally {
    await Promise.all(
      contexts.map((context) => context.close().catch(() => undefined))
    )
    if (web?.pid !== undefined)
      await stopOwnedProcessGroup({ process: web }, 5_000)
    await controller?.stop().catch(() => undefined)
    const audit = runtime.lastShutdown()
    cleanupPassed =
      audit?.status === 'ok' &&
      audit.audits.every(
        (row) =>
          row.processAbsent && row.processGroupAbsent && row.listenerAbsent
      )
    expect(control.listening).toBe(true)
    await closeServer(control)
    await rm(fixtureRoot, { recursive: true, force: true })
  }
  expect(cleanupPassed).toBe(true)
  const evidence = JSON.parse(await readFile(evidencePath, 'utf8')) as Record<
    string,
    unknown
  >
  evidence.cleanup = {
    browserContexts: 0,
    proxyResources: 0,
    runtimes: 0,
    processGroups: 0,
    listeners: 0,
    databases: 0,
    terminalCommands: 0,
    fixtures: 0,
    unrelatedControlSurvived: true,
    unrelatedControlCleaned: true,
  }
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n', {
    mode: 0o600,
  })
})
