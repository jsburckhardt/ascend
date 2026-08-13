import { describe, expect, it } from 'vitest'
import {
  TERMINAL_PARITY_MARGIN_MS,
  TERMINAL_PARITY_PHASE_BOUNDS_MS,
  TerminalParityTiming,
  validateTerminalParityTimingEvidence,
} from '../src/workbench-proof-terminal-timing.js'
import { TERMINAL_EPISODE_TIMEOUT_MS } from '../src/workbench-proof-contract.js'

const completeEvidence = async () => {
  const timing = new TerminalParityTiming()
  for (const phase of Object.keys(TERMINAL_PARITY_PHASE_BOUNDS_MS))
    await timing.measure(
      phase as keyof typeof TERMINAL_PARITY_PHASE_BOUNDS_MS,
      async () => undefined
    )
  return { dispatchCount: 1, playwrightRetries: 0, steps: timing.steps }
}

describe('terminal parity measured readiness and dispatch bounds', () => {
  it('derives fixed phase bounds and cleanup reserve from the episode limit', () => {
    expect(TERMINAL_PARITY_MARGIN_MS).toBeGreaterThan(0)
    expect(
      Object.values(TERMINAL_PARITY_PHASE_BOUNDS_MS).reduce(
        (sum, value) => sum + value,
        TERMINAL_PARITY_MARGIN_MS
      )
    ).toBe(TERMINAL_EPISODE_TIMEOUT_MS)
    expect(TERMINAL_PARITY_PHASE_BOUNDS_MS.cleanup).toBe(10_000)
  })

  it('accepts measured one-dispatch evidence and rejects assigned or retried rows', async () => {
    const evidence = await completeEvidence()
    expect(validateTerminalParityTimingEvidence(evidence)).toBe(true)
    expect(
      validateTerminalParityTimingEvidence({ ...evidence, dispatchCount: 2 })
    ).toBe(false)
    expect(
      validateTerminalParityTimingEvidence({
        ...evidence,
        playwrightRetries: 1,
      })
    ).toBe(false)
    expect(
      validateTerminalParityTimingEvidence({
        ...evidence,
        steps: evidence.steps.slice(1),
      })
    ).toBe(false)
    expect(
      validateTerminalParityTimingEvidence({
        ...evidence,
        steps: evidence.steps.map((step, index) =>
          index === 0 ? { ...step, measured: false } : step
        ),
      })
    ).toBe(false)
    expect(
      validateTerminalParityTimingEvidence({
        ...evidence,
        steps: evidence.steps.map((step, index) =>
          index === 0 ? { ...step, elapsedMs: step.boundMs + 1 } : step
        ),
      })
    ).toBe(false)
  })
})
