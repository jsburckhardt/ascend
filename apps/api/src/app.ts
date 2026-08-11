import { join } from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import {
  createApplicationProjectLibrary,
  type ProjectLibrary,
} from './project-library.js'

declare module 'fastify' {
  interface FastifyInstance {
    projectLibrary: ProjectLibrary
  }
}

export const PROJECT_LIBRARY_INITIALIZATION_FAILED =
  'project_library_initialization_failed' as const

export class ProjectLibraryInitializationError extends Error {
  readonly category = PROJECT_LIBRARY_INITIALIZATION_FAILED

  constructor() {
    super('Project library initialization failed')
    this.name = 'ProjectLibraryInitializationError'
  }
}

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
  createProjectLibrary?: () => Promise<ProjectLibrary>
}

const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  let library: ProjectLibrary
  try {
    library = await (
      opts.createProjectLibrary ?? createApplicationProjectLibrary
    )()
  } catch {
    throw new ProjectLibraryInitializationError()
  }

  fastify.decorate('projectLibrary', library)
  fastify.addHook('onClose', async () => {
    library.close()
  })

  await fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'plugins'),
    options: opts,
  })

  await fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'routes'),
    options: opts,
  })
}

export default fastifyPlugin(app, { name: 'ascend-app' })
export { app, options }
