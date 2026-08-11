# Verification Summary: Issue #17

- **Issue:** BL-007: Display the registered projects on Project Home
- **Work item:** `project/work-items/17-bl-007-display-the-registered-projects-on-project-home`
- **Verified branch:** `feat/17-display-registered-projects`
- **Implementation commit:** `1f69a7b047d9d3a66b7ba938f64cccb3c30a16b8`
- **Base commit:** `b437e6c1ce183afa1a266e3b7c33f370c596b648`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/18
- **Decision:** Accepted

## Handoff and Diff Review

The branch name and implementation SHA matched the corrected Implement handoff exactly, and the working tree was clean before verification. The complete 38-file branch diff was reviewed for Issue #17 scope, architecture, core-component compliance, tests, application documentation, and generated evidence. Both implementation commits use Conventional Commit messages and contain the required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer.

The implementation remains within read-only project listing and Project Home presentation. It introduces no registration, close, workbench lifecycle, navigation, search, user sorting, tags, path mutation, or fake workbench destination. No ADR or core-component change is needed. The committed behavior conforms to the accepted TypeScript monorepo, SQLite lifecycle, structured logging, filesystem path safety, development standards, command interface, and governed harness contracts.

## Acceptance Decisions

- **AC-1 — Passed:** API construction initializes the configured library and migrations before listen; isolated lifecycle and route tests prove close/reopen visibility.
- **AC-2 — Passed:** One memoized stop promise closes Fastify, the library, and telemetry; repeated shutdown proves one close and removable database artifacts.
- **AC-3 — Passed:** Four initialization sentinels produce exit 1, no listener, and only the safe startup event/category.
- **AC-4 — Passed:** HTTP 200 has the exact projects envelope and exact four fields, with every persisted record once.
- **AC-5 — Passed:** Repeated responses prove deterministic `createdAt ASC, id ASC` total ordering.
- **AC-6 — Passed:** API returns `{"projects":[]}` and Chromium proves the empty state.
- **AC-7 — Passed:** Five failure sentinels produce only HTTP 500 `project_list_failed`, without projects, partial rows, or leaks.
- **AC-8 — Passed:** One 5,000 ms-bounded request starts per mount, and accessible loading, empty, populated, and failure states are proven.
- **AC-9 — Passed:** Empty copy explains registered projects and exposes no registration control.
- **AC-10 — Passed:** One accessible Retry control starts one new bounded request; Chromium proves one fault then successful retry.
- **AC-11 — Passed:** Every card, name, exact path, Open identity, accessible name, Tab focus, and Enter/Space activation matches returned records.
- **AC-12 — Passed:** Repeated Open activation leaves the same project-associated BL-007 status with no request, workbench, or URL change.
- **AC-13 — Passed:** Long whitespace-bearing and metacharacter paths remain exact inert text and title values.
- **AC-14 — Passed:** API and web matrices reject malformed, extra-field, unsafe-timestamp, and duplicate-ID records without partial cards.
- **AC-15 — Passed:** Tests prove rapid retry abort, newest-request-wins, stale suppression, timeout abort, and unmount safety.
- **AC-16 — Passed:** Diff and control inventory contain none of the excluded BL-008+ operations.
- **AC-17 — Passed:** Component/client validation covers all required states, races, accessibility, keyboard, identity, malformed data, and path safety.
- **AC-18 — Passed:** API validation covers isolated migration, empty/populated order, restart, redaction, shutdown, resource closure, and cleanup.
- **AC-19 — Passed:** One owned desktop Chromium scenario proves real-app empty, restart-populated, identity, keyboard Open, fault, and retry phases.
- **AC-20 — Passed:** Graceful exits, independent process-group absence, listener absence, database cleanup, and the surviving-descendant failure path are proven.
- **AC-21 — Passed:** Root, application, API, web, and harness documentation matches committed startup, configuration, contracts, UI, accessibility, race, scope, fault, cleanup, and evidence behavior.
- **AC-22 — Passed:** Independent `just verify` exited 0.

## Documentation Review

- **README, usage, API, and configuration:** Passed. Root, API, web, and application docs match the exact endpoint, database configuration, same-origin proxy, timeout, UI, accessibility, retry, and scope behavior.
- **Migration:** Passed. Documentation correctly states migrations run before serving and that BL-007 requires no schema/data conversion.
- **Architecture:** Passed. Existing accepted ADR and core-component contracts govern the implementation; no new architecture decision was introduced.
- **Operations and deployment:** Passed. Shutdown, controlled fault isolation, process-group and listener inspection, database-sidecar cleanup, evidence, and root validation commands are documented. No deployment topology or deployment configuration changed.
- **Staleness review:** Passed. Prior BL-007 deferral statements were removed, and no contradictory application documentation remains.

## Validation Results

- `just verify-focused` on eight Issue #17 API, web, documentation, and cleanup suites: **64/64 passed**.
- Ten consecutive `just verify-focused apps/api/test/workbench-proof-failures.test.ts` runs: **70/70 passed**; early-exit/readiness-timeout and process-group survivor semantics remained stable.
- `just test-e2e`: **3 Chromium scenarios passed, 1 designated skip**; retained-capacity audit passed.
- Independent `just verify`: **passed** formatting, lint, typecheck, 263 API tests, 22 web tests, 48 registration tests, build, Chromium, and retained-capacity audit.
- Final `test-results/bl-007/project-home/episode.json`: every state, identity, fault, retry, graceful-exit, process-group, listener, database-cleanup, and bounded-result field is true.
- Final residual inspection found no Issue #17 server process or isolated database artifact.

All 22 GitHub acceptance checkboxes were updated only after every criterion passed and pull request #18 was created.
