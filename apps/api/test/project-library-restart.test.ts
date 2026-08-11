import { describe, expect, it } from 'vitest'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

describe('complete in-process ProjectLibrary restart', () => {
  it('reconstructs fresh resources and returns exactly two records once each', async () => {
    const context = await allocateDatabaseTestContext('complete-restart')
    const generations: string[] = []
    const first = await createProjectLibrary(context.databasePath)
    context.registerClose(first.close)
    const projects = [
      {
        id: 'restart-alpha',
        name: 'Restart Alpha',
        canonicalPath: '/restart/alpha',
        createdAt: 1_786_406_900_001,
      },
      {
        id: 'restart-beta',
        name: 'Restart Beta',
        canonicalPath: '/restart/beta',
        createdAt: 1_786_406_900_002,
      },
    ]
    try {
      generations.push('generation-one-open')
      for (const project of projects) {
        await expect(first.create(project)).resolves.toEqual({
          disposition: 'created',
          project,
        })
      }
      await expect(first.list()).resolves.toEqual(projects)
      first.close()
      first.close()
      generations.push('generation-one-closed')

      const second = await createProjectLibrary(context.databasePath)
      context.registerClose(second.close)
      generations.push('generation-two-open')
      const restarted = await second.list()
      expect(restarted).toEqual(projects)
      expect(new Set(restarted.map(({ id }) => id)).size).toBe(2)
      second.close()
      second.close()
      generations.push('generation-two-closed')
      expect(generations).toEqual([
        'generation-one-open',
        'generation-one-closed',
        'generation-two-open',
        'generation-two-closed',
      ])
    } finally {
      await context.cleanup()
    }
  }, 10_000)
})
