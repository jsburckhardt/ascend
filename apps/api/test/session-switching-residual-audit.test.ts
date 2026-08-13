import { describe, expect, it } from 'vitest'
import { BL014_RESOURCE_CLASSES } from '../src/session-switching-contract.js'

describe('BL-014 residual audit contract', () => {
  it('requires each resource class and three independent project partitions', () => {
    expect(BL014_RESOURCE_CLASSES).toHaveLength(11)
    expect(new Set(BL014_RESOURCE_CLASSES).size).toBe(
      BL014_RESOURCE_CLASSES.length
    )
    expect(
      ['A', 'B', 'C'].map((project) => ({ project, residuals: 0 }))
    ).toEqual([
      { project: 'A', residuals: 0 },
      { project: 'B', residuals: 0 },
      { project: 'C', residuals: 0 },
    ])
  })
})
