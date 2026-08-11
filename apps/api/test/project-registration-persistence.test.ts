import { randomUUID } from 'node:crypto'
import { mkdir, realpath, rm, symlink } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  createProjectRegistrationService,
  type RegistrationFileInspector,
} from '../src/project-registration.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { cleanupRegistrationDatabase } from './project-registration-fixture-helper.js'

const FIXTURE_ROOT = path.resolve('test-results/bl-006/fixtures')

async function fixture(label: string) {
  const root = path.join(FIXTURE_ROOT, label + '-' + randomUUID())
  const allowed = path.join(root, 'allowed')
  const project = path.join(allowed, 'project')
  const whitespace = path.join(allowed, ' trailing name ')
  const link = path.join(allowed, 'project-link')
  await mkdir(project, { recursive: true })
  await mkdir(whitespace)
  await symlink(project, link, 'dir')
  return {
    root,
    allowed,
    project,
    whitespace,
    link,
    async cleanup() {
      await rm(root, { recursive: true, force: true })
    },
  }
}

function projectOf(
  result: Awaited<
    ReturnType<Awaited<ReturnType<typeof createReady>>['register']>
  >
) {
  if (!('disposition' in result))
    throw new Error('Expected registration success')
  return result.project
}

async function createReady(
  databasePath: string,
  configuredHome: string,
  allowedRoots: readonly string[],
  seed = 'candidate'
) {
  let count = 0
  const result = await createProjectRegistrationService(
    { databasePath, configuredHome, allowedRoots },
    {
      createId: () => seed + '-' + count++,
      now: () => 1_786_407_100_000 + count,
    }
  )
  if (!('status' in result))
    throw new Error('Expected ready registration service')
  return result.service
}

describe('project registration persistence orchestration', () => {
  it('persists exactly four project fields and returns them unchanged after fresh reopen', async () => {
    const files = await fixture('restart')
    const database = await allocateDatabaseTestContext('registration-restart')
    try {
      const first = await createReady(
        database.databasePath,
        files.root,
        [files.allowed],
        'first'
      )
      database.registerClose(first.close)
      const created = await first.register(files.whitespace)
      expect(created).toEqual({
        disposition: 'created',
        project: {
          id: 'first-0',
          name: ' trailing name ',
          canonicalPath: await realpath(files.whitespace),
          createdAt: 1_786_407_100_001,
        },
      })
      expect(Object.keys(projectOf(created)).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])
      first.close()
      first.close()

      const second = await createReady(
        database.databasePath,
        files.root,
        [files.allowed],
        'second'
      )
      database.registerClose(second.close)
      const existing = await second.register(files.whitespace)
      expect(existing).toEqual({
        disposition: 'existing',
        project: projectOf(created),
      })
      second.close()
    } finally {
      await cleanupRegistrationDatabase(database)
      await files.cleanup()
    }
  })

  it('uses the canonical root path when basename is empty', async () => {
    const inspector: RegistrationFileInspector = {
      canonicalize: vi.fn(async () => '/'),
      inspectDirectory: vi.fn(async () => 'directory'),
      assertReadable: vi.fn(async () => undefined),
    }
    const create = vi.fn<ProjectLibrary['create']>(async (project) => ({
      disposition: 'created',
      project,
    }))
    const result = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/', allowedRoots: ['/'] },
      {
        fileInspector: inspector,
        createLibrary: async () => ({
          create,
          list: async () => [],
          close: vi.fn(),
        }),
        createId: () => 'root-id',
        now: () => 1,
      }
    )
    if (!('status' in result)) throw new Error('Expected ready service')
    await expect(result.service.register('/')).resolves.toEqual({
      disposition: 'created',
      project: { id: 'root-id', name: '/', canonicalPath: '/', createdAt: 1 },
    })
  })

  it('collapses sequential absolute, home, normalized, and symlink expressions', async () => {
    const files = await fixture('equivalence')
    const database = await allocateDatabaseTestContext(
      'registration-equivalence'
    )
    try {
      const service = await createReady(database.databasePath, files.root, [
        files.allowed,
      ])
      database.registerClose(service.close)
      const expressions = [
        files.project,
        '~/allowed/project',
        path.join(files.allowed, 'project', '..', 'project'),
        files.link,
      ]
      const results = []
      for (const expression of expressions)
        results.push(await service.register(expression))
      expect(results.map(({ disposition }) => disposition).sort()).toEqual([
        'created',
        'existing',
        'existing',
        'existing',
      ])
      const winner = projectOf(results[0])
      expect(results.map(projectOf)).toEqual(Array(4).fill(winner))
      service.close()

      const reopened = await createReady(database.databasePath, files.root, [
        files.allowed,
      ])
      database.registerClose(reopened.close)
      expect(await reopened.register(files.link)).toEqual({
        disposition: 'existing',
        project: winner,
      })
    } finally {
      await cleanupRegistrationDatabase(database)
      await files.cleanup()
    }
  })

  it('returns one complete durable winner for exactly eight concurrent equivalents', async () => {
    const files = await fixture('concurrency')
    const database = await allocateDatabaseTestContext(
      'registration-concurrency'
    )
    try {
      const service = await createReady(database.databasePath, files.root, [
        files.allowed,
      ])
      database.registerClose(service.close)
      const expressions = [
        files.project,
        '~/allowed/project',
        path.join(files.allowed, 'project', '..', 'project'),
        files.link,
        files.project,
        '~/allowed/project',
        files.link,
        path.join(files.allowed, 'project', '..', 'project'),
      ]
      expect(expressions).toHaveLength(8)
      const results = await Promise.all(
        expressions.map((value) => service.register(value))
      )
      const projects = results.map(projectOf)
      expect(projects).toHaveLength(8)
      expect(projects).toEqual(Array(8).fill(projects[0]))
      expect(Object.values(projects[0])).not.toContain(null)
      service.close()

      const reopened = await createReady(database.databasePath, files.root, [
        files.allowed,
      ])
      database.registerClose(reopened.close)
      expect(projectOf(await reopened.register(files.project))).toEqual(
        projects[0]
      )
    } finally {
      await cleanupRegistrationDatabase(database)
      await files.cleanup()
    }
  })
})
