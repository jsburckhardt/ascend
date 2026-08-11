# Task Breakdown: Add the Open Project Interaction

## Task T-1: Add the Registration Service Lifecycle and Exact POST Contract

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-7, AC-20, AC-22, AC-23
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description

Extend application construction with one injected `ProjectRegistrationService` seam while preserving the merged BL-006 implementation as the only path-validation and registration boundary. Production startup shall resolve the same explicit database path used by listing, construct the BL-006 service with documented configured-home and allowed-root inputs, fail safely before listen when its opening policy cannot initialize, and close both owned SQLite-backed services exactly once. Do not duplicate BL-006 path parsing, policy, canonicalization, persistence, or non-mutation logic in the route.

Add `POST /api/projects` beside the existing GET route. Set `PROJECT_REGISTRATION_BODY_LIMIT_BYTES` to 4,096 and enforce it on encoded request bytes. Accept only `Content-Type: application/json` with an exact object whose sole key is string `path`; blank and whitespace strings are valid transport contracts and delegate once so BL-006 returns `path_required`. Map empty/malformed JSON, missing or wrong-type path, arrays/scalars, and extra keys to HTTP 400 with exactly `{"error":{"category":"invalid_registration_request"}}`; map 4,097 bytes to HTTP 413 with exactly `{"error":{"category":"registration_request_too_large"}}`. Neither case may call registration.

Map BL-006 results exactly: `created` to 201 and `existing` to 200, each with only `{"disposition":"...","project":{"id","name","canonicalPath","createdAt"}}`; `path_required` and `unsupported_path_syntax` to 400, `path_not_found` to 404, `path_unreadable` and `outside_opening_policy` to 403, and `path_not_directory` to 422, each with only `{"error":{"category":"...","field":"path"}}`. Map unexpected service failures to 500 with only `{"error":{"category":"project_registration_failed"}}` and a safe structured event/category. Never log a body, submitted/configured path, raw error, stack, SQL, or sentinel.

### Acceptance Criteria

- AC-1 and AC-7: Every exact request calls merged BL-006 once; canonical equivalents retain BL-006 stable identity and non-mutation.
- AC-2: Every success and typed failure has the exact planned status and safe shape.
- AC-3: The 4,096-byte and request-shape boundary rejects before delegation and preserves rows.
- AC-20: Observable errors and logs contain no unsafe path or internal detail.
- AC-22 and AC-23: Finite isolated sequential and exactly-eight-way API matrices prove the complete contract and one durable winner.

### Test Coverage

- Add Fastify inject table tests for created, existing, all six BL-006 failures, invalid request classes, exactly 4,096 bytes, exactly 4,097 bytes, and unexpected failure.
- Spy on `register` to prove exactly one call for every contract-valid request and zero calls for transport-invalid requests.
- Use isolated real SQLite and disposable BL-006 fixtures for sequential equivalent paths and exactly eight concurrent POSTs; reopen and list to prove one complete durable record.
- Snapshot database rows before and after rejection and project fixture manifests before and after accepted/rejected calls.
- Matrix secret, path, SQL, stack, platform, and internal sentinels across body, headers, logs, and process-facing startup outcomes.
- Verify repeated application shutdown closes registration, listing, database, and telemetry ownership without residue.

### Expected Evidence

- Focused API reports with exact statuses, keys, byte counts, and delegation call counts.
- Eight bounded responses with one stable four-field project and one reopened row.
- Byte-identical rejected-case rows, unchanged fixture manifests, redaction matrix, and absent isolated database sidecars.

## Task T-2: Add Strict Web Codecs and Typed Finite Transports

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-12, AC-17, AC-18, AC-24
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-structured-runtime-logging

### Description

Keep the client small and explicit. Reuse one exported four-field project validator and `createdAt ASC, id ASC` comparator for list parsing, registration parsing, upsert, and authoritative refresh. Validate exact top-level and nested keys, unique IDs, documented statuses, and safe values; never accept a success-shaped fallback or partial record.

Serialize each ordinary submission exactly once as `JSON.stringify({ path: exactInput })`, retain that string as the locked payload, and send it unchanged as UTF-8 JSON for every retry. Add a narrow injectable transport outcome that can report `not_transmitted` only before fetch invocation or from a controlled pre-send network-unavailable check. Once fetch is invoked, timeout, rejection/reset, truncated or unreadable body, non-JSON, undocumented status, and invalid documented shape are `unknown`; do not infer non-transmission from a generic fetch error. Documented typed HTTP failures remain known validation outcomes.

Own a 10,000 ms abort timer for ordinary and retry registration requests and preserve the existing 5,000 ms list bound for mount and recovery refresh. Expose abort signals and body bytes to controller tests. Transport code classifies outcomes only; it does not mutate cards, focus, form state, or announcements.

### Acceptance Criteria

- AC-8: Every registration transport is bounded at 10 seconds and abortable.
- AC-9: Only positive pre-send evidence yields the definite not-transmitted outcome.
- AC-10: Every post-invocation unreadable or undocumented outcome is typed unknown.
- AC-12: Retry sends byte-equivalent locked JSON.
- AC-17 and AC-18: Refresh uses the existing finite list contract and permits one active owner.
- AC-24: Finite codec/transport tests cover every requested outcome class.

### Test Coverage

- Table-test valid and malformed registration envelopes/statuses plus current list envelope defects and duplicate IDs.
- Capture exact request-body strings across initial and repeated retry calls.
- Use fake timers and deferred fetches for 10,000 ms registration and 5,000 ms refresh aborts.
- Cover pre-invocation serialization/controlled-offline non-transmission separately from reset, truncated body, unreadable body, non-JSON, undocumented status, and contract-invalid JSON after invocation.
- Prove submitted path and server text never enter client-generated unsafe error detail.

### Expected Evidence

- Web Vitest report with exact body-byte equality, timeout values, AbortSignal state, and complete classification table.
- Contract validation matrix showing no malformed response yields a project or partial list.

## Task T-3: Implement One Monotonic Project Home Request and Reconciliation Controller

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-24
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Replace the privately owned list-only state with one `useProjectHome` reducer/controller rather than layering independent hooks. Keep explicit states for initial list loading/failure/success, normal editing, ordinary pending, unknown recovery idle/pending, and ambiguous refresh awaiting reset. Store current ordered cards, exact input, locked serialized payload, stable-ID pre-submit snapshot, validation/announcement outcome, focus target ID, and one request owner.

Increment one monotonic generation before every ordinary submission, retry, refresh, cancellation, timeout, explicit reset, new initial/list retry, and accepted newer authoritative list. Mark the old owner inactive and abort it. Every completion shall check mounted state, active owner, request kind, and generation before any reducer action. One owner covers registration and list recovery so Retry/Refresh repetitions cannot overlap.

For normal created/existing and successful retry, upsert only by project ID, replace an existing matching ID or insert once, sort by the shared comparator, exit recovery, and publish that ID as the only focus/scroll target. For refresh, replace all cards and compare only returned IDs to the immutable pre-submit ID set: one addition activates that ID and exits; zero additions unlocks the preserved input and returns to normal; multiple additions retains the authoritative list, selects none, remains locked, and allows explicit reset. Failed/invalid refresh returns to idle unknown recovery without changing cards or payload. Ordinary cancel returns to editing; retry cancel returns to the same unknown recovery.

### Acceptance Criteria

- AC-6 and AC-7: Stable-ID upsert and sorting never duplicate an ID or use display text as identity.
- AC-8 and AC-9: Ordinary pending/cancel/unmount ownership is finite and preserves input/cards.
- AC-10 through AC-13: Unknown payload locking and retry/cancel transitions are exact.
- AC-14 through AC-17: One/zero/multiple/failed refresh branches use snapshot IDs and authoritative cards exactly.
- AC-18 and AC-19: One owner and monotonic invalidation suppress every stale side effect.
- AC-24: The complete finite state-transition matrix is component-testable.

### Test Coverage

- Use reducer transition tests plus a mounted hook harness with deferred registration/list promises and fake timers.
- Prove stable-ID replace/insert, duplicate prevention, total sorting, and immutable pre-submit snapshots.
- Cover ordinary cancel, retry cancel, unmount, both timeout families, repeated submit/retry/refresh activation, and cross-kind supersession.
- Cover created/existing retry and zero, one, multiple, failed, timed-out, and invalid refresh results.
- Resolve every invalidated request later with success and failure and assert no changes to cards, input, focus target, announcement, validation, or recovery state.

### Expected Evidence

- Exhaustive transition table and request call-count/abort traces.
- Final-state snapshots for every recovery branch and stale-generation permutation.

## Task T-4: Render the Accessible Form, Recovery States, Stable-ID Focus, and Deferred Cards

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-24
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description

Add a semantic `Open Project` form with a persistent `Host path` label and associated guidance naming absolute, `~`, and `~/...` notation. Keep the controlled input byte-for-byte unchanged. Client-side blank/whitespace validation shall avoid a request, preserve the value, set `aria-invalid`, associate the specific message through `aria-describedby`, expose it through alert/live semantics, and focus the input. Apply the same focus and association behavior to all six documented backend path failures.

Disable repeat submission while pending and show a real keyboard-operable Cancel button. In unknown recovery, render the exact locked `{path}` JSON string as inert visible text, make the input read-only/disabled from edits, and expose only `Retry same submission` and `Refresh projects` as recovery actions until pending. Recovery pending shows inspectable busy state and active Cancel. Multi-ID ambiguity adds only the explicit reset needed to unlock; zero-ID refresh returns the form to editing.

Keep refs keyed by stable project ID to card Open buttons. After the committed state renders, call `scrollIntoView({ block: "nearest" })` and focus only the returned/reconciled ID action, then announce created, already registered, reconciled, no-new-project, or ambiguous outcomes through inspectable live semantics. Continue rendering names, paths, and payload as React text with whitespace preservation and safe wrapping.

Retain each existing card Open button with stable `data-project-id`, keyboard behavior, no navigation/request/workbench effect, and updated issue-neutral deferral copy rather than stale BL-007 wording. Do not add picker, scan, clone/import, close, search, sorting controls, tags, mutation, BL-010, or BL-012 behavior.

### Acceptance Criteria

- AC-4 and AC-5: Form semantics, exact value, associated errors, focus, and correction behavior are complete.
- AC-6 and AC-7: Returned ID card is ordered, scrolled, focused, announced, and unique.
- AC-8 through AC-18: Pending, Cancel, locked unknown, retry, refresh, reset, and busy controls match controller ownership.
- AC-19: Stale completions cannot trigger any DOM, focus, or announcement effect.
- AC-20: All user/server values remain complete inert text.
- AC-21: Existing stable-ID Open remains keyboard-operable and deferred with all later scope excluded.
- AC-24: Testing Library covers the complete accessibility and recovery interaction matrix.

### Test Coverage

- Use Testing Library user-event for labels, guidance, Tab order, Enter/Space submission and cancellation, disabled/read-only/busy state, and error association.
- Mock `scrollIntoView`, inspect `document.activeElement`, and compare the focused button stable ID after created, existing, retry, and one-ID refresh outcomes.
- Assert exact cards and ordering for same-looking names/paths with distinct IDs and equivalent-path same-ID responses.
- Assert live messages and available controls for normal, definite, unknown, zero, one, multiple, failed, timed-out, invalid, cancelled, and reset outcomes.
- Render long whitespace and script/metacharacter sentinels in input, locked payload, names, and paths; compare text exactly and assert no interpreted markup.
- Inventory controls, network calls, and URL before/after deferred Open.

### Expected Evidence

- Component role/name/description/focus/scroll assertions and finite branch report above coverage thresholds.
- Exact stable-ID, ordering, input, payload, and inert-text DOM comparisons.

## Task T-5: Extend the Owned Keyboard-Only Chromium Episode and Cleanup Harness

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-25, AC-26
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-development-standards

### Description

Extend the existing owned Project Home launcher rather than adding a second server framework. Allocate a unique database below `test-results/bl-008/open-project/databases`, unique disposable host fixture root below the corresponding fixture directory, two content-bearing valid directories, an equivalent symlink expression, and one invalid expression. Snapshot recursive fixture membership, types, bytes, link targets, modes, and nanosecond mtimes before interaction. Pass the fixture root through the test-only application construction/configuration seam without a product fault route.

Run one bounded desktop Chromium episode with no Playwright `webServer` reuse and no pointer interaction. Use Tab, Shift+Tab, keyboard text insertion, Enter, and Space to register a new path, submit an equivalent expression and prove the same stable card/record, submit an invalid path and inspect error association/focus, correct it and register the second fixture, and activate deferred card Open. Count document navigations and POST/GET requests to prove no page reload and exact stable identities.

Factor allocation/cleanup into an owned episode resource boundary. A `finally` block shall gracefully stop every exact process group, escalate only its recorded groups when bounded cleanup requires it, prove listeners absent, close and remove only the selected database and SQLite sidecars, restore any modes, remove only allocated fixtures, and compare pre/post project-content manifests before removal. Add focused failure-path validation for startup failure, injected assertion failure, episode timeout, and interrupted graceful shutdown, including surviving descendants; all paths must finish with zero owned residuals even when the scenario result fails. Retain sanitized `episode.json` and `cleanup-matrix.json` without paths or content.

### Acceptance Criteria

- AC-25: One keyboard-only real-app episode proves new, equivalent, invalid/corrected, no-reload, stable identity, focus semantics, and deferred Open.
- AC-26: Isolated database/fixtures remain unchanged and all success/failure cleanup paths remove only owned resources.

### Test Coverage

- Playwright assertions cover request counts, navigation count, exact card IDs, error `aria-describedby`, focused correction input, focused card action, and unchanged URL on Open.
- Compare recursive fixture manifests before and after all registration phases.
- Reuse process-group survivor checks and listener probes for API and Vite.
- Unit/integration test the episode resource owner under startup, assertion, timeout, interrupted shutdown, and descendant-survivor failures.
- Refuse the developer database and any cleanup target escaping BL-008 roots.

### Expected Evidence

- Passing desktop Chromium report and sanitized all-true `test-results/bl-008/open-project/episode.json`.
- Complete cleanup matrix, equal fixture manifests, one durable row per stable ID, absent process groups/listeners/database sidecars/allocated fixtures.

## Task T-6: Synchronize API, Web, Application, Harness, and Command Documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-27
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Update root, application, API, and web READMEs plus `.harness/engineering-harness.md`. Record exact endpoint/body/content-type, 4,096-byte bound, all statuses/envelopes/categories, opening-policy configuration, form label/guidance/error semantics, stable-ID ordering/focus/scroll/announcements, 10-second registration and 5-second list bounds, ordinary versus retry Cancel, definite versus unknown outcomes, locked byte-equivalent payload, retry/refresh/reset and zero/one/multiple reconciliation, one-owner generation rules, inert rendering, and retained deferred Open/later-scope exclusions.

Add a root `verify-open-project` recipe that runs the finite API, component, documentation, browser-helper, and Chromium matrices without duplicating command bodies outside the justfile. Keep `just verify` authoritative and harness boot non-persistent. Replace stale statements that browser registration is deferred, but do not claim workbench launch or later library controls. Document isolated roots, integrity manifests, all cleanup paths, evidence files, and the observed bounded result.

### Acceptance Criteria

- AC-27: Every required contract, interaction, recovery, ownership, accessibility, scope, validation, isolation, integrity, cleanup, and observed-result statement is current and executable.

### Test Coverage

- Add a BL-008 documentation contract test that imports endpoint, byte, timeout, status/category, evidence-root, and cleanup constants and checks all affected docs and justfile.
- Run existing BL-005 through BL-007 documentation tests and reject stale BL-008 deferral text.
- Assert harness inventory names the signal/evidence while preserving `harness checks` delegation and non-persistent boot.

### Expected Evidence

- Passing documentation regression report and synchronized README/harness diff.
- Root recipe discovery output and exact links to retained BL-008 evidence.

## Task T-7: Run Focused and Full Validation and Record the AC-Indexed Handoff

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6
- **Acceptance Criteria:** AC-22, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description

Run the dependency-focused API, web codec/controller/component, documentation, episode-helper, and keyboard Chromium checks through root just recipes. Then run `just verify` without excluding formatting, lint, strict type checks, configured package coverage, builds, Playwright files, BL-006 registration, or retained capacity audit. Inspect evidence files and independently audit all recorded process groups, listeners, database/sidecars, and fixture roots. Record task results, documentation impact, command exits, and AC-1 through AC-28 evidence in `implementation/00-implementation.md` before the Implement handoff.

### Acceptance Criteria

- AC-22 and AC-23: Isolated API sequential and concurrent matrices pass.
- AC-24: The complete finite component matrix passes configured coverage.
- AC-25 and AC-26: Real Chromium and all-path cleanup/integrity validation pass.
- AC-27: Documentation contracts pass with no stale claims.
- AC-28: Every focused gate and full root gate exits zero with no BL-008 residual.

### Test Coverage

- Run `just verify-open-project`, relevant `just verify-focused` paths during correction, `just test-e2e`, and final `just verify`.
- Inspect ignored generated JSON for all required booleans and compare residual resources independently.
- Verify no acceptance criterion lacks implementation, validation, and evidence in the handoff.

### Expected Evidence

- Focused and full command summaries with exit code zero and configured coverage above thresholds.
- Final all-true episode/cleanup artifacts, empty residual-resource audit, and complete AC-indexed implementation handoff.
