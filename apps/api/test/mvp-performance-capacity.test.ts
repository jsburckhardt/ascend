import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MVP_CAPACITY_COHORTS } from '../src/mvp-performance-contract.js'
import {
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
} from '../src/workbench-capacity-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

describe('BL-015 integrated capacity method', () => {
  it('reuses exact BL-004 probe, offsets, workload, units, and completeness inputs for fresh 3/5/10', async () => {
    expect(MVP_CAPACITY_COHORTS).toEqual([3, 5, 10])
    expect(CAPACITY_PROBE).toEqual({
      executable: '/usr/bin/true',
      args: [],
      command: '/usr/bin/true',
      timeoutMs: 1000,
    })
    expect(CAPACITY_SAMPLE_OFFSETS_MS).toEqual([0, 1000, 2000, 3000, 4000])
    expect(CAPACITY_WORKLOAD_DURATION_MS).toBe(7000)
    expect(CAPACITY_WORKLOAD_TIMEOUT_MS).toBe(10000)
    expect(CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES).toBe(4096)
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'apps/api/src/mvp-performance-capacity.ts'),
      'utf8'
    )
    for (const value of [
      'createProjectLibrary',
      'createProjectRuntimeManager',
      'createWorkbenchProxyManager',
      'startWeb',
      'sampleCapacityWindow',
      'startCapacityWorkload',
      'fixtureManifestDigests',
      'requiredSamplesComplete',
    ])
      expect(source.replace(/\s/gu, '')).toContain(value)
  })
  it('keeps cohort 3 as the sole gate and types BL-004 comparisons', async () => {
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'apps/api/src/mvp-performance-capacity.ts'),
      'utf8'
    )
    expect(source.replace(/\s/gu, '')).toContain('cohort===3')
    expect(source.replace(/\s/gu, '')).toContain('complete?')
    for (const value of [
      'comparable',
      'directional-only',
      'not-comparable',
      'historical-1',
    ])
      expect(source.replace(/\s/gu, '')).toContain(value)
    expect(source.replace(/\s/gu, '')).toContain('finalResidualAudit')
    expect(source.replace(/\s/gu, '')).toContain('residualStart')
    expect(source.replace(/\s/gu, '')).toContain('awaitlstat(root)')
  })
})
