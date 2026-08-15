import os from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import {
  PROJECT_RUNTIME_DEFAULTS,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_FAILURE_MESSAGES,
  RuntimeFailure,
  createProjectRuntimeConfig,
  deriveProjectOwnerToken,
  serializeRuntimeEvent,
  stableProjectRoute,
  type RuntimeSnapshot,
} from '../src/project-runtime-contract.js'
import { createProjectLibrary } from '../src/project-library.js'
import { allocateDatabaseTestContext } from './project-database-test-helper.js'

const forbidden = [
  'SECRET_RUNTIME_SENTINEL',
  'COMMAND_RUNTIME_SENTINEL',
  'ENV_RUNTIME_SENTINEL',
  'STACK_RUNTIME_SENTINEL',
  '/private/runtime/path',
]

describe('project runtime contract', () => {
  it('exposes the finite snapshot and failure contract', () => {
    const snapshot: RuntimeSnapshot = {
      projectId: 'project-1',
      state: 'starting',
      pid: null,
      processStartTime: null,
      internalUrl: null,
      port: null,
      canonicalPath: '/projects/one',
      stableRoute: stableProjectRoute('project-1'),
      ownerToken: deriveProjectOwnerToken('project-1'),
      startedAt: 10,
      elapsedMs: 0,
    }
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        'canonicalPath',
        'elapsedMs',
        'internalUrl',
        'ownerToken',
        'pid',
        'port',
        'processStartTime',
        'projectId',
        'stableRoute',
        'startedAt',
        'state',
      ].sort()
    )
    expect(RUNTIME_FAILURE_CATEGORIES).toHaveLength(14)
    const filtered = new RuntimeFailure('spawn-error', {
      attemptCount: Number.NaN,
      signal: 'SIGNAL_NAME_LONGER_THAN_LIMIT',
      timeoutMs: 10,
    })
    expect(filtered.diagnostics).toEqual({ timeoutMs: 10 })
    expect(filtered).not.toHaveProperty('stack')
    expect(
      new RuntimeFailure('spawn-error', { signal: 'SECRET' }).diagnostics
    ).toEqual({})
    for (const category of RUNTIME_FAILURE_CATEGORIES) {
      const failure = new RuntimeFailure(category, {
        attemptCount: 3,
        signal: 'SIGTERM',
      })
      expect(failure.message).toBe(RUNTIME_FAILURE_MESSAGES[category])
      expect(failure.message).toMatch(
        /retry|register|install|restart|start again|wait|reconciles/u
      )
      expect(Object.keys(failure.diagnostics)).toEqual([
        'attemptCount',
        'signal',
      ])
      expect(JSON.stringify(failure)).not.toContain('stack')
    }
  })

  it('validates finite configuration and safe event fields', () => {
    expect(PROJECT_RUNTIME_DEFAULTS).toMatchObject({
      collisionAttempts: 3,
      healthPath: '/healthz/',
      healthStatus: 200,
      healthBodyStatuses: ['alive', 'expired'],
      readinessTimeoutMs: 15_000,
    })
    expect(() => createProjectRuntimeConfig({ collisionAttempts: 0 })).toThrow(
      'Runtime bounds must be positive integers'
    )
    expect(
      serializeRuntimeEvent({
        event: 'runtime.start.failed',
        projectId: 'project-1',
        from: 'starting',
        to: 'failed',
        elapsedMs: 12.8,
        classification: 'spawn-error',
      })
    ).toEqual({
      event: 'runtime.start.failed',
      projectToken: deriveProjectOwnerToken('project-1'),
      from: 'starting',
      to: 'failed',
      elapsedMs: 12,
      classification: 'spawn-error',
    })
  })

  it('builds deterministic fallback environment values', () => {
    const originalLang = process.env.LANG
    const originalRuntimeDirectory = process.env.XDG_RUNTIME_DIR
    const user = vi.spyOn(os, 'userInfo').mockReturnValue({
      uid: 1000,
      gid: 1000,
      username: 'vscode',
      homedir: '/home/vscode',
      shell: '',
    })
    delete process.env.LANG
    delete process.env.XDG_RUNTIME_DIR
    try {
      expect(
        createProjectRuntimeConfig({ executablePath: 'code-server' })
          .environment
      ).toMatchObject({
        SHELL: '/bin/bash',
        LANG: 'C.UTF-8',
        PATH: ':/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      })
      process.env.XDG_RUNTIME_DIR = '/run/user/1000'
      expect(
        createProjectRuntimeConfig({ executablePath: 'code-server' })
          .environment.XDG_RUNTIME_DIR
      ).toBe('/run/user/1000')
      expect(
        createProjectRuntimeConfig({
          executablePath: 'code-server',
          environment: { XDG_RUNTIME_DIR: '/run/user/1000' },
        }).environment
      ).toEqual({ XDG_RUNTIME_DIR: '/run/user/1000' })
    } finally {
      user.mockRestore()
      if (originalLang === undefined) delete process.env.LANG
      else process.env.LANG = originalLang
      if (originalRuntimeDirectory === undefined)
        delete process.env.XDG_RUNTIME_DIR
      else process.env.XDG_RUNTIME_DIR = originalRuntimeDirectory
    }
  })

  it('finds by persisted ID without expanding metadata', async () => {
    const context = await allocateDatabaseTestContext('runtime-contract')
    const library = await createProjectLibrary(context.databasePath)
    const project = {
      id: 'runtime-project',
      name: 'Runtime Project',
      canonicalPath: '/projects/runtime-contract',
      createdAt: 1_786_406_500_000,
    }
    try {
      await library.create(project)
      await expect(library.findById(project.id)).resolves.toEqual(project)
      await expect(library.findById('unknown')).resolves.toBeUndefined()
      expect(Object.keys((await library.findById(project.id)) ?? {})).toEqual([
        'id',
        'name',
        'canonicalPath',
        'createdAt',
      ])
      const serialized = JSON.stringify({
        project: await library.findById(project.id),
        event: serializeRuntimeEvent({
          event: 'runtime.start.requested',
          projectId: project.id,
          from: 'stopped',
          to: 'starting',
          elapsedMs: 0,
        }),
      })
      for (const sentinel of forbidden)
        expect(serialized).not.toContain(sentinel)
    } finally {
      library.close()
      await context.cleanup()
    }
  })
})
