# Implementation Notes: Issue #29 — BL-012 Connect Project Home and Project Workbench

## Completed tasks

- T-0 through T-8 are implemented in declared dependency order.
- Focused validation was run after each resumed task and corrective edit.
- This record supplies implementation evidence only; final acceptance remains owned by Verify.

## Acceptance evidence

- **AC-1:** `apps/web/src/workbench-navigation.ts`, `App.tsx`, and their tests encode only the stable ID and navigate from exact Home `/` to one-trailing-slash `/projects/{id}/workbench/`; real Chromium reaches that same persisted fixture.
- **AC-2:** API and browser matrices record stopped start once, running reuse, and unchanged runtime PID/start identity through Home, reopen, refresh, history, and isolated direct navigation.
- **AC-3:** `workbench-navigation-shell.ts` injects only Ascend and keyboard-operable Projects; browser evidence records `prohibitedHeaderValues: 0`.
- **AC-4:** `browser-continuity.json` records one runtime identity, `terminal.aliveOnHome: true`, and advancing counter values while Home is visible.
- **AC-5:** The main Chromium workflow reopens the known editor file and retains the same terminal PID with a measurably advanced disposable counter.
- **AC-6:** The same workflow observes the BL-001 Explorer sentinel, native Markdown Preview sentinel, canonical terminal directory, and bounded marker progress; the isolated workflow repeats Explorer, directory, terminal, and counter checks.
- **AC-7:** The retained ledger is exactly Home, Workbench-1, Home, Workbench-2, Refresh, Back-Home, Forward-Workbench-2, Home, Workbench-3, with counts 3/1/1/1.
- **AC-8:** A fresh context records empty storage, zero cookies and service workers, one direct stable navigation, one refresh, unchanged runtime identity, and integrated-terminal progress.
- **AC-9:** Route tests and browser traffic evidence separate top-level shell acquisition from descendants; all workbench HTTP and WebSocket URLs retain the stable prefix.
- **AC-10:** `workbench-navigation-shell.test.ts` and the API matrix execute empty, decode, encoded slash/backslash/NUL, over-128, and sibling-route rows with zero lookup/start.
- **AC-11:** Unit, matrix, and controlled Chromium evidence retain the unknown URL, announced focused error, Projects-only recovery, one lookup, and zero starts.
- **AC-12:** Shell tests and the four-case browser episode retain exact startup, upstream, generic/load-timeout messages, same-URL Retry, and generation counts; Projects creates no retry generation.
- **AC-13:** `browser-failures.json` contains exactly unknown, startup, upstream, and timeout records, each executed once with one applicable recovery action and no exhaustive claim.
- **AC-14:** `App.test.tsx` and component-matrix evidence execute exactly eight activations joining one navigation generation with one history result and stable accessible pending focus.
- **AC-15:** Browser-shell tests suppress stale success and stale failure; the controlled timeout request is cancelled, settles after Retry, and records `staleMutations: 0`.
- **AC-16:** Component tests execute long/metacharacter names and paths as inert complete text while asserting that only the stable ID selects the URL.
- **AC-17:** Component and browser tests assert accessible Open, Projects, Retry, loading status, assertive error announcement, visible focus, logical controls, and one-time error-heading focus.
- **AC-18:** Component, shell, and real history evidence assert no duplicate from joined activation, Retry, refresh, stale completion, Back, or Forward and no implicit failed generation.
- **AC-19:** `test-results/bl-012/component-matrix.json` is generated from finite execution-backed rows with URL, generation, history, focus, announcement, assertion, recovery, and cleanup outcomes; negative validation rejects incomplete or duplicate evidence.
- **AC-20:** `test-results/bl-012/api-matrix.json` executes stopped/running, every malformed class, unknown, startup, upstream, and document-timeout rows with lookup/start/generation/public-result/recovery counts.
- **AC-21:** The main scenario uses the repository BL-001 known and Markdown files plus one 250 ms marker command bounded to 120 iterations; evidence records exact marker PID/counters, termination, and output removal.
- **AC-22:** `tests/e2e/home-workbench.spec.ts` enforces the exact ordered ledger and no additional workbench/history actions.
- **AC-23:** Browser evidence records bounded request classes, same-origin stable-prefix socket shapes, Management/ExtensionHost roles, explicit pre-control cancellation, usable integrated terminal, and zero internal-authority leaks.
- **AC-24:** Matrices and browser episodes record operation, startup, document, recovery, overall, and cleanup bounds; the harness contract deterministically proves a simulated 121-second checks/boot success without a real wait.
- **AC-25:** Continuity cleanup records contexts/pages 2→0, exact terminal identity/output absence, zero proxy resources, runtime identity/listener absence, API/web listener and web group absence, zero controlled SQLite sidecars, equal fixture digests, and an unrelated listener alive; failure cleanup is also zero.
- **AC-26:** This AC-indexed record and generated schemas retain counts/classes/digests only; validators reject raw authority and protected-content leakage.
- **AC-27:** Root, web, API, docs index, stable-routing/runtime runbooks, harness instructions/change record, ADR, core component, and decision log now describe URLs, recovery, bounds, evidence, cleanup, and explicit no-migration behavior; obsolete deferred-Open statements were removed.
- **AC-28:** Root `just verify-focused`, `just verify-home-workbench`, `harness boot`, `just verify`, and independent BL-010/011/012/capacity residual audits exited zero. The final handoff additionally runs `just setup` and `just verify` from the clean committed tree.
- **AC-29:** Diff and documentation retain one-project navigation only; no router dependency, multi-project coordinator, lifecycle/status controls, custom IDE capability, public network/auth/TLS, multi-host route, or persisted runtime identity was added.

## Validation evidence

- `just verify-focused`: PASS — 81 files passed, 1 skipped; 558 tests passed, 2 skipped.
- `just verify-home-workbench`: PASS — 42 component/API tests, 2 designated Chromium scenarios, and BL-012 residual audit.
- `harness boot`: PASS — readiness `ok`, canonical checks proof, 223705 ms duration, 610000 ms finite composed timeout.
- `just verify`: PASS — formatting, lint, typecheck, unit coverage, build, all E2E and BL-010/011/012 gates.
- Independent residuals: BL-012 `passed: true`; BL-011 `status: ok`; BL-010 `status: ok`; capacity `passed: true`.
- `just setup`: PASS before handoff; clean committed-tree setup and full verification are repeated before final return.

## Documentation evidence

- `README.md`: Home/stable URL, Projects/Retry/history behavior, Vite/deployment topology, validation commands, and no-migration statement.
- `apps/web/README.md`: stable-ID Open behavior, native history, same-origin forwarding, accessibility, and scope.
- `apps/api/README.md`: unmarked HTML shell versus marked BL-011 transport contract, exact recovery, CSP/folder preservation, and no API/data/config migration.
- `docs/README.md`, `docs/stable-workbench-routing.md`, and `docs/project-runtime.md`: configuration, route/error/load behavior, bounds, operations, cleanup/evidence interpretation, and delivered Open wiring.
- `.harness/engineering-harness.md`, checks/boot instructions, and the 2026-08-12 harness change record: configurable 600000 ms checks budget and 10000 ms boot overhead.
- `ADR-260812-browser-navigation-shell.md`, stable-proxy core component, and decision log: accepted same-origin shell/transport boundary and socket/close semantics.
- Migration note: no schema, data, API-payload, application configuration, or persisted-runtime migration is required.

## Verifier correction evidence at aceb3a4

- AC-1, AC-2, AC-7, AC-14, AC-18, AC-19, AC-20: component-matrix.json and api-matrix.json now come from React events, browser History events, Fastify requests, and instrumented runtime/proxy calls. Every row carries unique execution/event IDs; validation rejects absent event IDs. The eight-join API row records 8 requests, 1 launch, 7 joins/reuses, 0 stops, and running state.
- AC-3, AC-15, AC-17: Home receives one mount focus; real tab execution reaches Home Open and shell Retry then Projects. Projects invalidates the shell generation before navigation. Stale success and failure settle after a newer Home surface and leave its URL, DOM, focus, status announcement, and card unchanged.
- AC-4 through AC-6, AC-8, AC-21 through AC-23: browser-real-process.json is produced by a built API process group, Vite process group, isolated SQLite database, real runtime/proxy, main context, and storage-empty context. The integrated terminal visibly repeats pwd -P, host user, hostname, canonical-directory digest, and increasing counters before Home, after reopen, after fresh direct navigation, and after refresh. Raw terminal values are transient; evidence retains booleans and bounded counters only.
- AC-8: the fresh context explicitly clears/asserts cookies, localStorage, sessionStorage, CacheStorage, service workers, and Chromium browser cache before its one direct stable navigation; then it refreshes exactly once.
- AC-10 through AC-13, AC-17, AC-24: browser-failures.json records startup, each case, each recovery, and overall start/end/duration values with finite startup, document, recovery, overall, and cleanup bounds. Error heading focus and Retry/Projects tab order execute in Chromium.
- AC-16: App.test.tsx executes a 128-character stable ID with 4,096-character markup-bearing name and path through the real React component, verifies inert DOM, and observes only the stable-ID route.
- AC-23, AC-26: the real browser proof assigns an ID and safe class to every observed request, response, browser log, and WebSocket and transiently scans trusted token/header sentinels. Public evidence retains no URLs, response bodies, log bodies, terminal values, canonical paths, trusted headers, tokens, or internal authorities.
- AC-25, AC-28: the residual audit now requires exact real-process context/page, proxy-socket, terminal PID/file, runtime identity/listener, API/web process-group/listener, and SQLite artifact cleanup in addition to fixture/control-listener evidence.
- AC-27, AC-29: README, package READMEs, docs index, stable-routing runbook, ADR, core component, decision log, action-plan impact, and task documentation now describe ASCEND_FRONT_DOOR_TOKEN defaults, 16–256-character validation, aligned trusted headers, refusal, local/deployment handling, redaction, finite proof bounds, evidence interpretation, exact cleanup, and no data/schema/API-payload migration. This clarification adds no public authentication, networking, TLS, multi-host routing, lifecycle UI, or persisted runtime identity.

Corrective focused results: just verify-focused passed 566 tests with 2 skips; just verify-home-workbench passed 44 Vitest tests, 3 Chromium scenarios, and the independent residual audit. Full validation is recorded below after the final just verify run. Final acceptance remains owned by Verify.
## Final corrective validation record

- just verify-focused: PASS — 83 files passed, 1 skipped; 566 tests passed, 2 skipped.
- just verify-home-workbench: PASS — 44 Vitest tests, 3 designated Chromium scenarios, and expanded residual audit.
- just verify: PASS — formatting, lint, typecheck, unit coverage, build, all E2E, and BL-010/011/012 gates.
- harness boot: PASS — ready, canonical checks proof, 310885 ms duration, 610000 ms finite timeout.
- Final acceptance remains owned by Verify.


## AC-24 / AC-28 nondeterminism correction

- Root cause: Playwright's former 120,000 ms test timeout included the scenario's serial process shutdown in the test body. When the deadline was exhausted, Playwright interrupted the finally block; the failed execution left its exact API and code-server identities alive, which contended with later runs even though a later successful evidence file reported only its own clean resources.
- The correction reserves cleanup inside a derived 220,000 ms no-retry overall bound: setup 5,000; API 15,000; web 10,000; runtime 30,000; workbench 30,000; terminal 15,000; three entries 25,000; history 25,000; deep link 35,000; evidence 5,000; cleanup 10,000; margin 15,000 ms.
- Vite now emits an owned IPC readiness event after its exact listener is reachable, API and web ports are reserved distinctly, the compiled API is built once and launched directly, runtime/workbench readiness shares one browser acquisition, and listener attribution uses one discovery snapshot plus strict confirmation of the stable owner. API/web stops and listener checks run concurrently rather than consuming serial cleanup windows.
- Every retained step has start, end, duration, applied bound, and passed/failed/timed-out outcome. Timeout and assertion paths write safe partial diagnostics after exact cleanup; the residual audit rejects missing or over-bound steps. Playwright remains workers=1 and retries=0; no automatic scenario retry was added.
- Three consecutive standalone just verify-home-workbench runs passed without retry. Their real-process/continuity durations were 55,706/50,198 ms, 58,495/50,919 ms, and 57,819/48,053 ms. The maximum scenario duration was 58,495 ms and the maximum retained step was 21,888 ms, both below 220,000 ms overall; whole-gate wall reports were 1.9, 1.9, and 1.8 minutes. Terminal readiness now waits atomically for counter, canonical-directory digest, user, and host visibility.
- **AC-24 evidence:** tests/e2e/home-workbench-timing.ts, its contract test, both browser evidence files, and the residual timing validator prove finite declared bounds, exact slow-step diagnostics, failure on excess, and cleanup retention.
- **AC-28 evidence:** all three standalone gates and their independent residual audits passed. Full just verify and harness boot results are recorded after final validation below; final acceptance remains owned by Verify.

## Correction documentation evidence

- README.md and docs/stable-workbench-routing.md now document the 220,000 ms derivation, no-retry behavior, deterministic readiness, timeout evidence, and exact cleanup procedure.
- Task and test plan correction sections map T-6/T-8 and V-5/V-6/V-9/V-10 to AC-24 and AC-28.
- No API contract, product configuration, schema, data, migration, deployment topology, ADR, or core-component contract changed; this correction is confined to test orchestration, evidence validation, and operational validation documentation.


## Final AC-24 / AC-28 correction validation

- just verify-focused tests/contracts/home-workbench-timing.test.ts apps/api/test/home-workbench-residual-audit.test.ts: PASS, 3 tests.
- just verify-home-workbench: PASS three consecutive times on the final observer/cleanup implementation, 44 Vitest tests, 3 Chromium scenarios, retries=0, and residual audit each time.
- just verify: PASS after the final response-observer race correction; formatting, lint, typecheck, unit/coverage, build, E2E, BL-010, BL-011, BL-012, and residual gates exited zero.
- harness boot: PASS, readiness ready, canonical harness checks proof, 306,843 ms duration inside the finite 610,000 ms checks timeout, with no persistent development server.
- Final acceptance remains owned by Verify.
