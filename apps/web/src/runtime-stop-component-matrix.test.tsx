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
import type { RuntimeReport, RuntimeStateLoader } from './runtime-state'
import {
  RUNTIME_STOP_ERROR_CATEGORIES,
  RUNTIME_STOP_NOTICES,
  type RuntimeStopTransport,
  type RuntimeStopTransportResult,
} from './runtime-stop'

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
const runningReports: readonly RuntimeReport[] = [
  { id: selected.id, state: 'Running' },
  { id: peer.id, state: 'Running' },
]
const stoppedReports: readonly RuntimeReport[] = [
  { id: selected.id, state: 'Stopped' },
  { id: peer.id, state: 'Running' },
]

/**
 * The first render of a coverage-instrumented file under parallel workers can
 * be starved past Testing Library's 1,000 ms default while the projection
 * settles. Both bounds stay finite: each wait fails inside SETTLED_WAIT_MS and
 * every scenario still fails inside SCENARIO_TIMEOUT_MS.
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
  stop: RuntimeStopTransport,
  runtime: RuntimeStateLoader = vi
    .fn<RuntimeStateLoader>()
    .mockResolvedValue(runningReports)
) {
  const view = render(
    <App
      loadProjectList={async () => [selected, peer]}
      loadRuntimeStates={runtime}
      stopRuntime={stop}
    />
  )
  await screen.findByLabelText('Runtime state summary', undefined, {
    timeout: SETTLED_WAIT_MS,
  })
  return view
}

function selectedCard(): HTMLElement {
  return screen
    .getByRole('button', { name: 'Stop Selected project workbench' })
    .closest('li')!
}

describe('Project Home selected Stop interaction', () => {
  it(
    'serializes, announces, restores focus, and refreshes projection once',
    async () => {
      const request = deferred<RuntimeStopTransportResult>()
      const stop = vi.fn<RuntimeStopTransport>(() => request.promise)
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValueOnce(runningReports)
        .mockResolvedValueOnce(stoppedReports)
      await renderReady(stop, runtime)
      const selectedStop = screen.getByRole('button', {
        name: 'Stop Selected project workbench',
      })
      expect(selectedStop).toHaveAccessibleDescription(
        'Stopping releases the workbench and keeps the project registered.'
      )
      fireEvent.click(selectedStop)
      fireEvent.click(selectedStop)
      expect(stop).toHaveBeenCalledOnce()
      expect(stop).toHaveBeenCalledWith(selected.id, expect.any(AbortSignal))
      expect(selectedCard()).toHaveAttribute('aria-busy', 'true')
      for (const control of screen.getAllByRole('button', {
        name: /^Stop .* workbench$/u,
      })) {
        expect(control).toBeDisabled()
      }
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selected project: Stopping workbench.'
      )
      // BL-020: a pending stop for the selected project refuses only its own
      // Close; a peer's Close is admitted and opens its own dialog.
      expect(
        screen.getByRole('button', { name: 'Close Selected project' })
      ).toBeDisabled()
      fireEvent.click(
        screen.getByRole('button', { name: 'Close Selected project' })
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const peerClose = screen.getByRole('button', {
        name: 'Close Peer project',
      })
      expect(peerClose).toBeEnabled()
      fireEvent.click(peerClose)
      expect(
        screen.getByRole('dialog', { name: 'Close Peer project?' })
      ).toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await act(async () =>
        request.resolve({
          kind: 'success',
          id: selected.id,
          outcome: 'stopped',
        })
      )
      await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2), {
        timeout: SETTLED_WAIT_MS,
      })
      await waitFor(
        () =>
          expect(
            selectedCard().querySelector('[data-runtime-state="Stopped"]')
          ).not.toBeNull(),
        { timeout: SETTLED_WAIT_MS }
      )
      expect(selectedStop).toHaveFocus()
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selected project: Workbench stopped. The project remains registered.'
      )
      expect(selectedCard()).toHaveTextContent(selected.name)
      expect(selectedCard()).toHaveTextContent(selected.canonicalPath)
      expect(
        screen
          .getByRole('button', { name: 'Stop Peer project workbench' })
          .closest('li')
          ?.querySelector('[data-runtime-state="Running"]')
      ).not.toBeNull()
    },
    SCENARIO_TIMEOUT_MS
  )

  it(
    'announces already-stopped and performs one projection refresh',
    async () => {
      const stop = vi.fn<RuntimeStopTransport>().mockResolvedValue({
        kind: 'success',
        id: selected.id,
        outcome: 'already-stopped',
      })
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValueOnce(runningReports)
        .mockResolvedValueOnce(stoppedReports)
      await renderReady(stop, runtime)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Stop Selected project workbench',
        })
      )
      await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2), {
        timeout: SETTLED_WAIT_MS,
      })
      expect(screen.getByRole('status')).toHaveTextContent(
        'Selected project: Workbench was already stopped.'
      )
    },
    SCENARIO_TIMEOUT_MS
  )

  it.each(RUNTIME_STOP_ERROR_CATEGORIES)(
    'renders only the client-owned %s rejection and does not refresh',
    async (category) => {
      const stop = vi
        .fn<RuntimeStopTransport>()
        .mockResolvedValue({ kind: 'failure', category })
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValue(runningReports)
      await renderReady(stop, runtime)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Stop Selected project workbench',
        })
      )
      const alert = await screen.findByRole('alert', undefined, {
        timeout: SETTLED_WAIT_MS,
      })
      expect(alert).toHaveTextContent(RUNTIME_STOP_NOTICES[category])
      expect(
        within(alert).getByRole('button', { name: 'Retry stop' })
      ).toBeVisible()
      expect(runtime).toHaveBeenCalledOnce()
      expect(selectedCard()).toHaveTextContent(selected.name)
      expect(selectedCard()).toHaveTextContent(selected.canonicalPath)
      expect(alert.textContent).not.toContain(
        'SECRET /private port 45678 PID 100'
      )
    },
    SCENARIO_TIMEOUT_MS
  )

  it(
    'keeps indeterminate outcome explicit and refreshes only on request',
    async () => {
      const stop = vi
        .fn<RuntimeStopTransport>()
        .mockResolvedValue({ kind: 'unknown' })
      const runtime = vi
        .fn<RuntimeStateLoader>()
        .mockResolvedValue(runningReports)
      await renderReady(stop, runtime)
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Stop Selected project workbench',
        })
      )
      const refresh = await screen.findByRole(
        'button',
        { name: 'Refresh runtime state' },
        { timeout: SETTLED_WAIT_MS }
      )
      expect(selectedCard()).toHaveTextContent(
        'Stop outcome unknown. Refresh the runtime state.'
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Stop outcome unknown'
      )
      expect(runtime).toHaveBeenCalledOnce()
      fireEvent.click(refresh)
      await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2), {
        timeout: SETTLED_WAIT_MS,
      })
      expect(
        selectedCard().querySelector('[data-runtime-state="Running"]')
      ).not.toBeNull()
    },
    SCENARIO_TIMEOUT_MS
  )
})
