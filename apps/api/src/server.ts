import './instrumentation.js'
import Fastify from 'fastify'
import appPlugin from './app.js'
import { stopTelemetry } from './instrumentation.js'

const server = Fastify({ logger: true })

export async function startServer() {
  await server.register(appPlugin)
  await server.listen({
    host: process.env.ASCEND_HOST ?? '127.0.0.1',
    port: Number(process.env.ASCEND_PORT ?? 3000),
  })
}

async function stopServer() {
  await server.close()
  await stopTelemetry()
}

process.once('SIGINT', () => void stopServer())
process.once('SIGTERM', () => void stopServer())

void startServer().catch((error: unknown) => {
  server.log.error(error, 'Ascend API failed to start')
  process.exitCode = 1
})
