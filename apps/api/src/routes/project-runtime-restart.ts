import {
  type FastifyPluginAsync,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify'
import {
  RuntimeRestartInvariantError,
  type RuntimeRestartOutcome,
} from '../project-runtime-contract.js'

export const RUNTIME_RESTART_BODY_LIMIT_BYTES = 1_024 as const
export const RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES = Object.freeze([
  'invalid_project_id',
  'invalid_restart_request',
  'project_not_found',
  'runtime_not_managed',
  'runtime_start_in_progress',
  'runtime_stop_in_progress',
  'runtime_restart_release_unconfirmed',
  'runtime_replacement_failed',
  'runtime_manager_shutdown',
  'runtime_restart_failed',
  'runtime_reconcile_in_progress',
  'runtime_reconcile_unresolved',
] as const)
export type RuntimeRestartRouteErrorCategory =
  (typeof RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES)[number]

export const PROJECT_RUNTIME_RESTART_REJECTED_EVENT =
  'project.runtime.restart.rejected' as const
export const PROJECT_RUNTIME_RESTART_FAILED_EVENT =
  'project.runtime.restart.failed' as const

const RESTART_REJECTION_STATUS = Object.freeze({
  'not-registered': [404, 'project_not_found'],
  'no-managed-runtime': [409, 'runtime_not_managed'],
  'start-in-progress': [409, 'runtime_start_in_progress'],
  'stop-in-progress': [409, 'runtime_stop_in_progress'],
  'reconcile-in-progress': [409, 'runtime_reconcile_in_progress'],
  'reconcile-unresolved': [409, 'runtime_reconcile_unresolved'],
  'release-unconfirmed': [500, 'runtime_restart_release_unconfirmed'],
  'replacement-failed': [500, 'runtime_replacement_failed'],
  'manager-shutdown': [503, 'runtime_manager_shutdown'],
} as const)

function sendError(
  reply: FastifyReply,
  status: number,
  category: RuntimeRestartRouteErrorCategory
) {
  return reply.code(status).send({ error: { category } })
}

function rejectRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  category: RuntimeRestartRouteErrorCategory
) {
  request.log.warn({
    event: PROJECT_RUNTIME_RESTART_REJECTED_EVENT,
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

function sendRestartResult(reply: FastifyReply, result: RuntimeRestartOutcome) {
  if (result.outcome === 'restarted') {
    return reply
      .code(200)
      .send({ id: result.projectId, outcome: result.outcome })
  }
  const [status, category] = RESTART_REJECTION_STATUS[result.category]
  return sendError(reply, status, category)
}

const projectRuntimeRestartRoute: FastifyPluginAsync = async (
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
      return rejectRequest(request, reply, 400, 'invalid_restart_request')
    }
    request.log.error({
      event: PROJECT_RUNTIME_RESTART_FAILED_EVENT,
      category: 'runtime_restart_failed',
    })
    return sendError(reply, 500, 'runtime_restart_failed')
  })

  for (const path of [
    '/api/projects/runtime/restart',
    '/api/projects//runtime/restart',
  ]) {
    fastify.post(path, async (request, reply) =>
      rejectRequest(request, reply, 400, 'invalid_project_id')
    )
  }

  fastify.post<{
    Params: { id?: string }
    Querystring: Record<string, unknown>
  }>(
    '/api/projects/:id/runtime/restart',
    { bodyLimit: RUNTIME_RESTART_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const id = request.params.id
      if (typeof id !== 'string' || id.length === 0) {
        return rejectRequest(request, reply, 400, 'invalid_project_id')
      }
      if (
        Object.keys(request.query).length !== 0 ||
        !requestHasNoFields(request.body)
      ) {
        return rejectRequest(request, reply, 400, 'invalid_restart_request')
      }
      try {
        const result = await fastify.projectRuntime.restart({ projectId: id })
        if (result.projectId !== id) throw new RuntimeRestartInvariantError()
        if (result.outcome === 'rejected') {
          const [, category] = RESTART_REJECTION_STATUS[result.category]
          request.log.warn({
            event: PROJECT_RUNTIME_RESTART_REJECTED_EVENT,
            category,
          })
        }
        return sendRestartResult(reply, result)
      } catch {
        request.log.error({
          event: PROJECT_RUNTIME_RESTART_FAILED_EVENT,
          category: 'runtime_restart_failed',
        })
        return sendError(reply, 500, 'runtime_restart_failed')
      }
    }
  )
}

export default projectRuntimeRestartRoute
