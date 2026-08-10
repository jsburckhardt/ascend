import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CAPACITY_MEMBER_TIMEOUT_MS,
  CAPACITY_OVERALL_TIMEOUT_MS,
  CAPACITY_PROBE,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
} from '../src/workbench-capacity-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'
import {
  listRetainedCapacityRuns,
  readCapacityEvidence,
} from '../src/workbench-capacity-evidence.js'

const DESIGNATED_RUN_ID = '532abfdb-c970-4979-9da2-ec9ef99a295a'

describe('capacity baseline documentation', () => {
  it('matches source constants, retained result, command surface, and scope', async () => {
    const docs = await readFile(
      path.join(REPOSITORY_ROOT, 'docs/workbench-proof.md'),
      'utf8'
    )
    const readme = await readFile(
      path.join(REPOSITORY_ROOT, 'README.md'),
      'utf8'
    )
    const harness = await readFile(
      path.join(REPOSITORY_ROOT, '.harness/engineering-harness.md'),
      'utf8'
    )
    const justfile = await readFile(
      path.join(REPOSITORY_ROOT, 'justfile'),
      'utf8'
    )
    const directories = await listRetainedCapacityRuns()
    const designated = directories.find((directory) =>
      directory.endsWith(DESIGNATED_RUN_ID)
    )
    expect(designated).toBeDefined()
    const evidence = await readCapacityEvidence(designated!)
    for (const expected of [
      'just proof-workbench-capacity',
      'just proof-workbench-capacity-audit',
      CAPACITY_OVERALL_TIMEOUT_MS.toLocaleString('en-US'),
      CAPACITY_MEMBER_TIMEOUT_MS.toLocaleString('en-US'),
      CAPACITY_PROBE.command,
      CAPACITY_PROBE.timeoutMs.toLocaleString('en-US'),
      CAPACITY_WORKLOAD_DURATION_MS.toLocaleString('en-US'),
      CAPACITY_WORKLOAD_TIMEOUT_MS.toLocaleString('en-US'),
      CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES.toLocaleString('en-US'),
      'offsets 0, 1, 2, 3, and 4 seconds',
      evidence.run.runId,
      'Linux `/proc`',
      'Three members are the only MVP gate',
      'Five and ten are findings',
      'listener inode/owner/port',
      'run.json',
      'samples.json',
      'workloads.json',
      'comparison.md',
    ])
      expect(docs).toContain(expected)
    expect(docs).toContain(
      'does not establish scheduling, quotas, sleeping, product lifecycle policy, multi-host support, BL-010 outcomes, BL-013 outcomes'
    )
    expect(readme).toContain(evidence.run.runId)
    expect(readme).toContain('diagnostic baseline')
    expect(harness).toContain('just proof-workbench-capacity-audit')
    expect(harness).toContain(evidence.run.runId)
    expect(harness).toContain('does not rerun the 1/3/5/10 episode')
    expect(justfile).toContain('proof-workbench-capacity:')
    expect(justfile).toContain('proof-workbench-capacity-audit:')
  })
})
