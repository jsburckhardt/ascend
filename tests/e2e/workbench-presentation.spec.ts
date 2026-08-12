import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test'
import { BrowserEventObserver } from '../../apps/api/src/workbench-presentation-browser-events.js'
import {
  checkPresentationPrerequisites,
  coordinatePresentationAttempts,
} from '../../apps/api/src/workbench-presentation-coordinator.js'
import {
  PRESENTATION_ASSERTION_IDS,
  PRESENTATION_VIEWPORT,
  WORKBENCH_PRESENTATION_COMPARISON,
  WORKBENCH_PRESENTATION_EVIDENCE_ROOT,
  WORKBENCH_PRESENTATION_GENERATED_ROOT,
  validateAttemptRecord,
  validateComparisonRecord,
  type PresentationAssertionId,
  type PresentationAttemptRecord,
  type PresentationCandidate,
  type PresentationPrerequisite,
} from '../../apps/api/src/workbench-presentation-contract.js'
import {
  FixedScenarioAssertionError,
  runFixedPresentationScenario,
} from '../../apps/api/src/workbench-presentation-scenario.js'
import { selectPresentation } from '../../apps/api/src/workbench-presentation-selector.js'
import { auditHandleCleanup } from '../../apps/api/src/workbench-proof-audit.js'
import {
  BL001_FIXTURE,
  BL001_RUN_ROOT,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
  REPOSITORY_ROOT,
  TERMINAL_TOOL_COMMANDS,
  canonicalFixturePath,
  classifyPathEnvironment,
  snapshotFixture,
  type TerminalCommandSpec,
} from '../../apps/api/src/workbench-proof-contract.js'
import {
  readProcessStartTime,
  startWorkbenchProof,
  stopWorkbenchProof,
  terminateExactProcessGroup,
  type ProofHandle,
} from '../../apps/api/src/workbench-proof-runtime.js'
import {
  captureTerminalContext,
  preflightFixedExecutables,
  writeJsonAtomic,
  type TerminalRawEvidence,
  type TrackedTerminalCommandIdentity,
} from '../../apps/api/src/workbench-proof-terminal.js'
import {
  attachBrowserEventObserver,
  createPresentationAdapter,
  presentationWorkbenchActions,
  type WorkbenchTarget,
} from './workbench-presentation-support.js'

const designated = process.env.BL003_DESIGNATED === '1'
test.describe.configure({ mode: 'serial', retries: 0 })

const exists = async (target: string): Promise<boolean> => {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}
const codeServerVersion = async (): Promise<string> => {
  const { spawn } = await import('node:child_process')
  return new Promise((resolve, reject) => {
    const child = spawn(CODE_SERVER_PATH, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      output += chunk
    })
    child.once('error', reject)
    child.once('close', (code) =>
      code === 0
        ? resolve(output.trim().split(/\s+/u)[0])
        : reject(new Error('code-server version check failed'))
    )
  })
}
const commandByKey = (evidence: TerminalRawEvidence, key: string) => {
  const command = evidence.commands.find((entry) => entry.key === key)
  if (!command) throw new Error('Missing terminal evidence for ' + key)
  return command
}
const processGroupAbsent = (pgid: number): boolean => {
  try {
    process.kill(-pgid, 0)
    return false
  } catch {
    return true
  }
}
const readTracker = async (
  target: string
): Promise<TrackedTerminalCommandIdentity[]> => {
  if (!(await exists(target))) return []
  const value = JSON.parse(await readFile(target, 'utf8')) as {
    owner: TrackedTerminalCommandIdentity
    processGroupLeader: TrackedTerminalCommandIdentity
    commands: TrackedTerminalCommandIdentity[]
  }
  return [value.owner, value.processGroupLeader, ...value.commands]
}
const cancelAndAuditCommands = async (
  identities: readonly TrackedTerminalCommandIdentity[]
): Promise<boolean> => {
  const groups = new Map<number, TrackedTerminalCommandIdentity>()
  for (const identity of identities)
    if (identity.pid === identity.pgid) groups.set(identity.pgid, identity)
  for (const identity of [...groups.values()].reverse()) {
    if ((await readProcessStartTime(identity.pid)) === identity.startTimeTicks)
      await terminateExactProcessGroup(identity.pgid, 1_000)
  }
  return (
    await Promise.all(
      identities.map(
        async (identity) =>
          (await readProcessStartTime(identity.pid)) !== identity.startTimeTicks
      )
    )
  ).every(Boolean)
}
const assertionMap = (): Record<PresentationAssertionId, boolean> =>
  Object.fromEntries(
    PRESENTATION_ASSERTION_IDS.map((id) => [id, false])
  ) as Record<PresentationAssertionId, boolean>
const parity = (
  direct: TerminalRawEvidence,
  integrated: TerminalRawEvidence,
  canonicalPath: string
) => {
  const identity =
    commandByKey(direct, 'hostname').normalized.stdout ===
      commandByKey(integrated, 'hostname').normalized.stdout &&
    commandByKey(direct, 'user').normalized.stdout === 'vscode\n' &&
    commandByKey(integrated, 'user').normalized.stdout === 'vscode\n'
  const pathParity =
    commandByKey(integrated, 'cwd').normalized.stdout ===
      canonicalPath + '\n' &&
    classifyPathEnvironment(
      direct.environment.PATH,
      integrated.environment.PATH,
      direct.environment.resolutions,
      integrated.environment.resolutions
    ) !== 'unexplained failure-causing difference'
  const tools = TERMINAL_TOOL_COMMANDS.every(
    (specification: TerminalCommandSpec) => {
      const left = commandByKey(direct, specification.key)
      const right = commandByKey(integrated, specification.key)
      return (
        left.exitResult === right.exitResult &&
        left.normalized.stdout === right.normalized.stdout &&
        left.normalized.stderr === right.normalized.stderr
      )
    }
  )
  return { identity, path: pathParity, tools }
}

const prerequisiteProbe =
  (browser: Browser) =>
  async (
    name: PresentationPrerequisite
  ): Promise<{ passed: boolean; detail: string }> => {
    try {
      if (name === 'ubuntu-24.04') {
        const release = await readFile('/etc/os-release', 'utf8')
        const version = release.match(/^VERSION_ID="?([^"\n]+)"?$/mu)?.[1]
        return { passed: version === '24.04', detail: version ?? 'unavailable' }
      }
      if (name === 'non-root-vscode-user')
        return {
          passed:
            os.userInfo().username === 'vscode' && os.userInfo().uid !== 0,
          detail: os.userInfo().username + '/' + String(os.userInfo().uid),
        }
      if (name === 'merged-bl-001-bl-002-proof') {
        await canonicalFixturePath()
        await snapshotFixture()
        await preflightFixedExecutables(process.env.PATH ?? '')
        return {
          passed: true,
          detail:
            'canonical fixture, lifecycle, and terminal parity capabilities present',
        }
      }
      if (name === 'code-server-4.131.0') {
        const version = await codeServerVersion()
        return { passed: version === CODE_SERVER_VERSION, detail: version }
      }
      if (name === 'repository-chromium-desktop-build')
        return {
          passed:
            browser.browserType().name() === 'chromium' &&
            Boolean(browser.version()),
          detail: browser.browserType().name() + '/' + browser.version(),
        }
      const context = await browser.newContext({
        viewport: PRESENTATION_VIEWPORT,
      })
      const page = await context.newPage()
      const passed =
        page.viewportSize()?.width === 1440 &&
        page.viewportSize()?.height === 900
      await context.close()
      return {
        passed,
        detail: passed ? '1440x900' : 'viewport creation failed',
      }
    } catch (error) {
      return {
        passed: false,
        detail:
          error instanceof Error
            ? error.message
            : 'unknown prerequisite failure',
      }
    }
  }

const runRealAttempt = async (
  browser: Browser,
  candidate: PresentationCandidate,
  attempt: number
): Promise<{ record: PresentationAttemptRecord; recordReference: string }> => {
  const runId = randomUUID()
  const contextId = randomUUID()
  const disposableArea = path.join(
    WORKBENCH_PRESENTATION_GENERATED_ROOT,
    'disposable',
    runId
  )
  const rawRoot = path.join(WORKBENCH_PRESENTATION_GENERATED_ROOT, 'raw', runId)
  const directPath = path.join(rawRoot, 'direct.raw.json')
  const integratedPath = path.join(rawRoot, 'integrated.raw.json')
  const identitiesPath = path.join(
    rawRoot,
    'integrated-command-identities.json'
  )
  const browserEventsPath = path.join(
    WORKBENCH_PRESENTATION_EVIDENCE_ROOT,
    'browser-events',
    candidate + '-' + String(attempt) + '.json'
  )
  const attemptPath = path.join(
    WORKBENCH_PRESENTATION_EVIDENCE_ROOT,
    'attempts',
    candidate + '-' + String(attempt) + '.json'
  )
  await mkdir(disposableArea, { recursive: true })
  const fixtureBefore = await snapshotFixture()
  const canonicalPath = await canonicalFixturePath()
  const observer = new BrowserEventObserver()
  const functional = assertionMap()
  const failedAssertions: PresentationAttemptRecord['failedAssertions'] = []
  let handle: ProofHandle | null = null
  let context: BrowserContext | null = null
  let page: Page | null = null
  let target: WorkbenchTarget | null = null
  let adapter: Awaited<ReturnType<typeof createPresentationAdapter>> | null =
    null
  let direct: TerminalRawEvidence | null = null
  let integrated: TerminalRawEvidence | null = null
  let navigationStartMs: number | null = null
  let scenarioCompletionMs: number | null = null
  let browserContextClosed = false
  let terminalCommandsAbsent = true
  let operationError: unknown = null
  const priorStateAbsent =
    !(await exists(BL001_RUN_ROOT)) ||
    (await readdir(BL001_RUN_ROOT)).length === 0

  try {
    const started = await startWorkbenchProof({
      environmentOverrides: {
        ASCEND_PROOF_INTEGRATED_EVIDENCE: integratedPath,
        ASCEND_PROOF_COMMAND_IDENTITIES: identitiesPath,
      },
    })
    handle = started.handle
    context = await browser.newContext({
      viewport: PRESENTATION_VIEWPORT,
      permissions: ['clipboard-read', 'clipboard-write'],
      storageState: { cookies: [], origins: [] },
    })
    page = await context.newPage()
    attachBrowserEventObserver(page, observer)
    adapter = await createPresentationAdapter(candidate, page, handle.url)
    const actions = presentationWorkbenchActions(page, () => {
      if (!target) throw new Error('Workbench target is unavailable')
      return target
    })
    const scenario = await runFixedPresentationScenario({
      candidate,
      navigate: async () => {
        const result = await adapter!.navigate()
        target = result.target
        return result.status
      },
      ...actions,
      runTerminalParity: async () => {
        direct = await captureTerminalContext({
          context: 'direct',
          cwd: canonicalPath,
        })
        await writeJsonAtomic(directPath, direct)
        const terminalInput = page!
          .getByRole('textbox', { name: /^Terminal /u })
          .first()
        await expect(terminalInput).toBeAttached({ timeout: 10_000 })
        await terminalInput.focus()
        const command = `setsid \"${path.join(
          REPOSITORY_ROOT,
          'node_modules/.bin/tsx'
        )}\" \"${path.join(
          REPOSITORY_ROOT,
          'apps/api/src/cli/proof-terminal-integrated.ts'
        )}\" && printf BL003_TERMINAL_COMPLETE\n`
        await page!.keyboard.insertText(command)
        await page!.keyboard.press('Enter')
        const deadline = Date.now() + 45_000
        while (Date.now() < deadline && !(await exists(integratedPath)))
          await page!.waitForTimeout(25)
        if (!(await exists(integratedPath)))
          throw new Error('Integrated terminal evidence was not produced')
        const rows = target!.locator('.xterm-rows').last()
        await expect(rows).toContainText('BL003_TERMINAL_COMPLETE', {
          timeout: 5_000,
        })
        integrated = JSON.parse(
          await readFile(integratedPath, 'utf8')
        ) as TerminalRawEvidence
        return parity(direct, integrated, canonicalPath)
      },
      workbenchWebSocketUsable: () => observer.workbenchWebSocketUsable(),
      markInteractionStart: () => observer.markInteractionStart(),
      markTerminalCompletion: () => observer.markTerminalCompletion(),
    })
    Object.assign(functional, scenario.assertions)
    navigationStartMs = scenario.navigationStartMs
    scenarioCompletionMs = scenario.scenarioCompletionMs
  } catch (error) {
    operationError = error
    if (error instanceof FixedScenarioAssertionError) {
      Object.assign(functional, error.assertions)
      navigationStartMs = error.navigationStartMs
    }
  }

  let adapterClosed = true
  try {
    await adapter?.close()
  } catch {
    adapterClosed = false
  }
  const tracked = await readTracker(identitiesPath)
  for (const evidence of [direct, integrated])
    for (const command of evidence?.commands ?? [])
      tracked.push({
        pid: command.process.pid,
        pgid: command.process.pid,
        startTimeTicks: command.process.startTimeTicks,
        command: command.command,
        context: command.context,
      })
  try {
    terminalCommandsAbsent = await cancelAndAuditCommands(tracked)
  } catch {
    terminalCommandsAbsent = false
  }
  if (context) {
    try {
      await context.close()
      browserContextClosed = true
    } catch {
      browserContextClosed = false
    }
  }
  let exactProcessAbsent = handle === null
  let listenerAbsent = handle === null
  if (handle) {
    try {
      await stopWorkbenchProof(handle)
      const audit = await auditHandleCleanup(handle)
      exactProcessAbsent = audit.exactProcessAbsent
      listenerAbsent = audit.listenerAbsent
    } catch {
      exactProcessAbsent = false
      listenerAbsent = false
    }
  }
  const processAbsent = handle ? processGroupAbsent(handle.pid) : true
  await rm(disposableArea, { recursive: true, force: true })
  const disposableRemoved = !(await exists(disposableArea))
  let fixtureAfter = fixtureBefore
  let fixturePresent = true
  try {
    fixtureAfter = await snapshotFixture()
  } catch {
    fixturePresent = false
  }
  const treeMembershipEqual =
    fixturePresent &&
    JSON.stringify(fixtureAfter.paths) === JSON.stringify(fixtureBefore.paths)
  const sentinelBytesEqual =
    fixturePresent &&
    JSON.stringify(fixtureAfter.sentinelHashes) ===
      JSON.stringify(fixtureBefore.sentinelHashes)
  const cleanup = {
    browserContextClosed,
    terminalCommandsAbsent,
    processGroupAbsent: processAbsent,
    exactProcessAbsent,
    listenerAbsent,
    disposableRemoved,
    fixturePresentUnchanged:
      fixturePresent && treeMembershipEqual && sentinelBytesEqual,
  }
  functional['browser-event-evidence'] = true
  functional['fixture-tree-integrity'] = treeMembershipEqual
  functional['fixture-sentinel-integrity'] = sentinelBytesEqual
  functional['cleanup-context'] = browserContextClosed
  functional['cleanup-terminal-commands'] = terminalCommandsAbsent
  functional['cleanup-process-group'] = processAbsent
  functional['cleanup-process'] = exactProcessAbsent
  functional['cleanup-listener'] = listenerAbsent
  functional['cleanup-disposable'] = disposableRemoved && adapterClosed
  functional['cleanup-fixture-present'] = fixturePresent
  const requiredEvidence =
    (await exists(directPath)) && (await exists(integratedPath))
  const integrityPassed =
    fixturePresent && treeMembershipEqual && sentinelBytesEqual
  const cleanupPassed = Object.values(cleanup).every(Boolean) && adapterClosed
  for (const id of PRESENTATION_ASSERTION_IDS)
    if (!functional[id])
      failedAssertions.push({
        id,
        error:
          operationError instanceof Error
            ? operationError.message
            : 'Required observable outcome was not reached',
      })
  observer.reconcileRetainedEvidence({
    previewRendered: functional['preview-rendered'],
  })
  const warningCounts = observer.totals()
  await writeJsonAtomic(browserEventsPath, {
    version: 1,
    candidate,
    attempt,
    runId,
    events: observer.events,
  })
  const finalStatus =
    !operationError &&
    Object.values(functional).every(Boolean) &&
    requiredEvidence &&
    cleanupPassed &&
    integrityPassed
      ? 'passed'
      : 'failed'
  const record: PresentationAttemptRecord = {
    version: 1,
    candidate,
    attempt,
    runId,
    chromiumVersion: browser.version(),
    startStatus: 'started',
    finalStatus,
    failedAssertions,
    timing: { navigationStartMs, scenarioCompletionMs },
    assertions: {
      functional,
      requiredEvidence,
      cleanup: cleanupPassed,
      integrity: integrityPassed,
    },
    evidence: {
      rawBrowserEvents: path.relative(REPOSITORY_ROOT, browserEventsPath),
      terminalDirect: path.relative(REPOSITORY_ROOT, directPath),
      terminalIntegrated: path.relative(REPOSITORY_ROOT, integratedPath),
    },
    warningCounts,
    freshness: {
      workbenchRunId: handle?.runId ?? randomUUID(),
      processPid: handle?.pid ?? -1,
      processGroup: handle?.pid ?? -1,
      browserContextId: contextId,
      disposableArea: path.relative(REPOSITORY_ROOT, disposableArea),
      priorStateAbsent,
    },
    cleanup,
    integrity: { fixturePresent, treeMembershipEqual, sentinelBytesEqual },
    sharedInputs: {
      fixture: BL001_FIXTURE,
      codeServerVersion: CODE_SERVER_VERSION,
      chromiumName: 'chromium',
      chromiumVersion: browser.version(),
      viewport: PRESENTATION_VIEWPORT,
    },
  }
  validateAttemptRecord(record)
  await writeJsonAtomic(attemptPath, record)
  return {
    record,
    recordReference: path.relative(REPOSITORY_ROOT, attemptPath),
  }
}

test('runs the designated six-attempt browser workbench presentation comparison', async ({
  browser,
}) => {
  test.skip(!designated, 'Run through just proof-workbench-presentation')
  test.setTimeout(600_000)
  await rm(WORKBENCH_PRESENTATION_GENERATED_ROOT, {
    recursive: true,
    force: true,
  })
  await rm(WORKBENCH_PRESENTATION_EVIDENCE_ROOT, {
    recursive: true,
    force: true,
  })
  const comparisonId = 'b1000003-0000-4000-8000-000000000009'
  const prerequisites = await checkPresentationPrerequisites(
    prerequisiteProbe(browser)
  )
  const coordinated = await coordinatePresentationAttempts({
    prerequisiteStopReason: prerequisites.stopReason,
    runAttempt: (slot) => runRealAttempt(browser, slot.candidate, slot.attempt),
  })
  const selection = selectPresentation(coordinated.records)
  const release = await readFile('/etc/os-release', 'utf8')
  const comparison = validateComparisonRecord({
    version: 1,
    comparisonId,
    prerequisites: prerequisites.results,
    host: {
      ubuntuVersion:
        release.match(/^PRETTY_NAME="?([^"\n]+)"?$/mu)?.[1] ?? 'unknown',
      hostname: os.hostname(),
      user: os.userInfo().username,
      chromiumName: 'chromium',
      chromiumVersion: browser.version(),
      codeServerVersion: await codeServerVersion(),
      viewport: PRESENTATION_VIEWPORT,
    },
    slots: coordinated.slots,
    candidates: selection.candidates,
    stopReason: coordinated.stopReason ?? prerequisites.stopReason,
    selectedCandidate: selection.selectedCandidate,
    disposition: selection.disposition,
  })
  await writeJsonAtomic(WORKBENCH_PRESENTATION_COMPARISON, comparison)
  expect(coordinated.records).toHaveLength(6)
  expect(coordinated.slots.every((slot) => slot.status === 'started')).toBe(
    true
  )
  expect(selection.exitCode, JSON.stringify(comparison, null, 2)).toBe(0)
})
