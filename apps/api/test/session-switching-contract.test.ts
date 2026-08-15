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
  validateSessionSwitchingResidualDeclarations,
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
  const runtimes = BL014_FIXTURES.map((fixture, index) => ({
    pid: 100 + index,
    processStartTime: String(1000 + index),
    port: 4100 + index,
    stableRoute: '/projects/' + fixture.id + '/workbench/',
  }))
  const projects = BL014_FIXTURES.map((fixture, index) => ({
    key: fixture.key,
    projectToken: deriveProjectOwnerToken(fixture.id),
    initialExecutionId: observed(),
    identityObservationId: observed(),
    initialStartCount: 1,
    identityDigest: digest(runtimes[index]),
    explorerDigest: digest(['explorer', index]),
    editorFileDigest: digest(['editor', index]),
    terminalDigest: digest(['terminal', index]),
    gitDigest: digest(['git', index]),
  }))
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
  const focusObservations: Array<Record<string, unknown>> = []
  const lifecycleObservations: Array<Record<string, unknown>> = []
  const workflowTransitions: Record<string, string> = {
    'initial-open-B': 'initial-B',
    'initial-open-C': 'initial-C',
    'initial-open-A': 'initial-A',
    'switch-open-B': 'open-B',
    'history-forward-B': 'history-forward-B',
    'switch-open-C': 'open-C',
    'switch-open-A': 'open-A',
    'revisit-open-B': 'revisit-B',
    'revisit-open-C': 'revisit-C',
    'direct-A': 'direct-A',
    'reload-A': 'reload-A',
    'fresh-B': 'fresh-B',
    'probe-C': 'probe-C',
    'reopen-B': 'reopen-B',
  }
  const transitions = BL014_TRANSITION_ORDER.map((transitionId, index) => {
    const beforeOrdinal = events.length
    addEvent('transition.observed')
    const transitionExecutionId = observed()
    const projectToken = projects.find(
      (project) => project.key === transitionId.slice(-1)
    )!.projectToken
    const before = observations[index * 2]!
    const after = observations[index * 2 + 1]!
    Object.assign(before, {
      transitionId,
      transitionExecutionId,
      projectToken,
      phase: 'before',
    })
    Object.assign(after, {
      transitionId,
      transitionExecutionId,
      projectToken,
      phase: 'after',
    })
    const focusObservation = {
      observationId: observed(),
      executionId,
      measured: true,
      transitionId,
      transitionExecutionId,
      projectToken,
      focus: after.focus,
    }
    const eventRange = { beforeOrdinal, afterOrdinal: events.length }
    const eventDeltas = { request: 0, start: 0, reuse: 0, stop: 0, shutdown: 0 }
    const lifecycleObservation = {
      observationId: observed(),
      executionId,
      measured: true,
      transitionId,
      transitionExecutionId,
      projectToken,
      eventRange,
      eventDeltas,
    }
    focusObservations.push(focusObservation)
    lifecycleObservations.push(lifecycleObservation)
    const home = transitionId.includes('home-')
      ? {
          cards: BL014_FIXTURES.map((fixture) => ({ project: fixture.key })),
          runtimeControlsPresent: 3,
          focus: 'heading:Ascend',
        }
      : undefined
    return {
      transitionId,
      executionId,
      transitionExecutionId,
      projectToken,
      measured: true,
      ...(workflowTransitions[transitionId]
        ? { workflowId: workflowTransitions[transitionId] }
        : {}),
      beforeObservationId: before.observationId,
      afterObservationId: after.observationId,
      focusObservationId: focusObservation.observationId,
      lifecycleObservationId: lifecycleObservation.observationId,
      eventRange,
      eventDeltas,
      ...(home ? { home } : {}),
    }
  })
  const identityObservations = projects.map((project, index) => {
    const part = (kind: string, value: unknown) => ({
      observationId: observed(),
      executionId,
      measured: true,
      projectToken: project.projectToken,
      kind,
      digest: digest(value),
    })
    return {
      observationId: project.identityObservationId,
      executionId,
      initialExecutionId: project.initialExecutionId,
      measured: true,
      project: project.key,
      projectToken: project.projectToken,
      stableRoute: runtimes[index]!.stableRoute,
      runtimeIdentityDigest: project.identityDigest,
      fixtureObservation: part('fixture', ['fixture', index]),
      explorerObservation: part('explorer', ['explorer', index]),
      editorObservation: part('editor', ['editor', index]),
      terminalObservation: part('terminal', ['terminal', index]),
      gitObservation: part('git', ['git', index]),
    }
  })
  const restrictedIdentityObservations = identityObservations.map(
    (identity, index) => ({
      observationId: identity.observationId,
      executionId,
      measured: true,
      project: identity.project,
      projectToken: identity.projectToken,
      runtime: {
        ...runtimes[index],
        canonicalPath: '/fixture/' + identity.project,
      },
      fixtureObservationId: identity.fixtureObservation.observationId,
      explorerObservationId: identity.explorerObservation.observationId,
      editorObservationId: identity.editorObservation.observationId,
      terminalObservationId: identity.terminalObservation.observationId,
      gitObservationId: identity.gitObservation.observationId,
    })
  )
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
        executionId,
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
  const workflows = BL014_WORKFLOW_EXPECTATIONS.map((expected) => {
    const transition = transitions.find(
      (row) => row.workflowId === expected.id
    )!
    return {
      ...expected,
      projectToken: projects.find((row) => row.key === expected.project)!
        .projectToken,
      executionId,
      transitionId: transition.transitionId,
      transitionExecutionId: transition.transitionExecutionId,
      unknown: 0,
    }
  })
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
      transitionId: workflow.transitionId,
      transitionExecutionId: workflow.transitionExecutionId,
      projectToken: workflow.projectToken,
      stableUrl:
        '/projects/bl014-' + workflow.project.toLowerCase() + '/workbench/',
      reconnection: workflow.reconnection,
      stablePrefix: true,
      leakCount: 0,
      leakClasses: [],
    }))
  )
  const artifactOwner = {
    pid: 900,
    processStartTime: '9000',
    identityDigest: digest('pid'),
    commandDigest: digest('command'),
  }
  const artifactEntries = [
    ['counterOutput', '/results/a-counter.log'],
    ['counterIdentity', '/results/a-counter-identity.json'],
  ].map(([kind, artifactPath]) => ({
    kind,
    path: artifactPath,
    pathDigest: digest(artifactPath),
    contentDigest: digest([kind, 'content']),
    ownerIdentityDigest: artifactOwner.identityDigest,
    executionId,
    declarationObservationId: observed(),
    preCleanupProbeObservationId: observed(),
  }))
  const artifactManifest = {
    manifestId: observed(),
    executionId,
    measured: true,
    owner: artifactOwner,
    entries: artifactEntries,
    manifestDigest: digest({
      executionId,
      owner: artifactOwner,
      entries: artifactEntries,
    }),
  }
  const publicEvidence = {
    schemaVersion: 3,
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
    focusObservations,
    lifecycleObservations,
    transitions,
    projects,
    identityObservations,
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
      executionId,
      visibleBeforeLeave: 1,
      visibleReturn: 6,
      pidLiveBeforeLeave: true,
      processIdentityDigest: digest('pid'),
    },
    freshStorage: {
      executionId,
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
      executionId,
      measured: true,
      manifestEqual: true,
      beforeManifestDigest: digest('manifest'),
      afterManifestDigest: digest('manifest'),
      controlUnchanged: true,
      restrictedArtifactManifestDigest: artifactManifest.manifestDigest,
      resources: BL014_RESOURCE_CLASSES.map((resourceClass) => ({
        resourceClass,
        executionId,
        beforeObservationId: observed(),
        afterObservationId: observed(),
        observationId: observed(),
        measured: true,
        before: 1,
        after: 0,
        method: 'measured-resource-audit',
      })),
      projects: projects.map((project) => ({
        projectToken: project.projectToken,
        executionId,
        observationId: observed(),
        measured: true,
        resourceClasses: ['runtime-groups'],
        residuals: 0,
      })),
      disposableFiles: artifactEntries.map((entry) => ({
        kind: entry.kind,
        executionId,
        declarationObservationId: entry.declarationObservationId,
        beforeObservationId: entry.preCleanupProbeObservationId,
        afterObservationId: observed(),
        observationId: observed(),
        measured: true,
        pathDigest: entry.pathDigest,
        contentDigest: entry.contentDigest,
        ownerIdentityDigest: entry.ownerIdentityDigest,
        existedBeforeCleanup: true,
        probedAfterCleanup: true,
        absent: true,
      })),
    },
  }
  const restrictedEvidence = {
    schemaVersion: 3,
    executionId,
    identityObservations: restrictedIdentityObservations,
    artifactManifest,
  }
  return { publicEvidence, restrictedEvidence }
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
    const { publicEvidence: valid, restrictedEvidence: restricted } = evidence()
    expect(validateSessionSwitchingEvidence(valid, restricted)).toBe(true)
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
    expect(
      mutations.map((mutation) =>
        validateSessionSwitchingEvidence(mutation, restricted)
      )
    ).toEqual(mutations.map(() => false))

    const joinMutations: Array<[unknown, unknown]> = [
      [
        valid,
        {
          ...restricted,
          identityObservations: restricted.identityObservations.slice(1),
        },
      ],
      [
        valid,
        {
          ...restricted,
          identityObservations: restricted.identityObservations.map(
            (row, index) =>
              index === 0
                ? { ...row, projectToken: valid.projects[1]!.projectToken }
                : row
          ),
        },
      ],
      [
        { ...valid, focusObservations: valid.focusObservations.slice(1) },
        restricted,
      ],
      [
        {
          ...valid,
          focusObservations: valid.focusObservations.map((row, index) =>
            index === 0 ? { ...row, executionId: crypto.randomUUID() } : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          focusObservations: valid.focusObservations.map((row, index) =>
            index === 1
              ? {
                  ...row,
                  observationId: valid.focusObservations[0]!.observationId,
                }
              : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          lifecycleObservations: valid.lifecycleObservations.slice(1),
        },
        restricted,
      ],
      [
        {
          ...valid,
          lifecycleObservations: valid.lifecycleObservations.map(
            (row, index) =>
              index === 0
                ? { ...row, projectToken: valid.projects[0]!.projectToken }
                : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          observations: valid.observations.map((row, index) =>
            index === 0 ? { ...row, executionId: crypto.randomUUID() } : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          workflows: valid.workflows.map((row, index) =>
            index === 0
              ? { ...row, transitionExecutionId: crypto.randomUUID() }
              : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          networkObservations: valid.networkObservations.map((row, index) =>
            index === 0
              ? {
                  ...row,
                  observationId: valid.focusObservations[0]!.observationId,
                  executionId: crypto.randomUUID(),
                }
              : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          networkObservations: valid.networkObservations.map((row, index) =>
            index === 0 ? { ...row, transitionId: 'switch-open-C' } : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          networkObservations: valid.networkObservations.map((row, index) =>
            index === 0 ? { ...row, role: 'Tunnel' } : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          networkObservations: valid.networkObservations.map((row, index) =>
            index === 0
              ? { ...row, stableUrl: '/projects/bl014-c/workbench/' }
              : row
          ),
        },
        restricted,
      ],
      [
        {
          ...valid,
          cleanup: {
            ...valid.cleanup,
            disposableFiles: valid.cleanup.disposableFiles.slice(1),
          },
        },
        restricted,
      ],
      [
        {
          ...valid,
          cleanup: {
            ...valid.cleanup,
            disposableFiles: valid.cleanup.disposableFiles.map((row, index) =>
              index === 0 ? { ...row, existedBeforeCleanup: false } : row
            ),
          },
        },
        restricted,
      ],
    ]
    expect(
      joinMutations.map(([publicMutation, restrictedMutation]) =>
        validateSessionSwitchingEvidence(publicMutation, restrictedMutation)
      )
    ).toEqual(joinMutations.map(() => false))

    const probes = restricted.artifactManifest.entries.map((entry) => ({
      kind: entry.kind,
      path: entry.path,
      executionId: valid.execution.id,
      measured: true,
      absent: true,
    }))
    const expectedPaths = Object.fromEntries(
      restricted.artifactManifest.entries.map((entry) => [
        entry.kind,
        entry.path,
      ])
    )
    expect(
      validateSessionSwitchingResidualDeclarations(
        valid,
        restricted,
        probes,
        expectedPaths
      )
    ).toBe(true)
    expect(
      [
        probes.slice(1),
        probes.map((probe, index) =>
          index === 0 ? { ...probe, path: '/tmp/predeleted-fake' } : probe
        ),
        probes.map((probe, index) =>
          index === 0 ? { ...probe, measured: false } : probe
        ),
        probes.map((probe, index) =>
          index === 0 ? { ...probe, absent: false } : probe
        ),
      ].map((probeMutation) =>
        validateSessionSwitchingResidualDeclarations(
          valid,
          restricted,
          probeMutation,
          expectedPaths
        )
      )
    ).toEqual([false, false, false, false])
    expect(
      validateSessionSwitchingResidualDeclarations(valid, restricted, probes, {
        ...expectedPaths,
        counterOutput: '/tmp/wrong-counter-output',
      })
    ).toBe(false)
  })
})
