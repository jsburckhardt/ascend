import { spawn } from 'node:child_process'
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  BL001_FIXTURE,
  BL001_INJECTION_SENTINEL,
  BL001_ROOT,
  BL001_RUN_ROOT,
  BROWSER_TIMEOUT_MS,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
  EXPLORER_SENTINEL,
  MARKDOWN_FIXTURE,
  MARKDOWN_RENDERED_SENTINEL,
  REPOSITORY_ROOT,
  snapshotFixture,
} from '../../apps/api/src/workbench-proof-contract.js'
import {
  auditHandleAbsent,
  readManagedListeners,
  readManagedProcesses,
} from '../../apps/api/src/workbench-proof-audit.js'
import {
  parseProofHandle,
  stopWorkbenchProof,
  type ProofHandle,
} from '../../apps/api/src/workbench-proof-runtime.js'

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

const listRelativePaths = async (
  root: string,
  relative = ''
): Promise<string[]> => {
  if (!(await pathExists(root))) return []
  const entries = await readdir(path.join(root, relative), {
    withFileTypes: true,
  })
  const paths: string[] = []
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const child = path.join(relative, entry.name)
    paths.push(child)
    if (entry.isDirectory())
      paths.push(...(await listRelativePaths(root, child)))
  }
  return paths
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

const renderedPreviewIsVisible = async (
  page: import('@playwright/test').Page
): Promise<boolean> => {
  for (const frame of page.frames()) {
    if (frame.isDetached()) continue

    try {
      const sentinel = frame.getByText(MARKDOWN_RENDERED_SENTINEL, {
        exact: true,
      })
      if (await sentinel.first().isVisible()) return true
    } catch (error) {
      // VS Code replaces the Markdown webview frame while Preview initializes.
      // Retry only that bounded transition through the enclosing expect.poll.
      if (isDetachedFrameError(error)) continue
      throw error
    }
  }
  return false
}

test.describe.configure({ mode: 'serial' })

test('proves one designated-host code-server workbench lifecycle', async ({
  page,
}) => {
  test.setTimeout(BROWSER_TIMEOUT_MS)
  await removeAbsentPriorRuns()
  const fixtureBefore = await snapshotFixture()
  const disposableBefore = await listRelativePaths(BL001_ROOT)
  const injectionBefore = await pathExists(BL001_INJECTION_SENTINEL)
  expect(injectionBefore).toBe(false)

  const host = {
    os: (await readFile('/etc/os-release', 'utf8')).match(
      /^PRETTY_NAME="?([^"\n]+)"?$/mu
    )?.[1],
    hostname: os.hostname(),
    user: os.userInfo().username,
    uid: os.userInfo().uid,
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

  let handle: ProofHandle | null = null
  let start: CommandResult | null = null
  let stop: CommandResult | null = null
  let repeatedStop: CommandResult | null = null
  let processes: Awaited<ReturnType<typeof readManagedProcesses>> = []
  let listeners: Awaited<ReturnType<typeof readManagedListeners>> = []
  let browserObserved = false
  let cleanupAbsent = false
  let testError: unknown = null

  try {
    start = await runJust('proof-start')
    expect(start.code).toBe(0)
    const stdoutLines = start.stdout.trim().split('\n').filter(Boolean)
    expect(stdoutLines).toHaveLength(1)
    handle = parseProofHandle(stdoutLines[0])
    const startEvent = JSON.parse(
      start.stderr.trim().split('\n').at(-1) ?? '{}'
    )
    expect(startEvent).toMatchObject({ event: 'runtime.start.succeeded' })
    expect(startEvent.readinessStatus).toBeGreaterThanOrEqual(200)
    expect(startEvent.readinessStatus).toBeLessThan(400)

    processes = await readManagedProcesses(handle.pid)
    listeners = await readManagedListeners(processes.map((entry) => entry.pid))
    const handlePort = Number(new URL(handle.url).port)
    expect(processes.length).toBeGreaterThan(0)
    expect(
      processes.every(
        (entry) =>
          entry.user === 'vscode' &&
          entry.realUid === 1000 &&
          entry.effectiveUid === 1000
      )
    ).toBe(true)
    expect(
      processes.some(
        (entry) =>
          entry.argv.filter((argument) => argument === BL001_FIXTURE).length ===
          1
      )
    ).toBe(true)
    expect(listeners).toEqual(
      expect.arrayContaining([expect.objectContaining({ port: handlePort })])
    )
    expect(
      listeners.every((entry) => ['127.0.0.1', '::1'].includes(entry.address))
    ).toBe(true)

    await page.goto(handle.url, { waitUntil: 'domcontentloaded' })
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
  } catch (error) {
    testError = error
  } finally {
    if (handle) {
      stop = await runJust('proof-stop', JSON.stringify(handle))
      cleanupAbsent = await auditHandleAbsent(handle)
      repeatedStop = await runJust('proof-stop', JSON.stringify(handle))
      if (!cleanupAbsent) {
        await stopWorkbenchProof(handle).catch(() => undefined)
        cleanupAbsent = await auditHandleAbsent(handle)
      }
    }

    const fixtureAfter = await snapshotFixture()
    const injectionAfter = await pathExists(BL001_INJECTION_SENTINEL)
    const disposableAfter = await listRelativePaths(BL001_ROOT)
    await mkdir(BL001_ROOT, { recursive: true })
    await writeFile(
      path.join(BL001_ROOT, 'episode.json'),
      JSON.stringify(
        {
          version: 1,
          host,
          prerequisites: { codeServer: CODE_SERVER_VERSION, chromium: true },
          timeoutsMs: {
            startup: 15_000,
            stop: 10_000,
            browser: BROWSER_TIMEOUT_MS,
            fullGate: 120_000,
          },
          commands: {
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
          argvPathPreserved: processes.some((entry) =>
            entry.argv.includes(BL001_FIXTURE)
          ),
          browser: {
            explorerSentinel: EXPLORER_SENTINEL,
            markdownFixture: MARKDOWN_FIXTURE,
            renderedSentinel: MARKDOWN_RENDERED_SENTINEL,
            observed: browserObserved,
          },
          fixture: {
            before: fixtureBefore,
            after: fixtureAfter,
            equal:
              JSON.stringify(fixtureBefore) === JSON.stringify(fixtureAfter),
          },
          injection: { before: injectionBefore, after: injectionAfter },
          disposable: {
            before: disposableBefore,
            after: disposableAfter,
            allowed: ['runs', 'episode.json'],
          },
          cleanup: {
            exactHandleAbsent: cleanupAbsent,
            firstStopExit: stop?.code ?? -1,
            repeatedStopExit: repeatedStop?.code ?? -1,
          },
          observedResult: testError ? 'failed' : 'passed',
        },
        null,
        2
      ) + '\n'
    )

    if (handle) {
      expect(stop?.code).toBe(0)
      expect(repeatedStop?.code).toBe(0)
      expect(cleanupAbsent).toBe(true)
    } else {
      expect((await listRelativePaths(BL001_RUN_ROOT)).length).toBe(0)
    }
    expect(fixtureAfter).toEqual(fixtureBefore)
    expect(injectionAfter).toBe(false)
    expect(disposableAfter.every((entry) => entry === 'runs')).toBe(true)
  }
  if (testError) throw testError
})
