import { spawn } from 'node:child_process'

const [viteCli, host, portText] = process.argv.slice(2)
if (viteCli === undefined || host === undefined || portText === undefined) {
  throw new Error('Missing Vite process arguments')
}
const vite = spawn(
  process.execPath,
  [viteCli, '--host', host, '--port', portText, '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
)
let output = ''
let hintSent = false
const inspect = (target, value) => {
  target.write(value)
  output = (output + value.toString('utf8')).slice(-8_192)
  if (!hintSent && output.includes('Local:')) {
    hintSent = true
    process.send?.({ status: 'log-hint' })
  }
}
vite.stdout.on('data', (value) => inspect(process.stdout, value))
vite.stderr.on('data', (value) => inspect(process.stderr, value))

vite.once('exit', (code, signal) => {
  process.exitCode = signal === null ? (code ?? 1) : 1
})

let stopping = false
const stop = (signal) => {
  if (stopping) return
  stopping = true
  if (vite.exitCode === null && vite.signalCode === null) vite.kill(signal)
}
process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
