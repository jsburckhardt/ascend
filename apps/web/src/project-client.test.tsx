import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseProjectListResponse,
  PROJECT_LIST_TIMEOUT_MS,
  type Project,
  type ProjectLoader,
} from './projects'
import { useProjectList } from './use-project-list'

const validProject: Project = {
  id: 'project-1',
  name: 'Project One',
  canonicalPath: '/projects/one',
  createdAt: 1,
}

interface Deferred<T> {
  readonly promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function Harness({ loader }: { readonly loader: ProjectLoader }) {
  const renders = useRef(0)
  renders.current += 1
  const { state, retry } = useProjectList(loader)
  return (
    <div>
      <output data-testid="state">{state.status}</output>
      <output data-testid="projects">
        {state.status === 'success'
          ? state.projects.map(({ id }) => id).join(',')
          : ''}
      </output>
      <output data-testid="renders">{renders.current}</output>
      <button onClick={retry} type="button">
        Retry
      </button>
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('project list response validation', () => {
  it('returns exact valid records unchanged', () => {
    expect(parseProjectListResponse({ projects: [validProject] })).toEqual([
      validProject,
    ])
  })

  it.each([
    null,
    {},
    { projects: [], extra: true },
    { projects: 'not-an-array' },
    { projects: [null] },
    { projects: [{ ...validProject, id: '' }] },
    { projects: [{ ...validProject, name: '  ' }] },
    { projects: [{ ...validProject, canonicalPath: '' }] },
    { projects: [{ ...validProject, createdAt: -1 }] },
    { projects: [{ ...validProject, createdAt: 1.5 }] },
    { projects: [{ ...validProject, extra: true }] },
    { projects: [validProject, { ...validProject }] },
  ])(
    'rejects malformed or duplicate response without partial data: %j',
    (value) => {
      expect(() => parseProjectListResponse(value)).toThrow(
        'Invalid project response'
      )
    }
  )
})

describe('project list request ownership', () => {
  it('starts one request on mount and fails safely at the finite timeout', async () => {
    vi.useFakeTimers()
    const pending = deferred<Project[]>()
    const signals: AbortSignal[] = []
    const loader: ProjectLoader = vi.fn((signal) => {
      signals.push(signal)
      return pending.promise
    })
    render(<Harness loader={loader} />)
    expect(loader).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('state')).toHaveTextContent('loading')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROJECT_LIST_TIMEOUT_MS)
    })
    expect(signals[0]?.aborted).toBe(true)
    expect(screen.getByTestId('state')).toHaveTextContent('failure')
  })

  it('aborts rapid retries and lets only the newest request update state', async () => {
    const requests: Array<Deferred<Project[]>> = []
    const signals: AbortSignal[] = []
    const loader: ProjectLoader = vi.fn((signal) => {
      signals.push(signal)
      const request = deferred<Project[]>()
      requests.push(request)
      return request.promise
    })
    render(<Harness loader={loader} />)

    const retry = screen.getByRole('button', { name: 'Retry' })
    fireEvent.click(retry)
    fireEvent.click(retry)
    expect(loader).toHaveBeenCalledTimes(3)
    expect(signals.slice(0, 2).every(({ aborted }) => aborted)).toBe(true)

    await act(async () => {
      requests[2]?.resolve([validProject])
      await requests[2]?.promise
    })
    expect(screen.getByTestId('projects')).toHaveTextContent('project-1')

    await act(async () => {
      requests[0]?.resolve([{ ...validProject, id: 'stale' }])
      requests[1]?.reject(new Error('stale failure'))
      await Promise.allSettled([requests[0]?.promise, requests[1]?.promise])
    })
    expect(screen.getByTestId('state')).toHaveTextContent('success')
    expect(screen.getByTestId('projects')).toHaveTextContent('project-1')
    expect(screen.getByTestId('projects')).not.toHaveTextContent('stale')
  })

  it('aborts on unmount and ignores later completion', async () => {
    const request = deferred<Project[]>()
    let signal: AbortSignal | undefined
    const loader: ProjectLoader = (ownedSignal) => {
      signal = ownedSignal
      return request.promise
    }
    const view = render(<Harness loader={loader} />)
    const renderCount = Number(screen.getByTestId('renders').textContent)
    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => {
      request.resolve([validProject])
      await request.promise
    })
    expect(renderCount).toBeGreaterThan(0)
    expect(view.container).toBeEmptyDOMElement()
  })
})
