import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RuntimeReport, RuntimeStateLoader } from '../src/runtime-state'
import {
  useRuntimeState,
  type ProjectListRevision,
} from '../src/use-runtime-state'

afterEach(() => {
  vi.useRealTimers()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const stopped = (id: string): RuntimeReport => ({ id, state: 'Stopped' })

describe('useRuntimeState', () => {
  it('remains idle with zero requests until an authoritative revision exists', () => {
    const loader = vi.fn<RuntimeStateLoader>()
    const { result } = renderHook(() => useRuntimeState(undefined, { loader }))

    expect(result.current.view).toEqual({ kind: 'idle' })
    expect(loader).not.toHaveBeenCalled()
  })

  it('makes one request per revision and one per explicit retry or refresh', async () => {
    const firstRevision: ProjectListRevision = {
      id: 1,
      projectIds: ['a'],
    }
    const secondRevision: ProjectListRevision = {
      id: 2,
      projectIds: ['a', 'b'],
    }
    const loader = vi
      .fn<RuntimeStateLoader>()
      .mockResolvedValueOnce([stopped('a')])
      .mockResolvedValueOnce([stopped('a')])
      .mockResolvedValueOnce([stopped('a')])
      .mockResolvedValueOnce([stopped('a'), stopped('b')])
    const { rerender, result } = renderHook(
      ({ revision }: { revision: ProjectListRevision }) =>
        useRuntimeState(revision, { loader }),
      { initialProps: { revision: firstRevision } }
    )

    await waitFor(() => expect(result.current.view.kind).toBe('success'))
    expect(loader).toHaveBeenCalledTimes(1)

    rerender({ revision: firstRevision })
    expect(loader).toHaveBeenCalledTimes(1)

    act(() => result.current.retry())
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.view.kind).toBe('success'))

    act(() => result.current.refresh())
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(result.current.view.kind).toBe('success'))

    rerender({ revision: secondRevision })
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(4))
    await waitFor(() =>
      expect(result.current.view).toEqual({
        kind: 'success',
        reports: [stopped('a'), stopped('b')],
      })
    )
  })

  it('discards stale responses from an earlier revision', async () => {
    const first = deferred<readonly RuntimeReport[]>()
    const second = deferred<readonly RuntimeReport[]>()
    const loader = vi
      .fn<RuntimeStateLoader>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { rerender, result } = renderHook(
      ({ revision }: { revision: ProjectListRevision }) =>
        useRuntimeState(revision, { loader }),
      { initialProps: { revision: { id: 1, projectIds: ['old'] } } }
    )
    rerender({ revision: { id: 2, projectIds: ['new'] } })

    await act(async () => {
      first.resolve([stopped('old')])
      await first.promise
    })
    expect(result.current.view.kind).toBe('loading')

    await act(async () => {
      second.resolve([stopped('new')])
      await second.promise
    })
    expect(result.current.view).toEqual({
      kind: 'success',
      reports: [stopped('new')],
    })
  })

  it('reports transport failure for a rejected request', async () => {
    const loader = vi
      .fn<RuntimeStateLoader>()
      .mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() =>
      useRuntimeState({ id: 1, projectIds: ['a'] }, { loader })
    )

    await waitFor(() =>
      expect(result.current.view).toEqual({
        kind: 'failure',
        reason: 'transport',
      })
    )
  })

  it('times out and aborts a request that does not settle', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const loader = vi.fn<RuntimeStateLoader>((requestSignal) => {
      signal = requestSignal
      return new Promise(() => undefined)
    })
    const { result } = renderHook(() =>
      useRuntimeState({ id: 1, projectIds: ['a'] }, { loader, timeoutMs: 25 })
    )

    await act(() => vi.advanceTimersByTimeAsync(25))

    expect(result.current.view).toEqual({
      kind: 'failure',
      reason: 'timeout',
    })
    expect(signal?.aborted).toBe(true)
  })

  it.each([
    ['missing', [stopped('a')], ['a', 'b']],
    ['extra', [stopped('a'), stopped('b')], ['a']],
    ['duplicate', [stopped('a'), stopped('a')], ['a', 'b']],
    ['order', [stopped('b'), stopped('a')], ['a', 'b']],
  ] as const)(
    'reports %s reconciliation as whole-list unavailability',
    async (mismatchReason, reports, projectIds) => {
      const loader = vi.fn<RuntimeStateLoader>().mockResolvedValue(reports)
      const { result } = renderHook(() =>
        useRuntimeState({ id: 1, projectIds }, { loader })
      )

      await waitFor(() =>
        expect(result.current.view).toEqual({
          kind: 'failure',
          reason: 'mismatch',
          mismatchReason,
        })
      )
    }
  )

  it('aborts the active request without publishing on unmount', () => {
    let signal: AbortSignal | undefined
    const pending = deferred<readonly RuntimeReport[]>()
    const loader = vi.fn<RuntimeStateLoader>((requestSignal) => {
      signal = requestSignal
      return pending.promise
    })
    const { unmount } = renderHook(() =>
      useRuntimeState({ id: 1, projectIds: ['a'] }, { loader })
    )

    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
