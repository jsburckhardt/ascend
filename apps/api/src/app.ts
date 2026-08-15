import { homedir } from 'node:os'
import { resolveFrontDoorToken } from './front-door-contract.js'
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
import type { RuntimeSafeLifecycleEvent } from './project-runtime-contract.js'
import {
  createWorkbenchProxyManager,
  type WorkbenchProxyManager,
} from './workbench-proxy-manager.js'
import {
  parseStableWorkbenchRoute,
  workbenchFailure,
  workbenchFailureEnvelope,
  type StableWorkbenchRoute,
} from './workbench-proxy-contract.js'
import {
  WORKBENCH_DOCUMENT_HEADER,
  isTopLevelBrowserDocument,
  isWorkbenchDocumentRequest,
  renderWorkbenchNavigationShell,
  renderWorkbenchRouteError,
} from './workbench-navigation-shell.js'
import {
  createProjectRegistrationService,
  type ProjectRegistrationService,
} from './project-registration.js'
import projectRuntimeStateRoute from './routes/project-runtime-state.js'
import projectRuntimeStopRoute from './routes/project-runtime-stop.js'

declare module 'fastify' {
  interface FastifyInstance {
    projectLibrary: ProjectLibrary
    projectRegistration: ProjectRegistrationService
    projectClose: ProjectCloseService
    projectRuntime: ProjectRuntimeManager
    workbenchProxy: WorkbenchProxyManager
    workbenchNavigation: {
      documentHeader: string
      invalidFailure: unknown
      isBrowserDocument(headers: Record<string, unknown>): boolean
      isMarkedDocument(headers: Record<string, unknown>): boolean
      parseRoute(rawUrl: string): StableWorkbenchRoute | undefined
      renderShell(): string
      renderRouteError(): string
    }
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
  createWorkbenchProxyManager?: (
    library: ProjectLibrary,
    runtime: ProjectRuntimeManager
  ) => WorkbenchProxyManager
  workbenchDocumentTimeoutMs?: number
  createProjectRuntimeManager?: (
    library: ProjectLibrary,
    recordEvent: (event: RuntimeSafeLifecycleEvent) => void
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
  let workbenchProxy: WorkbenchProxyManager | undefined
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
    workbenchProxy = (
      opts.createWorkbenchProxyManager ??
      ((projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          frontDoorToken: resolveFrontDoorToken(),
          recordEvent: (event) => fastify.log.info(event),
        }))
    )(library, runtimeManager)
    closeService = (
      opts.createProjectCloseService ?? createLibraryProjectCloseService
    )(library)
    registration = await (
      opts.createProjectRegistration ?? createApplicationProjectRegistration
    )()
  } catch {
    await workbenchProxy?.shutdown()
    await runtimeManager?.shutdown()
    registration?.close()
    library?.close()
    throw new ProjectLibraryInitializationError()
  }

  fastify.decorate('projectLibrary', library)
  fastify.decorate('projectRegistration', registration)
  fastify.decorate('projectClose', closeService)
  fastify.decorate('projectRuntime', runtimeManager)
  fastify.decorate('workbenchProxy', workbenchProxy)
  fastify.decorate('workbenchNavigation', {
    documentHeader: WORKBENCH_DOCUMENT_HEADER,
    invalidFailure: workbenchFailureEnvelope(
      workbenchFailure('malformed-project-id')
    ),
    isBrowserDocument: isTopLevelBrowserDocument,
    isMarkedDocument: isWorkbenchDocumentRequest,
    parseRoute: parseStableWorkbenchRoute,
    renderShell: () =>
      renderWorkbenchNavigationShell(opts.workbenchDocumentTimeoutMs),
    renderRouteError: renderWorkbenchRouteError,
  })
  fastify.addHook('onClose', async () => {
    await workbenchProxy.shutdown()
    await runtimeManager.shutdown()
    registration.close()
    library.close()
  })

  await fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'plugins'),
    options: opts,
  })

  await fastify.register(projectRuntimeStateRoute)
  await fastify.register(projectRuntimeStopRoute)

  await fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'routes'),
    ignorePattern: /project-runtime-(?:state|stop)\.(?:js|ts)$/u,
    options: opts,
  })
}

export default fastifyPlugin(app, { name: 'ascend-app' })
export { app, options }
