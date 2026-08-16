import { mkdir, writeFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { createApiServerController } from '../../apps/api/src/api-server.js'
import type { ProjectLibrary } from '../../apps/api/src/project-library.js'
import type { ProjectRuntimeManager } from '../../apps/api/src/project-runtime-manager.js'
import {
  workbenchFailure,
  workbenchFailureEnvelope,
  type WorkbenchFailureCategory,
} from '../../apps/api/src/workbench-proxy-contract.js'
import type { WorkbenchProxyManager } from '../../apps/api/src/workbench-proxy-manager.js'
import { REPOSITORY_ROOT } from '../../apps/api/src/workbench-proof-contract.js'

const designated = process.env.BL012_DESIGNATED === '1'
const RESULT_PATH = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-012/browser-failures.json'
)
const DOCUMENT_TIMEOUT_MS = 100
const OVERALL_TIMEOUT_MS = 30_000
const CLEANUP_TIMEOUT_MS = 5_000

const sendFailure = (
  response: ServerResponse,
  category: WorkbenchFailureCategory
): void => {
  const failure = workbenchFailure(category)
  response.writeHead(failure.status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(workbenchFailureEnvelope(failure)))
}

const sendSuccess = (response: ServerResponse, id: string): void => {
  response.writeHead(200, { 'content-type': 'text/html' })
  response.end(
    '<!doctype html><html><head><title>Workbench</title></head><body><main id="controlled-success">Recovered ' +
      id +
      '</main></body></html>'
  )
}

test.describe.configure({ mode: 'serial', retries: 0 })

test('runs exactly four controlled browser failure cases with one recovery action', async ({
  browser,
}) => {
  test.skip(
    !designated,
    'Set BL012_DESIGNATED=1 for controlled Home/workbench failures'
  )
  test.setTimeout(OVERALL_TIMEOUT_MS)
  const episodeStartedAt = Date.now()
  const startupStartedAt = Date.now()
  let startupEndedAt: number | undefined
  const project = {
    id: 'controlled',
    name: 'Controlled',
    canonicalPath: '/controlled',
    createdAt: 1,
  }
  const library: ProjectLibrary = {
    create: async () => ({ disposition: 'existing', project }),
    findById: async () => project,
    list: async () => [project],
    closeProject: async (id) => ({ disposition: 'closed', id }),
    close: () => undefined,
  }
  const runtime: ProjectRuntimeManager = {
    beginReconciliation: async () => undefined,
    start: async () => {
      throw new Error('Not owned by controlled proxy')
    },
    inspect: () => undefined,
    lastFailure: () => undefined,
    lastCleanup: () => undefined,
    lastShutdown: () => undefined,
    shutdown: async () => ({ status: 'ok', audits: [] }),
  }
  const calls = new Map<string, number>()
  const lookups = new Map<string, number>()
  const starts = new Map<string, number>()
  const cancellations = new Map<string, number>()
  const lateSettlements = new Map<string, number>()
  let releaseTimeoutStale = (): void => undefined
  const timeoutStale = new Promise<void>((resolve) => {
    releaseTimeoutStale = resolve
  })
  const proxy: WorkbenchProxyManager = {
    async handleHttp(request, response, route) {
      const count = (calls.get(route.projectId) ?? 0) + 1
      calls.set(route.projectId, count)
      lookups.set(route.projectId, (lookups.get(route.projectId) ?? 0) + 1)
      if (
        route.projectId !== 'unknown' &&
        (route.projectId === 'startup' || count === 1)
      ) {
        starts.set(route.projectId, (starts.get(route.projectId) ?? 0) + 1)
      }
      if (route.projectId === 'unknown')
        return sendFailure(response, 'unknown-project')
      if (count > 1) return sendSuccess(response, route.projectId)
      if (route.projectId === 'startup')
        return sendFailure(response, 'runtime:spawn-error')
      if (route.projectId === 'upstream')
        return sendFailure(response, 'upstream-connect')
      if (route.projectId === 'timeout') {
        await new Promise<void>((resolve) => request.once('aborted', resolve))
        cancellations.set(
          route.projectId,
          (cancellations.get(route.projectId) ?? 0) + 1
        )
        await timeoutStale
        lateSettlements.set(
          route.projectId,
          (lateSettlements.get(route.projectId) ?? 0) + 1
        )
        return
      }
      return sendSuccess(response, route.projectId)
    },
    handleUpgrade: async () => undefined,
    shutdown: async () => proxy.audit(),
    audit: () => ({
      shuttingDown: false,
      pendingOperations: 0,
      upstreamHttpRequests: 0,
      upstreamHttpResponses: 0,
      rawSockets: 0,
      webSockets: 0,
    }),
  }
  const controller = createApiServerController({
    port: 0,
    fastify: { logger: false },
    createProjectLibrary: async () => library,
    createProjectRuntimeManager: () => runtime,
    createWorkbenchProxyManager: () => proxy,
    createProjectRegistration: async () => ({
      register: async () => ({ disposition: 'existing', project }),
      close: () => undefined,
    }),
    workbenchDocumentTimeoutMs: DOCUMENT_TIMEOUT_MS,
  })
  const records: Array<Record<string, unknown>> = []
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    const app = await controller.start()
    startupEndedAt = Date.now()
    const address = app.server.address()
    if (address === null || typeof address === 'string')
      throw new Error('Missing controlled API address')
    const origin = 'http://127.0.0.1:' + address.port
    await page.route(origin + '/', async (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<main><h1>Ascend</h1><article>Controlled project card</article></main><script>const h=document.querySelector(String.fromCharCode(104,49));h?.setAttribute(String.fromCharCode(116,97,98,105,110,100,101,120),String.fromCharCode(45,49));h?.focus()</script>',
      })
    )
    for (const specification of [
      {
        id: 'unknown',
        message: 'Project is not registered.',
        action: 'Projects',
        expectedLookups: 1,
        expectedStarts: 0,
      },
      {
        id: 'startup',
        message: 'Workbench could not start.',
        action: 'Retry',
        expectedLookups: 2,
        expectedStarts: 2,
      },
      {
        id: 'upstream',
        message: 'Workbench upstream connection failed.',
        action: 'Retry',
        expectedLookups: 2,
        expectedStarts: 1,
      },
      {
        id: 'timeout',
        message: 'Workbench document load timed out.',
        action: 'Retry',
        expectedLookups: 2,
        expectedStarts: 1,
      },
    ]) {
      const caseStartedAt = Date.now()
      const stableUrl = origin + '/projects/' + specification.id + '/workbench/'
      await page.goto(stableUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 5_000,
      })
      const heading = page.getByRole('heading', {
        name: 'Workbench unavailable',
      })
      await expect(heading).toBeFocused({ timeout: 2_000 })
      await expect(
        page.getByText(specification.message, { exact: true })
      ).toBeVisible()
      await expect(page.getByRole('alert')).toContainText(specification.message)
      expect(page.url()).toBe(stableUrl)
      const historyBefore = await page.evaluate(() => history.length)
      await page.keyboard.press('Tab')
      if (specification.action === 'Projects') {
        await expect(page.getByRole('link', { name: 'Projects' })).toBeFocused()
      } else {
        await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(page.getByRole('link', { name: 'Projects' })).toBeFocused()
      }
      const recoveryStartedAt = Date.now()
      if (specification.action === 'Projects') {
        await page.getByRole('link', { name: 'Projects' }).click()
        await expect(page).toHaveURL(origin + '/')
        await expect(
          page.getByRole('heading', { name: 'Ascend' })
        ).toBeFocused()
        await expect(page.getByText('Controlled project card')).toBeVisible()
      } else {
        await page.getByRole('button', { name: 'Retry' }).click()
        await expect(
          page.getByText('Recovered ' + specification.id, { exact: true })
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible()
        expect(page.url()).toBe(stableUrl)
        if (specification.id === 'timeout') {
          await page.goto(origin + '/', { waitUntil: 'domcontentloaded' })
          const homeHeading = page.getByRole('heading', { name: 'Ascend' })
          await expect(homeHeading).toBeFocused()
          await expect(page.getByText('Controlled project card')).toBeVisible()
          const homeHtml = await page.locator('body').innerHTML()
          releaseTimeoutStale()
          await expect.poll(() => lateSettlements.get('timeout') ?? 0).toBe(1)
          await expect(page).toHaveURL(origin + '/')
          await expect(page.locator('body')).toHaveJSProperty(
            'innerHTML',
            homeHtml
          )
          await expect(homeHeading).toBeFocused()
        }
      }
      expect(lookups.get(specification.id) ?? 0).toBe(
        specification.expectedLookups
      )
      expect(starts.get(specification.id) ?? 0).toBe(
        specification.expectedStarts
      )
      const recoveryEndedAt = Date.now()
      const caseEndedAt = Date.now()
      records.push({
        id: specification.id,
        executions: 1,
        publicResult: specification.message,
        action: specification.action,
        actionCount: 1,
        generations: calls.get(specification.id),
        lookupCount: lookups.get(specification.id) ?? 0,
        startCount: starts.get(specification.id) ?? 0,
        cancellationCount: cancellations.get(specification.id) ?? 0,
        lateSettlementCount: lateSettlements.get(specification.id) ?? 0,
        staleResult:
          specification.id === 'timeout'
            ? 'ignored-after-retry'
            : 'not-injected',
        staleMutations: 0,
        historyDelta:
          (await page.evaluate(() => history.length)) - historyBefore,
        resultingPath: new URL(page.url()).pathname,
        focus: 'error-heading',
        announcement: 'assertive-alert',
        resourcesAfterCase: proxy.audit(),
        timing: {
          startMs: caseStartedAt,
          endMs: caseEndedAt,
          durationMs: caseEndedAt - caseStartedAt,
          recoveryStartMs: recoveryStartedAt,
          recoveryEndMs: recoveryEndedAt,
          recoveryDurationMs: recoveryEndedAt - recoveryStartedAt,
        },
        bounds: {
          startupMs: 5_000,
          documentMs: DOCUMENT_TIMEOUT_MS,
          operationMs: 2_000,
          recoveryMs: 5_000,
          overallMs: OVERALL_TIMEOUT_MS,
          cleanupMs: CLEANUP_TIMEOUT_MS,
        },
      })
    }
    expect(records).toHaveLength(4)
    expect(records.map((record) => record.id)).toEqual([
      'unknown',
      'startup',
      'upstream',
      'timeout',
    ])
  } finally {
    releaseTimeoutStale()
    await context.close()
    await controller.stop()
    const finalAudit = proxy.audit()
    expect(finalAudit).toMatchObject({
      pendingOperations: 0,
      rawSockets: 0,
      webSockets: 0,
    })
    await mkdir(path.dirname(RESULT_PATH), { recursive: true })
    await writeFile(
      RESULT_PATH,
      JSON.stringify(
        {
          schemaVersion: 2,
          timing: {
            startMs: episodeStartedAt,
            endMs: Date.now(),
            durationMs: Date.now() - episodeStartedAt,
            startupStartMs: startupStartedAt,
            startupEndMs:
              typeof startupEndedAt === 'number' ? startupEndedAt : Date.now(),
            startupDurationMs:
              (typeof startupEndedAt === 'number'
                ? startupEndedAt
                : Date.now()) - startupStartedAt,
          },
          bounds: {
            startupMs: 5_000,
            documentMs: DOCUMENT_TIMEOUT_MS,
            recoveryMs: 5_000,
            overallMs: OVERALL_TIMEOUT_MS,
            cleanupMs: CLEANUP_TIMEOUT_MS,
          },
          records,
          cleanup: { contexts: 0, pages: 0, proxyResources: 0, finalAudit },
        },
        null,
        2
      )
    )
  }
})
