import type { IncomingMessage } from 'node:http'
import type { Socket } from 'node:net'
import type { FastifyPluginAsync } from 'fastify'
import type { StableWorkbenchRoute } from '../workbench-proxy-contract.js'

const invalidFailure = {
  error: { code: 'invalid_project_id', message: 'Project ID is invalid.' },
}
const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u

const parseRoute = (rawUrl: string): StableWorkbenchRoute | undefined => {
  const question = rawUrl.indexOf('?')
  const pathname = question === -1 ? rawUrl : rawUrl.slice(0, question)
  const query = question === -1 ? '' : rawUrl.slice(question)
  const match = /^\/projects\/(.+?)\/workbench(?:\/(.*))?$/u.exec(pathname)
  if (match === null) return undefined
  let projectId: string
  try {
    projectId = decodeURIComponent(match[1])
  } catch {
    return undefined
  }
  if (!projectIdPattern.test(projectId)) return undefined
  const prefix = `/projects/${encodeURIComponent(projectId)}/workbench/`
  return { projectId, prefix, upstreamPath: '/' + (match[2] ?? '') + query }
}

const invalidBody = (): Buffer => Buffer.from(JSON.stringify(invalidFailure))
const sendInvalidUpgrade = (socket: Socket): void => {
  const body = invalidBody()
  socket.end(
    'HTTP/1.1 400 Bad Request\r\nContent-Type: application/json; charset=utf-8\r\n' +
      `Content-Length: ${body.length}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n` +
      body.toString('utf8')
  )
}

const workbenchRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.all('/projects/*', {
    onRequest: async (request, reply) => {
      reply.hijack()
      const route = parseRoute(request.raw.url ?? '')
      if (route === undefined) {
        const body = invalidBody()
        reply.raw.writeHead(400, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(body.length),
          'cache-control': 'no-store',
        })
        reply.raw.end(body)
        return
      }
      await fastify.workbenchProxy.handleHttp(request.raw, reply.raw, route)
    },
    handler: async () => undefined,
  })

  const upgrade = (
    request: IncomingMessage,
    socket: Socket,
    head: Buffer
  ): void => {
    if (!(request.url ?? '').startsWith('/projects/')) return
    const route = parseRoute(request.url ?? '')
    if (route === undefined) return sendInvalidUpgrade(socket)
    void fastify.workbenchProxy.handleUpgrade(request, socket, head, route)
  }
  fastify.server.on('upgrade', upgrade)
  fastify.addHook('onClose', async () => {
    fastify.server.removeListener('upgrade', upgrade)
  })
}

export default workbenchRoute
