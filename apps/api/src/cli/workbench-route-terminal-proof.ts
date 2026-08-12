import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  canonicalFixturePath,
  REPOSITORY_ROOT,
} from '../workbench-proof-contract.js'

export const WORKBENCH_ROUTE_TERMINAL_BYTES = 256 * 1024
export const WORKBENCH_ROUTE_TERMINAL_INPUT = 'ASCII_A_TO_Z_CYCLE_V1'
export const WORKBENCH_ROUTE_TERMINAL_SHA256 =
  '28219a4009bf9b4243657a9b9dad77d5395848b5e32cbed5534a0b5dbf47f790'
export const WORKBENCH_ROUTE_TERMINAL_TEMP = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-011/.terminal-proof.json'
)

const writeTerminalOutput = (chunk: string | Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    process.stdout.write(chunk, (error) =>
      error === undefined || error === null ? resolve() : reject(error)
    )
  })

export async function runWorkbenchRouteTerminalProof(): Promise<number> {
  const canonicalPath = await canonicalFixturePath()
  const output = Buffer.alloc(WORKBENCH_ROUTE_TERMINAL_BYTES)
  for (let index = 0; index < output.length; index += 1)
    output[index] = 65 + (index % 26)
  const digest = createHash('sha256').update(output).digest('hex')
  const evidence = {
    input: WORKBENCH_ROUTE_TERMINAL_INPUT,
    bytes: output.length,
    expectedSha256: WORKBENCH_ROUTE_TERMINAL_SHA256,
    actualSha256: digest,
    hostname: os.hostname(),
    user: os.userInfo().username,
    cwd: process.cwd(),
    expectedCwd: canonicalPath,
    passed:
      digest === WORKBENCH_ROUTE_TERMINAL_SHA256 &&
      os.userInfo().username === 'vscode' &&
      process.cwd() === canonicalPath,
  }
  await mkdir(path.dirname(WORKBENCH_ROUTE_TERMINAL_TEMP), {
    recursive: true,
    mode: 0o700,
  })
  await writeTerminalOutput(output)
  await writeTerminalOutput(`\nBL011_TERMINAL_SHA256=${digest}\n`)
  await writeFile(WORKBENCH_ROUTE_TERMINAL_TEMP, JSON.stringify(evidence), {
    mode: 0o600,
  })
  return evidence.passed ? 0 : 1
}

if (import.meta.url === new URL(process.argv[1], 'file:').href)
  process.exitCode = await runWorkbenchRouteTerminalProof()
