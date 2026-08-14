import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MVP_COLD_ORDER,
  MVP_EVENTS,
  MVP_WARM_ORDER,
} from '../src/mvp-performance-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

describe('BL-015 monotonic browser controller', () => {
  it('owns one no-retry serial controller with the exact orders and consequences', async () => {
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'tests/e2e/mvp-performance.spec.ts'),
      'utf8'
    )
    expect(source.replace(/\s/gu, '')).toContain('test.describe.configure')
    expect(source.replace(/\s/gu, '')).toContain('retries:0')
    expect(source.replace(/\s/gu, '')).toContain('process.hrtime.bigint()')
    expect(source.replace(/\s/gu, '')).toContain(
      'events.activation=nowNs().toString()'
    )
    expect(source.replace(/\s/gu, '')).toContain('page.keyboard.press')
    expect(source.replace(/\s/gu, '')).toContain('.monaco-workbench')
    expect(source.replace(/\s/gu, '')).toContain(
      "expect.poll(()=>events['runtime-health-ready']??null"
    )
    expect(source.replace(/\s/gu, '')).toContain('readyTerminal(page,fixture)')
    expect(source.replace(/\s/gu, '')).toContain(
      'terminateExactProcessGroup(snapshot.pid,MVP_COLD_CLEANUP_TIMEOUT_MS)'
    )
    expect(MVP_COLD_ORDER).toEqual(['A', 'B', 'C', 'A', 'B'])
    expect(MVP_WARM_ORDER).toEqual([
      'A',
      'B',
      'C',
      'A',
      'B',
      'C',
      'A',
      'B',
      'C',
      'A',
    ])
    expect(MVP_EVENTS).toEqual([
      'activation',
      'runtime-start-requested',
      'runtime-health-ready',
      'stable-document-ready',
      'explorer-sentinel-ready',
      'terminal-prompt-ready',
      'workbench-usable',
    ])
  })
  it('retains bounded artifacts, partial failures, and exact boundary evidence', async () => {
    const source = await readFile(
      path.join(REPOSITORY_ROOT, 'tests/e2e/mvp-performance.spec.ts'),
      'utf8'
    )
    for (const value of [
      'activeSnapshot=snapshot',
      'boundary-failed',
      'MVP_ARTIFACT_TIMEOUT_MS',
      'attempt-timeout',
      'artifact-capture-failed',
      'observedTotalNs',
      'statisticalTotalNs',
      'measuredResiduals',
      'expectedIdentityCount',
      'pathDigest:digestMvpPerformance(path)',
      'network:traffic',
      'homeReturned',
    ])
      expect(source.replace(/\s/gu, '')).toContain(value)
    expect(source.replace(/\s/gu, '')).not.toContain('retries:1')
  })
})
