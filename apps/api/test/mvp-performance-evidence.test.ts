import { describe, expect, it } from 'vitest'
import type { IntegratedCapacityRecord } from '../src/mvp-performance-capacity.js'
import type { MvpSummary } from '../src/mvp-performance-contract.js'
import { renderMvpComparison } from '../src/mvp-performance-evidence.js'

const summary = (measured: boolean, approved: boolean): MvpSummary => ({
  schemaVersion: 1,
  runId: 'run',
  planHash: 'plan',
  measurementHash: 'measurement',
  completedAt: '2026-08-13T12:00:00.000Z',
  cold: {
    orderedAttemptIds: [],
    sortedSourceAttemptIds: [],
    sourceDurationsNs: [],
    medianNs: measured ? '1000000' : null,
    p95Ns: measured ? '2000000' : null,
    maximumNs: measured ? '3000000' : null,
    failures: 0,
    preStartFailures: 0,
    identityChanges: 0,
    targetMisses: 0,
  },
  warm: {
    orderedAttemptIds: [],
    sortedSourceAttemptIds: [],
    sourceDurationsNs: [],
    medianNs: measured ? '4000000' : null,
    p95Ns: measured ? '5000000' : null,
    maximumNs: measured ? '6000000' : null,
    failures: 1,
    preStartFailures: 0,
    identityChanges: 0,
    targetMisses: 1,
  },
  continuity: { successes: 3, total: 3, metric2: 1, disposition: 'met' },
  capacity: [],
  metrics: {
    nfr002Metric4: 'met',
    nfr001Metric3: 'blocker',
    continuityMetric2: 'met',
    nfr003Capacity3: 'met',
  },
  overallDisposition: 'blocker',
  approval: approved
    ? {
        approver: 'owner',
        reason: 'reason',
        risk: 'risk',
        followUpBacklogId: 'BL-999',
        evidenceHash: 'measurement',
        createdAt: '2026-08-13T12:00:01.000Z',
      }
    : null,
})
const capacity = {
  comparison: [
    {
      cohort: 3,
      classification: 'comparable',
      reason: 'same method',
      baseline: 'base',
      observed: 'observed',
    },
  ],
} as IntegratedCapacityRecord

describe('BL-015 comparison rendering', () => {
  it('renders measured values and external approval', () => {
    const result = renderMvpComparison(summary(true, true), capacity)
    expect(result).toContain('1.000')
    expect(result).toContain('external retained approval applied')
  })
  it('renders unavailable values and default blocker treatment', () => {
    const result = renderMvpComparison(summary(false, false), capacity)
    expect(result).toContain('n/a')
    expect(result).toContain('misses remain blockers')
  })
})
