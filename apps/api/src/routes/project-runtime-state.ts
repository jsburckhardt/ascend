import { type FastifyPluginAsync } from 'fastify'
import { compareProjects } from './projects.js'

export const PROJECT_RUNTIME_STATE_FAILED = 'runtime_state_failed' as const
export const PROJECT_RUNTIME_STATE_FAILED_EVENT =
  'project.runtime.state.failed' as const

const projectRuntimeStateRoute: FastifyPluginAsync = async (
  fastify
): Promise<void> => {
  fastify.get('/api/projects/runtime', async (request, reply) => {
    try {
      const projects = [...(await fastify.projectLibrary.list())].sort(
        compareProjects
      )
      const reports = fastify.projectRuntime.reportPublicStates(
        projects.map(({ id }) => id)
      )
      return {
        runtimes: reports.map((report) => ({
          id: report.projectId,
          state: report.state,
          ...(report.state === 'Failed'
            ? { failureCategory: report.failureCategory }
            : {}),
        })),
      }
    } catch {
      request.log.error({
        event: PROJECT_RUNTIME_STATE_FAILED_EVENT,
        category: PROJECT_RUNTIME_STATE_FAILED,
      })
      return reply.code(500).send({
        error: { category: PROJECT_RUNTIME_STATE_FAILED },
      })
    }
  })
}

export default projectRuntimeStateRoute
