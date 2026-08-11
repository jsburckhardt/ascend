import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  createDatabase,
  resolveApplicationDatabasePath,
  type DatabaseResource,
} from './db/client.js'
import { migrateDatabase } from './db/migrations.js'
import {
  createDrizzleProjectAdapter,
  createProjectRepository,
  type CloseProjectResult,
  type CreateProjectResult,
  type Project,
} from './project-persistence.js'

export interface ProjectLibrary {
  create(input: Project): Promise<CreateProjectResult>
  list(): Promise<Project[]>
  closeProject(id: string): Promise<CloseProjectResult>
  close(): void
}

export async function createProjectLibrary(
  databasePath: string
): Promise<ProjectLibrary> {
  const normalizedPath = path.resolve(databasePath)
  await mkdir(path.dirname(normalizedPath), { recursive: true })
  const resource: DatabaseResource = createDatabase(normalizedPath)
  try {
    await migrateDatabase(resource)
    const repository = createProjectRepository(
      createDrizzleProjectAdapter(resource.database)
    )
    let closed = false
    return {
      create: (input) => repository.create(input),
      list: () => repository.list(),
      closeProject: (id) => repository.closeProject(id),
      close() {
        if (closed) return
        closed = true
        resource.close()
      },
    }
  } catch (error) {
    resource.close()
    throw error
  }
}

export function createApplicationProjectLibrary(
  databaseUrl = process.env.ASCEND_DATABASE_URL
): Promise<ProjectLibrary> {
  return createProjectLibrary(resolveApplicationDatabasePath(databaseUrl))
}
