# Verification Summary: Issue #25

## Delivery

- **Issue:** BL-010: Start and reuse one project workbench
- **Work item:** `project/work-items/25-bl-010-start-and-reuse-one-project-workbench`
- **Branch:** `feat/25-start-reuse-project-workbench`
- **Implementation commit:** `a0823ae01e35a4e1dbdb9548328230cdda254b26`
- **Merge base:** `f78408be73e61aa214931edfd48ef3ae539c85dc`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/26

## Handoff and Diff Review

The branch, implementation SHA, and clean-tree handoff matched exactly. The complete 35-file branch diff was reviewed. Scope is limited to the internal runtime manager, process/lifecycle boundaries, persistence lookup, tests/evidence, command recipes, documentation, and the governing runtime core-component. No route, proxy, browser wiring, multi-project coordination, persisted runtime state, user Stop/Restart UI, scheduling, auto-sleep, container, or presentation behavior was added.

Both implementation commits use Conventional Commit subjects and contain the required Copilot co-author trailer. Decision-log entries 53–57 and the updated runtime lifecycle core-component match the memory-only ownership, single-flight, caller-local cancellation, bounded readiness/shutdown, exact cleanup, and redacted event behavior.

## Acceptance Decisions

- **AC-1 — Passed.** Contract, process tests, and designated proof establish exact persisted ID/path lookup, direct non-root argv launch, exact canonical path argument, loopback-only URL/port, PID/start identity, states, and finite snapshot fields.
- **AC-2 — Passed.** SQLite remains four-field metadata-only; schema/row/byte and event scans report zero prohibited runtime persistence.
- **AC-3 — Passed.** Exactly eight calls share one launch and identity; health-checked reuse adds no launch. Real proof confirms PID/port reuse.
- **AC-4 — Passed.** Controlled collisions retry no more than three times, exhaustion is typed, exact cleanup succeeds, and unrelated listener identity survives.
- **AC-5 — Passed.** GET `/healthz/` readiness accepts only HTTP 200 plus `alive` or `expired`, retains attempt timing, and enforces per-attempt, overall, and cancellation bounds.
- **AC-6 — Passed.** All seven process/project failure categories execute distinctly with fixed actionable messages.
- **AC-7 — Passed.** Timeout, health status/body, caller cancellation, and manager shutdown execute as distinct typed failures.
- **AC-8 — Passed.** Diagnostics are closed to six finite fields; stacks and protected content are absent and sentinel scans are zero.
- **AC-9 — Passed.** Lifecycle events contain allowlisted event/project/transition/timing/classification fields with zero raw-path or sentinel matches.
- **AC-10 — Passed.** Eight callers receive one failure object, the exact owner is absent, in-flight state is evicted, and one fresh launch serves eight retries.
- **AC-11 — Passed.** Post-running code/signal exits evict reusable state, retain bounded diagnostics, perform no automatic restart, and allow one explicit replacement.
- **AC-12 — Passed.** Caller cancellation is caller-local; one/all-caller cases prove no duplicate, orphan, listener, stale mutation, or retry interference.
- **AC-13 — Passed.** Shutdown is memoized, bounded, cancellation-aware, and exact-owner-only; graceful/escalated audits pass and unrelated controls survive.
- **AC-14 — Passed.** Five complete fake manifests and the designated BL-001 manifest have zero differences.
- **AC-15 — Passed.** The version 2 executable matrix contains 25 invoked cases with concrete observations; 17 audited identities leave zero residuals.
- **AC-16 — Passed.** Committed code-server 4.131.0 episode records HTTP 200 `expired`, uid 1000, exact argv, loopback listener, reuse, 576 ms versus 15 seconds, unchanged fixture, unrelated survival, and zero residuals. Independent rerun passed at 500 ms.
- **AC-17 — Passed.** Runtime runbook, README surfaces, harness inventory, and architecture contract accurately cover all interface, ownership, configuration, usage, failure, event, cancellation, shutdown, validation, timing, and deferred boundaries.
- **AC-18 — Passed.** Focused and full configured validation exit zero and final residual evidence reports no owned PID identity or listener.

## Documentation Review

Passed for all applicable categories:

- README and usage surfaces describe the internal capability and deferred product behavior.
- The runtime runbook matches executable/user defaults, argv/path handling, loopback and retry bounds, health contract, failure catalog, cancellation, shutdown, evidence, and commands.
- Architecture and operational/harness documentation match exact memory ownership, event redaction, and cleanup behavior.
- No API specification update applies because no route was added.
- No migration or upgrade note is required because the SQLite schema remains unchanged; this is explicitly documented.
- No deployment procedure or breaking configuration default changed.

## Validation Results

- **`just verify-project-runtime` — Passed:** 5 files, 31 tests; all 25 executable matrix cases, five zero-diff manifests, privacy/persistence checks, and 17-identity residual audit passed.
- **`just verify` — Passed:** formatting, lint, typecheck, 340 API tests with 2 intentional skips, 139 web tests, designated runtime proof, exact residual audit, harness and registration contracts, both builds, 5 Playwright tests with 1 intentional skip, and the final capacity audit.
- **Independent designated evidence — Passed:** 500 ms versus 15,000 ms, exact PID/listener absence, unchanged fixture, unrelated controls alive, zero residuals.
- **Working tree after validation — Clean.**

## Observation Evidence

- **DL-294 (`difficulty`):** captured when `rg` was unavailable and inspection used the repository-available fallback.
- **DL-295 (`difficulty`):** captured for the authoritative full validation wait exceeding 30 seconds.
- **DL-296 (`difficulty`):** captured when `python` was unavailable and the environment-required `python3` fallback was used.
- **DL-297 (`difficulty`):** captured when the combined documentation diff exceeded tool output limits and required direct per-file reads.
- **DL-298 (`difficulty`):** captured when successful full-validation output exceeded display limits and required targeted summary inspection.

## Result

All AC-1 through AC-18 passed. Issue checkboxes were updated only after acceptance, the verified branch was pushed, and pull request #26 was created.
