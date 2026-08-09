import {
  ProofError,
  startWorkbenchProof,
  type StartProofOptions,
} from '../workbench-proof-runtime.js'

export interface ProofCliIo {
  stdout: (content: string) => void
  stderr: (content: string) => void
}

const defaultIo: ProofCliIo = {
  stdout: (content) => process.stdout.write(content),
  stderr: (content) => process.stderr.write(content),
}

export const runProofStartCli = async (
  options: StartProofOptions = {},
  io: ProofCliIo = defaultIo
): Promise<number> => {
  try {
    const result = await startWorkbenchProof(options)
    io.stderr(
      JSON.stringify({
        event: 'runtime.start.succeeded',
        pid: result.handle.pid,
        elapsedMs: result.elapsedMs,
        readinessStatus: result.readinessStatus,
      }) + '\n'
    )
    io.stdout(JSON.stringify(result.handle) + '\n')
    return 0
  } catch (error) {
    const proofError =
      error instanceof ProofError
        ? error
        : new ProofError('spawn-failed', 'Unexpected proof start failure')
    io.stderr(
      JSON.stringify({
        event: 'runtime.start.failed',
        code: proofError.code,
        message: proofError.message,
        details: proofError.details,
      }) + '\n'
    )
    return 1
  }
}

/* v8 ignore next -- exercised by the root proof recipes in Playwright */
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  process.exitCode = await runProofStartCli()
}
