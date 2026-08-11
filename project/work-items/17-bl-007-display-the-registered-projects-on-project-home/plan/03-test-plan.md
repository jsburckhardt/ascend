# Test Plan: Display the Registered Projects on Project Home

## Test V-1: API Startup, Migration, Shutdown, and Safe Initialization Failure

- **Type:** API lifecycle integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-18
- **Priority:** Critical

### Setup

Allocate unique databases inside the repository disposable database root and refuse the documented developer default. Build fresh Fastify instances with injectable project-library factories, telemetry stop spies, captured structured logging, and disposable loopback listeners. Define distinct secret, SQL, stack, and database-path sentinel values.

### Steps

1. Start a fresh instance against a missing isolated database and verify all committed migrations complete before its listener accepts a request.
2. Persist records, request shutdown, close all first-generation resources, start a new instance at the same database, and verify the records remain available.
3. Deliver repeated direct stop, SIGINT, and SIGTERM requests and inspect the single joined shutdown trace.
4. Verify the real database and every sidecar can be removed after close.
5. For each initialization sentinel class, reject the injected factory, assert the startup runner returns a nonzero process exit outcome, assert no listener opened, and inspect the typed failure and structured log fields.
6. Search every captured event and process-facing failure value for all supplied sentinels.

### Expected Result

Migrations finish before serving; restart preserves data; library, Fastify, and telemetry resources close once; repeated shutdown is safe; initialization failure is project_library_initialization_failed with a nonzero process exit outcome; no listener opens and no supplied detail leaks.

### Expected Evidence

Focused API Vitest output, close-count trace, listener-absence assertion, redaction matrix, and absent isolated database and sidecars.

## Test V-2: Project-List HTTP Success, Ordering, Validation, and Safe Failure

- **Type:** Fastify route integration
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-6, AC-7, AC-14, AC-18
- **Priority:** Critical

### Setup

Use Fastify inject with the application plugin and real unique SQLite databases for success cases. Seed projects with out-of-order createdAt values and equal-createdAt ID ties. Use injected ProjectLibrary doubles for malformed rows and failures containing the complete secret, SQL, stack, database-path, and internal-error sentinel matrix.

### Steps

1. Request GET /api/projects from an empty current database.
2. Seed all four-field records, issue repeated requests, and compare status, exact object keys, exact record keys, record count, IDs, and byte-stable ordering.
3. Stop and reconstruct the API at the same database and repeat the list request.
4. Assert ordering is createdAt ascending and ID ascending for ties.
5. Inject missing, blank, wrong-type, extra-field, invalid-createdAt, and duplicate-ID results.
6. Inject each list failure sentinel case and inspect response body, headers, and captured safe log fields.

### Expected Result

Empty and populated success use exactly the projects array envelope and four record fields; records appear once in createdAt ASC then id ASC order; malformed data and list failures return one non-2xx project_list_failed envelope without projects, partial rows, or sentinels.

### Expected Evidence

Focused Fastify Vitest report, repeated ordered ID arrays, exact key assertions, restart response, malformed matrix, and redaction matrix.

## Test V-3: Browser Client Validation, Timeout, Retry, and Newest-Request Ownership

- **Type:** React client unit and component integration
- **Task:** T-3
- **Acceptance Criteria:** AC-8, AC-10, AC-14, AC-15, AC-17
- **Priority:** Critical

### Setup

Render Project Home with a spied fetch implementation, controllable deferred responses, fake timers, and inspectable AbortSignals. Prepare valid responses plus a finite table of top-level, field-type, blank-value, timestamp, extra-field, and duplicate-ID defects.

### Steps

1. Mount and assert exactly one immediate request with the documented 5,000 ms bound.
2. Advance the timeout and verify abort plus the safe failure state.
3. Activate Retry once and then rapidly; verify one request per activation and each newer owner aborts or supersedes the previous owner.
4. Resolve newer success before older success and failure in both orders; assert stale outcomes cannot replace the newest state.
5. Unmount with a request pending, resolve it, and verify abort and no late update.
6. Feed every malformed or duplicate response and assert deterministic failure with zero cards.
7. Exercise non-2xx, network, parse, and validation failures and verify one safe UI outcome.

### Expected Result

One request starts per mount and retry; every request is bounded; newest-request-wins is deterministic; unmount prevents updates; all malformed responses fail closed with no partial cards.

### Expected Evidence

Web Vitest output with request counts, timer and AbortSignal traces, stale-response assertions, malformed matrix, and branch coverage above repository thresholds.

## Test V-4: Accessible Project Home States, Safe Paths, and Deferred Open

- **Type:** React component and accessibility interaction
- **Task:** T-4
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17
- **Priority:** Critical

### Setup

Use Testing Library with keyboard interaction. Prepare empty, failure, and populated responses containing several projects, equal-looking names with distinct IDs, a very long canonical path, leading/internal/trailing whitespace, and HTML/script metacharacters. Spy on fetch and capture the initial browser URL.

### Steps

1. Assert the loading live region and announcement, then independently resolve empty, populated, and failure outcomes.
2. Verify empty copy states that registered projects appear here and that no registration control is present.
3. Verify failure exposes one actionable accessible message and one Retry button.
4. Compare semantic card count, exact names, complete path text and title, Open accessible names, and data-project-id values with the response.
5. Tab to Open and activate by keyboard; rapidly reactivate and assert one identical project-associated BL-007 deferred status.
6. Assert Open causes no additional request, process operation, or URL change.
7. Inspect path textContent and title exactly, and assert metacharacters create no interpreted element or script.
8. Inventory controls and links and assert no BL-008+ registration, close, runtime, status, search, sort, tags, path mutation, navigation, or fake workbench destination.

### Expected Result

All four states are distinct and accessible; cards and identities match exactly; paths are unchanged text; Open is keyboard usable but idempotently deferred; no excluded behavior exists.

### Expected Evidence

Web Vitest role, name, focus, identity, path, status, request-count, and URL assertions plus passing coverage.

## Test V-5: Owned Real-Web and Real-API Desktop Chromium Episode

- **Type:** Playwright end-to-end lifecycle
- **Task:** T-5
- **Acceptance Criteria:** AC-6, AC-8, AC-10, AC-11, AC-12, AC-19, AC-20
- **Priority:** Critical

### Setup

Allocate one refused-default unique database below test-results/bl-007/project-home/databases and disposable loopback ports. Start the real API application and Vite as direct owned child processes without Playwright reusing an existing web server. Configure Vite to proxy same-origin /api requests to the owned API. The E2E launcher may inject exactly one list failure through the library factory seam; it must not expose a product fault endpoint or control. Bound graceful process exit to 10,000 ms.

### Steps

1. Assert no unrelated reusable web server is configured, then navigate desktop Chromium to the owned web listener and prove loading resolves to the empty state.
2. Gracefully stop the API, seed the isolated database with known records, restart the real API, and prove Project Home renders every card and matching data-project-id.
3. Use Tab and Enter on a seeded Open button and assert project-specific deferred status and unchanged URL.
4. Restart the API with the E2E-only once-failure library wrapper, reload, and assert the accessible failure and Retry control.
5. Activate Retry once and assert the seeded populated state returns.
6. In a finally block, SIGTERM all owned servers, await each exit within 10,000 ms, probe both ports for absence, remove only the database and SQLite sidecar allowlist, and prove all selected paths absent.
7. Write a sanitized test-results/bl-007/project-home/episode.json with state, identity, fault, retry, graceful-exit, listener, and file-cleanup booleans.

### Expected Result

One bounded desktop Chromium scenario proves empty, populated restart visibility, keyboard deferred Open with matching identity, and controlled failure followed by retry. Every owned child exits gracefully, listeners disappear, and no database artifact remains.

### Expected Evidence

Playwright pass and trace-on-first-retry artifacts, sanitized episode.json with every required boolean true, and negative process, listener, database, and sidecar checks.

## Test V-6: Documentation and Scope Contract

- **Type:** Documentation regression validation
- **Task:** T-6
- **Acceptance Criteria:** AC-1 through AC-16, AC-21
- **Priority:** High

### Setup

Load root, application, API, web, route, and harness documentation together with the endpoint, error-category, timeout, ordering, migration, and cleanup constants and the root justfile. Include the existing BL-005 and BL-006 documentation contract tests.

### Steps

1. Assert documentation includes database startup configuration, migration-before-serving, restart, repeated shutdown, endpoint envelopes and order, valid records, all UI states, accessibility, timeout, retry, stale abort, path behavior, deferred Open, and exclusions.
2. Assert it describes the isolated database, E2E-only controlled fault, graceful cleanup bound, listener and sidecar audit, generated evidence, and observed bounded result.
3. Assert exact validation guidance uses root just recipes.
4. Assert harness inventory names the BL-007 deterministic Chromium signal and episode evidence while boot remains non-persistent.
5. Reject stale statements that Fastify listing and Project Home integration remain deferred.
6. Reject claims that BL-008+ behavior is implemented.

### Expected Result

Documentation and executable constants agree, stale deferrals are removed, all required behavior and exclusions are explicit, and the observed result matches retained generated evidence.

### Expected Evidence

Passing API documentation Vitest files, synchronized documentation diff, harness inventory entry, and links to the generated episode summary.

## Test V-7: Complete Repository Validation and Residual-Resource Audit

- **Type:** Full regression and acceptance validation
- **Task:** T-7
- **Acceptance Criteria:** AC-17, AC-18, AC-19, AC-20, AC-21, AC-22
- **Priority:** Critical

### Setup

Complete V-1 through V-6, begin with no BL-007 child or listener, and use the root just command interface. Preserve generated test output only in the documented ignored test-results locations.

### Steps

1. Run the focused API, web, documentation, and project-home Chromium checks through root just recipes.
2. Run just verify without omitting format, lint, typecheck, package coverage, build, Playwright, registration, or retained-capacity audit stages.
3. Capture the command exit status and concise stage results.
4. Inspect episode.json and independently check scenario process identities, loopback ports, and database and sidecar paths.
5. Record AC-1 through AC-22 evidence and documentation impact in implementation/00-implementation.md.

### Expected Result

All focused and repository checks pass, just verify exits zero, every BL-007 cleanup assertion remains true, and the implementation handoff contains complete AC-indexed evidence.

### Expected Evidence

Focused command summaries, just verify exit code 0, final episode cleanup audit, clean residual-resource checks, and the AC-indexed implementation handoff.
