/// <reference types="node" />
import { expect } from 'vitest'

import {
  BL020_MUTATION_CLASSES,
  BL020_SCENARIOS,
  BL020_SCENARIO_BOUNDS,
  BL020_SCENARIO_GROUPS,
  bl020BoundValueMs,
  serializeProjectCloseMatrix,
  validateProjectCloseMatrix,
  type Bl020MutationId,
  type Bl020ScenarioGroup,
  type Bl020ScenarioId,
  type ProjectCloseEvidenceRow,
  type ProjectCloseMatrix,
} from '../src/project-close-evidence.js'
import { matrixConfig } from './project-close-fixtures.js'
import { runEdgeMatrix } from './project-close-matrix-edge.js'

/**
 * A mutable mirror of an evidence row. The matrix the validator consumes is
 * deeply frozen real evidence, so every mutation works on a structural clone
 * and the corrupted clone is what the validator is asked to judge.
 */
type MutableRow = ProjectCloseEvidenceRow extends infer T
  ? { -readonly [K in keyof T]: T[K] }
  : never

/** One executed mutation and the exact judgement the guard returned. */
export interface Bl020MutationExecution {
  readonly id: Bl020MutationId
  readonly declaredViolation: string
  /** The real evidence structure the corruption was applied to. */
  readonly target: string
  /** The exact edit, stated so the corruption can be reproduced. */
  readonly mutation: string
  /** The guard that judged the mutant. */
  readonly killedBy: 'validateProjectCloseMatrix'
  /** Everything the guard reported, in report order. */
  readonly observedViolations: readonly string[]
  readonly killed: boolean
  /** The concrete value the guard reacted to. */
  readonly witness: string
}

export interface Bl020MutationExecutionSummary {
  readonly evidenceId: 'bl-020-close-mutations'
  readonly generatedFrom: 'execution'
  readonly stage: 't-11-mutation-execution'
  /** Rows in the baseline the mutants were derived from. */
  readonly baselineRows: number
  /** Scenarios in the baseline whose row is a real executed close. */
  readonly executedBaselineScenarios: readonly Bl020ScenarioId[]
  /** The guard's judgement of the unmutated baseline: must be empty. */
  readonly baselineViolations: readonly string[]
  readonly declared: number
  readonly executed: number
  readonly killed: number
  readonly survived: number
  readonly executions: readonly Bl020MutationExecution[]
  readonly durationMs: number
}

function groupOf(scenario: Bl020ScenarioId): Bl020ScenarioGroup {
  for (const [group, members] of Object.entries(BL020_SCENARIO_GROUPS)) {
    if ((members as readonly string[]).includes(scenario))
      return group as Bl020ScenarioGroup
  }
  throw new Error('Scenario is in no declared group: ' + scenario)
}

function clone(row: ProjectCloseEvidenceRow): MutableRow {
  return structuredClone(row) as MutableRow
}

/**
 * The declared sweep shape a scenario's bound stands for. `B-13` and `B-20`
 * are client and reconciliation bounds the ownership cross-check exempts, so
 * they carry the one-record shape every other non-quarantine close carries.
 */
function sweepShapeFor(scenario: Bl020ScenarioId): {
  readonly quarantine: boolean
  readonly units: number
} {
  const bound = BL020_SCENARIO_BOUNDS[scenario]
  if (bound === 'B-6') return { quarantine: true, units: 1 }
  if (bound === 'B-8') return { quarantine: false, units: 2 }
  return { quarantine: false, units: 1 }
}

/**
 * The baseline the mutants are derived from: every scenario the edge lane
 * executed contributes its own real row, and every other catalog entry carries
 * a structural copy of a real executed row re-keyed to that scenario's declared
 * identity and bound. Nothing here is invented — the copies reuse real
 * registrations, manifests, peer and control observations, primitive counts,
 * timings, and audits — but only the five executed scenarios are executions of
 * themselves, which is why the summary names them.
 */
export interface Bl020MutationBaseline {
  readonly matrix: ProjectCloseMatrix
  readonly executedScenarios: readonly Bl020ScenarioId[]
}

export async function buildMutationBaseline(): Promise<Bl020MutationBaseline> {
  const edge = await runEdgeMatrix()
  const executed = new Map<string, ProjectCloseEvidenceRow>(
    edge.rows.map((row) => [row.scenario, row])
  )
  const oneRecordTemplate = executed.get('S-69')
  const twoRecordTemplate = executed.get('S-71')
  if (oneRecordTemplate === undefined || twoRecordTemplate === undefined)
    throw new Error('The edge lane did not produce its template rows')

  const rows = BL020_SCENARIOS.map((scenario) => {
    const real = executed.get(scenario)
    if (real !== undefined) return clone(real)
    const shape = sweepShapeFor(scenario)
    const template = shape.units === 2 ? twoRecordTemplate : oneRecordTemplate
    const row = clone(template)
    const boundId = BL020_SCENARIO_BOUNDS[scenario]
    const boundMs = bl020BoundValueMs(boundId, matrixConfig)
    row.scenario = scenario
    row.group = groupOf(scenario)
    row.executionId = `${template.executionId}:copy:${scenario}`
    row.declaredBound = boundId
    row.declaredBoundMs = boundMs
    row.requiresQuarantineResolution = shape.quarantine
    row.execution = {
      ...row.execution,
      ownershipCardinality: {
        frozen: shape.units,
        cap: matrixConfig.closeOwnershipSweepCap,
        sweepUnits: shape.units,
        capExceeded: false,
      },
    }
    if (row.elapsedMs > boundMs)
      throw new Error('Template elapsed exceeds the copied bound: ' + scenario)
    return row
  })

  return Object.freeze({
    matrix: assembleMatrix(rows),
    executedScenarios: Object.freeze(
      BL020_SCENARIOS.filter((scenario) => executed.has(scenario))
    ),
  })
}

/**
 * Assembles a matrix around a row set, recomputing every aggregate from the
 * rows themselves. Each mutation therefore alters exactly what it names: a
 * corrupted row never also desynchronizes a count it did not target.
 */
function assembleMatrix(
  rows: readonly MutableRow[],
  overrides: Partial<ProjectCloseMatrix> = {}
): ProjectCloseMatrix {
  const frozen = rows as unknown as readonly ProjectCloseEvidenceRow[]
  return Object.freeze({
    evidenceId: 'bl-020-close-matrix',
    generatedFrom: 'execution',
    stage: 't-11-scenario-matrix',
    scenarioCount: frozen.length,
    guardCount: 28,
    mutationCount: 18,
    boundCount: 20,
    preClaimSettlementCount: 8,
    episodesDeclared: 7,
    designatedEpisodesExecuted: 0,
    rows: frozen,
    // The baseline is a mutation substrate, not a committed artifact: it
    // publishes no mutation summary of its own.
    mutations: null,
    aggregate: Object.freeze({
      rows: frozen.length,
      closed: frozen.filter((row) => row.outcome === 'closed').length,
      alreadyAbsent: frozen.filter((row) => row.outcome === 'already-absent')
        .length,
      rejected: frozen.filter((row) => row.outcome === 'rejected').length,
      executionProduced: frozen.length,
      zeroResidualRows: frozen.filter((row) =>
        Object.values(row.residual).every((value) => value === 0)
      ).length,
      confirmedRows: frozen.filter((row) => row.execution.confirmation !== null)
        .length,
    }),
    ...overrides,
  }) as ProjectCloseMatrix
}

interface MutationCase {
  readonly id: Bl020MutationId
  readonly target: string
  readonly mutation: string
  /** Applies the corruption and returns the witness it installed. */
  readonly apply: (rows: MutableRow[]) => {
    readonly witness: string
    readonly matrix?: ProjectCloseMatrix
    readonly protectedValues?: readonly string[]
  }
}

function rowFor(rows: MutableRow[], scenario: Bl020ScenarioId): MutableRow {
  const found = rows.find((row) => row.scenario === scenario)
  if (found === undefined)
    throw new Error('Baseline row is missing: ' + scenario)
  return found
}

function mutationCases(): readonly MutationCase[] {
  return [
    {
      id: 'M-1',
      target: 'matrix.rows catalog order',
      mutation: 'transpose the first two catalog rows',
      apply: (rows) => {
        const [first, second] = [rows[0]!, rows[1]!]
        rows[0] = second
        rows[1] = first
        return {
          witness: `rows[0].scenario=${second.scenario} rows[1].scenario=${first.scenario}`,
        }
      },
    },
    {
      id: 'M-2',
      target: 'row.declaredBound of S-69',
      mutation: 'relabel the bound as B-4 while keeping the real bound value',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.declaredBound = 'B-4'
        return {
          witness: `declaredBound=B-4 expected=${BL020_SCENARIO_BOUNDS['S-69']} declaredBoundMs=${String(row.declaredBoundMs)}`,
        }
      },
    },
    {
      id: 'M-3',
      target: 'row.registrationAfter of the closed S-69 row',
      mutation: 'retain the pre-close registration digest after a close',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.registrationAfter = row.registrationBefore
        return { witness: `registrationAfter.id=${row.registrationBefore.id}` }
      },
    },
    {
      id: 'M-4',
      target: 'row.residual.ownershipRecords of the closed S-69 row',
      mutation: 'report one surviving ownership record after a close',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.residual = { ...row.residual, ownershipRecords: 1 }
        return { witness: 'residual.ownershipRecords=1' }
      },
    },
    {
      id: 'M-5',
      target: 'row.registrationAfter of the rejected S-70 row',
      mutation: 'change the retained registration name across the close',
      apply: (rows) => {
        const row = rowFor(rows, 'S-70')
        const before = row.registrationAfter!
        row.registrationAfter = { ...before, name: before.name + '-mutated' }
        return {
          witness: `registrationBefore.name=${row.registrationBefore.name} registrationAfter.name=${row.registrationAfter.name}`,
        }
      },
    },
    {
      id: 'M-6',
      target: 'row.rejectionCategory of the rejected S-70 row',
      mutation: 'project a removal-failed close as Failed instead of Stopped',
      apply: (rows) => {
        const row = rowFor(rows, 'S-70')
        row.rejectionCategory = 'removal-failed'
        return {
          witness: `rejectionCategory=removal-failed publicState=${String(row.publicState)}`,
        }
      },
    },
    {
      id: 'M-7',
      target: 'row.failureClassification of the rejected S-70 row',
      mutation: 'reclassify an unconfirmed release as a plain close failure',
      apply: (rows) => {
        const row = rowFor(rows, 'S-70')
        row.failureClassification = 'close-failed'
        return {
          witness: `rejectionCategory=release-unconfirmed failureClassification=close-failed`,
        }
      },
    },
    {
      id: 'M-8',
      target: 'row.emittedEvents of the closed S-69 row',
      mutation: 'attribute a foreign stop-lifecycle event to the close window',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.emittedEvents = [...row.emittedEvents, 'runtime.stop.requested']
        return { witness: 'emittedEvents includes runtime.stop.requested' }
      },
    },
    {
      id: 'M-9',
      target: 'row.projectClosedEmissions of the closed S-69 row',
      mutation: 'emit project.closed twice for one close',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.projectClosedEmissions = 2
        return { witness: 'projectClosedEmissions=2' }
      },
    },
    {
      id: 'M-10',
      target: 'row.execution.signalCallsByProject of the closed S-69 row',
      mutation: 'credit a terminated project with zero delivered signals',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        const terminated = row.execution.projectsTerminated[0]
        if (terminated === undefined)
          throw new Error('S-69 terminated no project')
        row.execution = {
          ...row.execution,
          signalCallsByProject: {
            ...row.execution.signalCallsByProject,
            [terminated]: 0,
          },
        }
        return { witness: `projectsTerminated[0] signal count=0` }
      },
    },
    {
      id: 'M-11',
      target: 'row.teardown.probes.listeners of the closed S-69 row',
      mutation: 'claim a numeric residual from a probe that never completed',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        const teardown = row.teardown!
        row.teardown = {
          ...teardown,
          probes: {
            ...teardown.probes,
            listeners: { probeCompleted: false, residual: 0 },
          },
        }
        return {
          witness:
            'teardown.probes.listeners={probeCompleted:false,residual:0}',
        }
      },
    },
    {
      id: 'M-12',
      target: 'row.peerAfter of the closed S-69 row',
      mutation: "move the peer's active connection count across the close",
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.peerAfter = {
          ...row.peerAfter,
          activeConnections: row.peerAfter.activeConnections + 1,
        }
        return {
          witness: `peerBefore.activeConnections=${String(row.peerBefore.activeConnections)} peerAfter.activeConnections=${String(row.peerAfter.activeConnections)}`,
        }
      },
    },
    {
      id: 'M-13',
      target: 'row.fixtureAfter of the closed S-69 row',
      mutation: 'change the fixture manifest digest across the close',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.fixtureAfter = {
          ...row.fixtureAfter,
          digest: row.fixtureAfter.digest + 'ff',
        }
        return {
          witness: `fixtureBefore.digest!==fixtureAfter.digest`,
        }
      },
    },
    {
      id: 'M-14',
      target: 'row.controlAfter.nonCandidacyProof of the closed S-69 row',
      mutation: 'leak a real host executable path into the committed artifact',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.controlAfter = {
          ...row.controlAfter,
          nonCandidacyProof: process.execPath,
        }
        return {
          witness: 'controlAfter.nonCandidacyProof=<real host execPath>',
          protectedValues: [process.execPath],
        }
      },
    },
    {
      id: 'M-15',
      target: 'row.execution.confirmation of the closed S-69 row',
      mutation: 'seal a close whose not-retired clause never held',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.execution = {
          ...row.execution,
          confirmation: { ...row.execution.confirmation!, notRetired: false },
        }
        return { witness: 'confirmation.notRetired=false' }
      },
    },
    {
      id: 'M-16',
      target: 'row.execution.ownershipCardinality of the closed S-69 row',
      mutation: 'sweep more units than the frozen cardinality justifies',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        const cardinality = row.execution.ownershipCardinality!
        row.execution = {
          ...row.execution,
          ownershipCardinality: { ...cardinality, sweepUnits: 3 },
        }
        return {
          witness: `frozen=${String(cardinality.frozen)} sweepUnits=3`,
        }
      },
    },
    {
      id: 'M-17',
      target: 'row.execution.settledAt of the closed S-69 row',
      mutation:
        'move the settlement instant without restating the elapsed span',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.execution = {
          ...row.execution,
          settledAt: row.execution.settledAt + 1,
        }
        return {
          witness: `elapsedMs=${String(row.elapsedMs)} settledAt-origin=${String(row.elapsedMs + 1)}`,
        }
      },
    },
    {
      id: 'M-18',
      target: 'row.managerAudit of the closed S-69 row',
      mutation:
        'declare a late-acquisition seam the production counter never saw',
      apply: (rows) => {
        const row = rowFor(rows, 'S-69')
        row.managerAudit = {
          ...row.managerAudit,
          refusedLateAcquisitionsDelta: 0,
        }
        return {
          witness: `productionPathsEntered includes running-reuse-await refusedLateAcquisitionsDelta=0`,
        }
      },
    },
  ]
}

let lastExecution: Bl020MutationExecutionSummary | null = null

/**
 * Executes every declared mutation class against a copy of real close
 * evidence and records what the guard did with each mutant. A class is killed
 * only when the guard reports exactly the violation the class declares.
 */
export async function runProjectCloseMutations(): Promise<Bl020MutationExecutionSummary> {
  const startedAt = Date.now()
  const baseline = await buildMutationBaseline()
  const baselineViolations = validateProjectCloseMatrix({
    matrix: baseline.matrix,
    config: matrixConfig,
  })
  expect(baselineViolations).toEqual([])
  // The baseline must also be judged against the config the validator
  // defaults to, so no kill below can be an artifact of a bound override.
  expect(validateProjectCloseMatrix({ matrix: baseline.matrix })).toEqual([])

  const executions: Bl020MutationExecution[] = []
  for (const testCase of mutationCases()) {
    const declared = BL020_MUTATION_CLASSES.find(
      (mutationClass) => mutationClass.id === testCase.id
    )
    if (declared === undefined)
      throw new Error('Undeclared mutation class: ' + testCase.id)
    const rows = baseline.matrix.rows.map(clone)
    const applied = testCase.apply(rows)
    const matrix = applied.matrix ?? assembleMatrix(rows)
    const observed = validateProjectCloseMatrix({
      matrix,
      config: matrixConfig,
      ...(applied.protectedValues === undefined
        ? {}
        : { protectedValues: applied.protectedValues }),
    })
    // A mutant that changed nothing is not a mutant: the serialized artifact
    // must differ from the baseline before its judgement means anything.
    expect(serializeProjectCloseMatrix(matrix)).not.toBe(
      serializeProjectCloseMatrix(baseline.matrix)
    )
    executions.push(
      Object.freeze({
        id: declared.id,
        declaredViolation: declared.violation,
        target: testCase.target,
        mutation: testCase.mutation,
        killedBy: 'validateProjectCloseMatrix',
        observedViolations: Object.freeze([...observed]),
        killed: observed.length === 1 && observed[0] === declared.violation,
        witness: applied.witness,
      })
    )
  }

  const summary: Bl020MutationExecutionSummary = Object.freeze({
    evidenceId: 'bl-020-close-mutations',
    generatedFrom: 'execution',
    stage: 't-11-mutation-execution',
    baselineRows: baseline.matrix.rows.length,
    executedBaselineScenarios: baseline.executedScenarios,
    baselineViolations: Object.freeze([...baselineViolations]),
    declared: BL020_MUTATION_CLASSES.length,
    executed: executions.length,
    killed: executions.filter((execution) => execution.killed).length,
    survived: executions.filter((execution) => !execution.killed).length,
    executions: Object.freeze(executions),
    durationMs: Date.now() - startedAt,
  })
  lastExecution = summary
  return summary
}

/** The most recent mutation execution in this process. */
export const lastProjectCloseMutationExecution =
  (): Bl020MutationExecutionSummary | null => lastExecution
