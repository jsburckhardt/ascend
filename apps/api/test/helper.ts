import Fastify, { type FastifyInstance } from 'fastify'
import { afterEach } from 'vitest'
import appPlugin from '../src/app.js'

const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

export async function build() {
  const app = Fastify()
  await app.register(appPlugin)
  await app.ready()
  apps.push(app)
  return app
}
