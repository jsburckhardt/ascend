import {
  ProofError,
  stopWorkbenchProof,
  type StopProofOptions,
} from '../workbench-proof-runtime.js'
import type { ProofCliIo } from './proof-start.js'

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const defaultIo: ProofCliIo = {
  stdout: (content) => process.stdout.write(content),
  stderr: (content) => process.stderr.write(content),
}

export const runProofStopCli = async (
  handleInput: string,
  options: StopProofOptions = {},
  io: ProofCliIo = defaultIo
): Promise<number> => {
  try {
    const result = await stopWorkbenchProof(handleInput, options)
    io.stderr(
      JSON.stringify({
        event: 'runtime.stop.succeeded',
        alreadyAbsent: result.alreadyAbsent,
        elapsedMs: result.elapsedMs,
      }) + '\n'
    )
    return 0
  } catch (error) {
    const proofError =
      error instanceof ProofError
        ? error
        : new ProofError('invalid-handle', 'Unexpected proof stop failure')
    io.stderr(
      JSON.stringify({
        event: 'runtime.stop.failed',
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
  process.exitCode = await runProofStopCli(await readStdin())
}
