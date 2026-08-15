import { exactKeys, isRecord } from './projects'

export const RUNTIME_RESTART_TIMEOUT_MS = 85_000 as const
export const RUNTIME_RESTART_OUTCOMES = Object.freeze(['restarted'] as const)
export type RuntimeRestartSuccessOutcome =
  (typeof RUNTIME_RESTART_OUTCOMES)[number]

export const RUNTIME_RESTART_ERROR_CATEGORIES = Object.freeze([
  'invalid_project_id',
  'invalid_restart_request',
  'project_not_found',
  'runtime_not_managed',
  'runtime_start_in_progress',
  'runtime_stop_in_progress',
  'runtime_restart_release_unconfirmed',
  'runtime_replacement_failed',
  'runtime_manager_shutdown',
  'runtime_restart_failed',
] as const)
export type RuntimeRestartErrorCategory =
  (typeof RUNTIME_RESTART_ERROR_CATEGORIES)[number]

export const RUNTIME_RESTART_NOTICES: Readonly<
  Record<RuntimeRestartErrorCategory, string>
> = Object.freeze({
  invalid_project_id: 'The project ID is invalid. Retry this workbench.',
  invalid_restart_request:
    'The workbench restart request was invalid. Retry this workbench.',
  project_not_found:
    'The project is no longer registered. Refresh projects to reconcile.',
  runtime_not_managed:
    'This workbench is not managed by the current Ascend session.',
  runtime_start_in_progress:
    'The workbench is still starting. Retry after startup settles.',
  runtime_stop_in_progress:
    'The workbench is stopping. Retry after stop settles.',
  runtime_restart_release_unconfirmed:
    'Ascend could not release the previous workbench session.',
  runtime_replacement_failed: 'Ascend could not start a replacement workbench.',
  runtime_manager_shutdown: 'Runtime management is shutting down. Retry later.',
  runtime_restart_failed:
    'The workbench could not be restarted. Retry this workbench.',
})

const RUNTIME_RESTART_STATUS: Readonly<
  Record<RuntimeRestartErrorCategory, number>
> = Object.freeze({
  invalid_project_id: 400,
  invalid_restart_request: 400,
  project_not_found: 404,
  runtime_not_managed: 409,
  runtime_start_in_progress: 409,
  runtime_stop_in_progress: 409,
  runtime_restart_release_unconfirmed: 500,
  runtime_replacement_failed: 500,
  runtime_manager_shutdown: 503,
  runtime_restart_failed: 500,
})
const OUTCOME_SET = new Set<string>(RUNTIME_RESTART_OUTCOMES)
const ERROR_CATEGORY_SET = new Set<string>(RUNTIME_RESTART_ERROR_CATEGORIES)

export type RuntimeRestartKnownResult =
  | {
      readonly kind: 'success'
      readonly id: string
      readonly outcome: RuntimeRestartSuccessOutcome
    }
  | {
      readonly kind: 'failure'
      readonly category: RuntimeRestartErrorCategory
    }

export type RuntimeRestartTransportResult =
  RuntimeRestartKnownResult | { readonly kind: 'unknown' }

export type RuntimeRestartTransport = (
  id: string,
  signal: AbortSignal
) => Promise<RuntimeRestartTransportResult>

export function runtimeRestartEndpoint(id: string): string {
  return `/api/projects/${encodeURIComponent(id)}/runtime/restart`
}

export function parseRuntimeRestartResponse(
  status: number,
  value: unknown,
  expectedId: string
): RuntimeRestartKnownResult {
  if (!isRecord(value)) throw new Error('Invalid runtime restart response')
  if (status === 200) {
    if (
      !exactKeys(value, ['id', 'outcome']) ||
      value.id !== expectedId ||
      typeof value.outcome !== 'string' ||
      !OUTCOME_SET.has(value.outcome)
    ) {
      throw new Error('Invalid runtime restart response')
    }
    return {
      kind: 'success',
      id: expectedId,
      outcome: value.outcome as RuntimeRestartSuccessOutcome,
    }
  }
  if (
    !exactKeys(value, ['error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['category']) ||
    typeof value.error.category !== 'string' ||
    !ERROR_CATEGORY_SET.has(value.error.category)
  ) {
    throw new Error('Invalid runtime restart response')
  }
  const category = value.error.category as RuntimeRestartErrorCategory
  if (RUNTIME_RESTART_STATUS[category] !== status) {
    throw new Error('Invalid runtime restart response')
  }
  return { kind: 'failure', category }
}

export interface RuntimeRestartTransportOptions {
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

export async function sendRuntimeRestartRequest(
  id: string,
  ownerSignal: AbortSignal,
  options: RuntimeRestartTransportOptions = {}
): Promise<RuntimeRestartTransportResult> {
  if (id.length === 0) {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  let endpoint: string
  try {
    endpoint = runtimeRestartEndpoint(id)
  } catch {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  const timeoutController = new AbortController()
  const timer = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? RUNTIME_RESTART_TIMEOUT_MS
  )
  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: 'POST',
      signal: AbortSignal.any([ownerSignal, timeoutController.signal]),
    })
    return parseRuntimeRestartResponse(
      response.status,
      JSON.parse(await response.text()) as unknown,
      id
    )
  } catch {
    return { kind: 'unknown' }
  } finally {
    clearTimeout(timer)
  }
}

export const restartRuntime: RuntimeRestartTransport = sendRuntimeRestartRequest
