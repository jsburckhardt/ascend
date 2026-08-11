import { describe, expect, it, vi } from 'vitest'
import {
  ProjectPersistenceError,
  createProjectRepository,
  type Project,
  type ProjectPersistenceAdapter,
} from '../src/project-persistence.js'

const validProject: Project = {
  id: 'project-1',
  name: ' Project One ',
  canonicalPath: './path-not-canonicalized',
  createdAt: 1_786_406_500_000,
}

function adapter(): ProjectPersistenceAdapter {
  return {
    insert: vi.fn(async (input: Project) => input),
    findByCanonicalPath: vi.fn(),
    list: vi.fn(async () => []),
    deleteById: vi.fn(),
  }
}

describe('project persistence contract', () => {
  it.each([
    [{ ...validProject, id: '' }, 'empty-id'],
    [{ ...validProject, name: '' }, 'blank-name'],
    [{ ...validProject, name: '   ' }, 'blank-name'],
    [{ ...validProject, canonicalPath: '' }, 'empty-canonical-path'],
    [{ ...validProject, createdAt: 1.5 }, 'invalid-created-at'],
    [{ ...validProject, createdAt: Number.NaN }, 'invalid-created-at'],
    [
      { ...validProject, createdAt: Number.POSITIVE_INFINITY },
      'invalid-created-at',
    ],
    [
      { ...validProject, createdAt: Number.NEGATIVE_INFINITY },
      'invalid-created-at',
    ],
    [{ ...validProject, createdAt: -1 }, 'invalid-created-at'],
  ] as const)(
    'rejects invalid input before adapter access',
    async (input, code) => {
      const persistenceAdapter = adapter()
      const repository = createProjectRepository(persistenceAdapter)
      await expect(repository.create(input)).resolves.toEqual({
        disposition: 'invalid',
        code,
      })
      expect(persistenceAdapter.insert).not.toHaveBeenCalled()
      expect(persistenceAdapter.findByCanonicalPath).not.toHaveBeenCalled()
    }
  )

  it('returns valid values unchanged', async () => {
    const repository = createProjectRepository(adapter())
    await expect(repository.create(validProject)).resolves.toEqual({
      disposition: 'created',
      project: validProject,
    })
  })

  it('wraps unexpected create and list adapter failures without exposing a cause', async () => {
    const rawDriverError = new Error('raw sqlite detail')
    const repository = createProjectRepository({
      insert: vi.fn(async () => {
        throw rawDriverError
      }),
      findByCanonicalPath: vi.fn(),
      list: vi.fn(async () => {
        throw rawDriverError
      }),
      deleteById: vi.fn(async () => {
        throw rawDriverError
      }),
    })

    for (const operation of [
      repository.create(validProject),
      repository.list(),
    ]) {
      const error = await operation.catch((value: unknown) => value)
      expect(error).toBeInstanceOf(ProjectPersistenceError)
      expect(error).not.toBe(rawDriverError)
      expect(error).not.toHaveProperty('cause')
      expect(String(error)).not.toContain('raw sqlite detail')
    }
  })
})
