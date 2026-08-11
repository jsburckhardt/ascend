import { type FastifyPluginAsync, type FastifyReply } from 'fastify'
import type { Project } from '../project-persistence.js'
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
  const projects: Project[] = []
  const ids = new Set<string>()
  for (const candidate of value) {
    const project = validateProject(candidate)
    if (project === undefined || ids.has(project.id)) {
      throw new Error('Invalid project list')
    }
    ids.add(project.id)
    projects.push(project)
  }
  return projects.sort(compareProjects)
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

const projectsRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.setErrorHandler((error, request, reply) => {
    const code = (error as { code?: string }).code
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
}

export default projectsRoute
