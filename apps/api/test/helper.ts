import { sendSafeBadUrl } from '../src/bad-url.js'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach } from 'vitest'
import appPlugin, { type AppOptions } from '../src/app.js'
import type { ProjectLibrary } from '../src/project-library.js'
import type { ProjectRegistrationService } from '../src/project-registration.js'

const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

function emptyProjectLibrary(): ProjectLibrary {
  return {
    create: async () => ({ disposition: 'invalid', code: 'empty-id' }),
    list: async () => [],
    closeProject: async () => ({ disposition: 'project_not_found' }),
    close() {},
  }
}

function emptyProjectRegistration(): ProjectRegistrationService {
  return {
    register: async () => ({ category: 'path_not_found', field: 'path' }),
    close() {},
  }
}

export async function build(options: AppOptions = {}) {
  const app = Fastify({
    ...(options.logger === undefined ? {} : { logger: options.logger }),
    routerOptions: { onBadUrl: sendSafeBadUrl },
  })
  await app.register(appPlugin, {
    ...options,
    createProjectLibrary:
      options.createProjectLibrary ?? (async () => emptyProjectLibrary()),
    createProjectRegistration:
      options.createProjectRegistration ??
      (async () => emptyProjectRegistration()),
  })
  await app.ready()
  apps.push(app)
  return app
}
