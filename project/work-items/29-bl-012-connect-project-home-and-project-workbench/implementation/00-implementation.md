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
