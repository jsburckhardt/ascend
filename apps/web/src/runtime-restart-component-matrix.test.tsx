import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import type { Project } from './projects'
import {
  RUNTIME_RESTART_ERROR_CATEGORIES,
  RUNTIME_RESTART_NOTICES,
  type RuntimeRestartTransport,
  type RuntimeRestartTransportResult,
} from './runtime-restart'
import type { RuntimeReport, RuntimeStateLoader } from './runtime-state'

const selected: Project = {
  id: 'selected',
  name: 'Selected project',
  canonicalPath: '/fixtures/selected',
  createdAt: 1,
}
const peer: Project = {
  id: 'peer',
  name: 'Peer project',
  canonicalPath: '/fixtures/peer',
  createdAt: 2,
}

const reportsFor = (selectedState: RuntimeReport): readonly RuntimeReport[] => [
  selectedState,
  { id: peer.id, state: 'Running' },
]

const runningReports = reportsFor({ id: selected.id, state: 'Running' })

/**
 * The first render of a coverage-instrumented file under parallel workers can
 * be starved past Testing Library's 1,000 ms default. Both bounds stay finite.
 */
const SETTLED_WAIT_MS = 5_000
const SCENARIO_TIMEOUT_MS = 15_000

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})
afterEach(() => cleanup())

async function renderReady(
  restart: RuntimeRestartTransport,
  runtime: RuntimeStateLoader = vi
    .fn<RuntimeStateLoader>()
    .mockResolvedValue(runningReports)
) {
  render(
    <App
      loadProjectList={async () => [selected, peer]}
      loadRuntimeStates={runtime}
      restartRuntime={restart}
    />
  )
  await screen.findByLabelText('Runtime state summary', undefined, {
    timeout: SETTLED_WAIT_MS,
  })
  return runtime
}

const selectedCard = (): HTMLElement =>
  screen
    .getByRole('button', { name: 'Restart Selected project workbench' })
    .closest('li')!

const restartControls = (): readonly HTMLElement[] =>
  screen.queryAllByRole('button', { name: /^Restart .* workbench$/u })

describe('BL-018 scenario 13: home-restart-eligibility', () => {
  it.each([
    ['Running', { id: selected.id, state: 'Running' } as RuntimeReport],
    [
      'Failed',
      {
        id: selected.id,
        state: 'Failed',
        failureCategory: 'early-exit-code',
      } as RuntimeReport,
    ],
  ])(
    'offers Restart for an authoritative %s row',
    async (_label, report) => {
      const restart = vi.fn<RuntimeRestartTransport>()
      await renderReady(
        restart,
        vi.fn<RuntimeStateLoader>().mockResolvedValue(reportsFor(report))
      )
      expect(
        screen.getByRole('button', {
          name: 'Restart Selected project workbench',
        })
      ).toBeEnabled()
      expect(restart).not.toHaveBeenCalled()
    },
    SCENARIO_TIMEOUT_MS
  )

  it.each([
    ['Stopped', { id: selected.id, state: 'Stopped' } as RuntimeReport],
    ['Starting', { id: selected.id, state: 'Starting' } as RuntimeReport],
  ])(
    'offers no Restart for an authoritative %s row',
    async (_label, report) => {
      await renderReady(
        vi.fn<RuntimeRestartTransport>(),
        vi.fn<RuntimeStateLoader>().mockResolvedValue(reportsFor(report))
      )
      expect(
        screen.queryByRole('button', {
          name: 'Restart Selected project workbench',
        })
      ).toBeNull()
      // The peer row is still Running, so the control is state-gated rather
      // than globally absent.
      expect(
        screen.getByRole('button', { name: 'Restart Peer project workbench' })
      ).toBeEnabled()
    },
    SCENARIO_TIMEOUT_MS
  )

  it(
    'offers no Restart while the projection is unavailable',
    async () => {
      render(
        <App
          loadProjectList={async () => [selected, peer]}
          loadRuntimeStates={vi
            .fn<RuntimeStateLoader>()
            .mockRejectedValue(new Error('projection unavailable'))}
          restartRuntime={vi.fn<RuntimeRestartTransport>()}
        />
      )
      await screen.findByText(selected.name, undefined, {
        timeout: SETTLED_WAIT_MS,
      })
      await waitFor(() => expect(restartControls()).toHaveLength(0), {
        timeout: SETTLED_WAIT_MS,
      })
    },
    SCENARIO_TIMEOUT_MS
  )
})

describe('BL-018 scenario 14: home-restart-accessibility-and-focus', () => {
  it(
    'accepts keyboard activation, marks the card busy, announces success, and restores focus',
    async () => {
      const request = deferred<RuntimeRestartTransportResult>()
      const restart = vi.fn<RuntimeRestartTransport>(() => request.promise)
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValue(runningReports)
      await renderReady(restart, runtime)
      const control = screen.getByRole('button', {
        name: 'Restart Selected project workbench',
      })
      control.focus()
      fireEvent.keyDown(control, { key: 'Enter' })
      fireEvent.click(control)
      expect(restart).toHaveBeenCalledOnce()
      expect(selectedCard()).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selected project: Restarting workbench.'
      )

      await act(async () =>
        request.resolve({
          kind: 'success',
          id: selected.id,
          outcome: 'restarted',
        })
      )
      await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2), {
        timeout: SETTLED_WAIT_MS,
      })
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selected project: Workbench restarted.'
      )
      await waitFor(
        () =>
          expect(
            screen.getByRole('button', {
              name: 'Restart Selected project workbench',
            })
          ).toHaveFocus(),
        { timeout: SETTLED_WAIT_MS }
      )
      // The delivered card drops the busy marker on settlement rather than
      // publishing an explicit `false`.
      expect(selectedCard()).not.toHaveAttribute('aria-busy')
    },
    SCENARIO_TIMEOUT_MS
  )

  it.each(RUNTIME_RESTART_ERROR_CATEGORIES)(
    'announces the client-owned %s rejection in an alert with Retry and discloses nothing protected',
    async (category) => {
      const restart = vi
        .fn<RuntimeRestartTransport>()
        .mockResolvedValue({ kind: 'failure', category })
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValue(runningReports)
      await renderReady(restart, runtime)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Restart Selected project workbench',
        })
      )
      const alert = await screen.findByRole('alert', undefined, {
        timeout: SETTLED_WAIT_MS,
      })
      expect(alert).toHaveTextContent(RUNTIME_RESTART_NOTICES[category])
      expect(
        within(alert).getByRole('button', { name: 'Retry restart' })
      ).toBeVisible()
      expect(runtime).toHaveBeenCalledOnce()
      expect(alert.textContent).not.toMatch(
        /\bpid\b|\bport\b|\/fixtures\/|127\.0\.0\.1/iu
      )
    },
    SCENARIO_TIMEOUT_MS
  )
})

describe('BL-018 scenario 15: home-duplicate-activation-prevented', () => {
  it(
    'issues exactly one transport request for repeated activation while pending',
    async () => {
      const request = deferred<RuntimeRestartTransportResult>()
      const restart = vi.fn<RuntimeRestartTransport>(() => request.promise)
      await renderReady(restart)
      const control = screen.getByRole('button', {
        name: 'Restart Selected project workbench',
      })
      fireEvent.click(control)
      fireEvent.click(control)
      fireEvent.click(control)
      fireEvent.keyDown(control, { key: 'Enter' })
      expect(restart).toHaveBeenCalledOnce()
      expect(restart).toHaveBeenCalledWith(selected.id, expect.any(AbortSignal))
      await act(async () =>
        request.resolve({
          kind: 'success',
          id: selected.id,
          outcome: 'restarted',
        })
      )
      expect(restart).toHaveBeenCalledOnce()
    },
    SCENARIO_TIMEOUT_MS
  )
})

describe('BL-018 scenario 16: home-peer-controls-available', () => {
  it(
    'admits a peer Restart while a Close dialog is open and refuses only the dialog project',
    async () => {
      const request = deferred<RuntimeRestartTransportResult>()
      const restart = vi.fn<RuntimeRestartTransport>(() => request.promise)
      await renderReady(restart)
      const selectedRestart = screen.getByRole('button', {
        name: 'Restart Selected project workbench',
      })
      const peerRestart = screen.getByRole('button', {
        name: 'Restart Peer project workbench',
      })

      fireEvent.click(
        screen.getByRole('button', {
          name: `Close ${peer.name}`,
        })
      )
      expect(
        screen.getByRole('dialog', { name: `Close ${peer.name}?` })
      ).toBeVisible()

      // Same-project exclusion is preserved: the project whose close is being
      // confirmed refuses its own Restart, in appearance and in admission.
      expect(peerRestart).toBeDisabled()
      fireEvent.click(peerRestart)
      expect(restart).not.toHaveBeenCalled()

      // AC-7: every peer control stays admitted while a close is in flight.
      expect(selectedRestart).toBeEnabled()
      fireEvent.click(selectedRestart)
      expect(restart).toHaveBeenCalledOnce()
      expect(restart).toHaveBeenCalledWith(selected.id, expect.any(AbortSignal))
      expect(selectedCard()).toHaveAttribute('aria-busy', 'true')
      expect(
        screen.getByRole('dialog', { name: `Close ${peer.name}?` })
      ).toBeVisible()

      await act(async () =>
        request.resolve({
          kind: 'success',
          id: selected.id,
          outcome: 'restarted',
        })
      )
    },
    SCENARIO_TIMEOUT_MS
  )

  it(
    'keeps every peer control enabled and functional during a pending restart',
    async () => {
      const request = deferred<RuntimeRestartTransportResult>()
      const restart = vi.fn<RuntimeRestartTransport>(() => request.promise)
      await renderReady(restart)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Restart Selected project workbench',
        })
      )
      const peerRestart = screen.getByRole('button', {
        name: 'Restart Peer project workbench',
      })
      const peerOpen = screen.getByRole('button', {
        name: `Open ${peer.name}`,
      })
      const peerClose = screen.getByRole('button', {
        name: `Close ${peer.name}`,
      })
      for (const control of [peerRestart, peerOpen, peerClose])
        expect(control).toBeEnabled()

      // A peer control still performs its own work while P is pending.
      fireEvent.click(peerRestart)
      expect(restart).toHaveBeenCalledTimes(2)
      expect(restart).toHaveBeenLastCalledWith(peer.id, expect.any(AbortSignal))
      await act(async () =>
        request.resolve({
          kind: 'success',
          id: selected.id,
          outcome: 'restarted',
        })
      )
    },
    SCENARIO_TIMEOUT_MS
  )
})

describe('BL-018 scenario 42: home-unknown-outcome', () => {
  it(
    'keeps an unclassifiable result explicitly unknown with no automatic retry or replacement',
    async () => {
      const restart = vi
        .fn<RuntimeRestartTransport>()
        .mockResolvedValue({ kind: 'unknown' })
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValue(runningReports)
      await renderReady(restart, runtime)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Restart Selected project workbench',
        })
      )
      const refresh = await screen.findByRole(
        'button',
        { name: 'Refresh runtime state' },
        { timeout: SETTLED_WAIT_MS }
      )
      expect(selectedCard()).toHaveTextContent(
        'Restart outcome unknown. Refresh the runtime state.'
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Restart outcome unknown'
      )
      // Zero automatic retries and zero second replacements.
      expect(restart).toHaveBeenCalledOnce()
      expect(runtime).toHaveBeenCalledOnce()

      fireEvent.click(refresh)
      await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2), {
        timeout: SETTLED_WAIT_MS,
      })
      // The manual request is read-only: it never re-issues a restart.
      expect(restart).toHaveBeenCalledOnce()
    },
    SCENARIO_TIMEOUT_MS
  )
})
