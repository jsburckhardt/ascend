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
const safeProjectToken = (token: unknown): token is string =>
  typeof token === 'string' && /^project-[a-f0-9]{16}$/u.test(token)

type ProjectRole = 'a' | 'b' | 'c' | 'unknown' | 'closed'
type ExpectedEvent = Readonly<{
  source: 'runtime' | 'proxy'
  event: string
  project: ProjectRole
  from?: string
  to?: string
  classification?: string
  transport?: 'http' | 'websocket'
  elapsedClass: 'zero' | 'within-suite-bound'
}>

const runtimeStart = (project: ProjectRole, from = 'stopped'): ExpectedEvent =>
  Object.freeze({
    source: 'runtime',
    event: 'runtime.start.requested',
    project,
    from,
    to: 'starting',
    elapsedClass: 'zero',
  })
const runtimeRunning = (project: ProjectRole): ExpectedEvent =>
  Object.freeze({
    source: 'runtime',
    event: 'runtime.start.succeeded',
    project,
    from: 'starting',
    to: 'running',
    elapsedClass: 'within-suite-bound',
  })
const runtimeFailure = (
  project: ProjectRole,
  event: 'runtime.start.failed' | 'runtime.health.changed' | 'runtime.exited',
  from: 'starting' | 'running',
  classification: string
): ExpectedEvent =>
  Object.freeze({
    source: 'runtime',
    event,
    project,
    from,
    to: 'failed',
    classification,
    elapsedClass: 'within-suite-bound',
  })
const proxyEvent = (
  project: ProjectRole,
  event: 'workbench.proxy.started' | 'workbench.proxy.failed',
  classification?: string
): ExpectedEvent =>
  Object.freeze({
    source: 'proxy',
    event,
    project,
    transport: 'http',
    ...(classification === undefined ? {} : { classification }),
    elapsedClass:
      event === 'workbench.proxy.started' ? 'zero' : 'within-suite-bound',
  })

const threeStarts = Object.freeze([
  runtimeStart('a'),
  runtimeStart('b'),
  runtimeStart('c'),
])
const threeRunning = Object.freeze([
  runtimeRunning('a'),
  runtimeRunning('b'),
  runtimeRunning('c'),
])
const cancellationStarts = Object.freeze([
  runtimeStart('a'),
  runtimeStart('c'),
  runtimeStart('b'),
])
const shutdownEvents = Object.freeze([
  runtimeStart('a'),
  runtimeStart('b'),
  runtimeRunning('a'),
  runtimeRunning('b'),
  runtimeStart('c'),
  runtimeFailure('c', 'runtime.start.failed', 'starting', 'manager-shutdown'),
])

export const BL013_EVENT_EXPECTATIONS: Readonly<
  Record<(typeof BL013_SCENARIOS)[number], readonly ExpectedEvent[]>
> = Object.freeze({
  'interleaved-24': Object.freeze([...threeStarts, ...threeRunning]),
  'invalid-identifiers': Object.freeze([
    proxyEvent('unknown', 'workbench.proxy.started'),
    proxyEvent('unknown', 'workbench.proxy.failed', 'unknown-project'),
    proxyEvent('closed', 'workbench.proxy.started'),
    proxyEvent('closed', 'workbench.proxy.failed', 'unknown-project'),
  ]),
  'early-exit': Object.freeze([
    ...threeStarts,
    runtimeFailure('b', 'runtime.start.failed', 'starting', 'early-exit-code'),
    runtimeRunning('a'),
    runtimeRunning('c'),
  ]),
  crash: Object.freeze([
    ...threeStarts,
    ...threeRunning,
    runtimeFailure('b', 'runtime.exited', 'running', 'early-exit-code'),
  ]),
  'readiness-failure': Object.freeze([
    ...threeStarts,
    runtimeFailure(
      'b',
      'runtime.start.failed',
      'starting',
      'readiness-timeout'
    ),
    runtimeRunning('a'),
    runtimeRunning('c'),
  ]),
  'health-failure': Object.freeze([
    ...threeStarts,
    ...threeRunning,
    runtimeFailure(
      'b',
      'runtime.health.changed',
      'running',
      'health-status-unexpected'
    ),
  ]),
  'proxy-failure': Object.freeze([
    ...threeStarts,
    ...threeRunning,
    proxyEvent('b', 'workbench.proxy.started'),
    proxyEvent('b', 'workbench.proxy.failed', 'upstream-reset'),
  ]),
  'all-callers-cancel': Object.freeze([
    ...cancellationStarts,
    runtimeRunning('a'),
    runtimeRunning('c'),
    runtimeFailure('b', 'runtime.start.failed', 'starting', 'caller-cancelled'),
  ]),
  'one-caller-cancel': Object.freeze([
    ...cancellationStarts,
    runtimeRunning('a'),
    runtimeRunning('c'),
    runtimeRunning('b'),
  ]),
  'explicit-replacement': Object.freeze([
    runtimeStart('b', 'failed'),
    runtimeRunning('b'),
  ]),
  'global-shutdown': shutdownEvents,
  'shutdown-race': shutdownEvents,
})

const measuredManagerAudit = (
  value: unknown,
  measurementId: string,
  timeoutMs: number
): boolean => {
  const measurement = record(value)
  const before = record(measurement?.before)
  const after = record(measurement?.after)
  const countKeys = [
    'entryCount',
    'startingEntries',
    'ownershipRecords',
    'completionTasks',
    'backgroundTasks',
  ] as const
  return (
    measurement?.measurementId === measurementId &&
    measurement.inspector === 'runtime-manager-audit' &&
    measurement.executed === true &&
    Number.isSafeInteger(measurement.boundedWaitMs) &&
    Number(measurement.boundedWaitMs) > 0 &&
    Number(measurement.boundedWaitMs) <= timeoutMs &&
    before?.shuttingDown === false &&
    after?.shuttingDown === true &&
    countKeys.every(
      (key) => Number.isSafeInteger(before?.[key]) && Number(before?.[key]) >= 0
    ) &&
    Number(before?.entryCount) > 0 &&
    Number(before?.ownershipRecords) > 0 &&
    Number(before?.completionTasks) + Number(before?.backgroundTasks) > 0 &&
    countKeys.every((key) => after?.[key] === 0)
  )
}

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
  const projectTokens = record(artifact.projectTokens)
  const projectRoles: readonly ProjectRole[] = [
    'a',
    'b',
    'c',
    'unknown',
    'closed',
  ]
  if (
    projectTokens === undefined ||
    JSON.stringify(Object.keys(projectTokens)) !==
      JSON.stringify(projectRoles) ||
    projectRoles.some((role) => !safeProjectToken(projectTokens[role])) ||
    new Set(projectRoles.map((role) => projectTokens[role])).size !==
      projectRoles.length ||
    JSON.stringify(artifact.eventExpectations) !==
      JSON.stringify(BL013_EVENT_EXPECTATIONS)
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
      !measuredCleanup(scenario.cleanup)
    )
      return false
    const expected =
      BL013_EVENT_EXPECTATIONS[
        scenario.scenario as (typeof BL013_SCENARIOS)[number]
      ]
    if (expected === undefined || scenario.events.length !== expected.length)
      return false
    for (const [index, value] of scenario.events.entries()) {
      const event = record(value)
      const expectation = expected[index]
      if (event === undefined || expectation === undefined) return false
      const elapsedValid =
        expectation.elapsedClass === 'zero'
          ? event.elapsedMs === 0
          : Number.isSafeInteger(event.elapsedMs) &&
            Number(event.elapsedMs) >= 0 &&
            Number(event.elapsedMs) <= Number(artifact.timeoutMs)
      if (
        event.executionId !== scenario.executionId ||
        event.eventId !==
          String(scenario.executionId) + '-event-' + String(index + 1) ||
        event.projectToken !== projectTokens[expectation.project] ||
        !safeProjectToken(event.projectToken) ||
        event.source !== expectation.source ||
        event.event !== expectation.event ||
        !allowedEvents.has(String(event.event)) ||
        event.classification !== expectation.classification ||
        event.elapsedClass !== expectation.elapsedClass ||
        !elapsedValid ||
        (expectation.source === 'runtime' &&
          (event.from !== expectation.from ||
            event.to !== expectation.to ||
            !allowedStates.has(String(event.from)) ||
            !allowedStates.has(String(event.to)) ||
            event.transport !== undefined)) ||
        (expectation.source === 'proxy' &&
          (event.transport !== expectation.transport ||
            event.from !== undefined ||
            event.to !== undefined))
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
  const globalShutdown = observation('global-shutdown')
  const shutdownRace = observation('shutdown-race')
  if (
    scenarioByName.get('interleaved-24')?.invocationCount !== 24 ||
    observation('interleaved-24')?.launchCount !== 3 ||
    observation('interleaved-24')?.readinessCount !== 3 ||
    observation('one-caller-cancel')?.cancelledCallers !== 1 ||
    observation('one-caller-cancel')?.runningCallers !== 7 ||
    observation('all-callers-cancel')?.cancelledCallers !== 8 ||
    observation('explicit-replacement')?.replacementCount !== 1 ||
    globalShutdown?.projectAuditCount !== 3 ||
    globalShutdown.unrelatedProcessAndListenerSurvived !== true ||
    !measuredManagerAudit(
      globalShutdown.managerAudit,
      'global-shutdown-manager-audit',
      Number(artifact.timeoutMs)
    ) ||
    shutdownRace?.memoizedShutdown !== true ||
    shutdownRace.duringRejected !== true ||
    shutdownRace.afterRejected !== true ||
    shutdownRace.lateSettlementInstalled !== false ||
    shutdownRace.unrelatedProcessSurvived !== true ||
    shutdownRace.unrelatedListenerSurvived !== true ||
    !measuredManagerAudit(
      shutdownRace.managerAudit,
      'shutdown-race-manager-audit',
      Number(artifact.timeoutMs)
    )
  )
    return false
  const orderedPairs = ['a>b', 'a>c', 'b>a', 'b>c', 'c>a', 'c>b']
  const expectedRows = BL013_MISMATCH_CLASSES.flatMap((mismatchClass) =>
    orderedPairs.map((pair) => mismatchClass + ':' + pair)
  )
  const rowIds: string[] = []
  const safeDigest = (value: unknown): value is string =>
    typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
  const actualRows = artifact.crossTargetRows.map((value) => {
    const row = record(value)
    const transport =
      row?.mismatchClass === 'project-route' ||
      row?.mismatchClass === 'http-target'
        ? 'http'
        : 'websocket'
    const [sourceRole, targetRole] = String(row?.orderedPair).split('>')
    if (
      !['a', 'b', 'c'].includes(sourceRole) ||
      !['a', 'b', 'c'].includes(targetRole) ||
      row?.projectToken !== projectTokens[sourceRole] ||
      row?.requestedDestinationToken !== projectTokens[targetRole]
    )
      return undefined
    if (
      row?.executed !== true ||
      row.transport !== transport ||
      typeof row.executionId !== 'string' ||
      typeof row.boundaryId !== 'string' ||
      !safeProjectToken(row.projectToken) ||
      !safeProjectToken(row.requestedDestinationToken) ||
      row.projectToken === row.requestedDestinationToken ||
      !measuredCleanup(row.cleanup)
    )
      return undefined

    if (row.mismatchClass === 'frame-destination') {
      const frameExecutionIds = Array.isArray(row.frameExecutionIds)
        ? row.frameExecutionIds
        : []
      const sourceReceiptIds = Array.isArray(row.sourceReceiptIds)
        ? row.sourceReceiptIds
        : []
      const mismatchedTargetReceiptIds = Array.isArray(
        row.mismatchedTargetReceiptIds
      )
        ? row.mismatchedTargetReceiptIds
        : []
      const targetControlReceiptIds = Array.isArray(row.targetControlReceiptIds)
        ? row.targetControlReceiptIds
        : []
      const textFrame = record(row.textFrame)
      const binaryFrame = record(row.binaryFrame)
      const targetControlFrame = record(row.targetControlFrame)
      if (
        row.boundaryId !== row.sourceBoundaryId ||
        typeof row.sourceBoundaryId !== 'string' ||
        typeof row.targetBoundaryId !== 'string' ||
        row.sourceBoundaryId === row.targetBoundaryId ||
        row.sourceBoundaryEstablished !== true ||
        row.targetBoundaryEstablished !== true ||
        row.expectedOutcome !== 'route-bound-source-only' ||
        row.observedOutcome !== row.expectedOutcome ||
        frameExecutionIds.length !== 2 ||
        frameExecutionIds.some(
          (id) =>
            typeof id !== 'string' || !id.startsWith(row.executionId + '-')
        ) ||
        new Set(frameExecutionIds).size !== 2 ||
        sourceReceiptIds.length !== 2 ||
        sourceReceiptIds.some(
          (id) => typeof id !== 'string' || id.length < 8
        ) ||
        new Set(sourceReceiptIds).size !== 2 ||
        mismatchedTargetReceiptIds.length !== 0 ||
        typeof row.targetControlExecutionId !== 'string' ||
        frameExecutionIds.includes(row.targetControlExecutionId) ||
        targetControlReceiptIds.length !== 1 ||
        typeof targetControlReceiptIds[0] !== 'string' ||
        row.sourceReceiptCount !== 2 ||
        row.mismatchedTargetReceiptCount !== 0 ||
        row.targetControlReceiptCount !== 1 ||
        row.upstreamContactCount !== 0 ||
        !safeDigest(textFrame?.payloadDigest) ||
        textFrame.echoedDigest !== textFrame.payloadDigest ||
        textFrame.binary !== false ||
        !safeDigest(binaryFrame?.payloadDigest) ||
        binaryFrame.echoedDigest !== binaryFrame.payloadDigest ||
        binaryFrame.binary !== true ||
        !safeDigest(targetControlFrame?.payloadDigest) ||
        targetControlFrame.echoedDigest !== targetControlFrame.payloadDigest ||
        targetControlFrame.binary !== false
      )
        return undefined
      rowIds.push(
        row.executionId,
        row.sourceBoundaryId,
        row.targetBoundaryId,
        ...frameExecutionIds,
        ...sourceReceiptIds,
        row.targetControlExecutionId,
        ...targetControlReceiptIds
      )
    } else {
      if (
        row.expectedFailure !== 'workbench_runtime_project_mismatch' ||
        row.observedFailure !== row.expectedFailure ||
        row.status !== 502 ||
        row.upstreamContactCount !== 0
      )
        return undefined
      rowIds.push(row.executionId, row.boundaryId)
    }
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
