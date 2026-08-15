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

interface StopEpisode {
  readonly schemaVersion: number
  readonly attributionCeiling: string
  readonly root: RecordedIdentity
  readonly members: readonly RecordedIdentity[]
  readonly processGroupId: number
  readonly listenerPort: number
  readonly audit: {
    readonly processAbsent: boolean
    readonly processGroupAbsent: boolean
    readonly listenerAbsent: boolean
  }
}

const COMMAND = 'proof-runtime-stop-residual-audit'
const root = path.resolve(import.meta.dirname, '../../../..')
const resultRoot = path.join(root, 'test-results/bl-017')
// The recipe passes no arguments and audits the designated episode. An explicit
// episode path lets the unit test drive controlled artifacts without disturbing
// the disposable artifact written by `just proof-runtime-stop`.
const episodePath = path.resolve(
  process.argv[2] ?? path.join(resultRoot, 'designated-episode.json')
)
const outputRoot = path.dirname(episodePath)
const outputPath = path.join(outputRoot, 'residual-audit.json')

const identityPresent = async (identity: RecordedIdentity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) === identity.processStartTime

const main = async (): Promise<void> => {
  const episode = JSON.parse(await readFile(episodePath, 'utf8')) as StopEpisode
  if (episode.schemaVersion !== 1)
    throw new Error('Unsupported episode schema version')
  if (episode.members.length === 0)
    throw new Error('Episode recorded no owned process-group members')

  const rootResidual = (await identityPresent(episode.root)) ? 1 : 0
  const memberResiduals = await Promise.all(
    episode.members.map(async (member): Promise<number> =>
      (await identityPresent(member)) ? 1 : 0
    )
  )
  const groupResidual =
    (await readProcessGroupMembers(episode.processGroupId)).length > 0 ? 1 : 0
  const listenerResidual = (await loopbackListenerIsAbsent(
    episode.listenerPort
  ))
    ? 0
    : 1
  const claimedAbsent =
    episode.audit.processAbsent &&
    episode.audit.processGroupAbsent &&
    episode.audit.listenerAbsent
  const memberResidualCount = memberResiduals.reduce(
    (total, residual) => total + residual,
    0
  )
  const residuals = {
    rootIdentity: rootResidual,
    memberIdentities: memberResidualCount,
    processGroup: groupResidual,
    listeners: listenerResidual,
  }
  const status =
    claimedAbsent &&
    rootResidual === 0 &&
    memberResidualCount === 0 &&
    groupResidual === 0 &&
    listenerResidual === 0
      ? 'ok'
      : 'failed'
  const result = {
    command: COMMAND,
    status,
    schemaVersion: episode.schemaVersion,
    attributionCeiling: episode.attributionCeiling,
    checked: {
      rootIdentities: 1,
      memberIdentities: episode.members.length,
      processGroups: 1,
      listeners: 1,
    },
    claimedAbsent,
    residuals,
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
      category: 'runtime-stop-episode-unavailable',
      action: 'Run just proof-runtime-stop before retrying.',
      error: error instanceof Error ? error.message : 'unknown audit failure',
    }) + String.fromCharCode(10)
  )
  process.exitCode = 1
})
