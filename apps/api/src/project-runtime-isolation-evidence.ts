export const BL013_SCENARIOS = Object.freeze([
  'interleaved-24',
  'early-exit',
  'crash',
  'readiness-failure',
  'health-failure',
  'proxy-failure',
  'all-callers-cancel',
  'one-caller-cancel',
  'explicit-replacement',
  'global-shutdown',
  'shutdown-race',
])

export const BL013_MISMATCH_CLASSES = Object.freeze([
  'project-route',
  'http-target',
  'websocket-target',
  'frame-destination',
])

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const zeroResources = (value: unknown): boolean => {
  const candidate = record(value)
  return (
    candidate !== undefined &&
    ['processes', 'listeners', 'sockets', 'operations'].every(
      (key) => candidate[key] === 0
    )
  )
}

export function validateProjectRuntimeIsolationEvidence(
  value: unknown
): boolean {
  const artifact = record(value)
  if (
    artifact?.schemaVersion !== 1 ||
    artifact.suite !== 'BL-013' ||
    artifact.localOnly !== true ||
    artifact.networkRequired !== false ||
    artifact.manualJudgment !== false ||
    !Number.isSafeInteger(artifact.timeoutMs) ||
    Number(artifact.timeoutMs) <= 0 ||
    !Array.isArray(artifact.scenarios) ||
    !Array.isArray(artifact.crossTargetRows) ||
    !Array.isArray(artifact.protectedScans)
  )
    return false
  const scenarios = artifact.scenarios.map(record)
  const names = scenarios.map((entry) => entry?.scenario)
  const ids = scenarios.map((entry) => entry?.executionId)
  if (
    JSON.stringify(names) !== JSON.stringify(BL013_SCENARIOS) ||
    ids.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(ids).size !== ids.length ||
    scenarios.some(
      (entry) =>
        entry?.boundaryObserved !== true ||
        entry.passed !== true ||
        !Number.isSafeInteger(entry.invocationCount) ||
        Number(entry.invocationCount) < 1 ||
        !Array.isArray(entry.observations) ||
        entry.observations.length === 0 ||
        !Array.isArray(entry.events) ||
        entry.events.length === 0 ||
        !zeroResources(entry.cleanup)
    )
  )
    return false
  const orderedPairs = ['a>b', 'a>c', 'b>a', 'b>c', 'c>a', 'c>b']
  const expectedRows = BL013_MISMATCH_CLASSES.flatMap((mismatchClass) =>
    orderedPairs.map((pair) => mismatchClass + ':' + pair)
  )
  const actualRows = artifact.crossTargetRows.map((value) => {
    const row = record(value)
    return row === undefined ||
      row.executed !== true ||
      row.reachedNonmatchingRuntime !== false ||
      row.residualResources !== 0
      ? undefined
      : String(row.mismatchClass) + ':' + String(row.orderedPair)
  })
  if (JSON.stringify(actualRows) !== JSON.stringify(expectedRows)) return false
  if (
    artifact.protectedScans.length === 0 ||
    artifact.protectedScans.some((value) => {
      const scan = record(value)
      return scan?.literalMatches !== 0 || scan.encodedMatches !== 0
    })
  )
    return false
  const guard = record(artifact.contractGuard)
  if (
    guard?.productionAccepted !== true ||
    guard.singletonRejected !== true ||
    guard.pathKeyRejected !== true ||
    guard.nameKeyRejected !== true
  )
    return false
  return zeroResources(artifact.residualUnion)
}
