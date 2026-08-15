import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_FAILURE_CATEGORIES,
} from './project-runtime-contract.js'

export const BL016_SCENARIOS = Object.freeze([
  'stopped-registered',
  'starting-delayed-readiness',
  'running-observed-readiness',
  'failed-start-before-readiness',
  'failed-post-readiness-exit',
  'failed-health-observation',
  'failed-false-liveness',
  'failed-transition-race',
  'cross-project-isolation',
  'event-consistency',
] as const)

export type Bl016Scenario = (typeof BL016_SCENARIOS)[number]

const EXPECTED_SCENARIO_STATES = Object.freeze([
  'Stopped',
  'Starting',
  'Running',
  'Failed',
  'Failed',
  'Failed',
  'Failed',
  'Failed',
  'Failed',
  'Running',
] as const)

export interface RuntimeStateEvidenceEvent {
  readonly id: string
  readonly event: string
  readonly from: string
  readonly to: string
  readonly publicState: string
  readonly classification: string | null
  readonly elapsedClass: string
}

export interface RuntimeStateEvidenceRow {
  readonly scenario: Bl016Scenario
  readonly executionIds: Readonly<{
    runtime: string
    api: string
    home: string
  }>
  readonly runtime: string
  readonly api: string
  readonly home: string
  readonly failureCategory: string | null
  readonly events: readonly RuntimeStateEvidenceEvent[]
  readonly cleanupCount: number
  readonly readinessObserved: boolean
  readonly peerDigests: Readonly<{
    before: string
    after: string
  }> | null
  readonly contenderCount: number
  readonly loserEventCount: number
  readonly assertionCount: number
}

export interface RuntimeStateMatrix {
  readonly schemaVersion: 1
  readonly rows: readonly RuntimeStateEvidenceRow[]
}

export interface RuntimeStateValidationReport {
  readonly accepted: boolean
  readonly violations: readonly string[]
}

function sourceBodyAfter(source: string, marker: RegExp): string | undefined {
  const match = marker.exec(source)
  if (match === null) return undefined
  const opening = source.indexOf('{', match.index + match[0].length - 1)
  if (opening < 0) return undefined
  let depth = 0
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] !== '}') continue
    depth -= 1
    if (depth === 0) return source.slice(opening + 1, index)
  }
  return undefined
}

export function validatePublicReportingSource(
  source: string
): RuntimeStateValidationReport {
  const violations: string[] = []
  if (
    !/reportPublicStates\s*\(\s*projectIds:\s*readonly string\[\]\s*\)\s*:\s*readonly PublicRuntimeReport\[\]/u.test(
      source
    )
  ) {
    violations.push('projection-return-contract')
  }
  const body = sourceBodyAfter(
    source,
    /reportPublicStates\s*\(\s*projectIds\s*\)\s*\{/u
  )
  if (body === undefined) {
    violations.push('projection-implementation')
  } else {
    if (/\basync\s+reportPublicStates\s*\(/u.test(source))
      violations.push('projection-asynchronous')
    if (/\b(?:async|await)\b|\.then\s*\(/u.test(body))
      violations.push('projection-asynchronous')
    if (
      /processDependencies|\bports?\b|\bhealth\b|\blaunch\b|terminate\s*\(|\.audit\s*\(|isAlive\s*\(|\bemit\s*\(|recordEvent/u.test(
        body
      )
    ) {
      violations.push('projection-dependency-call')
    }
    const entryReads = body.match(/entries\.get\s*\(/gu)?.length ?? 0
    if (entryReads !== 1) violations.push('projection-entry-read-count')
    if (
      /entries\.(?:entries|values|keys|forEach)\s*\(|\[\.\.\.entries\b|Array\.from\s*\(\s*entries/u.test(
        body
      )
    ) {
      violations.push('projection-map-traversal')
    }
    if (!/projectIds\.map\s*\(/u.test(body))
      violations.push('projection-request-order')
  }
  const transitionDefinitions =
    source.match(/const transitionRunningToFailed\s*=\s*async\s*\(/gu)
      ?.length ?? 0
  if (transitionDefinitions !== 1)
    violations.push('guarded-transition-definition')
  const transitionCalls =
    source.match(/(?:await\s+)?transitionRunningToFailed\s*\(/gu)?.length ?? 0
  if (transitionCalls !== 4)
    violations.push('guarded-transition-contender-coverage')
  if (
    (source.match(/transitionRunningToFailed\s*\(\s*current/gu)?.length ??
      0) !== 2 ||
    (source.match(/transitionRunningToFailed\s*\(\s*entry/gu)?.length ?? 0) !==
      2
  ) {
    violations.push('guarded-transition-call-sites')
  }
  return Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze(violations),
  })
}

const stateSet = new Set<string>(PUBLIC_RUNTIME_STATES)
const categorySet = new Set<string>(RUNTIME_FAILURE_CATEGORIES)
const terminalEvents = new Set<string>([
  'runtime.start.failed',
  'runtime.health.changed',
])
const lifecycleOutcomes: Readonly<Record<string, readonly [string, string]>> =
  Object.freeze({
    'runtime.start.requested': ['starting', 'Starting'],
    'runtime.start.succeeded': ['running', 'Running'],
    'runtime.start.failed': ['failed', 'Failed'],
    'runtime.health.changed': ['failed', 'Failed'],
  })
const protectedEvidence =
  /(?:\/(?:home|tmp|workspaces|safe)\/|https?:\/\/|wss?:\/\/|127\.0\.0\.1|localhost|canonicalPath|internalUrl|ownerToken|\b(?:pid|port|command|environment|stdout|stderr|diagnostic|credential|secret)\b)/iu

const duplicateValues = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length

function eventIsConsistent(event: RuntimeStateEvidenceEvent): boolean {
  const expected = lifecycleOutcomes[event.event]
  return (
    expected !== undefined &&
    expected[0] === event.to &&
    expected[1] === event.publicState &&
    (event.publicState === 'Failed'
      ? event.classification !== null && categorySet.has(event.classification)
      : event.classification === null)
  )
}

export function validateRuntimeStateMatrix(
  matrix: RuntimeStateMatrix
): RuntimeStateValidationReport {
  const violations: string[] = []
  if (matrix.schemaVersion !== 1) violations.push('schema-version')
  if (matrix.rows.length !== BL016_SCENARIOS.length)
    violations.push('scenario-count')
  const scenarioIds = matrix.rows.map(({ scenario }) => scenario)
  if (
    BL016_SCENARIOS.some((scenario, index) => scenarioIds[index] !== scenario)
  ) {
    violations.push('scenario-order')
  }
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

  for (const [index, row] of matrix.rows.entries()) {
    if (row.runtime !== EXPECTED_SCENARIO_STATES[index])
      violations.push(`scenario-state:${row.scenario}`)
    if (
      row.executionIds.runtime !== `bl016-runtime-${row.scenario}` ||
      row.executionIds.api !== `bl016-api-${row.scenario}` ||
      row.executionIds.home !== `bl016-home-${row.scenario}`
    ) {
      violations.push(`execution-id:${row.scenario}`)
    }
    if (
      !stateSet.has(row.runtime) ||
      !stateSet.has(row.api) ||
      !stateSet.has(row.home)
    ) {
      violations.push(`public-state:${row.scenario}`)
    }
    if (row.runtime !== row.api || row.runtime !== row.home)
      violations.push(`surface-disagreement:${row.scenario}`)
    if (row.runtime === 'Failed') {
      if (
        row.failureCategory === null ||
        !categorySet.has(row.failureCategory)
      ) {
        violations.push(`failed-category:${row.scenario}`)
      }
      if (row.cleanupCount !== 1)
        violations.push(`failed-cleanup-count:${row.scenario}`)
      const terminalCount = row.events.filter(({ event }) =>
        terminalEvents.has(event)
      ).length
      if (terminalCount !== 1)
        violations.push(`failed-terminal-event-count:${row.scenario}`)
      const terminal = row.events.find(({ event }) => terminalEvents.has(event))
      if (terminal?.classification !== row.failureCategory)
        violations.push(`failed-event-category:${row.scenario}`)
      const terminalIndex = row.events.findIndex(({ event }) =>
        terminalEvents.has(event)
      )
      if (
        row.events
          .slice(terminalIndex + 1)
          .some(
            ({ event, publicState }) =>
              event === 'runtime.start.succeeded' || publicState === 'Running'
          )
      ) {
        violations.push(`failed-success-event:${row.scenario}`)
      }
    } else if (row.failureCategory !== null) {
      violations.push(`non-failed-category:${row.scenario}`)
    }
    if (row.runtime === 'Running' && !row.readinessObserved)
      violations.push(`running-without-readiness:${row.scenario}`)
    if (
      !Number.isSafeInteger(row.cleanupCount) ||
      row.cleanupCount < 0 ||
      !Number.isSafeInteger(row.contenderCount) ||
      row.contenderCount < 0 ||
      !Number.isSafeInteger(row.loserEventCount) ||
      row.loserEventCount < 0 ||
      !Number.isSafeInteger(row.assertionCount) ||
      row.assertionCount <= 0
    ) {
      violations.push(`numeric-evidence:${row.scenario}`)
    }
    if (row.events.some((event) => !eventIsConsistent(event)))
      violations.push(`event-consistency:${row.scenario}`)
    const finalEvent = row.events.at(-1)
    if (finalEvent !== undefined && finalEvent.publicState !== row.runtime)
      violations.push(`event-final-state:${row.scenario}`)
    if (
      row.events.some(
        ({ id, elapsedClass }) =>
          !/^bl016-event-[a-z0-9-]+-[0-9]+$/u.test(id) ||
          !['zero', 'bounded'].includes(elapsedClass)
      )
    ) {
      violations.push(`event-shape:${row.scenario}`)
    }
    if (row.scenario === 'failed-transition-race') {
      if (row.contenderCount !== 2 || row.loserEventCount !== 0)
        violations.push('race-loser-evidence')
    } else if (row.loserEventCount !== 0) {
      violations.push(`unexpected-loser-event:${row.scenario}`)
    }
    if (row.scenario === 'cross-project-isolation') {
      if (
        row.peerDigests === null ||
        row.peerDigests.before !== row.peerDigests.after
      ) {
        violations.push('peer-digest-changed')
      }
    } else if (row.peerDigests !== null) {
      violations.push(`unexpected-peer-digest:${row.scenario}`)
    }
    if (protectedEvidence.test(JSON.stringify(row)))
      violations.push(`protected-disclosure:${row.scenario}`)
  }
  return Object.freeze({
    accepted: violations.length === 0,
    violations: Object.freeze(violations),
  })
}

export function serializeRuntimeStateMatrix(
  matrix: RuntimeStateMatrix
): string {
  return JSON.stringify(matrix, null, 2) + '\n'
}
