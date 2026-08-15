import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
} from '../project-runtime-process.js'

interface RecordedIdentity {
  readonly pid: number
  readonly processStartTime: string
}

interface RecordedGeneration {
  readonly root: RecordedIdentity
  readonly members: readonly RecordedIdentity[]
  readonly processGroupId: number
  readonly listenerPort: number
}

interface RecordedStaleConnection {
  readonly transport: 'http' | 'websocket'
  readonly listenerPort: number
}

interface RecordedAuditTriple {
  readonly processAbsent: boolean
  readonly processGroupAbsent: boolean
  readonly listenerAbsent: boolean
}

interface RecordedQuarantinedIdentity {
  readonly key: string
  readonly audit: RecordedAuditTriple
}

interface RecordedUnresolvedAdmission {
  readonly projectToken: string
  readonly admissionId: string
  readonly phase: string
}

interface RecordedOwnershipRecord {
  readonly key: string
  readonly provableAbsent: boolean
}

interface RecordedSettlementRow {
  readonly scenario: string
  // A withheld manager-side absence claim is published as null. It is never a
  // satisfied check and is never coerced to zero by this command.
  readonly residualCount: number | null
  // Validation-owned fixture teardown only. Never a manager absence claim and
  // never a substitute for `residualCount`.
  readonly teardownResidualCount: number
}

interface RestartEpisode {
  readonly schemaVersion: number
  readonly attributionCeiling: string
  readonly proofSplit: string
  readonly prior: RecordedGeneration
  readonly sequence: readonly RecordedGeneration[]
  readonly staleConnections: readonly RecordedStaleConnection[]
  readonly quarantinedIdentities: readonly RecordedQuarantinedIdentity[]
  readonly unresolvedAdmissions: readonly RecordedUnresolvedAdmission[]
  readonly priorOwnershipRecords: readonly RecordedOwnershipRecord[]
  readonly rows: readonly RecordedSettlementRow[]
}

const COMMAND = 'proof-runtime-restart-residual-audit'
const PROOF_SPLIT =
  'The episode is in-process and self-reported; this audit re-probes the exact recorded identities from a separate process and is the authority for late process, owned-group, and listener closure. It can only probe identities that were recorded, so an admission that never materialised has no tuple to probe and is reported as unresolved, never as a proven absence.'

const root = path.resolve(import.meta.dirname, '../../../..')
const resultRoot = path.join(root, 'test-results/bl-018')
// The recipe passes no arguments and audits the designated episode. An explicit
// episode path lets the unit test drive controlled artifacts without disturbing
// the disposable artifact written by `just proof-runtime-restart`.
const episodePath = path.resolve(
  process.argv[2] ?? path.join(resultRoot, 'designated-episode.json')
)
const outputRoot = path.dirname(episodePath)
const outputPath = path.join(outputRoot, 'residual-audit.json')

const identityPresent = async (identity: RecordedIdentity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) === identity.processStartTime

const countPresent = async (
  identities: readonly RecordedIdentity[]
): Promise<number> => {
  const present = await Promise.all(identities.map(identityPresent))
  return present.filter(Boolean).length
}

const listenerResidual = async (port: number): Promise<number> =>
  (await loopbackListenerIsAbsent(port)) ? 0 : 1

const groupResidual = async (processGroupId: number): Promise<number> =>
  (await readProcessGroupMembers(processGroupId)).length > 0 ? 1 : 0

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0)

const requireArray = <Value>(value: unknown, field: string): Value[] => {
  if (!Array.isArray(value))
    throw new Error('Episode field ' + field + ' is not an array')
  return value as Value[]
}

const main = async (): Promise<void> => {
  const episode = JSON.parse(
    await readFile(episodePath, 'utf8')
  ) as RestartEpisode
  if (episode.schemaVersion !== 1)
    throw new Error('Unsupported episode schema version')
  if (typeof episode.attributionCeiling !== 'string')
    throw new Error('Episode recorded no attribution ceiling')
  const priorMembers = requireArray<RecordedIdentity>(
    episode.prior?.members,
    'prior.members'
  )
  if (priorMembers.length === 0)
    throw new Error('Episode recorded no owned process-group members')
  const sequence = requireArray<RecordedGeneration>(
    episode.sequence,
    'sequence'
  )
  const staleConnections = requireArray<RecordedStaleConnection>(
    episode.staleConnections,
    'staleConnections'
  )
  const quarantinedIdentities = requireArray<RecordedQuarantinedIdentity>(
    episode.quarantinedIdentities,
    'quarantinedIdentities'
  )
  const unresolvedAdmissions = requireArray<RecordedUnresolvedAdmission>(
    episode.unresolvedAdmissions,
    'unresolvedAdmissions'
  )
  const priorOwnershipRecords = requireArray<RecordedOwnershipRecord>(
    episode.priorOwnershipRecords,
    'priorOwnershipRecords'
  )
  const rows = requireArray<RecordedSettlementRow>(episode.rows, 'rows')

  const staleHttp = staleConnections.filter(
    (connection) => connection.transport === 'http'
  )
  const staleSockets = staleConnections.filter(
    (connection) => connection.transport === 'websocket'
  )

  const residuals = {
    priorRootIdentities: (await identityPresent(episode.prior.root)) ? 1 : 0,
    priorMemberIdentities: await countPresent(priorMembers),
    priorProcessGroups: await groupResidual(episode.prior.processGroupId),
    priorListeners: await listenerResidual(episode.prior.listenerPort),
    staleHttpConnections: sum(
      await Promise.all(
        staleHttp.map(async (connection) =>
          listenerResidual(connection.listenerPort)
        )
      )
    ),
    staleWebSocketConnections: sum(
      await Promise.all(
        staleSockets.map(async (connection) =>
          listenerResidual(connection.listenerPort)
        )
      )
    ),
    sequenceIdentities: sum(
      await Promise.all(
        sequence.map(async (generation) =>
          sum([
            (await identityPresent(generation.root)) ? 1 : 0,
            await countPresent(generation.members),
            await groupResidual(generation.processGroupId),
            await listenerResidual(generation.listenerPort),
          ])
        )
      )
    ),
  }

  // Reported without conversion into a residual claim: an identity whose audit
  // triple is not fully absent is unconfirmed, not proven present or absent.
  const unconfirmedQuarantine = quarantinedIdentities.filter(
    (identity) =>
      !identity.audit.processAbsent ||
      !identity.audit.processGroupAbsent ||
      !identity.audit.listenerAbsent
  )
  const unprovableOwnershipRecords = priorOwnershipRecords.filter(
    (record) => !record.provableAbsent
  )
  const unresolvedResiduals = rows
    .filter((row) => row.residualCount === null)
    .map((row) => ({ scenario: row.scenario, residualCount: null }))
  const claimedResidualTotal = sum(
    rows
      .filter((row) => row.residualCount !== null)
      .map((row) => row.residualCount as number)
  )
  const teardownResidualTotal = sum(
    rows.map((row) => row.teardownResidualCount)
  )

  const residualTotal = sum(Object.values(residuals))
  const status =
    residualTotal === 0 &&
    claimedResidualTotal === 0 &&
    unresolvedResiduals.length === 0 &&
    unconfirmedQuarantine.length === 0 &&
    unprovableOwnershipRecords.length === 0 &&
    unresolvedAdmissions.length === 0
      ? 'ok'
      : 'failed'

  const result = {
    command: COMMAND,
    status,
    schemaVersion: episode.schemaVersion,
    attributionCeiling: episode.attributionCeiling,
    proofSplit: PROOF_SPLIT,
    checked: {
      priorRootIdentities: 1,
      priorMemberIdentities: priorMembers.length,
      priorProcessGroups: 1,
      priorListeners: 1,
      staleHttpConnections: staleHttp.length,
      staleWebSocketConnections: staleSockets.length,
      sequenceGenerations: sequence.length,
    },
    residuals,
    unresolvedAdmissions,
    quarantinedIdentities: unconfirmedQuarantine,
    unprovableOwnershipRecords,
    unresolvedResiduals,
    claimedResidualTotal,
    // Validation-owned fixture teardown. Reported beside, never merged into,
    // the manager-side residual classes above.
    teardownResidualCount: teardownResidualTotal,
  }
  await mkdir(outputRoot, { recursive: true })
  await writeFile(
    outputPath,
    JSON.stringify(result, null, 2) + String.fromCharCode(10)
  )
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (status !== 'ok') process.exitCode = 1
}

await main().catch((error: unknown) => {
  process.stdout.write(
    JSON.stringify({
      command: COMMAND,
      status: 'failed',
      category: 'runtime-restart-episode-unavailable',
      action: 'Run just proof-runtime-restart before retrying.',
      error: error instanceof Error ? error.message : 'unknown audit failure',
    }) + String.fromCharCode(10)
  )
  process.exitCode = 1
})
