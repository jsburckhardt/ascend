import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import {
  createApiServerController,
  type ApiServerController,
} from '../../apps/api/src/api-server.js'
import { resolveFrontDoorToken } from '../../apps/api/src/front-door-contract.js'
import {
  MVP_ARTIFACT_TIMEOUT_MS,
  MVP_COLD_CLEANUP_TIMEOUT_MS,
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_COLD_TIMEOUT_MS,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_RESULT_ROOT,
  MVP_WARM_ORDER,
  MVP_WARM_TARGET_MS,
  MVP_WARM_TIMEOUT_MS,
  digestMvpPerformance,
  type MvpAttempt,
  type MvpPlan,
} from '../../apps/api/src/mvp-performance-contract.js'
import { createProjectLibrary } from '../../apps/api/src/project-library.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  type RuntimeSnapshot,
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
import { terminateExactProcessGroup } from '../../apps/api/src/workbench-proof-runtime.js'
import { createWorkbenchProxyManager } from '../../apps/api/src/workbench-proxy-manager.js'
import { BL014_FIXTURES } from '../../apps/api/src/session-switching-contract.js'

const runId = process.env.BL015_RUN_ID ?? ''
const designated = process.env.BL015_DESIGNATED === '1' && runId.length > 0
const execute = promisify(execFile)
const nowNs = () => process.hrtime.bigint()
const resultRoot = path.join(MVP_PERFORMANCE_RESULT_ROOT, runId)
const runRoot = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId)
const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
const operationMs = 30_000
interface Fixture {
  key: 'A' | 'B' | 'C'
  id: string
  name: string
  branch: string
  fileName: string
  canonicalPath: string
  createdAt: number
}
const port = async () => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('port-unavailable')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}
const load = async () => {
  const [loadText, memoryText] = await Promise.all([
    readFile('/proc/loadavg', 'utf8'),
    readFile('/proc/meminfo', 'utf8'),
  ])
  return {
    load: loadText.trim().split(/\s+/u).slice(0, 3).map(Number),
    availableMemoryKiB: Number(
      memoryText.match(/^MemAvailable:\s+([0-9]+)\s+kB$/mu)?.[1]
    ),
  }
}
const withBound = async <T>(
  promise: Promise<T>,
  milliseconds: number,
  label: string
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(label)), milliseconds)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
const phaseRows = (events: MvpAttempt['eventsNs']) => {
  const names = [
    'activation',
    'runtime-start-requested',
    'runtime-health-ready',
    'stable-document-ready',
    'explorer-sentinel-ready',
    'terminal-prompt-ready',
    'workbench-usable',
  ] as const
  const result: Record<string, string> = {}
  for (let index = 1; index < names.length; index += 1) {
    const before = events[names[index - 1]!],
      after = events[names[index]!]
    if (before && after)
      result[names[index - 1] + '-to-' + names[index]] = String(
        BigInt(after) - BigInt(before)
      )
  }
  if (events.activation && events['workbench-usable'])
    result.total = String(
      BigInt(events['workbench-usable']) - BigInt(events.activation)
    )
  return result
}
const readyTerminal = async (page: Page, fixture: Fixture) => {
  const terminals = page.locator('.terminal.xterm')
  const previous = await terminals.count()
  await page.keyboard.press('F1')
  await expect(page.locator('.quick-input-widget')).toBeVisible({
    timeout: operationMs,
  })
  await page.keyboard.insertText('Terminal: Create New Terminal')
  await page.locator('.quick-input-list .monaco-list-row').first().click()
  await expect
    .poll(() => terminals.count(), { timeout: operationMs })
    .toBeGreaterThan(previous)
  const terminal = page.locator('.terminal.xterm:visible').last()
  await expect
    .poll(
      async () => {
        const text = (await terminal.innerText()).replace(/\s/gu, '')
        return (
          text.includes(fixture.canonicalPath) && text.includes(fixture.branch)
        )
      },
      { timeout: operationMs }
    )
    .toBe(true)
  const input = terminal.locator('textarea.xterm-helper-textarea')
  await input.focus()
  await expect(input).toBeFocused({ timeout: operationMs })
}
const publicIdentity = (snapshot: RuntimeSnapshot) => ({
  projectToken: snapshot.ownerToken,
  identityDigest: digestMvpPerformance({
    pid: snapshot.pid,
    start: snapshot.processStartTime,
    port: snapshot.port,
  }),
  pidDigest: digestMvpPerformance(snapshot.pid),
  startDigest: digestMvpPerformance(snapshot.processStartTime),
  portToken: digestMvpPerformance({ runId, port: snapshot.port }).slice(0, 24),
})
const stopWeb = async (web: ChildProcessWithoutNullStreams | undefined) => {
  if (web?.pid)
    await terminateExactProcessGroup(web.pid, 5_000).catch(() => undefined)
}

test.describe.configure({ mode: 'serial', retries: 0 })
test('records five cold and ten warm controller-observed usable consequences', async ({
  browser,
}) => {
  test.skip(!designated, 'Set BL015_DESIGNATED=1 and BL015_RUN_ID')
  test.setTimeout(900_000)
  await mkdir(runRoot, { recursive: true })
  await mkdir(resultRoot, { recursive: true })
  const plan = JSON.parse(
    await readFile(path.join(runRoot, 'plan.json'), 'utf8')
  ) as MvpPlan
  const fixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), 'ascend-bl015-navigation-')
  )
  const fixtures = await Promise.all(
    BL014_FIXTURES.map(async (definition, index): Promise<Fixture> => {
      const canonicalPath = path.join(fixtureRoot, definition.key.toLowerCase())
      await mkdir(canonicalPath)
      await writeFile(
        path.join(canonicalPath, definition.fileName),
        definition.editorSentinel + '\n'
      )
      await execute('git', ['init', '-b', definition.branch], {
        cwd: canonicalPath,
      })
      await execute('git', ['config', 'user.email', 'bl015@example.invalid'], {
        cwd: canonicalPath,
      })
      await execute('git', ['config', 'user.name', 'BL015 Fixture'], {
        cwd: canonicalPath,
      })
      await execute('git', ['add', definition.fileName], { cwd: canonicalPath })
      await execute('git', ['commit', '-m', 'fixture'], { cwd: canonicalPath })
      return { ...definition, canonicalPath, createdAt: index + 1 }
    })
  )
  const byKey = new Map(fixtures.map((fixture) => [fixture.key, fixture]))
  const databasePath = path.join(fixtureRoot, 'ascend.sqlite')
  const library = await createProjectLibrary(databasePath)
  for (const fixture of fixtures) await library.create(fixture)
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
  })
  let activeEvents: MvpAttempt['eventsNs'] | null = null
  let activeSnapshot: RuntimeSnapshot | null = null
  const instrumented: ProjectRuntimeManager = {
    ...runtime,
    start: async (input) => {
      if (activeEvents)
        activeEvents['runtime-start-requested'] = nowNs().toString()
      const snapshot = await runtime.start(input)
      activeSnapshot = snapshot
      if (activeEvents)
        activeEvents['runtime-health-ready'] = nowNs().toString()
      return snapshot
    },
  }
  let controller: ApiServerController | undefined
  let web: ChildProcessWithoutNullStreams | undefined
  let webStart: string | null = null
  let apiPort = 0
  let webPort = 0
  const attempts: MvpAttempt[] = []
  const restricted: Array<Record<string, unknown>> = []
  const artifactManifest: Array<Record<string, unknown>> = []
  try {
    controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => instrumented,
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          frontDoorToken: resolveFrontDoorToken(),
        }),
      createProjectRegistration: async () => ({
        register: async () => ({
          disposition: 'existing',
          project: fixtures[0]!,
        }),
        close: () => undefined,
      }),
    })
    const app = await controller.start()
    const address = app.server.address()
    if (!address || typeof address === 'string')
      throw new Error('api-listener-unavailable')
    apiPort = address.port
    webPort = await port()
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
          ASCEND_E2E_API_TARGET: 'http://127.0.0.1:' + apiPort,
          ASCEND_E2E_DISABLE_HMR: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    )
    webStart = await readProcessStartTime(web.pid!)
    const origin = 'http://127.0.0.1:' + webPort
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
    const perform = async (
      kind: 'cold' | 'warm',
      projectKey: 'A' | 'B' | 'C',
      ordinal: number,
      context: BrowserContext,
      page: Page,
      initialIdentity: Map<string, string>
    ) => {
      const fixture = byKey.get(projectKey)!
      const attemptId =
        kind +
        '-' +
        String(kind === 'cold' ? ordinal : ordinal - 5) +
        '-' +
        projectKey
      const events: MvpAttempt['eventsNs'] = {}
      activeEvents = events
      activeSnapshot = null
      const traffic: Array<Record<string, unknown>> = []
      const requestListener = (request: import('@playwright/test').Request) => {
        const parsed = new URL(request.url())
        traffic.push({
          method: request.method(),
          path: parsed.pathname,
          kind: request.resourceType(),
        })
      }
      page.on('request', requestListener)
      const pre = await load()
      const preSnapshot = runtime.inspect(fixture.id)
      const targetMs = kind === 'cold' ? MVP_COLD_TARGET_MS : MVP_WARM_TARGET_MS
      const timeoutMs =
        kind === 'cold' ? MVP_COLD_TIMEOUT_MS : MVP_WARM_TIMEOUT_MS
      const screenshot = path.join(resultRoot, attemptId + '.png'),
        trace = path.join(resultRoot, attemptId + '.zip')
      let snapshot: RuntimeSnapshot | null = null
      let status: MvpAttempt['status'] = 'success'
      let failureClass: string | null = null
      let homeReturned = false
      await context.tracing.startChunk({ title: attemptId })
      try {
        await withBound(
          (async () => {
            const button = page.getByRole('button', {
              name: 'Open ' + fixture.name,
            })
            await button.focus()
            events.activation = nowNs().toString()
            await page.keyboard.press('Enter')
            await expect(page).toHaveURL(
              origin + '/projects/' + fixture.id + '/workbench/',
              { timeout: operationMs }
            )
            await expect
              .poll(() => events['runtime-health-ready'] ?? null, {
                timeout: operationMs,
              })
              .not.toBeNull()
            await page
              .locator('.monaco-workbench')
              .waitFor({ state: 'visible', timeout: operationMs })
            events['stable-document-ready'] = nowNs().toString()
            await expect(
              page.getByText(fixture.fileName, { exact: true }).first()
            ).toBeVisible({ timeout: operationMs })
            events['explorer-sentinel-ready'] = nowNs().toString()
            await readyTerminal(page, fixture)
            events['terminal-prompt-ready'] = nowNs().toString()
            events['workbench-usable'] =
              BigInt(events['explorer-sentinel-ready']!) >
              BigInt(events['terminal-prompt-ready']!)
                ? events['explorer-sentinel-ready']
                : events['terminal-prompt-ready']
            snapshot = runtime.inspect(fixture.id) ?? null
            if (!snapshot) throw new Error('runtime-identity-missing')
          })(),
          timeoutMs,
          'attempt-timeout'
        )
      } catch (error) {
        failureClass = error instanceof Error ? error.message : 'attempt-failed'
        status =
          failureClass === 'attempt-timeout'
            ? 'timeout'
            : events.activation
              ? 'failed'
              : 'pre-start-failed'
      }
      snapshot =
        snapshot ?? activeSnapshot ?? runtime.inspect(fixture.id) ?? null
      activeEvents = null
      activeSnapshot = null
      const capture: MvpAttempt['artifacts'] = {
        screenshot: 'captured',
        trace: 'captured',
        network: 'captured',
        manifestId: digestMvpPerformance({ runId, attemptId }),
      }
      try {
        await withBound(
          page.screenshot({ path: screenshot }),
          MVP_ARTIFACT_TIMEOUT_MS,
          'screenshot-timeout'
        )
        await chmod(screenshot, 0o600)
      } catch {
        capture.screenshot = 'failed'
      }
      try {
        await withBound(
          context.tracing.stopChunk({ path: trace }),
          MVP_ARTIFACT_TIMEOUT_MS,
          'trace-timeout'
        )
        await chmod(trace, 0o600)
      } catch {
        capture.trace = 'failed'
      }
      if (!traffic.length) capture.network = 'failed'
      if (
        status === 'success' &&
        (capture.screenshot !== 'captured' ||
          capture.trace !== 'captured' ||
          capture.network !== 'captured')
      ) {
        status = 'failed'
        failureClass = 'artifact-capture-failed'
      }
      const observedTotal =
        events.activation && events['workbench-usable']
          ? String(
              BigInt(events['workbench-usable']) - BigInt(events.activation)
            )
          : null
      const statisticalTotal =
        status === 'timeout'
          ? String(BigInt(timeoutMs) * 1_000_000n)
          : status === 'success'
            ? observedTotal
            : null
      let boundaryPassed = false
      let residuals = 0
      if (
        kind === 'cold' &&
        snapshot?.pid &&
        snapshot.processStartTime &&
        snapshot.port
      ) {
        try {
          await terminateExactProcessGroup(
            snapshot.pid,
            MVP_COLD_CLEANUP_TIMEOUT_MS
          )
        } catch {
          /* measured below */
        }
        const processResidual =
          (await readProcessStartTime(snapshot.pid)) ===
          snapshot.processStartTime
            ? 1
            : 0
        const listenerResidual = (await loopbackListenerIsAbsent(snapshot.port))
          ? 0
          : 1
        residuals = processResidual + listenerResidual
        boundaryPassed = residuals === 0
      } else if (kind === 'cold') {
        residuals = 1
        boundaryPassed = false
      }
      if (kind === 'warm' && snapshot) {
        const expected = initialIdentity.get(projectKey)
        boundaryPassed = publicIdentity(snapshot).identityDigest === expected
        residuals = boundaryPassed ? 0 : 1
        try {
          const projects = page.getByRole('link', { name: 'Projects' })
          await projects.focus()
          await page.keyboard.press('Enter')
          await expect(page).toHaveURL(origin + '/', { timeout: operationMs })
          homeReturned = true
        } catch {
          boundaryPassed = false
          residuals += 1
        }
      } else if (kind === 'warm') {
        residuals = 1
        boundaryPassed = false
      }
      if (!boundaryPassed && status === 'success') {
        status = 'failed'
        failureClass = kind + '-boundary-failed'
      }
      const row: MvpAttempt = {
        schemaVersion: 1,
        runId,
        planHash: plan.planHash,
        attemptId,
        kind,
        ordinal,
        project: projectKey,
        retry: 0,
        startedAt: new Date().toISOString(),
        host: { hostname: os.hostname(), uid: os.userInfo().uid, cgroup: 'v2' },
        versions: {
          node: process.version,
          chromium: browser.version(),
          codeServer: '4.131.0',
        },
        browser: {
          context: kind === 'cold' ? 'fresh' : 'retained',
          cache: kind === 'cold' ? 'cleared' : 'retained',
          originStorage: kind === 'cold' ? 'cleared' : 'retained',
          prewarmedRuntime: kind === 'cold' && preSnapshot?.state === 'running',
        },
        precheck: {
          passed:
            kind === 'cold'
              ? preSnapshot?.state !== 'running'
              : preSnapshot?.state === 'running',
          load: pre.load,
          availableMemoryKiB: pre.availableMemoryKiB,
        },
        runtime: snapshot ? publicIdentity(snapshot) : null,
        stableUrl: '/projects/' + fixture.id + '/workbench/',
        clock: 'process.hrtime.bigint',
        eventsNs: events,
        phasesNs: phaseRows(events),
        observedTotalNs: observedTotal,
        statisticalTotalNs: statisticalTotal,
        status,
        failureClass,
        targetMs,
        targetMet:
          status === 'success' &&
          observedTotal !== null &&
          Number(BigInt(observedTotal)) / 1_000_000 <= targetMs,
        artifacts: capture,
        boundary: {
          kind: kind === 'cold' ? 'absence' : 'reuse',
          passed: boundaryPassed,
          measuredResiduals: residuals,
          expectedIdentityCount: kind === 'cold' ? 0 : 1,
        },
        homeReturned,
      }
      attempts.push(row)
      artifactManifest.push({
        attemptId,
        manifestId: capture.manifestId,
        screenshot: {
          status: capture.screenshot,
          digest:
            capture.screenshot === 'captured'
              ? digestMvpPerformance(await readFile(screenshot))
              : null,
        },
        trace: {
          status: capture.trace,
          digest:
            capture.trace === 'captured'
              ? digestMvpPerformance(await readFile(trace))
              : null,
        },
        network: {
          status: capture.network,
          entries: traffic.map(({ method, path, kind }) => ({
            method,
            pathDigest: digestMvpPerformance(path),
            kind,
          })),
        },
      })
      if (snapshot)
        restricted.push({
          attemptId,
          canonicalPath: fixture.canonicalPath,
          internalUrl: snapshot.internalUrl,
          pid: snapshot.pid,
          processStartTime: snapshot.processStartTime,
          port: snapshot.port,
          screenshot,
          trace,
          network: traffic,
        })
      page.off('request', requestListener)
    }
    for (const [index, key] of MVP_COLD_ORDER.entries()) {
      const context = await browser.newContext({ serviceWorkers: 'block' })
      await context.clearCookies()
      await context.tracing.start({ screenshots: true, snapshots: true })
      const page = await context.newPage()
      await page.goto(origin + '/', {
        waitUntil: 'domcontentloaded',
        timeout: operationMs,
      })
      await perform('cold', key, index + 1, context, page, new Map())
      await context.close()
    }
    const warmIdentity = new Map<string, string>()
    for (const key of ['B', 'C', 'A'] as const) {
      const fixture = byKey.get(key)!
      const snapshot = await runtime.start({
        projectId: fixture.id,
        canonicalPath: fixture.canonicalPath,
      })
      warmIdentity.set(key, publicIdentity(snapshot).identityDigest)
    }
    const warmContext = await browser.newContext({ serviceWorkers: 'block' })
    await warmContext.tracing.start({ screenshots: true, snapshots: true })
    const warmPage = await warmContext.newPage()
    await warmPage.goto(origin + '/', {
      waitUntil: 'domcontentloaded',
      timeout: operationMs,
    })
    for (const [index, key] of MVP_WARM_ORDER.entries())
      await perform('warm', key, index + 6, warmContext, warmPage, warmIdentity)
    await warmContext.close()
    await writeFile(
      path.join(runRoot, 'attempts.json'),
      JSON.stringify(
        { schemaVersion: 1, runId, planHash: plan.planHash, attempts },
        null,
        2
      ) + '\n'
    )
    await writeFile(
      path.join(runRoot, 'browser-artifacts.json'),
      JSON.stringify(
        { schemaVersion: 1, runId, artifacts: artifactManifest },
        null,
        2
      ) + '\n'
    )
  } finally {
    activeEvents = null
    activeSnapshot = null
    try {
      await controller?.stop()
    } catch {
      /* best effort */
    }
    await stopWeb(web)
    try {
      await library.close()
    } catch {
      /* best effort */
    }
    await writeFile(
      restrictedPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          runId,
          fixtureRoot,
          databasePath,
          api: { port: apiPort },
          web: { pid: web?.pid, processStartTime: webStart, port: webPort },
          attempts: restricted,
        },
        null,
        2
      ) + '\n',
      { mode: 0o600 }
    )
    await chmod(restrictedPath, 0o600)
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})
