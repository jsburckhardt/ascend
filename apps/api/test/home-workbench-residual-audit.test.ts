import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  auditHomeWorkbenchResiduals,
  HOME_WORKBENCH_BROWSER_EVIDENCE,
  HOME_WORKBENCH_FAILURE_EVIDENCE,
  HOME_WORKBENCH_REAL_PROCESS_EVIDENCE,
  HOME_WORKBENCH_RESULT_ROOT,
} from '../src/cli/home-workbench-residual-audit.js'

const marker = path.join(HOME_WORKBENCH_RESULT_ROOT, 'terminal-marker.counter')
const timingEvidence = (steps: readonly string[]) => ({
  bounds: { overallMs: 220_000 },
  timing: {
    durationMs: 1_000,
    steps: steps.map((name) => ({
      name,
      boundMs: 10_000,
      durationMs: 100,
      outcome: 'passed',
    })),
  },
})
const commonSteps = [
  'setup',
  'apiReadiness',
  'webReadiness',
  'runtimeReadiness',
  'workbenchReadiness',
  'terminalOperations',
  'threeEntries',
  'deepLink',
  'evidence',
  'cleanup',
] as const

afterEach(() => rm(marker, { force: true }))

describe('Home/workbench residual audit', () => {
  it('accepts complete cleanup and rejects a residual marker', async () => {
    await mkdir(HOME_WORKBENCH_RESULT_ROOT, { recursive: true })
    await writeFile(
      HOME_WORKBENCH_BROWSER_EVIDENCE,
      JSON.stringify({
        ...timingEvidence([...commonSteps, 'history']),
        fixtureIntegrity: true,
        readiness: {
          api: {
            logHintAtMs: null,
            listenerReadyAtMs: 90,
            consequence: 'exact-owned-listener-and-http-projects',
          },
          web: {
            logHintAtMs: 100,
            listenerReadyAtMs: 110,
            consequence: 'exact-owned-listener-and-http-home',
          },
        },
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
    await writeFile(
      HOME_WORKBENCH_REAL_PROCESS_EVIDENCE,
      JSON.stringify({
        ...timingEvidence(commonSteps),
        readiness: {
          api: {
            logHintAtMs: 100,
            listenerReadyAtMs: 110,
            consequence: 'exact-owned-listener-and-http-projects',
          },
          web: {
            logHintAtMs: 120,
            listenerReadyAtMs: 140,
            consequence: 'exact-owned-listener-and-http-home',
          },
        },
        cleanup: {
          contexts: { after: 0 },
          pages: { after: 0 },
          terminal: { markerAbsent: true },
          proxy: { socketsAfterContextClose: 0 },
          runtime: { identityAbsent: true, listenerAbsent: true },
          api: { groupAbsent: true, listenerAbsent: true },
          web: { groupAbsent: true, listenerAbsent: true },
          database: { absent: true },
          passed: true,
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
