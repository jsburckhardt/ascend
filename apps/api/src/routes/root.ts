import { type FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function () {
    return { name: 'ascend', status: 'ok' }
  })
}

export default root
