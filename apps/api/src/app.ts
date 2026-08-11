import { homedir } from 'node:os'
import path, { join } from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { resolveApplicationDatabasePath } from './db/client.js'
import {
  createLibraryProjectCloseService,
  type ProjectCloseService,
} from './project-close.js'
import {
  createApplicationProjectLibrary,
  type ProjectLibrary,
} from './project-library.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from './project-runtime-manager.js'
import type { RuntimeLifecycleEvent } from './project-runtime-contract.js'
import {
  createProjectRegistrationService,
  type ProjectRegistrationService,
} from './project-registration.js'

declare module 'fastify' {
  interface FastifyInstance {
    projectLibrary: ProjectLibrary
    projectRegistration: ProjectRegistrationService
    projectClose: ProjectCloseService
    projectRuntime: ProjectRuntimeManager
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
  createProjectCloseService?: (library: ProjectLibrary) => ProjectCloseService
  createProjectRuntimeManager?: (
    library: ProjectLibrary,
    recordEvent: (event: RuntimeLifecycleEvent) => void
  ) => ProjectRuntimeManager
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
  let closeService: ProjectCloseService | undefined
  let runtimeManager: ProjectRuntimeManager | undefined
  try {
    library = await (
      opts.createProjectLibrary ?? createApplicationProjectLibrary
    )()
    runtimeManager = (
      opts.createProjectRuntimeManager ??
      ((projectLibrary, recordEvent) =>
        createProjectRuntimeManager({
          findProjectById: (id) => projectLibrary.findById(id),
          recordEvent,
        }))
    )(library, (event) => fastify.log.info(event))
    closeService = (
      opts.createProjectCloseService ?? createLibraryProjectCloseService
    )(library)
    registration = await (
      opts.createProjectRegistration ?? createApplicationProjectRegistration
    )()
  } catch {
    await runtimeManager?.shutdown()
    registration?.close()
    library?.close()
    throw new ProjectLibraryInitializationError()
  }

  fastify.decorate('projectLibrary', library)
  fastify.decorate('projectRegistration', registration)
  fastify.decorate('projectClose', closeService)
  fastify.decorate('projectRuntime', runtimeManager)
  fastify.addHook('onClose', async () => {
    await runtimeManager.shutdown()
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
