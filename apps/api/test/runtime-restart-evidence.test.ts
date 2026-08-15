/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BL018_ADDED_SOURCE_GUARD_CODES,
  BL018_BASE_SOURCE_GUARD_CODES,
  BL018_SCENARIOS,
  BL018_SOURCE_GUARD_CODES,
  restartResidualClaimWithheld,
  serializeRuntimeRestartMatrix,
  validateRuntimeRestartMatrix,
  validateSelectedRestartSource,
  type RuntimeRestartMatrix,
  type SelectedRestartSources,
} from '../src/runtime-restart-evidence.js'
import { baselineMatrix, withRow } from './runtime-restart-baseline.js'

const repositoryRoot = path.resolve(import.meta.dirname, '../../..')
const sourcePath = (relative: string): string =>
  path.join(repositoryRoot, relative)

const emittedEventNames = (manager: string): readonly string[] =>
  [...manager.matchAll(/event: '([a-z.]+)'/gu)].map((match) => match[1] ?? '')

const readSources = async (): Promise<SelectedRestartSources> => {
  const [manager, process_, restartRoute, stopRoute, workbenchContract] =
    await Promise.all([
      readFile(sourcePath('apps/api/src/project-runtime-manager.ts'), 'utf8'),
      readFile(sourcePath('apps/api/src/project-runtime-process.ts'), 'utf8'),
      readFile(
        sourcePath('apps/api/src/routes/project-runtime-restart.ts'),
        'utf8'
      ),
      readFile(
        sourcePath('apps/api/src/routes/project-runtime-stop.ts'),
        'utf8'
      ),
      readFile(sourcePath('apps/api/src/workbench-proxy-contract.ts'), 'utf8'),
    ])
  return {
    manager,
    process: process_,
    restartRoute,
    stopRoute,
    workbenchContract,
    emittedEventNames: emittedEventNames(manager),
  }
}

describe('BL-018 selected restart source guards', () => {
  it('accepts the delivered manager, process, route, and contract sources', async () => {
    expect(validateSelectedRestartSource(await readSources())).toEqual({
      accepted: true,
      violations: [],
    })
  })

  it('declares sixteen added violation codes over the seven carried-forward rules', () => {
    expect(BL018_BASE_SOURCE_GUARD_CODES).toHaveLength(7)
    expect(BL018_ADDED_SOURCE_GUARD_CODES).toHaveLength(16)
    expect(new Set(BL018_SOURCE_GUARD_CODES).size).toBe(23)
  })
})

describe('BL-018 scenario catalog', () => {
  it('is a frozen sixty-four member catalog with no duplicate or prefix name', () => {
    expect(BL018_SCENARIOS).toHaveLength(64)
    expect(Object.isFrozen(BL018_SCENARIOS)).toBe(true)
    expect(new Set(BL018_SCENARIOS).size).toBe(64)
    for (const scenario of BL018_SCENARIOS) {
      const prefixed = BL018_SCENARIOS.filter(
        (other) => other !== scenario && other.startsWith(scenario)
      )
      expect(prefixed).toEqual([])
    }
  })
})

const mutate = (
  sources: SelectedRestartSources,
  key: 'manager' | 'restartRoute' | 'stopRoute' | 'workbenchContract',
  from: string,
  to: string
): SelectedRestartSources => {
  const original = sources[key]
  expect(original).toContain(from)
  return { ...sources, [key]: original.replace(from, to) }
}

const replaceAll = (
  sources: SelectedRestartSources,
  from: string,
  to: string
): SelectedRestartSources => {
  expect(sources.manager).toContain(from)
  return { ...sources, manager: sources.manager.split(from).join(to) }
}

describe('BL-018 source guard negative fixtures', () => {
  it('rejects one synthetic corruption per violation code', async () => {
    const sources = await readSources()
    const corruptions: readonly [string, SelectedRestartSources][] = [
      [
        'restart-fallible-timer',
        mutate(
          sources,
          'manager',
          '    const generation = Symbol(input.projectId)',
          '    void processDependencies.sleep(1)\n    const generation = Symbol(input.projectId)'
        ),
      ],
      [
        'restart-deadline-arm-count',
        mutate(
          sources,
          'manager',
          '    const cancelOverallDeadline = deadlineScheduler.scheduleDeadline(',
          '    deadlineScheduler.scheduleDeadline(overallBoundMs, fireOverallDeadline)\n    const cancelOverallDeadline = deadlineScheduler.scheduleDeadline('
        ),
      ],
      [
        'restart-deadline-uncancelled',
        replaceAll(sources, 'cancelReleaseDeadline()', 'undefined'),
      ],
      [
        'restart-untyped-abort',
        mutate(
          sources,
          'manager',
          'phaseController.abort(deadlineFailure)',
          "phaseController.abort(new Error('untyped'))"
        ),
      ],
      [
        'restart-inferred-phase',
        mutate(
          sources,
          'manager',
          'if (!gateConfirmed) return releaseFailureOutcome(releaseFailure())',
          'if (Date.now() < 0) return releaseFailureOutcome(releaseFailure())'
        ),
      ],
      [
        'restart-derived-config',
        mutate(
          sources,
          'manager',
          '          const launchPromise = launch({\n            config,',
          '          const launchPromise = launch({\n            config: derivedConfig,'
        ),
      ],
      [
        'workbench-table-not-exhaustive',
        mutate(
          sources,
          'workbenchContract',
          "'runtime:restart-replacement-unconfirmed'",
          "'runtime:restart-replacement-unknown'"
        ),
      ],
      [
        'restart-admission-missing',
        mutate(
          sources,
          'manager',
          '          const admission = createPendingAdmission(',
          '          const admission = createDetachedAdmission('
        ),
      ],
      [
        'restart-late-callback-unguarded',
        mutate(
          sources,
          'manager',
          '            onOwned: restartOnOwned,',
          '            onOwned: (record) => registerOwnership(input.projectId, generation, record),'
        ),
      ],
      [
        'restart-quarantine-project-keyed',
        mutate(
          sources,
          'manager',
          '            const identityKey = [\n              audit.pid,',
          '            recordCleanup(input.projectId, audit)\n            const identityKey = [\n              audit.pid,'
        ),
      ],
      [
        'restart-abandoned-task-tracked',
        mutate(
          sources,
          'manager',
          '            void launchPromise.then(',
          '            restartTasks.add(launchPromise)\n            void launchPromise.then('
        ),
      ],
      [
        'restart-admission-shortcut',
        mutate(
          sources,
          'manager',
          '    const requiresQuarantineResolution =\n      priorAdmission !== undefined ||\n      quarantineForProject(input.projectId).length > 0',
          '    const requiresQuarantineResolution =\n      quarantineForProject(input.projectId).length > 0'
        ),
      ],
      [
        'restart-detached-continuation-missing',
        replaceAll(
          sources,
          'void launchPromise.then(',
          'await launchPromise.then('
        ),
      ],
      [
        'restart-cleanup-not-identity-keyed',
        mutate(
          sources,
          'manager',
          '              if (owned?.generation === generation)\n                ownership.delete(identityKey)',
          '              if (owned?.generation === generation)\n                ownership.delete(input.projectId)'
        ),
      ],
      [
        'restart-unconfirmed-cleanup-not-blocked',
        mutate(
          sources,
          'manager',
          '            replacementBlockReason = failure\n            phaseController.abort(failure)',
          '            phaseController.abort(failure)\n            replacementBlockReason = failure'
        ),
      ],
      [
        'restart-settlement-reason-precedence-missing',
        mutate(
          sources,
          'manager',
          '              phaseController.signal.reason instanceof RuntimeFailure\n                ? phaseController.signal.reason\n                : (replacementBlockReason ??',
          '              false\n                ? undefined\n                : (replacementBlockReason ??'
        ),
      ],
      [
        'restart-manager-lifecycle-call',
        mutate(
          sources,
          'manager',
          '    const generation = Symbol(input.projectId)',
          '    void stop({ projectId: input.projectId })\n    const generation = Symbol(input.projectId)'
        ),
      ],
      [
        'restart-launch-not-gated',
        mutate(
          sources,
          'manager',
          'gateConfirmed = true',
          'gateReached = true'
        ),
      ],
      [
        'restart-registered-entry-install',
        mutate(
          sources,
          'manager',
          '          operationSettled = true\n          entries.set(input.projectId, entry)',
          "          operationSettled = true\n          void { state: 'registered' }\n          entries.set(input.projectId, entry)"
        ),
      ],
      [
        'restart-foreign-event-emission',
        mutate(
          sources,
          'manager',
          "            event: 'runtime.restart.succeeded',",
          "            event: 'runtime.stop.succeeded',"
        ),
      ],
      [
        'restart-public-state-literal',
        mutate(
          sources,
          'manager',
          '  const ownershipKey = (record: RuntimeOwnershipRecord): string =>',
          "  const injectedLabel = 'Paused'\n  const ownershipKey = (record: RuntimeOwnershipRecord): string =>"
        ),
      ],
      [
        'restart-bound-outside-config',
        mutate(
          sources,
          'manager',
          '    const releaseBoundMs = requiresQuarantineResolution\n      ? runtimeRestartReleaseBoundMs(config)\n      : runtimeStopOverallBoundMs(config)',
          '    const releaseBoundMs = requiresQuarantineResolution ? 12_345 : 6_789'
        ),
      ],
      [
        'restart-non-catalog-event-name',
        {
          ...sources,
          emittedEventNames: [
            ...sources.emittedEventNames,
            'runtime.restart.retried',
          ],
        },
      ],
    ]

    expect(corruptions).toHaveLength(BL018_SOURCE_GUARD_CODES.length)
    for (const [code, corrupted] of corruptions) {
      const report = validateSelectedRestartSource(corrupted)
      expect(
        report.violations.some((violation) => violation.startsWith(code)),
        code + ' was not rejected: ' + report.violations.join(', ')
      ).toBe(true)
    }
  })
})

describe('BL-018 runtime restart matrix validator', () => {
  const accepted = { accepted: true, violations: [] }

  it('accepts the schema-complete baseline matrix', () => {
    expect(validateRuntimeRestartMatrix(baselineMatrix())).toEqual(accepted)
  })

  it('serializes deterministically and byte-identically', () => {
    const matrix = baselineMatrix()
    const first = serializeRuntimeRestartMatrix(matrix)
    expect(serializeRuntimeRestartMatrix(matrix)).toBe(first)
    const reparsed = JSON.parse(first) as RuntimeRestartMatrix
    expect(validateRuntimeRestartMatrix(reparsed)).toEqual(accepted)
    expect(serializeRuntimeRestartMatrix(reparsed)).toBe(first)
    expect(first.endsWith('\n')).toBe(true)
    // No serialized numeric value is large enough to be a wall-clock instant.
    expect(first).not.toMatch(/:\s*-?\d{13,}/u)
  })

  it('applies the residual-claim predicate in both directions', () => {
    const row = baselineMatrix().rows[0]
    expect(row).toBeDefined()
    expect(restartResidualClaimWithheld(row!)).toBe(false)
    for (const withheld of [
      { ...row!, replacementAuditState: 'unaudited-retained' },
      { ...row!, replacementAuditState: 'admission-unresolved' },
      { ...row!, replacementAuditState: 'quarantined-unconfirmed' },
      { ...row!, releaseMode: 'unconfirmed' },
      { ...row!, admission: { ...row!.admission, resolution: 'unresolved' } },
      {
        ...row!,
        quarantine: {
          ...row!.quarantine,
          recordCount: 1,
          auditStates: ['unaudited'],
        },
      },
    ]) {
      expect(restartResidualClaimWithheld(withheld)).toBe(true)
    }
    expect(
      restartResidualClaimWithheld({
        ...row!,
        quarantine: {
          ...row!.quarantine,
          recordCount: 1,
          auditStates: ['audited-absent'],
        },
      })
    ).toBe(false)
  })
})

describe('BL-018 matrix mutation classes M-1 through M-8', () => {
  it('rejects one controlled corruption per validator rule', () => {
    const base = baselineMatrix()
    const target = BL018_SCENARIOS[0]!
    const second = BL018_SCENARIOS[1]!
    const corruptions: readonly [string, RuntimeRestartMatrix][] = [
      ['schema-version', { ...base, schemaVersion: 2 as unknown as 1 }],
      ['scenario-count', { ...base, rows: base.rows.slice(1) }],
      [
        'm5-scenario-order',
        {
          ...base,
          rows: [base.rows[1]!, base.rows[0]!, ...base.rows.slice(2)],
        },
      ],
      [
        'm5-duplicate-execution-id',
        withRow(base, second, (row) => ({
          ...row,
          executionIds: base.rows[0]!.executionIds,
        })),
      ],
      [
        'declared-overall-bound-composition',
        { ...base, declaredBounds: { ...base.declaredBounds, overallMs: 999 } },
      ],
      [
        'production-bound-drift',
        {
          ...base,
          productionDefaultBounds: {
            ...base.productionDefaultBounds,
            transportMs: 90_000,
          },
        },
      ],
      [
        'm1-spawn-before-gate',
        withRow(base, target, (row) => ({
          ...row,
          gate: { ...row.gate, spawnsBeforeGate: 1 },
        })),
      ],
      [
        'm1-launch-before-gate',
        withRow(base, target, (row) => ({
          ...row,
          gate: { ...row.gate, launchAfterGate: false },
        })),
      ],
      [
        'm1-gate-passed-without-release-confirmation',
        withRow(base, target, (row) => ({
          ...row,
          releaseAuditTriple: {
            ...row.releaseAuditTriple!,
            listenerAbsent: false,
          },
        })),
      ],
      [
        'm2-stopped-observation',
        withRow(base, target, (row) => ({
          ...row,
          stateSeries: row.stateSeries.map((entry, index) =>
            index === 1 ? { ...entry, api: 'Stopped' } : entry
          ),
        })),
      ],
      [
        'm2-running-before-readiness',
        withRow(base, target, (row) => ({
          ...row,
          stateSeries: row.stateSeries.map((entry) =>
            entry.phase === 'post-release'
              ? { ...entry, runtime: 'Running' }
              : entry
          ),
        })),
      ],
      [
        'm2-state-outside-catalog',
        withRow(base, target, (row) => ({ ...row, runtimeState: 'Paused' })),
      ],
      [
        'm2-restarted-settled-not-running',
        withRow(base, target, (row) => ({
          ...row,
          stateSeries: row.stateSeries.map((entry) =>
            entry.phase === 'settled' ? { ...entry, home: 'Failed' } : entry
          ),
        })),
      ],
      [
        'm3-accepted-restart-count',
        withRow(base, target, (row) => ({ ...row, acceptedRestarts: 2 })),
      ],
      [
        'm3-release-termination-count',
        withRow(base, target, (row) => ({
          ...row,
          releasePhaseTerminations: 2,
        })),
      ],
      [
        'm3-replacement-launch-count',
        withRow(base, target, (row) => ({ ...row, replacementLaunches: 2 })),
      ],
      [
        'm3-requested-event-count',
        withRow(base, target, (row) => ({ ...row, requestedEventCount: 2 })),
      ],
      [
        'm3-terminal-event-count',
        withRow(base, target, (row) => ({ ...row, terminalEventCount: 0 })),
      ],
      [
        'm3-pre-accept-event-count',
        withRow(base, target, (row) => ({ ...row, preAcceptEventCount: 1 })),
      ],
      [
        'm3-loser-event-count',
        withRow(base, target, (row) => ({ ...row, loserEventCount: 1 })),
      ],
      [
        'm3-foreign-event-count',
        withRow(base, target, (row) => ({ ...row, foreignEventCount: 1 })),
      ],
      [
        'm3-non-catalog-event-name',
        withRow(base, target, (row) => ({
          ...row,
          events: row.events.map((event, index) =>
            index === 0 ? { ...event, event: 'runtime.restart.retried' } : event
          ),
        })),
      ],
      [
        'm3-pre-accept-event-emission',
        withRow(base, target, (row) => ({
          ...row,
          outcome: 'not-attempted',
          acceptedRestarts: 0,
          eligibility: { ...row.eligibility, accepted: false },
        })),
      ],
      [
        'm4-stale-settlement-applied',
        withRow(base, target, (row) => ({
          ...row,
          staleSettlements: [
            {
              settlementClass: 'release',
              appliedToSuccessor: true,
              successorMutations: 0,
              successorEvents: 0,
            },
          ],
        })),
      ],
      [
        'm4-peer-digest-changed',
        withRow(base, target, (row) => ({
          ...row,
          peerDigests: { before: '0'.repeat(64), after: '1'.repeat(64) },
        })),
      ],
      [
        'm4-fixture-digest-changed',
        withRow(base, target, (row) => ({
          ...row,
          fixtureDigests: row.fixtureDigests.map((entry) => ({
            ...entry,
            after: '2'.repeat(64),
          })),
        })),
      ],
      [
        'm4-inventory-empty',
        withRow(base, target, (row) => ({ ...row, inventory: [] })),
      ],
      [
        'm4-connection-prior-generation-usable',
        withRow(base, target, (row) => ({
          ...row,
          connections: {
            priorGenerationUsable: true,
            freshNavigationReachedReplacement: true,
            sessionContinuityClaimed: false,
          },
        })),
      ],
      [
        'm4-session-continuity-claimed',
        withRow(base, target, (row) => ({
          ...row,
          connections: {
            priorGenerationUsable: false,
            freshNavigationReachedReplacement: true,
            sessionContinuityClaimed: true,
          },
        })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({ ...row, residualCount: 1 })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({ ...row, residualCount: -1 })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({ ...row, residualCount: 0.5 })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({ ...row, residualCount: Number.NaN })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({
          ...row,
          residualCount: '0' as unknown as number,
        })),
      ],
      [
        'm4-residual-count-not-null-or-zero',
        withRow(base, target, (row) => ({
          ...row,
          residualCount: undefined as unknown as number,
        })),
      ],
      [
        'm4-residual-claim-zero-required',
        withRow(base, target, (row) => ({ ...row, residualCount: null })),
      ],
      [
        'm4-residual-claim-withheld-required',
        withRow(base, target, (row) => ({
          ...row,
          releaseMode: 'unconfirmed',
          residualCount: 0,
        })),
      ],
      [
        'm4-teardown-residual-count',
        withRow(base, target, (row) => ({ ...row, teardownResidualCount: 1 })),
      ],
      [
        'm4-teardown-residual-substitution',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'unaudited-retained',
          residualCount: null,
          teardownResidualCount: 1,
        })),
      ],
      [
        'm4-entry-mutations',
        withRow(base, target, (row) => ({ ...row, entryMutations: 1 })),
      ],
      [
        'm4-audited-absent-triple-incomplete',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'audited-absent',
          replacementAuditTriple: {
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: false,
            complete: true,
          },
        })),
      ],
      [
        'm5-protected-value',
        withRow(base, target, (row) => ({
          ...row,
          attribution: { ...row.attribution, claim: 'pid 4242 retained' },
        })),
      ],
      [
        'm5-raw-identity',
        withRow(base, target, (row) => ({
          ...row,
          priorIdentity: '4242:9910:44001',
        })),
      ],
      [
        'm5-wall-clock-value',
        withRow(base, target, (row) => ({
          ...row,
          assertionCount: 1_700_000_000_000,
        })),
      ],
      [
        'm5-execution-id-format',
        withRow(base, target, (row) => ({
          ...row,
          executionIds: { ...row.executionIds, home: 'bl018-home-other' },
        })),
      ],
      [
        'm5-duplicate-event-id',
        withRow(base, target, (row) => ({
          ...row,
          events: row.events.map((event) => ({
            ...event,
            id: row.events[0]!.id,
          })),
        })),
      ],
      [
        'm5-identity-distinctness',
        withRow(base, target, (row) => ({ ...row, distinctIdentity: false })),
      ],
      [
        'm6-deadline-source',
        withRow(base, target, (row) => ({
          ...row,
          deadlines: {
            ...row.deadlines,
            overallArm: { ...row.deadlines.overallArm, source: 'timer' },
          },
        })),
      ],
      [
        'm6-deadline-uncancelled',
        withRow(base, target, (row) => ({
          ...row,
          deadlines: {
            ...row.deadlines,
            releaseArm: { ...row.deadlines.releaseArm, cancelled: false },
          },
        })),
      ],
      [
        'm6-declared-bound-mismatch',
        withRow(base, target, (row) => ({
          ...row,
          deadlines: {
            ...row.deadlines,
            overallArm: { ...row.deadlines.overallArm, declaredMs: 7 },
          },
        })),
      ],
      [
        'm6-overall-abort-reason-manager-shutdown',
        withRow(base, target, (row) => ({
          ...row,
          deadlines: {
            ...row.deadlines,
            fired: 'overall',
            abortReasonCategory: 'manager-shutdown',
          },
        })),
      ],
      [
        'm6-deadline-before-gate-launched',
        withRow(base, target, (row) => ({
          ...row,
          gate: { ...row.gate, gateConfirmed: false },
          deadlines: {
            ...row.deadlines,
            fired: 'overall',
            abortReasonCategory: 'restart-deadline-exceeded',
          },
        })),
      ],
      [
        'm6-deadline-after-gate-category',
        withRow(base, target, (row) => ({
          ...row,
          failureCategory: 'restart-release-unconfirmed',
          deadlines: {
            ...row.deadlines,
            fired: 'overall',
            abortReasonCategory: 'restart-deadline-exceeded',
          },
        })),
      ],
      [
        'm6-release-deadline-category',
        withRow(base, target, (row) => ({
          ...row,
          deadlines: {
            ...row.deadlines,
            fired: 'release',
            abortReasonCategory: 'restart-release-unconfirmed',
          },
        })),
      ],
      [
        'm6-unaudited-retained-residual-not-null',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'unaudited-retained',
        })),
      ],
      [
        'm7-gate-passed-with-unresolved-admission',
        withRow(base, target, (row) => ({
          ...row,
          priorResourceClass: 'pending-admission',
          admission: { ...row.admission, resolution: 'unresolved' },
        })),
      ],
      [
        'm7-gate-passed-after-gate-resolution',
        withRow(base, target, (row) => ({
          ...row,
          priorResourceClass: 'pending-admission',
          admission: { ...row.admission, resolutionOrder: 'after-gate' },
        })),
      ],
      [
        'm7-launch-without-prior-admission',
        withRow(base, target, (row) => ({
          ...row,
          admission: { ...row.admission, createdBeforeLaunch: false },
        })),
      ],
      [
        'm7-late-callback-mutation',
        withRow(base, target, (row) => ({
          ...row,
          lateCallbacks: { ...row.lateCallbacks, eventsEmitted: 1 },
        })),
      ],
      [
        'm7-quarantine-deletion-unconfirmed',
        withRow(base, target, (row) => ({
          ...row,
          quarantine: { ...row.quarantine, deletions: 1 },
        })),
      ],
      [
        'm7-quarantine-concurrent-attempts',
        withRow(base, target, (row) => ({
          ...row,
          quarantine: { ...row.quarantine, concurrentAttempts: 1 },
        })),
      ],
      [
        'm7-quarantine-reattempt-claims',
        withRow(base, target, (row) => ({
          ...row,
          quarantine: { ...row.quarantine, reattempts: 1 },
        })),
      ],
      [
        'm7-abandoned-launch-tracked',
        withRow(base, target, (row) => ({
          ...row,
          taskSets: { ...row.taskSets, abandonedLaunchInBackgroundTasks: true },
        })),
      ],
      [
        'm7-restart-tasks-not-awaited',
        withRow(base, target, (row) => ({
          ...row,
          taskSets: { ...row.taskSets, restartTasksAwaitedByShutdown: false },
        })),
      ],
      [
        'm7-shutdown-ok-with-unresolved-admission',
        withRow(base, target, (row) => ({
          ...row,
          shutdown: {
            status: 'ok',
            unresolvedAdmissionCount: 1,
            quarantineSwept: 0,
            awaitedAbandonedLaunch: false,
            elapsedClass: 'within-overall',
          },
        })),
      ],
      [
        'm7-shutdown-awaited-abandoned-launch',
        withRow(base, target, (row) => ({
          ...row,
          shutdown: {
            status: 'ok',
            unresolvedAdmissionCount: 0,
            quarantineSwept: 0,
            awaitedAbandonedLaunch: true,
            elapsedClass: 'within-overall',
          },
        })),
      ],
      [
        'm7-prior-resource-class-unknown',
        withRow(base, target, (row) => ({
          ...row,
          priorResourceClass: 'retained-record',
        })),
      ],
      [
        'm7-replacement-audit-state-unknown',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'partially-audited',
        })),
      ],
      [
        'm7-admission-phase-unknown',
        withRow(base, target, (row) => ({
          ...row,
          admission: { ...row.admission, phaseAtSettlement: 'settled' },
        })),
      ],
      [
        'm7-quarantine-audit-state-unknown',
        withRow(base, target, (row) => ({
          ...row,
          residualCount: null,
          quarantine: {
            ...row.quarantine,
            recordCount: 1,
            auditStates: ['audited-partial'],
          },
        })),
      ],
      [
        'm7-admission-deletions-above-one',
        withRow(base, target, (row) => ({
          ...row,
          admission: { ...row.admission, deletions: 2 },
        })),
      ],
      [
        'm7-admissions-created-above-one',
        withRow(base, target, (row) => ({
          ...row,
          admission: { ...row.admission, admissionsCreated: 2 },
        })),
      ],
      [
        'm7-restarted-admission-unresolved',
        withRow(base, target, (row) => ({
          ...row,
          gate: { ...row.gate, passed: false },
          admission: { ...row.admission, resolution: 'unresolved' },
          residualCount: null,
        })),
      ],
      [
        'm7-joined-admissions-created',
        withRow(base, target, (row) => ({ ...row, outcome: 'joined' })),
      ],
      [
        'm8-confirming-cleanup-without-deletion',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            cleanupAudits: 1,
            confirmingCleanups: 1,
            attemptAuditKeys: ['bl018-attempt-1'],
          },
        })),
      ],
      [
        'm8-non-confirming-cleanup-without-quarantine',
        withRow(base, target, (row) => ({
          ...row,
          outcome: 'rejected',
          rejectionCategory: 'replacement-failed',
          replacementAttempts: {
            ...row.replacementAttempts,
            cleanupAudits: 1,
            nonConfirmingCleanups: 1,
            attemptAuditKeys: ['bl018-attempt-1'],
          },
        })),
      ],
      [
        'm8-ports-acquired-after-abort',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            portsAcquiredAfterAbort: 1,
          },
        })),
      ],
      [
        'm8-ports-acquired-below-attempts',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            portsAcquired: 0,
          },
        })),
      ],
      [
        'm8-restarted-with-non-absent-quarantine',
        withRow(base, target, (row) => ({
          ...row,
          residualCount: null,
          quarantine: {
            ...row.quarantine,
            recordCount: 1,
            auditStates: ['audited-unconfirmed'],
          },
        })),
      ],
      [
        'm8-restarted-ownership-records',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            ownershipRecordsAfterSettlement: 2,
          },
        })),
      ],
      [
        'm8-quarantined-unconfirmed-residual-not-null',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'quarantined-unconfirmed',
        })),
      ],
      [
        'm8-quarantined-unconfirmed-outcome-restarted',
        withRow(base, target, (row) => ({
          ...row,
          replacementAuditState: 'quarantined-unconfirmed',
          residualCount: null,
        })),
      ],
      [
        'm8-attempt-audit-overwrites',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            attemptAuditOverwrites: 1,
          },
        })),
      ],
      [
        'm8-attempt-audit-key-cardinality',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            attemptAuditKeys: ['bl018-attempt-1'],
          },
        })),
      ],
      [
        'm8-project-keyed-cleanup-writes',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            projectKeyedCleanupWrites: 3,
          },
        })),
      ],
      [
        'm8-settlement-reason-source-unknown',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            settlementReasonSource: 'inferred',
          },
        })),
      ],
      [
        'm8-launch-rejection-category-unknown',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            launchRejectionCategory: 'unclassified',
          },
        })),
      ],
      [
        'm8-settlement-source-launch-error-with-quarantine',
        withRow(base, target, (row) => ({
          ...row,
          outcome: 'rejected',
          rejectionCategory: 'replacement-failed',
          failureCategory: 'spawn-error',
          residualCount: null,
          quarantine: {
            ...row.quarantine,
            recordCount: 1,
            auditStates: ['audited-unconfirmed'],
            createdByInstalledCleanup: 1,
          },
          replacementAttempts: {
            ...row.replacementAttempts,
            settlementReasonSource: 'launch-error',
            launchRejectionCategory: 'spawn-error',
          },
        })),
      ],
      [
        'm8-phase-abort-category-mismatch',
        withRow(base, target, (row) => ({
          ...row,
          failureCategory: 'restart-deadline-exceeded',
          replacementAttempts: {
            ...row.replacementAttempts,
            settlementReasonSource: 'phase-abort',
          },
        })),
      ],
      [
        'm8-launch-error-category-mismatch',
        withRow(base, target, (row) => ({
          ...row,
          replacementAttempts: {
            ...row.replacementAttempts,
            settlementReasonSource: 'launch-error',
            launchRejectionCategory: 'spawn-error',
          },
        })),
      ],
      [
        'm8-non-confirming-launch-rejection-absent',
        withRow(base, target, (row) => ({
          ...row,
          outcome: 'rejected',
          rejectionCategory: 'replacement-failed',
          failureCategory: 'restart-replacement-unconfirmed',
          residualCount: null,
          quarantine: {
            ...row.quarantine,
            recordCount: 1,
            auditStates: ['audited-unconfirmed'],
            createdByInstalledCleanup: 1,
          },
          replacementAttempts: {
            ...row.replacementAttempts,
            cleanupAudits: 1,
            nonConfirmingCleanups: 1,
            attemptAuditKeys: ['bl018-attempt-1'],
            settlementReasonSource: 'phase-abort',
            launchRejectionCategory: null,
          },
        })),
      ],
      [
        'm8-no-record-with-quarantine',
        withRow(base, target, (row) => ({
          ...row,
          priorResourceClass: 'no-record',
          residualCount: null,
          quarantine: {
            ...row.quarantine,
            recordCount: 1,
            auditStates: ['audited-unconfirmed'],
            createdByInstalledCleanup: 1,
          },
        })),
      ],
      [
        'structure-rejection-category-agreement',
        withRow(base, target, (row) => ({
          ...row,
          rejectionCategory: 'replacement-failed',
        })),
      ],
      [
        'structure-signal-delivery-unknown',
        withRow(base, target, (row) => ({ ...row, signalDelivery: 'queued' })),
      ],
      [
        'structure-eligibility-agreement',
        withRow(base, target, (row) => ({
          ...row,
          eligibility: { ...row.eligibility, accepted: false },
        })),
      ],
      [
        'structure-entry-state-unknown',
        withRow(base, target, (row) => ({
          ...row,
          eligibility: { ...row.eligibility, entryState: 'restarted' },
        })),
      ],
      [
        'structure-failure-category-unknown',
        withRow(base, target, (row) => ({
          ...row,
          failureCategory: 'unclassified',
        })),
      ],
      [
        'structure-release-mode-unknown',
        withRow(base, target, (row) => ({ ...row, releaseMode: 'forced' })),
      ],
      [
        'structure-outcome-unknown',
        withRow(base, target, (row) => ({ ...row, outcome: 'replaced' })),
      ],
      [
        'structure-assertion-count',
        withRow(base, target, (row) => ({ ...row, assertionCount: 0 })),
      ],
    ]

    for (const [code, corrupted] of corruptions) {
      const report = validateRuntimeRestartMatrix(corrupted)
      expect(
        report.violations.some((violation) => violation.startsWith(code)),
        code + ' was not rejected: ' + report.violations.join(', ')
      ).toBe(true)
    }
  })
})
