import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DATABASE_PATH } from '../src/db/client.js'
import { MIGRATION_CATALOG } from '../src/db/migrations.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

const repositoryFile = (file: string) => path.join(REPOSITORY_ROOT, file)

const documentationPaths = [
  repositoryFile('docs/README.md'),
  repositoryFile('apps/api/README.md'),
  repositoryFile('.harness/engineering-harness.md'),
]

describe('project persistence documentation contract', () => {
  it('keeps operation schema outcomes lifecycle and scope synchronized', async () => {
    const [
      applicationDocs,
      apiDocs,
      harnessDocs,
      justfile,
      journal,
      schema,
      fixture,
    ] = await Promise.all([
      readFile(documentationPaths[0], 'utf8'),
      readFile(documentationPaths[1], 'utf8'),
      readFile(documentationPaths[2], 'utf8'),
      readFile(repositoryFile('justfile'), 'utf8'),
      readFile(repositoryFile('apps/api/drizzle/meta/_journal.json'), 'utf8'),
      readFile(repositoryFile('apps/api/src/db/schema.ts'), 'utf8'),
      readFile(
        repositoryFile(
          'apps/api/test/fixtures/db/0000_project_library.expected.json'
        ),
        'utf8'
      ),
    ])
    const combined = [applicationDocs, apiDocs, harnessDocs].join('\n')

    expect(DEFAULT_DATABASE_PATH).toBe(
      path.join(REPOSITORY_ROOT, 'apps/api/ascend.db')
    )
    for (const token of [
      '<repository>/apps/api/ascend.db',
      'ASCEND_DATABASE_URL',
      'just db-migrate <database-path>',
      'appliedMigrationIds',
      'currentMigrationId',
      '0000_project_library',
      '0001_project_canonical_path_unique',
      'canonical_path',
      'created_at',
      'canonicalPath',
      'createdAt',
      'created',
      'existing',
      'empty-id',
      'blank-name',
      'empty-canonical-path',
      'invalid-created-at',
      'test-results/bl-005/databases',
      '0000_project_library.sqlite',
      '-wal',
      '-shm',
      '-journal',
      'BL-006',
      'BL-007',
    ]) {
      expect(combined).toContain(token)
    }

    const currentMigrationId = MIGRATION_CATALOG.at(-1)?.id
    expect(currentMigrationId).toBeDefined()
    const migrationOutputs = [
      {
        appliedMigrationIds: MIGRATION_CATALOG.map(({ id }) => id),
        currentMigrationId,
      },
      {
        appliedMigrationIds: ['0001_project_canonical_path_unique'],
        currentMigrationId,
      },
      { appliedMigrationIds: [], currentMigrationId },
    ].map((result) => JSON.stringify(result))
    for (const output of migrationOutputs) {
      expect(applicationDocs).toContain(output)
      expect(apiDocs).toContain(output)
    }

    expect(applicationDocs).toContain('migrations before listening')
    expect(apiDocs).toContain('Before binding its listener')
    expect(applicationDocs).toContain('Complete shutdown')
    expect(apiDocs).toContain('GET /api/projects')
    expect(apiDocs).toContain('createdAt ASC, id ASC')
    expect(apiDocs).toContain('refused-default database')
    expect(harnessDocs).toContain(
      'destructive reset command remains intentionally unsupported'
    )

    expect(justfile).toContain('db-migrate database_path:')
    for (const { id } of MIGRATION_CATALOG) expect(journal).toContain(id)
    for (const column of ['id', 'name', 'canonical_path', 'created_at']) {
      expect(schema).toContain(`('${column}')`)
    }
    expect(fixture).toContain('fixture-project-1')
    expect(fixture).toContain('fixture-project-2')
  })
})
