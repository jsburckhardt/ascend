#!/usr/bin/env node
import { writeFile, readFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

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
const fixtureMode = async () => {
  if (mode !== 'project-runtime-fixture') return mode
  try {
    return (
      await readFile(path.join(process.cwd(), '.bl013-mode'), 'utf8')
    ).trim()
  } catch {
    return 'healthy'
  }
}
if (process.env.BL013_CAPTURE_LAUNCH === '1') {
  const allowedEnvironment = Object.fromEntries(
    Object.keys(process.env)
      .sort()
      .map((key) => [key, process.env[key]])
  )
  await writeFile(
    path.join(process.cwd(), '.bl013-launch.json'),
    JSON.stringify({
      argv: process.argv.slice(2),
      cwd: process.cwd(),
      user: os.userInfo().username,
      environment: allowedEnvironment,
    })
  )
}

if (mode === 'early-exit') process.exit(23)
if (mode === 'early-signal') process.kill(process.pid, 'SIGTERM')
if (
  mode === 'project-runtime' ||
  mode === 'project-runtime-ignore-term' ||
  mode === 'project-runtime-health-body' ||
  mode === 'project-runtime-health-status' ||
  mode === 'project-runtime-delayed-ready' ||
  mode === 'project-runtime-fixture'
) {
  const bindIndex = process.argv.indexOf('--bind-addr')
  const bind = process.argv[bindIndex + 1] ?? ''
  const port = Number(bind.slice(bind.lastIndexOf(':') + 1))
  const server = http.createServer(async (request, response) => {
    if (request.url === '/stall') return
    if (request.url === '/healthz/') {
      const reply = async () => {
        const activeMode = await fixtureMode()
        const status =
          mode === 'project-runtime-health-status' ||
          activeMode === 'health-status' ||
          activeMode === 'readiness-failure'
            ? 503
            : 200
        const bodyStatus =
          mode === 'project-runtime-health-body' || activeMode === 'health-body'
            ? 'unexpected'
            : 'alive'
        response.writeHead(status, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ status: bodyStatus }))
      }
      if (mode === 'project-runtime-delayed-ready') {
        setTimeout(() => void reply(), 150)
      } else {
        await reply()
      }
      return
    }
    if (request.url?.startsWith('/terminal')) {
      try {
        const sentinel = await readFile(
          path.join(process.cwd(), 'terminal-sentinel.txt'),
          'utf8'
        )
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end(sentinel)
      } catch {
        response.writeHead(500)
        response.end()
      }
      return
    }
    if (request.url?.startsWith('/proxy-fail')) {
      request.socket.destroy()
      return
    }
    response.writeHead(404)
    response.end()
  })
  server.listen(port, '127.0.0.1')
  const stop = () => server.close(() => process.exit(0))
  if (mode === 'project-runtime-ignore-term') {
    process.on('SIGTERM', () => undefined)
  } else {
    process.on('SIGTERM', stop)
  }
  process.on('SIGINT', stop)
} else if (mode === 'timeout') {
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
