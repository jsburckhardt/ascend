# Implementation Notes: BL-013 Isolate One Runtime per Active Project

## Status

Implementation tasks T-1 through T-9 are complete. This record provides implementation and validation evidence for Verify; it does not claim final acceptance.

## Completed Tasks

- T-1: Defined one stable-project-ID-keyed discriminated runtime entry map and immutable route/token snapshots.
- T-2: Implemented and proved 24 interleaved A/B/C starts, project-local single-flight, launch context, invalid-ID immutability, and health reuse.
- T-3: Isolated failure, cancellation, explicit replacement, and memoized global shutdown races by project.
- T-4: Added fail-closed proxy snapshot, target, resource, frame, event, and per-project audit checks.
- T-5: Extended SQLite and public four-field payload canaries without schema or migration changes.
- T-6: Added the versioned execution-backed fake matrix, strict evidence validator, mutation guards, and residual union.
- T-7: Added the no-retry real Chromium A/B/C Git-fixture episode with test-authority B termination and explicit replacement.
- T-8: Added public/restricted evidence policy and per-project/global cleanup audits.
- T-9: Added paved recipes, regression composition, documentation contracts, application docs, and architecture explanations.

## Acceptance Evidence

- **AC-1:** `project-runtime-manager.test.ts` holds registered, starting, running, and failed A/B/C entries simultaneously in one `Map<string, ProjectRuntimeEntry>` and the contract guard accepts only stable-ID keying.
- **AC-2:** The manager tests and Chromium artifact record frozen A/B/C snapshots with PID/start identity, loopback target class, canonical-path class, stable route, start time, and deterministic owner token; `pairwiseDistinct` passes.
- **AC-3:** The executable fake matrix issues 24 explicitly interleaved calls and records exactly three launch/readiness sequences with eight project-local identical snapshot results per project.
- **AC-4:** Fake-matrix launch observations classify each project argv, working directory, user, and environment and report zero peer-fixture matches.
- **AC-5:** `three-project-chromium.json` records three distinct Git fixture outcomes for Explorer, editor sentinel, terminal, repository root, branch, dirty status, and local configuration.
- **AC-6:** Proxy HTTP/WebSocket tests and the Chromium stable-route ledger require matching snapshot ID, canonical path, stable route, owner token, target port, and destination token before forwarding.
- **AC-7:** `project-schema-minimization.test.ts` proves the existing four SQLite columns and four public fields, zero runtime-canary database bytes, unchanged reopen data, and no migration.
- **AC-8:** The fake artifact has 11 passing scenarios with six nonempty token-attributed events each; lifecycle serialization and proxy records share the deterministic opaque project token.
- **AC-9:** Three protected scan partitions pass with zero raw paths, ports, command/environment values, terminal/Git content, source sentinels, or seeded secret-like values. The final public audit reports `publicProtectedMatches: 0`.
- **AC-10:** Manager reuse tests preserve only the selected project identity, port, and start time; the browser episode retains A/C identities while replacing B only.
- **AC-11:** Unknown, malformed, closed, and mismatch cases fail before mutation; before/after peer snapshots and deliveries remain unchanged.
- **AC-12:** `fake-matrix.json` contains 24 ordered ID/path/HTTP-target/WebSocket-target/frame-destination mismatch rows, all fail closed with no nonmatching delivery.
- **AC-13:** Fake rows cover early exit, crash, readiness, health, and proxy failure for B while A/C snapshots, listeners, routes, and terminal checks remain unchanged.
- **AC-14:** Fake and Chromium evidence record no automatic retry and exactly one explicit B replacement with a new B identity and unchanged A/C identities.
- **AC-15:** The all-waiter cancellation row returns eight B cancellations, cleans the B owner, and completes A/C starts.
- **AC-16:** The one-waiter cancellation row returns one B cancellation while seven callers share one B snapshot from one spawn; A/C remain unchanged.
- **AC-17:** Global shutdown returns one token-attributed audit per owner within finite bounds, leaves the unrelated control live, and exposes no public per-project Stop or Restart operation.
- **AC-18:** The shutdown matrix proves memoized repeated shutdown, typed starts during and after shutdown, no new owner, and unrelated-control survival.
- **AC-19:** `test-results/bl-013/runtime-isolation/fake-matrix.json` is schema version 1, has 11 execution-backed scenarios, 24 cross-target rows, finite bounds, all mutation guards, and a zero process/listener/socket/operation residual union.
- **AC-20:** The source guard reports production accepted and singleton, path-key, and name-key fixtures rejected.
- **AC-21:** The no-retry Chromium test keeps three Git workbenches active concurrently, terminates B through repository-only exact authority, proves A/C retained state, and explicitly replaces only B.
- **AC-22:** Public fake and Chromium artifacts correlate safe digests/tokens and redact protected values. The final audit reports two public artifacts, zero protected matches, and exactly one valid ignored mode-0600 restricted artifact.
- **AC-23:** Final residual evidence reports zero for all three project partitions, global resources, and runtime-data directories; fixture integrity passes and the unrelated control survives then is cleaned.
- **AC-24:** The documentation contract passes across root/runtime/routing/API/harness/core docs and verifies explicit BL-014, BL-015, public lifecycle, and broader-lifecycle exclusions.
- **AC-25:** Final `just verify` exits zero and includes BL-004 capacity, BL-010 runtime, BL-011 stable route, BL-012 navigation, RPIV harness, and BL-013 regressions.
- **AC-26:** Fake and browser evidence declare repository-local fixtures, finite bounds, no retry, no hosted service, credential, network prerequisite, or manual judgment.
- **AC-27:** Browser evidence scope is exactly `immediate concurrent isolation only; no BL-014 session continuity claim`; documentation tests reject wider continuity claims.

## Evidence Artifacts

Generated evidence remains ignored under `test-results/bl-013/runtime-isolation/`:

- `fake-matrix.json` — public versioned fake matrix and contract guards.
- `three-project-chromium.json` — public redacted browser episode.
- `restricted-authority.json` — sole ignored mode-0600 authority artifact.
- `residual-audit.json` — final public/restricted and cleanup verdict.

## Documentation Evidence

- `README.md`: user-facing per-project ownership, isolation, designated commands, evidence, cleanup, and exclusions.
- `docs/project-runtime.md`: entry states, cancellation/failure/replacement behavior, ephemeral user-data cleanup, fake/browser evidence, and commands.
- `docs/stable-workbench-routing.md`: cross-target protection, token-attributed audits, mismatch matrix, and deferred boundaries.
- `apps/api/src/routes/README.md`: unchanged four-field API and absence of public lifecycle routes.
- `.harness/engineering-harness.md`: BL-013 designated and independent audit surfaces; boot remains non-persistent and test-backed.
- `CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md`, `CORE-COMPONENT-260808-structured-runtime-logging.md`, and `CORE-COMPONENT-260812-stable-workbench-proxy.md`: stable-ID ownership, opaque logging, proxy attribution, and cleanup integration.
- `project/architecture/ADR/DECISION-LOG.md`: records 90-94 and corrected zero-waiter record 56. No ADR contract deviation was required.
- No migration note is required: SQLite schema, public payloads, and configuration defaults are unchanged. No deployment procedure changes are required; runtime-user-data isolation is automatic and ephemeral.

## Validation Evidence

- `just verify-focused`: PASS; 86 files passed, 1 skipped; 579 tests passed, 2 skipped.
- `just verify-project-runtime-isolation`: PASS; 8 Vitest files and 36 tests, then one no-retry Chromium test, then residual audit.
- `just proof-project-runtime-isolation-residual-audit`: PASS; 2 public artifacts, 0 protected matches, 1 valid restricted artifact, 3 zero project partitions, 0 global/runtime-data residuals.
- `just verify-project-runtime`: PASS; 5 files and 35 tests.
- `just proof-project-runtime`: PASS; one real runtime episode.
- `just proof-project-runtime-residual-audit`: PASS; zero PID/listener residuals.
- `just verify-workbench-route`: PASS; 10 files and 54 tests, one Chromium proof, and residual audit.
- `just verify-home-workbench`: PASS; 7 files and 44 tests, three Chromium scenarios, and residual audit.
- `just proof-workbench-capacity-audit`: PASS; 3 retained runs, no active or attributed residuals, fixture integrity unchanged.
- `just verify`: PASS after formatting and type corrections. Final tracked diff hash was `c5e2d189bc878e35b6643a3e8ed71cff43f1bf78` before and after the hash-stable run.
- Harness boot readiness remains covered by `just verify-rpiv-harness` within `just verify`; no standalone non-root validation command was introduced.

## Observation Evidence

Qualifying implementation friction was captured through the real harness. Existing episode captures span DL-565 through DL-588 and INS-123 through INS-127. Final documentation and validation captures are DL-589 through DL-595 and INS-128 through INS-130, covering focused/full failures, retries, TypeScript correction, formatting correction, and validation waits over thirty seconds.
