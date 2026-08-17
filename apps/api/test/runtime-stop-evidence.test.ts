/// <reference types="node" />
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  BL017_PROHIBITED_LIFECYCLE_EVENT,
  BL017_PROHIBITED_NAME_EXEMPTIONS,
  BL017_SCENARIOS,
  serializeRuntimeStopMatrix,
  validateRuntimeStopMatrix,
  validateSelectedStopSource,
  type RuntimeStopEvidenceRow,
  type RuntimeStopMatrix,
  type SelectedStopSources,
} from '../src/runtime-stop-evidence.js'
import { RETAINED_MATRIX_PATH } from './runtime-stop-fixtures.js'

const repositoryRoot = path.resolve(import.meta.dirname, '../../..')
const sourcePath = (relative: string): string =>
  path.join(repositoryRoot, relative)

const readSources = async (): Promise<SelectedStopSources> => {
  const [manager, process_, route] = await Promise.all([
    readFile(sourcePath('apps/api/src/project-runtime-manager.ts'), 'utf8'),
    readFile(sourcePath('apps/api/src/project-runtime-process.ts'), 'utf8'),
    readFile(sourcePath('apps/api/src/routes/project-runtime-stop.ts'), 'utf8'),
  ])
  return {
    manager,
    process: process_,
    route,
    prohibitedNameMatches: await scanProhibitedName(),
    emittedEventNames: emittedEventNames(manager),
  }
}

const SCANNED_ROOTS = ['apps/api/src', 'apps/web/src', 'tests'] as const

async function scanProhibitedName(): Promise<readonly string[]> {
  const { readdir } = await import('node:fs/promises')
  const matches: string[] = []
  const walk = async (relative: string): Promise<void> => {
    const entries = await readdir(sourcePath(relative), {
      withFileTypes: true,
    }).catch(() => [])
    for (const entry of entries) {
      const next = relative + '/' + entry.name
      if (entry.isDirectory()) {
        await walk(next)
        continue
      }
      if (!/\.(?:ts|tsx)$/u.test(entry.name)) continue
      const content = await readFile(sourcePath(next), 'utf8')
      // Only the exact quoted literal is a lifecycle event name; longer dotted
      // structured-log names that contain it are route records, not events.
      if (content.includes("'" + BL017_PROHIBITED_LIFECYCLE_EVENT + "'"))
        matches.push(next)
    }
  }
  for (const root of SCANNED_ROOTS) await walk(root)
  matches.sort()
  return matches
}

const emittedEventNames = (manager: string): readonly string[] =>
  [...manager.matchAll(/event: '([a-z.]+)'/gu)].map((match) => match[1] ?? '')

const mutate = (
  sources: SelectedStopSources,
  key: 'manager' | 'process' | 'route',
  from: string,
  to: string
): SelectedStopSources => {
  const original = sources[key]
  expect(original).toContain(from)
  return { ...sources, [key]: original.replace(from, to) }
}

describe('BL-017 selected stop source guards', () => {
  it('accepts the delivered stop, sequencer, and route sources', async () => {
    const sources = await readSources()
    expect(validateSelectedStopSource(sources)).toEqual({
      accepted: true,
      violations: [],
    })
  })

  it('scans the repository for the prohibited lifecycle name', async () => {
    expect(BL017_PROHIBITED_LIFECYCLE_EVENT).toBe('runtime.stop.failed')
    // The single exemption is the BL-001 workbench proof CLI's stderr record,
    // which is a diagnostic name outside the runtime lifecycle event catalog.
    expect(BL017_PROHIBITED_NAME_EXEMPTIONS).toEqual([
      'apps/api/src/cli/proof-stop.ts',
      'apps/api/src/runtime-stop-evidence.ts',
    ])
    expect(await scanProhibitedName()).toEqual([
      'apps/api/src/cli/proof-stop.ts',
      'apps/api/src/runtime-stop-evidence.ts',
    ])
  })

  it('rejects one controlled mutation per structural claim', async () => {
    const sources = await readSources()
    const mutations: readonly [string, SelectedStopSources][] = [
      [
        'await inserted before the claim install',
        mutate(
          sources,
          'manager',
          '    const operation = Promise.resolve().then(',
          '    await Promise.resolve()\n    const operation = Promise.resolve().then('
        ),
      ],
      [
        'duplicated terminate call on the stop path',
        mutate(
          sources,
          'manager',
          'const termination = stopping.ready.process.terminate(',
          'void stopping.ready.process.terminate(\n        config.gracefulShutdownMs,\n        config.forceShutdownMs,\n        stopping.ready.port\n      )\n      const termination = stopping.ready.process.terminate('
        ),
      ],
      [
        'duplicated stop-path cleanup record',
        mutate(
          sources,
          'manager',
          'recordCleanup(stopping.projectId, result.audit)',
          'recordCleanup(stopping.projectId, result.audit)\n        recordCleanup(stopping.projectId, result.audit)'
        ),
      ],
      [
        'second stopping entry install',
        mutate(
          sources,
          'manager',
          'installEntry(input.projectId, stopping)',
          'installEntry(input.projectId, stopping)\n    installEntry(input.projectId, stopping)'
        ),
      ],
      [
        'emitted runtime.stop.failed lifecycle event',
        {
          ...sources,
          emittedEventNames: [
            ...sources.emittedEventNames,
            BL017_PROHIBITED_LIFECYCLE_EVENT,
          ],
        },
      ],
      [
        'unexempted prohibited lifecycle name match',
        {
          ...sources,
          prohibitedNameMatches: [
            ...sources.prohibitedNameMatches,
            'apps/api/src/project-runtime-manager.ts',
          ],
        },
      ],
      [
        'fifth public state literal',
        mutate(
          sources,
          'manager',
          "state: 'stopping',",
          "state: 'stopping',\n      publicLabel: 'Stopping',"
        ),
      ],
      [
        'duplicated stop definition',
        mutate(
          sources,
          'manager',
          '  const stop = async (input: {',
          "  const stop = async (input: {\n    readonly projectId: string\n  }): Promise<RuntimeStopOutcome> =>\n    Object.freeze({ outcome: 'already-stopped', projectId: input.projectId })\n  const stop = async (input: {"
        ),
      ],
      [
        'removed settlement claim recheck',
        mutate(
          sources,
          'manager',
          '      if (entries.get(input.projectId) !== stopping) {\n        throw new RuntimeStopInvariantError()\n      }\n      const failure = new RuntimeFailure',
          '      const failure = new RuntimeFailure'
        ),
      ],
      [
        'removed reuse recheck call site',
        mutate(
          sources,
          'manager',
          '        const healthOwnershipFailure = reuseOwnershipFailure(current)\n        if (healthOwnershipFailure !== undefined) throw healthOwnershipFailure\n',
          ''
        ),
      ],
      [
        'third reuse recheck call site',
        mutate(
          sources,
          'manager',
          '      const alive = await current.ready.process.isAlive()',
          '      const alive = await current.ready.process.isAlive()\n      void reuseOwnershipFailure(current)'
        ),
      ],
      [
        'shutdown memoization dropping the absence conditions',
        mutate(
          sources,
          'manager',
          '          prior.processAbsent &&\n          prior.processGroupAbsent &&\n          prior.listenerAbsent',
          '          prior.processAbsent'
        ),
      ],
      [
        'second sequencing implementation',
        mutate(
          sources,
          'process',
          'export async function terminateOwnedRuntimeGroup(',
          'export async function terminateOwnedRuntimeGroup(\n  request: RuntimeTerminationRequest\n): Promise<RuntimeTerminationAudit> {\n  return terminateOwnedRuntimeGroup(request)\n}\n\nexport async function terminateOwnedRuntimeGroup('
        ),
      ],
      [
        'raw process.kill inside the sequencer',
        mutate(
          sources,
          'process',
          '    const gracefulDelivered = primitives.signalProcessGroup(',
          "    process.kill(-request.pid, 'SIGTERM')\n    const gracefulDelivered = primitives.signalProcessGroup("
        ),
      ],
      [
        'bare awaited primitive outside the bounded helper',
        mutate(
          sources,
          'process',
          '    const initial = await audit(preSignalDeadlineAt)',
          '    await primitives.delay(1, controller.signal)\n    const initial = await audit(preSignalDeadlineAt)'
        ),
      ],
      [
        'second sequencer AbortController construction',
        mutate(
          sources,
          'process',
          '  const controller = new AbortController()\n  const fallback',
          '  const controller = new AbortController()\n  const spare = new AbortController()\n  const fallback'
        ),
      ],
      [
        'third scheduleDeadline call site',
        mutate(
          sources,
          'process',
          '  const cancelFromCaller = (): void => controller.abort(request.signal?.reason)',
          '  primitives.scheduleDeadline(0, deadlineReached)\n  const cancelFromCaller = (): void => controller.abort(request.signal?.reason)'
        ),
      ],
      [
        'deadline armed from primitives.delay',
        mutate(
          sources,
          'process',
          '  const cancelOverallDeadline = primitives.scheduleDeadline(',
          '  void primitives\n    .delay(request.gracefulMs, controller.signal)\n    .then(() => controller.abort())\n  const cancelOverallDeadline = primitives.scheduleDeadline('
        ),
      ],
      [
        'removed entry-time caller abort check',
        mutate(
          sources,
          'process',
          "  if (request.signal?.aborted) {\n    controller.abort(request.signal.reason)\n    return Object.freeze({ ...fallback, outcome: 'unconfirmed' })\n  }",
          ''
        ),
      ],
      [
        'graceful deadline computed from sequencer entry',
        mutate(
          sources,
          'process',
          '    const gracefulDeadlineAt = gracefulSignalAt + request.gracefulMs',
          '    const gracefulDeadlineAt = startedAt + request.gracefulMs'
        ),
      ],
      [
        'ungated graceful signal call',
        mutate(
          sources,
          'process',
          '    let attributable = true\n    const gracefulDelivered = primitives.signalProcessGroup(',
          '    let attributable = true\n    await Promise.resolve()\n    const gracefulDelivered = primitives.signalProcessGroup('
        ),
      ],
      [
        'discarded signal delivery result',
        mutate(
          sources,
          'process',
          "    const gracefulDelivered = primitives.signalProcessGroup(\n      request.pid,\n      'SIGTERM'\n    )",
          "    primitives.signalProcessGroup(request.pid, 'SIGTERM')\n    const gracefulDelivered = true"
        ),
      ],
      [
        'window assigned on the refused-graceful branch',
        mutate(
          sources,
          'process',
          '    if (!gracefulDelivered) {\n      const refusedAudit = await audit(',
          '    if (!gracefulDelivered) {\n      const refusedDeadlineAt = gracefulSignalAt + request.gracefulMs\n      void refusedDeadlineAt\n      const refusedAudit = await audit('
        ),
      ],
      [
        'poll loop added to the refused-graceful path',
        mutate(
          sources,
          'process',
          '    if (!gracefulDelivered) {\n      const refusedAudit = await audit(',
          '    if (!gracefulDelivered) {\n      await primitives.delay(1, controller.signal)\n      const refusedAudit = await audit('
        ),
      ],
      [
        'catch swallowing a sequencer signal error',
        mutate(
          sources,
          'process',
          '    let attributable = true\n    const gracefulDelivered',
          '    let attributable = true\n    try {\n      void 0\n    } catch {\n      void 0\n    }\n    const gracefulDelivered'
        ),
      ],
      [
        'Date.now read inside the sequencer',
        mutate(
          sources,
          'process',
          '  const startedAt = primitives.now()',
          '  const startedAt = Date.now()'
        ),
      ],
      [
        'production termination clock rebound to Date.now',
        mutate(
          sources,
          'process',
          '  now: () => performance.now(),',
          '  now: Date.now,'
        ),
      ],
      [
        'route response key outside the allowed set',
        mutate(
          sources,
          'route',
          '.send({ id: result.projectId, outcome: result.outcome })',
          '.send({ id: result.projectId, outcome: result.outcome, detail: result })'
        ),
      ],
      [
        'route rejection mapping removed',
        mutate(
          sources,
          'route',
          "  'manager-shutdown': [503, 'runtime_manager_shutdown'],\n",
          ''
        ),
      ],
    ]

    expect(validateSelectedStopSource(sources)).toEqual({
      accepted: true,
      violations: [],
    })
    for (const [name, mutation] of mutations) {
      expect(validateSelectedStopSource(mutation).accepted, name).toBe(false)
    }
  })
})

const updateRow = (
  matrix: RuntimeStopMatrix,
  scenario: string,
  update: (row: RuntimeStopEvidenceRow) => RuntimeStopEvidenceRow
): RuntimeStopMatrix => ({
  ...matrix,
  rows: matrix.rows.map((row) =>
    row.scenario === scenario ? update(row) : row
  ),
})

describe('BL-017 runtime stop matrix validator', () => {
  it('accepts the committed matrix and rejects one corruption per rule', async () => {
    const retained = JSON.parse(
      await readFile(RETAINED_MATRIX_PATH, 'utf8')
    ) as RuntimeStopMatrix
    expect(validateRuntimeStopMatrix(retained)).toEqual({
      accepted: true,
      violations: [],
    })

    const corruptions: readonly [string, RuntimeStopMatrix][] = [
      ['schema version', { ...retained, schemaVersion: 2 }],
      [
        'declared bound arithmetic',
        {
          ...retained,
          declaredBounds: { ...retained.declaredBounds, overallMs: 500 },
        },
      ],
      ['missing scenario', { ...retained, rows: retained.rows.slice(1) }],
      [
        'reordered scenarios',
        {
          ...retained,
          rows: [
            retained.rows[1]!,
            retained.rows[0]!,
            ...retained.rows.slice(2),
          ],
        },
      ],
      [
        'duplicated execution id',
        updateRow(retained, 'escalated-stop', (row) => ({
          ...row,
          executionIds: retained.rows[0]!.executionIds,
        })),
      ],
      [
        'stopped without a confirmed audit triple',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          auditTriple: { ...row.auditTriple!, listenerAbsent: false },
        })),
      ],
      [
        'stopped reported while not Stopped',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          runtimeState: 'Running',
          apiState: 'Running',
          homeState: 'Running',
        })),
      ],
      [
        'unconfirmed release reported Stopped',
        updateRow(retained, 'escalation-unconfirmed', (row) => ({
          ...row,
          runtimeState: 'Stopped',
          apiState: 'Stopped',
          homeState: 'Stopped',
          failureCategory: null,
        })),
      ],
      [
        'already-stopped without a released entry',
        updateRow(retained, 'repeated-stop-idempotent', (row) => ({
          ...row,
          entryReleasedByConfirmedStop: false,
        })),
      ],
      [
        'no-managed-runtime recorded as a success',
        updateRow(retained, 'no-managed-runtime', (row) => ({
          ...row,
          outcome: 'stopped',
          rejectionCategory: null,
        })),
      ],
      [
        'surface disagreement',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          homeState: 'Running',
        })),
      ],
      [
        'failed row without a classification',
        updateRow(retained, 'escalation-unconfirmed', (row) => ({
          ...row,
          failureCategory: null,
        })),
      ],
      [
        'force signal before the graceful bound',
        updateRow(retained, 'escalated-stop', (row) => ({
          ...row,
          forceAfterGracefulBound: false,
        })),
      ],
      [
        'graceful window shorter than the declared bound',
        updateRow(retained, 'escalated-stop', (row) => ({
          ...row,
          signalTimeline: {
            ...row.signalTimeline!,
            sigkillAt: 10,
            gracefulWindowMs: 10,
          },
        })),
      ],
      [
        'force window shorter than the declared bound',
        updateRow(retained, 'escalated-stop', (row) => ({
          ...row,
          signalTimeline: { ...row.signalTimeline!, forceWindowMs: 5 },
        })),
      ],
      [
        'pre-signal span beyond the declared allowance',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          signalTimeline: { ...row.signalTimeline!, preSignalMs: 500 },
        })),
      ],
      [
        'wall-clock timeline position',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          signalTimeline: {
            ...row.signalTimeline!,
            sigtermAt: 1_760_000_000_000,
          },
        })),
      ],
      [
        'timeline without a delivered signal',
        updateRow(retained, 'already-absent-generation', (row) => ({
          ...row,
          signalTimeline: {
            preSignalMs: 0,
            sigtermAt: 1,
            sigkillAt: null,
            gracefulWindowMs: null,
            forceWindowMs: null,
          },
        })),
      ],
      [
        'graceful release without a delivered graceful signal',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          signalDelivery: { ...row.signalDelivery, graceful: 'refused' },
        })),
      ],
      [
        'escalated release without a delivered force signal',
        updateRow(retained, 'escalated-stop', (row) => ({
          ...row,
          signalDelivery: { ...row.signalDelivery, force: 'refused' },
        })),
      ],
      [
        'already-absent release alongside a delivered signal',
        updateRow(retained, 'already-absent-generation', (row) => ({
          ...row,
          signalDelivery: { ...row.signalDelivery, graceful: 'delivered' },
          signalOrder: ['graceful'],
        })),
      ],
      [
        'refused graceful signal recording extra settlement audits',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          releaseMode: null,
          signalDelivery: {
            ...row.signalDelivery,
            graceful: 'refused',
            settlementAudits: 4,
          },
          signalOrder: [],
          signalTimeline: null,
        })),
      ],
      [
        'signal fault settled as a success',
        updateRow(retained, 'termination-fault', (row) => ({
          ...row,
          outcome: 'stopped',
          rejectionCategory: null,
        })),
      ],
      [
        'deadline source other than the trusted scheduler',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            deadlineSource: 'awaited-primitive',
          },
        })),
      ],
      [
        'wall-clock termination clock',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            clockSource: 'wall-clock',
          },
        })),
      ],
      [
        'signal recorded after the sequencer deadline',
        updateRow(retained, 'sequencer-deadline-cancellation', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            signalsAfterDeadline: 1,
          },
        })),
      ],
      [
        'timer surviving the sequencer return',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            timersSurvivingReturn: 1,
          },
        })),
      ],
      [
        'unhandled rejection surviving the sequencer',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            unhandledRejections: 1,
          },
        })),
      ],
      [
        'work recorded for a pre-aborted caller',
        updateRow(retained, 'sequencer-deadline-cancellation', (row) => ({
          ...row,
          primitiveBounding: {
            ...row.primitiveBounding!,
            callerPreAborted: true,
          },
          signalOrder: ['graceful'],
          signalDelivery: { ...row.signalDelivery, graceful: 'delivered' },
        })),
      ],
      [
        'confirmation derived from an abandoned continuation',
        updateRow(retained, 'sequencer-deadline-cancellation', (row) => ({
          ...row,
          auditTriple: {
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: true,
            complete: true,
          },
        })),
      ],
      [
        'second stop-phase termination',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          terminateCallsByPhase: { ...row.terminateCallsByPhase, stop: 2 },
        })),
      ],
      [
        'second stop-phase cleanup audit',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          cleanupRecordsByPhase: { ...row.cleanupRecordsByPhase, stop: 2 },
        })),
      ],
      [
        'concurrent shutdown-phase cleanup for one identity',
        updateRow(retained, 'global-shutdown-during-stop', (row) => ({
          ...row,
          cleanupRecordsByPhase: {
            ...row.cleanupRecordsByPhase,
            concurrent: 1,
          },
        })),
      ],
      [
        'shutdown termination after a confirmed stop release',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          terminateCallsByPhase: { ...row.terminateCallsByPhase, shutdown: 1 },
        })),
      ],
      [
        'second shutdown re-attempt for one retained generation',
        updateRow(retained, 'shutdown-after-unconfirmed', (row) => ({
          ...row,
          terminateCallsByPhase: { ...row.terminateCallsByPhase, shutdown: 2 },
        })),
      ],
      [
        'shutdown memoizing an unconfirmed prior audit',
        updateRow(retained, 'shutdown-after-unconfirmed', (row) => ({
          ...row,
          cleanupRecordsByPhase: {
            ...row.cleanupRecordsByPhase,
            reusedPriorAudit: true,
          },
        })),
      ],
      [
        'invariant fault recording a terminal event',
        updateRow(retained, 'stop-settlement-ownership-invariant', (row) => ({
          ...row,
          entryMutations: 1,
        })),
      ],
      [
        'non-catalog lifecycle event',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          events: row.events.map((event, index) =>
            index === 0 ? { ...event, event: 'runtime.stop.failed' } : event
          ),
        })),
      ],
      [
        'event disagreeing with its public state',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          events: row.events.map((event) =>
            event.event === 'runtime.stop.succeeded'
              ? { ...event, publicState: 'Running' }
              : event
          ),
        })),
      ],
      [
        'stop event cardinality',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          requestedEventCount: 2,
        })),
      ],
      [
        'loser events recorded',
        updateRow(retained, 'stop-versus-exit', (row) => ({
          ...row,
          loserEventCount: 1,
        })),
      ],
      [
        'attribution claim beyond process-group membership',
        updateRow(retained, 'owned-descendant-attribution', (row) => ({
          ...row,
          attribution: { ...row.attribution, claim: 'descendant-tree' },
        })),
      ],
      [
        'attribution ceiling not recorded',
        updateRow(retained, 'owned-descendant-attribution', (row) => ({
          ...row,
          attribution: { ...row.attribution, ceilingRecorded: false },
        })),
      ],
      [
        'registration digest changed',
        updateRow(retained, 'registration-metadata-retention', (row) => ({
          ...row,
          registrationDigests: { ...row.registrationDigests, after: 'changed' },
        })),
      ],
      [
        'registration row count',
        updateRow(retained, 'registration-metadata-retention', (row) => ({
          ...row,
          registrationRowCount: 2,
        })),
      ],
      [
        'peer digest changed',
        updateRow(retained, 'two-ready-runtime-isolation', (row) => ({
          ...row,
          peerDigests: { ...row.peerDigests!, after: 'changed' },
        })),
      ],
      [
        'control digest changed',
        updateRow(retained, 'two-ready-runtime-isolation', (row) => ({
          ...row,
          controlDigests: { ...row.controlDigests!, after: 'changed' },
        })),
      ],
      [
        'fixture manifest digest changed',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          fixtureDigests: row.fixtureDigests.map((fixture) => ({
            ...fixture,
            after: 'changed',
          })),
        })),
      ],
      [
        'empty inventory',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          inventory: [],
        })),
      ],
      [
        'residual count above zero',
        updateRow(retained, 'final-cleanup', (row) => ({
          ...row,
          residualCount: 1,
        })),
      ],
      [
        'elapsed beyond the declared bound',
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          withinDeclaredBound: false,
        })),
      ],
      ...[
        '/workspaces/ascend/project',
        'http://127.0.0.1:41100',
        'port 41100',
        'stderr detail',
      ].map((leak): [string, RuntimeStopMatrix] => [
        'protected disclosure ' + leak,
        updateRow(retained, 'graceful-stop', (row) => ({
          ...row,
          fixtureDigests: row.fixtureDigests.map((fixture) => ({
            ...fixture,
            fixture: leak,
          })),
        })),
      ]),
    ]

    for (const [name, corruption] of corruptions) {
      expect(validateRuntimeStopMatrix(corruption).accepted, name).toBe(false)
    }
  })

  it('serializes a validated matrix deterministically', async () => {
    const retained = await readFile(RETAINED_MATRIX_PATH, 'utf8')
    const matrix = JSON.parse(retained) as RuntimeStopMatrix
    expect(matrix.rows).toHaveLength(BL017_SCENARIOS.length)
    const first = serializeRuntimeStopMatrix(matrix)
    const second = serializeRuntimeStopMatrix(
      JSON.parse(first) as RuntimeStopMatrix
    )
    expect(second).toBe(first)
    expect(first).toBe(retained)
  })
})
