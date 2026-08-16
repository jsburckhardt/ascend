import { describe, expect, it } from 'vitest'
import {
  RUNTIME_FAILURE_NOTICES,
  parseRuntimeStateResponse,
} from '../src/runtime-state'
import {
  RUNTIME_STOP_NOTICES,
  parseRuntimeStopResponse,
} from '../src/runtime-stop'
import {
  RUNTIME_RESTART_NOTICES,
  parseRuntimeRestartResponse,
} from '../src/runtime-restart'

describe('runtime reconciliation browser contracts', () => {
  it('owns the fixed reconciliation failure notice', () => {
    expect(
      parseRuntimeStateResponse({
        runtimes: [
          {
            id: 'selected',
            state: 'Failed',
            failureCategory: 'reconcile-unconfirmed',
          },
        ],
      })
    ).toEqual([
      {
        id: 'selected',
        state: 'Failed',
        failureCategory: 'reconcile-unconfirmed',
      },
    ])
    expect(RUNTIME_FAILURE_NOTICES['reconcile-unconfirmed']).toBe(
      'Ascend could not confirm this workbench after a restart.'
    )
  })

  it.each([
    'runtime_reconcile_in_progress',
    'runtime_reconcile_unresolved',
  ] as const)('parses Stop and Restart %s only at 409', (category) => {
    expect(
      parseRuntimeStopResponse(409, { error: { category } }, 'selected')
    ).toEqual({ kind: 'failure', category })
    expect(
      parseRuntimeRestartResponse(409, { error: { category } }, 'selected')
    ).toEqual({ kind: 'failure', category })
    expect(RUNTIME_STOP_NOTICES[category]).not.toMatch(
      /pid|port|path|argv|inode/iu
    )
    expect(RUNTIME_RESTART_NOTICES[category]).not.toMatch(
      /pid|port|path|argv|inode/iu
    )
  })
})
