import { describe, expect, it, vi } from 'vitest'
import type { ProjectLibrary } from '../src/project-library.js'
import {
  createProjectRegistrationService,
  type RegistrationFileInspector,
} from '../src/project-registration.js'

function libraryStub(): ProjectLibrary {
  return {
    create: vi.fn(),
    list: vi.fn(),
    close: vi.fn(),
  }
}

function inspectorStub(
  canonical: Readonly<Record<string, string>>,
  denied: ReadonlySet<string> = new Set(),
  files: ReadonlySet<string> = new Set()
): RegistrationFileInspector & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async canonicalize(inputPath) {
      calls.push('canonicalize:' + inputPath)
      const value = canonical[inputPath]
      if (value === undefined)
        throw Object.assign(new Error('hidden'), { code: 'ENOENT' })
      return value
    },
    async inspectDirectory(inputPath) {
      calls.push('inspect:' + inputPath)
      return files.has(inputPath) ? 'not_directory' : 'directory'
    },
    async assertReadable(inputPath) {
      calls.push('readable:' + inputPath)
      if (denied.has(inputPath))
        throw Object.assign(new Error('hidden'), { code: 'EACCES' })
    },
  }
}

describe('project registration construction', () => {
  it('validates and canonicalizes all entries before opening persistence', async () => {
    const inspector = inspectorStub({
      '/home-link': '/home-real',
      '/root': '/root-real',
      '/root-link': '/root-real',
    })
    const library = libraryStub()
    const createLibrary = vi.fn(async () => library)

    const result = await createProjectRegistrationService(
      {
        databasePath: '/database.sqlite',
        configuredHome: '/home-link',
        allowedRoots: ['/root', '/root-link'],
      },
      { fileInspector: inspector, createLibrary }
    )

    expect(result).toEqual(
      expect.objectContaining({ status: 'ready', service: expect.any(Object) })
    )
    expect(
      inspector.calls.filter((call) => call.startsWith('canonicalize:'))
    ).toEqual([
      'canonicalize:/home-link',
      'canonicalize:/root',
      'canonicalize:/root-link',
    ])
    expect(createLibrary).toHaveBeenCalledOnce()
    expect(inspector.calls.at(-1)).toBe('readable:/root-real')
  })

  it('accepts empty roots as a ready deny-all policy', async () => {
    const inspector = inspectorStub({
      '/home': '/home',
      '/home/project': '/home/project',
    })
    const result = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/home', allowedRoots: [] },
      { fileInspector: inspector, createLibrary: async () => libraryStub() }
    )
    if (!('status' in result)) throw new Error('Expected ready service')
    await expect(result.service.register('/home/project')).resolves.toEqual({
      category: 'outside_opening_policy',
      field: 'path',
    })
  })

  it.each([
    ['relative home', 'home', ['/root'], 'configured_home'],
    ['missing home', '/missing', ['/root'], 'configured_home'],
    ['file home', '/home-file', ['/root'], 'configured_home'],
    ['unreadable home', '/home-denied', ['/root'], 'configured_home'],
    ['relative root', '/home', ['root'], 'allowed_roots[0]'],
    ['missing root', '/home', ['/missing'], 'allowed_roots[0]'],
    ['file root', '/home', ['/root-file'], 'allowed_roots[0]'],
    ['unreadable root', '/home', ['/root-denied'], 'allowed_roots[0]'],
  ])(
    'fails closed for %s',
    async (_label, configuredHome, allowedRoots, field) => {
      const inspector = inspectorStub(
        {
          '/home': '/home',
          '/home-file': '/home-file',
          '/home-denied': '/home-denied',
          '/root': '/root',
          '/root-file': '/root-file',
          '/root-denied': '/root-denied',
        },
        new Set(['/home-denied', '/root-denied']),
        new Set(['/home-file', '/root-file'])
      )
      const createLibrary = vi.fn(async () => libraryStub())
      const result = await createProjectRegistrationService(
        { databasePath: '/db', configuredHome, allowedRoots },
        { fileInspector: inspector, createLibrary }
      )
      expect(result).toEqual({ category: 'invalid_opening_policy', field })
      expect(Object.keys(result).sort()).toEqual(['category', 'field'])
      expect(createLibrary).not.toHaveBeenCalled()
    }
  )

  it('rejects a mixed root set without opening persistence', async () => {
    const inspector = inspectorStub({
      '/home': '/home',
      '/valid-a': '/valid-a',
      '/valid-b': '/valid-b',
    })
    const createLibrary = vi.fn(async () => libraryStub())
    const result = await createProjectRegistrationService(
      {
        databasePath: '/db',
        configuredHome: '/home',
        allowedRoots: ['/valid-a', '/missing', '/valid-b'],
      },
      { fileInspector: inspector, createLibrary }
    )
    expect(result).toEqual({
      category: 'invalid_opening_policy',
      field: 'allowed_roots[1]',
    })
    expect(createLibrary).not.toHaveBeenCalled()
  })

  it.each(['', ' ', '\t\n'])(
    'classifies blank input before filesystem access',
    async (input) => {
      const inspector = inspectorStub({ '/home': '/home', '/root': '/root' })
      const result = await createProjectRegistrationService(
        {
          databasePath: '/db',
          configuredHome: '/home',
          allowedRoots: ['/root'],
        },
        { fileInspector: inspector, createLibrary: async () => libraryStub() }
      )
      if (!('status' in result)) throw new Error('Expected ready service')
      inspector.calls.length = 0
      await expect(result.service.register(input)).resolves.toEqual({
        category: 'path_required',
        field: 'path',
      })
      expect(inspector.calls).toEqual([])
    }
  )

  it('classifies NUL before filesystem access', async () => {
    const inspector = inspectorStub({ '/home': '/home', '/root': '/root' })
    const result = await createProjectRegistrationService(
      { databasePath: '/db', configuredHome: '/home', allowedRoots: ['/root'] },
      { fileInspector: inspector, createLibrary: async () => libraryStub() }
    )
    if (!('status' in result)) throw new Error('Expected ready service')
    inspector.calls.length = 0
    await expect(result.service.register('/root/a\0b')).resolves.toEqual({
      category: 'unsupported_path_syntax',
      field: 'path',
    })
    expect(inspector.calls).toEqual([])
  })
})
