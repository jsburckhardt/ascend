import type { ProjectLibrary } from './project-library.js'
import type { CloseProjectResult } from './project-persistence.js'

export const PROJECT_CLOSE_ERROR_CATEGORIES = [
  'invalid_project_id',
  'project_close_failed',
] as const

export type ProjectCloseErrorCategory =
  (typeof PROJECT_CLOSE_ERROR_CATEGORIES)[number]

export class ProjectCloseError extends Error {
  readonly category: ProjectCloseErrorCategory

  constructor(category: ProjectCloseErrorCategory) {
    super(
      category === 'invalid_project_id'
        ? 'Invalid project ID'
        : 'Project close failed'
    )
    this.name = 'ProjectCloseError'
    this.category = category
  }
}

export interface ProjectCloseRepository {
  closeProject(id: string): Promise<CloseProjectResult>
}

export interface ProjectCloseService {
  closeProject(id: string): Promise<CloseProjectResult>
}

export function createProjectCloseService(
  repository: ProjectCloseRepository
): ProjectCloseService {
  return {
    async closeProject(id) {
      if (typeof id !== 'string' || id.length === 0) {
        throw new ProjectCloseError('invalid_project_id')
      }
      try {
        return await repository.closeProject(id)
      } catch {
        throw new ProjectCloseError('project_close_failed')
      }
    },
  }
}

export function createLibraryProjectCloseService(
  library: Pick<ProjectLibrary, 'closeProject'>
): ProjectCloseService {
  return createProjectCloseService(library)
}
