import { createHash } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import { createClient } from '@libsql/client'
import { fileURLToPath, pathToFileURL } from 'node:url'

const fixture = fileURLToPath(
  new URL('./0000_project_library.sqlite', import.meta.url)
)
await rm(fixture, { force: true })
const migration = await readFile(
  fileURLToPath(
    new URL('../../../drizzle/0000_project_library.sql', import.meta.url)
  ),
  'utf8'
)
const hash = createHash('sha256').update(migration).digest('hex')
const client = createClient({ url: pathToFileURL(fixture).href })
try {
  await client.batch(
    [
      migration,
      `CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
      {
        sql: `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`,
        args: [hash, 1_786_406_400_000],
      },
      {
        sql: `INSERT INTO projects (id, name, canonical_path, created_at) VALUES (?, ?, ?, ?)`,
        args: [
          'fixture-project-1',
          'Fixture Alpha',
          '/fixture/alpha',
          1_700_000_000_000,
        ],
      },
      {
        sql: `INSERT INTO projects (id, name, canonical_path, created_at) VALUES (?, ?, ?, ?)`,
        args: [
          'fixture-project-2',
          'Fixture Beta',
          '/fixture/beta',
          1_700_000_001_000,
        ],
      },
    ],
    'write'
  )
} finally {
  client.close()
}
