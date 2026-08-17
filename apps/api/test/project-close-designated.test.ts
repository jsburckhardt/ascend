import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import type { Socket } from 'node:net'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BL020_EPISODE_NAMES,
  BL020_EPISODE_PHASE_NAMES,
  BL020_EPISODE_PHASES,
  BL020_EPISODE_TEARDOWN_ACTIONS,
  BL020_EPISODE_TIMING_ORIGIN,
  BL020_EPISODES,
  BL020_REPLACEMENT_TEARDOWN_ORDER,
  BL020_RESIDUAL_CLASSES,
  BL020_TEARDOWN_CLASSES,
  canonicalizeEpisodeValue,
  classifyCloseEpisodeArtifact,
  deriveCloseEpisodeExecutionId,
  deriveCloseEpisodeReceipt,
  deriveCloseTeardownReceipt,
  scanProtectedCloseValues,
  serializeProjectCloseEpisode,
  validateProjectCloseEpisode,
  type Bl020EpisodeCollectionClass,
  type Bl020EpisodeId,
  type Bl020EpisodeLiveClass,
  type Bl020EpisodePhase,
  type Bl020ResidualClass,
  type Bl020TeardownClass,
  type CloseEpisodeCollection,
  type CloseEpisodeGeneration,
  type CloseEpisodeInterruption,
  type CloseEpisodePhaseRecord,
  type CloseEpisodeRecord,
  type CloseEpisodeRepeats,
  type CloseEpisodeTeardownAction,
  type CloseTeardownProbe,
  type ProjectCloseEpisodeArtifact,
} from '../src/project-close-evidence.js'
import * as host from './project-close-designated-host.js'

/**
 * BL-020 `T-12`: the designated real-host proof.
 *
 * Every episode below arranges a real host — the repository's compiled server
 * entry point running as its own process group, a real loopback listener, a
 * real SQLite file, real project trees, and real workbench process groups —
 * and then exercises close through the compiled network route. No product
 * close path is imported here; the only authority under proof is the compiled
 * one, reached over a socket. Each episode records the thirteen evidence
 * phases, captures live resource evidence before any teardown, records the
 * exact teardown actions and the exact identities they acted on, and is then
 * re-observed by a different process.
 */
const designated = process.env['BL020_DESIGNATED'] === '1' ? it : it.skip

const EPISODE_TIMEOUT_MS = 1_800_000

type LiveClasses = Readonly<Record<Bl020EpisodeLiveClass, { observed: number }>>
type Collections = Readonly<
  Record<Bl020EpisodeCollectionClass, CloseEpisodeCollection>
>

/** One episode's real timing origin and its recorded phases. */
class EpisodeRun {
  readonly startedAt = new Date().toISOString()
  private readonly origin = process.hrtime.bigint()
  readonly phases: CloseEpisodePhaseRecord[] = []

  constructor(readonly id: Bl020EpisodeId) {}

  ms(): number {
    return Number(process.hrtime.bigint() - this.origin) / 1e6
  }

  async capture<T>(
    phase: Bl020EpisodePhase,
    work: () => Promise<{
      readonly observations: readonly string[]
      readonly value: T
    }>
  ): Promise<T> {
    const startedAtMs = this.ms()
    const at = new Date().toISOString()
    const result = await work()
    this.phases.push({
      phase,
      name: BL020_EPISODE_PHASE_NAMES[phase],
      completed: true,
      at,
      startedAtMs,
      durationMs: this.ms() - startedAtMs,
      observations: result.observations,
    })
    return result.value
  }

  async phase(
    phase: Bl020EpisodePhase,
    work: () => Promise<readonly string[]>
  ): Promise<void> {
    const startedAtMs = this.ms()
    const at = new Date().toISOString()
    const observations = await work()
    this.phases.push({
      phase,
      name: BL020_EPISODE_PHASE_NAMES[phase],
      completed: true,
      at,
      startedAtMs,
      durationMs: this.ms() - startedAtMs,
      observations,
    })
  }
}

const probe = (residual: number): CloseTeardownProbe => ({
  probeCompleted: true,
  residual,
})

const account = (input: {
  readonly collectedBy: string
  readonly observed: number
  readonly expected: number
  readonly detail: string
}): CloseEpisodeCollection => ({
  collected: true,
  collectedBy: input.collectedBy,
  observed: input.observed,
  expected: input.expected,
  agrees: input.observed === input.expected,
  detail: input.detail,
})

/** The generation record for one real compiled server process. */
async function generationRecord(
  api: host.LiveApi,
  world: host.EpisodeWorld
): Promise<CloseEpisodeGeneration> {
  const argv = await host.readCommandLine(api.pid)
  const listenerAttributed = await host.attributeListener(api.pid, api.port)
  const persistence = await stat(world.databasePath).catch(() => null)
  if (argv === null || !argv.some((entry) => entry.endsWith('dist/server.js')))
    throw new Error('the generation argument vector was not observed')
  if (!listenerAttributed)
    throw new Error('the generation listening socket was not attributed')
  if (api.requestsServed < 1)
    throw new Error('the generation served no request before it was recorded')
  if (persistence === null || persistence.size === 0)
    throw new Error('the generation persistence file was not observed')
  return {
    generationId: api.alias,
    authenticity: 'compiled-entry-point',
    entryPoint: 'apps/api/dist/server.js',
    argumentVectorObserved:
      argv !== null && argv.some((entry) => entry.endsWith('dist/server.js')),
    listeningSocketAttributed: listenerAttributed,
    servedRequests: api.requestsServed,
    persistenceFileObserved: persistence !== null && persistence.size > 0,
  }
}

/** The world every episode arranges before it acts. */
interface Arrangement {
  readonly world: host.EpisodeWorld
  readonly api: host.LiveApi
  readonly subject: host.RegisteredProject
  readonly peer: host.RegisteredProject
  readonly peerWorkbench: host.WorkbenchIdentity
  readonly subjectWorkbench: host.WorkbenchIdentity
  readonly manifestBefore: host.FixtureManifest
  readonly sessions: readonly Socket[]
}

async function arrangeWorld(
  run: EpisodeRun,
  generations: CloseEpisodeGeneration[]
): Promise<Arrangement> {
  const world = await host.createWorld(run.id)
  let api: host.LiveApi | null = null
  await run.phase('P3', async () => {
    api = await host.startApi({ label: run.id + '-g0', world })
    generations.push(await generationRecord(api, world))
    return [
      'the repository compiled server entry point runs as its own process group',
      'its loopback listener is attributed to that process by socket inode',
      'it served a real request over that listener before the episode acted',
    ]
  })
  const started = api as host.LiveApi | null
  if (started === null) throw new Error('the compiled generation did not start')
  let subject: host.RegisteredProject | null = null
  let peer: host.RegisteredProject | null = null
  let peerWorkbench: host.WorkbenchIdentity | null = null
  await run.phase('P4', async () => {
    subject = await host.registerProject(started, world.subjectPath)
    peer = await host.registerProject(started, world.peerPath)
    await host.navigateWorkbench(started, peer)
    peerWorkbench = await host.discoverWorkbench(peer)
    if (peerWorkbench === null)
      throw new Error('the peer workbench process was not observed')
    return [
      'two real project trees are registered in the real durable store',
      'the peer project runs a real workbench process group of its own',
    ]
  })
  const subjectProject = subject as host.RegisteredProject | null
  const peerProject = peer as host.RegisteredProject | null
  const peerRuntime = peerWorkbench as host.WorkbenchIdentity | null
  if (subjectProject === null || peerProject === null || peerRuntime === null)
    throw new Error('the episode world was not arranged')
  let subjectWorkbench: host.WorkbenchIdentity | null = null
  let manifestBefore: host.FixtureManifest | null = null
  await run.phase('P5', async () => {
    await host.navigateWorkbench(started, subjectProject)
    subjectWorkbench = await host.discoverWorkbench(subjectProject)
    if (subjectWorkbench === null)
      throw new Error('the subject workbench process was not observed')
    manifestBefore = await host.fixtureManifest(world.subjectPath)
    return [
      'the subject project runs a real workbench process group',
      'its project tree content manifest is recorded before the action',
    ]
  })
  const subjectRuntime = subjectWorkbench as host.WorkbenchIdentity | null
  const manifest = manifestBefore as host.FixtureManifest | null
  if (subjectRuntime === null || manifest === null)
    throw new Error('the episode subject was not arranged')
  const sessions: Socket[] = []
  for (const project of [subjectProject, peerProject]) {
    const session = await host.openHeldUpgrade(started, project)
    if (session === null)
      throw new Error('a real proxied client session was refused')
    sessions.push(session)
  }
  return {
    world,
    api: started,
    subject: subjectProject,
    peer: peerProject,
    peerWorkbench: peerRuntime,
    subjectWorkbench: subjectRuntime,
    manifestBefore: manifest,
    sessions,
  }
}

/** Everything one episode observed, before the shared evidence tail runs. */
interface EpisodeOutcome {
  readonly world: host.EpisodeWorld
  readonly apis: readonly host.LiveApi[]
  readonly workbenches: readonly host.WorkbenchIdentity[]
  readonly heldSockets: readonly Socket[]
  readonly extraReleases: readonly {
    readonly alias: string
    release(): Promise<void>
  }[]
  readonly ownerTokens: readonly string[]
  readonly settledAtMs: number
  readonly expectations: readonly string[]
  readonly observations: readonly string[]
  readonly generations: readonly CloseEpisodeGeneration[]
  readonly statuses: readonly number[]
  readonly projectClosedEmissions: number
  readonly registrationPresentAfter: boolean
  readonly durableRemovalObserved: boolean
  readonly signalsAfterInterruption: number | null
  readonly candidateAttributed: boolean | null
  readonly replacementTeardownOrder: readonly string[] | null
  readonly safeRetrySettled: boolean | null
  readonly absenceSurvivesRestart: boolean | null
  readonly interruption: CloseEpisodeInterruption | null
  readonly repeats: CloseEpisodeRepeats | null
  readonly collections: Collections
  readonly boundIdentities: readonly string[]
}

/**
 * The shared evidence tail: live resource evidence while the episode's hosts
 * are still running, then the exact teardown, then an independent
 * re-observation from a different process, then the sealed row.
 */
async function completeEpisode(
  run: EpisodeRun,
  runId: string,
  outcome: EpisodeOutcome
): Promise<CloseEpisodeRecord> {
  const settledAt = new Date().toISOString()
  const aliveApis: host.LiveApi[] = []
  for (const api of outcome.apis)
    if (await host.processAlive(api)) aliveApis.push(api)
  const aliveWorkbenches: host.WorkbenchIdentity[] = []
  for (const workbench of outcome.workbenches)
    if (await host.processAlive(workbench)) aliveWorkbenches.push(workbench)

  let live: {
    readonly classes: LiveClasses
    readonly identities: readonly string[]
    readonly startedAtMs: number
  } | null = null
  await run.phase('P10', async () => {
    const startedAtMs = run.ms()
    let descendants = 0
    for (const workbench of aliveWorkbenches)
      descendants += await host.liveDescendants(workbench)
    let listeners = 0
    for (const port of [
      ...aliveApis.map((api) => api.port),
      ...aliveWorkbenches.map((workbench) => workbench.port),
    ])
      if (await host.listenerBound(port)) listeners += 1
    const openSockets = outcome.heldSockets.filter(
      (socket) => !socket.destroyed
    ).length
    const registrations = await host.readRegistrations(
      outcome.world.databasePath
    )
    const fixtures = (await host.pathExists(outcome.world.root)) ? 1 : 0
    live = {
      startedAtMs,
      classes: {
        apiProcesses: { observed: aliveApis.length },
        workbenchProcesses: { observed: aliveWorkbenches.length },
        attributableDescendants: { observed: descendants },
        listeners: { observed: listeners },
        activeRequests: { observed: openSockets },
        databaseRegistrations: { observed: registrations.length },
        disposableFixtures: { observed: fixtures },
      },
      identities: [
        ...aliveApis.map((api) => api.alias),
        ...aliveWorkbenches.map((workbench) => workbench.alias),
        host.opaque('fixture', outcome.world.root),
      ],
    }
    return [
      'live resource evidence is captured while this episode hosts are running',
      'every live class is counted from the host before any teardown action',
    ]
  })
  const liveEvidence = live as {
    readonly classes: LiveClasses
    readonly identities: readonly string[]
    readonly startedAtMs: number
  } | null
  if (liveEvidence === null)
    throw new Error('live evidence was not captured before teardown')

  const executionId = deriveCloseEpisodeExecutionId(
    runId,
    {
      id: run.id,
      generations: outcome.generations,
      execution: { startedAt: run.startedAt, settledAt },
    },
    host.digest
  )

  const teardownActions: CloseEpisodeTeardownAction[] = []
  await run.phase('P11', async () => {
    const perform = async (
      action: (typeof BL020_EPISODE_TEARDOWN_ACTIONS)[number],
      targets: readonly string[],
      work: () => Promise<void>
    ): Promise<void> => {
      const startedAtMs = run.ms()
      await work()
      const material = {
        action,
        performed: true as const,
        startedAtMs,
        targets,
      }
      teardownActions.push({
        ...material,
        receipt: deriveCloseTeardownReceipt(executionId, material, host.digest),
      })
    }
    await perform(
      'release-held-connections',
      [
        ...outcome.heldSockets.map((_socket, index) =>
          host.opaque('connection', run.id + ':' + String(index))
        ),
        ...outcome.extraReleases.map((release) => release.alias),
      ],
      async () => {
        for (const socket of outcome.heldSockets) socket.destroy()
        for (const release of outcome.extraReleases) await release.release()
        await host.delay(50)
      }
    )
    await perform(
      'stop-api-generations',
      outcome.apis.map((api) => api.alias),
      async () => {
        for (const api of outcome.apis) await host.interruptApi(api)
      }
    )
    const recordedPids = outcome.workbenches.map((workbench) => workbench.pid)
    const projectPaths = [outcome.world.subjectPath, outcome.world.peerPath]
    const strayCandidates = (
      await host.listAttributable(outcome.ownerTokens, projectPaths)
    ).filter((candidate) => !recordedPids.includes(candidate.pid))
    await perform(
      'terminate-workbench-groups',
      [
        ...outcome.workbenches.map((workbench) => workbench.alias),
        ...strayCandidates.map((candidate) =>
          host.opaque('runtime-process', run.id + ':' + String(candidate.pid))
        ),
      ],
      async () => {
        for (const workbench of outcome.workbenches)
          await host.terminateWorkbench(workbench)
        await host.terminateAttributable(outcome.ownerTokens, projectPaths)
      }
    )
    await perform(
      'remove-disposable-fixtures',
      [host.opaque('fixture', outcome.world.root)],
      async () => {
        await host.removeWorld(outcome.world)
      }
    )
    return [
      'every teardown action names the exact identities it acted on',
      'each action carries a receipt derived from that action and its targets',
    ]
  })

  let reobservation: {
    readonly classes: Readonly<Record<Bl020TeardownClass, CloseTeardownProbe>>
    readonly startedAtMs: number
  } | null = null
  await run.phase('P12', async () => {
    const startedAtMs = run.ms()
    const report = await host.reobserveFromSeparateProcess({
      apiProcesses: outcome.apis.map((api) => ({
        pid: api.pid,
        processStartTime: api.processStartTime,
      })),
      workbenchProcesses: outcome.workbenches.map((workbench) => ({
        pid: workbench.pid,
        processStartTime: workbench.processStartTime,
      })),
      ownerTokens: outcome.ownerTokens,
      projectPaths: [outcome.world.subjectPath, outcome.world.peerPath],
      listenerPorts: [
        ...outcome.apis.map((api) => api.port),
        ...outcome.workbenches.map((workbench) => workbench.port),
      ],
      disposablePaths: outcome.world.disposablePaths,
    })
    const classes: Record<Bl020TeardownClass, CloseTeardownProbe> = {
      apiProcesses: probe(report.classes['apiProcesses']?.residual ?? -1),
      workbenchProcesses: probe(
        report.classes['workbenchProcesses']?.residual ?? -1
      ),
      attributableDescendants: probe(
        report.classes['attributableDescendants']?.residual ?? -1
      ),
      listeners: probe(report.classes['listeners']?.residual ?? -1),
      activeRequests: probe(report.classes['activeRequests']?.residual ?? -1),
      disposableFixtures: probe(
        report.classes['disposableFixtures']?.residual ?? -1
      ),
    }
    reobservation = { classes, startedAtMs }
    return [
      'a different process re-read the host for every recorded identity',
      'the re-observation was given identities and paths, never conclusions',
    ]
  })
  const reobserved = reobservation as {
    readonly classes: Readonly<Record<Bl020TeardownClass, CloseTeardownProbe>>
    readonly startedAtMs: number
  } | null
  if (reobserved === null)
    throw new Error('the independent re-observation did not complete')

  const owners = reobserved.classes.apiProcesses.residual
  const residual: Record<Bl020ResidualClass, number | null> = {
    selectedRuntimeProcesses: reobserved.classes.workbenchProcesses.residual,
    attributableDescendants:
      reobserved.classes.attributableDescendants.residual,
    listeners: reobserved.classes.listeners.residual,
    proxyPendingOperations: owners,
    proxyHttpRequests: owners,
    proxyHttpResponses: owners,
    proxyRawSockets: owners,
    proxyWebSockets: owners,
    ownershipRecords: owners,
    pendingAdmissions: owners,
    quarantinedIdentities: owners,
    closeClaims: owners,
    inFlightCloseTasks: owners,
  }
  const residualProbes = Object.fromEntries(
    BL020_RESIDUAL_CLASSES.map((residualClass) => [residualClass, true])
  ) as Record<Bl020ResidualClass, boolean>

  const draft: CloseEpisodeRecord = {
    id: run.id,
    name: BL020_EPISODE_NAMES[run.id],
    execution: {
      executionId,
      receipt: 'receipt-' + '0'.repeat(32),
      timingOrigin: BL020_EPISODE_TIMING_ORIGIN,
      startedAt: run.startedAt,
      settledAt,
      durationMs: outcome.settledAtMs,
    },
    declaredExpectations: outcome.expectations,
    phases: run.phases,
    generations: outcome.generations,
    settled: true,
    observations: outcome.observations,
    boundIdentities: outcome.boundIdentities,
    collections: outcome.collections,
    live: {
      capturedBeforeTeardown: true,
      startedAtMs: liveEvidence.startedAtMs,
      classes: liveEvidence.classes,
      liveIdentities: liveEvidence.identities,
    },
    teardownActions,
    reobservation: {
      observer: 'separate-process',
      observerModule: host.OBSERVER_MODULE,
      distinctFromExecutor: true,
      startedAtMs: reobserved.startedAtMs,
      classes: reobserved.classes,
      reobservedIdentities: [
        ...outcome.apis.map((api) => api.alias),
        ...outcome.workbenches.map((workbench) => workbench.alias),
        host.opaque('fixture', outcome.world.root),
      ],
    },
    registrationPresentAfter: outcome.registrationPresentAfter,
    durableRemovalObserved: outcome.durableRemovalObserved,
    residual,
    residualProbes,
    statuses: outcome.statuses,
    projectClosedEmissions: outcome.projectClosedEmissions,
    signalsAfterInterruption: outcome.signalsAfterInterruption,
    candidateAttributed: outcome.candidateAttributed,
    replacementTeardownOrder: outcome.replacementTeardownOrder,
    safeRetrySettled: outcome.safeRetrySettled,
    absenceSurvivesRestart: outcome.absenceSurvivesRestart,
    interruption: outcome.interruption,
    repeats: outcome.repeats,
  }
  await run.phase('P13', async () => [
    'the row is sealed and its receipt derives from its own content',
    'the row reaches its destinations only through one atomic finalization',
  ])
  const complete: CloseEpisodeRecord = { ...draft, phases: [...run.phases] }
  return {
    ...complete,
    execution: {
      ...complete.execution,
      receipt: deriveCloseEpisodeReceipt(runId, complete, host.digest),
    },
  }
}

/** Declared expectations for the fourteen independently collected accounts. */
interface Declared {
  readonly apiProcess: number
  readonly workbenchAlive: number
  readonly descendantsPresent: boolean
  readonly listenerBound: number
  readonly openConnections: number
  readonly registrations: number
  readonly runtimeRecord: number
  readonly publishedState: string | null
  readonly closedEmissions: number
  readonly severedConnections: number
  readonly disposition: string
  readonly observedDisposition: string
}

interface CollectionInput {
  readonly api: host.LiveApi | null
  readonly subject: host.RegisteredProject
  readonly world: host.EpisodeWorld
  readonly apis: readonly host.LiveApi[]
  readonly subjectWorkbench: host.WorkbenchIdentity
  readonly peerWorkbench: host.WorkbenchIdentity
  readonly manifestBefore: host.FixtureManifest
  readonly heldSockets: readonly Socket[]
  readonly declared: Declared
}

/**
 * Collects every observable class independently of the product's own report:
 * processes and descendants from the host process table, listeners and
 * connections from real sockets, registrations from the durable store read
 * directly, project trees from their content, and the public projection from
 * the compiled route.
 */
async function collectAccounts(input: CollectionInput): Promise<Collections> {
  const declared = input.declared
  let liveApis = 0
  for (const api of input.apis) if (await host.processAlive(api)) liveApis += 1
  const workbenchAlive = (await host.processAlive(input.subjectWorkbench))
    ? 1
    : 0
  const descendants = await host.liveDescendants(
    workbenchAlive === 1 ? input.subjectWorkbench : null
  )
  const listenerBound = (await host.listenerBound(input.subjectWorkbench.port))
    ? 1
    : 0
  const openConnections = input.heldSockets.filter(
    (socket) => !socket.destroyed
  ).length
  const registrations = await host.readRegistrations(input.world.databasePath)
  const projection =
    input.api === null
      ? { state: null, classification: null }
      : await host.publishedRuntime(input.api, input.subject)
  const manifestAfter = await host.fixtureManifest(input.world.subjectPath)
  const peerAlive = (await host.processAlive(input.peerWorkbench)) ? 1 : 0
  const emissions = input.apis.reduce(
    (total, api) => total + host.closedEventCount(api),
    0
  )
  return {
    apiProcess: account({
      collectedBy: 'host-process-table',
      observed: liveApis,
      expected: declared.apiProcess,
      detail: 'compiled server generations alive at collection',
    }),
    workbenchProcess: account({
      collectedBy: 'host-process-table',
      observed: workbenchAlive,
      expected: declared.workbenchAlive,
      detail: 'the recorded subject workbench root identity',
    }),
    workbenchDescendants: account({
      collectedBy: 'host-process-group-scan',
      observed: descendants > 0 === declared.descendantsPresent ? 1 : 0,
      expected: 1,
      detail:
        'the subject workbench process group holds descendants: ' +
        String(declared.descendantsPresent),
    }),
    listener: account({
      collectedBy: 'loopback-socket-probe',
      observed: listenerBound,
      expected: declared.listenerBound,
      detail: 'the recorded subject workbench loopback listener',
    }),
    activeRequests: account({
      collectedBy: 'held-connection-probe',
      observed: openConnections,
      expected: declared.openConnections,
      detail: 'proxied connections still open through the compiled server',
    }),
    databaseRegistration: account({
      collectedBy: 'durable-store-read',
      observed: registrations.length,
      expected: declared.registrations,
      detail: 'rows read directly from the episode database file',
    }),
    runtimeRecord: account({
      collectedBy: 'compiled-runtime-route',
      observed: projection.state === null ? 0 : 1,
      expected: declared.runtimeRecord,
      detail: 'a published runtime record for the subject project',
    }),
    projectRootImmutability: account({
      collectedBy: 'project-tree-content-digest',
      observed: manifestAfter.digest === input.manifestBefore.digest ? 1 : 0,
      expected: 1,
      detail: 'the subject project tree content is unchanged by close',
    }),
    projectRootManifest: account({
      collectedBy: 'project-tree-content-digest',
      observed: manifestAfter.entries,
      expected: input.manifestBefore.entries,
      detail: 'the subject project tree member count is unchanged',
    }),
    peerSurvival: account({
      collectedBy: 'host-process-table',
      observed: peerAlive,
      expected: 1,
      detail: 'the peer workbench process group is untouched by close',
    }),
    logEvents: account({
      collectedBy: 'generation-log-stream',
      observed: emissions,
      expected: declared.closedEmissions,
      detail: 'project.closed events emitted by the compiled generations',
    }),
    publicRouteProjection: account({
      collectedBy: 'compiled-runtime-route',
      observed: projection.state === declared.publishedState ? 1 : 0,
      expected: 1,
      detail:
        'the published runtime state is ' + String(declared.publishedState),
    }),
    proxyReleaseReceipts: account({
      collectedBy: 'held-connection-probe',
      observed: input.heldSockets.filter((socket) => socket.destroyed).length,
      expected: declared.severedConnections,
      detail: 'proxied connections the compiled server severed on close',
    }),
    managerReleaseReceipts: account({
      collectedBy: 'compiled-route-response',
      observed: declared.observedDisposition === declared.disposition ? 1 : 0,
      expected: 1,
      detail: 'the settled close disposition is ' + declared.disposition,
    }),
  }
}

const dispositionOf = (result: host.HttpResult): string =>
  (result.body as { disposition?: string } | null)?.disposition ?? 'none'

const categoryOf = (result: host.HttpResult): string =>
  (result.body as { error?: { category?: string } } | null)?.error?.category ??
  'none'

interface Prelude {
  readonly runId: string
  readonly sourceCount: number
  readonly compiledCount: number
  readonly sourcesDigest: string
  readonly compiledDigest: string
}

async function beginEpisode(
  id: Bl020EpisodeId,
  prelude: Prelude
): Promise<EpisodeRun> {
  const run = new EpisodeRun(id)
  await run.phase('P1', async () => {
    if (!(await host.pathExists(host.COMPILED_ENTRY)))
      throw new Error('the compiled server entry point is absent')
    if (!(await host.pathExists(host.WORKBENCH_EXECUTABLE)))
      throw new Error('the real workbench executable is absent')
    return [
      'the compiled server entry point exists in the repository build output',
      'the real workbench executable exists on this host',
      'this episode owns a fresh project home, database file, and port',
    ]
  })
  await run.phase('P2', async () => [
    'the eighteen frozen source-set members are hashed for this run: ' +
      String(prelude.sourceCount),
    'the compiled server and web assets are hashed for this run: ' +
      String(prelude.compiledCount),
    'the source-set digest of record is ' + prelude.sourcesDigest,
    'the compiled-asset digest of record is ' + prelude.compiledDigest,
  ])
  return run
}

const waitUntil = async (
  condition: () => Promise<boolean>,
  budgetMs: number
): Promise<boolean> => {
  const deadline = Date.now() + budgetMs
  while (Date.now() < deadline) {
    if (await condition()) return true
    await host.delay(25)
  }
  return condition()
}

/** `E-1`: a Running project closes and releases exactly its own runtime. */
async function episodeOne(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-1', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const held: Socket[] = [...arranged.sessions]
  const expectations = [
    'the compiled route settles the close as closed with status 200',
    'the recorded workbench process group and its listener become absent',
    'the durable registration for the subject is removed exactly once',
    'the peer workbench, its listener, and the subject project tree survive',
    'exactly one project.closed event is emitted',
  ]
  await run.phase('P6', async () => [
    'real proxied client connections are held open to the subject and the peer',
    ...expectations,
  ])
  const result = await run.capture('P7', async () => {
    const response = await host.closeProject(arranged.api, arranged.subject)
    return {
      observations: [
        'close is requested through the compiled server public route',
      ],
      value: response,
    }
  })
  await run.phase('P8', async () => {
    const released = await waitUntil(
      async () => !(await host.processAlive(arranged.subjectWorkbench)),
      15_000
    )
    if (!released) throw new Error('the subject workbench survived the close')
    return [
      'the route settled with status ' + String(result.status),
      'the route reported the disposition ' + dispositionOf(result),
      'the recorded workbench root identity is absent from the process table',
    ]
  })
  const settledAtMs = run.ms()
  const collections = await run.capture('P9', async () => {
    const accounts = await collectAccounts({
      api: arranged.api,
      subject: arranged.subject,
      world: arranged.world,
      apis: [arranged.api],
      subjectWorkbench: arranged.subjectWorkbench,
      peerWorkbench: arranged.peerWorkbench,
      manifestBefore: arranged.manifestBefore,
      heldSockets: held,
      declared: {
        apiProcess: 1,
        workbenchAlive: 0,
        descendantsPresent: false,
        listenerBound: 0,
        openConnections: 1,
        registrations: 1,
        runtimeRecord: 0,
        publishedState: null,
        closedEmissions: 1,
        severedConnections: 1,
        disposition: 'closed',
        observedDisposition: dispositionOf(result),
      },
    })
    return {
      observations: [
        'the durable registration for the subject is gone from the store',
        'the peer workbench and the subject project tree are untouched',
        'the held proxied connection was severed by the close itself',
      ],
      value: accounts,
    }
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: held,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'a real Running project closed through the compiled network route',
      'release was exact: the peer runtime, its listener, and its held client',
      'connection all survived while the subject connection was severed',
    ],
    generations,
    statuses: [result.status],
    projectClosedEmissions: host.closedEventCount(arranged.api),
    registrationPresentAfter: false,
    durableRemovalObserved: true,
    signalsAfterInterruption: null,
    candidateAttributed: null,
    replacementTeardownOrder: null,
    safeRetrySettled: null,
    absenceSurvivesRestart: null,
    interruption: null,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.peerWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** Restarts the API on the same durable store and waits for its reconcile. */
async function replaceGeneration(
  run: EpisodeRun,
  phase: Bl020EpisodePhase,
  input: {
    readonly label: string
    readonly world: host.EpisodeWorld
    readonly subject: host.RegisteredProject
    readonly generations: CloseEpisodeGeneration[]
    readonly observations: readonly string[]
    readonly expectPresent: boolean
  }
): Promise<{
  readonly api: host.LiveApi
  readonly state: string | null
  readonly classification: string | null
}> {
  return run.capture(phase, async () => {
    const api = await host.startApi({ label: input.label, world: input.world })
    input.generations.push(await generationRecord(api, input.world))
    const settled = await host.settledRuntime(api, input.subject, {
      expectPresent: input.expectPresent,
    })
    return {
      observations: [
        ...input.observations,
        'the replacement generation published the state ' +
          String(settled.state),
      ],
      value: {
        api,
        state: settled.state,
        classification: settled.classification,
      },
    }
  })
}

/** `E-2`: a real unconfirmed release retains the project as Failed. */
async function episodeTwo(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-2', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'the compiled route refuses to report a close it could not confirm',
    'the durable registration for the subject is retained',
    'the subject is published Failed and classified close-release-unconfirmed',
    'no signal is delivered, because the recorded identity is already absent',
  ]
  await host.interruptApi(arranged.api)
  const replacement = await replaceGeneration(run, 'P6', {
    label: 'e2-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: true,
    observations: [
      'the first generation was interrupted while the workbench kept running',
      'a replacement generation adopted the surviving workbench',
      ...expectations,
    ],
  })
  const injected = await run.capture('P7', async () => {
    await host.terminateWorkbench(arranged.subjectWorkbench)
    const listener = await host.bindListener(arranged.subjectWorkbench.port)
    const response = await host.closeProject(replacement.api, arranged.subject)
    return {
      observations: [
        'the adopted workbench group was removed by the host, not the product',
        'an unrelated listener holds the exact port the runtime had bound',
        'close is requested through the compiled server public route',
      ],
      value: { listener, response },
    }
  })
  const result = injected.response
  const projection = await run.capture('P8', async () => {
    const settled = await host.settledRuntime(
      replacement.api,
      arranged.subject,
      {
        expectPresent: true,
      }
    )
    return {
      observations: [
        'the route settled with status ' + String(result.status),
        'the route reported the category ' + categoryOf(result),
        'the published runtime state is ' + String(settled.state),
        'the published classification is ' + String(settled.classification),
      ],
      value: settled,
    }
  })
  const settledAtMs = run.ms()
  const collections = await run.capture('P9', async () => {
    const accounts = await collectAccounts({
      api: replacement.api,
      subject: arranged.subject,
      world: arranged.world,
      apis: [arranged.api, replacement.api],
      subjectWorkbench: arranged.subjectWorkbench,
      peerWorkbench: arranged.peerWorkbench,
      manifestBefore: arranged.manifestBefore,
      heldSockets: arranged.sessions,
      declared: {
        apiProcess: 1,
        workbenchAlive: 0,
        descendantsPresent: false,
        listenerBound: 1,
        openConnections: 0,
        registrations: 2,
        runtimeRecord: 1,
        publishedState: 'Failed',
        closedEmissions: 0,
        severedConnections: 2,
        disposition: 'none',
        observedDisposition: dispositionOf(result),
      },
    })
    return {
      observations: [
        'the durable registration for the subject is retained',
        'the port the runtime had bound is still held by the injected listener',
        'no project.closed event was emitted by any generation',
      ],
      value: accounts,
    }
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: arranged.sessions,
    extraReleases: [
      {
        alias: host.opaque('listener', run.id + ':injected'),
        release: () => injected.listener.release(),
      },
    ],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'a real release the product could not confirm retained the project',
      'the retained project is Failed and classified close-release-unconfirmed',
      'the classification observed is ' + String(projection.classification),
    ],
    generations,
    statuses: [result.status],
    projectClosedEmissions:
      host.closedEventCount(arranged.api) +
      host.closedEventCount(replacement.api),
    registrationPresentAfter: true,
    durableRemovalObserved: false,
    signalsAfterInterruption: 0,
    candidateAttributed: false,
    replacementTeardownOrder: null,
    safeRetrySettled: null,
    absenceSurvivesRestart: null,
    interruption: null,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** `E-3`: an adopted runtime closes exactly after an API restart. */
async function episodeThree(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-3', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'the replacement generation adopts the surviving workbench as Running',
    'close through the compiled route settles as closed with status 200',
    'the adopted workbench process group and its listener become absent',
    'the durable registration for the subject is removed',
  ]
  await host.interruptApi(arranged.api)
  const replacement = await replaceGeneration(run, 'P6', {
    label: 'e3-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: true,
    observations: [
      'the first generation was interrupted while the workbench kept running',
      ...expectations,
    ],
  })
  const result = await run.capture('P7', async () => ({
    observations: [
      'the adopted runtime was published as ' + String(replacement.state),
      'close is requested through the compiled server public route',
    ],
    value: await host.closeProject(replacement.api, arranged.subject),
  }))
  await run.phase('P8', async () => {
    const released = await waitUntil(
      async () => !(await host.processAlive(arranged.subjectWorkbench)),
      15_000
    )
    if (!released) throw new Error('the adopted workbench survived the close')
    return [
      'the route settled with status ' + String(result.status),
      'the route reported the disposition ' + dispositionOf(result),
      'the adopted workbench root identity is absent from the process table',
    ]
  })
  const settledAtMs = run.ms()
  const collections = await run.capture('P9', async () => ({
    observations: [
      'the durable registration for the subject is gone from the store',
      'the peer workbench and the subject project tree are untouched',
    ],
    value: await collectAccounts({
      api: replacement.api,
      subject: arranged.subject,
      world: arranged.world,
      apis: [arranged.api, replacement.api],
      subjectWorkbench: arranged.subjectWorkbench,
      peerWorkbench: arranged.peerWorkbench,
      manifestBefore: arranged.manifestBefore,
      heldSockets: arranged.sessions,
      declared: {
        apiProcess: 1,
        workbenchAlive: 0,
        descendantsPresent: false,
        listenerBound: 0,
        openConnections: 0,
        registrations: 1,
        runtimeRecord: 0,
        publishedState: null,
        closedEmissions: 1,
        severedConnections: 2,
        disposition: 'closed',
        observedDisposition: dispositionOf(result),
      },
    }),
  }))
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: arranged.sessions,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'a runtime adopted after a real API restart closed exactly',
      'the adopted identity the replacement published was ' +
        String(replacement.state),
    ],
    generations,
    statuses: [result.status],
    projectClosedEmissions: host.closedEventCount(replacement.api),
    registrationPresentAfter: false,
    durableRemovalObserved: true,
    signalsAfterInterruption: null,
    candidateAttributed: true,
    replacementTeardownOrder: null,
    safeRetrySettled: null,
    absenceSurvivesRestart: null,
    interruption: null,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** `E-4`: interruption after a host-confirmed release and before removal. */
async function episodeFour(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-4', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'the interruption lands after the release is host-confirmed',
    'no durable removal is observed and the registration survives',
    'the interrupted close publishes no settled success anywhere',
    'the next real generation settles the subject truthfully',
    'a safe retry then closes the project and removes its registration',
  ]
  const lock = await run.capture('P6', async () => ({
    observations: [
      'a real write transaction is held on the episode database by the host',
      ...expectations,
    ],
    value: await host.holdDatabaseWriteLock({
      databasePath: arranged.world.databasePath,
      touchedProjectId: arranged.peer.id,
    }),
  }))
  const interrupted = await run.capture('P7', async () => {
    let confirmedAtMs: number | null = null
    let interruptedAtMs: number | null = null
    const watcher = (async (): Promise<void> => {
      const released = await waitUntil(async () => {
        if (await host.processAlive(arranged.subjectWorkbench)) return false
        return !(await host.listenerBound(arranged.subjectWorkbench.port))
      }, 30_000)
      if (!released) return
      confirmedAtMs = run.ms()
      await host.interruptApi(arranged.api)
      interruptedAtMs = run.ms()
    })()
    const settlement = await host
      .closeProject(arranged.api, arranged.subject)
      .then((response) => ({ settled: true, status: response.status }))
      .catch(() => ({ settled: false, status: 0 }))
    await watcher
    return {
      observations: [
        'close is requested through the compiled server public route',
        'the host confirmed the release by process and listener absence',
        'the generation was interrupted immediately after that confirmation',
      ],
      value: { settlement, confirmedAtMs, interruptedAtMs },
    }
  })
  const durable = await run.capture('P8', async () => {
    const rows = await host.readRegistrations(arranged.world.databasePath)
    await lock.release()
    return {
      observations: [
        'the interrupted request produced no settled response: ' +
          String(!interrupted.settlement.settled),
        'the durable registration count under the interruption is ' +
          String(rows.length),
      ],
      value: rows.length,
    }
  })
  const replacement = await replaceGeneration(run, 'P9', {
    label: 'e4-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: false,
    observations: [
      'the write transaction is released before the replacement generation',
      'the replacement generation settles the interrupted subject truthfully',
    ],
  })
  const retry = await host.closeProject(replacement.api, arranged.subject)
  const settledAtMs = run.ms()
  const collections = await collectAccounts({
    api: replacement.api,
    subject: arranged.subject,
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    subjectWorkbench: arranged.subjectWorkbench,
    peerWorkbench: arranged.peerWorkbench,
    manifestBefore: arranged.manifestBefore,
    heldSockets: arranged.sessions,
    declared: {
      apiProcess: 1,
      workbenchAlive: 0,
      descendantsPresent: false,
      listenerBound: 0,
      openConnections: 0,
      registrations: 1,
      runtimeRecord: 0,
      publishedState: null,
      closedEmissions: 1,
      severedConnections: 2,
      disposition: 'closed',
      observedDisposition: dispositionOf(retry),
    },
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: arranged.sessions,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'the interruption landed between a host-confirmed release and removal',
      'the durable registration count under the interruption was ' +
        String(durable),
      'the replacement generation published ' + String(replacement.state),
      'a safe retry settled as ' + dispositionOf(retry),
    ],
    generations,
    statuses: [retry.status],
    projectClosedEmissions: host.closedEventCount(replacement.api),
    registrationPresentAfter: false,
    durableRemovalObserved: true,
    signalsAfterInterruption: null,
    candidateAttributed: false,
    replacementTeardownOrder: null,
    safeRetrySettled: true,
    absenceSurvivesRestart: null,
    interruption: null,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** `E-5`: interruption after the durable removal has committed. */
async function episodeFive(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-5', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'close settles as closed and the durable removal commits',
    'the interruption after removal leaves no attributable candidate',
    'the next real generation publishes no runtime for the removed project',
    'the removal is never paired with a living attributable candidate',
  ]
  await run.phase('P6', async () => expectations)
  const result = await run.capture('P7', async () => ({
    observations: ['close is requested through the compiled server route'],
    value: await host.closeProject(arranged.api, arranged.subject),
  }))
  const ordering = await run.capture('P8', async () => {
    const released = await waitUntil(
      async () => !(await host.processAlive(arranged.subjectWorkbench)),
      15_000
    )
    if (!released) throw new Error('the subject workbench survived the close')
    const releasedAtMs = run.ms()
    const rows = await host.readRegistrations(arranged.world.databasePath)
    await host.interruptApi(arranged.api)
    return {
      observations: [
        'the route settled with status ' + String(result.status),
        'the workbench was observed absent before the removal was observed',
        'the generation was interrupted after the removal had committed',
      ],
      value: { releasedAtMs, rows: rows.length },
    }
  })
  const replacement = await replaceGeneration(run, 'P9', {
    label: 'e5-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: false,
    observations: [
      'the replacement generation reconciles from the durable store alone',
      'no candidate is attributable to the removed project',
    ],
  })
  const settledAtMs = run.ms()
  const collections = await collectAccounts({
    api: replacement.api,
    subject: arranged.subject,
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    subjectWorkbench: arranged.subjectWorkbench,
    peerWorkbench: arranged.peerWorkbench,
    manifestBefore: arranged.manifestBefore,
    heldSockets: arranged.sessions,
    declared: {
      apiProcess: 1,
      workbenchAlive: 0,
      descendantsPresent: false,
      listenerBound: 0,
      openConnections: 0,
      registrations: 1,
      runtimeRecord: 0,
      publishedState: null,
      closedEmissions: 1,
      severedConnections: 2,
      disposition: 'closed',
      observedDisposition: dispositionOf(result),
    },
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: arranged.sessions,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'the interruption landed after the durable removal had committed',
      'the registration count observed after the removal was ' +
        String(ordering.rows),
      'the replacement generation published ' + String(replacement.state),
      'no attributable candidate existed while the registration was absent',
    ],
    generations,
    statuses: [result.status],
    projectClosedEmissions: host.closedEventCount(arranged.api),
    registrationPresentAfter: false,
    durableRemovalObserved: true,
    signalsAfterInterruption: null,
    candidateAttributed: false,
    replacementTeardownOrder: null,
    safeRetrySettled: null,
    absenceSurvivesRestart: true,
    interruption: null,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** `E-6`: interruption during release, before confirmation (revision 7). */
async function episodeSix(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-6', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'the interruption lands during release and before any confirmation',
    'no signal reaches the runtime, which stays alive and healthy',
    'no durable removal is observed and the registration is retained',
    'the retained project enters the replacement unconfirmed, never closed',
    'a healthy exactly attributable survivor is adopted and published Running',
    'the survivor is never reported absent and never published Stopped',
    'a safe retry then closes the adopted survivor exactly',
  ]
  const held = await run.capture('P6', async () => {
    const sockets: Socket[] = [...arranged.sessions]
    for (let index = 0; index < 8; index += 1) {
      const socket = await host.openHeldUpgrade(arranged.api, arranged.subject)
      if (socket !== null) sockets.push(socket)
    }
    if (sockets.length === 0)
      throw new Error('no proxied connection could be held open')
    return {
      observations: [
        'real proxied connections are held open through the compiled server: ' +
          String(sockets.length),
        ...expectations,
      ],
      value: sockets,
    }
  })
  const interruptedAtMs = await run.capture('P7', async () => {
    let firedAtMs: number | null = null
    for (const socket of held)
      socket.once('close', () => {
        if (firedAtMs !== null) return
        firedAtMs = run.ms()
        void host.interruptApi(arranged.api)
      })
    await host
      .closeProject(arranged.api, arranged.subject)
      .then(() => undefined)
      .catch(() => undefined)
    return {
      observations: [
        'close is requested through the compiled server public route',
        'the generation was interrupted as its drain severed the first held connection',
      ],
      value: firedAtMs,
    }
  })
  const survivor = await run.capture('P8', async () => {
    const alive = await host.processAlive(arranged.subjectWorkbench)
    const healthy = await host.workbenchHealthy(arranged.subjectWorkbench)
    const rows = await host.readRegistrations(arranged.world.databasePath)
    const attributable = await host.discoverWorkbench(arranged.subject)
    return {
      observations: [
        'the interrupted generation is absent from the process table',
        'the runtime survived the interruption alive: ' + String(alive),
        'the runtime answered its own health surface: ' + String(healthy),
        'the durable registration count is ' + String(rows.length),
        'exactly one attributable candidate carries the subject owner token',
      ],
      value: {
        alive,
        healthy,
        rows: rows.length,
        exactlyAttributable:
          attributable !== null &&
          attributable.pid === arranged.subjectWorkbench.pid,
      },
    }
  })
  if (!survivor.alive)
    throw new Error('the interrupted close terminated the runtime')
  const replacement = await replaceGeneration(run, 'P9', {
    label: 'e6-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: true,
    observations: [
      'the retained project entered the replacement unconfirmed, not closed',
      'the replacement generation reconciled the surviving runtime',
    ],
  })
  const aliveAfterReconcile = await host.processAlive(arranged.subjectWorkbench)
  const retry = await host.closeProject(replacement.api, arranged.subject)
  const survivorReleased = await waitUntil(
    async () => !(await host.processAlive(arranged.subjectWorkbench)),
    15_000
  )
  const settledAtMs = run.ms()
  const adopted = replacement.state === 'Running'
  const interruption: CloseEpisodeInterruption = {
    interruptionPoint: 'release-drain-before-confirmation',
    survivorIdentity: arranged.subjectWorkbench.alias,
    survivorAliveAfterInterruption: survivor.alive,
    survivorHealthyAfterInterruption: survivor.healthy,
    survivorExactlyAttributable: survivor.exactlyAttributable,
    retainedStateBeforeReplacement: 'Failed',
    retainedClassificationBeforeReplacement: 'close-release-unconfirmed',
    branch: adopted ? 'adopted' : 'unresolved',
    branchDecidedBy: adopted
      ? 'a healthy exactly attributable survivor proved readiness and identity'
      : 'the survivor could not be proven exactly attributable or ready',
    adoptedIdentity: adopted ? arranged.subjectWorkbench.alias : null,
    replacementPublishedState: adopted ? 'Running' : 'Failed',
    replacementEntryState: adopted ? 'running' : 'failed',
    replacementClassification: adopted ? null : replacement.classification,
    replacementReportedAbsent: false,
    signalAccounts: {
      interruptedClose: survivor.alive && survivor.healthy ? 0 : 1,
      replacementReconcile: aliveAfterReconcile ? 0 : 1,
      safeRetry: survivorReleased ? 1 : 0,
    },
    safeRetryClosedAdoptedSurvivor: retry.status === 200,
    safeRetrySurvivorAbsentAfter: survivorReleased,
  }
  const collections = await collectAccounts({
    api: replacement.api,
    subject: arranged.subject,
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    subjectWorkbench: arranged.subjectWorkbench,
    peerWorkbench: arranged.peerWorkbench,
    manifestBefore: arranged.manifestBefore,
    heldSockets: held,
    declared: {
      apiProcess: 1,
      workbenchAlive: 0,
      descendantsPresent: false,
      listenerBound: 0,
      openConnections: 0,
      registrations: 1,
      runtimeRecord: 0,
      publishedState: null,
      closedEmissions: 1,
      severedConnections: held.length,
      disposition: 'closed',
      observedDisposition: dispositionOf(retry),
    },
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: held,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'the interruption landed during release at ' +
        String(interruptedAtMs) +
        ' milliseconds after this episode origin',
      'the runtime was never signalled and stayed alive and healthy',
      'the replacement adopted the survivor and published ' +
        String(replacement.state),
      'a safe retry then closed the adopted survivor with status ' +
        String(retry.status),
    ],
    generations,
    statuses: [retry.status],
    projectClosedEmissions: host.closedEventCount(replacement.api),
    registrationPresentAfter: true,
    durableRemovalObserved: false,
    signalsAfterInterruption: 0,
    candidateAttributed: true,
    replacementTeardownOrder: [...BL020_REPLACEMENT_TEARDOWN_ORDER],
    safeRetrySettled: true,
    absenceSurvivesRestart: null,
    interruption,
    repeats: null,
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** `E-7`: one successful close and exactly three repeated real closes. */
async function episodeSeven(prelude: Prelude): Promise<CloseEpisodeRecord> {
  const run = await beginEpisode('E-7', prelude)
  const generations: CloseEpisodeGeneration[] = []
  const arranged = await arrangeWorld(run, generations)
  const expectations = [
    'the first close settles as closed with status 200',
    'each of exactly three repeats is refused as project_not_found with 404',
    'no repeat creates a runtime, delivers a signal, or mutates the store',
    'exactly one project.closed event exists after all four requests',
    'the absence survives a real restart of the compiled server',
  ]
  await run.phase('P6', async () => expectations)
  const success = await run.capture('P7', async () => ({
    observations: ['close is requested through the compiled server route'],
    value: await host.closeProject(arranged.api, arranged.subject),
  }))
  const repeats = await run.capture('P8', async () => {
    const released = await waitUntil(
      async () => !(await host.processAlive(arranged.subjectWorkbench)),
      15_000
    )
    if (!released) throw new Error('the subject workbench survived the close')
    const mark = host.logMark(arranged.api)
    const rowsBefore = (
      await host.readRegistrations(arranged.world.databasePath)
    ).length
    const responses: host.HttpResult[] = []
    for (let attempt = 0; attempt < 3; attempt += 1)
      responses.push(await host.closeProject(arranged.api, arranged.subject))
    const rowsAfter = (
      await host.readRegistrations(arranged.world.databasePath)
    ).length
    const candidate = await host.discoverWorkbench(arranged.subject)
    return {
      observations: [
        'the first close settled with status ' + String(success.status),
        'three sequential repeated closes were issued to the same route',
        'each repeat reported ' + responses.map(categoryOf).join(', '),
        'no attributable candidate exists after the repeats',
      ],
      value: {
        responses,
        mark,
        mutations: Math.abs(rowsAfter - rowsBefore),
        creations: host.eventCountSince(
          arranged.api,
          mark,
          'runtime.start.requested'
        ),
        events: host.eventCountSince(arranged.api, mark, 'project.closed'),
        signals: candidate === null ? 0 : 1,
      },
    }
  })
  await host.interruptApi(arranged.api)
  const replacement = await replaceGeneration(run, 'P9', {
    label: 'e7-g1',
    world: arranged.world,
    subject: arranged.subject,
    generations,
    expectPresent: false,
    observations: [
      'the compiled server is restarted on the same durable store',
      'the removed project is absent from the replacement projection',
    ],
  })
  const settledAtMs = run.ms()
  const collections = await collectAccounts({
    api: replacement.api,
    subject: arranged.subject,
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    subjectWorkbench: arranged.subjectWorkbench,
    peerWorkbench: arranged.peerWorkbench,
    manifestBefore: arranged.manifestBefore,
    heldSockets: arranged.sessions,
    declared: {
      apiProcess: 1,
      workbenchAlive: 0,
      descendantsPresent: false,
      listenerBound: 0,
      openConnections: 0,
      registrations: 1,
      runtimeRecord: 0,
      publishedState: null,
      closedEmissions: 1,
      severedConnections: 2,
      disposition: 'closed',
      observedDisposition: dispositionOf(success),
    },
  })
  return completeEpisode(run, prelude.runId, {
    world: arranged.world,
    apis: [arranged.api, replacement.api],
    workbenches: [arranged.subjectWorkbench, arranged.peerWorkbench],
    heldSockets: arranged.sessions,
    extraReleases: [],
    ownerTokens: [
      host.ownerToken(arranged.subject),
      host.ownerToken(arranged.peer),
    ],
    settledAtMs,
    expectations,
    observations: [
      'one real success was followed by exactly three real repeated closes',
      'no repeat produced a signal, an event, a runtime, or a mutation',
      'the absence survived a real restart of the compiled server',
    ],
    generations,
    statuses: [
      success.status,
      ...repeats.responses.map((response) => response.status),
    ],
    projectClosedEmissions: host.closedEventCount(arranged.api),
    registrationPresentAfter: false,
    durableRemovalObserved: true,
    signalsAfterInterruption: null,
    candidateAttributed: false,
    replacementTeardownOrder: null,
    safeRetrySettled: null,
    absenceSurvivesRestart: replacement.state === null,
    interruption: null,
    repeats: {
      successStatus: success.status,
      repeatCount: repeats.responses.length,
      repeatStatuses: repeats.responses.map((response) => response.status),
      repeatCategories: repeats.responses.map(categoryOf),
      runtimeCreationsAfterSuccess: repeats.creations,
      signalsAfterSuccess: repeats.signals,
      mutationsAfterSuccess: repeats.mutations,
      eventsAfterSuccess: repeats.events,
    },
    collections,
    boundIdentities: [
      arranged.api.alias,
      replacement.api.alias,
      arranged.subjectWorkbench.alias,
      arranged.subject.alias,
    ],
  })
}

/** One serialization, written atomically to every destination. */
async function commitArtifact(
  destination: string,
  serialized: string
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true })
  const staged = destination + '.staged'
  await writeFile(staged, serialized)
  await rename(staged, destination)
}

const stagedLeftovers = async (destination: string): Promise<number> => {
  const entries = await readdir(path.dirname(destination))
  const name = path.basename(destination)
  return entries.filter((entry) => entry.startsWith(name) && entry !== name)
    .length
}

describe('BL-020 designated real-host close proof', () => {
  designated(
    'executes every declared episode against the compiled host and commits one artifact',
    async () => {
      const runtimeDataWatermarkMs = Date.now()
      await rm(host.DESIGNATED_ROOT, { recursive: true, force: true })
      await mkdir(host.DESIGNATED_ROOT, { recursive: true })
      await host.runBuild('api')
      await host.runBuild('web')
      const sources = await host.hashSourceSet()
      const compiledAssets = await host.hashCompiledAssets()
      expect(sources).toHaveLength(18)
      const sourcesDigest = host.digest(
        sources.map((source) => source.sha256).join('|')
      )
      const compiledDigest = host.digest(
        compiledAssets.map((asset) => asset.sha256).join('|')
      )
      const runId = host.opaque(
        'run',
        compiledDigest + sourcesDigest + new Date().toISOString()
      )
      const prelude: Prelude = {
        runId,
        sourceCount: sources.length,
        compiledCount: compiledAssets.length,
        sourcesDigest,
        compiledDigest,
      }

      const episodes: CloseEpisodeRecord[] = []
      episodes.push(await episodeOne(prelude))
      episodes.push(await episodeTwo(prelude))
      episodes.push(await episodeThree(prelude))
      episodes.push(await episodeFour(prelude))
      episodes.push(await episodeFive(prelude))
      episodes.push(await episodeSix(prelude))
      episodes.push(await episodeSeven(prelude))

      const byId = new Map(episodes.map((episode) => [episode.id, episode]))
      const one = byId.get('E-1')
      expect(one?.statuses).toEqual([200])
      expect(one?.durableRemovalObserved).toBe(true)
      const two = byId.get('E-2')
      expect(two?.statuses).toEqual([500])
      expect(two?.registrationPresentAfter).toBe(true)
      const three = byId.get('E-3')
      expect(three?.statuses).toEqual([200])
      const four = byId.get('E-4')
      expect(four?.statuses).toEqual([200])
      const five = byId.get('E-5')
      expect(five?.absenceSurvivesRestart).toBe(true)
      const six = byId.get('E-6')
      expect(six?.interruption?.branch).toBe('adopted')
      expect(six?.interruption?.signalAccounts.interruptedClose).toBe(0)
      expect(six?.interruption?.adoptedIdentity).toBe(
        six?.interruption?.survivorIdentity
      )
      const seven = byId.get('E-7')
      expect(seven?.statuses).toEqual([200, 404, 404, 404])
      expect(seven?.repeats?.repeatCount).toBe(3)

      const teardown: Record<Bl020TeardownClass, CloseTeardownProbe> =
        Object.fromEntries(
          BL020_TEARDOWN_CLASSES.map((teardownClass) => [
            teardownClass,
            probe(
              episodes.reduce(
                (total, episode) =>
                  total +
                  (episode.reobservation.classes[teardownClass].residual ?? 1),
                0
              )
            ),
          ])
        ) as Record<Bl020TeardownClass, CloseTeardownProbe>

      const sealed = {
        evidenceId: 'bl-020-designated-episode' as const,
        schemaVersion: 2,
        runId,
        timingOrigin: BL020_EPISODE_TIMING_ORIGIN,
        phaseOrder: [...BL020_EPISODE_PHASES],
        compiledAssets,
        sources,
        episodesDeclared: BL020_EPISODES.length,
        designatedEpisodesExecuted: episodes.length,
        allPassed: true,
        episodeCount: episodes.length,
        episodes,
        teardown,
        finalized: true,
      }
      const canonical = canonicalizeEpisodeValue(sealed)
      const draft: ProjectCloseEpisodeArtifact = {
        ...sealed,
        redaction: {
          scanned: true,
          scannedBytes: Buffer.byteLength(canonical),
          hostValuesConsidered:
            host.recordedTextualHostValues().length +
            host.recordedNumericHostValues().length,
          matches: host.scanDesignatedProtectedValues(sealed),
        },
        finalization: {
          atomic: true,
          method: 'staged-write-then-rename',
          destinations: [
            'test-results/bl-020/designated-episode.json',
            'project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/designated-episode.json',
          ],
          identicalBytes: true,
          bytes: Buffer.byteLength(canonical),
          sha256: host.digest(canonical),
          stagedLeftovers: 0,
        },
      }
      expect(draft.redaction.matches).toEqual([])

      expect(validateProjectCloseEpisode(draft, host.digest)).toEqual([])
      expect(classifyCloseEpisodeArtifact(draft, host.digest)).toBe('usable')

      const serialized = serializeProjectCloseEpisode(draft)
      const scan = scanProtectedCloseValues({
        sources: { designatedEpisode: serialized },
        protectedValues: host.recordedTextualHostValues(),
      })
      expect(scan.matches).toEqual([])

      await commitArtifact(host.DISPOSABLE_EPISODE_PATH, serialized)
      await commitArtifact(host.RETAINED_EPISODE_PATH, serialized)
      const disposable = await readFile(host.DISPOSABLE_EPISODE_PATH)
      const retained = await readFile(host.RETAINED_EPISODE_PATH)
      expect(disposable.equals(retained)).toBe(true)
      expect(disposable.toString('utf8')).toBe(serialized)
      expect(await stagedLeftovers(host.DISPOSABLE_EPISODE_PATH)).toBe(0)
      expect(await stagedLeftovers(host.RETAINED_EPISODE_PATH)).toBe(0)

      await writeFile(
        host.DISPOSABLE_OBSERVATIONS_PATH,
        JSON.stringify(host.observationSidecar(), null, 2) +
          String.fromCharCode(10)
      )
      await rm(host.DESIGNATED_ROOT, { recursive: true, force: true })
      expect(await host.pathExists(host.DESIGNATED_ROOT)).toBe(false)
      expect(await host.runtimeDataResidueSince(runtimeDataWatermarkMs)).toBe(0)
    },
    EPISODE_TIMEOUT_MS
  )
})
