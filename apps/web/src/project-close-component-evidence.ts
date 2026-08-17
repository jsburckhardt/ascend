/**
 * BL-020 web component execution lane contract (action plan revision 6 §13;
 * tasks T-7 and T-8; test V-13 scenarios S-32 … S-37, S-65, S-66, S-72, and
 * S-73).
 *
 * Project Home is proven in a browser-shaped lane by rendering `App` into
 * jsdom, driving real keyboard and pointer events, and recording what
 * production did. This module owns only the shape of that recording and the
 * rules that refuse a row which could not have been produced by executing it.
 *
 * Every member is a closed enumeration, an integer count, a boolean, or an
 * opaque per-run card token, so a committed row carries no project identity,
 * display name, host path, announcement text, or workbench URL.
 *
 * It imports nothing. The artifact contract stays independent of both the
 * API's node-typed evidence sources and the harness that fills it.
 */

/** The ten Project Home scenarios this lane executes, in catalog order. */
export const BL020_COMPONENT_SCENARIOS = Object.freeze([
  'S-32',
  'S-33',
  'S-34',
  'S-35',
  'S-36',
  'S-37',
  'S-65',
  'S-66',
  'S-72',
  'S-73',
] as const)
export type Bl020ComponentScenarioId =
  (typeof BL020_COMPONENT_SCENARIOS)[number]

/**
 * Production entry points the lane can witness from outside the controller: a
 * transport invocation, a settlement it applied, or a rendered consequence
 * only that path produces. A row names the ones it actually entered.
 */
export const BL020_COMPONENT_PATHS = Object.freeze([
  'project-list-load',
  'runtime-state-load',
  'close-dialog-opened',
  'close-dialog-refused',
  'close-dialog-cancelled',
  'close-dialog-escaped',
  'close-dialog-dismissed',
  'close-requested',
  'close-transmitted',
  'close-settled',
  'close-retry-requested',
  'close-retry-refused',
  'close-refresh-requested',
  'close-refresh-refused',
  'list-response-applied',
  'list-response-superseded',
  'list-replacement-issued',
  'closed-project-filtered',
  'stop-requested',
  'restart-requested',
  'workbench-open-navigated',
] as const)
export type Bl020ComponentPath = (typeof BL020_COMPONENT_PATHS)[number]

/** The controller's admission actions, mirroring `ProjectHomeAction`. */
export const BL020_COMPONENT_ACTIONS = Object.freeze([
  'open',
  'close',
  'retry-close',
  'refresh-close',
  'stop',
  'restart',
] as const)
export type Bl020ComponentAction = (typeof BL020_COMPONENT_ACTIONS)[number]

/** The eight delivered focus targets plus the observation of no target. */
export const BL020_COMPONENT_FOCUS_TARGETS = Object.freeze([
  'open',
  'close',
  'close-status',
  'close-retry',
  'close-refresh',
  'stop',
  'restart',
  'heading',
  'none',
] as const)
export type Bl020ComponentFocusTarget =
  (typeof BL020_COMPONENT_FOCUS_TARGETS)[number]

/** The delivered per-card close phases. */
export const BL020_COMPONENT_CLOSE_PHASES = Object.freeze([
  'confirming',
  'pending',
  'retry',
  'unknown',
  'refreshing',
] as const)
export type Bl020ComponentClosePhase =
  (typeof BL020_COMPONENT_CLOSE_PHASES)[number]

/**
 * Announcement classes. Text never reaches the artifact; an announcement is
 * carried as its class, the card it named, and whether the rendered text was
 * prefixed with that card's display name.
 */
export const BL020_COMPONENT_ANNOUNCEMENT_CLASSES = Object.freeze([
  'close-preparing',
  'close-transmitted',
  'close-success',
  'close-failure',
  'close-unknown',
  'close-retained',
  'close-refreshing',
  'close-cancelled',
  'stop',
  'restart',
  'workbench-open',
  'none',
] as const)
export type Bl020ComponentAnnouncementClass =
  (typeof BL020_COMPONENT_ANNOUNCEMENT_CLASSES)[number]

/**
 * How a rendered control's `disabled` value compared with the controller's
 * admission for the same card and action.
 *
 * `activation-scoped` exists for one delivered rule the close lane does not
 * own: `App` also disables a peer's Open while a workbench activation is in
 * flight, so an admitted Open can render disabled for a card that is not the
 * activated one. It is permitted for `open` and for nothing else.
 */
export const BL020_COMPONENT_EQUIVALENCE = Object.freeze([
  'equal',
  'not-rendered',
  'activation-scoped',
] as const)
export type Bl020ComponentEquivalence =
  (typeof BL020_COMPONENT_EQUIVALENCE)[number]

export const BL020_COMPONENT_OUTCOMES = Object.freeze([
  'passed',
  'failed',
] as const)
export type Bl020ComponentOutcome = (typeof BL020_COMPONENT_OUTCOMES)[number]

/** Cards are opaque `card-1`, `card-2`, … tokens minted per execution. */
export const BL020_COMPONENT_CARD_TOKEN = /^card-([1-9][0-9]*)$/u

export interface Bl020ComponentAdmission {
  readonly card: string
  readonly action: Bl020ComponentAction
  /** `home.admits(action, card)` read from the controller `App` rendered. */
  readonly admitted: boolean
  readonly renderedPresent: boolean
  /** `null` exactly when the control is not rendered for that card. */
  readonly renderedDisabled: boolean | null
  readonly equivalence: Bl020ComponentEquivalence
}

export interface Bl020ComponentDialog {
  readonly openings: number
  readonly maxConcurrent: number
  readonly subject: string | null
  readonly ariaModal: boolean
  readonly labelled: boolean
  readonly described: boolean
  readonly focusContained: boolean
  readonly dismissedAtTransmission: boolean
  readonly refusedPeerOpenings: number
}

export interface Bl020ComponentPending {
  readonly card: string
  readonly phase: Bl020ComponentClosePhase
  readonly busy: boolean
}

export interface Bl020ComponentFocus {
  readonly target: Bl020ComponentFocusTarget
  readonly card: string | null
}

export interface Bl020ComponentAnnouncement {
  readonly announcementClass: Bl020ComponentAnnouncementClass
  readonly card: string | null
  readonly namePrefixed: boolean
}

export interface Bl020ComponentCalls {
  readonly closeRequests: number
  readonly listRequests: number
  readonly listReplacements: number
  readonly runtimeStateRequests: number
  readonly stopRequests: number
  readonly restartRequests: number
  readonly workbenchNavigations: number
  /** Every injected transport invocation the row made. */
  readonly transportInvocations: number
  /** How many of those returned a thenable, which must be all of them. */
  readonly thenableTransportReturns: number
}

export interface Bl020ComponentRow {
  readonly scenario: Bl020ComponentScenarioId
  readonly executionId: string
  readonly cards: number
  readonly productionPathsEntered: readonly Bl020ComponentPath[]
  readonly admissions: readonly Bl020ComponentAdmission[]
  readonly dialog: Bl020ComponentDialog
  readonly pending: readonly Bl020ComponentPending[]
  readonly focus: readonly Bl020ComponentFocus[]
  readonly announcements: readonly Bl020ComponentAnnouncement[]
  readonly calls: Bl020ComponentCalls
  readonly assertions: number
  readonly outcome: Bl020ComponentOutcome
}

export interface Bl020ComponentAggregate {
  readonly rows: number
  readonly executionProduced: number
  readonly allPassed: boolean
}

export interface Bl020ComponentMatrix {
  readonly evidenceId: 'bl-020-close-component-matrix'
  readonly generatedFrom: 'execution'
  readonly stage: 't-7-t-8-component-lane'
  /** Minted at run time; every row's execution identifier carries it. */
  readonly runId: string
  readonly scenarioCount: number
  readonly rows: readonly Bl020ComponentRow[]
  readonly aggregate: Bl020ComponentAggregate
}

export function serializeProjectCloseComponentMatrix(
  matrix: Bl020ComponentMatrix
): string {
  return JSON.stringify(matrix, null, 2) + String.fromCharCode(10)
}

/**
 * Literal shapes no committed component-lane artifact may carry, independent
 * of the exact fixture values the run used.
 */
const PROTECTED_SHAPES: readonly (readonly [string, RegExp])[] = Object.freeze([
  ['path-segment', /\/[A-Za-z0-9._~-]+\//u],
  ['markup', /<[A-Za-z/]/u],
  ['loopback-authority', /127\.0\.0\.1|localhost|\[::1\]/u],
  ['process-identity', /\bpid\b/iu],
  ['port-literal', /:[0-9]{2,5}\b/u],
])

export interface Bl020ComponentValidationInput {
  readonly matrix: Bl020ComponentMatrix
  /** The exact bytes the lane is about to commit. */
  readonly serialized: string
  /** Exact fixture values the run used, none of which may appear. */
  readonly protectedValues: readonly string[]
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function cardOrdinal(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const match = BL020_COMPONENT_CARD_TOKEN.exec(value)
  return match === null ? undefined : Number(match[1])
}

function inSet<T extends string>(
  members: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === 'string' && (members as readonly string[]).includes(value)
  )
}

/**
 * Refuses any row that could not have been produced by executing the rendered
 * Project Home lane. Each violation is named after the rule that owns it.
 */
export function validateProjectCloseComponentMatrix(
  input: Bl020ComponentValidationInput
): readonly string[] {
  const { matrix } = input
  const violations: string[] = []
  const fail = (code: string): void => {
    if (!violations.includes(code)) violations.push(code)
  }

  const declared = matrix.rows.map((row) => row.scenario)
  if (
    matrix.evidenceId !== 'bl-020-close-component-matrix' ||
    matrix.generatedFrom !== 'execution' ||
    matrix.stage !== 't-7-t-8-component-lane' ||
    typeof matrix.runId !== 'string' ||
    matrix.runId.length === 0 ||
    matrix.scenarioCount !== BL020_COMPONENT_SCENARIOS.length ||
    matrix.rows.length !== BL020_COMPONENT_SCENARIOS.length ||
    JSON.stringify(declared) !== JSON.stringify([...BL020_COMPONENT_SCENARIOS])
  )
    fail('scenario-catalog-mismatch')
  const executionIds = matrix.rows.map((row) => row.executionId)
  if (
    new Set(executionIds).size !== executionIds.length ||
    executionIds.some(
      (id) => typeof id !== 'string' || !id.includes(matrix.runId)
    )
  )
    fail('execution-identifier-invalid')

  for (const row of matrix.rows) {
    const token = (value: unknown): boolean => {
      const ordinal = cardOrdinal(value)
      return ordinal !== undefined && ordinal <= row.cards
    }

    if (!isCount(row.cards) || row.cards < 2) fail('card-token-invalid')
    if (!isCount(row.assertions) || row.assertions === 0)
      fail('assertion-result-missing')
    if (!inSet(BL020_COMPONENT_OUTCOMES, row.outcome))
      fail('assertion-result-missing')

    const paths = row.productionPathsEntered
    if (
      !Array.isArray(paths) ||
      paths.length === 0 ||
      new Set(paths).size !== paths.length ||
      paths.some((entered) => !inSet(BL020_COMPONENT_PATHS, entered))
    )
      fail('execution-witness-missing')

    if (row.admissions.length === 0) fail('execution-witness-missing')
    for (const admission of row.admissions) {
      if (!token(admission.card)) fail('card-token-invalid')
      if (
        !inSet(BL020_COMPONENT_ACTIONS, admission.action) ||
        typeof admission.admitted !== 'boolean' ||
        typeof admission.renderedPresent !== 'boolean' ||
        !inSet(BL020_COMPONENT_EQUIVALENCE, admission.equivalence)
      ) {
        fail('admission-equivalence-invalid')
        continue
      }
      if (
        admission.renderedPresent
          ? typeof admission.renderedDisabled !== 'boolean'
          : admission.renderedDisabled !== null
      )
        fail('admission-equivalence-invalid')
      if (admission.equivalence === 'not-rendered' && admission.renderedPresent)
        fail('admission-equivalence-invalid')
      if (
        admission.equivalence === 'equal' &&
        (!admission.renderedPresent ||
          admission.renderedDisabled !== !admission.admitted)
      )
        fail('admission-equivalence-invalid')
      if (
        admission.equivalence === 'activation-scoped' &&
        (admission.action !== 'open' ||
          admission.renderedDisabled !== true ||
          !admission.admitted)
      )
        fail('admission-equivalence-invalid')
    }

    const dialog = row.dialog
    if (
      !isCount(dialog.openings) ||
      !isCount(dialog.maxConcurrent) ||
      !isCount(dialog.refusedPeerOpenings) ||
      dialog.maxConcurrent > 1 ||
      typeof dialog.ariaModal !== 'boolean' ||
      typeof dialog.labelled !== 'boolean' ||
      typeof dialog.described !== 'boolean' ||
      typeof dialog.focusContained !== 'boolean' ||
      typeof dialog.dismissedAtTransmission !== 'boolean'
    )
      fail('dialog-observation-invalid')
    else if (dialog.openings === 0) {
      if (
        dialog.subject !== null ||
        dialog.maxConcurrent !== 0 ||
        dialog.ariaModal ||
        dialog.labelled ||
        dialog.described ||
        dialog.focusContained ||
        dialog.dismissedAtTransmission ||
        dialog.refusedPeerOpenings !== 0
      )
        fail('dialog-observation-invalid')
    } else if (
      dialog.maxConcurrent !== 1 ||
      !token(dialog.subject) ||
      !dialog.ariaModal ||
      !dialog.labelled ||
      !dialog.described ||
      !dialog.focusContained
    )
      fail('dialog-observation-invalid')

    for (const pending of row.pending) {
      if (!token(pending.card)) fail('card-token-invalid')
      if (
        !inSet(BL020_COMPONENT_CLOSE_PHASES, pending.phase) ||
        typeof pending.busy !== 'boolean'
      )
        fail('pending-observation-invalid')
    }

    if (row.focus.length === 0) fail('focus-observation-invalid')
    for (const focus of row.focus) {
      if (!inSet(BL020_COMPONENT_FOCUS_TARGETS, focus.target)) {
        fail('focus-observation-invalid')
        continue
      }
      const anchored = focus.target !== 'heading' && focus.target !== 'none'
      if (anchored ? !token(focus.card) : focus.card !== null)
        fail('focus-observation-invalid')
    }

    for (const announcement of row.announcements) {
      if (
        !inSet(
          BL020_COMPONENT_ANNOUNCEMENT_CLASSES,
          announcement.announcementClass
        ) ||
        typeof announcement.namePrefixed !== 'boolean'
      ) {
        fail('announcement-attribution-missing')
        continue
      }
      if (announcement.announcementClass === 'none') {
        if (announcement.card !== null || announcement.namePrefixed)
          fail('announcement-attribution-missing')
        continue
      }
      if (!token(announcement.card) || !announcement.namePrefixed)
        fail('announcement-attribution-missing')
    }

    const calls = row.calls
    const counts = [
      calls.closeRequests,
      calls.listRequests,
      calls.listReplacements,
      calls.runtimeStateRequests,
      calls.stopRequests,
      calls.restartRequests,
      calls.workbenchNavigations,
      calls.transportInvocations,
      calls.thenableTransportReturns,
    ]
    if (
      counts.some((count) => !isCount(count)) ||
      calls.transportInvocations !== calls.thenableTransportReturns ||
      calls.listReplacements > calls.listRequests ||
      calls.closeRequests +
        calls.listRequests +
        calls.runtimeStateRequests +
        calls.stopRequests +
        calls.restartRequests >
        calls.transportInvocations
    )
      fail('call-accounting-invalid')
  }

  const produced = matrix.rows.filter(
    (row) =>
      row.productionPathsEntered.length > 0 &&
      row.admissions.length > 0 &&
      row.assertions > 0
  ).length
  if (
    matrix.aggregate.rows !== matrix.rows.length ||
    matrix.aggregate.executionProduced !== produced ||
    matrix.aggregate.allPassed !==
      matrix.rows.every((row) => row.outcome === 'passed')
  )
    fail('aggregate-mismatch')

  const exposed = input.protectedValues.filter(
    (value) => value.length > 0 && input.serialized.includes(value)
  )
  const shaped = PROTECTED_SHAPES.filter(([, pattern]) =>
    pattern.test(input.serialized)
  )
  if (exposed.length > 0 || shaped.length > 0) fail('protected-value-present')

  return Object.freeze(violations)
}
