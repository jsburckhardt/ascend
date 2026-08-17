import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PUBLIC_RUNTIME_STATES,
  RUNTIME_ENTRY_STATES,
  RUNTIME_FAILURE_CATEGORIES,
  RUNTIME_LIFECYCLE_TARGETS,
  RUNTIME_STOP_REJECTION_CATEGORIES,
} from '../src/project-runtime-contract.js'
import {
  BL017_PROHIBITED_LIFECYCLE_EVENT,
  BL017_SCENARIOS,
  NFR015_EVENT_CATALOG,
} from '../src/runtime-stop-evidence.js'
import {
  PROJECT_RUNTIME_STOP_FAILED_EVENT,
  PROJECT_RUNTIME_STOP_REJECTED_EVENT,
  RUNTIME_STOP_BODY_LIMIT_BYTES,
  RUNTIME_STOP_ROUTE_ERROR_CATEGORIES,
  type RuntimeStopRouteErrorCategory,
} from '../src/routes/project-runtime-stop.js'
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
const DOCS_INDEX = 'docs/README.md'
const RUNBOOK = 'docs/project-runtime.md'
const ROUTING = 'docs/stable-workbench-routing.md'
const SWITCHING = 'docs/session-switching.md'
const API_README = 'apps/api/README.md'
const ROUTE_README = 'apps/api/src/routes/README.md'
const PROOF_CLI_DOCUMENT = 'docs/workbench-proof.md'

/** Every shipped application document covered by the T-13 reconciliation scans. */
const SHIPPED_DOCUMENTS = [
  ROOT_README,
  DOCS_INDEX,
  RUNBOOK,
  ROUTING,
  SWITCHING,
  API_README,
  ROUTE_README,
  PROOF_CLI_DOCUMENT,
  'docs/mvp-performance.md',
  'apps/web/README.md',
  'apps/api/src/plugins/README.md',
] as const

const STOP_EVIDENCE_PATH =
  'project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json'
const STOP_COMMANDS = [
  'just verify-runtime-stop',
  'just proof-runtime-stop',
  'just proof-runtime-stop-residual-audit',
] as const
const BL017_LIFECYCLE_EVENTS = [
  'runtime.start.requested',
  'runtime.start.succeeded',
  'runtime.start.failed',
  'runtime.health.changed',
  'runtime.stop.requested',
  'runtime.stop.succeeded',
] as const

type DocumentedPhrases = readonly (readonly [string, readonly string[]])[]

const expectDocumented = async (
  expectations: DocumentedPhrases
): Promise<void> => {
  const results = await Promise.all(
    expectations.map(async ([document, phrases]) => {
      const content = await text(document)
      return {
        document,
        missing: phrases.filter((phrase) => !content.includes(phrase)),
      }
    })
  )
  expect(results.filter((result) => result.missing.length > 0)).toEqual([])
}

interface DocumentSentence {
  readonly document: string
  readonly line: number
  readonly paragraph: string
  readonly text: string
}

const sentencesOf = (
  document: string,
  content: string
): readonly DocumentSentence[] =>
  content.split('\n').flatMap((paragraph, index) =>
    paragraph
      .split(/(?<=[.!?])\s+/u)
      .map((sentence) => ({
        document,
        line: index + 1,
        paragraph,
        text: sentence.trim(),
      }))
      .filter((sentence) => sentence.text.length > 0)
  )

const shippedSentences = async (): Promise<readonly DocumentSentence[]> => {
  const contents = await Promise.all(SHIPPED_DOCUMENTS.map(text))
  return SHIPPED_DOCUMENTS.flatMap((document, index) =>
    sentencesOf(document, contents[index] as string)
  )
}

interface ReconciliationRule {
  readonly id: string
  readonly pattern: RegExp
  /** A sentence that explicitly denies the claim states the contract correctly. */
  readonly correctedBy?: RegExp
  /** A paragraph that names the delivered BL-017 control is already reconciled. */
  readonly skipReconciled?: boolean
}

const DELIVERED_STOP = /BL-017|selected Stop|Stop a workbench/u

const scanFor = async (
  rules: readonly ReconciliationRule[]
): Promise<readonly string[]> => {
  const sentences = await shippedSentences()
  return sentences.flatMap((sentence) =>
    rules
      .filter(
        (rule) =>
          rule.pattern.test(sentence.text) &&
          rule.correctedBy?.test(sentence.text) !== true &&
          !(
            rule.skipReconciled === true &&
            DELIVERED_STOP.test(sentence.paragraph)
          )
      )
      .map(
        (rule) =>
          `${sentence.document}:${sentence.line} [${rule.id}] ${sentence.text}`
      )
  )
}

describe('BL-017 command interface contract', () => {
  it('exposes the three stop recipes and wires each into verify exactly once', async () => {
    const justfile = await text('justfile')

    for (const recipe of [
      'verify-focused',
      'verify',
      'verify-runtime-state',
      'verify-runtime-stop',
      'proof-runtime-stop',
      'proof-runtime-stop-residual-audit',
    ]) {
      expect(
        justfile.match(new RegExp('^' + recipe + '(?: |:)', 'gmu'))
      ).toHaveLength(1)
    }

    for (const invocation of [
      'just verify-runtime-stop',
      'just proof-runtime-stop',
      'just proof-runtime-stop-residual-audit',
    ]) {
      expect(
        justfile.match(new RegExp('^    ' + invocation + '$', 'gmu'))
      ).toHaveLength(1)
    }

    const lines = justfile.split('\n')
    const verifyIndex = lines.indexOf('verify:')
    expect(verifyIndex).toBeGreaterThan(-1)
    const stateIndex = lines.indexOf('    just verify-runtime-state')
    expect(lines.slice(stateIndex, stateIndex + 4)).toEqual([
      '    just verify-runtime-state',
      '    just verify-runtime-stop',
      '    just proof-runtime-stop',
      '    just proof-runtime-stop-residual-audit',
    ])

    expect(justfile).toContain(
      'BL017_ACCEPTANCE=1 pnpm exec vitest run apps/api/test/runtime-stop-contract.test.ts'
    )
    expect(justfile).toContain(
      'BL017_DESIGNATED=1 pnpm exec vitest run apps/api/test/runtime-stop-designated.test.ts --reporter=verbose'
    )
    expect(justfile).toContain(
      'pnpm --filter @ascend/api exec tsx src/cli/runtime-stop-residual-audit.ts'
    )
  })
})

describe('BL-017 proof responsibility documentation contract', () => {
  it('keeps the designated episode and residual audit responsibilities distinct', async () => {
    const documents = await Promise.all(
      [ROOT_README, ROUTE_README].map((document) => text(document))
    )

    for (const document of documents) {
      const lines = document.split('\n')
      const designatedClaim = lines.find(
        (line) =>
          line.includes('selected-stop episode') &&
          line.includes('including registration/fixture retention')
      )
      const residualClaim = lines.find((line) =>
        line.includes('independent exact root/member identities')
      )

      if (designatedClaim === undefined || residualClaim === undefined) {
        throw new Error('Stop proof responsibility claims are missing')
      }

      expect(designatedClaim).toContain(
        'including registration/fixture retention and its recorded ownership evidence'
      )
      const residualStart = residualClaim.indexOf(
        'Run `just proof-runtime-stop-residual-audit`'
      )
      const residualEnd = residualClaim.indexOf(
        ' It does not audit registration or fixtures',
        residualStart
      )
      if (residualStart < 0 || residualEnd < 0) {
        throw new Error('Residual audit responsibility claim is incomplete')
      }
      const residualResponsibility = residualClaim.slice(
        residualStart,
        residualEnd
      )

      expect(residualResponsibility).toContain('owned process group')
      expect(residualResponsibility).toContain(
        'loopback listener residual-absence audit only'
      )
      expect(residualClaim).toContain(
        'It does not audit registration or fixtures'
      )
      expect(residualResponsibility).not.toMatch(
        /\b(?:audit|check|verify|retain)(?:s|ed)?\b.{0,30}\b(?:registration|fixtures?)\b/iu
      )
    }
  })
})
describe('BL-017 application documentation contract', () => {
  it('documents the strict stop route, exact envelopes, and all ten categories', async () => {
    const rows: readonly (readonly [
      RuntimeStopRouteErrorCategory,
      number,
      string,
    ])[] = [
      ['invalid_project_id', 400, 'missing, empty, or undecodable ID'],
      ['invalid_stop_request', 400, 'invalid request body or query'],
      ['project_not_found', 404, 'project registration absent'],
      [
        'runtime_not_managed',
        409,
        'persisted project has no manager-owned runtime',
      ],
      ['runtime_start_in_progress', 409, 'start is in progress'],
      ['runtime_restart_in_progress', 409, 'restart is in progress'],
      ['runtime_failure_retained', 409, 'runtime failure is retained'],
      [
        'runtime_stop_unconfirmed',
        500,
        'termination absence cannot be confirmed',
      ],
      ['runtime_manager_shutdown', 503, 'runtime manager shutdown has begun'],
      ['runtime_stop_failed', 500, 'unexpected or invariant stop failure'],
      ['runtime_reconcile_in_progress', 409, 'reconciliation is pending'],
      ['runtime_reconcile_unresolved', 409, 'reconciliation is unresolved'],
      ['runtime_close_in_progress', 409, 'a close is in progress'],
    ]
    expect(rows.map(([category]) => category)).toEqual([
      ...RUNTIME_STOP_ROUTE_ERROR_CATEGORIES,
    ])
    expect(RUNTIME_STOP_ROUTE_ERROR_CATEGORIES).toHaveLength(13)
    expect(RUNTIME_STOP_BODY_LIMIT_BYTES).toBe(1_024)

    await expectDocumented([
      [
        ROUTE_README,
        [
          '### Selected runtime stop',
          '`POST /api/projects/{id}/runtime/stop` accepts one decoded nonempty stable ID.',
          'The request carries no operation fields: an absent body or empty JSON object is accepted, any non-empty parsed body or query field is `invalid_stop_request`, and the body limit is 1,024 bytes.',
          'The route delegates exactly once to `ProjectRuntimeManager.stop({ projectId: id })`.',
          'It does not call process termination, audit, health, registration mutation, or project filesystem APIs itself.',
          '{"id":"stable-id","outcome":"stopped"}',
          '{"id":"stable-id","outcome":"already-stopped"}',
          'Errors are exactly `{"error":{"category":"<category>"}}`.',
          'The twelve-category route vocabulary is fixed.',
          'No response includes public runtime state, release mode, audit, PID, process identity, group membership, port, listener, path, authority, diagnostic, or server message.',
          ...rows.map(
            ([category, status, condition]) =>
              `| ${condition} | ${status} | \`${category}\` |`
          ),
        ],
      ],
      [
        API_README,
        [
          '## Selected runtime Stop (BL-017)',
          '`POST /api/projects/{id}/runtime/stop` validates the decoded ID and empty action request, then delegates once.',
          'A confirmed release returns exactly HTTP 200 `{"id":"stable-id","outcome":"stopped"}`; repeating that Stop in the same manager returns `already-stopped`.',
          'The twelve route error categories and statuses are 400 `invalid_project_id` or `invalid_stop_request`; 404 `project_not_found`; 409 `runtime_not_managed`, `runtime_start_in_progress`, `runtime_restart_in_progress`, `runtime_failure_retained`, `runtime_reconcile_in_progress`, or `runtime_reconcile_unresolved`; 500 `runtime_stop_unconfirmed` or `runtime_stop_failed`; and 503 `runtime_manager_shutdown`.',
          'Error bodies contain exactly the category.',
          'No response carries state, release mode, audit, PID, process-start identity, process group, listener, port, canonical path, authority, or server message.',
        ],
      ],
      [
        ROOT_README,
        [
          '### Stop a workbench',
          '`POST /api/projects/{stable-id}/runtime/stop` accepts no operation fields and has a 1,024-byte body limit; an absent body or empty JSON object is accepted.',
          'Success is exactly `200 {"id":"stable-id","outcome":"stopped|already-stopped"}`.',
          'The response never includes runtime state, release mode, audit, PID, port, authority, path, or server message.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          '## Selected workbench stop',
          'Issue #39 adds a non-destructive Stop action to each Project Home card and `POST /api/projects/{id}/runtime/stop`.',
          'Success is exactly `stopped` or the current-manager idempotent `already-stopped`',
        ],
      ],
      [
        RUNBOOK,
        [
          'The public Stop route accepts an absent body or empty JSON object, rejects operation fields, and has a 1,024-byte body limit.',
          'Success is exactly `{"id":"stable-id","outcome":"stopped"}` or `{"id":"stable-id","outcome":"already-stopped"}`.',
          'Twelve bounded error categories add `runtime_reconcile_in_progress` and `runtime_reconcile_unresolved`, both HTTP 409, to the delivered invalid ID/request, project, lifecycle, shutdown, and failure categories.',
          'Responses contain no public runtime state, release/audit data, PID, port, path, authority, process identity, or server message.',
        ],
      ],
    ])
  })

  it('documents seven entry states, seven transition targets, four public states, and 19 failure categories', async () => {
    expect(RUNTIME_ENTRY_STATES).toHaveLength(7)
    expect(RUNTIME_LIFECYCLE_TARGETS).toHaveLength(7)
    expect(PUBLIC_RUNTIME_STATES).toHaveLength(4)
    expect(RUNTIME_FAILURE_CATEGORIES).toHaveLength(21)

    await expectDocumented([
      [
        RUNBOOK,
        [
          '## Selected-runtime stop state machine',
          'The internal seven-state entry vocabulary is `registered`, `starting`, `running`, `stopping`, `restarting`, `reconciling`, and `failed`.',
          'The seven lifecycle transition targets are `starting`, `running`, `failed`, `stopping`, `stopped`, `restarting`, and `reconciling`; reconciling projects project as `Starting` and `stopped` is a transition target, not a persisted entry or fifth public state.',
          'The public vocabulary is exactly `Stopped`, `Starting`, `Running`, and `Failed`.',
          'The 19 closed categories are',
          ...RUNTIME_FAILURE_CATEGORIES,
          ...RUNTIME_STOP_REJECTION_CATEGORIES.map(
            (category) => `rejected/${category}`
          ),
          '| `running` | exact synchronous claim before any await | installs `stopping`, then settles confirmed or retained failed |',
          '| `stopping` | joins the installed stop operation | one result, one cleanup phase, no duplicate event |',
        ],
      ],
      [
        DOCS_INDEX,
        [
          "The manager's internal entry states are `registered`, `starting`, `running`, `stopping`, `restarting`, and `failed`; lifecycle transition targets add `stopping`, `stopped`, and `restarting` without adding a fifth public state.",
        ],
      ],
      [
        API_README,
        [
          'The manager uses internal `registered`, `starting`, `running`, `stopping`, `restarting`, and `failed` entries.',
        ],
      ],
      [ROOT_README, ['19 bounded `failureCategory` values']],
      [ROUTE_README, ['19 bounded runtime categories']],
    ])
  })

  it('documents the monotonic termination clock, trusted deadline scheduler, and fallible awaited primitives', async () => {
    await expectDocumented([
      [
        RUNBOOK,
        [
          '## Termination bounds, signals, and attribution',
          'The production sequencer uses `performance.now()` as its monotonic termination clock.',
          "Lifecycle event `elapsedMs` continues to use the manager's existing lifecycle clock; it is not a termination deadline or wall-clock phase measurement.",
          'The default bounds are 2,000 ms graceful, 2,000 ms force, and 1,000 ms final audit allowance.',
          'Four awaited observations are fallible and independently bounded: process-start identity, process-group membership, listener absence, and poll delay.',
          'Cancellation is propagated, but a primitive that hangs or ignores cancellation may be abandoned; incomplete observation never becomes absence evidence.',
          'The three trusted synchronous primitives are signal delivery, monotonic `now`, and native deadline scheduling.',
          'The deadline comes from an independent `setTimeout` scheduler rather than any awaited primitive, so a blocked delay cannot block return.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          'Graceful and force windows use a monotonic termination clock and begin only after their respective signals report delivered.',
          'An independent trusted scheduler enforces the overall deadline even if a fallible awaited identity, group, listener, or delay primitive hangs or ignores cancellation.',
        ],
      ],
      [
        API_README,
        [
          'Graceful and force windows are measured on `performance.now()` from their respective confirmed delivered signals.',
          'Awaited identity, group, listener, and delay primitives are individually bounded and cancellable; an independent trusted native scheduler enforces the overall deadline if any hangs or ignores cancellation.',
        ],
      ],
      [
        ROOT_README,
        [
          'timing uses a monotonic clock and an independent trusted deadline scheduler',
        ],
      ],
    ])
  })

  it('documents confirmed-delivered phase windows, refused or faulted signals, pre-aborted entry, and incomplete audits', async () => {
    await expectDocumented([
      [
        RUNBOOK,
        [
          'A signal already aborted on sequencer entry causes immediate `unconfirmed` with no identity read, signal, wait, or audit.',
          'Signal delivery returns `delivered`, `refused`, or faults.',
          '`ESRCH` is the only refused case and triggers one bounded settlement audit without opening a phase window or escalating.',
          'Any other signal error propagates as a termination fault.',
          'After confirmed delivered `SIGTERM`, the sequencer allows the complete 2,000 ms graceful window measured from that delivery.',
          'Only then may a confirmed delivered `SIGKILL` open its own complete 2,000 ms SIGKILL escalation window measured from that delivery.',
          'A refused force signal opens no force window and settles `unconfirmed`.',
          'The pre-signal ownership observations have their own bounded allowance; exhaustion is unconfirmed and sends no signal.',
          'No signal may occur after caller cancellation, abandonment, or the trusted deadline.',
          'An incomplete or negative audit resolves `rejected/stop-unconfirmed`, installs retained `failed/stop-unconfirmed`, and keeps the ownership record for shutdown.',
          'A termination deadline does the same after cancelling the sequencer.',
          'A termination fault, including unexpected signal failure, installs the same retained failure but rejects so the route returns `runtime_stop_failed`; no entry remains stuck in stopping.',
        ],
      ],
      [
        ROOT_README,
        [
          'It sends a delivered graceful signal, allows the complete graceful window, and only then may send a delivered force signal and allow the complete force window',
          'Refused or faulted signals are distinguished, incomplete observations never prove absence, and unconfirmed ownership remains retained for one shutdown-phase re-attempt.',
        ],
      ],
      [
        API_README,
        ['Refused signals and signal faults are not recorded as delivered.'],
      ],
    ])
  })

  it('documents the confirmation triple, per-phase cleanup cardinality, one shutdown re-attempt, and runtime_not_managed versus already-stopped', async () => {
    await expectDocumented([
      [
        RUNBOOK,
        [
          'Confirmed success requires the returned audit to report all three: exact process identity absent, owned process group absent, and loopback listener absent.',
          'The release label alone never establishes success.',
          "Confirmation deletes that generation's ownership record, installs `registered { released: true }`, and returns `stopped`; later stops of that entry return `already-stopped`.",
          'A fresh API process reconciles every persisted project before serving routes. A project proven absent receives a released registration and Stop returns `already-stopped`; a pending or unresolved project receives its distinct reconciliation rejection.',
          'Cleanup cardinality is per phase.',
          'The selected-stop phase calls terminate once and records at most one completed audit for the claimed generation.',
          'Confirmed release removes ownership, so global shutdown repeats nothing.',
          'Unconfirmed or faulted release retains ownership, and shutdown intentionally performs one new termination plus one new audit for that exact record; it does not reuse the prior unconfirmed audit and never runs concurrently with the stop phase.',
          'No third re-attempt occurs.',
          'Confirmed selected stops have already removed ownership; unconfirmed and faulted selected stops receive the intended one shutdown-phase re-attempt.',
        ],
      ],
      [
        ROUTE_README,
        [
          '`runtime_not_managed` and `already-stopped` are deliberately distinct.',
          'A persisted project with no entry before reconciliation returns the former; after API restart, a positively absent project is installed as released and returns `already-stopped`, while pending or unresolved reconciliation returns its distinct 409 category.',
          'The latter is available only when this manager retains a released registration installed by a confirmed selected stop.',
        ],
      ],
      [
        API_README,
        [
          'It claims the exact running generation synchronously, joins concurrent same-project callers, and releases ownership only after an audit confirms the exact root identity, owned process group, and listener all absent.',
          'A persisted project with no manager entry before reconciliation returns HTTP 409 `{"error":{"category":"runtime_not_managed"}}`; after API restart, proven absence returns `already-stopped`, while pending or unresolved reconciliation returns its distinct HTTP 409 category.',
          'An unconfirmed release remains Failed and retained for one non-concurrent shutdown-phase termination and audit.',
        ],
      ],
      [
        ROOT_README,
        [
          'The manager claims the exact running generation before awaiting termination.',
          'Confirmed release requires process identity, owned process group, and listener all absent.',
          'A persisted project with no manager-owned runtime returns `409 runtime_not_managed`; only a project released by a confirmed stop in the current manager generation returns the idempotent `already-stopped` success.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          'Release is confirmed only when the exact root identity, owned process group, and listener are absent.',
          'a persisted project with no managed runtime is the distinct `409 runtime_not_managed` rejection',
        ],
      ],
      [
        SWITCHING,
        [
          'A repeat Stop in the same manager after confirmed release returns `already-stopped`.',
          'After an API restart, required reconciliation adopts a proven survivor, marks a positively absent project released, or retains `reconcile-unconfirmed`; pending and unresolved Stop requests use their distinct 409 categories.',
        ],
      ],
    ])
  })

  it('documents six lifecycle events and separates operational route records from them', async () => {
    for (const event of BL017_LIFECYCLE_EVENTS) {
      expect(NFR015_EVENT_CATALOG).toContain(event)
    }
    expect(BL017_LIFECYCLE_EVENTS).toHaveLength(6)
    expect(BL017_LIFECYCLE_EVENTS).not.toContain(
      BL017_PROHIBITED_LIFECYCLE_EVENT
    )
    expect(NFR015_EVENT_CATALOG).not.toContain(BL017_PROHIBITED_LIFECYCLE_EVENT)

    await expectDocumented([
      [
        RUNBOOK,
        [
          'The Stop subset is `runtime.start.requested`, `runtime.start.succeeded`, `runtime.start.failed`, `runtime.health.changed`, `runtime.stop.requested`, and `runtime.stop.succeeded`.',
          'An accepted selected stop emits exactly one requested event from running to stopping.',
          'Confirmed release emits exactly one succeeded event from stopping to stopped; unconfirmed, deadline, and termination-fault settlements emit one health-changed event from stopping to failed with `stop-unconfirmed`.',
          'Rejections, already-stopped, joined callers, race losers, and unowned settlements emit no additional event.',
          `Route records \`${PROJECT_RUNTIME_STOP_REJECTED_EVENT}\` and \`${PROJECT_RUNTIME_STOP_FAILED_EVENT}\` are operational records, not lifecycle events.`,
        ],
      ],
      [
        API_README,
        [
          'Stop emits one `runtime.stop.requested` and, on confirmed release, one `runtime.stop.succeeded`; unconfirmed paths emit one `runtime.health.changed` with `stop-unconfirmed`.',
          'Rejected, joined, and already-stopped calls emit no lifecycle event.',
          'Operational route rejection/failure records are separate from the Stop subset of the lifecycle catalog and contain only bounded categories.',
        ],
      ],
      [
        ROUTE_README,
        [
          `Expected rejections log \`${PROJECT_RUNTIME_STOP_REJECTED_EVENT}\` with only the bounded route category; unexpected faults log the operational record \`${PROJECT_RUNTIME_STOP_FAILED_EVENT}\`.`,
          'The route emits no lifecycle event.',
        ],
      ],
    ])
  })

  it('documents Home single-owner serialization, one projection refresh, client-owned notices, and explicit unknown', async () => {
    await expectDocumented([
      [
        ROOT_README,
        [
          'While one stop owns the Home request slot, every Stop action is disabled and the selected card is busy.',
          'Confirmed `stopped` and `already-stopped` outcomes are announced, focus returns to the selected Stop action, and exactly one fresh `GET /api/projects/runtime` request supplies the displayed `Stopped` state.',
          'A classified rejection uses one of twelve client-owned notices with Retry.',
          'An indeterminate transport result remains explicitly unknown and offers an authoritative runtime-state refresh; the browser never substitutes an optimistic state.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          'Home displays state only after one fresh runtime projection, uses client-owned text for all twelve route categories, serializes Stop with other Home mutations, and keeps an indeterminate transport result explicitly unknown.',
        ],
      ],
      [
        RUNBOOK,
        [
          'It issues exactly one request per revision, one per Retry, and one after each successful or already-stopped Stop settlement',
          'Failed cards display client-owned category text only, never a server message or protected diagnostic.',
        ],
      ],
      [
        SWITCHING,
        [
          'A confirmed result increments one Home settlement version and triggers exactly one fresh runtime-state projection.',
          'The card renders `Stopped` only from that projection, never from the action response.',
        ],
      ],
      [
        ROUTING,
        [
          'The Stop action response does not carry runtime state; Project Home requests one fresh ordered runtime projection and reconciles the exact project set before rendering `Stopped`.',
        ],
      ],
      [
        ROUTE_README,
        [
          'Project Home obtains the resulting public state from one fresh `GET /api/projects/runtime` request rather than from this action response.',
        ],
      ],
    ])
  })

  it('documents registration, filesystem, peer, control, and replacement safety with the exact attribution ceiling', async () => {
    await expectDocumented([
      [
        API_README,
        [
          'The project registration row and filesystem are never mutated.',
          'Peer runtimes, stable proxy targets, unrelated processes/listeners, and replacement generations remain isolated.',
          'Owned-descendant evidence is bounded to membership in the exact owned process group; it does not claim escaped descendants.',
        ],
      ],
      [
        RUNBOOK,
        [
          'Owned-descendant attribution means membership in the exact root process group.',
          'The designated episode samples the complete observable member closure immediately before Stop and records every PID/start identity for independent absence checks.',
          'A descendant that escaped with `setsid` or `setpgid` is outside that attribution boundary, so process-group absence is not claimed as proof of arbitrary descendant absence.',
          'Concurrent same-project Stop callers join one operation, while peer entries and unrelated controls are untouched.',
          'Start and proxy acquisition recheck ownership after every awaited liveness or health observation; if Stop won, they return `runtime-stopping` rather than reuse the claimed snapshot.',
        ],
      ],
      [
        ROUTING,
        [
          '## Selected Stop isolation',
          'The stable HTTP/WebSocket proxy remains a pure consumer: it contains no Stop, terminate, kill, or process-audit call and cannot select a termination target.',
          'A settled or abandoned stop cannot terminate a later replacement generation.',
          'A confirmed selected stop preserves the project registration and stable URL but releases the exact manager-owned runtime.',
          'While Stop is in progress, peer project snapshots, streams, sockets, listeners, routes, and public states remain unchanged.',
          'This proves only exact process-group membership and does not overclaim descendants that escaped the group.',
        ],
      ],
      [
        SWITCHING,
        [
          'One Stop claims only the selected runtime generation.',
          'The project remains registered with the same stable route, metadata, and files, while peer runtimes and unrelated controls remain live.',
          'A late or abandoned prior termination cannot mutate that replacement, and an in-flight proxy acquisition rechecks ownership instead of returning the claimed snapshot.',
        ],
      ],
      [
        ROOT_README,
        [
          'Stopping releases only the selected manager-owned runtime and keeps the project registration, stable ID, display name, canonical path, created-at value, and filesystem content unchanged.',
          'Attribution proves membership in the exact owned process group, not arbitrary descendants that escaped that group.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          'A confirmed stop releases only the selected manager-owned runtime while keeping the four persisted project fields and project filesystem unchanged.',
          'Process-group membership is the attribution boundary; the proof does not claim arbitrary descendants that escaped that group.',
        ],
      ],
      [
        ROUTE_README,
        [
          'Stop leaves the four persisted project fields and filesystem unchanged.',
        ],
      ],
    ])
  })

  it('documents the three stop commands, the fixed 31-scenario committed evidence, and disposable artifacts', async () => {
    expect(BL017_SCENARIOS).toHaveLength(31)
    await expect(
      access(path.join(REPOSITORY_ROOT, STOP_EVIDENCE_PATH))
    ).resolves.toBe(undefined)
    expect(await text('.gitignore')).toContain('test-results/')

    await expectDocumented([
      [
        ROOT_README,
        [
          ...STOP_COMMANDS,
          'Run `just verify-runtime-stop` for the fixed 31-scenario contract, manager, route, Home, source, mutation, and deterministic evidence gate.',
          STOP_EVIDENCE_PATH,
          'host identities and timings remain disposable under `test-results/bl-017/`',
        ],
      ],
      [
        DOCS_INDEX,
        [
          ...STOP_COMMANDS,
          'deterministic 31-scenario gate',
          STOP_EVIDENCE_PATH,
          'measured timing and host identities stay in ignored `test-results/bl-017/` artifacts',
        ],
      ],
      [
        RUNBOOK,
        [
          ...STOP_COMMANDS,
          'fixed 31-scenario matrix',
          STOP_EVIDENCE_PATH,
          'test-results/bl-017/runtime-stop-matrix.json',
          'test-results/bl-017/runtime-stop-timing.json',
          'test-results/bl-017/designated-episode.json',
          'test-results/bl-017/residual-audit.json',
          'Host identities and measured durations are intentionally not committed.',
        ],
      ],
      [
        API_README,
        [
          ...STOP_COMMANDS,
          'The deterministic 31-row artifact is',
          STOP_EVIDENCE_PATH,
          'measured timing and host identities remain ignored under `test-results/bl-017/`',
        ],
      ],
      [
        ROUTE_README,
        [
          ...STOP_COMMANDS,
          'Validate the finite contract and fixed 31-scenario matrix with `just verify-runtime-stop`.',
          STOP_EVIDENCE_PATH,
        ],
      ],
      [ROUTING, [...STOP_COMMANDS]],
    ])
  })

  it('documents delivered Restart and the remaining lifecycle boundaries without persistence impact', async () => {
    await expectDocumented([
      [
        RUNBOOK,
        [
          'selected Restart by BL-018',
          'Running/failed Close is delivered by BL-020 and specified in the close sections above.',
          'Ascend still keeps no persisted runtime handles or state, and background monitoring, automatic lifecycle policy, recovery beyond the delivered one-shot API-restart reconciliation, auto-sleep, scheduling, quotas, and containers remain deferred, as do archive, undo, bulk close, and product deletion.',
        ],
      ],
      [
        API_README,
        [
          '## Selected runtime Restart (BL-018)',
          'Restart adds no environment variable, SQLite/data/schema/API-payload migration, persisted runtime handle, deployment topology, daemon, or separate process.',
        ],
      ],
      [
        SWITCHING,
        [
          'Auto-sleep, scheduling, quotas, multi-user, and multi-host operation remain out of scope.',
          'Closing a running or failed project removes that project from Ascend rather than switching among retained ones, so no continuity claim, workflow, socket inventory, or reuse measurement here changes.',
          'Stop and Restart change no SQLite schema or persisted field, environment configuration, deployment topology, or migration requirement.',
        ],
      ],
      [ROOT_README, ['### Restart a workbench']],
      [
        ROUTE_README,
        [
          '### Selected runtime restart',
          'The selected Stop and Restart routes plus global application shutdown are the exposed runtime lifecycle paths; the proxy remains a pure consumer and never invokes them.',
        ],
      ],
      [
        ROUTING,
        [
          'No client health probe, polling, event stream, or proxy lifecycle message is added.',
        ],
      ],
      [
        DOCS_INDEX,
        [
          'See [project-runtime.md](project-runtime.md) for the complete state machine, bounds, route table, cleanup re-attempt, event rules, and proof ceiling.',
        ],
      ],
    ])
  })

  it('reconciles superseded Stop-absence and stale runtime-category claims', async () => {
    const violations = await scanFor([
      {
        id: 'stop-control-absent',
        pattern:
          /\bno (?:public |exposed )?(?:Stop|Stop\/Restart|Restart\/Stop)(?: or Restart)? (?:control|endpoint|route|action|button|UI)\b/iu,
        skipReconciled: true,
      },
      {
        id: 'stop-control-not-added',
        pattern:
          /\bStop(?:\/Restart| or Restart)?[^.]{0,60}\b(?:was|were|is|are) not added\b/iu,
        skipReconciled: true,
      },
      {
        id: 'stop-deferred',
        pattern:
          /\bstop(?:\/restart| or restart)?\b[^.]{0,140}\b(?:remains?|are|is) (?:still )?(?:deferred|excluded|unavailable|out of scope|later scope|BL-020|later)\b/iu,
        skipReconciled: true,
      },
      {
        id: 'lifecycle-controls-deferred',
        pattern:
          /\b(?:public |broader )?lifecycle controls?\b[^.]{0,140}\b(?:remains?|are|is) (?:still )?(?:deferred|excluded|unavailable|out of scope|later scope|BL-020|later)\b/iu,
        skipReconciled: true,
      },
      {
        id: 'shutdown-path-superseded',
        pattern:
          /Global application shutdown is the only exposed runtime shutdown path/u,
      },
      {
        id: 'stale-category-count',
        pattern:
          /\b12\b[^.]{0,40}\b(?:bounded|closed)?\s*(?:runtime )?categor/iu,
      },
    ])
    expect(violations).toEqual([])
  })

  it('reconciles termination attribution, clock, primitive, and signal claims', async () => {
    const violations = await scanFor([
      {
        id: 'attribution-overclaim',
        pattern:
          /process[- ]group absence (?:proves|is proof of|establishes|means|guarantees)\b/iu,
      },
      {
        id: 'descendant-overclaim',
        pattern:
          /(?:proves|guarantees|establishes)[^.]{0,40}\b(?:all|every|arbitrary|any) descendants?\b/iu,
      },
      {
        id: 'graceful-window-origin',
        pattern:
          /(?:graceful|force)[^.]{0,40}(?:window|deadline|phase)[^.]{0,60}\bfrom (?:the )?(?:stop request|sequencer entry|request time|claim)\b/iu,
      },
      {
        id: 'phase-origin',
        pattern:
          /(?:measured|begins|starts|runs|counted) from (?:the )?(?:stop request|sequencer entry)\b/iu,
      },
      {
        id: 'primitives-equally-fallible',
        pattern:
          /\b(?:all|every)\b[^.]{0,40}\bprimitives? (?:are|is) (?:equally )?fallible\b/iu,
      },
      {
        id: 'awaited-deadline-source',
        pattern:
          /deadline[^.]{0,40}\b(?:comes from|derived from|armed by|enforced by|sourced from)\b[^.]{0,20}\b(?:awaited|delay|poll|listener|identity|group)\b/iu,
      },
      {
        id: 'signal-without-delivery-result',
        pattern:
          /\b(?:signals?|SIGTERM|SIGKILL)\b[^.]{0,60}\b(?:sent|sends|send)\b[^.]{0,60}\bwithout\b[^.]{0,40}\b(?:delivery result|delivery confirmation|confirmation|confirming|delivered|result)\b/iu,
      },
      {
        id: 'unconfirmed-as-escalation',
        pattern:
          /\b(?:unconfirmed|refused)\b[^.]{0,60}\b(?:counts|count|is recorded|are recorded|is treated|treated|is reported) as\b[^.]{0,20}\b(?:escalat|delivered)/iu,
      },
      {
        id: 'refused-opens-window',
        pattern:
          /\brefused\b[^.]{0,60}\bopens (?:a|the|its)\b[^.]{0,20}\bwindow\b/iu,
      },
      {
        id: 'wall-clock-termination',
        pattern:
          /(?:termination|graceful|force|stop|SIGTERM|SIGKILL)[^.]{0,80}wall[- ]clock|wall[- ]clock[^.]{0,80}(?:termination|graceful|force|deadline)|(?:termination|graceful|force)[^.]{0,30}(?:window|phase|deadline|elapsed)[^.]{0,40}\bDate\.now\b/iu,
        correctedBy: /\b(?:not|never)\b[^.]{0,80}wall[- ]clock/iu,
      },
    ])
    expect(violations).toEqual([])
  })

  it('keeps the selected-stop lifecycle catalog free of the standalone proof CLI diagnostic name', async () => {
    const prohibited = new RegExp(
      `(?<!project\\.)${BL017_PROHIBITED_LIFECYCLE_EVENT.replaceAll('.', '\\.')}`,
      'u'
    )
    const sentences = await shippedSentences()
    const matches = sentences.filter((sentence) =>
      prohibited.test(sentence.text)
    )

    expect(
      matches
        .filter((sentence) => sentence.document !== PROOF_CLI_DOCUMENT)
        .map((sentence) => `${sentence.document}:${sentence.line}`)
    ).toEqual([])
    // The BL-001 standalone proof CLI keeps its historical stderr diagnostic.
    expect(matches.map((sentence) => sentence.document)).toEqual([
      PROOF_CLI_DOCUMENT,
    ])
    for (const sentence of matches) {
      expect(sentence.text).toContain('stderr')
    }

    const runbook = await text(RUNBOOK)
    const catalog = sentencesOf(RUNBOOK, runbook).find((sentence) =>
      sentence.text.startsWith('Structured lifecycle events are')
    )
    expect(catalog?.text).toBeDefined()
    for (const event of BL017_LIFECYCLE_EVENTS) {
      expect(catalog?.text).toContain(`\`${event}\``)
    }
    expect(catalog?.text).not.toContain(BL017_PROHIBITED_LIFECYCLE_EVENT)
  })
})
