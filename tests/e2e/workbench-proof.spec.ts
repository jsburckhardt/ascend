import { spawn } from 'node:child_process'
import { access, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  BL001_FIXTURE,
  BL001_INJECTION_SENTINEL,
  BL001_ROOT,
  BL001_RUN_ROOT,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
  DIRECT_RAW_EVIDENCE,
  EXPLORER_SENTINEL,
  INTEGRATED_COMMAND_IDENTITIES,
  INTEGRATED_RAW_EVIDENCE,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
  REPOSITORY_ROOT,
  TERMINAL_COMMAND_TIMEOUT_MS,
  TERMINAL_EPISODE_EVIDENCE,
  TERMINAL_EPISODE_TIMEOUT_MS,
  TERMINAL_TOOL_COMMANDS,
  canonicalFixturePath,
  classifyPathEnvironment,
  snapshotFixture,
  type TerminalEnvironmentEvidence,
} from '../../apps/api/src/workbench-proof-contract.js'
import {
  auditHandleAbsent,
  auditHandleCleanup,
  readManagedListeners,
  readManagedProcesses,
} from '../../apps/api/src/workbench-proof-audit.js'
import {
  parseProofHandle,
  readProcessStartTime,
  stopWorkbenchProof,
  terminateExactProcessGroup,
  type ProofHandle,
} from '../../apps/api/src/workbench-proof-runtime.js'
import {
  captureTerminalContext,
  preflightFixedExecutables,
  writeJsonAtomic,
  type TerminalRawEvidence,
} from '../../apps/api/src/workbench-proof-terminal.js'
import { runTerminalParityEpisode } from '../../apps/api/src/workbench-proof-terminal-episode.js'

interface CommandResult {
  code: number
  stdout: string
  stderr: string
}

const runJust = async (
  recipe: 'proof-start' | 'proof-stop',
  input = ''
): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn('just', [recipe], {
      cwd: REPOSITORY_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
    child.stdin.end(input)
  })

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

const removeAbsentPriorRuns = async (): Promise<void> => {
  if (await pathExists(BL001_RUN_ROOT)) {
    for (const runId of await readdir(BL001_RUN_ROOT)) {
      const state = path.join(BL001_RUN_ROOT, runId, 'state.json')
      if (!(await pathExists(state))) continue
      const handle = parseProofHandle(await readFile(state, 'utf8'))
      if (!(await auditHandleAbsent(handle))) {
        throw new Error('A prior BL-001 managed handle is still live')
      }
    }
  }
  await rm(BL001_ROOT, { recursive: true, force: true })
}

const codeServerVersion = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(CODE_SERVER_PATH, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) resolve(stdout.trim().split(/\s+/u)[0])
      else reject(new Error('code-server version check failed'))
    })
  })

const isDetachedFrameError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('Frame was detached')

const renderedPreviewIsVisible = async (page: Page): Promise<boolean> => {
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue
    try {
      if (
        await frame
          .getByText(MARKDOWN_RENDERED_SENTINEL, { exact: true })
          .first()
          .isVisible()
      ) {
        return true
      }
    } catch (error) {
      if (isDetachedFrameError(error)) continue
      throw error
    }
  }
  return false
}

const commandByKey = (evidence: TerminalRawEvidence, key: string) => {
  const command = evidence.commands.find((entry) => entry.key === key)
  if (!command) throw new Error('Missing terminal evidence for ' + key)
  return command
}

interface TrackedCommandIdentity {
  pid: number
  pgid: number
  startTimeTicks: string
  command: string
}

interface OwnedBrowserContext {
  browserContext: BrowserContext
  close: () => Promise<void>
}

const integratedCaptureScript = path.join(
  REPOSITORY_ROOT,
  'apps/api/src/cli/proof-terminal-integrated.ts'
)
const timeoutCommandPidFile = path.join(
  BL001_ROOT,
  'timeout-terminal-command.json'
)

const rememberCompletedCommands = (
  tracked: Map<number, TrackedCommandIdentity>,
  evidence: TerminalRawEvidence | null
): void => {
  for (const command of evidence?.commands ?? []) {
    tracked.set(command.process.pid, {
      pid: command.process.pid,
      pgid: command.process.pid,
      startTimeTicks: command.process.startTimeTicks,
      command: command.command,
    })
  }
}

const discoverValidationTerminalCommands = async (
  handle: ProofHandle,
  tracked: Map<number, TrackedCommandIdentity>
): Promise<void> => {
  const rows = await readManagedProcesses(handle.pid)
  const validationPids = new Set(
    rows
      .filter((row) => row.argv.includes(integratedCaptureScript))
      .map((row) => row.pid)
  )
  let changed = true
  while (changed) {
    changed = false
    for (const row of rows) {
      if (validationPids.has(row.ppid) && !validationPids.has(row.pid)) {
        validationPids.add(row.pid)
        changed = true
      }
    }
  }
  for (const row of rows) {
    if (!validationPids.has(row.pid)) continue
    const startTimeTicks = await readProcessStartTime(row.pid)
    if (!startTimeTicks) continue
    tracked.set(row.pid, {
      pid: row.pid,
      pgid: row.pgid,
      startTimeTicks,
      command: row.argv.join(' '),
    })
  }
}

const cancelAndAuditTrackedCommands = async (
  handle: ProofHandle | null,
  tracked: Map<number, TrackedCommandIdentity>,
  evidence: Array<TerminalRawEvidence | null>
): Promise<boolean> => {
  for (const record of evidence) rememberCompletedCommands(tracked, record)
  if (await pathExists(INTEGRATED_COMMAND_IDENTITIES)) {
    const published = JSON.parse(
      await readFile(INTEGRATED_COMMAND_IDENTITIES, 'utf8')
    ) as {
      owner: TrackedCommandIdentity
      processGroupLeader: TrackedCommandIdentity
      commands: TrackedCommandIdentity[]
    }
    for (const identity of [
      published.owner,
      published.processGroupLeader,
      ...published.commands,
    ])
      tracked.set(identity.pid, identity)
  }
  if (handle) await discoverValidationTerminalCommands(handle, tracked)

  const groups = new Map<number, TrackedCommandIdentity>()
  for (const identity of tracked.values()) {
    if (identity.pid === identity.pgid) groups.set(identity.pgid, identity)
  }
  for (const identity of [...groups.values()].reverse()) {
    if ((await readProcessStartTime(identity.pid)) !== identity.startTimeTicks)
      continue
    await terminateExactProcessGroup(identity.pgid, 1_000)
  }

  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    const states = await Promise.all(
      [...tracked.values()].map(
        async (identity) =>
          (await readProcessStartTime(identity.pid)) === identity.startTimeTicks
      )
    )
    if (states.every((live) => !live)) return true
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return false
}

const waitForAbort = async (signal: AbortSignal): Promise<void> => {
  if (signal.aborted) return
  await new Promise<void>((resolve) =>
    signal.addEventListener('abort', () => resolve(), { once: true })
  )
}

test.describe.configure({ mode: 'serial' })

test('cancels an in-progress real integrated command on overall timeout', async ({
  browser,
}) => {
  test.setTimeout(35_000)
  await removeAbsentPriorRuns()
  const tracked = new Map<number, TrackedCommandIdentity>()
  let handle: ProofHandle | null = null
  let contextClosed = false
  let terminalCommandsAbsent = false
  let exactProcessAbsent = false
  let listenerAbsent = false

  await expect(
    runTerminalParityEpisode<ProofHandle, OwnedBrowserContext>({
      timeoutMs: 20_000,
      preflight: async () => {
        await preflightFixedExecutables(process.env.PATH ?? '')
      },
      startWorkbench: async () => {
        const result = await runJust('proof-start')
        expect(result.code).toBe(0)
        handle = parseProofHandle(result.stdout.trim())
        return handle
      },
      openBrowser: async (startedHandle) => {
        const browserContext = await browser.newContext()
        return {
          browserContext,
          close: async () => {
            await browserContext.close()
            contextClosed = true
          },
        }
      },
      run: async (startedHandle, ownedContext, signal) => {
        const page = await ownedContext.browserContext.newPage()
        await page.goto(startedHandle.url, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('.monaco-workbench')).toBeVisible({
          timeout: 15_000,
        })
        signal.throwIfAborted()
        await page.keyboard.press('Control+Shift+E')
        await expect(
          page.getByText(EXPLORER_SENTINEL, { exact: true }).first()
        ).toBeVisible()
        await page.keyboard.press('Control+Shift+Backquote')
        await expect(page.locator('.terminal.xterm').first()).toBeVisible({
          timeout: 10_000,
        })
        await page.keyboard.insertText(
          '/usr/local/bin/node /workspaces/ascend/tests/e2e/fixtures/terminal-timeout-command.mjs'
        )
        await page.keyboard.press('Enter')
        await expect
          .poll(() => pathExists(timeoutCommandPidFile), { timeout: 5_000 })
          .toBe(true)
        const identity = JSON.parse(
          await readFile(timeoutCommandPidFile, 'utf8')
        ) as TrackedCommandIdentity
        expect(await readProcessStartTime(identity.pid)).toBe(
          identity.startTimeTicks
        )
        tracked.set(identity.pid, {
          ...identity,
          command: '/usr/bin/sleep 60',
        })
        await waitForAbort(signal)
      },
      cancelTrackedCommands: async () => {
        terminalCommandsAbsent = await cancelAndAuditTrackedCommands(
          handle,
          tracked,
          []
        )
        if (!terminalCommandsAbsent)
          throw new Error('A timeout validation command remains live')
      },
      stopWorkbench: async (startedHandle) => {
        const firstStop = await runJust(
          'proof-stop',
          JSON.stringify(startedHandle)
        )
        const repeatedStop = await runJust(
          'proof-stop',
          JSON.stringify(startedHandle)
        )
        if (firstStop.code !== 0 || repeatedStop.code !== 0)
          throw new Error('Timeout workbench stop failed')
      },
      auditWorkbenchAbsent: async (startedHandle) => {
        const audit = await auditHandleCleanup(startedHandle)
        exactProcessAbsent = audit.exactProcessAbsent
        listenerAbsent = audit.listenerAbsent
        return exactProcessAbsent && listenerAbsent
      },
    })
  ).rejects.toMatchObject({
    code: 'terminal-episode-timeout',
    details: { timeoutMs: 20_000 },
  })

  expect(tracked.size).toBeGreaterThan(0)
  expect(terminalCommandsAbsent).toBe(true)
  expect(contextClosed).toBe(true)
  expect(exactProcessAbsent).toBe(true)
  expect(listenerAbsent).toBe(true)
  if (handle) await expect(auditHandleAbsent(handle)).resolves.toBe(true)
})

test('proves one designated-host workbench with terminal parity', async ({
  browser,
}) => {
  test.setTimeout(TERMINAL_EPISODE_TIMEOUT_MS + 15_000)
  const episodeStartedAt = Date.now()
  await removeAbsentPriorRuns()
  const fixtureBefore = await snapshotFixture()
  const injectionBefore = await pathExists(BL001_INJECTION_SENTINEL)
  expect(injectionBefore).toBe(false)
  const canonicalPath = await canonicalFixturePath()

  const host = {
    os: (await readFile('/etc/os-release', 'utf8')).match(
      /^PRETTY_NAME="?([^"\n]+)"?$/mu
    )?.[1],
    hostname: os.hostname(),
    user: os.userInfo().username,
    uid: os.userInfo().uid,
    shell: os.userInfo().shell,
    repository: REPOSITORY_ROOT,
    codeServerPath: CODE_SERVER_PATH,
    codeServerVersion: await codeServerVersion(),
  }
  expect(host).toMatchObject({
    os: 'Ubuntu 24.04.4 LTS',
    hostname: '03f809395a5d',
    user: 'vscode',
    uid: 1000,
    codeServerVersion: CODE_SERVER_VERSION,
  })

  let direct: TerminalRawEvidence | null = null
  let integrated: TerminalRawEvidence | null = null
  let environment: TerminalEnvironmentEvidence | null = null
  let handle: ProofHandle | null = null
  let context: BrowserContext | null = null
  let start: CommandResult | null = null
  let stop: CommandResult | null = null
  let repeatedStop: CommandResult | null = null
  let browserContextClosed = false
  let terminalCreationActions = 0
  let browserObserved = false
  let cleanupAbsent = false
  let exactProcessAbsent = false
  let listenerAbsent = false
  let commandCleanup = false
  const trackedCommands = new Map<number, TrackedCommandIdentity>()
  let testError: unknown = null
  let processes: Awaited<ReturnType<typeof readManagedProcesses>> = []
  let listeners: Awaited<ReturnType<typeof readManagedListeners>> = []
  const parityRows: Array<{
    command: string
    exitEqual: boolean
    stdoutEqual: boolean
    stderrEqual: boolean
  }> = []

  try {
    await runTerminalParityEpisode<ProofHandle, OwnedBrowserContext>({
      timeoutMs: TERMINAL_EPISODE_TIMEOUT_MS,
      preflight: async () => {
        await preflightFixedExecutables(process.env.PATH ?? '')
      },
      startWorkbench: async () => {
        direct = await captureTerminalContext({
          context: 'direct',
          cwd: canonicalPath,
        })
        await writeJsonAtomic(DIRECT_RAW_EVIDENCE, direct)

        start = await runJust('proof-start')
        expect(start.code).toBe(0)
        const stdoutLines = start.stdout.trim().split('\n').filter(Boolean)
        expect(stdoutLines).toHaveLength(1)
        handle = parseProofHandle(stdoutLines[0])
        processes = await readManagedProcesses(handle.pid)
        listeners = await readManagedListeners(
          processes.map((entry) => entry.pid)
        )
        expect(processes.length).toBeGreaterThan(0)
        expect(
          processes.some(
            (entry) =>
              entry.argv.filter((argument) => argument === BL001_FIXTURE)
                .length === 1
          )
        ).toBe(true)
        expect(
          listeners.some(
            (entry) => entry.port === Number(new URL(handle.url).port)
          )
        ).toBe(true)
        return handle
      },
      openBrowser: async () => {
        const browserContext = await browser.newContext()
        context = browserContext
        return {
          browserContext,
          close: async () => {
            await browserContext.close()
            browserContextClosed = true
          },
        }
      },
      run: async (startedHandle, ownedContext, signal) => {
        signal.throwIfAborted()
        const page = await ownedContext.browserContext.newPage()
        await page.goto(startedHandle.url, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('.monaco-workbench')).toBeVisible({
          timeout: 15_000,
        })
        await page.keyboard.press('Control+Shift+E')
        await expect(
          page.getByText(EXPLORER_SENTINEL, { exact: true }).first()
        ).toBeVisible()
        await page.getByText(MARKDOWN_FIXTURE, { exact: true }).first().click()
        await page
          .getByRole('button', { name: /^Open Preview to the Side/u })
          .click()
        await expect
          .poll(() => renderedPreviewIsVisible(page), { timeout: 15_000 })
          .toBe(true)
        browserObserved = true

        await page.keyboard.press('Control+Shift+Backquote')
        terminalCreationActions += 1
        await expect(page.locator('.terminal.xterm').first()).toBeVisible({
          timeout: 10_000,
        })
        const integratedCommand =
          'setsid /workspaces/ascend/node_modules/.bin/tsx /workspaces/ascend/apps/api/src/cli/proof-terminal-integrated.ts && printf BL002_TERMINAL_COMPLETE\\n'
        signal.throwIfAborted()
        await page.keyboard.insertText(integratedCommand)
        await page.keyboard.press('Enter')
        await expect
          .poll(() => pathExists(INTEGRATED_RAW_EVIDENCE), { timeout: 45_000 })
          .toBe(true)
        await expect
          .poll(() => page.locator('.xterm-rows').last().innerText(), {
            timeout: 5_000,
          })
          .toContain('BL002_TERMINAL_COMPLETE')
        signal.throwIfAborted()
        integrated = JSON.parse(
          await readFile(INTEGRATED_RAW_EVIDENCE, 'utf8')
        ) as TerminalRawEvidence

        expect(terminalCreationActions).toBe(1)
        expect(commandByKey(direct, 'hostname').normalized.stdout).toBe(
          commandByKey(integrated, 'hostname').normalized.stdout
        )
        expect(commandByKey(direct, 'user').normalized.stdout).toBe('vscode\n')
        expect(commandByKey(integrated, 'user').normalized.stdout).toBe(
          'vscode\n'
        )
        expect(commandByKey(integrated, 'cwd').normalized.stdout).toBe(
          canonicalPath + '\n'
        )

        for (const specification of TERMINAL_TOOL_COMMANDS) {
          const directResult = commandByKey(direct, specification.key)
          const integratedResult = commandByKey(integrated, specification.key)
          const row = {
            command: specification.command,
            exitEqual: directResult.exitResult === integratedResult.exitResult,
            stdoutEqual:
              directResult.normalized.stdout ===
              integratedResult.normalized.stdout,
            stderrEqual:
              directResult.normalized.stderr ===
              integratedResult.normalized.stderr,
          }
          parityRows.push(row)
          expect(row).toMatchObject({
            exitEqual: true,
            stdoutEqual: true,
            stderrEqual: true,
          })
        }

        const classification = classifyPathEnvironment(
          direct.environment.PATH,
          integrated.environment.PATH,
          direct.environment.resolutions,
          integrated.environment.resolutions
        )
        environment = {
          variable: 'PATH',
          direct: direct.environment.PATH,
          integrated: integrated.environment.PATH,
          classification,
          directResolutions: direct.environment.resolutions,
          integratedResolutions: integrated.environment.resolutions,
        }
        expect(classification).not.toBe(
          'unexplained failure-causing difference'
        )
      },
      cancelTrackedCommands: async () => {
        commandCleanup = await cancelAndAuditTrackedCommands(
          handle,
          trackedCommands,
          [direct, integrated]
        )
        if (!commandCleanup)
          throw new Error('A terminal command identity remains live')
      },
      stopWorkbench: async (startedHandle) => {
        stop = await runJust('proof-stop', JSON.stringify(startedHandle))
        repeatedStop = await runJust(
          'proof-stop',
          JSON.stringify(startedHandle)
        )
        let audit = await auditHandleCleanup(startedHandle)
        if (!audit.exactProcessAbsent || !audit.listenerAbsent) {
          await stopWorkbenchProof(startedHandle)
          audit = await auditHandleCleanup(startedHandle)
        }
        exactProcessAbsent = audit.exactProcessAbsent
        listenerAbsent = audit.listenerAbsent
        cleanupAbsent = exactProcessAbsent && listenerAbsent
        if (stop.code !== 0 || repeatedStop.code !== 0 || !cleanupAbsent)
          throw new Error('Exact workbench cleanup failed')
      },
      auditWorkbenchAbsent: async (startedHandle) => {
        const audit = await auditHandleCleanup(startedHandle)
        exactProcessAbsent = audit.exactProcessAbsent
        listenerAbsent = audit.listenerAbsent
        cleanupAbsent = exactProcessAbsent && listenerAbsent
        return cleanupAbsent
      },
    })
  } catch (error) {
    testError = error
  } finally {
    const fixtureAfter = await snapshotFixture()
    const injectionAfter = await pathExists(BL001_INJECTION_SENTINEL)
    if (
      handle &&
      (stop?.code !== 0 || repeatedStop?.code !== 0 || !cleanupAbsent)
    ) {
      testError ??= new Error('Exact workbench cleanup failed')
    }
    if (context && !browserContextClosed)
      testError ??= new Error('Browser context cleanup failed')
    if (!commandCleanup)
      testError ??= new Error('A terminal command identity remains live')
    if (
      JSON.stringify(fixtureAfter) !== JSON.stringify(fixtureBefore) ||
      injectionAfter
    ) {
      testError ??= new Error('Fixture integrity changed')
    }

    await writeJsonAtomic(TERMINAL_EPISODE_EVIDENCE, {
      version: 1,
      host,
      prerequisites: {
        ubuntu: '24.04.4 LTS',
        user: 'vscode',
        codeServer: CODE_SERVER_VERSION,
        chromium: true,
        fixedTools: TERMINAL_TOOL_COMMANDS.map(({ command }) => command),
      },
      timeoutsMs: {
        command: TERMINAL_COMMAND_TIMEOUT_MS,
        episode: TERMINAL_EPISODE_TIMEOUT_MS,
        startup: 15_000,
        stop: 10_000,
      },
      rawReferences: {
        direct: path.relative(REPOSITORY_ROOT, DIRECT_RAW_EVIDENCE),
        integrated: path.relative(REPOSITORY_ROOT, INTEGRATED_RAW_EVIDENCE),
      },
      normalization: 'CRLF and lone CR to LF only; no other content changes',
      commands: {
        paved: 'just proof-terminal-parity',
        start: { command: 'just proof-start', exit: start?.code ?? -1 },
        stop: { command: 'just proof-stop', exit: stop?.code ?? -1 },
        repeatedStop: {
          command: 'just proof-stop',
          exit: repeatedStop?.code ?? -1,
        },
      },
      handle,
      processes,
      listeners,
      browser: {
        explorerSentinel: EXPLORER_SENTINEL,
        markdownFixture: MARKDOWN_FIXTURE,
        renderedSentinel: MARKDOWN_RENDERED_SENTINEL,
        observed: browserObserved,
        terminalCreationActions,
        contextClosed: browserContextClosed,
      },
      parity: {
        hostname:
          direct && integrated
            ? {
                direct: commandByKey(direct, 'hostname').normalized.stdout,
                integrated: commandByKey(integrated, 'hostname').normalized
                  .stdout,
              }
            : null,
        user:
          direct && integrated
            ? {
                direct: commandByKey(direct, 'user').normalized.stdout,
                integrated: commandByKey(integrated, 'user').normalized.stdout,
              }
            : null,
        integratedCwd: integrated
          ? commandByKey(integrated, 'cwd').normalized.stdout
          : null,
        fixturePath: canonicalPath,
        tools: parityRows,
        environment,
      },
      cleanup: {
        browserContextClosed,
        terminalCommandsAbsent: commandCleanup,
        exactHandleAbsent: exactProcessAbsent,
        listenerAbsent,
        firstStopExit: stop?.code ?? -1,
        repeatedStopExit: repeatedStop?.code ?? -1,
      },
      fixture: {
        before: fixtureBefore,
        after: fixtureAfter,
        equal: JSON.stringify(fixtureBefore) === JSON.stringify(fixtureAfter),
      },
      injection: { before: injectionBefore, after: injectionAfter },
      elapsedMs: Date.now() - episodeStartedAt,
      disposition: testError ? 'failed' : 'passed',
    })
  }

  if (testError) throw testError
})
