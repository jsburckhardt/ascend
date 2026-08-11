import type { IncomingMessage, ServerResponse } from 'node:http'

export function sendSafeBadUrl(
  _path: string,
  request: IncomingMessage,
  response: ServerResponse
): void {
  const category =
    request.method === 'DELETE'
      ? 'invalid_project_id'
      : 'invalid_registration_request'
  const body = JSON.stringify({ error: { category } })
  response.statusCode = 400
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('content-length', Buffer.byteLength(body))
  response.end(body)
}
