import { homedir } from 'node:os'
import path, { join } from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { resolveApplicationDatabasePath } from './db/client.js'
import {
  createApplicationProjectLibrary,
  type ProjectLibrary,
} from './project-library.js'
import {
  createProjectRegistrationService,
  type ProjectRegistrationService,
} from './project-registration.js'

declare module 'fastify' {
  interface FastifyInstance {
    projectLibrary: ProjectLibrary
    projectRegistration: ProjectRegistrationService
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
  createProjectRegistration?: () => Promise<ProjectRegistrationService>
}

export async function createApplicationProjectRegistration(): Promise<ProjectRegistrationService> {
  const databasePath = resolveApplicationDatabasePath()
  const configuredHome = process.env.ASCEND_PROJECT_HOME ?? homedir()
  const configuredRoots = process.env.ASCEND_PROJECT_ALLOWED_ROOTS
  const allowedRoots =
    configuredRoots === undefined
      ? [configuredHome]
      : configuredRoots.length === 0
        ? []
        : configuredRoots.split(path.delimiter)
  const result = await createProjectRegistrationService({
    databasePath,
    configuredHome,
    allowedRoots,
  })
  if (!('status' in result) || result.status !== 'ready') {
    throw new ProjectLibraryInitializationError()
  }
  return result.service
}

const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  let library: ProjectLibrary | undefined
  let registration: ProjectRegistrationService | undefined
  try {
    library = await (
      opts.createProjectLibrary ?? createApplicationProjectLibrary
    )()
    registration = await (
      opts.createProjectRegistration ?? createApplicationProjectRegistration
    )()
  } catch {
    registration?.close()
    library?.close()
    throw new ProjectLibraryInitializationError()
  }

  fastify.decorate('projectLibrary', library)
  fastify.decorate('projectRegistration', registration)
  fastify.addHook('onClose', async () => {
    registration.close()
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
