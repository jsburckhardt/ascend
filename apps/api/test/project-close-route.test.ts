import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import appPlugin from '../src/app.js'
import {
  ProjectCloseError,
  type ProjectCloseService,
} from '../src/project-close.js'
import { createProjectLibrary } from '../src/project-library.js'
import type {
  RuntimeCloseOutcome,
  RuntimeCloseRejectionCategory,
} from '../src/project-runtime-contract.js'
import { RUNTIME_CLOSE_REJECTION_CATEGORIES } from '../src/project-runtime-contract.js'
import {
  REQUEST_URL_REDACTION_CENSOR,
  REQUEST_URL_REDACTION_PATH,
  safeRequestLoggerOptions,
  withSafeRequestLogging,
} from '../src/request-logging.js'
import type { Project } from '../src/project-persistence.js'
import {
  INVALID_PROJECT_ID,
  PROJECT_CLOSED_EVENT,
  PROJECT_CLOSE_FAILED,
  PROJECT_CLOSE_FAILED_EVENT,
  PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES,
  PROJECT_NOT_FOUND,
} from '../src/routes/projects.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'
import { build } from './helper.js'
import { settleReconciliation } from './project-close-app-helper.js'

function injectedClose(implementation: ProjectCloseService['closeProject']): {
  service: ProjectCloseService
  delegate: ReturnType<typeof vi.fn>
} {
  const delegate = vi.fn(implementation)
  return { service: { closeProject: delegate }, delegate }
}

const closed = (projectId: string): RuntimeCloseOutcome =>
  Object.freeze({ outcome: 'closed', projectId, releasedGenerations: 1 })

const alreadyAbsent = (projectId: string): RuntimeCloseOutcome =>
  Object.freeze({ outcome: 'already-absent', projectId, released: false })

const rejected = (
  projectId: string,
  category: RuntimeCloseRejectionCategory
): RuntimeCloseOutcome =>
  Object.freeze({ outcome: 'rejected', projectId, category })

/**
 * The twelve declared rows of the route status map: two success statuses and ten
 * failure categories over the eleven published categories, with
 * `project_not_found` serving both the persisted-absence path and the contender
 * path.
 */
const STATUS_MAP_ROWS = [
  ['closed', closed, 200, undefined],
  ['already-absent', alreadyAbsent, 404, PROJECT_NOT_FOUND],
  [
    'start-in-progress',
    (id: string) => rejected(id, 'start-in-progress'),
    409,
    'runtime_start_in_progress',
  ],
  [
    'stop-in-progress',
    (id: string) => rejected(id, 'stop-in-progress'),
    409,
    'runtime_stop_in_progress',
  ],
  [
    'restart-in-progress',
    (id: string) => rejected(id, 'restart-in-progress'),
    409,
    'runtime_restart_in_progress',
  ],
  [
    'reconcile-in-progress',
    (id: string) => rejected(id, 'reconcile-in-progress'),
    409,
    'runtime_reconcile_in_progress',
  ],
  [
    'reconcile-unresolved',
    (id: string) => rejected(id, 'reconcile-unresolved'),
    409,
    'runtime_reconcile_unresolved',
  ],
  [
    'release-unconfirmed',
    (id: string) => rejected(id, 'release-unconfirmed'),
    500,
    'runtime_release_unconfirmed',
  ],
  [
    'ownership-cardinality-exceeded',
    (id: string) => rejected(id, 'ownership-cardinality-exceeded'),
    500,
    'runtime_close_ownership_unresolved',
  ],
  [
    'removal-failed',
    (id: string) => rejected(id, 'removal-failed'),
    500,
    PROJECT_CLOSE_FAILED,
  ],
  [
    'manager-shutdown',
    (id: string) => rejected(id, 'manager-shutdown'),
    503,
    'runtime_manager_shutdown',
  ],
  ['invalid identifier', undefined, 400, INVALID_PROJECT_ID],
] as const

describe('DELETE /api/projects/:id', () => {
  it('publishes exactly eleven route categories over twelve status rows', () => {
    expect(PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES).toEqual([
      INVALID_PROJECT_ID,
      PROJECT_NOT_FOUND,
      PROJECT_CLOSE_FAILED,
      'runtime_start_in_progress',
      'runtime_stop_in_progress',
      'runtime_restart_in_progress',
      'runtime_reconcile_in_progress',
      'runtime_reconcile_unresolved',
      'runtime_release_unconfirmed',
      'runtime_close_ownership_unresolved',
      'runtime_manager_shutdown',
    ])
    expect(new Set(PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES).size).toBe(11)
    expect(STATUS_MAP_ROWS).toHaveLength(12)
    // Two success statuses: `200 closed` and the `404 project_not_found`
    // persisted-absence path. The remaining ten rows are the failure categories.
    const successRows = STATUS_MAP_ROWS.filter(
      ([label]) => label === 'closed' || label === 'already-absent'
    )
    expect(successRows.map(([, , status]) => status)).toEqual([200, 404])
    const failureRows = STATUS_MAP_ROWS.filter(
      ([label]) => label !== 'closed' && label !== 'already-absent'
    )
    expect(failureRows).toHaveLength(10)
    expect(new Set(failureRows.map(([, , , category]) => category)).size).toBe(
      10
    )
    // `project_not_found` is the eleventh published category and is reached
    // only from the success-shaped absence row and the joined-contender path.
    expect(
      new Set(
        STATUS_MAP_ROWS.map(([, , , category]) => category).filter(
          (category): category is string => category !== undefined
        )
      ).size
    ).toBe(11)
    // Every rejection the manager can produce is mapped by a declared row.
    expect(
      STATUS_MAP_ROWS.map(([label]) => label).filter((label) =>
        (RUNTIME_CLOSE_REJECTION_CATEGORIES as readonly string[]).includes(
          label
        )
      )
    ).toEqual([...RUNTIME_CLOSE_REJECTION_CATEGORIES])
  })

  it('returns the exact success envelope and delegates the decoded ID once', async () => {
    const id = ' id <script> /? '
    const owned = injectedClose(async (projectId) => closed(projectId))
    const app = await build({
      createProjectCloseService: () => owned.service,
    })
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/projects/' + encodeURIComponent(id),
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id, disposition: 'closed' })
    expect(Object.keys(response.json() as object).sort()).toEqual([
      'disposition',
      'id',
    ])
    expect(owned.delegate).toHaveBeenCalledOnce()
    expect(owned.delegate).toHaveBeenCalledWith(id)
  })

  it.each(
    STATUS_MAP_ROWS.filter(
      (
        row
      ): row is Extract<
        (typeof STATUS_MAP_ROWS)[number],
        readonly [string, (id: string) => RuntimeCloseOutcome, number, unknown]
      > => typeof row[1] === 'function' && row[3] !== undefined
    )
  )(
    'maps %s without partial success',
    async (_label, outcome, status, category) => {
      const owned = injectedClose(async (projectId) => outcome(projectId))
      const app = await build({
        createProjectCloseService: () => owned.service,
      })
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/opaque',
      })
      expect(response.statusCode).toBe(status)
      expect(response.json()).toEqual({ error: { category } })
      expect(Object.keys(response.json() as object)).toEqual(['error'])
      expect(response.json()).not.toHaveProperty('id')
      expect(response.json()).not.toHaveProperty('disposition')
      expect(owned.delegate).toHaveBeenCalledOnce()
    }
  )

  it.each([
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
    'maps a thrown %s fault to its safe category',
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
      expect(owned.delegate).toHaveBeenCalledOnce()
    }
  )

  it.each(['/api/projects/', '/api/projects/%'])(
    'rejects malformed route input without delegation: %s',
    async (url) => {
      const owned = injectedClose(async (projectId) => closed(projectId))
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

  it.each([
    ['closed', () => closed('different')],
    ['already-absent', () => alreadyAbsent('different')],
    ['rejected', () => rejected('different', 'release-unconfirmed')],
  ] as const)(
    'fails closed for a mismatched internal %s project ID',
    async (_label, outcome) => {
      const owned = injectedClose(async () => outcome())
      const app = await build({
        createProjectCloseService: () => owned.service,
      })
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/original',
      })
      expect(response.statusCode).toBe(500)
      expect(response.json()).toEqual({
        error: { category: PROJECT_CLOSE_FAILED },
      })
    }
  )

  it('emits project.closed only for a completed close', async () => {
    const outcomes: RuntimeCloseOutcome[] = [
      closed('subject'),
      alreadyAbsent('subject'),
      rejected('subject', 'release-unconfirmed'),
      rejected('subject', 'removal-failed'),
      rejected('subject', 'manager-shutdown'),
    ]
    for (const outcome of outcomes) {
      const logs: string[] = []
      const app = Fastify(
        withSafeRequestLogging({
          logger: { stream: { write: (line: string) => logs.push(line) } },
        })
      )
      await app.register(appPlugin, {
        createProjectLibrary: async () => ({
          create: vi.fn(),
          findById: vi.fn(async () => undefined),
          list: vi.fn(async () => []),
          closeProject: vi.fn(),
          close: vi.fn(),
        }),
        createProjectRegistration: async () => ({
          register: vi.fn(),
          close: vi.fn(),
        }),
        createProjectCloseService: () => ({
          closeProject: async () => outcome,
        }),
      })
      await app.ready()
      try {
        await app.inject({ method: 'DELETE', url: '/api/projects/subject' })
        const emitted = logs.join('')
        const closedRecords = emitted.split(PROJECT_CLOSED_EVENT).length - 1
        expect(closedRecords, outcome.outcome).toBe(
          outcome.outcome === 'closed' ? 1 : 0
        )
      } finally {
        await app.close()
      }
    }
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

  it('redacts DELETE IDs from access logs, headers, body, and safe events', async () => {
    const sentinel =
      'PROJECT-ID SECRET SELECT /private/database stack project-content'
    const encodedSentinel = encodeURIComponent(sentinel)
    const logs: string[] = []
    const app = Fastify(
      withSafeRequestLogging({
        logger: { stream: { write: (line: string) => logs.push(line) } },
      })
    )
    await app.register(appPlugin, {
      createProjectLibrary: async () => ({
        create: vi.fn(),
        findById: vi.fn(async () => undefined),
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
        url: '/api/projects/' + encodedSentinel,
      })
      const logged = logs.join('')
      expect(response.statusCode).toBe(500)
      expect(response.json()).toEqual({
        error: { category: PROJECT_CLOSE_FAILED },
      })
      expect(response.headers['content-type']).toMatch(/^application\/json\b/u)
      expect(JSON.stringify(response.headers)).not.toContain(sentinel)
      expect(response.body).not.toContain(sentinel)
      expect(logged).toContain(PROJECT_CLOSE_FAILED_EVENT)
      expect(logged).toContain(REQUEST_URL_REDACTION_CENSOR)
      expect(logged).not.toContain(sentinel)
      expect(logged).not.toContain(encodedSentinel)
      expect(logged).not.toContain('/api/projects/PROJECT-ID')
    } finally {
      await app.close()
    }
  })

  it('keeps every safe rejection body free of the requested identifier', async () => {
    const sentinel = 'SENSITIVE-ID /private/database'
    for (const category of RUNTIME_CLOSE_REJECTION_CATEGORIES) {
      const app = await build({
        createProjectCloseService: () => ({
          closeProject: async (projectId) => rejected(projectId, category),
        }),
      })
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/projects/' + encodeURIComponent(sentinel),
      })
      expect(response.body, category).not.toContain(sentinel)
      expect(Object.keys(response.json() as object), category).toEqual([
        'error',
      ])
    }
  })

  it('preserves configured logger redactions while enforcing request URL redaction', () => {
    expect(
      safeRequestLoggerOptions({
        redact: { paths: ['req.headers.authorization'], censor: '[safe]' },
      })
    ).toMatchObject({
      redact: {
        paths: ['req.headers.authorization', REQUEST_URL_REDACTION_PATH],
        censor: '[safe]',
      },
    })
    expect(withSafeRequestLogging(undefined)).toMatchObject({
      logger: {
        redact: {
          paths: [REQUEST_URL_REDACTION_PATH],
          censor: REQUEST_URL_REDACTION_CENSOR,
        },
      },
    })
    expect(withSafeRequestLogging({ logger: false })).toEqual({ logger: false })
    expect(withSafeRequestLogging({ logger: true })).toMatchObject({
      logger: { redact: { paths: [REQUEST_URL_REDACTION_PATH] } },
    })
    expect(
      safeRequestLoggerOptions({ redact: ['req.headers.cookie'] })
    ).toMatchObject({
      redact: {
        paths: ['req.headers.cookie', REQUEST_URL_REDACTION_PATH],
        censor: REQUEST_URL_REDACTION_CENSOR,
      },
    })
    expect(withSafeRequestLogging({})).toEqual({})
  })

  it('produces exactly one closed and seven not-found responses durably', async () => {
    const context = await allocateDatabaseTestContext('bl020-eight-delete')
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
      await settleReconciliation(app)
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

  it('answers a repeated close with 200 then three 404s and one project.closed', async () => {
    const context = await allocateDatabaseTestContext('bl020-repeated-close')
    const library = await createProjectLibrary(context.databasePath)
    const project: Project = {
      id: 'repeat-close',
      name: 'Repeat',
      canonicalPath: '/fixture/repeat',
      createdAt: 1,
    }
    const logs: string[] = []
    const app = Fastify(
      withSafeRequestLogging({
        logger: { stream: { write: (line: string) => logs.push(line) } },
      })
    )
    await app.register(appPlugin, {
      createProjectLibrary: async () => library,
      createProjectRegistration: async () => ({
        register: vi.fn(),
        close: vi.fn(),
      }),
    })
    await app.ready()
    try {
      await library.create(project)
      const statuses: number[] = []
      const bodies: unknown[] = []
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await app.inject({
          method: 'DELETE',
          url: '/api/projects/repeat-close',
        })
        statuses.push(response.statusCode)
        bodies.push(response.json())
      }
      expect(statuses).toEqual([200, 404, 404, 404])
      expect(bodies).toEqual([
        { id: project.id, disposition: 'closed' },
        { error: { category: PROJECT_NOT_FOUND } },
        { error: { category: PROJECT_NOT_FOUND } },
        { error: { category: PROJECT_NOT_FOUND } },
      ])
      expect(logs.join('').split(PROJECT_CLOSED_EVENT).length - 1).toBe(1)
      expect(await library.list()).toEqual([])
    } finally {
      await app.close()
      library.close()
      await context.cleanup()
    }
  })
})
