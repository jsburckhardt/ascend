import path from 'node:path'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

export const PRESENTATION_CANDIDATES = ['embedded', 'full-page'] as const
export type PresentationCandidate = (typeof PRESENTATION_CANDIDATES)[number]
export interface PresentationSlot {
  candidate: PresentationCandidate
  attempt: number
}
export const PRESENTATION_SLOTS: readonly PresentationSlot[] =
  PRESENTATION_CANDIDATES.flatMap((candidate) =>
    [1, 2, 3].map((attempt) => ({ candidate, attempt }))
  )
export const PRESENTATION_VIEWPORT = { width: 1440, height: 900 } as const
export const PRESENTATION_PREREQUISITES = [
  'ubuntu-24.04',
  'non-root-vscode-user',
  'merged-bl-001-bl-002-proof',
  'code-server-4.131.0',
  'repository-chromium-desktop-build',
  'viewport-1440x900',
] as const
export type PresentationPrerequisite =
  (typeof PRESENTATION_PREREQUISITES)[number]
export const PRESENTATION_ASSERTION_IDS = [
  'document-navigation',
  'explorer-sentinel',
  'markdown-open',
  'preview-rendered',
  'keyboard-explorer-focus',
  'keyboard-preview-enter',
  'keyboard-preview-leave',
  'terminal-open',
  'clipboard-round-trip',
  'terminal-identity-parity',
  'terminal-path-parity',
  'terminal-tool-parity',
  'workbench-websocket-usable',
  'browser-event-evidence',
  'fixture-tree-integrity',
  'fixture-sentinel-integrity',
  'cleanup-context',
  'cleanup-terminal-commands',
  'cleanup-process-group',
  'cleanup-process',
  'cleanup-listener',
  'cleanup-disposable',
  'cleanup-fixture-present',
] as const
export type PresentationAssertionId =
  (typeof PRESENTATION_ASSERTION_IDS)[number]
export const PRESENTATION_DISPOSITIONS = [
  'embedded selected',
  'full-page selected',
  'selection tie',
  'no viable candidate',
] as const
export type PresentationDisposition = (typeof PRESENTATION_DISPOSITIONS)[number]
export const WORKBENCH_PRESENTATION_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'project/work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence'
)
export const WORKBENCH_PRESENTATION_COMPARISON = path.join(
  WORKBENCH_PRESENTATION_EVIDENCE_ROOT,
  'comparison.json'
)
export const WORKBENCH_PRESENTATION_GENERATED_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-003'
)

export type BrowserEventKind =
  | 'response'
  | 'request-failed'
  | 'console'
  | 'page-error'
  | 'websocket-open'
  | 'websocket-error'
  | 'websocket-close'
export interface RawBrowserEvent {
  sequence: number
  monotonicMs: number
  kind: BrowserEventKind
  url: string | null
  detail: string
  status: number | null
  blocking: boolean
  nonBlockingWarning: boolean
}
export interface AttemptAssertions {
  functional: Record<PresentationAssertionId, boolean>
  requiredEvidence: boolean
  cleanup: boolean
  integrity: boolean
}
export interface AttemptCleanup {
  browserContextClosed: boolean
  terminalCommandsAbsent: boolean
  processGroupAbsent: boolean
  exactProcessAbsent: boolean
  listenerAbsent: boolean
  disposableRemoved: boolean
  fixturePresentUnchanged: boolean
}
export interface AttemptIntegrity {
  fixturePresent: boolean
  treeMembershipEqual: boolean
  sentinelBytesEqual: boolean
}
export interface PresentationAttemptRecord {
  version: 1
  candidate: PresentationCandidate
  attempt: number
  runId: string
  chromiumVersion: string
  startStatus: 'started'
  finalStatus: 'passed' | 'failed'
  failedAssertions: Array<{ id: PresentationAssertionId; error: string }>
  timing: {
    navigationStartMs: number | null
    scenarioCompletionMs: number | null
  }
  assertions: AttemptAssertions
  evidence: {
    rawBrowserEvents: string
    terminalDirect: string
    terminalIntegrated: string
  }
  warningCounts: { blocking: number; nonBlocking: number }
  freshness: {
    workbenchRunId: string
    processPid: number
    processGroup: number
    browserContextId: string
    disposableArea: string
    priorStateAbsent: boolean
  }
  cleanup: AttemptCleanup
  integrity: AttemptIntegrity
  sharedInputs: {
    fixture: string
    codeServerVersion: string
    chromiumName: 'chromium'
    chromiumVersion: string
    viewport: typeof PRESENTATION_VIEWPORT
  }
}
export interface ComparisonSlot {
  candidate: PresentationCandidate
  attempt: number
  status: 'started' | 'not started'
  runId?: string
  recordReference?: string
}
export interface CandidateComparison {
  eligible: boolean
  blockingCount: number
  nonBlockingCount: number
  elapsedMs: number[]
  medianElapsedMs: number | null
}
export interface PresentationComparisonRecord {
  version: 1
  comparisonId: string
  prerequisites: Array<{
    name: PresentationPrerequisite
    passed: boolean
    detail: string
  }>
  host: {
    ubuntuVersion: string
    hostname: string
    user: string
    chromiumName: 'chromium'
    chromiumVersion: string
    codeServerVersion: string
    viewport: typeof PRESENTATION_VIEWPORT
  }
  slots: ComparisonSlot[]
  candidates: Record<PresentationCandidate, CandidateComparison>
  stopReason: string | null
  selectedCandidate: PresentationCandidate | null
  disposition: PresentationDisposition
}

const isCandidate = (value: unknown): value is PresentationCandidate =>
  PRESENTATION_CANDIDATES.includes(value as PresentationCandidate)
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value
  )
export const middleIntegerMedian = (values: readonly number[]): number => {
  if (
    values.length !== 3 ||
    values.some((value) => !Number.isInteger(value) || value < 0)
  )
    throw new Error('Median requires exactly three non-negative integers')
  return [...values].sort((left, right) => left - right)[1]
}
export const validateAttemptRecord = (
  value: unknown
): PresentationAttemptRecord => {
  if (!value || typeof value !== 'object')
    throw new Error('Attempt record must be an object')
  const record = value as Partial<PresentationAttemptRecord>
  if (
    record.version !== 1 ||
    !isCandidate(record.candidate) ||
    ![1, 2, 3].includes(record.attempt ?? 0) ||
    !isUuid(record.runId)
  )
    throw new Error('Attempt identity is invalid')
  if (
    record.startStatus !== 'started' ||
    !['passed', 'failed'].includes(record.finalStatus ?? '')
  )
    throw new Error('Attempt status is invalid')
  if (
    !record.chromiumVersion ||
    !record.assertions ||
    !record.evidence ||
    !record.cleanup ||
    !record.integrity ||
    !record.warningCounts ||
    !record.freshness ||
    !record.timing ||
    !record.sharedInputs
  )
    throw new Error('Attempt required evidence is missing')
  if (
    !record.evidence.rawBrowserEvents ||
    !record.evidence.terminalDirect ||
    !record.evidence.terminalIntegrated
  )
    throw new Error('Attempt artifact reference is missing')
  if (
    record.sharedInputs.viewport.width !== 1440 ||
    record.sharedInputs.viewport.height !== 900
  )
    throw new Error('Attempt viewport is invalid')
  if (
    Object.keys(record).some((key) => /clipboard.*(token|content)/iu.test(key))
  )
    throw new Error('Clipboard content must not be retained')
  return record as PresentationAttemptRecord
}
export const validateComparisonRecord = (
  value: unknown
): PresentationComparisonRecord => {
  if (!value || typeof value !== 'object')
    throw new Error('Comparison record must be an object')
  const record = value as Partial<PresentationComparisonRecord>
  if (record.version !== 1 || !isUuid(record.comparisonId))
    throw new Error('Comparison identity is invalid')
  if (!record.slots || record.slots.length !== PRESENTATION_SLOTS.length)
    throw new Error('Comparison must contain exactly six slots')
  record.slots.forEach((slot, index) => {
    const expected = PRESENTATION_SLOTS[index]
    if (
      slot.candidate !== expected.candidate ||
      slot.attempt !== expected.attempt
    )
      throw new Error('Comparison slot order is invalid')
    if (slot.status === 'not started' && (slot.runId || slot.recordReference))
      throw new Error('Not-started slots cannot have fabricated evidence')
    if (
      slot.status === 'started' &&
      (!isUuid(slot.runId) || !slot.recordReference)
    )
      throw new Error('Started slot evidence is incomplete')
  })
  if (
    !record.host ||
    record.host.viewport.width !== 1440 ||
    record.host.viewport.height !== 900 ||
    !record.candidates
  )
    throw new Error('Comparison facts are invalid')
  if (
    !PRESENTATION_DISPOSITIONS.includes(
      record.disposition as PresentationDisposition
    )
  )
    throw new Error('Comparison disposition is invalid')
  for (const candidate of PRESENTATION_CANDIDATES) {
    const result = record.candidates[candidate]
    if (!result) throw new Error('Candidate comparison is missing')
    if (result.eligible) {
      if (
        result.elapsedMs.length !== 3 ||
        result.medianElapsedMs !== middleIntegerMedian(result.elapsedMs)
      )
        throw new Error('Eligible candidate median is invalid')
    } else if (result.medianElapsedMs !== null)
      throw new Error('Ineligible candidate cannot have a median')
  }
  return record as PresentationComparisonRecord
}
