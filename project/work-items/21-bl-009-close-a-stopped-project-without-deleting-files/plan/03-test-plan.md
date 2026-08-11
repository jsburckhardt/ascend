# Test Plan: Close a Stopped Project Without Deleting Files

## Test V-1: Transactional Persistence, Rollback, and Service Isolation

- **Type:** Persistence and service unit/integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-15
- **Priority:** Critical

### Setup

Allocate a unique refused-default SQLite database through the BL-005 helper. Create at least the target row and two sibling rows, construct the real repository/library/close service, and allocate a content-bearing project fixture outside the database tree. Prepare a real SQLite fault that aborts after the target DELETE begins, adapter spies, project-filesystem forbidden-operation spies, and stack, SQL, database-path, content, secret, and internal sentinels.

### Steps

1. Close one known stable ID and assert one explicit transaction, one delete call, exact `{ disposition: "closed", id }`, target absence, and unchanged siblings.
2. Close an unknown ID and the same already-absent ID; assert typed `project_not_found`, no row mutation, and no success fields.
3. Call the service with malformed direct input and assert rejection before adapter access.
4. Enable the after-delete persistence fault, close a present target, and assert a cause-free typed persistence failure.
5. Read all rows through a fresh handle and prove target plus siblings are unchanged after rollback.
6. Exercise whitespace, metacharacter, and one-character IDs without trimming.
7. Inspect imports/dependencies and forbidden-operation spies for every branch; compare the recursive project manifest.
8. Close resources repeatedly, reopen to prove the successful target remains absent, then remove only the selected database/sidecars and fixture after integrity capture.
9. Search observable errors and retained test values for every sentinel.

### Expected Result

Successful close removes exactly one row in one transaction. Unknown, repeated absent, malformed, and persistence-failure outcomes do not mutate metadata. The after-delete failure rolls back completely. The service has no project-filesystem access and exposes no raw detail.

### Expected Evidence

Focused Vitest output with transaction/delete counts, exact outcomes, before/after/rollback row buffers, fresh-handle absence, no-filesystem traces, equal fixture manifests, cause-free error inspection, close counts, and zero isolated database/fixture residuals.

## Test V-2: DELETE Contract, Safe Mapping, Restart, and Exact Eight-Way Concurrency

- **Type:** Fastify route and real SQLite integration
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-12, AC-15
- **Priority:** Critical

### Setup

Build Fastify through the real application plugin with an injectable close service and captured structured logs. Use fresh isolated databases for mapping cases and for concurrency. Seed stable target and sibling projects. Prepare opaque whitespace/metacharacter IDs, malformed request targets, and all redaction sentinels. Bound each request with repository-local timeouts.

### Steps

1. DELETE a known encoded ID and compare HTTP 200, exact two-key success body, returned stable ID, `closed`, one delegation, and a safe `project.closed` event.
2. DELETE unknown and already-absent IDs and compare HTTP 404 exact `project_not_found` envelopes, one delegation each, unchanged rows, and no partial success.
3. Send missing or malformed/undecodable IDs and assert HTTP 400 exact `invalid_project_id`, zero close delegation, and unchanged rows.
4. Inject transactional persistence and unexpected service failures and assert HTTP 500 exact `project_close_failed`, one accepted delegation, rollback, and no partial success.
5. Search bodies, headers, and logs for all sentinels and raw IDs used as sentinels.
6. Fire exactly eight concurrent DELETE requests for one fresh target and await all within the bound.
7. Assert exactly one 200 `closed`, seven 404 `project_not_found`, eight delegations, zero target rows, unchanged siblings, and no raw database error.
8. Stop the app, reopen against the same path, call authoritative GET, and prove the target ID is absent.
9. Verify repeated shutdown closes existing list/registration resources exactly once and no third database owner was opened; clean only isolated files.

### Expected Result

The route delegates every accepted ID once and maps malformed, absent, and persistence failures distinctly. Eight concurrent requests deterministically produce one closed and seven not-found outcomes, with durable absence after restart and safe observability.

### Expected Evidence

Fastify/Vitest status-envelope table, delegation counts, structured event capture, one/seven aggregate, zero-row and authoritative-list snapshots, restart result, redaction scan, lifecycle close counts, and absent database sidecars.

## Test V-3: Recursive Non-Mutation and Targeted Resource Cleanup Matrix

- **Type:** Real filesystem, SQLite, service/API, and cleanup integration
- **Task:** T-6
- **Acceptance Criteria:** AC-2, AC-12, AC-14, AC-15
- **Priority:** Critical

### Setup

Allocate one BL-009-contained fixture with nested directories, binary/text files, a sentinel file, a symlink, distinct modes, and recorded nanosecond mtimes. Register it in unique isolated databases as needed. Use the BL-006 manifest shape and BL-005 exact database sidecar allowlist. Prepare component/transport harnesses for Cancel, ambiguity, and retry without adding product filesystem behavior.

### Steps

1. Capture a complete baseline recursive manifest before each case.
2. Exercise Cancel with zero DELETE requests and compare the manifest before any cleanup.
3. Exercise successful close, unknown ID, repeated already-absent close, and exact eight-way concurrency through the real API; compare after each case.
4. Trigger the real after-delete persistence failure and compare rows plus manifest after rollback.
5. Simulate a post-transmission ambiguous response while the real operation completes, reconcile by authoritative GET, and compare the manifest.
6. Exercise a proved-no-mutation same-ID retry and compare the manifest.
7. For each snapshot compare relative membership, type, bytes, symlink target, mode, and mtime.
8. Close all registered resources in reverse order. Remove only the selected database and `-wal`, `-shm`, `-journal`, then remove only the allocated fixture.
9. Prove default-path refusal, unrelated sibling preservation, and zero residual database/fixture entries.

### Expected Result

Every required close, failure, ambiguity, retry, Cancel, and concurrent path leaves the project fixture byte-for-byte and metadata-for-metadata unchanged. Integrity is proved before test-only removal, and cleanup affects only allocated resources.

### Expected Evidence

A sanitized per-case manifest matrix, exact equality assertions, one/seven concurrency fields, rollback rows, closure order, default-path refusal, unrelated sibling check, and zero residual counts.

## Test V-4: Close Client Codec, Transmission, Timeout, and Same-ID Transport

- **Type:** Web client unit and transport integration
- **Task:** T-3
- **Acceptance Criteria:** AC-4, AC-7, AC-9, AC-10, AC-11, AC-13, AC-16
- **Priority:** Critical

### Setup

Use mocked fetch, deferred response bodies, fake timers, inspectable AbortSignals, a pre-send control, and a transmission callback. Prepare every documented success/failure envelope plus missing/extra fields, partial success, unreadable/truncated/non-JSON bodies, undocumented statuses, malformed authoritative lists, whitespace/metacharacter IDs, and bounded long text fixtures.

### Steps

1. Parse exact 200 `closed`, 400 `invalid_project_id`, 404 `project_not_found`, and 500 `project_close_failed` envelopes.
2. Reject all status/body mismatches, extra/missing keys, partial successes, raw text, and malformed data.
3. Capture initial and retry DELETE URLs; decode them and prove byte-equivalent original stable IDs for whitespace and metacharacter cases.
4. Prove controlled pre-send failure returns `not_transmitted` without fetch and before transmission notification.
5. Start fetch, observe transmission notification, then trigger timeout, reset, owner abort, unreadable/truncated/non-JSON body, undocumented status, and invalid contract; assert every case is `unknown`.
6. Assert documented known errors remain definitive fixed categories and no server text reaches a user message.
7. Advance the exact close and list bounds; inspect abort state and timer cleanup.
8. Parse authoritative lists with the original ID present and absent; reject failed, duplicate-ID, partial, and invalid lists without partial cards.
9. Search generated messages/results for all sentinels and assert text values are treated as opaque data.

### Expected Result

Only exact documented envelopes are accepted. Only proven pre-send failure is definitely non-transmitted. Every post-fetch uncertain outcome is unknown, retries use only the original ID, requests are bounded, and no raw detail or partial data crosses the client boundary.

### Expected Evidence

Client Vitest codec/classification matrix, encoded/decoded ID equality, transmission order, timeout/abort traces, list validation table, fixed-message inventory, sentinel scan, and branch coverage.

## Test V-5: Project Home Close Ownership, Reconciliation, Focus Intent, and Stale Suppression

- **Type:** React hook/reducer state-machine integration
- **Task:** T-4
- **Acceptance Criteria:** AC-7, AC-8, AC-9, AC-10, AC-11, AC-16
- **Priority:** Critical

### Setup

Mount a hook harness with ordered projects, deferred close/list transports, fake timers, inspectable signals, and outputs for original ID, dialog phase, transmission state, active owner, cards, announcement, recovery controls, and focus intent. Include first, middle, last, and sole-card targets.

### Steps

1. Open and cancel before Confirm; assert no owner/request and exact activator focus intent.
2. Confirm once, repeat activation, and assert one close owner/request. Signal transmission and assert cancellation is no longer allowed.
3. Resolve success for first, middle, last, and final cards; assert only the target ID is removed and next, previous, or heading focus intent is exact.
4. Resolve proved non-transmission and rollback-safe persistence failure; assert card preservation and same-ID Retry eligibility.
5. Resolve `project_not_found`; assert card preservation and required authoritative refresh before any removal/retry.
6. Resolve timeout/reset/invalid post-transmission outcome; assert no optimistic card change, locked original ID, and Refresh-only recovery.
7. Refresh with the original ID present and assert same-ID Retry; refresh with it absent and assert the common success reducer.
8. Reject, time out, or return invalid/duplicate-ID refresh and assert the locked unknown state plus Refresh again.
9. Repeatedly activate Confirm, Retry, and Refresh while pending and prove one owner/call.
10. Invalidate attempts through cancellation, newer attempt/reconciliation, timeout, successful list, and unmount; resolve old promises and compare no-diff cards, dialog, focus, announcement, and recovery snapshots.
11. Attempt registration while close owns the page and close while another owner is active; prove no parallel owner.

### Expected Result

The controller owns one operation at a time, uses only the original ID, never retries an uncertain mutation without reconciliation, and applies one common stable-ID success/focus reducer. Every stale or unmounted completion is inert.

### Expected Evidence

Finite transition table, close/list call counts, active owner and generation traces, AbortSignal states, present/absent/failed/invalid reconciliation snapshots, focus-intent table, and stale no-diff evidence.

## Test V-6: Accessible Dialog, Keyboard, Focus, Success, Error, and Inert Text

- **Type:** React component and accessibility interaction
- **Task:** T-5
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-16
- **Priority:** Critical

### Setup

Render Project Home with controlled list/close transports, Testing Library user-event, mocked `scrollIntoView`, stable ordered cards, deferred requests, and the existing live status region. Prepare names, paths, IDs, and fixed errors with whitespace, HTML/script metacharacters, one-character IDs, generated-length IDs, and bounded long values.

### Steps

1. Count exactly one Close button per card and activate it by keyboard.
2. Query a modal dialog named exactly `Close <project name>?` and compare the exact body copy.
3. Tab and Shift+Tab repeatedly across current dialog controls and assert focus never escapes.
4. Activate Escape and Cancel separately; assert zero DELETE calls, unchanged cards, closed dialog, and restored activating Close focus.
5. Reopen and activate destructive Confirm. Repeat Enter/Space/click activation and assert one DELETE request.
6. Before transmission assert Cancel availability; after transmission assert Cancel absence, busy/pending semantics, and programmatic announcement.
7. Resolve success for first/middle/last/final cards; assert stable-ID-only removal, unchanged URL/no reload, success announcement, next/previous/heading focus, and existing empty state.
8. Resolve validation/API/persistence/pre-send failures and inspect fixed message, preserved card/dialog or recovery state, and only eligible same-ID action.
9. Resolve unknown, then present, absent, failed, and invalid authoritative refresh outcomes and inspect exact controls, card changes, focus, and announcements.
10. Resolve stale operations after cancellation/new generation/unmount and assert no DOM/focus/status change.
11. Compare exact textContent for all whitespace/metacharacter/edge fixtures and assert no script or interpreted markup node exists.

### Expected Result

The dialog is correctly named, modal, keyboard-contained, cancellable only before transmission, and requires destructive confirmation. Success, definitive errors, unknown recovery, focus, empty state, stale suppression, and inert text match the acceptance contract.

### Expected Evidence

Component role/name/copy report, keyboard and active-element traces, DELETE/list counts, live-region and control inventories, stable-ID card/focus snapshots, no-navigation assertion, exact text/no-markup checks, and configured coverage results.

## Test V-7: Owned Keyboard-Only Chromium Success, Controlled Fault, Integrity, and Cleanup

- **Type:** Playwright end-to-end and lifecycle cleanup integration
- **Task:** T-7
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-8, AC-9, AC-13, AC-14, AC-17, AC-18
- **Priority:** Critical

### Setup

Allocate disposable loopback API/web ports, a refused-default BL-009 database, and a unique content-bearing project fixture with a sentinel file. Start real API and Vite in recorded detached process groups with opening policy restricted to the fixture. Configure serial desktop Chromium with retries disabled and a finite episode timeout. Prepare a second launch with a test-only one-shot persistence fault injected through application construction.

### Steps

1. Navigate to Project Home and use only keyboard interaction to complete the merged BL-008 registration flow.
2. Focus the project Close action, open the dialog, inspect exact role/name/copy, cycle Tab and Shift+Tab, then Cancel.
3. Prove zero DELETE calls, unchanged authoritative GET/row, unchanged card, and restored Close focus.
4. Reopen by keyboard, activate destructive Confirm, and await success.
5. Prove exactly one DELETE, no document reload, card absence, authoritative GET absence, success announcement, heading focus for the final card, and the existing empty state.
6. Compare the complete fixture manifest and sentinel bytes before any cleanup.
7. In a separate real-app launch, register a fresh fixture, trigger the repository-controlled persistence fault, and prove fixed safe error, preserved card/recovery state, same-ID eligible action, and the documented recovery outcome.
8. Scan browser text, network responses, process output, and retained JSON for sentinels.
9. In `finally`, gracefully stop exact process groups, escalate only recorded groups when required, probe listeners/group members, close database handles, remove only database/sidecars and fixture allocations, then prove absence.
10. Execute retained startup/assertion/timeout/interrupted/surviving-descendant cleanup-owner cases where the shared harness applies, preserving honest owner-failure and final teardown fields.

### Expected Result

One real keyboard episode proves registration, Cancel, Confirm, row/card removal, focus, empty state, no reload, and unchanged project content. A separate local controlled fault proves safe error/recovery. Every owned resource is absent after integrity evidence and cleanup.

### Expected Evidence

Playwright pass, sanitized BL-009 success and fault episode JSON, exact keyboard/request/navigation/focus fields, authoritative-list result, equal pre-cleanup manifest, sentinel scan, cleanup matrix, and zero process-group/listener/database/sidecar/fixture residual counts.

## Test V-8: Documentation, Harness, Command, Scope, and Evidence Contract

- **Type:** Executable documentation regression
- **Task:** T-8
- **Acceptance Criteria:** AC-19
- **Priority:** High

### Setup

Load root/application/API/web/harness documentation, `justfile`, close route/client/dialog constants, status/category maps, finite timeout and existing length-bound constants, evidence paths, and cleanup scenario names. Include prior BL-005 through BL-008 documentation suites.

### Steps

1. Require the exact DELETE route, success/error statuses and envelopes, accepted stable-ID behavior, one delegation, transaction, rollback, redaction, and no project-filesystem API.
2. Require the persistence-only stopped-project boundary and the absence of schema migration/runtime state.
3. Require the exact dialog name pattern/body copy, one Close action, modal/focus trap, Tab/Shift+Tab, Escape/Cancel, destructive Confirm, pending announcement, success focus, and final empty state.
4. Require definitive same-ID Retry eligibility and ambiguous present/absent/failed/invalid list reconciliation without guessing.
5. Require recursive manifest fields, exact eight-way result, controlled fault, integrity-before-cleanup, test-only resource ownership, evidence paths, and observed result.
6. Require `just verify-close-project` and `just verify`; assert one focused recipe and preserved non-persistent harness/checks ownership.
7. Require explicit BL-020 deferral for running or failed workbench close and exclude stop/restart, runtime status, product cleanup/archive, undo, soft delete, and bulk close.
8. Run prior documentation tests and reject stale statements that all close behavior remains deferred or that runtime shutdown is delivered.

### Expected Result

All affected documentation agrees with executable constants and delivered persistence-only behavior, records evidence/cleanup honestly, and does not claim BL-020 runtime states or cleanup.

### Expected Evidence

Passing documentation Vitest output, synchronized README/harness diff, root recipe inventory, exact constant/evidence links, prior-suite regression results, and explicit scope assertions.

## Test V-9: Complete Repository Validation and Residual-Resource Audit

- **Type:** Full regression and acceptance validation
- **Task:** T-9
- **Acceptance Criteria:** AC-1 through AC-20
- **Priority:** Critical

### Setup

Complete V-1 through V-8, start with no BL-009 resource, and use only root `justfile` recipes. Preserve generated evidence only under documented ignored BL-009 paths. Prepare an AC-1 through AC-20 implementation evidence checklist and a final residual probe for every recorded resource identity.

### Steps

1. Run the persistence/service, route/concurrency, manifest/cleanup, client, controller, component, documentation, and browser matrices through `just verify-close-project` and targeted `just verify-focused` recipes.
2. Run `just verify` without omitting format, lint, strict typecheck, package tests/coverage, BL-006 registration gate, builds, all Playwright scenarios, or retained capacity audit.
3. Capture each exit code and concise suite/test/coverage result.
4. Inspect every BL-009 manifest, success/fault episode, and cleanup artifact for required fields and honest outcomes.
5. Independently rescan recorded process groups and listeners and prove database/sidecar/fixture paths absent.
6. Confirm the developer database and unrelated project content were untouched.
7. Map every AC ID to implementation, validation, expected evidence, documentation impact, and final result in `implementation/00-implementation.md`.
8. Confirm no runtime state, stop/restart, running/failed workbench close, product cleanup/archive, undo, soft delete, or BL-020 claim entered the implementation.

### Expected Result

Every focused gate and the full root gate exits zero with configured coverage unchanged. All acceptance evidence is present, no BL-009-owned resource remains, and the implementation stays within the persistence-only stopped-project slice.

### Expected Evidence

Focused command reports, final `just verify` exit zero, test/coverage/build/Chromium summaries, inspected retained evidence, empty independent residual audit, clean scope scan, and complete AC-indexed implementation handoff.
