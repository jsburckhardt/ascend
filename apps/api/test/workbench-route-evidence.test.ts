import { execFile } from 'node:child_process'
import { chmod, readFile, stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import {
  auditWorkbenchRouteResidual,
  correctedBrowserEvidenceComplete,
} from '../src/cli/workbench-route-residual-audit.js'
import {
  mergeWorkbenchRouteEvidence,
  readWorkbenchRouteEvidence,
  WORKBENCH_ROUTE_EVIDENCE_FILE,
} from '../src/workbench-route-evidence.js'
import {
  WORKBENCH_BROWSER_CLASSIFIER_VECTORS,
  WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
} from '../src/workbench-route-proof-observation.js'

const execute = promisify(execFile)

const correctedBrowser = {
  capturedCounts: {
    navigationAttempts: 3,
    webSocketAttempts: 3,
    webSocketNetworkConnections: 6,
    retryAttempts: 0,
  },
  extensionGallery: '{}',
  classifierVectorManifest: {
    acceptedIds: WORKBENCH_BROWSER_CLASSIFIER_VECTORS.filter(
      (vector) => vector.expected === 'trusted-markdown-webview'
    ).map((vector) => vector.id),
    rejectedIds: WORKBENCH_BROWSER_CLASSIFIER_VECTORS.filter(
      (vector) => vector.expected === 'forbidden-external'
    ).map((vector) => vector.id),
  },
  originPolicy: {
    ascendOwned: 'same-origin-stable-prefix',
    trustedExternal: WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
    everyOtherExternal: 'forbidden',
  },
  marketplaceRequestCount: 0,
  forbiddenRequestCount: 0,
  trustedWebviewRequestCount: 1,
  trustedWebviewFrameInventory: [],
  requestInventory: [
    { classification: 'ascend-owned' },
    { classification: 'browser-local' },
    { classification: 'trusted-markdown-webview' },
  ],
  socketRoleCounts: { Management: 3, ExtensionHost: 3, unknown: 0 },
  socketInventory: [1, 2, 3].flatMap((workflow) =>
    (['Management', 'ExtensionHost'] as const).map((role) => ({
      contextId: 'context-' + String(workflow),
      role,
      sameOrigin: true,
      stablePrefix: true,
      internalPortAbsent: true,
      reconnection: 'false',
      pathnameClass: 'stable-runtime-socket',
    }))
  ),
}

describe('restricted stable-route evidence and residual audit', () => {
  it('atomically creates, merges, and repairs the sole owner-readable evidence file', async () => {
    const before = await readWorkbenchRouteEvidence()
    await chmod(WORKBENCH_ROUTE_EVIDENCE_FILE, 0o644)
    const updated = await mergeWorkbenchRouteEvidence({
      cleanup: { ...before.cleanup, writerTest: 'passed' },
    })
    expect(updated.cleanup).toMatchObject({ writerTest: 'passed' })
    expect((await stat(WORKBENCH_ROUTE_EVIDENCE_FILE)).mode & 0o777).toBe(0o600)
    expect((await readWorkbenchRouteEvidence()).matrices).toEqual(
      before.matrices
    )
  })

  it('is ignored, absent from tracked files, and passes exact identity residual checks', async () => {
    const ignored = await execute('git', [
      'check-ignore',
      WORKBENCH_ROUTE_EVIDENCE_FILE,
    ])
    expect(ignored.stdout.trim()).toBe(WORKBENCH_ROUTE_EVIDENCE_FILE)
    const tracked = await execute('git', [
      'ls-files',
      WORKBENCH_ROUTE_EVIDENCE_FILE,
    ])
    expect(tracked.stdout).toBe('')
    const current = await readWorkbenchRouteEvidence()
    const result = await auditWorkbenchRouteResidual({
      ...current,
      browser: {
        ...correctedBrowser,
        identities: [
          { pid: 999_999_999, processStartTime: 'absent', port: 65_534 },
        ],
      },
      redaction: { scans: [] },
      matrices: [
        { id: 'V-2' },
        { id: 'V-3' },
        { id: 'V-4' },
        { id: 'V-5' },
        { id: 'V-6' },
        { id: 'V-7' },
        { id: 'V-8', unrelatedControlObservedAt: 1 },
      ],
      cleanup: {
        browserContexts: {
          opened: ['context-1'],
          closed: ['context-1'],
          pending: [],
        },
      },
    })
    expect(result).toMatchObject({
      status: 'ok',
      evidenceFileCount: 1,
      evidenceMode: '0600',
      processesAbsent: true,
      listenersAbsent: true,
      requiredSectionsComplete: true,
      pendingInventoryEntries: 0,
    })
  })

  it('rejects stale, unsafe, extra, marketplace, and unclassified browser evidence', () => {
    expect(correctedBrowserEvidenceComplete(correctedBrowser)).toBe(true)
    for (const invalid of [
      {
        ...correctedBrowser,
        capturedCounts: {
          ...correctedBrowser.capturedCounts,
          webSocketNetworkConnections: 3,
        },
      },
      { ...correctedBrowser, marketplaceRequestCount: 1 },
      { ...correctedBrowser, forbiddenRequestCount: 1 },
      { ...correctedBrowser, trustedWebviewRequestCount: 0 },
      {
        ...correctedBrowser,
        trustedWebviewRequestCount: 0,
        requestInventory: [{ classification: 'ascend-owned' }],
      },
      {
        ...correctedBrowser,
        trustedWebviewRequestCount: 0,
        trustedWebviewFrameInventory: [
          { classification: 'forbidden-external' },
        ],
      },
      { ...correctedBrowser, networkRequests: [] },
      { ...correctedBrowser, webSocketEvents: [] },
      {
        ...correctedBrowser,
        classifierVectorManifest: { acceptedIds: [], rejectedIds: [] },
      },
      {
        ...correctedBrowser,
        originPolicy: {
          ...correctedBrowser.originPolicy,
          trustedExternal: 'suffix-only',
        },
      },
      {
        ...correctedBrowser,
        requestInventory: [{ classification: 'ascend-owned', url: 'raw' }],
      },
      {
        ...correctedBrowser,
        requestInventory: [
          { classification: 'trusted-markdown-webview', hostname: 'raw' },
        ],
      },
      {
        ...correctedBrowser,
        requestInventory: [
          {
            classification: 'trusted-markdown-webview',
            encodedAuthority: 'raw',
          },
        ],
      },
      {
        ...correctedBrowser,
        trustedWebviewFrameInventory: [
          { classification: 'trusted-markdown-webview', pathname: 'raw' },
        ],
      },
      {
        ...correctedBrowser,
        socketInventory: correctedBrowser.socketInventory.slice(0, 5),
      },
      {
        ...correctedBrowser,
        socketInventory: [
          ...correctedBrowser.socketInventory,
          correctedBrowser.socketInventory[0],
        ],
      },
      {
        ...correctedBrowser,
        socketInventory: correctedBrowser.socketInventory.map((entry, index) =>
          index === 0 ? { ...entry, role: 'unknown' } : entry
        ),
      },
      {
        ...correctedBrowser,
        socketInventory: correctedBrowser.socketInventory.map((entry, index) =>
          index === 0 ? { ...entry, reconnection: 'true' } : entry
        ),
      },
    ])
      expect(correctedBrowserEvidenceComplete(invalid)).toBe(false)
  })

  it('rejects static proof constants, filtered browser inventories, and table-only failure execution', async () => {
    const [acceptance, browser, residual] = await Promise.all([
      readFile(
        new URL('./workbench-route-acceptance.test.ts', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL('../../../tests/e2e/workbench-route.spec.ts', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL(
          '../src/cli/workbench-route-residual-audit.ts',
          import.meta.url
        ),
        'utf8'
      ),
    ])
    for (const forbidden of [
      'browserContexts: 0',
      'browserSockets: 0',
      'ownedResources: 0',
      'matrixSockets: 0',
      'WORKBENCH_FAILURE_TABLE.map((entry) => ({',
    ]) {
      expect(acceptance + browser).not.toContain(forbidden)
    }
    expect(acceptance).toContain('throw new InjectedFailure(category)')
    expect(acceptance).toContain('injectionIndex')
    expect(browser).not.toContain('navigationAttempts +=')
    expect(browser).not.toContain('webSocketAttempts +=')
    expect(browser).toContain('networkRequests.push')
    expect(browser).toContain('trusted-markdown-webview')
    expect(browser).toContain(
      'socketRoleCounts: { Management: 3, ExtensionHost: 3, unknown: 0 }'
    )
    expect(browser).toContain('marketplaceRequestCount')
    expect(browser).toContain("extensionGallery: '{}'")
    expect(browser).not.toContain('webSocketEvents,')
    expect(residual).toContain(
      'path.resolve(file) !== path.resolve(WORKBENCH_ROUTE_EVIDENCE_FILE)'
    )
    expect(residual).toContain('pendingInventoryEntries === 0')
  })
})
