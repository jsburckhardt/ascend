import { exactKeys, isRecord } from './projects'

export const RUNTIME_STATE_ENDPOINT = '/api/projects/runtime' as const
export const RUNTIME_STATE_TIMEOUT_MS = 5_000 as const
export const PUBLIC_RUNTIME_STATES = [
  'Stopped',
  'Starting',
  'Running',
  'Failed',
] as const
export type PublicRuntimeState = (typeof PUBLIC_RUNTIME_STATES)[number]

export const RUNTIME_FAILURE_CATEGORIES = [
  'unknown-project',
  'canonical-path-invariant',
  'spawn-error',
  'executable-missing',
  'early-exit-code',
  'early-exit-signal',
  'address-in-use-exhausted',
  'readiness-timeout',
  'health-status-unexpected',
  'health-body-unexpected',
  'caller-cancelled',
  'manager-shutdown',
  'stop-unconfirmed',
  'runtime-stopping',
] as const
export type RuntimeFailureCategory = (typeof RUNTIME_FAILURE_CATEGORIES)[number]

export const RUNTIME_FAILURE_NOTICES: Readonly<
  Record<RuntimeFailureCategory, string>
> = Object.freeze({
  'unknown-project': 'The project registration changed before startup.',
  'canonical-path-invariant': 'The project registration is inconsistent.',
  'spawn-error': 'The workbench could not start.',
  'executable-missing': 'The workbench runtime is unavailable.',
  'early-exit-code': 'The workbench exited unexpectedly.',
  'early-exit-signal': 'The workbench stopped unexpectedly.',
  'address-in-use-exhausted':
    'The workbench could not acquire a local listener.',
  'readiness-timeout': 'The workbench did not become ready in time.',
  'health-status-unexpected': 'The workbench health status was invalid.',
  'health-body-unexpected': 'The workbench health response was invalid.',
  'caller-cancelled': 'Workbench startup was cancelled.',
  'manager-shutdown': 'Runtime management is shutting down.',
  'stop-unconfirmed': 'Ascend could not confirm that the workbench stopped.',
  'runtime-stopping': 'The workbench is currently stopping.',
})

const PUBLIC_STATE_SET = new Set<string>(PUBLIC_RUNTIME_STATES)
const FAILURE_CATEGORY_SET = new Set<string>(RUNTIME_FAILURE_CATEGORIES)

export interface RuntimeReport {
  readonly id: string
  readonly state: PublicRuntimeState
  readonly failureCategory?: RuntimeFailureCategory
}

export type RuntimeReconciliation =
  | {
      readonly kind: 'reconciled'
      readonly reports: readonly RuntimeReport[]
    }
  | {
      readonly kind: 'mismatch'
      readonly reason: 'missing' | 'extra' | 'duplicate' | 'order'
    }

export function parseRuntimeStateResponse(
  value: unknown
): readonly RuntimeReport[] {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['runtimes']) ||
    !Array.isArray(value.runtimes)
  ) {
    throw new Error('Invalid runtime state response')
  }
  const ids = new Set<string>()
  const reports = value.runtimes.map((candidate) => {
    if (!isRecord(candidate)) {
      throw new Error('Invalid runtime state response')
    }
    const state = candidate.state
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      typeof state !== 'string' ||
      !PUBLIC_STATE_SET.has(state) ||
      ids.has(candidate.id)
    ) {
      throw new Error('Invalid runtime state response')
    }
    ids.add(candidate.id)
    if (state === 'Failed') {
      if (
        !exactKeys(candidate, ['failureCategory', 'id', 'state']) ||
        typeof candidate.failureCategory !== 'string' ||
        !FAILURE_CATEGORY_SET.has(candidate.failureCategory)
      ) {
        throw new Error('Invalid runtime state response')
      }
      return Object.freeze({
        id: candidate.id,
        state,
        failureCategory: candidate.failureCategory as RuntimeFailureCategory,
      })
    }
    if (!exactKeys(candidate, ['id', 'state'])) {
      throw new Error('Invalid runtime state response')
    }
    return Object.freeze({
      id: candidate.id,
      state: state as Exclude<PublicRuntimeState, 'Failed'>,
    })
  })
  return Object.freeze(reports)
}

export function reconcileRuntimeReports(
  reports: readonly RuntimeReport[],
  projectIds: readonly string[]
): RuntimeReconciliation {
  const reportIds = reports.map(({ id }) => id)
  if (new Set(reportIds).size !== reportIds.length) {
    return Object.freeze({ kind: 'mismatch', reason: 'duplicate' })
  }
  const reportSet = new Set(reportIds)
  const projectSet = new Set(projectIds)
  if (projectIds.some((id) => !reportSet.has(id))) {
    return Object.freeze({ kind: 'mismatch', reason: 'missing' })
  }
  if (reportIds.some((id) => !projectSet.has(id))) {
    return Object.freeze({ kind: 'mismatch', reason: 'extra' })
  }
  if (reports.length < projectIds.length) {
    return Object.freeze({ kind: 'mismatch', reason: 'missing' })
  }
  if (reports.length > projectIds.length) {
    return Object.freeze({ kind: 'mismatch', reason: 'extra' })
  }
  if (reportIds.some((id, index) => id !== projectIds[index])) {
    return Object.freeze({ kind: 'mismatch', reason: 'order' })
  }
  return Object.freeze({ kind: 'reconciled', reports })
}

export type RuntimeStateLoader = (
  signal: AbortSignal
) => Promise<readonly RuntimeReport[]>

export const loadRuntimeStates: RuntimeStateLoader = async (signal) => {
  const response = await fetch(RUNTIME_STATE_ENDPOINT, { signal })
  if (!response.ok) throw new Error('Runtime state request failed')
  return parseRuntimeStateResponse(await response.json())
}
