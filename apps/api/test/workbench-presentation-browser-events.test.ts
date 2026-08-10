import { describe, expect, it } from 'vitest'
import {
  BrowserEventObserver,
  classifyBrowserOccurrence,
  type BrowserOccurrenceInput,
} from '../src/workbench-presentation-browser-events.js'

describe('BL-003 browser protocol evidence', () => {
  it.each([
    [
      'frame',
      {
        kind: 'console',
        detail: 'Refused to frame because X-Frame-Options denied it',
      },
    ],
    [
      'csp',
      {
        kind: 'console',
        detail: 'Blocked by Content Security Policy frame-ancestors',
      },
    ],
    [
      'origin',
      { kind: 'request-failed', detail: 'CORS origin request blocked' },
    ],
    ['mixed', { kind: 'console', detail: 'Mixed Content request blocked' }],
    ['sandbox', { kind: 'console', detail: 'Sandbox permission denied' }],
    [
      'storage',
      { kind: 'console', detail: 'Cookie storage access blocked by policy' },
    ],
    [
      'resource',
      {
        kind: 'request-failed',
        url: 'http://host/workbench.js',
        detail: 'required resource failed',
      },
    ],
    [
      'preview',
      {
        kind: 'response',
        url: 'http://host/preview.js',
        status: 500,
        detail: 'Preview resource failed',
      },
    ],
  ] as Array<[string, BrowserOccurrenceInput]>)(
    'classifies %s policy failures as blocking with precedence',
    (_name, input) => {
      expect(classifyBrowserOccurrence(input)).toEqual({
        blocking: true,
        nonBlockingWarning: false,
      })
    }
  )

  it.each([
    'http://127.0.0.1:43479/stable-a3fc2899bd0fcd388253c0e79ce33b8acd48c688/vscode-remote-resource?path=%2Fhome%2Fvscode%2F.local%2Flib%2Fcode-server-4.131.0%2Flib%2Fvscode%2Fextensions%2Fmarkdown-math%2Fsyntaxes%2Fmd-math-block.tmLanguage.json&tkn=',
    'http://127.0.0.1:45233/stable-a3fc2899bd0fcd388253c0e79ce33b8acd48c688/vscode-remote-resource?path=%2Fhome%2Fvscode%2F.local%2Flib%2Fcode-server-4.131.0%2Flib%2Fvscode%2Fextensions%2Fmarkdown-math%2Fsyntaxes%2Fmd-math-block.tmLanguage.json&tkn=',
  ])(
    'does not classify a successful observed md-math-block resource as blocking: %s',
    (url) => {
      expect(
        classifyBrowserOccurrence({
          kind: 'response',
          url,
          status: 200,
          detail: 'fetch',
        })
      ).toEqual({ blocking: false, nonBlockingWarning: false })
    }
  )

  it('retains warnings, overlap, and repeated occurrences exactly once each', () => {
    const observer = new BrowserEventObserver()
    observer.record({ kind: 'console', detail: 'ordinary warning' })
    observer.record({
      kind: 'response',
      url: 'http://host/optional.css',
      status: 404,
    })
    observer.record({ kind: 'request-failed', detail: 'transient reset' })
    observer.record({ kind: 'request-failed', detail: 'transient reset' })
    observer.record({
      kind: 'console',
      detail: 'CORS origin blocked by policy',
    })
    expect(observer.events).toHaveLength(5)
    expect(observer.events[2].detail).toBe(observer.events[3].detail)
    expect(observer.totals()).toEqual({ blocking: 1, nonBlocking: 4 })
  })

  it('requires a pre-interaction workbench WebSocket usable through terminal completion', () => {
    const passing = new BrowserEventObserver()
    passing.record({ kind: 'websocket-open', url: 'ws://127.0.0.1/workbench' })
    passing.markInteractionStart()
    passing.markTerminalCompletion()
    expect(passing.workbenchWebSocketUsable()).toBe(true)

    const closing = new BrowserEventObserver()
    closing.record({ kind: 'websocket-open', url: 'ws://127.0.0.1/workbench' })
    closing.markInteractionStart()
    closing.record({
      kind: 'websocket-close',
      url: 'ws://127.0.0.1/workbench',
      detail: 'closed',
    })
    closing.markTerminalCompletion()
    expect(closing.workbenchWebSocketUsable()).toBe(false)
    expect(closing.totals()).toEqual({ blocking: 1, nonBlocking: 0 })
  })

  it('keeps functional failure separate from retained non-blocking evidence', () => {
    const observer = new BrowserEventObserver()
    observer.record({
      kind: 'page-error',
      detail: 'editor assertion separately failed',
    })
    expect(observer.totals()).toEqual({ blocking: 0, nonBlocking: 0 })
    expect(observer.events).toHaveLength(1)
  })
})
