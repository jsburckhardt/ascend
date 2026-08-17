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
import type {
  CloseTransport,
  CloseTransportResult,
  Project,
  ProjectLoader,
} from './projects'
import type { RuntimeReport, RuntimeStateLoader } from './runtime-state'

const alpha: Project = {
  id: ' id <script> ',
  name: 'Alpha <script>',
  canonicalPath: ' /alpha <script> ',
  createdAt: 1,
}
const beta: Project = {
  id: 'beta',
  name: 'Beta',
  canonicalPath: '/beta',
  createdAt: 2,
}
const gamma: Project = {
  id: 'gamma',
  name: 'Gamma',
  canonicalPath: '/gamma',
  createdAt: 3,
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})
afterEach(() => cleanup())

async function ready(
  close: CloseTransport,
  initial: Project[] = [alpha, beta, gamma],
  later: Array<Promise<Project[]>> = []
) {
  let calls = 0
  const load = vi.fn<ProjectLoader>(() => {
    calls += 1
    return calls === 1
      ? Promise.resolve(initial)
      : (later.shift() ?? Promise.resolve(initial))
  })
  const view = render(<App loadProjectList={load} closeProject={close} />)
  await screen.findByRole('button', { name: 'Close ' + initial[0]!.name })
  return { load, view }
}

async function open(name: string): Promise<HTMLElement> {
  const action = screen.getByRole('button', { name: 'Close ' + name })
  action.focus()
  await userEvent.setup().keyboard('{Enter}')
  return action
}

/** Confirms the open dialog and returns once the request has been transmitted. */
async function confirm(): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm' }))
}

const lane = (projectId: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    '[data-close-lane-project-id="' + CSS.escape(projectId) + '"]'
  )

const laneStatus = (name: string): HTMLElement =>
  screen.getByRole('status', { name: 'Close status for ' + name })

const card = (projectId: string): HTMLElement =>
  document
    .querySelector<HTMLElement>(
      '[data-close-project-id="' + CSS.escape(projectId) + '"]'
    )!
    .closest('li')!

describe('accessible Close project interaction', () => {
  it('renders one semantic Close action per card and exact inert dialog text', async () => {
    const { container } = render(
      <App loadProjectList={async () => [alpha, beta]} closeProject={vi.fn()} />
    )
    const close = await screen.findAllByRole('button', { name: /^Close /u })
    expect(close).toHaveLength(2)
    await userEvent.setup().click(close[0]!)
    const dialog = screen.getByRole('dialog', {
      name: 'Close ' + alpha.name + '?',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText(CLOSE_DIALOG_BODY)).toBeVisible()
    expect(dialog.textContent).toContain(alpha.name)
    expect(container.querySelector('script')).toBeNull()
  })

  it('wraps Tab and Shift+Tab and Escape restores the activating Close action', async () => {
    const close = vi.fn<CloseTransport>()
    await ready(close)
    const action = await open(beta.name)
    const dialog = screen.getByRole('dialog', { name: 'Close Beta?' })
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    const confirmControl = within(dialog).getByRole('button', {
      name: 'Confirm',
    })
    await waitFor(() => expect(cancel).toHaveFocus())
    await userEvent.setup().keyboard('{Shift>}{Tab}{/Shift}')
    expect(confirmControl).toHaveFocus()
    await userEvent.setup().keyboard('{Tab}')
    expect(cancel).toHaveFocus()
    await userEvent.setup().keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(action).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
  })

  it('Cancel restores focus with zero requests and announces the cancel', async () => {
    const close = vi.fn<CloseTransport>()
    await ready(close)
    const action = await open(alpha.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Cancel' }))
    expect(action).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('status', { name: '' })).toBeDefined()
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(alpha.name + ': Close cancelled.')
  })

  it('opens at most one dialog and refuses a peer dialog while one is open', async () => {
    const close = vi.fn<CloseTransport>()
    await ready(close)
    await open(beta.name)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Close Gamma' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      screen.getByRole('dialog', { name: 'Close Beta?' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Gamma' })).toBeDisabled()
  })

  it('dismisses the dialog at transmission and moves the close into the card lane', async () => {
    const request = deferred<CloseTransportResult>()
    let transmitted: (() => void) | undefined
    const close = vi.fn<CloseTransport>((_id, _signal, callback) => {
      transmitted = callback
      return request.promise
    })
    await ready(close)
    await open(beta.name)
    const confirmControl = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmControl).toHaveAttribute('data-variant', 'destructive')
    fireEvent.click(confirmControl)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(close).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()

    act(() => transmitted?.())

    // The dialog's whole life ends at transmission.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cancel' })
    ).not.toBeInTheDocument()

    // The per-card lane owns the pending state and aria-busy.
    const betaLane = lane(beta.id)
    expect(betaLane).not.toBeNull()
    const status = laneStatus(beta.name)
    expect(betaLane!.contains(status)).toBe(true)
    expect(status).toHaveAttribute('data-close-phase', 'pending')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Close request sent')
    expect(status).toHaveFocus()
    expect(card(beta.id)).toHaveAttribute('aria-busy', 'true')
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(beta.name + ': Close request sent.')

    // Peer controls stay enabled and usable while the close is pending.
    for (const name of ['Close ' + alpha.name, 'Close Gamma', 'Open Gamma']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeDisabled()
    expect(lane(alpha.id)).toBeNull()
    expect(card(gamma.id)).not.toHaveAttribute('aria-busy')

    await act(async () =>
      request.resolve({ kind: 'success', id: beta.id, disposition: 'closed' })
    )
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Gamma' })).toHaveFocus()
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(beta.name + ': Project closed.')
  })

  it('uses previous Close focus and then heading plus existing empty state', async () => {
    const close = vi.fn<CloseTransport>(async (id) => ({
      kind: 'success',
      id,
      disposition: 'closed',
    }))
    await ready(close, [alpha, beta])
    await open(beta.name)
    await confirm()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Close ' + alpha.name })
      ).toHaveFocus()
    )
    await open(alpha.name)
    await confirm()
    const heading = await screen.findByRole('heading', { name: 'Ascend' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      screen.getByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(alpha.name + ': Project closed.')
  })

  it.each([
    ['invalid_project_id', 'The project ID is invalid. Retry this project.'],
    [
      'project_close_failed',
      'The project could not be closed. Retry this project.',
    ],
    [
      'runtime_start_in_progress',
      'The workbench is still starting. Retry after startup settles.',
    ],
    [
      'runtime_stop_in_progress',
      'The workbench is stopping. Retry after stop settles.',
    ],
    [
      'runtime_restart_in_progress',
      'The workbench is restarting. Retry after restart settles.',
    ],
    [
      'runtime_reconcile_in_progress',
      'Ascend is still recovering this workbench. Retry after recovery settles.',
    ],
    [
      'runtime_reconcile_unresolved',
      'Ascend could not confirm this workbench after a restart.',
    ],
    [
      'runtime_release_unconfirmed',
      'Ascend could not confirm the workbench release. Retry this project.',
    ],
    [
      'runtime_close_ownership_unresolved',
      'Ascend could not resolve this workbench ownership. Retry this project.',
    ],
    [
      'runtime_manager_shutdown',
      'Runtime management is shutting down. Retry later.',
    ],
  ] as const)(
    'renders the definitive %s branch in the card lane with a Retry close control',
    async (category, message) => {
      const close = vi.fn<CloseTransport>().mockResolvedValue({
        kind: 'failure',
        category,
      })
      await ready(close, [alpha, beta])
      await open(beta.name)
      await confirm()
      await waitFor(() => expect(lane(beta.id)).not.toBeNull())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const status = laneStatus(beta.name)
      expect(status).toHaveAttribute('data-close-phase', 'retry')
      expect(status).toHaveTextContent(message)
      const retry = screen.getByRole('button', {
        name: 'Retry close ' + beta.name,
      })
      expect(lane(beta.id)!.contains(retry)).toBe(true)
      expect(retry).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
      expect(
        screen.queryByRole('button', {
          name: 'Refresh close result for ' + beta.name,
        })
      ).not.toBeInTheDocument()
      expect(
        document.querySelector('#workbench-opening-status')
      ).toHaveTextContent(beta.name + ': ' + message)
      expect(lane(beta.id)!.textContent).not.toContain(
        'SECRET SQL /private stack'
      )
    }
  )

  it('routes project_not_found to the card unknown phase with a Refresh close control', async () => {
    const close = vi.fn<CloseTransport>().mockResolvedValue({
      kind: 'failure',
      category: 'project_not_found',
    })
    await ready(close, [alpha, beta])
    await open(beta.name)
    await confirm()
    await waitFor(() => expect(lane(beta.id)).not.toBeNull())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(laneStatus(beta.name)).toHaveAttribute('data-close-phase', 'unknown')
    const refresh = screen.getByRole('button', {
      name: 'Refresh close result for ' + beta.name,
    })
    expect(refresh).toHaveFocus()
    expect(
      screen.queryByRole('button', { name: 'Retry close ' + beta.name })
    ).not.toBeInTheDocument()
  })

  it('renders a definitive pre-transmission failure with same-ID Retry close', async () => {
    const close = vi.fn<CloseTransport>().mockResolvedValue({
      kind: 'not_transmitted',
    })
    await ready(close, [alpha])
    await open(alpha.name)
    await confirm()
    await waitFor(() => expect(lane(alpha.id)).not.toBeNull())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Retry close ' + alpha.name })
    ).toBeVisible()
    expect(laneStatus(alpha.name)).toHaveTextContent(
      'No close request was sent. Retry this project.'
    )
    expect(
      screen.getByRole('button', { name: 'Close ' + alpha.name })
    ).toBeVisible()
  })

  it('keeps the card and offers same-ID Retry close for a definitive safe failure', async () => {
    const close = vi
      .fn<CloseTransport>()
      .mockResolvedValueOnce({
        kind: 'failure',
        category: 'project_close_failed',
      })
      .mockResolvedValueOnce({
        kind: 'success',
        id: beta.id,
        disposition: 'closed',
      })
    await ready(close)
    await open(beta.name)
    await confirm()
    const retry = await screen.findByRole('button', {
      name: 'Retry close ' + beta.name,
    })
    expect(laneStatus(beta.name)).toHaveTextContent('could not be closed')
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
    expect(
      screen.queryByRole('button', {
        name: 'Refresh close result for ' + beta.name,
      })
    ).not.toBeInTheDocument()
    await userEvent.setup().click(retry)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Close Beta' })
      ).not.toBeInTheDocument()
    )
    expect(close.mock.calls.map(([id]) => id)).toEqual([beta.id, beta.id])
  })

  it('locks unknown outcome in the card lane until authoritative presence or absence', async () => {
    const present = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    const { load } = await ready(close, [alpha, beta], [present.promise])
    await open(beta.name)
    await confirm()
    const refresh = await screen.findByRole('button', {
      name: 'Refresh close result for ' + beta.name,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(laneStatus(beta.name)).toHaveAttribute('data-close-phase', 'unknown')
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Retry close ' + beta.name })
    ).not.toBeInTheDocument()
    await userEvent.setup().click(refresh)
    await act(async () => present.resolve([alpha, beta]))
    expect(
      await screen.findByRole('button', { name: 'Retry close ' + beta.name })
    ).toBeVisible()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('applies reconciled absence as success without guessing', async () => {
    const absent = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    await ready(close, [alpha, beta], [absent.promise])
    await open(alpha.name)
    await confirm()
    await userEvent.setup().click(
      await screen.findByRole('button', {
        name: 'Refresh close result for ' + alpha.name,
      })
    )
    await act(async () => absent.resolve([beta]))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Close ' + alpha.name })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Beta' })).toHaveFocus()
  })

  it.each(['failed', 'invalid'] as const)(
    'keeps unknown recovery locked after a %s authoritative refresh',
    async (kind) => {
      const refresh = deferred<Project[]>()
      const close = vi
        .fn<CloseTransport>()
        .mockResolvedValue({ kind: 'unknown' })
      await ready(close, [alpha, beta], [refresh.promise])
      await open(beta.name)
      await confirm()
      await userEvent.setup().click(
        await screen.findByRole('button', {
          name: 'Refresh close result for ' + beta.name,
        })
      )
      await act(async () => {
        if (kind === 'failed')
          refresh.reject(new Error('private list sentinel'))
        else refresh.resolve([alpha, alpha])
      })
      expect(
        await screen.findByRole('button', {
          name: 'Refresh close result for ' + beta.name,
        })
      ).toBeVisible()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(laneStatus(beta.name)).toHaveTextContent('still unknown')
      expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
      expect(lane(beta.id)!.textContent).not.toContain('private list sentinel')
    }
  )

  it('settles two concurrent peer closes independently', async () => {
    const betaRequest = deferred<CloseTransportResult>()
    const gammaRequest = deferred<CloseTransportResult>()
    const transmit = new Map<string, () => void>()
    const signals = new Map<string, AbortSignal>()
    const close = vi.fn<CloseTransport>((id, signal, callback) => {
      signals.set(id, signal)
      if (callback !== undefined) transmit.set(id, callback)
      return id === beta.id ? betaRequest.promise : gammaRequest.promise
    })
    await ready(close)

    await open(beta.name)
    await confirm()
    act(() => transmit.get(beta.id)?.())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // The peer's own dialog is reachable while the first close is pending.
    await open(gamma.name)
    await confirm()
    act(() => transmit.get(gamma.id)?.())
    expect(close).toHaveBeenCalledTimes(2)
    expect(close.mock.calls.map(([id]) => id)).toEqual([beta.id, gamma.id])
    expect(signals.get(beta.id)).not.toBe(signals.get(gamma.id))
    expect(lane(beta.id)).not.toBeNull()
    expect(lane(gamma.id)).not.toBeNull()

    await act(async () =>
      gammaRequest.resolve({
        kind: 'failure',
        category: 'project_close_failed',
      })
    )
    // Only gamma's record changed.
    expect(laneStatus(gamma.name)).toHaveAttribute('data-close-phase', 'retry')
    expect(laneStatus(beta.name)).toHaveAttribute('data-close-phase', 'pending')
    expect(
      screen.getByRole('button', { name: 'Retry close ' + gamma.name })
    ).toHaveFocus()
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(
      gamma.name + ': The project could not be closed. Retry this project.'
    )

    await act(async () =>
      betaRequest.resolve({
        kind: 'success',
        id: beta.id,
        disposition: 'closed',
      })
    )
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()
    expect(laneStatus(gamma.name)).toHaveAttribute('data-close-phase', 'retry')
    expect(
      document.querySelector('#workbench-opening-status')
    ).toHaveTextContent(beta.name + ': Project closed.')
  })

  it('refuses a same-project duplicate at the owner and transmitted layers', async () => {
    const request = deferred<CloseTransportResult>()
    let transmitted: (() => void) | undefined
    const close = vi.fn<CloseTransport>((_id, _signal, callback) => {
      transmitted = callback
      return request.promise
    })
    await ready(close)
    await open(beta.name)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    // Owner layer: a second confirm for the same project sends nothing.
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(close).toHaveBeenCalledOnce()
    act(() => transmitted?.())
    // Transmitted layer: a repeated callback cannot re-announce or re-send.
    act(() => transmitted?.())
    expect(close).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeDisabled()
    await act(async () =>
      request.resolve({ kind: 'success', id: beta.id, disposition: 'closed' })
    )
    expect(close).toHaveBeenCalledOnce()
  })

  it('discards a superseded list response, re-issues once, and never resurrects a closed card', async () => {
    const stale = deferred<Project[]>()
    const replacement = deferred<Project[]>()
    const betaRequest = deferred<CloseTransportResult>()
    const transmit = new Map<string, () => void>()
    const close = vi.fn<CloseTransport>(async (id, _signal, callback) => {
      if (callback !== undefined) transmit.set(id, callback)
      if (id === gamma.id) return { kind: 'unknown' }
      return betaRequest.promise
    })
    let calls = 0
    const load = vi.fn<ProjectLoader>(() => {
      calls += 1
      if (calls === 1) return Promise.resolve([alpha, beta, gamma])
      if (calls === 2) return stale.promise
      return replacement.promise
    })
    render(<App loadProjectList={load} closeProject={close} />)
    await screen.findByRole('button', { name: 'Close ' + alpha.name })

    // Gamma settles unknown, which gives its card a list-bearing recovery
    // control in the single global owner lane.
    await open(gamma.name)
    await confirm()
    const refreshGamma = await screen.findByRole('button', {
      name: 'Refresh close result for ' + gamma.name,
    })

    await open(beta.name)
    await confirm()
    act(() => transmit.get(beta.id)?.())

    // A list-bearing action is admitted while a peer close is pending.
    fireEvent.click(refreshGamma)
    expect(load).toHaveBeenCalledTimes(2)

    await act(async () =>
      betaRequest.resolve({
        kind: 'success',
        id: beta.id,
        disposition: 'closed',
      })
    )
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()

    // The response issued before the settlement is discarded, not applied.
    await act(async () => stale.resolve([alpha, beta, gamma]))
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()
    // Exactly one replacement request of the same kind is issued.
    await waitFor(() => expect(load).toHaveBeenCalledTimes(3))

    // Even a hand-injected list still naming the closed project cannot re-add it.
    await act(async () => replacement.resolve([alpha, beta, gamma]))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Retry close ' + gamma.name })
      ).toBeInTheDocument()
    )
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Gamma' })).toBeVisible()
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('issues exactly one runtime-state request per settled successful close', async () => {
    let registered: Project[] = [alpha, beta, gamma]
    const runtime = vi.fn<RuntimeStateLoader>(
      async (): Promise<readonly RuntimeReport[]> =>
        registered.map(({ id }) => ({ id, state: 'Stopped' }))
    )
    let gammaFails = true
    const close = vi.fn<CloseTransport>(async (id) => {
      if (id === gamma.id && gammaFails) {
        gammaFails = false
        return { kind: 'failure', category: 'project_close_failed' }
      }
      registered = registered.filter((project) => project.id !== id)
      return { kind: 'success', id, disposition: 'closed' }
    })
    render(
      <App
        closeProject={close}
        loadProjectList={async () => registered}
        loadRuntimeStates={runtime}
      />
    )
    await screen.findByLabelText('Runtime state summary', undefined, {
      timeout: 5_000,
    })
    const beforeClose = runtime.mock.calls.length

    await open(beta.name)
    await confirm()
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Close Beta' })
      ).not.toBeInTheDocument()
    )
    await screen.findByLabelText('Runtime state summary', undefined, {
      timeout: 5_000,
    })
    expect(runtime.mock.calls.length).toBe(beforeClose + 1)

    // A rejected close settles no version and issues no runtime-state request.
    await open(gamma.name)
    await confirm()
    const retry = await screen.findByRole('button', {
      name: 'Retry close ' + gamma.name,
    })
    expect(runtime.mock.calls.length).toBe(beforeClose + 1)

    await userEvent.setup().click(retry)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Close Gamma' })
      ).not.toBeInTheDocument()
    )
    await screen.findByLabelText('Runtime state summary', undefined, {
      timeout: 5_000,
    })
    expect(runtime.mock.calls.length).toBe(beforeClose + 2)
  }, 15_000)

  it('renders one-character and bounded long project names and paths as inert text', async () => {
    const fixtureLength = 4_096
    const one: Project = {
      id: 'i',
      name: 'n',
      canonicalPath: 'p',
      createdAt: 1,
    }
    const bounded: Project = {
      id: 'i'.repeat(fixtureLength),
      name: '<script>'.repeat(fixtureLength / 8),
      canonicalPath: '&>'.repeat(fixtureLength / 2),
      createdAt: 2,
    }
    const { view } = await ready(vi.fn<CloseTransport>(), [one, bounded])
    expect(screen.getByRole('heading', { name: 'n' })).toBeVisible()
    expect(screen.getByText('p')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: bounded.name }).textContent
    ).toBe(bounded.name)
    expect(screen.getByText(bounded.canonicalPath).textContent).toBe(
      bounded.canonicalPath
    )
    await open(one.name)
    expect(screen.getByRole('dialog', { name: 'Close n?' })).toHaveTextContent(
      CLOSE_DIALOG_BODY
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Cancel' }))
    await open(bounded.name)
    expect(
      screen.getByRole('dialog', { name: 'Close ' + bounded.name + '?' })
        .textContent
    ).toContain(bounded.name)
    expect(view.container.querySelector('script')).toBeNull()
  })

  it('aborts on unmount and suppresses a late close result', async () => {
    const request = deferred<CloseTransportResult>()
    let signal: AbortSignal | undefined
    const close = vi.fn<CloseTransport>((_id, owned) => {
      signal = owned
      return request.promise
    })
    const { view } = await ready(close, [alpha])
    await open(alpha.name)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () =>
      request.resolve({ kind: 'success', id: alpha.id, disposition: 'closed' })
    )
    expect(view.container).toBeEmptyDOMElement()
  })
})
