import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

const repositoryFile = (file: string) => path.join(REPOSITORY_ROOT, file)

describe('SQLite persistence lifecycle architecture enforcement', () => {
  it('keeps the adopted component registered and executable', async () => {
    const [component, decisionLog, client, migrations, helper, justfile] =
      await Promise.all([
        readFile(
          repositoryFile(
            'project/architecture/core-components/CORE-COMPONENT-260810-sqlite-persistence-lifecycle.md'
          ),
          'utf8'
        ),
        readFile(
          repositoryFile('project/architecture/ADR/DECISION-LOG.md'),
          'utf8'
        ),
        readFile(repositoryFile('apps/api/src/db/client.ts'), 'utf8'),
        readFile(repositoryFile('apps/api/src/db/migrations.ts'), 'utf8'),
        readFile(
          repositoryFile('apps/api/test/project-database-test-helper.ts'),
          'utf8'
        ),
        readFile(repositoryFile('justfile'), 'utf8'),
      ])
    expect(component).toContain('## Status\n\nAdopted')
    expect(component).toContain('explicit-path, closeable database factory')
    expect(component).toContain(
      'refuse the documented developer/default database location'
    )
    expect(decisionLog).toContain(
      'CORE-COMPONENT-260810-sqlite-persistence-lifecycle'
    )
    expect(component).toContain('const resource = createDatabase(databasePath)')
    expect(component).toContain(
      'createDrizzleProjectAdapter(resource.database)'
    )
    expect(component).not.toContain('createDatabase({ databasePath })')
    expect(component).not.toContain(
      'createProjectRepository(resource.database)'
    )
    expect(client).toContain('export function createDatabase')
    expect(client).not.toContain('export const database')
    expect(migrations).toContain('MIGRATION_CATALOG')
    expect(helper).toContain('default-database-refused')
    expect(justfile).toContain('db-migrate database_path:')
  })
})
