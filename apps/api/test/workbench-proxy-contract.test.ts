import { describe, expect, it } from 'vitest'
import { buildRuntimeArgv } from '../src/project-runtime-process.js'
import {
  WORKBENCH_FAILURE_TABLE,
  WORKBENCH_FAILURE_TABLE_SHA256,
  decodeWorkbenchProjectId,
  filterWorkbenchHeaders,
  parseStableWorkbenchRoute,
  RedirectRejectedError,
  rewriteServiceWorkerAllowed,
  rewriteWorkbenchCookie,
  rewriteWorkbenchRedirect,
  serializeWorkbenchEvent,
  validateRestrictedEvidence,
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
    expect(WORKBENCH_FAILURE_TABLE).toHaveLength(23)
    expect(
      new Set(WORKBENCH_FAILURE_TABLE.map((entry) => entry.category)).size
    ).toBe(23)
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
      projectId: 'p',
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
