/// <reference types="node" />
import { randomUUID } from 'node:crypto'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App, CLOSE_DIALOG_BODY } from './App'
import {
  BL020_COMPONENT_ACTIONS,
  BL020_COMPONENT_CLOSE_PHASES,
  BL020_COMPONENT_SCENARIOS,
  serializeProjectCloseComponentMatrix,
  validateProjectCloseComponentMatrix,
  type Bl020ComponentAction,
  type Bl020ComponentAdmission,
  type Bl020ComponentAnnouncement,
  type Bl020ComponentAnnouncementClass,
  type Bl020ComponentClosePhase,
  type Bl020ComponentFocus,
  type Bl020ComponentFocusTarget,
  type Bl020ComponentMatrix,
  type Bl020ComponentPath,
  type Bl020ComponentPending,
  type Bl020ComponentRow,
  type Bl020ComponentScenarioId,
} from './project-close-component-evidence'
import {
  CLOSE_FAILURE_MESSAGES,
  type CloseTransport,
  type CloseTransportResult,
  type Project,
  type ProjectLoader,
} from './projects'
import {
  RUNTIME_FAILURE_NOTICES,
  type RuntimeReport,
  type RuntimeStateLoader,
} from './runtime-state'
import type {
  RuntimeRestartTransport,
  RuntimeRestartTransportResult,
} from './runtime-restart'
import type {
  RuntimeStopTransport,
  RuntimeStopTransportResult,
} from './runtime-stop'
import type {
  ProjectHomeController,
  ProjectHomeDependencies,
} from './use-project-home'

/**
 * BL-020 web component execution lane (`T-7`, `T-8`; `V-13`).
 *
 * Every row of `test-results/bl-020/close-component-matrix.json` is produced by
 * rendering Project Home into jsdom and recording what production did: the
 * transports it invoked, the controller admission it reported, the `disabled`
 * values it rendered, the dialog it mounted, the focus it moved, and the text
 * it announced. Nothing in this file states an expected row; a row carries only
 * observations plus the result of asserting them.
 *
 * The controller `App` renders is captured by delegating to the real hook, so
 * admission is read from the same instance whose state produced the markup.
 */
const captured = vi.hoisted(() => ({
  controller: undefined as ProjectHomeController | undefined,
}))

vi.mock('./use-project-home', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./use-project-home')>()
  return {
    ...actual,
    useProjectHome: (dependencies?: ProjectHomeDependencies) => {
      const controller = actual.useProjectHome(dependencies)
      captured.controller = controller
      return controller
    },
  }
})

function controller(): ProjectHomeController {
  const current = captured.controller
  if (current === undefined) throw new Error('Project Home is not rendered')
  return current
}

/**
 * Fixture identities deliberately carry host-shaped values — a path, a
 * loopback authority with a port, a process word, and markup — so the
 * artifact's redaction scan runs against real protected values rather than a
 * heuristic.
 */
const alpha: Project = {
  id: 'component-alpha-9c1d',
  name: 'Alpha pid 424242',
  canonicalPath: '/private/sentinel-alpha/tree',
  createdAt: 1,
}
const beta: Project = {
  id: 'component-beta-4f7a',
  name: 'Beta 127.0.0.1:45678',
  canonicalPath: '/private/sentinel-beta/tree',
  createdAt: 2,
}
const gamma: Project = {
  id: 'component-gamma-2b83',
  name: 'Gamma <script>alert(1)</script>',
  canonicalPath: '/private/sentinel-gamma/tree',
  createdAt: 3,
}
const delta: Project = {
  id: 'component-delta-7e05',
  name: 'Delta ~ workspace',
  canonicalPath: '/private/sentinel-delta/tree',
  createdAt: 4,
}

const PROTECTED_VALUES: readonly string[] = Object.freeze([
  alpha.id,
  beta.id,
  gamma.id,
  delta.id,
  alpha.name,
  beta.name,
  gamma.name,
  delta.name,
  alpha.canonicalPath,
  beta.canonicalPath,
  gamma.canonicalPath,
  delta.canonicalPath,
  'sentinel',
  'pid 424242',
  '127.0.0.1',
  '45678',
  'alert(1)',
  CLOSE_DIALOG_BODY,
  ...Object.values(CLOSE_FAILURE_MESSAGES),
])

type RuntimeFixture = Omit<RuntimeReport, 'id'>

function fixtureStates(): Map<string, RuntimeFixture> {
  return new Map<string, RuntimeFixture>([
    [alpha.id, { state: 'Running' }],
    [
      beta.id,
      { state: 'Failed', failureCategory: 'close-release-unconfirmed' },
    ],
    [gamma.id, { state: 'Stopped' }],
    [delta.id, { state: 'Running' }],
  ])
}

const RESULT_PATH = path.resolve(
  import.meta.dirname,
  '../../../test-results/bl-020/close-component-matrix.json'
)
const SETTLED_WAIT_MS = 5_000
const MATRIX_TIMEOUT_MS = 300_000

const ACTIONS: readonly Bl020ComponentAction[] = BL020_COMPONENT_ACTIONS

const ACTION_LABEL: Readonly<
  Record<Bl020ComponentAction, (name: string) => string>
> = {
  open: (name) => 'Open ' + name,
  close: (name) => 'Close ' + name,
  'retry-close': (name) => 'Retry close ' + name,
  'refresh-close': (name) => 'Refresh close result for ' + name,
  stop: (name) => 'Stop ' + name + ' workbench',
  restart: (name) => 'Restart ' + name + ' workbench',
}

const FOCUS_FOR: Readonly<
  Record<Bl020ComponentAction, Bl020ComponentFocusTarget>
> = {
  open: 'open',
  close: 'close',
  'retry-close': 'close-retry',
  'refresh-close': 'close-refresh',
  stop: 'stop',
  restart: 'restart',
}

const ANNOUNCEMENT_CATALOG: readonly (readonly [
  string,
  Bl020ComponentAnnouncementClass,
])[] = Object.freeze([
  ['Preparing to close project…', 'close-preparing'],
  ['Close request sent.', 'close-transmitted'],
  ['Project closed.', 'close-success'],
  [
    'Close outcome unknown. Refresh projects to determine the result.',
    'close-unknown',
  ],
  ['Close result is still unknown. Refresh projects again.', 'close-unknown'],
  ['Refreshing projects to determine the close result…', 'close-refreshing'],
  ['The project remains registered. Retry this project.', 'close-retained'],
  ['No close request was sent. Retry this project.', 'close-failure'],
  ['Close cancelled.', 'close-cancelled'],
  ['Stopping workbench.', 'stop'],
  ['Workbench stopped. The project remains registered.', 'stop'],
  ['Workbench was already stopped.', 'stop'],
  ['Restarting workbench.', 'restart'],
  ['Workbench restarted.', 'restart'],
  ['Opening workbench.', 'workbench-open'],
  ...Object.values(CLOSE_FAILURE_MESSAGES).map(
    (message): readonly [string, Bl020ComponentAnnouncementClass] => [
      message,
      'close-failure',
    ]
  ),
])

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

interface Row {
  readonly scenario: Bl020ComponentScenarioId
  readonly executionId: string
  cards: number
  readonly paths: Bl020ComponentPath[]
  readonly admissions: Bl020ComponentAdmission[]
  readonly pending: Bl020ComponentPending[]
  readonly focus: Bl020ComponentFocus[]
  readonly announcements: Bl020ComponentAnnouncement[]
  readonly dialog: {
    openings: number
    maxConcurrent: number
    subject: string | null
    ariaModal: boolean
    labelled: boolean
    described: boolean
    focusContained: boolean
    dismissedAtTransmission: boolean
    refusedPeerOpenings: number
  }
  readonly calls: {
    closeRequests: number
    listRequests: number
    listReplacements: number
    runtimeStateRequests: number
    stopRequests: number
    restartRequests: number
    workbenchNavigations: number
    transportInvocations: number
    thenableTransportReturns: number
  }
  assertions: number
  enter(path: Bl020ComponentPath): void
  check(assertion: () => void): void
}

function beginRow(scenario: Bl020ComponentScenarioId, runId: string): Row {
  const row: Row = {
    scenario,
    executionId: 'bl020-component-' + scenario + '-' + runId,
    cards: 0,
    paths: [],
    admissions: [],
    pending: [],
    focus: [],
    announcements: [],
    dialog: {
      openings: 0,
      maxConcurrent: 0,
      subject: null,
      ariaModal: false,
      labelled: false,
      described: false,
      focusContained: false,
      dismissedAtTransmission: false,
      refusedPeerOpenings: 0,
    },
    calls: {
      closeRequests: 0,
      listRequests: 0,
      listReplacements: 0,
      runtimeStateRequests: 0,
      stopRequests: 0,
      restartRequests: 0,
      workbenchNavigations: 0,
      transportInvocations: 0,
      thenableTransportReturns: 0,
    },
    assertions: 0,
    enter(entered) {
      if (!row.paths.includes(entered)) row.paths.push(entered)
    },
    check(assertion) {
      assertion()
      row.assertions += 1
    },
  }
  return row
}

function finishRow(row: Row, outcome: 'passed' | 'failed'): Bl020ComponentRow {
  return {
    scenario: row.scenario,
    executionId: row.executionId,
    cards: row.cards,
    productionPathsEntered: [...row.paths],
    admissions: [...row.admissions],
    dialog: { ...row.dialog },
    pending: [...row.pending],
    focus: [...row.focus],
    announcements: [...row.announcements],
    calls: { ...row.calls },
    assertions: row.assertions,
    outcome,
  }
}

interface CloseCall {
  readonly projectId: string
  readonly settlement: Deferred<CloseTransportResult>
  readonly transmit: (() => void) | undefined
  settled: boolean
}

interface StopCall {
  readonly projectId: string
  readonly settlement: Deferred<RuntimeStopTransportResult>
  settled: boolean
}

interface RestartCall {
  readonly projectId: string
  readonly settlement: Deferred<RuntimeRestartTransportResult>
  settled: boolean
}

interface Lane {
  readonly fixtures: readonly Project[]
  readonly registered: Project[]
  readonly closeCalls: readonly CloseCall[]
  readonly navigations: readonly string[]
  activation: string | undefined
  token(projectId: string): string
  scriptList(): Deferred<Project[]>
  setRuntimeState(projectId: string, fixture: RuntimeFixture): void
  transmit(project: Project): void
  settleClose(project: Project, result: CloseTransportResult): Promise<void>
  settleStop(
    project: Project,
    result: RuntimeStopTransportResult
  ): Promise<void>
  settleRestart(
    project: Project,
    result: RuntimeRestartTransportResult
  ): Promise<void>
  mount(): Promise<void>
}

function createLane(row: Row, fixtures: readonly Project[]): Lane {
  const registered: Project[] = [...fixtures]
  const closeCalls: CloseCall[] = []
  const stopCalls: StopCall[] = []
  const restartCalls: RestartCall[] = []
  const navigations: string[] = []
  const listScript: Deferred<Project[]>[] = []
  const states = fixtureStates()
  const tokens = new Map<string, string>(
    fixtures.map((project, index) => [project.id, 'card-' + String(index + 1)])
  )
  row.cards = Math.max(row.cards, fixtures.length)

  const invoked = <T,>(result: Promise<T>): Promise<T> => {
    row.calls.transportInvocations += 1
    if (result instanceof Promise) row.calls.thenableTransportReturns += 1
    return result
  }

  const load: ProjectLoader = () => {
    row.calls.listRequests += 1
    row.enter('project-list-load')
    const scripted = listScript.shift()
    return invoked(scripted?.promise ?? Promise.resolve([...registered]))
  }

  const close: CloseTransport = (projectId, _signal, onTransmitted) => {
    row.calls.closeRequests += 1
    row.enter('close-requested')
    const settlement = deferred<CloseTransportResult>()
    closeCalls.push({
      projectId,
      settlement,
      transmit: onTransmitted,
      settled: false,
    })
    return invoked(settlement.promise)
  }

  const stop: RuntimeStopTransport = (projectId) => {
    row.calls.stopRequests += 1
    row.enter('stop-requested')
    const settlement = deferred<RuntimeStopTransportResult>()
    stopCalls.push({ projectId, settlement, settled: false })
    return invoked(settlement.promise)
  }

  const restart: RuntimeRestartTransport = (projectId) => {
    row.calls.restartRequests += 1
    row.enter('restart-requested')
    const settlement = deferred<RuntimeRestartTransportResult>()
    restartCalls.push({ projectId, settlement, settled: false })
    return invoked(settlement.promise)
  }

  const runtime: RuntimeStateLoader = () => {
    row.calls.runtimeStateRequests += 1
    row.enter('runtime-state-load')
    return invoked(
      Promise.resolve(
        registered.map((project): RuntimeReport => {
          const fixture = states.get(project.id)
          if (fixture === undefined) {
            throw new Error('Missing runtime fixture')
          }
          return { id: project.id, ...fixture }
        })
      )
    )
  }

  const navigate = (url: string): void => {
    row.calls.workbenchNavigations += 1
    row.enter('workbench-open-navigated')
    navigations.push(url)
  }

  const pendingCloseCall = (project: Project): CloseCall => {
    const call = [...closeCalls]
      .reverse()
      .find(
        (candidate) => candidate.projectId === project.id && !candidate.settled
      )
    if (call === undefined) throw new Error('No in-flight close to settle')
    return call
  }

  const lane: Lane = {
    fixtures,
    registered,
    closeCalls,
    navigations,
    activation: undefined,
    token(projectId) {
      const value = tokens.get(projectId)
      if (value === undefined) throw new Error('Unknown card')
      return value
    },
    scriptList() {
      const scripted = deferred<Project[]>()
      listScript.push(scripted)
      return scripted
    },
    setRuntimeState(projectId, fixture) {
      states.set(projectId, fixture)
    },
    transmit(project) {
      const call = pendingCloseCall(project)
      act(() => call.transmit?.())
      row.enter('close-transmitted')
    },
    async settleClose(project, result) {
      const call = pendingCloseCall(project)
      call.settled = true
      if (result.kind === 'success') {
        const index = registered.findIndex(({ id }) => id === project.id)
        if (index >= 0) registered.splice(index, 1)
      }
      await act(async () => {
        call.settlement.resolve(result)
      })
      row.enter('close-settled')
      await flush()
    },
    async settleStop(project, result) {
      const call = stopCalls.find(
        (candidate) => candidate.projectId === project.id && !candidate.settled
      )
      if (call === undefined) throw new Error('No in-flight stop to settle')
      call.settled = true
      if (result.kind === 'success')
        states.set(project.id, { state: 'Stopped' })
      await act(async () => {
        call.settlement.resolve(result)
      })
      await flush()
    },
    async settleRestart(project, result) {
      const call = restartCalls.find(
        (candidate) => candidate.projectId === project.id && !candidate.settled
      )
      if (call === undefined) throw new Error('No in-flight restart to settle')
      call.settled = true
      if (result.kind === 'success')
        states.set(project.id, { state: 'Running' })
      await act(async () => {
        call.settlement.resolve(result)
      })
      await flush()
    },
    async mount() {
      render(
        <App
          closeProject={close}
          loadProjectList={load}
          loadRuntimeStates={runtime}
          navigateToWorkbench={navigate}
          restartRuntime={restart}
          stopRuntime={stop}
        />
      )
      await screen.findByRole(
        'button',
        { name: ACTION_LABEL.close(fixtures[0]!.name) },
        { timeout: SETTLED_WAIT_MS }
      )
      await screen.findByLabelText('Runtime state summary', undefined, {
        timeout: SETTLED_WAIT_MS,
      })
    },
  }
  return lane
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

async function settleQuiet(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

function control(
  action: Bl020ComponentAction,
  project: Project
): HTMLElement | null {
  return screen.queryByRole('button', {
    name: ACTION_LABEL[action](project.name),
  })
}

function required(action: Bl020ComponentAction, project: Project): HTMLElement {
  const element = control(action, project)
  if (element === null) throw new Error('Control is not rendered: ' + action)
  return element
}

function cardElement(project: Project): HTMLElement | null {
  return (
    document
      .querySelector('[data-close-project-id="' + CSS.escape(project.id) + '"]')
      ?.closest('li') ?? null
  )
}

function statusRegion(project: Project): HTMLElement | null {
  return screen.queryByRole('status', {
    name: 'Close status for ' + project.name,
  })
}

function dialogFor(project: Project): HTMLElement | null {
  return screen.queryByRole('dialog', {
    name: 'Close ' + project.name + '?',
  })
}

function renderedCards(lane: Lane): Project[] {
  return lane.fixtures.filter((project) => cardElement(project) !== null)
}

function isClosePhase(value: string): value is Bl020ComponentClosePhase {
  return (BL020_COMPONENT_CLOSE_PHASES as readonly string[]).includes(value)
}

/**
 * Records, for every rendered card and every action, the controller's own
 * admission beside the `disabled` value the same render produced, and asserts
 * the equivalence the plan owns for Close, Stop, Restart, Retry close, and
 * Refresh close.
 */
function observeAdmissions(row: Row, lane: Lane): void {
  for (const project of renderedCards(lane)) {
    for (const action of ACTIONS) {
      const element = control(action, project)
      const admitted = controller().admits(action, project.id)
      const renderedPresent = element !== null
      const renderedDisabled =
        element === null ? null : element.hasAttribute('disabled')
      const equivalence = !renderedPresent
        ? 'not-rendered'
        : renderedDisabled === !admitted
          ? 'equal'
          : 'activation-scoped'
      row.admissions.push({
        card: lane.token(project.id),
        action,
        admitted,
        renderedPresent,
        renderedDisabled,
        equivalence,
      })
      if (!renderedPresent) continue
      if (action !== 'open') {
        row.check(() => expect(renderedDisabled).toBe(!admitted))
        continue
      }
      if (equivalence === 'equal') continue
      // The only permitted divergence is the delivered single-activation rule.
      row.check(() => expect(lane.activation).not.toBeUndefined())
      row.check(() => expect(lane.activation).not.toBe(project.id))
      row.check(() => expect(renderedDisabled).toBe(true))
    }
  }
}

function observePending(row: Row, lane: Lane): void {
  for (const project of renderedCards(lane)) {
    const card = cardElement(project)
    if (card === null) continue
    const status = statusRegion(project)
    const dialog = dialogFor(project)
    const phase =
      status?.getAttribute('data-close-phase') ??
      (dialog === null
        ? null
        : dialog.getAttribute('aria-busy') === 'true'
          ? 'pending'
          : 'confirming')
    if (phase === null) continue
    if (!isClosePhase(phase)) throw new Error('Unknown close phase: ' + phase)
    row.pending.push({
      card: lane.token(project.id),
      phase,
      busy: card.getAttribute('aria-busy') === 'true',
    })
  }
}

function observeFocus(row: Row, lane: Lane): Bl020ComponentFocus {
  const active = document.activeElement
  let observation: Bl020ComponentFocus = { target: 'none', card: null }
  const heading = screen.queryByRole('heading', { name: 'Ascend' })
  if (active !== null && active === heading) {
    observation = { target: 'heading', card: null }
  } else {
    for (const project of lane.fixtures) {
      if (active !== null && statusRegion(project) === active) {
        observation = {
          target: 'close-status',
          card: lane.token(project.id),
        }
        break
      }
      const action = ACTIONS.find(
        (candidate) => control(candidate, project) === active
      )
      if (action !== undefined) {
        observation = {
          target: FOCUS_FOR[action],
          card: lane.token(project.id),
        }
        break
      }
    }
  }
  row.focus.push(observation)
  return observation
}

function observeAnnouncement(row: Row, lane: Lane): Bl020ComponentAnnouncement {
  const text =
    document.querySelector('#workbench-opening-status')?.textContent ?? ''
  const matched = ANNOUNCEMENT_CATALOG.filter(([message]) =>
    text.endsWith(message)
  ).sort((left, right) => right[0].length - left[0].length)[0]
  let observation: Bl020ComponentAnnouncement = {
    announcementClass: 'none',
    card: null,
    namePrefixed: false,
  }
  if (text.length > 0 && matched !== undefined) {
    const owner = lane.fixtures.find(
      (project) => text === project.name + ': ' + matched[0]
    )
    observation = {
      announcementClass: matched[1],
      card: owner === undefined ? null : lane.token(owner.id),
      namePrefixed: owner !== undefined,
    }
  }
  row.announcements.push(observation)
  return observation
}

/** Opens a card's close dialog with the keyboard and records its semantics. */
async function openDialog(
  row: Row,
  lane: Lane,
  project: Project
): Promise<HTMLElement> {
  const invoking = required('close', project)
  invoking.focus()
  await userEvent.setup().keyboard('{Enter}')
  const dialog = await screen.findByRole('dialog', undefined, {
    timeout: SETTLED_WAIT_MS,
  })
  row.enter('close-dialog-opened')
  row.dialog.openings += 1
  row.dialog.maxConcurrent = Math.max(
    row.dialog.maxConcurrent,
    screen.getAllByRole('dialog').length
  )
  row.dialog.subject = lane.token(project.id)
  const labelledBy = dialog.getAttribute('aria-labelledby')
  const describedBy = dialog.getAttribute('aria-describedby')
  const label = labelledBy === null ? null : document.getElementById(labelledBy)
  const description =
    describedBy === null ? null : document.getElementById(describedBy)
  row.dialog.ariaModal = dialog.getAttribute('aria-modal') === 'true'
  row.dialog.labelled =
    label !== null && label.textContent === 'Close ' + project.name + '?'
  row.dialog.described =
    description !== null && description.textContent === CLOSE_DIALOG_BODY
  await waitFor(
    () => expect(dialog.contains(document.activeElement)).toBe(true),
    { timeout: SETTLED_WAIT_MS }
  )
  row.dialog.focusContained = dialog.contains(document.activeElement)
  row.check(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
  row.check(() => expect(row.dialog.ariaModal).toBe(true))
  row.check(() => expect(row.dialog.labelled).toBe(true))
  row.check(() => expect(row.dialog.described).toBe(true))
  row.check(() => expect(row.dialog.focusContained).toBe(true))
  return dialog
}

/** Drives Tab and Shift+Tab through the dialog and proves focus never leaves. */
async function proveContainment(row: Row, dialog: HTMLElement): Promise<void> {
  const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
  const confirm = within(dialog).getByRole('button', { name: 'Confirm' })
  await waitFor(() => expect(cancel).toHaveFocus(), {
    timeout: SETTLED_WAIT_MS,
  })
  await userEvent.setup().keyboard('{Shift>}{Tab}{/Shift}')
  row.check(() => expect(confirm).toHaveFocus())
  row.check(() => expect(dialog.contains(document.activeElement)).toBe(true))
  await userEvent.setup().keyboard('{Tab}')
  row.check(() => expect(cancel).toHaveFocus())
  row.check(() => expect(dialog.contains(document.activeElement)).toBe(true))
}

async function confirmDialog(row: Row): Promise<void> {
  const confirm = screen.getByRole('button', { name: 'Confirm' })
  confirm.focus()
  await userEvent.setup().keyboard('{Enter}')
  row.enter('close-requested')
}

function recordDismissal(row: Row): void {
  row.dialog.dismissedAtTransmission = screen.queryByRole('dialog') === null
  row.enter('close-dialog-dismissed')
  row.check(() => expect(row.dialog.dismissedAtTransmission).toBe(true))
}

/** Drives one card from a clean list to a transmitted, still-pending close. */
async function beginPendingClose(
  row: Row,
  lane: Lane,
  project: Project
): Promise<void> {
  await openDialog(row, lane, project)
  await confirmDialog(row)
  lane.transmit(project)
  recordDismissal(row)
}

async function activateOpen(
  row: Row,
  lane: Lane,
  project: Project
): Promise<void> {
  await userEvent.setup().click(required('open', project))
  lane.activation = project.id
  await flush()
  row.check(() => expect(lane.navigations).toHaveLength(1))
  row.check(() => expect(lane.navigations[0]).toContain(project.id))
}

function closeCountFor(lane: Lane, project: Project): number {
  return lane.closeCalls.filter(({ projectId }) => projectId === project.id)
    .length
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/** S-32: keyboard close dialog from a `Running` card through transmission. */
async function runS32(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()
  row.check(() =>
    expect(
      cardElement(alpha)?.querySelector('[data-runtime-state="Running"]')
    ).not.toBeNull()
  )
  const dialog = await openDialog(row, lane, alpha)
  await proveContainment(row, dialog)
  observePending(row, lane)
  observeAdmissions(row, lane)

  await confirmDialog(row)
  row.check(() => expect(row.calls.closeRequests).toBe(1))
  row.check(() => expect(screen.queryByRole('dialog')).not.toBeNull())
  observeAnnouncement(row, lane)

  lane.transmit(alpha)
  recordDismissal(row)
  const status = statusRegion(alpha)
  row.check(() => expect(status).toHaveAttribute('data-close-phase', 'pending'))
  row.check(() => expect(status).toHaveAttribute('aria-busy', 'true'))
  row.check(() => expect(status).toHaveFocus())
  row.check(() => expect(cardElement(alpha)).toHaveAttribute('aria-busy'))
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close-status',
      card: lane.token(alpha.id),
    })
  )
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-transmitted',
      card: lane.token(alpha.id),
      namePrefixed: true,
    })
  )
  observePending(row, lane)
  observeAdmissions(row, lane)

  await lane.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', alpha)).toBeNull())
  row.check(() =>
    expect(observeAnnouncement(row, lane).announcementClass).toBe(
      'close-success'
    )
  )
  observeFocus(row, lane)
}

/** S-33: the same semantics from a truthfully rendered `Failed` card. */
async function runS33(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()
  const card = cardElement(beta)
  row.check(() =>
    expect(card?.querySelector('[data-runtime-state="Failed"]')).not.toBeNull()
  )
  row.check(() =>
    expect(
      card?.querySelector('[data-runtime-failure="close-release-unconfirmed"]')
    ).not.toBeNull()
  )
  row.check(() =>
    expect(card).toHaveTextContent(
      RUNTIME_FAILURE_NOTICES['close-release-unconfirmed']
    )
  )
  const dialog = await openDialog(row, lane, beta)
  await proveContainment(row, dialog)
  observePending(row, lane)
  observeAdmissions(row, lane)

  await confirmDialog(row)
  lane.transmit(beta)
  recordDismissal(row)
  const status = statusRegion(beta)
  row.check(() => expect(status).toHaveAttribute('data-close-phase', 'pending'))
  row.check(() => expect(status).toHaveFocus())
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-transmitted',
      card: lane.token(beta.id),
      namePrefixed: true,
    })
  )
  // The peer's own truthful state is untouched by the pending close.
  row.check(() =>
    expect(
      cardElement(alpha)?.querySelector('[data-runtime-state="Running"]')
    ).not.toBeNull()
  )
  observeFocus(row, lane)
  observePending(row, lane)

  await lane.settleClose(beta, {
    kind: 'success',
    id: beta.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', beta)).toBeNull())
  row.check(() => expect(renderedCards(lane)).toEqual([alpha]))
  observeFocus(row, lane)
  observeAdmissions(row, lane)
}

/** S-34: Escape and Cancel before transmission make no request at all. */
async function runS34(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()

  await openDialog(row, lane, alpha)
  await userEvent.setup().keyboard('{Escape}')
  row.enter('close-dialog-escaped')
  row.check(() => expect(screen.queryByRole('dialog')).toBeNull())
  row.check(() => expect(control('close', alpha)).toHaveFocus())
  row.check(() => expect(row.calls.closeRequests).toBe(0))
  row.check(() => expect(renderedCards(lane)).toEqual([alpha, beta]))
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close',
      card: lane.token(alpha.id),
    })
  )
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-cancelled',
      card: lane.token(alpha.id),
      namePrefixed: true,
    })
  )

  await openDialog(row, lane, beta)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
  row.enter('close-dialog-cancelled')
  row.check(() => expect(screen.queryByRole('dialog')).toBeNull())
  row.check(() => expect(control('close', beta)).toHaveFocus())
  row.check(() => expect(row.calls.closeRequests).toBe(0))
  row.check(() => expect(renderedCards(lane)).toEqual([alpha, beta]))
  row.check(() =>
    expect(controller().state.projects.map(({ id }) => id)).toEqual([
      alpha.id,
      beta.id,
    ])
  )
  row.check(() => expect(controller().state.closes.size).toBe(0))
  row.check(() => expect(controller().state.closeSettlementVersion).toBe(0))
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close',
      card: lane.token(beta.id),
    })
  )
  observeAnnouncement(row, lane)
  observePending(row, lane)
  observeAdmissions(row, lane)
}

/** S-35: every peer control stays admitted and operable during a pending close. */
async function runS35(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()
  await beginPendingClose(row, lane, alpha)
  observePending(row, lane)
  observeAdmissions(row, lane)

  for (const action of ['open', 'close', 'stop', 'restart'] as const) {
    row.check(() => expect(controller().admits(action, beta.id)).toBe(true))
    row.check(() => expect(required(action, beta)).toBeEnabled())
  }

  await userEvent.setup().click(required('restart', beta))
  row.check(() => expect(row.calls.restartRequests).toBe(1))
  await lane.settleRestart(beta, {
    kind: 'success',
    id: beta.id,
    outcome: 'restarted',
  })
  await waitFor(
    () =>
      expect(
        cardElement(beta)?.querySelector('[data-runtime-state="Running"]')
      ).not.toBeNull(),
    { timeout: SETTLED_WAIT_MS }
  )
  observeAnnouncement(row, lane)

  await userEvent.setup().click(required('stop', beta))
  row.check(() => expect(row.calls.stopRequests).toBe(1))
  await lane.settleStop(beta, {
    kind: 'success',
    id: beta.id,
    outcome: 'stopped',
  })
  await waitFor(
    () =>
      expect(
        cardElement(beta)?.querySelector('[data-runtime-state="Stopped"]')
      ).not.toBeNull(),
    { timeout: SETTLED_WAIT_MS }
  )
  observeAnnouncement(row, lane)

  await activateOpen(row, lane, beta)
  observeAnnouncement(row, lane)

  await openDialog(row, lane, beta)
  await confirmDialog(row)
  lane.transmit(beta)
  row.check(() => expect(closeCountFor(lane, beta)).toBe(1))
  row.check(() =>
    expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'pending')
  )
  observePending(row, lane)
  await lane.settleClose(beta, {
    kind: 'failure',
    category: 'project_close_failed',
  })
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'retry')
  )
  row.check(() =>
    expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'pending')
  )
  observeFocus(row, lane)
  observeAdmissions(row, lane)

  await lane.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', alpha)).toBeNull())
  row.check(() => expect(control('close', beta)).not.toBeNull())
  row.check(() =>
    expect(row.calls.transportInvocations).toBe(
      row.calls.thenableTransportReturns
    )
  )
  observeAnnouncement(row, lane)
}

/** S-36: rendered `disabled` equals refused admission across the whole matrix. */
async function runS36(row: Row): Promise<void> {
  const states = [
    'none',
    'close-confirming',
    'close-pending',
    'close-retry',
    'close-unknown',
    'stop-pending',
    'restart-pending',
    'open-activation',
  ] as const

  for (const state of states) {
    cleanup()
    const lane = createLane(row, [alpha, beta])
    await lane.mount()
    if (state === 'close-confirming') {
      await openDialog(row, lane, alpha)
    } else if (state !== 'none' && state.startsWith('close-')) {
      await beginPendingClose(row, lane, alpha)
      if (state === 'close-retry') {
        await lane.settleClose(alpha, {
          kind: 'failure',
          category: 'project_close_failed',
        })
      } else if (state === 'close-unknown') {
        await lane.settleClose(alpha, { kind: 'unknown' })
      }
    } else if (state === 'stop-pending') {
      await userEvent.setup().click(required('stop', alpha))
    } else if (state === 'restart-pending') {
      await userEvent.setup().click(required('restart', alpha))
    } else if (state === 'open-activation') {
      await activateOpen(row, lane, alpha)
    }
    observeAdmissions(row, lane)
    observePending(row, lane)
    observeFocus(row, lane)
  }

  const compared = row.admissions.filter(
    ({ renderedPresent }) => renderedPresent
  )
  row.check(() => expect(row.admissions).toHaveLength(states.length * 2 * 6))
  row.check(() => expect(compared.length).toBeGreaterThan(0))
  row.check(() =>
    expect(
      row.admissions.filter(
        ({ equivalence }) => equivalence === 'activation-scoped'
      )
    ).toHaveLength(1)
  )
  row.check(() =>
    expect(
      compared.every(
        ({ action, renderedDisabled, admitted }) =>
          action === 'open' || renderedDisabled === !admitted
      )
    ).toBe(true)
  )
}

/** S-37: announcements, focus recovery, and the stale-list lane across settlement. */
async function runS37(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta, gamma])
  await lane.mount()

  // Failure: name-prefixed announcement and focus on that card's Retry close.
  await beginPendingClose(row, lane, alpha)
  await lane.settleClose(alpha, {
    kind: 'failure',
    category: 'project_close_failed',
  })
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-failure',
      card: lane.token(alpha.id),
      namePrefixed: true,
    })
  )
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close-retry',
      card: lane.token(alpha.id),
    })
  )
  observePending(row, lane)

  // Success from the retry lane: focus moves to the next card's Close.
  await userEvent.setup().click(required('retry-close', alpha))
  row.enter('close-retry-requested')
  lane.transmit(alpha)
  await lane.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-success',
      card: lane.token(alpha.id),
      namePrefixed: true,
    })
  )
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close',
      card: lane.token(beta.id),
    })
  )

  // Success on the last card: focus falls back to the previous card's Close.
  await beginPendingClose(row, lane, gamma)
  await lane.settleClose(gamma, {
    kind: 'success',
    id: gamma.id,
    disposition: 'closed',
  })
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close',
      card: lane.token(beta.id),
    })
  )

  // Success on the only card: focus falls back to the Ascend heading.
  await beginPendingClose(row, lane, beta)
  await lane.settleClose(beta, {
    kind: 'success',
    id: beta.id,
    disposition: 'closed',
  })
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({ target: 'heading', card: null })
  )
  row.check(() => expect(renderedCards(lane)).toEqual([]))

  // A list request in flight across a settlement is discarded and re-issued.
  cleanup()
  const stale = createLane(row, [alpha, beta, gamma])
  await stale.mount()
  await beginPendingClose(row, stale, beta)
  await stale.settleClose(beta, { kind: 'unknown' })
  const staleList = stale.scriptList()
  const replacementList = stale.scriptList()
  await beginPendingClose(row, stale, alpha)
  await userEvent.setup().click(required('refresh-close', beta))
  row.enter('close-refresh-requested')
  const beforeSettlement = row.calls.listRequests
  await stale.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', alpha)).toBeNull())
  await act(async () => {
    staleList.resolve([alpha, beta, gamma])
  })
  await flush()
  row.check(() => expect(control('close', alpha)).toBeNull())
  const replacements = row.calls.listRequests - beforeSettlement
  row.calls.listReplacements += replacements
  row.check(() => expect(replacements).toBe(1))
  row.enter('list-response-superseded')
  row.enter('list-replacement-issued')
  await act(async () => {
    replacementList.resolve([alpha, beta, gamma])
  })
  await flush()
  row.check(() => expect(control('close', alpha)).toBeNull())
  row.enter('closed-project-filtered')
  row.enter('list-response-applied')
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'retry')
  )
  row.check(() => expect(renderedCards(stale)).toEqual([beta, gamma]))
  observeAnnouncement(row, stale)
  observePending(row, stale)
  observeAdmissions(row, stale)

  // Reverse ordering: a response that lands before any settlement is applied.
  cleanup()
  const ordered = createLane(row, [alpha, beta, gamma])
  await ordered.mount()
  await beginPendingClose(row, ordered, beta)
  await ordered.settleClose(beta, { kind: 'unknown' })
  const orderedList = ordered.scriptList()
  await userEvent.setup().click(required('refresh-close', beta))
  const beforeOrdered = row.calls.listRequests
  await act(async () => {
    orderedList.resolve([alpha, beta, gamma])
  })
  await flush()
  row.check(() => expect(row.calls.listRequests).toBe(beforeOrdered))
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'retry')
  )
  row.check(() => expect(renderedCards(ordered)).toEqual([alpha, beta, gamma]))
  observeFocus(row, ordered)
}

/** S-65: an unknown outcome resolved to confirmed absence through the list lane. */
async function runS65(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta, gamma, delta])
  await lane.mount()

  // Two cards settle unknown; a third holds a pending close.
  await beginPendingClose(row, lane, alpha)
  await lane.settleClose(alpha, { kind: 'unknown' })
  await beginPendingClose(row, lane, beta)
  await lane.settleClose(beta, { kind: 'unknown' })
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'unknown')
  )
  row.check(() =>
    expect(observeFocus(row, lane)).toEqual({
      target: 'close-refresh',
      card: lane.token(beta.id),
    })
  )
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-unknown',
      card: lane.token(beta.id),
      namePrefixed: true,
    })
  )

  // No automatic repeat: nothing re-issues the list on its own.
  const quiescent = row.calls.listRequests
  await settleQuiet()
  row.check(() => expect(row.calls.listRequests).toBe(quiescent))

  await beginPendingClose(row, lane, gamma)
  observePending(row, lane)
  observeAdmissions(row, lane)

  const superseded = lane.scriptList()
  const replacement = lane.scriptList()
  await userEvent.setup().click(required('refresh-close', beta))
  row.enter('close-refresh-requested')
  row.check(() => expect(row.calls.listRequests).toBe(quiescent + 1))
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'refreshing')
  )
  // The peer's own refresh is refused and rendered disabled while the single
  // list-bearing lane is busy.
  row.check(() =>
    expect(controller().admits('refresh-close', alpha.id)).toBe(false)
  )
  row.check(() => expect(required('refresh-close', alpha)).toBeDisabled())
  row.enter('close-refresh-refused')
  observeAdmissions(row, lane)

  const runtimeBeforeSettlement = row.calls.runtimeStateRequests
  await lane.settleClose(gamma, {
    kind: 'success',
    id: gamma.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', gamma)).toBeNull())
  await waitFor(
    () =>
      expect(row.calls.runtimeStateRequests).toBe(runtimeBeforeSettlement + 1),
    { timeout: SETTLED_WAIT_MS }
  )

  const beforeReplacement = row.calls.listRequests
  await act(async () => {
    superseded.resolve([alpha, beta, gamma, delta])
  })
  await flush()
  row.check(() => expect(control('close', gamma)).toBeNull())
  const reissued = row.calls.listRequests - beforeReplacement
  row.calls.listReplacements += reissued
  row.check(() => expect(reissued).toBe(1))
  row.enter('list-response-superseded')
  row.enter('list-replacement-issued')

  const runtimeBeforeAbsence = row.calls.runtimeStateRequests
  await act(async () => {
    replacement.resolve([alpha, delta])
  })
  await flush()
  row.enter('list-response-applied')
  row.check(() => expect(control('close', beta)).toBeNull())
  row.check(() => expect(renderedCards(lane)).toEqual([alpha, delta]))
  row.check(() =>
    expect(observeAnnouncement(row, lane)).toEqual({
      announcementClass: 'close-success',
      card: lane.token(beta.id),
      namePrefixed: true,
    })
  )
  row.check(() => expect(controller().state.closeSettlementVersion).toBe(2))
  await waitFor(
    () => expect(row.calls.runtimeStateRequests).toBe(runtimeBeforeAbsence + 1),
    { timeout: SETTLED_WAIT_MS }
  )
  const quiescentAgain = row.calls.listRequests
  await settleQuiet()
  row.check(() => expect(row.calls.listRequests).toBe(quiescentAgain))
  observeFocus(row, lane)
  observePending(row, lane)
  observeAdmissions(row, lane)
}

/** S-66: an unknown outcome resolved to a retained registration. */
async function runS66(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()

  for (const cycle of [0, 1]) {
    if (cycle === 0) {
      await beginPendingClose(row, lane, alpha)
    } else {
      await userEvent.setup().click(required('retry-close', alpha))
      row.enter('close-retry-requested')
      lane.transmit(alpha)
    }
    await lane.settleClose(alpha, { kind: 'unknown' })
    row.check(() =>
      expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'unknown')
    )
    const retained = lane.scriptList()
    await userEvent.setup().click(required('refresh-close', alpha))
    row.enter('close-refresh-requested')
    await act(async () => {
      retained.resolve([alpha, beta])
    })
    await flush()
    row.enter('list-response-applied')
    row.check(() =>
      expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'retry')
    )
    row.check(() =>
      expect(observeAnnouncement(row, lane)).toEqual({
        announcementClass: 'close-retained',
        card: lane.token(alpha.id),
        namePrefixed: true,
      })
    )
    row.check(() =>
      expect(observeFocus(row, lane)).toEqual({
        target: 'close-retry',
        card: lane.token(alpha.id),
      })
    )
    // No false removal, no filter: both cards and both truthful states remain.
    row.check(() => expect(renderedCards(lane)).toEqual([alpha, beta]))
    row.check(() =>
      expect(
        cardElement(alpha)?.querySelector('[data-runtime-state="Running"]')
      ).not.toBeNull()
    )
    row.check(() =>
      expect(
        cardElement(beta)?.querySelector('[data-runtime-state="Failed"]')
      ).not.toBeNull()
    )
    row.check(() => expect(controller().state.closeSettlementVersion).toBe(0))
    observePending(row, lane)
    observeAdmissions(row, lane)
  }
}

/** S-72: one open dialog blocks only the peer's Close. */
async function runS72(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()
  await openDialog(row, lane, alpha)

  row.check(() => expect(controller().admits('close', beta.id)).toBe(false))
  row.check(() => expect(required('close', beta)).toBeDisabled())
  fireEvent.click(required('close', beta))
  row.dialog.refusedPeerOpenings += 1
  row.enter('close-dialog-refused')
  row.check(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
  row.check(() => expect(dialogFor(alpha)).not.toBeNull())
  row.check(() => expect(controller().state.closeDialogId).toBe(alpha.id))
  observeAdmissions(row, lane)

  for (const action of ['open', 'stop', 'restart'] as const) {
    row.check(() => expect(controller().admits(action, beta.id)).toBe(true))
    row.check(() => expect(required(action, beta)).toBeEnabled())
  }

  await userEvent.setup().click(required('restart', beta))
  await lane.settleRestart(beta, {
    kind: 'success',
    id: beta.id,
    outcome: 'restarted',
  })
  row.check(() => expect(row.calls.restartRequests).toBe(1))
  await userEvent.setup().click(required('stop', beta))
  await lane.settleStop(beta, {
    kind: 'success',
    id: beta.id,
    outcome: 'stopped',
  })
  row.check(() => expect(row.calls.stopRequests).toBe(1))
  await activateOpen(row, lane, beta)
  row.check(() => expect(dialogFor(alpha)).not.toBeNull())
  observeAnnouncement(row, lane)

  await confirmDialog(row)
  lane.transmit(alpha)
  recordDismissal(row)
  row.check(() => expect(controller().admits('close', beta.id)).toBe(true))
  row.check(() => expect(required('close', beta)).toBeEnabled())
  await openDialog(row, lane, beta)
  row.check(() => expect(controller().state.closeDialogId).toBe(beta.id))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
  row.enter('close-dialog-cancelled')
  observePending(row, lane)
  observeFocus(row, lane)

  await lane.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', alpha)).toBeNull())
  observeAdmissions(row, lane)
}

/** S-73: duplicate confirmations and a racing retry produce one request. */
async function runS73(row: Row): Promise<void> {
  const lane = createLane(row, [alpha, beta])
  await lane.mount()
  await openDialog(row, lane, alpha)

  const confirm = screen.getByRole('button', { name: 'Confirm' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  row.check(() => expect(closeCountFor(lane, alpha)).toBe(1))
  row.check(() => expect(row.calls.closeRequests).toBe(1))

  lane.transmit(alpha)
  recordDismissal(row)
  const announced = observeAnnouncement(row, lane)
  row.check(() => expect(announced.announcementClass).toBe('close-transmitted'))
  lane.transmit(alpha)
  row.check(() => expect(observeAnnouncement(row, lane)).toEqual(announced))
  row.check(() => expect(row.calls.closeRequests).toBe(1))

  act(() => controller().retryClose(alpha.id))
  await flush()
  row.enter('close-retry-refused')
  row.check(() => expect(closeCountFor(lane, alpha)).toBe(1))
  row.check(() =>
    expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'pending')
  )
  observePending(row, lane)
  observeAdmissions(row, lane)

  // The peer lane is unaffected and transmits exactly its own request.
  await openDialog(row, lane, beta)
  await confirmDialog(row)
  lane.transmit(beta)
  row.check(() => expect(closeCountFor(lane, beta)).toBe(1))
  row.check(() => expect(row.calls.closeRequests).toBe(2))
  observePending(row, lane)

  await lane.settleClose(beta, {
    kind: 'failure',
    category: 'runtime_release_unconfirmed',
  })
  row.check(() =>
    expect(statusRegion(beta)).toHaveAttribute('data-close-phase', 'retry')
  )
  row.check(() =>
    expect(statusRegion(alpha)).toHaveAttribute('data-close-phase', 'pending')
  )
  await lane.settleClose(alpha, {
    kind: 'success',
    id: alpha.id,
    disposition: 'closed',
  })
  row.check(() => expect(control('close', alpha)).toBeNull())
  row.check(() => expect(control('retry-close', beta)).not.toBeNull())
  row.check(() => expect(closeCountFor(lane, alpha)).toBe(1))
  observeFocus(row, lane)
  observeAnnouncement(row, lane)
  observeAdmissions(row, lane)
}

const SCENARIOS: readonly {
  readonly id: Bl020ComponentScenarioId
  readonly run: (row: Row) => Promise<void>
}[] = Object.freeze([
  { id: 'S-32', run: runS32 },
  { id: 'S-33', run: runS33 },
  { id: 'S-34', run: runS34 },
  { id: 'S-35', run: runS35 },
  { id: 'S-36', run: runS36 },
  { id: 'S-37', run: runS37 },
  { id: 'S-65', run: runS65 },
  { id: 'S-66', run: runS66 },
  { id: 'S-72', run: runS72 },
  { id: 'S-73', run: runS73 },
])

function commitArtifact(serialized: string, runId: string): void {
  const directory = path.dirname(RESULT_PATH)
  mkdirSync(directory, { recursive: true })
  const staged = path.join(
    directory,
    'close-component-matrix.' + runId + '.staged'
  )
  writeFileSync(staged, serialized)
  renameSync(staged, RESULT_PATH)
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  captured.controller = undefined
})

/** The matrix the executed lane produced, shared with its contract controls. */
let committed: Bl020ComponentMatrix | undefined

function committedMatrix(): Bl020ComponentMatrix {
  if (committed === undefined) throw new Error('The lane produced no matrix')
  return committed
}

function violationsFor(matrix: Bl020ComponentMatrix): readonly string[] {
  return validateProjectCloseComponentMatrix({
    matrix,
    serialized: serializeProjectCloseComponentMatrix(matrix),
    protectedValues: PROTECTED_VALUES,
  })
}

describe('BL-020 Project Home component execution lane', () => {
  it(
    'executes every close scenario and commits the observed matrix',
    async () => {
      const runId = randomUUID()
      const rows: Bl020ComponentRow[] = []
      const failures: string[] = []

      for (const scenario of SCENARIOS) {
        const row = beginRow(scenario.id, runId)
        let outcome: 'passed' | 'failed' = 'failed'
        try {
          await scenario.run(row)
          outcome = 'passed'
        } catch (error) {
          failures.push(
            scenario.id +
              ': ' +
              (error instanceof Error ? error.message : String(error))
          )
        } finally {
          cleanup()
        }
        rows.push(finishRow(row, outcome))
      }

      const matrix: Bl020ComponentMatrix = {
        evidenceId: 'bl-020-close-component-matrix',
        generatedFrom: 'execution',
        stage: 't-7-t-8-component-lane',
        runId,
        scenarioCount: BL020_COMPONENT_SCENARIOS.length,
        rows,
        aggregate: {
          rows: rows.length,
          executionProduced: rows.filter(
            (produced) =>
              produced.productionPathsEntered.length > 0 &&
              produced.admissions.length > 0 &&
              produced.assertions > 0
          ).length,
          allPassed: rows.every(({ outcome: result }) => result === 'passed'),
        },
      }
      const serialized = serializeProjectCloseComponentMatrix(matrix)

      // The artifact is only committed once it passes its own contract.
      expect(
        validateProjectCloseComponentMatrix({
          matrix,
          serialized,
          protectedValues: PROTECTED_VALUES,
        })
      ).toEqual([])
      commitArtifact(serialized, runId)
      committed = matrix

      expect(failures).toEqual([])
      expect(matrix.aggregate).toEqual({
        rows: 10,
        executionProduced: 10,
        allPassed: true,
      })
      expect(matrix.rows.map((row) => row.scenario)).toEqual([
        ...BL020_COMPONENT_SCENARIOS,
      ])
      expect(new Set(matrix.rows.map((row) => row.executionId)).size).toBe(10)
    },
    MATRIX_TIMEOUT_MS
  )

  it('refuses a row the executed lane could not have produced', () => {
    const matrix = committedMatrix()
    const rendered = matrix.rows
      .flatMap((row) => row.admissions)
      .find(({ renderedPresent }) => renderedPresent)
    expect(rendered).toBeDefined()

    const mutate = (
      apply: (draft: Bl020ComponentMatrix) => Bl020ComponentMatrix
    ): readonly string[] => violationsFor(apply(structuredClone(matrix)))
    const withFirstRow = (
      draft: Bl020ComponentMatrix,
      replacement: Partial<Bl020ComponentRow>
    ): Bl020ComponentMatrix => ({
      ...draft,
      rows: [{ ...draft.rows[0]!, ...replacement }, ...draft.rows.slice(1)],
    })

    expect(
      mutate((draft) => withFirstRow(draft, { productionPathsEntered: [] }))
    ).toContain('execution-witness-missing')
    expect(
      mutate((draft) => withFirstRow(draft, { scenario: 'S-73' }))
    ).toContain('scenario-catalog-mismatch')
    expect(
      mutate((draft) => withFirstRow(draft, { executionId: 'forged' }))
    ).toContain('execution-identifier-invalid')
    expect(mutate((draft) => withFirstRow(draft, { assertions: 0 }))).toContain(
      'assertion-result-missing'
    )
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          admissions: draft.rows[0]!.admissions.map((admission) =>
            admission === undefined
              ? admission
              : { ...admission, card: 'card-99' }
          ),
        })
      )
    ).toContain('card-token-invalid')
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          admissions: draft.rows[0]!.admissions.map((admission) =>
            admission.renderedPresent
              ? {
                  ...admission,
                  renderedDisabled: admission.admitted,
                  equivalence: 'equal',
                }
              : admission
          ),
        })
      )
    ).toContain('admission-equivalence-invalid')
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          dialog: { ...draft.rows[0]!.dialog, maxConcurrent: 2 },
        })
      )
    ).toContain('dialog-observation-invalid')
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          announcements: draft.rows[0]!.announcements.map((announcement) => ({
            ...announcement,
            namePrefixed: false,
          })),
        })
      )
    ).toContain('announcement-attribution-missing')
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          focus: [{ target: 'close', card: null }],
        })
      )
    ).toContain('focus-observation-invalid')
    expect(
      mutate((draft) =>
        withFirstRow(draft, {
          calls: { ...draft.rows[0]!.calls, thenableTransportReturns: 0 },
        })
      )
    ).toContain('call-accounting-invalid')
    expect(
      mutate((draft) => ({
        ...draft,
        aggregate: { ...draft.aggregate, executionProduced: 9 },
      }))
    ).toContain('aggregate-mismatch')

    // Redaction: a raw host path, a display name, or an identity is refused
    // wherever it is written.
    for (const leaked of [alpha.canonicalPath, beta.name, gamma.name]) {
      expect(mutate((draft) => ({ ...draft, runId: leaked }))).toContain(
        'protected-value-present'
      )
    }
  })
})
