import type { IncomingMessage, ServerResponse } from 'node:http'
import { renderWorkbenchRouteError } from './workbench-navigation-shell.js'

export function sendSafeBadUrl(
  _path: string,
  request: IncomingMessage,
  response: ServerResponse
): void {
  const browserWorkbenchDocument =
    (request.url ?? '').startsWith('/projects/') &&
    (String(request.headers['sec-fetch-dest'] ?? '') === 'document' ||
      String(request.headers.accept ?? '')
        .toLowerCase()
        .includes('text/html'))
  if (browserWorkbenchDocument) {
    const body = renderWorkbenchRouteError()
    response.statusCode = 400
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('content-length', Buffer.byteLength(body))
    response.setHeader('cache-control', 'no-store')
    response.end(body)
    return
  }
  const runtimeStopRequest =
    request.method === 'POST' &&
    (request.url ?? '').startsWith('/api/projects/') &&
    (request.url ?? '').includes('/runtime/stop')
  const category =
    request.method === 'DELETE' || runtimeStopRequest
      ? 'invalid_project_id'
      : 'invalid_registration_request'
  const body = JSON.stringify({ error: { category } })
  response.statusCode = 400
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('content-length', Buffer.byteLength(body))
  response.end(body)
}
