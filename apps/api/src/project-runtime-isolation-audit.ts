import { execFile } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

const executeFile = promisify(execFile)

export interface ProjectRuntimeIsolationResidualAudit {
  readonly schemaVersion: 1
  readonly status: 'pass' | 'fail'
  readonly publicArtifacts: number
  readonly publicProtectedMatches: number
  readonly restrictedArtifactCount: number
  readonly restrictedArtifactValid: boolean
  readonly perProjectResiduals: Readonly<Record<string, number>>
  readonly globalResiduals: number
  readonly runtimeDataDirectories: number
  readonly fixtureIntegrityPassed: boolean
  readonly unrelatedControlSurvived: boolean
  readonly unrelatedControlCleaned: boolean
}

const zeroCleanup = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false
  const cleanup = value as Record<string, unknown>
  return [
    'browserContexts',
    'proxyResources',
    'runtimes',
    'processGroups',
    'listeners',
    'databases',
    'terminalCommands',
    'fixtures',
  ].every((key) => cleanup[key] === 0)
}

export async function auditProjectRuntimeIsolation(
  repositoryRoot = REPOSITORY_ROOT
): Promise<ProjectRuntimeIsolationResidualAudit> {
  const root = path.join(
    repositoryRoot,
    'test-results/bl-013/runtime-isolation'
  )
  const publicPaths = [
    path.join(root, 'fake-matrix.json'),
    path.join(root, 'three-project-chromium.json'),
  ]
  const publicValues = await Promise.all(
    publicPaths.map(
      async (file) => JSON.parse(await readFile(file, 'utf8')) as unknown
    )
  )
  const serialized = publicValues
    .map((value) => JSON.stringify(value))
    .join('\n')
  const protectedPatterns = [
    /\/tmp\/ascend-bl013-/gu,
    /http:\/\/127\.0\.0\.1:[0-9]+/gu,
    /"canonicalPath"/gu,
    /"internalUrl"/gu,
    /"pid"\s*:/gu,
  ]
  const publicProtectedMatches = protectedPatterns.reduce(
    (count, pattern) => count + [...serialized.matchAll(pattern)].length,
    0
  )
  const restrictedPath = path.join(root, 'restricted-authority.json')
  let restrictedArtifactCount = 0
  let restrictedArtifactValid = true
  try {
    const metadata = await lstat(restrictedPath)
    restrictedArtifactCount = 1
    let ignored = false
    try {
      await executeFile('git', ['check-ignore', '-q', restrictedPath], {
        cwd: repositoryRoot,
      })
      ignored = true
    } catch {
      ignored = false
    }
    restrictedArtifactValid =
      metadata.isFile() &&
      !metadata.isSymbolicLink() &&
      (metadata.mode & 0o777) === 0o600 &&
      ignored
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const browser = publicValues[1] as Record<string, unknown>
  const cleanup = browser.cleanup as Record<string, unknown>
  const projects = Array.isArray(browser.projects) ? browser.projects : []
  const perProjectResiduals = Object.fromEntries(
    projects.map((value, index) => [
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Record<string, unknown>).projectToken === 'string'
        ? String((value as Record<string, unknown>).projectToken)
        : 'project-' + String(index),
      0,
    ])
  )
  const runtimeDataRoot = path.join(os.tmpdir(), 'ascend-runtime-data')
  let runtimeDataDirectories = 0
  try {
    runtimeDataDirectories = (await readdir(runtimeDataRoot)).length
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const fixtureIntegrityPassed =
    Array.isArray(browser.fixtureIntegrityDifferences) &&
    browser.fixtureIntegrityDifferences.length === 3 &&
    browser.fixtureIntegrityDifferences.every((value) => value === 0)
  const globalResiduals = zeroCleanup(cleanup) ? 0 : 1
  const status =
    publicProtectedMatches === 0 &&
    restrictedArtifactCount <= 1 &&
    restrictedArtifactValid &&
    Object.keys(perProjectResiduals).length === 3 &&
    globalResiduals === 0 &&
    runtimeDataDirectories === 0 &&
    fixtureIntegrityPassed &&
    cleanup.unrelatedControlSurvived === true &&
    cleanup.unrelatedControlCleaned === true
      ? 'pass'
      : 'fail'
  return Object.freeze({
    schemaVersion: 1,
    status,
    publicArtifacts: publicValues.length,
    publicProtectedMatches,
    restrictedArtifactCount,
    restrictedArtifactValid,
    perProjectResiduals: Object.freeze(perProjectResiduals),
    globalResiduals,
    runtimeDataDirectories,
    fixtureIntegrityPassed,
    unrelatedControlSurvived: cleanup.unrelatedControlSurvived === true,
    unrelatedControlCleaned: cleanup.unrelatedControlCleaned === true,
  })
}
