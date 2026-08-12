import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const evidencePath = process.argv[2]
if (!evidencePath?.startsWith('/'))
  throw new Error('Absolute timeout evidence path is required')
const child = spawn('/usr/bin/sleep', ['60'], {
  detached: true,
  stdio: 'ignore',
})
if (!child.pid) throw new Error('Timeout fixture child PID is unavailable')
const stat = readFileSync('/proc/' + String(child.pid) + '/stat', 'utf8')
const startTimeTicks = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]
writeFileSync(
  evidencePath,
  JSON.stringify({ pid: child.pid, pgid: child.pid, startTimeTicks }) + '\n'
)
child.once('close', () => process.exit(0))
