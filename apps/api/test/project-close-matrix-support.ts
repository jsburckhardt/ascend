/// <reference types="node" />
import { createClient } from '@libsql/client'
import { pathToFileURL } from 'node:url'
import { expect } from 'vitest'

import {
  BL020_CONFIRMATION_CLAUSES,
  BL020_FOREIGN_EVENT_PREFIXES,
  BL020_PROXY_AUDIT_COUNTS,
  BL020_RESIDUAL_CLASSES,
  BL020_SCENARIO_BOUNDS,
  bl020BoundValueMs,
  type Bl020ScenarioId,
  type ProjectCloseEvidenceRow,
} from '../src/project-close-evidence.js'
import type { Project } from '../src/project-persistence.js'
import type { ProjectRuntimeManagerAudit } from '../src/project-runtime-manager.js'
import { RuntimeFailure } from '../src/project-runtime-contract.js'
import {
  allocateCloseLibrary,
  allocateCloseWorld,
  allocateUnrelatedControl,
  deferred,
  entryStateOf,
  executeScenario,
  matrixConfig,
  navigateWorkbench,
  postRuntimeOperation,
  type CloseWorld,
  type HostIdentity,
  type HttpResult,
  type ScenarioExecution,
  type UnrelatedControl,
} from './project-close-fixtures.js'

/** Polls a production observation until it holds, and fails loudly if not. */
export async function until(
  what: string,
  holds: () => boolean | Promise<boolean>,
  attempts = 400
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await holds()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('BL-020 never observed ' + what)
}

/**
 * Every raw host value the close worlds of this process actually created:
 * database files, registered directories, loopback authorities, argument
 * vectors, user-data directories, and process start times.
 *
 * The committed artifact is scanned against this register rather than against
 * a heuristic, so the redaction proof is made from the values the run itself
 * produced. Each world contributes its own values as it is released, so a
 * writer that assembles many lanes scans all of them.
 */
const createdHostValues = new Set<string>()

function registerHostValues(input: {
  readonly world: CloseWorld
  readonly databasePath: string
  readonly control: UnrelatedControl
}): void {
  const authority = (port: number): readonly string[] => [
    '127.0.0.1:' + String(port),
    'http://127.0.0.1:' + String(port),
  ]
  const values: string[] = [
    input.databasePath,
    ...authority(input.world.apiPort),
    ...authority(input.control.listenerPort),
    input.control.argv.join(' '),
    input.control.startTime,
    ...[input.world.selected, input.world.peer, input.world.extra].map(
      (project) => project.canonicalPath
    ),
    ...input.world.identities.flatMap((identity) => [
      identity.processStartTime,
      identity.userDataPath,
      identity.argv.join(' '),
      ...authority(identity.port),
    ]),
  ]
  for (const value of values) if (value.length > 0) createdHostValues.add(value)
}

/** The host values every world released in this process actually created. */
export const recordedHostValues = (): readonly string[] =>
  Object.freeze([...createdHostValues])

/** The one response whose body reports the settled disposition named. */
export const responseWithDisposition =
  (disposition: string) =>
  (responses: readonly HttpResult[]): HttpResult | null =>
    responses.find(
      (response) =>
        (response.body as { disposition?: string } | undefined)?.disposition ===
        disposition
    ) ?? null

/** The error category a route reported, or `null` when it reported none. */
export const errorCategoryOf = (response: HttpResult): string | null =>
  (response.body as { error?: { category?: string } } | undefined)?.error
    ?.category ?? null

/** Opens the workbench through the stable route production publishes. */
export async function navigate(
  world: CloseWorld,
  projectId: string
): Promise<void> {
  expect((await navigateWorkbench(world, projectId)).status).toBe(200)
}

/** What a scenario plan may reach beyond the world it runs in. */
export interface ScenarioContext {
  readonly world: CloseWorld
  /** The real database file the world's library is open on. */
  readonly databasePath: string
  readonly control: UnrelatedControl
}

export type ScenarioPlan = (
  world: CloseWorld,
  context: ScenarioContext
) => Omit<ScenarioExecution, 'world'>

/**
 * Allocates one isolated world — its own SQLite library, its own unrelated
 * control process, and its own boundary over loopback — runs the scenario
 * through production paths, and releases every resource it created.
 */
export async function executeCloseScenario(
  scenario: Bl020ScenarioId,
  plan: ScenarioPlan
): Promise<ProjectCloseEvidenceRow> {
  const control = await allocateUnrelatedControl()
  const library = await allocateCloseLibrary()
  try {
    const world = await allocateCloseWorld({
      scenario,
      library: library.library,
      control,
    })
    try {
      return await executeScenario({
        world,
        ...plan(world, {
          world,
          databasePath: library.databasePath,
          control,
        }),
      })
    } finally {
      registerHostValues({
        world,
        databasePath: library.databasePath,
        control,
      })
      await world.cleanup()
    }
  } finally {
    await library.cleanup()
    await control.stop()
  }
}

/**
 * The rules every row must satisfy whatever it observed, except the admission
 * site test its writer makes in its own body. Nothing here is keyed by
 * scenario identifier: each assertion is a relation between members the
 * executed close produced.
 */
export function assertSharedRowConsistency(
  row: ProjectCloseEvidenceRow,
  admittedBySite: boolean
): void {
  expect(row.execution.elapsedOrigin).toBe(
    admittedBySite ? 'claim' : 'route-entry'
  )
  expect(row.declaredBound).toBe(BL020_SCENARIO_BOUNDS[row.scenario])
  expect(row.declaredBoundMs).toBe(
    bl020BoundValueMs(row.declaredBound, matrixConfig)
  )
  expect(row.elapsedMs).toBeGreaterThanOrEqual(0)
  expect(row.elapsedMs).toBeLessThanOrEqual(row.declaredBoundMs)
  expect(row.execution.productionPathsEntered.length).toBeGreaterThan(0)
  expect(row.execution.drainInvocations).toBeLessThanOrEqual(2)
  expect(row.execution.connectionAuditInvocations).toBeLessThanOrEqual(2)
  expect(Object.keys(row.execution.signalCallsByProject).sort()).toEqual(
    [...row.projectTokens].sort()
  )
  // The close emits only its own lifecycle vocabulary, and publishes at most
  // one closed emission — and none at all when nothing closed. A lane that
  // breaks either rule fails here rather than at matrix assembly.
  for (const event of row.emittedEvents) {
    for (const prefix of BL020_FOREIGN_EVENT_PREFIXES) {
      expect(event.startsWith(prefix), row.scenario + ' emitted ' + event).toBe(
        false
      )
    }
  }
  expect(row.projectClosedEmissions).toBeLessThanOrEqual(1)
  if (row.outcome !== 'closed') expect(row.projectClosedEmissions).toBe(0)
  if (!admittedBySite) {
    expect(row.execution.confirmation).toBeNull()
    expect(row.execution.ownershipCardinality).toBeNull()
    expect(row.execution.drainInvocations).toBe(0)
    expect(row.execution.connectionAuditInvocations).toBe(0)
  }
  if (row.outcome === 'closed') {
    const confirmation = row.execution.confirmation
    expect(confirmation).not.toBeNull()
    for (const clause of BL020_CONFIRMATION_CLAUSES)
      expect(confirmation?.[clause], row.scenario + ' clause ' + clause).toBe(
        true
      )
    for (const count of BL020_PROXY_AUDIT_COUNTS)
      expect(
        confirmation?.reobserved[count],
        row.scenario + ' reobserved ' + count
      ).toBe(0)
    for (const residualClass of BL020_RESIDUAL_CLASSES)
      expect(
        row.residual[residualClass],
        row.scenario + ' residual ' + residualClass
      ).toBe(0)
    expect(row.registrationAfter).toBeNull()
    expect(row.publicState).toBeNull()
  }
  expect(row.peerAfter.registration).toEqual(row.peerBefore.registration)
  expect(row.peerAfter.fixture).toEqual(row.peerBefore.fixture)
  expect(row.controlAfter.listenerAvailable).toBe(
    row.controlBefore.listenerAvailable
  )
  expect(row.controlAfter.processIdentity).toBe(
    row.controlBefore.processIdentity
  )
  const teardown = row.teardown
  expect(teardown, row.scenario + ' recorded a teardown').not.toBeNull()
  if (teardown === null) return
  expect(teardown.attempted).toBe(true)
  expect(teardown.independentReobservation).toBe(true)
  for (const probe of Object.values(teardown.probes)) {
    expect(probe.probeCompleted).toBe(true)
    expect(probe.residual).toBe(0)
  }
}

/** The four durable fields a refused or rejected close must never disturb. */
export interface DurableFields {
  readonly id: string
  readonly name: string
  readonly canonicalPath: string
  readonly createdAt: number
}

export const durableFields = (project: Project): DurableFields =>
  Object.freeze({
    id: project.id,
    name: project.name,
    canonicalPath: project.canonicalPath,
    createdAt: project.createdAt,
  })

/** Reads the four durable fields the persistence currently holds. */
export async function readDurableFields(
  world: CloseWorld,
  projectId: string
): Promise<DurableFields | null> {
  const project = await world.library.findById(projectId)
  return project === undefined ? null : durableFields(project)
}

/**
 * Makes the real row deletion fail in the real database, by installing a
 * refusal in the schema itself over a second connection to the same file. The
 * delivered `deleteById` runs unchanged and raises, so `commitRemoval` fails
 * the way a hostile store makes it fail. Reads stay available, which is what
 * the retained-row assertions afterwards depend on.
 */
export async function installRemovalRefusal(
  databasePath: string,
  projectId: string
): Promise<{ remove(): Promise<void> }> {
  const client = createClient({ url: pathToFileURL(databasePath).href })
  const literal = "'" + projectId.replaceAll("'", "''") + "'"
  await client.execute(
    'CREATE TRIGGER bl020_refuse_removal BEFORE DELETE ON projects ' +
      'FOR EACH ROW WHEN OLD.id = ' +
      literal +
      " BEGIN SELECT RAISE(ABORT, 'bl-020 removal refused'); END"
  )
  return {
    async remove() {
      await client.execute('DROP TRIGGER IF EXISTS bl020_refuse_removal')
      client.close()
    },
  }
}

/** Every identity the world created for a project, newest last. */
export const identitiesFor = (
  world: CloseWorld,
  projectId: string
): readonly HostIdentity[] =>
  world.identities.filter((candidate) => candidate.projectId === projectId)

/**
 * The manager's own audit of what it is still holding. The production
 * interface declares audit() optional, so a manager that cannot answer is a
 * loud scenario failure rather than a silently skipped observation.
 */
export function managerAudit(world: CloseWorld): ProjectRuntimeManagerAudit {
  const audit = world.manager.audit
  if (audit === undefined)
    throw new Error('BL-020 runtime manager under test exposes no audit()')
  return audit.call(world.manager)
}

/**
 * The newest identity still alive for a project: the generation currently
 * serving it. A project that retained an earlier identity it could not
 * confirm gone still has that older one alive, and it is never this one.
 */
export function liveIdentity(
  world: CloseWorld,
  projectId: string
): HostIdentity {
  const identity = identitiesFor(world, projectId)
    .filter((candidate) => candidate.alive)
    .at(-1)
  if (identity === undefined)
    throw new Error('BL-020 world has no live identity for ' + projectId)
  return identity
}

/**
 * The rules every row must satisfy whatever it observed. Admission is decided
 * from the frozen pre-claim settlement site alone, and never from the settled
 * category; every other relation is the shared one every matrix writer
 * applies.
 */
export function assertRowConsistency(row: ProjectCloseEvidenceRow): void {
  const admittedBySite = row.preClaimSettlement === null
  expect(row.execution.claimInstalledAt !== null).toBe(admittedBySite)
  assertSharedRowConsistency(row, admittedBySite)
}

/**
 * Brings a project to a failed entry whose reported identity is still alive,
 * through the delivered stop route: the identity refuses to leave, the stop
 * cannot confirm absence, and the manager retains the failure and the
 * ownership record it froze.
 */
export async function failThroughUnconfirmedStop(
  world: CloseWorld,
  projectId: string
): Promise<void> {
  await navigate(world, projectId)
  const identity = liveIdentity(world, projectId)
  identity.mode = 'unconfirmed'
  const stopped = await postRuntimeOperation(world, projectId, 'stop')
  expect(stopped.status).toBe(500)
  expect(errorCategoryOf(stopped)).toBe('runtime_stop_unconfirmed')
  expect(entryStateOf(world, projectId)).toBe('failed')
  expect(identity.alive).toBe(true)
}

/**
 * Drives the delivered restart into a quarantined replacement: the prior
 * generation is released and confirmed, the replacement reports ownership and
 * then a cleanup audit that cannot confirm absence, and the restart abandons
 * the phase with the replacement quarantined and its admission retained.
 *
 * `hold` suspends the replacement attempt before it reports ownership, which
 * is where the entry is `restarting` and the operation is genuinely in
 * progress. The returned settlement is the restart route's own response, left
 * unawaited so a scenario can act while the restart is still running.
 */
export async function quarantineThroughFailedRestart(
  world: CloseWorld,
  projectId: string,
  hold?: { readonly promise: Promise<void> }
): Promise<{ readonly settled: Promise<HttpResult> }> {
  await navigate(world, projectId)
  world.setLaunch(async (control) => {
    const replacement = await control.createIdentity()
    await control.probeReadiness(replacement)
    if (hold !== undefined) await hold.promise
    control.onOwned(replacement.ready)
    // The attempt cleans up after itself and reports what it actually saw:
    // the identity it created is still alive and still holding its listener.
    control.onCleanup(await replacement.observeTermination('unconfirmed'))
    // One macrotask so the abort the cleanup raised is the settlement the
    // restart observes, rather than this rejection racing it.
    await new Promise((resolve) => setTimeout(resolve, 0))
    throw new RuntimeFailure('spawn-error')
  })
  return { settled: postRuntimeOperation(world, projectId, 'restart') }
}

/**
 * Completes a quarantining restart: the route reported a failed replacement,
 * the manager retains exactly one quarantined record and its admission, and
 * the identity the quarantine holds leaves when the close reclaims it.
 */
export async function settleQuarantinedRestart(
  world: CloseWorld,
  projectId: string,
  restarted: HttpResult
): Promise<void> {
  expect(restarted.status).toBe(500)
  expect(errorCategoryOf(restarted)).toBe('runtime_replacement_failed')
  await until(
    'the replacement to be quarantined and its admission retained',
    () =>
      (managerAudit(world).quarantinedOwnershipRecords ?? 0) === 1 &&
      (managerAudit(world).pendingAdmissions ?? 0) === 1
  )
  expect(entryStateOf(world, projectId)).toBe('failed')
  const quarantined = identitiesFor(world, projectId).at(-1)
  expect(quarantined?.alive).toBe(true)
  if (quarantined !== undefined) quarantined.mode = 'graceful'
  world.setLaunch(async (control) => {
    const identity = await control.createIdentity()
    await control.probeReadiness(identity)
    control.onOwned(identity.ready)
    return identity.ready
  })
}

/** The nine admission rejections a close can settle on, with their route row. */
export const REJECTION_ROUTE_RESULT = Object.freeze({
  'start-in-progress': [409, 'runtime_start_in_progress'],
  'stop-in-progress': [409, 'runtime_stop_in_progress'],
  'restart-in-progress': [409, 'runtime_restart_in_progress'],
  'reconcile-in-progress': [409, 'runtime_reconcile_in_progress'],
  'reconcile-unresolved': [409, 'runtime_reconcile_unresolved'],
  'release-unconfirmed': [500, 'runtime_release_unconfirmed'],
  'ownership-cardinality-exceeded': [500, 'runtime_close_ownership_unresolved'],
  'removal-failed': [500, 'project_close_failed'],
  'manager-shutdown': [503, 'runtime_manager_shutdown'],
} as const)

export type RejectionCategory = keyof typeof REJECTION_ROUTE_RESULT

export const REJECTION_ORDER = Object.freeze(
  Object.keys(REJECTION_ROUTE_RESULT) as RejectionCategory[]
)

/**
 * Arranges the exact state each admission rejection requires, using delivered
 * lifecycle operations only, and returns the holds the subcase must release
 * once the close has settled.
 */
export async function arrangeRejection(
  world: CloseWorld,
  context: { readonly databasePath: string },
  category: RejectionCategory
): Promise<{ release: () => Promise<void> }> {
  const nothing = { release: async () => undefined }
  switch (category) {
    case 'manager-shutdown': {
      await navigate(world, world.selected.id)
      await world.manager.shutdown()
      return nothing
    }
    case 'reconcile-in-progress': {
      const gate = deferred<void>()
      world.reconcilePlan.projects = [world.selected]
      world.reconcilePlan.gate = gate
      await world.reboot()
      await until(
        'a reconciling entry for the selected project',
        () => entryStateOf(world, world.selected.id) === 'reconciling'
      )
      return {
        release: async () => {
          gate.resolve()
          world.reconcilePlan.gate = null
          await until(
            'the reconciliation to settle after its scan was released',
            () => entryStateOf(world, world.selected.id) !== 'reconciling'
          )
        },
      }
    }
    case 'reconcile-unresolved': {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      identity.mode = 'unconfirmed'
      await identity.stopListener()
      identity.settleExit({ code: 0, signal: null, addressInUse: false })
      await until(
        'the manager recording the early exit it observed',
        () => entryStateOf(world, world.selected.id) === 'failed'
      )
      world.reconcilePlan.projects = [world.selected]
      world.reconcilePlan.candidates = [identity]
      await world.reboot()
      await until(
        'the unresolved reconciliation failure',
        () => entryStateOf(world, world.selected.id) === 'failed'
      )
      return nothing
    }
    case 'start-in-progress': {
      const gate = deferred<void>()
      world.setLaunch(async (control) => {
        const identity = await control.createIdentity()
        await gate.promise
        await control.probeReadiness(identity)
        control.onOwned(identity.ready)
        return identity.ready
      })
      const navigation = navigateWorkbench(world, world.selected.id)
      await until(
        'the selected project to be starting',
        () => entryStateOf(world, world.selected.id) === 'starting'
      )
      return {
        release: async () => {
          gate.resolve()
          expect((await navigation).status).toBe(200)
        },
      }
    }
    case 'stop-in-progress': {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      const hold = deferred<void>()
      identity.releaseHold = hold
      const stopping = postRuntimeOperation(world, world.selected.id, 'stop')
      await until(
        'the selected project to be stopping',
        () => entryStateOf(world, world.selected.id) === 'stopping'
      )
      return {
        release: async () => {
          hold.resolve()
          identity.releaseHold = null
          expect((await stopping).status).toBe(200)
        },
      }
    }
    case 'restart-in-progress': {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      const hold = deferred<void>()
      identity.releaseHold = hold
      const restarting = postRuntimeOperation(
        world,
        world.selected.id,
        'restart'
      )
      await until(
        'the selected project to be restarting',
        () => entryStateOf(world, world.selected.id) === 'restarting'
      )
      return {
        release: async () => {
          hold.resolve()
          identity.releaseHold = null
          expect((await restarting).status).toBe(200)
        },
      }
    }
    case 'release-unconfirmed': {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'unconfirmed'
      return nothing
    }
    case 'removal-failed': {
      await navigate(world, world.selected.id)
      const refusal = await installRemovalRefusal(
        context.databasePath,
        world.selected.id
      )
      return { release: () => refusal.remove() }
    }
    case 'ownership-cardinality-exceeded': {
      // Five owned generations, each frozen by a stop that could not confirm
      // the identity had left, is one more than the delivered sweep cap.
      for (let round = 0; round < 5; round += 1)
        await failThroughUnconfirmedStop(world, world.selected.id)
      expect(entryStateOf(world, world.selected.id)).toBe('failed')
      return nothing
    }
  }
}
