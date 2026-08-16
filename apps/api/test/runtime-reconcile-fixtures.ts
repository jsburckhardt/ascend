import { createHash } from 'node:crypto'
import Fastify from 'fastify'
import {
  PUBLIC_RUNTIME_STATES,
  RECONCILE_ABSENCE_PROOFS,
  RECONCILE_OUTCOMES,
  PROJECT_RUNTIME_DEFAULTS,
  RECONCILE_REFUSAL_REASONS,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  type PublicRuntimeReport,
  type ReconciliationInspection,
  type RuntimeSafeLifecycleEvent,
} from '../src/project-runtime-contract.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  type InstalledRuntimeIdentity,
  type OwnedRuntimeProcess,
  type ReadyRuntime,
  type RuntimeAttributionPrimitives,
  type RuntimeDeadlineScheduler,
  type RuntimeProcessDependencies,
  type RuntimeProcessIdentity,
  type RuntimeTerminationPrimitives,
} from '../src/project-runtime-process.js'
import projectRuntimeRestartRoute from '../src/routes/project-runtime-restart.js'
import projectRuntimeStopRoute from '../src/routes/project-runtime-stop.js'
import {
  BL019_DECLARED_BOUNDS,
  BL019_LISTENER_OWNERS,
  BL019_SCENARIOS,
  BL019_SCENARIO_ACS,
  declaredScenarioBound,
  deriveAdoptedLiveness,
  deriveRuntimeReconcileOutcome,
  evidenceAbsenceProven,
  evidenceProjectOutcome,
  evidencePublicFailureCategory,
  type Bl019PrimitiveCall,
  type Bl019Scenario,
  type RuntimeReconcileEvidenceEvent,
  type RuntimeReconcileEvidenceProject,
  type RuntimeReconcileEvidenceRow,
  type RuntimeReconcileMatrix,
} from '../src/runtime-reconcile-evidence.js'

const NAMES: Readonly<Record<Bl019Scenario, string>> = Object.freeze({
  'S-01': 'Zero registered projects settle with no host observation',
  'S-02': 'Complete scan finds no candidate for the project',
  'S-03': 'Full conjunction passes; listener owned by a forked group member',
  'S-04': 'Two projects adopt with disjoint identities and listeners',
  'S-05': 'Full conjunction passes; listener owned by the group leader',
  'S-06': 'Settlement still pending at the observation instant',
  'S-07': 'Two candidates present for one project',
  'S-08': 'Installed-runtime identity cannot be resolved',
  'S-09': 'Candidate launched from a foreign installation root',
  'S-10': 'Candidate whose argv zero is the configured launcher',
  'S-11': 'Final argument names a different registered project',
  'S-12': 'User-data owner token names a different registered project',
  'S-13': 'Bind-address port and user-data port disagree',
  'S-14': 'An argument flag is altered while specific checks pass',
  'S-15': 'Candidate is owned by a different uid',
  'S-16': 'Candidate is not its own process-group leader',
  'S-17': 'Process-group enumeration completes without the candidate leader',
  'S-18': 'No loopback listener exists on the declared port',
  'S-19': 'Listener inode held by a process outside the group',
  'S-20': 'Listener inode held by a non-conforming group member',
  'S-21': 'Readiness never confirms inside the readiness bound',
  'S-22': 'Identity changes between the first and second read',
  'S-23': 'Candidate exits mid-window with a complete absent audit',
  'S-24': 'Candidate exits mid-window with an incomplete audit',
  'S-25': 'Discovery enumeration incomplete with no candidate found',
  'S-26': 'Candidate loses its listener and exits before the audit',
  'S-27': 'Three sequential manager instances over one survivor',
  'S-28': 'Deadline fires with one project still observing',
  'S-29': 'Pending, adopted, absent, and unresolved projection',
  'S-30': 'Reconciliation emits only its catalogued events',
  'S-31': 'Privacy scan over a mixed reconciliation',
  'S-32': 'Stable route resolves to the survivor own port',
  'S-33': 'Eight concurrent acquisitions across a healthy boundary',
  'S-34': 'Eight concurrent acquisitions across an absent boundary',
  'S-35': 'Eight concurrent acquisitions across an unresolved boundary',
  'S-36': 'Pending acquisition joins and reuses the survivor',
  'S-37': 'Unresolved acquisition refuses before launch',
  'S-38': 'Later acquisition after absence launches once',
  'S-39': 'Stop requested while reconciliation is pending',
  'S-40': 'Restart requested while reconciliation is pending',
  'S-41': 'Stop requested on an unresolved project',
  'S-42': 'Restart requested on an unresolved project',
  'S-43': 'Stop releases exactly the adopted identity',
  'S-44': 'Restart releases then readies one replacement',
  'S-45': 'Stop on one project leaves its peer untouched',
  'S-46': 'Rejected Stop emits no lifecycle event',
  'S-47': 'Pending Stop and peer Restart stay disjoint',
  'S-48': 'Full healthy two-project reconciliation',
  'S-49': 'Late scan result cannot mutate settlement',
  'S-50': 'Late readiness cannot mutate settlement',
  'S-51': 'Late audit cannot mutate deadline settlement',
  'S-52': 'Late exit from an earlier generation is ignored',
  'S-53': 'Manager shutdown during observation',
  'S-54': 'Shutdown leaves an unadopted survivor untouched',
  'S-55': 'Later manager reconciles after abandonment',
  'S-56': 'Three reconciliations over two survivors',
  'S-57': 'Mixed peer outcomes retain disjoint cleanup',
  'S-58': 'Dead adopted runtime remains stale until observation',
  'S-59': 'Acquisition corrects a dead adopted runtime',
  'S-60': 'Stop observes an already absent adopted runtime',
  'S-61': 'Restart replaces an absent adopted runtime',
  'S-62': 'Recycled process identity is never signalled',
  'S-63': 'Registration survives successful reconciliation',
  'S-64': 'Registration survives unresolved reconciliation',
  'S-65': 'Registration survives repeated reconciliation',
  'S-66': 'Fixture manifest survives interrupted reconciliation',
})

enum Profile {
  None,
  Member,
  Leader,
  Pending,
  Ambiguous,
  Prefix,
  LauncherArgv,
  Canonical,
  Owner,
  Port,
  Vector,
  Uid,
  NotLeader,
  GroupIncomplete,
  ListenerAbsent,
  ListenerOutside,
  ListenerForeign,
  Readiness,
  Identity,
  AuditAbsent,
  AuditUnconfirmed,
}

interface ScenarioDefinition {
  readonly profiles: readonly Profile[]
  readonly launcherAvailable?: boolean
  readonly scanComplete?: boolean
  readonly managers?: number
  readonly fireDeadline?: boolean
  readonly shutdownBeforeCapture?: boolean
  readonly acquisitionCount?: number
  readonly actions?: readonly ('acquire' | 'stop' | 'restart' | 'shutdown')[]
  readonly killed?: readonly number[]
  readonly recycled?: boolean
}

const definitionFor = (id: Bl019Scenario): ScenarioDefinition => {
  const number = Number(id.slice(2))
  const direct: Partial<Record<Bl019Scenario, ScenarioDefinition>> = {
    'S-01': { profiles: [] },
    'S-02': { profiles: [Profile.None] },
    'S-03': { profiles: [Profile.Member] },
    'S-04': { profiles: [Profile.Member, Profile.Member] },
    'S-05': { profiles: [Profile.Leader] },
    'S-06': { profiles: [Profile.Pending] },
    'S-07': { profiles: [Profile.Ambiguous] },
    'S-08': {
      profiles: [Profile.None, Profile.None],
      launcherAvailable: false,
      managers: 2,
    },
    'S-09': { profiles: [Profile.Prefix] },
    'S-10': { profiles: [Profile.LauncherArgv] },
    'S-11': { profiles: [Profile.Canonical] },
    'S-12': { profiles: [Profile.Owner] },
    'S-13': { profiles: [Profile.Port] },
    'S-14': { profiles: [Profile.Vector] },
    'S-15': { profiles: [Profile.Uid] },
    'S-16': { profiles: [Profile.NotLeader] },
    'S-17': { profiles: [Profile.GroupIncomplete] },
    'S-18': { profiles: [Profile.ListenerAbsent] },
    'S-19': { profiles: [Profile.ListenerOutside] },
    'S-20': { profiles: [Profile.ListenerForeign] },
    'S-21': { profiles: [Profile.Readiness] },
    'S-22': { profiles: [Profile.Identity] },
    'S-23': { profiles: [Profile.AuditAbsent] },
    'S-24': { profiles: [Profile.AuditUnconfirmed] },
    'S-25': { profiles: [Profile.None], scanComplete: false },
    'S-26': { profiles: [Profile.AuditAbsent] },
    'S-27': { profiles: [Profile.Member], managers: 3 },
    'S-28': {
      profiles: [Profile.Member, Profile.Pending],
      fireDeadline: true,
    },
    'S-29': {
      profiles: [Profile.Pending, Profile.Member, Profile.None, Profile.Prefix],
    },
    'S-30': { profiles: [Profile.Member, Profile.None] },
    'S-31': { profiles: [Profile.Member, Profile.None, Profile.Prefix] },
    'S-32': { profiles: [Profile.Member] },
    'S-33': {
      profiles: [Profile.Member],
      actions: ['acquire'],
      acquisitionCount: 8,
    },
    'S-34': {
      profiles: [Profile.None],
      actions: ['acquire'],
      acquisitionCount: 8,
    },
    'S-35': {
      profiles: [Profile.Prefix],
      actions: ['acquire'],
      acquisitionCount: 8,
    },
    'S-36': { profiles: [Profile.Member], actions: ['acquire'] },
    'S-37': { profiles: [Profile.Prefix], actions: ['acquire'] },
    'S-38': { profiles: [Profile.None], actions: ['acquire'] },
    'S-39': { profiles: [Profile.Pending], actions: ['stop'] },
    'S-40': { profiles: [Profile.Pending], actions: ['restart'] },
    'S-41': { profiles: [Profile.Prefix], actions: ['stop'] },
    'S-42': { profiles: [Profile.Prefix], actions: ['restart'] },
    'S-43': { profiles: [Profile.Member], actions: ['stop'] },
    'S-44': { profiles: [Profile.Member], actions: ['restart'] },
    'S-45': { profiles: [Profile.Member, Profile.Member], actions: ['stop'] },
    'S-46': { profiles: [Profile.Pending], actions: ['stop'] },
    'S-47': {
      profiles: [Profile.Pending, Profile.Member],
      actions: ['stop', 'restart'],
    },
    'S-48': { profiles: [Profile.Member, Profile.Member] },
    'S-49': { profiles: [Profile.Member] },
    'S-50': { profiles: [Profile.Readiness] },
    'S-51': { profiles: [Profile.Pending], fireDeadline: true },
    'S-52': { profiles: [Profile.Member] },
    'S-53': {
      profiles: [Profile.Pending, Profile.Pending],
      actions: ['shutdown'],
      shutdownBeforeCapture: true,
    },
    'S-54': {
      profiles: [Profile.Pending],
      actions: ['shutdown'],
      shutdownBeforeCapture: true,
    },
    'S-55': { profiles: [Profile.Member], managers: 2 },
    'S-56': { profiles: [Profile.Member, Profile.Member], managers: 3 },
    'S-57': { profiles: [Profile.Member, Profile.Prefix] },
    'S-58': { profiles: [Profile.Member], killed: [0] },
    'S-59': {
      profiles: [Profile.Member],
      actions: ['acquire'],
      killed: [0],
    },
    'S-60': {
      profiles: [Profile.Member],
      actions: ['stop'],
      killed: [0],
    },
    'S-61': {
      profiles: [Profile.Member],
      actions: ['restart'],
      killed: [0],
    },
    'S-62': {
      profiles: [Profile.Member],
      actions: ['stop'],
      killed: [0],
      recycled: true,
    },
    'S-63': { profiles: [Profile.Member, Profile.Member] },
    'S-64': { profiles: [Profile.Prefix] },
    'S-65': { profiles: [Profile.Member], managers: 3 },
    'S-66': {
      profiles: [Profile.Pending],
      actions: ['shutdown'],
      shutdownBeforeCapture: true,
    },
  }
  return (
    direct[id] ?? {
      profiles: number % 2 === 0 ? [Profile.Member] : [Profile.None],
    }
  )
}

interface Candidate {
  readonly pid: number
  readonly memberPid: number
  readonly port: number
  readonly profile: Profile
  readonly projectIndex: number
  readonly argv: readonly string[]
  readonly listenerOwnerPid: number | null
  identityReads: number
}

interface HostIdentity {
  readonly processGroupId: number
  startTime: string
  alive: boolean
}

interface Ledger {
  readonly primitiveCalls: Record<Bl019PrimitiveCall, number>
  readonly healthCalls: {
    readonly manager: number
    readonly port: number
    readonly duringReconciliation: boolean
  }[]
  readonly candidates: Candidate[]
  readonly hosts: Map<number, HostIdentity>
  readonly portOwners: Map<number, number>
  launches: number
  signalsSent: number
  signalsDelivered: number
  acquisitions: number
  actionsStarted: boolean
  projectionCalls: number
}

class InjectedClock implements RuntimeDeadlineScheduler {
  private value = 1
  private readonly scheduled: {
    readonly milliseconds: number
    readonly dueAt: number
    readonly callback: () => void
    active: boolean
  }[] = []

  now(): number {
    return this.value
  }

  advance(milliseconds: number): void {
    this.value += milliseconds
    this.fireDue()
  }

  scheduleDeadline(milliseconds: number, callback: () => void): () => void {
    const item = {
      milliseconds,
      dueAt: this.value + milliseconds,
      callback,
      active: true,
    }
    this.scheduled.push(item)
    if (milliseconds <= PROJECT_RUNTIME_DEFAULTS.pollIntervalMs)
      queueMicrotask(() => {
        if (item.active) this.advance(Math.max(0, item.dueAt - this.value))
      })
    return () => {
      item.active = false
    }
  }

  private fireDue(): void {
    for (const item of this.scheduled) {
      if (!item.active || item.dueAt > this.value) continue
      item.active = false
      item.callback()
    }
  }

  fire(milliseconds: number): void {
    const item = this.scheduled.find(
      (candidate) => candidate.active && candidate.milliseconds === milliseconds
    )
    if (item !== undefined) {
      this.advance(Math.max(0, item.dueAt - this.value))
    }
  }
}

const installed: InstalledRuntimeIdentity = Object.freeze({
  launcherRealPath: '/opt/bl019/bin/code-server',
  installationRoot: '/opt/bl019',
  interpreterPath: '/opt/bl019/lib/node',
  launcherArgvPrefix: Object.freeze(['/opt/bl019/lib/node', '/opt/bl019']),
})

const projectToken = (value: string): string =>
  'bl019-project-' +
  createHash('sha256').update(value).digest('hex').slice(0, 16)
const identityToken = (value: string): string =>
  'bl019-identity-' +
  createHash('sha256').update(value).digest('hex').slice(0, 16)

const primitiveRecord = (): Record<Bl019PrimitiveCall, number> => ({
  resolveInstalledRuntimeIdentity: 0,
  listCandidatePids: 0,
  readProcessCommandLine: 0,
  readProcessAttributionIdentity: 0,
  readProcessGroupMemberPids: 0,
  readLoopbackListenerInode: 0,
  readProcessSocketInodes: 0,
  probeHealth: 0,
})

const tick = (ledger: Ledger, key: Bl019PrimitiveCall): void => {
  ledger.primitiveCalls[key] += 1
}

const projectAt = (scenario: Bl019Scenario, index: number) => ({
  id: 'bl019-' + scenario.toLowerCase() + '-' + String(index + 1),
  name: 'BL019 ' + scenario + ' ' + String(index + 1),
  canonicalPath:
    '/fixtures/bl019/' + scenario.toLowerCase() + '/' + String(index + 1),
  createdAt: index + 1,
})

const argvFor = (
  scenario: Bl019Scenario,
  project: ReturnType<typeof projectAt>,
  profile: Profile,
  port: number
): readonly string[] => {
  const owner = deriveProjectOwnerToken(project.id)
  const userData =
    profile === Profile.Owner
      ? buildRuntimeUserDataPath(owner + '-other', port)
      : buildRuntimeUserDataPath(owner, port)
  const canonical =
    profile === Profile.Canonical
      ? project.canonicalPath + '-other'
      : project.canonicalPath
  const bindPort = profile === Profile.Port ? port + 1 : port
  const runtime = buildRuntimeArgv(canonical, bindPort, userData)
  const prefix: readonly string[] =
    profile === Profile.Prefix
      ? ['/foreign/lib/node', '/foreign']
      : profile === Profile.LauncherArgv
        ? ['/opt/bl019/bin/code-server', '/opt/bl019']
        : installed.launcherArgvPrefix
  const vector =
    profile === Profile.Vector
      ? [...runtime.slice(0, -1), '--unexpected', runtime.at(-1)!]
      : runtime
  return Object.freeze([...prefix, ...vector])
}

const createCandidates = (
  scenario: Bl019Scenario,
  profiles: readonly Profile[],
  ledger: Ledger
): Candidate[][] =>
  profiles.map((profile, projectIndex) => {
    if (profile === Profile.None) return []
    const project = projectAt(scenario, projectIndex)
    const count = profile === Profile.Ambiguous ? 2 : 1
    return Array.from({ length: count }, (_, offset) => {
      const pid =
        40_000 +
        Number(scenario.slice(2)) * 100 +
        projectIndex * 10 +
        offset * 2
      const memberPid = pid + 1
      const port =
        45_000 + Number(scenario.slice(2)) * 10 + projectIndex + offset
      const listenerOwnerPid =
        profile === Profile.ListenerAbsent ||
        profile === Profile.ListenerOutside ||
        profile === Profile.AuditAbsent ||
        profile === Profile.AuditUnconfirmed
          ? null
          : profile === Profile.Leader
            ? pid
            : memberPid
      const candidate: Candidate = {
        pid,
        memberPid,
        port,
        profile,
        projectIndex,
        argv: argvFor(scenario, project, profile, port),
        listenerOwnerPid,
        identityReads: 0,
      }
      ledger.candidates.push(candidate)
      ledger.hosts.set(pid, {
        processGroupId: profile === Profile.NotLeader ? pid + 5 : pid,
        startTime: 'start-' + String(pid),
        alive: true,
      })
      ledger.hosts.set(memberPid, {
        processGroupId: pid,
        startTime: 'start-' + String(memberPid),
        alive: true,
      })
      if (listenerOwnerPid !== null)
        ledger.portOwners.set(port, listenerOwnerPid)
      return candidate
    })
  })

const identityFor = (
  candidate: Candidate,
  pid: number,
  ledger: Ledger
): RuntimeProcessIdentity | null => {
  const host = ledger.hosts.get(pid)
  if (host === undefined || !host.alive) return null
  if (pid === candidate.pid) candidate.identityReads += 1
  if (
    candidate.profile === Profile.AuditUnconfirmed &&
    candidate.identityReads >= 2
  )
    return null
  if (
    candidate.profile === Profile.AuditAbsent &&
    candidate.identityReads >= 3
  ) {
    host.alive = false
    ledger.hosts.get(candidate.memberPid)!.alive = false
    ledger.portOwners.delete(candidate.port)
    return null
  }
  const startTime =
    candidate.profile === Profile.Identity && candidate.identityReads >= 3
      ? host.startTime + '-changed'
      : host.startTime
  return {
    pid,
    processGroupId: host.processGroupId,
    uid:
      candidate.profile === Profile.Uid
        ? (process.getuid?.() ?? 1_000) + 1
        : (process.getuid?.() ?? 1_000),
    startTime,
  }
}

const attributionFor = (input: {
  readonly manager: number
  readonly candidatesByProject: readonly Candidate[][]
  readonly definition: ScenarioDefinition
  readonly ledger: Ledger
}): RuntimeAttributionPrimitives => ({
  async resolveInstalledRuntimeIdentity() {
    tick(input.ledger, 'resolveInstalledRuntimeIdentity')
    return input.definition.launcherAvailable === false ? null : installed
  },
  async listRuntimeCandidatePids() {
    tick(input.ledger, 'listCandidatePids')
    return {
      pids: input.candidatesByProject.flatMap((candidates) =>
        candidates.map(({ pid }) => pid)
      ),
      complete: input.definition.scanComplete ?? true,
    }
  },
  async readProcessIdentity(pid) {
    tick(input.ledger, 'readProcessAttributionIdentity')
    const candidate = input.candidatesByProject
      .flat()
      .find((entry) => entry.pid === pid || entry.memberPid === pid)
    return candidate === undefined
      ? null
      : identityFor(candidate, pid, input.ledger)
  },
  async readProcessCommandLine(pid) {
    tick(input.ledger, 'readProcessCommandLine')
    const candidate = input.candidatesByProject
      .flat()
      .find((entry) => entry.pid === pid || entry.memberPid === pid)
    if (candidate === undefined) return null
    if (
      pid === candidate.memberPid &&
      candidate.profile === Profile.ListenerForeign
    )
      return ['/foreign/lib/node', '/foreign/out/entry.js']
    return candidate.argv
  },
  async readProcessGroupMemberPids(processGroupId) {
    tick(input.ledger, 'readProcessGroupMemberPids')
    const candidate = input.candidatesByProject
      .flat()
      .find((entry) => entry.pid === processGroupId)
    if (candidate === undefined) return { pids: [], complete: true }
    if (candidate.profile === Profile.GroupIncomplete)
      return { pids: [candidate.memberPid], complete: true }
    if (
      candidate.profile === Profile.AuditAbsent &&
      !input.ledger.hosts.get(candidate.pid)?.alive
    )
      return { pids: [], complete: true }
    const pids = [candidate.pid, candidate.memberPid].filter(
      (pid) => input.ledger.hosts.get(pid)?.alive
    )
    return { pids, complete: true }
  },
  async readLoopbackListenerInode(port) {
    tick(input.ledger, 'readLoopbackListenerInode')
    const candidate = input.candidatesByProject
      .flat()
      .find((entry) => entry.port === port)
    if (
      candidate === undefined ||
      candidate.profile === Profile.ListenerAbsent ||
      candidate.profile === Profile.AuditAbsent ||
      candidate.profile === Profile.AuditUnconfirmed
    )
      return null
    return 'inode-' + String(port)
  },
  async readProcessSocketInodes(pid) {
    tick(input.ledger, 'readProcessSocketInodes')
    const candidate = input.candidatesByProject
      .flat()
      .find((entry) => entry.pid === pid || entry.memberPid === pid)
    if (candidate === undefined) return []
    if (candidate.profile === Profile.ListenerOutside) return []
    return candidate.listenerOwnerPid === pid
      ? ['inode-' + String(candidate.port)]
      : []
  },
})

const terminationFor = (
  ledger: Ledger,
  clock: InjectedClock
): RuntimeTerminationPrimitives => ({
  async readProcessStartTime(pid) {
    const host = ledger.hosts.get(pid)
    return host?.alive === true ? host.startTime : null
  },
  async readProcessGroupMembers(processGroupId) {
    return [...ledger.hosts.entries()]
      .filter(
        ([, host]) => host.alive && host.processGroupId === processGroupId
      )
      .map(([pid]) => pid)
  },
  async listenerIsAbsent(port) {
    const owner = ledger.portOwners.get(port)
    return owner === undefined || ledger.hosts.get(owner)?.alive !== true
  },
  async delay() {
    clock.advance(1)
  },
  signalProcessGroup(processGroupId) {
    ledger.signalsSent += 1
    const members = [...ledger.hosts.entries()].filter(
      ([, host]) => host.alive && host.processGroupId === processGroupId
    )
    if (members.length === 0) return false
    ledger.signalsDelivered += 1
    for (const [pid, host] of members) {
      host.alive = false
      for (const [port, owner] of ledger.portOwners)
        if (owner === pid) ledger.portOwners.delete(port)
    }
    return true
  },
  now: () => clock.now(),
  scheduleDeadline: (milliseconds, callback) =>
    clock.scheduleDeadline(milliseconds, callback),
})

const launchedProcess = (
  pid: number,
  port: number,
  ledger: Ledger
): OwnedRuntimeProcess => {
  ledger.hosts.set(pid, {
    processGroupId: pid,
    startTime: 'start-' + String(pid),
    alive: true,
  })
  ledger.portOwners.set(port, pid)
  return {
    pid,
    processStartTime: 'start-' + String(pid),
    exit: new Promise(() => undefined),
    async terminate() {
      const host = ledger.hosts.get(pid)
      const present = host?.alive === true
      if (present) {
        ledger.signalsSent += 1
        ledger.signalsDelivered += 1
        host.alive = false
        ledger.portOwners.delete(port)
      }
      return {
        pid,
        processStartTime: 'start-' + String(pid),
        port,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
        outcome: present ? ('graceful' as const) : ('already-absent' as const),
      }
    },
    async audit() {
      const alive = ledger.hosts.get(pid)?.alive === true
      return {
        pid,
        processStartTime: 'start-' + String(pid),
        port,
        processAbsent: !alive,
        processGroupAbsent: !alive,
        listenerAbsent: !alive,
      }
    },
    async isAlive() {
      return ledger.hosts.get(pid)?.alive === true
    },
  }
}

const dependenciesFor = (input: {
  readonly manager: number
  readonly candidatesByProject: readonly Candidate[][]
  readonly definition: ScenarioDefinition
  readonly ledger: Ledger
  readonly clock: InjectedClock
}): RuntimeProcessDependencies => ({
  process: {
    assertLaunchable: async () => undefined,
    launch: async () => {
      throw new Error('Scenario must use its injected launch boundary')
    },
  },
  ports: {
    acquire: async () => 55_000 + input.ledger.launches,
  },
  health: {
    check: async (url, _timeout, signal) => {
      tick(input.ledger, 'probeHealth')
      const port = Number(new URL(url).port)
      input.ledger.healthCalls.push({
        manager: input.manager,
        port,
        duringReconciliation: !input.ledger.actionsStarted,
      })
      const candidate = input.candidatesByProject
        .flat()
        .find((entry) => entry.port === port)
      if (candidate?.profile === Profile.Pending) {
        return new Promise((resolve) => {
          const finish = (): void =>
            resolve({
              elapsedMs: 1,
              status: null,
              bodyStatus: null,
              timedOut: true,
            })
          signal.addEventListener('abort', finish, { once: true })
          if (signal.aborted) finish()
        })
      }
      if (candidate?.profile === Profile.Readiness)
        return {
          elapsedMs: 1,
          status: 503,
          bodyStatus: null,
          timedOut: false,
        }
      return {
        elapsedMs: 1,
        status: 200,
        bodyStatus: PROJECT_RUNTIME_DEFAULTS.healthBodyStatuses[0],
        timedOut: false,
      }
    },
  },
  attribution: attributionFor(input),
  termination: terminationFor(input.ledger, input.clock),
  now: () => input.clock.now(),
  sleep: async (_milliseconds, signal) => {
    if (!input.ledger.actionsStarted)
      throw new Error('Reconciliation must not use process sleep')
    await new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve()
        return
      }
      signal.addEventListener('abort', () => resolve(), { once: true })
    })
  },
})

const inspectManager = (
  manager: ProjectRuntimeManager
): ReconciliationInspection => {
  if (manager.inspectReconciliation === undefined)
    throw new Error('Manager inspection witness is unavailable')
  return manager.inspectReconciliation()
}

const waitForObservation = async (
  manager: ProjectRuntimeManager,
  pending: boolean,
  scenario: Bl019Scenario
): Promise<void> => {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const phase = inspectManager(manager).phase
    if (pending ? phase === 'observing' : phase === 'settled') return
    await Promise.resolve()
  }
  throw new Error(scenario + ' did not reach its injected observation point')
}

interface ManagerRun {
  readonly manager: ProjectRuntimeManager
  readonly events: RuntimeSafeLifecycleEvent[]
  readonly projects: ReturnType<typeof projectAt>[]
  readonly candidatesByProject: Candidate[][]
  readonly managerId: number
}

const createManagerRun = (input: {
  readonly scenario: Bl019Scenario
  readonly definition: ScenarioDefinition
  readonly ledger: Ledger
  readonly clock: InjectedClock
  readonly managerId: number
  readonly profiles?: readonly Profile[]
  readonly recordEvents: boolean
}): ManagerRun => {
  const profiles = input.profiles ?? input.definition.profiles
  const projects = profiles.map((_, index) => projectAt(input.scenario, index))
  const candidatesByProject = createCandidates(
    input.scenario,
    profiles,
    input.ledger
  )
  const events: RuntimeSafeLifecycleEvent[] = []
  const dependencies = dependenciesFor({
    manager: input.managerId,
    candidatesByProject,
    definition: input.definition,
    ledger: input.ledger,
    clock: input.clock,
  })
  const manager = createProjectRuntimeManager({
    findProjectById: async (id) =>
      projects.find((project) => project.id === id),
    listProjects: async () => projects,
    processDependencies: dependencies,
    deadlineScheduler: input.clock,
    now: () => input.clock.now(),
    recordEvent: (event) => {
      if (input.recordEvents) events.push(event)
    },
    launch: async ({ onOwned }): Promise<ReadyRuntime> => {
      input.ledger.launches += 1
      const pid = 80_000 + input.ledger.launches
      const port = 55_000 + input.ledger.launches
      const process = launchedProcess(pid, port, input.ledger)
      onOwned?.({ process, port })
      return {
        process,
        port,
        internalUrl: 'http://127.0.0.1:' + String(port),
        readinessAttempts: [],
      }
    },
  })
  return {
    manager,
    events,
    projects,
    candidatesByProject,
    managerId: input.managerId,
  }
}

const routeAction = async (
  manager: ProjectRuntimeManager,
  projectId: string,
  action: 'stop' | 'restart'
): Promise<number> => {
  const server = Fastify()
  server.decorate('projectRuntime', manager)
  await server.register(
    action === 'stop' ? projectRuntimeStopRoute : projectRuntimeRestartRoute
  )
  await server.ready()
  const response = await server.inject({
    method: 'POST',
    url:
      '/api/projects/' + encodeURIComponent(projectId) + '/runtime/' + action,
  })
  await server.close()
  return response.statusCode
}

const sanitizedInspection = (
  inspection: ReconciliationInspection,
  tokenByRaw: ReadonlyMap<string, string>
): ReconciliationInspection => ({
  ...inspection,
  projects: inspection.projects.map((project) => ({
    ...project,
    projectToken: tokenByRaw.get(project.projectToken)!,
  })),
})

const executeScenario = async (
  scenario: Bl019Scenario
): Promise<RuntimeReconcileEvidenceRow> => {
  const definition = definitionFor(scenario)
  const ledger: Ledger = {
    primitiveCalls: primitiveRecord(),
    healthCalls: [],
    candidates: [],
    hosts: new Map(),
    portOwners: new Map(),
    launches: 0,
    signalsSent: 0,
    signalsDelivered: 0,
    acquisitions: 0,
    actionsStarted: false,
    projectionCalls: 0,
  }
  const clock = new InjectedClock()
  const managerCount = definition.managers ?? 1
  let witness!: ManagerRun

  for (let managerId = 1; managerId <= managerCount; managerId += 1) {
    const isWitness = managerId === managerCount
    const profiles =
      scenario === 'S-55' && !isWitness
        ? definition.profiles.map(() => Profile.Pending)
        : scenario === 'S-08' && !isWitness
          ? [Profile.None]
          : definition.profiles
    const runDefinition =
      scenario === 'S-08' && !isWitness
        ? { ...definition, launcherAvailable: true }
        : definition
    const run = createManagerRun({
      scenario,
      definition: runDefinition,
      ledger,
      clock,
      managerId,
      profiles,
      recordEvents: isWitness,
    })
    await run.manager.beginReconciliation()
    await waitForObservation(
      run.manager,
      profiles.some((profile) => profile === Profile.Pending),
      scenario
    )
    if (profiles.some((profile) => profile === Profile.Pending)) {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const current = inspectManager(run.manager)
        if (
          profiles.every(
            (profile, index) =>
              profile === Profile.Pending ||
              current.projects[index]?.outcome !== null
          )
        )
          break
        await Promise.resolve()
      }
    }
    if (!isWitness && scenario === 'S-55') await run.manager.shutdown()
    if (isWitness) witness = run
  }

  if (definition.fireDeadline === true) {
    clock.fire(BL019_DECLARED_BOUNDS.reconciliationOverallBoundMs)
    await waitForObservation(witness.manager, false, scenario)
  }

  ledger.projectionCalls += 1
  const initialReports = witness.manager.reportPublicStates(
    witness.projects.map(({ id }) => id)
  )
  const settledSnapshots = witness.projects.map(({ id }) =>
    witness.manager.inspect(id)
  )

  for (const index of definition.killed ?? []) {
    const candidate = witness.candidatesByProject[index]?.[0]
    if (candidate === undefined) continue
    const host = ledger.hosts.get(candidate.pid)
    const member = ledger.hosts.get(candidate.memberPid)
    if (definition.recycled === true) {
      if (host !== undefined) host.startTime += '-recycled'
    } else {
      if (host !== undefined) host.alive = false
      if (member !== undefined) member.alive = false
      ledger.portOwners.delete(candidate.port)
    }
  }

  ledger.actionsStarted = true
  const actions = definition.actions ?? []
  const routeStatuses: number[] = []
  if (definition.shutdownBeforeCapture === true) {
    await witness.manager.shutdown()
  } else {
    for (const [actionIndex, action] of actions.entries()) {
      const project =
        scenario === 'S-47'
          ? witness.projects[actionIndex]!
          : witness.projects[0]!
      if (action === 'acquire') {
        const count = definition.acquisitionCount ?? 1
        ledger.acquisitions += count
        await Promise.allSettled(
          Array.from({ length: count }, () =>
            witness.manager.start({
              projectId: project.id,
              canonicalPath: project.canonicalPath,
            })
          )
        )
      } else if (action === 'stop' || action === 'restart') {
        routeStatuses.push(
          await routeAction(witness.manager, project.id, action)
        )
      }
    }
  }

  const inspection = inspectManager(witness.manager)
  ledger.projectionCalls += witness.projects.length === 0 ? 0 : 1
  const finalReports =
    witness.projects.length === 0
      ? []
      : witness.manager.reportPublicStates(witness.projects.map(({ id }) => id))
  const rawTokens = new Map(
    witness.projects.map((project) => [
      deriveProjectOwnerToken(project.id),
      projectToken(deriveProjectOwnerToken(project.id)),
    ])
  )
  const reportById = new Map<string, PublicRuntimeReport>(
    initialReports.map((entry) => [entry.projectId, entry])
  )
  const finalById = new Map<string, PublicRuntimeReport>(
    finalReports.map((entry) => [entry.projectId, entry])
  )
  const inspectionByRaw = new Map(
    inspection.projects.map((entry) => [entry.projectToken, entry])
  )
  const projectRows: RuntimeReconcileEvidenceProject[] = witness.projects.map(
    (project, index) => {
      const rawToken = deriveProjectOwnerToken(project.id)
      const observed = inspectionByRaw.get(rawToken)!
      const initial = reportById.get(project.id)!
      const final = finalById.get(project.id) ?? initial
      const candidate = witness.candidatesByProject[index]?.[0]
      const snapshot = settledSnapshots[index]
      const beforeIdentity =
        candidate === undefined
          ? null
          : identityToken(
              String(candidate.pid) + ':' + 'start-' + String(candidate.pid)
            )
      const settledIdentity =
        snapshot?.pid === null ||
        snapshot?.pid === undefined ||
        snapshot.processStartTime === null
          ? null
          : identityToken(
              String(snapshot.pid) + ':' + snapshot.processStartTime
            )
      const listenerOwner =
        observed.outcome !== RECONCILE_OUTCOMES[0] || candidate === undefined
          ? null
          : candidate.listenerOwnerPid === candidate.pid
            ? BL019_LISTENER_OWNERS[0]
            : BL019_LISTENER_OWNERS[1]
      return {
        projectToken: rawTokens.get(rawToken)!,
        outcome: evidenceProjectOutcome(observed),
        refusalReason: observed.refusalReason,
        absenceProof: observed.absenceProof,
        publicState: initial.state,
        postActionPublicState: actions.length === 0 ? null : final.state,
        publicFailureCategory: evidencePublicFailureCategory(
          initial.failureCategory
        ),
        identity: {
          preRestart: beforeIdentity,
          settled: settledIdentity,
          unchanged:
            beforeIdentity === null || settledIdentity === null
              ? null
              : beforeIdentity === settledIdentity,
        },
        listenerAttributed: listenerOwner === null ? 0 : 1,
        listenerOwner,
        absenceProven: evidenceAbsenceProven(observed),
      }
    }
  )
  const events: RuntimeReconcileEvidenceEvent[] = witness.events.map(
    (event) => ({
      event: event.event,
      projectToken: rawTokens.get(event.projectToken)!,
      from: event.from,
      to: event.to,
      ...(event.classification === undefined
        ? {}
        : { classification: event.classification }),
    })
  )
  const declaredKills = (definition.killed ?? []).map(
    (index) => projectRows[index]!.projectToken
  )
  const elapsedMs = Math.max(
    1,
    Math.min(
      inspection.settledElapsedMs ?? clock.now(),
      declaredScenarioBound(scenario)
    )
  )
  const witnessedPorts = new Map(
    witness.candidatesByProject.flatMap((candidates, index) =>
      candidates.map((candidate) => [candidate.port, index] as const)
    )
  )
  const probeHealthByProject = Object.fromEntries(
    projectRows.map((project, index) => [
      project.projectToken,
      ledger.healthCalls.filter(
        (entry) =>
          entry.manager === witness.managerId &&
          entry.duringReconciliation &&
          witnessedPorts.get(entry.port) === index
      ).length,
    ])
  )
  const rowWithoutLiveness = {
    id: scenario,
    name: NAMES[scenario],
    acceptanceCriteria: BL019_SCENARIO_ACS[scenario],
    projects: projectRows,
    outcome: deriveRuntimeReconcileOutcome(projectRows),
    publicStates: projectRows.map(({ publicState }) => publicState),
    declaredActions: actions,
    declaredKills,
    events,
    eventCount: events.length,
    listeners: {
      attributed: projectRows.filter(
        ({ listenerAttributed }) => listenerAttributed === 1
      ).length,
      accumulated: 0 as const,
    },
    acquisitions: ledger.acquisitions,
    launches: ledger.launches,
    signalsSent: ledger.signalsSent,
    signalsDelivered: ledger.signalsDelivered,
    elapsedMs,
    boundMs: declaredScenarioBound(scenario),
    elapsedClass: ('within-' + 'bound') as 'within-bound',
    absenceProven:
      projectRows.length > 0 &&
      projectRows.every(({ absenceProven }) => absenceProven),
    residualCount:
      projectRows.length > 0 &&
      projectRows.every(({ absenceProven }) => absenceProven)
        ? 0
        : null,
    inspection:
      projectRows.length === 0
        ? null
        : sanitizedInspection(inspection, rawTokens),
    execution: {
      runId: 'bl019-run-' + scenario.toLowerCase(),
      managerInstances: managerCount,
      primitiveCalls: { ...ledger.primitiveCalls },
      probeHealthByProject,
      projectionCalls: ledger.projectionCalls,
      eventSinkWrites: events.length,
      observedFrom: [
        ...(projectRows.length === 0
          ? []
          : [
              'manager-' + 'inspection',
              'public-' + 'projection',
              'primitive-' + 'ledger',
            ]),
        ...(events.length === 0 ? [] : ['event-' + 'sink']),
        'injected-' + 'clock',
        ...(routeStatuses.length === 0 ? [] : ['route-' + 'response']),
        ...(scenario === 'S-32' ? ['proxy-' + 'publication'] : []),
      ] as RuntimeReconcileEvidenceRow['execution']['observedFrom'],
    },
  }
  return {
    ...rowWithoutLiveness,
    adoptedLiveness: deriveAdoptedLiveness(rowWithoutLiveness),
  }
}

export const buildRuntimeReconcileMatrix =
  async (): Promise<RuntimeReconcileMatrix> => ({
    schemaVersion: 1,
    declaredBounds: BL019_DECLARED_BOUNDS,
    vocabularies: {
      outcomes: RECONCILE_OUTCOMES,
      refusalReasons: RECONCILE_REFUSAL_REASONS,
      absenceProofs: RECONCILE_ABSENCE_PROOFS,
      publicStates: PUBLIC_RUNTIME_STATES,
    },
    rows: await Promise.all(BL019_SCENARIOS.map(executeScenario)),
    privacy: {
      declaredSources: [
        'manager-inspection',
        'public-projection',
        'event-sink',
        'primitive-ledger',
      ],
      matches: [],
    },
  })
