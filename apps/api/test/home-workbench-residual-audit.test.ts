import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  auditHomeWorkbenchResiduals,
  HOME_WORKBENCH_BROWSER_EVIDENCE,
  HOME_WORKBENCH_FAILURE_EVIDENCE,
  HOME_WORKBENCH_RESULT_ROOT,
} from '../src/cli/home-workbench-residual-audit.js'

const marker = path.join(HOME_WORKBENCH_RESULT_ROOT, 'terminal-marker.counter')
afterEach(() => rm(marker, { force: true }))

describe('Home/workbench residual audit', () => {
  it('accepts complete cleanup and rejects a residual marker', async () => {
    await mkdir(HOME_WORKBENCH_RESULT_ROOT, { recursive: true })
    await writeFile(
      HOME_WORKBENCH_BROWSER_EVIDENCE,
      JSON.stringify({
        fixtureIntegrity: true,
        cleanup: {
          contexts: { afterClose: 0 },
          pages: { afterClose: 0 },
          terminal: { identityAbsent: true },
          proxy: { resourcesAbsent: true },
          runtime: {
            identityAbsent: true,
            listenerAbsent: true,
            shutdownStatus: 'ok',
          },
          api: { listenerAbsent: true },
          web: { processGroupAbsent: true, listenerAbsent: true },
          persistence: { sqliteSidecars: [] },
          fixture: {
            integrity: true,
            beforeDigest: 'same',
            afterDigest: 'same',
          },
          markerStopped: true,
          outputRemoved: true,
          unrelatedListenerSurvived: true,
        },
      })
    )
    await writeFile(
      HOME_WORKBENCH_FAILURE_EVIDENCE,
      JSON.stringify({
        cleanup: {
          contexts: 0,
          pages: 0,
          proxyResources: 0,
          finalAudit: { pendingOperations: 0, rawSockets: 0, webSockets: 0 },
        },
      })
    )
    await expect(auditHomeWorkbenchResiduals()).resolves.toMatchObject({
      passed: true,
    })
    await writeFile(marker, 'residual')
    await expect(auditHomeWorkbenchResiduals()).resolves.toMatchObject({
      passed: false,
    })
  })
})
