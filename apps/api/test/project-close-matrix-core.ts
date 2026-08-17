/// <reference types="node" />
import { expect } from 'vitest'

import {
  PUBLIC_RUNTIME_STATES,
  RuntimeFailure,
  deriveProjectOwnerToken,
} from '../src/project-runtime-contract.js'
import type { ProjectCloseEvidenceRow } from '../src/project-close-evidence.js'
import {
  deferred,
  deleteProject,
  fixtureManifestEntries,
  navigateWorkbench,
  openHeldWorkbenchRequest,
  openWorkbenchWebSocket,
  performRequest,
  proxyAuditFor,
  runtimeStatesOverHttp,
  type CloseWorld,
  type FixtureManifestEntry,
  type HeldRequest,
  type HeldWebSocket,
  type HostIdentity,
  type HttpResult,
} from './project-close-fixtures.js'
import {
  durableFields,
  executeCloseScenario,
  identitiesFor,
  installRemovalRefusal,
  liveIdentity,
  managerAudit,
  responseWithDisposition,
  until,
  type DurableFields,
} from './project-close-matrix-support.js'

/**
 * The twenty-nine scenarios this module executes, in the plan's order. Each
 * one runs in its own world, against the production library, manager, proxy,
 * and route over loopback, and each row is assembled from what that execution
 * produced.
 */
export const CORE_MATRIX_SCENARIOS = Object.freeze([
  'S-3',
  'S-4',
  'S-5',
  'S-6',
  'S-7',
  'S-8',
  'S-9',
  'S-10',
  'S-11',
  'S-12',
  'S-13',
  'S-14',
  'S-15',
  'S-16',
  'S-17',
  'S-18',
  'S-19',
  'S-20',
  'S-21',
  'S-22',
  'S-23',
  'S-24',
  'S-25',
  'S-26',
  'S-27',
  'S-28',
  'S-29',
  'S-30',
  'S-31',
] as const)

export type CoreMatrixScenarioId = (typeof CORE_MATRIX_SCENARIOS)[number]

/** One executed scenario: its row, what it took, and what it observed. */
export interface CoreScenarioResult {
  readonly scenario: CoreMatrixScenarioId
  readonly row: ProjectCloseEvidenceRow
  readonly durationMs: number
  readonly observations: readonly string[]
}

export interface CoreMatrixExecution {
  readonly rows: readonly ProjectCloseEvidenceRow[]
  readonly results: readonly CoreScenarioResult[]
  readonly durationMs: number
}

// ---------------------------------------------------------------------------
// Shared observation helpers
// ---------------------------------------------------------------------------

const postRuntime = (
  world: CloseWorld,
  projectId: string,
  operation: 'stop' | 'restart'
): Promise<HttpResult> =>
  performRequest(
    world.apiPort,
    '/api/projects/' + encodeURIComponent(projectId) + '/runtime/' + operation,
    { method: 'POST' }
  )

const navigate = async (
  world: CloseWorld,
  projectId: string
): Promise<void> => {
  expect((await navigateWorkbench(world, projectId)).status).toBe(200)
}

const entryStateOf = (world: CloseWorld, projectId: string): string | null =>
  world.manager.inspectEntries().find((entry) => entry.projectId === projectId)
    ?.state ?? null

interface TreePair {
  readonly selected: readonly FixtureManifestEntry[]
  readonly peer: readonly FixtureManifestEntry[]
}

const observeTrees = async (world: CloseWorld): Promise<TreePair> => ({
  selected: await fixtureManifestEntries(world.selected.canonicalPath),
  peer: await fixtureManifestEntries(world.peer.canonicalPath),
})

/**
 * Compares two walks of the same tree attribute by attribute: membership,
 * content digest, link-target digest, mode, and modification time. Every
 * comparison is between two real walks of real fixture files.
 */
function expectTreeUnchanged(
  before: readonly FixtureManifestEntry[],
  after: readonly FixtureManifestEntry[]
): void {
  expect(before.length).toBeGreaterThan(0)
  expect(after.map((entry) => entry.relativePath)).toEqual(
    before.map((entry) => entry.relativePath)
  )
  expect(after.map((entry) => entry.contentDigest)).toEqual(
    before.map((entry) => entry.contentDigest)
  )
  expect(after.map((entry) => entry.linkTargetDigest)).toEqual(
    before.map((entry) => entry.linkTargetDigest)
  )
  expect(after.map((entry) => entry.mode)).toEqual(
    before.map((entry) => entry.mode)
  )
  expect(after.map((entry) => entry.mtimeMs)).toEqual(
    before.map((entry) => entry.mtimeMs)
  )
  expect(before.some((entry) => entry.kind === 'link')).toBe(true)
  expect(before.some((entry) => entry.kind === 'file')).toBe(true)
  expect(before.some((entry) => entry.kind === 'dir')).toBe(true)
}

const expectTreesUnchanged = (before: TreePair, after: TreePair): void => {
  expectTreeUnchanged(before.selected, after.selected)
  expectTreeUnchanged(before.peer, after.peer)
}

/**
 * Brings a project to a failed entry whose reported identity is still alive,
 * through the delivered stop route: the identity refuses to leave, the stop
 * cannot confirm absence, and the manager retains the failure and the
 * ownership record it froze.
 */
async function failThroughUnconfirmedStop(
  world: CloseWorld,
  projectId: string
): Promise<void> {
  await navigate(world, projectId)
  const identity = liveIdentity(world, projectId)
  identity.mode = 'unconfirmed'
  const stopped = await postRuntime(world, projectId, 'stop')
  expect(stopped.status).toBe(500)
  expect(
    (stopped.body as { error?: { category?: string } }).error?.category
  ).toBe('runtime_stop_unconfirmed')
  expect(entryStateOf(world, projectId)).toBe('failed')
  expect(identity.alive).toBe(true)
}

/**
 * Drives the delivered restart into a quarantined replacement: the prior
 * generation is released and confirmed, the replacement reports ownership and
 * then a cleanup audit that cannot confirm absence, and the restart abandons
 * the phase with the replacement quarantined.
 */
async function quarantineThroughFailedRestart(
  world: CloseWorld,
  projectId: string
): Promise<void> {
  await navigate(world, projectId)
  world.setLaunch(async (control) => {
    const replacement = await control.createIdentity()
    await control.probeReadiness(replacement)
    control.onOwned(replacement.ready)
    // The attempt cleans up after itself and reports what it actually saw:
    // the identity it created is still alive and still holding its listener.
    control.onCleanup(await replacement.observeTermination('unconfirmed'))
    // One macrotask so the abort the cleanup raised is the settlement the
    // restart observes, rather than this rejection racing it.
    await new Promise((resolve) => setTimeout(resolve, 0))
    throw new RuntimeFailure('spawn-error')
  })
  const restarted = await postRuntime(world, projectId, 'restart')
  expect(restarted.status).toBe(500)
  expect(
    (restarted.body as { error?: { category?: string } }).error?.category
  ).toBe('runtime_replacement_failed')
  await until(
    'the replacement to be quarantined and its admission retained',
    () =>
      (managerAudit(world).quarantinedOwnershipRecords ?? 0) === 1 &&
      (managerAudit(world).pendingAdmissions ?? 0) === 1
  )
  expect(entryStateOf(world, projectId)).toBe('failed')
  // The quarantined identity leaves when the close reclaims it.
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

// ---------------------------------------------------------------------------
// Group A — running close succeeds
// ---------------------------------------------------------------------------

/** S-3: an open proxied WebSocket is terminated by the drain. */
async function runS3(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = { peerSockets: 0 }
  const row = await executeCloseScenario('S-3', (world) => {
    let selectedSocket: HeldWebSocket | null = null
    let peerSocket: HeldWebSocket | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        peerSocket = openWorkbenchWebSocket(world, world.peer.id)
        await peerSocket.opened
        expect(await peerSocket.exchange('peer-frame-before')).toBe(true)
        selectedSocket = openWorkbenchWebSocket(world, world.selected.id)
        await selectedSocket.opened
        expect(await selectedSocket.exchange('selected-frame-before')).toBe(
          true
        )
        await until(
          'the proxy reporting the selected socket',
          () => proxyAuditFor(world, world.selected).webSockets >= 1
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        await selectedSocket?.closed
        // The peer socket answers after the close settled: the drain took the
        // selected project's socket and left this one carrying traffic.
        expect(await peerSocket?.exchange('peer-frame-after')).toBe(true)
        observed.peerSockets = proxyAuditFor(world, world.peer).webSockets
        note(
          'the selected socket closed while the peer still held ' +
            String(observed.peerSockets) +
            ' socket and exchanged a frame after the close settled'
        )
      },
    }
  })
  expect(observed.peerSockets).toBeGreaterThan(0)
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.drainInvocations).toBe(1)
  expect(row.residual.proxyWebSockets).toBe(0)
  expect(row.residual.proxyRawSockets).toBe(0)
  expect(row.peerAfter.activeConnections).toBe(row.peerBefore.activeConnections)
  expect(row.peerAfter.activeConnections).toBeGreaterThan(0)
  expect(row.peerAfter.readiness).toBe('ready')
  return row
}

/** S-4: a proxy operation suspended inside target resolution. */
async function runS4(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const row = await executeCloseScenario('S-4', (world) => {
    const hold = deferred<void>()
    let pending: {
      readonly settled: Promise<unknown>
      destroy(): void
    } | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        // The hold is inside `resolveTarget`, after the proxy registered its
        // pending operation and before it resolves the project, and it holds
        // only arrivals for the project being closed.
        world.holdProxyResolve(hold, world.selected.id)
        pending = openHeldWorkbenchRequest(world, world.selected.id)
        await until(
          'a pending proxy operation for the selected project',
          () => proxyAuditFor(world, world.selected).pendingOperations >= 1
        )
      },
      act: async () => {
        const resolvesBefore = world.proxyResolves.reads
        const startsBefore = world.proxyResolves.starts
        const response = deleteProject(world, world.selected.id)
        await until(
          'the close entering its drain',
          () => world.proxyCalls.drain >= 1
        )
        hold.resolve()
        world.holdProxyResolve(null)
        const settled = await response
        note(
          'target resolutions entered during the close: ' +
            String(world.proxyResolves.reads - resolvesBefore) +
            '; runtime starts continued from the aborted arrival: ' +
            String(world.proxyResolves.starts - startsBefore)
        )
        // `findById` is the first statement of `resolveTarget`, so a zero
        // delta is zero target resolutions entered while the close ran.
        expect(world.proxyResolves.reads - resolvesBefore).toBe(0)
        expect(world.proxyResolves.starts - startsBefore).toBe(1)
        return [settled]
      },
      settle: async () => {
        await pending?.settled
      },
    }
  })
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.residual.proxyPendingOperations).toBe(0)
  note('the aborted arrival left no pending operation behind')
  return row
}

/** S-5: HTTP, WebSocket, and raw-socket load together. */
async function runS5(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let peerBefore: Readonly<Record<string, number>> = {}
  let peerAfter: Readonly<Record<string, number>> = {}
  let selectedLoad: Readonly<Record<string, number>> = {}
  const row = await executeCloseScenario('S-5', (world) => {
    let held: { readonly settled: Promise<unknown>; destroy(): void } | null =
      null
    let selectedSocket: HeldWebSocket | null = null
    let peerSocket: HeldWebSocket | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        peerSocket = openWorkbenchWebSocket(world, world.peer.id)
        await peerSocket.opened
        expect(await peerSocket.exchange('peer-frame-before')).toBe(true)
        const identity = liveIdentity(world, world.selected.id)
        identity.holdUpstream(true)
        held = openHeldWorkbenchRequest(world, world.selected.id)
        selectedSocket = openWorkbenchWebSocket(world, world.selected.id)
        await selectedSocket.opened
        await until('every connection class to be live at once', () =>
          Object.values(proxyAuditFor(world, world.selected)).every(
            (count) => count >= 1
          )
        )
        selectedLoad = proxyAuditFor(world, world.selected)
        peerBefore = proxyAuditFor(world, world.peer)
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        await held?.settled
        await selectedSocket?.closed
        peerAfter = proxyAuditFor(world, world.peer)
        expect(await peerSocket?.exchange('peer-frame-after')).toBe(true)
      },
    }
  })
  expect(row.outcome).toBe('closed')
  expect(Object.values(selectedLoad).every((count) => count >= 1)).toBe(true)
  expect(peerAfter).toEqual(peerBefore)
  note(
    'selected load before the close ' +
      JSON.stringify(selectedLoad) +
      '; peer counts unchanged at ' +
      JSON.stringify(peerAfter)
  )
  return row
}

/** S-6: a running project whose prior generation is quarantined. */
async function runS6(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    quarantineBefore: 0,
    quarantineAtRelease: -1,
    quarantinedIdentityAliveAtRelease: true,
    quarantineAtSettlement: -1,
  }
  const row = await executeCloseScenario('S-6', (world) => {
    const hold = deferred<void>()
    let quarantined: HostIdentity | null = null
    let running: HostIdentity | null = null
    return {
      arrangeSelected: async () => {
        await quarantineThroughFailedRestart(world, world.selected.id)
        // A fresh generation runs while the quarantined one is still held.
        await navigate(world, world.selected.id)
        observed.quarantineBefore =
          managerAudit(world).quarantinedOwnershipRecords ?? 0
        expect(observed.quarantineBefore).toBe(1)
        expect(entryStateOf(world, world.selected.id)).toBe('running')
        running = liveIdentity(world, world.selected.id)
        quarantined =
          identitiesFor(world, world.selected.id).find(
            (identity) => identity.alive && identity !== running
          ) ?? null
        expect(quarantined).not.toBeNull()
        // The running generation's release is suspended at its first
        // instruction, so the quarantine can be observed at that instant.
        running.releaseHold = hold
      },
      act: async () => {
        const response = deleteProject(world, world.selected.id)
        await until(
          'the running generation entering its release',
          () => (running?.terminateCalls ?? 0) >= 1
        )
        observed.quarantineAtRelease =
          managerAudit(world).quarantinedOwnershipRecords ?? 0
        observed.quarantinedIdentityAliveAtRelease = quarantined?.alive ?? true
        hold.resolve()
        return [await response]
      },
      settle: async () => {
        observed.quarantineAtSettlement =
          managerAudit(world).quarantinedOwnershipRecords ?? 0
      },
      resetLedgerBeforeAct: true,
    }
  })
  expect(row.outcome).toBe('closed')
  expect(row.requiresQuarantineResolution).toBe(true)
  expect(row.declaredBound).toBe('B-6')
  expect(observed.quarantineAtRelease).toBe(0)
  expect(observed.quarantinedIdentityAliveAtRelease).toBe(false)
  expect(observed.quarantineAtSettlement).toBe(0)
  expect(row.residual.quarantinedIdentities).toBe(0)
  expect(row.managerAudit.quarantinedOwnershipRecords).toBe(0)
  note(
    'quarantined records: ' +
      String(observed.quarantineBefore) +
      ' before the close and ' +
      String(observed.quarantineAtRelease) +
      ' at the instant the running generation entered its release, with the ' +
      'quarantined identity already gone'
  )
  return row
}

/** S-7: the runtime leaves on the graceful signal alone. */
async function runS7(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let delivered: readonly NodeJS.Signals[] = []
  let outcomes: readonly string[] = []
  const row = await executeCloseScenario('S-7', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'graceful'
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      delivered = identitiesFor(world, world.selected.id)[0]!.signalsDelivered
      outcomes = world.closeInvocations[0]!.terminationAudits.map(
        (audit) => audit.outcome
      )
    },
  }))
  expect(row.outcome).toBe('closed')
  expect(delivered).toEqual(['SIGTERM'])
  expect(outcomes).toEqual(['graceful'])
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)
  note('release delivered ' + delivered.join(',') + ' and audited graceful')
  return row
}

/** S-8: the runtime survives the graceful signal and needs escalation. */
async function runS8(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let delivered: readonly NodeJS.Signals[] = []
  let outcomes: readonly string[] = []
  let releasedGenerations = 0
  const row = await executeCloseScenario('S-8', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'force'
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      delivered = identitiesFor(world, world.selected.id)[0]!.signalsDelivered
      const invocation = world.closeInvocations[0]!
      outcomes = invocation.terminationAudits.map((audit) => audit.outcome)
      const settled = invocation.outcome
      releasedGenerations =
        settled !== null && settled.outcome === 'closed'
          ? settled.releasedGenerations
          : -1
    },
  }))
  expect(row.outcome).toBe('closed')
  expect(delivered).toEqual(['SIGTERM', 'SIGKILL'])
  expect(outcomes).toEqual(['escalated'])
  expect(releasedGenerations).toBe(1)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(2)
  note(
    'release delivered ' +
      delivered.join(',') +
      ' and released exactly one owned identity'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group B — retained failed close and release or removal failure
// ---------------------------------------------------------------------------

/** S-9: a failed entry whose identity is positively absent. */
async function runS9(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let outcomes: readonly string[] = []
  let delivered: readonly NodeJS.Signals[] = []
  const row = await executeCloseScenario('S-9', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      // The process leaves and its launcher observes the early exit, which is
      // what installs the retained failure.
      await liveIdentity(world, world.selected.id).exitEarly(1)
      await until(
        'the retained failure the observed exit installs',
        () => entryStateOf(world, world.selected.id) === 'failed'
      )
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      const invocation = world.closeInvocations[0]!
      outcomes = invocation.terminationAudits.map((audit) => audit.outcome)
      delivered = identitiesFor(world, world.selected.id)[0]!.signalsDelivered
    },
  }))
  expect(row.outcome).toBe('closed')
  expect(outcomes).toEqual(['already-absent'])
  expect(delivered).toEqual([])
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note(
    'the release audited the identity absent before signalling, so no signal ' +
      'was delivered and the registration is gone'
  )
  return row
}

/** S-10: a failed entry whose attributable identity is still alive. */
async function runS10(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let outcomes: readonly string[] = []
  let confirmed = false
  const row = await executeCloseScenario('S-10', (world) => ({
    arrangeSelected: async () => {
      await failThroughUnconfirmedStop(world, world.selected.id)
      // The identity is still alive; it leaves when the close releases it.
      liveIdentity(world, world.selected.id).mode = 'graceful'
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      const invocation = world.closeInvocations[0]!
      outcomes = invocation.terminationAudits.map((audit) => audit.outcome)
      confirmed = invocation.terminationAudits.every(
        (audit) =>
          audit.processAbsent &&
          audit.processGroupAbsent &&
          audit.listenerAbsent
      )
    },
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('closed')
  expect(outcomes).toEqual(['graceful'])
  expect(confirmed).toBe(true)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(1)
  note('the retained failure released one live identity with one signal')
  return row
}

/** S-11: a failed entry whose identity is quarantined. */
async function runS11(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let quarantineAtSettlement = -1
  const row = await executeCloseScenario('S-11', (world) => ({
    arrangeSelected: async () => {
      await quarantineThroughFailedRestart(world, world.selected.id)
      expect(entryStateOf(world, world.selected.id)).toBe('failed')
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      quarantineAtSettlement =
        managerAudit(world).quarantinedOwnershipRecords ?? 0
    },
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('closed')
  expect(row.requiresQuarantineResolution).toBe(true)
  expect(row.declaredBound).toBe('B-6')
  expect(quarantineAtSettlement).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note('the quarantined identity was resolved and the registration removed')
  return row
}

/** S-12: a failed entry the reconciliation could not resolve. */
async function runS12(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let publishedFailure: string | null = null
  const row = await executeCloseScenario('S-12', (world) => ({
    arrangePeer: async () => {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      // The workbench the manager supervised outlives it: the child it
      // watched exits, the process keeps running without its listener, and
      // the manager cannot confirm the identity it once owned has left.
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
        'the reconciliation to retain an unresolved failure',
        () => entryStateOf(world, world.selected.id) === 'failed'
      )
      publishedFailure =
        (await runtimeStatesOverHttp(world))[world.selected.id]
          ?.failureCategory ?? null
      expect(publishedFailure).toBe('reconcile-unconfirmed')
      expect(identity.alive).toBe(true)
      await navigate(world, world.peer.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('reconcile-unresolved')
  expect(row.preClaimSettlement).toBe('reconcile-unresolved')
  expect(row.routeStatus).toBe(409)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(0)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  note(
    'the unresolved reconciliation was retained, the close refused it before ' +
      'any claim, and no signal was delivered'
  )
  return row
}

/** S-13: a running close whose release cannot be confirmed. */
async function runS13(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let ownershipAfter = -1
  const row = await executeCloseScenario('S-13', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'unconfirmed'
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      ownershipAfter = managerAudit(world).ownershipRecords
    },
  }))
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(row.routeStatus).toBe(500)
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('close-release-unconfirmed')
  expect(ownershipAfter).toBeGreaterThanOrEqual(2)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  note(
    'the unconfirmed release retained the failure, the public state, and the ' +
      'ownership record'
  )
  return row
}

/** S-14: a failed close whose release cannot be confirmed. */
async function runS14(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let entryAfter: string | null = null
  const row = await executeCloseScenario('S-14', (world) => ({
    arrangeSelected: async () => {
      await failThroughUnconfirmedStop(world, world.selected.id)
      // The identity keeps refusing to leave, so the close cannot confirm.
      expect(liveIdentity(world, world.selected.id).mode).toBe('unconfirmed')
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      entryAfter = entryStateOf(world, world.selected.id)
    },
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(row.routeStatus).toBe(500)
  expect(row.publicState).toBe('Failed')
  expect(row.failureClassification).toBe('close-release-unconfirmed')
  expect(entryAfter).toBe('failed')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  note('a retained failure whose release stayed unconfirmed kept every record')
  return row
}

/** S-15: a confirmed release whose removal the store refuses. */
async function runS15(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let signalsAfterRemoval = -1
  const row = await executeCloseScenario('S-15', (world, context) => {
    let refusal: { remove(): Promise<void> } | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        refusal = await installRemovalRefusal(
          context.databasePath,
          world.selected.id
        )
      },
      act: async () => {
        const response = await deleteProject(world, world.selected.id)
        signalsAfterRemoval =
          world.ledger.signalsByProject.get(
            deriveProjectOwnerToken(world.selected.id)
          ) ?? 0
        return [response]
      },
      settle: async () => {
        await refusal?.remove()
      },
    }
  })
  expect(row.outcome).toBe('rejected')
  expect(row.rejectionCategory).toBe('removal-failed')
  expect(row.routeStatus).toBe(500)
  expect(row.publicState).toBe('Stopped')
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(signalsAfterRemoval).toBe(1)
  note(
    'the store refused the removal after a confirmed release; the row is ' +
      'retained as released with exactly one signal and none after'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group C — ordering and durable non-mutation on failure
// ---------------------------------------------------------------------------

/** S-16: the confirmation predicate strictly precedes the one removal. */
async function runS16(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let callOrder: readonly string[] = []
  let sealedAtRemoval = false
  let reobservationMatched = false
  let connectionsClear = false
  const row = await executeCloseScenario('S-16', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      const invocation = world.closeInvocations[0]!
      callOrder = [...invocation.callOrder]
      const capture = invocation.removalCapture
      sealedAtRemoval = capture?.claimSealed ?? false
      reobservationMatched = capture?.reobservationMatchedLastAudit ?? false
      connectionsClear = capture?.connectionsClear ?? false
    },
  }))
  expect(row.outcome).toBe('closed')
  // Drain, then the connection audit the predicate reads, then the single
  // removal: the ledger is the order production called them in.
  expect(callOrder).toEqual(['drain', 'audit', 'removal'])
  expect(callOrder.filter((call) => call === 'removal')).toHaveLength(1)
  expect(sealedAtRemoval).toBe(true)
  expect(reobservationMatched).toBe(true)
  expect(connectionsClear).toBe(true)
  note(
    'call order ' +
      callOrder.join(' -> ') +
      '; the claim was sealed and the audit re-observed at the removal instant'
  )
  return row
}

/** S-17: `removal-failed` leaves the four durable fields untouched. */
async function runS17(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let before: DurableFields | null = null
  let after: DurableFields | null = null
  const row = await executeCloseScenario('S-17', (world, context) => {
    let refusal: { remove(): Promise<void> } | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        const persisted = await world.library.findById(world.selected.id)
        before = persisted === undefined ? null : durableFields(persisted)
        refusal = await installRemovalRefusal(
          context.databasePath,
          world.selected.id
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        const persisted = await world.library.findById(world.selected.id)
        after = persisted === undefined ? null : durableFields(persisted)
        await refusal?.remove()
      },
    }
  })
  expect(row.rejectionCategory).toBe('removal-failed')
  expect(before).not.toBeNull()
  expect(after).toEqual(before)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(row.publicState).toBe('Stopped')
  note(
    'all four durable fields re-read identical after the refused removal, ' +
      'and the public state stayed within the declared vocabulary'
  )
  return row
}

/** S-18: `release-unconfirmed` leaves the four durable fields untouched. */
async function runS18(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let before: DurableFields | null = null
  let after: DurableFields | null = null
  const row = await executeCloseScenario('S-18', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      liveIdentity(world, world.selected.id).mode = 'unconfirmed'
      const persisted = await world.library.findById(world.selected.id)
      before = persisted === undefined ? null : durableFields(persisted)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      const persisted = await world.library.findById(world.selected.id)
      after = persisted === undefined ? null : durableFields(persisted)
    },
  }))
  expect(row.rejectionCategory).toBe('release-unconfirmed')
  expect(before).not.toBeNull()
  expect(after).toEqual(before)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect(row.publicState).toBe('Failed')
  note('all four durable fields re-read identical after the refused release')
  return row
}

/** The nine admission rejections the close service can settle on. */
const REJECTION_ROUTE_RESULT = Object.freeze({
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

type RejectionCategory = keyof typeof REJECTION_ROUTE_RESULT

const REJECTION_ORDER = Object.freeze(
  Object.keys(REJECTION_ROUTE_RESULT) as RejectionCategory[]
)

/** What one executed rejection subcase observed, all of it read back. */
export interface RejectionSubcaseRecord {
  readonly category: RejectionCategory
  readonly routeStatus: number
  readonly routeCategory: string | null
  readonly settledCategory: string | null
  readonly durableBefore: DurableFields | null
  readonly durableAfter: DurableFields | null
  readonly publicState: string | null
  readonly treesBefore: TreePair
  readonly treesAfter: TreePair
}

/**
 * Arranges the exact state each admission rejection requires, using delivered
 * lifecycle operations only, and returns the holds the subcase must release
 * once the close has settled.
 */
async function arrangeRejection(
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
      const stopping = postRuntime(world, world.selected.id, 'stop')
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
      const restarting = postRuntime(world, world.selected.id, 'restart')
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
      for (let round = 0; round < 5; round += 1) {
        await failThroughUnconfirmedStop(world, world.selected.id)
      }
      expect(
        world.manager
          .inspectEntries()
          .find((entry) => entry.projectId === world.selected.id)?.state
      ).toBe('failed')
      return nothing
    }
  }
}

/**
 * Executes one admission rejection in its own world and observes the durable
 * fields, the published state, and both fixture trees around it. Used by the
 * two scenarios that must cover all nine, for the eight they do not report.
 */
async function executeRejectionSubcase(
  scenario: 'S-19' | 'S-30' | 'S-31',
  category: RejectionCategory
): Promise<RejectionSubcaseRecord> {
  let record: RejectionSubcaseRecord | null = null
  try {
    await executeCloseScenario(scenario, (world, context) => {
      let holds: { release: () => Promise<void> } = {
        release: async () => undefined,
      }
      let durableBefore: DurableFields | null = null
      let treesBefore: TreePair | null = null
      return {
        arrangeSelected: async () => {
          const persisted = await world.library.findById(world.selected.id)
          durableBefore =
            persisted === undefined ? null : durableFields(persisted)
          treesBefore = await observeTrees(world)
          holds = await arrangeRejection(world, context, category)
        },
        act: async () => {
          const response = await deleteProject(world, world.selected.id)
          const persisted = await world.library.findById(world.selected.id)
          const settled = world.closeOutcomes.at(-1) ?? null
          record = {
            category,
            routeStatus: response.status,
            routeCategory:
              (response.body as { error?: { category?: string } } | undefined)
                ?.error?.category ?? null,
            settledCategory:
              settled !== null && settled.outcome === 'rejected'
                ? settled.category
                : null,
            durableBefore,
            durableAfter:
              persisted === undefined ? null : durableFields(persisted),
            publicState:
              (await runtimeStatesOverHttp(world))[world.selected.id]?.state ??
              null,
            treesBefore: treesBefore ?? { selected: [], peer: [] },
            treesAfter: await observeTrees(world),
          }
          return [response]
        },
        settle: async () => {
          await holds.release()
        },
        subject: (invocations) => invocations[0]!,
        resetLedgerBeforeAct: true,
      }
    })
  } catch (error) {
    throw new Error(
      'BL-020 ' + scenario + ' rejection subcase ' + category + ' failed',
      { cause: error }
    )
  }
  if (record === null)
    throw new Error('BL-020 rejection subcase recorded nothing')
  return record
}

/** Asserts one subcase settled where it declared and disturbed nothing. */
function assertRejectionSubcase(record: RejectionSubcaseRecord): void {
  const [status, routeCategory] = REJECTION_ROUTE_RESULT[record.category]
  expect(record.settledCategory).toBe(record.category)
  expect(record.routeStatus).toBe(status)
  expect(record.routeCategory).toBe(routeCategory)
  expect(record.durableBefore).not.toBeNull()
  expect(record.durableAfter).toEqual(record.durableBefore)
  // The published projection has exactly four values, and a rejection leaves
  // the project registered, so a rejected close must report one of them.
  expect([...PUBLIC_RUNTIME_STATES]).toContain(record.publicState)
  expectTreesUnchanged(record.treesBefore, record.treesAfter)
}

/**
 * S-19: every one of the nine admission rejections, each executed in its own
 * world. The reported row is the `stop-in-progress` subcase; the other eight
 * are executed here and observed the same way.
 */
async function runS19(
  note: (text: string) => void,
  subcases: readonly RejectionSubcaseRecord[]
): Promise<ProjectCloseEvidenceRow> {
  let before: DurableFields | null = null
  let after: DurableFields | null = null
  const row = await executeCloseScenario('S-19', (world) => {
    let holds: { release: () => Promise<void> } = {
      release: async () => undefined,
    }
    return {
      arrangeSelected: async () => {
        const persisted = await world.library.findById(world.selected.id)
        before = persisted === undefined ? null : durableFields(persisted)
        holds = await arrangeRejection(
          world,
          { databasePath: '' },
          'stop-in-progress'
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        const persisted = await world.library.findById(world.selected.id)
        after = persisted === undefined ? null : durableFields(persisted)
        await holds.release()
      },
      resetLedgerBeforeAct: true,
    }
  })
  expect(row.rejectionCategory).toBe('stop-in-progress')
  expect(row.preClaimSettlement).toBe('stop-in-progress')
  expect(row.routeStatus).toBe(409)
  expect(after).toEqual(before)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  expect([...PUBLIC_RUNTIME_STATES]).toContain(row.publicState)
  // Every one of the nine, including the reported one, disturbed nothing.
  expect(subcases.map((subcase) => subcase.category)).toEqual(
    REJECTION_ORDER.filter((category) => category !== 'stop-in-progress')
  )
  for (const subcase of subcases) assertRejectionSubcase(subcase)
  note(
    'nine rejections executed: ' +
      REJECTION_ORDER.join(', ') +
      '; every one left the four durable fields identical and published a ' +
      'state within the four-value vocabulary'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group D — delivered stopped behaviour preserved
// ---------------------------------------------------------------------------

/** S-20: a project that was already stopped through the stop route. */
async function runS20(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const row = await executeCloseScenario('S-20', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      const stopped = await postRuntime(world, world.selected.id, 'stop')
      expect(stopped.status).toBe(200)
      expect(entryStateOf(world, world.selected.id)).toBe('registered')
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note('the close of a stopped project called neither terminate nor signal')
  return row
}

/** S-21: a registered project whose runtime was never started. */
async function runS21(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let createdIdentities = -1
  const row = await executeCloseScenario('S-21', (world) => ({
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      createdIdentities = identitiesFor(world, world.selected.id).length
    },
  }))
  expect(row.outcome).toBe('closed')
  expect(row.routeStatus).toBe(200)
  expect(createdIdentities).toBe(0)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note('no runtime was ever created for the project the close removed')
  return row
}

/** S-22: a project released through a stop that audited absence. */
async function runS22(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let releaseOutcome: string | null = null
  let signalsAtRelease = -1
  const row = await executeCloseScenario('S-22', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      const identity = liveIdentity(world, world.selected.id)
      // The process leaves without its launcher observing an exit, so the
      // stop has to audit the absence rather than be told about it.
      await identity.vanish()
      const stopped = await postRuntime(world, world.selected.id, 'stop')
      expect(stopped.status).toBe(200)
      releaseOutcome =
        world.manager.lastCleanup(world.selected.id)?.outcome ?? null
      signalsAtRelease = identity.signalsDelivered.length
      expect(entryStateOf(world, world.selected.id)).toBe('registered')
    },
    act: async () => [await deleteProject(world, world.selected.id)],
  }))
  expect(row.outcome).toBe('closed')
  expect(releaseOutcome).toBe('already-absent')
  expect(signalsAtRelease).toBe(0)
  expect(row.execution.signalCallsByProject[row.projectTokens[0]!]).toBe(0)
  expect(row.registrationAfter).toBeNull()
  note(
    'the release audited the identity already absent and delivered no signal, ' +
      'and the close of the released project delivered none either'
  )
  return row
}

/** S-23: eight arrivals for the same stopped project. */
async function runS23(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const statuses: number[] = []
  const categories: (string | null)[] = []
  const row = await executeCloseScenario('S-23', (world) => ({
    arrangeSelected: async () => {
      await navigate(world, world.selected.id)
      expect((await postRuntime(world, world.selected.id, 'stop')).status).toBe(
        200
      )
    },
    act: async () => {
      const arrivals = Array.from({ length: 8 }, () =>
        deleteProject(world, world.selected.id)
      )
      const responses = await Promise.all(arrivals)
      for (const response of responses) {
        statuses.push(response.status)
        categories.push(
          (response.body as { error?: { category?: string } } | undefined)
            ?.error?.category ?? null
        )
      }
      return responses
    },
    selectResponse: responseWithDisposition('closed'),
    resetLedgerBeforeAct: true,
  }))
  expect(row.outcome).toBe('closed')
  expect(statuses.filter((status) => status === 200)).toHaveLength(1)
  expect(statuses.filter((status) => status === 404)).toHaveLength(7)
  expect(new Set(categories.filter((category) => category !== null))).toEqual(
    new Set(['project_not_found'])
  )
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(row.projectClosedEmissions).toBe(1)
  note(
    'eight arrivals settled as one removal and seven persisted absences with ' +
      'one route emission, no terminate, and no signal'
  )
  return row
}

/** S-24: an identifier the library never held. */
async function runS24(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let unknownId = ''
  let selectedUntouched = false
  const row = await executeCloseScenario('S-24', (world) => {
    unknownId = world.selected.id + '-never-registered'
    return {
      act: async () => [await deleteProject(world, unknownId)],
      settle: async () => {
        selectedUntouched =
          (await world.library.findById(world.selected.id)) !== undefined
      },
      subject: (invocations) => invocations[0]!,
    }
  })
  expect(row.outcome).toBe('already-absent')
  expect(row.preClaimSettlement).toBe('persisted-absence')
  expect(row.routeStatus).toBe(404)
  expect(row.routeCategory).toBe('project_not_found')
  expect(row.projectClosedEmissions).toBe(0)
  expect(row.execution.primitiveCalls.terminate).toBe(0)
  expect(row.execution.primitiveCalls.signal).toBe(0)
  expect(selectedUntouched).toBe(true)
  expect(row.registrationAfter).toEqual(row.registrationBefore)
  note(
    'closing ' +
      unknownId.slice(unknownId.lastIndexOf('-') + 1) +
      '-suffixed unknown identifier produced a persisted absence and no effect'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group E — proxy transport after close
// ---------------------------------------------------------------------------

/** S-25: a socket opened before the close, used after it. */
async function runS25(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const held: { socket: HeldWebSocket | null } = { socket: null }
  const observed = { exchangedAfter: true, startsDuring: -1, readyState: -1 }
  const row = await executeCloseScenario('S-25', (world) => {
    let startsBefore = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        const socket = openWorkbenchWebSocket(world, world.selected.id)
        held.socket = socket
        await socket.opened
        expect(await socket.exchange('before-close')).toBe(true)
        startsBefore =
          world.proxyResolves.startsByProject.get(world.selected.id) ?? 0
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        await held.socket?.closed
        observed.exchangedAfter =
          (await held.socket?.exchange('after-close')) ?? true
        observed.startsDuring =
          (world.proxyResolves.startsByProject.get(world.selected.id) ?? 0) -
          startsBefore
        observed.readyState = held.socket?.socket.readyState ?? -1
        held.socket?.socket.terminate()
      },
    }
  })
  expect(row.outcome).toBe('closed')
  expect(observed.exchangedAfter).toBe(false)
  // `3` is the closed ready state the transport reports.
  expect(observed.readyState).toBe(3)
  expect(observed.startsDuring).toBe(0)
  note(
    'the frame attempted after the close was never answered, the socket was ' +
      'closed, and no runtime start was entered'
  )
  return row
}

/** S-26: a response still streaming when the close arrives. */
async function runS26(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  let clientOutcome: { ended: boolean; aborted: boolean } | null = null
  const row = await executeCloseScenario('S-26', (world) => {
    let held: HeldRequest | null = null
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        liveIdentity(world, world.selected.id).holdUpstream(true)
        held = openHeldWorkbenchRequest(world, world.selected.id)
        await until(
          'a streaming upstream response through the proxy',
          () => proxyAuditFor(world, world.selected).httpResponses >= 1
        )
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        clientOutcome = (await held?.settled) ?? null
      },
    }
  })
  expect(row.outcome).toBe('closed')
  expect(clientOutcome).toEqual({ ended: false, aborted: true })
  expect(row.residual.proxyHttpResponses).toBe(0)
  note(
    'the streaming response was terminated and the client observed the ' +
      'termination rather than a complete body'
  )
  return row
}

/** S-27: navigating the stable route of a removed project. */
async function runS27(
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const observed = {
    status: -1,
    startsAfter: -1,
    leakedIdentity: true,
    category: null as string | null,
  }
  const row = await executeCloseScenario('S-27', (world) => {
    let startsBefore = 0
    let identityPort = 0
    let identityPid = 0
    return {
      arrangeSelected: async () => {
        await navigate(world, world.selected.id)
        const identity = liveIdentity(world, world.selected.id)
        identityPort = identity.port
        identityPid = identity.pid
      },
      act: async () => {
        const response = await deleteProject(world, world.selected.id)
        startsBefore = world.proxyResolves.starts
        return [response]
      },
      settle: async () => {
        const navigation = await navigateWorkbench(world, world.selected.id)
        observed.status = navigation.status
        observed.startsAfter = world.proxyResolves.starts - startsBefore
        observed.category =
          (navigation.body as { error?: { code?: string } } | undefined)?.error
            ?.code ?? null
        const payload = navigation.text
        observed.leakedIdentity =
          payload.includes(String(identityPort)) ||
          payload.includes(String(identityPid)) ||
          payload.includes(world.selected.canonicalPath) ||
          payload.includes('127.0.0.1')
      },
    }
  })
  expect(row.outcome).toBe('closed')
  expect(observed.status).toBeGreaterThanOrEqual(400)
  expect(observed.startsAfter).toBe(0)
  expect(observed.leakedIdentity).toBe(false)
  note(
    'the stable route answered ' +
      String(observed.status) +
      ' (' +
      String(observed.category) +
      ')' +
      ' with no runtime start and no identity, path, or authority in the body'
  )
  return row
}

// ---------------------------------------------------------------------------
// Group F — filesystem integrity
// ---------------------------------------------------------------------------

/** Runs one close and compares both fixture trees around it. */
async function runManifestScenario(
  scenario: 'S-28' | 'S-29' | 'S-30',
  arrange: (world: CloseWorld) => Promise<void>,
  note: (text: string) => void
): Promise<ProjectCloseEvidenceRow> {
  const walked: { before: TreePair | null; after: TreePair | null } = {
    before: null,
    after: null,
  }
  const row = await executeCloseScenario(scenario, (world) => ({
    arrangeSelected: async () => {
      await arrange(world)
      walked.before = await observeTrees(world)
    },
    act: async () => [await deleteProject(world, world.selected.id)],
    settle: async () => {
      walked.after = await observeTrees(world)
    },
    resetLedgerBeforeAct: true,
  }))
  const { before, after } = walked
  if (before === null || after === null)
    throw new Error('BL-020 ' + scenario + ' walked no fixture tree')
  expectTreesUnchanged(before, after)
  note(
    'selected tree of ' +
      String(before.selected.length) +
      ' entries and peer tree of ' +
      String(before.peer.length) +
      ' entries identical on membership, content, link target, mode, and mtime'
  )
  return row
}

/** S-31: fixture trees around every one of the nine admission rejections. */
async function runS31(
  note: (text: string) => void,
  subcases: readonly RejectionSubcaseRecord[]
): Promise<ProjectCloseEvidenceRow> {
  const walked: { before: TreePair | null; after: TreePair | null } = {
    before: null,
    after: null,
  }
  const row = await executeCloseScenario('S-31', (world) => {
    let holds: { release: () => Promise<void> } = {
      release: async () => undefined,
    }
    return {
      arrangeSelected: async () => {
        holds = await arrangeRejection(
          world,
          { databasePath: '' },
          'stop-in-progress'
        )
        walked.before = await observeTrees(world)
      },
      act: async () => [await deleteProject(world, world.selected.id)],
      settle: async () => {
        walked.after = await observeTrees(world)
        await holds.release()
      },
      resetLedgerBeforeAct: true,
    }
  })
  expect(row.rejectionCategory).toBe('stop-in-progress')
  const { before, after } = walked
  if (before === null || after === null)
    throw new Error('BL-020 S-31 walked no fixture tree')
  expectTreesUnchanged(before, after)
  // The reported rejection plus the eight executed elsewhere are the nine.
  expect(
    [row.rejectionCategory, ...subcases.map((subcase) => subcase.category)]
      .filter((category): category is RejectionCategory => category !== null)
      .sort()
  ).toEqual([...REJECTION_ORDER].sort())
  for (const subcase of subcases) {
    expectTreesUnchanged(subcase.treesBefore, subcase.treesAfter)
    expect(subcase.treesAfter.selected.length).toBeGreaterThan(0)
    expect(subcase.treesAfter.peer.length).toBeGreaterThan(0)
  }
  expect(row.fixtureAfter.members).toBeGreaterThan(0)
  expect(row.fixtureAfter).toEqual(row.fixtureBefore)
  note(
    'nine rejections, each with a non-empty selected and peer tree identical ' +
      'on all five attributes across the close'
  )
  return row
}

// ---------------------------------------------------------------------------
// The executed core matrix
// ---------------------------------------------------------------------------

/**
 * Executes the twenty-nine core scenarios in plan order and returns their
 * rows. Every row is produced by a real close through the delivered route,
 * proxy, manager, and library, in a world this run allocated and released.
 */
export async function runCoreMatrix(
  only?: readonly CoreMatrixScenarioId[]
): Promise<CoreMatrixExecution> {
  const results: CoreScenarioResult[] = []
  const startedAt = Date.now()
  let rejectionSubcases: readonly RejectionSubcaseRecord[] = []

  const execute = async (
    scenario: CoreMatrixScenarioId,
    run: (note: (text: string) => void) => Promise<ProjectCloseEvidenceRow>
  ): Promise<void> => {
    if (only !== undefined && !only.includes(scenario)) return
    const observations: string[] = []
    const enteredAt = Date.now()
    if (process.env.BL020_CORE_REPORT === '1')
      process.stderr.write('[core] ' + scenario + ' start\n')
    let watchdog: NodeJS.Timeout | undefined
    const row = await Promise.race([
      run((text) => observations.push(text)),
      new Promise<never>((_resolve, reject) => {
        watchdog = setTimeout(
          () =>
            reject(new Error('BL-020 ' + scenario + ' did not settle in 180s')),
          180_000
        )
      }),
    ]).finally(() => {
      if (watchdog !== undefined) clearTimeout(watchdog)
    })
    expect(row.scenario).toBe(scenario)
    if (process.env.BL020_CORE_REPORT === '1')
      process.stderr.write(
        '[core] ' +
          scenario +
          ' ' +
          row.outcome +
          ' ' +
          String(Date.now() - enteredAt) +
          'ms\n'
      )
    results.push({
      scenario,
      row,
      durationMs: Date.now() - enteredAt,
      observations: Object.freeze([...observations]),
    })
  }

  await execute('S-3', runS3)
  await execute('S-4', runS4)
  await execute('S-5', runS5)
  await execute('S-6', runS6)
  await execute('S-7', runS7)
  await execute('S-8', runS8)
  await execute('S-9', runS9)
  await execute('S-10', runS10)
  await execute('S-11', runS11)
  await execute('S-12', runS12)
  await execute('S-13', runS13)
  await execute('S-14', runS14)
  await execute('S-15', runS15)
  await execute('S-16', runS16)
  await execute('S-17', runS17)
  await execute('S-18', runS18)
  await execute('S-19', async (note) => {
    // The eight rejections this row does not report, each executed in its own
    // world. The same records carry the manifests `S-31` reports.
    const executed: RejectionSubcaseRecord[] = []
    for (const category of REJECTION_ORDER) {
      if (category === 'stop-in-progress') continue
      executed.push(await executeRejectionSubcase('S-19', category))
    }
    rejectionSubcases = Object.freeze(executed)
    return runS19(note, rejectionSubcases)
  })
  await execute('S-20', runS20)
  await execute('S-21', runS21)
  await execute('S-22', runS22)
  await execute('S-23', runS23)
  await execute('S-24', runS24)
  await execute('S-25', runS25)
  await execute('S-26', runS26)
  await execute('S-27', runS27)
  await execute('S-28', async (note) =>
    runManifestScenario(
      'S-28',
      async (world) => {
        await navigate(world, world.selected.id)
      },
      note
    )
  )
  await execute('S-29', async (note) =>
    runManifestScenario(
      'S-29',
      async (world) => {
        await failThroughUnconfirmedStop(world, world.selected.id)
        liveIdentity(world, world.selected.id).mode = 'graceful'
      },
      note
    )
  )
  await execute('S-30', async (note) => {
    const removalFailed = await executeRejectionSubcase(
      'S-30',
      'removal-failed'
    )
    assertRejectionSubcase(removalFailed)
    expectTreesUnchanged(removalFailed.treesBefore, removalFailed.treesAfter)
    note(
      'the refused-removal subcase left both trees identical on all five ' +
        'attributes'
    )
    const row = await runManifestScenario(
      'S-30',
      async (world) => {
        await navigate(world, world.selected.id)
        liveIdentity(world, world.selected.id).mode = 'unconfirmed'
      },
      note
    )
    expect(row.rejectionCategory).toBe('release-unconfirmed')
    return row
  })
  await execute('S-31', async (note) => runS31(note, rejectionSubcases))

  const rows = results.map((result) => result.row)
  expect(rows.map((row) => row.scenario)).toEqual(
    CORE_MATRIX_SCENARIOS.filter(
      (scenario) => only === undefined || only.includes(scenario)
    )
  )
  const execution: CoreMatrixExecution = Object.freeze({
    rows: Object.freeze(rows),
    results: Object.freeze(results),
    durationMs: Date.now() - startedAt,
  })
  lastExecution = execution
  return execution
}

/** The twenty-nine core rows, in the plan's order. */
export async function runCoreMatrixRows(): Promise<
  readonly ProjectCloseEvidenceRow[]
> {
  return (await runCoreMatrix()).rows
}

let lastExecution: CoreMatrixExecution | null = null

/** The per-scenario record of the most recent execution in this process. */
export const lastCoreMatrixExecution = (): CoreMatrixExecution | null =>
  lastExecution
