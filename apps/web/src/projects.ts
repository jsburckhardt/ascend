export const PROJECT_LIST_ENDPOINT = '/api/projects' as const
export const PROJECT_LIST_TIMEOUT_MS = 5_000 as const

export interface Project {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
  readonly createdAt: number
}

const PROJECT_FIELDS = ['canonicalPath', 'createdAt', 'id', 'name'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseProject(value: unknown): Project {
  if (!isRecord(value)) throw new Error('Invalid project response')
  const keys = Object.keys(value).sort()
  if (
    keys.length !== PROJECT_FIELDS.length ||
    keys.some((key, index) => key !== PROJECT_FIELDS[index])
  ) {
    throw new Error('Invalid project response')
  }
  if (typeof value.id !== 'string' || value.id.length === 0) {
    throw new Error('Invalid project response')
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0) {
    throw new Error('Invalid project response')
  }
  if (
    typeof value.canonicalPath !== 'string' ||
    value.canonicalPath.length === 0
  ) {
    throw new Error('Invalid project response')
  }
  if (
    typeof value.createdAt !== 'number' ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0
  ) {
    throw new Error('Invalid project response')
  }
  return {
    id: value.id,
    name: value.name,
    canonicalPath: value.canonicalPath,
    createdAt: value.createdAt,
  }
}

export function parseProjectListResponse(value: unknown): Project[] {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    throw new Error('Invalid project response')
  }
  if (!Object.hasOwn(value, 'projects') || !Array.isArray(value.projects)) {
    throw new Error('Invalid project response')
  }
  const ids = new Set<string>()
  return value.projects.map((candidate) => {
    const project = parseProject(candidate)
    if (ids.has(project.id)) throw new Error('Invalid project response')
    ids.add(project.id)
    return project
  })
}

export type ProjectLoader = (signal: AbortSignal) => Promise<Project[]>

export const loadProjects: ProjectLoader = async (signal) => {
  const response = await fetch(PROJECT_LIST_ENDPOINT, { signal })
  if (!response.ok) throw new Error('Project list request failed')
  return parseProjectListResponse(await response.json())
}
