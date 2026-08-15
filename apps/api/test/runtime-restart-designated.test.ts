import { execFile, spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer, connect, type Socket } from 'node:net'
import path from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { createProjectLibrary } from '../src/project-library.js'
import { createProjectRuntimeConfig } from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  loopbackListenerIsAbsent,
  readProcessGroupMembers,
  readProcessStartTime,
} from '../src/project-runtime-process.js'
import {
  readManagedListeners,
  readManagedProcesses,
} from '../src/workbench-proof-audit.js'
import {
  BL001_FIXTURE,
  CODE_SERVER_PATH,
  CODE_SERVER_VERSION,
  canonicalFixturePath,
  snapshotFixture,
} from '../src/workbench-proof-contract.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

const executeFile = promisify(execFile)

// The strongest claim this single real-host episode makes. Absence is proven
// for the exact recorded identities of every generation this episode released,
// for each generation's owned process group, and for each generation's loopback
// listener. No claim is made about descendants that left an owned group before
// its closure was recorded, nor about deadline, admission, quarantine, or
// collision behaviour, which are proven only in the deterministic matrix.
const ATTRIBUTION_CEILING =
  'Absence is proven for the exact recorded root identity and every owned process-group member identity of each released generation, recorded immediately before that generation was released, together with that generation owned process group and loopback listener. Descendants that left an owned group before its closure was recorded are outside this episode.'

// The episode reports what it observed in-process; the separate residual audit
// re-probes the same recorded identities out of process and is the authority
// for late closure.
const PROOF_SPLIT =
  'This episode is in-process and self-reported. The separate residual-audit command re-probes the exact recorded identities from another process and is the authority for late process, owned-group, and listener closure.'

// Deliberately recorded: a replacement is a new process with a new listener, so
// connections held against a released generation end. No session, editor, or
// terminal continuity across a restart is claimed anywhere in this episode.
const CONTINUITY_STATEMENT =
  'No session continuity across a restart is claimed. A restart replaces the runtime process and its listener, and connections held against the released generation are severed.'

interface RecordedIdentity {
  readonly pid: number
  readonly processStartTime: string
}

interface RecordedGeneration {
  readonly root: RecordedIdentity
  readonly members: readonly RecordedIdentity[]
  readonly processGroupId: number
  readonly listenerPort: number
}

const recordIdentity = async (pid: number): Promise<RecordedIdentity> => {
  let startTime = await readProcessStartTime(pid)
  for (let attempt = 0; startTime === null && attempt < 20; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    startTime = await readProcessStartTime(pid)
  }
  if (startTime === null) throw new Error('Process identity unavailable')
  return { pid, processStartTime: startTime }
}

const identityAbsent = async (identity: RecordedIdentity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) !== identity.processStartTime

const recordGeneration = async (
  pid: number,
  port: number
): Promise<RecordedGeneration> => {
  const owned = await readManagedProcesses(pid)
  const listeners = await readManagedListeners(owned.map((row) => row.pid))
  const ownedListener = listeners.find(
    (listener) => listener.address === '127.0.0.1' && listener.port === port
  )
  expect(ownedListener?.inode ?? '').not.toBe('')
  const memberPids = await readProcessGroupMembers(pid)
  expect(memberPids).toContain(pid)
  const members: RecordedIdentity[] = []
  for (const memberPid of memberPids)
    members.push(await recordIdentity(memberPid))
  expect(members.length).toBeGreaterThan(0)
  return {
    root: await recordIdentity(pid),
    members,
    processGroupId: pid,
    listenerPort: port,
  }
}

const generationAbsent = async (
  generation: RecordedGeneration
): Promise<void> => {
  const memberAbsence = await Promise.all(
    generation.members.map(identityAbsent)
  )
  expect(memberAbsence.filter((absent) => !absent)).toHaveLength(0)
  expect(await identityAbsent(generation.root)).toBe(true)
  expect(await readProcessGroupMembers(generation.processGroupId)).toHaveLength(
    0
  )
  expect(await loopbackListenerIsAbsent(generation.listenerPort)).toBe(true)
}

interface HeldConnection {
  readonly socket: Socket
  /** Resolves with the first bytes the released generation served. */
  readonly firstResponse: Promise<string>
  /** Resolves when the peer closed the connection. */
  readonly closed: Promise<void>
}

/**
 * Opens one real loopback connection to a generation's own listener and holds
 * it. The readable side is consumed so end-of-stream is observed rather than
 * left paused.
 */
const holdConnection = async (
  port: number,
  request: string
): Promise<HeldConnection> => {
  const socket = connect({ host: '127.0.0.1', port })
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
  })
  let deliver!: (value: string) => void
  const firstResponse = new Promise<string>((resolve) => {
    deliver = resolve
  })
  socket.on('data', (chunk: Buffer) => deliver(chunk.toString('utf8')))
  const closed = new Promise<void>((resolve) => {
    socket.once('close', () => resolve())
  })
  socket.write(request)
  return { socket, firstResponse, closed }
}

describe('designated real runtime restart', () => {
  const designated = process.env.BL018_DESIGNATED === '1' ? it : it.skip

  const runDesignated = async (): Promise<void> => {
    expect(process.getuid?.()).toBe(1000)
    const version = (await executeFile(CODE_SERVER_PATH, ['--version'])).stdout
    expect(version.split(' ')[0]).toBe(CODE_SERVER_VERSION)
    const canonicalPath = await canonicalFixturePath()
    expect(canonicalPath).toBe(BL001_FIXTURE)
    const fixtureBefore = await snapshotFixture()

    const controlListener = createServer()
    await new Promise<void>((resolve, reject) => {
      controlListener.once('error', reject)
      controlListener.listen(0, '127.0.0.1', resolve)
    })
    const control = spawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { detached: true, stdio: 'ignore' }
    )
    control.unref()
    const controlPid = control.pid
    if (controlPid === undefined)
      throw new Error('Control process identity unavailable')
    const controlIdentity = await recordIdentity(controlPid)

    const context = await allocateDatabaseTestContext('bl018-designated')
    const library = await createProjectLibrary(context.databasePath)
    const project = {
      id: 'bl-018-designated-project',
      name: 'BL-018 Designated Fixture',
      canonicalPath,
      createdAt: 1_700_000_000_000,
    }
    expect((await library.create(project)).disposition).toBe('created')
    const registrationBefore = await library.findById(project.id)

    const events: { event: string }[] = []
    const manager = createProjectRuntimeManager({
      findProjectById: async (id) =>
        id === project.id ? await library.findById(id) : undefined,
      config: createProjectRuntimeConfig({
        executablePath: CODE_SERVER_PATH,
        expectedUser: 'vscode',
      }),
      recordEvent: (event) => events.push(event as { event: string }),
    })

    const sequence: RecordedGeneration[] = []
    const staleConnections: {
      transport: 'http' | 'websocket'
      listenerPort: number
    }[] = []
    try {
      const started = await manager.start({
        projectId: project.id,
        canonicalPath,
      })
      expect(started.state).toBe('running')
      const priorPort = started.port ?? -1
      const priorPid = started.pid ?? -1
      expect(priorPid).toBeGreaterThan(0)
      expect(priorPort).toBeGreaterThan(0)
      const prior = await recordGeneration(priorPid, priorPort)
      expect(prior.root.processStartTime).toBe(started.processStartTime)

      // Two real connections held against the prior generation: a plain HTTP
      // request and a WebSocket upgrade request, both through the loopback
      // listener the manager owns.
      const stableRoute = '/workbench/' + project.id + '/'
      const httpConnection = await holdConnection(
        priorPort,
        'GET ' +
          stableRoute +
          ' HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n'
      )
      const socketConnection = await holdConnection(
        priorPort,
        'GET ' +
          stableRoute +
          ' HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: YmwtMDE4LWRlc2lnbmF0ZWQ=\r\nSec-WebSocket-Version: 13\r\n\r\n'
      )
      // Both connections were served by the released generation before the
      // first restart: a plain request and a completed WebSocket handshake.
      expect(await httpConnection.firstResponse).toContain('HTTP/1.1')
      expect(await socketConnection.firstResponse).toContain(
        '101 Switching Protocols'
      )
      staleConnections.push(
        { transport: 'http', listenerPort: priorPort },
        { transport: 'websocket', listenerPort: priorPort }
      )

      let released = prior
      for (let round = 0; round < 3; round += 1) {
        const outcome = await manager.restart({ projectId: project.id })
        expect(outcome.outcome).toBe('restarted')
        if (outcome.outcome !== 'restarted')
          throw new Error('restart did not restart')
        expect(outcome.priorIdentity).toEqual({
          pid: released.root.pid,
          processStartTime: released.root.processStartTime,
          port: released.listenerPort,
        })
        expect(outcome.audit).toMatchObject({
          pid: released.root.pid,
          processStartTime: released.root.processStartTime,
          port: released.listenerPort,
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        })
        expect(['graceful', 'escalated']).toContain(outcome.release)
        await generationAbsent(released)

        const replacement = outcome.replacementIdentity
        expect(replacement.pid).not.toBe(released.root.pid)
        const generation = await recordGeneration(
          replacement.pid,
          replacement.port
        )
        expect(generation.root.processStartTime).toBe(
          replacement.processStartTime
        )
        sequence.push(generation)
        released = generation
        expect(manager.reportPublicStates([project.id])).toEqual([
          { projectId: project.id, state: 'Running' },
        ])
      }

      // Connections held against the released prior generation ended when its
      // listener did. Nothing here claims continuity for them.
      await httpConnection.closed
      await socketConnection.closed
      expect(httpConnection.socket.destroyed).toBe(true)
      expect(socketConnection.socket.destroyed).toBe(true)
      expect(await loopbackListenerIsAbsent(prior.listenerPort)).toBe(true)

      expect(
        events.filter((entry) => entry.event === 'runtime.restart.requested')
      ).toHaveLength(3)
      expect(
        events.filter((entry) => entry.event === 'runtime.restart.succeeded')
      ).toHaveLength(3)
      expect(
        events.filter((entry) => entry.event.startsWith('runtime.stop.'))
      ).toHaveLength(0)
      expect(await library.findById(project.id)).toEqual(registrationBefore)
      expect(await snapshotFixture()).toEqual(fixtureBefore)
      expect(controlListener.listening).toBe(true)
      expect(await identityAbsent(controlIdentity)).toBe(false)

      const shutdown = await manager.shutdown()
      expect(shutdown.status).toBe('ok')
      expect(shutdown.unresolvedAdmissions).toHaveLength(0)
      for (const generation of sequence) await generationAbsent(generation)
      const audited = manager.audit?.()
      expect(audited?.ownershipRecords).toBe(0)
      expect(audited?.pendingAdmissions).toBe(0)
      expect(audited?.quarantinedOwnershipRecords).toBe(0)

      const episode = {
        schemaVersion: 1,
        attributionCeiling: ATTRIBUTION_CEILING,
        proofSplit: PROOF_SPLIT,
        continuity: CONTINUITY_STATEMENT,
        prior,
        sequence,
        staleConnections,
        quarantinedIdentities: [],
        unresolvedAdmissions: [],
        priorOwnershipRecords: [
          { key: 'bl018-designated-prior', provableAbsent: true },
        ],
        rows: [
          {
            scenario: 'designated-three-sequential-restarts',
            residualCount: 0,
            teardownResidualCount: 0,
          },
        ],
        registrationUnchanged: true,
        fixtureUnchanged: true,
        controlsUnaffected: {
          processSurvived: !(await identityAbsent(controlIdentity)),
          listenerSurvived: controlListener.listening,
        },
        restartEventCount: events.filter((entry) =>
          entry.event.startsWith('runtime.restart.')
        ).length,
      }
      const episodePath = path.resolve(
        'test-results/bl-018/designated-episode.json'
      )
      await mkdir(path.dirname(episodePath), { recursive: true })
      await writeFile(
        episodePath,
        JSON.stringify(episode, null, 2) + String.fromCharCode(10)
      )
    } finally {
      await manager.shutdown()
      library.close()
      await context.cleanup()
      await new Promise<void>((resolve) =>
        controlListener.close(() => resolve())
      )
      await terminateExactProcessGroup(controlPid, 1000)
    }
    expect(await identityAbsent(controlIdentity)).toBe(true)
  }

  designated(
    'restarts one real code-server three times leaving zero recorded residuals',
    runDesignated,
    120000
  )
})
