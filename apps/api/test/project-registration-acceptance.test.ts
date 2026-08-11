import { randomUUID } from 'node:crypto'
import { access, realpath, stat, unlink } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import {
  createProjectRegistrationService,
  type RegistrationFileInspector,
} from '../src/project-registration.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import {
  allocateRegistrationFixture,
  cleanupRegistrationDatabase,
  snapshotFixture,
} from './project-registration-fixture-helper.js'

async function ready(options: {
  databasePath: string
  home: string
  roots: readonly string[]
  createLibrary?: (databasePath: string) => Promise<ProjectLibrary>
  inspector?: RegistrationFileInspector
}) {
  let id = 0
  const serviceId = randomUUID()
  const result = await createProjectRegistrationService(
    {
      databasePath: options.databasePath,
      configuredHome: options.home,
      allowedRoots: options.roots,
    },
    {
      createLibrary: options.createLibrary,
      fileInspector: options.inspector,
      createId: () => serviceId + '-' + id++,
      now: () => 1_786_407_200_000 + id,
    }
  )
  if (!('status' in result)) throw new Error('Expected ready service')
  return result.service
}

describe('real filesystem registration acceptance matrix', () => {
  it('freezes canonical symlinked home and root snapshots across retargeting', async () => {
    const fixture = await allocateRegistrationFixture('retarget')
    const database = await allocateDatabaseTestContext('registration-retarget')
    try {
      const homeA = path.join(fixture.root, 'home-a')
      const homeB = path.join(fixture.root, 'home-b')
      const rootA = path.join(homeA, 'allowed')
      const rootB = path.join(homeB, 'allowed')
      const projectA = path.join(rootA, 'project')
      const projectB = path.join(rootB, 'project')
      const homeLink = path.join(fixture.root, 'home-link')
      const rootLink = path.join(fixture.root, 'root-link')
      await mkdir(projectA, { recursive: true })
      await mkdir(projectB, { recursive: true })
      await symlink(homeA, homeLink, 'dir')
      await symlink(rootA, rootLink, 'dir')

      const first = await ready({
        databasePath: database.databasePath,
        home: homeLink,
        roots: [rootLink, rootA],
      })
      database.registerClose(first.close)
      const before = await first.register('~/allowed/project')
      expect(before).toMatchObject({
        disposition: 'created',
        project: { canonicalPath: await realpath(projectA) },
      })

      await unlink(homeLink)
      await unlink(rootLink)
      await symlink(homeB, homeLink, 'dir')
      await symlink(rootB, rootLink, 'dir')
      const frozen = await first.register('~/allowed/project')
      expect(frozen).toEqual({
        disposition: 'existing',
        project: 'project' in before ? before.project : undefined,
      })
      first.close()

      const second = await ready({
        databasePath: database.databasePath,
        home: homeLink,
        roots: [rootLink],
      })
      database.registerClose(second.close)
      await expect(second.register('~/allowed/project')).resolves.toMatchObject(
        {
          disposition: 'created',
          project: { canonicalPath: await realpath(projectB) },
        }
      )
    } finally {
      await cleanupRegistrationDatabase(database)
      await fixture.cleanup()
    }
  })

  it('distinguishes real validation and canonical policy boundary cases without row changes', async () => {
    const fixture = await allocateRegistrationFixture('policy')
    const database = await allocateDatabaseTestContext('registration-policy')
    let capturedLibrary: ProjectLibrary | undefined
    try {
      const home = path.join(fixture.root, 'home')
      const root = path.join(home, 'allowed')
      const child = path.join(root, 'child')
      const nested = path.join(child, 'nested')
      const whitespace = path.join(root, ' leading and trailing ')
      const sibling = path.join(home, 'allowed-sibling')
      const outside = path.join(home, 'outside')
      const file = path.join(root, 'file.txt')
      const escape = path.join(root, 'escape')
      await mkdir(nested, { recursive: true })
      await mkdir(whitespace)
      await mkdir(sibling)
      await mkdir(outside)
      await writeFile(file, 'unchanged')
      await symlink(outside, escape, 'dir')

      const service = await ready({
        databasePath: database.databasePath,
        home,
        roots: [root],
        async createLibrary(databasePath) {
          capturedLibrary = await createProjectLibrary(databasePath)
          return capturedLibrary
        },
      })
      database.registerClose(service.close)
      if (capturedLibrary === undefined)
        throw new Error('Library was not captured')
      const valid = [
        root,
        child,
        nested,
        path.join(root, 'child', '..', 'child'),
        whitespace,
      ]
      for (const input of valid) {
        const result = await service.register(input)
        expect(result).toHaveProperty('disposition')
      }
      expect(
        (await capturedLibrary.list())
          .map(({ canonicalPath }) => canonicalPath)
          .sort()
      ).toEqual(
        [root, child, nested, whitespace]
          .map((value) => path.resolve(value))
          .sort()
      )

      const before = await capturedLibrary.list()
      const rejected = [
        ['', 'path_required'],
        ['  ', 'path_required'],
        [root + '/bad\0path', 'unsupported_path_syntax'],
        ['relative', 'unsupported_path_syntax'],
        [path.join(root, 'missing'), 'path_not_found'],
        [file, 'path_not_directory'],
        [sibling, 'outside_opening_policy'],
        [path.join(root, '..', 'outside'), 'outside_opening_policy'],
        [escape, 'outside_opening_policy'],
      ] as const
      for (const [input, category] of rejected) {
        await expect(service.register(input)).resolves.toEqual({
          category,
          field: 'path',
        })
        await expect(capturedLibrary.list()).resolves.toEqual(before)
      }
    } finally {
      await cleanupRegistrationDatabase(database)
      await fixture.cleanup()
    }
  })

  it('does not mutate project content for successful, duplicate, concurrent, and rejected calls', async () => {
    const fixture = await allocateRegistrationFixture('non-mutation')
    const database = await allocateDatabaseTestContext(
      'registration-non-mutation'
    )
    let capturedLibrary: ProjectLibrary | undefined
    try {
      const project = path.join(fixture.root, 'project')
      const nested = path.join(project, 'nested')
      const file = path.join(nested, 'bytes.bin')
      const link = path.join(project, 'link')
      await mkdir(nested, { recursive: true })
      await writeFile(file, Buffer.from([7, 0, 9, 255]))
      await symlink(path.relative(project, file), link)
      await chmod(nested, 0o750)
      await chmod(file, 0o640)
      const before = await snapshotFixture(fixture.root)

      const service = await ready({
        databasePath: database.databasePath,
        home: fixture.root,
        roots: [fixture.root],
        async createLibrary(databasePath) {
          capturedLibrary = await createProjectLibrary(databasePath)
          return capturedLibrary
        },
      })
      database.registerClose(service.close)
      if (capturedLibrary === undefined)
        throw new Error('Library was not captured')
      await service.register(project)
      expect(await snapshotFixture(fixture.root)).toEqual(before)
      await service.register(project)
      expect(await snapshotFixture(fixture.root)).toEqual(before)
      await Promise.all(
        Array.from({ length: 8 }, () => service.register(project))
      )
      expect(await snapshotFixture(fixture.root)).toEqual(before)
      const rowsBeforeRejections = await capturedLibrary.list()
      for (const input of [
        '',
        'relative',
        path.join(fixture.root, 'missing'),
      ]) {
        await service.register(input)
        expect(await snapshotFixture(fixture.root)).toEqual(before)
        await expect(capturedLibrary.list()).resolves.toEqual(
          rowsBeforeRejections
        )
      }

      const invalid = await createProjectRegistrationService({
        databasePath: database.databasePath,
        configuredHome: 'relative',
        allowedRoots: [fixture.root],
      })
      expect(invalid).toEqual({
        category: 'invalid_opening_policy',
        field: 'configured_home',
      })
      expect(await snapshotFixture(fixture.root)).toEqual(before)
      await expect(capturedLibrary.list()).resolves.toEqual(
        rowsBeforeRejections
      )
    } finally {
      await cleanupRegistrationDatabase(database)
      await fixture.cleanup()
    }
  })

  it('uses only read and inspection operations through the filesystem seam', async () => {
    const operations: string[] = []
    const inspector: RegistrationFileInspector = {
      async canonicalize(inputPath) {
        operations.push('canonicalize')
        return inputPath
      },
      async inspectDirectory() {
        operations.push('inspectDirectory')
        return 'directory'
      },
      async assertReadable(inputPath) {
        operations.push('assertReadable')
        await access(inputPath, fsConstants.F_OK).catch(() => undefined)
        await stat(inputPath).catch(() => undefined)
      },
    }
    const result = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/', allowedRoots: [] },
      {
        fileInspector: inspector,
        createLibrary: async () => ({
          create: async (project) => ({ disposition: 'created', project }),
          list: async () => [],
          close() {},
        }),
      }
    )
    expect(result).toHaveProperty('status', 'ready')
    expect(new Set(operations)).toEqual(
      new Set(['canonicalize', 'inspectDirectory', 'assertReadable'])
    )
  })
})
