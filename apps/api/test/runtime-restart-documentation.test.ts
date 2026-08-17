import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RUNTIME_ENTRY_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_LIFECYCLE_TARGETS,
  RUNTIME_RESTART_OUTCOMES,
  RUNTIME_RESTART_REJECTION_CATEGORIES,
  PUBLIC_RUNTIME_STATES,
} from '../src/project-runtime-contract.js'
import {
  RUNTIME_RESTART_BODY_LIMIT_BYTES,
  RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES,
} from '../src/routes/project-runtime-restart.js'
import {
  BL018_PRODUCTION_DEFAULT_BOUNDS,
  BL018_RESTART_EVENT_NAMES,
} from '../src/runtime-restart-evidence.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

const loaded = new Map<string, Promise<string>>()

const text = (relative: string): Promise<string> => {
  const pending =
    loaded.get(relative) ??
    readFile(path.join(REPOSITORY_ROOT, relative), 'utf8')
  loaded.set(relative, pending)
  return pending
}

const ROOT_README = 'README.md'
const RUNBOOK = 'docs/project-runtime.md'
const ROUTES_README = 'apps/api/src/routes/README.md'

const RESTART_COMMANDS = [
  'just verify-runtime-restart',
  'just proof-runtime-restart',
  'just proof-runtime-restart-residual-audit',
] as const

describe('BL-018 documented restart contract', () => {
  it('documents the operation, its eligibility, and its single internal entry', async () => {
    const runbook = await text(RUNBOOK)
    expect(runbook).toContain('POST /api/projects/{id}/runtime/restart')
    expect(runbook).toContain('ProjectRuntimeManager.restart')
    expect(runbook).toContain('A running entry and a retained failed entry')
    expect(runbook).toContain('runtime_not_managed')
    expect(runbook).toContain('join one operation')
    expect(runbook).toContain(
      'One internal `restarting` entry spans release and replacement and projects publicly as `Starting`'
    )
    expect(runbook).toContain(
      'Replacement launch begins only after the prior exact process identity, owned process group, and listener are all confirmed absent'
    )
  })

  it('documents every contract vocabulary it names at the delivered size', async () => {
    const runbook = await text(RUNBOOK)
    expect(RUNTIME_RESTART_OUTCOMES).toEqual(['restarted', 'rejected'])
    expect(runbook).toContain('"outcome":"restarted"')
    for (const state of RUNTIME_ENTRY_STATES) expect(runbook).toContain(state)
    for (const target of RUNTIME_LIFECYCLE_TARGETS)
      expect(runbook).toContain(target)
    for (const state of PUBLIC_RUNTIME_STATES) expect(runbook).toContain(state)
    expect(RUNTIME_FAILURE_CATEGORIES).toHaveLength(21)
    expect(runbook).toContain('The 19 closed categories')
    for (const category of RUNTIME_FAILURE_CATEGORIES)
      expect(runbook).toContain(category)
    // The runbook documents the rejection vocabulary in prose rather than by
    // identifier, so each delivered category is checked against the phrase
    // that currently documents it.
    const documentedRejection: Record<
      (typeof RUNTIME_RESTART_REJECTION_CATEGORIES)[number],
      string
    > = {
      'not-registered': 'not-registered',
      'no-managed-runtime': 'no-managed-runtime',
      'start-in-progress': 'start-in-progress',
      'stop-in-progress': 'stop-in-progress',
      'release-unconfirmed': 'release-unconfirmed',
      'replacement-failed': 'replacement-failed',
      'manager-shutdown': 'manager-shutdown',
      'reconcile-in-progress': 'reconcile-in-progress',
      'reconcile-unresolved': 'reconcile-unresolved',
      'close-in-progress': 'close-in-progress',
    }
    expect(RUNTIME_RESTART_REJECTION_CATEGORIES).toHaveLength(10)
    for (const category of RUNTIME_RESTART_REJECTION_CATEGORIES)
      expect(runbook).toContain(documentedRejection[category])
  })

  it('documents the route body limit and its twelve client-visible errors', async () => {
    const [runbook, readme, routes] = await Promise.all([
      text(RUNBOOK),
      text(ROOT_README),
      text(ROUTES_README),
    ])
    expect(RUNTIME_RESTART_BODY_LIMIT_BYTES).toBe(1_024)
    expect(RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES).toHaveLength(13)
    expect(runbook).toContain('1,024-byte body limit')
    expect(runbook).toContain('Its twelve client-visible errors')
    expect(readme).toContain('absent or empty body up to 1,024 bytes')
    expect(readme).toContain('twelve client-owned notices')
    // Each delivered identifier is documented verbatim, so renaming one on
    // either side without the other fails here rather than silently drifting.
    for (const category of RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES)
      expect(routes).toContain('`' + category + '`')
    expect(routes).toContain('`runtime_replacement_failed`')
    expect(routes).not.toContain('runtime_restart_replacement_failed')
  })

  it('documents every declared bound at its production default', async () => {
    const [runbook, readme] = await Promise.all([
      text(RUNBOOK),
      text(ROOT_README),
    ])
    const bounds = BL018_PRODUCTION_DEFAULT_BOUNDS
    expect(bounds.releaseMs).toBe(5_000)
    expect(bounds.quarantineReleaseMs).toBe(15_000)
    expect(bounds.restartReleaseMs).toBe(20_000)
    expect(bounds.replacementMs).toBe(60_000)
    expect(bounds.settlementAllowanceMs).toBe(1_000)
    expect(bounds.overallMs).toBe(66_000)
    expect(bounds.overallWithQuarantineMs).toBe(81_000)
    expect(bounds.transportMs).toBe(85_000)
    for (const declared of [
      '5,000 ms',
      '15,000 ms',
      '20,000 ms',
      '60,000 ms',
      '1,000 ms',
      '66,000 ms',
      '81,000 ms',
      '85,000 ms',
    ])
      expect(runbook).toContain(declared)
    expect(runbook).toContain('never the fallible process delay dependency')
    expect(bounds.transportMs).toBeGreaterThan(bounds.overallWithQuarantineMs)
    expect(readme).toContain('85-second-bounded request')
    expect(readme).toContain('66-second or admission-aware 81-second deadlines')
  })

  it('documents the identity-keyed cleanup and quarantine boundary', async () => {
    const runbook = await text(RUNBOOK)
    expect(runbook).toContain('Restart launch cleanup is identity-keyed')
    expect(runbook).toContain(
      'A non-confirming cleanup moves that identity to quarantine and aborts the phase with `restart-replacement-unconfirmed`'
    )
    expect(runbook).toContain(
      'the manager reads that typed phase abort before the launch error'
    )
    expect(runbook).toContain(
      'Unresolved admissions are returned as bounded opaque admission records and force failed shutdown'
    )
    expect(runbook).toContain('is not awaited')
  })

  it('documents the restart lifecycle events and their cardinality', async () => {
    const runbook = await text(RUNBOOK)
    for (const event of BL018_RESTART_EVENT_NAMES)
      expect(runbook).toContain(event)
    expect(runbook).toContain(
      'An accepted Restart emits only its one requested and one terminal succeeded or failed event; it never emits start, stop, or health events'
    )
  })

  it('documents the three repeatable commands and the evidence boundary', async () => {
    const [runbook, readme] = await Promise.all([
      text(RUNBOOK),
      text(ROOT_README),
    ])
    for (const command of RESTART_COMMANDS) {
      expect(runbook).toContain(command.replace('just ', '`just ') + '`')
      expect(readme).toContain(command.replace('just ', ''))
    }
    expect(readme).toContain(
      'project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/'
    )
    expect(readme).toContain('ignored `test-results/bl-018/`')
  })

  it('documents the browser behaviour and the deferred boundaries', async () => {
    const [runbook, readme] = await Promise.all([
      text(RUNBOOK),
      text(ROOT_README),
    ])
    expect(runbook).toContain(
      'Project Home shows Restart only for authoritative `Running` or `Failed` rows'
    )
    expect(runbook).toContain(
      'performs exactly one authoritative runtime refresh'
    )
    expect(runbook).toContain('remain explicitly unknown')
    expect(runbook).toContain('selected Restart by BL-018')
    expect(runbook).toContain('API-restart reconciliation')
    expect(readme).toContain('peer project controls remain usable')
  })
})
