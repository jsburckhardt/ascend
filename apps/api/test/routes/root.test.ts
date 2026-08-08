import { describe, expect, it } from 'vitest'
import { build } from '../helper.js'

describe('root route', () => {
  it('reports API health', async () => {
    const app = await build()
    const response = await app.inject({ url: '/' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ name: 'ascend', status: 'ok' })
  })
})
