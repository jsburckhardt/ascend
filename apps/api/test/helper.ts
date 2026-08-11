import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach } from 'vitest'
import appPlugin, { type AppOptions } from '../src/app.js'
import type { ProjectLibrary } from '../src/project-library.js'

const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

function emptyProjectLibrary(): ProjectLibrary {
  return {
    create: async () => ({ disposition: 'invalid', code: 'empty-id' }),
    list: async () => [],
    close() {},
  }
}

export async function build(options: AppOptions = {}) {
  const app = Fastify()
  await app.register(appPlugin, {
    ...options,
    createProjectLibrary:
      options.createProjectLibrary ?? (async () => emptyProjectLibrary()),
  })
  await app.ready()
  apps.push(app)
  return app
}
