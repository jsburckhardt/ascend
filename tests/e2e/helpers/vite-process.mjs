import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'

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
let ready = false
const inspect = (value) => {
  output = (output + value.toString('utf8')).slice(-8_192)
  if (!ready && output.includes('Local:')) {
    ready = true
    process.send?.({ status: 'ready' })
  }
}
vite.stdout.on('data', inspect)
vite.stderr.on('data', inspect)
const observeListener = () => {
  if (ready || vite.exitCode !== null || vite.signalCode !== null) return
  const socket = createConnection({ host, port: Number(portText) })
  socket.once('connect', () => {
    socket.destroy()
    if (!ready) {
      ready = true
      process.send?.({ status: 'ready' })
    }
  })
  socket.once('error', () => {
    socket.destroy()
    setTimeout(observeListener, 25)
  })
}
observeListener()

vite.once('exit', (code, signal) => {
  if (!ready) process.send?.({ status: 'failed' })
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
