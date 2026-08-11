import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseRegistrationResponse,
  PROJECT_REGISTRATION_TIMEOUT_MS,
  REGISTRATION_FAILURE_MESSAGES,
  sendRegistrationPayload,
  serializeRegistrationPath,
  type Project,
} from './projects'

const project: Project = {
  id: 'stable',
  name: 'Name',
  canonicalPath: '/path',
  createdAt: 1,
}

function jsonResponse(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => vi.useRealTimers())

describe('registration response codec', () => {
  it.each([
    [201, 'created'],
    [200, 'existing'],
  ] as const)('accepts exact %i %s response', (status, disposition) => {
    expect(parseRegistrationResponse(status, { disposition, project })).toEqual(
      { kind: 'success', disposition, project }
    )
  })

  const statuses = {
    path_required: 400,
    unsupported_path_syntax: 400,
    path_not_found: 404,
    path_not_directory: 422,
    path_unreadable: 403,
    outside_opening_policy: 403,
  } as const
  it.each(
    Object.keys(REGISTRATION_FAILURE_MESSAGES) as Array<
      keyof typeof REGISTRATION_FAILURE_MESSAGES
    >
  )('accepts exact typed failure %s', (category) => {
    expect(
      parseRegistrationResponse(statuses[category], {
        error: { category, field: 'path' },
      })
    ).toEqual({ kind: 'failure', category })
  })

  it.each([
    [201, { disposition: 'existing', project }],
    [200, { disposition: 'existing', project: { ...project, extra: true } }],
    [200, { disposition: 'existing', project, extra: true }],
    [400, { error: { category: 'path_not_found', field: 'path' } }],
    [404, { error: { category: 'path_not_found', field: 'other' } }],
    [500, { error: { category: 'project_registration_failed' } }],
    [299, { disposition: 'created', project }],
  ])('rejects undocumented response %i %j', (status, value) => {
    expect(() => parseRegistrationResponse(status, value)).toThrow(
      /Invalid (registration|project) response/u
    )
  })
})

describe('finite registration transport', () => {
  it('retains byte-equivalent payload across retries', async () => {
    const bodies: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      bodies.push(String(init?.body))
      return jsonResponse(200, { disposition: 'existing', project })
    })
    const payload = serializeRegistrationPath('  ~/space <script>  ')
    const first = await sendRegistrationPayload(
      payload,
      new AbortController().signal,
      { fetcher }
    )
    const retry = await sendRegistrationPayload(
      payload,
      new AbortController().signal,
      { fetcher }
    )
    expect(first).toMatchObject({ kind: 'success' })
    expect(retry).toMatchObject({ kind: 'success' })
    expect(bodies).toEqual([payload, payload])
    expect(new TextEncoder().encode(bodies[0])).toEqual(
      new TextEncoder().encode(bodies[1])
    )
  })

  it('reports controlled pre-send unavailability without invoking fetch', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(
      sendRegistrationPayload('{}', new AbortController().signal, {
        fetcher,
        preSendAvailable: () => false,
      })
    ).resolves.toEqual({ kind: 'not_transmitted' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('owns and aborts the exact ten-second bound', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetcher = vi.fn<typeof fetch>((_input, init) => {
      signal = init?.signal as AbortSignal
      return new Promise((_resolve, reject) =>
        signal?.addEventListener('abort', () => reject(new Error('aborted')), {
          once: true,
        })
      )
    })
    const outcome = sendRegistrationPayload(
      '{}',
      new AbortController().signal,
      { fetcher }
    )
    await act(async () =>
      vi.advanceTimersByTimeAsync(PROJECT_REGISTRATION_TIMEOUT_MS - 1)
    )
    expect(signal?.aborted).toBe(false)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    await expect(outcome).resolves.toEqual({ kind: 'unknown' })
    expect(signal?.aborted).toBe(true)
  })

  it.each([
    [
      'connection reset',
      async () => {
        throw new Error('reset')
      },
    ],
    ['truncated json', async () => new Response('{', { status: 200 })],
    ['non-json', async () => new Response('not json', { status: 200 })],
    [
      'undocumented status',
      async () =>
        jsonResponse(418, {
          error: { category: 'path_required', field: 'path' },
        }),
    ],
    [
      'invalid shape',
      async () =>
        jsonResponse(201, {
          disposition: 'created',
          project: { ...project, id: '' },
        }),
    ],
    [
      'unreadable body',
      async () =>
        ({
          status: 200,
          text: async () => {
            throw new Error('unreadable')
          },
        }) as unknown as Response,
    ],
  ])(
    'classifies post-invocation %s as unknown',
    async (_label, implementation) => {
      const fetcher = vi.fn<typeof fetch>(implementation as typeof fetch)
      await expect(
        sendRegistrationPayload('{}', new AbortController().signal, { fetcher })
      ).resolves.toEqual({ kind: 'unknown' })
      expect(fetcher).toHaveBeenCalledOnce()
    }
  )

  it.each([
    ['non-JSON success', 200],
    ['non-JSON error', 503],
  ] as const)(
    'classifies %s after fetch invocation as unknown',
    async (_label, status) => {
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response('<html>not json</html>', {
            status,
            headers: { 'content-type': 'text/html' },
          })
      )
      await expect(
        sendRegistrationPayload('{}', new AbortController().signal, { fetcher })
      ).resolves.toEqual({ kind: 'unknown' })
      expect(fetcher).toHaveBeenCalledOnce()
    }
  )

  it('treats an owner cancellation after transmission as unknown transport evidence', async () => {
    const owner = new AbortController()
    const fetcher = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal
          signal.addEventListener(
            'abort',
            () => reject(new Error('cancelled')),
            {
              once: true,
            }
          )
        })
    )
    const outcome = sendRegistrationPayload('{}', owner.signal, { fetcher })
    owner.abort()
    await expect(outcome).resolves.toEqual({ kind: 'unknown' })
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
