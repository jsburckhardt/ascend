import { describe, expect, it } from 'vitest'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RECONCILE_ABSENCE_PROOFS,
  RECONCILE_OUTCOMES,
  RECONCILE_REFUSAL_REASONS,
  RUNTIME_ENTRY_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_LIFECYCLE_EVENTS,
  RUNTIME_LIFECYCLE_TARGETS,
  RUNTIME_RESTART_REJECTION_CATEGORIES,
  RUNTIME_STOP_REJECTION_CATEGORIES,
  acquisitionAcrossReconciliationBoundMs,
  createProjectRuntimeConfig,
  reconciliationEndToEndBoundMs,
  reconciliationOverallBoundMs,
  reconciliationStartupControlBoundMs,
  runtimeRestartOverallBoundMs,
  runtimeStopOverallBoundMs,
  workbenchAcquisitionBoundMs,
} from '../src/project-runtime-contract.js'

describe('runtime reconciliation contract', () => {
  it('keeps BL-019 vocabularies and bounds closed', () => {
    const config = createProjectRuntimeConfig()

    expect(RUNTIME_ENTRY_STATES.length).toBe(7)
    expect(RUNTIME_LIFECYCLE_TARGETS.length).toBe(7)
    expect(RUNTIME_LIFECYCLE_EVENTS.length).toBe(13)
    expect(RUNTIME_FAILURE_CATEGORIES.length).toBe(19)
    expect(RUNTIME_STOP_REJECTION_CATEGORIES.length).toBe(9)
    expect(RUNTIME_RESTART_REJECTION_CATEGORIES.length).toBe(9)
    expect(RECONCILE_OUTCOMES.length).toBe(3)
    expect(RECONCILE_REFUSAL_REASONS.length).toBe(18)
    expect(RECONCILE_ABSENCE_PROOFS.length).toBe(2)
    expect(Object.keys(config).length).toBe(17)

    expect(config.reconcileScanAllowanceMs).toBe(2_000)
    expect(config.reconcileAttributionAllowanceMs).toBe(1_000)
    expect(config.reconcileReadinessBoundMs).toBe(7_000)
    expect(config.reconcileSettlementAllowanceMs).toBe(1_000)
    expect(config.reconcileStartupHeadroomMs).toBe(3_000)
    expect(config.reconcileResponseAllowanceMs).toBe(1_000)

    expect(reconciliationOverallBoundMs(config)).toBe(11_000)
    expect(reconciliationEndToEndBoundMs(config)).toBe(15_000)
    expect(reconciliationStartupControlBoundMs(config)).toBe(4_000)
    expect(workbenchAcquisitionBoundMs(config)).toBe(60_000)
    expect(acquisitionAcrossReconciliationBoundMs(config)).toBe(71_000)
    expect(runtimeStopOverallBoundMs(config)).toBe(5_000)
    expect(runtimeRestartOverallBoundMs(config, false)).toBe(66_000)
    expect(PROJECT_RUNTIME_DEFAULTS.healthPath).toBe('/healthz/')
  })
})
