import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createConnection } from 'node:net'
import path from 'node:path'
import {
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  validateReconcileEpisode,
  type ReconcileApiGeneration,
  type ReconcileControlRecord,
  type ReconcileEpisode,
  type ReconcileEpisodeTeardown,
} from '../runtime-reconcile-evidence.js'

interface Identity {
  readonly pid: number
  readonly processStartTime: string
}

class ArtifactUnfinalizedError extends Error {}
class ArtifactNotClearError extends Error {}
class ArtifactMalformedError extends Error {}

const root = path.resolve(import.meta.dirname, '../../../..')
const resultRoot = path.join(root, 'test-results/bl-019')
const episodePath = path.resolve(
  process.argv[2] ?? path.join(resultRoot, 'designated-episode.json')
)
const outputPath = path.join(path.dirname(episodePath), 'residual-audit.json')
const classes = [
  'apiProcesses',
  'workbenchProcesses',
  'attributableDescendants',
  'listeners',
  'activeRequests',
  'disposableFixtures',
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isIdentity = (value: unknown): value is Identity =>
  isRecord(value) &&
  Number.isSafeInteger(value.pid) &&
  Number(value.pid) > 0 &&
  typeof value.processStartTime === 'string' &&
  value.processStartTime.length > 0
const isProbe = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.probeCompleted === 'boolean' &&
  (value.residual === null ||
    (Number.isSafeInteger(value.residual) && Number(value.residual) >= 0))
const isTeardown = (value: unknown): value is ReconcileEpisodeTeardown => {
  if (
    !isRecord(value) ||
    !['proven-clear', 'unproven', 'residual-present'].includes(
      String(value.status)
    ) ||
    !isRecord(value.probes)
  )
    return false
  const probes = value.probes
  return (
    classes.every((name) => isProbe(probes[name])) &&
    Object.keys(probes).length === classes.length
  )
}
const isPort = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 65_535
const isGeneration = (value: unknown): value is ReconcileApiGeneration =>
  isRecord(value) &&
  isIdentity(value) &&
  Array.isArray(value.argv) &&
  value.argv.every((argument) => typeof argument === 'string') &&
  isPort(value.listenerPort) &&
  typeof value.listenerInode === 'string' &&
  Number.isSafeInteger(value.listenerOwnerPid) &&
  isRecord(value.httpRequests) &&
  Number.isSafeInteger(value.httpRequests.issued) &&
  Number.isSafeInteger(value.httpRequests.succeeded) &&
  isRecord(value.database) &&
  typeof value.database.path === 'string' &&
  Number.isSafeInteger(value.database.bytes) &&
  (value.database.projectRowsObserved === null ||
    Number.isSafeInteger(value.database.projectRowsObserved)) &&
  Number.isSafeInteger(value.boundMs) &&
  Number.isSafeInteger(value.settlementElapsedMs) &&
  typeof value.pendingObserved === 'boolean'
const isWorkbenchRecord = (
  value: unknown
): value is ReconcileEpisode['workbenches'][number] =>
  isRecord(value) &&
  isIdentity(value) &&
  Number.isSafeInteger(value.processGroupId) &&
  Number(value.processGroupId) > 0 &&
  isPort(value.listenerPort)
const isActiveRequest = (value: unknown): value is { listenerPort: number } =>
  isRecord(value) && isPort(value.listenerPort)
const hasControlEvidence = (value: Record<string, unknown>): boolean =>
  isIdentity(value.identity) &&
  (value.listenerPort === null || isPort(value.listenerPort)) &&
  isRecord(value.markers) &&
  (value.markers.pathMarker === null ||
    typeof value.markers.pathMarker === 'string') &&
  (value.markers.tokenMarker === null ||
    typeof value.markers.tokenMarker === 'string') &&
  typeof value.observedAlive === 'boolean' &&
  typeof value.adopted === 'boolean' &&
  Number.isSafeInteger(value.signalsSent)
const isControl = (
  value: unknown
): value is ReconcileEpisode['controls'][number] =>
  isRecord(value) && hasControlEvidence(value)
const isSubepisodeControl = (value: unknown): value is ReconcileControlRecord =>
  isRecord(value) &&
  hasControlEvidence(value) &&
  Number.isSafeInteger(value.candidateCountForItsProject) &&
  typeof value.settledPublicState === 'string' &&
  (value.publicFailureCategory === null ||
    typeof value.publicFailureCategory === 'string') &&
  (value.declaredRefusalReason === null ||
    typeof value.declaredRefusalReason === 'string') &&
  (value.observedRefusalReason === null ||
    typeof value.observedRefusalReason === 'string') &&
  Number.isSafeInteger(value.acquisitionStatus) &&
  Number.isSafeInteger(value.stopStatus) &&
  Number.isSafeInteger(value.restartStatus) &&
  Number.isSafeInteger(value.lifecycleEvents) &&
  Number.isSafeInteger(value.launches) &&
  typeof value.identityUnchangedBeforeTeardown === 'boolean'
const isControlSubepisode = (
  value: unknown
): value is NonNullable<ReconcileEpisode['controlSubepisode']> =>
  isRecord(value) &&
  Array.isArray(value.generations) &&
  value.generations.every(isGeneration) &&
  Array.isArray(value.controls) &&
  value.controls.every(isSubepisodeControl) &&
  isRecord(value.residuals) &&
  Object.values(value.residuals).every(isProbe) &&
  isRecord(value.teardown) &&
  value.teardown.status === 'proven-clear' &&
  typeof value.clearedBeforePhase === 'string'
const isEpisode = (value: unknown): value is ReconcileEpisode =>
  isRecord(value) &&
  value.schemaVersion === 1 &&
  value.measurementOrigin === 'api-process-spawn' &&
  Array.isArray(value.phaseOrder) &&
  value.phaseOrder.every((phase) => typeof phase === 'string') &&
  isRecord(value.startupControl) &&
  isGeneration(value.startupControl.generation) &&
  isControlSubepisode(value.controlSubepisode) &&
  value.residualCount === null &&
  Array.isArray(value.apiGenerations) &&
  value.apiGenerations.every(isGeneration) &&
  Array.isArray(value.workbenches) &&
  value.workbenches.every(isWorkbenchRecord) &&
  Array.isArray(value.activeRequests) &&
  value.activeRequests.every(isActiveRequest) &&
  Array.isArray(value.disposablePaths) &&
  value.disposablePaths.every(
    (candidate) => typeof candidate === 'string' && path.isAbsolute(candidate)
  ) &&
  Array.isArray(value.controls) &&
  value.controls.every(isControl) &&
  (value.teardown === null || isTeardown(value.teardown))
const parseEpisode = (value: unknown): ReconcileEpisode => {
  if (!isEpisode(value))
    throw new ArtifactMalformedError('Malformed designated episode')
  return value
}

const errorCode = (error: unknown): string | undefined =>
  isRecord(error) && typeof error.code === 'string' ? error.code : undefined
const identityPresent = async (identity: Identity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) === identity.processStartTime
const pathPresent = async (candidate: string): Promise<boolean> => {
  try {
    await access(candidate)
    return true
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return false
    throw error
  }
}
const requestPresent = async (port: number): Promise<boolean> =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    let settled = false
    const finish = (present: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(present)
    }
    socket.setTimeout(250)
    socket.once('connect', () => finish(true))
    socket.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET')
        finish(false)
      else {
        settled = true
        socket.destroy()
        reject(error)
      }
    })
    socket.once('timeout', () => finish(false))
  })

const probe = async (
  call: () => Promise<number>
): Promise<{ probeCompleted: boolean; residual: number | null }> => {
  try {
    return { probeCompleted: true, residual: await call() }
  } catch {
    return { probeCompleted: false, residual: null }
  }
}

const categoryFor = (error: unknown): string => {
  if (errorCode(error) === 'ENOENT') return 'runtime-reconcile-artifact-missing'
  if (error instanceof SyntaxError || error instanceof ArtifactMalformedError)
    return 'runtime-reconcile-artifact-malformed'
  if (error instanceof ArtifactUnfinalizedError)
    return 'runtime-reconcile-teardown-unfinalized'
  if (error instanceof ArtifactNotClearError)
    return 'runtime-reconcile-teardown-not-clear'
  return 'runtime-reconcile-audit-failed'
}

const main = async (): Promise<void> => {
  const parsed: unknown = JSON.parse(await readFile(episodePath, 'utf8'))
  const episode = parseEpisode(parsed)
  const teardown = episode.teardown
  if (teardown === null) throw new ArtifactUnfinalizedError('teardown-null')
  const validation = validateReconcileEpisode(episode)
  if (!validation.accepted)
    throw new ArtifactNotClearError(
      'episode-rejected:' + validation.violations.join(',')
    )
  const controlSubepisode = episode.controlSubepisode
  if (controlSubepisode === null)
    throw new ArtifactMalformedError('Control subepisode is missing')
  const apiGenerations = [
    episode.startupControl.generation,
    ...controlSubepisode.generations,
    ...episode.apiGenerations,
  ]
  const controls = [...controlSubepisode.controls, ...episode.controls]
  const listenerPorts = [
    ...new Set([
      ...apiGenerations.map(({ listenerPort }) => listenerPort),
      ...episode.workbenches.map(({ listenerPort }) => listenerPort),
      ...controls.flatMap(({ listenerPort }) =>
        listenerPort === null ? [] : [listenerPort]
      ),
    ]),
  ]
  const probes = {
    apiProcesses: await probe(
      async () =>
        (await Promise.all(apiGenerations.map(identityPresent))).filter(Boolean)
          .length
    ),
    workbenchProcesses: await probe(
      async () =>
        (await Promise.all(episode.workbenches.map(identityPresent))).filter(
          Boolean
        ).length
    ),
    attributableDescendants: await probe(async () => {
      const groupMembers = (
        await Promise.all(
          episode.workbenches.map(
            async ({ processGroupId }) =>
              (await readProcessGroupMembers(processGroupId)).length
          )
        )
      ).reduce<number>((total, count) => total + count, 0)
      const controlProcesses = (
        await Promise.all(
          controls.map(({ identity }) => identityPresent(identity))
        )
      ).filter(Boolean).length
      return groupMembers + controlProcesses
    }),
    listeners: await probe(async () =>
      (
        await Promise.all(
          listenerPorts.map(async (port) =>
            (await loopbackListenerIsAbsent(port)) ? 0 : 1
          )
        )
      ).reduce<number>((total, count) => total + count, 0)
    ),
    activeRequests: await probe(async () =>
      (
        await Promise.all(
          episode.activeRequests.map(async ({ listenerPort }) =>
            (await requestPresent(listenerPort)) ? 1 : 0
          )
        )
      ).reduce<number>((total, count) => total + count, 0)
    ),
    disposableFixtures: await probe(
      async () =>
        (await Promise.all(episode.disposablePaths.map(pathPresent))).filter(
          Boolean
        ).length
    ),
  }
  const residuals = Object.fromEntries(
    classes.map((name) => [name, probes[name].residual])
  )
  const agreement = classes.every(
    (name) =>
      probes[name].probeCompleted &&
      probes[name].residual === teardown.probes[name].residual
  )
  const controlSurvival =
    controlSubepisode.controls.length === 2 &&
    episode.controls.length === 1 &&
    controlSubepisode.controls.every(
      (control) =>
        control.observedAlive &&
        control.identityUnchangedBeforeTeardown &&
        control.signalsSent === 0
    ) &&
    episode.controls.every(
      (control) =>
        control.observedAlive && !control.adopted && control.signalsSent === 0
    )
  const controlSoleCandidacy = controlSubepisode.controls.every(
    ({ candidateCountForItsProject }) => candidateCountForItsProject === 1
  )
  const controlClearance =
    ['P0', 'P0b', 'P0c', 'P0d'].includes(
      controlSubepisode.clearedBeforePhase
    ) &&
    Object.keys(controlSubepisode.residuals).length > 0 &&
    Object.values(controlSubepisode.residuals).every(
      ({ probeCompleted, residual }) => probeCompleted && residual === 0
    )
  const generationAuthenticity = validation.accepted
  const status =
    agreement &&
    controlSurvival &&
    controlSoleCandidacy &&
    controlClearance &&
    generationAuthenticity &&
    classes.every((name) => probes[name].residual === 0)
      ? 'ok'
      : 'failed'
  const result = {
    command: 'proof-runtime-reconcile-residual-audit',
    status,
    schemaVersion: 1,
    probes,
    residuals,
    agreement,
    controlSurvival,
    controlSoleCandidacy,
    controlClearance,
    generationAuthenticity,
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    JSON.stringify(result, null, 2) + String.fromCharCode(10)
  )
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (status !== 'ok') process.exitCode = 1
}

const recordFailure = async (error: unknown): Promise<void> => {
  const result = {
    command: 'proof-runtime-reconcile-residual-audit',
    status: 'failed',
    category: categoryFor(error),
    error: error instanceof Error ? error.message : 'unknown audit failure',
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(
    outputPath,
    JSON.stringify(result, null, 2) + String.fromCharCode(10)
  )
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  process.exitCode = 1
}

await main().then(undefined, recordFailure)
