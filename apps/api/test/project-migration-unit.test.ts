import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DATABASE_PATH,
  resolveApplicationDatabasePath,
} from '../src/db/client.js'
import { MIGRATION_CATALOG } from '../src/db/migrations.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'
import {
  DatabaseMigrationCommandError,
  runDatabaseMigrationCommand,
} from '../src/cli/db-migrate.js'

describe('project migration contract', () => {
  it('defines the explicit default and application override without opening a database', () => {
    expect(DEFAULT_DATABASE_PATH).toBe(
      path.join(REPOSITORY_ROOT, 'apps/api/ascend.db')
    )
    expect(resolveApplicationDatabasePath()).toBe(DEFAULT_DATABASE_PATH)
    expect(resolveApplicationDatabasePath('file:./alternate.db')).toBe(
      path.resolve('alternate.db')
    )
    expect(resolveApplicationDatabasePath('./plain.db')).toBe(
      path.resolve('plain.db')
    )
  })

  it('maps the committed ordered journal to exact stable migration IDs', async () => {
    const journal = JSON.parse(
      await readFile(
        path.join(REPOSITORY_ROOT, 'apps/api/drizzle/meta/_journal.json'),
        'utf8'
      )
    ) as { entries: Array<{ tag: string; when: number }> }

    expect(
      journal.entries.map(({ tag, when }) => ({ id: tag, timestamp: when }))
    ).toEqual(MIGRATION_CATALOG)
    expect(MIGRATION_CATALOG.map(({ id }) => id)).toEqual([
      '0000_project_library',
      '0001_project_canonical_path_unique',
    ])
  })

  it.each([{ args: [] }, { args: ['one.db', 'two.db'] }])(
    'rejects missing or extra CLI paths',
    async ({ args }) => {
      const write = vi.fn()
      await expect(
        runDatabaseMigrationCommand(args, write)
      ).rejects.toMatchObject<Partial<DatabaseMigrationCommandError>>({
        code: 'invalid-database-path',
      })
      expect(write).not.toHaveBeenCalled()
    }
  )
})
