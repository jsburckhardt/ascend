export const HOME_WORKBENCH_COMPONENT_ROWS = [
  'normal-open',
  'eight-joined-activations',
  'pending-interaction',
  'stale-success',
  'stale-failure',
  'home',
  'back',
  'forward',
  'refresh',
  'retry',
  'inert-identity',
  'announcement',
  'focus-restoration',
] as const

export const HOME_WORKBENCH_API_ROWS = [
  'valid-stopped',
  'valid-running',
  'decode-failure',
  'empty-id',
  'encoded-slash',
  'encoded-backslash',
  'encoded-nul',
  'sibling-path',
  'id-too-long',
  'unknown-closed',
  'runtime-start-failure',
  'upstream-proxy-failure',
  'document-load-timeout',
] as const

export interface AcceptanceBounds {
  readonly operationMs: number
  readonly startupMs: number
  readonly documentMs: number
  readonly recoveryMs: number
  readonly overallMs: number
  readonly cleanupMs: number
}

export interface AcceptanceMatrixRow {
  readonly id: string
  readonly executionId: string
  readonly executed: true
  readonly outcome: 'passed'
  readonly actionCount: number
  readonly navigationCount: number
  readonly url: string
  readonly historyLength: number
  readonly generation: number
  readonly lookupCount: number
  readonly startCount: number
  readonly focus: string
  readonly announcement: string
  readonly publicError: string | null
  readonly recovery: 'none' | 'Projects' | 'Retry'
  readonly staleMutationCount: number
  readonly assertionCount: number
  readonly cleanupCount: number
}

export interface AcceptanceMatrix {
  readonly schemaVersion: 1
  readonly id: 'component' | 'api'
  readonly bounds: AcceptanceBounds
  readonly rows: readonly AcceptanceMatrixRow[]
}

const protectedEvidence =
  /(?:https?:\/\/|wss?:\/\/|127\.0\.0\.1|localhost|canonicalPath|source|terminal contents|credential|secret)/iu

export const validateAcceptanceMatrix = (matrix: AcceptanceMatrix): boolean => {
  const expected =
    matrix.id === 'component'
      ? HOME_WORKBENCH_COMPONENT_ROWS
      : HOME_WORKBENCH_API_ROWS
  const bounds = Object.values(matrix.bounds)
  const ids = matrix.rows.map((row) => row.id)
  const executionIds = matrix.rows.map((row) => row.executionId)
  return (
    matrix.schemaVersion === 1 &&
    bounds.every((bound) => Number.isSafeInteger(bound) && bound > 0) &&
    matrix.rows.length === expected.length &&
    new Set(ids).size === ids.length &&
    new Set(executionIds).size === executionIds.length &&
    expected.every((id, index) => ids[index] === id) &&
    matrix.rows.every(
      (row) =>
        row.executed === true &&
        row.outcome === 'passed' &&
        /^bl012-(?:component|api)-[a-z0-9-]+$/u.test(row.executionId) &&
        row.url.startsWith('/') &&
        !protectedEvidence.test(JSON.stringify(row)) &&
        [
          row.actionCount,
          row.navigationCount,
          row.historyLength,
          row.generation,
          row.lookupCount,
          row.startCount,
          row.staleMutationCount,
          row.assertionCount,
          row.cleanupCount,
        ].every((value) => Number.isSafeInteger(value) && value >= 0) &&
        row.assertionCount > 0 &&
        row.cleanupCount === 0 &&
        row.focus.length > 0 &&
        row.announcement.length > 0
    )
  )
}
