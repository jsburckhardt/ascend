import { type FastifyPluginAsync } from 'fastify'
import type { Project } from '../project-persistence.js'

export const PROJECT_LIST_FAILED = 'project_list_failed' as const
export const PROJECT_LIST_FAILED_EVENT = 'project.list.failed' as const

const PROJECT_FIELDS = ['canonicalPath', 'createdAt', 'id', 'name'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateProject(value: unknown): Project | undefined {
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

function compareProjects(left: Project, right: Project): number {
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

const projectsRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
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
}

export default projectsRoute
