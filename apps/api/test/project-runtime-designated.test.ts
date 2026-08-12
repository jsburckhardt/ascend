import { spawn } from 'node:child_process'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { promisify } from 'node:util'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createProjectRuntimeConfig } from '../src/project-runtime-contract.js'
import { createProjectRuntimeManager } from '../src/project-runtime-manager.js'
import {
  loopbackListenerIsAbsent,
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
import {
  captureRecursiveManifest,
  recursiveManifestDifferenceCount,
} from './project-runtime-evidence.js'

const executeFile = promisify(execFile)

describe('designated real project runtime', () => {
  const designated = process.env.BL010_DESIGNATED === '1' ? it : it.skip
  const runDesignated = async (): Promise<void> => {
    expect(process.getuid?.()).toBe(1000)
    const version = (await executeFile(CODE_SERVER_PATH, ['--version'])).stdout
    expect(version.split(' ')[0]).toBe(CODE_SERVER_VERSION)
    const canonicalPath = await canonicalFixturePath()
    expect(canonicalPath).toBe(BL001_FIXTURE)
    const before = await snapshotFixture()
    const recursiveBefore = await captureRecursiveManifest(canonicalPath)

    const controlListener = createServer()
    await new Promise<void>((resolve, reject) => {
      controlListener.once('error', reject)
      controlListener.listen(0, '127.0.0.1', resolve)
    })
    const control = spawn(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      {
        detached: true,
        stdio: 'ignore',
      }
    )
    control.unref()
    const controlPid = control.pid
    if (controlPid === undefined)
      throw new Error('Control process identity unavailable')
    let controlStart = await readProcessStartTime(controlPid)
    for (let attempt = 0; controlStart === null && attempt < 20; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 10))
      controlStart = await readProcessStartTime(controlPid)
    }
    if (controlStart === null)
      throw new Error('Control process start unavailable')

    const events: unknown[] = []
    const config = createProjectRuntimeConfig({
      executablePath: CODE_SERVER_PATH,
      expectedUser: 'vscode',
    })
    const project = {
      id: 'bl-010-designated-project',
      name: 'BL-010 Fixture',
      canonicalPath,
      createdAt: 1,
    }
    const manager = createProjectRuntimeManager({
      findProjectById: async (id) => (id === project.id ? project : undefined),
      config,
      recordEvent: (event) => events.push(event),
    })

    let pid = -1
    let startTime = ''
    let port = -1
    let observedHealthBody = ''
    let listenerInode = ''
    let cleanup = { exactProcessAbsent: false, listenerAbsent: false }
    let shutdownResult: Awaited<ReturnType<typeof manager.shutdown>> | undefined
    try {
      const first = await manager.start({
        projectId: project.id,
        canonicalPath,
      })
      pid = first.pid ?? -1
      startTime = first.processStartTime ?? ''
      port = first.port ?? -1
      expect(first.state).toBe('running')
      expect(first.internalUrl).toBe('http://127.0.0.1:' + String(port))
      expect(first.elapsedMs).toBeLessThan(config.readinessTimeoutMs)
      const healthResponse = await fetch(first.internalUrl + '/healthz/')
      const healthBody = (await healthResponse.json()) as { status?: unknown }
      observedHealthBody = String(healthBody.status)
      expect(healthResponse.status).toBe(200)
      expect(['alive', 'expired']).toContain(observedHealthBody)
      const processes = await readManagedProcesses(pid)
      const root = processes.find((row) => row.pid === pid)
      expect(root?.realUid).toBe(1000)
      expect(root?.effectiveUid).toBe(1000)
      expect(root?.user).toBe('vscode')
      expect(root?.argv.at(-1)).toBe(canonicalPath)
      expect(root?.argv.filter((item) => item === canonicalPath)).toHaveLength(
        1
      )
      const exactFinalCanonicalItem = root?.argv.at(-1) === canonicalPath
      const canonicalItemCount =
        root?.argv.filter((item) => item === canonicalPath).length ?? 0
      const listeners = await readManagedListeners(
        processes.map((row) => row.pid)
      )
      const ownedListener = listeners.find(
        (listener) => listener.address === '127.0.0.1' && listener.port === port
      )
      listenerInode = ownedListener?.inode ?? ''
      expect(listenerInode).not.toBe('')
      expect(listeners).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ address: '127.0.0.1', port }),
        ])
      )

      const reused = await manager.start({
        projectId: project.id,
        canonicalPath,
      })
      expect(reused.pid).toBe(first.pid)
      expect(reused.processStartTime).toBe(first.processStartTime)
      expect(reused.port).toBe(first.port)
      const reuse = {
        samePidIdentity:
          reused.pid === first.pid &&
          reused.processStartTime === first.processStartTime,
        samePort: reused.port === first.port,
      }

      shutdownResult = await manager.shutdown()
      cleanup = {
        exactProcessAbsent: (await readProcessStartTime(pid)) !== startTime,
        listenerAbsent: await loopbackListenerIsAbsent(port),
      }
      expect(cleanup).toEqual({
        exactProcessAbsent: true,
        listenerAbsent: true,
      })
      expect(shutdownResult).toMatchObject({
        status: 'ok',
        audits: [
          {
            pid,
            processStartTime: startTime,
            port,
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: true,
          },
        ],
      })
      expect(await snapshotFixture()).toEqual(before)
      const recursiveAfter = await captureRecursiveManifest(canonicalPath)
      const fixtureDifferenceCount = recursiveManifestDifferenceCount(
        recursiveBefore,
        recursiveAfter
      )
      expect(fixtureDifferenceCount).toBe(0)
      expect(controlListener.listening).toBe(true)
      expect(await readProcessStartTime(controlPid)).toBe(controlStart)
      const unrelatedControls = {
        processSurvived:
          (await readProcessStartTime(controlPid)) === controlStart,
        listenerSurvived: controlListener.listening,
      }

      const artifact = {
        version: 1,
        prerequisites: {
          codeServerVersion: CODE_SERVER_VERSION,
          user: 'vscode',
          uid: 1000,
          fixture: 'BL-001',
        },
        health: {
          path: '/healthz/',
          status: 200,
          acceptedBodyStatuses: ['alive', 'expired'],
          observedBodyStatus: observedHealthBody,
        },
        argv: { exactFinalCanonicalItem, canonicalItemCount },
        listener: { address: '127.0.0.1', port, inode: listenerInode },
        process: {
          pid,
          processStartTime: startTime,
          uid: 1000,
          user: 'vscode',
        },
        reuse,
        timing: {
          observedElapsedMs: first.elapsedMs,
          targetMs: 15000,
          withinTarget: first.elapsedMs < 15000,
        },
        eventCount: events.length,
        fixtureIntegrity: {
          differenceCount: fixtureDifferenceCount,
          before: recursiveBefore,
          after: recursiveAfter,
        },
        shutdown: {
          ...cleanup,
          managerStatus: shutdownResult.status,
          audits: shutdownResult.audits,
        },
        unrelatedControls,
        unionResiduals: {
          pidIdentities: cleanup.exactProcessAbsent ? 0 : 1,
          listeners: cleanup.listenerAbsent ? 0 : 1,
        },
      }
      const evidencePath = path.resolve(
        'test-results/bl-010/project-runtime/episode.json'
      )
      await mkdir(path.dirname(evidencePath), { recursive: true })
      await writeFile(
        evidencePath,
        JSON.stringify(artifact, null, 2) + String.fromCharCode(10)
      )
    } finally {
      await manager.shutdown()
      await new Promise<void>((resolve) =>
        controlListener.close(() => resolve())
      )
      await terminateExactProcessGroup(controlPid, 1000)
    }
    expect(cleanup).toEqual({ exactProcessAbsent: true, listenerAbsent: true })
    expect(await readProcessStartTime(controlPid)).not.toBe(controlStart)
  }
  designated(
    'starts and reuses one real code-server then leaves zero residuals',
    runDesignated,
    30000
  )
})
