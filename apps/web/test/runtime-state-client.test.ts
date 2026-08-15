import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_FAILURE_NOTICES,
  RUNTIME_STATE_ENDPOINT,
  loadRuntimeStates,
  parseRuntimeStateResponse,
  reconcileRuntimeReports,
  type RuntimeReport,
} from '../src/runtime-state'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runtime state browser contract', () => {
  it('parses and freezes exactly the four public states in server order', () => {
    const reports = parseRuntimeStateResponse({
      runtimes: [
        { id: 'stopped', state: 'Stopped' },
        { id: 'starting', state: 'Starting' },
        { id: 'running', state: 'Running' },
        {
          id: 'failed',
          state: 'Failed',
          failureCategory: 'readiness-timeout',
        },
      ],
    })

    expect(reports.map(({ state }) => state)).toEqual(PUBLIC_RUNTIME_STATES)
    expect(Object.isFrozen(reports)).toBe(true)
    expect(reports.every(Object.isFrozen)).toBe(true)
  })

  it.each([
    ['non-record envelope', null],
    ['missing runtimes', {}],
    ['extra envelope field', { runtimes: [], extra: true }],
    ['non-array runtimes', { runtimes: {} }],
    ['non-record report', { runtimes: [null] }],
    ['empty id', { runtimes: [{ id: '', state: 'Stopped' }] }],
    ['unknown state', { runtimes: [{ id: 'a', state: 'Ready' }] }],
    [
      'extra successful report field',
      { runtimes: [{ id: 'a', state: 'Running', detail: 'hidden' }] },
    ],
    [
      'failure category on non-failed state',
      {
        runtimes: [
          { id: 'a', state: 'Stopped', failureCategory: 'spawn-error' },
        ],
      },
    ],
    ['failed without category', { runtimes: [{ id: 'a', state: 'Failed' }] }],
    [
      'failed with unknown category',
      {
        runtimes: [
          { id: 'a', state: 'Failed', failureCategory: 'secret-detail' },
        ],
      },
    ],
    [
      'duplicate project id',
      {
        runtimes: [
          { id: 'a', state: 'Stopped' },
          { id: 'a', state: 'Starting' },
        ],
      },
    ],
  ])('rejects %s', (_name, payload) => {
    expect(() => parseRuntimeStateResponse(payload)).toThrow(
      'Invalid runtime state response'
    )
  })

  it('loads only the dedicated endpoint and parses its exact response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ runtimes: [{ id: 'a', state: 'Running' }] }),
          { status: 200 }
        )
      )
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(loadRuntimeStates(controller.signal)).resolves.toEqual([
      { id: 'a', state: 'Running' },
    ])
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(RUNTIME_STATE_ENDPOINT, {
      signal: controller.signal,
    })
  })

  it('rejects unsuccessful endpoint responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
    )

    await expect(
      loadRuntimeStates(new AbortController().signal)
    ).rejects.toThrow('Runtime state request failed')
  })
})

describe('runtime report reconciliation', () => {
  const report = (id: string): RuntimeReport => ({ id, state: 'Stopped' })

  it('accepts the exact project ID set and order', () => {
    const reports = [report('a'), report('b')]

    expect(reconcileRuntimeReports(reports, ['a', 'b'])).toEqual({
      kind: 'reconciled',
      reports,
    })
  })

  it.each([
    ['missing', [report('a')], ['a', 'b']],
    ['extra', [report('a'), report('b')], ['a']],
    ['duplicate', [report('a'), report('a')], ['a', 'b']],
    ['order', [report('b'), report('a')], ['a', 'b']],
  ] as const)(
    'classifies %s reports as whole-list mismatch',
    (reason, reports, ids) => {
      expect(reconcileRuntimeReports(reports, ids)).toEqual({
        kind: 'mismatch',
        reason,
      })
    }
  )
})

describe('bounded failure notices', () => {
  it('covers every and only catalogued category with a distinct notice', () => {
    expect(Object.keys(RUNTIME_FAILURE_NOTICES).sort()).toEqual(
      [...RUNTIME_FAILURE_CATEGORIES].sort()
    )
    expect(new Set(Object.values(RUNTIME_FAILURE_NOTICES))).toHaveLength(
      RUNTIME_FAILURE_CATEGORIES.length
    )
  })

  it('does not disclose protected runtime details', () => {
    const protectedPatterns = [
      /\/(?:home|tmp|workspaces)\//iu,
      /https?:\/\//iu,
      /\b(?:stdout|stderr|stack|command|argument|token)\b/iu,
      /(?:EADDRINUSE|ENOENT|SIG[A-Z]+|\bexit\s+\d+)/u,
    ]

    for (const notice of Object.values(RUNTIME_FAILURE_NOTICES)) {
      expect(notice.length).toBeLessThanOrEqual(80)
      for (const pattern of protectedPatterns) {
        expect(notice).not.toMatch(pattern)
      }
    }
  })
})
