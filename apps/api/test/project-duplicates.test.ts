import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import { createProjectLibrary } from '../src/project-library.js'
import type { CreateProjectResult } from '../src/project-persistence.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

function successfulProject(result: CreateProjectResult) {
  if (result.disposition === 'invalid')
    throw new Error('Unexpected invalid result')
  return result.project
}

describe('canonical-path duplicate disposition', () => {
  it('returns the durable winner for a sequential duplicate', async () => {
    const context = await allocateDatabaseTestContext('duplicate-sequential')
    const library = await createProjectLibrary(context.databasePath)
    context.registerClose(library.close)
    try {
      const first = await library.create({
        id: 'sequential-first',
        name: 'First',
        canonicalPath: '/duplicates/sequential',
        createdAt: 1_786_406_700_001,
      })
      const second = await library.create({
        id: 'sequential-second',
        name: 'Second',
        canonicalPath: '/duplicates/sequential',
        createdAt: 1_786_406_700_002,
      })
      expect(first.disposition).toBe('created')
      expect(second.disposition).toBe('existing')
      expect(successfulProject(second)).toEqual(successfulProject(first))
      await expect(library.list()).resolves.toEqual([successfulProject(first)])
    } finally {
      await context.cleanup()
    }
  })

  it('resolves exactly eight concurrent attempts as one created and seven existing', async () => {
    const context = await allocateDatabaseTestContext(
      'duplicate-concurrent-eight'
    )
    const library = await createProjectLibrary(context.databasePath)
    context.registerClose(library.close)
    try {
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          library.create({
            id: `concurrent-${index}`,
            name: `Concurrent ${index}`,
            canonicalPath: '/duplicates/concurrent',
            createdAt: 1_786_406_700_100 + index,
          })
        )
      )
      const dispositions = results.map(({ disposition }) => disposition)
      expect(dispositions.filter((value) => value === 'created')).toHaveLength(
        1
      )
      expect(dispositions.filter((value) => value === 'existing')).toHaveLength(
        7
      )
      const created = results.find(
        ({ disposition }) => disposition === 'created'
      )
      expect(created).toBeDefined()
      const winner = successfulProject(created as CreateProjectResult)
      expect(results.map(successfulProject)).toEqual(Array(8).fill(winner))

      const rawResource = createDatabase(context.databasePath)
      context.registerClose(rawResource.close)
      const rows = await rawResource.database.all(sql`SELECT * FROM projects`)
      const indexes = await rawResource.database.all<{
        name: string
        unique: number
      }>(sql`PRAGMA index_list(projects)`)
      expect(rows).toHaveLength(1)
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'projects_canonical_path_unique',
            unique: 1,
          }),
        ])
      )
      rawResource.close()
      library.close()

      const reopened = await createProjectLibrary(context.databasePath)
      context.registerClose(reopened.close)
      await expect(reopened.list()).resolves.toEqual([winner])
    } finally {
      await context.cleanup()
    }
  })
})
