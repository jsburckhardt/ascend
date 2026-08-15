import { performance } from 'node:perf_hooks'
import { describe, expect, it, vi } from 'vitest'
import {
  defaultRuntimeTerminationPrimitives,
  terminateOwnedRuntimeGroup,
  type RuntimeTerminationPrimitives,
} from '../src/project-runtime-process.js'

function auditState(input: {
  readonly rootAlive: boolean
  readonly groupAlive: boolean
  readonly listenerAlive: boolean
}) {
  return {
    readProcessStartTime: vi.fn(async () =>
      input.rootAlive ? 'owned-start' : null
    ),
    readProcessGroupMembers: vi.fn(async () => (input.groupAlive ? [77] : [])),
    listenerIsAbsent: vi.fn(async () => !input.listenerAlive),
  }
}

function primitives(
  input: Parameters<typeof auditState>[0] & {
    readonly onSignal?: (
      signal: NodeJS.Signals,
      state: {
        rootAlive: boolean
        groupAlive: boolean
        listenerAlive: boolean
      }
    ) => boolean
  }
): RuntimeTerminationPrimitives & {
  readonly signals: NodeJS.Signals[]
} {
  const state = { ...input }
  const signals: NodeJS.Signals[] = []
  const reads = auditState(state)
  return {
    ...reads,
    signals,
    delay: async () => undefined,
    signalProcessGroup: (_group, signal) => {
      signals.push(signal)
      return input.onSignal?.(signal, state) ?? true
    },
    now: () => performance.now(),
    scheduleDeadline(milliseconds, callback) {
      const timer = setTimeout(callback, Math.max(0, milliseconds))
      return () => clearTimeout(timer)
    },
  }
}

const request = {
  pid: 77,
  processStartTime: 'owned-start',
  port: 47_777,
  gracefulMs: 5,
  forceMs: 5,
  auditAllowanceMs: 5,
} as const

/**
 * The fixture drives the shipped sequencer on the real monotonic clock, so its
 * declared allowances are wall-clock budgets. Under the full suite's
 * coverage-instrumented parallel workers a 5 ms observation allowance is
 * starved and the sequencer correctly reports `unconfirmed`. Scenarios that
 * prove control flow rather than window length therefore declare a larger —
 * still finite — allowance; the scenarios that measure a window or the
 * self-bound keep the tight bounds they assert against.
 */
const observationRequest = {
  ...request,
  gracefulMs: 1_000,
  auditAllowanceMs: 1_000,
} as const

/**
 * Escalation measures the graceful window, so it keeps a window it can wait
 * out in real time while giving the pre-signal audit, the pre-escalation
 * identity read, and the post-`SIGKILL` confirmation allowances that survive
 * the same contention. The asserted claim is unchanged: no `SIGKILL` before a
 * full `gracefulMs` has elapsed since the delivered `SIGTERM`.
 */
const escalationRequest = {
  ...request,
  gracefulMs: 100,
  forceMs: 100,
  auditAllowanceMs: 500,
} as const

describe('runtime stop termination sequencer', () => {
  it('returns already absent without signalling', async () => {
    const fixture = primitives({
      rootAlive: false,
      groupAlive: false,
      listenerAlive: false,
    })
    await expect(
      terminateOwnedRuntimeGroup({ ...observationRequest, primitives: fixture })
    ).resolves.toMatchObject({
      outcome: 'already-absent',
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })
    expect(fixture.signals).toEqual([])
  })

  it('confirms a graceful release without force', async () => {
    const fixture = primitives({
      rootAlive: true,
      groupAlive: true,
      listenerAlive: true,
      onSignal(signal, state) {
        if (signal === 'SIGTERM') {
          state.rootAlive = false
          state.groupAlive = false
          state.listenerAlive = false
        }
        return true
      },
    })
    await expect(
      terminateOwnedRuntimeGroup({ ...observationRequest, primitives: fixture })
    ).resolves.toMatchObject({
      outcome: 'graceful',
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })
    expect(fixture.signals).toEqual(['SIGTERM'])
  })

  it('escalates only after the graceful window and confirms force release', async () => {
    const signalTimes: number[] = []
    const fixture = primitives({
      rootAlive: true,
      groupAlive: true,
      listenerAlive: true,
      onSignal(signal, state) {
        signalTimes.push(performance.now())
        if (signal === 'SIGKILL') {
          state.rootAlive = false
          state.groupAlive = false
          state.listenerAlive = false
        }
        return true
      },
    })
    await expect(
      terminateOwnedRuntimeGroup({ ...escalationRequest, primitives: fixture })
    ).resolves.toMatchObject({ outcome: 'escalated' })
    expect(fixture.signals).toEqual(['SIGTERM', 'SIGKILL'])
    expect(
      (signalTimes[1] ?? 0) - (signalTimes[0] ?? 0)
    ).toBeGreaterThanOrEqual(escalationRequest.gracefulMs - 0.5)
  })

  it('bounds a never-settling awaited primitive with the trusted scheduler', async () => {
    const fixture = primitives({
      rootAlive: true,
      groupAlive: true,
      listenerAlive: true,
    })
    fixture.listenerIsAbsent = vi.fn(
      () => new Promise<boolean>(() => undefined)
    )
    const startedAt = performance.now()
    await expect(
      terminateOwnedRuntimeGroup({ ...request, primitives: fixture })
    ).resolves.toMatchObject({
      outcome: 'unconfirmed',
      listenerAbsent: false,
    })
    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(fixture.signals).toEqual([])
  })

  it('does no work for a pre-aborted caller', async () => {
    const fixture = primitives({
      rootAlive: true,
      groupAlive: true,
      listenerAlive: true,
    })
    const controller = new AbortController()
    controller.abort()
    await expect(
      terminateOwnedRuntimeGroup({
        ...request,
        primitives: fixture,
        signal: controller.signal,
      })
    ).resolves.toMatchObject({
      outcome: 'unconfirmed',
      processAbsent: false,
      processGroupAbsent: false,
      listenerAbsent: false,
    })
    expect(fixture.readProcessStartTime).not.toHaveBeenCalled()
    expect(fixture.signals).toEqual([])
  })

  it('treats ESRCH as refused delivery and rethrows other signal faults', () => {
    const kill = vi.spyOn(process, 'kill')
    kill.mockImplementationOnce(() => {
      const error = new Error('gone') as NodeJS.ErrnoException
      error.code = 'ESRCH'
      throw error
    })
    expect(
      defaultRuntimeTerminationPrimitives.signalProcessGroup(77, 'SIGTERM')
    ).toBe(false)
    kill.mockImplementationOnce(() => {
      const error = new Error('denied') as NodeJS.ErrnoException
      error.code = 'EPERM'
      throw error
    })
    expect(() =>
      defaultRuntimeTerminationPrimitives.signalProcessGroup(77, 'SIGTERM')
    ).toThrow('denied')
    kill.mockRestore()
    expect(defaultRuntimeTerminationPrimitives.now()).toBeGreaterThanOrEqual(0)
  })
})
