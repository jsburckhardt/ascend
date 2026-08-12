import { execFile } from 'node:child_process'
import { chmod, stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { auditWorkbenchRouteResidual } from '../src/cli/workbench-route-residual-audit.js'
import {
  mergeWorkbenchRouteEvidence,
  readWorkbenchRouteEvidence,
  WORKBENCH_ROUTE_EVIDENCE_FILE,
} from '../src/workbench-route-evidence.js'

const execute = promisify(execFile)

describe('restricted stable-route evidence and residual audit', () => {
  it('atomically creates, merges, and repairs the sole owner-readable evidence file', async () => {
    const before = await readWorkbenchRouteEvidence()
    await chmod(WORKBENCH_ROUTE_EVIDENCE_FILE, 0o644)
    const updated = await mergeWorkbenchRouteEvidence({
      cleanup: { ...before.cleanup, writerTest: 'passed' },
    })
    expect(updated.cleanup).toMatchObject({ writerTest: 'passed' })
    expect((await stat(WORKBENCH_ROUTE_EVIDENCE_FILE)).mode & 0o777).toBe(0o600)
    expect((await readWorkbenchRouteEvidence()).matrices).toEqual(
      before.matrices
    )
  })

  it('is ignored, absent from tracked files, and passes exact identity residual checks', async () => {
    const ignored = await execute('git', [
      'check-ignore',
      WORKBENCH_ROUTE_EVIDENCE_FILE,
    ])
    expect(ignored.stdout.trim()).toBe(WORKBENCH_ROUTE_EVIDENCE_FILE)
    const tracked = await execute('git', [
      'ls-files',
      WORKBENCH_ROUTE_EVIDENCE_FILE,
    ])
    expect(tracked.stdout).toBe('')
    const current = await readWorkbenchRouteEvidence()
    const result = await auditWorkbenchRouteResidual({
      ...current,
      browser: {
        identities: [{ pid: 999_999_999, processStartTime: 'absent', port: 9 }],
      },
      matrices: [],
    })
    expect(result).toMatchObject({
      status: 'ok',
      evidenceFileCount: 1,
      evidenceMode: '0600',
      processesAbsent: true,
      listenersAbsent: true,
    })
  })
})
