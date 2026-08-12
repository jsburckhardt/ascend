import type { IncomingMessage } from 'node:http'
import type { Socket } from 'node:net'
import type { FastifyPluginAsync } from 'fastify'
const invalidBody = (failure: unknown): Buffer =>
  Buffer.from(JSON.stringify(failure))

const sendHtml = (
  response: import('node:http').ServerResponse,
  status: number,
  html: string
): void => {
  const body = Buffer.from(html)
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
  })
  response.end(body)
}

const sendInvalidUpgrade = (socket: Socket, failure: unknown): void => {
  const body = invalidBody(failure)
  socket.end(
    'HTTP/1.1 400 Bad Request\r\nContent-Type: application/json; charset=utf-8\r\n' +
      'Content-Length: ' +
      body.length +
      '\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n' +
      body.toString('utf8')
  )
}

const workbenchRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.all('/projects/*', {
    onRequest: async (request, reply) => {
      reply.hijack()
      const navigation = fastify.workbenchNavigation
      const browserDocument = navigation.isBrowserDocument(request.headers)
      const markedDocument = navigation.isMarkedDocument(request.headers)
      const route = navigation.parseRoute(request.raw.url ?? '')
      if (route === undefined) {
        if (browserDocument && !markedDocument) {
          sendHtml(reply.raw, 400, navigation.renderRouteError())
          return
        }
        const body = invalidBody(navigation.invalidFailure)
        reply.raw.writeHead(400, {
          'content-type': 'application/json; charset=utf-8',
          'content-length': String(body.length),
          'cache-control': 'no-store',
        })
        reply.raw.end(body)
        return
      }
      if (browserDocument && !markedDocument && route.upstreamPath === '/') {
        sendHtml(reply.raw, 200, navigation.renderShell())
        return
      }
      delete request.headers[navigation.documentHeader]
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
    const navigation = fastify.workbenchNavigation
    const route = navigation.parseRoute(request.url ?? '')
    if (route === undefined)
      return sendInvalidUpgrade(socket, navigation.invalidFailure)
    delete request.headers[navigation.documentHeader]
    void fastify.workbenchProxy.handleUpgrade(request, socket, head, route)
  }
  fastify.server.on('upgrade', upgrade)
  fastify.addHook('onClose', async () => {
    fastify.server.removeListener('upgrade', upgrade)
  })
}

export default workbenchRoute
