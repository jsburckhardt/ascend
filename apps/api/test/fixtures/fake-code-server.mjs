#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import http from 'node:http'

if (process.env.BL001_CAPTURE_ARGV) {
  await writeFile(
    process.env.BL001_CAPTURE_ARGV,
    process.argv.slice(2).join('\0')
  )
}
if (process.env.BL001_CAPTURE_PID) {
  await writeFile(process.env.BL001_CAPTURE_PID, String(process.pid))
}
if (process.env.BL001_CAPTURE_ENV) {
  await writeFile(
    process.env.BL001_CAPTURE_ENV,
    JSON.stringify({ LANG: process.env.LANG, SHELL: process.env.SHELL })
  )
}

const mode = process.env.BL001_FAKE_MODE
if (mode === 'early-exit') process.exit(23)
if (mode === 'timeout') {
  process.stderr.write('HTTP server listening on http://127.0.0.1:9/\n')
  setInterval(() => undefined, 1_000)
} else {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('ready')
  })
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    if (address && typeof address !== 'string') {
      process.stderr.write(
        'HTTP server listening on http://127.0.0.1:' +
          String(address.port) +
          '/\n'
      )
    }
  })
  const stop = () => server.close(() => process.exit(0))
  if (mode !== 'ignore-term') process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}
