import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  Project,
  ProjectLoader,
  RegistrationTransport,
  RegistrationTransportResult,
} from './projects'
import { useProjectHome } from './use-project-home'

const alpha: Project = {
  id: 'alpha',
  name: 'Alpha',
  canonicalPath: '/alpha',
  createdAt: 2,
}
const beta: Project = {
  id: 'beta',
  name: 'Beta',
  canonicalPath: '/beta',
  createdAt: 1,
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

function Harness({
  load,
  register,
  listTimeoutMs,
}: {
  load: ProjectLoader
  register: RegistrationTransport
  listTimeoutMs?: number
}) {
  const home = useProjectHome({ load, register, listTimeoutMs })
  const { state } = home
  return (
    <div>
      <output data-testid={'list'}>{state.listStatus}</output>
      <output data-testid={'mode'}>{state.mode}</output>
      <output data-testid={'projects'}>
        {state.projects.map(({ id }) => id).join(',')}
      </output>
      <output data-testid={'input'}>{state.input}</output>
      <output data-testid={'payload'}>{state.lockedPayload}</output>
      <output data-testid={'announcement'}>{state.announcement}</output>
      <output data-testid={'focus'}>{state.focusProjectId}</output>
      <output data-testid={'focus-version'}>{state.focusVersion}</output>
      <output data-testid={'input-focus-version'}>
        {state.inputFocusVersion}
      </output>
      <output data-testid={'validation'}>{state.validation}</output>
      <output data-testid={'active'}>{state.activeKind}</output>
      <input
        aria-label={'path'}
        value={state.input}
        onChange={(event) => home.setInput(event.target.value)}
      />
      <button onClick={home.submit}>submit</button>
      <button onClick={home.cancel}>cancel</button>
      <button onClick={home.retrySameSubmission}>retry same</button>
      <button onClick={home.refreshProjects}>refresh</button>
      <button onClick={home.resetRecovery}>reset</button>
      <button onClick={home.retryList}>retry list</button>
    </div>
  )
}

async function mount(
  register: RegistrationTransport,
  laterLists: Array<Deferred<Project[]>> = [],
  listTimeoutMs?: number
) {
  let calls = 0
  const load = vi.fn<ProjectLoader>(() => {
    calls += 1
    if (calls === 1) return Promise.resolve([alpha])
    const next = laterLists.shift()
    return next?.promise ?? Promise.resolve([alpha])
  })
  render(
    <Harness load={load} register={register} listTimeoutMs={listTimeoutMs} />
  )
  await act(async () => undefined)
  return load
}

function enterAndSubmit(path = ' /exact path '): void {
  fireEvent.change(screen.getByLabelText('path'), { target: { value: path } })
  fireEvent.click(screen.getByText('submit'))
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Project Home controller', () => {
  it('upserts by stable ID, removes duplicates, and restores total ordering', async () => {
    const register = vi.fn<RegistrationTransport>().mockResolvedValue({
      kind: 'success',
      disposition: 'created',
      project: beta,
    })
    await mount(register)
    enterAndSubmit()
    await act(async () => undefined)
    expect(screen.getByTestId('projects')).toHaveTextContent('beta,alpha')
    expect(screen.getByTestId('mode')).toHaveTextContent('editing')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Project created'
    )
    expect(register).toHaveBeenCalledOnce()
  })

  it('blocks repeated ordinary submits and cancellation invalidates a late success', async () => {
    const request = deferred<RegistrationTransportResult>()
    const register = vi.fn<RegistrationTransport>(() => request.promise)
    await mount(register)
    enterAndSubmit('/one')
    fireEvent.click(screen.getByText('submit'))
    expect(register).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('cancel'))
    expect(screen.getByTestId('mode')).toHaveTextContent('editing')
    await act(async () =>
      request.resolve({
        kind: 'success',
        disposition: 'created',
        project: beta,
      })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('input')).toHaveTextContent('/one')
  })

  it('locks an unknown payload and retries byte-identically', async () => {
    const retry = deferred<RegistrationTransportResult>()
    const bodies: string[] = []
    const register = vi.fn<RegistrationTransport>((payload) => {
      bodies.push(payload)
      return bodies.length === 1
        ? Promise.resolve({ kind: 'unknown' })
        : retry.promise
    })
    await mount(register)
    enterAndSubmit('  ~/a <script>  ')
    await act(async () => undefined)
    expect(screen.getByTestId('mode')).toHaveTextContent('unknown')
    const payload = JSON.stringify({ path: '  ~/a <script>  ' })
    expect(screen.getByTestId('payload').textContent).toBe(payload)
    fireEvent.change(screen.getByLabelText('path'), {
      target: { value: '/different' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
    expect(bodies).toEqual([payload, payload])
    fireEvent.click(screen.getByText('cancel'))
    expect(screen.getByTestId('mode')).toHaveTextContent('unknown')
    await act(async () =>
      retry.resolve({ kind: 'success', disposition: 'created', project: beta })
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('payload').textContent).toBe(payload)
  })

  it.each([
    ['zero', [alpha], 'editing', 'No new project was observed'],
    ['one', [alpha, beta], 'editing', 'Project reconciled'],
    ['many', [alpha, beta, gamma], 'ambiguous', 'reconciliation is ambiguous'],
  ] as const)(
    'reconciles a %s-addition authoritative refresh',
    async (_label, projects, mode, announcement) => {
      const refresh = deferred<Project[]>()
      const register = vi
        .fn<RegistrationTransport>()
        .mockResolvedValue({ kind: 'unknown' })
      await mount(register, [refresh])
      enterAndSubmit('/one')
      await act(async () => undefined)
      fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
      await act(async () => refresh.resolve([...projects]))
      expect(screen.getByTestId('mode')).toHaveTextContent(mode)
      expect(screen.getByTestId('projects')).toHaveTextContent(
        projects
          .map(({ id }) => id)
          .sort((a, b) =>
            a === 'beta' ? -1 : b === 'beta' ? 1 : a.localeCompare(b)
          )
          .join(',')
      )
      expect(screen.getByTestId('announcement')).toHaveTextContent(announcement)
      if (mode === 'ambiguous') {
        fireEvent.click(screen.getByText('reset'))
        expect(screen.getByTestId('mode')).toHaveTextContent('editing')
      }
    }
  )

  it('preserves unknown state and cards when refresh fails', async () => {
    const refresh = deferred<Project[]>()
    await mount(
      vi.fn<RegistrationTransport>().mockResolvedValue({ kind: 'unknown' }),
      [refresh]
    )
    enterAndSubmit('/one')
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    await act(async () => refresh.reject(new Error('failed')))
    expect(screen.getByTestId('mode')).toHaveTextContent('unknown')
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('payload').textContent).toBe(
      JSON.stringify({ path: '/one' })
    )
  })

  it('maps definite non-transmission and validation without changing cards', async () => {
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValueOnce({ kind: 'not_transmitted' })
      .mockResolvedValueOnce({ kind: 'failure', category: 'path_not_found' })
    await mount(register)
    enterAndSubmit('/missing')
    await act(async () => undefined)
    expect(screen.getByTestId('mode')).toHaveTextContent('editing')
    enterAndSubmit('/missing')
    await act(async () => undefined)
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'does not exist'
    )
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
  })

  it.each(['created', 'existing'] as const)(
    'reconciles an exact %s retry with stable-ID focus and two requests',
    async (disposition) => {
      const retry = deferred<RegistrationTransportResult>()
      const register = vi
        .fn<RegistrationTransport>()
        .mockResolvedValueOnce({ kind: 'unknown' })
        .mockImplementationOnce(() => retry.promise)
      const load = await mount(register)
      enterAndSubmit('/locked retry')
      await act(async () => undefined)
      fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
      fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
      fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
      expect(register).toHaveBeenCalledTimes(2)
      expect(load).toHaveBeenCalledOnce()
      expect(screen.getByTestId('active')).toHaveTextContent('retry')
      await act(async () =>
        retry.resolve({ kind: 'success', disposition, project: beta })
      )
      expect(screen.getByTestId('projects')).toHaveTextContent('beta,alpha')
      expect(screen.getByTestId('input')).toHaveTextContent('/locked retry')
      expect(screen.getByTestId('payload')).toBeEmptyDOMElement()
      expect(screen.getByTestId('focus')).toHaveTextContent('beta')
      expect(screen.getByTestId('focus-version')).toHaveTextContent('1')
      expect(screen.getByTestId('announcement')).toHaveTextContent(
        disposition === 'created'
          ? 'Project created'
          : 'Project already registered'
      )
    }
  )

  it('keeps one retry owner, restores both recovery actions after cancel, and suppresses its late response', async () => {
    const retry = deferred<RegistrationTransportResult>()
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValueOnce({ kind: 'unknown' })
      .mockImplementationOnce(() => retry.promise)
    const load = await mount(register)
    enterAndSubmit('/retry cancel')
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
    fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    expect(register).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('cancel'))
    const before = {
      mode: screen.getByTestId('mode').textContent,
      projects: screen.getByTestId('projects').textContent,
      input: screen.getByTestId('input').textContent,
      payload: screen.getByTestId('payload').textContent,
      focus: screen.getByTestId('focus').textContent,
      announcement: screen.getByTestId('announcement').textContent,
      validation: screen.getByTestId('validation').textContent,
    }
    expect(before).toEqual({
      mode: 'unknown',
      projects: 'alpha',
      input: '/retry cancel',
      payload: JSON.stringify({ path: '/retry cancel' }),
      focus: '',
      announcement: 'Retry cancelled. Submission outcome unknown.',
      validation: '',
    })
    await act(async () =>
      retry.resolve({ kind: 'success', disposition: 'created', project: beta })
    )
    expect({
      mode: screen.getByTestId('mode').textContent,
      projects: screen.getByTestId('projects').textContent,
      input: screen.getByTestId('input').textContent,
      payload: screen.getByTestId('payload').textContent,
      focus: screen.getByTestId('focus').textContent,
      announcement: screen.getByTestId('announcement').textContent,
      validation: screen.getByTestId('validation').textContent,
    }).toEqual(before)
  })

  it('keeps one refresh owner, cancels to unknown, and suppresses its late authoritative list', async () => {
    const refresh = deferred<Project[]>()
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    const load = await mount(register, [refresh])
    enterAndSubmit('/refresh cancel')
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    fireEvent.click(screen.getByRole('button', { name: 'retry same' }))
    expect(load).toHaveBeenCalledTimes(2)
    expect(register).toHaveBeenCalledOnce()
    expect(screen.getByTestId('active')).toHaveTextContent('refresh')
    fireEvent.click(screen.getByText('cancel'))
    expect(screen.getByTestId('mode')).toHaveTextContent('unknown')
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('input')).toHaveTextContent('/refresh cancel')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Refresh cancelled'
    )
    await act(async () => refresh.resolve([alpha, beta]))
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('focus')).toBeEmptyDOMElement()
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Refresh cancelled'
    )
  })

  it('times out refresh, restores unknown controls, and ignores the timed-out list', async () => {
    vi.useFakeTimers()
    const refresh = deferred<Project[]>()
    const register = vi
      .fn<RegistrationTransport>()
      .mockResolvedValue({ kind: 'unknown' })
    const load = await mount(register, [refresh], 25)
    enterAndSubmit('/refresh timeout')
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))
    await act(async () => vi.advanceTimersByTimeAsync(25))
    expect(load).toHaveBeenCalledTimes(2)
    expect(register).toHaveBeenCalledOnce()
    expect(screen.getByTestId('mode')).toHaveTextContent('unknown')
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('input')).toHaveTextContent('/refresh timeout')
    expect(screen.getByTestId('announcement')).toHaveTextContent(
      'Refresh failed. Submission outcome unknown.'
    )
    await act(async () => refresh.resolve([alpha, beta]))
    expect(screen.getByTestId('projects')).toHaveTextContent('alpha')
    expect(screen.getByTestId('focus')).toBeEmptyDOMElement()
  })

  it('suppresses a stale timed-out list after a newer list retry generation', async () => {
    vi.useFakeTimers()
    const first = deferred<Project[]>()
    const second = deferred<Project[]>()
    const load = vi
      .fn<ProjectLoader>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const register = vi.fn<RegistrationTransport>()
    render(<Harness load={load} register={register} listTimeoutMs={25} />)
    await act(async () => vi.advanceTimersByTimeAsync(25))
    expect(screen.getByTestId('list')).toHaveTextContent('failure')
    fireEvent.click(screen.getByRole('button', { name: 'retry list' }))
    await act(async () => first.resolve([alpha]))
    expect(screen.getByTestId('list')).toHaveTextContent('loading')
    expect(screen.getByTestId('projects')).toBeEmptyDOMElement()
    await act(async () => second.resolve([beta]))
    expect(screen.getByTestId('list')).toHaveTextContent('success')
    expect(screen.getByTestId('projects')).toHaveTextContent('beta')
    expect(screen.getByTestId('announcement')).toBeEmptyDOMElement()
    expect(load).toHaveBeenCalledTimes(2)
    expect(register).not.toHaveBeenCalled()
  })

  it('suppresses an older ordinary response after cancel and a successful new generation', async () => {
    const oldRequest = deferred<RegistrationTransportResult>()
    const newRequest = deferred<RegistrationTransportResult>()
    const register = vi
      .fn<RegistrationTransport>()
      .mockImplementationOnce(() => oldRequest.promise)
      .mockImplementationOnce(() => newRequest.promise)
    await mount(register)
    enterAndSubmit('/old')
    fireEvent.click(screen.getByText('cancel'))
    enterAndSubmit('/new')
    await act(async () =>
      newRequest.resolve({
        kind: 'success',
        disposition: 'created',
        project: gamma,
      })
    )
    const before = {
      projects: screen.getByTestId('projects').textContent,
      input: screen.getByTestId('input').textContent,
      focus: screen.getByTestId('focus').textContent,
      announcement: screen.getByTestId('announcement').textContent,
      validation: screen.getByTestId('validation').textContent,
    }
    expect(before).toEqual({
      projects: 'alpha,gamma',
      input: '/new',
      focus: 'gamma',
      announcement: 'Project created.',
      validation: '',
    })
    await act(async () =>
      oldRequest.resolve({
        kind: 'success',
        disposition: 'existing',
        project: beta,
      })
    )
    expect({
      projects: screen.getByTestId('projects').textContent,
      input: screen.getByTestId('input').textContent,
      focus: screen.getByTestId('focus').textContent,
      announcement: screen.getByTestId('announcement').textContent,
      validation: screen.getByTestId('validation').textContent,
    }).toEqual(before)
    expect(register).toHaveBeenCalledTimes(2)
  })

  it('aborts a pending registration on unmount and ignores its completion', async () => {
    const request = deferred<RegistrationTransportResult>()
    let signal: AbortSignal | undefined
    const register = vi.fn<RegistrationTransport>((_payload, ownedSignal) => {
      signal = ownedSignal
      return request.promise
    })
    const load = vi.fn<ProjectLoader>().mockResolvedValue([alpha])
    const view = render(<Harness load={load} register={register} />)
    await act(async () => undefined)
    enterAndSubmit('/unmount')
    expect(signal?.aborted).toBe(false)
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () =>
      request.resolve({
        kind: 'success',
        disposition: 'created',
        project: beta,
      })
    )
    expect(view.container).toBeEmptyDOMElement()
    expect(load).toHaveBeenCalledOnce()
    expect(register).toHaveBeenCalledOnce()
  })
})
