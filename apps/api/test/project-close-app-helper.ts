import { expect } from 'vitest'
import type { FastifyInstance } from 'fastify'

/**
 * BL-020 close refuses a pending reconciliation, so an application built over a
 * non-empty library must settle its one-shot reconciliation before a close is
 * admitted. The wait is deterministic: it polls the manager's own inspection
 * rather than a timer, and fails loudly instead of proceeding on an unsettled
 * reconciliation.
 */
export async function settleReconciliation(
  app: FastifyInstance,
  attempts = 600
): Promise<void> {
  const inspect = app.projectRuntime.inspectReconciliation
  if (inspect === undefined) {
    throw new Error('manager does not expose inspectReconciliation')
  }
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const phase = inspect.call(app.projectRuntime).phase
    if (phase === 'settled' || phase === 'aborted') return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  expect(inspect.call(app.projectRuntime).phase).toBe('settled')
}
