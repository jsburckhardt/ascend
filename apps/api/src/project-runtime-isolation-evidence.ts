import { createHash } from 'node:crypto'

export const BL013_SCENARIOS = Object.freeze([
  'interleaved-24',
  'invalid-identifiers',
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

export const BL013_RESOURCE_CLASSES = Object.freeze([
  'browser-groups',
  'proxy-operations',
  'runtime-processes',
  'process-groups',
  'listeners',
  'sockets',
  'databases',
  'fixtures',
  'terminal-commands',
  'background-work',
])

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

export interface ProtectedEvidenceSource {
  readonly sourceId: string
  readonly content: string
}

export interface ProtectedEvidenceScan {
  readonly scanId: string
  readonly kind: string
  readonly scanner: 'scanProtectedEvidence'
  readonly sourceIds: readonly string[]
  readonly scannedBytes: number
  readonly scannedDigest: string
  readonly protectedValueCount: number
  readonly protectedValueDigests: readonly string[]
  readonly literalMatches: readonly string[]
  readonly encodedMatches: readonly string[]
}

export function scanProtectedEvidence(input: {
  readonly scanId: string
  readonly kind: string
  readonly sources: readonly ProtectedEvidenceSource[]
  readonly protectedValues: readonly string[]
}): ProtectedEvidenceScan {
  const sourceText = input.sources
    .map((source) => source.sourceId + '\n' + source.content)
    .join('\n')
  const protectedValues = [...new Set(input.protectedValues.filter(Boolean))]
  const literalMatches: string[] = []
  const encodedMatches: string[] = []
  for (const value of protectedValues) {
    const valueDigest = digest(value)
    if (sourceText.includes(value)) literalMatches.push(valueDigest)
    const encodedForms = [
      encodeURIComponent(value),
      Buffer.from(value).toString('base64'),
      Buffer.from(value).toString('hex'),
    ].filter((candidate) => candidate !== value)
    if (encodedForms.some((candidate) => sourceText.includes(candidate)))
      encodedMatches.push(valueDigest)
  }
  return Object.freeze({
    scanId: input.scanId,
    kind: input.kind,
    scanner: 'scanProtectedEvidence',
    sourceIds: Object.freeze(input.sources.map(({ sourceId }) => sourceId)),
    scannedBytes: Buffer.byteLength(sourceText),
    scannedDigest: digest(sourceText),
    protectedValueCount: protectedValues.length,
    protectedValueDigests: Object.freeze(protectedValues.map(digest)),
    literalMatches: Object.freeze(literalMatches),
    encodedMatches: Object.freeze(encodedMatches),
  })
}

const measuredCleanup = (value: unknown): boolean => {
  const cleanup = record(value)
  if (
    cleanup?.measurementId === undefined ||
    cleanup.measured !== true ||
    !Array.isArray(cleanup.checks) ||
    cleanup.checks.length === 0
  )
    return false
  return cleanup.checks.every((value) => {
    const check = record(value)
    return (
      typeof check?.resourceClass === 'string' &&
      BL013_RESOURCE_CLASSES.includes(
        check.resourceClass as (typeof BL013_RESOURCE_CLASSES)[number]
      ) &&
      check.executed === true &&
      Number.isSafeInteger(check.before) &&
      Number(check.before) >= 0 &&
      check.after === 0 &&
      typeof check.method === 'string' &&
      check.method.length > 0
    )
  })
}

const allowedEvents = new Set([
  'runtime.start.requested',
  'runtime.start.succeeded',
  'runtime.start.failed',
  'runtime.health.changed',
  'runtime.exited',
  'workbench.proxy.started',
  'workbench.proxy.completed',
  'workbench.proxy.failed',
])
const allowedStates = new Set(['stopped', 'starting', 'running', 'failed'])

export function validateProjectRuntimeIsolationEvidence(
  value: unknown
): boolean {
  const artifact = record(value)
  if (
    artifact?.schemaVersion !== 2 ||
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
    ids.some((id) => typeof id !== 'string' || id.length < 8) ||
    new Set(ids).size !== ids.length
  )
    return false
  const eventIds: string[] = []
  for (const scenario of scenarios) {
    if (
      scenario?.boundaryObserved !== true ||
      scenario.passed !== true ||
      !Number.isSafeInteger(scenario.invocationCount) ||
      Number(scenario.invocationCount) < 1 ||
      !Number.isSafeInteger(scenario.elapsedMs) ||
      Number(scenario.elapsedMs) < 0 ||
      !Array.isArray(scenario.observations) ||
      scenario.observations.length === 0 ||
      !Array.isArray(scenario.events) ||
      scenario.events.length === 0 ||
      !measuredCleanup(scenario.cleanup)
    )
      return false
    for (const value of scenario.events) {
      const event = record(value)
      if (event === undefined) return false
      if (
        event.executionId !== scenario.executionId ||
        typeof event.eventId !== 'string' ||
        event.eventId.length < 8 ||
        typeof event.projectToken !== 'string' ||
        !event.projectToken.startsWith('project-') ||
        !allowedEvents.has(String(event.event)) ||
        !Number.isSafeInteger(event.elapsedMs) ||
        Number(event.elapsedMs) < 0 ||
        (event.source === 'runtime' &&
          (!allowedStates.has(String(event.from)) ||
            !allowedStates.has(String(event.to)))) ||
        (event.source === 'proxy' &&
          !['http', 'websocket'].includes(String(event.transport)))
      )
        return false
      eventIds.push(String(event.eventId))
    }
  }
  if (new Set(eventIds).size !== eventIds.length) return false
  const scenarioByName = new Map(
    scenarios.map((scenario) => [scenario?.scenario, scenario])
  )
  const observation = (name: string) => {
    const observations = scenarioByName.get(name)?.observations
    return Array.isArray(observations) ? record(observations[0]) : undefined
  }
  if (
    scenarioByName.get('interleaved-24')?.invocationCount !== 24 ||
    observation('interleaved-24')?.launchCount !== 3 ||
    observation('interleaved-24')?.readinessCount !== 3 ||
    observation('one-caller-cancel')?.cancelledCallers !== 1 ||
    observation('one-caller-cancel')?.runningCallers !== 7 ||
    observation('all-callers-cancel')?.cancelledCallers !== 8 ||
    observation('explicit-replacement')?.replacementCount !== 1 ||
    observation('global-shutdown')?.projectAuditCount !== 3 ||
    observation('shutdown-race')?.duringRejected !== true ||
    observation('shutdown-race')?.afterRejected !== true
  )
    return false
  const orderedPairs = ['a>b', 'a>c', 'b>a', 'b>c', 'c>a', 'c>b']
  const expectedRows = BL013_MISMATCH_CLASSES.flatMap((mismatchClass) =>
    orderedPairs.map((pair) => mismatchClass + ':' + pair)
  )
  const rowIds: string[] = []
  const actualRows = artifact.crossTargetRows.map((value) => {
    const row = record(value)
    const transport =
      row?.mismatchClass === 'project-route' ||
      row?.mismatchClass === 'http-target'
        ? 'http'
        : 'websocket'
    if (
      row?.executed !== true ||
      row.transport !== transport ||
      typeof row.executionId !== 'string' ||
      typeof row.boundaryId !== 'string' ||
      row.expectedFailure !== 'workbench_runtime_project_mismatch' ||
      row.observedFailure !== row.expectedFailure ||
      row.upstreamContactCount !== 0 ||
      !measuredCleanup(row.cleanup)
    )
      return undefined
    rowIds.push(String(row.executionId), String(row.boundaryId))
    return String(row.mismatchClass) + ':' + String(row.orderedPair)
  })
  if (
    JSON.stringify(actualRows) !== JSON.stringify(expectedRows) ||
    new Set(rowIds).size !== rowIds.length
  )
    return false
  if (
    artifact.protectedScans.length < 5 ||
    artifact.protectedScans.some((value) => {
      const scan = record(value)
      return (
        scan?.scanner !== 'scanProtectedEvidence' ||
        typeof scan.scanId !== 'string' ||
        !Array.isArray(scan.sourceIds) ||
        scan.sourceIds.length === 0 ||
        !Number.isSafeInteger(scan.scannedBytes) ||
        Number(scan.scannedBytes) <= 0 ||
        !Number.isSafeInteger(scan.protectedValueCount) ||
        Number(scan.protectedValueCount) <= 0 ||
        !Array.isArray(scan.protectedValueDigests) ||
        scan.protectedValueDigests.length !== scan.protectedValueCount ||
        !Array.isArray(scan.literalMatches) ||
        scan.literalMatches.length !== 0 ||
        !Array.isArray(scan.encodedMatches) ||
        scan.encodedMatches.length !== 0
      )
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
  return measuredCleanup(artifact.residualUnion)
}
