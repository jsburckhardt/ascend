import { execFile } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  BL013_RESOURCE_CLASSES,
  validateProjectRuntimeIsolationEvidence,
} from './project-runtime-isolation-evidence.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from './project-runtime-process.js'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'

const executeFile = promisify(execFile)

export interface ProjectRuntimeIsolationResidualAudit {
  readonly schemaVersion: 2
  readonly status: 'pass' | 'fail'
  readonly publicArtifacts: number
  readonly publicProtectedMatches: number
  readonly protectedScansExecuted: number
  readonly restrictedArtifactCount: number
  readonly restrictedArtifactValid: boolean
  readonly restrictedProtectedMatches: number
  readonly perProjectResiduals: Readonly<Record<string, number>>
  readonly resourceResiduals: Readonly<Record<string, number>>
  readonly independentMeasurements: number
  readonly assignedZeroFailures: number
  readonly runtimeDataDirectories: number
  readonly fixtureIntegrityPassed: boolean
  readonly unrelatedControlSurvived: boolean
  readonly unrelatedControlCleaned: boolean
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const absent = async (target: string): Promise<boolean> =>
  lstat(target).then(
    () => false,
    () => true
  )

const measuredCleanup = (value: unknown) => {
  const cleanup = record(value)
  const checks = Array.isArray(cleanup?.checks)
    ? cleanup.checks.map(record)
    : []
  const assignedZeroFailures = checks.filter(
    (check) =>
      check?.after === 0 &&
      (check.executed !== true ||
        typeof check.method !== 'string' ||
        check.method.length === 0 ||
        !Number.isSafeInteger(check.before) ||
        Number(check.before) <= 0)
  ).length
  return {
    valid:
      cleanup?.measured === true &&
      typeof cleanup.measurementId === 'string' &&
      cleanup.measurementId.length > 0 &&
      checks.length === BL013_RESOURCE_CLASSES.length &&
      checks.every(
        (check, index) =>
          check?.resourceClass === BL013_RESOURCE_CLASSES[index] &&
          check.executed === true &&
          typeof check.method === 'string' &&
          check.method.length > 0 &&
          Number.isSafeInteger(check.before) &&
          Number(check.before) > 0 &&
          check.after === 0
      ),
    checks,
    assignedZeroFailures,
  }
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
  const [fake, browser] = await Promise.all(
    publicPaths.map(
      async (file) => JSON.parse(await readFile(file, 'utf8')) as unknown
    )
  )
  const serialized = JSON.stringify([fake, browser])
  const protectedPatterns = [
    /\/tmp\/ascend-bl013-/gu,
    /http:\/\/127\.0\.0\.1:[0-9]+/gu,
    /"canonicalPath"/gu,
    /"internalUrl"/gu,
    /"pid"\s*:/gu,
    /EDITOR_[A-Z]_SENTINEL/gu,
    /fixture-[abc]/gu,
    /branch-[abc]/gu,
  ]
  const publicProtectedMatches = protectedPatterns.reduce(
    (count, pattern) => count + [...serialized.matchAll(pattern)].length,
    0
  )
  const browserRecord = record(browser)
  const browserScan = record(browserRecord?.publicRedaction)
  const fakeRecord = record(fake)
  const fakeScans = Array.isArray(fakeRecord?.protectedScans)
    ? fakeRecord.protectedScans.map(record)
    : []
  const protectedScansExecuted = [browserScan, ...fakeScans].filter(
    (scan) =>
      scan?.scanner === 'scanProtectedEvidence' &&
      Number.isSafeInteger(scan.scannedBytes) &&
      Number(scan.scannedBytes) > 0 &&
      Array.isArray(scan.literalMatches) &&
      scan.literalMatches.length === 0 &&
      Array.isArray(scan.encodedMatches) &&
      scan.encodedMatches.length === 0
  ).length

  const restrictedPath = path.join(root, 'restricted-authority.json')
  let restrictedArtifactCount = 0
  let restrictedArtifactValid = false
  let restricted: Record<string, unknown> = {}
  try {
    const metadata = await lstat(restrictedPath)
    restrictedArtifactCount = 1
    restricted =
      record(JSON.parse(await readFile(restrictedPath, 'utf8'))) ?? {}
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
      ignored &&
      restricted.schemaVersion === 2 &&
      restricted.suite === 'BL-013'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  const runtimes = Array.isArray(restricted.runtimes)
    ? restricted.runtimes.map(record).filter((value) => value !== undefined)
    : []
  const perProjectEntries = await Promise.all(
    runtimes.map(async (runtime, index) => {
      const identities = [record(runtime.initial), record(runtime.current)]
        .filter((value) => value !== undefined)
        .filter(
          (value, identityIndex, all) =>
            all.findIndex(
              (candidate) =>
                candidate?.pid === value?.pid &&
                candidate?.processStartTime === value?.processStartTime &&
                candidate?.port === value?.port
            ) === identityIndex
        )
      let residuals = 0
      for (const identity of identities) {
        const pid = Number(identity?.pid)
        const start = String(identity?.processStartTime)
        const port = Number(identity?.port)
        if ((await readProcessStartTime(pid)) === start) residuals += 1
        if (!(await loopbackListenerIsAbsent(port))) residuals += 1
      }
      return [
        typeof runtime.projectToken === 'string'
          ? runtime.projectToken
          : 'project-' + String(index),
        residuals,
      ] as const
    })
  )
  const perProjectResiduals = Object.fromEntries(perProjectEntries)

  const restrictedSerialized = JSON.stringify(restricted)
  const restrictedProtectedMatches = [
    /EDITOR_[A-Z]_SENTINEL/gu,
    /fixture-[abc]/gu,
    /branch-[abc]/gu,
    /BL013_(?:PWD|ROOT|BRANCH|STATUS|MARKER|DONE)/gu,
    /EXTENSIONS_GALLERY/gu,
  ].reduce(
    (count, pattern) =>
      count + [...restrictedSerialized.matchAll(pattern)].length,
    0
  )
  const web = record(restricted.web)
  const webProcessResidual =
    web === undefined ||
    (await readProcessStartTime(Number(web.processId))) !== web.processStartTime
      ? 0
      : 1
  const listenerPorts = [
    record(restricted.api)?.listenerPort,
    web?.listenerPort,
    record(restricted.control)?.listenerPort,
  ].filter((value): value is number => Number.isSafeInteger(value))
  const independentListenerResiduals = (
    await Promise.all(
      listenerPorts.map(async (port) => !(await loopbackListenerIsAbsent(port)))
    )
  ).filter(Boolean).length
  const databasePaths = Array.isArray(restricted.databasePaths)
    ? restricted.databasePaths.filter(
        (value): value is string => typeof value === 'string'
      )
    : []
  const databaseResiduals = (
    await Promise.all(
      databasePaths.map(async (target) => !(await absent(target)))
    )
  ).filter(Boolean).length
  const fixtureResidual =
    typeof restricted.fixtureRoot === 'string' &&
    !(await absent(restricted.fixtureRoot))
      ? 1
      : 0
  const browserCleanup = measuredCleanup(browserRecord?.cleanup)
  const checkByClass = new Map(
    browserCleanup.checks.map((check) => [String(check?.resourceClass), check])
  )
  const resourceResiduals = Object.fromEntries(
    BL013_RESOURCE_CLASSES.map((resourceClass) => {
      const retained = Number(checkByClass.get(resourceClass)?.after ?? 1)
      const independent =
        resourceClass === 'runtime-processes'
          ? Object.values(perProjectResiduals).reduce(
              (sum, value) => sum + value,
              0
            )
          : resourceClass === 'process-groups'
            ? webProcessResidual
            : resourceClass === 'listeners'
              ? independentListenerResiduals
              : resourceClass === 'databases'
                ? databaseResiduals
                : resourceClass === 'fixtures'
                  ? fixtureResidual
                  : 0
      return [resourceClass, retained + independent]
    })
  )
  const runtimeDataRoot = path.join(os.tmpdir(), 'ascend-runtime-data')
  let runtimeDataDirectories = 0
  try {
    runtimeDataDirectories = (await readdir(runtimeDataRoot)).length
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const integrity = Array.isArray(browserRecord?.fixtureIntegrityDifferences)
    ? browserRecord.fixtureIntegrityDifferences
    : []
  const fixtureIntegrityPassed =
    integrity.length === 3 && integrity.every((value) => value === 0)
  const unrelatedControlSurvived =
    record(browserRecord?.cleanup)?.unrelatedControlSurvived === true
  const unrelatedControlCleaned =
    record(browserRecord?.cleanup)?.unrelatedControlCleaned === true
  const independentMeasurements =
    runtimes.length * 2 + listenerPorts.length + databasePaths.length + 1
  const assignedZeroFailures = browserCleanup.assignedZeroFailures
  const status =
    validateProjectRuntimeIsolationEvidence(fake) &&
    publicProtectedMatches === 0 &&
    protectedScansExecuted === fakeScans.length + 1 &&
    restrictedArtifactCount === 1 &&
    restrictedArtifactValid &&
    restrictedProtectedMatches === 0 &&
    runtimes.length === 3 &&
    browserCleanup.valid &&
    assignedZeroFailures === 0 &&
    Object.values(perProjectResiduals).every((value) => value === 0) &&
    Object.values(resourceResiduals).every((value) => value === 0) &&
    runtimeDataDirectories === 0 &&
    fixtureIntegrityPassed &&
    unrelatedControlSurvived &&
    unrelatedControlCleaned
      ? 'pass'
      : 'fail'
  return Object.freeze({
    schemaVersion: 2,
    status,
    publicArtifacts: publicPaths.length,
    publicProtectedMatches,
    protectedScansExecuted,
    restrictedArtifactCount,
    restrictedArtifactValid,
    restrictedProtectedMatches,
    perProjectResiduals: Object.freeze(perProjectResiduals),
    resourceResiduals: Object.freeze(resourceResiduals),
    independentMeasurements,
    assignedZeroFailures,
    runtimeDataDirectories,
    fixtureIntegrityPassed,
    unrelatedControlSurvived,
    unrelatedControlCleaned,
  })
}
