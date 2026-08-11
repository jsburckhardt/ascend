# Implementation Notes: Issue 17

## Completed Tasks

- T-1: API startup owns migration-ready ProjectLibrary construction and memoized resource shutdown.
- T-2: GET /api/projects provides exact safe records in createdAt then ID order.
- T-3: The web client validates exact responses and owns 5,000 ms newest-request-wins requests.
- T-4: Project Home renders accessible loading, empty, failure, and populated states with deferred Open.
- T-5: One owned real-app Chromium episode proves empty, restart-populated, keyboard Open, fault/retry, and cleanup.
- T-6: Root, application, API, web, harness, configuration, usage, and validation documentation is synchronized.
- T-7: Focused and full root validation completed, and this AC-indexed handoff evidence was recorded.

## Acceptance Evidence

- AC-1: apps/api/src/app.ts constructs the configured library before route readiness; apps/api/test/api-lifecycle.test.ts migrates a missing isolated database, stops, reconstructs, and reads the unchanged record; the browser episode also seeds only after a complete API stop and lists after restart.
- AC-2: createApiServerController returns one memoized stop promise. Lifecycle tests compare repeated stop promise identity, prove one library close and one telemetry stop, and remove the isolated database files after closure.
- AC-3: The four-case secret, SQL, stack, and database-path initialization matrix proves startApiProcess returns 1, no listener accepts connections, and only api.start.failed plus project_library_initialization_failed is observable.
- AC-4: project-list-route.test.ts proves the exact projects envelope, exact four record keys, complete count, and one occurrence per persisted record.
- AC-5: the Drizzle adapter orders by createdAt ASC then id ASC; repeated HTTP injections are byte-identical and assert project-a, project-b, project-z ordering with an ID tie.
- AC-6: the isolated API returns projects as an empty array and the real Chromium empty phase renders No registered projects.
- AC-7: five list-failure sentinels prove HTTP 500 project_list_failed with no projects or partial rows and no sentinel in body, headers, or structured logs.
- AC-8: App tests prove one request per mount and announced loading plus empty, populated, and failure states; Chromium records loadingState, emptyState, and populatedState as true.
- AC-9: the empty component copy says registered projects will appear on Project Home and has no button or simulated registration.
- AC-10: the component failure alert names the problem, gives one Retry button, and proves one new loader call; Chromium proves exactly one fault request and one successful retry request.
- AC-11: component tests compare listitem count, exact names and paths, semantic button names, tabIndex, and data-project-id values; Chromium compares both returned stable identities and uses focusable Open controls.
- AC-12: three component Open activations leave one identical project-associated BL-007 status with no URL or loader change; Chromium uses Tab, Shift+Tab, and Enter and records deferredStatus, urlUnchanged, and openRequestFree as true.
- AC-13: component evidence compares leading, internal, and trailing whitespace plus metacharacter path textContent and title byte-for-byte and proves no script node exists.
- AC-14: API and web finite matrices reject missing, extra, scalar, blank, unsafe timestamp, malformed, and duplicate-ID records with no rendered or returned partial cards.
- AC-15: deferred request tests prove rapid retries abort both predecessors, the newest success survives older success and failure, timeout aborts at 5,000 ms, and unmount aborts without a late render.
- AC-16: component control and link inventories plus endpoint scope show no registration, close, workbench, search, sorting, tag, path mutation, navigation, or fake workbench operation.
- AC-17: final web package validation reports 22 component/client tests passing with 94.52 percent branch coverage and 100 percent App coverage.
- AC-18: final API validation reports 260 tests passing; the focused lifecycle and list suites pass 30 tests with isolated databases, restart, closure, malformed rows, ordering, and redaction.
- AC-19: tests/e2e/project-home.spec.ts is one desktop Chromium scenario using owned Vite and API children; the definitive run passed empty, populated, identity, keyboard Open, one fault, and retry phases in 13.6 seconds.
- AC-20: test-results/bl-007/project-home/episode.json records apiGracefulExit, webGracefulExit, both listener-absence flags, and databaseArtifactsAbsent as true after the 10,000 ms bounded cleanup.
- AC-21: three documentation contract files pass five focused tests and cross-check runtime categories, ordering, timeout, root recipes, controlled fault, cleanup, harness signal, and evidence path.
- AC-22: the definitive just verify invocation exited 0, including formatting, lint, typecheck, 282 package tests, BL-006 gate, build, three passing Chromium scenarios with one designated skip, and the passing retained-capacity audit.

## Documentation Evidence

- README.md: added startup, endpoint, Project Home, BL-008+ boundary, validation, and browser cleanup overview.
- docs/README.md: updated configuration and migration-before-serving behavior, restart/shutdown, API contracts, UI states, accessibility, retry/stale ownership, isolation, fault, cleanup, and observed result. It explicitly records that BL-007 needs no migration conversion.
- apps/api/README.md: replaced stale startup/list deferrals with resource lifecycle, typed startup event, exact endpoint/error/order/validity, same-origin proxy, fault seam, cleanup, and scope contracts.
- apps/web/README.md: documented four states, timeout, exact response validation, retry/newest ownership, exact path rendering, deferred Open, and exclusions.
- .harness/engineering-harness.md: added the deterministic owned BL-007 browser signal and sanitized episode evidence while preserving non-persistent boot.
- Executable documentation tests: project-persistence-documentation, project-registration-documentation, and project-list-documentation all pass.
- Architecture documentation: no ADR or core-component change was required; implementation follows the accepted TypeScript, SQLite lifecycle, structured logging, path safety, command-interface, and harness contracts without changing them.
- Migration notes: no schema, data, API replacement, or configuration-default migration is required; existing committed SQLite migrations are applied or validated automatically before serving.

## Validation Results

- T-1 focused: just verify-focused lifecycle and root tests, 7 tests passed.
- T-2 focused: lifecycle, list route, and persistence unit tests, 32 tests passed.
- T-3 focused: project client validation and ownership, 16 tests passed.
- T-4 focused: project client and Project Home components, 22 tests passed.
- T-5 focused dependencies: 43 tests passed; just test-e2e completed with 3 passed, 1 designated skip, and a passing capacity audit.
- T-6 focused: 5 documentation tests passed.
- T-7 consolidated focused: 48 tests passed; added API branch proof then passed 30 focused API tests and the 6-test startup matrix.
- Full: final just verify exited 0. API: 260 tests and 80.74 percent branch coverage. Web: 22 tests and 94.52 percent branch coverage. Playwright: 3 passed, 1 designated skip. Capacity audit: passed with no attributed resources.

Implementation evidence is ready for independent Verify review; no final acceptance claim is made here.
