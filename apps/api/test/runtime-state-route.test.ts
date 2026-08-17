import { describe, expect, it, vi } from 'vitest'
import type { ProjectLibrary } from '../src/project-library.js'
import type { Project } from '../src/project-persistence.js'
import type {
  ProjectRuntimeManager,
  RuntimeShutdownResult,
} from '../src/project-runtime-manager.js'
import type { PublicRuntimeReport } from '../src/project-runtime-contract.js'
import {
  PROJECT_RUNTIME_STATE_FAILED,
  PROJECT_RUNTIME_STATE_FAILED_EVENT,
} from '../src/routes/project-runtime-state.js'
import { build } from './helper.js'

const projects: Project[] = [
  {
    id: 'project-z',
    name: 'Project Z',
    canonicalPath: '/safe/z',
    createdAt: 3,
  },
  {
    id: 'project-b',
    name: 'Project B',
    canonicalPath: '/safe/b',
    createdAt: 1,
  },
  {
    id: 'project-a',
    name: 'Project A',
    canonicalPath: '/safe/a',
    createdAt: 1,
  },
  {
    id: 'project-c',
    name: 'Project C',
    canonicalPath: '/safe/c',
    createdAt: 2,
  },
]

function library(list: () => Promise<Project[]>): ProjectLibrary {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    list,
    closeProject: vi.fn(),
    close: vi.fn(),
  }
}

function runtime(
  reportPublicStates: (
    projectIds: readonly string[]
  ) => readonly PublicRuntimeReport[]
): ProjectRuntimeManager {
  const shutdownResult: RuntimeShutdownResult = {
    status: 'ok',
    audits: [],
  }
  return {
    beginReconciliation: async () => undefined,
    register: vi.fn(),
    start: vi.fn(),
    close: async () => {
      throw new Error('runtime state routing does not close projects')
    },
    reportPublicStates: vi.fn(reportPublicStates),
    inspect: vi.fn(),
    ownsSnapshot: vi.fn(() => false),
    inspectEntries: vi.fn(() => []),
    audit: vi.fn(() => ({
      shuttingDown: false,
      entryCount: 0,
      startingEntries: 0,
      ownershipRecords: 0,
      completionTasks: 0,
      backgroundTasks: 0,
      completionTaskSettlements: 0,
      backgroundTaskSettlements: 0,
    })),
    lastFailure: vi.fn(),
    lastCleanup: vi.fn(),
    lastShutdown: vi.fn(() => shutdownResult),
    shutdown: vi.fn(async () => shutdownResult),
  }
}

describe('GET /api/projects/runtime', () => {
  it('returns the exact empty success envelope', async () => {
    const projectRuntime = runtime(() => [])
    const app = await build({
      createProjectLibrary: async () => library(async () => []),
      createProjectRuntimeManager: () => projectRuntime,
    })
    const response = await app.inject('/api/projects/runtime')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ runtimes: [] })
    expect(projectRuntime.reportPublicStates).toHaveBeenCalledOnce()
    expect(projectRuntime.reportPublicStates).toHaveBeenCalledWith([])
  })

  it('reports all four states in authoritative project order without changing the project payload', async () => {
    const projectRuntime = runtime((ids) =>
      ids.map((projectId, index) => {
        const states = ['Stopped', 'Starting', 'Failed', 'Running'] as const
        const state = states[index]!
        return Object.freeze({
          projectId,
          state,
          ...(state === 'Failed'
            ? { failureCategory: 'health-status-unexpected' as const }
            : {}),
        })
      })
    )
    const projectLibrary = library(async () => projects)
    const app = await build({
      createProjectLibrary: async () => projectLibrary,
      createProjectRuntimeManager: () => projectRuntime,
    })
    const [runtimeResponse, projectResponse] = await Promise.all([
      app.inject('/api/projects/runtime'),
      app.inject('/api/projects'),
    ])
    expect(runtimeResponse.statusCode).toBe(200)
    expect(runtimeResponse.json()).toEqual({
      runtimes: [
        { id: 'project-a', state: 'Stopped' },
        { id: 'project-b', state: 'Starting' },
        {
          id: 'project-c',
          state: 'Failed',
          failureCategory: 'health-status-unexpected',
        },
        { id: 'project-z', state: 'Running' },
      ],
    })
    const runtimes = runtimeResponse.json<{
      runtimes: Array<Record<string, unknown>>
    }>().runtimes
    expect(Object.keys(runtimeResponse.json()).sort()).toEqual(['runtimes'])
    expect(runtimes.map((row) => Object.keys(row).sort())).toEqual([
      ['id', 'state'],
      ['id', 'state'],
      ['failureCategory', 'id', 'state'],
      ['id', 'state'],
    ])
    expect(runtimes.map(({ id }) => id)).toEqual(
      projectResponse
        .json<{ projects: Project[] }>()
        .projects.map(({ id }) => id)
    )
    expect(projectResponse.json()).toEqual({
      projects: [projects[2], projects[1], projects[3], projects[0]],
    })
    for (const persisted of projectResponse.json<{ projects: Project[] }>()
      .projects) {
      expect(Object.keys(persisted).sort()).toEqual([
        'canonicalPath',
        'createdAt',
        'id',
        'name',
      ])
    }
    const observable = runtimeResponse.body
    for (const prohibited of [
      '/safe/',
      '127.0.0.1',
      'localhost',
      'pid',
      'port',
      'ownerToken',
      'canonicalPath',
      'command',
      'environment',
    ]) {
      expect(observable).not.toContain(prohibited)
    }
  })

  it.each(['library', 'projection'] as const)(
    'returns one safe failure envelope when the %s fails',
    async (failureOwner) => {
      const logs: string[] = []
      const projectRuntime = runtime(() => {
        if (failureOwner === 'projection') {
          throw new Error('SECRET_PROJECTION_SENTINEL')
        }
        return []
      })
      const app = await build({
        logger: {
          stream: {
            write(chunk: string) {
              logs.push(chunk)
            },
          },
        },
        createProjectLibrary: async () =>
          library(async () => {
            if (failureOwner === 'library') {
              throw new Error('SECRET_LIBRARY_SENTINEL')
            }
            return []
          }),
        createProjectRuntimeManager: () => projectRuntime,
      })
      const response = await app.inject('/api/projects/runtime')
      expect(response.statusCode).toBe(500)
      expect(response.json()).toEqual({
        error: { category: PROJECT_RUNTIME_STATE_FAILED },
      })
      expect(response.json()).not.toHaveProperty('runtimes')
      const observable = JSON.stringify({
        body: response.body,
        headers: response.headers,
        logs,
      })
      expect(observable).toContain(PROJECT_RUNTIME_STATE_FAILED_EVENT)
      expect(observable).not.toContain('SECRET_LIBRARY_SENTINEL')
      expect(observable).not.toContain('SECRET_PROJECTION_SENTINEL')
      expect(projectRuntime.reportPublicStates).toHaveBeenCalledTimes(
        failureOwner === 'projection' ? 1 : 0
      )
    }
  )
})
