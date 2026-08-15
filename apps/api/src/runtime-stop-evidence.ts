import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_STOP_REJECTION_CATEGORIES,
} from './project-runtime-contract.js'
import { validatePublicReportingSource } from './runtime-state-evidence.js'

export const BL017_SCENARIOS = Object.freeze([
  'graceful-stop',
  'escalated-stop',
  'escalation-unconfirmed',
  'termination-fault',
  'termination-deadline',
  'already-absent-generation',
  'no-managed-runtime',
  'repeated-stop-idempotent',
  'unregistered-project',
  'start-in-progress',
  'failure-retained',
  'concurrent-same-project-stop',
  'stop-versus-start',
  'stop-versus-proxy-acquisition',
  'stop-versus-exit',
  'stop-versus-health',
  'reuse-success-after-stop-claim',
  'reuse-failure-after-stop-claim',
  'stop-settlement-ownership-invariant',
  'graceful-sequencer-bound',
  'force-escalation-sequencer',
  'sequencer-deadline-cancellation',
  'owned-descendant-attribution',
  'global-shutdown-during-stop',
  'shutdown-after-unconfirmed',
  'shutdown-after-termination-fault',
  'two-ready-runtime-isolation',
  'registration-metadata-retention',
  'event-state-consistency',
  'failure-safe-disclosure',
  'final-cleanup',
] as const)

export type Bl017Scenario = (typeof BL017_SCENARIOS)[number]

export const NFR015_EVENT_CATALOG = Object.freeze([
  'project.open.requested',
  'project.open.succeeded',
  'project.open.failed',
  'project.closed',
  'project.activated',
  'runtime.start.requested',
  'runtime.start.succeeded',
  'runtime.start.failed',
  'runtime.stop.requested',
  'runtime.stop.succeeded',
  'runtime.restart.requested',
  'runtime.restart.succeeded',
  'runtime.restart.failed',
  'runtime.health.changed',
] as const)

export const BL017_PROHIBITED_LIFECYCLE_EVENT = 'runtime.stop.failed' as const

// The BL-001 workbench proof CLI writes a `runtime.stop.failed` stderr diagnostic
// record that predates BL-017 and is not an NFR-015 lifecycle event; T-12 keeps that
// recipe and surface untouched. This module declares the prohibited name itself so
// the guard can scan for it. Every other occurrence of the exact quoted literal in
// the scanned trees is a violation, and this list is asserted exactly so the
// exemption cannot widen.
export const BL017_PROHIBITED_NAME_EXEMPTIONS = Object.freeze([
  'apps/api/src/cli/proof-stop.ts',
  'apps/api/src/runtime-stop-evidence.ts',
] as const)

export const BL017_STOP_OUTCOMES = Object.freeze([
  'stopped',
  'already-stopped',
  'rejected',
  'invariant-fault',
  'not-attempted',
] as const)

export const BL017_RELEASE_MODES = Object.freeze([
  'already-absent',
  'graceful',
  'escalated',
  'unconfirmed',
] as const)

export const BL017_SIGNAL_DELIVERIES = Object.freeze([
  'delivered',
  'refused',
  'not-attempted',
] as const)

export const BL017_ELAPSED_CLASSES = Object.freeze([
  'zero',
  'within-graceful',
  'within-overall',
] as const)

export const BL017_INVENTORY_CLASSES = Object.freeze([
  'runtime-process-and-listener',
  'unrelated-control',
  'registration-resource',
  'disposable-fixture',
] as const)

export const BL017_INVENTORY_OWNERSHIP = Object.freeze([
  'product-registration-during-scenario',
  'validation-owned-temporary',
] as const)

export const BL017_ATTRIBUTION_CLAIM = 'process-group-membership' as const

export const BL017_ATTRIBUTION_CEILING =
  'A descendant that leaves the owned process group before the audit samples it is unattributable; BL-017 neither adopts nor terminates it.' as const

const WALL_CLOCK_FLOOR_MS = 1_000_000_000_000

export interface RuntimeStopAuditTriple {
  readonly processAbsent: boolean
  readonly processGroupAbsent: boolean
  readonly listenerAbsent: boolean
  readonly complete: boolean
}

export interface RuntimeStopAttribution {
  readonly ownedGroupSampled: boolean
  readonly ceilingRecorded: boolean
  readonly claim: string
}

export interface RuntimeStopSignalDelivery {
  readonly graceful: string
  readonly force: string
  readonly signalFault: string
  readonly settlementAudits: number
}

export interface RuntimeStopSignalTimeline {
  readonly preSignalMs: number
  readonly sigtermAt: number | null
  readonly sigkillAt: number | null
  readonly gracefulWindowMs: number | null
  readonly forceWindowMs: number | null
}

export interface RuntimeStopPrimitiveBounding {
  readonly awaitedCallsBounded: boolean
  readonly abandonedCalls: number
  readonly incompleteAuditsDiscarded: number
  readonly deadlineSource: string
  readonly clockSource: string
  readonly callerPreAborted: boolean
  readonly signalsAfterDeadline: number
  readonly timersSurvivingReturn: number
  readonly unhandledRejections: number
}

export interface RuntimeStopEvidenceEvent {
  readonly id: string
  readonly event: string
  readonly from: string
  readonly to: string
  readonly publicState: string
  readonly classification: string | null
  readonly elapsedClass: string
}

export interface RuntimeStopPhaseCounts {
  readonly stop: number
  readonly shutdown: number
}

export interface RuntimeStopCleanupRecords extends RuntimeStopPhaseCounts {
  readonly concurrent: number
  readonly reusedPriorAudit: boolean
}

export interface RuntimeStopDigestPair {
  readonly before: string
  readonly after: string
}

export interface RuntimeStopFixtureDigest extends RuntimeStopDigestPair {
  readonly fixture: string
}

export interface RuntimeStopInventoryItem {
  readonly item: string
  readonly itemClass: string
  readonly ownership: string
}

export interface RuntimeStopEvidenceRow {
  readonly scenario: Bl017Scenario
  readonly executionIds: Readonly<{
    runtime: string
    api: string
    home: string
  }>
  readonly outcome: string
  readonly rejectionCategory: string | null
  readonly releaseMode: string | null
  readonly entryReleasedByConfirmedStop: boolean
  readonly auditTriple: RuntimeStopAuditTriple | null
  readonly attribution: RuntimeStopAttribution
  readonly signalOrder: readonly string[]
  readonly forceAfterGracefulBound: boolean
  readonly signalDelivery: RuntimeStopSignalDelivery
  readonly signalTimeline: RuntimeStopSignalTimeline | null
  readonly primitiveBounding: RuntimeStopPrimitiveBounding | null
  readonly elapsedClass: string
  readonly withinDeclaredBound: boolean
  readonly runtimeState: string
  readonly apiState: string
  readonly homeState: string
  readonly failureCategory: string | null
  readonly events: readonly RuntimeStopEvidenceEvent[]
  readonly requestedEventCount: number
  readonly terminalEventCount: number
  readonly loserEventCount: number
  readonly entryMutations: number
  readonly terminateCallsByPhase: RuntimeStopPhaseCounts
  readonly cleanupRecordsByPhase: RuntimeStopCleanupRecords
  readonly identitiesCreated: number
  readonly identitiesTerminated: number
  readonly restarts: number
  readonly registrationRowCount: number
  readonly registrationDigests: RuntimeStopDigestPair
  readonly peerDigests: RuntimeStopDigestPair | null
  readonly controlDigests: RuntimeStopDigestPair | null
  readonly fixtureDigests: readonly RuntimeStopFixtureDigest[]
  readonly inventory: readonly RuntimeStopInventoryItem[]
  readonly residualCount: number
  readonly assertionCount: number
}

export interface RuntimeStopDeclaredBounds {
  readonly gracefulMs: number
  readonly forceMs: number
  readonly auditAllowanceMs: number
  readonly settlementAllowanceMs: number
  readonly preSignalAllowanceMs: number
  readonly overallMs: number
}

export interface RuntimeStopMatrix {
  readonly schemaVersion: 1
  readonly declaredBounds: RuntimeStopDeclaredBounds
  readonly productionDefaultBounds: RuntimeStopDeclaredBounds
  readonly rows: readonly RuntimeStopEvidenceRow[]
}

export interface RuntimeStopValidationReport {
  readonly accepted: boolean
  readonly violations: readonly string[]
}

export interface SelectedStopSources {
  readonly manager: string
  readonly process: string
  readonly route: string
  readonly prohibitedNameMatches: readonly string[]
  readonly emittedEventNames: readonly string[]
}

const report = (violations: readonly string[]): RuntimeStopValidationReport =>
  Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze([...violations]),
  })

const countMatches = (source: string, pattern: RegExp): number =>
  source.match(pattern)?.length ?? 0

function balancedBlock(source: string, openIndex: number): string | undefined {
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] !== '}') continue
    depth -= 1
    if (depth === 0) return source.slice(openIndex + 1, index)
  }
  return undefined
}

function bodyAfter(source: string, marker: RegExp): string | undefined {
  const match = marker.exec(source)
  if (match === null) return undefined
  const opening = source.indexOf('{', match.index + match[0].length - 1)
  if (opening < 0) return undefined
  return balancedBlock(source, opening)
}

/** Compiles a structural marker whose literal whitespace tolerates any
 * formatter reflow, so a Prettier line break inside a declaration cannot
 * disarm a guard whose structural claim still holds. Whitespace runs in the
 * pattern become optional; every other token must still appear exactly. */
const structural = (pattern: string): RegExp =>
  new RegExp(pattern.replace(/\s+/gu, '\\s*'), 'u')

const SEQUENCER_MARKER = structural(
  'export async function terminateOwnedRuntimeGroup\\( request:'
)
const BOUNDED_HELPER_MARKER = structural(
  '\\}\\): Promise<BoundedPrimitiveResult<T>> \\{'
)
const STOP_MARKER = structural(
  'const stop = async \\(input: \\{ readonly projectId: string \\}\\): Promise<RuntimeStopOutcome> => \\{'
)
const STOP_OPERATION_MARKER = structural(
  'const operation = Promise\\.resolve\\(\\)\\.then\\( async \\(\\): Promise<RuntimeStopOutcome> => \\{'
)
const REFUSED_GRACEFUL_MARKER = structural('if \\( !gracefulDelivered \\) \\{')
const REFUSED_FORCE_BRANCH = structural('if \\( !forceDelivered \\)')
const REFUSED_FORCE_RETURN = structural(
  'if \\( !forceDelivered \\) return unconfirmed\\(\\)'
)
const ROUTE_RESPONSE_MARKER = structural(
  'function sendStopResult\\( reply: FastifyReply, result: RuntimeStopOutcome \\) \\{'
)
const ROUTE_REJECTION_MARKER = structural(
  'const STOP_REJECTION_STATUS = Object\\.freeze\\(\\{'
)

/** Removes nested arrow and function bodies so a span can be read for its own
 * synchronous control flow rather than for deferred work it merely constructs. */
function stripNestedBodies(source: string): string {
  let result = ''
  let index = 0
  const opener = /(?:=>|\)\s*)\s*\{/gu
  while (index < source.length) {
    opener.lastIndex = index
    const match = opener.exec(source)
    if (match === null) {
      result += source.slice(index)
      break
    }
    const openIndex = source.indexOf('{', match.index)
    const block = balancedBlock(source, openIndex)
    if (block === undefined) {
      result += source.slice(index)
      break
    }
    result += source.slice(index, openIndex + 1)
    index = openIndex + 1 + block.length
  }
  return result
}

const sequencerBody = (source: string): string | undefined =>
  bodyAfter(source, SEQUENCER_MARKER)

const boundedHelperBody = (source: string): string | undefined =>
  bodyAfter(source, BOUNDED_HELPER_MARKER)

function validateManagerSource(manager: string): readonly string[] {
  const violations: string[] = []
  const stopBody = bodyAfter(manager, STOP_MARKER)
  if (countMatches(manager, /const stop = async \(/gu) !== 1)
    violations.push('stop-definition-count')
  if (stopBody === undefined) {
    violations.push('stop-implementation')
    return violations
  }
  if (
    countMatches(manager, /(?<!readonly )state: 'stopping',/gu) !== 1 ||
    countMatches(stopBody, /entries\.set\(input\.projectId, stopping\)/gu) !== 1
  ) {
    violations.push('stopping-entry-install-count')
  }
  if (countMatches(stopBody, /entries\.set\(/gu) !== 2)
    violations.push('stop-entry-mutation-count')

  const readIndex = stopBody.indexOf(
    'const current = entries.get(input.projectId)'
  )
  const installIndex = stopBody.indexOf(
    'entries.set(input.projectId, stopping)'
  )
  if (readIndex < 0 || installIndex < 0 || installIndex < readIndex) {
    violations.push('claim-install-order')
  } else {
    const span = stripNestedBodies(stopBody.slice(readIndex, installIndex))
    if (/(?:^|[^.\w])await\s/u.test(span))
      violations.push('claim-install-suspension')
    if (countMatches(span, /\.then\(/gu) !== 1)
      violations.push('claim-install-deferred-count')
    if (!/const operation = Promise\.resolve\(\)\.then\(/u.test(span))
      violations.push('claim-install-deferred-shape')
  }

  const operationBody = bodyAfter(stopBody, STOP_OPERATION_MARKER)
  if (operationBody === undefined) {
    violations.push('stop-operation-implementation')
  } else {
    if (countMatches(operationBody, /\.terminate\(/gu) !== 1)
      violations.push('stop-terminate-call-count')
    if (countMatches(operationBody, /recordCleanup\(/gu) !== 1)
      violations.push('stop-cleanup-call-count')
  }

  for (const [name, expected] of [
    ["event: 'runtime.stop.requested'", 1],
    ["event: 'runtime.stop.succeeded'", 1],
  ] as const) {
    if (manager.split(name).length - 1 !== expected)
      violations.push('stop-emit-site-count')
  }

  const recheck = /entries\.get\(input\.projectId\) !== stopping/gu
  const recheckCount = countMatches(stopBody, recheck)
  const terminalInstalls = [
    stopBody.indexOf('failEntry('),
    stopBody.indexOf('entries.set(stopping.projectId, {'),
  ]
  if (recheckCount !== terminalInstalls.length)
    violations.push('settlement-recheck-count')
  for (const installIndexForTerminal of terminalInstalls) {
    if (installIndexForTerminal < 0) {
      violations.push('settlement-terminal-install')
      continue
    }
    const preceding = stopBody.slice(0, installIndexForTerminal)
    const guardIndex = preceding.lastIndexOf(
      'entries.get(input.projectId) !== stopping'
    )
    if (guardIndex < 0) {
      violations.push('settlement-recheck-coverage')
      continue
    }
    if (
      /(?:^|[^.\w])await\s/u.test(
        stripNestedBodies(preceding.slice(guardIndex))
      )
    )
      violations.push('settlement-recheck-suspension')
  }
  if (
    !/throw new RuntimeStopInvariantError\(\)/u.test(stopBody) ||
    countMatches(stopBody, /throw new RuntimeStopInvariantError\(\)/gu) !==
      recheckCount
  ) {
    violations.push('settlement-invariant-fault')
  }

  if (countMatches(manager, /const reuseOwnershipFailure = \(/gu) !== 1)
    violations.push('reuse-recheck-definition')
  const reuseCalls = countMatches(manager, /reuseOwnershipFailure\(current\)/gu)
  if (reuseCalls !== 2) violations.push('reuse-recheck-call-sites')
  const snapshotReturn = manager.indexOf('return current.snapshot')
  if (snapshotReturn < 0) {
    violations.push('reuse-snapshot-return')
  } else {
    const preceding = manager.slice(0, snapshotReturn)
    const lastRecheck = preceding.lastIndexOf('reuseOwnershipFailure(current)')
    if (
      lastRecheck < 0 ||
      /(?:^|[^.\w])await\s/u.test(
        stripNestedBodies(preceding.slice(lastRecheck))
      )
    ) {
      violations.push('reuse-snapshot-before-recheck')
    }
  }

  const memoization =
    /prior\.processAbsent &&\s*prior\.processGroupAbsent &&\s*prior\.listenerAbsent/gu
  if (countMatches(manager, memoization) !== 1)
    violations.push('shutdown-memoization-conditions')
  if (
    !/\[prior\.pid, prior\.processStartTime, prior\.port\]\.join\(':'\) === key/u.test(
      manager
    )
  ) {
    violations.push('shutdown-memoization-identity')
  }

  const projection = validatePublicReportingSource(manager)
  violations.push(
    ...projection.violations.map((violation) => 'public-reporting:' + violation)
  )
  return violations
}

const AWAITED_PRIMITIVES = Object.freeze([
  'readProcessStartTime',
  'readProcessGroupMembers',
  'listenerIsAbsent',
  'delay',
] as const)

function validateSequencerSource(source: string): readonly string[] {
  const violations: string[] = []
  if (
    countMatches(
      source,
      /export async function terminateOwnedRuntimeGroup\(/gu
    ) !== 1
  ) {
    violations.push('sequencer-definition-count')
  }
  if (countMatches(source, /async function runBoundedPrimitive</gu) !== 1)
    violations.push('bounded-helper-definition')
  const body = sequencerBody(source)
  const bounded = boundedHelperBody(source)
  if (body === undefined || bounded === undefined) {
    violations.push('sequencer-implementation')
    return violations
  }
  if (/process\.kill\(/u.test(body)) violations.push('sequencer-raw-signal')
  if (/Date\.now|new Date\(|performance\.now|setTimeout\(/u.test(body))
    violations.push('sequencer-direct-clock')
  if (/(?:^|[^.\w])catch\b/u.test(body))
    violations.push('sequencer-signal-catch')
  if (/await\s+(?:input\.)?primitives\./u.test(body))
    violations.push('sequencer-bare-awaited-primitive')
  for (const primitive of AWAITED_PRIMITIVES) {
    const pattern = new RegExp('primitives\\.' + primitive + '\\(', 'gu')
    let match: RegExpExecArray | null = pattern.exec(body)
    while (match !== null) {
      if (!/call:\s*\(signal\) =>\s*$/u.test(body.slice(0, match.index)))
        violations.push('sequencer-unbounded-primitive:' + primitive)
      match = pattern.exec(body)
    }
  }
  if (countMatches(body, /new AbortController\(\)/gu) !== 1)
    violations.push('sequencer-controller-count')
  if (countMatches(bounded, /new AbortController\(\)/gu) !== 1)
    violations.push('bounded-controller-count')
  if (countMatches(body, /primitives\.scheduleDeadline\(/gu) !== 1)
    violations.push('sequencer-deadline-call-site')
  if (countMatches(bounded, /primitives\.scheduleDeadline\(/gu) !== 1)
    violations.push('bounded-deadline-call-site')
  if (
    /scheduleDeadline\(\s*(?:input\.)?primitives\.delay|delay\([^)]*\)\s*\.then\(\s*\(\)\s*=>\s*controller\.abort/u.test(
      body
    )
  )
    violations.push('sequencer-deadline-from-delay')

  const abortedCheck = body.search(/request\.signal\?\.aborted/u)
  const firstBounded = body.search(/runBoundedPrimitive\(/u)
  const firstSignal = body.search(/primitives\.signalProcessGroup\(/u)
  const firstDeadline = body.search(/primitives\.scheduleDeadline\(/u)
  if (
    abortedCheck < 0 ||
    firstBounded < 0 ||
    firstSignal < 0 ||
    firstDeadline < 0 ||
    abortedCheck > firstBounded ||
    abortedCheck > firstSignal ||
    abortedCheck > firstDeadline
  ) {
    violations.push('sequencer-entry-abort-check')
  }

  for (const phase of ['graceful', 'force'] as const) {
    const deadlineName = phase + 'DeadlineAt'
    const signalName =
      phase === 'graceful' ? 'gracefulSignalAt' : 'forceSignalAt'
    const deliveredName =
      phase === 'graceful' ? 'gracefulDelivered' : 'forceDelivered'
    const signalCall = phase === 'graceful' ? 'SIGTERM' : 'SIGKILL'
    const deadlineAssignment = new RegExp(
      'const ' + deadlineName + ' =\\s*' + signalName + ' \\+ request\\.',
      'gu'
    )
    if (countMatches(body, deadlineAssignment) !== 1)
      violations.push('phase-deadline-assignment:' + phase)
    if (
      /startedAt/u.test(
        body.slice(
          body.indexOf('const ' + deadlineName),
          body.indexOf('const ' + deadlineName) + 120
        )
      )
    )
      violations.push('phase-deadline-from-entry:' + phase)
    const bindingPattern = new RegExp(
      'const ' +
        deliveredName +
        " = primitives\\.signalProcessGroup\\(\\s*request\\.pid,\\s*'" +
        signalCall +
        "'\\s*\\)",
      'u'
    )
    if (!bindingPattern.test(body))
      violations.push('signal-result-binding:' + phase)
    if (!structural('if \\( !' + deliveredName + ' \\)').test(body))
      violations.push('signal-result-branch:' + phase)
    const signalIndex = body.indexOf("'" + signalCall + "'")
    const preceding = body.slice(0, signalIndex)
    const lastAwait = preceding.search(
      /(?:^|[^.\w])await\s(?![\s\S]*(?:^|[^.\w])await\s)/u
    )
    const gate = preceding.lastIndexOf('controller.signal.aborted')
    if (gate < 0 || gate < lastAwait)
      violations.push('signal-abort-gate:' + phase)
    const timelineAssignment = new RegExp(
      'const ' + signalName + ' = primitives\\.now\\(\\)',
      'u'
    )
    if (!timelineAssignment.test(body))
      violations.push('signal-clock-reading:' + phase)
  }

  const refusedBody = bodyAfter(body, REFUSED_GRACEFUL_MARKER)
  if (refusedBody === undefined) {
    violations.push('refused-graceful-branch')
  } else {
    if (countMatches(refusedBody, /await audit\(/gu) !== 1)
      violations.push('refused-graceful-settlement-count')
    if (/while \(|primitives\.delay\(/u.test(refusedBody))
      violations.push('refused-graceful-poll')
    if (/DeadlineAt =/u.test(refusedBody))
      violations.push('refused-graceful-window')
  }
  const refusedForce = body.search(REFUSED_FORCE_BRANCH)
  if (
    refusedForce < 0 ||
    !REFUSED_FORCE_RETURN.test(body) ||
    body.indexOf('const forceDeadlineAt') < refusedForce
  ) {
    violations.push('refused-force-return')
  }

  if (!/now: \(\) => performance\.now\(\)/u.test(source))
    violations.push('production-clock-monotonic')
  if (
    /defaultRuntimeTerminationPrimitives[\s\S]{0,400}now: Date\.now/u.test(
      source
    )
  )
    violations.push('production-clock-wall')
  if (countMatches(source, /\bnow: Date\.now\b/gu) !== 1)
    violations.push('delivered-dependency-clock')
  if (countMatches(source, /Date\.now\(\)/gu) < 5)
    violations.push('delivered-clock-uses')
  return violations
}

const STATE_SHAPED_LITERAL = /'([A-Z][a-z]+)'/gu
const publicStates = new Set<string>(PUBLIC_RUNTIME_STATES)

function validateRouteSource(route: string): readonly string[] {
  const violations: string[] = []
  const success = bodyAfter(route, ROUTE_RESPONSE_MARKER)
  if (success === undefined) {
    violations.push('route-response-builder')
  } else {
    const keys = [...success.matchAll(/\.send\(\{([^}]*)\}\)/gu)].flatMap(
      (match) =>
        (match[1] ?? '')
          .split(',')
          .map((entry) => entry.split(':')[0]?.trim())
          .filter(
            (entry): entry is string => entry !== undefined && entry !== ''
          )
    )
    if (
      keys.length === 0 ||
      keys.some((key) => !['id', 'outcome'].includes(key))
    )
      violations.push('route-response-keys')
  }
  if (
    !/return reply\.code\(status\)\.send\(\{ error: \{ category \} \}\)/u.test(
      route
    )
  )
    violations.push('route-error-keys')
  const categoriesStart = route.indexOf(
    'RUNTIME_STOP_ROUTE_ERROR_CATEGORIES = Object.freeze(['
  )
  const categoriesEnd = route.indexOf(']', categoriesStart)
  if (categoriesStart < 0 || categoriesEnd < 0) {
    violations.push('route-category-list')
  } else if (
    countMatches(route.slice(categoriesStart, categoriesEnd), /'[a-z_]+'/gu) !==
    10
  ) {
    violations.push('route-category-count')
  }
  const mapped = bodyAfter(route, ROUTE_REJECTION_MARKER)
  if (mapped === undefined) {
    violations.push('route-rejection-map')
  } else {
    for (const category of RUNTIME_STOP_REJECTION_CATEGORIES) {
      if (countMatches(mapped, new RegExp("'" + category + "':", 'gu')) !== 1)
        violations.push('route-rejection-mapping:' + category)
    }
  }
  return violations
}

function validateStateLiterals(sources: readonly string[]): readonly string[] {
  const violations: string[] = []
  for (const source of sources) {
    for (const match of source.matchAll(STATE_SHAPED_LITERAL)) {
      const literal = match[1] ?? ''
      if (!publicStates.has(literal))
        violations.push('public-state-literal:' + literal)
    }
  }
  return violations
}

export function validateSelectedStopSource(
  input: SelectedStopSources
): RuntimeStopValidationReport {
  const violations: string[] = [
    ...validateManagerSource(input.manager),
    ...validateSequencerSource(input.process),
    ...validateRouteSource(input.route),
    ...validateStateLiterals([input.manager, input.route]),
  ]
  const exempt = new Set<string>(BL017_PROHIBITED_NAME_EXEMPTIONS)
  for (const match of input.prohibitedNameMatches) {
    if (!exempt.has(match))
      violations.push('prohibited-lifecycle-name:' + match)
  }
  const catalog = new Set<string>(NFR015_EVENT_CATALOG)
  for (const name of input.emittedEventNames) {
    if (!catalog.has(name)) violations.push('non-catalog-event-name:' + name)
    if (name === BL017_PROHIBITED_LIFECYCLE_EVENT)
      violations.push('prohibited-lifecycle-event')
  }
  return report(violations)
}

const stopOutcomes = new Set<string>(BL017_STOP_OUTCOMES)
const releaseModes = new Set<string>(BL017_RELEASE_MODES)
const deliveries = new Set<string>(BL017_SIGNAL_DELIVERIES)
const elapsedClasses = new Set<string>(BL017_ELAPSED_CLASSES)
const inventoryClasses = new Set<string>(BL017_INVENTORY_CLASSES)
const inventoryOwnership = new Set<string>(BL017_INVENTORY_OWNERSHIP)
const rejectionCategories = new Set<string>(RUNTIME_STOP_REJECTION_CATEGORIES)
const failureCategories = new Set<string>(RUNTIME_FAILURE_CATEGORIES)
const eventCatalog = new Set<string>(NFR015_EVENT_CATALOG)
const terminalEventNames = new Set<string>([
  'runtime.stop.succeeded',
  'runtime.health.changed',
])
const eventTargets: Readonly<Record<string, readonly [string, string]>> =
  Object.freeze({
    'runtime.start.requested': ['starting', 'Starting'],
    'runtime.start.succeeded': ['running', 'Running'],
    'runtime.start.failed': ['failed', 'Failed'],
    'runtime.health.changed': ['failed', 'Failed'],
    'runtime.stop.requested': ['stopping', 'Running'],
    'runtime.stop.succeeded': ['stopped', 'Stopped'],
  })

const protectedEvidence =
  /(?:\/(?:home|tmp|workspaces|safe|proc)\/|https?:\/\/|wss?:\/\/|127\.0\.0\.1|localhost|canonicalPath|internalUrl|ownerToken|\b(?:pid|port|command|environment|stdout|stderr|diagnostic|credential|secret|token)\b)/iu

const duplicateValues = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length

const nonNegativeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0

const monotonicPosition = (value: number): boolean =>
  Number.isFinite(value) && value >= 0 && value < WALL_CLOCK_FLOOR_MS

function validateDeclaredBounds(
  bounds: RuntimeStopDeclaredBounds,
  label: string,
  violations: string[]
): void {
  for (const value of [
    bounds.gracefulMs,
    bounds.forceMs,
    bounds.auditAllowanceMs,
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0)
      violations.push('declared-bound-value:' + label)
  }
  const settlement = Math.max(1, Math.floor(bounds.auditAllowanceMs / 10))
  if (bounds.settlementAllowanceMs !== settlement)
    violations.push('declared-settlement-allowance:' + label)
  if (
    bounds.preSignalAllowanceMs !==
    bounds.auditAllowanceMs - bounds.settlementAllowanceMs
  ) {
    violations.push('declared-presignal-allowance:' + label)
  }
  if (
    bounds.overallMs !==
    bounds.gracefulMs + bounds.forceMs + bounds.auditAllowanceMs
  ) {
    violations.push('declared-overall-bound:' + label)
  }
}

function validateSignals(
  row: RuntimeStopEvidenceRow,
  bounds: RuntimeStopDeclaredBounds,
  fail: (code: string) => void
): void {
  const delivery = row.signalDelivery
  const timeline = row.signalTimeline
  if (
    !deliveries.has(delivery.graceful) ||
    !deliveries.has(delivery.force) ||
    !['none', 'raised'].includes(delivery.signalFault) ||
    !nonNegativeInteger(delivery.settlementAudits) ||
    delivery.settlementAudits > 1
  ) {
    fail('signal-delivery-vocabulary')
  }
  if (row.signalOrder.some((phase) => !['graceful', 'force'].includes(phase)))
    fail('signal-order-vocabulary')
  if (
    row.signalOrder.includes('graceful') &&
    delivery.graceful !== 'delivered'
  ) {
    fail('signal-order-without-delivery')
  }
  if (row.signalOrder.includes('force') && delivery.force !== 'delivered')
    fail('signal-order-without-delivery')
  if (
    row.signalOrder.includes('force') &&
    (!row.signalOrder.includes('graceful') ||
      row.signalOrder.indexOf('force') < row.signalOrder.indexOf('graceful'))
  ) {
    fail('force-before-graceful')
  }
  if (row.signalOrder.includes('force') && !row.forceAfterGracefulBound)
    fail('force-before-graceful-bound')
  if (row.releaseMode === 'escalated' && delivery.force !== 'delivered')
    fail('escalated-without-force-delivery')
  if (row.releaseMode === 'graceful' && delivery.graceful !== 'delivered')
    fail('graceful-without-graceful-delivery')
  if (
    row.releaseMode === 'already-absent' &&
    (delivery.graceful === 'delivered' || delivery.force === 'delivered')
  ) {
    fail('already-absent-with-delivery')
  }
  if (delivery.graceful === 'refused') {
    if (delivery.settlementAudits > 1) fail('refused-graceful-settlement-count')
    if (delivery.force !== 'not-attempted') fail('refused-graceful-escalation')
    if (row.releaseMode === 'escalated' || row.releaseMode === 'graceful')
      fail('refused-graceful-release-mode')
    if (
      timeline !== null &&
      (timeline.gracefulWindowMs !== null || timeline.forceWindowMs !== null)
    ) {
      fail('refused-graceful-window')
    }
  }
  if (delivery.force === 'refused') {
    if (timeline !== null && timeline.forceWindowMs !== null)
      fail('refused-force-window')
    if (row.releaseMode !== 'unconfirmed') fail('refused-force-outcome')
  }
  if (delivery.signalFault === 'raised') {
    if (
      row.outcome !== 'rejected' ||
      row.rejectionCategory !== 'stop-unconfirmed' ||
      row.releaseMode !== null ||
      row.cleanupRecordsByPhase.stop !== 0
    ) {
      fail('signal-fault-settlement')
    }
  }
  if (timeline === null) return
  const positions: readonly (number | null)[] = [
    timeline.preSignalMs,
    timeline.sigtermAt,
    timeline.sigkillAt,
    timeline.gracefulWindowMs,
    timeline.forceWindowMs,
  ]
  for (const position of positions) {
    if (position !== null && !monotonicPosition(position))
      fail('wall-clock-position')
  }
  if (timeline.preSignalMs > bounds.preSignalAllowanceMs)
    fail('presignal-allowance-exceeded')
  if (delivery.graceful !== 'delivered' && timeline.sigtermAt !== null)
    fail('timeline-without-delivery')
  if (delivery.force !== 'delivered' && timeline.sigkillAt !== null)
    fail('timeline-without-delivery')
  if (delivery.graceful === 'delivered' && timeline.sigtermAt === null)
    fail('timeline-missing-delivery')
  if (delivery.force === 'delivered') {
    if (timeline.sigkillAt === null || timeline.gracefulWindowMs === null) {
      fail('timeline-missing-delivery')
    } else {
      if (
        timeline.gracefulWindowMs !==
        timeline.sigkillAt - (timeline.sigtermAt ?? 0)
      )
        fail('graceful-window-derivation')
      if (timeline.gracefulWindowMs < bounds.gracefulMs)
        fail('graceful-window-short')
    }
    if (timeline.forceWindowMs === null) fail('timeline-missing-delivery')
    else if (timeline.forceWindowMs < bounds.forceMs) fail('force-window-short')
  }
}

function validatePrimitiveBounding(
  row: RuntimeStopEvidenceRow,
  fail: (code: string) => void
): void {
  const bounding = row.primitiveBounding
  if (bounding === null) return
  if (bounding.deadlineSource !== 'trusted-scheduler') fail('deadline-source')
  if (bounding.clockSource !== 'monotonic') fail('clock-source')
  if (!bounding.awaitedCallsBounded) fail('unbounded-awaited-call')
  if (bounding.signalsAfterDeadline !== 0) fail('signal-after-deadline')
  if (bounding.timersSurvivingReturn !== 0) fail('timers-survived-return')
  if (bounding.unhandledRejections !== 0) fail('unhandled-rejection')
  if (
    !nonNegativeInteger(bounding.abandonedCalls) ||
    !nonNegativeInteger(bounding.incompleteAuditsDiscarded)
  ) {
    fail('primitive-bounding-counts')
  }
  if (bounding.abandonedCalls > 0 && row.auditTriple?.complete === true)
    fail('abandoned-call-confirmed-audit')
  if (!bounding.callerPreAborted) return
  if (
    row.signalOrder.length !== 0 ||
    row.signalDelivery.graceful !== 'not-attempted' ||
    row.signalDelivery.force !== 'not-attempted' ||
    row.signalDelivery.settlementAudits !== 0 ||
    row.signalTimeline !== null
  ) {
    fail('pre-aborted-work')
  }
}

function validateCardinality(
  row: RuntimeStopEvidenceRow,
  fail: (code: string) => void
): void {
  const terminate = row.terminateCallsByPhase
  const cleanup = row.cleanupRecordsByPhase
  if (
    !nonNegativeInteger(terminate.stop) ||
    !nonNegativeInteger(terminate.shutdown) ||
    !nonNegativeInteger(cleanup.stop) ||
    !nonNegativeInteger(cleanup.shutdown) ||
    !nonNegativeInteger(cleanup.concurrent)
  ) {
    fail('phase-count-shape')
  }
  if (terminate.stop > 1) fail('stop-phase-terminate-cardinality')
  if (cleanup.stop > 1) fail('stop-phase-cleanup-cardinality')
  if (cleanup.concurrent !== 0) fail('concurrent-phase-cleanup')
  if (terminate.shutdown > 1) fail('shutdown-reattempt-cardinality')
  if (cleanup.shutdown > 1) fail('shutdown-phase-cleanup-cardinality')
  const stopConfirmed =
    row.auditTriple !== null &&
    row.auditTriple.complete &&
    row.auditTriple.processAbsent &&
    row.auditTriple.processGroupAbsent &&
    row.auditTriple.listenerAbsent
  if (stopConfirmed && cleanup.stop === 1 && terminate.shutdown > 0)
    fail('shutdown-terminate-after-confirmed-release')
  if (cleanup.reusedPriorAudit && !stopConfirmed)
    fail('shutdown-memoized-unconfirmed-audit')
}

function validateEvents(
  row: RuntimeStopEvidenceRow,
  fail: (code: string) => void
): void {
  for (const event of row.events) {
    if (!eventCatalog.has(event.event)) fail('non-catalog-event')
    const target = eventTargets[event.event]
    if (
      target === undefined ||
      target[0] !== event.to ||
      target[1] !== event.publicState
    ) {
      fail('event-consistency')
    }
    if (event.publicState === 'Failed') {
      if (
        event.classification === null ||
        !failureCategories.has(event.classification)
      ) {
        fail('event-classification')
      }
    } else if (event.classification !== null) {
      fail('event-classification')
    }
    if (
      !/^bl017-event-[a-z0-9-]+-[0-9]+$/u.test(event.id) ||
      !elapsedClasses.has(event.elapsedClass)
    ) {
      fail('event-shape')
    }
  }
  const requested = row.events.filter(
    ({ event }) => event === 'runtime.stop.requested'
  ).length
  const terminal = row.events.filter(({ event }) =>
    terminalEventNames.has(event)
  ).length
  if (requested !== row.requestedEventCount) fail('requested-event-count')
  if (terminal !== row.terminalEventCount) fail('terminal-event-count')
  if (row.loserEventCount !== 0) fail('loser-event-count')

  const expected =
    row.outcome === 'stopped'
      ? [1, 1]
      : row.outcome === 'invariant-fault'
        ? [1, 0]
        : row.outcome === 'rejected' &&
            row.rejectionCategory === 'stop-unconfirmed'
          ? [1, 1]
          : [0, 0]
  if (
    row.requestedEventCount !== expected[0] ||
    row.terminalEventCount !== expected[1]
  ) {
    fail('stop-event-cardinality')
  }
  if (
    row.outcome === 'stopped' &&
    !row.events.some(({ event }) => event === 'runtime.stop.succeeded')
  ) {
    fail('missing-success-event')
  }
  if (
    row.outcome === 'invariant-fault' &&
    (row.entryMutations !== 0 || row.cleanupRecordsByPhase.stop !== 0)
  ) {
    fail('invariant-fault-mutation')
  }
  const finalEvent = row.events.at(-1)
  if (finalEvent !== undefined && finalEvent.publicState !== row.runtimeState)
    fail('event-final-state')
}

function validateRow(
  row: RuntimeStopEvidenceRow,
  bounds: RuntimeStopDeclaredBounds,
  fail: (code: string) => void
): void {
  if (
    row.executionIds.runtime !== 'bl017-runtime-' + row.scenario ||
    row.executionIds.api !== 'bl017-api-' + row.scenario ||
    row.executionIds.home !== 'bl017-home-' + row.scenario
  ) {
    fail('execution-id')
  }
  if (!stopOutcomes.has(row.outcome)) fail('outcome-vocabulary')
  if (row.outcome === 'rejected') {
    if (
      row.rejectionCategory === null ||
      !rejectionCategories.has(row.rejectionCategory)
    ) {
      fail('rejection-category')
    }
  } else if (row.rejectionCategory !== null) {
    fail('rejection-category')
  }
  if (row.releaseMode !== null && !releaseModes.has(row.releaseMode))
    fail('release-mode-vocabulary')
  for (const state of [row.runtimeState, row.apiState, row.homeState]) {
    if (!publicStates.has(state)) fail('public-state')
  }
  if (row.runtimeState !== row.apiState || row.runtimeState !== row.homeState)
    fail('surface-disagreement')
  if (row.runtimeState === 'Failed') {
    if (
      row.failureCategory === null ||
      !failureCategories.has(row.failureCategory)
    )
      fail('failed-category')
  } else if (row.failureCategory !== null) {
    fail('non-failed-category')
  }
  if (!elapsedClasses.has(row.elapsedClass)) fail('elapsed-class')
  if (!row.withinDeclaredBound) fail('within-declared-bound')

  const confirmed =
    row.auditTriple !== null &&
    row.auditTriple.complete &&
    row.auditTriple.processAbsent &&
    row.auditTriple.processGroupAbsent &&
    row.auditTriple.listenerAbsent
  if (row.outcome === 'stopped') {
    if (!confirmed) fail('stopped-without-confirmed-audit')
    if (row.runtimeState !== 'Stopped') fail('stopped-state-disagreement')
    if (!row.entryReleasedByConfirmedStop)
      fail('stopped-without-release-marker')
  }
  if (
    row.releaseMode !== null &&
    row.releaseMode !== 'unconfirmed' &&
    !confirmed
  ) {
    fail('release-without-confirmed-audit')
  }
  if (row.releaseMode === 'unconfirmed' && row.outcome !== 'not-attempted') {
    if (row.runtimeState === 'Stopped') fail('unconfirmed-reported-stopped')
    if (row.outcome === 'stopped') fail('unconfirmed-reported-stopped')
  }
  if (row.outcome === 'already-stopped' && !row.entryReleasedByConfirmedStop)
    fail('already-stopped-unreleased')
  if (row.rejectionCategory === 'no-managed-runtime') {
    if (
      row.outcome !== 'rejected' ||
      row.entryReleasedByConfirmedStop ||
      row.releaseMode !== null ||
      row.auditTriple !== null ||
      row.terminateCallsByPhase.stop !== 0
    ) {
      fail('no-managed-runtime-success')
    }
  }
  if (row.outcome === 'not-attempted') {
    // A not-attempted row exercises the termination sequencer directly, so it
    // carries no manager-level stop evidence and makes no product-state claim.
    if (
      row.rejectionCategory !== null ||
      row.requestedEventCount !== 0 ||
      row.events.length !== 0 ||
      row.entryReleasedByConfirmedStop ||
      row.terminateCallsByPhase.stop !== 0 ||
      row.cleanupRecordsByPhase.stop !== 0
    ) {
      fail('not-attempted-shape')
    }
  }
  if (row.auditTriple !== null && !row.auditTriple.complete && confirmed)
    fail('incomplete-audit-confirmation')

  if (
    !row.attribution.ceilingRecorded ||
    row.attribution.claim !== BL017_ATTRIBUTION_CLAIM
  ) {
    fail('attribution-ceiling')
  }
  if (row.attribution.ownedGroupSampled && row.auditTriple === null)
    fail('attribution-without-audit')

  if (row.registrationDigests.before !== row.registrationDigests.after)
    fail('registration-digest-changed')
  if (row.scenario === 'unregistered-project') {
    if (row.registrationRowCount !== 0) fail('registration-row-count')
  } else if (row.registrationRowCount !== 1) {
    fail('registration-row-count')
  }
  if (
    row.peerDigests !== null &&
    row.peerDigests.before !== row.peerDigests.after
  ) {
    fail('peer-digest-changed')
  }
  if (
    row.controlDigests !== null &&
    row.controlDigests.before !== row.controlDigests.after
  ) {
    fail('control-digest-changed')
  }
  if (row.fixtureDigests.length === 0) fail('fixture-digests-missing')
  for (const fixture of row.fixtureDigests) {
    if (fixture.before !== fixture.after) fail('fixture-digest-changed')
  }
  if (row.inventory.length === 0) fail('empty-inventory')
  for (const item of row.inventory) {
    if (!inventoryClasses.has(item.itemClass)) fail('inventory-class')
    if (!inventoryOwnership.has(item.ownership)) fail('inventory-ownership')
  }
  if (row.residualCount !== 0) fail('residual-count')
  if (
    !nonNegativeInteger(row.identitiesCreated) ||
    !nonNegativeInteger(row.identitiesTerminated) ||
    !nonNegativeInteger(row.restarts) ||
    !nonNegativeInteger(row.entryMutations) ||
    !nonNegativeInteger(row.registrationRowCount) ||
    !nonNegativeInteger(row.residualCount) ||
    !Number.isSafeInteger(row.assertionCount) ||
    row.assertionCount <= 0
  ) {
    fail('numeric-evidence')
  }
  if (row.restarts !== 0) fail('unexpected-restart')
  validateSignals(row, bounds, fail)
  validatePrimitiveBounding(row, fail)
  validateCardinality(row, fail)
  validateEvents(row, fail)
  if (protectedEvidence.test(JSON.stringify(row))) fail('protected-disclosure')
}

export function validateRuntimeStopMatrix(
  matrix: RuntimeStopMatrix
): RuntimeStopValidationReport {
  const violations: string[] = []
  if (matrix.schemaVersion !== 1) violations.push('schema-version')
  validateDeclaredBounds(matrix.declaredBounds, 'declared', violations)
  validateDeclaredBounds(
    matrix.productionDefaultBounds,
    'production',
    violations
  )
  if (matrix.rows.length !== BL017_SCENARIOS.length)
    violations.push('scenario-count')
  const scenarioIds = matrix.rows.map(({ scenario }) => scenario)
  if (
    BL017_SCENARIOS.some((scenario, index) => scenarioIds[index] !== scenario)
  )
    violations.push('scenario-order')
  if (duplicateValues(scenarioIds)) violations.push('duplicate-scenario')
  const executionIds = matrix.rows.flatMap(({ executionIds: ids }) => [
    ids.runtime,
    ids.api,
    ids.home,
  ])
  if (duplicateValues(executionIds)) violations.push('duplicate-execution-id')
  const eventIds = matrix.rows.flatMap(({ events }) =>
    events.map(({ id }) => id)
  )
  if (duplicateValues(eventIds)) violations.push('duplicate-event-id')
  for (const row of matrix.rows) {
    validateRow(row, matrix.declaredBounds, (code) =>
      violations.push(code + ':' + row.scenario)
    )
  }
  return report(violations)
}

const orderedBounds = (
  bounds: RuntimeStopDeclaredBounds
): RuntimeStopDeclaredBounds => ({
  gracefulMs: bounds.gracefulMs,
  forceMs: bounds.forceMs,
  auditAllowanceMs: bounds.auditAllowanceMs,
  settlementAllowanceMs: bounds.settlementAllowanceMs,
  preSignalAllowanceMs: bounds.preSignalAllowanceMs,
  overallMs: bounds.overallMs,
})

export function serializeRuntimeStopMatrix(matrix: RuntimeStopMatrix): string {
  const ordered = {
    schemaVersion: matrix.schemaVersion,
    declaredBounds: orderedBounds(matrix.declaredBounds),
    productionDefaultBounds: orderedBounds(matrix.productionDefaultBounds),
    rows: matrix.rows.map((row) => ({
      scenario: row.scenario,
      executionIds: {
        runtime: row.executionIds.runtime,
        api: row.executionIds.api,
        home: row.executionIds.home,
      },
      outcome: row.outcome,
      rejectionCategory: row.rejectionCategory,
      releaseMode: row.releaseMode,
      entryReleasedByConfirmedStop: row.entryReleasedByConfirmedStop,
      auditTriple:
        row.auditTriple === null
          ? null
          : {
              processAbsent: row.auditTriple.processAbsent,
              processGroupAbsent: row.auditTriple.processGroupAbsent,
              listenerAbsent: row.auditTriple.listenerAbsent,
              complete: row.auditTriple.complete,
            },
      attribution: {
        ownedGroupSampled: row.attribution.ownedGroupSampled,
        ceilingRecorded: row.attribution.ceilingRecorded,
        claim: row.attribution.claim,
      },
      signalOrder: [...row.signalOrder],
      forceAfterGracefulBound: row.forceAfterGracefulBound,
      signalDelivery: {
        graceful: row.signalDelivery.graceful,
        force: row.signalDelivery.force,
        signalFault: row.signalDelivery.signalFault,
        settlementAudits: row.signalDelivery.settlementAudits,
      },
      signalTimeline:
        row.signalTimeline === null
          ? null
          : {
              preSignalMs: row.signalTimeline.preSignalMs,
              sigtermAt: row.signalTimeline.sigtermAt,
              sigkillAt: row.signalTimeline.sigkillAt,
              gracefulWindowMs: row.signalTimeline.gracefulWindowMs,
              forceWindowMs: row.signalTimeline.forceWindowMs,
            },
      primitiveBounding:
        row.primitiveBounding === null
          ? null
          : {
              awaitedCallsBounded: row.primitiveBounding.awaitedCallsBounded,
              abandonedCalls: row.primitiveBounding.abandonedCalls,
              incompleteAuditsDiscarded:
                row.primitiveBounding.incompleteAuditsDiscarded,
              deadlineSource: row.primitiveBounding.deadlineSource,
              clockSource: row.primitiveBounding.clockSource,
              callerPreAborted: row.primitiveBounding.callerPreAborted,
              signalsAfterDeadline: row.primitiveBounding.signalsAfterDeadline,
              timersSurvivingReturn:
                row.primitiveBounding.timersSurvivingReturn,
              unhandledRejections: row.primitiveBounding.unhandledRejections,
            },
      elapsedClass: row.elapsedClass,
      withinDeclaredBound: row.withinDeclaredBound,
      runtimeState: row.runtimeState,
      apiState: row.apiState,
      homeState: row.homeState,
      failureCategory: row.failureCategory,
      events: row.events.map((event) => ({
        id: event.id,
        event: event.event,
        from: event.from,
        to: event.to,
        publicState: event.publicState,
        classification: event.classification,
        elapsedClass: event.elapsedClass,
      })),
      requestedEventCount: row.requestedEventCount,
      terminalEventCount: row.terminalEventCount,
      loserEventCount: row.loserEventCount,
      entryMutations: row.entryMutations,
      terminateCallsByPhase: {
        stop: row.terminateCallsByPhase.stop,
        shutdown: row.terminateCallsByPhase.shutdown,
      },
      cleanupRecordsByPhase: {
        stop: row.cleanupRecordsByPhase.stop,
        shutdown: row.cleanupRecordsByPhase.shutdown,
        concurrent: row.cleanupRecordsByPhase.concurrent,
        reusedPriorAudit: row.cleanupRecordsByPhase.reusedPriorAudit,
      },
      identitiesCreated: row.identitiesCreated,
      identitiesTerminated: row.identitiesTerminated,
      restarts: row.restarts,
      registrationRowCount: row.registrationRowCount,
      registrationDigests: {
        before: row.registrationDigests.before,
        after: row.registrationDigests.after,
      },
      peerDigests:
        row.peerDigests === null
          ? null
          : { before: row.peerDigests.before, after: row.peerDigests.after },
      controlDigests:
        row.controlDigests === null
          ? null
          : {
              before: row.controlDigests.before,
              after: row.controlDigests.after,
            },
      fixtureDigests: row.fixtureDigests.map((fixture) => ({
        fixture: fixture.fixture,
        before: fixture.before,
        after: fixture.after,
      })),
      inventory: row.inventory.map((item) => ({
        item: item.item,
        itemClass: item.itemClass,
        ownership: item.ownership,
      })),
      residualCount: row.residualCount,
      assertionCount: row.assertionCount,
    })),
  }
  return JSON.stringify(ordered, null, 2) + '\n'
}
