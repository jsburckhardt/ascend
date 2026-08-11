import { describe, expect, it } from 'vitest'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

describe('in-process ProjectLibrary contract', () => {
  it('creates and lists exactly four unchanged fields with idempotent close', async () => {
    const context = await allocateDatabaseTestContext('library-contract')
    const library = await createProjectLibrary(context.databasePath)
    context.registerClose(library.close)
    const project = {
      id: 'contract-project',
      name: ' Contract Name ',
      canonicalPath: '../unchanged/path',
      createdAt: 1_786_406_500_123,
    }
    try {
      await expect(library.create(project)).resolves.toEqual({
        disposition: 'created',
        project,
      })
      const listed = await library.list()
      expect(listed).toEqual([project])
      expect(Object.keys(listed[0] ?? {}).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])
      library.close()
      library.close()
    } finally {
      await context.cleanup()
    }
  })
})
