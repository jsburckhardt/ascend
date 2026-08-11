import { asc, eq } from 'drizzle-orm'
import type { AscendDatabase } from './db/client.js'
import { projects } from './db/schema.js'

export interface Project {
  id: string
  name: string
  canonicalPath: string
  createdAt: number
}

export type ProjectValidationCode =
  'empty-id' | 'blank-name' | 'empty-canonical-path' | 'invalid-created-at'

export type CreateProjectResult =
  | { disposition: 'created'; project: Project }
  | { disposition: 'existing'; project: Project }
  | { disposition: 'invalid'; code: ProjectValidationCode }

export class ProjectPersistenceError extends Error {
  readonly code = 'project-persistence-failed'
  readonly operation: 'create' | 'list'

  constructor(operation: ProjectPersistenceError['operation']) {
    super(`Project persistence ${operation} failed`)
    this.name = 'ProjectPersistenceError'
    this.operation = operation
  }
}

export interface ProjectPersistenceAdapter {
  insert(input: Project): Promise<Project | undefined>
  findByCanonicalPath(canonicalPath: string): Promise<Project | undefined>
  list(): Promise<Project[]>
}

function validationCode(input: Project): ProjectValidationCode | undefined {
  if (input.id.length === 0) return 'empty-id'
  if (input.name.trim().length === 0) return 'blank-name'
  if (input.canonicalPath.length === 0) return 'empty-canonical-path'
  if (!Number.isSafeInteger(input.createdAt) || input.createdAt < 0) {
    return 'invalid-created-at'
  }
  return undefined
}

export function createDrizzleProjectAdapter(
  database: AscendDatabase
): ProjectPersistenceAdapter {
  return {
    async insert(input) {
      const rows = await database
        .insert(projects)
        .values(input)
        .onConflictDoNothing({ target: projects.canonicalPath })
        .returning()
      return rows[0]
    },
    async findByCanonicalPath(canonicalPath) {
      const rows = await database
        .select()
        .from(projects)
        .where(eq(projects.canonicalPath, canonicalPath))
        .limit(1)
      return rows[0]
    },
    async list() {
      return database
        .select()
        .from(projects)
        .orderBy(asc(projects.createdAt), asc(projects.id))
    },
  }
}

export interface ProjectRepository {
  create(input: Project): Promise<CreateProjectResult>
  list(): Promise<Project[]>
}

export function createProjectRepository(
  adapter: ProjectPersistenceAdapter
): ProjectRepository {
  return {
    async create(input) {
      const code = validationCode(input)
      if (code !== undefined) return { disposition: 'invalid', code }

      try {
        const inserted = await adapter.insert(input)
        if (inserted !== undefined) {
          return { disposition: 'created', project: inserted }
        }
        const existing = await adapter.findByCanonicalPath(input.canonicalPath)
        if (existing === undefined)
          throw new Error('Conflict winner was absent')
        return { disposition: 'existing', project: existing }
      } catch {
        throw new ProjectPersistenceError('create')
      }
    },
    async list() {
      try {
        return await adapter.list()
      } catch {
        throw new ProjectPersistenceError('list')
      }
    },
  }
}
