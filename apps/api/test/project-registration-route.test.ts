import { mkdir, symlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  createProjectRegistrationService,
  REGISTRATION_FAILURE_CATEGORIES,
  type ProjectRegistrationService,
  type RegistrationResult,
} from '../src/project-registration.js'
import {
  INVALID_REGISTRATION_REQUEST,
  PROJECT_REGISTRATION_BODY_LIMIT_BYTES,
  PROJECT_REGISTRATION_FAILED,
  REGISTRATION_REQUEST_TOO_LARGE,
} from '../src/routes/projects.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { allocateRegistrationFixture } from './project-registration-fixture-helper.js'
import { build } from './helper.js'

const project: Project = {
  id: 'stable-project',
  name: 'Project <script>',
  canonicalPath: '/safe/project <script>',
  createdAt: 1,
}

function registration(result: RegistrationResult | Error): {
  service: ProjectRegistrationService
  register: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
} {
  const register = vi.fn(async () => {
    if (result instanceof Error) throw result
    return result
  })
  const close = vi.fn()
  return { service: { register, close }, register, close }
}

function library(): ProjectLibrary {
  return { create: vi.fn(), list: vi.fn(async () => []), close: vi.fn() }
}

describe('POST /api/projects contract', () => {
  it.each([
    ['created', 201],
    ['existing', 200],
  ] as const)(
    'maps %s with one delegation and exact safe project',
    async (disposition, status) => {
      const owned = registration({ disposition, project })
      const app = await build({
        createProjectLibrary: async () => library(),
        createProjectRegistration: async () => owned.service,
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ path: ' /exact input ' }),
      })
      expect(response.statusCode).toBe(status)
      expect(response.json()).toEqual({ disposition, project })
      expect(owned.register).toHaveBeenCalledOnce()
      expect(owned.register).toHaveBeenCalledWith(' /exact input ')
    }
  )

  const typedStatuses = {
    path_required: 400,
    unsupported_path_syntax: 400,
    path_not_found: 404,
    path_not_directory: 422,
    path_unreadable: 403,
    outside_opening_policy: 403,
  } as const

  it.each(REGISTRATION_FAILURE_CATEGORIES)(
    'maps typed %s safely',
    async (category) => {
      const owned = registration({ category, field: 'path' })
      const app = await build({
        createProjectLibrary: async () => library(),
        createProjectRegistration: async () => owned.service,
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          path: category === 'path_required' ? '   ' : '/host/path',
        }),
      })
      expect(response.statusCode).toBe(typedStatuses[category])
      expect(response.json()).toEqual({ error: { category, field: 'path' } })
      expect(owned.register).toHaveBeenCalledOnce()
    }
  )

  it.each([
    ['', undefined],
    ['{', 'application/json'],
    ['null', 'application/json'],
    ['[]', 'application/json'],
    ['{}', 'application/json'],
    [JSON.stringify({ path: 1 }), 'application/json'],
    [JSON.stringify({ path: '/ok', extra: true }), 'application/json'],
    [JSON.stringify({ path: '/ok' }), 'text/plain'],
  ])(
    'rejects malformed contract without delegation: %j',
    async (payload, contentType) => {
      const owned = registration({ disposition: 'created', project })
      const app = await build({
        createProjectLibrary: async () => library(),
        createProjectRegistration: async () => owned.service,
      })
      const response = await app.inject({
        method: 'POST',
        url: '/api/projects',
        payload,
        ...(contentType === undefined
          ? {}
          : { headers: { 'content-type': contentType } }),
      })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({
        error: { category: INVALID_REGISTRATION_REQUEST },
      })
      expect(owned.register).not.toHaveBeenCalled()
    }
  )

  it('accepts 4096 encoded bytes and rejects byte 4097 before delegation', async () => {
    const owned = registration({ category: 'path_not_found', field: 'path' })
    const app = await build({
      createProjectLibrary: async () => library(),
      createProjectRegistration: async () => owned.service,
    })
    const bodyAtBound = JSON.stringify({
      path: 'a'.repeat(PROJECT_REGISTRATION_BODY_LIMIT_BYTES - 11),
    })
    expect(Buffer.byteLength(bodyAtBound)).toBe(
      PROJECT_REGISTRATION_BODY_LIMIT_BYTES
    )
    const accepted = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'content-type': 'application/json' },
      payload: bodyAtBound,
    })
    expect(accepted.statusCode).toBe(404)
    expect(owned.register).toHaveBeenCalledOnce()
    const oversized = bodyAtBound + ' '
    expect(Buffer.byteLength(oversized)).toBe(
      PROJECT_REGISTRATION_BODY_LIMIT_BYTES + 1
    )
    const rejected = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'content-type': 'application/json' },
      payload: oversized,
    })
    expect(rejected.statusCode).toBe(413)
    expect(rejected.json()).toEqual({
      error: { category: REGISTRATION_REQUEST_TOO_LARGE },
    })
    expect(owned.register).toHaveBeenCalledTimes(1)
  })

  it('redacts unexpected service detail from body and logs', async () => {
    const sentinel = 'SECRET /private/path SELECT stack INTERNAL'
    const owned = registration(new Error(sentinel))
    const app = await build({
      createProjectLibrary: async () => library(),
      createProjectRegistration: async () => owned.service,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ path: sentinel }),
    })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { category: PROJECT_REGISTRATION_FAILED },
    })
    expect(response.body).not.toContain(sentinel)
  })
})

describe('POST registration identity integration', () => {
  it('returns one durable stable ID for sequential and exactly eight concurrent equivalents', async () => {
    const database = await allocateDatabaseTestContext('bl008-post')
    const fixture = await allocateRegistrationFixture('bl008-post')
    const projectPath = path.join(fixture.root, 'project')
    const linkPath = path.join(fixture.root, 'project-link')
    await mkdir(projectPath)
    await writeFile(path.join(projectPath, 'content.txt'), 'unchanged')
    await symlink(projectPath, linkPath)
    let listing: ProjectLibrary | undefined
    let service: ProjectRegistrationService | undefined
    try {
      listing = await createProjectLibrary(database.databasePath)
      const construction = await createProjectRegistrationService({
        databasePath: database.databasePath,
        configuredHome: fixture.root,
        allowedRoots: [fixture.root],
      })
      if (construction.status !== 'ready')
        throw new Error('fixture opening policy failed')
      service = construction.service
      const app = await build({
        createProjectLibrary: async () => listing!,
        createProjectRegistration: async () => service!,
      })
      const post = (submittedPath: string) =>
        app.inject({
          method: 'POST',
          url: '/api/projects',
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ path: submittedPath }),
        })
      const first = await post(projectPath)
      const equivalent = await post(linkPath)
      expect(first.statusCode).toBe(201)
      expect(equivalent.statusCode).toBe(200)
      const firstId = first.json<{ project: Project }>().project.id
      expect(equivalent.json<{ project: Project }>().project.id).toBe(firstId)
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () => post(linkPath))
      )
      expect(concurrent).toHaveLength(8)
      expect(concurrent.every((response) => response.statusCode === 200)).toBe(
        true
      )
      expect(
        concurrent.map(
          (response) => response.json<{ project: Project }>().project.id
        )
      ).toEqual(Array(8).fill(firstId))
      expect((await listing.list()).map(({ id }) => id)).toEqual([firstId])
      await app.close()
      listing = undefined
      service = undefined
      const reopened = await createProjectLibrary(database.databasePath)
      expect((await reopened.list()).map(({ id }) => id)).toEqual([firstId])
      reopened.close()
      expect(
        await (
          await import('node:fs/promises')
        ).readFile(path.join(projectPath, 'content.txt'), 'utf8')
      ).toBe('unchanged')
    } finally {
      service?.close()
      listing?.close()
      await database.cleanup()
      await fixture.cleanup()
    }
  })
})
