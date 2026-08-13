# Verification Summary: Issue #31

## Delivery

- **Issue:** BL-013: Isolate one runtime per active project
- **Work item:** `project/work-items/31-bl-013-isolate-one-runtime-per-active-project`
- **Verified branch:** `feat/31-isolate-project-runtimes`
- **Implementation commit:** `ab21b9ed98c8a2bb28311b4bce6afc1c9de02c68`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/32
- **Decision:** Accepted; all AC-1 through AC-27 passed independently.

## Acceptance Decisions

| Criterion | Status | Evidence |
|---|---|---|
| AC-1 | Passed | One stable-ID entry map concurrently holds registered, starting, running, and failed states. |
| AC-2 | Passed | Frozen A/B/C snapshots contain complete, pairwise-distinct runtime identity, route, and token fields. |
| AC-3 | Passed | `interleaved-24`: 24 callers, three launches/readiness sequences, and eight shared local results per project. |
| AC-4 | Passed | Real process tests verify per-project argv, cwd, user, environment allowlist, and peer exclusion. |
| AC-5 | Passed | Chromium verifies three Explorer/editor/terminal/Git fixtures with distinct exact status digests. |
| AC-6 | Passed | Exact manager-owned snapshots bind matching HTTP/WebSocket routes, tokens, ports, and socket roles. |
| AC-7 | Passed | SQLite and public responses remain four-field; runtime canaries and migrations are absent. |
| AC-8 | Passed | Twelve scenarios validate the exact ordered 70-event token/state/transport/classification catalog. |
| AC-9 | Passed | Six executed protected scans and public/restricted audits report zero matches. |
| AC-10 | Passed | A/B/C healthy reuse is project-local; Chromium replaces only B. |
| AC-11 | Passed | Malformed, unknown, and persisted-closed IDs leave peers, launches, events, routes, and resources unchanged. |
| AC-12 | Passed | Twenty-four ordered mismatches include 18 pre-forward failures and six live destination-selection rejections. |
| AC-13 | Passed | Five B-only fault classes preserve exact A/C identity, route, listener, and terminal checks. |
| AC-14 | Passed | One explicit B replacement creates one fresh identity with no automatic retry or peer change. |
| AC-15 | Passed | Eight B cancellations clean only orphaned B while A/C complete. |
| AC-16 | Passed | One B cancellation leaves seven callers on one B spawn/snapshot with unaffected A/C. |
| AC-17 | Passed | Bounded global shutdown returns three project audits, zero residuals, and preserves the unrelated control. |
| AC-18 | Passed | Memoized shutdown rejects during/after starts and delayed post-return audits remain zero. |
| AC-19 | Passed | Versioned executable matrix covers named scenarios, mutations, monotonic timing, and residual union. |
| AC-20 | Passed | Production guard passes; singleton/path/name keyed negative fixtures fail. |
| AC-21 | Passed | Real no-retry Chromium proves concurrent A/B/C, exact B termination, A/C continuity, and fresh B replacement. |
| AC-22 | Passed | Safe machine-readable evidence correlates identities/routes/events/sockets; one ignored mode-0600 authority file validates. |
| AC-23 | Passed | Three project partitions, ten resource classes, and 13 independent measurements report zero residuals. |
| AC-24 | Passed | README, API, runtime, routing, harness, decision-log, and core-component documentation is complete and bounded. |
| AC-25 | Passed | Independent `just verify` passed all configured regression gates. |
| AC-26 | Passed | Root commands are finite, repository-local, offline, credential-free, no-retry, and non-manual. |
| AC-27 | Passed | Evidence claims immediate concurrent isolation only and explicitly excludes BL-014 continuity. |

## Validation Results

- **Command interface:** Passed; root `justfile` exposes `verify-focused` before `verify`, plus focused isolation and residual recipes.
- **Focused isolation:** Passed; 8 Vitest files / 39 tests, Chromium passed in 30.4 seconds, residual audit passed.
- **Full verification:** Passed; formatting, lint, type checks, builds, 562 tests passed / 2 skipped, configured browser and BL-004/010/011/012/013 regressions passed.
- **Full-run BL-013 Chromium:** Passed in 34.0 seconds; no retries.
- **Independent residual audit:** Passed; 2 public artifacts, 6 protected scans, 0 matches, 1 valid restricted artifact, 3 zero project partitions, 10 zero resource classes, 13 measurements, and 0 assigned-zero failures.
- **Commit standards:** Passed; all five implementation commits use Conventional Commit subjects and the required Copilot co-author trailer.
- **Scope and architecture:** Passed; the complete 44-file branch diff matches T-1 through T-9, existing ADRs, decision records 90–94, and affected core-component contracts.

## Documentation Review

- README and usage commands: passed.
- API/public payload and specification impact: passed; no public contract expansion.
- Configuration and examples: passed; proof-only finite/offline settings are accurate.
- Migration/upgrade impact: passed; no schema or migration change is required.
- Architecture documentation: passed; stable-ID ownership, exact snapshot checks, token privacy, settlement, and cleanup match implementation.
- Operational/deployment impact: passed; cleanup/audit procedures are documented and deployment behavior is unchanged.

## Observation Evidence

- `DL-690` — source inspection backtracked because `rg` was unavailable.
- `WIN-041` — focused BL-013 Chromium gate exceeded 30 seconds and passed.
- `WIN-042` — authoritative `just verify` exceeded 30 seconds and passed.
- `DL-691` — PR body generation backtracked from unavailable `python` to `python3`.

## Final State

Pull request created, Issue #31 acceptance checkboxes updated, verified branch pushed, and the repository was clean before this generated summary commit.
