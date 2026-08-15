export const PROJECT_LIST_ENDPOINT = '/api/projects' as const
export const PROJECT_REGISTRATION_ENDPOINT = '/api/projects' as const
export const PROJECT_LIST_TIMEOUT_MS = 5_000 as const
export const PROJECT_REGISTRATION_TIMEOUT_MS = 10_000 as const

export interface Project {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
  readonly createdAt: number
}

export const REGISTRATION_FAILURE_MESSAGES = {
  path_required: 'Enter a host path.',
  unsupported_path_syntax:
    'Use an absolute path, ~, or a path beginning with ~/.',
  path_not_found: 'That host path does not exist.',
  path_not_directory: 'That host path is not a directory.',
  path_unreadable: 'That host directory is not readable.',
  outside_opening_policy:
    'That host directory is outside the configured opening policy.',
} as const

export type RegistrationFailureCategory =
  keyof typeof REGISTRATION_FAILURE_MESSAGES
export type RegistrationDisposition = 'created' | 'existing'
export type RegistrationKnownResult =
  | {
      readonly kind: 'success'
      readonly disposition: RegistrationDisposition
      readonly project: Project
    }
  | { readonly kind: 'failure'; readonly category: RegistrationFailureCategory }
export type RegistrationTransportResult =
  | RegistrationKnownResult
  | { readonly kind: 'not_transmitted' }
  | { readonly kind: 'unknown' }

const PROJECT_FIELDS = ['canonicalPath', 'createdAt', 'id', 'name'] as const
const REGISTRATION_FAILURES = new Set<string>(
  Object.keys(REGISTRATION_FAILURE_MESSAGES)
)

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

export function parseProject(value: unknown): Project {
  if (!isRecord(value) || !exactKeys(value, PROJECT_FIELDS)) {
    throw new Error('Invalid project response')
  }
  if (typeof value.id !== 'string' || value.id.length === 0)
    throw new Error('Invalid project response')
  if (typeof value.name !== 'string' || value.name.trim().length === 0)
    throw new Error('Invalid project response')
  if (
    typeof value.canonicalPath !== 'string' ||
    value.canonicalPath.length === 0
  )
    throw new Error('Invalid project response')
  if (
    typeof value.createdAt !== 'number' ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0
  )
    throw new Error('Invalid project response')
  return {
    id: value.id,
    name: value.name,
    canonicalPath: value.canonicalPath,
    createdAt: value.createdAt,
  }
}

export function compareProjects(left: Project, right: Project): number {
  if (left.createdAt !== right.createdAt)
    return left.createdAt - right.createdAt
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

export function orderProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort(compareProjects)
}

export function parseProjectListResponse(value: unknown): Project[] {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['projects']) ||
    !Array.isArray(value.projects)
  )
    throw new Error('Invalid project response')
  const ids = new Set<string>()
  const projects = value.projects.map((candidate) => {
    const project = parseProject(candidate)
    if (ids.has(project.id)) throw new Error('Invalid project response')
    ids.add(project.id)
    return project
  })
  return orderProjects(projects)
}

export function parseRegistrationResponse(
  status: number,
  value: unknown
): RegistrationKnownResult {
  if (!isRecord(value)) throw new Error('Invalid registration response')
  if (status === 200 || status === 201) {
    if (!exactKeys(value, ['disposition', 'project']))
      throw new Error('Invalid registration response')
    const expected = status === 201 ? 'created' : 'existing'
    if (value.disposition !== expected)
      throw new Error('Invalid registration response')
    return {
      kind: 'success',
      disposition: expected,
      project: parseProject(value.project),
    }
  }
  if (
    !exactKeys(value, ['error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['category', 'field'])
  )
    throw new Error('Invalid registration response')
  const category = value.error.category
  if (
    typeof category !== 'string' ||
    !REGISTRATION_FAILURES.has(category) ||
    value.error.field !== 'path'
  )
    throw new Error('Invalid registration response')
  const expectedStatus: Readonly<Record<RegistrationFailureCategory, number>> =
    {
      path_required: 400,
      unsupported_path_syntax: 400,
      path_not_found: 404,
      path_not_directory: 422,
      path_unreadable: 403,
      outside_opening_policy: 403,
    }
  if (expectedStatus[category as RegistrationFailureCategory] !== status)
    throw new Error('Invalid registration response')
  return { kind: 'failure', category: category as RegistrationFailureCategory }
}

export type ProjectLoader = (signal: AbortSignal) => Promise<Project[]>
export type RegistrationTransport = (
  payload: string,
  signal: AbortSignal
) => Promise<RegistrationTransportResult>

export const loadProjects: ProjectLoader = async (signal) => {
  const response = await fetch(PROJECT_LIST_ENDPOINT, { signal })
  if (!response.ok) throw new Error('Project list request failed')
  return parseProjectListResponse(await response.json())
}

export interface RegistrationTransportOptions {
  readonly fetcher?: typeof fetch
  readonly preSendAvailable?: () => boolean
  readonly timeoutMs?: number
}

export async function sendRegistrationPayload(
  payload: string,
  ownerSignal: AbortSignal,
  options: RegistrationTransportOptions = {}
): Promise<RegistrationTransportResult> {
  if (options.preSendAvailable?.() === false) return { kind: 'not_transmitted' }
  const timeoutController = new AbortController()
  const timer = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? PROJECT_REGISTRATION_TIMEOUT_MS
  )
  const signal = AbortSignal.any([ownerSignal, timeoutController.signal])
  try {
    const response = await (options.fetcher ?? fetch)(
      PROJECT_REGISTRATION_ENDPOINT,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        signal,
      }
    )
    const text = await response.text()
    const value: unknown = JSON.parse(text)
    return parseRegistrationResponse(response.status, value)
  } catch {
    return { kind: 'unknown' }
  } finally {
    clearTimeout(timer)
  }
}

export const registerProject: RegistrationTransport = sendRegistrationPayload

export function serializeRegistrationPath(path: string): string {
  return JSON.stringify({ path })
}

export const PROJECT_CLOSE_TIMEOUT_MS = 10_000 as const

export const CLOSE_FAILURE_MESSAGES = {
  invalid_project_id: 'The project ID is invalid. Retry this project.',
  project_not_found:
    'The project is no longer registered. Refresh projects to reconcile.',
  project_close_failed: 'The project could not be closed. Retry this project.',
} as const

export type CloseFailureCategory = keyof typeof CLOSE_FAILURE_MESSAGES
export type CloseKnownResult =
  | {
      readonly kind: 'success'
      readonly id: string
      readonly disposition: 'closed'
    }
  | { readonly kind: 'failure'; readonly category: CloseFailureCategory }
export type CloseTransportResult =
  | CloseKnownResult
  | { readonly kind: 'not_transmitted' }
  | { readonly kind: 'unknown' }

export type CloseTransport = (
  id: string,
  signal: AbortSignal,
  onTransmitted?: () => void
) => Promise<CloseTransportResult>

const CLOSE_FAILURE_STATUS: Readonly<Record<CloseFailureCategory, number>> = {
  invalid_project_id: 400,
  project_not_found: 404,
  project_close_failed: 500,
}

export function projectCloseEndpoint(id: string): string {
  return PROJECT_LIST_ENDPOINT + '/' + encodeURIComponent(id)
}

export function parseCloseResponse(
  status: number,
  value: unknown,
  expectedId: string
): CloseKnownResult {
  if (!isRecord(value)) throw new Error('Invalid close response')
  if (status === 200) {
    if (
      !exactKeys(value, ['disposition', 'id']) ||
      value.disposition !== 'closed' ||
      value.id !== expectedId
    ) {
      throw new Error('Invalid close response')
    }
    return { kind: 'success', id: expectedId, disposition: 'closed' }
  }
  if (
    !exactKeys(value, ['error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['category']) ||
    typeof value.error.category !== 'string' ||
    !(value.error.category in CLOSE_FAILURE_STATUS)
  ) {
    throw new Error('Invalid close response')
  }
  const category = value.error.category as CloseFailureCategory
  if (CLOSE_FAILURE_STATUS[category] !== status) {
    throw new Error('Invalid close response')
  }
  return { kind: 'failure', category }
}

export interface CloseTransportOptions {
  readonly fetcher?: typeof fetch
  readonly preSendAvailable?: () => boolean
  readonly timeoutMs?: number
  readonly onTransmitted?: () => void
}

export async function sendCloseRequest(
  id: string,
  ownerSignal: AbortSignal,
  options: CloseTransportOptions = {}
): Promise<CloseTransportResult> {
  if (id.length === 0) {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  let endpoint: string
  try {
    endpoint = projectCloseEndpoint(id)
  } catch {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  try {
    if (options.preSendAvailable?.() === false) {
      return { kind: 'not_transmitted' }
    }
  } catch {
    return { kind: 'not_transmitted' }
  }
  const timeoutController = new AbortController()
  const timer = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? PROJECT_CLOSE_TIMEOUT_MS
  )
  const signal = AbortSignal.any([ownerSignal, timeoutController.signal])
  try {
    options.onTransmitted?.()
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: 'DELETE',
      signal,
    })
    const text = await response.text()
    const value: unknown = JSON.parse(text)
    return parseCloseResponse(response.status, value, id)
  } catch {
    return { kind: 'unknown' }
  } finally {
    clearTimeout(timer)
  }
}

export const closeProject: CloseTransport = (id, signal, onTransmitted) =>
  sendCloseRequest(id, signal, { onTransmitted })
