import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MVP_ARTIFACT_TIMEOUT_MS,
  MVP_CAPACITY_COHORTS,
  MVP_COLD_ORDER,
  MVP_COLD_TARGET_MS,
  MVP_COLD_TIMEOUT_MS,
  MVP_OVERALL_TIMEOUT_MS,
  MVP_WARM_ORDER,
  MVP_WARM_TARGET_MS,
  MVP_WARM_TIMEOUT_MS,
} from '../src/mvp-performance-contract.js'
import { REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'

describe('BL-015 command and operational documentation', () => {
  it('documents exact host, command, order, events, bounds, formulas, targets, failure, privacy, and cleanup', async () => {
    const docs = await readFile(
      path.join(REPOSITORY_ROOT, 'docs/mvp-performance.md'),
      'utf8'
    )
    for (const value of [
      'just measure-mvp-performance',
      '03f809395a5d',
      MVP_COLD_ORDER.join('/'),
      MVP_WARM_ORDER.join('/'),
      MVP_CAPACITY_COHORTS.join('/'),
      'process.hrtime.bigint',
      'Explorer',
      'terminal',
      String(MVP_COLD_TIMEOUT_MS),
      String(MVP_WARM_TIMEOUT_MS),
      String(MVP_ARTIFACT_TIMEOUT_MS),
      String(MVP_OVERALL_TIMEOUT_MS),
      String(MVP_COLD_TARGET_MS),
      String(MVP_WARM_TARGET_MS),
      'nearest rank',
      'blocker',
      'miss-accepted',
      'mode 0600',
      'directional-only',
      'not-comparable',
      'partial',
      'residual',
      '79479981-4b00-4596-a950-57dd9d2f53dd',
      '10222.644',
      '8781.340',
      '853037e6-5dab-43cf-bcf8-61f1e8bbdb18',
      '42 exact',
    ])
      expect(docs.replaceAll(',', '')).toContain(value)
    for (const value of [
      'no optimization',
      'changes no target',
      'API',
      'migration',
      'configuration default',
      'deployment topology',
    ])
      expect(docs.replaceAll(',', '')).toContain(value)
  })
  it('exposes all prior gates plus separate BL-015 commands and never nests long measurement in verify', async () => {
    const justfile = await readFile(
      path.join(REPOSITORY_ROOT, 'justfile'),
      'utf8'
    )
    for (const recipe of [
      'proof-workbench-capacity-audit:',
      'verify-project-runtime:',
      'verify-workbench-route:',
      'verify-home-workbench ',
      'verify-project-runtime-isolation:',
      'verify-session-switching:',
      'measure-mvp-performance:',
      'verify-mvp-performance:',
      'proof-mvp-performance-residual-audit:',
    ])
      expect(justfile).toContain(recipe)
    const verify = justfile.slice(justfile.indexOf('\nverify:\n'))
    expect(verify).toContain('just verify-mvp-performance')
    expect(verify).toContain('just proof-mvp-performance-residual-audit')
    expect(verify).not.toContain('just measure-mvp-performance')
  })
})
