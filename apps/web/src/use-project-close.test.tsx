import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CloseTransport,
  CloseTransportResult,
  Project,
  ProjectLoader,
  RegistrationTransport,
} from './projects'
import { useProjectHome } from './use-project-home'

const projects: Project[] = [
  { id: 'a', name: 'A', canonicalPath: '/a', createdAt: 1 },
  { id: 'b', name: 'B', canonicalPath: '/b', createdAt: 2 },
  { id: 'c', name: 'C', canonicalPath: '/c', createdAt: 3 },
]

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

function Harness({
  initial,
  load,
  close,
  register = vi.fn<RegistrationTransport>(),
}: {
  initial: Project[]
  load: ProjectLoader
  close: CloseTransport
  register?: RegistrationTransport
}) {
  const home = useProjectHome({ load, close, register, listTimeoutMs: 25 })
  const state = home.state
  return (
    <div>
      <output data-testid={'projects'}>
        {state.projects.map(({ id }) => id).join(',')}
      </output>
      <output data-testid={'phase'}>{state.close?.phase}</output>
      <output data-testid={'close-id'}>{state.close?.id}</output>
      <output data-testid={'transmitted'}>
        {String(state.close?.transmitted)}
      </output>
      <output data-testid={'focus'}>{state.focusProjectId}</output>
      <output data-testid={'focus-target'}>{state.focusTarget}</output>
      <output data-testid={'announcement'}>{state.announcement}</output>
      {initial.map(({ id }) => (
        <button key={id} onClick={() => home.openClose(id)}>
          open-{id}
        </button>
      ))}
      <button onClick={home.cancelClose}>cancel-close</button>
      <button onClick={home.confirmClose}>confirm-close</button>
      <button onClick={home.retryClose}>retry-close</button>
      <button onClick={home.refreshClose}>refresh-close</button>
      <button onClick={home.submit}>submit-registration</button>
    </div>
  )
}

async function mount(
  close: CloseTransport,
  initial: Project[] = projects,
  laterLoads: Array<Promise<Project[]>> = [],
  register?: RegistrationTransport
) {
  let calls = 0
  const load = vi.fn<ProjectLoader>(() => {
    calls += 1
    return calls === 1
      ? Promise.resolve(initial)
      : (laterLoads.shift() ?? Promise.resolve(initial))
  })
  const view = render(
    <Harness initial={initial} load={load} close={close} register={register} />
  )
  await act(async () => undefined)
  return { load, view }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Project Home close owner', () => {
  it('opens and cancels without a request and restores Close focus intent', async () => {
    const close = vi.fn<CloseTransport>()
    await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('phase')).toHaveTextContent('confirming')
    expect(screen.getByTestId('close-id')).toHaveTextContent('b')
    fireEvent.click(screen.getByText('cancel-close'))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('b')
    expect(screen.getByTestId('focus-target')).toHaveTextContent('close')
  })

  it('sends one explicit Confirm, removes Cancel after transmission, and ignores repeats', async () => {
    const request = deferred<CloseTransportResult>()
    let transmitted: (() => void) | undefined
    const close = vi.fn<CloseTransport>((_id, _signal, callback) => {
      transmitted = callback
      return request.promise
    })
    await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    fireEvent.click(screen.getByText('confirm-close'))
    expect(close).toHaveBeenCalledOnce()
    expect(screen.getByTestId('transmitted')).toHaveTextContent('false')
    act(() => transmitted?.())
    expect(screen.getByTestId('transmitted')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('cancel-close'))
    expect(screen.getByTestId('phase')).toHaveTextContent('pending')
    await act(async () =>
      request.resolve({ kind: 'success', id: 'b', disposition: 'closed' })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('c')
    expect(screen.getByTestId('focus-target')).toHaveTextContent('close')
  })

  it.each([
    ['a', 'b', 'close'],
    ['c', 'b', 'close'],
  ] as const)('computes success focus for %s', async (id, focus, target) => {
    const close = vi.fn<CloseTransport>(async (original) => ({
      kind: 'success',
      id: original,
      disposition: 'closed',
    }))
    await mount(close)
    fireEvent.click(screen.getByText('open-' + id))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    expect(screen.getByTestId('focus')).toHaveTextContent(focus)
    expect(screen.getByTestId('focus-target')).toHaveTextContent(target)
  })

  it('focuses the heading after the final card and keeps the empty list', async () => {
    const close = vi.fn<CloseTransport>(async (id) => ({
      kind: 'success',
      id,
      disposition: 'closed',
    }))
    await mount(close, [projects[0]!])
    fireEvent.click(screen.getByText('open-a'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    expect(screen.getByTestId('projects')).toBeEmptyDOMElement()
    expect(screen.getByTestId('focus-target')).toHaveTextContent('heading')
  })

  it('allows same-ID retry only for a definitive no-mutation result', async () => {
    const close = vi
      .fn<CloseTransport>()
      .mockResolvedValueOnce({
        kind: 'failure',
        category: 'project_close_failed',
      })
      .mockResolvedValueOnce({
        kind: 'success',
        id: 'b',
        disposition: 'closed',
      })
    await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    expect(screen.getByTestId('phase')).toHaveTextContent('retry')
    fireEvent.click(screen.getByText('retry-close'))
    fireEvent.click(screen.getByText('retry-close'))
    await act(async () => undefined)
    expect(close).toHaveBeenCalledTimes(2)
    expect(close.mock.calls.map(([id]) => id)).toEqual(['b', 'b'])
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
  })

  it('reconciles unknown present, absent, and failed lists without guessing', async () => {
    const present = deferred<Project[]>()
    const absent = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    const { load } = await mount(close, projects, [
      present.promise,
      absent.promise,
    ])
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    expect(screen.getByTestId('phase')).toHaveTextContent('unknown')
    fireEvent.click(screen.getByText('retry-close'))
    expect(close).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('refresh-close'))
    fireEvent.click(screen.getByText('refresh-close'))
    await act(async () => present.resolve(projects))
    expect(load).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('phase')).toHaveTextContent('retry')
    fireEvent.click(screen.getByText('retry-close'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-close'))
    await act(async () => absent.resolve([projects[0]!, projects[2]!]))
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('c')
  })

  it('keeps unknown locked after invalid or failed refresh', async () => {
    const invalid = deferred<Project[]>()
    const failed = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    await mount(close, projects, [invalid.promise, failed.promise])
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-close'))
    await act(async () => invalid.resolve([projects[0]!, projects[0]!]))
    expect(screen.getByTestId('phase')).toHaveTextContent('unknown')
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    fireEvent.click(screen.getByText('refresh-close'))
    await act(async () => failed.reject(new Error('private')))
    expect(screen.getByTestId('phase')).toHaveTextContent('unknown')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'still unknown'
    )
  })

  it('invalidates pre-transmission cancellation and unmount completion', async () => {
    const first = deferred<CloseTransportResult>()
    const second = deferred<CloseTransportResult>()
    const signals: AbortSignal[] = []
    const close = vi.fn<CloseTransport>((_id, signal) => {
      signals.push(signal)
      return signals.length === 1 ? first.promise : second.promise
    })
    const { view } = await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    fireEvent.click(screen.getByText('cancel-close'))
    expect(signals[0]?.aborted).toBe(true)
    await act(async () =>
      first.resolve({ kind: 'success', id: 'b', disposition: 'closed' })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    view.unmount()
    expect(signals[1]?.aborted).toBe(true)
    await act(async () =>
      second.resolve({ kind: 'success', id: 'b', disposition: 'closed' })
    )
    expect(view.container).toBeEmptyDOMElement()
  })
})
