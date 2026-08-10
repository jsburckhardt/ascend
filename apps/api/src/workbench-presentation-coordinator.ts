import {
  PRESENTATION_PREREQUISITES,
  PRESENTATION_SLOTS,
  validateAttemptRecord,
  type ComparisonSlot,
  type PresentationAttemptRecord,
  type PresentationPrerequisite,
} from './workbench-presentation-contract.js'

export interface PrerequisiteResult {
  name: PresentationPrerequisite
  passed: boolean
  detail: string
}
export interface PrerequisiteCheckResult {
  results: PrerequisiteResult[]
  stopReason: string | null
}
export const checkPresentationPrerequisites = async (
  probe: (
    name: PresentationPrerequisite
  ) => Promise<{ passed: boolean; detail: string }>
): Promise<PrerequisiteCheckResult> => {
  const results: PrerequisiteResult[] = []
  for (const name of PRESENTATION_PREREQUISITES) {
    const result = await probe(name)
    results.push({ name, ...result })
    if (!result.passed)
      return { results, stopReason: 'prerequisite failure:' + name }
  }
  return { results, stopReason: null }
}

export interface AttemptExecution {
  record: PresentationAttemptRecord
  recordReference: string
}
export interface CoordinatedAttempts {
  slots: ComparisonSlot[]
  records: PresentationAttemptRecord[]
  stopReason: string | null
}

const cleanupPassed = (record: PresentationAttemptRecord): boolean =>
  Object.values(record.cleanup).every(Boolean)
const freshnessKey = (record: PresentationAttemptRecord): string =>
  [
    record.freshness.processPid,
    record.freshness.processGroup,
    record.freshness.browserContextId,
    record.freshness.disposableArea,
  ].join('|')

export const coordinatePresentationAttempts = async (options: {
  prerequisiteStopReason: string | null
  runAttempt: (slot: {
    candidate: 'embedded' | 'full-page'
    attempt: number
  }) => Promise<AttemptExecution>
}): Promise<CoordinatedAttempts> => {
  const slots: ComparisonSlot[] = PRESENTATION_SLOTS.map((slot) => ({
    ...slot,
    status: 'not started',
  }))
  const records: PresentationAttemptRecord[] = []
  if (options.prerequisiteStopReason)
    return { slots, records, stopReason: options.prerequisiteStopReason }

  const freshness = new Set<string>()
  let stopReason: string | null = null
  for (let index = 0; index < PRESENTATION_SLOTS.length; index += 1) {
    const slot = PRESENTATION_SLOTS[index]
    const execution = await options.runAttempt(slot)
    const record = validateAttemptRecord(execution.record)
    const key = freshnessKey(record)
    if (freshness.has(key) || !record.freshness.priorStateAbsent) {
      record.finalStatus = 'failed'
      record.assertions.requiredEvidence = false
      record.failedAssertions.push({
        id: 'browser-event-evidence',
        error: 'Attempt freshness evidence is not unique',
      })
    }
    freshness.add(key)
    records.push(record)
    slots[index] = {
      ...slot,
      status: 'started',
      runId: record.runId,
      recordReference: execution.recordReference,
    }
    if (!cleanupPassed(record)) {
      stopReason =
        'cleanup failure:' + slot.candidate + '/' + String(slot.attempt)
      break
    }
  }
  return { slots, records, stopReason }
}
