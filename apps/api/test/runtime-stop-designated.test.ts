import { execFile, spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
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

// The strongest claim this single real-host episode makes. Absence of the
// recorded root identity, of every recorded owned-group member identity, of the
// owned process group, and of the loopback listener is proven; no claim is made
// about descendants that left the owned group before the closure was recorded,
// nor about escalation, race, or unconfirmed-release behaviour, which are
// proven only in the deterministic matrix.
const ATTRIBUTION_CEILING =
  'Absence is proven for the exact recorded root identity, every owned process-group member identity recorded immediately before the stop, the owned process group, and the loopback listener. Descendants that left the owned group before the closure was recorded are outside this episode.'

interface RecordedIdentity {
  readonly pid: number
  readonly processStartTime: string
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

describe('designated real runtime stop', () => {
  const designated = process.env.BL017_DESIGNATED === '1' ? it : it.skip

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

    const context = await allocateDatabaseTestContext('bl017-designated')
    const library = await createProjectLibrary(context.databasePath)
    const project = {
      id: 'bl-017-designated-project',
      name: 'BL-017 Designated Fixture',
      canonicalPath,
      createdAt: 1_700_000_000_000,
    }
    const created = await library.create(project)
    expect(created.disposition).toBe('created')
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

    try {
      const started = await manager.start({
        projectId: project.id,
        canonicalPath,
      })
      expect(started.state).toBe('running')
      const pid = started.pid ?? -1
      const port = started.port ?? -1
      expect(pid).toBeGreaterThan(0)
      expect(port).toBeGreaterThan(0)
      const rootIdentity = await recordIdentity(pid)
      expect(rootIdentity.processStartTime).toBe(started.processStartTime)

      const owned = await readManagedProcesses(pid)
      const listeners = await readManagedListeners(owned.map((row) => row.pid))
      const ownedListener = listeners.find(
        (listener) => listener.address === '127.0.0.1' && listener.port === port
      )
      expect(ownedListener?.inode ?? '').not.toBe('')

      // The owned process-group member closure, captured immediately before the
      // stop request. Every member identity is recorded with its own start time.
      const memberPids = await readProcessGroupMembers(pid)
      expect(memberPids).toContain(pid)
      const members: RecordedIdentity[] = []
      for (const memberPid of memberPids)
        members.push(await recordIdentity(memberPid))
      expect(members.length).toBeGreaterThan(0)

      const stopped = await manager.stop({ projectId: project.id })
      expect(stopped.outcome).toBe('stopped')
      if (stopped.outcome !== 'stopped') throw new Error('stop did not stop')
      expect(stopped.audit).toMatchObject({
        pid,
        processStartTime: rootIdentity.processStartTime,
        port,
        processAbsent: true,
        processGroupAbsent: true,
        listenerAbsent: true,
      })
      expect(['graceful', 'escalated']).toContain(stopped.release)

      const memberAbsence = await Promise.all(members.map(identityAbsent))
      expect(memberAbsence.filter((absent) => !absent)).toHaveLength(0)
      expect(await identityAbsent(rootIdentity)).toBe(true)
      expect(await readProcessGroupMembers(pid)).toHaveLength(0)
      expect(await loopbackListenerIsAbsent(port)).toBe(true)

      expect(manager.reportPublicStates([project.id])).toEqual([
        { projectId: project.id, state: 'Stopped' },
      ])
      expect(await library.findById(project.id)).toEqual(registrationBefore)
      expect(await snapshotFixture()).toEqual(fixtureBefore)
      expect(controlListener.listening).toBe(true)
      expect(await identityAbsent(controlIdentity)).toBe(false)

      const episode = {
        schemaVersion: 1,
        attributionCeiling: ATTRIBUTION_CEILING,
        root: rootIdentity,
        members,
        processGroupId: pid,
        listenerPort: port,
        audit: {
          processAbsent: stopped.audit.processAbsent,
          processGroupAbsent: stopped.audit.processGroupAbsent,
          listenerAbsent: stopped.audit.listenerAbsent,
        },
        release: stopped.release,
        reportedState: manager.reportPublicStates([project.id])[0]?.state,
        registrationUnchanged: true,
        fixtureUnchanged: true,
        controlsUnaffected: {
          processSurvived: !(await identityAbsent(controlIdentity)),
          listenerSurvived: controlListener.listening,
        },
        stopEventCount: events.filter((entry) =>
          entry.event.startsWith('runtime.stop')
        ).length,
      }
      const episodePath = path.resolve(
        'test-results/bl-017/designated-episode.json'
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
    'stops one real code-server leaving zero recorded residuals',
    runDesignated,
    45000
  )
})
