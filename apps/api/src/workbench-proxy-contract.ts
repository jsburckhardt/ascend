import { createHash } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'
import type { RuntimeFailureCategory } from './project-runtime-contract.js'

export const WORKBENCH_HEADER_TIMEOUT_MS = 5_000 as const
export const WORKBENCH_SHUTDOWN_TIMEOUT_MS = 5_000 as const
export const WORKBENCH_PROJECT_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u

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

const row = (
  category: WorkbenchFailureCategory,
  status: number,
  code: string,
  message: string
): WorkbenchPublicFailure => Object.freeze({ category, status, code, message })

export const WORKBENCH_FAILURE_TABLE: readonly WorkbenchPublicFailure[] =
  Object.freeze([
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

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])
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

export interface WorkbenchSafeEvent {
  readonly event:
    | 'workbench.proxy.started'
    | 'workbench.proxy.completed'
    | 'workbench.proxy.failed'
  readonly projectId: string
  readonly transport: 'http' | 'websocket'
  readonly elapsedMs: number
  readonly classification?: WorkbenchFailureCategory
}

export function serializeWorkbenchEvent(
  event: WorkbenchSafeEvent
): WorkbenchSafeEvent {
  return Object.freeze({
    event: event.event,
    projectId: event.projectId,
    transport: event.transport,
    elapsedMs: Math.max(0, Math.floor(event.elapsedMs)),
    ...(event.classification === undefined
      ? {}
      : { classification: event.classification }),
  })
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
