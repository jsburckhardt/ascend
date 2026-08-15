/// <reference types="node" />
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BL017_SCENARIOS,
  serializeRuntimeStopMatrix,
  validateRuntimeStopMatrix,
  type RuntimeStopMatrix,
} from '../src/runtime-stop-evidence.js'
import {
  DISPOSABLE_MATRIX_PATH,
  DISPOSABLE_TIMING_PATH,
  RETAINED_MATRIX_PATH,
  buildRuntimeStopMatrix,
  digest,
} from './runtime-stop-fixtures.js'

const readIfPresent = async (target: string): Promise<string | null> =>
  readFile(target, 'utf8').then(
    (content) => content,
    () => null
  )

describe('BL-017 runtime stop acceptance matrix', () => {
  it('declares the fixed thirty-one scenario catalog in plan order', () => {
    expect(BL017_SCENARIOS).toHaveLength(31)
    expect(new Set(BL017_SCENARIOS).size).toBe(31)
  })

  it('keeps the committed evidence valid, ordered, and byte-identical', async () => {
    const retained = await readIfPresent(RETAINED_MATRIX_PATH)
    expect(retained, 'committed matrix is missing').not.toBeNull()
    const matrix = JSON.parse(retained!) as RuntimeStopMatrix
    expect(matrix.rows.map(({ scenario }) => scenario)).toEqual([
      ...BL017_SCENARIOS,
    ])
    expect(validateRuntimeStopMatrix(matrix)).toEqual({
      accepted: true,
      violations: [],
    })
    expect(serializeRuntimeStopMatrix(matrix)).toBe(retained)
  })

  const acceptance = process.env.BL017_ACCEPTANCE === '1' ? it : it.skip
  acceptance(
    'executes every scenario and revalidates byte-identical evidence',
    async () => {
      const { matrix, timings } = await buildRuntimeStopMatrix()
      expect(matrix.rows.map(({ scenario }) => scenario)).toEqual([
        ...BL017_SCENARIOS,
      ])
      expect(validateRuntimeStopMatrix(matrix)).toEqual({
        accepted: true,
        violations: [],
      })
      expect(timings.map(({ scenario }) => scenario)).toEqual([
        ...BL017_SCENARIOS,
      ])
      expect(timings.every(({ withinBound }) => withinBound)).toBe(true)

      const serialized = serializeRuntimeStopMatrix(matrix)
      expect(serializeRuntimeStopMatrix(matrix)).toBe(serialized)
      const committed = await readIfPresent(RETAINED_MATRIX_PATH)
      if (committed !== null) expect(serialized).toBe(committed)

      await mkdir(path.dirname(DISPOSABLE_MATRIX_PATH), { recursive: true })
      await mkdir(path.dirname(RETAINED_MATRIX_PATH), { recursive: true })
      await Promise.all([
        writeFile(DISPOSABLE_MATRIX_PATH, serialized),
        writeFile(RETAINED_MATRIX_PATH, serialized),
        writeFile(
          DISPOSABLE_TIMING_PATH,
          JSON.stringify(
            {
              schemaVersion: 1,
              declaredBounds: matrix.declaredBounds,
              scenarios: timings,
            },
            null,
            2
          ) + '\n'
        ),
      ])

      const [disposable, retained] = await Promise.all([
        readFile(DISPOSABLE_MATRIX_PATH, 'utf8'),
        readFile(RETAINED_MATRIX_PATH, 'utf8'),
      ])
      expect(digest(disposable)).toBe(digest(retained))
      expect(disposable).toBe(retained)
      const retainedMatrix = JSON.parse(retained) as RuntimeStopMatrix
      expect(validateRuntimeStopMatrix(retainedMatrix)).toEqual({
        accepted: true,
        violations: [],
      })
      expect(serializeRuntimeStopMatrix(retainedMatrix)).toBe(retained)
    },
    120_000
  )
})
