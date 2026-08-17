import type { ProjectLibrary } from './project-library.js'
import {
  deriveProjectOwnerToken,
  type RuntimeCloseOutcome,
} from './project-runtime-contract.js'
import type { ProjectRuntimeManager } from './project-runtime-manager.js'
import type { WorkbenchProxyManager } from './workbench-proxy-manager.js'

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

export interface ProjectCloseService {
  closeProject(id: string): Promise<RuntimeCloseOutcome>
}

export interface ProjectCloseServiceDependencies {
  readonly library: Pick<ProjectLibrary, 'closeProject'>
  readonly runtime: Pick<ProjectRuntimeManager, 'close'>
  readonly proxy: Pick<WorkbenchProxyManager, 'closeProject' | 'audit'>
}

export function createProjectCloseService({
  library,
  runtime,
  proxy,
}: ProjectCloseServiceDependencies): ProjectCloseService {
  return {
    async closeProject(id) {
      if (typeof id !== 'string' || id.length === 0) {
        throw new ProjectCloseError('invalid_project_id')
      }
      const projectToken = deriveProjectOwnerToken(id)
      return runtime.close({
        projectId: id,
        drainConnections: (signal) => proxy.closeProject(id, signal),
        auditConnections: () => proxy.audit(projectToken),
        commitRemoval: () => library.closeProject(id),
      })
    },
  }
}
