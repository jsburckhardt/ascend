import { describe, expect, it } from 'vitest'
import {
  HOME_WORKBENCH_MARGIN_MS,
  HOME_WORKBENCH_OVERALL_MS,
  HOME_WORKBENCH_STEP_BOUNDS_MS,
  HomeWorkbenchTiming,
} from '../e2e/home-workbench-timing.js'

describe('Home/workbench overall timing contract', () => {
  it('derives one finite overall bound from every step plus bounded margin', () => {
    expect(HOME_WORKBENCH_OVERALL_MS).toBe(
      Object.values(HOME_WORKBENCH_STEP_BOUNDS_MS).reduce(
        (total, bound) => total + bound,
        HOME_WORKBENCH_MARGIN_MS
      )
    )
    expect(HOME_WORKBENCH_OVERALL_MS).toBe(220_000)
  })

  it('retains the exact slow step and fails without retry when its bound is exceeded', () => {
    const timing = new HomeWorkbenchTiming()
    const startMs = Date.now() - HOME_WORKBENCH_STEP_BOUNDS_MS.history - 1
    expect(() => timing.record('history', startMs)).toThrow(
      'Home/workbench step history exceeded its finite 25000 ms bound'
    )
    expect(timing.steps).toEqual([
      expect.objectContaining({
        name: 'history',
        boundMs: 25_000,
        outcome: 'timed-out',
      }),
    ])
  })
})
