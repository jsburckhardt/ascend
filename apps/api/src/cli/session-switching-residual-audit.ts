import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  BL014_RESOURCE_CLASSES,
  validateSessionSwitchingEvidence,
  validateSessionSwitchingResidualDeclarations,
  type SessionSwitchingArtifactProbe,
} from '../session-switching-contract.js'

const root = path.resolve(import.meta.dirname, '../../../../')
const resultRoot = path.join(root, 'test-results/bl-014/session-switching')
const publicPath = path.join(resultRoot, 'switching-browser.json')
const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
const expectedArtifactPaths = {
  counterOutput: path.join(resultRoot, 'a-counter.log'),
  counterIdentity: path.join(resultRoot, 'a-counter-identity.json'),
}
const absent = async (target: string): Promise<boolean> =>
  lstat(target).then(
    () => false,
    () => true
  )

const main = async (): Promise<void> => {
  const publicArtifact = JSON.parse(
    await readFile(publicPath, 'utf8')
  ) as Record<string, unknown>
  const restrictedArtifact = JSON.parse(
    await readFile(restrictedPath, 'utf8')
  ) as Record<string, unknown>
  const restricted = await lstat(restrictedPath)
  const projects = publicArtifact.projects as Array<{
    key: string
    projectToken: string
  }>
  const identityObservations =
    restrictedArtifact.identityObservations as Array<{
      project: string
      projectToken: string
      runtime: { pid: number; processStartTime: string; port: number }
    }>
  const artifactManifest = restrictedArtifact.artifactManifest as {
    entries: Array<{ kind: string; path: string }>
  }
  const executionId = (publicArtifact.execution as { id: string }).id
  const cleanup = publicArtifact.cleanup as {
    resources: Array<{ resourceClass: string; after: number }>
    projects: Array<{ projectToken: string; residuals: number }>
    disposableFiles: Array<{ absent: boolean }>
  }
  const projectPartitions = await Promise.all(
    projects.map(async (project) => {
      const identityRows = identityObservations.filter(
        (row) =>
          row.project === project.key &&
          row.projectToken === project.projectToken
      )
      const identity =
        identityRows.length === 1 ? identityRows[0]!.runtime : undefined
      const processResidual =
        identity &&
        (await readProcessStartTime(identity.pid)) === identity.processStartTime
          ? 1
          : 0
      const listenerResidual =
        identity && !(await loopbackListenerIsAbsent(identity.port)) ? 1 : 0
      return {
        projectToken: project.projectToken,
        measured: true,
        identityJoinCount: identityRows.length,
        processResidual,
        listenerResidual,
        residuals: processResidual + listenerResidual,
      }
    })
  )
  const artifactProbes: SessionSwitchingArtifactProbe[] = await Promise.all(
    artifactManifest.entries.map(async (entry) => ({
      kind: entry.kind,
      path: entry.path,
      executionId,
      measured: true,
      absent: await absent(entry.path),
    }))
  )
  const exactIdentities = identityObservations.map((row) => row.runtime)
  const web = restrictedArtifact.web as {
    pid: number
    processStartTime: string
  }
  const api = restrictedArtifact.api as { port: number }
  const webListener = restrictedArtifact.webListener as { port: number }
  const fixtureRoot = String(restrictedArtifact.fixtureRoot)
  const databasePath = String(restrictedArtifact.databasePath)
  const owner = (
    restrictedArtifact.artifactManifest as {
      owner: { pid: number; processStartTime: string }
    }
  ).owner
  const hostAudit = {
    fixtureRootAbsent: await absent(fixtureRoot),
    databaseFilesAbsent: (
      await Promise.all(
        [databasePath, databasePath + '-shm', databasePath + '-wal'].map(absent)
      )
    ).every(Boolean),
    disposableFilesAbsent: artifactProbes.every((probe) => probe.absent),
    counterAbsent:
      (await readProcessStartTime(owner.pid)) !== owner.processStartTime,
    webAbsent: (await readProcessStartTime(web.pid)) !== web.processStartTime,
    apiListenerAbsent: await loopbackListenerIsAbsent(api.port),
    webListenerAbsent: await loopbackListenerIsAbsent(webListener.port),
    runtimeIdentitiesComplete: exactIdentities.length === projects.length,
  }
  const resourcesComplete =
    cleanup.resources.length === BL014_RESOURCE_CLASSES.length &&
    cleanup.resources.every(
      (resource, index) =>
        resource.resourceClass === BL014_RESOURCE_CLASSES[index] &&
        resource.after === 0
    )
  const declarationsComplete = validateSessionSwitchingResidualDeclarations(
    publicArtifact,
    restrictedArtifact,
    artifactProbes,
    expectedArtifactPaths
  )
  const status =
    validateSessionSwitchingEvidence(publicArtifact, restrictedArtifact) &&
    declarationsComplete &&
    restricted.isFile() &&
    (restricted.mode & 0o777) === 0o600 &&
    resourcesComplete &&
    cleanup.projects.length === projects.length &&
    cleanup.projects.every((project) => project.residuals === 0) &&
    cleanup.disposableFiles.every((file) => file.absent) &&
    projectPartitions.every(
      (project) => project.identityJoinCount === 1 && project.residuals === 0
    ) &&
    Object.values(hostAudit).every(Boolean)
      ? 'ok'
      : 'failed'
  const result = {
    command: 'proof-session-switching-residual-audit',
    status,
    schemaVersion: publicArtifact.schemaVersion,
    executionId,
    restrictedMode: (restricted.mode & 0o777).toString(8),
    declarationsComplete,
    artifactProbes: artifactProbes.map(({ kind, measured, absent }) => ({
      kind,
      measured,
      absent,
    })),
    projectPartitions,
    resources: cleanup.resources,
    hostAudit,
  }
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (status !== 'ok') process.exitCode = 1
}

await main().catch((error: unknown) => {
  process.stdout.write(
    JSON.stringify({
      command: 'proof-session-switching-residual-audit',
      status: 'failed',
      error: error instanceof Error ? error.message : 'unknown audit failure',
    }) + String.fromCharCode(10)
  )
  process.exitCode = 1
})
