import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLOSE_FAILURE_MESSAGES,
  loadProjects,
  parseCloseResponse,
  parseProjectListResponse,
  PROJECT_CLOSE_TIMEOUT_MS,
  sendCloseRequest,
} from './projects'

function response(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const BOUNDED_TEXT_FIXTURE_LENGTH = 4_096

describe('close response codec', () => {
  it('accepts only the exact documented envelopes', () => {
    expect(
      parseCloseResponse(200, { id: 'same', disposition: 'closed' }, 'same')
    ).toEqual({
      kind: 'success',
      id: 'same',
      disposition: 'closed',
    })
    for (const [status, category] of [
      [400, 'invalid_project_id'],
      [404, 'project_not_found'],
      [500, 'project_close_failed'],
    ] as const) {
      expect(
        parseCloseResponse(status, { error: { category } }, 'same')
      ).toEqual({
        kind: 'failure',
        category,
      })
    }
  })

  it.each([
    [200, { id: 'other', disposition: 'closed' }],
    [200, { id: 'same', disposition: 'closed', extra: true }],
    [200, { disposition: 'closed' }],
    [404, { id: 'same', disposition: 'closed' }],
    [400, { error: { category: 'project_not_found' } }],
    [500, { error: { category: 'project_close_failed', detail: 'secret' } }],
    [418, { error: { category: 'invalid_project_id' } }],
    [500, { error: { category: 'raw database error' } }],
  ])('rejects status and shape mismatch %i', (status, value) => {
    expect(() => parseCloseResponse(status, value, 'same')).toThrow(
      'Invalid close response'
    )
  })
})

describe('finite stable-ID close transport', () => {
  it.each([
    [400, 'invalid_project_id'],
    [404, 'project_not_found'],
    [500, 'project_close_failed'],
  ] as const)(
    'keeps documented HTTP %i failures definitive and message-safe',
    async (status, category) => {
      const sentinel = 'SECRET SQL /private/project stack content'
      await expect(
        sendCloseRequest('stable-id', new AbortController().signal, {
          fetcher: vi.fn<typeof fetch>(async () =>
            response(status, { error: { category } })
          ),
        })
      ).resolves.toEqual({ kind: 'failure', category })
      expect(CLOSE_FAILURE_MESSAGES[category]).not.toContain(sentinel)
      expect(CLOSE_FAILURE_MESSAGES[category]).not.toContain('stable-id')
    }
  )

  it.each(['', '\ud800'])(
    'rejects malformed ID before transmission: %j',
    async (id) => {
      const fetcher = vi.fn<typeof fetch>()
      const transmitted = vi.fn()
      await expect(
        sendCloseRequest(id, new AbortController().signal, {
          fetcher,
          onTransmitted: transmitted,
        })
      ).resolves.toEqual({
        kind: 'failure',
        category: 'invalid_project_id',
      })
      expect(fetcher).not.toHaveBeenCalled()
      expect(transmitted).not.toHaveBeenCalled()
    }
  )

  it('encodes the original ID exactly once for every retry', async () => {
    const urls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      urls.push(String(input))
      return response(200, { id: ' id /?<script> ', disposition: 'closed' })
    })
    const id = ' id /?<script> '
    await sendCloseRequest(id, new AbortController().signal, { fetcher })
    await sendCloseRequest(id, new AbortController().signal, { fetcher })
    expect(urls).toEqual([
      '/api/projects/' + encodeURIComponent(id),
      '/api/projects/' + encodeURIComponent(id),
    ])
    expect(decodeURIComponent(urls[0]!.slice('/api/projects/'.length))).toBe(id)
  })

  it.each([
    ['unavailable', (): boolean => false],
    [
      'failed check',
      (): boolean => {
        throw new Error('private pre-transmission network sentinel')
      },
    ],
  ] as const)(
    'reports pre-send %s without fetch or transmission',
    async (_label, preSendAvailable) => {
      const fetcher = vi.fn<typeof fetch>()
      const transmitted = vi.fn()
      await expect(
        sendCloseRequest('id', new AbortController().signal, {
          fetcher,
          onTransmitted: transmitted,
          preSendAvailable,
        })
      ).resolves.toEqual({ kind: 'not_transmitted' })
      expect(fetcher).not.toHaveBeenCalled()
      expect(transmitted).not.toHaveBeenCalled()
    }
  )

  it('notifies immediately before fetch and preserves known safe categories', async () => {
    const order: string[] = []
    const fetcher = vi.fn<typeof fetch>(async () => {
      order.push('fetch')
      return response(500, { error: { category: 'project_close_failed' } })
    })
    await expect(
      sendCloseRequest('id', new AbortController().signal, {
        fetcher,
        onTransmitted: () => order.push('transmitted'),
      })
    ).resolves.toEqual({ kind: 'failure', category: 'project_close_failed' })
    expect(order).toEqual(['transmitted', 'fetch'])
    expect(CLOSE_FAILURE_MESSAGES.project_close_failed).not.toContain('id')
  })

  it('owns and aborts the exact close bound', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn<typeof fetch>((_input, init) => {
      signal = init?.signal as AbortSignal
      return new Promise((_resolve, reject) =>
        signal?.addEventListener('abort', () => reject(new Error('private')), {
          once: true,
        })
      )
    })
    const outcome = sendCloseRequest('id', new AbortController().signal, {
      fetcher,
    })
    await act(async () =>
      vi.advanceTimersByTimeAsync(PROJECT_CLOSE_TIMEOUT_MS - 1)
    )
    expect(signal?.aborted).toBe(false)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    await expect(outcome).resolves.toEqual({ kind: 'unknown' })
    expect(signal?.aborted).toBe(true)
  })

  it.each([
    [
      'reset',
      async () => {
        throw new Error('secret reset')
      },
    ],
    ['invalid json', async () => new Response('{', { status: 200 })],
    [
      'unreadable',
      async () =>
        ({
          status: 200,
          text: async () => {
            throw new Error('secret')
          },
        }) as unknown as Response,
    ],
    [
      'undocumented',
      async () => response(418, { error: { category: 'invalid_project_id' } }),
    ],
    [
      'invalid shape',
      async () => response(200, { id: 'different', disposition: 'closed' }),
    ],
  ])('classifies transmitted %s as unknown', async (_label, implementation) => {
    const transmitted = vi.fn()
    await expect(
      sendCloseRequest('id', new AbortController().signal, {
        fetcher: vi.fn<typeof fetch>(implementation as typeof fetch),
        onTransmitted: transmitted,
      })
    ).resolves.toEqual({ kind: 'unknown' })
    expect(transmitted).toHaveBeenCalledOnce()
  })

  it('classifies owner abort after transmission as unknown', async () => {
    const owner = new AbortController()
    const outcome = sendCloseRequest('id', owner.signal, {
      fetcher: vi.fn<typeof fetch>((_input, init) => {
        const signal = init?.signal
        if (!(signal instanceof AbortSignal)) {
          throw new Error('signal missing')
        }
        return new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          })
        )
      }),
    })
    owner.abort()
    await expect(outcome).resolves.toEqual({ kind: 'unknown' })
  })
})

describe('authoritative close refresh codec and text bounds', () => {
  const oneCharacter = {
    id: 'i',
    name: 'n',
    canonicalPath: 'p',
    createdAt: 0,
  }
  const bounded = {
    id: 'i'.repeat(BOUNDED_TEXT_FIXTURE_LENGTH),
    name: '<'.repeat(BOUNDED_TEXT_FIXTURE_LENGTH),
    canonicalPath: ' /'.repeat(BOUNDED_TEXT_FIXTURE_LENGTH / 2),
    createdAt: Number.MAX_SAFE_INTEGER,
  }

  it('accepts one-character and bounded long inert project text exactly', () => {
    expect(
      parseProjectListResponse({ projects: [bounded, oneCharacter] })
    ).toEqual([oneCharacter, bounded])
    expect(bounded.name).toHaveLength(BOUNDED_TEXT_FIXTURE_LENGTH)
    expect(bounded.canonicalPath).toHaveLength(BOUNDED_TEXT_FIXTURE_LENGTH)
  })

  it('rejects invalid, non-JSON, and failed refreshes without partial data', async () => {
    const cases: Array<[Response, string]> = [
      [new Response('{', { status: 200 }), 'JSON'],
      [
        response(200, {
          projects: [{ ...oneCharacter, canonicalPath: '' }],
        }),
        'Invalid project response',
      ],
      [response(503, { projects: [] }), 'request failed'],
    ]
    for (const [reply, message] of cases) {
      vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>(async () => reply)
      )
      await expect(loadProjects(new AbortController().signal)).rejects.toThrow(
        message
      )
    }
  })
})
