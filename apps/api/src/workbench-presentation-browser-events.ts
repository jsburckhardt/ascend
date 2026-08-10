import { performance } from 'node:perf_hooks'
import type {
  BrowserEventKind,
  RawBrowserEvent,
} from './workbench-presentation-contract.js'

export interface BrowserOccurrenceInput {
  kind: BrowserEventKind
  url?: string | null
  detail?: string
  status?: number | null
  beforeTerminalCompletion?: boolean
}

const failureWords =
  /(block(?:ed|ing)?|refus(?:ed|al)|denied|policy|not allowed|violat(?:e|ion)|failed)/iu
const policyFamilies =
  /(frame|frame-ancestors|x-frame-options|content security policy|\bcsp\b|origin|\bcors\b|mixed content|sandbox|permission|cookie|storage|websocket|web socket)/iu
const requiredResource =
  /(workbench|workbench\.desktop|workbench\.web|preview|webview|extensionHost|code-server)/iu

export const classifyBrowserOccurrence = (
  input: BrowserOccurrenceInput
): Pick<RawBrowserEvent, 'blocking' | 'nonBlockingWarning'> => {
  const text = [input.url ?? '', input.detail ?? ''].join(' ')
  const websocketFailure =
    (input.kind === 'websocket-error' || input.kind === 'websocket-close') &&
    input.beforeTerminalCompletion === true
  const policyFailure =
    failureWords.test(text) &&
    (policyFamilies.test(text) || requiredResource.test(text))
  const blocking = websocketFailure || policyFailure
  const warning =
    input.kind === 'console' ||
    input.kind === 'request-failed' ||
    input.kind === 'websocket-error' ||
    input.kind === 'websocket-close' ||
    (input.kind === 'response' && (input.status ?? 0) >= 400)
  return { blocking, nonBlockingWarning: !blocking && warning }
}

export class BrowserEventObserver {
  readonly events: RawBrowserEvent[] = []
  private terminalCompleted = false
  private interactionSequence: number | null = null

  markInteractionStart(): void {
    this.interactionSequence = this.events.length + 1
  }

  markTerminalCompletion(): void {
    this.terminalCompleted = true
  }

  record(
    input: Omit<BrowserOccurrenceInput, 'beforeTerminalCompletion'>
  ): RawBrowserEvent {
    const classified = classifyBrowserOccurrence({
      ...input,
      beforeTerminalCompletion: !this.terminalCompleted,
    })
    const event: RawBrowserEvent = {
      sequence: this.events.length + 1,
      monotonicMs: Math.floor(performance.now()),
      kind: input.kind,
      url: input.url ?? null,
      detail: input.detail ?? '',
      status: input.status ?? null,
      ...classified,
    }
    this.events.push(event)
    return event
  }

  totals(): { blocking: number; nonBlocking: number } {
    return {
      blocking: this.events.filter((event) => event.blocking).length,
      nonBlocking: this.events.filter((event) => event.nonBlockingWarning)
        .length,
    }
  }

  workbenchWebSocketUsable(): boolean {
    const interaction = this.interactionSequence ?? Number.POSITIVE_INFINITY
    const opened = this.events.some(
      (event) =>
        event.kind === 'websocket-open' &&
        event.sequence < interaction &&
        /(websocket|127\.0\.0\.1|localhost)/iu.test(event.url ?? '')
    )
    const failed = this.events.some(
      (event) =>
        (event.kind === 'websocket-error' ||
          event.kind === 'websocket-close') &&
        event.blocking
    )
    return opened && !failed && this.terminalCompleted
  }
}
