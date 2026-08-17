/// <reference types="node" />
import { describe, expect, it } from 'vitest'

import {
  BL020_MUTATION_CLASSES,
  BL020_DECLARED_COUNTS,
  validateCommittedProjectCloseMatrix,
  validateProjectCloseMatrix,
} from '../src/project-close-evidence.js'
import {
  buildMutationBaseline,
  lastProjectCloseMutationExecution,
  runProjectCloseMutations,
  type Bl020MutationExecutionSummary,
} from './project-close-mutations.js'

let summary: Bl020MutationExecutionSummary

describe('BL-020 mutation execution', () => {
  it('executes every declared mutation class against real close evidence', async () => {
    summary = await runProjectCloseMutations()
    if (process.env['BL020_MUTATION_REPORT'] === '1') {
      for (const execution of summary.executions)
        process.stderr.write(
          '[mutation] ' +
            execution.id +
            ' ' +
            (execution.killed ? 'killed' : 'SURVIVED') +
            ' ' +
            execution.observedViolations.join(',') +
            ' | ' +
            execution.target +
            ' | ' +
            execution.mutation +
            ' | witness ' +
            execution.witness +
            '\n'
        )
    }
    expect(summary.baselineViolations).toEqual([])
    expect(summary.baselineRows).toBe(BL020_DECLARED_COUNTS.scenarios)
    expect(summary.executedBaselineScenarios).toEqual([
      'S-69',
      'S-70',
      'S-71',
      'S-74',
      'S-75',
    ])
    expect(summary.declared).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(summary.executed).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(summary.executions.map((execution) => execution.id)).toEqual(
      BL020_MUTATION_CLASSES.map((mutationClass) => mutationClass.id)
    )
  }, 300_000)

  it('kills every mutant with exactly the violation its class declares', () => {
    for (const execution of summary.executions) {
      expect
        .soft(execution.observedViolations, execution.id)
        .toEqual([execution.declaredViolation])
      expect.soft(execution.killed, execution.id).toBe(true)
    }
    expect(summary.killed).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(summary.survived).toBe(0)
  })

  it('records a reproducible target, edit, and witness for every kill', () => {
    for (const execution of summary.executions) {
      expect.soft(execution.target.length, execution.id).toBeGreaterThan(0)
      expect.soft(execution.mutation.length, execution.id).toBeGreaterThan(0)
      expect.soft(execution.witness.length, execution.id).toBeGreaterThan(0)
      expect
        .soft(execution.killedBy, execution.id)
        .toBe('validateProjectCloseMatrix')
    }
    // Every class corrupts a distinct structure: no two mutants are the same
    // edit wearing two identifiers.
    expect(
      new Set(
        summary.executions.map(
          (execution) => execution.target + '|' + execution.mutation
        )
      ).size
    ).toBe(summary.executions.length)
  })

  it('publishes the execution for the final aggregator', () => {
    expect(lastProjectCloseMutationExecution()).toBe(summary)
    expect(summary.evidenceId).toBe('bl-020-close-mutations')
    expect(summary.generatedFrom).toBe('execution')
    expect(summary.stage).toBe('t-11-mutation-execution')
  })

  it('keeps its structural substrate out of any committable matrix', async () => {
    // The baseline is a legal matrix — that is what makes it a usable mutation
    // substrate — but seventy of its rows are structural copies of five
    // executed closes. The committed-artifact guard rejects it on that ground
    // alone, so a substrate can never be published as the scenario matrix.
    const baseline = await buildMutationBaseline()
    expect(validateProjectCloseMatrix({ matrix: baseline.matrix })).toEqual([])
    expect(
      validateCommittedProjectCloseMatrix({ matrix: baseline.matrix })
    ).toContain('structural-copy-committed')

    // The rows the guard reacts to are exactly the copies: the five executed
    // rows carry a minted execution identity, and the other seventy do not.
    const executed = baseline.matrix.rows.filter((row) =>
      new RegExp('^' + row.scenario + '-[0-9a-f-]{36}$', 'u').test(
        row.executionId
      )
    )
    expect(executed.map((row) => row.scenario)).toEqual([
      ...summary.executedBaselineScenarios,
    ])
    expect(baseline.matrix.rows).toHaveLength(BL020_DECLARED_COUNTS.scenarios)
  }, 300_000)
})
