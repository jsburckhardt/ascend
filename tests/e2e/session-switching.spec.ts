import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import { randomUUID } from 'node:crypto'
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
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
  type WebSocket as PlaywrightWebSocket,
} from '@playwright/test'
import {
  createApiServerController,
  type ApiServerController,
} from '../../apps/api/src/api-server.js'
import { resolveFrontDoorToken } from '../../apps/api/src/front-door-contract.js'
import { createProjectLibrary } from '../../apps/api/src/project-library.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  type RuntimeSafeLifecycleEvent,
} from '../../apps/api/src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../../apps/api/src/project-runtime-manager.js'
import { readProcessStartTime } from '../../apps/api/src/project-runtime-process.js'
import {
  CODE_SERVER_PATH,
  REPOSITORY_ROOT,
} from '../../apps/api/src/workbench-proof-contract.js'
import {
  classifyWorkbenchConnectionRolePayload,
  type WorkbenchSafeEvent,
} from '../../apps/api/src/workbench-proxy-contract.js'
import { createWorkbenchProxyManager } from '../../apps/api/src/workbench-proxy-manager.js'
import { scanProtectedEvidence } from '../../apps/api/src/project-runtime-isolation-evidence.js'
import {
  BL014_COUNTER_CONTRACT,
  BL014_FIXTURES,
  BL014_INITIAL_START_ORDER,
  BL014_OPEN_REENTRY_ORDER,
  BL014_RESOURCE_CLASSES,
  BL014_TRANSITION_ORDER,
  BL014_WORKFLOW_EXPECTATIONS,
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
const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
const operationMs = 30_000
const overallMs = 240_000
const nowNs = (): number => Number(process.hrtime.bigint())
const id = (): string => randomUUID()

interface ProjectFixture {
  key: 'A' | 'B' | 'C'
  id: string
  name: string
  branch: string
  fileName: string
  editorSentinel: string
  dirtyFileName: string
  gitSentinel: string
  terminalSentinel: string
  canonicalPath: string
  createdAt: number
  gitStatus: string
}
interface WorkflowRecord {
  id: string
  project: string
  projectToken: string
  reconnection: boolean
  executionId: string
  transitionExecutionId: string
  transitionId: string
  management: number
  extensionHost: number
  unknown: number
}

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
const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()))
const pathCount = async (paths: string[]): Promise<number> =>
  (
    await Promise.all(
      paths.map((candidate) =>
        lstat(candidate).then(
          () => 1,
          () => 0
        )
      )
    )
  ).reduce((sum, value) => sum + value, 0)
const fixtureState = async (project: ProjectFixture) => {
  const [head, branch, status, sentinel] = await Promise.all([
    executeFile('git', ['rev-parse', 'HEAD'], { cwd: project.canonicalPath }),
    executeFile('git', ['branch', '--show-current'], {
      cwd: project.canonicalPath,
    }),
    executeFile('git', ['status', '--porcelain'], {
      cwd: project.canonicalPath,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    }),
    executeFile('git', ['config', 'ascend.fixture'], {
      cwd: project.canonicalPath,
    }),
  ])
  return {
    head: head.stdout.trim(),
    branch: branch.stdout.trim(),
    status: status.stdout.trimEnd(),
    sentinel: sentinel.stdout.trim(),
    files: [project.fileName, project.dirtyFileName].sort(),
  }
}
const ready = async (page: Page, fileName: string): Promise<void> => {
  await page
    .locator('.monaco-workbench')
    .waitFor({ state: 'visible', timeout: operationMs })
  await expect(page.getByText(fileName, { exact: true }).first()).toBeVisible({
    timeout: operationMs,
  })
}
const visibleTerminal = async (page: Page) => {
  const visible = page.locator('.terminal.xterm:visible')
  if ((await visible.count()) === 0)
    await page.keyboard.press('Control+Backquote')
  const terminal = page.locator('.terminal.xterm:visible').last()
  await terminal.waitFor({ state: 'visible', timeout: operationMs })
  return terminal
}
let terminalOrdinal = 0
const terminalGatePaths: string[] = []
const createReadyTerminal = async (page: Page, project: ProjectFixture) => {
  const terminals = page.locator('.terminal.xterm')
  const visible = page.locator('.terminal.xterm:visible')
  const previous = await terminals.count()
  await page.keyboard.press('F1')
  await expect(page.locator('.quick-input-widget')).toBeVisible({
    timeout: operationMs,
  })
  await page.keyboard.insertText('Terminal: Create New Terminal')
  const command = page.locator('.quick-input-list .monaco-list-row').first()
  await expect(command).toBeVisible({ timeout: operationMs })
  await command.click()
  await expect
    .poll(() => terminals.count(), { timeout: operationMs })
    .toBeGreaterThan(previous)
  const terminal = visible.last()
  await expect
    .poll(
      async () => {
        const text = (await terminal.innerText()).replace(/\s/gu, '')
        return (
          text.includes(project.canonicalPath) && text.includes(project.branch)
        )
      },
      { timeout: operationMs }
    )
    .toBe(true)
  const input = terminal.locator('textarea.xterm-helper-textarea')
  await input.focus()
  await expect(input).toBeFocused({ timeout: operationMs })
  const readinessOrdinal = String(++terminalOrdinal)
  const readiness = 'BL014_TERMINAL_READY_' + readinessOrdinal
  const readinessGate = path.join(
    resultRoot,
    'terminal-readiness-' + readinessOrdinal + '.fifo'
  )
  await rm(readinessGate, { force: true })
  await executeFile('mkfifo', [readinessGate])
  terminalGatePaths.push(readinessGate)
  return { terminal, input, readiness, readinessOrdinal, readinessGate }
}
const terminalCommand = (project: ProjectFixture, marker: string): string =>
  '/usr/local/bin/node ' +
  path.join(REPOSITORY_ROOT, 'tests/e2e/fixtures/bl014-terminal-proof.mjs') +
  ' ' +
  project.dirtyFileName +
  ' ' +
  marker
const requiredTerminalValues = (project: ProjectFixture, marker: string) => ({
  cwd: project.canonicalPath,
  gitRoot: project.canonicalPath,
  branch: project.branch,
  status: Buffer.from(project.gitStatus + '\n').toString('base64'),
  gitSentinel: project.gitSentinel,
  terminalSentinel: project.terminalSentinel,
  marker,
})
const assertTerminalValues = (
  text: string,
  project: ProjectFixture,
  marker: string
) => {
  const normalized = text.replace(/\s/gu, '')
  const values = requiredTerminalValues(project, marker)
  expect(normalized).toContain('BL014_PWD=' + values.cwd)
  expect(normalized).toContain('BL014_ROOT=' + values.gitRoot)
  expect(normalized).toContain('BL014_BRANCH=' + values.branch)
  expect(normalized).toContain(
    'BL014_STATUS=' + values.status + 'BL014_STATUS_END='
  )
  expect(normalized).toContain('BL014_GIT_SENTINEL=' + values.gitSentinel)
  expect(normalized).toContain(
    'BL014_TERMINAL_SENTINEL=' + values.terminalSentinel
  )
  expect(normalized).toContain('BL014_DONE=' + marker)
  return values
}
const retainedTerminalText = async (
  page: Page,
  project: ProjectFixture,
  marker: string
) => {
  const terminal = await visibleTerminal(page)
  let text = ''
  await expect
    .poll(
      async () => {
        text = await terminal.innerText()
        const normalized = text.replace(/\s/gu, '')
        return (
          normalized.includes('BL014_DONE=' + marker) &&
          normalized.includes('BL014_PWD=' + project.canonicalPath)
        )
      },
      { timeout: operationMs }
    )
    .toBe(true)
  return { terminal, text }
}
const runTerminalProof = async (page: Page, project: ProjectFixture) => {
  const { terminal, input, readiness, readinessOrdinal, readinessGate } =
    await createReadyTerminal(page, project)
  const marker = 'proof-' + String(terminalOrdinal)
  await input.focus()
  await expect(input).toBeFocused({ timeout: operationMs })
  await page.keyboard.insertText(
    'printf BL014_TERMINAL_READY_%s ' +
      readinessOrdinal +
      ' ; cat < ' +
      readinessGate +
      '; clear; ' +
      terminalCommand(project, marker)
  )
  await page.keyboard.press('Enter')
  let text = ''
  await expect
    .poll(
      async () => {
        text = await terminal.innerText()
        return text.includes(readiness)
      },
      { timeout: operationMs }
    )
    .toBe(true)
  await writeFile(readinessGate, 'continue\n')
  await rm(readinessGate, { force: true })
  try {
    await expect
      .poll(
        async () => {
          text = await terminal.innerText()
          return text.includes('BL014_DONE=' + marker)
        },
        { timeout: operationMs }
      )
      .toBe(true)
  } catch (error) {
    await writeFile(
      restrictedPath,
      JSON.stringify({ terminalReadFailure: { marker, text } }, null, 2) + '\n',
      { mode: 0o600 }
    )
    throw error
  }
  return { marker, text, values: assertTerminalValues(text, project, marker) }
}
const activeFileIsVisible = async (
  page: Page,
  project: ProjectFixture
): Promise<void> => {
  await expect(
    page.getByText(project.fileName, { exact: true }).first()
  ).toBeVisible({ timeout: operationMs })
  await expect(
    page
      .locator('.tabs-container .tab.active')
      .filter({ hasText: project.fileName })
      .first()
  ).toBeVisible({ timeout: operationMs })
  await expect(
    page
      .locator('.view-lines')
      .filter({ hasText: project.editorSentinel })
      .first()
  ).toContainText(project.editorSentinel, { timeout: operationMs })
}
const processCommand = async (pid: number): Promise<string> =>
  (await readFile('/proc/' + String(pid) + '/cmdline'))
    .toString('utf8')
    .split(String.fromCharCode(0))
    .filter(Boolean)
    .join(' ')

test.describe.configure({ mode: 'serial', retries: 0 })
test('preserves A/B/C sessions with execution-joined measured evidence', async ({
  browser,
}) => {
  test.skip(
    !designated,
    'Set BL014_DESIGNATED=1 for the session-switching proof'
  )
  test.setTimeout(overallMs)
  await mkdir(resultRoot, { recursive: true })
  await Promise.all([
    rm(evidencePath, { force: true }),
    rm(restrictedPath, { force: true }),
  ])
  const executionId = id()
  const executionStartedNs = nowNs()
  const events: Array<Record<string, unknown>> = []
  const observations: Array<Record<string, unknown>> = []
  const focusObservations: Array<Record<string, unknown>> = []
  const lifecycleObservations: Array<Record<string, unknown>> = []
  const identityObservations: Array<Record<string, unknown>> = []
  const restrictedIdentityObservations: Array<Record<string, unknown>> = []
  const transitions: Array<Record<string, unknown>> = []
  const stateObservations: Array<Record<string, unknown>> = []
  const networkObservations: Array<Record<string, unknown>> = []
  const restrictedObservations: Array<Record<string, unknown>> = []
  const workflows: WorkflowRecord[] = []
  const pageWorkflow = new WeakMap<Page, WorkflowRecord>()
  const recordEvent = (event: Record<string, unknown>) => {
    const row = {
      ...event,
      eventId: id(),
      executionId,
      measured: true,
      ordinal: events.length + 1,
      observedNs: nowNs(),
    }
    events.push(row)
    return row
  }
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'ascend-bl014-'))
  const counterOutput = path.join(resultRoot, 'a-counter.log')
  const counterIdentity = path.join(resultRoot, 'a-counter-identity.json')
  await Promise.all([
    rm(counterOutput, { force: true }),
    rm(counterIdentity, { force: true }),
  ])
  const projects = await Promise.all(
    BL014_FIXTURES.map(async (definition, index): Promise<ProjectFixture> => {
      const canonicalPath = path.join(fixtureRoot, definition.key.toLowerCase())
      await mkdir(canonicalPath)
      await writeFile(
        path.join(canonicalPath, definition.fileName),
        definition.editorSentinel + '\n'
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
        definition.terminalSentinel + '\n'
      )
      return {
        ...definition,
        canonicalPath,
        createdAt: index + 1,
        gitStatus: '?? ' + definition.dirtyFileName,
      }
    })
  )
  const projectByKey = new Map(
    projects.map((project) => [project.key, project])
  )
  const beforeManifest = await Promise.all(projects.map(fixtureState))
  const beforeManifestDigest = digestSessionEvidence(beforeManifest)
  const databasePath = path.join(fixtureRoot, 'ascend.sqlite')
  const library = await createProjectLibrary(databasePath)
  for (const project of projects) await library.create(project)
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
    recordEvent: (event: RuntimeSafeLifecycleEvent) =>
      recordEvent(event as unknown as Record<string, unknown>),
  })
  const instrumentedRuntime: ProjectRuntimeManager = {
    ...runtime,
    start: async (input) => {
      const prior = runtime.inspect(input.projectId)
      const snapshot = await runtime.start(input)
      if (prior === snapshot)
        recordEvent({
          event: 'runtime.start.reused',
          projectToken: snapshot.ownerToken,
        })
      return snapshot
    },
    shutdown: async () => {
      recordEvent({ event: 'runtime.shutdown.invoked' })
      return runtime.shutdown()
    },
  }
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
  let counterCommandDigest = ''
  const contexts: BrowserContext[] = []
  const terminalProofs = new Map<
    string,
    {
      marker: string
      text: string
      values: ReturnType<typeof requiredTerminalValues>
    }
  >()
  const initialIdentity = new Map<string, Record<string, unknown>>()
  const awaySamples: Array<Record<string, unknown>> = []
  let publicEvidence: Record<string, unknown> | undefined
  let restrictedEvidence: Record<string, unknown> | undefined
  let cleanup: Record<string, unknown> | undefined
  let controlUnchanged = false
  let storageEvidence: Record<string, unknown> | undefined
  let serverStateOutcome = 'unsupported'
  let browserEditorOutcome = 'unsupported'
  const identity = (project: ProjectFixture) => {
    const snapshot = runtime.inspect(project.id)
    if (!snapshot)
      throw new Error('Missing runtime identity for ' + project.key)
    return {
      pid: snapshot.pid,
      processStartTime: snapshot.processStartTime,
      port: snapshot.port,
      stableRoute: snapshot.stableRoute,
    }
  }
  const identityDigest = (project: ProjectFixture) =>
    digestSessionEvidence(identity(project))
  const focus = async (page: Page): Promise<string> =>
    page.evaluate(() => {
      const active = document.activeElement
      if (!active) return 'none'
      const role =
        active.tagName === 'H1' ? 'heading' : active.tagName.toLowerCase()
      const name =
        active.getAttribute('aria-label') ?? active.textContent?.trim() ?? ''
      return role + ':' + name
    })
  const observeSurface = async (
    page: Page,
    link: {
      transitionId: string
      transitionExecutionId: string
      projectToken: string
      phase: 'before' | 'after'
    },
    closed = false
  ) => {
    const row = closed
      ? {
          observationId: id(),
          executionId,
          ...link,
          measured: true,
          observedNs: nowNs(),
          url: 'closed',
          surface: 'Closed',
          focus: 'none',
        }
      : {
          observationId: id(),
          executionId,
          ...link,
          measured: true,
          observedNs: nowNs(),
          url: new URL(page.url()).pathname,
          surface: (await page.locator('.monaco-workbench').isVisible())
            ? 'Workbench'
            : 'Home',
          focus: await focus(page),
        }
    observations.push(row)
    return row
  }
  const eventDeltas = (beforeOrdinal: number, afterOrdinal: number) => {
    const count = (name: string) =>
      events.filter(
        (event) =>
          Number(event.ordinal) > beforeOrdinal &&
          Number(event.ordinal) <= afterOrdinal &&
          event.event === name
      ).length
    return {
      request: count('browser.navigation.request'),
      start: count('runtime.start.requested'),
      reuse: count('runtime.start.reused'),
      stop: count('runtime.stop.invoked'),
      shutdown: count('runtime.shutdown.invoked'),
    }
  }
  const beginTransition = async (transitionId: string, page: Page) => {
    const transitionExecutionId = id()
    const project = projectByKey.get(transitionId.slice(-1) as 'A' | 'B' | 'C')!
    const projectToken = deriveProjectOwnerToken(project.id)
    return {
      transitionId,
      transitionExecutionId,
      projectToken,
      before: await observeSurface(page, {
        transitionId,
        transitionExecutionId,
        projectToken,
        phase: 'before',
      }),
      beforeOrdinal: events.length,
    }
  }
  const finishTransition = async (
    started: Awaited<ReturnType<typeof beginTransition>>,
    page: Page,
    options: {
      input: string
      workflowId?: string
      home?: boolean
      closed?: boolean
    }
  ) => {
    const after = await observeSurface(
      page,
      {
        transitionId: started.transitionId,
        transitionExecutionId: started.transitionExecutionId,
        projectToken: started.projectToken,
        phase: 'after',
      },
      options.closed
    )
    let home: Record<string, unknown> | undefined
    if (options.home) {
      const cards = []
      for (const project of projects)
        cards.push({
          project: project.key,
          projectToken: deriveProjectOwnerToken(project.id),
          count: await page.getByText(project.name, { exact: true }).count(),
          openCount: await page
            .getByRole('button', { name: 'Open ' + project.name })
            .count(),
          closeCount: await page
            .getByRole('button', { name: 'Close ' + project.name })
            .count(),
        })
      const stopControlsPresent = await page
        .getByRole('button', { name: /^Stop .+ workbench$/u })
        .count()
      const restartControlsPresent = await page
        .getByRole('button', { name: /^Restart .+ workbench$/u })
        .count()
      const runtimeControlsPresent =
        stopControlsPresent + restartControlsPresent
      home = {
        cards,
        stopControlsPresent,
        restartControlsPresent,
        runtimeControlsPresent,
        focus: after.focus,
      }
      expect(
        cards.every(
          (card) =>
            card.count === 1 && card.openCount === 1 && card.closeCount === 1
        )
      ).toBe(true)
      const runningProjects = runtime
        .reportPublicStates(projects.map((project) => project.id))
        .filter((report) => report.state === 'Running').length
      expect(stopControlsPresent).toBe(3)
      expect(restartControlsPresent).toBe(runningProjects)
      expect(runtimeControlsPresent).toBe(3 + runningProjects)
      expect(after.focus).toBe('heading:Ascend')
    }
    const eventRange = {
      beforeOrdinal: started.beforeOrdinal,
      afterOrdinal: events.length,
    }
    const deltas = eventDeltas(started.beforeOrdinal, events.length)
    const focusObservation = {
      observationId: id(),
      executionId,
      transitionId: started.transitionId,
      transitionExecutionId: started.transitionExecutionId,
      projectToken: started.projectToken,
      measured: true,
      observedNs: nowNs(),
      focus: after.focus,
    }
    const lifecycleObservation = {
      observationId: id(),
      executionId,
      transitionId: started.transitionId,
      transitionExecutionId: started.transitionExecutionId,
      projectToken: started.projectToken,
      measured: true,
      observedNs: nowNs(),
      eventRange,
      eventDeltas: deltas,
    }
    focusObservations.push(focusObservation)
    lifecycleObservations.push(lifecycleObservation)
    const row = {
      transitionId: started.transitionId,
      executionId,
      transitionExecutionId: started.transitionExecutionId,
      projectToken: started.projectToken,
      measured: true,
      input: options.input,
      ...(options.workflowId ? { workflowId: options.workflowId } : {}),
      beforeObservationId: started.before.observationId,
      afterObservationId: after.observationId,
      focusObservationId: focusObservation.observationId,
      lifecycleObservationId: lifecycleObservation.observationId,
      eventRange,
      eventDeltas: deltas,
      ...(home ? { home } : {}),
    }
    transitions.push(row)
    return row
  }
  const beginWorkflow = (
    page: Page,
    workflowId: string,
    project: ProjectFixture,
    transitionExecutionId: string,
    transitionId: string
  ) => {
    const expected = BL014_WORKFLOW_EXPECTATIONS.find(
      (row) => row.id === workflowId
    )
    if (!expected) throw new Error('Unknown workflow ' + workflowId)
    const workflow: WorkflowRecord = {
      id: workflowId,
      project: project.key,
      projectToken: deriveProjectOwnerToken(project.id),
      reconnection: expected.reconnection,
      executionId,
      transitionExecutionId,
      transitionId,
      management: 0,
      extensionHost: 0,
      unknown: 0,
    }
    workflows.push(workflow)
    pageWorkflow.set(page, workflow)
    return workflow
  }
  const attachTraffic = (context: BrowserContext) =>
    context.on('request', (request: Request) => {
      const url = new URL(request.url())
      const project = projects.find((candidate) =>
        url.pathname.startsWith('/projects/' + candidate.id + '/workbench/')
      )
      let page: Page | undefined
      try {
        page = request.frame().page()
      } catch {
        return
      }
      const workflow = pageWorkflow.get(page)
      if (
        request.isNavigationRequest() &&
        request.resourceType() === 'document'
      )
        recordEvent({
          event: 'browser.navigation.request',
          ...(project
            ? { projectToken: deriveProjectOwnerToken(project.id) }
            : {}),
        })
      if (!project || !workflow || workflow.project !== project.key) return
      const internalLeak = projects.some((candidate) => {
        const snapshot = runtime.inspect(candidate.id)
        return (
          snapshot?.port !== null &&
          snapshot?.port !== undefined &&
          request.url().includes(':' + String(snapshot.port))
        )
      })
      networkObservations.push({
        observationId: id(),
        executionId,
        measured: true,
        workflowId: workflow.id,
        transitionId: workflow.transitionId,
        transitionExecutionId: workflow.transitionExecutionId,
        projectToken: workflow.projectToken,
        stableUrl: url.pathname,
        role: 'http',
        reconnection: workflow.reconnection,
        stablePrefix: url.pathname.startsWith(
          '/projects/' + project.id + '/workbench/'
        ),
        leakCount: internalLeak ? 1 : 0,
        leakClasses: internalLeak ? ['internal-authority'] : [],
      })
      restrictedObservations.push({
        kind: 'http',
        workflowId: workflow.id,
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      })
    })
  const attachSockets = (page: Page) =>
    page.on('websocket', (socket: PlaywrightWebSocket) => {
      const workflow = pageWorkflow.get(page)
      if (!workflow) return
      const url = new URL(socket.url())
      const project = projects.find((candidate) =>
        url.pathname.startsWith('/projects/' + candidate.id + '/workbench/')
      )
      if (!project || project.key !== workflow.project) return
      let observed = false
      socket.on('framesent', ({ payload }) => {
        if (observed) return
        const role = classifyWorkbenchConnectionRolePayload(
          Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
        )
        if (role === undefined) return
        observed = true
        if (role === 'Management') workflow.management += 1
        else if (role === 'ExtensionHost') workflow.extensionHost += 1
        else {
          workflow.unknown += 1
          return
        }
        const internalLeak = projects.some((candidate) => {
          const snapshot = runtime.inspect(candidate.id)
          return (
            snapshot?.port !== null &&
            snapshot?.port !== undefined &&
            socket.url().includes(':' + String(snapshot.port))
          )
        })
        networkObservations.push({
          observationId: id(),
          executionId,
          measured: true,
          workflowId: workflow.id,
          transitionId: workflow.transitionId,
          transitionExecutionId: workflow.transitionExecutionId,
          projectToken: workflow.projectToken,
          stableUrl: url.pathname,
          role,
          reconnection: workflow.reconnection,
          stablePrefix: url.pathname.startsWith(
            '/projects/' + project.id + '/workbench/'
          ),
          leakCount: internalLeak ? 1 : 0,
          leakClasses: internalLeak ? ['internal-authority'] : [],
        })
        restrictedObservations.push({
          kind: 'websocket',
          workflowId: workflow.id,
          url: socket.url(),
          role,
          reconnection: workflow.reconnection,
        })
      })
    })
  const stateObservation = async (
    label: string,
    page: Page,
    project: ProjectFixture,
    terminalText: string,
    values: ReturnType<typeof requiredTerminalValues>,
    unsupported = false
  ) => {
    await ready(page, project.fileName)
    if (!unsupported) await activeFileIsVisible(page, project)
    const body = await page.locator('.monaco-workbench').innerText()
    const negativeAssertions: Array<Record<string, unknown>> = []
    for (const other of projects.filter(
      (candidate) => candidate.key !== project.key
    ))
      for (const [resourceClass, expected] of [
        ['file', other.fileName],
        ['editor-sentinel', other.editorSentinel],
        ['terminal-sentinel', other.terminalSentinel],
        ['cwd', other.canonicalPath],
        ['branch', other.branch],
        ['git-sentinel', other.gitSentinel],
      ] as const) {
        const matchCount = body.split(expected).length - 1
        expect(matchCount).toBe(0)
        negativeAssertions.push({
          observationId: id(),
          executionId,
          measured: true,
          project: other.key,
          projectToken: deriveProjectOwnerToken(other.id),
          resourceClass,
          valueDigest: digestSessionEvidence(expected),
          matchCount,
          absent: matchCount === 0,
        })
      }
    const row = {
      label,
      observationId: id(),
      executionId,
      measured: true,
      observedNs: nowNs(),
      project: project.key,
      projectToken: deriveProjectOwnerToken(project.id),
      identityDigest: identityDigest(project),
      explorerDigest: digestSessionEvidence({
        file: project.fileName,
        visible: true,
      }),
      editorFileDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : project.fileName
      ),
      editorSentinelDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : project.editorSentinel
      ),
      terminalDigest: digestSessionEvidence(terminalText),
      cwdDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.cwd
      ),
      gitRootDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.gitRoot
      ),
      branchDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.branch
      ),
      statusDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.status
      ),
      gitSentinelDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.gitSentinel
      ),
      terminalSentinelDigest: digestSessionEvidence(
        unsupported ? 'unsupported' : values.terminalSentinel
      ),
      visible: true,
      negativeAssertions,
    }
    stateObservations.push(row)
    restrictedObservations.push({
      kind: 'state',
      label,
      project: project.key,
      identity: identity(project),
      file: project.fileName,
      editorSentinel: project.editorSentinel,
      terminalText,
      values,
      negativeAssertions,
    })
    return row
  }

  try {
    controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => instrumentedRuntime,
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          frontDoorToken: resolveFrontDoorToken(),
          recordEvent: (event: WorkbenchSafeEvent) =>
            recordEvent(event as unknown as Record<string, unknown>),
        }),
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
    attachTraffic(context)
    const page = await context.newPage()
    attachSockets(page)
    await page.goto(origin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused({
      timeout: operationMs,
    })
    const openFromHome = async (
      transitionId: string,
      workflowId: string,
      key: 'A' | 'B' | 'C'
    ) => {
      const project = projectByKey.get(key)!
      const button = page.getByRole('button', { name: 'Open ' + project.name })
      await button.focus()
      await expect(button).toBeFocused()
      const started = await beginTransition(transitionId, page)
      const workflow = beginWorkflow(
        page,
        workflowId,
        project,
        started.transitionExecutionId,
        started.transitionId
      )
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(
        origin + '/projects/' + project.id + '/workbench/',
        { timeout: operationMs }
      )
      await ready(page, project.fileName)
      const expected = BL014_WORKFLOW_EXPECTATIONS.find(
        (row) => row.id === workflowId
      )!
      await expect
        .poll(
          () => ({
            management: workflow.management,
            extensionHost: workflow.extensionHost,
            unknown: workflow.unknown,
          }),
          { timeout: operationMs }
        )
        .toEqual({
          management: expected.management,
          extensionHost: expected.extensionHost,
          unknown: 0,
        })
      await finishTransition(started, page, {
        input: 'keyboard:Enter',
        workflowId,
      })
      return project
    }
    const homeFromWorkbench = async (transitionId: string) => {
      const link = page.getByRole('link', { name: 'Projects' })
      await link.focus()
      await expect(link).toBeFocused()
      const started = await beginTransition(transitionId, page)
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(origin + '/', { timeout: operationMs })
      await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused({
        timeout: operationMs,
      })
      await finishTransition(started, page, {
        input: 'keyboard:Enter',
        home: true,
      })
    }
    for (const key of BL014_INITIAL_START_ORDER) {
      const project = await openFromHome(
        'initial-open-' + key,
        'initial-' + key,
        key
      )
      await page.getByText(project.fileName, { exact: true }).first().click()
      await activeFileIsVisible(page, project)
      const proof = await runTerminalProof(page, project)
      terminalProofs.set(project.key, proof)
      const exactIdentity = identity(project)
      initialIdentity.set(project.key, exactIdentity)
      const initialState = await stateObservation(
        'initial-' + project.key,
        page,
        project,
        proof.text,
        proof.values
      )
      const projectToken = deriveProjectOwnerToken(project.id)
      const makeIdentityPart = (kind: string, value: unknown) => ({
        observationId: id(),
        executionId,
        measured: true,
        observedNs: nowNs(),
        projectToken,
        kind,
        digest: digestSessionEvidence(value),
      })
      const identityObservation = {
        observationId: id(),
        executionId,
        initialExecutionId: initialState.observationId,
        measured: true,
        observedNs: nowNs(),
        project: project.key,
        projectToken,
        stableRoute: exactIdentity.stableRoute,
        runtimeIdentityDigest: digestSessionEvidence(exactIdentity),
        fixtureObservation: makeIdentityPart(
          'fixture',
          beforeManifest[projects.indexOf(project)]
        ),
        explorerObservation: makeIdentityPart('explorer', {
          file: project.fileName,
          visible: true,
        }),
        editorObservation: makeIdentityPart('editor', project.fileName),
        terminalObservation: makeIdentityPart('terminal', proof.text),
        gitObservation: makeIdentityPart(
          'git',
          beforeManifest[projects.indexOf(project)]
        ),
      }
      identityObservations.push(identityObservation)
      restrictedIdentityObservations.push({
        observationId: identityObservation.observationId,
        executionId,
        measured: true,
        observedNs: nowNs(),
        project: project.key,
        projectToken,
        runtime: { ...exactIdentity, canonicalPath: project.canonicalPath },
        fixtureObservationId:
          identityObservation.fixtureObservation.observationId,
        explorerObservationId:
          identityObservation.explorerObservation.observationId,
        editorObservationId:
          identityObservation.editorObservation.observationId,
        terminalObservationId:
          identityObservation.terminalObservation.observationId,
        gitObservationId: identityObservation.gitObservation.observationId,
      })
      if (key !== 'A') await homeFromWorkbench('initial-home-' + key)
    }
    expect(new Set(projects.map(identityDigest)).size).toBe(3)
    const a = projectByKey.get('A')!
    const counterTerminal = await createReadyTerminal(page, a)
    const counterMarker = 'counter-' + String(terminalOrdinal)
    const counterCommand =
      'printf BL014_TERMINAL_READY_%s ' +
      counterTerminal.readinessOrdinal +
      ' ; cat < ' +
      counterTerminal.readinessGate +
      '; clear; ' +
      terminalCommand(a, counterMarker) +
      '; setsid /usr/local/bin/node ' +
      path.join(REPOSITORY_ROOT, BL014_COUNTER_CONTRACT.executable) +
      ' ' +
      counterOutput +
      ' ' +
      counterIdentity +
      ' ' +
      String(BL014_COUNTER_CONTRACT.maximumMs)
    counterCommandDigest = digestSessionEvidence(counterCommand)
    await page.keyboard.insertText(counterCommand)
    await page.keyboard.press('Enter')
    await expect
      .poll(
        async () =>
          (await counterTerminal.terminal.innerText()).includes(
            counterTerminal.readiness
          ),
        { timeout: operationMs }
      )
      .toBe(true)
    await writeFile(counterTerminal.readinessGate, 'continue\n')
    await rm(counterTerminal.readinessGate, { force: true })
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
    counterPid = (
      JSON.parse(await readFile(counterIdentity, 'utf8')) as { pid: number }
    ).pid
    counterStart = await readProcessStartTime(counterPid)
    expect(counterStart).not.toBeNull()
    const sequenceFile = async () => {
      const text = await readFile(counterOutput, 'utf8')
      return (
        [...text.matchAll(/BL014_A_SEQUENCE=(\d+)/gu)]
          .map((match) => Number(match[1]))
          .at(-1) ?? 0
      )
    }
    const visibleSequence = async (terminal = counterTerminal.terminal) =>
      [...(await terminal.innerText()).matchAll(/BL014_A_SEQUENCE=(\d+)/gu)]
        .map((match) => Number(match[1]))
        .at(-1) ?? 0
    try {
      await expect
        .poll(() => visibleSequence(), { timeout: operationMs })
        .toBeGreaterThan(0)
    } catch (error) {
      await writeFile(
        restrictedPath,
        JSON.stringify(
          { counterVisibleFailure: await counterTerminal.terminal.innerText() },
          null,
          2
        ) + String.fromCharCode(10),
        { mode: 0o600 }
      )
      throw error
    }
    const visibleBeforeLeave = await visibleSequence()
    const counterText = await counterTerminal.terminal.innerText()
    const counterValues = assertTerminalValues(counterText, a, counterMarker)
    await stateObservation(
      'before-leave-A',
      page,
      a,
      counterText,
      counterValues
    )
    const sampleAway = async (minimum: number) => {
      await expect
        .poll(sequenceFile, { timeout: operationMs })
        .toBeGreaterThan(minimum)
      const outputSequence = await sequenceFile()
      const start = await readProcessStartTime(counterPid!)
      const command = await processCommand(counterPid!)
      expect(start).toBe(counterStart)
      expect(command).toContain('bl014-counter.mjs')
      const row = {
        observationId: id(),
        executionId,
        measured: true,
        observedNs: nowNs(),
        browserInteraction: false,
        pidLive: start === counterStart,
        processIdentityDigest: digestSessionEvidence([counterPid, start]),
        commandDigest: digestSessionEvidence(command),
        sequence: outputSequence,
        outputSequence,
      }
      awaySamples.push(row)
      restrictedObservations.push({
        kind: 'away-sample',
        ...row,
        pid: counterPid,
        start,
        command,
      })
      return outputSequence
    }
    await homeFromWorkbench('switch-home-A')
    await openFromHome('switch-open-B', 'open-B', 'B')
    const sampleOne = await sampleAway(visibleBeforeLeave)
    const historyBack = await beginTransition('history-back-B', page)
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: operationMs })
    await expect(page).toHaveURL(origin + '/')
    await expect(page.getByRole('heading', { name: 'Ascend' })).toBeFocused({
      timeout: operationMs,
    })
    await finishTransition(historyBack, page, {
      input: 'history:Back',
      home: true,
    })
    const b = projectByKey.get('B')!
    const historyForward = await beginTransition('history-forward-B', page)
    const historyWorkflow = beginWorkflow(
      page,
      'history-forward-B',
      b,
      historyForward.transitionExecutionId,
      historyForward.transitionId
    )
    await page.goForward({
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(page, b.fileName)
    await expect
      .poll(
        () => ({
          management: historyWorkflow.management,
          extensionHost: historyWorkflow.extensionHost,
          unknown: historyWorkflow.unknown,
        }),
        { timeout: operationMs }
      )
      .toEqual({ management: 1, extensionHost: 1, unknown: 0 })
    await finishTransition(historyForward, page, {
      input: 'history:Forward',
      workflowId: 'history-forward-B',
    })
    await homeFromWorkbench('switch-home-B')
    await openFromHome('switch-open-C', 'open-C', 'C')
    const sampleTwo = await sampleAway(sampleOne)
    await homeFromWorkbench('switch-home-C')
    await openFromHome('switch-open-A', 'open-A', 'A')
    expect(identityDigest(a)).toBe(
      digestSessionEvidence(initialIdentity.get('A'))
    )
    await activeFileIsVisible(page, a)
    const returnedTerminal = await visibleTerminal(page)
    await expect
      .poll(() => visibleSequence(returnedTerminal), { timeout: operationMs })
      .toBeGreaterThan(sampleTwo)
    const visibleReturn = await visibleSequence(returnedTerminal)
    const returnText = await returnedTerminal.innerText()
    assertTerminalValues(returnText, a, counterMarker)
    await stateObservation('return-A', page, a, returnText, counterValues)
    await homeFromWorkbench('revisit-home-A')
    await openFromHome('revisit-open-B', 'revisit-B', 'B')
    const bProof = terminalProofs.get('B')!
    const { text: bRetained } = await retainedTerminalText(
      page,
      b,
      bProof.marker
    )
    assertTerminalValues(bRetained, b, bProof.marker)
    await activeFileIsVisible(page, b)
    await stateObservation('revisit-B', page, b, bRetained, bProof.values)
    await homeFromWorkbench('revisit-home-B')
    const c = await openFromHome('revisit-open-C', 'revisit-C', 'C')
    const cProof = terminalProofs.get('C')!
    const { text: cRetained } = await retainedTerminalText(
      page,
      c,
      cProof.marker
    )
    assertTerminalValues(cRetained, c, cProof.marker)
    await activeFileIsVisible(page, c)
    await stateObservation('revisit-C', page, c, cRetained, cProof.values)
    expect(
      transitions
        .filter(
          (row) =>
            String(row.transitionId).includes('open-') &&
            !String(row.transitionId).startsWith('initial-')
        )
        .map((row) => String(row.transitionId).split('-').at(-1))
    ).toEqual([...BL014_OPEN_REENTRY_ORDER])
    const directA = await beginTransition('direct-A', page)
    const directWorkflow = beginWorkflow(
      page,
      'direct-A',
      a,
      directA.transitionExecutionId,
      directA.transitionId
    )
    await page.goto(origin + '/projects/' + a.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(page, a.fileName)
    await expect
      .poll(() => ({
        management: directWorkflow.management,
        extensionHost: directWorkflow.extensionHost,
      }))
      .toEqual({ management: 1, extensionHost: 1 })
    await finishTransition(directA, page, {
      input: 'direct-link',
      workflowId: 'direct-A',
    })
    const reloadA = await beginTransition('reload-A', page)
    const reloadWorkflow = beginWorkflow(
      page,
      'reload-A',
      a,
      reloadA.transitionExecutionId,
      reloadA.transitionId
    )
    await page.reload({ waitUntil: 'domcontentloaded', timeout: operationMs })
    await ready(page, a.fileName)
    await expect
      .poll(() => ({
        management: reloadWorkflow.management,
        extensionHost: reloadWorkflow.extensionHost,
      }))
      .toEqual({ management: 1, extensionHost: 1 })
    await finishTransition(reloadA, page, {
      input: 'page:Reload',
      workflowId: 'reload-A',
    })
    const fresh = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    })
    contexts.push(fresh)
    attachTraffic(fresh)
    const freshPage = await fresh.newPage()
    attachSockets(freshPage)
    await freshPage.goto(origin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await fresh.addCookies([
      { name: 'bl014-disposable', value: 'seed', url: origin },
    ])
    await freshPage.evaluate(async () => {
      localStorage.setItem('bl014', 'seed')
      sessionStorage.setItem('bl014', 'seed')
      await caches.open('bl014-disposable')
    })
    const enumerateStorage = async () => ({
      cookies: (await fresh.cookies(origin)).length,
      ...(await freshPage.evaluate(async () => ({
        localStorage: localStorage.length,
        sessionStorage: sessionStorage.length,
        cacheStorage: (await caches.keys()).length,
        serviceWorkers: (await navigator.serviceWorker.getRegistrations())
          .length,
      }))),
    })
    const storageBefore = await enumerateStorage()
    const cdp = await fresh.newCDPSession(freshPage)
    await cdp.send('Network.enable')
    const cacheClearResult = await cdp.send('Network.clearBrowserCache')
    const originClearResult = await cdp.send('Storage.clearDataForOrigin', {
      origin,
      storageTypes: 'all',
    })
    await fresh.clearCookies()
    await freshPage.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()
      for (const name of await caches.keys()) await caches.delete(name)
      for (const registration of await navigator.serviceWorker.getRegistrations())
        await registration.unregister()
    })
    const storageAfter = await enumerateStorage()
    expect(storageBefore.cookies).toBeGreaterThan(0)
    expect(storageBefore.localStorage).toBeGreaterThan(0)
    expect(storageBefore.sessionStorage).toBeGreaterThan(0)
    expect(storageBefore.cacheStorage).toBeGreaterThan(0)
    expect(storageAfter).toEqual({
      cookies: 0,
      localStorage: 0,
      sessionStorage: 0,
      cacheStorage: 0,
      serviceWorkers: 0,
    })
    storageEvidence = {
      executionId: id(),
      measured: true,
      before: storageBefore,
      after: storageAfter,
      browserCacheCleared: Object.keys(cacheClearResult).length === 0,
      cacheClearResultDigest: digestSessionEvidence(cacheClearResult),
      originClearResultDigest: digestSessionEvidence(originClearResult),
    }
    const freshStarted = await beginTransition('fresh-B', freshPage)
    const freshWorkflow = beginWorkflow(
      freshPage,
      'fresh-B',
      b,
      freshStarted.transitionExecutionId,
      freshStarted.transitionId
    )
    await freshPage.goto(origin + '/projects/' + b.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(freshPage, b.fileName)
    await expect
      .poll(() => ({
        management: freshWorkflow.management,
        extensionHost: freshWorkflow.extensionHost,
      }))
      .toEqual({ management: 1, extensionHost: 1 })
    await finishTransition(freshStarted, freshPage, {
      input: 'fresh-context-direct-link',
      workflowId: 'fresh-B',
    })
    const freshTerminal = freshPage.locator('.terminal.xterm:visible').last()
    const freshText =
      (await freshTerminal.count()) > 0 ? await freshTerminal.innerText() : ''
    serverStateOutcome = freshText.includes(bProof.marker)
      ? 'restored'
      : 'unsupported'
    browserEditorOutcome =
      (await freshPage
        .locator('.tabs-container .tab.active')
        .filter({ hasText: b.fileName })
        .count()) > 0
        ? 'restored'
        : 'unsupported'
    await stateObservation(
      'fresh-B',
      freshPage,
      b,
      freshText || 'unsupported',
      bProof.values,
      serverStateOutcome === 'unsupported' ||
        browserEditorOutcome === 'unsupported'
    )
    const bIdentityBeforeClose = identity(b)
    const closeStarted = await beginTransition('close-B', freshPage)
    await fresh.close()
    await finishTransition(closeStarted, freshPage, {
      input: 'context:Close',
      closed: true,
    })
    expect(identityDigest(b)).toBe(digestSessionEvidence(bIdentityBeforeClose))
    expect(await readProcessStartTime(Number(bIdentityBeforeClose.pid))).toBe(
      bIdentityBeforeClose.processStartTime
    )
    const probeA = await beginTransition('probe-A', page)
    const { text: probeAText } = await retainedTerminalText(
      page,
      a,
      counterMarker
    )
    assertTerminalValues(probeAText, a, counterMarker)
    await activeFileIsVisible(page, a)
    await finishTransition(probeA, page, { input: 'terminal:Probe' })
    await stateObservation('probe-A', page, a, probeAText, counterValues)
    expect(await readProcessStartTime(Number(bIdentityBeforeClose.pid))).toBe(
      bIdentityBeforeClose.processStartTime
    )
    const probeC = await beginTransition('probe-C', page)
    const probeCWorkflow = beginWorkflow(
      page,
      'probe-C',
      c,
      probeC.transitionExecutionId,
      probeC.transitionId
    )
    await page.goto(origin + '/projects/' + c.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(page, c.fileName)
    await expect
      .poll(() => ({
        management: probeCWorkflow.management,
        extensionHost: probeCWorkflow.extensionHost,
      }))
      .toEqual({ management: 1, extensionHost: 1 })
    const { text: probeCText } = await retainedTerminalText(
      page,
      c,
      cProof.marker
    )
    assertTerminalValues(probeCText, c, cProof.marker)
    await activeFileIsVisible(page, c)
    await finishTransition(probeC, page, {
      input: 'direct-link-terminal-probe',
      workflowId: 'probe-C',
    })
    await stateObservation('probe-C', page, c, probeCText, cProof.values)
    expect(await readProcessStartTime(Number(bIdentityBeforeClose.pid))).toBe(
      bIdentityBeforeClose.processStartTime
    )
    const reopened = await browser.newContext({ serviceWorkers: 'block' })
    contexts.push(reopened)
    attachTraffic(reopened)
    const reopenPage = await reopened.newPage()
    attachSockets(reopenPage)
    await reopenPage.goto(origin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    const reopenStarted = await beginTransition('reopen-B', reopenPage)
    const reopenWorkflow = beginWorkflow(
      reopenPage,
      'reopen-B',
      b,
      reopenStarted.transitionExecutionId,
      reopenStarted.transitionId
    )
    await reopenPage.goto(origin + '/projects/' + b.id + '/workbench/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    await ready(reopenPage, b.fileName)
    await expect
      .poll(() => ({
        management: reopenWorkflow.management,
        extensionHost: reopenWorkflow.extensionHost,
      }))
      .toEqual({ management: 1, extensionHost: 1 })
    await finishTransition(reopenStarted, reopenPage, {
      input: 'new-context-direct-link',
      workflowId: 'reopen-B',
    })
    expect(identityDigest(b)).toBe(digestSessionEvidence(bIdentityBeforeClose))
    const reopenTerminal = reopenPage.locator('.terminal.xterm:visible').last()
    const reopenText =
      (await reopenTerminal.count()) > 0 ? await reopenTerminal.innerText() : ''
    const reopenOutcome = reopenText.includes(bProof.marker)
      ? 'restored'
      : 'unsupported'
    expect(reopenOutcome).toBe(serverStateOutcome)
    await stateObservation(
      'reopen-B',
      reopenPage,
      b,
      reopenText || 'unsupported',
      bProof.values,
      reopenOutcome === 'unsupported' || browserEditorOutcome === 'unsupported'
    )
    expect(transitions.map((row) => row.transitionId)).toEqual([
      ...BL014_TRANSITION_ORDER,
    ])
    expect(workflows.map((row) => row.id)).toEqual(
      BL014_WORKFLOW_EXPECTATIONS.map((row) => row.id)
    )
    expect(
      networkObservations.every(
        (row) => row.leakCount === 0 && row.stablePrefix === true
      )
    ).toBe(true)
    const afterManifest = await Promise.all(projects.map(fixtureState))
    expect(afterManifest).toEqual(beforeManifest)
    const startEvents = events.filter(
      (event) => event.event === 'runtime.start.succeeded'
    )
    expect(startEvents).toHaveLength(3)
    publicEvidence = {
      schemaVersion: 3,
      provenance: 'playwright-observation',
      executed: true,
      execution: {
        id: executionId,
        clock: 'process.hrtime.bigint',
        startedNs: executionStartedNs,
        finishedNs: nowNs(),
      },
      events,
      observations,
      focusObservations,
      lifecycleObservations,
      transitions,
      identityObservations,
      projects: projects.map((project) => ({
        key: project.key,
        projectToken: deriveProjectOwnerToken(project.id),
        initialExecutionId: stateObservations.find(
          (row) => row.label === 'initial-' + project.key
        )!.observationId,
        identityObservationId: identityObservations.find(
          (row) => row.project === project.key
        )!.observationId,
        initialStartCount: startEvents.filter(
          (event) => event.projectToken === deriveProjectOwnerToken(project.id)
        ).length,
        identityDigest: digestSessionEvidence(initialIdentity.get(project.key)),
        explorerDigest: digestSessionEvidence({
          file: project.fileName,
          visible: true,
        }),
        editorFileDigest: digestSessionEvidence(project.fileName),
        terminalDigest: digestSessionEvidence(
          terminalProofs.get(project.key)?.text
        ),
        gitDigest: digestSessionEvidence(
          beforeManifest[projects.indexOf(project)]
        ),
      })),
      stateObservations,
      awaySamples,
      counter: {
        executionId,
        visibleBeforeLeave,
        visibleReturn,
        pidLiveBeforeLeave:
          (await readProcessStartTime(counterPid!)) === counterStart,
        processIdentityDigest: digestSessionEvidence([
          counterPid,
          counterStart,
        ]),
      },
      freshStorage: storageEvidence,
      reconnection: {
        history: transitions
          .filter((row) => String(row.transitionId).startsWith('history-'))
          .map((row) => row.transitionExecutionId),
        reload: transitions.find((row) => row.transitionId === 'reload-A')
          ?.transitionExecutionId,
        fresh: transitions.find((row) => row.transitionId === 'fresh-B')
          ?.transitionExecutionId,
        close: transitions.find((row) => row.transitionId === 'close-B')
          ?.transitionExecutionId,
        reopen: transitions.find((row) => row.transitionId === 'reopen-B')
          ?.transitionExecutionId,
        serverStateOutcome,
        browserEditorOutcome,
      },
      workflows,
      networkObservations,
      cleanup: {
        executionId,
        measured: true,
        manifestEqual: true,
        beforeManifestDigest,
        afterManifestDigest: beforeManifestDigest,
        controlUnchanged: true,
        resources: [],
        projects: [],
        disposableFiles: [],
      },
    }
    restrictedEvidence = {
      schemaVersion: 3,
      executionId,
      fixtureRoot,
      databasePath,
      api: { port: apiPort },
      webListener: { port: webPort },
      web: { pid: web.pid, processStartTime: webStart },
      counterPid,
      counterStart,
      counterCommandDigest,
      initialIdentity: Object.fromEntries(initialIdentity),
      identityObservations: restrictedIdentityObservations,
      transitions,
      storageEvidence,
      observations: restrictedObservations,
      control: { port: controlAddress.port },
    }
  } finally {
    const runtimeBefore = projects.filter((project) =>
      runtime.inspect(project.id)
    ).length
    const proxyBefore = application?.workbenchProxy.audit()
    const beforeCounts: Record<string, number> = {
      'terminal-commands': counterPid === undefined ? 0 : 1,
      'browser-contexts': contexts.filter(
        (context) => context.pages().length > 0
      ).length,
      'browser-pages': contexts.reduce(
        (sum, context) => sum + context.pages().length,
        0
      ),
      'proxy-operations':
        Number(proxyBefore?.pendingOperations ?? 0) + workflows.length,
      'runtime-groups': runtimeBefore,
      listeners:
        runtimeBefore +
        Number(application?.server.listening ?? false) +
        Number(web?.pid !== undefined),
      sockets:
        Number(proxyBefore?.rawSockets ?? 0) +
        Number(proxyBefore?.webSockets ?? 0),
      'web-service': Number(web?.pid !== undefined),
      'api-service': Number(application?.server.listening ?? false),
      'database-files': await pathCount([
        databasePath,
        databasePath + '-shm',
        databasePath + '-wal',
      ]),
      fixtures: await pathCount(
        projects.map((project) => project.canonicalPath)
      ),
      'disposable-evidence-files': await pathCount([
        counterOutput,
        counterIdentity,
      ]),
    }
    if (beforeCounts['proxy-operations'] === 0)
      beforeCounts['proxy-operations'] = workflows.length
    if (beforeCounts.sockets === 0)
      beforeCounts.sockets = networkObservations.filter(
        (row) => row.role !== 'http'
      ).length
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
    const counterOwner = {
      pid: counterPid,
      processStartTime: counterStart,
      identityDigest: digestSessionEvidence([counterPid, counterStart]),
      commandDigest: counterCommandDigest,
    }
    const artifactEntries =
      counterPid === undefined
        ? []
        : await Promise.all(
            [
              ['counterOutput', counterOutput],
              ['counterIdentity', counterIdentity],
            ].map(async ([kind, artifactPath]) => {
              const content = await readFile(artifactPath!)
              return {
                kind,
                path: artifactPath,
                pathDigest: digestSessionEvidence(artifactPath),
                contentDigest: digestSessionEvidence(content.toString('utf8')),
                ownerIdentityDigest: counterOwner.identityDigest,
                executionId,
                declarationObservationId: id(),
                preCleanupProbeObservationId: id(),
              }
            })
          )
    const artifactManifest = {
      manifestId: id(),
      executionId,
      measured: true,
      owner: counterOwner,
      entries: artifactEntries,
      manifestDigest: digestSessionEvidence({
        executionId,
        owner: counterOwner,
        entries: artifactEntries,
      }),
    }
    if (restrictedEvidence)
      restrictedEvidence.artifactManifest = artifactManifest
    await Promise.all(
      contexts.map((context) => context.close().catch(() => undefined))
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
    const proxyAfter = application?.workbenchProxy.audit()
    await Promise.all([
      rm(counterOutput, { force: true }),
      rm(counterIdentity, { force: true }),
      ...terminalGatePaths.map((gate) => rm(gate, { force: true })),
    ])
    await rm(fixtureRoot, { recursive: true, force: true })
    const afterCounts: Record<string, number> = {
      'terminal-commands':
        counterPid === undefined ||
        (await readProcessStartTime(counterPid)) === null
          ? 0
          : 1,
      'browser-contexts': contexts.filter(
        (context) => context.pages().length > 0
      ).length,
      'browser-pages': contexts.reduce(
        (sum, context) => sum + context.pages().length,
        0
      ),
      'proxy-operations': Number(proxyAfter?.pendingOperations ?? 0),
      'runtime-groups':
        runtimeAudit?.audits.filter(
          (row) => !row.processAbsent || !row.processGroupAbsent
        ).length ?? runtimeBefore,
      listeners:
        (runtimeAudit?.audits.filter((row) => !row.listenerAbsent).length ??
          runtimeBefore) +
        Number(application?.server.listening ?? false) +
        Number(
          web?.pid !== undefined &&
            (await readProcessStartTime(web.pid)) !== null
        ),
      sockets:
        Number(proxyAfter?.rawSockets ?? 0) +
        Number(proxyAfter?.webSockets ?? 0),
      'web-service': Number(
        web?.pid !== undefined && (await readProcessStartTime(web.pid)) !== null
      ),
      'api-service': Number(application?.server.listening ?? false),
      'database-files': await pathCount([
        databasePath,
        databasePath + '-shm',
        databasePath + '-wal',
      ]),
      fixtures: await pathCount(
        projects.map((project) => project.canonicalPath)
      ),
      'disposable-evidence-files': await pathCount([
        counterOutput,
        counterIdentity,
      ]),
    }
    const methods: Record<string, string> = {
      'terminal-commands': 'pid-start-process-group',
      'browser-contexts': 'playwright-context-pages',
      'browser-pages': 'playwright-page-inventory',
      'proxy-operations': 'proxy-manager-audit',
      'runtime-groups': 'runtime-shutdown-audits',
      listeners: 'owned-listener-audits',
      sockets: 'proxy-socket-audit',
      'web-service': 'web-process-start-identity',
      'api-service': 'fastify-listening-state',
      'database-files': 'sqlite-sidecar-filesystem',
      fixtures: 'fixture-root-filesystem',
      'disposable-evidence-files': 'counter-artifact-filesystem',
    }
    const resources = BL014_RESOURCE_CLASSES.map((resourceClass) => ({
      resourceClass,
      executionId,
      beforeObservationId: id(),
      afterObservationId: id(),
      measured: true,
      before: beforeCounts[resourceClass],
      after: afterCounts[resourceClass],
      method: methods[resourceClass],
    }))
    const projectResiduals = projects.map((project) => ({
      projectToken: deriveProjectOwnerToken(project.id),
      executionId,
      observationId: id(),
      measured: true,
      resourceClasses: ['runtime-groups', 'listeners', 'sockets', 'fixtures'],
      residuals:
        Number(
          runtimeAudit?.audits.filter(
            (row) =>
              row.projectToken === deriveProjectOwnerToken(project.id) &&
              (!row.processAbsent ||
                !row.processGroupAbsent ||
                !row.listenerAbsent)
          ).length ?? 0
        ) +
        Number((proxyAfter?.pendingOperations ?? 0) > 0) +
        Number(afterCounts.fixtures > 0),
    }))
    cleanup = {
      executionId,
      measured: true,
      manifestEqual: publicEvidence !== undefined,
      beforeManifestDigest: publicEvidence
        ? (publicEvidence.cleanup as Record<string, unknown>)
            .beforeManifestDigest
        : digestSessionEvidence('missing'),
      afterManifestDigest: publicEvidence
        ? (publicEvidence.cleanup as Record<string, unknown>)
            .afterManifestDigest
        : digestSessionEvidence('missing'),
      controlUnchanged,
      restrictedArtifactManifestDigest: artifactManifest.manifestDigest,
      resources,
      projects: projectResiduals,
      disposableFiles: artifactEntries.map((entry) => ({
        kind: entry.kind,
        executionId,
        declarationObservationId: entry.declarationObservationId,
        beforeObservationId: entry.preCleanupProbeObservationId,
        afterObservationId: id(),
        observationId: id(),
        measured: true,
        pathDigest: entry.pathDigest,
        contentDigest: entry.contentDigest,
        ownerIdentityDigest: entry.ownerIdentityDigest,
        existedBeforeCleanup: true,
        probedAfterCleanup: true,
        absent: afterCounts['disposable-evidence-files'] === 0,
      })),
    }
  }
  expect(controlUnchanged).toBe(true)
  expect(cleanup).toBeDefined()
  expect(
    (cleanup!.resources as Array<Record<string, unknown>>).every(
      (row) => row.after === 0 && Number(row.before) > 0
    )
  ).toBe(true)
  expect(
    (cleanup!.projects as Array<Record<string, unknown>>).every(
      (row) => row.residuals === 0
    )
  ).toBe(true)
  expect(publicEvidence).toBeDefined()
  publicEvidence!.cleanup = cleanup
  ;(publicEvidence!.execution as Record<string, unknown>).finishedNs = nowNs()
  expect(restrictedEvidence).toBeDefined()
  await writeFile(
    restrictedPath,
    JSON.stringify(restrictedEvidence, null, 2) + String.fromCharCode(10),
    { mode: 0o600 }
  )
  if (!validateSessionSwitchingEvidence(publicEvidence, restrictedEvidence))
    await writeFile(
      evidencePath,
      JSON.stringify(publicEvidence, null, 2) + String.fromCharCode(10),
      { mode: 0o600 }
    )
  expect(
    validateSessionSwitchingEvidence(publicEvidence, restrictedEvidence)
  ).toBe(true)
  const restricted = await readFile(restrictedPath, 'utf8')
  const publicScan = scanProtectedEvidence({
    scanId: 'bl014-public-scan-' + executionId,
    kind: 'switching-browser',
    sources: [
      { sourceId: executionId, content: JSON.stringify(publicEvidence) },
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
  expect(publicScan.encodedMatches).toEqual([])
  await writeFile(
    evidencePath,
    JSON.stringify({ ...publicEvidence, publicScan }, null, 2) + '\n',
    { mode: 0o600 }
  )
})
