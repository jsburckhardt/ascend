const { spawn } = require('node:child_process')
const { createServer } = require('node:net')

const mode = process.argv[2]
const port = Number(process.argv[3])
let descendant
if (mode === 'survivingDescendant') {
  descendant = spawn(
    process.execPath,
    ['-e', 'setInterval(() => undefined, 1000)'],
    { detached: true, stdio: 'ignore' }
  )
  descendant.unref()
}
const server = createServer()
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(
    JSON.stringify({
      ready: true,
      descendantPid: descendant?.pid,
    }) + String.fromCharCode(10)
  )
})
if (mode === 'interruptedGracefulShutdown') {
  process.on('SIGTERM', () => undefined)
} else {
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
}
setInterval(() => undefined, 1000)
