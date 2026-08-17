/// <reference types="node" />
import { beforeAll, describe, expect, it } from 'vitest'

import type { ProjectCloseEvidenceRow } from '../src/project-close-evidence.js'
import {
  WEB_MATRIX_SCENARIOS,
  lastWebMatrixExecution,
  runWebMatrixRows,
} from './project-close-matrix-web.js'
import { assertSharedRowConsistency } from './project-close-matrix-support.js'

/**
 * The companion API executions of the ten scenarios the rendered component
 * lane owns. Each row is a real close world of its own; the rendered receipt
 * is joined to it, never substituted for it.
 *
 * The web component matrix must have been executed before this suite runs:
 * its artifact is read here and a stale or absent one fails loudly.
 */
describe('BL-020 web companion close matrix', () => {
  let rows: readonly ProjectCloseEvidenceRow[] = []

  beforeAll(async () => {
    rows = await runWebMatrixRows()
    const execution = lastWebMatrixExecution()
    if (process.env.BL020_WEB_REPORT !== '1' || execution === null) return
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
    console.info('web matrix total ' + String(execution.durationMs) + 'ms')
  }, 900_000)

  it('executes the ten companion scenarios in plan order', () => {
    expect(rows).toHaveLength(WEB_MATRIX_SCENARIOS.length)
    expect(rows.map((row) => row.scenario)).toEqual([...WEB_MATRIX_SCENARIOS])
    expect(new Set(rows.map((row) => row.executionId)).size).toBe(rows.length)
  })

  it('satisfies the shared row rules for every executed row', () => {
    for (const row of rows) {
      const admittedBySite = row.preClaimSettlement === null
      expect(row.execution.claimInstalledAt !== null).toBe(admittedBySite)
      assertSharedRowConsistency(row, admittedBySite)
    }
  })

  it('joins one distinct rendered receipt to each row', () => {
    const execution = lastWebMatrixExecution()
    expect(execution).not.toBeNull()
    if (execution === null) return
    const receipts = rows.map((row) => row.componentWitness)
    expect(receipts.every((witness) => witness !== null)).toBe(true)
    expect(new Set(receipts.map((witness) => witness?.executionId)).size).toBe(
      rows.length
    )
    for (const row of rows) {
      expect(row.componentWitness?.scenario).toBe(row.scenario)
      expect(row.componentWitness?.runId).toBe(execution.artifact.runId)
      expect(row.componentWitness?.allPassed).toBe(true)
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
