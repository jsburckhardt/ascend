import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  BL014_RESOURCE_CLASSES,
  validateSessionSwitchingEvidence,
} from '../session-switching-contract.js'

const root = path.resolve(import.meta.dirname, '../../../../')
const resultRoot = path.join(root, 'test-results/bl-014/session-switching')
const publicPath = path.join(resultRoot, 'switching-browser.json')
const restrictedPath = path.join(resultRoot, 'restricted-authority.json')
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
  ) as {
    fixtureRoot: string
    databasePath: string
    apiPort: number
    webPort: number
    webPid: number
    webStart: string
    counterPid: number
    counterStart: string
    counterOutput: string
    counterIdentity: string
    initialIdentity: Record<
      string,
      { pid: number; processStartTime: string; port: number }
    >
  }
  const restricted = await lstat(restrictedPath)
  const projects = publicArtifact.projects as Array<{
    key: string
    projectToken: string
  }>
  const cleanup = publicArtifact.cleanup as {
    resources: Array<{ resourceClass: string; after: number }>
    projects: Array<{ projectToken: string; residuals: number }>
    disposableFiles: Array<{ absent: boolean }>
  }
  const projectPartitions = await Promise.all(
    projects.map(async (project) => {
      const identity = restrictedArtifact.initialIdentity[project.key]
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
        processResidual,
        listenerResidual,
        residuals: processResidual + listenerResidual,
      }
    })
  )
  const hostAudit = {
    fixtureRootAbsent: await absent(restrictedArtifact.fixtureRoot),
    databaseFilesAbsent: (
      await Promise.all(
        [
          restrictedArtifact.databasePath,
          restrictedArtifact.databasePath + '-shm',
          restrictedArtifact.databasePath + '-wal',
        ].map(absent)
      )
    ).every(Boolean),
    disposableFilesAbsent: (
      await Promise.all(
        [
          restrictedArtifact.counterOutput,
          restrictedArtifact.counterIdentity,
        ].map(absent)
      )
    ).every(Boolean),
    counterAbsent:
      (await readProcessStartTime(restrictedArtifact.counterPid)) !==
      restrictedArtifact.counterStart,
    webAbsent:
      (await readProcessStartTime(restrictedArtifact.webPid)) !==
      restrictedArtifact.webStart,
    apiListenerAbsent: await loopbackListenerIsAbsent(
      restrictedArtifact.apiPort
    ),
    webListenerAbsent: await loopbackListenerIsAbsent(
      restrictedArtifact.webPort
    ),
  }
  const resourcesComplete =
    cleanup.resources.length === BL014_RESOURCE_CLASSES.length &&
    cleanup.resources.every(
      (resource, index) =>
        resource.resourceClass === BL014_RESOURCE_CLASSES[index] &&
        resource.after === 0
    )
  const status =
    validateSessionSwitchingEvidence(publicArtifact) &&
    restricted.isFile() &&
    (restricted.mode & 0o777) === 0o600 &&
    resourcesComplete &&
    cleanup.projects.length === projects.length &&
    cleanup.projects.every((project) => project.residuals === 0) &&
    cleanup.disposableFiles.every((file) => file.absent) &&
    projectPartitions.every((project) => project.residuals === 0) &&
    Object.values(hostAudit).every(Boolean)
      ? 'ok'
      : 'failed'
  const result = {
    command: 'proof-session-switching-residual-audit',
    status,
    schemaVersion: publicArtifact.schemaVersion,
    executionId: (publicArtifact.execution as { id: string }).id,
    restrictedMode: (restricted.mode & 0o777).toString(8),
    projectPartitions,
    resources: cleanup.resources,
    hostAudit,
  }
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (status !== 'ok') process.exitCode = 1
}

await main()
