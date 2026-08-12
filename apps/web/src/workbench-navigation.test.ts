import { describe, expect, it } from 'vitest'
import { stableWorkbenchUrl } from './workbench-navigation'

describe('stable workbench URL', () => {
  it('encodes only the persisted stable ID with one trailing slash', () => {
    expect(stableWorkbenchUrl('stable id/%?#')).toBe(
      '/projects/stable%20id%2F%25%3F%23/workbench/'
    )
  })
})
