# Task Breakdown: Display the Registered Projects on Project Home

## Task T-1: Own the Project Library Through API Startup and Shutdown

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description

Refactor the Fastify entry point into testable construct, start, and memoized stop boundaries. An application plugin shall construct `ProjectLibrary` from `ASCEND_DATABASE_URL`, run the committed migrations before Fastify can listen, decorate the shared service, and close it through an idempotent on-close hook. The server shutdown coordinator shall produce the same completion for repeated SIGINT/SIGTERM delivery and stop telemetry once.

Map project-library initialization failure to the typed `project_library_initialization_failed` category. Emit a stable Fastify event with only event name and category; never pass the raw error object to the logger. The executable entry point shall finish with a nonzero exit outcome after this safe event without ever binding its listener. Provide narrow library factory and logger injection seams for finite tests without adding a product fault control.

### Acceptance Criteria

- AC-1: The library is ready and current migrations are applied before the listener opens; stop/reconstruction preserves the isolated database.
- AC-2: One shutdown promise owns library, Fastify, and telemetry cleanup, and repeated signals are safe no-ops/joins.
- AC-3: Initialization failure exits nonzero, leaves no listener, and logs/returns only the typed safe category.
- AC-18: Isolated lifecycle tests prove migration, restart, redaction, repeated shutdown, and handle closure.

### Test Coverage

- Add Vitest tests with real unique databases under the refusable disposable test root for fresh migration, close/reopen, and resource-closure proof.
- Inject a factory rejection containing distinct secret, SQL, stack, and database-path sentinels; assert the process-facing startup result is nonzero, the port never listens, and captured structured output contains only the category.
- Use a spy fake library and telemetry stop to prove exactly-once closure across repeated direct stop and mixed signals.
- Always register close callbacks with the database test context and prove the database and sidecars can be removed.

### Expected Evidence

- Focused API Vitest output for lifecycle and startup-error tests.
- Shutdown/log traces showing one close and no sentinel leakage.
- Absence of all isolated database files and sidecars after test.

## Task T-2: Expose the Safe Ordered Project-List HTTP Contract

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-6, AC-7, AC-14, AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Add `GET /api/projects` to the existing route autoload boundary. The success contract is exactly `{"projects":[{"id":"...","name":"...","canonicalPath":"...","createdAt":0}]}`. Order rows by `createdAt ASC, id ASC` so ID is the final tie-breaker. Validate every row and unique non-empty ID before sending the envelope, and map any adapter, persistence, or validation failure to a non-2xx `{"error":{"category":"project_list_failed"}}` without `projects` or partial rows.

Reuse the library injection seam for route tests. Keep the route read-only: no registration, close, runtime, sort, tag, or path-mutation operation is added.

### Acceptance Criteria

- AC-1: A fresh API generation lists pre-restart records exactly once.
- AC-4: The 200 envelope and each record contain exactly the documented fields.
- AC-5: Total ordering is deterministic across repeated requests.
- AC-6: Empty success is the same envelope with an empty array.
- AC-7: List failure is one safe stable error envelope with no partial data or sentinels.
- AC-14: Malformed or duplicate rows are refused at the HTTP boundary.
- AC-18: API validation covers empty, populated, ordering, isolated failure, restart, and cleanup.

### Test Coverage

- Use Fastify `inject` against real disposable databases for empty, populated, repeated-ordering, and close/reopen cases.
- Seed ties on `createdAt` to prove ascending ID tie-breaking and compare repeated byte-for-byte JSON.
- Inject a list rejection with the five sentinel classes and matrix all response text, headers, and captured logs for leakage.
- Inject missing/scalar/blank/non-safe-integer rows and duplicate IDs and assert no success envelope.

### Expected Evidence

- Focused route Vitest report with exact JSON and status assertions.
- Ordered ID arrays from repeated HTTP injections.
- Sentinel matrix report showing no disallowed value or partial row.

## Task T-3: Build the Bounded Project-List Client and Request Ownership

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-8, AC-10, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description

Add a small typed web client for the same-origin `/api/projects` endpoint. Configure the Vite development proxy for the documented loopback API origin, with a narrow E2E target override, so local `just run` and owned tests remain same-origin without adding Fastify CORS behavior. Keep the contract validation local and explicit instead of adding a schema framework: require the exact envelope, four exact project fields, non-empty ID, non-blank name, non-empty unchanged path, finite non-negative safe-integer timestamp, and unique IDs.

Each mount issues one request immediately. Each request owns an `AbortController`, 5,000 ms timeout, and monotonic request ID. A newer retry aborts the previous request, and only the latest ID may publish success or failure. Unmount aborts the current owner and disables late updates. Timeout, non-2xx, network, parse, validation, and non-abort errors all converge to the same safe failure state.

### Acceptance Criteria

- AC-8: Exactly one bounded request begins per mount.
- AC-10: Each retry starts one new request and all readable failures converge safely.
- AC-14: Duplicate or malformed JSON cannot produce partial valid state.
- AC-15: Newest-request-wins, abort, stale-response suppression, and unmount behavior are deterministic.
- AC-17: Component tests exercise all request ownership and validation branches.

### Test Coverage

- Use deferred promises, fake timers, and spy AbortSignals to prove initial/retry call counts, timeout, abort, newest-wins, and stale suppression.
- Unmount before resolution and assert no render or state update occurs.
- Table-test top-level envelope defects, extra /missing fields, empty/blank values, non-string scalars, invalid timestamps, and duplicate IDs.
- Assert an aborted older request never overwrites newer success or failure.

### Expected Evidence

- Web Vitest report with request counts, abort flags, and final state assertions.
- Coverage report showing all client validation and concurrency branches executed.

## Task T-4: Render Accessible Project Home States and Defer Open

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description

Replace the static scaffold with four mutually exclusive states. Use a live region for loading, an accessible empty explanation, an actionable failure region with one Retry button, and a semantic list of project cards. Remove the existing Open Project registration control because BL-008 owns that work.

Each card shows the exact name and canonical path as React text. Preserve path whitespace with CSS, break long text without mutation, and expose the full unchanged value in both text and `title`. Use a real `button` for Open with a project-specific accessible name and `data-project-id`. Activation only updates an associated `role="status"` to name the project and say opening is not available in BL-007. It must not fetch, start a workbench, or change the URL.

### Acceptance Criteria

- AC-8: Loading, empty, populated, and failure are distinct and accessible.
- AC-9: Empty copy says registered projects will appear here but offers no registration.
- AC-10: Failure has one accessible Retry control.
- AC-11: Every valid project appears once with exact name/path and an identified keyboard-focusable Open button.
- AC-12: Open is an idempotent, project-associated deferred status only.
- AC-13: Path text remains complete, unchanged, whitespace-preserved, and non-executable.
- AC-14: Malformed or duplicate data shows only the safe failure state.
- AC-16: No registration, close, runtime, search, sort, tag, mutation, or navigation control is present.
- AC-17: Component tests cover the full accessibility, path, card, and Open matrix.

### Test Coverage

- Use Testing Library with a keyboard user to tab to and activate each semantic Open button.
- Assert loading live region, empty copy, failure alert/message, Retry name, card list, Open accessible names, and project-associated status.
- Compare card counts and `data-project-id` values with the validated response; rapidly activate Open and assert identical final status.
- Render long, leading/internal/trailing-whitespace, and HTML/script sentinels; compare textContent and title exactly and assert no interpreted node.
- Assert no control or route for any BL-008+ scope and no Open activation causes a network call or URL change.

### Expected Evidence

- Web Vitest role/name/focus assertions and coverage report.
- Exact path value and project ID comparisons in test output.
- No route, workbench, or additional network effect in Open test traces.

## Task T-5: Add the Owned Real-Application Desktop Chromium Episode

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-6, AC-8, AC-10, AC-11, AC-12, AC-19, AC-20
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-development-standards

### Description

Replace the static Playwright project-home test with exactly one bounded desktop Chromium scenario that owns the real applications it uses. Remove the current dependence on a reusable unrelated Vite `webServer`; the scenario shall navigate only to the listener it started and owns. Allocate a unique database below `test-results/bl-007/project-home/databases` and refuse the developer default. Start the real API application and Vite as direct child processes on disposable loopback ports, with Vite proxying the same-origin `/api` path to the owned API.

Ideally use a single browser episode with three finite phases: empty; close, seed, and restart the API for populated restart-visibility; then restart the API with a once-only list failure injected by the E2E launcher through the product library factory seam. The fault must not add a product route, control, or environment backdoor. Prove failure then one Retry success.

In a `finally` boundary, request SIGTERM for each server, await exit within 10,000 ms, probe each port for listener absence, remove only the selected database and `-wal`, `-shm`, and `-journal` sidecars, and prove all selected paths are absent. Retain a sanitized `test-results/bl-007/project-home/episode.json` summary with state/identity/fault/cleanup booleans, but no database path, secret, or log content.

### Acceptance Criteria

- AC-6: The real empty database produces the empty Project Home state.
- AC-8: The real browser observes the bounded loading and state transitions.
- AC-10: The repository-controlled fault shows failure, and exactly one Retry request succeeds.
- AC-11: All seeded records and Open identities match in Chromium.
- AC-12: Tab/Enter activation shows the project-specific deferred status without navigation.
- AC-19: One desktop Chromium scenario proves all three phases against real apps and one isolated database.
- AC-20: Every child, listener, database, and sidecar is absent after the bounded finally block.

### Test Coverage

- Assert Playwright cannot reuse an unrelated product-web server, then assert empty heading/copy and exact seeded card count and `data-project-id` identities.
- Use keyboard Tab/Enter for Open; assert the deferred status and unchanged URL.
- Inject exactly one list failure in the E2E launcher, assert the failure message/Retry control, then assert the next request renders the seeded success.
- Await graceful exit for both children within 10,000 ms, probe ports, and assert the entire database/sidecar allowlist is absent.
- Fail the test if cleanup needs forced escalation, while still escalating in `finally` to avoid a leak.

### Expected Evidence

- Playwright desktop Chromium pass with the seeded-identity comparison.
- `test-results/bl-007/project-home/episode.json` with all bounded booleans true.
- Absent child processes, listeners, database, and sidecar files.

## Task T-6: Synchronize Application, API, Harness, and Validation Documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-1 through AC-16, AC-21
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-development-standards

### Description

Update docs/README.md, apps/api/README.md, apps/web/README.md, and the root README.md as affected. Record database configuration and before-listener migrations, the typed safe startup-failure event and nonzero exit, restart semantics, repeated shutdown, same-origin Vite proxy behavior, GET /api/projects success and error envelopes, createdAt ASC then id ASC ordering, record validity, the 5,000 ms timeout, four accessible UI states, retry and newest-wins abort behavior, unchanged path text, deferred Open, and BL-008+ exclusions.

Document only root just commands: just verify-focused with the relevant paths, just test-e2e, and just verify. Describe the isolated refused database, E2E-only fault injection seam, 10,000 ms graceful cleanup bound, listener and sidecar audit, generated episode path, and observed bounded result. Update .harness/engineering-harness.md to list the BL-007 deterministic signal and evidence while keeping harness boot non-persistent. Replace stale BL-005 and BL-006 deferral statements and update their documentation contract tests.

### Acceptance Criteria

- AC-1 through AC-16: All delivered behavior and all BL-008+ exclusions are documented without stale deferral claims.
- AC-21: Documentation contains every required operational, contract, validation, isolation, fault, cleanup, and observed-result detail.

### Test Coverage

- Update the persistence and registration documentation tests to reject stale deferral claims and require the new contracts.
- Add a BL-007 documentation test that cross-checks constants, route and error categories, ordering, timeout, root recipes, harness inventory, and evidence path.
- Prove the application docs do not promise registration, close, workbench, search, sort, tag, or path-mutation behavior.

### Expected Evidence

- Passing documentation contract tests and repository documentation diff.
- Harness inventory entry pointing to the BL-007 generated episode.
- Documented observed bounded result matching the gate output.

## Task T-7: Run Focused and Full Validation and Record the Handoff

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-6, and therefore T-1 through T-5
- **Acceptance Criteria:** AC-17, AC-18, AC-19, AC-20, AC-21, AC-22
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description

Run the focused API, web, documentation, and desktop Chromium validation through root just interfaces. Then run just verify from a clean resource state, capture its exit code, and inspect the BL-007 episode for all true cleanup flags and no leftover process, listener, database, or sidecar. Record the final commands, results, documentation evidence, and every AC-1 through AC-22 outcome in implementation/00-implementation.md.

### Acceptance Criteria

- AC-17: The component matrix passes in a bounded run.
- AC-18: The isolated API matrix passes and leaves no database artifact.
- AC-19: The single desktop Chromium episode passes all empty, populated, and fault phases.
- AC-20: All scenario-owned resources are cleaned and audited.
- AC-21: Documentation and executable contract tests agree.
- AC-22: just verify exits 0.

### Test Coverage

- Run the focused tests identified in V-1 through V-6; no failure may be dismissed as flaky.
- Run just verify without skipping format, lint, type, coverage, build, Playwright, or retained-capacity audit gates.
- After the gate, probe the BL-007 ports and check the allowlisted database and sidecar paths and scenario child identities.

### Expected Evidence

- Command log with focused passes and just verify exit code 0.
- Final test-results/bl-007/project-home/episode.json cleanup audit.
- project/work-items/17-bl-007-display-the-registered-projects-on-project-home/implementation/00-implementation.md with AC-1 through AC-22 evidence.
