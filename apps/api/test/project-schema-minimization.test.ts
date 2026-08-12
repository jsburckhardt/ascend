import { readFile } from 'node:fs/promises'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

export const PROJECT_DATA_SENTINELS = {
  sourceText: 'BL005_SOURCE_TEXT_SENTINEL',
  terminalOutput: 'BL005_TERMINAL_OUTPUT_SENTINEL',
  port: 'BL005_PORT_43123_SENTINEL',
  pid: 'BL005_PID_76543_SENTINEL',
  handle: 'BL005_HANDLE_SENTINEL',
  runtimeState: 'BL013_RUNTIME_STATE_SENTINEL',
  stableRoute: 'BL013_STABLE_ROUTE_SENTINEL',
  ownerToken: 'BL013_OWNER_TOKEN_SENTINEL',
  processStartIdentity: 'BL013_PROCESS_START_SENTINEL',
  environment: 'BL005_ENVIRONMENT_SENTINEL',
  credential: 'BL005_CREDENTIAL_SENTINEL',
  secret: 'BL005_SECRET_SENTINEL',
} as const

const expectedColumns = ['id', 'name', 'canonical_path', 'created_at']

describe('project schema and bounded data minimization', () => {
  it('persists exactly four fields, excludes fixed sentinels, and reopens unchanged', async () => {
    const context = await allocateDatabaseTestContext('schema-minimization')
    const library = await createProjectLibrary(context.databasePath)
    context.registerClose(library.close)
    const project = {
      id: 'schema-project',
      name: 'Schema Project',
      canonicalPath: '/schema/project',
      createdAt: 1_786_406_600_001,
    }
    try {
      await expect(library.create(project)).resolves.toMatchObject({
        disposition: 'created',
      })
      const rawResource = createDatabase(context.databasePath)
      context.registerClose(rawResource.close)
      const columns = await rawResource.database.all<{ name: string }>(
        sql`PRAGMA table_info(projects)`
      )
      const indexes = await rawResource.database.all<{
        name: string
        unique: number
      }>(sql`PRAGMA index_list(projects)`)
      const rows = await rawResource.database.all(
        sql`SELECT * FROM projects ORDER BY id`
      )
      expect(columns.map(({ name }) => name)).toEqual(expectedColumns)
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'projects_canonical_path_unique',
            unique: 1,
          }),
        ])
      )
      expect(rows).toEqual([
        {
          id: project.id,
          name: project.name,
          canonical_path: project.canonicalPath,
          created_at: project.createdAt,
        },
      ])
      expect(Object.keys((await library.list())[0] ?? {}).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])
      rawResource.close()
      library.close()

      const inspectedText = JSON.stringify({ columns, rows })
      const databaseBytes = await readFile(context.databasePath)
      for (const sentinel of Object.values(PROJECT_DATA_SENTINELS)) {
        expect(inspectedText).not.toContain(sentinel)
        expect(databaseBytes.includes(Buffer.from(sentinel))).toBe(false)
      }

      const reopened = await createProjectLibrary(context.databasePath)
      context.registerClose(reopened.close)
      await expect(reopened.list()).resolves.toEqual([project])
      reopened.close()
    } finally {
      await context.cleanup()
    }
  })

  it.each([
    ['name', PROJECT_DATA_SENTINELS.sourceText],
    ['canonicalPath', PROJECT_DATA_SENTINELS.secret],
  ] as const)(
    'keeps a deliberate sentinel only in allowed %s',
    async (field, sentinel) => {
      const context = await allocateDatabaseTestContext(`allowed-${field}`)
      const library = await createProjectLibrary(context.databasePath)
      context.registerClose(library.close)
      const project = {
        id: `allowed-${field}`,
        name: field === 'name' ? sentinel : 'Allowed Name',
        canonicalPath:
          field === 'canonicalPath' ? sentinel : `/allowed/${field}`,
        createdAt: 1_786_406_600_002,
      }
      try {
        await library.create(project)
        const rawResource = createDatabase(context.databasePath)
        context.registerClose(rawResource.close)
        const rows = await rawResource.database.all<Record<string, unknown>>(
          sql`SELECT id, name, canonical_path, created_at FROM projects`
        )
        expect(rows).toHaveLength(1)
        const matchingColumns = Object.entries(rows[0] ?? {})
          .filter(([, value]) => value === sentinel)
          .map(([column]) => column)
        expect(matchingColumns).toEqual([
          field === 'name' ? 'name' : 'canonical_path',
        ])
      } finally {
        await context.cleanup()
      }
    }
  )
})
