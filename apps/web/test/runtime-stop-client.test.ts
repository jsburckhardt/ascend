import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  RUNTIME_STOP_ERROR_CATEGORIES,
  RUNTIME_STOP_NOTICES,
  RUNTIME_STOP_OUTCOMES,
  parseRuntimeStopResponse,
  runtimeStopEndpoint,
  sendRuntimeStopRequest,
  type RuntimeStopErrorCategory,
} from '../src/runtime-stop'

afterEach(() => {
  vi.useRealTimers()
})

const errorStatus: Readonly<Record<RuntimeStopErrorCategory, number>> = {
  invalid_project_id: 400,
  invalid_stop_request: 400,
  project_not_found: 404,
  runtime_not_managed: 409,
  runtime_start_in_progress: 409,
  runtime_restart_in_progress: 409,
  runtime_reconcile_in_progress: 409,
  runtime_reconcile_unresolved: 409,
  runtime_failure_retained: 409,
  runtime_stop_unconfirmed: 500,
  runtime_manager_shutdown: 503,
  runtime_stop_failed: 500,
}

describe('runtime stop browser contract', () => {
  it.each(RUNTIME_STOP_OUTCOMES)('parses the exact %s success', (outcome) => {
    expect(
      parseRuntimeStopResponse(200, { id: 'selected', outcome }, 'selected')
    ).toEqual({ kind: 'success', id: 'selected', outcome })
  })

  it.each(RUNTIME_STOP_ERROR_CATEGORIES)(
    'parses the exact %s rejection',
    (category) => {
      expect(
        parseRuntimeStopResponse(
          errorStatus[category],
          { error: { category } },
          'selected'
        )
      ).toEqual({ kind: 'failure', category })
    }
  )

  it.each([
    ['non-object', null],
    ['missing success field', { id: 'selected' }],
    [
      'extra success field',
      { id: 'selected', outcome: 'stopped', state: 'Stopped' },
    ],
    ['mismatched success ID', { id: 'peer', outcome: 'stopped' }],
    ['unknown outcome', { id: 'selected', outcome: 'forced' }],
    ['wrong outcome type', { id: 'selected', outcome: 1 }],
    ['missing error field', { error: {} }],
    [
      'extra error field',
      { error: { category: 'runtime_stop_failed', message: 'server text' } },
    ],
    ['unknown category', { error: { category: 'private_server_fault' } }],
    ['wrong category type', { error: { category: 1 } }],
  ])('rejects a %s response', (_label, value) => {
    expect(() => parseRuntimeStopResponse(200, value, 'selected')).toThrow(
      'Invalid runtime stop response'
    )
  })

  it('builds one encoded selected-project endpoint', () => {
    expect(runtimeStopEndpoint(' id /? ')).toBe(
      '/api/projects/%20id%20%2F%3F%20/runtime/stop'
    )
  })

  it.each([
    [
      200,
      { id: 'selected', outcome: 'stopped' },
      { kind: 'success', id: 'selected', outcome: 'stopped' },
    ],
    ...RUNTIME_STOP_ERROR_CATEGORIES.map((category) => [
      errorStatus[category],
      { error: { category } },
      { kind: 'failure', category },
    ]),
  ] as const)(
    'classifies a %i response without exposing server text',
    async (status, body, expected) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        })
      )
      await expect(
        sendRuntimeStopRequest('selected', new AbortController().signal, {
          fetcher,
        })
      ).resolves.toEqual(expected)
      expect(fetcher).toHaveBeenCalledOnce()
      expect(fetcher).toHaveBeenCalledWith(
        '/api/projects/selected/runtime/stop',
        expect.objectContaining({ method: 'POST' })
      )
    }
  )

  it.each([
    [
      'unparsable body',
      () => Promise.resolve(new Response('{', { status: 500 })),
    ],
    ['network rejection', () => Promise.reject(new Error('server message'))],
  ])('returns unknown for an %s', async (_label, fetcher) => {
    await expect(
      sendRuntimeStopRequest('selected', new AbortController().signal, {
        fetcher: vi.fn<typeof fetch>(fetcher),
      })
    ).resolves.toEqual({ kind: 'unknown' })
  })

  it('returns unknown when the owner aborts', async () => {
    const owner = new AbortController()
    const fetcher = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError'))
        )
      })
    })
    const pending = sendRuntimeStopRequest('selected', owner.signal, {
      fetcher,
    })
    owner.abort()
    await expect(pending).resolves.toEqual({ kind: 'unknown' })
  })

  it('returns unknown at the finite request timeout', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('timeout', 'AbortError'))
        )
      })
    })
    const pending = sendRuntimeStopRequest(
      'selected',
      new AbortController().signal,
      { fetcher, timeoutMs: 25 }
    )
    await vi.advanceTimersByTimeAsync(25)
    await expect(pending).resolves.toEqual({ kind: 'unknown' })
  })

  it('owns a complete, distinct, disclosure-safe notice catalog', () => {
    expect(Object.keys(RUNTIME_STOP_NOTICES).sort()).toEqual(
      [...RUNTIME_STOP_ERROR_CATEGORIES].sort()
    )
    expect(RUNTIME_STOP_NOTICES.runtime_not_managed).not.toBe(
      RUNTIME_STOP_NOTICES.project_not_found
    )
    const protectedPatterns = [
      /\/(?:home|tmp|workspaces)\//iu,
      /https?:\/\//iu,
      /\b(?:port|pid|authority|server message)\b/iu,
      /SECRET|stack|SELECT/iu,
    ]
    for (const notice of Object.values(RUNTIME_STOP_NOTICES)) {
      for (const pattern of protectedPatterns) {
        expect(notice).not.toMatch(pattern)
      }
    }
  })
})
