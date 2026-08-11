import { readFile } from 'node:fs/promises'
import { sql } from 'drizzle-orm'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import { createProjectLibrary } from '../src/project-library.js'
import type {
  Project,
  ProjectValidationCode,
} from '../src/project-persistence.js'
import {
  allocateDatabaseTestContext,
  type DatabaseTestContext,
} from './project-database-test-helper.js'

const valid: Project = {
  id: 'invalid-candidate',
  name: 'Candidate',
  canonicalPath: '/validation/candidate',
  createdAt: 1_786_406_800_000,
}

const invalidCases: Array<{
  input: Project
  code: ProjectValidationCode
}> = [
  { input: { ...valid, id: '' }, code: 'empty-id' },
  { input: { ...valid, name: '' }, code: 'blank-name' },
  { input: { ...valid, name: ' \t ' }, code: 'blank-name' },
  { input: { ...valid, canonicalPath: '' }, code: 'empty-canonical-path' },
  { input: { ...valid, createdAt: 2.5 }, code: 'invalid-created-at' },
  { input: { ...valid, createdAt: Number.NaN }, code: 'invalid-created-at' },
  {
    input: { ...valid, createdAt: Number.POSITIVE_INFINITY },
    code: 'invalid-created-at',
  },
  {
    input: { ...valid, createdAt: Number.NEGATIVE_INFINITY },
    code: 'invalid-created-at',
  },
]

async function rawSnapshot(context: DatabaseTestContext) {
  const resource = createDatabase(context.databasePath)
  context.registerClose(resource.close)
  try {
    const rows = await resource.database.all(sql`
      SELECT id, name, canonical_path, created_at FROM projects ORDER BY id
    `)
    return { count: rows.length, bytes: Buffer.from(JSON.stringify(rows)) }
  } finally {
    resource.close()
  }
}

describe('typed project validation', () => {
  it('rejects every invalid class before write with byte-identical durable rows', async () => {
    const context = await allocateDatabaseTestContext('validation-no-mutation')
    const library = await createProjectLibrary(context.databasePath)
    context.registerClose(library.close)
    try {
      await library.create({
        id: 'existing-a',
        name: 'Existing A',
        canonicalPath: '/validation/a',
        createdAt: 1_700_000_000_000,
      })
      await library.create({
        id: 'existing-b',
        name: 'Existing B',
        canonicalPath: '/validation/b',
        createdAt: 1_700_000_000_001,
      })

      for (const { input, code } of invalidCases) {
        const before = await rawSnapshot(context)
        await expect(library.create(input)).resolves.toEqual({
          disposition: 'invalid',
          code,
        })
        const after = await rawSnapshot(context)
        expect(after.count).toBe(before.count)
        expect(after.bytes.equals(before.bytes)).toBe(true)
      }

      const persistenceSource = await readFile(
        fileURLToPath(
          new URL('../src/project-persistence.ts', import.meta.url)
        ),
        'utf8'
      )
      expect(persistenceSource).not.toContain('node:fs')
      expect(persistenceSource).not.toContain('realpath')
      expect(persistenceSource).not.toContain('resolve(')
    } finally {
      await context.cleanup()
    }
  })
})
