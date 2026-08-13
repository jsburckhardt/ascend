import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BL014_COUNTER_CONTRACT,
  BL014_FIXTURES,
  BL014_TRANSITION_ORDER,
  BL014_WORKFLOW_EXPECTATIONS,
  BL014_RESOURCE_CLASSES,
  digestSessionEvidence,
  validateSessionSwitchingEvidence,
} from '../src/session-switching-contract.js'
import { deriveProjectOwnerToken } from '../src/project-runtime-contract.js'

const execute = promisify(execFile)
const roots: string[] = []
const digest = (value: unknown) => digestSessionEvidence(value)

const evidence = () => {
  const executionId = randomUUID()
  const observed = () => randomUUID()
  const events: Array<Record<string, unknown>> = []
  const addEvent = (event: string, projectToken?: string) => {
    events.push({
      eventId: observed(),
      executionId,
      measured: true,
      ordinal: events.length + 1,
      observedNs: events.length + 1,
      event,
      ...(projectToken ? { projectToken } : {}),
    })
  }
  for (const fixture of BL014_FIXTURES)
    addEvent('runtime.start.succeeded', deriveProjectOwnerToken(fixture.id))
  const observations = Array.from(
    { length: BL014_TRANSITION_ORDER.length * 2 },
    (_, index) => ({
      observationId: observed(),
      executionId,
      measured: true,
      observedNs: index + 1,
      url: index % 2 === 0 ? '/' : '/projects/bl014-a/workbench/',
      surface: index % 2 === 0 ? 'Home' : 'Workbench',
      focus: index % 2 === 0 ? 'heading:Ascend' : 'workbench',
    })
  )
  const transitions = BL014_TRANSITION_ORDER.map((transitionId, index) => {
    const beforeOrdinal = events.length
    addEvent('transition.observed')
    const home = transitionId.includes('home-')
      ? {
          cards: BL014_FIXTURES.map((fixture) => ({ project: fixture.key })),
          runtimeControlsPresent: 0,
          focus: 'heading:Ascend',
        }
      : undefined
    return {
      transitionId,
      executionId,
      measured: true,
      beforeObservationId: observations[index * 2]!.observationId,
      afterObservationId: observations[index * 2 + 1]!.observationId,
      eventRange: { beforeOrdinal, afterOrdinal: events.length },
      eventDeltas: { request: 0, start: 0, reuse: 0, stop: 0, shutdown: 0 },
      ...(home ? { home } : {}),
    }
  })
  const projects = BL014_FIXTURES.map((fixture, index) => ({
    key: fixture.key,
    projectToken: deriveProjectOwnerToken(fixture.id),
    initialExecutionId: observed(),
    identityObservationId: observed(),
    initialStartCount: 1,
    identityDigest: digest(['identity', index]),
    explorerDigest: digest(['explorer', index]),
    editorFileDigest: digest(['editor', index]),
    terminalDigest: digest(['terminal', index]),
    gitDigest: digest(['git', index]),
  }))
  const stateLabels = [
    'initial-A',
    'initial-B',
    'initial-C',
    'before-leave-A',
    'return-A',
    'revisit-B',
    'revisit-C',
    'fresh-B',
    'probe-A',
    'probe-C',
    'reopen-B',
  ]
  const stateObservations = stateLabels.map((label) => {
    const key = label.endsWith('-B') ? 'B' : label.endsWith('-C') ? 'C' : 'A'
    const project = projects.find((row) => row.key === key)!
    const negatives = BL014_FIXTURES.filter(
      (fixture) => fixture.key !== key
    ).flatMap((fixture) =>
      [
        'file',
        'editor-sentinel',
        'terminal-sentinel',
        'cwd',
        'branch',
        'git-sentinel',
      ].map((resourceClass) => ({
        observationId: observed(),
        measured: true,
        project: fixture.key,
        resourceClass,
        matchCount: 0,
        absent: true,
      }))
    )
    return {
      label,
      observationId: observed(),
      executionId,
      measured: true,
      project: key,
      projectToken: project.projectToken,
      identityDigest: project.identityDigest,
      explorerDigest: digest([label, 'explorer']),
      editorFileDigest: digest([label, 'editor']),
      editorSentinelDigest: digest([label, 'editor-sentinel']),
      terminalDigest: digest([label, 'terminal']),
      cwdDigest: digest([label, 'cwd']),
      gitRootDigest: digest([label, 'root']),
      branchDigest: digest([label, 'branch']),
      statusDigest: digest([label, 'status']),
      gitSentinelDigest: digest([label, 'git-sentinel']),
      terminalSentinelDigest: digest([label, 'terminal-sentinel']),
      visible: true,
      negativeAssertions: negatives,
    }
  })
  const workflows = BL014_WORKFLOW_EXPECTATIONS.map((expected) => ({
    ...expected,
    projectToken: projects.find((row) => row.key === expected.project)!
      .projectToken,
    executionId: observed(),
    transitionExecutionId: observed(),
    unknown: 0,
  }))
  const networkObservations = workflows.flatMap((workflow) =>
    [
      { role: 'http' },
      ...Array.from({ length: workflow.management }, () => ({
        role: 'Management',
      })),
      ...Array.from({ length: workflow.extensionHost }, () => ({
        role: 'ExtensionHost',
      })),
    ].map((row) => ({
      ...row,
      observationId: observed(),
      executionId,
      measured: true,
      workflowId: workflow.id,
      projectToken: workflow.projectToken,
      stableUrl:
        '/projects/bl014-' + workflow.project.toLowerCase() + '/workbench/',
      reconnection: workflow.reconnection,
      stablePrefix: true,
      leakCount: 0,
      leakClasses: [],
    }))
  )
  return {
    schemaVersion: 2,
    provenance: 'playwright-observation',
    executed: true,
    execution: {
      id: executionId,
      clock: 'process.hrtime.bigint',
      startedNs: 1,
      finishedNs: 2,
    },
    events,
    observations,
    transitions,
    projects,
    stateObservations,
    awaySamples: [2, 5].map((sequence) => ({
      observationId: observed(),
      executionId,
      measured: true,
      browserInteraction: false,
      pidLive: true,
      processIdentityDigest: digest('pid'),
      commandDigest: digest('command'),
      sequence,
      outputSequence: sequence,
    })),
    counter: {
      executionId: observed(),
      visibleBeforeLeave: 1,
      visibleReturn: 6,
      pidLiveBeforeLeave: true,
      processIdentityDigest: digest('pid'),
    },
    freshStorage: {
      executionId: observed(),
      measured: true,
      before: {
        cookies: 1,
        localStorage: 1,
        sessionStorage: 1,
        cacheStorage: 1,
        serviceWorkers: 0,
      },
      after: {
        cookies: 0,
        localStorage: 0,
        sessionStorage: 0,
        cacheStorage: 0,
        serviceWorkers: 0,
      },
      browserCacheCleared: true,
    },
    workflows,
    networkObservations,
    cleanup: {
      measured: true,
      manifestEqual: true,
      beforeManifestDigest: digest('manifest'),
      afterManifestDigest: digest('manifest'),
      controlUnchanged: true,
      resources: BL014_RESOURCE_CLASSES.map((resourceClass) => ({
        resourceClass,
        beforeObservationId: observed(),
        afterObservationId: observed(),
        measured: true,
        before: 1,
        after: 0,
        method: 'measured-resource-audit',
      })),
      projects: projects.map((project) => ({
        projectToken: project.projectToken,
        observationId: observed(),
        measured: true,
        resourceClasses: ['runtime-groups'],
        residuals: 0,
      })),
      disposableFiles: [1, 2].map(() => ({
        observationId: observed(),
        measured: true,
        absent: true,
      })),
    },
  }
}

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
      maximumMs: 90_000,
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
      { ...valid, provenance: 'constructed' },
      { ...valid, projects: valid.projects.slice(0, 2) },
      { ...valid, projects: [...valid.projects, valid.projects[0]] },
      {
        ...valid,
        projects: valid.projects.map((row) => ({
          ...row,
          identityDigest: valid.projects[0]!.identityDigest,
        })),
      },
      {
        ...valid,
        events: valid.events.map((row) => ({
          ...row,
          eventId: valid.events[0]!.eventId,
        })),
      },
      {
        ...valid,
        transitions: valid.transitions.map((row, index) =>
          index === 0
            ? { ...row, eventDeltas: { ...row.eventDeltas, request: 99 } }
            : row
        ),
      },
      { ...valid, transitions: valid.transitions.slice(0, -1) },
      { ...valid, stateObservations: valid.stateObservations.slice(1) },
      {
        ...valid,
        awaySamples: valid.awaySamples.map((row) => ({
          ...row,
          sequence: 2,
          outputSequence: 2,
        })),
      },
      {
        ...valid,
        workflows: valid.workflows.map((row, index) =>
          index === 0
            ? { ...row, projectToken: valid.projects[0]!.projectToken }
            : row
        ),
      },
      {
        ...valid,
        networkObservations: valid.networkObservations.filter(
          (row) =>
            !(row.workflowId === 'initial-B' && row.role === 'Management')
        ),
      },
      {
        ...valid,
        freshStorage: {
          ...valid.freshStorage,
          after: { ...valid.freshStorage.after, localStorage: 1 },
        },
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
