# Test Plan: Add the Open Project Interaction

## Test V-1: Registration POST Contract, Byte Bound, Mapping, and Redaction

- **Type:** Fastify route and application lifecycle integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-20, AC-22
- **Priority:** Critical

### Setup

Build Fastify through the real application plugin with injected registration and project-library factories, captured structured logs, and an isolated disposable database. Define the 4,096-byte request constant, exact success/failure fixtures, and secret, submitted/configured path, SQL, stack, raw-platform, and internal-detail sentinels. Spy on every registration call and close operation.

### Steps

1. Send exact `{path}` JSON for created, existing, and each of the six BL-006 typed failures; compare status, exact top-level/nested keys, four project fields, and delegation count.
2. Send blank and whitespace string paths and prove each delegates once to BL-006 and maps `path_required` safely.
3. Send empty body, malformed JSON, scalar, array, missing path, wrong field type, and extra-key objects; assert HTTP 400 exact invalid-request envelope, zero delegation, and unchanged rows.
4. Send an encoded valid-shaped body at exactly 4,096 bytes and one at exactly 4,097 bytes; prove the boundary behavior and zero delegation for the oversized case.
5. Inject unexpected registration and initialization failures and inspect response, headers, logs, listener state, and startup result.
6. Search every observable surface for every sentinel and prove repeated shutdown closes all application resources once.

### Expected Result

Every contract-valid request delegates exactly once. Created is 201, existing is 200, typed failures use their documented 400/403/404/422 maps, request defects are safe 400, oversize is safe 413, unexpected failure is safe 500, and no rejected request changes persistence or leaks detail.

### Expected Evidence

Focused API Vitest output with exact key/status/body-byte assertions, delegation and close counts, byte-identical rows, listener absence, redaction matrix, and removable isolated database/sidecars.

## Test V-2: Isolated Sequential and Eight-Way Equivalent Registration

- **Type:** Real filesystem, SQLite, and HTTP integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-3, AC-7, AC-22, AC-23
- **Priority:** Critical

### Setup

Allocate one refused-default SQLite path and one BL-008-owned host fixture tree containing a content-bearing project, home-relative expression, normalized expression, and symlink expression for the same canonical directory. Snapshot the complete project manifest. Start the real BL-006 service through Fastify and record every accepted route delegation.

### Steps

1. POST the equivalent expressions sequentially and assert one created then existing outcomes carrying one identical complete stable project.
2. Issue exactly eight concurrent equivalent valid POST requests with finite client bounds.
3. Assert all eight fulfill with documented complete responses, every request delegated once, and all returned records have the same ID and four-field values.
4. List through GET, close every API/database resource, reopen against the same path, and list again.
5. Assert exactly one durable record remains and no partial response or duplicate ID occurred.
6. Compare the before/after host fixture manifests; exercise an invalid transport request and prove persisted rows remain unchanged.
7. Close and remove only the allocated database, sidecars, and fixture root, then prove absence.

### Expected Result

Canonical equivalents preserve one stable project through sequential, concurrent, and restart cases. Exactly eight requests yield eight complete bounded responses and eight delegations but one durable row; project content is unchanged.

### Expected Evidence

Focused integration report, stable-ID arrays, exact one-row reopen result, equal manifests, unchanged rejection rows, and zero disposable residuals.

## Test V-3: Web Contract Codecs, Exact Retry Bytes, and Transport Classification

- **Type:** Web client unit and transport integration
- **Task:** T-2
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-12, AC-17, AC-18, AC-24
- **Priority:** Critical

### Setup

Use mocked fetch, deferred response bodies, fake timers, inspectable AbortSignals, and a narrow injectable pre-send transport. Prepare all documented success/failure envelopes plus malformed, truncated, unreadable, non-JSON, undocumented-status, extra-field, unsafe-project, and duplicate-ID cases. Include long whitespace and metacharacter paths.

### Steps

1. Validate every documented registration and list response and reject every malformed or extra-key variant without partial data.
2. Serialize an exact path, capture the initial request bytes, perform repeated same-submission retries, and compare bytes exactly.
3. Advance 10,000 ms for ordinary and retry requests and 5,000 ms for project-list refresh; assert abort and typed timeout ownership.
4. Produce controlled pre-invocation serialization/network-unavailable evidence and assert `not_transmitted`.
5. After fetch invocation, trigger connection reset, generic rejection, truncated body, unreadable body, non-JSON, undocumented status, and invalid contract; assert every case is `unknown`.
6. Return documented typed failures and assert they remain known validation results.
7. Repeatedly invoke retry/refresh transport controls while pending and inspect call counts and AbortSignals.

### Expected Result

Codecs accept only exact documented data. Retried JSON bytes are identical. Registration/list timers are finite. Only positive pre-send evidence is definite; every ambiguous post-invocation outcome is unknown; no malformed result creates a project or partial list.

### Expected Evidence

Web Vitest classification table, body-byte equality, timeout/abort traces, request call counts, and codec branch coverage.

## Test V-4: Accessible Form, Validation, Stable-ID Upsert, Focus, and Deferred Open

- **Type:** React component and accessibility interaction
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-12, AC-20, AC-21, AC-24
- **Priority:** Critical

### Setup

Render Project Home with controlled list and registration transports, Testing Library user-event, mocked `scrollIntoView`, and stable projects arranged out of order with same-looking names/paths, long values, whitespace, and HTML/script metacharacters. Capture the initial URL and network call counts.

### Steps

1. Inspect the semantic form, persistent Host path label, supported-notation guidance, and exact controlled value.
2. Submit blank and whitespace values by keyboard; assert no request, specific associated alert/live message, `aria-invalid`, input focus, exact retained value, and unchanged cards.
3. Return every typed backend path failure and repeat the association, focus, value, announcement, and no-card assertions.
4. Resolve created and existing results; compare stable-ID replacement/insertion, duplicate count, `createdAt ASC, id ASC` order, scroll target, focused Open action, and exact announcement.
5. Submit equivalent expressions returning one ID and prove names/paths are never queried as identity.
6. While ordinary submission is pending, assert one active Cancel and blocked repeat submission; cancel by keyboard and prove normal editing with unchanged input/cards and inert late completion.
7. Unmount with a request pending and prove abort plus no late DOM update.
8. Render every text sentinel in input, project name/path, and status; compare complete text and assert no interpreted markup.
9. Tab to deferred Open, activate with Enter and Space, and prove stable project ID, no workbench request, no navigation, and one deferred announcement.

### Expected Result

The form and validation are fully associated and keyboard usable. Normal success upserts and activates only the returned stable ID without reload. Ordinary cancellation and unmount suppress late work. Text stays inert and existing Open stays deferred.

### Expected Evidence

Component role/name/description, focus, scroll, identity, order, call-count, exact-text, URL, and no-markup assertions with configured coverage passing.

## Test V-5: Unknown-Outcome Recovery, Refresh Cardinality, Cancel, and Stale Generations

- **Type:** React reducer, hook, and component state-machine integration
- **Task:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-24
- **Priority:** Critical

### Setup

Use a mounted controller/component harness with deferred ordinary, retry, and list requests; fake timers; inspectable request generations and AbortSignals; an initial ordered card set with a stable-ID snapshot; and mocked focus/scroll. Capture cards, exact input/locked payload, available controls, live text, validation, and active element after every transition.

### Steps

1. For timeout, reset, truncated/unreadable/non-JSON body, undocumented status, and invalid response contract, assert announced `submission outcome unknown`, unchanged cards, visible locked exact payload, no editable different submission, and exactly Retry same submission plus Refresh projects recovery actions.
2. Resolve Retry as created and existing; assert exact same body bytes, recovery exit, stable-ID-only upsert/order, focus/scroll, and announcement.
3. Cancel a pending Retry and assert the same locked unknown state and two actions; later resolve it and prove no effect.
4. Refresh with exactly one ID added to the pre-submit snapshot; assert authoritative replacement, sole-new-ID activation, and recovery exit.
5. Refresh with zero IDs added; assert authoritative cards, no-new-project announcement, exact input unlock, and normal editing.
6. Refresh with multiple IDs added; assert complete authoritative cards, no selected identity, locked payload, actionable ambiguity, and explicit reset. Activate reset and prove a different submission is then allowed.
7. Fail, time out, and return invalid list data from refresh; assert unchanged current cards/payload and restored two recovery actions with no registration request.
8. Repeatedly activate Retry/Refresh while each is pending and prove at most one recovery call/owner and inspectable busy/Cancel state.
9. For ordinary, retry, and refresh owners, invalidate through cancel, timeout, newer cross-kind action, reset, authoritative list, and unmount; resolve every old promise later with success and failure.
10. Compare cards, input, focus, scroll, announcements, validation, recovery state, and call counts before and after every stale completion.

### Expected Result

Every unknown trigger locks the original payload with no optimistic change. Retry and zero/one/multiple/failed refresh branches follow the exact contract. One active owner and monotonic generations make every invalidated completion inert across all visible side effects.

### Expected Evidence

Finite transition matrix, generation and abort traces, exact payload/control snapshots, cardinality results, focus/scroll assertions, stale no-diff snapshots, and passing branch coverage.

## Test V-6: Keyboard-Only Owned Real Chromium Episode, Integrity, and All-Path Cleanup

- **Type:** Playwright end-to-end and lifecycle failure-path integration
- **Task:** T-5
- **Acceptance Criteria:** AC-4, AC-5, AC-7, AC-20, AC-21, AC-25, AC-26
- **Priority:** Critical

### Setup

Allocate disposable loopback API/web ports, one refused-default database, and unique BL-008 fixture roots with two content-bearing valid directories, equivalent notation/symlink, and one invalid path. Snapshot recursive manifests. Start the real API and Vite in recorded detached process groups with the API opening policy pointed only at the fixture root. Disable Playwright retries for the serial 90-second-bounded desktop Chromium episode and do not configure `webServer` reuse.

### Steps

1. Navigate to the owned web listener, then use only Tab, Shift+Tab, keyboard text insertion, Enter, and Space for all product interaction.
2. Register the first valid path and assert one stable card, focus on its exact project action, one POST, no document reload, and created announcement.
3. Submit an equivalent expression and assert existing announcement, the same focused stable-ID card, one card, and one durable record.
4. Submit the invalid path and inspect associated announced error, retained text, focused input, and no card change; correct the text and register the second valid fixture.
5. Activate an existing card Open by keyboard and prove identity, unchanged URL, no workbench call, and deferred status.
6. Compare project fixture manifests after all operations and inspect exact durable rows.
7. In `finally`, gracefully stop exact process groups within the bound, inspect group members and listeners, close/remove only the database and four sidecar allowlist, restore modes, remove only allocated fixture roots, and prove all absence.
8. Run focused resource-owner scenarios that fail during startup, an injected assertion, episode timeout, and interrupted graceful shutdown, including a surviving descendant. Require cleanup even when the scenario verdict fails and prove no broad process or filesystem deletion.
9. Write sanitized episode and cleanup-matrix JSON with booleans/counts only.

### Expected Result

One real keyboard-only episode proves new, equivalent, invalid/corrected, stable identity, no reload, inert text, and deferred Open behavior. Project content is byte/metadata unchanged. Success and every modeled failure path leave no owned process, listener, database, sidecar, or fixture.

### Expected Evidence

Playwright pass, all-true `test-results/bl-008/open-project/episode.json`, complete cleanup matrix, equal manifests, exact stable IDs/rows, and independent zero-residual probes.

## Test V-7: Documentation, Harness, Command, and Scope Contract

- **Type:** Executable documentation regression
- **Task:** T-6
- **Acceptance Criteria:** AC-21, AC-27
- **Priority:** High

### Setup

Load root, application, API, web, harness, justfile, endpoint/client constants, status/category maps, timeout/body limits, evidence paths, and cleanup constants. Include existing BL-005, BL-006, and BL-007 documentation suites.

### Steps

1. Require the exact POST request, content type, 4,096-byte limit, statuses, success/failure shapes, safe errors, and opening-policy configuration.
2. Require form labeling/guidance, all validation outcomes, stable-ID upsert/order/focus/scroll/announcements, 10-second bound, both Cancel outcomes, definite/unknown classification, payload locking, byte-equivalent retry, refresh zero/one/multiple/failure, reset, and monotonic stale ownership.
3. Require inert text, deferred Open, and every later-scope exclusion without stale browser-registration deferral.
4. Require root focused/full commands, isolated database/fixture roots, integrity manifests, all-path process/listener/database/sidecar/fixture cleanup, retained evidence, and observed bounded result.
5. Cross-check the named BL-008 just recipe and harness signal/evidence while proving harness boot remains non-persistent and checks still delegate to `just verify`.
6. Run prior documentation suites to prevent BL-005 through BL-007 regressions.

### Expected Result

All affected documentation agrees with executable constants and delivered behavior, contains no stale BL-008 deferral or later-workbench claim, and preserves root command/harness ownership.

### Expected Evidence

Passing documentation Vitest report, synchronized README/harness diff, root recipe inventory, and valid retained-evidence links.

## Test V-8: Complete Repository Validation and Residual-Resource Audit

- **Type:** Full regression and acceptance validation
- **Task:** T-7
- **Acceptance Criteria:** AC-22, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28
- **Priority:** Critical

### Setup

Complete V-1 through V-7, begin with no BL-008 resource, and use only root justfile recipes. Preserve generated evidence only under documented ignored `test-results/bl-008` paths. Prepare an AC-1 through AC-28 evidence checklist for the implementation handoff.

### Steps

1. Run the named API, codec/controller/component, documentation, browser-helper, and Chromium focused matrices through `just verify-open-project` and targeted `just verify-focused` recipes.
2. Run `just verify` without omitting format, lint, strict typecheck, all package tests and coverage, BL-006 gate, builds, all Playwright scenarios, or retained capacity audit.
3. Capture every exit code and concise stage/test/coverage count.
4. Inspect episode and cleanup JSON, independently rescan recorded process groups and listeners, and verify database/sidecar/fixture roots are absent.
5. Confirm fixture integrity comparisons passed and no default/developer database was touched.
6. Map each AC ID to the final implementation result, validation, evidence, and documentation impact in `implementation/00-implementation.md`.

### Expected Result

Every focused gate and the full repository gate exits zero. Coverage thresholds remain configured. No BL-008-owned resource remains, and the handoff provides complete evidence for every stable acceptance criterion.

### Expected Evidence

Focused command reports, final `just verify` exit code zero, coverage/build/Playwright summaries, all-true retained cleanup evidence, empty independent residual audit, and AC-indexed implementation handoff.
