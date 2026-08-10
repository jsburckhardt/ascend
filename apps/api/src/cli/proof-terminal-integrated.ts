import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  INTEGRATED_COMMAND_IDENTITIES,
  INTEGRATED_RAW_EVIDENCE,
  canonicalFixturePath,
} from '../workbench-proof-contract.js'
import {
  TerminalProofError,
  captureTerminalContext,
  writeJsonAtomic,
  type TrackedTerminalCommandIdentity,
} from '../workbench-proof-terminal.js'

const integratedRawEvidence =
  process.env.ASCEND_PROOF_INTEGRATED_EVIDENCE ?? INTEGRATED_RAW_EVIDENCE
const integratedCommandIdentities =
  process.env.ASCEND_PROOF_COMMAND_IDENTITIES ?? INTEGRATED_COMMAND_IDENTITIES

interface IntegratedCommandTracker {
  version: 1
  owner: TrackedTerminalCommandIdentity
  processGroupLeader: TrackedTerminalCommandIdentity
  commands: TrackedTerminalCommandIdentity[]
}

const readIdentity = (
  pid: number,
  command: string
): TrackedTerminalCommandIdentity => {
  const stat = readFileSync('/proc/' + String(pid) + '/stat', 'utf8')
  const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
  return {
    pid,
    pgid: Number(fields[2]),
    startTimeTicks: fields[19],
    command,
    context: 'integrated',
  }
}

const writeTracker = (tracker: IntegratedCommandTracker): void => {
  mkdirSync(path.dirname(integratedCommandIdentities), { recursive: true })
  const temporary = integratedCommandIdentities + '.tmp'
  writeFileSync(temporary, JSON.stringify(tracker) + '\n', { mode: 0o600 })
  renameSync(temporary, integratedCommandIdentities)
}

export const runIntegratedTerminalCapture = async (): Promise<number> => {
  try {
    const owner = readIdentity(process.pid, 'proof-terminal-integrated')
    const tracker: IntegratedCommandTracker = {
      version: 1,
      owner,
      processGroupLeader: readIdentity(
        owner.pgid,
        'proof-terminal-integrated process group'
      ),
      commands: [],
    }
    writeTracker(tracker)
    const cwd = await canonicalFixturePath()
    const evidence = await captureTerminalContext({
      context: 'integrated',
      cwd,
      onProcessStarted: (identity) => {
        tracker.commands.push(identity)
        writeTracker(tracker)
      },
    })
    await writeJsonAtomic(integratedRawEvidence, evidence)
    return 0
  } catch (error) {
    const diagnostic =
      error instanceof TerminalProofError
        ? { code: error.code, message: error.message, details: error.details }
        : {
            code: 'terminal-command-spawn',
            message: 'Unexpected integrated terminal capture failure',
            details: {},
          }
    process.stderr.write(JSON.stringify(diagnostic) + '\n')
    return 1
  }
}

/* v8 ignore next -- invoked from the real code-server integrated terminal */
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  process.exitCode = await runIntegratedTerminalCapture()
}
