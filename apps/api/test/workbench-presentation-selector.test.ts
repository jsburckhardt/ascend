import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  PRESENTATION_ASSERTION_IDS,
  PRESENTATION_VIEWPORT,
  type PresentationAttemptRecord,
  type PresentationCandidate,
} from '../src/workbench-presentation-contract.js'
import {
  attemptIsCompletePass,
  selectPresentation,
} from '../src/workbench-presentation-selector.js'

const passing = (
  candidate: PresentationCandidate,
  attempt: number,
  blocking = 0,
  warning = 0,
  elapsed = 100
): PresentationAttemptRecord => ({
  version: 1,
  candidate,
  attempt,
  runId: randomUUID(),
  chromiumVersion: '151',
  startStatus: 'started',
  finalStatus: 'passed',
  failedAssertions: [],
  timing: { navigationStartMs: 1000, scenarioCompletionMs: 1000 + elapsed },
  assertions: {
    functional: Object.fromEntries(
      PRESENTATION_ASSERTION_IDS.map((id) => [id, true])
    ) as PresentationAttemptRecord['assertions']['functional'],
    requiredEvidence: true,
    cleanup: true,
    integrity: true,
  },
  evidence: {
    rawBrowserEvents: 'events.json',
    terminalDirect: 'direct.json',
    terminalIntegrated: 'integrated.json',
  },
  warningCounts: { blocking, nonBlocking: warning },
  freshness: {
    workbenchRunId: randomUUID(),
    processPid: attempt + (candidate === 'embedded' ? 10 : 20),
    processGroup: attempt + (candidate === 'embedded' ? 10 : 20),
    browserContextId: candidate + String(attempt),
    disposableArea: candidate + String(attempt),
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
const three = (
  candidate: PresentationCandidate,
  options: { blocking?: number; warning?: number; elapsed?: number[] } = {}
) =>
  [1, 2, 3].map((attempt, index) =>
    passing(
      candidate,
      attempt,
      options.blocking ?? 0,
      options.warning ?? 0,
      options.elapsed?.[index] ?? 100
    )
  )

describe('BL-003 deterministic selector', () => {
  it.each([
    [
      'embedded only',
      [...three('embedded')],
      'embedded selected',
      'embedded',
      0,
    ],
    [
      'full-page only',
      [...three('full-page')],
      'full-page selected',
      'full-page',
      0,
    ],
    ['neither', [passing('embedded', 1)], 'no viable candidate', null, 1],
  ] as const)(
    'selects by eligibility: %s',
    (_name, records, disposition, selected, exitCode) => {
      expect(selectPresentation(records)).toMatchObject({
        disposition,
        selectedCandidate: selected,
        exitCode,
      })
    }
  )

  it('applies blocking, warning, then middle-value median tie-breakers in order', () => {
    expect(
      selectPresentation([
        ...three('embedded'),
        ...three('full-page', { blocking: 1 }),
      ]).selectedCandidate
    ).toBe('embedded')
    expect(
      selectPresentation([
        ...three('embedded', { blocking: 1 }),
        ...three('full-page', { blocking: 1, warning: 1 }),
      ]).selectedCandidate
    ).toBe('embedded')
    const median = selectPresentation([
      ...three('embedded', { elapsed: [40, 20, 30] }),
      ...three('full-page', { elapsed: [40, 35, 30] }),
    ])
    expect(median.selectedCandidate).toBe('embedded')
    expect(median.candidates.embedded.medianElapsedMs).toBe(30)
  })

  it('does not fall through to later measures after a strict earlier difference', () => {
    const result = selectPresentation([
      ...three('embedded', {
        blocking: 0,
        warning: 99,
        elapsed: [999, 999, 999],
      }),
      ...three('full-page', { blocking: 1, warning: 0, elapsed: [1, 1, 1] }),
    ])
    expect(result.selectedCandidate).toBe('embedded')
  })

  it('returns a nonzero selection tie when all measures are equal', () => {
    expect(
      selectPresentation([...three('embedded'), ...three('full-page')])
    ).toMatchObject({
      disposition: 'selection tie',
      selectedCandidate: null,
      exitCode: 1,
    })
  })

  it('makes missing artifacts, cleanup failures, and fewer than three passes ineligible', () => {
    const missing = three('embedded')
    missing[1].evidence.rawBrowserEvents = ''
    const cleanup = three('full-page')
    cleanup[2].cleanup.listenerAbsent = false
    expect(attemptIsCompletePass(missing[1])).toBe(false)
    expect(selectPresentation([...missing, ...cleanup]).disposition).toBe(
      'no viable candidate'
    )
  })

  it('selects an already-proven candidate after a later cleanup stop', () => {
    const partial = [...three('embedded'), passing('full-page', 1)]
    partial[3].finalStatus = 'failed'
    partial[3].cleanup.listenerAbsent = false
    expect(selectPresentation(partial).disposition).toBe('embedded selected')
  })
})
