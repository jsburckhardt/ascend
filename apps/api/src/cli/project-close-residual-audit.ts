import { createHash } from 'node:crypto'
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
} from '../project-runtime-process.js'
import {
  BL020_AUDIT_RESIDUAL_CLASSES,
  classifyCloseEpisodeArtifact,
  serializeCloseResidualAudit,
  validateCloseResidualAudit,
  type Bl020AuditResidualClass,
  type CloseResidualAuditReport,
  type CloseTeardownProbe,
} from '../project-close-evidence.js'

/**
 * `just proof-runtime-close-residual-audit`.
 *
 * Re-observes the nine residual classes from the host, the database directory,
 * the filesystem, the process table, listener availability, and live requests.
 * Every count is produced by this process's own probe: no value is copied from
 * the matrix artifact, and the episode artifact supplies only the identities to
 * look for. A withheld probe or a non-zero count fails the run.
 */

class ArtifactMalformedError extends Error {
  readonly category = 'artifact-malformed'
}
class ArtifactUnfinalizedError extends Error {
  readonly category = 'artifact-unfinalized'
}
class ArtifactNotClearError extends Error {
  readonly category = 'artifact-not-clear'
}

interface Identity {
  readonly pid: number
  readonly processStartTime: string
}

/**
 * The private observation sidecar the designated proof writes beside the
 * public artifact. It carries the exact identities cleanup and re-observation
 * need, and is never committed.
 */
interface CloseObservationSidecar {
  readonly apiIdentities: readonly Identity[]
  readonly workbenchIdentities: readonly Identity[]
  readonly processGroupIds: readonly number[]
  readonly listenerPorts: readonly number[]
  readonly activeRequestPorts: readonly number[]
  readonly databaseSidecarPaths: readonly string[]
  readonly disposablePaths: readonly string[]
  readonly inFlightCloseOperations: number
  readonly timerHandles: number
  readonly proxyConnections: number
}

const root = path.resolve(import.meta.dirname, '../../../..')
const resultRoot = path.join(root, 'test-results/bl-020')
const defaultEpisodePath = path.join(resultRoot, 'designated-episode.json')
const episodePath = path.resolve(process.argv[2] ?? defaultEpisodePath)
const sidecarPath = path.join(
  path.dirname(episodePath),
  'designated-observations.json'
)
const outputPath = path.join(path.dirname(episodePath), 'residual-audit.json')
const retainedOutputPath = path.join(
  root,
  'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/residual-audit.json'
)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isIdentity = (value: unknown): value is Identity =>
  isRecord(value) &&
  Number.isSafeInteger(value.pid) &&
  Number(value.pid) > 0 &&
  typeof value.processStartTime === 'string' &&
  value.processStartTime.length > 0

const isPort = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 65_535

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

function parseSidecar(value: unknown): CloseObservationSidecar {
  if (
    !isRecord(value) ||
    !Array.isArray(value.apiIdentities) ||
    !value.apiIdentities.every(isIdentity) ||
    !Array.isArray(value.workbenchIdentities) ||
    !value.workbenchIdentities.every(isIdentity) ||
    !Array.isArray(value.processGroupIds) ||
    !value.processGroupIds.every((entry) => Number.isSafeInteger(entry)) ||
    !Array.isArray(value.listenerPorts) ||
    !value.listenerPorts.every(isPort) ||
    !Array.isArray(value.activeRequestPorts) ||
    !value.activeRequestPorts.every(isPort) ||
    !isStringArray(value.databaseSidecarPaths) ||
    !isStringArray(value.disposablePaths) ||
    !isNonNegativeInteger(value.inFlightCloseOperations) ||
    !isNonNegativeInteger(value.timerHandles) ||
    !isNonNegativeInteger(value.proxyConnections)
  ) {
    throw new ArtifactMalformedError(
      'The designated observation sidecar is malformed'
    )
  }
  return {
    apiIdentities: value.apiIdentities,
    workbenchIdentities: value.workbenchIdentities,
    processGroupIds: value.processGroupIds,
    listenerPorts: value.listenerPorts,
    activeRequestPorts: value.activeRequestPorts,
    databaseSidecarPaths: value.databaseSidecarPaths,
    disposablePaths: value.disposablePaths,
    inFlightCloseOperations: value.inFlightCloseOperations,
    timerHandles: value.timerHandles,
    proxyConnections: value.proxyConnections,
  }
}

async function probe(
  observe: () => Promise<number>
): Promise<CloseTeardownProbe> {
  const residual = await observe()
  return Object.freeze({ probeCompleted: true, residual })
}

async function identityPresent(identity: Identity): Promise<boolean> {
  const observed = await readProcessStartTime(identity.pid)
  return observed !== null && observed === identity.processStartTime
}

async function pathPresent(candidate: string): Promise<boolean> {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

const tcpPort = (address: string): number => {
  const separator = address.lastIndexOf(':')
  if (separator < 0) return -1
  const parsed = Number.parseInt(address.slice(separator + 1), 16)
  return Number.isSafeInteger(parsed) ? parsed : -1
}

/**
 * The two `/proc/net/tcp` states that are not a residual connection, and the
 * only two. `0A` is LISTEN, which the listener class owns and re-observes on
 * its own. `06` is TIME_WAIT, which the kernel holds for 2xMSL only *after
 * both endpoints completed their FIN exchange*: no socket and therefore no
 * process owns the tuple, and no byte can cross it. Every other non-listening
 * state — ESTABLISHED, the SYN and FIN transitions, CLOSE_WAIT, LAST_ACK, and
 * CLOSING — implies an endpoint that still holds the connection, so a genuine
 * leak is still counted and this exclusion can mask none of them.
 */
const NON_RESIDUAL_TCP_STATES: ReadonlySet<string> = new Set(['0A', '06'])

async function countConnections(ports: readonly number[]): Promise<number> {
  const selected = new Set(ports)
  const tables = await Promise.all([
    readFile('/proc/net/tcp', 'utf8'),
    readFile('/proc/net/tcp6', 'utf8'),
  ])
  return tables
    .flatMap((table) => table.trim().split('\n').slice(1))
    .filter((line) => {
      const fields = line.trim().split(/\s+/u)
      if (fields.length < 4 || NON_RESIDUAL_TCP_STATES.has(fields[3] ?? ''))
        return false
      return (
        selected.has(tcpPort(fields[1] ?? '')) ||
        selected.has(tcpPort(fields[2] ?? ''))
      )
    }).length
}

const sum = (counts: readonly number[]): number =>
  counts.reduce<number>((total, count) => total + count, 0)

async function observeResiduals(
  sidecar: CloseObservationSidecar
): Promise<Record<Bl020AuditResidualClass, CloseTeardownProbe>> {
  const apiProcessCount = async (): Promise<number> =>
    sum(
      await Promise.all(
        sidecar.apiIdentities.map(async (identity) =>
          (await identityPresent(identity)) ? 1 : 0
        )
      )
    )
  return {
    apiProcesses: await probe(apiProcessCount),
    workbenchProcesses: await probe(async () =>
      sum(
        await Promise.all(
          sidecar.workbenchIdentities.map(async (identity) =>
            (await identityPresent(identity)) ? 1 : 0
          )
        )
      )
    ),
    attributableDescendants: await probe(async () =>
      sum(
        await Promise.all(
          sidecar.processGroupIds.map(
            async (group) => (await readProcessGroupMembers(group)).length
          )
        )
      )
    ),
    listeners: await probe(async () =>
      sum(
        await Promise.all(
          sidecar.listenerPorts.map(async (port) =>
            (await loopbackListenerIsAbsent(port)) ? 0 : 1
          )
        )
      )
    ),
    proxyConnections: await probe(async () =>
      countConnections(sidecar.activeRequestPorts)
    ),
    // Timers and in-flight Close operations are process-owned. Exact absence
    // of every recorded API identity proves both classes absent without
    // trusting the sidecar's captured counters.
    timers: await probe(apiProcessCount),
    inFlightCloseOperations: await probe(apiProcessCount),
    databaseSidecars: await probe(async () =>
      sum(
        await Promise.all(
          sidecar.databaseSidecarPaths.map(async (candidate) =>
            (await pathPresent(candidate)) ? 1 : 0
          )
        )
      )
    ),
    disposableFixtures: await probe(async () =>
      sum(
        await Promise.all(
          sidecar.disposablePaths.map(async (candidate) =>
            (await pathPresent(candidate)) ? 1 : 0
          )
        )
      )
    ),
  }
}

async function writeAtomically(destination: string, serialized: string) {
  await mkdir(path.dirname(destination), { recursive: true })
  const staged = destination + '.staged'
  await writeFile(staged, serialized)
  await rename(staged, destination)
}

async function emit(result: Record<string, unknown>, failed: boolean) {
  const serialized = JSON.stringify(result, null, 2) + String.fromCharCode(10)
  await writeAtomically(outputPath, serialized)
  if (!failed && episodePath === defaultEpisodePath)
    await writeAtomically(retainedOutputPath, serialized)
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (failed) process.exitCode = 1
}

const main = async (): Promise<void> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(episodePath, 'utf8'))
  } catch {
    throw new ArtifactMalformedError('The episode artifact is unreadable')
  }
  const classification = classifyCloseEpisodeArtifact(parsed)
  if (classification === 'malformed')
    throw new ArtifactMalformedError('The episode artifact is malformed')
  if (classification === 'unfinalized')
    throw new ArtifactUnfinalizedError('The episode artifact is unfinalized')
  if (classification === 'not-clear')
    throw new ArtifactNotClearError('The episode artifact is not clear')

  let sidecarSource: string
  try {
    sidecarSource = await readFile(sidecarPath, 'utf8')
  } catch {
    throw new ArtifactMalformedError(
      'The designated observation sidecar is missing'
    )
  }
  let parsedSidecar: unknown
  try {
    parsedSidecar = JSON.parse(sidecarSource)
  } catch {
    throw new ArtifactMalformedError(
      'The designated observation sidecar is malformed'
    )
  }
  const sidecar = parseSidecar(parsedSidecar)

  const classes = await observeResiduals(sidecar)
  const violations = validateCloseResidualAudit({
    evidenceId: 'bl-020-residual-audit',
    observedIndependently: true,
    classes,
    clear: BL020_AUDIT_RESIDUAL_CLASSES.every(
      (auditClass) =>
        classes[auditClass].probeCompleted && classes[auditClass].residual === 0
    ),
  })
  const report: CloseResidualAuditReport = Object.freeze({
    evidenceId: 'bl-020-residual-audit',
    observedIndependently: true,
    classes: Object.freeze(classes),
    clear: violations.length === 0,
  })
  const episodeSha256 = createHash('sha256')
    .update(await readFile(episodePath))
    .digest('hex')
  await emit(
    {
      command: 'proof-runtime-close-residual-audit',
      status: violations.length === 0 ? 'ok' : 'failed',
      schemaVersion: 1,
      observer: {
        process: 'separate-cli',
        source: 'apps/api/src/cli/project-close-residual-audit.ts',
        methods: {
          processes: 'pid-start-time',
          descendants: 'process-group-members',
          listeners: 'listener-bind-probe',
          connections: 'proc-net-tcp',
          paths: 'filesystem-access',
          processOwnedState: 'api-identity-absence',
        },
      },
      designatedEpisodeSha256: episodeSha256,
      ...(JSON.parse(serializeCloseResidualAudit(report)) as object),
      violations,
      finalizedAtomically: true,
    },
    violations.length > 0
  )
}

const categoryFor = (error: unknown): string =>
  error instanceof ArtifactMalformedError ||
  error instanceof ArtifactUnfinalizedError ||
  error instanceof ArtifactNotClearError
    ? error.category
    : 'audit-failed'

const recordFailure = async (error: unknown): Promise<void> => {
  await emit(
    {
      command: 'proof-runtime-close-residual-audit',
      status: 'failed',
      schemaVersion: 1,
      category: categoryFor(error),
      error: error instanceof Error ? error.message : 'unknown audit failure',
    },
    true
  )
}

await main().then(undefined, recordFailure)
