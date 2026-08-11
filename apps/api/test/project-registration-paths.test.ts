import { describe, expect, it, vi } from 'vitest'
import type { ProjectLibrary } from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import {
  createProjectRegistrationService,
  type RegistrationFileInspector,
} from '../src/project-registration.js'

function createInspector(options: {
  canonical?: Readonly<Record<string, string>>
  files?: readonly string[]
  denied?: readonly string[]
}) {
  const calls: string[] = []
  const canonical = options.canonical ?? {}
  const files = new Set(options.files)
  const denied = new Set(options.denied)
  const inspector: RegistrationFileInspector = {
    async canonicalize(inputPath) {
      calls.push('canonicalize:' + inputPath)
      const value = canonical[inputPath]
      if (value === undefined) {
        throw Object.assign(new Error('platform detail'), { code: 'ENOENT' })
      }
      return value
    },
    async inspectDirectory(inputPath) {
      calls.push('inspect:' + inputPath)
      return files.has(inputPath) ? 'not_directory' : 'directory'
    },
    async assertReadable(inputPath) {
      calls.push('readable:' + inputPath)
      if (denied.has(inputPath)) {
        throw Object.assign(new Error('platform detail'), { code: 'EACCES' })
      }
    },
  }
  return { inspector, calls }
}

async function readyService(options: {
  canonical: Readonly<Record<string, string>>
  files?: readonly string[]
  denied?: readonly string[]
  roots?: readonly string[]
}) {
  const inspected = createInspector(options)
  const created: Project[] = []
  const library: ProjectLibrary = {
    async create(project) {
      created.push(project)
      return { disposition: 'created', project }
    },
    async list() {
      return created
    },
    closeProject: vi.fn(),
    close: vi.fn(),
  }
  const result = await createProjectRegistrationService(
    {
      databasePath: '/db',
      configuredHome: '/home-link',
      allowedRoots: options.roots ?? ['/allowed-link'],
    },
    {
      fileInspector: inspected.inspector,
      createLibrary: async () => library,
      createId: () => 'stable-id',
      now: () => 1_786_407_000_000,
    }
  )
  if (!('status' in result)) throw new Error('Expected ready service')
  inspected.calls.length = 0
  return { service: result.service, calls: inspected.calls, created }
}

describe('submitted project path validation', () => {
  it.each([
    'relative/path',
    './project',
    '../project',
    '~user',
    '~user/project',
    'C:project',
  ])('rejects unsupported syntax %s safely', async (input) => {
    const { service, calls } = await readyService({
      canonical: {
        '/home-link': '/home',
        '/allowed-link': '/allowed',
      },
    })
    const result = await service.register(input)
    expect(result).toEqual({
      category: 'unsupported_path_syntax',
      field: 'path',
    })
    expect(Object.keys(result).sort()).toEqual(['category', 'field'])
    expect(JSON.stringify(result)).not.toContain(input)
    expect(calls).toEqual([])
  })

  it('supports exactly tilde and tilde-slash expansion from canonical home', async () => {
    const { service, calls } = await readyService({
      roots: ['/home-link'],
      canonical: {
        '/home-link': '/home',
        '/home': '/home',
        '/home/project': '/home/project',
      },
    })
    await expect(service.register('~')).resolves.toMatchObject({
      disposition: 'created',
      project: { canonicalPath: '/home', name: 'home' },
    })
    await expect(service.register('~/project')).resolves.toMatchObject({
      disposition: 'created',
      project: { canonicalPath: '/home/project', name: 'project' },
    })
    expect(calls.filter((call) => call.startsWith('canonicalize:'))).toEqual([
      'canonicalize:/home',
      'canonicalize:/home/project',
    ])
  })

  it.each([
    ['/missing', 'path_not_found'],
    ['/file', 'path_not_directory'],
    ['/denied', 'path_unreadable'],
    ['/outside', 'outside_opening_policy'],
  ])('maps %s to %s without leaking errors', async (input, category) => {
    const { service } = await readyService({
      canonical: {
        '/home-link': '/home',
        '/allowed-link': '/allowed',
        '/file': '/allowed/file',
        '/denied': '/allowed/denied',
        '/outside': '/outside',
      },
      files: ['/allowed/file'],
      denied: ['/allowed/denied'],
    })
    const result = await service.register(input)
    expect(result).toEqual({ category, field: 'path' })
    expect(Object.keys(result).sort()).toEqual(['category', 'field'])
    expect(result).not.toBeInstanceOf(Error)
    expect(JSON.stringify(result)).not.toMatch(
      /platform detail|\/allowed|\/outside/
    )
  })

  it('preserves leading, internal, and trailing whitespace in valid segments', async () => {
    const submitted = '/allowed/ leading and trailing '
    const { service } = await readyService({
      canonical: {
        '/home-link': '/home',
        '/allowed-link': '/allowed',
        [submitted]: submitted,
      },
    })
    await expect(service.register(submitted)).resolves.toEqual({
      disposition: 'created',
      project: {
        id: 'stable-id',
        name: ' leading and trailing ',
        canonicalPath: submitted,
        createdAt: 1_786_407_000_000,
      },
    })
  })
})

describe('canonical path-segment opening policy', () => {
  it.each([
    ['/root-expression', '/allowed', 'created'],
    ['/child-expression', '/allowed/child', 'created'],
    ['/nested-expression', '/allowed/child/nested', 'created'],
    ['/normalized-expression', '/allowed/child', 'created'],
    ['/prefix-expression', '/allowed-sibling', 'outside_opening_policy'],
    ['/traversal-expression', '/outside', 'outside_opening_policy'],
    ['/escape-link', '/outside/escape', 'outside_opening_policy'],
  ])(
    'evaluates %s by canonical segment boundaries',
    async (input, canonicalPath, expected) => {
      const { service } = await readyService({
        canonical: {
          '/home-link': '/home',
          '/allowed-link': '/allowed',
          [input]: canonicalPath,
        },
      })
      const result = await service.register(input)
      if (expected === 'created') {
        expect(result).toMatchObject({
          disposition: 'created',
          project: { canonicalPath },
        })
      } else {
        expect(result).toEqual({ category: expected, field: 'path' })
      }
    }
  )
})
