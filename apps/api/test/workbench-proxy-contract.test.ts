import { describe, expect, it } from 'vitest'
import { buildRuntimeArgv } from '../src/project-runtime-process.js'
import {
  WORKBENCH_FAILURE_TABLE,
  WORKBENCH_FAILURE_TABLE_SHA256,
  WORKBENCH_HOP_BY_HOP_HEADERS,
  decodeWorkbenchProjectId,
  filterWorkbenchHeaders,
  parseStableWorkbenchRoute,
  RedirectRejectedError,
  rewriteServiceWorkerAllowed,
  rewriteWorkbenchCookie,
  rewriteWorkbenchRedirect,
  serializeWorkbenchEvent,
  tokenizeWorkbenchProjectId,
  validateRestrictedEvidence,
  validateWorkbenchAcceptanceCleanup,
  validateWorkbenchFailureMatrix,
  validateWorkbenchRedactionProof,
  validateWorkbenchRouteHeaderMatrix,
  workbenchFailure,
  workbenchFailureEnvelope,
} from '../src/workbench-proxy-contract.js'

describe('stable workbench proxy contract', () => {
  it('validates the exact finite ID vectors and stable suffix', () => {
    expect(
      ['../x', '%2f', '%5c', '%00', 'x'.repeat(129)].map(
        decodeWorkbenchProjectId
      )
    ).toEqual([undefined, undefined, undefined, undefined, undefined])
    expect(decodeWorkbenchProjectId('project_A.~9')).toBe('project_A.~9')
    expect(
      parseStableWorkbenchRoute(
        '/projects/project_A/workbench/assets/main.js?x=1'
      )
    ).toEqual({
      projectId: 'project_A',
      prefix: '/projects/project_A/workbench/',
      upstreamPath: '/assets/main.js?x=1',
    })
    expect(
      parseStableWorkbenchRoute('/projects/../x/workbench/')
    ).toBeUndefined()
  })

  it('freezes one complete exact failure table', () => {
    expect(WORKBENCH_FAILURE_TABLE).toHaveLength(30)
    expect(
      new Set(WORKBENCH_FAILURE_TABLE.map((entry) => entry.category)).size
    ).toBe(30)
    expect(
      WORKBENCH_FAILURE_TABLE.filter(({ category }) =>
        category.startsWith('runtime:')
      )
    ).toHaveLength(18)
    expect(
      WORKBENCH_FAILURE_TABLE.find(
        ({ category }) => category === 'runtime:reconcile-unconfirmed'
      )
    ).toEqual({
      category: 'runtime:reconcile-unconfirmed',
      status: 503,
      code: 'workbench_reconcile_unconfirmed',
      message: 'Workbench recovery could not be confirmed.',
    })
    expect(WORKBENCH_FAILURE_TABLE_SHA256).toMatch(/^[a-f0-9]{64}$/u)
    expect(
      workbenchFailureEnvelope(workbenchFailure('websocket-timeout'))
    ).toEqual({
      error: {
        code: 'workbench_websocket_timeout',
        message: 'Workbench WebSocket handshake timed out.',
      },
    })
  })

  it('strips hop, connection-token, forwarding, and target headers', () => {
    const result = filterWorkbenchHeaders(
      {
        connection: 'keep-alive, x-remove',
        'keep-alive': 'timeout=5',
        'x-remove': 'yes',
        forwarded: 'for=secret',
        'x-forwarded-host': 'attacker',
        'x-proxy-target': 'attacker',
        host: 'attacker',
        authorization: 'Bearer retained-end-to-end',
        etag: 'tag',
      },
      { request: true }
    )
    expect(result).toEqual({
      authorization: 'Bearer retained-end-to-end',
      etag: 'tag',
    })
  })

  it('requires executable stable-route evidence for every hop header direction', () => {
    const completeDirection = WORKBENCH_HOP_BY_HOP_HEADERS.map((name) => ({
      name,
      injectedAtStableRoute: true,
      injectedValueAbsentAfterProxy: true,
    }))
    const matrix = {
      id: 'V-4',
      transport: 'stable-route-fake-upstream',
      requestCases: completeDirection,
      responseCases: completeDirection,
      requestConnectionToken: {
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: true,
      },
      responseConnectionToken: {
        injectedAtStableRoute: true,
        injectedValueAbsentAfterProxy: true,
      },
    }
    expect(validateWorkbenchRouteHeaderMatrix(matrix)).toBe(true)
    expect(
      validateWorkbenchRouteHeaderMatrix({
        ...matrix,
        requestCases: completeDirection.slice(1),
      })
    ).toBe(false)
    expect(
      validateWorkbenchRouteHeaderMatrix({
        ...matrix,
        transport: 'filter-helper',
      })
    ).toBe(false)
  })

  it('rewrites redirects, cookies, and service worker scope', () => {
    const prefix = '/projects/p/workbench/'
    expect(
      rewriteWorkbenchRedirect('/login?x=1', prefix, '127.0.0.1:41000')
    ).toBe(prefix + 'login?x=1')
    expect(
      rewriteWorkbenchRedirect(
        'http://127.0.0.1:41000/root',
        prefix,
        '127.0.0.1:41000'
      )
    ).toBe(prefix + 'root')
    expect(
      rewriteWorkbenchRedirect('./?folder=safe', prefix, '127.0.0.1:41000', '/')
    ).toBe(prefix + '?folder=safe')
    expect(() =>
      rewriteWorkbenchRedirect(
        'https://example.test/no',
        prefix,
        '127.0.0.1:41000'
      )
    ).toThrow(RedirectRejectedError)
    expect(
      rewriteWorkbenchCookie(
        'sid=x; Path=/; Domain=localhost; Secure; HttpOnly; SameSite=Lax',
        prefix
      )
    ).toBe('sid=x; Path=/projects/p/workbench/; Secure; HttpOnly; SameSite=Lax')
    expect(rewriteWorkbenchCookie('sid=x; Path=/foo', prefix)).toBe(
      'sid=x; Path=/projects/p/workbench/foo'
    )
    expect(rewriteWorkbenchCookie('sid=x; Secure', prefix)).toBe(
      'sid=x; Secure; Path=/projects/p/workbench/'
    )
    expect(rewriteServiceWorkerAllowed('/', prefix)).toBe(prefix)
  })

  it('covers rejected and pass-through contract edges', () => {
    const prefix = '/projects/p/workbench/'
    expect(() => workbenchFailure('not-a-category' as never)).toThrow(
      'Unknown workbench failure category'
    )
    expect(decodeWorkbenchProjectId('%ZZ')).toBeUndefined()
    expect(parseStableWorkbenchRoute('/outside')).toBeUndefined()
    expect(parseStableWorkbenchRoute('/projects/p/workbench')).toEqual({
      projectId: 'p',
      prefix,
      upstreamPath: '/',
    })
    expect(
      filterWorkbenchHeaders(
        {
          connection: undefined,
          host: 'stable.example',
          upgrade: 'websocket',
          'sec-websocket-protocol': ['one', 'two'],
          'x-undefined': undefined,
        },
        { request: false, upgrade: true }
      )
    ).toEqual({
      host: 'stable.example',
      upgrade: 'websocket',
      'sec-websocket-protocol': ['one', 'two'],
    })
    expect(() =>
      rewriteWorkbenchRedirect('http://[', prefix, '127.0.0.1:41000')
    ).toThrow(RedirectRejectedError)
    expect(() => rewriteWorkbenchCookie('', prefix)).toThrow(
      'Invalid Set-Cookie'
    )
    expect(rewriteServiceWorkerAllowed('/nested', prefix)).toBe('/nested')
    expect(
      serializeWorkbenchEvent({
        event: 'workbench.proxy.failed',
        projectId: 'p',
        transport: 'websocket',
        elapsedMs: -1,
        classification: 'manager-shutdown',
      })
    ).toMatchObject({ elapsedMs: 0, classification: 'manager-shutdown' })
    expect(validateRestrictedEvidence(null)).toBe(false)
    expect(validateRestrictedEvidence([])).toBe(false)
  })

  it('rejects contradictory pre-cleanup socket snapshots as final evidence', () => {
    const finalCleanup = {
      proxyInventory: {
        pendingOperations: 0,
        upstreamHttpRequests: 0,
        upstreamHttpResponses: 0,
        rawSockets: 0,
        webSockets: 0,
      },
      fixtureServerListening: false,
      fixtureSocketCount: 0,
      fixtureSocketStates: [{ destroyed: true, closed: true }],
      downstreamSocketStates: [{ closed: true }],
      upstreamWebSocketStates: [{ closed: true }],
    }
    const completeCleanup = {
      securityFixtureSocketCount: 0,
      securityFixtureSocketStates: [{ destroyed: true, closed: true }],
      fixtureSocketStates: [{ destroyed: true, closed: true }],
      securityScenarioCleanup: {
        preCleanup: {
          fixtureServerListening: true,
          fixtureSocketCount: 1,
          fixtureSocketStates: [{ destroyed: false, closed: false }],
        },
        finalCleanup,
      },
      concurrencyScenarioCleanup: {
        preCleanup: {
          fixtureServerListening: true,
          fixtureSocketCount: 4,
          fixtureSocketStates: [{ destroyed: false, closed: false }],
        },
        finalCleanup,
      },
    }
    expect(validateWorkbenchAcceptanceCleanup(completeCleanup)).toBe(true)

    const contradictoryArtifact = {
      ...completeCleanup,
      securityFixtureSocketCount: 1,
      fixtureSocketStates: Array.from({ length: 4 }, () => ({
        destroyed: false,
        closed: false,
      })),
    }
    expect(validateWorkbenchAcceptanceCleanup(contradictoryArtifact)).toBe(
      false
    )
    expect(
      validateWorkbenchAcceptanceCleanup({
        ...completeCleanup,
        concurrencyScenarioCleanup: {
          ...completeCleanup.concurrencyScenarioCleanup,
          finalCleanup: {
            ...finalCleanup,
            fixtureSocketCount: 1,
            fixtureSocketStates: [{ destroyed: false, closed: false }],
          },
        },
      })
    ).toBe(false)
  })

  it('rejects local-only failure evidence, disabled logging, and wrong payload channels', () => {
    const executableMatrix = {
      id: 'V-7',
      tableHash: WORKBENCH_FAILURE_TABLE_SHA256,
      declaredCategories: WORKBENCH_FAILURE_TABLE.map((row) => row.category),
      executions: WORKBENCH_FAILURE_TABLE.map((row, executionIndex) => ({
        executionIndex,
        executionId: 'execution-' + String(executionIndex),
        transport: row.category.startsWith('websocket-')
          ? 'websocket-upgrade'
          : 'http-request',
        executionPath:
          row.category === 'malformed-project-id'
            ? ['stable-route', 'route-validation']
            : row.category === 'manager-shutdown'
              ? ['stable-route', 'proxy-manager']
              : row.category === 'unknown-project' ||
                  row.category === 'persistence-failure'
                ? ['stable-route', 'proxy-manager', 'project-library']
                : row.category.startsWith('runtime:')
                  ? [
                      'stable-route',
                      'proxy-manager',
                      'project-library',
                      'runtime-manager',
                    ]
                  : [
                      'stable-route',
                      'proxy-manager',
                      'project-library',
                      'runtime-manager',
                      'fake-upstream',
                    ],
        observedInternalError: row.category,
        category: row.category,
        status: row.status,
        code: row.code,
        message: row.message,
        cleanup: {
          pendingOperations: 0,
          upstreamHttpRequests: 0,
          upstreamHttpResponses: 0,
          rawSockets: 0,
          webSockets: 0,
          fixtureSockets: 0,
          clientSockets: 0,
        },
        redaction: { literalMatches: 0, encodedMatches: 0 },
      })),
    }
    expect(validateWorkbenchFailureMatrix(executableMatrix)).toBe(true)
    expect(
      validateWorkbenchFailureMatrix({
        ...executableMatrix,
        tableHash: 'stale-table-hash',
      })
    ).toBe(false)
    expect(
      validateWorkbenchFailureMatrix({
        ...executableMatrix,
        executions: executableMatrix.executions.map((execution, index) => ({
          ...execution,
          executionId: index === 1 ? 'execution-0' : execution.executionId,
        })),
      })
    ).toBe(false)
    expect(
      validateWorkbenchFailureMatrix({
        ...executableMatrix,
        executions: executableMatrix.executions.map((execution, index) => ({
          ...execution,
          transport: index === 0 ? 'websocket-upgrade' : execution.transport,
        })),
      })
    ).toBe(false)
    expect(
      validateWorkbenchFailureMatrix({
        ...executableMatrix,
        executions: executableMatrix.executions.map((execution) => ({
          ...execution,
          localOnly: true,
          injectionType: 'InjectedFailure',
          executionPath: ['local-throw', 'table-comparison'],
        })),
      })
    ).toBe(false)

    const scans = Array.from({ length: 10 }, (_, index) => ({
      sentinelId: 'sentinel-' + String(index),
      literalMatches: 0,
      encodedMatches: 0,
    }))
    const proof = {
      loggerEnabled: true,
      markers: {
        start: 'bounded-start',
        end: 'bounded-end',
        startIndex: 0,
        endIndex: 2,
      },
      logCapture: { accessRecords: 1, applicationRecords: 1 },
      channels: {
        http: 'http-request',
        websocket: 'websocket-frame',
        terminal: 'integrated-terminal-websocket-frame',
      },
      projectTokenAllowance: [
        { classification: 'stable-route-url', occurrences: 1 },
      ],
      scans,
    }
    expect(validateWorkbenchRedactionProof(proof)).toBe(true)
    expect(
      validateWorkbenchRedactionProof({ ...proof, loggerEnabled: false })
    ).toBe(false)
    expect(
      validateWorkbenchRedactionProof({
        ...proof,
        channels: {
          ...proof.channels,
          websocket: 'http-header',
          terminal: 'http-header',
        },
      })
    ).toBe(false)
  })

  it('keeps runtime launch loopback-only and disables generic proxy routes', () => {
    expect(buildRuntimeArgv('/safe/project', 42000)).toEqual([
      '--bind-addr',
      '127.0.0.1:42000',
      '--auth',
      'none',
      '--disable-telemetry',
      '--disable-update-check',
      '--disable-workspace-trust',
      '--disable-proxy',
      '/safe/project',
    ])
  })

  it('serializes only bounded safe events and validates restricted evidence', () => {
    expect(
      serializeWorkbenchEvent({
        event: 'workbench.proxy.completed',
        projectId: 'p',
        transport: 'http',
        elapsedMs: 1.9,
      })
    ).toEqual({
      event: 'workbench.proxy.completed',
      projectToken: tokenizeWorkbenchProjectId('p'),
      transport: 'http',
      elapsedMs: 1,
    })
    expect(
      validateRestrictedEvidence({
        schemaVersion: 1,
        matrices: [],
        cleanup: {},
        residualAudit: {},
      })
    ).toBe(true)
    expect(validateRestrictedEvidence({ schemaVersion: 1, matrices: [] })).toBe(
      false
    )
  })
})
