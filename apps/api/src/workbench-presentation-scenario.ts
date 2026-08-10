import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type {
  PresentationAssertionId,
  PresentationCandidate,
} from './workbench-presentation-contract.js'

export interface FixedScenarioActions {
  candidate: PresentationCandidate
  navigate: () => Promise<number>
  findExplorerSentinel: () => Promise<void>
  openMarkdownFixture: () => Promise<void>
  observeRenderedPreview: () => Promise<void>
  keyboardFocusExplorer: () => Promise<void>
  keyboardEnterPreview: () => Promise<void>
  keyboardLeavePreview: () => Promise<void>
  openIntegratedTerminal: () => Promise<void>
  clipboardRoundTrip: (token: string) => Promise<boolean>
  runTerminalParity: () => Promise<{
    identity: boolean
    path: boolean
    tools: boolean
  }>
  workbenchWebSocketUsable: () => boolean
  markInteractionStart: () => void
  markTerminalCompletion: () => void
}
export interface FixedScenarioResult {
  assertions: Partial<Record<PresentationAssertionId, boolean>>
  navigationStartMs: number
  scenarioCompletionMs: number
}
export class FixedScenarioAssertionError extends Error {
  readonly assertionId: PresentationAssertionId
  readonly assertions: Partial<Record<PresentationAssertionId, boolean>>
  readonly navigationStartMs: number
  constructor(
    assertionId: PresentationAssertionId,
    message: string,
    assertions: Partial<Record<PresentationAssertionId, boolean>> = {},
    navigationStartMs = Math.floor(performance.now())
  ) {
    super(message)
    this.name = 'FixedScenarioAssertionError'
    this.assertionId = assertionId
    this.assertions = { ...assertions }
    this.navigationStartMs = navigationStartMs
  }
}

export const runFixedPresentationScenario = async (
  actions: FixedScenarioActions
): Promise<FixedScenarioResult> => {
  const assertions: Partial<Record<PresentationAssertionId, boolean>> = {}
  const navigationStartMs = Math.floor(performance.now())
  const perform = async <Value>(
    id: PresentationAssertionId,
    action: () => Promise<Value>
  ): Promise<Value> => {
    try {
      const value = await action()
      assertions[id] = true
      return value
    } catch (error) {
      throw new FixedScenarioAssertionError(
        id,
        error instanceof Error
          ? error.message
          : 'Required observable outcome failed',
        assertions,
        navigationStartMs
      )
    }
  }
  const attempt = async <Value>(
    id: PresentationAssertionId,
    action: () => Promise<Value>
  ): Promise<Value> => {
    try {
      return await action()
    } catch (error) {
      throw new FixedScenarioAssertionError(
        id,
        error instanceof Error
          ? error.message
          : 'Required observable outcome failed',
        assertions,
        navigationStartMs
      )
    }
  }
  const requireOutcome = (
    id: PresentationAssertionId,
    passed: boolean,
    message: string
  ): void => {
    if (!passed)
      throw new FixedScenarioAssertionError(
        id,
        message,
        assertions,
        navigationStartMs
      )
    assertions[id] = true
  }

  const status = await attempt('document-navigation', actions.navigate)
  requireOutcome(
    'document-navigation',
    status >= 200 && status < 400,
    'Candidate navigation did not return HTTP 200 through 399'
  )
  await perform('explorer-sentinel', actions.findExplorerSentinel)
  await perform('markdown-open', actions.openMarkdownFixture)
  await perform('preview-rendered', actions.observeRenderedPreview)
  actions.markInteractionStart()
  await perform('keyboard-explorer-focus', actions.keyboardFocusExplorer)
  await perform('keyboard-preview-enter', actions.keyboardEnterPreview)
  await perform('keyboard-preview-leave', actions.keyboardLeavePreview)
  await perform('terminal-open', actions.openIntegratedTerminal)

  const token = 'BL003_CLIPBOARD_' + randomUUID()
  requireOutcome(
    'clipboard-round-trip',
    await attempt('clipboard-round-trip', () =>
      actions.clipboardRoundTrip(token)
    ),
    'Clipboard round-trip did not reproduce the in-memory token'
  )
  const parity = await attempt(
    'terminal-identity-parity',
    actions.runTerminalParity
  )
  requireOutcome(
    'terminal-identity-parity',
    parity.identity,
    'Terminal identity parity failed'
  )
  requireOutcome(
    'terminal-path-parity',
    parity.path,
    'Terminal canonical-path parity failed'
  )
  requireOutcome(
    'terminal-tool-parity',
    parity.tools,
    'Terminal fixed-tool parity failed'
  )
  actions.markTerminalCompletion()
  requireOutcome(
    'workbench-websocket-usable',
    actions.workbenchWebSocketUsable(),
    'Required workbench WebSocket was not usable through terminal completion'
  )
  return {
    assertions,
    navigationStartMs,
    scenarioCompletionMs: Math.floor(performance.now()),
  }
}
