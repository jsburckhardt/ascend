import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  PRESENTATION_ASSERTION_IDS,
  PRESENTATION_CANDIDATES,
  PRESENTATION_DISPOSITIONS,
  PRESENTATION_PREREQUISITES,
  PRESENTATION_SLOTS,
  PRESENTATION_VIEWPORT,
  middleIntegerMedian,
  validateAttemptRecord,
  validateComparisonRecord,
  type PresentationAttemptRecord,
  type PresentationComparisonRecord,
} from '../src/workbench-presentation-contract.js'

const allAssertions = Object.fromEntries(
  PRESENTATION_ASSERTION_IDS.map((id) => [id, true])
) as PresentationAttemptRecord['assertions']['functional']
const attemptRecord = (): PresentationAttemptRecord => ({
  version: 1,
  candidate: 'embedded',
  attempt: 1,
  runId: randomUUID(),
  chromiumVersion: '151.0.7922.34',
  startStatus: 'started',
  finalStatus: 'passed',
  failedAssertions: [],
  timing: { navigationStartMs: 100, scenarioCompletionMs: 200 },
  assertions: {
    functional: allAssertions,
    requiredEvidence: true,
    cleanup: true,
    integrity: true,
  },
  evidence: {
    rawBrowserEvents: 'package.json',
    terminalDirect: 'package.json',
    terminalIntegrated: 'package.json',
  },
  warningCounts: { blocking: 0, nonBlocking: 1 },
  freshness: {
    workbenchRunId: randomUUID(),
    processPid: 100,
    processGroup: 100,
    browserContextId: 'context-1',
    disposableArea: 'disposable-1',
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
    fixture: 'tests/fixtures/bl-001/workbench project;BL-001',
    codeServerVersion: '4.131.0',
    chromiumName: 'chromium',
    chromiumVersion: '151.0.7922.34',
    viewport: PRESENTATION_VIEWPORT,
  },
})
const comparisonRecord = (): PresentationComparisonRecord => ({
  version: 1,
  comparisonId: randomUUID(),
  prerequisites: PRESENTATION_PREREQUISITES.map((name) => ({
    name,
    passed: true,
    detail: 'passed',
  })),
  host: {
    ubuntuVersion: 'Ubuntu 24.04.4 LTS',
    hostname: 'host',
    user: 'vscode',
    chromiumName: 'chromium',
    chromiumVersion: '151.0.7922.34',
    codeServerVersion: '4.131.0',
    viewport: PRESENTATION_VIEWPORT,
  },
  slots: PRESENTATION_SLOTS.map((slot) => ({
    ...slot,
    status: 'started',
    runId: randomUUID(),
    recordReference: 'attempt.json',
  })),
  candidates: {
    embedded: {
      eligible: true,
      blockingCount: 0,
      nonBlockingCount: 0,
      elapsedMs: [10, 30, 20],
      medianElapsedMs: 20,
    },
    'full-page': {
      eligible: false,
      blockingCount: 0,
      nonBlockingCount: 0,
      elapsedMs: [],
      medianElapsedMs: null,
    },
  },
  stopReason: null,
  selectedCandidate: 'embedded',
  disposition: 'embedded selected',
})

describe('BL-003 comparison contracts', () => {
  it('pins exactly two candidates, six slots, ordered prerequisites, viewport, assertions, and dispositions', () => {
    expect(PRESENTATION_CANDIDATES).toEqual(['embedded', 'full-page'])
    expect(PRESENTATION_SLOTS).toEqual([
      { candidate: 'embedded', attempt: 1 },
      { candidate: 'embedded', attempt: 2 },
      { candidate: 'embedded', attempt: 3 },
      { candidate: 'full-page', attempt: 1 },
      { candidate: 'full-page', attempt: 2 },
      { candidate: 'full-page', attempt: 3 },
    ])
    expect(PRESENTATION_PREREQUISITES).toEqual([
      'ubuntu-24.04',
      'non-root-vscode-user',
      'merged-bl-001-bl-002-proof',
      'code-server-4.131.0',
      'repository-chromium-desktop-build',
      'viewport-1440x900',
    ])
    expect(PRESENTATION_VIEWPORT).toEqual({ width: 1440, height: 900 })
    expect(PRESENTATION_ASSERTION_IDS).toHaveLength(23)
    expect(PRESENTATION_DISPOSITIONS).toEqual([
      'embedded selected',
      'full-page selected',
      'selection tie',
      'no viable candidate',
    ])
  })

  it('validates complete attempt and comparison records', () => {
    expect(validateAttemptRecord(attemptRecord()).finalStatus).toBe('passed')
    expect(validateComparisonRecord(comparisonRecord()).disposition).toBe(
      'embedded selected'
    )
    expect(middleIntegerMedian([30, 10, 20])).toBe(20)
  })

  it('rejects missing artifacts, fabricated not-started IDs, malformed medians, unknown dispositions, and clipboard content', () => {
    const missing = attemptRecord()
    missing.evidence.rawBrowserEvents = ''
    expect(() => validateAttemptRecord(missing)).toThrow('artifact')

    const absent = attemptRecord()
    absent.evidence.rawBrowserEvents =
      'test-results/bl-003/raw/absent/browser-events.json'
    expect(() => validateAttemptRecord(absent)).toThrow('not readable')

    const clipboard = { ...attemptRecord(), clipboardToken: 'secret' }
    expect(() => validateAttemptRecord(clipboard)).toThrow('Clipboard')

    const fabricated = comparisonRecord()
    fabricated.slots[4] = {
      candidate: 'full-page',
      attempt: 2,
      status: 'not started',
      runId: randomUUID(),
    }
    expect(() => validateComparisonRecord(fabricated)).toThrow('fabricated')

    const median = comparisonRecord()
    median.candidates.embedded.medianElapsedMs = 30
    expect(() => validateComparisonRecord(median)).toThrow('median')

    const disposition = comparisonRecord() as PresentationComparisonRecord & {
      disposition: string
    }
    disposition.disposition = 'preferred'
    expect(() => validateComparisonRecord(disposition)).toThrow('disposition')
  })
})
