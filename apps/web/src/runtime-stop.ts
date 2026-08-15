import { exactKeys, isRecord } from './projects'

export const RUNTIME_STOP_TIMEOUT_MS = 10_000 as const
export const RUNTIME_STOP_OUTCOMES = Object.freeze([
  'stopped',
  'already-stopped',
] as const)
export type RuntimeStopSuccessOutcome = (typeof RUNTIME_STOP_OUTCOMES)[number]

export const RUNTIME_STOP_ERROR_CATEGORIES = Object.freeze([
  'invalid_project_id',
  'invalid_stop_request',
  'project_not_found',
  'runtime_not_managed',
  'runtime_start_in_progress',
  'runtime_restart_in_progress',
  'runtime_failure_retained',
  'runtime_stop_unconfirmed',
  'runtime_manager_shutdown',
  'runtime_stop_failed',
] as const)
export type RuntimeStopErrorCategory =
  (typeof RUNTIME_STOP_ERROR_CATEGORIES)[number]

export const RUNTIME_STOP_NOTICES: Readonly<
  Record<RuntimeStopErrorCategory, string>
> = Object.freeze({
  invalid_project_id: 'The project ID is invalid. Retry this workbench.',
  invalid_stop_request:
    'The workbench stop request was invalid. Retry this workbench.',
  project_not_found:
    'The project is no longer registered. Refresh projects to reconcile.',
  runtime_not_managed:
    'This workbench is not managed by the current Ascend session.',
  runtime_start_in_progress:
    'The workbench is still starting. Retry after startup settles.',
  runtime_restart_in_progress:
    'The workbench is restarting. Retry after restart settles.',
  runtime_failure_retained: 'The workbench has a retained runtime failure.',
  runtime_stop_unconfirmed:
    'Ascend could not confirm that the workbench stopped.',
  runtime_manager_shutdown: 'Runtime management is shutting down. Retry later.',
  runtime_stop_failed:
    'The workbench could not be stopped. Retry this workbench.',
})

const RUNTIME_STOP_STATUS: Readonly<Record<RuntimeStopErrorCategory, number>> =
  Object.freeze({
    invalid_project_id: 400,
    invalid_stop_request: 400,
    project_not_found: 404,
    runtime_not_managed: 409,
    runtime_start_in_progress: 409,
    runtime_restart_in_progress: 409,
    runtime_failure_retained: 409,
    runtime_stop_unconfirmed: 500,
    runtime_manager_shutdown: 503,
    runtime_stop_failed: 500,
  })
const OUTCOME_SET = new Set<string>(RUNTIME_STOP_OUTCOMES)
const ERROR_CATEGORY_SET = new Set<string>(RUNTIME_STOP_ERROR_CATEGORIES)

export type RuntimeStopKnownResult =
  | {
      readonly kind: 'success'
      readonly id: string
      readonly outcome: RuntimeStopSuccessOutcome
    }
  | {
      readonly kind: 'failure'
      readonly category: RuntimeStopErrorCategory
    }

export type RuntimeStopTransportResult =
  RuntimeStopKnownResult | { readonly kind: 'unknown' }

export type RuntimeStopTransport = (
  id: string,
  signal: AbortSignal
) => Promise<RuntimeStopTransportResult>

export function runtimeStopEndpoint(id: string): string {
  return `/api/projects/${encodeURIComponent(id)}/runtime/stop`
}

export function parseRuntimeStopResponse(
  status: number,
  value: unknown,
  expectedId: string
): RuntimeStopKnownResult {
  if (!isRecord(value)) throw new Error('Invalid runtime stop response')
  if (status === 200) {
    if (
      !exactKeys(value, ['id', 'outcome']) ||
      value.id !== expectedId ||
      typeof value.outcome !== 'string' ||
      !OUTCOME_SET.has(value.outcome)
    ) {
      throw new Error('Invalid runtime stop response')
    }
    return {
      kind: 'success',
      id: expectedId,
      outcome: value.outcome as RuntimeStopSuccessOutcome,
    }
  }
  if (
    !exactKeys(value, ['error']) ||
    !isRecord(value.error) ||
    !exactKeys(value.error, ['category']) ||
    typeof value.error.category !== 'string' ||
    !ERROR_CATEGORY_SET.has(value.error.category)
  ) {
    throw new Error('Invalid runtime stop response')
  }
  const category = value.error.category as RuntimeStopErrorCategory
  if (RUNTIME_STOP_STATUS[category] !== status) {
    throw new Error('Invalid runtime stop response')
  }
  return { kind: 'failure', category }
}

export interface RuntimeStopTransportOptions {
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

export async function sendRuntimeStopRequest(
  id: string,
  ownerSignal: AbortSignal,
  options: RuntimeStopTransportOptions = {}
): Promise<RuntimeStopTransportResult> {
  if (id.length === 0) {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  let endpoint: string
  try {
    endpoint = runtimeStopEndpoint(id)
  } catch {
    return { kind: 'failure', category: 'invalid_project_id' }
  }
  const timeoutController = new AbortController()
  const timer = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? RUNTIME_STOP_TIMEOUT_MS
  )
  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: 'POST',
      signal: AbortSignal.any([ownerSignal, timeoutController.signal]),
    })
    return parseRuntimeStopResponse(
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

export const stopRuntime: RuntimeStopTransport = sendRuntimeStopRequest
