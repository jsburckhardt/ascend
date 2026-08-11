import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import appPlugin from '../src/app.js'
import {
  createProjectLibrary,
  type ProjectLibrary,
} from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  PROJECT_LIST_FAILED,
  PROJECT_LIST_FAILED_EVENT,
  validateAndOrderProjects,
} from '../src/routes/projects.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { build } from './helper.js'

const projects: Project[] = [
  {
    id: 'project-z',
    name: 'Project Z',
    canonicalPath: '/projects/z',
    createdAt: 30,
  },
  {
    id: 'project-b',
    name: ' Project B ',
    canonicalPath: '/projects/b',
    createdAt: 10,
  },
  {
    id: 'project-a',
    name: 'Project A',
    canonicalPath: '/projects/a',
    createdAt: 10,
  },
]

function libraryWithList(list: () => Promise<Project[]>): ProjectLibrary {
  return {
    create: vi.fn(),
    list,
    close: vi.fn(),
  }
}

describe('project list row validation branches', () => {
  it.each([
    'not-an-array',
    [undefined],
    [{}],
    [{ id: 1, name: 'Name', canonicalPath: '/path', createdAt: 1 }],
    [{ id: 'id', name: 1, canonicalPath: '/path', createdAt: 1 }],
    [{ id: 'id', name: 'Name', canonicalPath: 1, createdAt: 1 }],
    [{ id: 'id', name: 'Name', canonicalPath: '/path', createdAt: '1' }],
    [{ id: 'id', name: 'Name', canonicalPath: '/path', createdAt: Number.NaN }],
    [
      {
        id: 'id',
        name: 'Name',
        canonicalPath: '/path',
        createdAt: Number.MAX_SAFE_INTEGER + 1,
      },
    ],
  ])('rejects unsafe list value: %j', (value) => {
    expect(() => validateAndOrderProjects(value)).toThrow(
      'Invalid project list'
    )
  })
})

describe('GET /api/projects', () => {
  it('returns the exact empty success envelope', async () => {
    const app = await build({
      createProjectLibrary: async () => libraryWithList(async () => []),
    })
    const response = await app.inject('/api/projects')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ projects: [] })
  })

  it('returns all persisted fields once in byte-stable createdAt then ID order across restart', async () => {
    const context = await allocateDatabaseTestContext('project-list-route')
    try {
      const first = await createProjectLibrary(context.databasePath)
      context.registerClose(first.close)
      for (const project of projects) {
        await expect(first.create(project)).resolves.toMatchObject({
          disposition: 'created',
        })
      }
      first.close()

      const app = await build({
        createProjectLibrary: () => createProjectLibrary(context.databasePath),
      })
      const firstResponse = await app.inject('/api/projects')
      const secondResponse = await app.inject('/api/projects')
      expect(firstResponse.statusCode).toBe(200)
      expect(firstResponse.body).toBe(secondResponse.body)
      expect(firstResponse.json()).toEqual({
        projects: [projects[2], projects[1], projects[0]],
      })
      const body = firstResponse.json<{ projects: Project[] }>()
      expect(body.projects.map(({ id }) => id)).toEqual([
        'project-a',
        'project-b',
        'project-z',
      ])
      for (const project of body.projects) {
        expect(Object.keys(project).sort()).toEqual([
          'canonicalPath',
          'createdAt',
          'id',
          'name',
        ])
      }
    } finally {
      await context.cleanup()
    }
  })

  it.each([
    [{ id: '', name: 'Name', canonicalPath: '/path', createdAt: 1 }],
    [{ id: 'id', name: '   ', canonicalPath: '/path', createdAt: 1 }],
    [{ id: 'id', name: 'Name', canonicalPath: '', createdAt: 1 }],
    [{ id: 'id', name: 'Name', canonicalPath: '/path', createdAt: -1 }],
    [{ id: 'id', name: 'Name', canonicalPath: '/path', createdAt: 1.5 }],
    [
      {
        id: 'id',
        name: 'Name',
        canonicalPath: '/path',
        createdAt: 1,
        extra: true,
      },
    ],
    [
      { id: 'same', name: 'One', canonicalPath: '/one', createdAt: 1 },
      { id: 'same', name: 'Two', canonicalPath: '/two', createdAt: 2 },
    ],
    [null],
  ])('fails closed for malformed or duplicate rows: %j', async (rows) => {
    const app = await build({
      createProjectLibrary: async () =>
        libraryWithList(async () => rows as unknown as Project[]),
    })
    const response = await app.inject('/api/projects')
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({
      error: { category: PROJECT_LIST_FAILED },
    })
    expect(response.json()).not.toHaveProperty('projects')
  })

  it.each([
    'SECRET_LIST_SENTINEL',
    'SELECT * FROM private_table',
    'STACK_LIST_SENTINEL at hiddenFunction',
    '/private/database/LIST_SENTINEL.sqlite',
    'INTERNAL_LIST_SENTINEL',
  ])(
    'redacts list failure sentinel from response, headers, and logs: %s',
    async (sentinel) => {
      const logLines: string[] = []
      const stream = {
        write(chunk: string) {
          logLines.push(chunk)
        },
      }
      const app = Fastify({ logger: { stream } })
      await app.register(appPlugin, {
        createProjectLibrary: async () =>
          libraryWithList(async () => {
            throw new Error(sentinel)
          }),
        createProjectRegistration: async () => ({
          register: async () => ({ category: 'path_not_found', field: 'path' }),
          close() {},
        }),
      })
      await app.ready()
      try {
        const response = await app.inject('/api/projects')
        expect(response.statusCode).toBe(500)
        expect(response.json()).toEqual({
          error: { category: PROJECT_LIST_FAILED },
        })
        const observable = JSON.stringify({
          body: response.body,
          headers: response.headers,
          logs: logLines,
        })
        expect(observable).toContain(PROJECT_LIST_FAILED)
        expect(observable).toContain(PROJECT_LIST_FAILED_EVENT)
        expect(observable).not.toContain(sentinel)
        expect(response.json()).not.toHaveProperty('projects')
      } finally {
        await app.close()
      }
    }
  )
})
