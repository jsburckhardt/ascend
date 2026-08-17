/// <reference types="node" />
import { beforeAll, describe, expect, it } from 'vitest'

import {
  BL020_LATE_ACQUISITION_SEAMS,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
import {
  EDGE_MATRIX_SCENARIOS,
  lastEdgeMatrixExecution,
  lastS74Interruption,
  lastS74SignalAccounts,
  runEdgeMatrixRows,
} from './project-close-matrix-edge.js'
import { assertSharedRowConsistency } from './project-close-matrix-support.js'

const rowFor = (
  rows: readonly ProjectCloseEvidenceRow[],
  scenario: string
): ProjectCloseEvidenceRow => {
  const row = rows.find((candidate) => candidate.scenario === scenario)
  if (row === undefined)
    throw new Error('BL-020 edge matrix produced no row for ' + scenario)
  return row
}

describe('BL-020 edge close matrix', () => {
  let rows: readonly ProjectCloseEvidenceRow[] = []

  beforeAll(async () => {
    rows = await runEdgeMatrixRows()
    const execution = lastEdgeMatrixExecution()
    if (process.env.BL020_EDGE_REPORT !== '1' || execution === null) return
    for (const result of execution.results) {
      const settled = result.row.rejectionCategory ?? result.row.outcome
      // eslint-disable-next-line no-console
      console.info(
        [
          result.scenario,
          settled,
          'route ' + String(result.row.routeStatus),
          String(result.durationMs) + 'ms',
          result.observations.join(' | '),
        ].join(' :: ')
      )
    }
    // eslint-disable-next-line no-console
    console.info('edge matrix total ' + String(execution.durationMs) + 'ms')
  }, 1_800_000)

  it('executes the five edge scenarios in plan order', () => {
    expect(rows).toHaveLength(EDGE_MATRIX_SCENARIOS.length)
    expect(rows.map((row) => row.scenario)).toEqual([...EDGE_MATRIX_SCENARIOS])
    expect(new Set(rows.map((row) => row.scenario)).size).toBe(
      EDGE_MATRIX_SCENARIOS.length
    )
    expect(new Set(rows.map((row) => row.executionId)).size).toBe(rows.length)
  })

  it('satisfies the shared row rules for every executed row', () => {
    for (const row of rows) {
      const admittedBySite = row.preClaimSettlement === null
      expect(row.execution.claimInstalledAt !== null).toBe(admittedBySite)
      assertSharedRowConsistency(row, admittedBySite)
    }
  })

  it('creates and releases host resources in every row', () => {
    for (const row of rows) {
      expect(row.createdHostResources).toBe(true)
      const teardown = row.teardown
      expect(teardown).not.toBeNull()
      if (teardown === null) continue
      expect(teardown.attempted).toBe(true)
      expect(teardown.independentReobservation).toBe(true)
      for (const probe of Object.values(teardown.probes)) {
        expect(probe.probeCompleted).toBe(true)
        expect(probe.residual).toBe(0)
      }
    }
  })

  it('reports the stale-clearance witness on S-69 and S-70', () => {
    const stale = rowFor(rows, 'S-69')
    const held = rowFor(rows, 'S-70')
    // The one permitted re-drain ran in both, and only the row whose second
    // arrival was released before the deadline reached a second audit.
    expect(stale.execution.drainInvocations).toBe(2)
    expect(stale.execution.connectionAuditInvocations).toBe(2)
    expect(held.execution.drainInvocations).toBe(2)
    expect(held.execution.connectionAuditInvocations).toBe(1)
    expect(stale.outcome).toBe('closed')
    expect(held.outcome).toBe('rejected')
    expect(held.rejectionCategory).toBe('release-unconfirmed')
    for (const row of [stale, held]) {
      expect(row.execution.refusedAcquisitions).toHaveLength(1)
      for (const refusal of row.execution.refusedAcquisitions) {
        expect(refusal.settled).toBe(true)
        expect(refusal.classification).toBe('runtime-closing')
        expect(BL020_LATE_ACQUISITION_SEAMS).toContain(refusal.seam)
        expect(row.execution.productionPathsEntered).toContain(refusal.seam)
      }
      expect(
        row.managerAudit?.refusedLateAcquisitionsDelta ?? 0
      ).toBeGreaterThanOrEqual(1)
      // The refusal is never counted as the claim's own late work.
      expect(row.managerAudit?.claimLateWork).toBe(0)
    }
  })

  it('reports the two-record sweep witness on S-71', () => {
    const row = rowFor(rows, 'S-71')
    expect(row.outcome).toBe('closed')
    expect(row.declaredBound).toBe('B-8')
    expect(row.execution.ownershipCardinality).toEqual({
      frozen: 2,
      cap: 4,
      sweepUnits: 2,
      capExceeded: false,
    })
    expect(row.managerAudit?.quarantinedOwnershipRecords).toBe(0)
    expect(row.requiresQuarantineResolution).toBe(false)
  })

  it('reports the interruption, its boot branch, and the safe retry on S-74', () => {
    const row = rowFor(rows, 'S-74')
    const interruption = lastS74Interruption()
    const accounts = lastS74SignalAccounts()
    expect(interruption).not.toBeNull()
    expect(accounts).not.toBeNull()
    if (interruption === null || accounts === null) return
    expect(row.declaredBound).toBe('B-5')
    // Unconditional: no durable removal, a registration still present, and
    // zero signals delivered by the interrupted close itself.
    expect(interruption.removalReachedBeforeInterruption).toBe(false)
    expect(interruption.registrationAfterInterruption).toBe(true)
    expect(interruption.rebootRegistration).toBe(true)
    expect(accounts.interruptedClose).toBe(0)
    // The published state is the four-value projection the route publishes,
    // and `absent`/`Stopped` are unreachable while the survivor is alive.
    expect(interruption.candidateAliveAfterReboot).toBe(true)
    expect(interruption.rebootPublicState).not.toBe('Stopped')
    expect(interruption.rebootReconcileOutcome).not.toBe('absent')
    // The row agrees with the branch the recovery boundary's own record
    // settled, rather than with a branch this scenario forced.
    if (interruption.rebootReconcileOutcome === 'adopted') {
      expect(interruption.rebootPublicState).toBe('Running')
      expect(interruption.rebootAdoptedIdentity).toBe(
        interruption.candidateIdentity
      )
      expect(row.outcome).toBe('closed')
      expect(row.registrationAfter).toBeNull()
      expect(row.execution.confirmation).not.toBeNull()
      expect(accounts.safeRetry).toBe(1)
    } else {
      expect(interruption.rebootReconcileOutcome).toBe('unresolved')
      expect(interruption.rebootPublicState).toBe('Failed')
      expect(interruption.rebootRefusalReason).not.toBeNull()
      expect(row.outcome).toBe('rejected')
      expect(row.rejectionCategory).toBe('reconcile-unresolved')
      expect(accounts.safeRetry).toBe(0)
    }
  })

  it('reports the ownership-cardinality witness on S-75', () => {
    const row = rowFor(rows, 'S-75')
    expect(row.outcome).toBe('rejected')
    expect(row.rejectionCategory).toBe('ownership-cardinality-exceeded')
    expect(row.routeStatus).toBe(500)
    expect(row.execution.ownershipCardinality).toEqual({
      frozen: 5,
      cap: 4,
      sweepUnits: 1,
      capExceeded: true,
    })
    expect(row.execution.drainInvocations).toBe(0)
    expect(row.execution.connectionAuditInvocations).toBe(0)
    expect(row.execution.primitiveCalls.signal).toBe(0)
    expect(row.execution.primitiveCalls.terminate).toBe(0)
    expect(row.emittedEvents).toEqual([])
  })

  it('leaves every row with a zero teardown residual', () => {
    for (const row of rows)
      for (const probe of Object.values(row.teardown?.probes ?? {}))
        expect(probe.residual).toBe(0)
  })
})
