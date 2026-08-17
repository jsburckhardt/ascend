import { type FastifyPluginAsync, type FastifyReply } from 'fastify'
import type { Project } from '../project-persistence.js'
import type { RuntimeCloseOutcome } from '../project-runtime-contract.js'
import type {
  RegistrationFailureCategory,
  RegistrationResult,
} from '../project-registration.js'

export const PROJECT_LIST_FAILED = 'project_list_failed' as const
export const PROJECT_LIST_FAILED_EVENT = 'project.list.failed' as const
export const PROJECT_REGISTRATION_BODY_LIMIT_BYTES = 4_096 as const
export const INVALID_REGISTRATION_REQUEST =
  'invalid_registration_request' as const
export const REGISTRATION_REQUEST_TOO_LARGE =
  'registration_request_too_large' as const
export const PROJECT_REGISTRATION_FAILED =
  'project_registration_failed' as const
export const PROJECT_REGISTRATION_FAILED_EVENT =
  'project.registration.failed' as const
export const INVALID_PROJECT_ID = 'invalid_project_id' as const
export const PROJECT_NOT_FOUND = 'project_not_found' as const
export const PROJECT_CLOSE_FAILED = 'project_close_failed' as const
export const PROJECT_CLOSED_EVENT = 'project.closed' as const
export const PROJECT_CLOSE_FAILED_EVENT = 'project.close.failed' as const
export const PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES = Object.freeze([
  INVALID_PROJECT_ID,
  PROJECT_NOT_FOUND,
  PROJECT_CLOSE_FAILED,
  'runtime_start_in_progress',
  'runtime_stop_in_progress',
  'runtime_restart_in_progress',
  'runtime_reconcile_in_progress',
  'runtime_reconcile_unresolved',
  'runtime_release_unconfirmed',
  'runtime_close_ownership_unresolved',
  'runtime_manager_shutdown',
] as const)
export type ProjectCloseRouteErrorCategory =
  (typeof PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES)[number]

const PROJECT_CLOSE_REJECTION_STATUS = Object.freeze({
  'start-in-progress': [409, 'runtime_start_in_progress'],
  'stop-in-progress': [409, 'runtime_stop_in_progress'],
  'restart-in-progress': [409, 'runtime_restart_in_progress'],
  'reconcile-in-progress': [409, 'runtime_reconcile_in_progress'],
  'reconcile-unresolved': [409, 'runtime_reconcile_unresolved'],
  'release-unconfirmed': [500, 'runtime_release_unconfirmed'],
  'ownership-cardinality-exceeded': [500, 'runtime_close_ownership_unresolved'],
  'removal-failed': [500, PROJECT_CLOSE_FAILED],
  'manager-shutdown': [503, 'runtime_manager_shutdown'],
} as const)

const PROJECT_FIELDS = ['canonicalPath', 'createdAt', 'id', 'name'] as const
const REGISTRATION_STATUS: Readonly<
  Record<RegistrationFailureCategory, number>
> = {
  path_required: 400,
  unsupported_path_syntax: 400,
  path_not_found: 404,
  path_not_directory: 422,
  path_unreadable: 403,
  outside_opening_policy: 403,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateProject(value: unknown): Project | undefined {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value).sort()
  if (
    keys.length !== PROJECT_FIELDS.length ||
    keys.some((key, index) => key !== PROJECT_FIELDS[index])
  ) {
    return undefined
  }
  if (typeof value.id !== 'string' || value.id.length === 0) return undefined
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    return undefined
  }
  if (
    typeof value.canonicalPath !== 'string' ||
    value.canonicalPath.length === 0
  ) {
    return undefined
  }
  if (
    typeof value.createdAt !== 'number' ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0
  ) {
    return undefined
  }
  return {
    id: value.id,
    name: value.name,
    canonicalPath: value.canonicalPath,
    createdAt: value.createdAt,
  }
}

export function compareProjects(left: Project, right: Project): number {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt - right.createdAt
  }
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

export function validateAndOrderProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new Error('Invalid project list')
  const ordered: Project[] = []
  const ids = new Set<string>()
  for (const candidate of value) {
    const project = validateProject(candidate)
    if (project === undefined || ids.has(project.id)) {
      throw new Error('Invalid project list')
    }
    ids.add(project.id)
    ordered.push(project)
  }
  return ordered.sort(compareProjects)
}

function registrationPath(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined
  const keys = Object.keys(body)
  return keys.length === 1 &&
    keys[0] === 'path' &&
    typeof body.path === 'string'
    ? body.path
    : undefined
}

function sendRegistrationResult(
  reply: FastifyReply,
  result: RegistrationResult
) {
  if ('disposition' in result) {
    const project = validateProject(result.project)
    if (project === undefined) throw new Error('Invalid registration project')
    return reply
      .code(result.disposition === 'created' ? 201 : 200)
      .send({ disposition: result.disposition, project })
  }
  return reply.code(REGISTRATION_STATUS[result.category]).send({
    error: { category: result.category, field: 'path' },
  })
}

function invalidProjectId(reply: FastifyReply) {
  return reply.code(400).send({ error: { category: INVALID_PROJECT_ID } })
}

function sendCloseResult(reply: FastifyReply, result: RuntimeCloseOutcome) {
  if (result.outcome === 'closed') {
    return reply.code(200).send({ id: result.projectId, disposition: 'closed' })
  }
  if (result.outcome === 'already-absent') {
    return reply.code(404).send({
      error: { category: PROJECT_NOT_FOUND },
    })
  }
  const [status, category] = PROJECT_CLOSE_REJECTION_STATUS[result.category]
  return reply.code(status).send({ error: { category } })
}

const projectsRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.setErrorHandler((error, request, reply) => {
    const details = error as { code?: string; statusCode?: number }
    const code = details.code
    if (request.method === 'DELETE') {
      if (code === 'FST_ERR_BAD_URL' || details.statusCode === 400) {
        return invalidProjectId(reply)
      }
      request.log.error({
        event: PROJECT_CLOSE_FAILED_EVENT,
        category: PROJECT_CLOSE_FAILED,
      })
      return reply.code(500).send({
        error: { category: PROJECT_CLOSE_FAILED },
      })
    }
    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply.code(413).send({
        error: { category: REGISTRATION_REQUEST_TOO_LARGE },
      })
    }
    if (
      code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ||
      code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE'
    ) {
      return reply.code(400).send({
        error: { category: INVALID_REGISTRATION_REQUEST },
      })
    }
    request.log.error({
      event: PROJECT_REGISTRATION_FAILED_EVENT,
      category: PROJECT_REGISTRATION_FAILED,
    })
    return reply.code(500).send({
      error: { category: PROJECT_REGISTRATION_FAILED },
    })
  })

  fastify.get('/api/projects', async (request, reply) => {
    try {
      const projects = validateAndOrderProjects(
        await fastify.projectLibrary.list()
      )
      return { projects }
    } catch {
      request.log.error({
        event: PROJECT_LIST_FAILED_EVENT,
        category: PROJECT_LIST_FAILED,
      })
      return reply.code(500).send({
        error: { category: PROJECT_LIST_FAILED },
      })
    }
  })

  fastify.post(
    '/api/projects',
    { bodyLimit: PROJECT_REGISTRATION_BODY_LIMIT_BYTES },
    async (request, reply) => {
      const contentType = request.headers['content-type']
      const path = registrationPath(request.body)
      if (
        typeof contentType !== 'string' ||
        contentType.split(';', 1)[0]?.trim().toLowerCase() !==
          'application/json' ||
        path === undefined
      ) {
        return reply.code(400).send({
          error: { category: INVALID_REGISTRATION_REQUEST },
        })
      }
      try {
        return sendRegistrationResult(
          reply,
          await fastify.projectRegistration.register(path)
        )
      } catch {
        request.log.error({
          event: PROJECT_REGISTRATION_FAILED_EVENT,
          category: PROJECT_REGISTRATION_FAILED,
        })
        return reply.code(500).send({
          error: { category: PROJECT_REGISTRATION_FAILED },
        })
      }
    }
  )

  fastify.delete('/api/projects/', async (_request, reply) =>
    invalidProjectId(reply)
  )

  fastify.delete<{ Params: { id?: string } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const id = request.params.id
      if (typeof id !== 'string' || id.length === 0) {
        return invalidProjectId(reply)
      }
      try {
        const result = await fastify.projectClose.closeProject(id)
        if (result.projectId !== id) {
          throw new Error('Invalid close result')
        }
        if (result.outcome === 'closed') {
          request.log.info({
            event: PROJECT_CLOSED_EVENT,
            disposition: 'closed',
          })
        }
        return sendCloseResult(reply, result)
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'category' in error &&
          error.category === INVALID_PROJECT_ID
        ) {
          return invalidProjectId(reply)
        }
        request.log.error({
          event: PROJECT_CLOSE_FAILED_EVENT,
          category: PROJECT_CLOSE_FAILED,
        })
        return reply.code(500).send({
          error: { category: PROJECT_CLOSE_FAILED },
        })
      }
    }
  )
}

export default projectsRoute
