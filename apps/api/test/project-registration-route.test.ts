import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
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

const REDACTION_SENTINELS = [
  'SECRET-SECRET',
  '/private/submitted/path',
  '/configured/opening/root',
  'SELECT * FROM projects',
  'raw-platform-error',
  'stack-trace-sentinel',
  'internal-detail-sentinel',
] as const

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
  return {
    create: vi.fn(),
    list: vi.fn(async () => []),
    closeProject: vi.fn(),
    close: vi.fn(),
  }
}

interface RejectedCase {
  readonly label: string
  readonly payload: string
  readonly contentType?: string
  readonly status: number
  readonly body: unknown
  readonly result: RegistrationResult | Error
  readonly expectedDelegations: number
}

async function assertRejectedHttpCase(testCase: RejectedCase): Promise<void> {
  const database = await allocateDatabaseTestContext(
    'bl008-reject-' + testCase.label.replace(/[^a-z0-9]/gu, '-')
  )
  const persisted = await createProjectLibrary(database.databasePath)
  const owned = registration(testCase.result)
  const logs: string[] = []
  let app: Awaited<ReturnType<typeof build>> | undefined
  try {
    await persisted.create({
      id: 'seed-record',
      name: REDACTION_SENTINELS[0],
      canonicalPath: REDACTION_SENTINELS[2],
      createdAt: 7,
    })
    const rowsBefore = await persisted.list()
    app = await build({
      logger: { stream: { write: (line: string) => logs.push(line) } },
      createProjectLibrary: async () => persisted,
      createProjectRegistration: async () => owned.service,
    })
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: testCase.payload,
      ...(testCase.contentType === undefined
        ? {}
        : { headers: { 'content-type': testCase.contentType } }),
    })
    const rowsAfter = await persisted.list()
    expect(rowsAfter, testCase.label + ' persisted rows').toEqual(rowsBefore)
    expect(response.statusCode).toBe(testCase.status)
    expect(response.json()).toEqual(testCase.body)
    expect(owned.register).toHaveBeenCalledTimes(testCase.expectedDelegations)
    expect(response.headers['content-type']).toMatch(/^application\/json\b/u)
    const observable =
      response.body +
      '\n' +
      JSON.stringify(response.headers) +
      '\n' +
      logs.join('')
    for (const sentinel of REDACTION_SENTINELS) {
      expect(
        observable,
        testCase.label + ' redacted ' + sentinel
      ).not.toContain(sentinel)
    }
  } finally {
    await app?.close()
    persisted.close()
    await database.cleanup()
  }
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
    'maps typed %s safely with isolated persistence and redaction',
    async (category) =>
      assertRejectedHttpCase({
        label: 'typed-' + category,
        payload: JSON.stringify({
          path: category === 'path_required' ? '   ' : REDACTION_SENTINELS[1],
        }),
        contentType: 'application/json',
        status: typedStatuses[category],
        body: { error: { category, field: 'path' } },
        result: { category, field: 'path' },
        expectedDelegations: 1,
      })
  )

  const invalidCases = [
    ['empty', '', undefined],
    ['malformed', '{', 'application/json'],
    ['scalar', 'null', 'application/json'],
    ['array', '[]', 'application/json'],
    ['missing', '{}', 'application/json'],
    ['wrong-type', JSON.stringify({ path: 1 }), 'application/json'],
    [
      'extra-key',
      JSON.stringify({ path: REDACTION_SENTINELS[1], extra: true }),
      'application/json',
    ],
    [
      'parser-supported-text-plain',
      JSON.stringify({ path: REDACTION_SENTINELS[1] }),
      'text/plain',
    ],
    [
      'unsupported-application-xml',
      `<registration><path>${REDACTION_SENTINELS[1]}</path></registration>`,
      'application/xml',
    ],
    [
      'unsupported-application-octet-stream',
      JSON.stringify({ path: REDACTION_SENTINELS[1] }),
      'application/octet-stream',
    ],
  ] as const

  it.each(invalidCases)(
    'rejects %s with per-case row and redaction evidence',
    async (label, payload, contentType) =>
      assertRejectedHttpCase({
        label,
        payload,
        contentType,
        status: 400,
        body: { error: { category: INVALID_REGISTRATION_REQUEST } },
        result: { disposition: 'created', project },
        expectedDelegations: 0,
      })
  )

  it('enforces the exact encoded bound with isolated rows', async () => {
    const bodyAtBound = JSON.stringify({
      path: 'a'.repeat(PROJECT_REGISTRATION_BODY_LIMIT_BYTES - 11),
    })
    expect(Buffer.byteLength(bodyAtBound)).toBe(
      PROJECT_REGISTRATION_BODY_LIMIT_BYTES
    )
    await assertRejectedHttpCase({
      label: 'exact-bound-typed-rejection',
      payload: bodyAtBound,
      contentType: 'application/json',
      status: 404,
      body: { error: { category: 'path_not_found', field: 'path' } },
      result: { category: 'path_not_found', field: 'path' },
      expectedDelegations: 1,
    })
    const oversized = bodyAtBound + ' '
    expect(Buffer.byteLength(oversized)).toBe(
      PROJECT_REGISTRATION_BODY_LIMIT_BYTES + 1
    )
    await assertRejectedHttpCase({
      label: 'oversized',
      payload: oversized,
      contentType: 'application/json',
      status: 413,
      body: { error: { category: REGISTRATION_REQUEST_TOO_LARGE } },
      result: { disposition: 'created', project },
      expectedDelegations: 0,
    })
  })

  it('redacts unexpected service detail from rows, body, headers, and logs', async () =>
    assertRejectedHttpCase({
      label: 'unexpected',
      payload: JSON.stringify({ path: REDACTION_SENTINELS[1] }),
      contentType: 'application/json',
      status: 500,
      body: { error: { category: PROJECT_REGISTRATION_FAILED } },
      result: new Error(REDACTION_SENTINELS.join(' ')),
      expectedDelegations: 1,
    }))
})

async function constructRealService(
  databasePath: string,
  fixtureRoot: string
): Promise<ProjectRegistrationService> {
  const construction = await createProjectRegistrationService({
    databasePath,
    configuredHome: fixtureRoot,
    allowedRoots: [fixtureRoot],
  })
  if (construction.status !== 'ready')
    throw new Error('fixture opening policy failed')
  return construction.service
}

describe('POST registration identity integration', () => {
  it('retains one stable ID for sequential equivalents', async () => {
    const database = await allocateDatabaseTestContext('bl008-sequential')
    const fixture = await allocateRegistrationFixture('bl008-sequential')
    const projectPath = path.join(fixture.root, 'project')
    const linkPath = path.join(fixture.root, 'project-link')
    await mkdir(projectPath)
    await writeFile(path.join(projectPath, 'content.txt'), 'unchanged')
    await symlink(projectPath, linkPath)
    let listing: ProjectLibrary | undefined
    let service: ProjectRegistrationService | undefined
    try {
      listing = await createProjectLibrary(database.databasePath)
      service = await constructRealService(database.databasePath, fixture.root)
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
      const firstProject = first.json<{ project: Project }>().project
      expect(Object.keys(firstProject).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])
      expect(equivalent.json<{ project: Project }>().project).toEqual(
        firstProject
      )
      expect(await listing.list()).toEqual([firstProject])
      await app.close()
      listing = undefined
      service = undefined
      const reopened = await createProjectLibrary(database.databasePath)
      expect(await reopened.list()).toEqual([firstProject])
      reopened.close()
      expect(
        await readFile(path.join(projectPath, 'content.txt'), 'utf8')
      ).toBe('unchanged')
    } finally {
      service?.close()
      listing?.close()
      await database.cleanup()
      await fixture.cleanup()
    }
  })

  it('proves exactly eight concurrent requests delegate once each and return one created, seven existing', async () => {
    const database = await allocateDatabaseTestContext('bl008-eight-way')
    const fixture = await allocateRegistrationFixture('bl008-eight-way')
    const projectPath = path.join(fixture.root, 'concurrent project')
    await mkdir(projectPath)
    await writeFile(path.join(projectPath, 'content.txt'), 'unchanged')
    let listing: ProjectLibrary | undefined
    let service: ProjectRegistrationService | undefined
    try {
      listing = await createProjectLibrary(database.databasePath)
      service = await constructRealService(database.databasePath, fixture.root)
      const delegate = vi
        .fn(service.register.bind(service))
        .mockName('BL-006 register')
      const wrapped: ProjectRegistrationService = {
        register: delegate,
        close: () => service!.close(),
      }
      const app = await build({
        createProjectLibrary: async () => listing!,
        createProjectRegistration: async () => wrapped,
      })
      const post = () =>
        app.inject({
          method: 'POST',
          url: '/api/projects',
          headers: { 'content-type': 'application/json' },
          payload: JSON.stringify({ path: projectPath }),
        })
      const responses = await Promise.all(Array.from({ length: 8 }, post))
      expect(responses).toHaveLength(8)
      expect(delegate).toHaveBeenCalledTimes(8)
      expect(
        delegate.mock.calls.every(([submitted]) => submitted === projectPath)
      ).toBe(true)
      const bodies = responses.map((response) =>
        response.json<{
          disposition: 'created' | 'existing'
          project: Project
        }>()
      )
      expect(
        bodies.filter(({ disposition }) => disposition === 'created')
      ).toHaveLength(1)
      expect(
        bodies.filter(({ disposition }) => disposition === 'existing')
      ).toHaveLength(7)
      const created = bodies.find(
        ({ disposition }) => disposition === 'created'
      )!
      for (const [index, response] of responses.entries()) {
        const body = bodies[index]!
        expect(Object.keys(body).sort()).toEqual(['disposition', 'project'])
        expect(Object.keys(body.project).sort()).toEqual([
          'canonicalPath',
          'createdAt',
          'id',
          'name',
        ])
        expect(body.project).toEqual(created.project)
        expect(response.statusCode).toBe(
          body.disposition === 'created' ? 201 : 200
        )
      }
      expect(await listing.list()).toEqual([created.project])
      await app.close()
      listing = undefined
      service = undefined
      const reopened = await createProjectLibrary(database.databasePath)
      expect(await reopened.list()).toEqual([created.project])
      reopened.close()
      expect(
        await readFile(path.join(projectPath, 'content.txt'), 'utf8')
      ).toBe('unchanged')
    } finally {
      service?.close()
      listing?.close()
      await database.cleanup()
      await fixture.cleanup()
    }
  })
})
