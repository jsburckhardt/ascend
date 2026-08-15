import { describe, expect, it } from 'vitest'

import {
  publicRuntimeStateForLifecycleEvent,
  type RuntimeLifecycleEvent,
} from '../src/project-runtime-contract.js'

const catalog: readonly Readonly<{
  event: RuntimeLifecycleEvent['event']
  to: RuntimeLifecycleEvent['to']
  publicState: 'Starting' | 'Running' | 'Failed'
}>[] = [
  {
    event: 'runtime.start.requested',
    to: 'starting',
    publicState: 'Starting',
  },
  {
    event: 'runtime.start.succeeded',
    to: 'running',
    publicState: 'Running',
  },
  {
    event: 'runtime.start.failed',
    to: 'failed',
    publicState: 'Failed',
  },
  {
    event: 'runtime.health.changed',
    to: 'failed',
    publicState: 'Failed',
  },
]

describe('runtime public state event consistency', () => {
  it.each(catalog)('$event maps $to to $publicState', (entry) => {
    expect(publicRuntimeStateForLifecycleEvent(entry.event, entry.to)).toBe(
      entry.publicState
    )
  })

  it('uses exactly the NFR-015 runtime event vocabulary', () => {
    expect(catalog.map(({ event }) => event)).toEqual([
      'runtime.start.requested',
      'runtime.start.succeeded',
      'runtime.start.failed',
      'runtime.health.changed',
    ])
    expect(
      catalog.some(({ event }) => event === ('runtime.exited' as string))
    ).toBe(false)
  })

  it('rejects success and healthy outcomes while the public state is Failed', () => {
    expect(() =>
      publicRuntimeStateForLifecycleEvent('runtime.start.succeeded', 'failed')
    ).toThrow('does not match')
    expect(() =>
      publicRuntimeStateForLifecycleEvent('runtime.health.changed', 'running')
    ).toThrow('does not match')
  })

  it('represents post-readiness exit and failed health with one terminal event', () => {
    for (const scenarioEvents of [
      [{ event: 'runtime.health.changed', to: 'failed' }],
      [{ event: 'runtime.health.changed', to: 'failed' }],
    ] as const) {
      expect(scenarioEvents).toHaveLength(1)
      expect(
        publicRuntimeStateForLifecycleEvent(
          scenarioEvents[0].event,
          scenarioEvents[0].to
        )
      ).toBe('Failed')
    }
  })
})
