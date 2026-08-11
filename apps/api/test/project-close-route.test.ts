import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import appPlugin from '../src/app.js'
import {
  ProjectCloseError,
  type ProjectCloseService,
} from '../src/project-close.js'
import { createProjectLibrary } from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  INVALID_PROJECT_ID,
  PROJECT_CLOSE_FAILED,
  PROJECT_CLOSE_FAILED_EVENT,
  PROJECT_NOT_FOUND,
} from '../src/routes/projects.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { build } from './helper.js'

function injectedClose(implementation: ProjectCloseService['closeProject']): {
  service: ProjectCloseService
  delegate: ReturnType<typeof vi.fn>
} {
  const delegate = vi.fn(implementation)
  return { service: { closeProject: delegate }, delegate }
}

describe('DELETE /api/projects/:id', () => {
  it('returns the exact success envelope and delegates the decoded ID once', async () => {
    const owned = injectedClose(async (id) => ({ disposition: 'closed', id }))
    const app = await build({
      createProjectCloseService: () => owned.service,
    })
    const id = ' id <script> /? '
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/projects/' + encodeURIComponent(id),
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id, disposition: 'closed' })
    expect(owned.delegate).toHaveBeenCalledOnce()
    expect(owned.delegate).toHaveBeenCalledWith(id)
  })

  it.each([
    [
      'absent',
      async () => ({ disposition: 'project_not_found' as const }),
      404,
      PROJECT_NOT_FOUND,
    ],
    [
      'invalid',
      async () => {
        throw new ProjectCloseError('invalid_project_id')
      },
      400,
      INVALID_PROJECT_ID,
    ],
    [
      'persistence',
      async () => {
        throw new ProjectCloseError('project_close_failed')
      },
      500,
      PROJECT_CLOSE_FAILED,
    ],
    [
      'unexpected',
      async () => {
        throw new Error('SELECT secret /private/database stack content')
      },
      500,
      PROJECT_CLOSE_FAILED,
    ],
  ] as const)(
    'maps %s without partial success',
    async (_label, implementation, status, category) => {
      const owned = injectedClose(implementation)
      const app = await build({
        createProjectCloseService: () => owned.service,
      })
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/opaque',
      })
      expect(response.statusCode).toBe(status)
      expect(response.json()).toEqual({ error: { category } })
      expect(response.json()).not.toHaveProperty('id')
      expect(response.json()).not.toHaveProperty('disposition')
      expect(owned.delegate).toHaveBeenCalledOnce()
    }
  )

  it.each(['/api/projects/', '/api/projects/%'])(
    'rejects malformed route input without delegation: %s',
    async (url) => {
      const owned = injectedClose(async (id) => ({ disposition: 'closed', id }))
      const app = await build({
        createProjectCloseService: () => owned.service,
      })
      const response = await app.inject({ method: 'DELETE', url })
      expect(response.statusCode).toBe(400)
      expect(response.json()).toEqual({
        error: { category: INVALID_PROJECT_ID },
      })
      expect(owned.delegate).not.toHaveBeenCalled()
    }
  )

  it('fails closed for a mismatched internal success ID', async () => {
    const owned = injectedClose(async () => ({
      disposition: 'closed',
      id: 'different',
    }))
    const app = await build({ createProjectCloseService: () => owned.service })
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/projects/original',
    })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { category: PROJECT_CLOSE_FAILED },
    })
  })

  it('maps a malformed non-DELETE URL to the safe registration category', async () => {
    const app = await build()
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/%',
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      error: { category: 'invalid_registration_request' },
    })
  })

  it('redacts response, headers, and structured logs', async () => {
    const sentinel = 'SECRET SELECT /private/database stack project-content'
    const logs: string[] = []
    const app = Fastify({
      logger: { stream: { write: (line: string) => logs.push(line) } },
    })
    await app.register(appPlugin, {
      createProjectLibrary: async () => ({
        create: vi.fn(),
        list: vi.fn(async () => []),
        closeProject: vi.fn(),
        close: vi.fn(),
      }),
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
      createProjectCloseService: () => ({
        closeProject: async () => {
          throw new Error(sentinel)
        },
      }),
    })
    await app.ready()
    try {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/' + encodeURIComponent(sentinel),
      })
      const observable =
        response.body + JSON.stringify(response.headers) + logs.join('')
      expect(response.statusCode).toBe(500)
      expect(observable).toContain(PROJECT_CLOSE_FAILED)
      expect(observable).toContain(PROJECT_CLOSE_FAILED_EVENT)
      expect(observable).not.toContain(sentinel)
    } finally {
      await app.close()
    }
  })

  it('produces exactly one closed and seven not-found responses durably', async () => {
    const context = await allocateDatabaseTestContext('bl009-eight-delete')
    const library = await createProjectLibrary(context.databasePath)
    const project: Project = {
      id: 'concurrent-close',
      name: 'Concurrent',
      canonicalPath: '/fixture/concurrent',
      createdAt: 1,
    }
    const sibling: Project = {
      id: 'sibling',
      name: 'Sibling',
      canonicalPath: '/fixture/sibling',
      createdAt: 2,
    }
    let app: Awaited<ReturnType<typeof build>> | undefined
    try {
      await library.create(project)
      await library.create(sibling)
      app = await build({ createProjectLibrary: async () => library })
      const responses = await Promise.all(
        Array.from({ length: 8 }, () =>
          app!.inject({
            method: 'DELETE',
            url: '/api/projects/concurrent-close',
          })
        )
      )
      expect(
        responses.filter(({ statusCode }) => statusCode === 200)
      ).toHaveLength(1)
      expect(
        responses.filter(({ statusCode }) => statusCode === 404)
      ).toHaveLength(7)
      expect(responses.map((response) => response.json())).toContainEqual({
        id: project.id,
        disposition: 'closed',
      })
      expect(await library.list()).toEqual([sibling])
      await app.close()
      app = undefined
      const reopened = await createProjectLibrary(context.databasePath)
      try {
        expect(await reopened.list()).toEqual([sibling])
      } finally {
        reopened.close()
      }
    } finally {
      await app?.close()
      library.close()
      await context.cleanup()
    }
  })
})
