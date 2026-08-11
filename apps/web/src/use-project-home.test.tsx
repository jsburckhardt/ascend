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
}: {
  load: ProjectLoader
  register: RegistrationTransport
}) {
  const home = useProjectHome({ load, register })
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
    </div>
  )
}

async function mount(
  register: RegistrationTransport,
  laterLists: Array<Deferred<Project[]>> = []
) {
  let calls = 0
  const load = vi.fn<ProjectLoader>(() => {
    calls += 1
    if (calls === 1) return Promise.resolve([alpha])
    const next = laterLists.shift()
    return next?.promise ?? Promise.resolve([alpha])
  })
  render(<Harness load={load} register={register} />)
  await act(async () => undefined)
  return load
}

function enterAndSubmit(path = ' /exact path '): void {
  fireEvent.change(screen.getByLabelText('path'), { target: { value: path } })
  fireEvent.click(screen.getByText('submit'))
}

afterEach(() => cleanup())

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
    fireEvent.click(screen.getByText('retry same'))
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
      fireEvent.click(screen.getByText('refresh'))
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
    fireEvent.click(screen.getByText('refresh'))
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
})
