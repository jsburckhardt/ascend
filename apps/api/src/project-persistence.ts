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

export type CloseProjectResult =
  { disposition: 'closed'; id: string } | { disposition: 'project_not_found' }

export class ProjectPersistenceError extends Error {
  readonly code = 'project-persistence-failed'
  readonly operation: 'create' | 'find' | 'list' | 'close'

  constructor(operation: ProjectPersistenceError['operation']) {
    super('Project persistence ' + operation + ' failed')
    this.name = 'ProjectPersistenceError'
    this.operation = operation
  }
}

export interface ProjectPersistenceAdapter {
  insert(input: Project): Promise<Project | undefined>
  findByCanonicalPath(canonicalPath: string): Promise<Project | undefined>
  findById(id: string): Promise<Project | undefined>
  list(): Promise<Project[]>
  deleteById(id: string): Promise<string | undefined>
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
    async findById(id) {
      const rows = await database
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1)
      return rows[0]
    },
    async list() {
      return database
        .select()
        .from(projects)
        .orderBy(asc(projects.createdAt), asc(projects.id))
    },
    async deleteById(id) {
      return database.transaction(async (transaction) => {
        const rows = await transaction
          .delete(projects)
          .where(eq(projects.id, id))
          .returning({ id: projects.id })
        return rows[0]?.id
      })
    },
  }
}

export interface ProjectRepository {
  create(input: Project): Promise<CreateProjectResult>
  findById(id: string): Promise<Project | undefined>
  list(): Promise<Project[]>
  closeProject(id: string): Promise<CloseProjectResult>
}

export function createProjectRepository(
  adapter: ProjectPersistenceAdapter
): ProjectRepository {
  let closeTail: Promise<void> | undefined
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
    async findById(id) {
      try {
        return await adapter.findById(id)
      } catch {
        throw new ProjectPersistenceError('find')
      }
    },
    async list() {
      try {
        return await adapter.list()
      } catch {
        throw new ProjectPersistenceError('list')
      }
    },
    async closeProject(id) {
      const execute = async (): Promise<CloseProjectResult> => {
        try {
          const closedId = await adapter.deleteById(id)
          return closedId === undefined
            ? { disposition: 'project_not_found' }
            : { disposition: 'closed', id: closedId }
        } catch {
          throw new ProjectPersistenceError('close')
        }
      }
      const operation =
        closeTail === undefined ? execute() : closeTail.then(execute)
      closeTail = operation.then(
        () => undefined,
        () => undefined
      )
      return operation
    },
  }
}
