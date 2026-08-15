import { describe, expect, it } from 'vitest'
import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_ENTRY_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_LIFECYCLE_TARGETS,
  RUNTIME_STATES,
  RUNTIME_STOP_OUTCOMES,
  RUNTIME_STOP_REJECTION_CATEGORIES,
  createProjectRuntimeConfig,
  publicRuntimeState,
  publicRuntimeStateForLifecycleEvent,
  publicRuntimeStateForLifecycleTarget,
  runtimeStopOverallBoundMs,
} from '../src/project-runtime-contract.js'

describe('runtime stop contract', () => {
  it('keeps public, snapshot, entry, and lifecycle vocabularies separate', () => {
    expect(PUBLIC_RUNTIME_STATES).toEqual([
      'Stopped',
      'Starting',
      'Running',
      'Failed',
    ])
    expect(RUNTIME_STATES).toEqual(['starting', 'running', 'failed'])
    expect(RUNTIME_ENTRY_STATES).toEqual([
      'registered',
      'starting',
      'running',
      'stopping',
      'restarting',
      'failed',
    ])
    expect(RUNTIME_LIFECYCLE_TARGETS).toEqual([
      'starting',
      'running',
      'failed',
      'stopping',
      'stopped',
      'restarting',
    ])
    expect(RUNTIME_ENTRY_STATES.map(publicRuntimeState)).toEqual([
      'Stopped',
      'Starting',
      'Running',
      'Running',
      'Starting',
      'Failed',
    ])
    expect(publicRuntimeStateForLifecycleTarget('stopped')).toBe('Stopped')
    expect(publicRuntimeStateForLifecycleTarget('stopping')).toBe('Running')
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.stop.requested', 'stopping')
    ).toBe('Running')
    expect(
      publicRuntimeStateForLifecycleEvent('runtime.stop.succeeded', 'stopped')
    ).toBe('Stopped')
    expect(() =>
      publicRuntimeStateForLifecycleEvent('runtime.stop.succeeded', 'failed')
    ).toThrow('does not match')
  })

  it('freezes bounded stop vocabularies and derives the overall bound', () => {
    expect(RUNTIME_STOP_OUTCOMES).toEqual([
      'stopped',
      'already-stopped',
      'rejected',
    ])
    expect(RUNTIME_STOP_REJECTION_CATEGORIES).toEqual([
      'not-registered',
      'no-managed-runtime',
      'start-in-progress',
      'restart-in-progress',
      'failure-retained',
      'stop-unconfirmed',
      'manager-shutdown',
    ])
    expect(RUNTIME_FAILURE_CATEGORIES).toHaveLength(18)
    expect(Object.isFrozen(RUNTIME_STOP_OUTCOMES)).toBe(true)
    expect(Object.isFrozen(RUNTIME_STOP_REJECTION_CATEGORIES)).toBe(true)
    const config = createProjectRuntimeConfig({
      expectedUser: 'fixture-user',
      environment: { PATH: '/safe/bin' },
      gracefulShutdownMs: 5,
      forceShutdownMs: 7,
      stopAuditAllowanceMs: 3,
    })
    expect(runtimeStopOverallBoundMs(config)).toBe(15)
    for (const stopAuditAllowanceMs of [0, -1, 1.5]) {
      expect(() =>
        createProjectRuntimeConfig({
          expectedUser: 'fixture-user',
          environment: { PATH: '/safe/bin' },
          stopAuditAllowanceMs,
        })
      ).toThrow('positive integers')
    }
  })
})
