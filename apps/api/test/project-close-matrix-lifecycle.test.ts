/// <reference types="node" />
import { beforeAll, describe, expect, it } from 'vitest'

import type { ProjectCloseEvidenceRow } from '../src/project-close-evidence.js'
import {
  LIFECYCLE_MATRIX_SCENARIOS,
  lastLifecycleMatrixExecution,
  runLifecycleMatrixRows,
} from './project-close-matrix-lifecycle.js'
import { assertSharedRowConsistency } from './project-close-matrix-support.js'

describe('BL-020 lifecycle close matrix', () => {
  let rows: readonly ProjectCloseEvidenceRow[] = []

  beforeAll(async () => {
    rows = await runLifecycleMatrixRows()
    const execution = lastLifecycleMatrixExecution()
    if (process.env.BL020_LIFECYCLE_REPORT !== '1' || execution === null) return
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
    console.info(
      'lifecycle matrix total ' + String(execution.durationMs) + 'ms'
    )
  }, 1_800_000)

  it('executes the twenty-seven lifecycle scenarios in plan order', () => {
    expect(rows).toHaveLength(LIFECYCLE_MATRIX_SCENARIOS.length)
    expect(rows.map((row) => row.scenario)).toEqual([
      ...LIFECYCLE_MATRIX_SCENARIOS,
    ])
    expect(new Set(rows.map((row) => row.scenario)).size).toBe(
      LIFECYCLE_MATRIX_SCENARIOS.length
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
})
