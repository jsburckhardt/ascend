import {
  type FastifyPluginAsync,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import {
  RuntimeStopInvariantError,
  type RuntimeStopOutcome,
} from '../project-runtime-contract.js'

export const RUNTIME_STOP_BODY_LIMIT_BYTES = 1_024 as const
export const RUNTIME_STOP_ROUTE_ERROR_CATEGORIES = Object.freeze([
  'invalid_project_id',
  'invalid_stop_request',
  'project_not_found',
  'runtime_not_managed',
  'runtime_start_in_progress',
  'runtime_restart_in_progress',
  'runtime_failure_retained',
  'runtime_stop_unconfirmed',
  'runtime_manager_shutdown',
  'runtime_stop_failed',
  'runtime_reconcile_in_progress',
  'runtime_reconcile_unresolved',
] as const)
export type RuntimeStopRouteErrorCategory =
  (typeof RUNTIME_STOP_ROUTE_ERROR_CATEGORIES)[number]

export const PROJECT_RUNTIME_STOP_REJECTED_EVENT =
  'project.runtime.stop.rejected' as const
export const PROJECT_RUNTIME_STOP_FAILED_EVENT =
  'project.runtime.stop.failed' as const

const STOP_REJECTION_STATUS = Object.freeze({
  'not-registered': [404, 'project_not_found'],
  'no-managed-runtime': [409, 'runtime_not_managed'],
  'start-in-progress': [409, 'runtime_start_in_progress'],
  'restart-in-progress': [409, 'runtime_restart_in_progress'],
  'reconcile-in-progress': [409, 'runtime_reconcile_in_progress'],
  'reconcile-unresolved': [409, 'runtime_reconcile_unresolved'],
  'failure-retained': [409, 'runtime_failure_retained'],
  'stop-unconfirmed': [500, 'runtime_stop_unconfirmed'],
  'manager-shutdown': [503, 'runtime_manager_shutdown'],
} as const)

function sendError(
  reply: FastifyReply,
  status: number,
  category: RuntimeStopRouteErrorCategory
) {
  return reply.code(status).send({ error: { category } })
}

function rejectRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  category: RuntimeStopRouteErrorCategory
) {
  request.log.warn({
    event: PROJECT_RUNTIME_STOP_REJECTED_EVENT,
    category,
  })
  return sendError(reply, status, category)
}

function requestHasNoFields(body: unknown): boolean {
  return (
    body === undefined ||
    (typeof body === 'object' &&
      body !== null &&
      !Array.isArray(body) &&
      Object.keys(body).length === 0)
  )
}

function sendStopResult(reply: FastifyReply, result: RuntimeStopOutcome) {
  if (result.outcome === 'stopped' || result.outcome === 'already-stopped') {
    return reply
      .code(200)
      .send({ id: result.projectId, outcome: result.outcome })
  }
  const [status, category] = STOP_REJECTION_STATUS[result.category]
  return sendError(reply, status, category)
}

const projectRuntimeStopRoute: FastifyPluginAsync = async (
  fastify
): Promise<void> => {
  fastify.setErrorHandler((error, request, reply) => {
    const details = error as { code?: string; statusCode?: number }
    if (
      details.code === 'FST_ERR_BAD_URL' ||
      details.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
      details.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      details.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
      details.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE' ||
      details.statusCode === 400 ||
      details.statusCode === 413 ||
      details.statusCode === 415
    ) {
      return rejectRequest(request, reply, 400, 'invalid_stop_request')
    }
    request.log.error({
      event: PROJECT_RUNTIME_STOP_FAILED_EVENT,
      category: 'runtime_stop_failed',
    })
    return sendError(reply, 500, 'runtime_stop_failed')
  })

  for (const path of [
    '/api/projects/runtime/stop',
    '/api/projects//runtime/stop',
  ]) {
    fastify.post(path, async (request, reply) =>
      rejectRequest(request, reply, 400, 'invalid_project_id')
    )
  }

  fastify.post<{
    Params: { id?: string }
    Querystring: Record<string, unknown>
  }>(
    '/api/projects/:id/runtime/stop',
    { bodyLimit: RUNTIME_STOP_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const id = request.params.id
      if (typeof id !== 'string' || id.length === 0) {
        return rejectRequest(request, reply, 400, 'invalid_project_id')
      }
      if (
        Object.keys(request.query).length !== 0 ||
        !requestHasNoFields(request.body)
      ) {
        return rejectRequest(request, reply, 400, 'invalid_stop_request')
      }
      try {
        const result = await fastify.projectRuntime.stop({ projectId: id })
        if (result.projectId !== id) throw new RuntimeStopInvariantError()
        if (result.outcome === 'rejected') {
          const [, category] = STOP_REJECTION_STATUS[result.category]
          request.log.warn({
            event: PROJECT_RUNTIME_STOP_REJECTED_EVENT,
            category,
          })
        }
        return sendStopResult(reply, result)
      } catch {
        request.log.error({
          event: PROJECT_RUNTIME_STOP_FAILED_EVENT,
          category: 'runtime_stop_failed',
        })
        return sendError(reply, 500, 'runtime_stop_failed')
      }
    }
  )
}

export default projectRuntimeStopRoute
