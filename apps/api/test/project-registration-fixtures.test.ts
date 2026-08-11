import {
  access,
  chmod,
  lstat,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  createProjectRegistrationService,
  type RegistrationFileInspector,
} from '../src/project-registration.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import {
  allocateRegistrationFixture,
  BL006_FIXTURE_ROOT,
  cleanupRegistrationDatabase,
  PERMISSION_CAPABILITY_PATH,
  probePermissionCapability,
  snapshotFixture,
} from './project-registration-fixture-helper.js'

function libraryStub(): ProjectLibrary {
  return {
    create: vi.fn(),
    list: vi.fn(async () => []),
    close: vi.fn(),
  }
}

describe('BL-006 disposable filesystem fixtures', () => {
  it('records complete manifests and cleans only unique allocated roots', async () => {
    const first = await allocateRegistrationFixture('manifest')
    const second = await allocateRegistrationFixture('manifest')
    const sentinel = path.join(BL006_FIXTURE_ROOT, 'unrelated-sentinel')
    try {
      expect(first.root).not.toBe(second.root)
      expect(path.relative(BL006_FIXTURE_ROOT, first.root)).not.toMatch(/^\.\./)
      await mkdir(sentinel, { recursive: true })
      const nested = path.join(first.root, ' space ', 'nested')
      const file = path.join(nested, 'content.bin')
      const link = path.join(first.root, 'link')
      await mkdir(nested, { recursive: true })
      await writeFile(file, Buffer.from([0, 1, 2, 255]))
      await symlink(path.relative(first.root, file), link)
      await chmod(nested, 0o750)

      const before = await snapshotFixture(first.root)
      const after = await snapshotFixture(first.root)
      expect(after).toEqual(before)
      expect(before.map(({ relativePath }) => relativePath)).toEqual(
        expect.arrayContaining([
          '.',
          ' space ',
          ' space /nested',
          ' space /nested/content.bin',
          'link',
        ])
      )
      expect(before).toHaveLength(5)
      expect(before.find(({ type }) => type === 'file')?.bytesBase64).toBe(
        'AAEC/w=='
      )
      expect(
        before.find(({ type }) => type === 'symlink')?.linkTargetBase64
      ).toBeDefined()
      expect(
        before.every(({ mtimeNs, mode }) => mtimeNs.length > 0 && mode > 0)
      ).toBe(true)

      await first.cleanup()
      await expect(access(first.root)).rejects.toBeDefined()
      await expect(access(sentinel)).resolves.toBeUndefined()
    } finally {
      await first.cleanup()
      await second.cleanup()
      await rm(sentinel, { recursive: true, force: true })
    }
  })

  it('writes honest bounded permission evidence and restores the probe mode', async () => {
    const context = await allocateRegistrationFixture('permission')
    try {
      const artifact = await probePermissionCapability(context)
      expect(['proved', 'skipped']).toContain(artifact.status)
      expect(artifact.controlledDenial).toEqual({
        configuredRoot: 'invalid_opening_policy',
        project: 'path_unreadable',
      })
      if (artifact.status === 'proved') {
        expect(artifact.probe).toMatchObject({
          accessDenied: true,
          directoryReadDenied: true,
          timedOut: false,
          failedProbeResult: 'none',
        })
      } else {
        expect(artifact.probe.failedProbeResult).not.toBe('none')
      }
      const persisted = JSON.parse(
        await readFile(PERMISSION_CAPABILITY_PATH, 'utf8')
      )
      expect(persisted).toEqual(artifact)
      expect(JSON.stringify(persisted)).not.toContain(context.root)
      const probeMode =
        (await lstat(path.join(context.root, 'permission-probe'))).mode & 0o7777
      expect(probeMode).not.toBe(0)
    } finally {
      await context.cleanup()
    }
    await expect(access(PERMISSION_CAPABILITY_PATH)).resolves.toBeUndefined()
  })
})

describe('controlled and host unreadability evidence', () => {
  it('always maps controlled configured-root and project denials to safe outcomes', async () => {
    const denied = new Set(['/root', '/root/project'])
    const inspector: RegistrationFileInspector = {
      async canonicalize(inputPath) {
        return inputPath
      },
      async inspectDirectory() {
        return 'directory'
      },
      async assertReadable(inputPath) {
        if (denied.has(inputPath))
          throw Object.assign(new Error('private'), { code: 'EACCES' })
      },
    }
    const invalid = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/home', allowedRoots: ['/root'] },
      { fileInspector: inspector, createLibrary: async () => libraryStub() }
    )
    expect(invalid).toEqual({
      category: 'invalid_opening_policy',
      field: 'allowed_roots[0]',
    })

    denied.delete('/root')
    const ready = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/home', allowedRoots: ['/root'] },
      { fileInspector: inspector, createLibrary: async () => libraryStub() }
    )
    if (!('status' in ready)) throw new Error('Expected ready service')
    await expect(ready.service.register('/root/project')).resolves.toEqual({
      category: 'path_unreadable',
      field: 'path',
    })
  })

  it('proves real unreadable outcomes only when the host capability is enforceable', async () => {
    const context = await allocateRegistrationFixture('host-unreadable')
    const database = await allocateDatabaseTestContext('host-unreadable')
    try {
      const artifact = await probePermissionCapability(context)
      if (artifact.status === 'skipped') return

      const home = path.join(context.root, 'home')
      const root = path.join(context.root, 'allowed')
      const project = path.join(root, 'project')
      await mkdir(home)
      await mkdir(project, { recursive: true })
      await context.recordMode(root)
      await chmod(root, 0)
      const invalid = await createProjectRegistrationService({
        databasePath: database.databasePath,
        configuredHome: home,
        allowedRoots: [root],
      })
      expect(invalid).toEqual({
        category: 'invalid_opening_policy',
        field: 'allowed_roots[0]',
      })

      await chmod(root, 0o700)
      await context.recordMode(project)
      const ready = await createProjectRegistrationService({
        databasePath: database.databasePath,
        configuredHome: home,
        allowedRoots: [root],
      })
      if (!('status' in ready)) throw new Error('Expected ready service')
      database.registerClose(ready.service.close)
      await chmod(project, 0)
      await expect(ready.service.register(project)).resolves.toEqual({
        category: 'path_unreadable',
        field: 'path',
      })
    } finally {
      await cleanupRegistrationDatabase(database)
      await context.cleanup()
    }
  })
})
