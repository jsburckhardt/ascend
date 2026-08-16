import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BL019_SCENARIOS,
  serializeRuntimeReconcileMatrix,
  validateRuntimeReconcileMatrix,
  validateSelectedReconcileSource,
  type SelectedReconcileSources,
} from '../src/runtime-reconcile-evidence.js'
import { buildRuntimeReconcileMatrix } from './runtime-reconcile-fixtures.js'

const root = path.resolve(import.meta.dirname, '../../..')
const committed = path.join(
  root,
  'project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence/runtime-reconcile-matrix.json'
)
const working = path.join(
  root,
  'test-results/bl-019/runtime-reconcile-matrix.json'
)

const source = (relative: string): Promise<string> =>
  readFile(path.join(root, relative), 'utf8')

const selectedSources = async (): Promise<SelectedReconcileSources> => {
  const [
    contract,
    process_,
    manager,
    app,
    stopRoute,
    restartRoute,
    workbenchContract,
    webState,
    webStop,
    webRestart,
    matrixFixtures,
    designated,
    controlWitness,
  ] = await Promise.all([
    source('apps/api/src/project-runtime-contract.ts'),
    source('apps/api/src/project-runtime-process.ts'),
    source('apps/api/src/project-runtime-manager.ts'),
    source('apps/api/src/app.ts'),
    source('apps/api/src/routes/project-runtime-stop.ts'),
    source('apps/api/src/routes/project-runtime-restart.ts'),
    source('apps/api/src/workbench-proxy-contract.ts'),
    source('apps/web/src/runtime-state.ts'),
    source('apps/web/src/runtime-stop.ts'),
    source('apps/web/src/runtime-restart.ts'),
    source('apps/api/test/runtime-reconcile-fixtures.ts'),
    source('apps/api/test/runtime-reconcile-designated.test.ts'),
    source('apps/api/test/runtime-reconcile-control-witness.ts'),
  ])
  return {
    contract,
    process: process_,
    manager,
    app,
    stopRoute,
    restartRoute,
    workbenchContract,
    webState,
    webStop,
    webRestart,
    matrixFixtures,
    designated,
    controlWitness,
  }
}

describe('BL-019 deterministic runtime reconciliation matrix', () => {
  it('emits and validates all sixty-six rows byte-identically', async () => {
    const matrix = await buildRuntimeReconcileMatrix()
    const serialized = serializeRuntimeReconcileMatrix(matrix)
    await mkdir(path.dirname(working), { recursive: true })
    await writeFile(working, serialized)
    expect(matrix.rows.map(({ id }) => id)).toEqual(BL019_SCENARIOS)
    expect(validateRuntimeReconcileMatrix(matrix)).toEqual({
      accepted: true,
      violations: [],
    })
    expect(validateSelectedReconcileSource(await selectedSources())).toEqual({
      accepted: true,
      violations: [],
    })
    await mkdir(path.dirname(working), { recursive: true })
    await writeFile(working, serialized)
    if (process.env.BL019_UPDATE === '1') {
      await mkdir(path.dirname(committed), { recursive: true })
      await writeFile(committed, serialized)
    }
    expect(await readFile(committed, 'utf8')).toBe(serialized)
    expect(createHash('sha256').update(serialized).digest('hex')).toMatch(
      /^[a-f0-9]{64}$/u
    )
  })
})
