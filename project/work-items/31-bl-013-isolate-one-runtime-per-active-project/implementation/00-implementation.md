# Implementation Notes: BL-013 Isolate One Runtime per Active Project

## Status

Implementation tasks T-1 through T-9 and the verifier-requested corrections are complete. This record supplies implementation evidence to Verify and does not claim final acceptance.

## Completed Tasks

- **T-1:** Retained one stable-ID entry map and added exact immutable running-snapshot ownership validation for proxy target selection.
- **T-2:** Executed 24 interleaved calls plus real A/B/C process launches with per-project argv, canonical cwd, OS user, environment allowlist, and peer-fixture exclusion.
- **T-3:** Executed five independent B faults, both cancellation cases, one replacement, and independent global-shutdown/shutdown-race episodes.
- **T-4:** Executed all 24 ordered mismatch rows through HTTP request or WebSocket upgrade boundaries with exact manager-ownership rejection.
- **T-5:** Preserved four-field SQLite and public project contracts; Chromium now uses an actual disposable SQLite library.
- **T-6:** Replaced assertion-only rows with the schema-version-2 executable matrix and strict execution/event/audit/scan mutation guards.
- **T-7:** Enhanced the real Chromium episode with post-crash A/C terminal commands, exact per-project Management/ExtensionHost roles, and correlated B replacement identity/event/route evidence.
- **T-8:** Replaced assigned cleanup zeros with measured ten-class cleanup and independent initial/replacement identity, listener, database, fixture, and restricted-artifact audits.
- **T-9:** Updated README, runtime, routing, API, harness, architecture, and implementation evidence claims and counts.

## Acceptance Evidence

- **AC-1:** `project-runtime-manager.ts` retains registered/starting/running/failed entries in one stable-ID map; the executable source guard rejects singleton/path/name-key fixtures.
- **AC-2:** Fake and Chromium artifacts correlate three pairwise-distinct PID/start/port/start-time identity digests, routes, and owner tokens; browser A/C remain unchanged and B changes once.
- **AC-3:** `interleaved-24` executes 24 calls, records three launches/readiness results, eight identical object results per project, and distinct project outcomes.
- **AC-4:** `project-runtime-process.test.ts` launches three real fixture processes and checks exact final argv path, cwd, user, full allowlist, and cross-fixture exclusion; fake evidence retains safe launch classifications/digests.
- **AC-5:** Chromium executes Explorer, editor sentinel, `pwd -P`, Git root/branch/status/config, and terminal marker checks for three disposable Git repositories.
- **AC-6:** Proxy resolution now requires both field invariants and `ProjectRuntimeManager.ownsSnapshot`; matching Chromium traffic records project-local route/socket roles.
- **AC-7:** Schema-minimization tests retain four columns and public fields with zero runtime canaries; Chromium opens and exactly removes an actual disposable SQLite database/sidecars.
- **AC-8:** Every one of 12 scenarios owns unique execution/event IDs and nonempty actual runtime/proxy events with matching opaque tokens, allowed state/transport, elapsed, and classification fields.
- **AC-9:** Five fake scan sources plus the Chromium public scan derive literal/encoded matches from actual bytes; residual output reports six scans, zero public/restricted protected matches, and rejects assigned scans.
- **AC-10:** A/B/C reuse rows return each exact project-local object; Chromium preserves A/C and explicitly replaces only B.
- **AC-11:** Malformed, unknown, and closed route requests execute while A/B/C run; before/after snapshot/process/listener/route/project-event digests and all three terminal probes remain unchanged.
- **AC-12:** All 24 ordered project-route, HTTP-target, WebSocket-target, and frame-destination rows carry unique execution and request/upgrade IDs, exact mismatch failure, zero nonmatching contact, and measured cleanup.
- **AC-13:** Separate early-exit, crash, readiness, health, and proxy-reset rows run through manager/process/proxy paths and retain unchanged A/C identity, route, listener, and terminal-sentinel checks.
- **AC-14:** Replacement evidence records one explicit new B identity, stable B route/token, no automatic generation, and unchanged peers.
- **AC-15:** The all-caller case records eight B cancellations, no B running caller, exact orphan cleanup, and successful A/C terminal probes.
- **AC-16:** The one-caller case records one cancellation, seven identical B running results from one spawn, and safe A/C identity/route/listener/terminal evidence.
- **AC-17:** Global shutdown records three project audits, A graceful/B escalated/C cancelled logical outcomes, exact physical cleanup, and unrelated-control survival.
- **AC-18:** A separate shutdown-race execution proves memoized shutdown, during/after typed rejection, late settlement suppression, zero stale entries/background work, and control survival.
- **AC-19:** `fake-matrix.json` schema version 2 contains 12 executable scenarios, 24 executable mismatch rows, actual events/audits, negative mutations, finite bounds, and measured residual union.
- **AC-20:** The production source guard passes; singleton, path-keyed, and name-keyed fixtures fail; copied-event, missing-ID, assigned-scan, and assigned-cleanup mutations fail.
- **AC-21:** The no-retry Chromium episode holds A/B/C concurrently, terminates exact B authority, reruns A/C terminal commands, opens one fresh replacement B workflow, and correlates replacement evidence.
- **AC-22:** Public artifacts retain only tokens/digests/classes; one ignored mode-0600 restricted artifact correlates exact initial/current identities, routes, API/web authority, socket roles, events, and cleanup.
- **AC-23:** Residual output independently reports three zero project partitions, all ten resource classes at zero, 13 exact measurements, zero runtime-data directories, fixture integrity, and control survival/cleanup.
- **AC-24:** README, runtime, routing, API, harness, architecture, and this evidence record document ownership, concurrency, faults, mismatch rows, scans, Chromium roles, and cleanup.
- **AC-25:** `just verify` exits zero with formatting, lint, type checks, unit tests, builds, BL-004/010/011/012 gates, Chromium regressions, and BL-013 residual audit.
- **AC-26:** Evidence declares local-only, finite, offline, no credential, no hosted resource, no retry, and no manual judgment; commands are root-justfile recipes.
- **AC-27:** Chromium scope remains `immediate concurrent isolation only; no BL-014 session continuity claim`; docs retain BL-014/BL-015/lifecycle exclusions.

## Documentation Evidence

- `README.md`: schema-version-2 counts, process launch context, 12 scenarios, 24 proxy rows, cancellation/shutdown outcomes, Chromium roles, and measured residual behavior.
- `docs/project-runtime.md`: exact snapshot ownership, executable scenario/event contracts, scans, Chromium replacement, and ten-class cleanup.
- `docs/stable-workbench-routing.md`: exact manager-owned snapshot check, request/upgrade mismatch evidence, five B faults, and privacy/audit boundaries.
- `apps/api/src/routes/README.md`: unchanged API/schema plus exact running-snapshot ownership and paved commands.
- `.harness/engineering-harness.md`: corrected BL-013 signal, artifact schema/counts, and independent residual scope.
- Architecture: runtime/proxy core-components and Decision Log record the exact manager-owned snapshot boundary. No ADR deviation was required.
- No migration note or deployment change is required: public API, SQLite schema, defaults, and runtime operations are unchanged. The test-only evidence schema is generated and ignored.

## Validation Evidence

- `just verify-focused`: PASS — 86 files passed, 1 designated file skipped; 580 tests passed, 2 skipped.
- `just verify-project-runtime-isolation`: PASS — 8 Vitest files/36 tests, one no-retry Chromium test, then residual audit.
- BL-013 residual: PASS — schema 2, 2 public artifacts, 6 protected scans, 0 public/restricted matches, 1 valid restricted artifact, 3 zero project partitions, 10 zero resource classes, 13 independent measurements, and 0 assigned-zero failures.
- `just verify`: PASS — complete prior regressions and final BL-013 Chromium/residual gate exited zero.

## Observation Evidence

Real `harness observe` captures for this correction: DL-599 through DL-609, CONF-097, INS-131, COORD-070 through COORD-074. They cover unavailable local tools, bounded file-read retries, focused/type/format/browser failures, Chromium reconnect behavior, documentation retries, and validation waits over 30 seconds.
