/// <reference types="node" />
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { expect } from 'vitest'

import {
  BL020_COMPONENT_LANE_SCENARIOS,
  type Bl020ScenarioId,
  type CloseComponentWitness,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
import {
  COMPONENT_LANE_PATH,
  REPOSITORY_ROOT,
  deferred,
  deleteProject,
  entryStateOf,
  listProjectsOverHttp,
  navigateWorkbench,
  runtimeStatesOverHttp,
  type CloseWorld,
  type HttpResult,
} from './project-close-fixtures.js'
import {
  arrangeRejection,
  assertRowConsistency,
  errorCategoryOf,
  executeCloseScenario,
  failThroughUnconfirmedStop,
  liveIdentity,
  managerAudit,
  navigate,
  readDurableFields,
  responseWithDisposition,
  until,
  type DurableFields,
} from './project-close-matrix-support.js'

/**
 * The ten catalog scenarios whose rendered half the web component lane owns.
 *
 * A committed row for one of them is **not** the component lane's row and is
 * never a re-keyed copy of an unrelated API row. Each one executes its own
 * close world here — its own SQLite library, manager, proxy, route, real host
 * identities, and teardown — so the row carries the resource, registration,
 * peer, control, residual, and teardown observations that execution produced,
 * and joins the *exact* receipt of the rendered execution that carries the
 * same scenario identifier.
 */
export const WEB_MATRIX_SCENARIOS = BL020_COMPONENT_LANE_SCENARIOS

/** One executed companion scenario: its row, what it took, what it observed. */
export interface WebScenarioResult {
  readonly scenario: Bl020ScenarioId
  readonly row: ProjectCloseEvidenceRow
  readonly durationMs: number
  readonly observations: readonly string[]
}

export interface WebMatrixExecution {
  readonly rows: readonly ProjectCloseEvidenceRow[]
  readonly results: readonly WebScenarioResult[]
  readonly artifact: ComponentLaneArtifact
  readonly durationMs: number
}

// ---------------------------------------------------------------------------
// The component lane's committed artifact, read as a consumer
// ---------------------------------------------------------------------------

/**
 * The shape this lane consumes. The web lane owns the artifact's contract and
 * validates it in full before committing it; what is asserted here is what a
 * *consumer* must be able to rely on before joining a receipt into committed
 * API evidence.
 */
export interface ComponentLaneRow {
  readonly scenario: string
  readonly executionId: string
  readonly cards: number
  readonly productionPathsEntered: readonly string[]
  readonly admissions: readonly { readonly renderedPresent: boolean }[]
  readonly dialog: {
    readonly openings: number
    readonly maxConcurrent: number
    readonly refusedPeerOpenings: number
  }
  readonly pending: readonly unknown[]
  readonly focus: readonly unknown[]
  readonly announcements: readonly { readonly namePrefixed: boolean }[]
  readonly calls: {
    readonly closeRequests: number
    readonly listRequests: number
    readonly listReplacements: number
    readonly runtimeStateRequests: number
    readonly transportInvocations: number
    readonly thenableTransportReturns: number
  }
  readonly assertions: number
  readonly outcome: string
}

export interface ComponentLaneArtifact {
  readonly evidenceId: string
  readonly generatedFrom: string
  readonly stage: string
  readonly runId: string
  readonly scenarioCount: number
  readonly rows: readonly ComponentLaneRow[]
  readonly aggregate: {
    readonly rows: number
    readonly executionProduced: number
    readonly allPassed: boolean
  }
}

/**
 * The sources the rendered lane executes. The artifact must be newer than
 * every one of them, so a receipt can never be joined from a run that predates
 * the code it attests.
 */
const COMPONENT_LANE_SOURCES: readonly string[] = Object.freeze([
  'apps/web/src/project-close-component-matrix.test.tsx',
  'apps/web/src/project-close-component-evidence.ts',
  'apps/web/src/App.tsx',
  'apps/web/src/use-project-home.ts',
  'apps/web/src/projects.ts',
  'apps/web/src/runtime-state.ts',
])

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

/**
 * Reads the artifact the component lane committed, proves it is a freshly
 * executed one, and refuses anything a consumer could not join truthfully.
 * Every failure is loud: a missing, stale, partial, or failed component run is
 * a blocked matrix, never a silently omitted witness.
 */
export async function readComponentLaneArtifact(): Promise<ComponentLaneArtifact> {
  const artifactStat = await stat(COMPONENT_LANE_PATH).catch(() => null)
  if (artifactStat === null)
    throw new Error(
      'BL-020 component lane artifact is absent: run the web component ' +
        'matrix before assembling the close matrix'
    )
  for (const source of COMPONENT_LANE_SOURCES) {
    const sourceStat = await stat(path.join(REPOSITORY_ROOT, source))
    if (sourceStat.mtimeMs > artifactStat.mtimeMs)
      throw new Error(
        'BL-020 component lane artifact is stale against ' +
          source +
          ': re-run the web component matrix'
      )
  }

  const artifact = JSON.parse(
    await readFile(COMPONENT_LANE_PATH, 'utf8')
  ) as ComponentLaneArtifact
  expect(artifact.evidenceId).toBe('bl-020-close-component-matrix')
  expect(artifact.generatedFrom).toBe('execution')
  expect(artifact.stage).toBe('t-7-t-8-component-lane')
  expect(typeof artifact.runId).toBe('string')
  expect(artifact.runId.length).toBeGreaterThan(0)
  expect(artifact.scenarioCount).toBe(WEB_MATRIX_SCENARIOS.length)
  expect(artifact.rows.map((row) => row.scenario)).toEqual([
    ...WEB_MATRIX_SCENARIOS,
  ])
  expect(new Set(artifact.rows.map((row) => row.executionId)).size).toBe(
    artifact.rows.length
  )
  expect(artifact.aggregate).toEqual({
    rows: WEB_MATRIX_SCENARIOS.length,
    executionProduced: WEB_MATRIX_SCENARIOS.length,
    allPassed: true,
  })
  for (const row of artifact.rows) {
    expect(row.executionId).toContain(artifact.runId)
    expect(row.executionId).toContain(row.scenario)
    expect(row.outcome).toBe('passed')
    expect(isCount(row.assertions) && row.assertions > 0).toBe(true)
    expect(row.admissions.length).toBeGreaterThan(0)
    expect(row.focus.length).toBeGreaterThan(0)
    expect(row.productionPathsEntered.length).toBeGreaterThan(0)
    expect(new Set(row.productionPathsEntered).size).toBe(
      row.productionPathsEntered.length
    )
    expect(row.calls.thenableTransportReturns).toBe(
      row.calls.transportInvocations
    )
  }
  return artifact
}

/** The receipt of the rendered execution that carries this scenario. */
export function componentWitnessFor(
  artifact: ComponentLaneArtifact,
  scenario: Bl020ScenarioId
): CloseComponentWitness {
  const source = artifact.rows.find((row) => row.scenario === scenario)
  if (source === undefined)
    throw new Error(
      'BL-020 component lane produced no execution for ' + scenario
    )
  return Object.freeze({
    artifact: 'bl-020-close-component-matrix',
    runId: artifact.runId,
    executionId: source.executionId,
    scenario,
    outcome: 'passed',
    allPassed: artifact.aggregate.allPassed,
    assertions: source.assertions,
    cards: source.cards,
    admissions: source.admissions.length,
    renderedAdmissions: source.admissions.filter(
      (admission) => admission.renderedPresent
    ).length,
    productionPathsEntered: Object.freeze([...source.productionPathsEntered]),
    dialogOpenings: source.dialog.openings,
    dialogMaxConcurrent: source.dialog.maxConcurrent,
    refusedPeerOpenings: source.dialog.refusedPeerOpenings,
    pendingObservations: source.pending.length,
    focusObservations: source.focus.length,
    announcements: source.announcements.length,
    namePrefixedAnnouncements: source.announcements.filter(
      (announcement) => announcement.namePrefixed
    ).length,
    closeRequests: source.calls.closeRequests,
    listRequests: source.calls.listRequests,
    listReplacements: source.calls.listReplacements,
    runtimeStateRequests: source.calls.runtimeStateRequests,
    transportInvocations: source.calls.transportInvocations,
    thenableTransportReturns: source.calls.thenableTransportReturns,
  })
}

/**
 * Asserts the joined receipt is the exact one the component artifact holds for
 * this row's scenario, that it is a distinct passing execution, and that the
 * lane it came from passed as a whole.
 */
function assertJoinedReceipt(
  row: ProjectCloseEvidenceRow,
  artifact: ComponentLaneArtifact
): void {
  const witness = row.componentWitness
  expect(witness, row.scenario + ' joined no component receipt').not.toBeNull()
  if (witness === null) return
  const source = artifact.rows.find(
    (candidate) => candidate.scenario === row.scenario
  )
  expect(source).toBeDefined()
  if (source === undefined) return
  expect(witness.scenario).toBe(row.scenario)
  expect(witness.runId).toBe(artifact.runId)
  expect(witness.executionId).toBe(source.executionId)
  expect(witness.executionId).toContain(artifact.runId)
  expect(witness.outcome).toBe('passed')
  expect(witness.allPassed).toBe(true)
  expect(witness.assertions).toBe(source.assertions)
  expect(witness.admissions).toBe(source.admissions.length)
  expect(witness.focusObservations).toBe(source.focus.length)
  expect(witness.announcements).toBe(source.announcements.length)
  expect(witness.productionPathsEntered).toEqual([
    ...source.productionPathsEntered,
  ])
  expect(witness.closeRequests).toBe(source.calls.closeRequests)
  expect(witness.listRequests).toBe(source.calls.listRequests)
  expect(witness.runtimeStateRequests).toBe(source.calls.runtimeStateRequests)
  expect(witness.transportInvocations).toBe(source.calls.transportInvocations)
  // The API half of the row is this row's own execution, never the component
  // lane's: it entered production close paths and created host resources.
  expect(row.execution.productionPathsEntered.length).toBeGreaterThan(0)
  expect(row.createdHostResources).toBe(true)
}

// ---------------------------------------------------------------------------
// The ten companion executions
// ---------------------------------------------------------------------------

/** The projects the published list route currently carries. */
const listedProjectIds = async (
  world: CloseWorld
): Promise<readonly string[]> => {
  const response = await listProjectsOverHttp(world)
  expect(response.status).toBe(200)
  const body = response.body as { projects?: { id: string }[] }
  return (body.projects ?? []).map((project) => project.id)
}

/** S-32: the close a confirmed dialog transmits, from a `Running` card. */
async function runS32(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = { entryBefore: null as string | null, listedAfter: 0 }
  const row = await executeCloseScenario('S-32', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      observed.entryBefore = entryStateOf(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.listedAfter = (await listedProjectIds(world)).filter(
        (id) => id === world.selected.id
      ).length
    },
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(observed.entryBefore).toBe('running')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.projectClosedEmissions).toBe(1)
  expect(observed.listedAfter).toBe(0)
  note(
    'the transmitted close of a running card settled ' +
      String(row.routeStatus) +
      ' and left the card unlisted'
  )
  return row
}

/** S-33: the same transmission from a card whose runtime is `Failed`. */
async function runS33(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    entryBefore: null as string | null,
    publicBefore: null as string | null,
    frozenOwnership: -1,
  }
  const row = await executeCloseScenario('S-33', (world) => ({
    arrangeSelected: async () => {
      // A truthful `Failed` card: a stop whose audit could not confirm the
      // identity had left, which retains the entry and its ownership record.
      await failThroughUnconfirmedStop(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'graceful'
      observed.entryBefore = entryStateOf(world, world.selected.id)
      observed.publicBefore =
        (await runtimeStatesOverHttp(world))[world.selected.id]?.state ?? null
      observed.frozenOwnership = managerAudit(world).ownershipRecords
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(observed.entryBefore).toBe('failed')
  expect(observed.publicBefore).toBe('Failed')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.ownershipCardinality?.frozen).toBe(1)
  note(
    'the failed card closed from its retained entry, published ' +
      String(observed.publicBefore) +
      ' before the close and removed after it'
  )
  return row
}

/** S-34: a dialog dismissed before transmission issues no request at all. */
async function runS34(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    invocationsAfterDismissal: -1,
    durableBeforeDismissal: null as DurableFields | null,
    durableAfterDismissal: null as DurableFields | null,
  }
  const row = await executeCloseScenario('S-34', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      observed.durableBeforeDismissal = await readDurableFields(
        world,
        world.selected.id
      )
      // The dismissal window: the card was opened and closed again without a
      // transmission, so the boundary saw no close at all and the registration
      // is exactly as it was.
      observed.invocationsAfterDismissal = world.closeInvocations.length
      observed.durableAfterDismissal = await readDurableFields(
        world,
        world.selected.id
      )
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  // Nothing reached the boundary while the dialog was open, and the project
  // was byte-identical across that window.
  expect(observed.invocationsAfterDismissal).toBe(0)
  expect(observed.durableAfterDismissal).toEqual(
    observed.durableBeforeDismissal
  )
  expect(witness.closeRequests).toBe(0)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  note(
    'the dismissed dialog transmitted nothing — ' +
      String(witness.closeRequests) +
      ' rendered close requests and ' +
      String(observed.invocationsAfterDismissal) +
      ' boundary invocations — and the later transmission settled ' +
      String(row.routeStatus)
  )
  return row
}

/** S-35: a peer stays reachable and truthfully published during a close. */
async function runS35(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    peerRouteDuringClose: 0,
    peerStateDuringClose: null as string | null,
    subjectStateDuringClose: null as string | null,
  }
  const row = await executeCloseScenario('S-35', (world) => {
    const hold = deferred<void>()
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        // The close is suspended inside its own release, which is the window
        // in which the peer's controls have to stay usable.
        liveIdentity(world, world.selected.id).releaseHold = hold
      },
      act: async () => {
        const settled = deleteProject(world, world.selected.id)
        await until(
          'the close entering its release',
          () => world.ledger.calls.terminate >= 1
        )
        observed.peerRouteDuringClose = (
          await navigateWorkbench(world, world.peer.id)
        ).status
        const published = await runtimeStatesOverHttp(world)
        observed.peerStateDuringClose = published[world.peer.id]?.state ?? null
        observed.subjectStateDuringClose =
          published[world.selected.id]?.state ?? null
        hold.resolve()
        liveIdentity(world, world.selected.id).releaseHold = null
        return [await settled]
      },
      componentWitness: witness,
    }
  })
  assertRowConsistency(row)
  // The peer served its own workbench and published its own state while the
  // subject's close was in flight.
  expect(observed.peerRouteDuringClose).toBe(200)
  expect(observed.peerStateDuringClose).toBe('Running')
  expect(observed.subjectStateDuringClose).toBe('Running')
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.signalCallsByProject[row.projectTokens[1]!]).toBe(0)
  note(
    'the peer answered ' +
      String(observed.peerRouteDuringClose) +
      ' and published ' +
      String(observed.peerStateDuringClose) +
      " while the subject's close was in flight, and received no signal"
  )
  return row
}

/** S-36: what the boundary admits, before and after the same close. */
async function runS36(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    admittedBefore: 0,
    refusedAfter: 0,
    refusedCategory: null as string | null,
  }
  const row = await executeCloseScenario('S-36', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => {
      const admitted = await deleteProject(world, world.selected.id)
      observed.admittedBefore = admitted.status
      return [admitted]
    },
    settle: async () => {
      // The rendered equivalence is `disabled === !admits(action, card)`; the
      // boundary's own half is that the same request is no longer admitted
      // once the card is gone.
      const refused = await deleteProject(world, world.selected.id)
      observed.refusedAfter = refused.status
      observed.refusedCategory = errorCategoryOf(refused)
    },
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(observed.admittedBefore).toBe(200)
  expect(observed.refusedAfter).toBe(404)
  expect(observed.refusedCategory).toBe('project_not_found')
  expect(row.outcome).toBe('closed')
  note(
    'the boundary admitted the close at ' +
      String(observed.admittedBefore) +
      ' and refused the same request afterwards at ' +
      String(observed.refusedAfter) +
      ' ' +
      String(observed.refusedCategory)
  )
  return row
}

/** S-37: a list request in flight across the settlement of a close. */
async function runS37(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    inFlightListStatus: 0,
    reissuedCarriesClosed: true,
    reissuedCarriesPeer: false,
  }
  const row = await executeCloseScenario('S-37', (world) => {
    let inFlight: Promise<HttpResult> | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
      },
      act: async () => {
        // The list is issued first and settles across the close, exactly as a
        // response stamped before the settlement does in the rendered lane.
        inFlight = listProjectsOverHttp(world)
        return [await deleteProject(world, world.selected.id)]
      },
      settle: async () => {
        observed.inFlightListStatus = (
          await (inFlight as Promise<HttpResult>)
        ).status
        // The re-issued observation is the authoritative one, and the closed
        // card can never re-appear in it.
        const reissued = await listedProjectIds(world)
        observed.reissuedCarriesClosed = reissued.includes(world.selected.id)
        observed.reissuedCarriesPeer = reissued.includes(world.peer.id)
      },
      componentWitness: witness,
    }
  })
  assertRowConsistency(row)
  expect(observed.inFlightListStatus).toBe(200)
  expect(observed.reissuedCarriesClosed).toBe(false)
  expect(observed.reissuedCarriesPeer).toBe(true)
  expect(row.outcome).toBe('closed')
  expect(row.projectClosedEmissions).toBe(1)
  note(
    'the list request in flight across the settlement answered ' +
      String(observed.inFlightListStatus) +
      ' and the re-issued observation carried the peer without the closed card'
  )
  return row
}

/** S-65: the confirmed absence an unknown outcome resolves to. */
async function runS65(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    listedAfter: true,
    publishedAfter: null as string | null,
    repeatStatus: 0,
    repeatCategory: null as string | null,
  }
  const row = await executeCloseScenario('S-65', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      // Both authoritative observations the refresh re-issues, read from the
      // routes that publish them: the card is absent from both.
      observed.listedAfter = (await listedProjectIds(world)).includes(
        world.selected.id
      )
      observed.publishedAfter =
        (await runtimeStatesOverHttp(world))[world.selected.id]?.state ?? null
      const repeat = await deleteProject(world, world.selected.id)
      observed.repeatStatus = repeat.status
      observed.repeatCategory = errorCategoryOf(repeat)
    },
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('closed')
  expect(observed.listedAfter).toBe(false)
  expect(observed.publishedAfter).toBeNull()
  expect(observed.repeatStatus).toBe(404)
  expect(observed.repeatCategory).toBe('project_not_found')
  note(
    'the refresh resolved to a confirmed absence: unlisted, unpublished, and ' +
      'answered ' +
      String(observed.repeatStatus) +
      ' ' +
      String(observed.repeatCategory) +
      ' on repeat'
  )
  return row
}

/** S-66: the retained registration an unknown outcome resolves to. */
async function runS66(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    listedAfter: false,
    durableBefore: null as DurableFields | null,
    durableAfter: null as DurableFields | null,
  }
  const row = await executeCloseScenario('S-66', (world, context) => ({
    arrangeSelected: async () => {
      // A release the audit cannot confirm: the registration is retained and
      // the card keeps a truthful public state.
      await arrangeRejection(world, context, 'release-unconfirmed')
      observed.durableBefore = await readDurableFields(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      observed.listedAfter = (await listedProjectIds(world)).includes(
        world.selected.id
      )
      observed.durableAfter = await readDurableFields(world, world.selected.id)
    },
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(row.routeStatus).toBe(500)
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('close-release-unconfirmed')
  expect(row.registrationAfter).not.toBeNull()
  expect(observed.listedAfter).toBe(true)
  expect(observed.durableAfter).toEqual(observed.durableBefore)
  expect(row.projectClosedEmissions).toBe(0)
  note(
    'the unknown outcome resolved to a retained registration published ' +
      String(row.publicState) +
      '/' +
      String(row.failureClassification) +
      ' with four unchanged durable fields and no removal'
  )
  return row
}

/** S-72: one close claim for one card, with the peer left operable. */
async function runS72(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    arrivals: 0,
    admittedArrivals: 0,
    peerRouteDuringClose: 0,
  }
  const row = await executeCloseScenario('S-72', (world) => {
    const hold = deferred<void>()
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        liveIdentity(world, world.selected.id).releaseHold = hold
      },
      act: async () => {
        const first = deleteProject(world, world.selected.id)
        await until(
          'the first close entering its release',
          () => world.ledger.calls.terminate >= 1
        )
        // A second arrival for the same card while the claim is held: the
        // boundary's own exclusivity, mirroring the single dialog.
        const second = deleteProject(world, world.selected.id)
        await until(
          'both arrivals entering the close service',
          () => world.closeInvocations.length === 2
        )
        observed.peerRouteDuringClose = (
          await navigateWorkbench(world, world.peer.id)
        ).status
        hold.resolve()
        liveIdentity(world, world.selected.id).releaseHold = null
        const responses = await Promise.all([first, second])
        observed.arrivals = responses.length
        observed.admittedArrivals = responses.filter(
          (response) => response.status === 200
        ).length
        return responses
      },
      selectResponse: responseWithDisposition('closed'),
      componentWitness: witness,
    }
  })
  assertRowConsistency(row)
  expect(observed.arrivals).toBe(2)
  // One close, one release, one removal, one emission: the second arrival
  // joined the claim rather than starting a second close.
  expect(observed.admittedArrivals).toBe(1)
  expect(observed.peerRouteDuringClose).toBe(200)
  expect(row.outcome).toBe('closed')
  expect(row.execution.primitiveCalls.terminate).toBe(1)
  expect(row.projectClosedEmissions).toBe(1)
  expect(row.execution.signalCallsByProject[row.projectTokens[1]!]).toBe(0)
  note(
    'two arrivals for one card produced one release and one emission while ' +
      'the peer answered ' +
      String(observed.peerRouteDuringClose)
  )
  return row
}

/** S-73: rapid duplicates for one card, excluded at the boundary. */
async function runS73(
  note: (text: string) => void,
  witness: CloseComponentWitness
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    statuses: [] as number[],
    retryStatus: 0,
    retryCategory: null as string | null,
  }
  const row = await executeCloseScenario('S-73', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => {
      // Two rapid activations of the same card, issued without waiting.
      const responses = await Promise.all([
        deleteProject(world, world.selected.id),
        deleteProject(world, world.selected.id),
      ])
      observed.statuses = responses.map((response) => response.status)
      return responses
    },
    settle: async () => {
      // The retry that races the settled transmission is refused too.
      const retried = await deleteProject(world, world.selected.id)
      observed.retryStatus = retried.status
      observed.retryCategory = errorCategoryOf(retried)
    },
    selectResponse: responseWithDisposition('closed'),
    componentWitness: witness,
  }))
  assertRowConsistency(row)
  expect(observed.statuses.filter((status) => status === 200)).toHaveLength(1)
  expect(observed.retryStatus).toBe(404)
  expect(observed.retryCategory).toBe('project_not_found')
  expect(row.outcome).toBe('closed')
  expect(row.execution.primitiveCalls.terminate).toBe(1)
  expect(row.projectClosedEmissions).toBe(1)
  note(
    'two rapid activations produced statuses ' +
      observed.statuses.join('/') +
      ' with one release and one emission, and the racing retry answered ' +
      String(observed.retryStatus)
  )
  return row
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let lastExecution: WebMatrixExecution | null = null

/**
 * Executes the ten companion closes in the plan's order and joins each one to
 * the rendered receipt of the same scenario. The component artifact is read
 * once, before any companion runs, so a missing or stale rendered lane blocks
 * the whole set rather than being discovered halfway through.
 */
export async function runWebMatrix(): Promise<WebMatrixExecution> {
  const artifact = await readComponentLaneArtifact()
  const results: WebScenarioResult[] = []
  const startedAt = Date.now()

  const execute = async (
    scenario: Bl020ScenarioId,
    run: (
      note: (text: string) => void,
      witness: CloseComponentWitness
    ) => Promise<ProjectCloseEvidenceRow>
  ): Promise<void> => {
    const observations: string[] = []
    const enteredAt = Date.now()
    if (process.env.BL020_WEB_REPORT === '1')
      process.stderr.write('[web] ' + scenario + ' start\n')
    const row = await run(
      (text) => observations.push(text),
      componentWitnessFor(artifact, scenario)
    )
    expect(row.scenario).toBe(scenario)
    assertJoinedReceipt(row, artifact)
    results.push({
      scenario,
      row,
      durationMs: Date.now() - enteredAt,
      observations: Object.freeze([...observations]),
    })
  }

  await execute('S-32', runS32)
  await execute('S-33', runS33)
  await execute('S-34', runS34)
  await execute('S-35', runS35)
  await execute('S-36', runS36)
  await execute('S-37', runS37)
  await execute('S-65', runS65)
  await execute('S-66', runS66)
  await execute('S-72', runS72)
  await execute('S-73', runS73)

  const rows = results.map((result) => result.row)
  expect(rows.map((row) => row.scenario)).toEqual([...WEB_MATRIX_SCENARIOS])
  expect(new Set(rows.map((row) => row.executionId)).size).toBe(rows.length)
  const execution: WebMatrixExecution = Object.freeze({
    rows: Object.freeze(rows),
    results: Object.freeze(results),
    artifact,
    durationMs: Date.now() - startedAt,
  })
  lastExecution = execution
  return execution
}

/** The ten companion rows, in the plan's order. */
export async function runWebMatrixRows(): Promise<
  readonly ProjectCloseEvidenceRow[]
> {
  return (await runWebMatrix()).rows
}

/** The most recent companion execution in this process. */
export const lastWebMatrixExecution = (): WebMatrixExecution | null =>
  lastExecution
