import { TERMINAL_EPISODE_TIMEOUT_MS } from './workbench-proof-contract.js'

export const TERMINAL_PARITY_PHASE_BOUNDS_MS = Object.freeze({
  prerequisiteDirect: 15_000,
  workbenchStart: 15_000,
  listenerHttpReadiness: 10_000,
  browserWorkbenchReadiness: 15_000,
  terminalCreation: 10_000,
  commandDispatch: 2_000,
  commandEvidence: 10_000,
  cleanup: 10_000,
} as const)

export const TERMINAL_PARITY_MARGIN_MS =
  TERMINAL_EPISODE_TIMEOUT_MS -
  Object.values(TERMINAL_PARITY_PHASE_BOUNDS_MS).reduce(
    (sum, value) => sum + value,
    0
  )

export type TerminalParityPhase = keyof typeof TERMINAL_PARITY_PHASE_BOUNDS_MS

export interface TerminalParityPhaseTiming {
  readonly phase: TerminalParityPhase
  readonly measured: true
  readonly clock: 'process.hrtime.bigint'
  readonly startedMs: number
  readonly endedMs: number
  readonly elapsedMs: number
  readonly boundMs: number
  readonly outcome: 'passed' | 'failed'
}

const now = (): number => Number(process.hrtime.bigint()) / 1_000_000

export class TerminalParityTiming {
  readonly steps: TerminalParityPhaseTiming[] = []

  start(_phase: TerminalParityPhase): number {
    return now()
  }

  async measure<T>(
    phase: TerminalParityPhase,
    operation: () => Promise<T>
  ): Promise<T> {
    const startedMs = now()
    try {
      const value = await operation()
      this.finish(phase, startedMs, 'passed')
      return value
    } catch (error) {
      this.finish(phase, startedMs, 'failed')
      throw error
    }
  }

  finish(
    phase: TerminalParityPhase,
    startedMs: number,
    outcome: 'passed' | 'failed'
  ): void {
    const endedMs = now()
    const elapsedMs = endedMs - startedMs
    const boundMs = TERMINAL_PARITY_PHASE_BOUNDS_MS[phase]
    this.steps.push({
      phase,
      measured: true,
      clock: 'process.hrtime.bigint',
      startedMs,
      endedMs,
      elapsedMs,
      boundMs,
      outcome,
    })
    if (elapsedMs > boundMs)
      throw new Error('Terminal parity phase exceeded finite bound: ' + phase)
  }
}

export function validateTerminalParityTimingEvidence(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const evidence = value as Record<string, unknown>
  if (evidence.dispatchCount !== 1 || evidence.playwrightRetries !== 0)
    return false
  if (!Array.isArray(evidence.steps)) return false
  const steps = evidence.steps as Record<string, unknown>[]
  const phases = Object.keys(TERMINAL_PARITY_PHASE_BOUNDS_MS)
  return phases.every((phase) => {
    const rows = steps.filter((step) => step.phase === phase)
    if (rows.length !== 1) return false
    const row = rows[0]!
    return (
      row.measured === true &&
      row.clock === 'process.hrtime.bigint' &&
      row.outcome === 'passed' &&
      typeof row.elapsedMs === 'number' &&
      Number.isFinite(row.elapsedMs) &&
      Number(row.elapsedMs) >= 0 &&
      Number(row.elapsedMs) <=
        TERMINAL_PARITY_PHASE_BOUNDS_MS[phase as TerminalParityPhase]
    )
  })
}
