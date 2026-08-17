import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLOSE_FAILURE_MESSAGES,
  type CloseFailureCategory,
  type CloseTransport,
  type CloseTransportResult,
  type Project,
  type ProjectLoader,
  type RegistrationTransport,
} from './projects'
import type { RuntimeRestartTransport } from './runtime-restart'
import type { RuntimeStopTransport } from './runtime-stop'
import {
  useProjectHome,
  type ProjectHomeAction,
  type ProjectHomeController,
} from './use-project-home'

const projects: Project[] = [
  { id: 'a', name: 'A', canonicalPath: '/a', createdAt: 1 },
  { id: 'b', name: 'B', canonicalPath: '/b', createdAt: 2 },
  { id: 'c', name: 'C', canonicalPath: '/c', createdAt: 3 },
]

const ADMISSION_ACTIONS: readonly ProjectHomeAction[] = [
  'open',
  'close',
  'stop',
  'restart',
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

function admitted(home: ProjectHomeController, projectId: string): string {
  return ADMISSION_ACTIONS.filter((action) =>
    home.admits(action, projectId)
  ).join(',')
}

function Harness({
  initial,
  load,
  close,
  register = vi.fn<RegistrationTransport>(),
  stop = vi.fn<RuntimeStopTransport>(),
  restart = vi.fn<RuntimeRestartTransport>(),
}: {
  initial: Project[]
  load: ProjectLoader
  close: CloseTransport
  register?: RegistrationTransport
  stop?: RuntimeStopTransport
  restart?: RuntimeRestartTransport
}) {
  const home = useProjectHome({
    load,
    close,
    register,
    stop,
    restart,
    listTimeoutMs: 25,
  })
  const state = home.state
  return (
    <div>
      <output data-testid={'projects'}>
        {state.projects.map(({ id }) => id).join(',')}
      </output>
      <output data-testid={'dialog'}>{state.closeDialogId}</output>
      <output data-testid={'settlement'}>{state.closeSettlementVersion}</output>
      <output data-testid={'focus'}>{state.focusProjectId}</output>
      <output data-testid={'focus-target'}>{state.focusTarget}</output>
      <output data-testid={'announcement'}>{state.announcement}</output>
      <output data-testid={'mode'}>{state.mode}</output>
      {initial.map(({ id }) => (
        <div key={id}>
          <output data-testid={'phase-' + id}>
            {state.closes.get(id)?.phase}
          </output>
          <output data-testid={'transmitted-' + id}>
            {String(state.closes.get(id)?.transmitted)}
          </output>
          <output data-testid={'message-' + id}>
            {state.closes.get(id)?.message}
          </output>
          <output data-testid={'admits-' + id}>{admitted(home, id)}</output>
          <button onClick={() => home.openClose(id)}>open-{id}</button>
          <button onClick={() => home.retryClose(id)}>retry-{id}</button>
          <button onClick={() => home.refreshClose(id)}>refresh-{id}</button>
          <button onClick={() => home.stop(id)}>stop-{id}</button>
          <button onClick={() => home.restart(id)}>restart-{id}</button>
        </div>
      ))}
      <button onClick={() => home.openClose('missing')}>open-missing</button>
      <button onClick={home.cancelClose}>cancel-close</button>
      <button onClick={home.confirmClose}>confirm-close</button>
      <button onClick={home.submit}>submit-registration</button>
      <button onClick={() => home.setInput('/host/path')}>enter-path</button>
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

function transportFor(records: Map<string, Deferred<CloseTransportResult>>) {
  const transmitters = new Map<string, () => void>()
  const transport = vi.fn<CloseTransport>((id, _signal, onTransmitted) => {
    const record = deferred<CloseTransportResult>()
    records.set(id, record)
    if (onTransmitted !== undefined) transmitters.set(id, onTransmitted)
    return record.promise
  })
  return { transport, transmitters }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Project Home per-project close lane', () => {
  it('opens and cancels one exclusive dialog without a request', async () => {
    const close = vi.fn<CloseTransport>()
    await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('phase-b')).toHaveTextContent('confirming')
    expect(screen.getByTestId('dialog')).toHaveTextContent('b')

    fireEvent.click(screen.getByText('open-a'))
    expect(screen.getByTestId('phase-a')).toBeEmptyDOMElement()
    expect(screen.getByTestId('dialog')).toHaveTextContent('b')

    fireEvent.click(screen.getByText('cancel-close'))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    expect(screen.getByTestId('phase-b')).toBeEmptyDOMElement()
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('b')
    expect(screen.getByTestId('focus-target')).toHaveTextContent('close')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: Close cancelled.'
    )
  })

  it('dismisses the dialog at transmission and moves focus to that card status', async () => {
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    await mount(transport)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    fireEvent.click(screen.getByText('confirm-close'))
    expect(transport).toHaveBeenCalledOnce()
    expect(screen.getByTestId('phase-b')).toHaveTextContent('pending')
    expect(screen.getByTestId('transmitted-b')).toHaveTextContent('false')
    expect(screen.getByTestId('dialog')).toHaveTextContent('b')

    act(() => transmitters.get('b')?.())
    expect(screen.getByTestId('transmitted-b')).toHaveTextContent('true')
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    expect(screen.getByTestId('focus-target')).toHaveTextContent('close-status')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: Close request sent.'
    )

    fireEvent.click(screen.getByText('cancel-close'))
    expect(screen.getByTestId('phase-b')).toHaveTextContent('pending')

    await act(async () =>
      records.get('b')?.resolve({
        kind: 'success',
        id: 'b',
        disposition: 'closed',
      })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('c')
    expect(screen.getByTestId('focus-target')).toHaveTextContent('close')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: Project closed.'
    )
  })

  it('scopes a pending close to its own project and admits every peer action', async () => {
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    await mount(transport)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('b')?.())

    expect(screen.getByTestId('admits-b')).toBeEmptyDOMElement()
    expect(screen.getByTestId('admits-a')).toHaveTextContent(
      'open,close,stop,restart'
    )
    expect(screen.getByTestId('admits-c')).toHaveTextContent(
      'open,close,stop,restart'
    )

    fireEvent.click(screen.getByText('open-a'))
    expect(screen.getByTestId('phase-a')).toHaveTextContent('confirming')
    expect(screen.getByTestId('dialog')).toHaveTextContent('a')
  })

  it('transmits two peer closes concurrently and settles each independently', async () => {
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    await mount(transport)
    fireEvent.click(screen.getByText('open-a'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('a')?.())
    fireEvent.click(screen.getByText('open-c'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('c')?.())

    expect(transport.mock.calls.map(([id]) => id)).toEqual(['a', 'c'])
    expect(screen.getByTestId('phase-a')).toHaveTextContent('pending')
    expect(screen.getByTestId('phase-c')).toHaveTextContent('pending')

    await act(async () =>
      records.get('c')?.resolve({
        kind: 'failure',
        category: 'runtime_stop_in_progress',
      })
    )
    expect(screen.getByTestId('phase-c')).toHaveTextContent('retry')
    expect(screen.getByTestId('phase-a')).toHaveTextContent('pending')
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')

    await act(async () =>
      records
        .get('a')
        ?.resolve({ kind: 'success', id: 'a', disposition: 'closed' })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('b,c')
    expect(screen.getByTestId('phase-c')).toHaveTextContent('retry')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
  })

  it('refuses a same-project duplicate at the owner and transmitted layers', async () => {
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    await mount(transport)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('b')?.())
    // Owner layer: an in-flight close refuses a retry for the same project.
    fireEvent.click(screen.getByText('retry-b'))
    expect(transport).toHaveBeenCalledOnce()
    // Transmitted layer: a second notification never re-announces.
    act(() => transmitters.get('b')?.())
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: Close request sent.'
    )
    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    expect(transport).toHaveBeenCalledOnce()
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

  it.each([
    ['invalid_project_id', 'retry', 'close-retry'],
    ['project_close_failed', 'retry', 'close-retry'],
    ['runtime_start_in_progress', 'retry', 'close-retry'],
    ['runtime_stop_in_progress', 'retry', 'close-retry'],
    ['runtime_restart_in_progress', 'retry', 'close-retry'],
    ['runtime_reconcile_in_progress', 'retry', 'close-retry'],
    ['runtime_reconcile_unresolved', 'retry', 'close-retry'],
    ['runtime_release_unconfirmed', 'retry', 'close-retry'],
    ['runtime_close_ownership_unresolved', 'retry', 'close-retry'],
    ['runtime_manager_shutdown', 'retry', 'close-retry'],
    ['project_not_found', 'unknown', 'close-refresh'],
  ] as [CloseFailureCategory, string, string][])(
    'maps definitive %s to its declared phase, message, and focus',
    async (category, phase, target) => {
      const close = vi
        .fn<CloseTransport>()
        .mockResolvedValue({ kind: 'failure', category })
      await mount(close)
      fireEvent.click(screen.getByText('open-b'))
      fireEvent.click(screen.getByText('confirm-close'))
      await act(async () => undefined)
      expect(screen.getByTestId('phase-b')).toHaveTextContent(phase)
      expect(screen.getByTestId('message-b')).toHaveTextContent(
        CLOSE_FAILURE_MESSAGES[category]
      )
      expect(screen.getByTestId('announcement')).toHaveTextContent(
        'B: ' + CLOSE_FAILURE_MESSAGES[category]
      )
      expect(screen.getByTestId('focus-target')).toHaveTextContent(target)
      expect(screen.getByTestId('settlement')).toHaveTextContent('0')
      expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
      expect(close).toHaveBeenCalledOnce()
    }
  )

  it('keeps malformed selection inert and makes pre-transmission failure retryable', async () => {
    const close = vi
      .fn<CloseTransport>()
      .mockResolvedValue({ kind: 'not_transmitted' })
    await mount(close)
    fireEvent.click(screen.getByText('open-missing'))
    fireEvent.click(screen.getByText('confirm-close'))
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    expect(screen.getByTestId('phase-b')).toHaveTextContent('retry')
    expect(screen.getByTestId('transmitted-b')).toHaveTextContent('false')
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: No close request was sent. Retry this project.'
    )
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
    expect(screen.getByTestId('phase-b')).toHaveTextContent('retry')
    fireEvent.click(screen.getByText('retry-b'))
    fireEvent.click(screen.getByText('retry-b'))
    await act(async () => undefined)
    expect(close).toHaveBeenCalledTimes(2)
    expect(close.mock.calls.map(([id]) => id)).toEqual(['b', 'b'])
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
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
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
    expect(screen.getByTestId('focus-target')).toHaveTextContent(
      'close-refresh'
    )
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'B: Close outcome unknown. Refresh projects to determine the result.'
    )
    fireEvent.click(screen.getByText('refresh-b'))
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => present.resolve(projects))
    expect(load).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('phase-b')).toHaveTextContent('retry')
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')
    fireEvent.click(screen.getByText('retry-b'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => absent.resolve([projects[0]!, projects[2]!]))
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('focus')).toHaveTextContent('c')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')
  })

  it('keeps unknown locked after invalid or failed refresh', async () => {
    const invalid = deferred<Project[]>()
    const failed = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    await mount(close, projects, [invalid.promise, failed.promise])
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => invalid.resolve([projects[0]!, projects[0]!]))
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => failed.reject(new Error('private')))
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'still unknown'
    )
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')
  })

  it('times out reconciliation, aborts it, and ignores its stale completion', async () => {
    vi.useFakeTimers()
    const refresh = deferred<Project[]>()
    const refreshSignals: AbortSignal[] = []
    let calls = 0
    const load = vi.fn<ProjectLoader>((signal) => {
      calls += 1
      if (calls === 1) return Promise.resolve(projects)
      refreshSignals.push(signal)
      return refresh.promise
    })
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    render(<Harness initial={projects} load={load} close={close} />)
    await act(async () => undefined)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => vi.advanceTimersByTimeAsync(25))
    expect(refreshSignals[0]?.aborted).toBe(true)
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'still unknown'
    )
    await act(async () => refresh.resolve([projects[0]!, projects[2]!]))
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
  })

  it('suppresses an older close completion while a newer generation owns the ID', async () => {
    const first = deferred<CloseTransportResult>()
    const second = deferred<CloseTransportResult>()
    const close = vi
      .fn<CloseTransport>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    await mount(close)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    fireEvent.click(screen.getByText('cancel-close'))
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () =>
      first.resolve({ kind: 'success', id: 'b', disposition: 'closed' })
    )
    expect(screen.getByTestId('phase-b')).toHaveTextContent('pending')
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b,c')
    expect(screen.getByTestId('settlement')).toHaveTextContent('0')
    await act(async () => second.resolve({ kind: 'unknown' }))
    expect(screen.getByTestId('phase-b')).toHaveTextContent('unknown')
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

describe('Project Home close and list lane alignment', () => {
  it('refuses a close for the project a stop or restart owns and admits a peer close', async () => {
    const stopRequest = deferred<never>()
    const stop = vi.fn<RuntimeStopTransport>(() => stopRequest.promise)
    const restart = vi.fn<RuntimeRestartTransport>(
      () => new Promise(() => undefined)
    )
    const load = vi.fn<ProjectLoader>(async () => projects)
    render(
      <Harness
        initial={projects}
        load={load}
        close={vi.fn<CloseTransport>()}
        stop={stop}
        restart={restart}
      />
    )
    await act(async () => undefined)

    fireEvent.click(screen.getByText('stop-a'))
    expect(screen.getByTestId('admits-a')).not.toHaveTextContent('close')
    fireEvent.click(screen.getByText('open-a'))
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('dialog')).toHaveTextContent('b')
    fireEvent.click(screen.getByText('cancel-close'))

    fireEvent.click(screen.getByText('restart-c'))
    fireEvent.click(screen.getByText('open-c'))
    expect(screen.getByTestId('dialog')).toBeEmptyDOMElement()
    fireEvent.click(screen.getByText('open-b'))
    expect(screen.getByTestId('dialog')).toHaveTextContent('b')
  })

  it('never refuses a list-bearing action because a close is pending', async () => {
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValue({ kind: 'not_transmitted' })
    await mount(transport, projects, [], register)
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('b')?.())
    fireEvent.click(screen.getByText('enter-path'))
    fireEvent.click(screen.getByText('submit-registration'))
    await act(async () => undefined)
    expect(register).toHaveBeenCalledOnce()
  })

  it('discards a list response a close settlement superseded and re-issues it once', async () => {
    const stale = deferred<Project[]>()
    const replacement = deferred<Project[]>()
    const records = new Map<string, Deferred<CloseTransportResult>>()
    const { transport, transmitters } = transportFor(records)
    let calls = 0
    const load = vi.fn<ProjectLoader>(() => {
      calls += 1
      if (calls === 1) return Promise.resolve(projects)
      if (calls === 2) return stale.promise
      return replacement.promise
    })
    render(<Harness initial={projects} load={load} close={transport} />)
    await act(async () => undefined)

    // 'a' reaches the unknown phase, so its Refresh close result joins the
    // global list-bearing lane.
    fireEvent.click(screen.getByText('open-a'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('a')?.())
    await act(async () => records.get('a')?.resolve({ kind: 'unknown' }))

    // 'b' transmits on its own per-project lane before the list request opens.
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    act(() => transmitters.get('b')?.())

    fireEvent.click(screen.getByText('refresh-a'))
    expect(load).toHaveBeenCalledTimes(2)

    // 'b' settles while that list request is still in flight.
    await act(async () =>
      records
        .get('b')
        ?.resolve({ kind: 'success', id: 'b', disposition: 'closed' })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('settlement')).toHaveTextContent('1')

    await act(async () => stale.resolve(projects))
    expect(load).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('projects')).toHaveTextContent('a,c')
    expect(screen.getByTestId('phase-a')).toHaveTextContent('refreshing')

    await act(async () => replacement.resolve([projects[0]!, projects[1]!]))
    // The tombstone keeps the settled close removed even though the
    // replacement response still carried it.
    expect(screen.getByTestId('projects')).toHaveTextContent('a')
    expect(screen.getByTestId('phase-a')).toHaveTextContent('retry')
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('applies an ordinary list response that no settlement superseded', async () => {
    const refresh = deferred<Project[]>()
    const close = vi.fn<CloseTransport>().mockResolvedValue({ kind: 'unknown' })
    const { load } = await mount(close, projects, [refresh.promise])
    fireEvent.click(screen.getByText('open-b'))
    fireEvent.click(screen.getByText('confirm-close'))
    await act(async () => undefined)
    fireEvent.click(screen.getByText('refresh-b'))
    await act(async () => refresh.resolve([projects[0]!, projects[1]!]))
    expect(load).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('projects')).toHaveTextContent('a,b')
    expect(screen.getByTestId('phase-b')).toHaveTextContent('retry')
  })
})
