import { mkdir, open, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [outputPath, identityPath, maximumText = '60000'] = process.argv.slice(2)
const maximumMs = Math.min(Number(maximumText), 90000)
if (
  !outputPath ||
  !identityPath ||
  !Number.isSafeInteger(maximumMs) ||
  maximumMs <= 0
)
  process.exit(64)
await mkdir(path.dirname(outputPath), { recursive: true })
const handle = await open(outputPath, 'w')
const newline = String.fromCharCode(10)
await writeFile(
  identityPath,
  JSON.stringify({ pid: process.pid, startedAt: Date.now() }) + newline,
  { mode: 0o600 }
)
let sequence = 0
let writing = Promise.resolve()
const interval = setInterval(() => {
  sequence += 1
  const line = 'BL014_A_SEQUENCE=' + sequence + newline
  process.stdout.write(line)
  writing = writing.then(() => handle.appendFile(line))
}, 250)
const finish = async () => {
  clearInterval(interval)
  await writing
  await handle.close()
  process.exit(0)
}
process.once('SIGTERM', () => void finish())
setTimeout(() => void finish(), maximumMs).unref()
