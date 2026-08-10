import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CAPACITY_COHORTS,
  CAPACITY_MEMBER_TIMEOUT_MS,
  CAPACITY_OVERALL_TIMEOUT_MS,
  CAPACITY_PREREQUISITES,
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  relativeEvidencePaths,
  validateCapacityEvidence,
  type CapacityRunRecord,
} from '../src/workbench-capacity-contract.js'
import {
  acquireCapacityGuard,
  checkCapacityPrerequisites,
  releaseCapacityGuard,
} from '../src/workbench-capacity-prerequisites.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('workbench capacity contract', () => {
  it('pins ordered cohorts, finite bounds, probe, workload, and evidence paths', () => {
    expect(CAPACITY_COHORTS).toEqual([1, 3, 5, 10])
    expect(CAPACITY_MEMBER_TIMEOUT_MS).toBe(30_000)
    expect(CAPACITY_OVERALL_TIMEOUT_MS).toBe(1_200_000)
    expect(CAPACITY_PROBE).toEqual({
      executable: '/usr/bin/true',
      args: [],
      command: '/usr/bin/true',
      timeoutMs: 1_000,
    })
    expect(CAPACITY_SAMPLE_OFFSETS_MS).toEqual([0, 1_000, 2_000, 3_000, 4_000])
    expect([
      CAPACITY_WORKLOAD_DURATION_MS,
      CAPACITY_WORKLOAD_TIMEOUT_MS,
      CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
    ]).toEqual([7_000, 10_000, 4_096])
    const paths = relativeEvidencePaths('00000000-0000-4000-8000-000000000011')
    expect(new Set(Object.values(paths)).size).toBe(4)
    expect(
      Object.values(paths).every((value) =>
        value.includes('00000000-0000-4000-8000-000000000011')
      )
    ).toBe(true)
  })

  it('checks designated prerequisites in fixed order before starts', async () => {
    const result = await checkCapacityPrerequisites()
    expect(result.stopReason).toBeNull()
    expect(result.records.map(({ name }) => name)).toEqual(
      CAPACITY_PREREQUISITES
    )
    expect(result.host).toMatchObject({
      hostname: '03f809395a5d',
      user: 'vscode',
      uid: 1000,
      codeServerVersion: '4.131.0',
    })
  })

  it('rejects concurrent and stale active ownership without replacing it', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'bl004-guard-'))
    roots.push(root)
    const guard = path.join(root, 'active.json')
    const first = '00000000-0000-4000-8000-000000000011'
    await acquireCapacityGuard(first, guard)
    const retained = await readFile(guard, 'utf8')
    await expect(
      acquireCapacityGuard('00000000-0000-4000-8000-000000000012', guard)
    ).rejects.toThrow('capacity-active-run-conflict')
    expect(await readFile(guard, 'utf8')).toBe(retained)
    await expect(
      releaseCapacityGuard('00000000-0000-4000-8000-000000000012', guard)
    ).rejects.toThrow('capacity-active-run-owner-mismatch')
    await releaseCapacityGuard(first, guard)
  })

  it('rejects mixed-run and malformed cohort evidence', () => {
    const run = {
      version: 1,
      runId: '00000000-0000-4000-8000-000000000011',
      cohorts: [],
    } as unknown as CapacityRunRecord
    expect(() =>
      validateCapacityEvidence(
        run,
        {
          version: 1,
          runId: '00000000-0000-4000-8000-000000000012',
          samples: [],
        },
        { version: 1, runId: run.runId, workloads: [] }
      )
    ).toThrow('mixes run IDs')
    expect(() =>
      validateCapacityEvidence(
        run,
        { version: 1, runId: run.runId, samples: [] },
        { version: 1, runId: run.runId, workloads: [] }
      )
    ).toThrow('cohort order')
  })
})
