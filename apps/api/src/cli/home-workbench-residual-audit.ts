import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'

export const HOME_WORKBENCH_RESULT_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-012'
)
export const HOME_WORKBENCH_BROWSER_EVIDENCE = path.join(
  HOME_WORKBENCH_RESULT_ROOT,
  'browser-continuity.json'
)
export const HOME_WORKBENCH_REAL_PROCESS_EVIDENCE = path.join(
  HOME_WORKBENCH_RESULT_ROOT,
  'browser-real-process.json'
)
export const HOME_WORKBENCH_FAILURE_EVIDENCE = path.join(
  HOME_WORKBENCH_RESULT_ROOT,
  'browser-failures.json'
)

interface ReadinessEvidence {
  readonly api?: {
    readonly logHintAtMs?: number | null
    readonly listenerReadyAtMs?: number
    readonly consequence?: string
  }
  readonly web?: {
    readonly logHintAtMs?: number | null
    readonly listenerReadyAtMs?: number
    readonly consequence?: string
  }
}

interface BrowserTimingEvidence {
  readonly bounds?: { readonly overallMs?: number }
  readonly timing?: {
    readonly durationMs?: number
    readonly steps?: readonly {
      readonly name?: string
      readonly boundMs?: number
      readonly durationMs?: number
      readonly outcome?: string
    }[]
  }
}

const timingPassed = (
  evidence: BrowserTimingEvidence,
  requiredSteps: readonly string[]
): boolean => {
  const overallMs = evidence.bounds?.overallMs
  const durationMs = evidence.timing?.durationMs
  const steps = evidence.timing?.steps ?? []
  return (
    Number.isSafeInteger(overallMs) &&
    Number.isSafeInteger(durationMs) &&
    durationMs! <= overallMs! &&
    requiredSteps.every((name) => steps.some((step) => step.name === name)) &&
    steps.every(
      (step) =>
        Number.isSafeInteger(step.boundMs) &&
        Number.isSafeInteger(step.durationMs) &&
        step.durationMs! <= step.boundMs! &&
        step.outcome === 'passed'
    )
  )
}

const absent = async (target: string): Promise<boolean> =>
  access(target).then(
    () => false,
    () => true
  )

export const auditHomeWorkbenchResiduals = async (): Promise<
  Record<string, unknown>
> => {
  const evidence = JSON.parse(
    await readFile(HOME_WORKBENCH_BROWSER_EVIDENCE, 'utf8')
  ) as {
    readiness?: ReadinessEvidence
    cleanup?: {
      contexts?: { afterClose?: number }
      pages?: { afterClose?: number }
      terminal?: { identityAbsent?: boolean }
      proxy?: { resourcesAbsent?: boolean }
      runtime?: {
        identityAbsent?: boolean
        listenerAbsent?: boolean
        shutdownStatus?: string
      }
      api?: { listenerAbsent?: boolean }
      web?: { processGroupAbsent?: boolean; listenerAbsent?: boolean }
      persistence?: { sqliteSidecars?: unknown[] }
      fixture?: {
        integrity?: boolean
        beforeDigest?: string
        afterDigest?: string
      }
      markerStopped?: boolean
      outputRemoved?: boolean
      unrelatedListenerSurvived?: boolean
    }
    fixtureIntegrity?: boolean
    bounds?: BrowserTimingEvidence['bounds']
    timing?: BrowserTimingEvidence['timing']
  }
  const failures = JSON.parse(
    await readFile(HOME_WORKBENCH_FAILURE_EVIDENCE, 'utf8')
  ) as {
    cleanup?: {
      contexts?: number
      pages?: number
      proxyResources?: number
      finalAudit?: {
        pendingOperations?: number
        rawSockets?: number
        webSockets?: number
      }
    }
  }
  const realProcess = JSON.parse(
    await readFile(HOME_WORKBENCH_REAL_PROCESS_EVIDENCE, 'utf8')
  ) as {
    bounds?: BrowserTimingEvidence['bounds']
    timing?: BrowserTimingEvidence['timing']
    readiness?: ReadinessEvidence
    cleanup?: {
      contexts?: { after?: number }
      pages?: { after?: number }
      terminal?: { markerAbsent?: boolean }
      proxy?: { socketsAfterContextClose?: number }
      runtime?: { identityAbsent?: boolean; listenerAbsent?: boolean }
      api?: { groupAbsent?: boolean; listenerAbsent?: boolean }
      web?: { groupAbsent?: boolean; listenerAbsent?: boolean }
      database?: { absent?: boolean }
      passed?: boolean
    }
  }
  const markerPidAbsent = await absent(
    path.join(HOME_WORKBENCH_RESULT_ROOT, 'terminal-marker.pid')
  )
  const markerOutputAbsent = await absent(
    path.join(HOME_WORKBENCH_RESULT_ROOT, 'terminal-marker.counter')
  )
  const continuityTimingPassed = timingPassed(evidence, [
    'setup',
    'apiReadiness',
    'webReadiness',
    'runtimeReadiness',
    'workbenchReadiness',
    'terminalOperations',
    'threeEntries',
    'history',
    'deepLink',
    'evidence',
    'cleanup',
  ])
  const realProcessTimingPassed = timingPassed(realProcess, [
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
  ])
  const readinessPassed = (
    [
      [evidence.readiness?.api, 'exact-owned-listener-and-http-projects'],
      [evidence.readiness?.web, 'exact-owned-listener-and-http-home'],
      [realProcess.readiness?.api, 'exact-owned-listener-and-http-projects'],
      [realProcess.readiness?.web, 'exact-owned-listener-and-http-home'],
    ] as const
  ).every(([readiness, consequence]) => {
    const logHintAtMs = readiness?.logHintAtMs
    const listenerReadyAtMs = readiness?.listenerReadyAtMs
    const hintPassed =
      logHintAtMs === null ||
      (typeof logHintAtMs === 'number' &&
        Number.isSafeInteger(logHintAtMs) &&
        typeof listenerReadyAtMs === 'number' &&
        listenerReadyAtMs >= logHintAtMs)
    return (
      readiness !== undefined &&
      hintPassed &&
      Number.isSafeInteger(listenerReadyAtMs) &&
      readiness.consequence === consequence
    )
  })
  const cleanup = evidence.cleanup ?? {}
  const failureCleanup = failures.cleanup ?? {}
  const realCleanup = realProcess.cleanup
  const passed =
    continuityTimingPassed &&
    realProcessTimingPassed &&
    readinessPassed &&
    markerPidAbsent &&
    markerOutputAbsent &&
    cleanup.contexts?.afterClose === 0 &&
    cleanup.pages?.afterClose === 0 &&
    cleanup.terminal?.identityAbsent === true &&
    cleanup.proxy?.resourcesAbsent === true &&
    cleanup.runtime?.identityAbsent === true &&
    cleanup.runtime?.listenerAbsent === true &&
    cleanup.runtime?.shutdownStatus === 'ok' &&
    cleanup.api?.listenerAbsent === true &&
    cleanup.web?.processGroupAbsent === true &&
    cleanup.web?.listenerAbsent === true &&
    cleanup.persistence?.sqliteSidecars?.length === 0 &&
    cleanup.fixture?.integrity === true &&
    cleanup.fixture.beforeDigest === cleanup.fixture.afterDigest &&
    cleanup.markerStopped === true &&
    cleanup.outputRemoved === true &&
    cleanup.unrelatedListenerSurvived === true &&
    evidence.fixtureIntegrity === true &&
    failureCleanup.contexts === 0 &&
    failureCleanup.pages === 0 &&
    failureCleanup.proxyResources === 0 &&
    failureCleanup.finalAudit?.pendingOperations === 0 &&
    failureCleanup.finalAudit?.rawSockets === 0 &&
    failureCleanup.finalAudit?.webSockets === 0 &&
    realCleanup?.contexts?.after === 0 &&
    realCleanup?.pages?.after === 0 &&
    realCleanup?.terminal?.markerAbsent === true &&
    realCleanup?.proxy?.socketsAfterContextClose === 0 &&
    realCleanup?.runtime?.identityAbsent === true &&
    realCleanup?.runtime?.listenerAbsent === true &&
    realCleanup?.api?.groupAbsent === true &&
    realCleanup?.api?.listenerAbsent === true &&
    realCleanup?.web?.groupAbsent === true &&
    realCleanup?.web?.listenerAbsent === true &&
    realCleanup?.database?.absent === true &&
    realCleanup?.passed === true
  return {
    schemaVersion: 1,
    passed,
    markerPidAbsent,
    markerOutputAbsent,
    timing: {
      continuity: continuityTimingPassed,
      realProcess: realProcessTimingPassed,
      readiness: readinessPassed,
    },
    cleanup,
    failureCleanup,
    realProcessCleanup: realCleanup,
  }
}

const main = async (): Promise<void> => {
  const audit = await auditHomeWorkbenchResiduals()
  await writeFile(
    path.join(HOME_WORKBENCH_RESULT_ROOT, 'residual-audit.json'),
    JSON.stringify(audit, null, 2)
  )
  process.stdout.write(JSON.stringify(audit) + '\n')
  if (audit.passed !== true) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) void main()
