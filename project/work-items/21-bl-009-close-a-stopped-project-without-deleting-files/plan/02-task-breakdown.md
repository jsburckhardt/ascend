# Task Breakdown: Close a Stopped Project Without Deleting Files

## Task T-1: Add Transactional Persistence and the In-Process Close Service

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-12, AC-15
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description

Extend `ProjectPersistenceAdapter` and `ProjectRepository` with a stable-ID removal operation. The Drizzle adapter shall execute one `DELETE ... WHERE id = ... RETURNING id` inside one explicit SQLite transaction. One returned ID becomes `{ disposition: "closed", id }`; zero rows becomes typed `project_not_found`. Any adapter or transaction failure becomes a cause-free close persistence error and must not produce a success-shaped result.

Expose the operation through the already closeable `ProjectLibrary` and a small `ProjectCloseService`. The service validates direct-call input, receives only a metadata repository/library boundary, and has no project path, registration inspector, runtime manager, or filesystem dependency. Application resource `close()` and project `closeProject(id)` names must remain unambiguous.

Use a real SQLite `AFTER DELETE` aborting trigger or equivalent repository-local fault to prove a failure after the delete statement rolls back the matching row and every other row. Do not add schema columns, soft delete, runtime state, archive behavior, or a migration.

### Acceptance Criteria

- AC-1: One transaction removes exactly one matching ID, returns that ID with `closed`, reports typed `project_not_found` for unknown/repeated calls, and rolls every persistence failure back completely.
- AC-2: The service module graph and dependencies contain no project-filesystem API; every direct outcome leaves project content untouched.
- AC-4: Persistence errors expose no cause, SQL, path, stack, content, secret, or internal sentinel.
- AC-12: The persistence primitive supports the exact one-winner/seven-not-found aggregate under concurrent DELETE calls.
- AC-15: Isolated service evidence covers malformed, success, absent, failure, restart, close ownership, and cleanup.

### Test Coverage

- Add repository/service unit tests for malformed input before adapter access, one-row close, unknown ID, repeated absent close, and typed error wrapping without `cause`.
- Add isolated SQLite integration tests for one transaction, unaffected sibling rows, real after-delete rollback, closed-ID absence after complete resource close/reopen, and idempotent resource closure.
- Add source/import contract checks and a forbidden project-filesystem-operation spy around every service outcome.
- Exercise one-character, whitespace, and metacharacter IDs without trimming or rendering them in errors.

### Expected Evidence

- Focused V-1 output with transaction/delegation counts, before/after rows, rollback trigger result, cause-free errors, no-filesystem traces, restart absence, and removed isolated database/sidecars.

## Task T-2: Expose the Safe Stable-ID DELETE Operation

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-3, AC-4, AC-12, AC-15
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-development-standards

### Description

Construct one `ProjectCloseService` over the existing application-owned listing `ProjectLibrary`, decorate Fastify with it, and expose an injection seam without opening a third database owner. Preserve current registration and list owners and close them exactly once on shutdown.

Add `DELETE /api/projects/:id`. Treat the exact decoded, nonempty project ID as opaque and do not trim it. Missing, undecodable, or otherwise malformed route input must not delegate. Each accepted ID delegates exactly once. Return only:

- 200 `{ "id": "<stable-id>", "disposition": "closed" }`
- 400 `{ "error": { "category": "invalid_project_id" } }`
- 404 `{ "error": { "category": "project_not_found" } }`
- 500 `{ "error": { "category": "project_close_failed" } }`

Failure envelopes contain no ID or partial success. Emit stable safe event/category fields, including `project.closed` on success, without raw supplied IDs or error detail in bounded logs. Separate close handling from the current registration-oriented plugin error fallback so parser/router failures cannot be mislabeled.

### Acceptance Criteria

- AC-3: Every accepted DELETE delegates once and every success/failure has its exact distinct status and envelope.
- AC-4: Bodies, headers, and captured structured logs contain none of the supplied sentinels.
- AC-12: Exactly eight concurrent HTTP DELETE calls yield one 200 `closed` and seven 404 `project_not_found` outcomes with no raw database detail.
- AC-15: The application lifecycle, isolated API, restart, closure, and targeted cleanup paths are finite and complete.

### Test Coverage

- Add Fastify inject tables for success, unknown, repeated absent, missing/malformed encoding, service persistence failure, unexpected failure, exact keys, content type, and delegation count.
- Run exactly eight simultaneous DELETE injections against real isolated SQLite and assert one/seven status and disposition counts, zero matching rows, and unchanged siblings.
- Close/reopen application resources and confirm GET returns the authoritative list without the closed ID.
- Scan response body, headers, logs, and startup/shutdown outcomes for stack, SQL, database path, project content, secret, and internal sentinels.

### Expected Evidence

- Focused V-2 output with exact status/envelope and call-count matrices, eight bounded responses, zero-row/restart list results, safe event fields, lifecycle close counts, and absent database sidecars.

## Task T-3: Add Strict Close Client Codecs and Transmission Classification

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-4, AC-7, AC-9, AC-10, AC-11, AC-13, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-structured-runtime-logging

### Description

Extend `apps/web/src/projects.ts` with the close endpoint builder, exact success/error codecs, fixed safe user messages, and a bounded close transport. Encode the original stable ID exactly once with `encodeURIComponent`; retries reuse the captured original ID rather than card text, name, path, or a newly selected card.

Expose a narrow transmission notification immediately before fetch invocation. Before that notification a controlled pre-send failure can be classified as `not_transmitted`; after it, timeout, reset, abort, unreadable/truncated/non-JSON body, undocumented status, or invalid response contract is `unknown`. Documented 400/404/500 envelopes remain known categories. Transport code classifies only and never edits cards, focus, dialog, or announcements.

Retain the current strict list parser for authoritative recovery. Reuse the existing finite list bound and use one documented finite close bound. Do not render server-provided error text. Do not invent unsupported name/path maxima: test every existing documented finite edge, the nonempty ID lower edge, generated product IDs, and bounded long/metacharacter fixtures.

### Acceptance Criteria

- AC-4: No raw server, ID, path, database, stack, SQL, content, secret, or internal text enters client errors.
- AC-7: The controller can distinguish cancellable pre-transmission from transmitted pending/unknown states.
- AC-9: Known no-mutation outcomes remain definitive and identify only safe same-ID recovery actions.
- AC-10: Every ambiguous post-transmission outcome is unknown and requires authoritative list reconciliation.
- AC-11: Retry always uses the captured original ID and each request is finite and abortable.
- AC-13: Supported edge and metacharacter values remain opaque data.
- AC-16: Client evidence covers all documented success, failure, unknown, timeout, and malformed-contract branches.

### Test Coverage

- Table-test exact 200/400/404/500 envelopes and reject extra/missing keys, mismatched statuses, partial successes, malformed projects, and raw text.
- Capture DELETE URLs and decoded IDs for whitespace and metacharacter values; prove retries are identical.
- Use fake timers, deferred fetches, AbortSignals, and the transmission callback for pre-send, timeout, reset, owner abort, unreadable body, invalid JSON, undocumented status, and invalid shape.
- Validate present/absent recovery lists with the merged strict GET codec, including failed and invalid list results.

### Expected Evidence

- Focused V-4 client output with exact codec matrix, URL/ID equality, timeout/abort/transmission traces, safe fixed messages, and no partial-data acceptance.

## Task T-4: Extend the Single Project Home Owner for Close and Reconciliation

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-7, AC-8, AC-9, AC-10, AC-11, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Extend `useProjectHome` instead of introducing an independent close hook. One active owner, AbortController, and monotonic generation shall govern initial list, registration, close, close retry, and close reconciliation. Store the original project ID, display name used when the dialog opened, original card index, transmission phase, recovery eligibility, and announcement/focus intent.

Opening or cancelling a pre-transmission dialog performs no request. Confirm starts at most one close attempt. Once the transport reports transmission, cancellation is removed. A known rollback or no-transmission result may expose Retry for the same ID. A stale `project_not_found` card and every unknown post-transmission result require authoritative refresh before retry. Refresh presence enables same-ID Retry; refresh absence commits the same success reducer as a confirmed close; failed or invalid refresh remains locked and offers Refresh again.

Successful removal filters only the stable ID. Select the next remaining card Close action by the original index, otherwise the previous action, otherwise the Project Home heading. Every cancel, new attempt, timeout, reconciliation, successful list, and unmount invalidates older completion before it can affect cards, dialog, focus, announcements, or recovery.

### Acceptance Criteria

- AC-7: One explicit Confirm starts one request and cancellation availability follows transmission certainty.
- AC-8: Success removes only one ID, announces it, and publishes exact next/previous/heading focus intent without reload.
- AC-9: Definitive failures preserve the card and expose Retry only with proof of no mutation or refreshed presence.
- AC-10: Unknown outcomes lock the original ID and resolve only from authoritative presence/absence; failed/invalid refresh never guesses.
- AC-11: Repeated actions keep one owner and every stale/cancelled/unmounted completion is inert.
- AC-16: The finite controller matrix covers all named success, error, recovery, stale, and final-card states.

### Test Coverage

- Add hook/reducer tests for open/cancel, pre-send cancel, transmitted pending, success, rollback-safe failure, not found, and repeated Confirm.
- Cover authoritative refresh with original ID present, absent, failed, timed out, malformed, and duplicate-ID invalid; assert exact Retry/Refresh eligibility.
- Cover first/middle/last/final-card removal and next/previous/heading focus intent with stable ordering.
- Resolve every invalidated close/list promise later and compare no-diff snapshots across cards, dialog, focus, announcements, and recovery; repeat after unmount.
- Assert registration and close cannot create parallel page owners.

### Expected Evidence

- Focused V-5 transition matrix, active-owner and call counts, generation/abort traces, focus-intent snapshots, authoritative cardinality outcomes, and stale no-diff results.

## Task T-5: Render the Accessible Confirmation, Recovery, and Focus Behavior

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-4
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Add exactly one semantic Close button beside the existing Open button on every card. Keep refs keyed by stable ID. Render an issue-local modal dialog with `aria-modal`, accessible name `Close <project name>?`, and exact body text `Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted.` Render project names, IDs, paths, fixed error messages, and announcements only as React text.

On open, move focus to a dialog control. Trap Tab and Shift+Tab across the currently available controls. Escape and Cancel close only while cancellation guarantees no transmission and restore the activating Close action. Confirm must be visually/semantically destructive. During transmitted pending or unknown recovery, remove Cancel, expose `aria-busy` or live status, and announce the state. Definitive recovery exposes only the controller-approved same-ID Retry or Refresh action.

After confirmed or reconciled success, focus the next Close action, then previous, then a programmatically focusable Project Home heading. Keep the current empty state for the final card. Preserve page URL and the existing deferred Open behavior.

### Acceptance Criteria

- AC-4: User-facing failures contain fixed safe text only.
- AC-5: There is exactly one keyboard-focusable Close action per card and the dialog name/copy is exact.
- AC-6: Focus wraps in both directions; Escape and Cancel send zero DELETE calls and restore the activator.
- AC-7: Destructive Confirm is required, repeat activation is blocked, and pending/recovery is announced with correct Cancel availability.
- AC-8: Stable-ID success updates cards without reload and applies next/previous/heading focus plus the existing empty state.
- AC-9 and AC-10: Definitive and unknown recovery controls/messages match controller eligibility without internal detail or guessing.
- AC-11: Stale completion causes no DOM, focus, or live-region change.
- AC-13: Whitespace, metacharacter, and supported-edge values remain complete inert text.
- AC-16: Component evidence covers every named dialog, keyboard, focus, success, failure, recovery, stale, and unmount branch.

### Test Coverage

- Use Testing Library user-event for role/name/copy, card action counts, Tab, Shift+Tab, Enter/Space, Escape, Cancel, Confirm, Retry, and Refresh.
- Inspect `document.activeElement`, DELETE/list call counts, `aria-modal`, `aria-busy`, live status, card IDs/order, URL, and final empty state.
- Cover first/middle/last/final success and present/absent/failed/invalid reconciliation.
- Render whitespace, `<script>`, HTML metacharacters, one-character IDs, generated-length IDs, and bounded long fixtures; assert exact text and no interpreted markup.
- Unmount and resolve deferred operations to prove no late dialog/focus/status effects.

### Expected Evidence

- Focused V-6 role/name/copy, keyboard, active-element, stable-ID, call-count, live-region, no-navigation, inert-text, and coverage reports.

## Task T-6: Build Isolated Non-Mutation, Concurrency, and Resource Matrices

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-4, AC-12, AC-13, AC-14, AC-15, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-development-standards

### Description

Create BL-009 isolated helpers by reusing the BL-005 database allocator/refusal and sidecar allowlist plus the BL-006 recursive manifest format. Allocate a content-bearing disposable registered fixture with nested directories, bytes, symlinks, modes, and recorded nanosecond mtimes. Capture and compare a complete manifest after each required branch: Cancel, success, unknown ID, real transactional persistence failure, transport ambiguity, same-ID retry, and repeated already-absent close.

Run service, route, and client/controller matrices against unique databases. Include a real after-delete rollback fault, exact eight-way DELETE, complete close/reopen, authoritative GET, no-project-filesystem import/call checks, and all sentinel scans. Integrity comparison must finish before fixture removal. Cleanup may remove only the allocated database, `-wal`, `-shm`, `-journal`, and allocated fixture root; preserve unrelated siblings and refuse the developer database.

### Acceptance Criteria

- AC-2: Every close outcome has direct no-filesystem-call and unchanged-manifest evidence.
- AC-4: All bounded observable surfaces exclude every supplied sentinel.
- AC-12: Exact eight-way HTTP evidence records one closed, seven not found, zero rows, safe errors, and equal manifest.
- AC-13: Text-edge fixtures remain inert through client/component evidence without changing project content.
- AC-14: A before/after manifest exists for every named branch and is compared before cleanup.
- AC-15: Persistence, service, route, restart, closure, integrity, and targeted cleanup evidence is finite and isolated.
- AC-16: Supporting client/component matrices are complete and bounded.

### Test Coverage

- Add dedicated close fixture/helper contract tests for containment, default-path refusal, idempotent cleanup, close-before-delete, exact sidecar allowlist, unrelated sibling preservation, and manifest completeness.
- Run V-1 through V-6 matrices using fresh allocations and collect per-case result fields rather than an asserted all-true placeholder.
- Verify the controlled fault happens after delete begins and that the transaction restores matching and sibling rows.
- Independently scan disposable roots after each suite and retain only sanitized booleans/counts where evidence is generated.

### Expected Evidence

- V-3 manifest matrix, equal per-case snapshots, one/seven concurrency aggregate, restart absence, rollback rows, resource-close counts, targeted cleanup audit, and zero residual database/fixture entries.

## Task T-7: Extend the Owned Real Chromium Episode and Cleanup Harness

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-8, AC-13, AC-14, AC-17, AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-development-standards

### Description

Extend the existing owned Project Home launcher/process-group helpers rather than adding a second server framework. Allocate BL-009 loopback ports, a refused-default isolated database, and a content-bearing disposable project with a sentinel file. In one no-retry desktop Chromium episode, use the merged BL-008 form by keyboard to register the project, open Close, Cancel once, verify restoration/no request, reopen, Confirm, and prove card plus authoritative GET removal without page reload. Compare the recursive fixture manifest before any fixture cleanup.

Run a separate bounded Chromium episode with a repository-controlled, test-only persistence fault injected through application construction, never a product fault endpoint. Prove fixed error text, preserved card/dialog or stable-ID recovery, allowed same-ID recovery, and eventual documented outcome. The launcher must expose no credential or external-service dependency.

In `finally`, stop only recorded API/web process groups with bounded exact-group escalation, prove listeners absent, close handles, remove only the isolated database/sidecars and allocated fixtures, and verify zero residuals. Record success and controlled-failure evidence separately; cleanup is harness ownership and must not imply product archive or deletion.

### Acceptance Criteria

- AC-4: Browser errors/status and retained evidence expose no sentinels.
- AC-5 and AC-6: Keyboard role/name/copy, focus containment, Cancel, restoration, and zero-request behavior pass against real applications.
- AC-8: Confirm removes the one card and authoritative row without reload and applies success focus/empty state.
- AC-13: Metacharacter and bounded text remains inert in the real browser.
- AC-14: Sentinel membership/bytes/mode/mtime are recorded unchanged before fixture cleanup.
- AC-17: Success and separate controlled-fault/recovery episodes are finite, local, and credential-free.
- AC-18: Every owned process, listener, database/sidecar, and fixture is absent after integrity capture and cleanup.

### Test Coverage

- Add Playwright keyboard assertions for BL-008 registration, Close action, exact dialog, focus wrap, Escape/Cancel restoration, destructive Confirm, request/navigation counts, announcement, card/GET absence, and sentinel integrity.
- Add a separate process-backed test-only fault launch and assert known failure, same-ID recovery, and no internal detail.
- Reuse/extend cleanup owner tests for startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and surviving descendant where applicable; preserve honest owner-failure versus teardown-clean evidence.
- Refuse allocations outside BL-009 roots and the default developer database.

### Expected Evidence

- Passing V-7 Chromium reports, sanitized success/fault episode JSON, equal pre-cleanup manifests, exact request and navigation counts, process-group/listener audits, absent database/sidecars/fixtures, and honest cleanup matrix fields.

## Task T-8: Synchronize Application, API, Web, Harness, and Command Documentation

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6, T-7
- **Acceptance Criteria:** AC-19
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description

Update root, application, API, web, harness, and command documentation. Record the exact DELETE route/status/envelopes; one-transaction service behavior; persistence-only stopped-project boundary; no project-filesystem API; exact confirmation copy; modal, keyboard, focus, Confirm, pending, success, definitive failure, and ambiguous same-ID reconciliation behavior; recursive integrity evidence; controlled fault; test-only cleanup; and observed bounded browser result.

Add a root `verify-close-project` recipe for finite service/API/client/controller/component/documentation/cleanup/Chromium validation while retaining `just verify` as authoritative. Document the existing length bounds actually exercised and do not claim undefined maxima. Explicitly state that running or failed workbench close, runtime states, stop/restart, product cleanup, archive, undo, and soft delete remain BL-020 or later scope.

### Acceptance Criteria

- AC-19: Every required API, scope, copy, accessibility, recovery, non-mutation, validation, fault, cleanup, and BL-020 statement is current and executable.

### Test Coverage

- Add a BL-009 documentation contract test importing route categories, timeout, dialog copy, evidence paths, and cleanup constants.
- Cross-check `README.md`, `docs/README.md`, API/web READMEs, `.harness/engineering-harness.md`, and `justfile`.
- Run BL-005 through BL-008 documentation suites to reject stale persistence, registration, list, or Open Project claims.
- Assert exactly one focused recipe and preserve non-persistent harness boot plus `harness checks` delegation to `just verify`.

### Expected Evidence

- Passing V-8 documentation regressions, synchronized documentation/harness diff, root recipe inventory, retained evidence links, and explicit BL-020 deferral.

## Task T-9: Run Focused and Full Validation and Record the AC-Indexed Handoff

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-1 through AC-20
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description

Run dependency-focused persistence/service, route, non-mutation, client/controller/component, documentation, cleanup, and real Chromium checks through root recipes. Then run `just verify` without excluding formatting, linting, strict type checking, configured package coverage, registration validation, builds, all Chromium tests, or retained capacity audit. Inspect generated evidence and independently probe recorded process groups, listeners, database/sidecars, and fixture roots.

Record task outcomes, documentation impact, command exits, residual audits, and AC-1 through AC-20 evidence in `implementation/00-implementation.md`. Do not claim runtime states, running/failed workbench close, product cleanup, or BL-020 completion.

### Acceptance Criteria

- AC-1 through AC-19: Every mapped focused validation and expected artifact is present and passing.
- AC-20: `just verify-close-project` and `just verify` exit zero and no BL-009-owned resource remains.

### Test Coverage

- Run V-1 through V-8 through `just verify-close-project` and targeted `just verify-focused` paths during correction.
- Run final `just verify` with configured coverage thresholds unchanged.
- Inspect retained browser/fault/manifest/cleanup evidence and independently rescan every recorded resource identity.
- Verify every AC ID maps to final implementation, validation, expected evidence, and documentation impact.

### Expected Evidence

- V-9 focused/full command summaries, test and coverage counts, build/Chromium results, all required retained artifacts, empty residual audit, and a complete AC-indexed implementation handoff.
