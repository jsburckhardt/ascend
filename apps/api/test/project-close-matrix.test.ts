/// <reference types="node" />
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BL020_CONFIRMATION_CLAUSES,
  BL020_DECLARED_COUNTS,
  BL020_PRESERVED_EVIDENCE,
  BL020_PROXY_AUDIT_COUNTS,
  BL020_RESIDUAL_CLASSES,
  BL020_SCENARIOS,
  BL020_TEARDOWN_CLASSES,
  bl020BoundValueMs,
  scanProtectedCloseValues,
  serializeProjectCloseMatrix,
  validateCommittedProjectCloseMatrix,
  validateProjectCloseMatrix,
  type Bl020ScenarioId,
  type ProjectCloseEvidenceRow,
  type ProjectCloseMatrix,
  type ProjectCloseMutationSummary,
} from '../src/project-close-evidence.js'
import {
  COMPONENT_LANE_PATH,
  DISPOSABLE_MATRIX_PATH,
  REPOSITORY_ROOT,
  RETAINED_MATRIX_PATH,
  closeDeadlineArms,
  deferred,
  deleteProject,
  matrixConfig,
  navigateWorkbench,
  observeCloseAdmission,
  openHeldWorkbenchRequest,
  proxyAuditFor,
  type CloseWorld,
  type HttpResult,
} from './project-close-fixtures.js'
import {
  assertSharedRowConsistency,
  executeCloseScenario,
  recordedHostValues,
  responseWithDisposition,
  until,
} from './project-close-matrix-support.js'
import { runCoreMatrixRows } from './project-close-matrix-core.js'
import { runLifecycleMatrixRows } from './project-close-matrix-lifecycle.js'
import { runEdgeMatrixRows } from './project-close-matrix-edge.js'
import { runWebMatrixRows } from './project-close-matrix-web.js'
import { runProjectCloseMutations } from './project-close-mutations.js'
import { PROJECT_CLOSED_EVENT } from '../src/routes/projects.js'

/**
 * The scenarios this suite executes itself. Every other declared scenario is
 * executed by the lane module that owns it, and this writer assembles all of
 * them; the artifact is written only when the assembled set equals the
 * declared catalog, so a partial run can never be mistaken for a matrix.
 */
const EXECUTED_SCENARIOS: readonly Bl020ScenarioId[] = [
  'S-1',
  'S-2',
  'S-41',
  'S-67',
]

/** The rows this suite's own scenarios produced, keyed by scenario. */
const executedHere = new Map<Bl020ScenarioId, ProjectCloseEvidenceRow>()

/**
 * The rules every row must satisfy whatever it observed. Admission is decided
 * here from the frozen pre-claim settlement site alone, and never from the
 * settled category; every other relation is the shared one this writer and
 * the core matrix both apply.
 */
function assertRowConsistency(row: ProjectCloseEvidenceRow): void {
  const admittedBySite = row.preClaimSettlement === null
  expect(row.execution.claimInstalledAt !== null).toBe(admittedBySite)
  assertSharedRowConsistency(row, admittedBySite)
}

/**
 * Applies the row rules and keeps the row for assembly. A row that fails its
 * rules is never kept, so the writer cannot assemble an unchecked row.
 */
function acceptRow(row: ProjectCloseEvidenceRow): void {
  assertRowConsistency(row)
  executedHere.set(row.scenario, row)
}

/**
 * Writes one artifact atomically: the bytes are staged beside their
 * destination and renamed onto it, so a reader never observes a partial
 * artifact and a failed write leaves no half-file behind.
 */
async function commitArtifact(
  destination: string,
  serialized: string
): Promise<void> {
  const directory = path.dirname(destination)
  await mkdir(directory, { recursive: true })
  const staged = destination + '.staged'
  await writeFile(staged, serialized)
  await rename(staged, destination)
}

/** Every entry a directory currently holds, sorted. */
async function entriesOf(destination: string): Promise<readonly string[]> {
  return [...(await readdir(path.dirname(destination)))].sort()
}

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

describe('BL-020 close matrix', () => {
  it('declares the fixed seventy-five scenario catalog in plan order', () => {
    expect(BL020_SCENARIOS).toHaveLength(BL020_DECLARED_COUNTS.scenarios)
    expect(new Set(BL020_SCENARIOS).size).toBe(BL020_DECLARED_COUNTS.scenarios)
  })

  it('owns four of the declared scenarios and assembles the rest', () => {
    expect(new Set(EXECUTED_SCENARIOS).size).toBe(EXECUTED_SCENARIOS.length)
    for (const scenario of EXECUTED_SCENARIOS) {
      expect(BL020_SCENARIOS).toContain(scenario)
    }
  })

  it('closes an idle running project with no proxy connections (S-1)', async () => {
    const row = await executeCloseScenario('S-1', (world) => ({
      arrangeSelected: async () => {
        expect((await navigateWorkbench(world, world.selected.id)).status).toBe(
          200
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
    }))
    acceptRow(row)
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
    expect(row.execution.ownershipCardinality).toEqual({
      frozen: 1,
      cap: matrixConfig.closeOwnershipSweepCap,
      sweepUnits: 1,
      capExceeded: false,
    })
    expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)
    // The route logs exactly one closed emission for the settled close.
    expect(row.projectClosedEmissions).toBe(1)
  }, 120_000)

  it('closes a running project with one in-flight proxied request (S-2)', async () => {
    let held: { readonly settled: Promise<unknown>; destroy(): void } | null =
      null
    const row = await executeCloseScenario('S-2', (world) => ({
      arrangeSelected: async () => {
        expect((await navigateWorkbench(world, world.selected.id)).status).toBe(
          200
        )
        const identity = world.identities.find(
          (candidate) =>
            candidate.projectId === world.selected.id && candidate.alive
        )
        expect(identity).toBeDefined()
        identity!.holdUpstream(true)
        held = openHeldWorkbenchRequest(world, world.selected.id)
        // The pair is live only once the proxy itself reports it.
        await until(
          'a live proxied request pair',
          () => proxyAuditFor(world, world.selected).httpRequests >= 1
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        await held?.settled
      },
    }))
    acceptRow(row)
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
    // The drain severed the live pair rather than waiting it out.
    expect(row.execution.drainInvocations).toBe(1)
    expect(row.execution.connectionAuditInvocations).toBe(1)
    expect(row.peerAfter.activeConnections).toBe(
      row.peerBefore.activeConnections
    )
  }, 120_000)

  it('settles eight concurrent closes as one close and seven joins (S-41)', async () => {
    let executed: CloseWorld | undefined
    const row = await executeCloseScenario('S-41', (world) => {
      executed = world
      const held = deferred<void>()
      return {
        arrangeSelected: async () => {
          expect(
            (await navigateWorkbench(world, world.selected.id)).status
          ).toBe(200)
          const identity = world.identities.find(
            (candidate) =>
              candidate.projectId === world.selected.id && candidate.alive
          )
          expect(identity).toBeDefined()
          // The winner is held inside its own release, so the other seven
          // arrivals reach admission while its claim is still installed.
          identity!.releaseHold = held
        },
        act: async () => {
          const arrivals = Array.from({ length: 8 }, () =>
            deleteProject(world, world.selected.id)
          )
          await until(
            'all eight arrivals entering the close service',
            () => world.closeInvocations.length === 8
          )
          held.resolve()
          return Promise.all(arrivals)
        },
        selectResponse: responseWithDisposition('closed'),
      }
    })
    acceptRow(row)
    expect(row.outcome).toBe('closed')
    expect(row.routeStatus).toBe(200)
    // One release, one removal, and one route emission for eight arrivals:
    // the other seven joined the claim the winner installed.
    expect(row.execution.primitiveCalls.terminate).toBe(1)
    expect(row.projectClosedEmissions).toBe(1)
    expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)

    // Exactly one of the eight arrivals installed a claim, and every other one
    // is observed to have joined it rather than to have settled on its own.
    const invocations = executed?.closeInvocations ?? []
    expect(invocations).toHaveLength(8)
    const admitted = invocations.filter(
      (invocation) => closeDeadlineArms(invocation).length > 0
    )
    expect(admitted).toHaveLength(1)
    for (const contender of invocations) {
      if (contender === admitted[0]) continue
      const admission = observeCloseAdmission({
        subject: contender,
        invocations,
        frozenOwnership: 1,
      })
      expect(admission.armedCloseDeadlines).toBe(0)
      expect(admission.lostToConcurrentClose).toBe(true)
    }
  }, 120_000)

  it('answers three repeats of a settled close with a persisted absence (S-67)', async () => {
    const statuses: number[] = []
    const emissions = { overall: -1 }
    const row = await executeCloseScenario('S-67', (world) => ({
      arrangeSelected: async () => {
        expect((await navigateWorkbench(world, world.selected.id)).status).toBe(
          200
        )
      },
      act: async () => {
        const responses: HttpResult[] = []
        const logBefore = world.routeLog.length
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const response = await deleteProject(world, world.selected.id)
          responses.push(response)
          statuses.push(response.status)
        }
        // The whole four-request episode emits exactly once. The row below
        // reports the fourth request, so this overall count is observed here,
        // where the episode is.
        emissions.overall = world.routeLog
          .slice(logBefore)
          .filter((line) => line.includes(PROJECT_CLOSED_EVENT)).length
        return responses
      },
      subject: (invocations) => invocations[3]!,
    }))
    acceptRow(row)
    expect(statuses).toEqual([200, 404, 404, 404])
    expect(emissions.overall).toBe(1)
    expect(row.outcome).toBe('already-absent')
    expect(row.preClaimSettlement).toBe('persisted-absence')
    expect(row.routeStatus).toBe(404)
    expect(row.routeCategory).toBe('project_not_found')
    // The repeat this row reports emitted nothing: the single emission
    // belongs to the settled close three requests earlier.
    expect(row.projectClosedEmissions).toBe(0)
    expect(row.execution.primitiveCalls.terminate).toBe(1)
  }, 120_000)
})

describe('BL-020 close matrix artifact', () => {
  it('assembles, validates, and commits every executed row', async () => {
    expect(executedHere.size).toBe(EXECUTED_SCENARIOS.length)

    // Every remaining declared scenario is executed now, by the lane that
    // owns it. Nothing here is read from a file or carried over from a
    // previous run: each row below is produced by a close world of its own.
    const laneRows = [
      ...(await runCoreMatrixRows()),
      ...(await runLifecycleMatrixRows()),
      ...(await runEdgeMatrixRows()),
      ...(await runWebMatrixRows()),
    ]
    const executed = new Map<Bl020ScenarioId, ProjectCloseEvidenceRow>(
      executedHere
    )
    for (const row of laneRows) {
      expect(executed.has(row.scenario)).toBe(false)
      assertRowConsistency(row)
      executed.set(row.scenario, row)
    }
    expect(executed.size).toBe(BL020_DECLARED_COUNTS.scenarios)

    // Assembly is by declared order, and a missing scenario stops the run
    // before anything is serialized.
    const rows = BL020_SCENARIOS.map((scenario) => {
      const row = executed.get(scenario)
      if (row === undefined) {
        throw new Error('scenario ' + scenario + ' produced no executed row')
      }
      return row
    })
    expect(new Set(rows.map((row) => row.executionId)).size).toBe(rows.length)
    // Each row entered a boundary instance of its own: no row is another
    // row's observation re-keyed to a second scenario.
    expect(
      new Set(rows.map((row) => row.execution.boundaryInstanceId)).size
    ).toBe(rows.length)

    // An independent pass over the relations the matrix will claim, applied
    // to the rows themselves rather than to the aggregate they produce.
    for (const row of rows) {
      const origin =
        row.execution.elapsedOrigin === 'claim'
          ? row.execution.claimInstalledAt
          : row.execution.routeEnteredAt
      expect(origin).not.toBeNull()
      expect(row.elapsedMs).toBe(row.execution.settledAt - (origin ?? 0))
      expect(row.declaredBoundMs).toBe(
        bl020BoundValueMs(row.declaredBound, matrixConfig)
      )
      expect(row.elapsedMs).toBeLessThanOrEqual(row.declaredBoundMs)

      // Drains and audits are paired: a completed drain is always audited, so
      // a closed row carries one audit per drain. A row that lost its re-drain
      // to an armed deadline is short exactly the audit that drain owed, and
      // an audit without a drain to justify it is never accepted.
      const drains = row.execution.drainInvocations
      const audits = row.execution.connectionAuditInvocations
      expect(drains - audits).toBeGreaterThanOrEqual(0)
      expect(drains - audits).toBeLessThanOrEqual(1)
      if (row.outcome === 'closed') expect(audits).toBe(drains)
      if (row.preClaimSettlement !== null) {
        expect(drains).toBe(0)
        expect(audits).toBe(0)
      }

      for (const counted of BL020_PROXY_AUDIT_COUNTS) {
        expect(row.proxyAudit[counted]).toBe(0)
      }

      const confirmation = row.execution.confirmation
      if (row.outcome === 'closed') {
        expect(confirmation).not.toBeNull()
        for (const clause of BL020_CONFIRMATION_CLAUSES) {
          expect(confirmation?.[clause]).toBe(true)
        }
        for (const counted of BL020_PROXY_AUDIT_COUNTS) {
          expect(confirmation?.reobserved[counted]).toBe(0)
        }
      }

      // Every residual class is probed on every row; a closed row leaves
      // nothing behind, and a row that refused publishes what it retained
      // rather than a zero it did not observe.
      for (const residual of BL020_RESIDUAL_CLASSES) {
        expect(row.residualProbes[residual]).toBe(true)
        expect(row.residual[residual]).not.toBeNull()
        if (row.outcome === 'closed') expect(row.residual[residual]).toBe(0)
      }

      const teardown = row.teardown
      expect(teardown).not.toBeNull()
      if (teardown === null) continue
      expect(teardown.attempted).toBe(true)
      expect(teardown.independentReobservation).toBe(true)
      for (const cleared of BL020_TEARDOWN_CLASSES) {
        const probe = teardown.probes[cleared]
        expect(probe.probeCompleted).toBe(true)
        expect(probe.residual).toBe(0)
      }
    }

    // The eighteen mutations run here, against a baseline of their own, and
    // only their public-safe summary reaches the artifact. No baseline row
    // is admitted to the matrix: assembly above accepted executed rows only.
    const mutationRun = await runProjectCloseMutations()
    expect(mutationRun.declared).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(mutationRun.executed).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(mutationRun.killed).toBe(BL020_DECLARED_COUNTS.mutations)
    expect(mutationRun.survived).toBe(0)
    expect(mutationRun.baselineViolations).toEqual([])
    const mutations: ProjectCloseMutationSummary = {
      declared: mutationRun.declared,
      executed: mutationRun.executed,
      killed: mutationRun.killed,
      survived: mutationRun.survived,
      baselineRows: mutationRun.baselineRows,
      baselineViolations: [...mutationRun.baselineViolations],
      executedBaselineScenarios: [...mutationRun.executedBaselineScenarios],
      witnesses: mutationRun.executions.map((execution) => ({
        id: execution.id,
        violation: execution.declaredViolation,
        killed: execution.killed,
        witness: execution.witness,
      })),
    }

    const matrix: ProjectCloseMatrix = {
      evidenceId: 'bl-020-close-matrix',
      generatedFrom: 'execution',
      stage: 't-11-scenario-matrix',
      scenarioCount: rows.length,
      guardCount: BL020_DECLARED_COUNTS.guards,
      mutationCount: mutationRun.executed,
      boundCount: BL020_DECLARED_COUNTS.bounds,
      preClaimSettlementCount: BL020_DECLARED_COUNTS.preClaimSettlements,
      episodesDeclared: BL020_DECLARED_COUNTS.episodes,
      designatedEpisodesExecuted: 0,
      rows,
      mutations,
      aggregate: {
        rows: rows.length,
        closed: rows.filter((row) => row.outcome === 'closed').length,
        alreadyAbsent: rows.filter((row) => row.outcome === 'already-absent')
          .length,
        rejected: rows.filter((row) => row.outcome === 'rejected').length,
        executionProduced: rows.filter(
          (row) =>
            row.createdHostResources &&
            row.execution.productionPathsEntered.length > 0 &&
            row.execution.boundaryInstanceId.length > 0
        ).length,
        zeroResidualRows: rows.filter((row) =>
          Object.values(row.residual).every((value) => value === 0)
        ).length,
        confirmedRows: rows.filter((row) => row.execution.confirmation !== null)
          .length,
      },
    }
    expect(matrix.aggregate.rows).toBe(BL020_DECLARED_COUNTS.scenarios)
    expect(matrix.aggregate.executionProduced).toBe(
      BL020_DECLARED_COUNTS.scenarios
    )
    expect(matrix.aggregate.closed + matrix.aggregate.alreadyAbsent).toBe(
      matrix.aggregate.rows - matrix.aggregate.rejected
    )
    expect(matrix.aggregate.zeroResidualRows).toBeGreaterThanOrEqual(
      matrix.aggregate.closed
    )
    expect(matrix.aggregate.confirmedRows).toBeGreaterThanOrEqual(
      matrix.aggregate.closed
    )

    expect(validateProjectCloseMatrix({ matrix })).toEqual([])
    expect(
      validateCommittedProjectCloseMatrix({
        matrix,
        protectedValues: recordedHostValues(),
      })
    ).toEqual([])

    // One serialization, written to both destinations, so the disposable and
    // the retained artifact cannot drift by construction.
    const serialized = serializeProjectCloseMatrix(matrix)
    await commitArtifact(DISPOSABLE_MATRIX_PATH, serialized)
    await commitArtifact(RETAINED_MATRIX_PATH, serialized)

    const disposable = await readFile(DISPOSABLE_MATRIX_PATH)
    const retained = await readFile(RETAINED_MATRIX_PATH)
    expect(disposable.equals(retained)).toBe(true)
    expect(disposable.toString('utf8')).toBe(serialized)
    const digest = sha256(serialized)
    expect(sha256(retained.toString('utf8'))).toBe(digest)

    for (const destination of [DISPOSABLE_MATRIX_PATH, RETAINED_MATRIX_PATH]) {
      const leftovers = (await entriesOf(destination)).filter((entry) =>
        entry.endsWith('.staged')
      )
      expect(leftovers).toEqual([])
    }

    // The committed bytes and the rendered lane's artifact are scanned
    // together against every host value this run created.
    const componentArtifact = await readFile(COMPONENT_LANE_PATH, 'utf8')
    const scan = scanProtectedCloseValues({
      sources: { matrix: serialized, componentArtifact },
      protectedValues: recordedHostValues(),
    })
    expect(scan.matches).toEqual([])
    expect(scan.declaredSources).toEqual(['componentArtifact', 'matrix'])
    expect(recordedHostValues().length).toBeGreaterThan(0)

    // The evidence this backlog item inherited is untouched.
    for (const [relative, expected] of Object.entries(
      BL020_PRESERVED_EVIDENCE
    )) {
      const contents = await readFile(path.join(REPOSITORY_ROOT, relative))
      expect(sha256(contents.toString('utf8'))).toBe(expected)
    }

    if (process.env.BL020_MATRIX_REPORT === '1') {
      // eslint-disable-next-line no-console
      console.info(
        [
          'rows ' + String(matrix.aggregate.rows),
          'executionProduced ' + String(matrix.aggregate.executionProduced),
          'bytes ' + String(disposable.byteLength),
          'sha256 ' + digest,
        ].join(' :: ')
      )
    }
  }, 1_800_000)
})
