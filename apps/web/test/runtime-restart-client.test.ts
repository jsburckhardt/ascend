import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  RUNTIME_RESTART_ERROR_CATEGORIES,
  RUNTIME_RESTART_NOTICES,
  parseRuntimeRestartResponse,
  runtimeRestartEndpoint,
  sendRuntimeRestartRequest,
  type RuntimeRestartErrorCategory,
} from '../src/runtime-restart'

afterEach(() => vi.useRealTimers())

const errorStatus: Readonly<Record<RuntimeRestartErrorCategory, number>> = {
  invalid_project_id: 400,
  invalid_restart_request: 400,
  project_not_found: 404,
  runtime_not_managed: 409,
  runtime_start_in_progress: 409,
  runtime_stop_in_progress: 409,
  runtime_restart_release_unconfirmed: 500,
  runtime_replacement_failed: 500,
  runtime_manager_shutdown: 503,
  runtime_restart_failed: 500,
}

describe('runtime restart browser contract', () => {
  it('parses only the exact restarted success', () => {
    expect(
      parseRuntimeRestartResponse(
        200,
        { id: 'selected', outcome: 'restarted' },
        'selected'
      )
    ).toEqual({ kind: 'success', id: 'selected', outcome: 'restarted' })
    expect(() =>
      parseRuntimeRestartResponse(
        200,
        { id: 'selected', outcome: 'started' },
        'selected'
      )
    ).toThrow('Invalid runtime restart response')
  })

  it.each(RUNTIME_RESTART_ERROR_CATEGORIES)(
    'parses the exact %s rejection',
    (category) => {
      expect(
        parseRuntimeRestartResponse(
          errorStatus[category],
          { error: { category } },
          'selected'
        )
      ).toEqual({ kind: 'failure', category })
    }
  )

  it('builds one encoded selected-project endpoint', () => {
    expect(runtimeRestartEndpoint(' id /? ')).toBe(
      '/api/projects/%20id%20%2F%3F%20/runtime/restart'
    )
  })

  it('uses POST and returns unknown for malformed transport results', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'selected', outcome: 'restarted' }), {
        status: 200,
      })
    )
    await expect(
      sendRuntimeRestartRequest('selected', new AbortController().signal, {
        fetcher,
      })
    ).resolves.toEqual({
      kind: 'success',
      id: 'selected',
      outcome: 'restarted',
    })
    expect(fetcher).toHaveBeenCalledWith(
      '/api/projects/selected/runtime/restart',
      expect.objectContaining({ method: 'POST' })
    )

    await expect(
      sendRuntimeRestartRequest('selected', new AbortController().signal, {
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response('{', { status: 500 })),
      })
    ).resolves.toEqual({ kind: 'unknown' })
  })

  it('returns unknown at the finite transport deadline', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('timeout', 'AbortError'))
        )
      })
    })
    const pending = sendRuntimeRestartRequest(
      'selected',
      new AbortController().signal,
      { fetcher, timeoutMs: 25 }
    )
    await vi.advanceTimersByTimeAsync(25)
    await expect(pending).resolves.toEqual({ kind: 'unknown' })
  })

  it('owns one complete disclosure-safe notice per category', () => {
    expect(Object.keys(RUNTIME_RESTART_NOTICES).sort()).toEqual(
      [...RUNTIME_RESTART_ERROR_CATEGORIES].sort()
    )
    for (const notice of Object.values(RUNTIME_RESTART_NOTICES)) {
      expect(notice).not.toMatch(
        /\/(?:home|tmp|workspaces)\/|https?:\/\/|\b(?:port|pid)\b|SECRET/iu
      )
    }
  })
})
