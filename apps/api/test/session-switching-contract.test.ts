import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BL014_COUNTER_CONTRACT,
  BL014_FIXTURES,
  BL014_OPEN_REENTRY_ORDER,
  BL014_RESOURCE_CLASSES,
  digestSessionEvidence,
  validateSessionSwitchingEvidence,
} from '../src/session-switching-contract.js'
import { deriveProjectOwnerToken } from '../src/project-runtime-contract.js'

const execute = promisify(execFile)
const roots: string[] = []
const digest = (value: unknown) => digestSessionEvidence(value)

const evidence = () => ({
  schemaVersion: 1,
  executed: true,
  projects: BL014_FIXTURES.map((fixture, index) => ({
    key: fixture.key,
    initialStartCount: 1,
    projectToken: deriveProjectOwnerToken(fixture.id),
    identityDigest: digest(['identity', index]),
    fileDigest: digest(fixture.fileName),
    gitDigest: digest([fixture.branch, fixture.dirtyFileName]),
    sentinelDigest: digest(fixture.terminalSentinel),
  })),
  reentries: BL014_OPEN_REENTRY_ORDER.map((project, index) => ({
    project,
    executed: true,
    reused: true,
    startCount: 0,
    stopCount: 0,
    shutdownCount: 0,
    urlClass: 'stable-project-prefix',
    focus: 'Open ' + project,
    identityDigest: digest(['identity', project.charCodeAt(0) - 65]),
    executionId: 'reentry-' + String(index + 1),
  })),
  awaySamples: [
    {
      executed: true,
      browserInteraction: false,
      pidDigest: digest('a-pid'),
      sequence: 2,
    },
    {
      executed: true,
      browserInteraction: false,
      pidDigest: digest('a-pid'),
      sequence: 5,
    },
  ],
  lifecycle: {
    homeStopCount: 0,
    closeCount: 0,
    stopCount: 0,
    restartCount: 0,
    shutdownCount: 0,
  },
  reconnection: {
    historyCount: 1,
    aReloadCount: 1,
    freshBContextCount: 1,
    bClientCloseCount: 1,
    bReopenCount: 1,
    storageCleared: true,
    cacheCleared: true,
    serviceWorkersCleared: true,
    bClientCloseStopCount: 0,
    serverStateOutcome: 'restored',
    browserEditorOutcome: 'unsupported',
  },
  workflows: Array.from({ length: 11 }, (_, index) => ({
    executed: true,
    project: BL014_FIXTURES[index % 3]!.key,
    projectToken: deriveProjectOwnerToken(BL014_FIXTURES[index % 3]!.id),
    management: 1,
    extensionHost: 1,
    unknown: 0,
    stablePrefix: true,
    publicAuthorityLeaks: 0,
  })),
  cleanup: {
    measured: true,
    manifestEqual: true,
    controlUnchanged: true,
    resources: BL014_RESOURCE_CLASSES.map((resourceClass) => ({
      resourceClass,
      measured: true,
      before: 1,
      after: 0,
      method: 'exact-owned-identity-audit',
    })),
  },
})

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('BL-014 fixture and evidence contracts', () => {
  it('materializes exactly A/B/C as pairwise-distinct Git fixtures', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'ascend-bl014-contract-'))
    roots.push(root)
    const observed = []
    for (const fixture of BL014_FIXTURES) {
      const directory = path.join(root, fixture.key.toLowerCase())
      await mkdir(directory)
      await writeFile(
        path.join(directory, fixture.fileName),
        fixture.editorSentinel
      )
      await execute('git', ['init', '-b', fixture.branch], { cwd: directory })
      await execute('git', ['config', 'user.email', 'bl014@example.invalid'], {
        cwd: directory,
      })
      await execute('git', ['config', 'user.name', 'BL014 Fixture'], {
        cwd: directory,
      })
      await execute('git', ['config', 'ascend.fixture', fixture.gitSentinel], {
        cwd: directory,
      })
      await execute('git', ['add', fixture.fileName], { cwd: directory })
      await execute('git', ['commit', '-m', 'fixture'], { cwd: directory })
      await writeFile(
        path.join(directory, fixture.dirtyFileName),
        fixture.terminalSentinel
      )
      const branch = await execute('git', ['branch', '--show-current'], {
        cwd: directory,
      })
      const status = await execute('git', ['status', '--porcelain'], {
        cwd: directory,
      })
      const sentinel = await execute('git', ['config', 'ascend.fixture'], {
        cwd: directory,
      })
      observed.push({
        branch: branch.stdout.trim(),
        status: status.stdout.trim(),
        sentinel: sentinel.stdout.trim(),
      })
    }
    expect(observed).toHaveLength(3)
    expect(new Set(observed.map(digest)).size).toBe(3)
    expect(observed.map((row) => row.branch)).toEqual(
      BL014_FIXTURES.map((row) => row.branch)
    )
  })

  it('declares one 250ms counter with a maximum below 90 seconds', async () => {
    expect(BL014_COUNTER_CONTRACT).toMatchObject({
      cadenceMs: 250,
      maximumMs: 60_000,
      maximumAllowedMs: 90_000,
    })
    expect(BL014_COUNTER_CONTRACT.maximumMs).toBeLessThanOrEqual(
      BL014_COUNTER_CONTRACT.maximumAllowedMs
    )
    const source = await readFile(
      path.resolve(
        import.meta.dirname,
        '../../../',
        BL014_COUNTER_CONTRACT.executable
      ),
      'utf8'
    )
    expect(source).toContain('setInterval')
    expect(source).not.toMatch(/for *\(let attempt|retry/iu)
  })

  it('accepts complete executed evidence and rejects synthetic or unsafe mutations', () => {
    const valid = evidence()
    expect(validateSessionSwitchingEvidence(valid)).toBe(true)
    const mutations = [
      { ...valid, executed: false },
      { ...valid, projects: valid.projects.slice(0, 2) },
      { ...valid, projects: [...valid.projects, valid.projects[0]] },
      {
        ...valid,
        projects: valid.projects.map((row) => ({
          ...row,
          identityDigest: valid.projects[0]!.identityDigest,
        })),
      },
      { ...valid, reentries: valid.reentries.slice(0, 4) },
      {
        ...valid,
        reentries: valid.reentries.map((row, index) =>
          index === 0 ? { ...row, reused: false, startCount: 1 } : row
        ),
      },
      {
        ...valid,
        awaySamples: valid.awaySamples.map((row) => ({ ...row, sequence: 2 })),
      },
      {
        ...valid,
        workflows: valid.workflows.map((row, index) =>
          index === 0
            ? { ...row, projectToken: valid.projects[1]!.projectToken }
            : row
        ),
      },
      {
        ...valid,
        cleanup: {
          ...valid.cleanup,
          resources: valid.cleanup.resources.map((row, index) =>
            index === 0 ? { ...row, after: 1 } : row
          ),
        },
      },
      {
        ...valid,
        cleanup: {
          ...valid.cleanup,
          resources: valid.cleanup.resources.map((row, index) =>
            index === 0 ? { ...row, before: 0 } : row
          ),
        },
      },
      { ...valid, unsafeAuthority: 'http://localhost/private' },
    ]
    expect(mutations.map(validateSessionSwitchingEvidence)).toEqual(
      mutations.map(() => false)
    )
  })
})
