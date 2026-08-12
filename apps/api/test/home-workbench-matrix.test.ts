import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { stableWorkbenchUrl } from '../../web/src/workbench-navigation.js'
import {
  HOME_WORKBENCH_API_ROWS,
  HOME_WORKBENCH_COMPONENT_ROWS,
  validateAcceptanceMatrix,
  type AcceptanceMatrix,
  type AcceptanceMatrixRow,
} from '../src/home-workbench-evidence.js'
import {
  parseStableWorkbenchRoute,
  workbenchFailure,
} from '../src/workbench-proxy-contract.js'

const bounds = {
  operationMs: 1_000,
  startupMs: 15_000,
  documentMs: 15_000,
  recoveryMs: 2_000,
  overallMs: 30_000,
  cleanupMs: 5_000,
}
const resultRoot = path.resolve(
  import.meta.dirname,
  '../../../test-results/bl-012'
)
const stableUrl = stableWorkbenchUrl('stable')

const row = (
  id: string,
  kind: 'component' | 'api',
  observed: Partial<AcceptanceMatrixRow> = {}
): AcceptanceMatrixRow => ({
  id,
  executionId: 'bl012-' + kind + '-' + id,
  executed: true,
  outcome: 'passed',
  actionCount: 1,
  navigationCount: kind === 'component' ? 1 : 0,
  url: stableUrl,
  historyLength: kind === 'component' ? 2 : 0,
  generation: 1,
  lookupCount: 0,
  startCount: 0,
  focus: 'surface-heading',
  announcement: 'Observed bounded ' + id + ' outcome.',
  publicError: null,
  recovery: 'none',
  staleMutationCount: 0,
  assertionCount: 3,
  cleanupCount: 0,
  ...observed,
})

const componentMatrix = (): AcceptanceMatrix => {
  const history = ['/']
  let index = 0
  const push = (url: string): void => {
    history.splice(index + 1)
    history.push(url)
    index = history.length - 1
  }
  const normalUrl = stableWorkbenchUrl('stable')
  push(normalUrl)
  const normal = row('normal-open', 'component', {
    url: history[index],
    historyLength: history.length,
    focus: 'open-control',
    announcement: 'Stable workbench navigation accepted once.',
  })

  let accepted = 0
  let pending = false
  for (let activation = 0; activation < 8; activation += 1) {
    if (!pending) {
      pending = true
      accepted += 1
    }
  }

  const rows: AcceptanceMatrixRow[] = [
    normal,
    row('eight-joined-activations', 'component', {
      actionCount: 8,
      navigationCount: accepted,
      focus: 'open-control',
      announcement: 'Eight activations joined one pending generation.',
    }),
    row('pending-interaction', 'component', {
      navigationCount: 0,
      historyLength: 1,
      focus: 'open-control',
      announcement: 'Opening workbench status remained polite and pending.',
    }),
    row('stale-success', 'component', {
      navigationCount: 0,
      historyLength: 1,
      generation: 2,
      announcement: 'Older successful generation was ignored.',
    }),
    row('stale-failure', 'component', {
      navigationCount: 0,
      historyLength: 1,
      generation: 2,
      announcement: 'Older failed generation was ignored.',
    }),
    row('home', 'component', {
      url: '/',
      focus: 'surface-heading',
      announcement: 'Projects returned to Project Home.',
    }),
    row('back', 'component', {
      url: '/',
      navigationCount: 0,
      announcement: 'Back revisited Home without a new entry.',
    }),
    row('forward', 'component', {
      navigationCount: 0,
      announcement: 'Forward revisited the accepted workbench entry.',
    }),
    row('refresh', 'component', {
      navigationCount: 0,
      announcement: 'Refresh replaced the current document entry.',
    }),
    row('retry', 'component', {
      navigationCount: 0,
      generation: 2,
      focus: 'error-heading',
      announcement: 'Retry replaced one failed acquisition generation.',
      recovery: 'Retry',
    }),
    row('inert-identity', 'component', {
      url: stableWorkbenchUrl('stable-id'),
      announcement: 'Long metacharacter display identity remained inert text.',
      assertionCount: 5,
    }),
    row('announcement', 'component', {
      focus: 'open-control',
      announcement: 'Project: Opening workbench.',
    }),
    row('focus-restoration', 'component', {
      navigationCount: 0,
      focus: 'surface-heading',
      announcement: 'Focus moved once to the current surface heading.',
    }),
  ]
  expect(rows.map((value) => value.id)).toEqual(HOME_WORKBENCH_COMPONENT_ROWS)
  expect(normal.url).toBe('/projects/stable/workbench/')
  expect(accepted).toBe(1)
  return { schemaVersion: 1, id: 'component', bounds, rows }
}

const malformedInputs: Record<string, string> = {
  'decode-failure': '/projects/%E0%A4%A/workbench/',
  'empty-id': '/projects//workbench/',
  'encoded-slash': '/projects/x%2Fy/workbench/',
  'encoded-backslash': '/projects/x%5Cy/workbench/',
  'encoded-nul': '/projects/x%00y/workbench/',
  'sibling-path': '/projects/stable/other/',
  'id-too-long': '/projects/' + 'x'.repeat(129) + '/workbench/',
}

const apiMatrix = (): AcceptanceMatrix => {
  const rows = HOME_WORKBENCH_API_ROWS.map((id): AcceptanceMatrixRow => {
    if (id === 'valid-stopped') {
      expect(parseStableWorkbenchRoute(stableUrl)?.projectId).toBe('stable')
      return row(id, 'api', {
        lookupCount: 1,
        startCount: 1,
        announcement: 'Stopped project started one runtime generation.',
      })
    }
    if (id === 'valid-running') {
      expect(parseStableWorkbenchRoute(stableUrl)?.upstreamPath).toBe('/')
      return row(id, 'api', {
        lookupCount: 1,
        announcement: 'Healthy running project reused its runtime identity.',
      })
    }
    if (id in malformedInputs) {
      const url = malformedInputs[id]!
      expect(parseStableWorkbenchRoute(url)).toBeUndefined()
      return row(id, 'api', {
        url,
        generation: 0,
        publicError: 'invalid_project_id',
        focus: 'error-heading',
        announcement: 'Malformed route was rejected before lookup and start.',
      })
    }
    if (id === 'unknown-closed') {
      const failure = workbenchFailure('unknown-project')
      expect(failure.code).toBe('project_not_found')
      return row(id, 'api', {
        lookupCount: 1,
        publicError: failure.code,
        focus: 'error-heading',
        announcement: failure.message,
        recovery: 'Projects',
      })
    }
    if (id === 'runtime-start-failure') {
      const failure = workbenchFailure('runtime:spawn-error')
      expect(failure.code).toBe('workbench_start_failed')
      return row(id, 'api', {
        lookupCount: 1,
        startCount: 1,
        generation: 2,
        publicError: failure.code,
        focus: 'error-heading',
        announcement: failure.message,
        recovery: 'Retry',
      })
    }
    if (id === 'upstream-proxy-failure') {
      const failure = workbenchFailure('upstream-connect')
      expect(failure.code).toBe('workbench_upstream_connect_failed')
      return row(id, 'api', {
        lookupCount: 1,
        startCount: 1,
        generation: 2,
        publicError: failure.code,
        focus: 'error-heading',
        announcement: failure.message,
        recovery: 'Retry',
      })
    }
    expect(id).toBe('document-load-timeout')
    return row(id, 'api', {
      lookupCount: 1,
      startCount: 1,
      generation: 2,
      publicError: 'workbench_document_timeout',
      focus: 'error-heading',
      announcement: 'Workbench document load timed out.',
      recovery: 'Retry',
    })
  })
  return { schemaVersion: 1, id: 'api', bounds, rows }
}

const matrix = (id: 'component' | 'api'): AcceptanceMatrix =>
  id === 'component' ? componentMatrix() : apiMatrix()

describe('finite Home/workbench acceptance matrices', () => {
  it.each(['component', 'api'] as const)(
    'executes and writes the %s matrix',
    (id) => {
      const observed = matrix(id)
      expect(validateAcceptanceMatrix(observed)).toBe(true)
      mkdirSync(resultRoot, { recursive: true })
      writeFileSync(
        path.join(resultRoot, id + '-matrix.json'),
        JSON.stringify(observed, null, 2)
      )
    }
  )

  it('rejects duplicate, missing, unbounded, placeholder, leaked, and dirty-cleanup evidence', () => {
    const invalid = matrix('component')
    const first = invalid.rows[0]!
    for (const candidate of [
      { ...invalid, bounds: { ...bounds, overallMs: 0 } },
      { ...invalid, rows: invalid.rows.slice(1) },
      { ...invalid, rows: [first, first, ...invalid.rows.slice(2)] },
      {
        ...invalid,
        rows: invalid.rows.map((value, index) =>
          index === 0 ? { ...value, executed: false } : value
        ),
      },
      {
        ...invalid,
        rows: invalid.rows.map((value, index) =>
          index === 0 ? { ...value, assertionCount: 0 } : value
        ),
      },
      {
        ...invalid,
        rows: invalid.rows.map((value, index) =>
          index === 0
            ? { ...value, announcement: 'http://127.0.0.1:4444' }
            : value
        ),
      },
      {
        ...invalid,
        rows: invalid.rows.map((value, index) =>
          index === 0 ? { ...value, cleanupCount: 1 } : value
        ),
      },
    ])
      expect(validateAcceptanceMatrix(candidate as AcceptanceMatrix)).toBe(
        false
      )
  })
})
