/// <reference types="node" />
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BL018_SCENARIOS,
  serializeRuntimeRestartMatrix,
  validateRuntimeRestartMatrix,
  type RuntimeRestartMatrix,
} from '../src/runtime-restart-evidence.js'
import {
  buildRuntimeRestartMatrix,
  DISPOSABLE_MATRIX_PATH,
  RETAINED_MATRIX_PATH,
} from './runtime-restart-fixtures.js'

const MATRIX_TIMEOUT_MS = 600_000

describe('BL-018 executed runtime restart matrix', () => {
  it(
    'executes all 64 catalog scenarios and retains byte-stable evidence',
    async () => {
      const matrix = await buildRuntimeRestartMatrix()
      expect(matrix.rows).toHaveLength(BL018_SCENARIOS.length)
      expect(matrix.rows.map(({ scenario }) => scenario)).toEqual([
        ...BL018_SCENARIOS,
      ])
      // Every row carries at least one executed assertion or probe.
      for (const row of matrix.rows)
        expect(row.assertionCount).toBeGreaterThan(0)

      const report = validateRuntimeRestartMatrix(matrix)
      expect(report.violations).toEqual([])
      expect(report.accepted).toBe(true)

      const serialized = serializeRuntimeRestartMatrix(matrix)
      expect(serializeRuntimeRestartMatrix(matrix)).toBe(serialized)
      const reparsed = JSON.parse(serialized) as RuntimeRestartMatrix
      expect(validateRuntimeRestartMatrix(reparsed).violations).toEqual([])
      expect(serializeRuntimeRestartMatrix(reparsed)).toBe(serialized)

      await mkdir(path.dirname(DISPOSABLE_MATRIX_PATH), { recursive: true })
      await writeFile(DISPOSABLE_MATRIX_PATH, serialized)

      const retained = await readFile(RETAINED_MATRIX_PATH, 'utf8')
      const retainedMatrix = JSON.parse(retained) as RuntimeRestartMatrix
      expect(validateRuntimeRestartMatrix(retainedMatrix).violations).toEqual(
        []
      )
      // The committed artifact reserializes byte-identically.
      expect(serializeRuntimeRestartMatrix(retainedMatrix)).toBe(retained)
      expect(retained).toBe(serialized)
    },
    MATRIX_TIMEOUT_MS
  )
})
