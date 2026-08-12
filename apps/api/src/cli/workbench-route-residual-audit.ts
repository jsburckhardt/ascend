import { execFile } from 'node:child_process'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { promisify } from 'node:util'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  WORKBENCH_BROWSER_CLASSIFIER_VECTORS,
  WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR,
} from '../workbench-route-proof-observation.js'
import {
  validateWorkbenchAcceptanceCleanup,
  validateWorkbenchFailureMatrix,
  validateWorkbenchRedactionProof,
  validateWorkbenchRouteHeaderMatrix,
} from '../workbench-proxy-contract.js'
import {
  mergeWorkbenchRouteEvidence,
  readWorkbenchRouteEvidence,
  WORKBENCH_ROUTE_EVIDENCE_FILE,
  WORKBENCH_ROUTE_EVIDENCE_ROOT,
  type WorkbenchRouteEvidence,
} from '../workbench-route-evidence.js'

const execute = promisify(execFile)
interface Identity {
  pid?: unknown
  processStartTime?: unknown
  port?: unknown
}
export interface WorkbenchRouteResidualResult {
  readonly status: 'ok' | 'failed'
  readonly evidenceFileCount: number
  readonly evidenceMode: string
  readonly ownedIdentityCount: number
  readonly processesAbsent: boolean
  readonly listenersAbsent: boolean
  readonly publicArtifactCount: number
  readonly publicAuthorityMatches: number
  readonly excludedRestrictedPaths: readonly string[]
  readonly matrixIds: readonly string[]
  readonly requiredSectionsComplete: boolean
  readonly browserEvidenceComplete: boolean
  readonly failureMatrixComplete: boolean
  readonly redactionEvidenceComplete: boolean
  readonly acceptanceCleanupComplete: boolean
  readonly routeHeaderMatrixComplete: boolean
  readonly observedInventoryCount: number
  readonly pendingInventoryEntries: number
  readonly controlListenerObservations: number
}

const identitiesFrom = (evidence: WorkbenchRouteEvidence): Identity[] => {
  const identities: Identity[] = []
  const browser = evidence.browser as { identities?: unknown } | undefined
  if (Array.isArray(browser?.identities))
    identities.push(...(browser.identities as Identity[]))
  for (const matrix of evidence.matrices) {
    if (typeof matrix !== 'object' || matrix === null) continue
    if ('identity' in matrix)
      identities.push((matrix as { identity: Identity }).identity)
    if (
      'identities' in matrix &&
      Array.isArray((matrix as { identities: unknown }).identities)
    )
      identities.push(...(matrix as { identities: Identity[] }).identities)
  }
  return [
    ...new Map(
      identities.map((identity) => [JSON.stringify(identity), identity])
    ).values(),
  ]
}

const walkFiles = async (root: string): Promise<string[]> => {
  const files: string[] = []
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const entryPath = path.join(root, entry.name)
      if (entry.isDirectory()) files.push(...(await walkFiles(entryPath)))
      else if (entry.isFile() || entry.isSymbolicLink()) files.push(entryPath)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  return files
}

const publicArtifactFiles = async (): Promise<string[]> => {
  const tracked = (
    await execute('git', ['ls-files', '-z'], { cwd: REPOSITORY_ROOT })
  ).stdout
    .split('\0')
    .filter(Boolean)
    .filter(
      (file) =>
        /(?:^|\/)(?:README|[^/]*(?:evidence|runbook|migration|log)[^/]*)\.(?:md|json|ya?ml|log|txt)$/iu.test(
          file
        ) ||
        (/^(?:docs|project\/architecture|project\/work-items)\//u.test(file) &&
          /\.(?:md|json|ya?ml|log|txt)$/iu.test(file))
    )
    .map((file) => path.join(REPOSITORY_ROOT, file))
  const generated = (
    await Promise.all([
      walkFiles(path.join(REPOSITORY_ROOT, 'test-results')),
      walkFiles(path.join(REPOSITORY_ROOT, 'playwright-report')),
    ])
  )
    .flat()
    .filter((file) => /\.(?:md|json|ya?ml|log|txt)$/iu.test(file))
  return [...new Set([...tracked, ...generated])].filter(
    (file) => path.resolve(file) !== path.resolve(WORKBENCH_ROUTE_EVIDENCE_FILE)
  )
}

export const correctedBrowserEvidenceComplete = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const browser = value as Record<string, unknown>
  const counts = browser.capturedCounts as Record<string, unknown> | undefined
  const roleCounts = browser.socketRoleCounts as
    Record<string, unknown> | undefined
  const vectorManifest = browser.classifierVectorManifest as
    Record<string, unknown> | undefined
  const originPolicy = browser.originPolicy as
    Record<string, unknown> | undefined
  const expectedAcceptedIds = WORKBENCH_BROWSER_CLASSIFIER_VECTORS.filter(
    (vector) => vector.expected === 'trusted-markdown-webview'
  ).map((vector) => vector.id)
  const expectedRejectedIds = WORKBENCH_BROWSER_CLASSIFIER_VECTORS.filter(
    (vector) => vector.expected === 'forbidden-external'
  ).map((vector) => vector.id)
  const requests = browser.requestInventory
  const sockets = browser.socketInventory
  const webviewFrames = browser.trustedWebviewFrameInventory
  if (
    !Array.isArray(requests) ||
    !Array.isArray(sockets) ||
    !Array.isArray(webviewFrames)
  )
    return false
  const requestClasses = requests.map((entry) =>
    typeof entry === 'object' && entry !== null
      ? (entry as Record<string, unknown>).classification
      : undefined
  )
  const socketRecords = sockets.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry)
  )
  const contexts = new Map<string, Set<unknown>>()
  for (const socket of socketRecords) {
    const contextId = String(socket.contextId ?? '')
    const roles = contexts.get(contextId) ?? new Set<unknown>()
    roles.add(socket.role)
    contexts.set(contextId, roles)
  }
  return (
    counts?.navigationAttempts === 3 &&
    counts.webSocketAttempts === 3 &&
    JSON.stringify(vectorManifest?.acceptedIds) ===
      JSON.stringify(expectedAcceptedIds) &&
    JSON.stringify(vectorManifest?.rejectedIds) ===
      JSON.stringify(expectedRejectedIds) &&
    originPolicy?.trustedExternal === WORKBENCH_MARKDOWN_WEBVIEW_HOST_GRAMMAR &&
    counts.webSocketNetworkConnections === 6 &&
    counts.retryAttempts === 0 &&
    browser.extensionGallery === '{}' &&
    browser.marketplaceRequestCount === 0 &&
    browser.forbiddenRequestCount === 0 &&
    typeof browser.trustedWebviewRequestCount === 'number' &&
    browser.trustedWebviewRequestCount >= 0 &&
    browser.trustedWebviewRequestCount + webviewFrames.length > 0 &&
    webviewFrames.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry as Record<string, unknown>).classification ===
          'trusted-markdown-webview'
    ) &&
    requestClasses.every((classification) =>
      ['ascend-owned', 'browser-local', 'trusted-markdown-webview'].includes(
        String(classification)
      )
    ) &&
    [...requests, ...webviewFrames].every((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
        return false
      const record = entry as Record<string, unknown>
      return ![
        'url',
        'hostname',
        'host',
        'authority',
        'encodedAuthority',
        'username',
        'password',
        'port',
        'pathname',
        'search',
        'payload',
        'handshake',
        'reconnectionToken',
      ].some((key) => key in record)
    }) &&
    socketRecords.length === 6 &&
    roleCounts?.Management === 3 &&
    roleCounts.ExtensionHost === 3 &&
    roleCounts.unknown === 0 &&
    socketRecords.every(
      (socket) =>
        ['Management', 'ExtensionHost'].includes(String(socket.role)) &&
        socket.sameOrigin === true &&
        socket.stablePrefix === true &&
        socket.internalPortAbsent === true &&
        socket.reconnection === 'false' &&
        socket.pathnameClass === 'stable-runtime-socket'
    ) &&
    contexts.size === 3 &&
    [...contexts.values()].every(
      (roles) =>
        roles.size === 2 &&
        roles.has('Management') &&
        roles.has('ExtensionHost')
    ) &&
    !('networkRequests' in browser) &&
    !('webSocketEvents' in browser)
  )
}

const inventoryObservations = (
  value: unknown
): Array<{ path: string; pending: number }> => {
  const observations: Array<{ path: string; pending: number }> = []
  const visit = (entry: unknown, entryPath: string): void => {
    if (typeof entry !== 'object' || entry === null) return
    if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, `${entryPath}[${index}]`))
      return
    }
    const record = entry as Record<string, unknown>
    if (Array.isArray(record.pending))
      observations.push({ path: entryPath, pending: record.pending.length })
    if (typeof record.pendingOperations === 'number')
      observations.push({
        path: `${entryPath}.pendingOperations`,
        pending: record.pendingOperations,
      })
    for (const [key, item] of Object.entries(record))
      visit(item, entryPath === '' ? key : `${entryPath}.${key}`)
  }
  visit(value, 'cleanup')
  return observations
}

export async function auditWorkbenchRouteResidual(
  evidence?: WorkbenchRouteEvidence
): Promise<WorkbenchRouteResidualResult> {
  const retainedEvidence = evidence ?? (await readWorkbenchRouteEvidence())
  const entries = await readdir(WORKBENCH_ROUTE_EVIDENCE_ROOT, {
    withFileTypes: true,
  })
  const files = entries.filter(
    (entry) => entry.isFile() || entry.isSymbolicLink()
  )
  const metadata = await lstat(WORKBENCH_ROUTE_EVIDENCE_FILE)
  const identities = identitiesFrom(retainedEvidence)
  const processChecks = await Promise.all(
    identities.map(
      async (identity) =>
        typeof identity.pid !== 'number' ||
        typeof identity.processStartTime !== 'string' ||
        (await readProcessStartTime(identity.pid)) !== identity.processStartTime
    )
  )
  const listenerChecks = await Promise.all(
    identities.map(
      async (identity) =>
        typeof identity.port !== 'number' ||
        (await loopbackListenerIsAbsent(identity.port))
    )
  )
  const publicFiles = await publicArtifactFiles()
  const ownedAuthorities = identities.flatMap((identity) =>
    typeof identity.port === 'number'
      ? [
          `:${identity.port}`,
          encodeURIComponent(`http://127.0.0.1:${identity.port}`),
        ]
      : []
  )
  let publicArtifactCount = 0
  let publicAuthorityMatches = 0
  for (const file of publicFiles) {
    let content: Buffer
    try {
      content = await readFile(file)
    } catch (error) {
      // Parallel validation may remove an ephemeral generated artifact after
      // inventory. Only an absent file is skipped; every retained file is read.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    publicArtifactCount += 1
    const text = content.toString('latin1')
    for (const authority of ownedAuthorities)
      publicAuthorityMatches += text.split(authority).length - 1
  }
  const matrixIds = retainedEvidence.matrices.flatMap((matrix) =>
    typeof matrix === 'object' && matrix !== null && 'id' in matrix
      ? [String(matrix.id)]
      : []
  )
  const requiredPrefixes = ['V-2', 'V-3', 'V-4', 'V-5', 'V-6', 'V-7', 'V-8']
  const browserEvidenceComplete = correctedBrowserEvidenceComplete(
    retainedEvidence.browser
  )
  const failureMatrixComplete = retainedEvidence.matrices.some((matrix) =>
    validateWorkbenchFailureMatrix(matrix)
  )
  const redactionEvidenceComplete = validateWorkbenchRedactionProof(
    retainedEvidence.redaction
  )
  const acceptanceCleanupComplete = validateWorkbenchAcceptanceCleanup(
    retainedEvidence.cleanup
  )
  const routeHeaderMatrixComplete = retainedEvidence.matrices.some((matrix) =>
    validateWorkbenchRouteHeaderMatrix(matrix)
  )
  const requiredSectionsComplete =
    requiredPrefixes.every((required) =>
      matrixIds.some((id) => id.startsWith(required))
    ) &&
    browserEvidenceComplete &&
    failureMatrixComplete &&
    redactionEvidenceComplete &&
    Object.keys(retainedEvidence.cleanup).length > 0
  const inventories = inventoryObservations(retainedEvidence.cleanup)
  const pendingInventoryEntries = inventories.reduce(
    (total, inventory) => total + inventory.pending,
    0
  )
  const controlListenerObservations = retainedEvidence.matrices.filter(
    (matrix) =>
      typeof matrix === 'object' &&
      matrix !== null &&
      'unrelatedControlObservedAt' in matrix
  ).length
  const result: WorkbenchRouteResidualResult = Object.freeze({
    status:
      files.length === 1 &&
      files[0]?.name === 'workbench-route-evidence.json' &&
      !metadata.isSymbolicLink() &&
      (metadata.mode & 0o777) === 0o600 &&
      processChecks.every(Boolean) &&
      listenerChecks.every(Boolean) &&
      publicAuthorityMatches === 0 &&
      requiredSectionsComplete &&
      inventories.length > 0 &&
      pendingInventoryEntries === 0 &&
      controlListenerObservations > 0 &&
      acceptanceCleanupComplete &&
      routeHeaderMatrixComplete
        ? 'ok'
        : 'failed',
    evidenceFileCount: files.length,
    evidenceMode: (metadata.mode & 0o777).toString(8).padStart(4, '0'),
    ownedIdentityCount: identities.length,
    processesAbsent: processChecks.every(Boolean),
    listenersAbsent: listenerChecks.every(Boolean),
    publicArtifactCount,
    publicAuthorityMatches,
    excludedRestrictedPaths: [
      path.relative(REPOSITORY_ROOT, WORKBENCH_ROUTE_EVIDENCE_FILE),
    ],
    matrixIds,
    requiredSectionsComplete,
    browserEvidenceComplete,
    failureMatrixComplete,
    redactionEvidenceComplete,
    acceptanceCleanupComplete,
    routeHeaderMatrixComplete,
    observedInventoryCount: inventories.length,
    pendingInventoryEntries,
    controlListenerObservations,
  })
  return result
}

export async function runWorkbenchRouteResidualAudit(): Promise<number> {
  const result = await auditWorkbenchRouteResidual()
  await mergeWorkbenchRouteEvidence({ residualAudit: { ...result } })
  process.stdout.write(
    JSON.stringify({ event: 'workbench.route.residual-audit', ...result }) +
      '\n'
  )
  return result.status === 'ok' ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  process.exitCode = await runWorkbenchRouteResidualAudit()
