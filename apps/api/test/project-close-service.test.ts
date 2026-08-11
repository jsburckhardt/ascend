import { sql } from 'drizzle-orm'
import { describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../src/db/client.js'
import {
  ProjectCloseError,
  createProjectCloseService,
} from '../src/project-close.js'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

const target = {
  id: ' target <script> ',
  name: 'Target',
  canonicalPath: '/fixture/target',
  createdAt: 1,
}
const sibling = {
  id: 's',
  name: 'Sibling',
  canonicalPath: '/fixture/sibling',
  createdAt: 2,
}

describe('ProjectCloseService', () => {
  it('rejects malformed input before persistence and redacts failures', async () => {
    const closeProject = vi.fn()
    const service = createProjectCloseService({ closeProject })
    const invalid = await service
      .closeProject('')
      .catch((error: unknown) => error)
    expect(invalid).toBeInstanceOf(ProjectCloseError)
    expect(invalid).toMatchObject({ category: 'invalid_project_id' })
    expect(closeProject).not.toHaveBeenCalled()
    await expect(
      (service.closeProject as unknown as (id: unknown) => Promise<unknown>)(
        undefined
      )
    ).rejects.toMatchObject({ category: 'invalid_project_id' })
    expect(closeProject).not.toHaveBeenCalled()

    closeProject.mockRejectedValueOnce(
      new Error('SELECT secret FROM projects /private/database stack')
    )
    const failed = await service
      .closeProject('opaque')
      .catch((error: unknown) => error)
    expect(failed).toMatchObject({ category: 'project_close_failed' })
    expect(failed).not.toHaveProperty('cause')
    expect(String(failed)).not.toContain('SELECT secret')
  })

  it('removes one stable ID, reports repeated absence, and persists restart absence', async () => {
    const context = await allocateDatabaseTestContext('bl009-close-service')
    let library = await createProjectLibrary(context.databasePath)
    try {
      await library.create(target)
      await library.create(sibling)
      const service = createProjectCloseService(library)
      await expect(service.closeProject(target.id)).resolves.toEqual({
        disposition: 'closed',
        id: target.id,
      })
      await expect(service.closeProject(target.id)).resolves.toEqual({
        disposition: 'project_not_found',
      })
      expect(await library.list()).toEqual([sibling])
      library.close()
      library.close()
      library = await createProjectLibrary(context.databasePath)
      expect(await library.list()).toEqual([sibling])
    } finally {
      library.close()
      await context.cleanup()
    }
  })

  it('rolls back a real failure raised after DELETE', async () => {
    const context = await allocateDatabaseTestContext('bl009-close-rollback')
    let library = await createProjectLibrary(context.databasePath)
    try {
      await library.create(target)
      await library.create(sibling)
      library.close()
      const resource = createDatabase(context.databasePath)
      await resource.database.run(
        sql.raw(
          `CREATE TRIGGER close_abort AFTER DELETE ON projects BEGIN SELECT RAISE(ABORT, 'private-trigger-sentinel'); END`
        )
      )
      resource.close()
      library = await createProjectLibrary(context.databasePath)
      const before = await library.list()
      const error = await createProjectCloseService(library)
        .closeProject(target.id)
        .catch((value: unknown) => value)
      expect(error).toMatchObject({ category: 'project_close_failed' })
      expect(error).not.toHaveProperty('cause')
      expect(String(error)).not.toContain('private-trigger-sentinel')
      expect(await library.list()).toEqual(before)
    } finally {
      library.close()
      await context.cleanup()
    }
  })
})
