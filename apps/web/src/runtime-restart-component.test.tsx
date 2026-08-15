import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { Project } from './projects'
import type {
  RuntimeRestartTransport,
  RuntimeRestartTransportResult,
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
const reports: readonly RuntimeReport[] = [
  { id: selected.id, state: 'Running' },
  { id: peer.id, state: 'Failed', failureCategory: 'early-exit-code' },
]

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
    .mockResolvedValue(reports)
) {
  render(
    <App
      loadProjectList={async () => [selected, peer]}
      loadRuntimeStates={runtime}
      restartRuntime={restart}
    />
  )
  await screen.findByLabelText('Runtime state summary')
  return runtime
}

describe('Project Home Restart interaction', () => {
  it('keeps activation per project and refreshes once after success', async () => {
    const request = deferred<RuntimeRestartTransportResult>()
    const restart = vi.fn<RuntimeRestartTransport>(() => request.promise)
    const runtime = vi
      .fn<RuntimeStateLoader>()
      .mockResolvedValueOnce(reports)
      .mockResolvedValueOnce(reports)
    await renderReady(restart, runtime)
    const selectedRestart = screen.getByRole('button', {
      name: 'Restart Selected project workbench',
    })
    expect(selectedRestart).toHaveAccessibleDescription(
      'Restarting replaces the current workbench session and keeps the project registered.'
    )

    fireEvent.click(selectedRestart)
    fireEvent.click(selectedRestart)
    expect(restart).toHaveBeenCalledOnce()
    expect(restart).toHaveBeenCalledWith(selected.id, expect.any(AbortSignal))
    expect(selectedRestart.closest('li')).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.getByRole('button', {
        name: 'Open Selected project',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Stop Selected project workbench',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Close Selected project',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Restart Peer project workbench',
      })
    ).toBeEnabled()
    expect(
      screen.getByRole('button', {
        name: 'Close Peer project',
      })
    ).toBeEnabled()
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
    await waitFor(() => expect(runtime).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Restart Selected project workbench',
        })
      ).toHaveFocus()
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected project: Workbench restarted.'
    )
  })

  it('renders retry and explicit unknown recovery without automatic refresh', async () => {
    const restart = vi
      .fn<RuntimeRestartTransport>()
      .mockResolvedValueOnce({
        kind: 'failure',
        category: 'runtime_replacement_failed',
      })
      .mockResolvedValueOnce({ kind: 'unknown' })
    const runtime = await renderReady(restart)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Restart Selected project workbench',
      })
    )
    expect(
      await screen.findByRole('button', { name: 'Retry restart' })
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ascend could not start a replacement workbench.'
    )
    expect(runtime).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Retry restart' }))
    expect(
      await screen.findByRole('button', { name: 'Refresh runtime state' })
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Restart outcome unknown'
    )
    expect(runtime).toHaveBeenCalledOnce()
  })
})
