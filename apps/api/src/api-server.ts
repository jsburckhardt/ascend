import { sendSafeBadUrl } from './bad-url.js'
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'
import appPlugin, {
  PROJECT_LIBRARY_INITIALIZATION_FAILED,
  ProjectLibraryInitializationError,
  type AppOptions,
} from './app.js'
import {
  createApplicationProjectLibrary,
  type ProjectLibrary,
} from './project-library.js'
import type { ProjectRegistrationService } from './project-registration.js'
import { withSafeRequestLogging } from './request-logging.js'

export const API_START_FAILED_EVENT = 'api.start.failed' as const

export interface StartupFailureEvent {
  readonly event: typeof API_START_FAILED_EVENT
  readonly category: typeof PROJECT_LIBRARY_INITIALIZATION_FAILED
}

export class ApiStartupError extends Error {
  readonly category = PROJECT_LIBRARY_INITIALIZATION_FAILED

  constructor() {
    super('Ascend API startup failed')
    this.name = 'ApiStartupError'
  }
}

export interface ApiServerControllerOptions {
  readonly host?: string
  readonly port?: number
  readonly fastify?: FastifyServerOptions
  readonly createProjectLibrary?: () => Promise<ProjectLibrary>
  readonly createProjectRegistration?: () => Promise<ProjectRegistrationService>
  readonly createProjectCloseService?: AppOptions['createProjectCloseService']
  readonly createProjectRuntimeManager?: AppOptions['createProjectRuntimeManager']
  readonly workbenchDocumentTimeoutMs?: number
  readonly createWorkbenchProxyManager?: AppOptions['createWorkbenchProxyManager']
  readonly stopTelemetry?: () => Promise<void>
  readonly recordStartupFailure?: (event: StartupFailureEvent) => void
}

export interface ApiServerController {
  readonly server: FastifyInstance
  start(): Promise<FastifyInstance>
  stop(): Promise<void>
}

export function createApiServerController(
  options: ApiServerControllerOptions = {}
): ApiServerController {
  const server = Fastify({
    ...withSafeRequestLogging(options.fastify),
    routerOptions: { onBadUrl: sendSafeBadUrl },
  })
  const stopTelemetry = options.stopTelemetry ?? (async () => undefined)
  let startPromise: Promise<FastifyInstance> | undefined
  let stopPromise: Promise<void> | undefined

  const stop = (): Promise<void> => {
    stopPromise ??= (async () => {
      await server.close()
      await stopTelemetry()
    })()
    return stopPromise
  }

  const start = (): Promise<FastifyInstance> => {
    startPromise ??= (async () => {
      try {
        await server.register(appPlugin, {
          createProjectLibrary:
            options.createProjectLibrary ?? createApplicationProjectLibrary,
          ...(options.createProjectCloseService === undefined
            ? {}
            : { createProjectCloseService: options.createProjectCloseService }),
          ...(options.createWorkbenchProxyManager === undefined
            ? {}
            : {
                createWorkbenchProxyManager:
                  options.createWorkbenchProxyManager,
              }),
          ...(options.createProjectRuntimeManager === undefined
            ? {}
            : {
                createProjectRuntimeManager:
                  options.createProjectRuntimeManager,
              }),
          ...(options.workbenchDocumentTimeoutMs === undefined
            ? {}
            : {
                workbenchDocumentTimeoutMs: options.workbenchDocumentTimeoutMs,
              }),
          ...(options.createProjectRegistration === undefined
            ? {}
            : { createProjectRegistration: options.createProjectRegistration }),
        })
        await server.ready()
      } catch (error) {
        await stop()
        if (error instanceof ProjectLibraryInitializationError) {
          const event: StartupFailureEvent = {
            event: API_START_FAILED_EVENT,
            category: PROJECT_LIBRARY_INITIALIZATION_FAILED,
          }
          if (options.recordStartupFailure === undefined) {
            server.log.error(event)
          } else {
            options.recordStartupFailure(event)
          }
          throw new ApiStartupError()
        }
        throw error
      }

      try {
        await server.listen({
          host: options.host ?? process.env.ASCEND_HOST ?? '127.0.0.1',
          port: options.port ?? Number(process.env.ASCEND_PORT ?? 3000),
        })
        return server
      } catch (error) {
        await stop()
        throw error
      }
    })()
    return startPromise
  }

  return { server, start, stop }
}

export async function startApiProcess(
  controller: ApiServerController
): Promise<0 | 1> {
  try {
    await controller.start()
    return 0
  } catch {
    return 1
  }
}
