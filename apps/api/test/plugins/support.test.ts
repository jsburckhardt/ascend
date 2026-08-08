import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import Support from '../../src/plugins/support.js'

describe('support plugin', () => {
  it('exposes shared support behavior', async () => {
    const fastify = Fastify()
    await fastify.register(Support)
    await fastify.ready()

    expect(fastify.someSupport()).toBe('hugs')
    await fastify.close()
  })
})
