# Action Plan: Display the Registered Projects on Project Home

## Feature
- **ID:** 17
- **Research Brief:** `project/work-items/17-bl-007-display-the-registered-projects-on-project-home/research/00-research.md`

## ADRs Created

- None. The accepted TypeScript monorepo, SQLite lifecycle, structured logging, path safety, and harness artifacts already govern this work. The endpoint, envelope, ordering, timeout, and test-fault specifics are issue-local implementation details rather than new global architecture.

## Core-Components Created

- None. The existing core-components already cover closeable migration-before-use persistence, safe structured runtime errors, filesystem path safety, validation, and RPIV evidence. No new reusable cross-cutting contract is introduced.

## Acceptance Criteria

- **AC-1:** Before accepting requests, API startup initializes the project library from the documented database configuration and applies or validates all current migrations; after stopping that API and closing its resources, a fresh API instance against the same database lists projects persisted before the restart.
- **AC-2:** API shutdown closes the initialized project-library resources and leaves no API-owned database handle open; repeated shutdown signaling has one documented safe outcome.
- **AC-3:** Persistence initialization failure prevents the API from opening its listener and exits with one documented typed startup-failure category plus a structured log event. A finite repository-defined sentinel matrix proves the event contains the category but no supplied secret, SQL text, stack text, or database-path sentinel.
- **AC-4:** The documented project-list endpoint returns 200 with one stable JSON contract containing every project in an unchanged persisted library exactly once and no project fields beyond ID, display name, canonical path, and created-at.
- **AC-5:** The endpoint documents and consistently applies one deterministic total ordering, with ID as the final tie-breaker, so repeated requests against unchanged data return the same record order.
- **AC-6:** An empty project library returns 200 with an empty project array in the same success contract.
- **AC-7:** A persistence/list failure returns one documented non-2xx error contract with a stable safe error category and no success project array or partial records. A finite repository-defined sentinel matrix proves the response contains none of the supplied secret, SQL, stack, database-path, or internal-error sentinels.
- **AC-8:** Project Home starts one initial list request per mount with a documented finite timeout and displays distinct accessible loading, empty, populated, and failure states; loading is announced to assistive technology.
- **AC-9:** The empty state explains that registered projects will appear on Project Home without providing or simulating project registration.
- **AC-10:** The failure state provides an actionable accessible message and one explicit retry control; each retry activation starts one new bounded list request.
- **AC-11:** The populated state displays every valid returned project exactly once with its visible display name, complete canonical path, and one semantic keyboard-focusable Open action. Each action has an inspectable identity equal to the stable project ID in that record and an accessible name that identifies the project; automated evidence compares those identities with the returned records.
- **AC-12:** Each Open activation, including rapid repeated activation, starts no workbench and performs no navigation. It produces an accessible status associated with that project which identifies its display name and states that opening is not available in BL-007; repeated activation leaves the same status outcome.
- **AC-13:** Long paths and paths containing leading, internal, or trailing whitespace or HTML/script metacharacters are rendered as text without interpretation; the complete canonical value remains available through accessible text or title and is not trimmed, normalized, or otherwise mutated.
- **AC-14:** A valid API project record has a non-empty string ID, non-blank display name, non-empty string canonical path, and finite non-negative safe-integer created-at; a response containing a duplicate ID or any malformed record produces one deterministic safe failure state with no project cards.
- **AC-15:** Rapid repeated retries use newest-request-wins behavior: each newer retry cancels or supersedes the prior in-flight request, a stale response cannot replace newer state, and unmount aborts the current in-flight request without a later state update.
- **AC-16:** No control, API operation, or navigation outcome is added for project registration, project close, workbench startup or status, search, user-controlled sorting, tags, or path mutation; no fake workbench destination is introduced.
- **AC-17:** Finite component validation covers loading, empty, populated, and failure states; retry and rapid repeated retry; stale-response suppression; unmount abort; keyboard tab and Open activation; repeated Open activation; project action identities; accessible roles, names, announcements, and deferred status; malformed and duplicate records; and path text safety.
- **AC-18:** Finite API validation uses isolated databases and covers empty results, populated deterministic ordering, complete restart visibility, safe redacted initialization and list failures with no partial response, repeated shutdown, and resource closure.
- **AC-19:** One bounded desktop Chromium scenario runs the real web and API applications against an isolated database; proves the empty state; proves a pre-seeded populated state displays every project card and supports keyboard Open activation with the deferred status and matching project identity; and proves failure followed by successful retry through a repository-controlled fault.
- **AC-20:** Chromium cleanup requests graceful shutdown of each server it started and observes each process exit within a documented finite timeout, then proves its listeners are absent and removes only its isolated database and database sidecars; no scenario-owned process, listener, or database artifact remains.
- **AC-21:** Documentation records database startup and configuration, migration-before-serving and restart behavior, endpoint success and error contracts and ordering, record validity, all Project Home states and accessibility outcomes, retry and stale-request behavior, the deferred Open boundary, exact validation commands, isolation, controlled fault, cleanup, and the observed bounded result.
- **AC-22:** The root full-validation command, just verify, exits zero.

## Acceptance Coverage

| Acceptance Criterion | Implementation Tasks | Tests / Validation | Expected Evidence |
|---|---|---|---|
| AC-1 | T-1, T-2 | V-1, V-2 | Isolated startup/migration and close-reopen HTTP assertions show pre-restart records once each. |
| AC-2 | T-1 | V-1 | Shutdown trace shows one library/database close, safe repeated signals, and successful isolated-file cleanup. |
| AC-3 | T-1 | V-1 | Injected sentinel matrix proves a nonzero startup exit, no listener, and only the typed category in the structured event. |
| AC-4 | T-2 | V-2 | Fastify inject response proves the exact success envelope and four project fields. |
| AC-5 | T-2 | V-2 | Repeated isolated-database requests prove `createdAt ASC, id ASC` total ordering. |
| AC-6 | T-2, T-5 | V-2, V-5 | Isolated API and real-browser outputs show `{"projects":[]}` and the presented empty state. |
| AC-7 | T-2 | V-2 | Sentinel failure matrix responses show only the safe non-2xx `project_list_failed` category, with no `projects` field or sentinels. |
| AC-8 | T-3, T-4, T-5 | V-3, V-4, V-5 | Component roles/announcements and Chromium screen assertions prove one request per mount and four distinct states. |
| AC-9 | T-4 | V-4 | Accessible empty copy contains no registration control. |
| AC-10 | T-3, T-4, T-5 | V-3, V-4, V-5 | Request call counts, abort/timeout traces, retry control assertions, and the fault-then-pass browser result. |
| AC-11 | T-4, T-5 | V-4, V-5 | Rendered card counts, exact name/path text, semantic buttons, and `data-project-id` identities match the returned records. |
| AC-12 | T-4, T-5 | V-4, V-5 | Keyboard and rapid repeated Open assertions show one stable project-associated deferred status without URL or request change. |
| AC-13 | T-4 | V-4 | DOM text/`title` equals the unchanged canonical path for long, whitespace-bearing, and metacharacter sentinels; no executable markup appears. |
| AC-14 | T-2, T-3, T-4 | V-2, V-3, V-4 | API row validation and browser response validation matrices prove malformed/duplicate data never renders cards. |
| AC-15 | T-3 | V-3 | Deferred request traces prove newest-wins, stale suppression, per-retry abort, and unmount no-update. |
| AC-16 | T-4, T-6 | V-4, V-6 | Control/route inventory and DOM/HTTP assertions show no BL-008+ operation or fake workbench destination. |
| AC-17 | T-3, T-4, T-7 | V-3, V-4, V-7 | Focused web Vitest report covers the full finite component matrix and passes coverage. |
| AC-18 | T-1, T-2, T-7 | V-1, V-2, V-7 | Focused API Vitest report covers the full isolated lifecycle/HTTP matrix and proves cleanup. |
| AC-19 | T-5, T-7 | V-5, V-7 | One Playwright desktop Chromium result and `test-results/bl-007/project-home/episode.json` prove empty, populated, keyboard Open identity, and fault/then-retry. |
| AC-20 | T-5, T-7 | V-5, V-7 | Final episode cleanup flags prove graceful exits, absent listeners, and absent database/sidecar paths. |
| AC-21 | T-6, T-7 | V-6, V-7 | Documentation contract tests and diff prove all required operational, API, UI, fault, cleanup, and observed-result details. |
| AC-22 | T-7 | V-7 | Captured `just verify` exit code 0 and summary with no remaining BL-007 resources. |

**Coverage proof:** All 22 stable AC IDs have at least one dependency-ordered implementation task, one finite test or validation, and one inspectable expected-evidence outcome. Implementation may not start until this matrix remains complete.

## Implementation Tasks

1. **T-1 — Own the project library through API startup and shutdown** (AC-1, AC-2, AC-3, AC-18). Construct the closeable library from `ASCEND_DATABASE_URL` before listening, memoize shutdown across repeated signals, and log only a typed safe startup category.
2. **T-2 — Expose the safe ordered project-list HTTP contract** (AC-1, AC-4, AC-5, AC-6, AC-7, AC-14, AC-18). Add `GET /api/projects` with `{"projects":[...]}`, `createdAt ASC, id ASC` ordering, exact row validation, and a safe non-2xx `project_list_failed` error without partial data.
3. **T-3 — Build the bounded project-list client and request ownership** (AC-8, AC-10, AC-14, AC-15, AC-17). Validate the exact JSON shape without adding a general schema framework, use a documented 5,000 ms abort timeout, and enforce monotonic request identities so only the newest request can update state.
4. **T-4 — Render accessible Project Home states and defer Open** (AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17). Remove the pre-existing registration-labelled control, render loading/empty/failure/populated states, preserve canonical path text exactly, and make each project-identified Open button idempotently announce the BL-007 deferral without navigation or network activity.
5. **T-5 — Add the owned real-application desktop Chromium episode** (AC-6, AC-8, AC-10, AC-11, AC-12, AC-19, AC-20). Start real API and Vite child processes at disposable loopback ports against one refused isolated database; prove empty, seeded, keyboard Open, and fault-once/retry phases in one bounded scenario; and always audit graceful exit, listener absence, and exact database/sidecar cleanup.
6. **T-6 — Synchronize application, API, harness, and validation documentation** (AC-1 through AC-16, AC-21). Replace stale BL-005/BL-006 deferral statements, document all contracts and boundaries, add the BL-007 deterministic signal and evidence path to the non-persistent harness inventory, and reference only root `just` commands.
7. **T-7 — Run focused and full validation and record the handoff** (AC-17, AC-18, AC-19, AC-20, AC-21, AC-22). Run the API, component, documentation, and browser gates, then `just verify`, inspect the BL-007 cleanup summary, and record AC-indexed results in the Implement handoff.
