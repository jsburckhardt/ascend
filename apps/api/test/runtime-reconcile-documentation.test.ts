import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_RESTART_REJECTION_CATEGORIES,
  RUNTIME_STOP_REJECTION_CATEGORIES,
} from '../src/project-runtime-contract.js'
import { RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES } from '../src/routes/project-runtime-restart.js'
import { RUNTIME_STOP_ROUTE_ERROR_CATEGORIES } from '../src/routes/project-runtime-stop.js'
import { WORKBENCH_FAILURE_TABLE } from '../src/workbench-proxy-contract.js'
import { BL019_PRESERVED_EVIDENCE } from '../src/runtime-reconcile-evidence.js'

const root = path.resolve(import.meta.dirname, '../../..')
const text = (relative: string): Promise<string> =>
  readFile(path.join(root, relative), 'utf8')

describe('BL-019 application documentation', () => {
  it('documents attribution, bounds, admission, liveness, evidence, and scope', async () => {
    const runbook = await text('docs/api-restart-reconciliation.md')
    for (const phrase of [
      "this host's configured code-server installation",
      '15,000 ms measured from the replacement API process start',
      '3,000 ms startup headroom',
      '11,000 ms internal reconciliation',
      '1,000 ms response allowance',
      'runtime_reconcile_in_progress',
      'runtime_reconcile_unresolved',
      'no background monitor, poller, or watcher',
      'PID/start-time reuse',
      'residualCount: 0',
      'teardown: null',
      'proven-clear',
      'unproven',
      'residual-present',
      'BL-020',
      'BL-021',
      'BL-022',
    ])
      expect(runbook).toContain(phrase)
    for (const phrase of [
      'Every matrix row is produced by executing',
      'seven-member execution witness',
      'compiled apps/api/dist/server.js',
      'OS-observed process identity and argv',
      'separate control subepisode',
      'would create two candidates',
    ])
      expect(runbook).toContain(phrase)

    expect(runbook).toContain('just verify-runtime-reconcile')
    expect(runbook).toContain('just proof-runtime-reconcile')
    expect(runbook).toContain('just proof-runtime-reconcile-residual-audit')
  })

  it('keeps all public vocabularies and documentation surfaces aligned', async () => {
    expect(RUNTIME_FAILURE_CATEGORIES).toHaveLength(19)
    expect(RUNTIME_STOP_REJECTION_CATEGORIES).toHaveLength(9)
    expect(RUNTIME_RESTART_REJECTION_CATEGORIES).toHaveLength(9)
    expect(RUNTIME_STOP_ROUTE_ERROR_CATEGORIES).toHaveLength(12)
    expect(RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES).toHaveLength(12)
    expect(WORKBENCH_FAILURE_TABLE).toHaveLength(30)
    const surfaces = await Promise.all([
      text('README.md'),
      text('docs/README.md'),
      text('docs/project-runtime.md'),
      text('docs/session-switching.md'),
      text('docs/stable-workbench-routing.md'),
      text('apps/api/src/routes/README.md'),
    ])
    for (const surface of surfaces)
      expect(surface).toMatch(/API restart|API-restart|reconcil/iu)
    const combined = surfaces.join('\n')
    expect(combined).not.toContain(
      'until API-restart reconciliation is delivered by BL-019'
    )
    expect(combined).not.toContain('BL-019 owns API-restart reconciliation')
    expect(combined).not.toContain(
      'API-process restart reconciliation, running/failed Close'
    )
    expect(combined).not.toContain(
      'auto-sleep, API-restart reconciliation, scheduling'
    )
    expect(combined).not.toContain(
      'API-restart reconciliation, scheduling, quotas'
    )
  })

  it('keeps root recipes ordered and prior evidence byte-identical', async () => {
    const justfile = await text('justfile')
    const verify = justfile.slice(justfile.indexOf('verify:\n'))
    const verifyIndex = verify.indexOf('just verify-runtime-reconcile')
    const proofIndex = verify.indexOf('just proof-runtime-reconcile\n')
    const auditIndex = verify.indexOf(
      'just proof-runtime-reconcile-residual-audit'
    )
    expect(verifyIndex).toBeGreaterThan(0)
    expect(proofIndex).toBeGreaterThan(verifyIndex)
    expect(auditIndex).toBeGreaterThan(proofIndex)
    for (const evidence of BL019_PRESERVED_EVIDENCE) {
      const digest = createHash('sha256')
        .update(await readFile(path.join(root, evidence.path)))
        .digest('hex')
      expect(digest).toBe(evidence.sha256)
    }
  })
})
