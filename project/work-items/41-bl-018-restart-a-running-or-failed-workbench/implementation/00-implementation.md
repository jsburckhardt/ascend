# Implementation Record: BL-018 Restart a Running or Failed Workbench

## Scope and completed behavior

Implemented T-1 through T-14 on
`feat/41-restart-running-or-failed-workbench` within
`ADR-260815-explicit-workbench-restart-control`,
`ADR-260815-per-project-lifecycle-activation`, the amended runtime-state,
selected-stop, and termination-sequencer ADRs, and the amended runtime,
logging, filesystem-safety, and stable-proxy core-components.

- Added one manager-owned Restart operation for a selected `Running` or
  current-process retained `Failed` project, with synchronous claim, joined
  callers, strictly ordered release and replacement phases, and `Starting`
  projection throughout the replacement.
- Added trusted release and overall deadline arms, the 5,000 / 15,000 /
  20,000 / 60,000 / 66,000 / 81,000 ms manager bounds, and an 85,000 ms
  browser transport bound.
- Added pending replacement admissions before launch, admission-plus-identity
  quarantine, identity-keyed collision cleanup, explicit unresolved-admission
  shutdown reporting, and detached late settlement that cannot mutate a
  successor.
- Added `POST /api/projects/:id/runtime/restart`, ten disclosure-safe route
  categories, Restart/Stop conflict handling, and the six new exhaustive
  stable-proxy failures at HTTP 503.
- Added strict browser parsing, independent per-project Restart lanes,
  accessible pending/success/failure/unknown outcomes, duplicate suppression,
  peer-control availability, one successful-state refresh, and focus return.
- Preserved registration, filesystem contents, the unchanged stable route,
  four public states, peer runtime identity, unrelated controls, Stop/Open
  behavior, and the BL-019/BL-020 boundaries.
- Added sixteen source guards, eight controlled mutation classes, an exact
  64-scenario executed matrix, a three-generation real-host episode with held
  HTTP and WebSocket connections, and an independent residual audit.

## Completed tasks

| Task | Result |
|---|---|
| T-1 | Complete - six entry states and targets, eighteen failures, nine events, restart outcomes, internal vocabularies, and bounds |
| T-2 | Complete - manager claim, eligibility, release gate, replacement settlement, joining, and sequential restart |
| T-3 | Complete - start, reuse, Stop, proxy, and bounded shutdown behavior for `restarting` |
| T-4 | Complete - generation guards and stale prior-generation isolation |
| T-5 | Complete - strict Restart route and widened Stop conflict route |
| T-6 | Complete - strict browser transport, notices, and 85-second timeout |
| T-7 | Complete - per-project Home lane, outcomes, refresh, focus, and peer availability |
| T-8 | Complete - source guards, catalog, validator, mutations, and deterministic serializer |
| T-9 | Complete - 64 executed scenarios with retained byte-stable evidence |
| T-10 | Complete - real three-generation episode and independent residual audit |
| T-11 | Complete - root verification and proof recipes wired into `verify` once |
| T-12 | Complete - affected application documentation and contract tests |
| T-13 | Complete - retained evidence, historical regressions, and canonical root gate |
| T-14 | Complete - exact ten-field admission, quarantine indexes, callback wrappers, and detached continuation |

## Acceptance evidence

| AC | Concrete implementation and observed evidence |
|---|---|
| AC-1 | Running Restart releases the exact prior PID/start/port identity, confirms process, owned-group, and listener absence before launch, and installs one distinct ready replacement for the same project, path, owner token, and stable route. The real-host episode independently observed the release triple and three distinct replacements. |
| AC-2 | A retained `Failed` entry remains restart-eligible with a live, absent, missing, pending-admission, or quarantined prior-resource class. Unit and matrix rows cover failure without ownership, unconfirmed release retry, resolved admission retry, quarantine reclamation, and successful return to `Running` without the prior failure. |
| AC-3 | The internal `restarting` entry maps only to public `Starting`; no settlement reports `Stopped` between generations, and `Running` is installed only from a health-gated `ReadyRuntime`. Public states remain exactly four. |
| AC-4 | The designated episode held real HTTP and WebSocket connections against the prior listener; both were severed after release, the old listener was absent, and the unchanged stable route reached each replacement. Documentation explicitly makes no session-continuity claim. |
| AC-5 | Matrix and designated fixtures preserve stable ID, display name, canonical path, created-at value, file membership, content digests, modes, and timestamps. Registration and fixture snapshots were unchanged after all three real restarts. |
| AC-6 | Home renders Restart only for `Running` and retained `Failed`, uses buttons and polite/alert outcomes, sets selected-card busy state, prevents duplicate same-project activation, restores focus, and leaves peer controls usable. Revision 6 makes the Close-dialog admission condition global: while Close B is open, programmatic Restart A is inert and sends no transport request; the opposite-direction regression proves that Restart A pending still permits Close B. BL-014 evidence proves three Stop controls plus the exact one-to-two-to-three Restart-control progression as projects become Running. |
| AC-7 | Every accepted operation emits one `runtime.restart.requested` and one terminal success or failure; pre-acceptance rejection emits none. The event catalog, route outcomes, projection, Home notices, evidence validator, and protected-value scans agree without exposing protected runtime details. |
| AC-8 | Release deadline or incomplete release settles `release-unconfirmed`, launches no replacement, retains `restart-release-unconfirmed`, keeps public `Failed`, and preserves the exact ownership or admission needed for a later retry. |
| AC-9 | Replacement launch, readiness, overall-deadline, and non-confirming cleanup paths settle bounded non-success, retain an actionable failure, leave no installed successor, and either prove absence or publish `residualCount: null` with exact admission/quarantine evidence. |
| AC-10 | Eight concurrent Restart calls join one operation, one release, one admission, one replacement launch, one event pair, and one shared outcome. |
| AC-11 | Three sequential successful Restarts create three distinct healthy generations. After each settlement the manager has one ownership record, no pending admission, and no quarantine; final shutdown and the independent audit report zero residuals. |
| AC-12 | Unknown, Stopped, starting, stopping, restarting, and shutdown cases return their fixed bounded result without unintended launch, release, registration mutation, or lifecycle event. |
| AC-13 | Two-project matrix rows preserve the peer's exact identity, readiness, route, registration, and fixture across selected success, retained-failed success, release failure, and replacement failure. The unrelated control process and listener remain available until separate teardown. |
| AC-14 | Generation compare-and-set guards prevent late release, exit, health, connection, launch, and cleanup settlements from installing, terminating, routing to, or emitting a terminal outcome for a successor. Late ownership is restricted to exact quarantine and cleanup records. |
| AC-15 | Unknown client settlement remains explicit and offers only a fresh read-only runtime-state observation; it never assumes success, automatically retries Restart, or claims BL-019 reconciliation. |
| AC-16 | `just verify-runtime-restart` executes the full 64-scenario catalog in fixed order, manager/route/browser/component contracts, sixteen source guards, eight mutation classes, conflict rows, stale settlement, registration and fixture retention, and cleanup. |
| AC-17 | The retained matrix correlates identities, release/readiness, state, event, route, connection, registration, fixture, peer/control, bound, admission, quarantine, attempt, and cleanup evidence. It contains 48 proven-zero residual rows and 16 honest `null` rows; every row has `teardownResidualCount: 0`. The independent real-host audit reports every residual class at zero. |
| AC-18 | README, API, route, browser, runtime, routing, session, workbench-proof, and documentation-index surfaces describe eligibility, bounds, state, connections, accessibility, privacy, evidence, cleanup, and commands while preserving BL-019 and BL-020 boundaries. Documentation contracts pass. |
| AC-19 | The canonical root `just verify` gate passes, including formatting, lint, type checks, coverage, builds, browser E2E, BL-010 through BL-017 regressions, BL-018 acceptance, designated proofs, and all configured residual audits. |
| AC-20 | All proof uses repository-local deterministic fixtures, a locally installed code-server executable, loopback listeners, root `justfile` commands, bounded timers, and zero-retry designated runs; no production access, hosted credential, destructive production action, unsupported hardware, or manual judgment is required. |

## Retained evidence

- Accepted plan files:
  - `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/plan/01-action-plan.md`
  - `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/plan/02-task-breakdown.md`
  - `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/plan/03-test-plan.md`
- Revision-6 action-plan SHA-256:
  `95e9966ed8e6f513d6cf6a171dbba50763c38a3a04da0d65a585c6f651fea5f5`
- Revision-6 completed task-breakdown SHA-256:
  `d5c1e1b9dd85102ea62058015828509c9847fb8ed605d181c9efe14859c6d5bd`
- Revision-6 test-plan SHA-256:
  `b7fe31160aed8833a156668cd2a6636c282a8215b782d0b0709cefd5f14bad5b`
- Retained matrix:
  `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json`
- Disposable matrix:
  `test-results/bl-018/runtime-restart-matrix.json`
- Final matrix SHA-256:
  `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`
- The retained artifact has exactly 64 rows in catalog order, regenerates
  byte-identically, validates after reparsing, carries no protected path,
  authority, PID, port, command, environment, credential, or source content,
  and leaves all earlier committed evidence artifacts unchanged.

## Validation results

| Command | Observed result |
|---|---|
| `just verify-runtime-restart` | Passed: 11 files, 124 tests; exact 64-scenario catalog and byte-stable retained evidence |
| `just proof-runtime-restart` | Passed: one real code-server start followed by three successful real Restart generations with stale HTTP/WebSocket closure |
| `just proof-runtime-restart-residual-audit` | Passed: prior root/member identities, process group, listener, two stale connections, and three sequence generations re-probed with all seven residual classes zero |
| `just verify-project-runtime` | Passed after serial process-backed execution |
| `just verify-runtime-state` | Passed: 10 files, 105 tests |
| `just verify-runtime-stop` | Passed: 12 files, 153 tests |
| `just verify-session-switching` | Passed: five deterministic files, eight tests; one zero-retry Chromium episode; residual audit status `ok` |
| Restart documentation contracts | Passed: eight Restart tests plus historical Stop and session-switching contracts |
| `just verify` | Passed end to end, including all historical designated browser proofs, full package suites, builds, BL-018 proofs, and residual audits |

## Revision 6 AC-6 correction

Independent Verify of commit
`e4e8dc1a6da7035a984e628bce2127397805b954` returned AC-6 to Plan
because Restart admission used `value.close?.id === projectId`, which allowed
Restart A while Close B's dialog was open. Plan revision 6 reconciled T-7 and
V-12 with the existing global rule in
`ADR-260815-per-project-lifecycle-activation`; no architecture artifact,
decision-log entry, or application documentation changed.

- `apps/web/src/use-project-home.ts` now guards Restart admission with
  `value.close !== undefined`.
- `apps/web/test/use-project-home-restart.test.tsx` proves that Close B open
  leaves both restart lanes, settlement version, focus, announcement, and
  Close B unchanged while issuing zero Restart transport requests.
- `apps/web/src/runtime-restart-component-matrix.test.tsx` scenario 16 proves
  the same refusal through the rendered component while leaving the selected
  card unmodified. The retained opposite-direction test proves that Restart A
  pending still permits Close B.
- `just verify-focused apps/web/test/use-project-home-restart.test.tsx apps/web/src/runtime-restart-component-matrix.test.tsx apps/web/src/runtime-restart-component.test.tsx apps/web/src/App.test.tsx --reporter=verbose`
  passed four files and 59 tests.
- Canonical `just verify` passed after formatting, and
  `/tmp/ascend-runtime-data` contained zero test-owned directories.
- The retained matrix remained byte-identical at
  `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`.

Documentation has no impact: the shipped documentation states Restart
eligibility, per-project pending behavior, modal Close behavior, and peer
availability without enumerating controller admission expressions, so every
published statement remains accurate.

The first canonical attempts exposed deterministic proof-environment defects
rather than product failures: the retained matrix needed the same serializer
exemption as earlier evidence, historical documentation required its exact
compatibility phrases, failed BL-014 cleanup masked its original assertion and
left exact test-owned runtimes behind, and BL-014 still assumed Restart controls
did not exist. The fixes add the BL-018 evidence directory to `.prettierignore`,
preserve historical phrases, prevent a pre-counter failure from being masked,
and require three Stop controls plus the exact 1/2/3 Restart progression.
Specific abandoned test PIDs and fixture directories were removed before the
clean canonical run; the final host audits report zero residuals.

## Documentation evidence

- `README.md` and `docs/README.md` describe Restart eligibility, state, bounds,
  commands, privacy, retained evidence, and deferred boundaries.
- `docs/project-runtime.md` documents the five prior-resource classes,
  two-phase gate, trusted deadlines, pending admissions, exact quarantine,
  cleanup cardinality, settlement-reason precedence, shutdown reporting, and
  the two-field residual encoding.
- `docs/stable-workbench-routing.md` publishes all 29 exhaustive failures,
  preserves the unchanged route, and documents stale connection behavior.
- `docs/session-switching.md` preserves historical continuity claims while
  explaining that explicit Restart replaces the runtime and does not promise
  editor or terminal continuity.
- `docs/workbench-proof.md`, `apps/api/README.md`,
  `apps/api/src/routes/README.md`, and `apps/web/README.md` document the exact
  route/browser contracts, proof split, accessibility, focus, and recovery.
- Configuration: no environment variable, user option, or persisted default
  was added. The settlement allowance is internal validated manager config.
- Migration: no schema, persisted runtime identity, registration payload, or
  data migration changed.
- Deployment: no daemon, listener topology, front-door route, infrastructure,
  or manual production procedure changed.
- Operations: the three bounded Restart commands are root `justfile` recipes
  and use local disposable resources.

## Architecture compliance

- `ADR-260815-explicit-workbench-restart-control` is implemented through one
  manager-owned selected command, release confirmation, health-gated
  replacement, explicit bounded failures, and generation-safe settlement.
- `ADR-260815-per-project-lifecycle-activation` is implemented through
  independent browser lanes and an 85-second transport ceiling above the
  81-second manager ceiling.
- The amended runtime-state, selected-stop, and termination-sequencer ADRs
  preserve the four public states, add only the accepted conflicts, and use
  trusted synchronous deadline scheduling around fallible awaited operations.
- The amended core-components retain exact ownership, bounded failures,
  disclosure-safe events, filesystem preservation, and stable-proxy
  exhaustion.
- Global architecture artifacts and `DECISION-LOG.md` contain the Plan-stage
  decisions. Implementation introduced no architecture divergence.

## Harness evidence

Real `harness observe` calls captured the architecture-shape proof gap, the
byte-stable evidence formatting friction, and the failed-proof cleanup masking
that left host resources behind. The coordinator successfully loaded the
registered `eng-harness-flow` skill, then attempted the required exact
`eng-harness-flow --hook post-coding --json` invocation. This host accepts only
registered skill names and returned skill-not-found for the argument-bearing
invocation, so no post-coding lifecycle envelope was available. That
unavailability is recorded as `COORD-001`; the coordinator repeated the exact
attempt after the revision-6 correction and received the same unavailable
result. Neither record substitutes a success-shaped fallback.

## Handoff boundary

All planned product, test, evidence, architecture, application documentation,
and command work is complete. Final acceptance, exact-commit verification,
GitHub checkbox updates, push, PR creation, and merge remain owned by Verify.
BL-019 API-restart reconciliation and BL-020 running-or-failed project Close
remain out of scope.
