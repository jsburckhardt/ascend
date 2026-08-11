import { migrate } from 'drizzle-orm/libsql/migrator'
import { sql } from 'drizzle-orm'
import { fileURLToPath } from 'node:url'
import type { DatabaseResource } from './client.js'

export const MIGRATION_CATALOG = [
  { id: '0000_project_library', timestamp: 1_786_406_400_000 },
  { id: '0001_project_canonical_path_unique', timestamp: 1_786_406_401_000 },
] as const

export type MigrationId = (typeof MIGRATION_CATALOG)[number]['id']

export interface MigrationResult {
  appliedMigrationIds: MigrationId[]
  currentMigrationId: MigrationId
}

const migrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url)
)

async function appliedTimestamps(
  resource: DatabaseResource
): Promise<Set<number>> {
  const tables = await resource.database.all<{ name: string }>(sql`
    SELECT name FROM sqlite_master
    WHERE type = ${'table'} AND name = ${'__drizzle_migrations'}
  `)
  if (tables.length === 0) return new Set()

  const rows = await resource.database.all<{ createdAt: number }>(sql`
    SELECT created_at AS createdAt FROM __drizzle_migrations
  `)
  return new Set(rows.map((row) => Number(row.createdAt)))
}

export async function migrateDatabase(
  resource: DatabaseResource
): Promise<MigrationResult> {
  const before = await appliedTimestamps(resource)
  await migrate(resource.database, { migrationsFolder })
  const after = await appliedTimestamps(resource)
  const appliedMigrationIds = MIGRATION_CATALOG.filter(
    (entry) => !before.has(entry.timestamp) && after.has(entry.timestamp)
  ).map((entry) => entry.id)

  const current = [...MIGRATION_CATALOG]
    .reverse()
    .find((entry) => after.has(entry.timestamp))
  if (current === undefined) {
    throw new Error('Committed migrations did not produce a current migration')
  }

  return { appliedMigrationIds, currentMigrationId: current.id }
}
