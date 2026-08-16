import { spawn } from 'node:child_process'
import {
  chmod,
  cp,
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildRuntimeArgv,
  buildRuntimeUserDataPath,
  defaultRuntimeAttributionPrimitives,
  readProcessStartTime,
  resolveGroupListenerOwner,
} from '../src/project-runtime-process.js'
import {
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
} from '../src/project-runtime-contract.js'
import { createProjectLibrary } from '../src/project-library.js'
import {
  createProjectRuntimeManager,
  type ProjectRuntimeManager,
} from '../src/project-runtime-manager.js'
import {
  BL001_FIXTURE,
  CODE_SERVER_PATH,
} from '../src/workbench-proof-contract.js'

interface Identity {
  readonly pid: number
  readonly processStartTime: string
}

const delay = async (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const allocatePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('Loopback port allocation failed')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
  return address.port
}

const observeIdentity = async (pid: number): Promise<Identity> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const processStartTime = await readProcessStartTime(pid)
    if (processStartTime !== null) return { pid, processStartTime }
    await delay(10)
  }
  throw new Error('Process identity was not observed')
}

const identityPresent = async (identity: Identity): Promise<boolean> =>
  (await readProcessStartTime(identity.pid)) === identity.processStartTime

const stopExact = async (identity: Identity | undefined): Promise<void> => {
  if (identity === undefined || !(await identityPresent(identity))) return
  process.kill(-identity.pid, 'SIGTERM')
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await identityPresent(identity))) return
    await delay(10)
  }
  if (await identityPresent(identity)) process.kill(-identity.pid, 'SIGKILL')
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!(await identityPresent(identity))) return
    await delay(10)
  }
  throw new Error('Exact host-conformance control did not terminate')
}

const waitForListener = async (
  identity: Identity,
  port: number
): Promise<void> => {
  const signal = new AbortController().signal
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const inode =
      await defaultRuntimeAttributionPrimitives.readLoopbackListenerInode(
        port,
        signal
      )
    if (inode !== null) return
    if (!(await identityPresent(identity)))
      throw new Error('Control exited before listener observation')
    await delay(10)
  }
  throw new Error('Control listener was not observed')
}

const candidatePids = async (project: {
  readonly id: string
  readonly canonicalPath: string
}): Promise<readonly number[]> => {
  const signal = new AbortController().signal
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(signal)
  if (!scan.complete) throw new Error('Host candidate scan was incomplete')
  const ownerToken = deriveProjectOwnerToken(project.id)
  const matches: number[] = []
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        signal
      )
    if (
      argv !== null &&
      (argv.at(-1) === project.canonicalPath ||
        argv.some((argument) => argument.includes(ownerToken)))
    )
      matches.push(pid)
  }
  return matches
}

const disposable: string[] = []

afterEach(async () => {
  await Promise.all(
    disposable
      .splice(0)
      .map((entry) => rm(entry, { recursive: true, force: true }))
  )
})

describe('runtime reconciliation host conformance', () => {
  it('resolves the actual launcher to lib/node plus installation root', async () => {
    const root = await mkdtemp(
      path.join(os.tmpdir(), 'ascend-runtime-install-')
    )
    disposable.push(root)
    await mkdir(path.join(root, 'bin'), { recursive: true })
    await mkdir(path.join(root, 'lib'), { recursive: true })
    const launcher = path.join(root, 'bin', 'code-server')
    const interpreter = path.join(root, 'lib', 'node')
    await writeFile(launcher, '#!/bin/sh\n', { mode: 0o755 })
    await writeFile(interpreter, '#!/bin/sh\n', { mode: 0o755 })
    await chmod(interpreter, 0o755)
    const link = path.join(root, 'code-server')
    await symlink(launcher, link)

    const resolved =
      await defaultRuntimeAttributionPrimitives.resolveInstalledRuntimeIdentity(
        link,
        new AbortController().signal
      )

    expect(resolved).toEqual({
      launcherRealPath: launcher,
      installationRoot: root,
      interpreterPath: interpreter,
      launcherArgvPrefix: [interpreter, root],
    })
  })

  it('reads the current process identity and argv through procfs', async () => {
    const signal = new AbortController().signal
    const [scan, identity, argv, sockets] = await Promise.all([
      defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(signal),
      defaultRuntimeAttributionPrimitives.readProcessIdentity(
        process.pid,
        signal
      ),
      defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        process.pid,
        signal
      ),
      defaultRuntimeAttributionPrimitives.readProcessSocketInodes(
        process.pid,
        signal
      ),
    ])

    expect(scan.complete).toBe(true)
    expect(scan.pids).toContain(process.pid)
    expect(identity?.pid).toBe(process.pid)
    expect(identity?.startTime.length).toBeGreaterThan(0)
    expect(argv?.length).toBeGreaterThan(0)
    expect(sockets).not.toBeNull()
  })

  const designated = process.env.BL019_DESIGNATED === '1' ? it : it.skip
  designated(
    'adopts one genuine runtime and refuses isolated host controls',
    async () => {
      expect(process.getuid?.()).toBe(1000)
      const root = await mkdtemp(
        path.join(os.tmpdir(), 'ascend-runtime-host-conformance-')
      )
      disposable.push(root)
      const databasePath = path.join(root, 'projects.sqlite')
      const runPath = path.join(root, 'run-project')
      const controlPath = path.join(root, 'control-project')
      await cp(BL001_FIXTURE, runPath, { recursive: true })
      await cp(BL001_FIXTURE, controlPath, { recursive: true })
      const library = await createProjectLibrary(databasePath)
      const runProject = {
        id: 'bl-019-host-run',
        name: 'BL-019 Host Run',
        canonicalPath: runPath,
        createdAt: 1,
      }
      const controlProject = {
        id: 'bl-019-host-control',
        name: 'BL-019 Host Control',
        canonicalPath: controlPath,
        createdAt: 2,
      }
      expect((await library.create(runProject)).disposition).toBe('created')
      expect((await library.create(controlProject)).disposition).toBe('created')
      const config = createProjectRuntimeConfig({
        executablePath: CODE_SERVER_PATH,
        expectedUser: 'vscode',
      })
      let launchManager: ProjectRuntimeManager | undefined
      let reconcileManager: ProjectRuntimeManager | undefined
      let foreignControl: Identity | undefined
      let outsideControl: Identity | undefined
      try {
        launchManager = createProjectRuntimeManager({
          findProjectById: (id) => library.findById(id),
          listProjects: () => library.list(),
          config,
          recordEvent: () => undefined,
        })
        const started = await launchManager.start({
          projectId: runProject.id,
          canonicalPath: runProject.canonicalPath,
        })
        if (
          started.pid === null ||
          started.processStartTime === null ||
          started.port === null
        )
          throw new Error('Genuine runtime identity was incomplete')
        const genuineIdentity = {
          pid: started.pid,
          processStartTime: started.processStartTime,
        }
        const signal = new AbortController().signal
        const installed =
          await defaultRuntimeAttributionPrimitives.resolveInstalledRuntimeIdentity(
            CODE_SERVER_PATH,
            signal
          )
        if (installed === null)
          throw new Error('Installed runtime identity was unresolved')
        const genuineArgv =
          await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
            started.pid,
            signal
          )
        if (genuineArgv === null)
          throw new Error('Genuine runtime argv was not observed')
        const expectedArgv = [
          ...installed.launcherArgvPrefix,
          ...buildRuntimeArgv(
            runProject.canonicalPath,
            started.port,
            buildRuntimeUserDataPath(
              deriveProjectOwnerToken(runProject.id),
              started.port
            )
          ),
        ]
        expect(genuineArgv).toEqual(expectedArgv)
        expect(genuineArgv[0]).not.toBe(CODE_SERVER_PATH)

        const listenerOwner = await resolveGroupListenerOwner({
          processGroupId: started.pid,
          port: started.port,
          installedRuntime: installed,
          signal,
        })
        expect(listenerOwner.refusalReason).toBeNull()
        expect(listenerOwner.owner?.identity.processGroupId).toBe(started.pid)
        expect(
          listenerOwner.owner?.identity.pid === started.pid
            ? 'group-leader'
            : 'group-member'
        ).toMatch(/group-(?:leader|member)/u)

        const foreignRoot = path.join(root, 'foreign-root')
        await mkdir(path.join(foreignRoot, 'bin'), { recursive: true })
        await mkdir(path.join(foreignRoot, 'lib'), { recursive: true })
        const foreignLauncher = path.join(foreignRoot, 'bin', 'code-server')
        await cp(installed.launcherRealPath, foreignLauncher)
        await chmod(foreignLauncher, 0o755)
        await symlink(
          installed.interpreterPath,
          path.join(foreignRoot, 'lib', 'node')
        )
        await writeFile(
          path.join(foreignRoot, 'package.json'),
          JSON.stringify({ main: 'control.cjs' })
        )
        await writeFile(
          path.join(foreignRoot, 'control.cjs'),
          [
            "const http = require('node:http')",
            "const index = process.argv.indexOf('--bind-addr')",
            "const bind = process.argv[index + 1] ?? ''",
            "const port = Number(bind.slice(bind.lastIndexOf(':') + 1))",
            "http.createServer((_, response) => response.end(JSON.stringify({ status: 'alive' }))).listen(port, '127.0.0.1')",
            '',
          ].join('\n')
        )
        const foreignPort = await allocatePort()
        const foreignArgv = buildRuntimeArgv(
          controlProject.canonicalPath,
          foreignPort,
          buildRuntimeUserDataPath(
            deriveProjectOwnerToken(controlProject.id),
            foreignPort
          )
        )
        const foreignChild = spawn(foreignLauncher, foreignArgv, {
          cwd: controlProject.canonicalPath,
          detached: true,
          stdio: 'ignore',
        })
        if (foreignChild.pid === undefined)
          throw new Error('Foreign control did not spawn')
        foreignChild.unref()
        foreignControl = await observeIdentity(foreignChild.pid)
        await waitForListener(foreignControl, foreignPort)
        const observedForeignArgv =
          await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
            foreignControl.pid,
            signal
          )
        expect(observedForeignArgv).toEqual([
          path.join(foreignRoot, 'lib', 'node'),
          foreignRoot,
          ...foreignArgv,
        ])

        const outsidePort = await allocatePort()
        const outsideChild = spawn(
          process.execPath,
          [
            '-e',
            "require('node:http').createServer((_, response) => response.end('outside')).listen(Number(process.argv.at(-1)), '127.0.0.1')",
            String(outsidePort),
          ],
          { detached: true, stdio: 'ignore' }
        )
        if (outsideChild.pid === undefined)
          throw new Error('Outside-group control did not spawn')
        outsideChild.unref()
        outsideControl = await observeIdentity(outsideChild.pid)
        await waitForListener(outsideControl, outsidePort)
        expect(
          await resolveGroupListenerOwner({
            processGroupId: started.pid,
            port: outsidePort,
            installedRuntime: installed,
            signal,
          })
        ).toEqual({ owner: null, refusalReason: 'listener-not-owned' })

        expect(await candidatePids(runProject)).toEqual([started.pid])
        expect(await candidatePids(controlProject)).toEqual([
          foreignControl.pid,
        ])
        const outsideArgv =
          await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
            outsideControl.pid,
            signal
          )
        expect(
          outsideArgv?.some(
            (argument) =>
              argument === runProject.canonicalPath ||
              argument === controlProject.canonicalPath ||
              argument.includes(deriveProjectOwnerToken(runProject.id)) ||
              argument.includes(deriveProjectOwnerToken(controlProject.id))
          )
        ).toBe(false)

        reconcileManager = createProjectRuntimeManager({
          findProjectById: (id) => library.findById(id),
          listProjects: () => library.list(),
          config,
          recordEvent: () => undefined,
        })
        await reconcileManager.beginReconciliation()
        let inspection = reconcileManager.inspectReconciliation?.()
        if (inspection === undefined)
          throw new Error('Reconciliation inspection was unavailable')
        for (
          let attempt = 0;
          inspection.phase !== 'settled' && attempt < 1_200;
          attempt += 1
        ) {
          await delay(10)
          inspection = reconcileManager.inspectReconciliation?.()
          if (inspection === undefined)
            throw new Error('Reconciliation inspection was unavailable')
        }
        expect(inspection.phase).toBe('settled')
        const states = new Map(
          reconcileManager
            .reportPublicStates([runProject.id, controlProject.id])
            .map(({ projectId, state }) => [projectId, state])
        )
        expect(states.get(runProject.id)).toBe('Running')
        expect(states.get(controlProject.id)).toBe('Failed')
        const controlInspection = inspection.projects.find(
          ({ projectToken }) =>
            projectToken === deriveProjectOwnerToken(controlProject.id)
        )
        expect(controlInspection?.refusalReason).toBe(
          'launcher-prefix-mismatch'
        )
        expect(await identityPresent(foreignControl)).toBe(true)
        expect(await identityPresent(outsideControl)).toBe(true)
        expect(await candidatePids(runProject)).toEqual([genuineIdentity.pid])
        const stopped = await reconcileManager.stop({
          projectId: runProject.id,
        })
        expect(stopped.outcome).toBe('stopped')
        expect(await identityPresent(genuineIdentity)).toBe(false)
        expect(await identityPresent(foreignControl)).toBe(true)
        expect(await identityPresent(outsideControl)).toBe(true)
      } finally {
        if (reconcileManager !== undefined) await reconcileManager.shutdown()
        if (launchManager !== undefined) await launchManager.shutdown()
        await stopExact(foreignControl)
        await stopExact(outsideControl)
        library.close()
      }
    },
    180_000
  )
})
