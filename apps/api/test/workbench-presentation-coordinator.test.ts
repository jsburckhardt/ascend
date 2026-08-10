import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  checkPresentationPrerequisites,
  coordinatePresentationAttempts,
} from '../src/workbench-presentation-coordinator.js'
import {
  PRESENTATION_ASSERTION_IDS,
  PRESENTATION_PREREQUISITES,
  PRESENTATION_VIEWPORT,
  type PresentationAttemptRecord,
} from '../src/workbench-presentation-contract.js'

const record = (
  candidate: 'embedded' | 'full-page',
  attempt: number
): PresentationAttemptRecord => ({
  version: 1,
  candidate,
  attempt,
  runId: randomUUID(),
  chromiumVersion: '151',
  startStatus: 'started',
  finalStatus: 'passed',
  failedAssertions: [],
  timing: { navigationStartMs: 10, scenarioCompletionMs: 20 },
  assertions: {
    functional: Object.fromEntries(
      PRESENTATION_ASSERTION_IDS.map((id) => [id, true])
    ) as PresentationAttemptRecord['assertions']['functional'],
    requiredEvidence: true,
    cleanup: true,
    integrity: true,
  },
  evidence: {
    rawBrowserEvents: 'package.json',
    terminalDirect: 'package.json',
    terminalIntegrated: 'package.json',
  },
  warningCounts: { blocking: 0, nonBlocking: 0 },
  freshness: {
    workbenchRunId: randomUUID(),
    processPid: attempt + (candidate === 'embedded' ? 100 : 200),
    processGroup: attempt + (candidate === 'embedded' ? 100 : 200),
    browserContextId: candidate + '-' + String(attempt),
    disposableArea: candidate + '-' + String(attempt),
    priorStateAbsent: true,
  },
  cleanup: {
    browserContextClosed: true,
    terminalCommandsAbsent: true,
    processGroupAbsent: true,
    exactProcessAbsent: true,
    listenerAbsent: true,
    disposableRemoved: true,
    fixturePresentUnchanged: true,
  },
  integrity: {
    fixturePresent: true,
    treeMembershipEqual: true,
    sentinelBytesEqual: true,
  },
  sharedInputs: {
    fixture: 'fixture',
    codeServerVersion: '4.131.0',
    chromiumName: 'chromium',
    chromiumVersion: '151',
    viewport: PRESENTATION_VIEWPORT,
  },
})

describe('BL-003 prerequisites and serial coordinator', () => {
  it('checks prerequisites in exact order and stops on the first failure before attempts', async () => {
    const calls: string[] = []
    const result = await checkPresentationPrerequisites(async (name) => {
      calls.push(name)
      return { passed: name !== 'merged-bl-001-bl-002-proof', detail: name }
    })
    expect(calls).toEqual(PRESENTATION_PREREQUISITES.slice(0, 3))
    expect(result.stopReason).toBe(
      'prerequisite failure:merged-bl-001-bl-002-proof'
    )
    const runAttempt = vi.fn()
    const coordinated = await coordinatePresentationAttempts({
      prerequisiteStopReason: result.stopReason,
      runAttempt,
    })
    expect(runAttempt).not.toHaveBeenCalled()
    expect(
      coordinated.slots.every(
        (slot) => slot.status === 'not started' && !slot.runId
      )
    ).toBe(true)
  })

  it('starts six serial fresh attempts exactly once and retains each record', async () => {
    const calls: string[] = []
    const result = await coordinatePresentationAttempts({
      prerequisiteStopReason: null,
      runAttempt: async (slot) => {
        calls.push(slot.candidate + '/' + String(slot.attempt))
        return {
          record: record(slot.candidate, slot.attempt),
          recordReference: calls.at(-1) + '.json',
        }
      },
    })
    expect(calls).toEqual([
      'embedded/1',
      'embedded/2',
      'embedded/3',
      'full-page/1',
      'full-page/2',
      'full-page/3',
    ])
    expect(result.records).toHaveLength(6)
    expect(
      new Set(result.records.map((entry) => entry.freshness.browserContextId))
    ).toHaveLength(6)
    expect(result.stopReason).toBeNull()
  })

  it('retains cleanup failure and leaves every later slot without a run ID', async () => {
    const runAttempt = vi.fn(
      async (slot: {
        candidate: 'embedded' | 'full-page'
        attempt: number
      }) => {
        const value = record(slot.candidate, slot.attempt)
        if (slot.attempt === 2) {
          value.finalStatus = 'failed'
          value.cleanup.listenerAbsent = false
          value.assertions.cleanup = false
        }
        return {
          record: value,
          recordReference:
            slot.candidate + '-' + String(slot.attempt) + '.json',
        }
      }
    )
    const result = await coordinatePresentationAttempts({
      prerequisiteStopReason: null,
      runAttempt,
    })
    expect(runAttempt).toHaveBeenCalledTimes(2)
    expect(result.stopReason).toBe('cleanup failure:embedded/2')
    expect(
      result.slots
        .slice(2)
        .every((slot) => slot.status === 'not started' && !slot.runId)
    ).toBe(true)
  })

  it('fails reused attempt identities without retrying', async () => {
    const reused = record('embedded', 1)
    const runAttempt = vi.fn(
      async (slot: {
        candidate: 'embedded' | 'full-page'
        attempt: number
      }) => ({
        record: {
          ...record(slot.candidate, slot.attempt),
          freshness: reused.freshness,
        },
        recordReference: 'attempt.json',
      })
    )
    const result = await coordinatePresentationAttempts({
      prerequisiteStopReason: null,
      runAttempt,
    })
    expect(runAttempt).toHaveBeenCalledTimes(6)
    expect(
      result.records.slice(1).every((entry) => entry.finalStatus === 'failed')
    ).toBe(true)
  })
})
