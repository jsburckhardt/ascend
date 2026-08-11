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
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
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
    const confirm = within(dialog).getByRole('button', { name: 'Confirm' })
    await waitFor(() => expect(cancel).toHaveFocus())
    await userEvent.setup().keyboard('{Shift>}{Tab}{/Shift}')
    expect(confirm).toHaveFocus()
    await userEvent.setup().keyboard('{Tab}')
    expect(cancel).toHaveFocus()
    await userEvent.setup().keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(action).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
  })

  it('Cancel restores focus with zero requests', async () => {
    const close = vi.fn<CloseTransport>()
    await ready(close)
    const action = await open(alpha.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Cancel' }))
    expect(action).toHaveFocus()
    expect(close).not.toHaveBeenCalled()
  })

  it('requires destructive Confirm, prevents repeat, and removes Cancel after transmission', async () => {
    const request = deferred<CloseTransportResult>()
    let transmitted: (() => void) | undefined
    const close = vi.fn<CloseTransport>((_id, _signal, callback) => {
      transmitted = callback
      return request.promise
    })
    await ready(close)
    await open(beta.name)
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    expect(confirm).toHaveAttribute('data-variant', 'destructive')
    fireEvent.click(confirm)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(close).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    act(() => transmitted?.())
    expect(
      screen.queryByRole('button', { name: 'Cancel' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Closing project')
    await act(async () =>
      request.resolve({ kind: 'success', id: beta.id, disposition: 'closed' })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Close Beta' })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Gamma' })).toHaveFocus()
  })

  it('uses previous Close focus and then heading plus existing empty state', async () => {
    const close = vi.fn<CloseTransport>(async (id) => ({
      kind: 'success',
      id,
      disposition: 'closed',
    }))
    await ready(close, [alpha, beta])
    await open(beta.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Close ' + alpha.name })
      ).toHaveFocus()
    )
    await open(alpha.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm' }))
    const heading = await screen.findByRole('heading', { name: 'Ascend' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(
      screen.getByRole('heading', { name: 'No registered projects' })
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Project closed')
  })

  it('keeps the card and offers same-ID Retry for definitive safe failure', async () => {
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
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm' }))
    const retry = await screen.findByRole('button', { name: 'Retry' })
    expect(screen.getByRole('dialog')).toHaveTextContent('could not be closed')
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Refresh projects' })
    ).not.toBeInTheDocument()
    await userEvent.setup().click(retry)
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Close Beta' })
      ).not.toBeInTheDocument()
    )
    expect(close.mock.calls.map(([id]) => id)).toEqual([beta.id, beta.id])
  })

  it('locks unknown outcome until authoritative presence or absence', async () => {
    const present = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    const { load } = await ready(close, [alpha, beta], [present.promise])
    await open(beta.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm' }))
    const refresh = await screen.findByRole('button', {
      name: 'Refresh projects',
    })
    expect(screen.getByRole('button', { name: 'Close Beta' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument()
    await userEvent.setup().click(refresh)
    await act(async () => present.resolve([alpha, beta]))
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('applies reconciled absence as success without guessing', async () => {
    const absent = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    await ready(close, [alpha, beta], [absent.promise])
    await open(alpha.name)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Confirm' }))
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Refresh projects' }))
    await act(async () => absent.resolve([beta]))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Close ' + alpha.name })
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Beta' })).toHaveFocus()
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
