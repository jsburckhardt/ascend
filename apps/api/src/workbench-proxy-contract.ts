import { createHash } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'
import {
  deriveProjectOwnerToken,
  type RuntimeFailureCategory,
} from './project-runtime-contract.js'

export const WORKBENCH_HEADER_TIMEOUT_MS = 5_000 as const
export const WORKBENCH_SHUTDOWN_TIMEOUT_MS = 5_000 as const
export const WORKBENCH_PROJECT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u

export interface WorkbenchProxyAudit {
  readonly shuttingDown: boolean
  readonly pendingOperations: number
  readonly upstreamHttpRequests: number
  readonly upstreamHttpResponses: number
  readonly rawSockets: number
  readonly webSockets: number
}

type ProxiedRuntimeFailureCategory = Exclude<
  RuntimeFailureCategory,
  'manager-shutdown'
>

export type WorkbenchFailureCategory =
  | 'malformed-project-id'
  | 'unknown-project'
  | 'persistence-failure'
  | `runtime:${ProxiedRuntimeFailureCategory}`
  | 'upstream-dns'
  | 'upstream-connect'
  | 'upstream-reset'
  | 'upstream-invalid-http'
  | 'upstream-timeout'
  | 'websocket-timeout'
  | 'websocket-refused'
  | 'redirect-rejected'
  | 'manager-shutdown'

export interface WorkbenchPublicFailure {
  readonly category: WorkbenchFailureCategory
  readonly status: number
  readonly code: string
  readonly message: string
}

const row = <const Category extends WorkbenchFailureCategory>(
  category: Category,
  status: number,
  code: string,
  message: string
): WorkbenchPublicFailure & { readonly category: Category } =>
  Object.freeze({ category, status, code, message })

type CompleteFailureRows<Rows extends readonly WorkbenchPublicFailure[]> =
  Exclude<WorkbenchFailureCategory, Rows[number]['category']> extends never
    ? Rows
    : never

const completeFailureRows = <
  const Rows extends readonly WorkbenchPublicFailure[],
>(
  rows: CompleteFailureRows<Rows>
): Rows => Object.freeze(rows) as Rows

export const WORKBENCH_FAILURE_TABLE: readonly WorkbenchPublicFailure[] =
  completeFailureRows([
    row(
      'malformed-project-id',
      400,
      'invalid_project_id',
      'Project ID is invalid.'
    ),
    row(
      'unknown-project',
      404,
      'project_not_found',
      'Project is not registered.'
    ),
    row(
      'persistence-failure',
      503,
      'project_lookup_unavailable',
      'Project lookup is temporarily unavailable.'
    ),
    row(
      'runtime:unknown-project',
      502,
      'workbench_runtime_project_changed',
      'Workbench project state changed before startup.'
    ),
    row(
      'runtime:canonical-path-invariant',
      502,
      'workbench_runtime_project_mismatch',
      'Workbench project metadata is inconsistent.'
    ),
    row(
      'runtime:spawn-error',
      502,
      'workbench_start_failed',
      'Workbench could not start.'
    ),
    row(
      'runtime:executable-missing',
      502,
      'workbench_unavailable',
      'Workbench runtime is unavailable.'
    ),
    row(
      'runtime:early-exit-code',
      502,
      'workbench_early_exit_code',
      'Workbench exited before becoming ready.'
    ),
    row(
      'runtime:early-exit-signal',
      502,
      'workbench_early_exit_signal',
      'Workbench stopped before becoming ready.'
    ),
    row(
      'runtime:address-in-use-exhausted',
      502,
      'workbench_port_unavailable',
      'Workbench could not acquire a loopback listener.'
    ),
    row(
      'runtime:readiness-timeout',
      504,
      'workbench_readiness_timeout',
      'Workbench readiness timed out.'
    ),
    row(
      'runtime:health-status-unexpected',
      502,
      'workbench_health_status_invalid',
      'Workbench health status was invalid.'
    ),
    row(
      'runtime:health-body-unexpected',
      502,
      'workbench_health_body_invalid',
      'Workbench health response was invalid.'
    ),
    row(
      'runtime:caller-cancelled',
      502,
      'workbench_start_cancelled',
      'Workbench startup was cancelled.'
    ),
    row(
      'runtime:stop-unconfirmed',
      503,
      'workbench_stop_unconfirmed',
      'Workbench stop could not be confirmed.'
    ),
    row(
      'runtime:runtime-stopping',
      503,
      'workbench_runtime_stopping',
      'Workbench is currently stopping.'
    ),
    row(
      'runtime:restart-release-unconfirmed',
      503,
      'workbench_restart_release_unconfirmed',
      'Workbench restart could not release the previous session.'
    ),
    row(
      'runtime:restart-deadline-exceeded',
      503,
      'workbench_restart_deadline_exceeded',
      'Workbench restart timed out.'
    ),
    row(
      'runtime:runtime-restarting',
      503,
      'workbench_runtime_restarting',
      'Workbench is currently restarting.'
    ),
    row(
      'runtime:restart-replacement-unconfirmed',
      503,
      'workbench_restart_replacement_unconfirmed',
      'Workbench restart replacement cleanup could not be confirmed.'
    ),
    row(
      'runtime:reconcile-unconfirmed',
      503,
      'workbench_reconcile_unconfirmed',
      'Workbench recovery could not be confirmed.'
    ),
    row(
      'runtime:runtime-closing',
      503,
      'workbench_closing',
      'Workbench is being closed.'
    ),
    row(
      'runtime:close-release-unconfirmed',
      503,
      'workbench_release_unconfirmed',
      'Ascend could not confirm the workbench release during close.'
    ),
    row(
      'upstream-dns',
      502,
      'workbench_upstream_dns_failed',
      'Workbench upstream name resolution failed.'
    ),
    row(
      'upstream-connect',
      502,
      'workbench_upstream_connect_failed',
      'Workbench upstream connection failed.'
    ),
    row(
      'upstream-reset',
      502,
      'workbench_upstream_reset',
      'Workbench upstream connection was reset.'
    ),
    row(
      'upstream-invalid-http',
      502,
      'workbench_upstream_invalid_response',
      'Workbench upstream response was invalid.'
    ),
    row(
      'upstream-timeout',
      504,
      'workbench_upstream_timeout',
      'Workbench upstream response timed out.'
    ),
    row(
      'websocket-timeout',
      504,
      'workbench_websocket_timeout',
      'Workbench WebSocket handshake timed out.'
    ),
    row(
      'websocket-refused',
      502,
      'workbench_websocket_refused',
      'Workbench WebSocket connection was refused.'
    ),
    row(
      'redirect-rejected',
      502,
      'workbench_redirect_rejected',
      'Workbench redirect target was rejected.'
    ),
    row(
      'manager-shutdown',
      503,
      'workbench_shutting_down',
      'Workbench routing is shutting down.'
    ),
  ])

const failureByCategory = new Map(
  WORKBENCH_FAILURE_TABLE.map((entry) => [entry.category, entry])
)
export const WORKBENCH_FAILURE_TABLE_SHA256 = createHash('sha256')
  .update(JSON.stringify(WORKBENCH_FAILURE_TABLE))
  .digest('hex')

export function workbenchFailure(
  category: WorkbenchFailureCategory
): WorkbenchPublicFailure {
  const entry = failureByCategory.get(category)
  if (entry === undefined) throw new Error('Unknown workbench failure category')
  return entry
}

export const workbenchFailureEnvelope = (failure: WorkbenchPublicFailure) => ({
  error: { code: failure.code, message: failure.message },
})

export function decodeWorkbenchProjectId(rawId: string): string | undefined {
  try {
    const decoded = decodeURIComponent(rawId)
    return WORKBENCH_PROJECT_ID_PATTERN.test(decoded) ? decoded : undefined
  } catch {
    return undefined
  }
}

export interface StableWorkbenchRoute {
  readonly projectId: string
  readonly prefix: string
  readonly upstreamPath: string
}

export function parseStableWorkbenchRoute(
  rawUrl: string
): StableWorkbenchRoute | undefined {
  const question = rawUrl.indexOf('?')
  const pathname = question === -1 ? rawUrl : rawUrl.slice(0, question)
  const query = question === -1 ? '' : rawUrl.slice(question)
  const match = /^\/projects\/(.+?)\/workbench(?:\/(.*))?$/u.exec(pathname)
  if (match === null) return undefined
  const projectId = decodeWorkbenchProjectId(match[1])
  if (projectId === undefined) return undefined
  const prefix = `/projects/${encodeURIComponent(projectId)}/workbench/`
  return { projectId, prefix, upstreamPath: '/' + (match[2] ?? '') + query }
}

export const WORKBENCH_HOP_BY_HOP_HEADERS = Object.freeze([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])
const HOP_BY_HOP_HEADERS = new Set(WORKBENCH_HOP_BY_HOP_HEADERS)
const UPGRADE_HEADERS = new Set([
  'connection',
  'upgrade',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-protocol',
  'sec-websocket-extensions',
])
const isTargetHeader = (name: string): boolean =>
  name === 'host' ||
  name === 'forwarded' ||
  name.startsWith('x-forwarded-') ||
  name === 'x-proxy-target' ||
  name === 'proxy-target' ||
  name === 'x-upstream-authority'

export function filterWorkbenchHeaders(
  headers: IncomingHttpHeaders,
  options: { request: boolean; upgrade?: boolean }
): Record<string, string | string[]> {
  const connectionTokens = new Set(
    (headers.connection ?? '')
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
  )
  const result: Record<string, string | string[]> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue
    const lower = name.toLowerCase()
    const upgradeSemantic =
      options.upgrade === true && UPGRADE_HEADERS.has(lower)
    if (HOP_BY_HOP_HEADERS.has(lower) && !upgradeSemantic) continue
    if (connectionTokens.has(lower) && !upgradeSemantic) continue
    if (options.request && isTargetHeader(lower)) continue
    result[lower] = Array.isArray(value) ? [...value] : value
  }
  return result
}

export class RedirectRejectedError extends Error {}

export function rewriteWorkbenchRedirect(
  location: string,
  prefix: string,
  upstreamAuthority: string,
  upstreamPath = '/'
): string {
  if (location.startsWith('/') && !location.startsWith('//'))
    return prefix + location.slice(1)
  let parsed: URL
  try {
    parsed = new URL(location, 'http://' + upstreamAuthority + upstreamPath)
  } catch {
    throw new RedirectRejectedError()
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.host !== upstreamAuthority
  ) {
    throw new RedirectRejectedError()
  }
  return (
    prefix + parsed.pathname.replace(/^\//u, '') + parsed.search + parsed.hash
  )
}

export function rewriteWorkbenchCookie(cookie: string, prefix: string): string {
  const parts = cookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0 || !parts[0].includes('='))
    throw new Error('Invalid Set-Cookie')
  const attributes = parts
    .slice(1)
    .filter((attribute) => !attribute.toLowerCase().startsWith('domain='))
  const pathIndex = attributes.findIndex((attribute) =>
    attribute.toLowerCase().startsWith('path=')
  )
  const rawPath =
    pathIndex === -1
      ? ''
      : attributes[pathIndex].slice(attributes[pathIndex].indexOf('=') + 1)
  const scoped =
    prefix +
    (rawPath === '/' || rawPath === '' ? '' : rawPath.replace(/^\//u, ''))
  if (pathIndex === -1) attributes.push('Path=' + scoped)
  else attributes[pathIndex] = 'Path=' + scoped
  return [parts[0], ...attributes].join('; ')
}

export const rewriteServiceWorkerAllowed = (
  value: string,
  prefix: string
): string => (value === '/' ? prefix : value)

export type WorkbenchConnectionRole = 'Management' | 'ExtensionHost' | 'Tunnel'

export function classifyWorkbenchConnectionRolePayload(
  payload: Buffer
): WorkbenchConnectionRole | 'unknown' | undefined {
  const text = payload.toString('utf8')
  if (!/[{",]\s*"type"\s*:\s*"connectionType"/u.test(text)) return undefined
  const match = /"desiredConnectionType"\s*:\s*(\d+)/u.exec(text)
  if (match?.[1] === '1') return 'Management'
  if (match?.[1] === '2') return 'ExtensionHost'
  if (match?.[1] === '3') return 'Tunnel'
  return 'unknown'
}

export interface WorkbenchEventInput {
  readonly event:
    | 'workbench.proxy.started'
    | 'workbench.proxy.completed'
    | 'workbench.proxy.failed'
  readonly projectId: string
  readonly transport: 'http' | 'websocket'
  readonly elapsedMs: number
  readonly classification?: WorkbenchFailureCategory
}

export interface WorkbenchSafeEvent {
  readonly event: WorkbenchEventInput['event']
  readonly projectToken: string
  readonly transport: WorkbenchEventInput['transport']
  readonly elapsedMs: number
  readonly classification?: WorkbenchFailureCategory
}

export function tokenizeWorkbenchProjectId(projectId: string): string {
  return deriveProjectOwnerToken(projectId)
}

export function serializeWorkbenchEvent(
  event: WorkbenchEventInput
): WorkbenchSafeEvent {
  return Object.freeze({
    event: event.event,
    projectToken: tokenizeWorkbenchProjectId(event.projectId),
    transport: event.transport,
    elapsedMs: Math.max(0, Math.floor(event.elapsedMs)),
    ...(event.classification === undefined
      ? {}
      : { classification: event.classification }),
  })
}

const evidenceRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const zeroCleanup = (value: unknown): boolean => {
  const record = evidenceRecord(value)
  return (
    record !== undefined &&
    record.pendingOperations === 0 &&
    record.upstreamHttpRequests === 0 &&
    record.upstreamHttpResponses === 0 &&
    record.rawSockets === 0 &&
    record.webSockets === 0 &&
    record.fixtureSockets === 0 &&
    record.clientSockets === 0
  )
}

export function validateWorkbenchFailureMatrix(value: unknown): boolean {
  const matrix = evidenceRecord(value)
  if (matrix === undefined || matrix.id !== 'V-7') return false
  const declaredCategories = matrix.declaredCategories
  const executions = matrix.executions
  if (
    matrix.tableHash !== WORKBENCH_FAILURE_TABLE_SHA256 ||
    !Array.isArray(declaredCategories) ||
    !Array.isArray(executions) ||
    executions.length !== WORKBENCH_FAILURE_TABLE.length ||
    JSON.stringify(declaredCategories) !==
      JSON.stringify(WORKBENCH_FAILURE_TABLE.map((row) => row.category))
  )
    return false
  const executionIds = executions.map(
    (value) => evidenceRecord(value)?.executionId
  )
  if (
    executionIds.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(executionIds).size !== executions.length
  )
    return false
  return WORKBENCH_FAILURE_TABLE.every((row, index) => {
    const execution = evidenceRecord(executions[index])
    const scan = evidenceRecord(execution?.redaction)
    const path = execution?.executionPath
    const expectedPath =
      row.category === 'malformed-project-id'
        ? ['stable-route', 'route-validation']
        : row.category === 'manager-shutdown'
          ? ['stable-route', 'proxy-manager']
          : row.category === 'unknown-project' ||
              row.category === 'persistence-failure'
            ? ['stable-route', 'proxy-manager', 'project-library']
            : row.category.startsWith('runtime:')
              ? [
                  'stable-route',
                  'proxy-manager',
                  'project-library',
                  'runtime-manager',
                ]
              : [
                  'stable-route',
                  'proxy-manager',
                  'project-library',
                  'runtime-manager',
                  'fake-upstream',
                ]
    return (
      execution !== undefined &&
      execution.executionIndex === index &&
      typeof execution.executionId === 'string' &&
      execution.executionId.length > 0 &&
      execution.transport ===
        (row.category.startsWith('websocket-')
          ? 'websocket-upgrade'
          : 'http-request') &&
      Array.isArray(path) &&
      JSON.stringify(path) === JSON.stringify(expectedPath) &&
      execution.observedInternalError === row.category &&
      execution.category === row.category &&
      execution.status === row.status &&
      execution.code === row.code &&
      execution.message === row.message &&
      execution.localOnly !== true &&
      execution.injectionType !== 'InjectedFailure' &&
      zeroCleanup(execution.cleanup) &&
      scan?.literalMatches === 0 &&
      scan.encodedMatches === 0
    )
  })
}

export function validateWorkbenchRedactionProof(value: unknown): boolean {
  const proof = evidenceRecord(value)
  const markers = evidenceRecord(proof?.markers)
  const logCapture = evidenceRecord(proof?.logCapture)
  const channels = evidenceRecord(proof?.channels)
  const scans = proof?.scans
  const allowances = proof?.projectTokenAllowance
  if (!Array.isArray(scans) || !Array.isArray(allowances)) return false
  const scanIds = scans.map((scan) => evidenceRecord(scan)?.sentinelId)
  const tokenLocations = allowances.map(evidenceRecord)
  return (
    proof !== undefined &&
    proof.loggerEnabled === true &&
    typeof markers?.start === 'string' &&
    markers.start.length > 0 &&
    typeof markers.end === 'string' &&
    markers.end.length > 0 &&
    markers.end !== markers.start &&
    Number.isSafeInteger(markers.startIndex) &&
    Number.isSafeInteger(markers.endIndex) &&
    Number(markers.startIndex) >= 0 &&
    Number(markers.endIndex) > Number(markers.startIndex) &&
    typeof logCapture?.accessRecords === 'number' &&
    logCapture.accessRecords > 0 &&
    typeof logCapture.applicationRecords === 'number' &&
    logCapture.applicationRecords > 0 &&
    channels?.http === 'http-request' &&
    channels.websocket === 'websocket-frame' &&
    channels.terminal === 'integrated-terminal-websocket-frame' &&
    scans.length === 10 &&
    scanIds.every((id) => typeof id === 'string' && id.length > 0) &&
    new Set(scanIds).size === scans.length &&
    scans.every((scan) => {
      const record = evidenceRecord(scan)
      return record?.literalMatches === 0 && record.encodedMatches === 0
    }) &&
    tokenLocations.length > 0 &&
    tokenLocations.every(
      (location) =>
        location !== undefined &&
        (location.classification === 'stable-route-url' ||
          location.classification === 'dedicated-project-token') &&
        Number.isSafeInteger(location.occurrences) &&
        Number(location.occurrences) >= 0
    ) &&
    tokenLocations.some((location) => Number(location?.occurrences) > 0)
  )
}

const completeHeaderDirection = (value: unknown): boolean => {
  if (
    !Array.isArray(value) ||
    value.length !== WORKBENCH_HOP_BY_HOP_HEADERS.length
  )
    return false
  return value.every((entry, index) => {
    const record = evidenceRecord(entry)
    return (
      record?.name === WORKBENCH_HOP_BY_HOP_HEADERS[index] &&
      record.injectedAtStableRoute === true &&
      record.injectedValueAbsentAfterProxy === true
    )
  })
}

export function validateWorkbenchRouteHeaderMatrix(value: unknown): boolean {
  const matrix = evidenceRecord(value)
  const requestExtension = evidenceRecord(matrix?.requestConnectionToken)
  const responseExtension = evidenceRecord(matrix?.responseConnectionToken)
  return (
    matrix?.id === 'V-4' &&
    matrix.transport === 'stable-route-fake-upstream' &&
    completeHeaderDirection(matrix.requestCases) &&
    completeHeaderDirection(matrix.responseCases) &&
    requestExtension?.injectedAtStableRoute === true &&
    requestExtension.injectedValueAbsentAfterProxy === true &&
    responseExtension?.injectedAtStableRoute === true &&
    responseExtension.injectedValueAbsentAfterProxy === true
  )
}

const closedSocketStates = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((state) => {
    const record = evidenceRecord(state)
    return record?.destroyed === true && record.closed === true
  })

const closedWebSocketStates = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((state) => evidenceRecord(state)?.closed === true)

const completeScenarioCleanup = (value: unknown): boolean => {
  const scenario = evidenceRecord(value)
  const before = evidenceRecord(scenario?.preCleanup)
  const final = evidenceRecord(scenario?.finalCleanup)
  const proxy = evidenceRecord(final?.proxyInventory)
  return (
    scenario !== undefined &&
    before !== undefined &&
    before.fixtureServerListening === true &&
    Number.isSafeInteger(before.fixtureSocketCount) &&
    Number(before.fixtureSocketCount) >= 0 &&
    Array.isArray(before.fixtureSocketStates) &&
    before.fixtureSocketStates.length > 0 &&
    final !== undefined &&
    final.fixtureSocketCount === 0 &&
    final.fixtureServerListening === false &&
    proxy !== undefined &&
    proxy.pendingOperations === 0 &&
    proxy.upstreamHttpRequests === 0 &&
    proxy.upstreamHttpResponses === 0 &&
    proxy.rawSockets === 0 &&
    proxy.webSockets === 0 &&
    Array.isArray(final.fixtureSocketStates) &&
    final.fixtureSocketStates.length === before.fixtureSocketStates.length &&
    closedSocketStates(final.fixtureSocketStates) &&
    closedWebSocketStates(final.downstreamSocketStates) &&
    closedWebSocketStates(final.upstreamWebSocketStates)
  )
}

export function validateWorkbenchAcceptanceCleanup(value: unknown): boolean {
  const cleanup = evidenceRecord(value)
  return (
    cleanup !== undefined &&
    cleanup.securityFixtureSocketCount === 0 &&
    closedSocketStates(cleanup.securityFixtureSocketStates) &&
    closedSocketStates(cleanup.fixtureSocketStates) &&
    completeScenarioCleanup(cleanup.securityScenarioCleanup) &&
    completeScenarioCleanup(cleanup.concurrencyScenarioCleanup)
  )
}

export function validateRestrictedEvidence(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const record = value as Record<string, unknown>
  return (
    record.schemaVersion === 1 &&
    Array.isArray(record.matrices) &&
    typeof record.cleanup === 'object' &&
    record.cleanup !== null &&
    typeof record.residualAudit === 'object' &&
    record.residualAudit !== null
  )
}
