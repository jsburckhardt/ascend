import { join } from 'node:path'
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload'
import { type FastifyPluginAsync, type FastifyServerOptions } from 'fastify'

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  void fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'plugins'),
    options: opts,
  })

  void fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'routes'),
    options: opts,
  })
}

export default app
export { app, options }
