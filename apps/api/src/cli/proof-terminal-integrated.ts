import {
  INTEGRATED_RAW_EVIDENCE,
  canonicalFixturePath,
} from '../workbench-proof-contract.js'
import {
  TerminalProofError,
  captureTerminalContext,
  writeJsonAtomic,
} from '../workbench-proof-terminal.js'

export const runIntegratedTerminalCapture = async (): Promise<number> => {
  try {
    const cwd = await canonicalFixturePath()
    const evidence = await captureTerminalContext({
      context: 'integrated',
      cwd,
    })
    await writeJsonAtomic(INTEGRATED_RAW_EVIDENCE, evidence)
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
