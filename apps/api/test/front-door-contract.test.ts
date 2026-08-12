import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_FRONT_DOOR_TOKEN,
  hasTrustedFrontDoorHeaders,
  resolveFrontDoorToken,
} from '../src/front-door-contract.js'

describe('front-door trust configuration', () => {
  it('uses the documented local default and accepts bounded explicit alignment', () => {
    expect(resolveFrontDoorToken(undefined)).toBe(DEVELOPMENT_FRONT_DOOR_TOKEN)
    expect(resolveFrontDoorToken('0123456789abcdef')).toBe('0123456789abcdef')
  })

  it.each(['', 'short', 'x'.repeat(257)])(
    'refuses invalid configured token %j',
    (token) => expect(() => resolveFrontDoorToken(token)).toThrow(/16 and 256/u)
  )

  it('detects either reserved trusted header so partial pairs cannot fall back', () => {
    expect(hasTrustedFrontDoorHeaders({})).toBe(false)
    expect(
      hasTrustedFrontDoorHeaders({ 'x-ascend-front-door-token': 'opaque' })
    ).toBe(true)
    expect(
      hasTrustedFrontDoorHeaders({
        'x-ascend-front-door-authority': 'localhost:5173',
      })
    ).toBe(true)
  })
})
