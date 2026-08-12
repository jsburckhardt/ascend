import { lstat, readdir, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { REPOSITORY_ROOT } from '../workbench-proof-contract.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  mergeWorkbenchRouteEvidence,
  readWorkbenchRouteEvidence,
  WORKBENCH_ROUTE_EVIDENCE_FILE,
  WORKBENCH_ROUTE_EVIDENCE_ROOT,
  type WorkbenchRouteEvidence,
} from '../workbench-route-evidence.js'

interface Identity {
  pid?: unknown
  processStartTime?: unknown
  port?: unknown
}
export interface WorkbenchRouteResidualResult {
  readonly status: 'ok' | 'failed'
  readonly evidenceFileCount: number
  readonly evidenceMode: string
  readonly ownedIdentityCount: number
  readonly processesAbsent: boolean
  readonly listenersAbsent: boolean
  readonly publicAuthorityMatches: number
}

const identitiesFrom = (evidence: WorkbenchRouteEvidence): Identity[] => {
  const identities: Identity[] = []
  const browser = evidence.browser as { identities?: unknown } | undefined
  if (Array.isArray(browser?.identities))
    identities.push(...(browser.identities as Identity[]))
  for (const matrix of evidence.matrices) {
    if (typeof matrix === 'object' && matrix !== null && 'identity' in matrix)
      identities.push((matrix as { identity: Identity }).identity)
  }
  return [
    ...new Map(
      identities.map((identity) => [JSON.stringify(identity), identity])
    ).values(),
  ]
}

export async function auditWorkbenchRouteResidual(
  evidence?: WorkbenchRouteEvidence
): Promise<WorkbenchRouteResidualResult> {
  const retainedEvidence = evidence ?? (await readWorkbenchRouteEvidence())
  const entries = await readdir(WORKBENCH_ROUTE_EVIDENCE_ROOT, {
    withFileTypes: true,
  })
  const files = entries.filter(
    (entry) => entry.isFile() || entry.isSymbolicLink()
  )
  const metadata = await lstat(WORKBENCH_ROUTE_EVIDENCE_FILE)
  const identities = identitiesFrom(retainedEvidence)
  const processChecks = await Promise.all(
    identities.map(
      async (identity) =>
        typeof identity.pid !== 'number' ||
        typeof identity.processStartTime !== 'string' ||
        (await readProcessStartTime(identity.pid)) !== identity.processStartTime
    )
  )
  const listenerChecks = await Promise.all(
    identities.map(
      async (identity) =>
        typeof identity.port !== 'number' ||
        (await loopbackListenerIsAbsent(identity.port))
    )
  )
  const publicFiles = [
    'README.md',
    'apps/api/README.md',
    'docs/README.md',
    'docs/project-runtime.md',
    'docs/stable-workbench-routing.md',
  ]
  const publicContent = (
    await Promise.all(
      publicFiles.map((file) =>
        readFile(path.join(REPOSITORY_ROOT, file), 'utf8')
      )
    )
  ).join('\n')
  const ownedPorts = identities.flatMap((identity) =>
    typeof identity.port === 'number' ? [identity.port] : []
  )
  const publicAuthorityMatches = ownedPorts.filter((port) =>
    publicContent.includes(':' + String(port))
  ).length
  const result: WorkbenchRouteResidualResult = Object.freeze({
    status:
      files.length === 1 &&
      files[0]?.name === 'workbench-route-evidence.json' &&
      !metadata.isSymbolicLink() &&
      (metadata.mode & 0o777) === 0o600 &&
      processChecks.every(Boolean) &&
      listenerChecks.every(Boolean) &&
      publicAuthorityMatches === 0
        ? 'ok'
        : 'failed',
    evidenceFileCount: files.length,
    evidenceMode: (metadata.mode & 0o777).toString(8).padStart(4, '0'),
    ownedIdentityCount: identities.length,
    processesAbsent: processChecks.every(Boolean),
    listenersAbsent: listenerChecks.every(Boolean),
    publicAuthorityMatches,
  })
  return result
}

export async function runWorkbenchRouteResidualAudit(): Promise<number> {
  const result = await auditWorkbenchRouteResidual()
  await mergeWorkbenchRouteEvidence({ residualAudit: { ...result } })
  process.stdout.write(
    JSON.stringify({ event: 'workbench.route.residual-audit', ...result }) +
      '\n'
  )
  return result.status === 'ok' ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
  process.exitCode = await runWorkbenchRouteResidualAudit()
