import { copyFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

interface FixtureMetadata {
  migrationId: string
  sha256: string
  rows: Array<{
    id: string
    name: string
    canonicalPath: string
    createdAt: number
  }>
}

const fixturePath = fileURLToPath(
  new URL('./fixtures/db/0000_project_library.sqlite', import.meta.url)
)
const metadataPath = fileURLToPath(
  new URL('./fixtures/db/0000_project_library.expected.json', import.meta.url)
)

describe('previous project migration fixture', () => {
  it('is immutable, current at 0000, and contains exactly two expected rows', async () => {
    const metadata = JSON.parse(
      await readFile(metadataPath, 'utf8')
    ) as FixtureMetadata
    const fixtureBytes = await readFile(fixturePath)
    expect(createHash('sha256').update(fixtureBytes).digest('hex')).toBe(
      metadata.sha256
    )

    const context = await allocateDatabaseTestContext('fixture-integrity')
    await copyFile(fixturePath, context.databasePath)
    const resource = createDatabase(context.databasePath)
    context.registerClose(resource.close)
    try {
      const migrations = await resource.database.all<{ createdAt: number }>(sql`
        SELECT created_at AS createdAt FROM __drizzle_migrations
      `)
      const rows = await resource.database.all<{
        id: string
        name: string
        canonicalPath: string
        createdAt: number
      }>(sql`
        SELECT id, name, canonical_path AS canonicalPath, created_at AS createdAt
        FROM projects ORDER BY id
      `)
      expect(migrations.map(({ createdAt }) => Number(createdAt))).toEqual([
        1_786_406_400_000,
      ])
      expect(metadata.migrationId).toBe('0000_project_library')
      expect(rows).toEqual(metadata.rows)
    } finally {
      await context.cleanup()
    }
  })
})
