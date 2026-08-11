import { execFile } from 'node:child_process'
import { copyFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { migrateExplicitDatabasePath } from '../src/cli/db-migrate.js'
import { createDatabase } from '../src/db/client.js'
import type { MigrationResult } from '../src/db/migrations.js'
import {
  allocateDatabaseTestContext,
  REPOSITORY_ROOT,
  type DatabaseTestContext,
} from './project-database-test-helper.js'

const executeFile = promisify(execFile)
const fixturePath = fileURLToPath(
  new URL('./fixtures/db/0000_project_library.sqlite', import.meta.url)
)

async function rawRows(context: DatabaseTestContext) {
  const resource = createDatabase(context.databasePath)
  context.registerClose(resource.close)
  try {
    return await resource.database.all(sql`
      SELECT id, name, canonical_path, created_at FROM projects ORDER BY id
    `)
  } finally {
    resource.close()
  }
}

describe('project migration starting states', () => {
  it('migrates absent then current state through the explicit paved command', async () => {
    const context = await allocateDatabaseTestContext('migration-fresh-current')
    try {
      const first = await executeFile(
        'just',
        ['db-migrate', context.databasePath],
        {
          cwd: REPOSITORY_ROOT,
        }
      )
      const second = await executeFile(
        'just',
        ['db-migrate', context.databasePath],
        {
          cwd: REPOSITORY_ROOT,
        }
      )
      expect(first.stderr).toBe('')
      expect(second.stderr).toBe('')
      expect(JSON.parse(first.stdout.trim()) as MigrationResult).toEqual({
        appliedMigrationIds: [
          '0000_project_library',
          '0001_project_canonical_path_unique',
        ],
        currentMigrationId: '0001_project_canonical_path_unique',
      })
      expect(JSON.parse(second.stdout.trim()) as MigrationResult).toEqual({
        appliedMigrationIds: [],
        currentMigrationId: '0001_project_canonical_path_unique',
      })
    } finally {
      await context.cleanup()
    }
  }, 10_000)

  it('upgrades only the immediately previous fixture and preserves raw rows byte-for-byte', async () => {
    const context = await allocateDatabaseTestContext('migration-prior-fixture')
    const trackedBefore = createHash('sha256')
      .update(await readFile(fixturePath))
      .digest('hex')
    await copyFile(fixturePath, context.databasePath)
    try {
      const before = Buffer.from(JSON.stringify(await rawRows(context)))
      const result = await migrateExplicitDatabasePath(context.databasePath)
      const after = Buffer.from(JSON.stringify(await rawRows(context)))
      expect(result).toEqual({
        appliedMigrationIds: ['0001_project_canonical_path_unique'],
        currentMigrationId: '0001_project_canonical_path_unique',
      })
      expect(after.equals(before)).toBe(true)
      expect(JSON.parse(after.toString())).toHaveLength(2)
      const trackedAfter = createHash('sha256')
        .update(await readFile(fixturePath))
        .digest('hex')
      expect(trackedAfter).toBe(trackedBefore)
    } finally {
      await context.cleanup()
    }
  })
})
