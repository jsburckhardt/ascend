import {
  PRESENTATION_CANDIDATES,
  attemptArtifactFilesReadable,
  middleIntegerMedian,
  type CandidateComparison,
  type PresentationAttemptRecord,
  type PresentationCandidate,
  type PresentationDisposition,
} from './workbench-presentation-contract.js'

export interface PresentationSelection {
  candidates: Record<PresentationCandidate, CandidateComparison>
  selectedCandidate: PresentationCandidate | null
  disposition: PresentationDisposition
  exitCode: 0 | 1
}
const allTrue = (value: Record<string, boolean>): boolean =>
  Object.values(value).every(Boolean)
export const attemptIsCompletePass = (
  record: PresentationAttemptRecord
): boolean =>
  record.finalStatus === 'passed' &&
  record.failedAssertions.length === 0 &&
  allTrue(record.assertions.functional) &&
  record.assertions.requiredEvidence &&
  record.assertions.cleanup &&
  record.assertions.integrity &&
  Object.values(record.cleanup).every(Boolean) &&
  Object.values(record.integrity).every(Boolean) &&
  attemptArtifactFilesReadable(record) &&
  Boolean(
    record.evidence.rawBrowserEvents &&
    record.evidence.terminalDirect &&
    record.evidence.terminalIntegrated
  ) &&
  record.timing.navigationStartMs !== null &&
  record.timing.scenarioCompletionMs !== null &&
  record.timing.scenarioCompletionMs >= record.timing.navigationStartMs

const aggregate = (
  candidate: PresentationCandidate,
  records: readonly PresentationAttemptRecord[]
): CandidateComparison => {
  const candidateRecords = records.filter(
    (record) => record.candidate === candidate
  )
  const ordered = [1, 2, 3].map((attempt) =>
    candidateRecords.find((record) => record.attempt === attempt)
  )
  const eligible = ordered.every(
    (record) => record !== undefined && attemptIsCompletePass(record)
  )
  const elapsedMs = eligible
    ? ordered.map(
        (record) =>
          record!.timing.scenarioCompletionMs! -
          record!.timing.navigationStartMs!
      )
    : []
  return {
    eligible,
    blockingCount: candidateRecords.reduce(
      (total, record) => total + record.warningCounts.blocking,
      0
    ),
    nonBlockingCount: candidateRecords.reduce(
      (total, record) => total + record.warningCounts.nonBlocking,
      0
    ),
    elapsedMs,
    medianElapsedMs: eligible ? middleIntegerMedian(elapsedMs) : null,
  }
}
export const selectPresentation = (
  records: readonly PresentationAttemptRecord[]
): PresentationSelection => {
  const candidates = Object.fromEntries(
    PRESENTATION_CANDIDATES.map((candidate) => [
      candidate,
      aggregate(candidate, records),
    ])
  ) as Record<PresentationCandidate, CandidateComparison>
  const embedded = candidates.embedded
  const fullPage = candidates['full-page']
  let selectedCandidate: PresentationCandidate | null = null
  if (embedded.eligible && !fullPage.eligible) selectedCandidate = 'embedded'
  else if (!embedded.eligible && fullPage.eligible)
    selectedCandidate = 'full-page'
  else if (embedded.eligible && fullPage.eligible) {
    const measures: Array<[number, number]> = [
      [embedded.blockingCount, fullPage.blockingCount],
      [embedded.nonBlockingCount, fullPage.nonBlockingCount],
      [embedded.medianElapsedMs!, fullPage.medianElapsedMs!],
    ]
    for (const [left, right] of measures) {
      if (left === right) continue
      selectedCandidate = left < right ? 'embedded' : 'full-page'
      break
    }
  }
  const disposition: PresentationDisposition = selectedCandidate
    ? ((selectedCandidate + ' selected') as PresentationDisposition)
    : embedded.eligible && fullPage.eligible
      ? 'selection tie'
      : 'no viable candidate'
  return {
    candidates,
    selectedCandidate,
    disposition,
    exitCode: selectedCandidate ? 0 : 1,
  }
}
