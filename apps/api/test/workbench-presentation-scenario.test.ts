import { describe, expect, it, vi } from 'vitest'
import {
  runFixedPresentationScenario,
  type FixedScenarioActions,
} from '../src/workbench-presentation-scenario.js'
import type { PresentationCandidate } from '../src/workbench-presentation-contract.js'

const makeActions = (candidate: PresentationCandidate) => {
  const order: string[] = []
  const tokens: string[] = []
  let terminalComplete = false
  const action = (name: string) =>
    vi.fn(async () => {
      order.push(name)
    })
  const actions: FixedScenarioActions = {
    candidate,
    navigate: vi.fn(async () => {
      order.push('navigate')
      return 200
    }),
    findExplorerSentinel: action('explorer'),
    openMarkdownFixture: action('markdown'),
    observeRenderedPreview: action('preview'),
    keyboardFocusExplorer: action('keyboard-explorer'),
    keyboardEnterPreview: action('keyboard-preview-enter'),
    keyboardLeavePreview: action('keyboard-preview-leave'),
    openIntegratedTerminal: action('terminal'),
    clipboardRoundTrip: vi.fn(async (token) => {
      order.push('clipboard')
      tokens.push(token)
      return true
    }),
    runTerminalParity: vi.fn(async () => {
      order.push('parity')
      return { identity: true, path: true, tools: true }
    }),
    workbenchWebSocketUsable: vi.fn(() => terminalComplete),
    markInteractionStart: vi.fn(() => {
      order.push('interaction-start')
    }),
    markTerminalCompletion: vi.fn(() => {
      terminalComplete = true
      order.push('terminal-complete')
    }),
  }
  return { actions, order, tokens }
}

describe('BL-003 shared fixed scenario', () => {
  it.each(['embedded', 'full-page'] as const)(
    'runs the identical ordered scenario once for %s',
    async (candidate) => {
      const { actions, order, tokens } = makeActions(candidate)
      const result = await runFixedPresentationScenario(actions)
      expect(order).toEqual([
        'navigate',
        'explorer',
        'markdown',
        'preview',
        'interaction-start',
        'keyboard-explorer',
        'keyboard-preview-enter',
        'keyboard-preview-leave',
        'terminal',
        'clipboard',
        'parity',
        'terminal-complete',
      ])
      for (const value of Object.values(actions))
        if (typeof value === 'function' && 'mock' in value)
          expect(value).toHaveBeenCalledOnce()
      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toMatch(/^BL003_CLIPBOARD_[0-9a-f-]{36}$/u)
      expect(JSON.stringify(result)).not.toContain(tokens[0])
    }
  )

  it('does not retry a failed action or continue the scenario', async () => {
    const { actions } = makeActions('embedded')
    actions.observeRenderedPreview = vi.fn(async () => {
      throw new Error('deterministic preview failure')
    })
    await expect(runFixedPresentationScenario(actions)).rejects.toThrow(
      'deterministic preview failure'
    )
    expect(actions.observeRenderedPreview).toHaveBeenCalledOnce()
    expect(actions.keyboardFocusExplorer).not.toHaveBeenCalled()
    expect(actions.openIntegratedTerminal).not.toHaveBeenCalled()
  })

  it('keeps presentation as the only adapter-specific input', () => {
    const embedded = makeActions('embedded').actions
    const fullPage = makeActions('full-page').actions
    expect(Object.keys(embedded)).toEqual(Object.keys(fullPage))
    expect(embedded.candidate).not.toBe(fullPage.candidate)
  })
})
