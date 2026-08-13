# Implementation Notes: BL-013 Isolate One Runtime per Active Project

## Status

Implementation tasks T-1 through T-9 and the verifier-requested corrections are complete. This record supplies implementation evidence to Verify and does not claim final acceptance.

## Completed Tasks

- **T-1:** Retained one stable-ID entry map and added exact immutable running-snapshot ownership validation for proxy target selection.
- **T-2:** Executed 24 interleaved calls plus real A/B/C process launches with per-project argv, canonical cwd, OS user, environment allowlist, and peer-fixture exclusion.
- **T-3:** Executed five independent B faults, both cancellation cases, one replacement, and independent global-shutdown/shutdown-race episodes; a bounded manager audit now measures zero stale entries, ownership records, completion tasks, and background tasks plus unrelated process/listener survival.
- **T-4:** Executed 18 ordered route/HTTP/WebSocket target mismatches before forwarding and six frame-destination rows through real source and mismatched-target WebSocket controls with hashed text/binary frames, receipt IDs, rightful echoes, and zero mismatched receipt.
- **T-5:** Preserved four-field SQLite and public project contracts; Chromium now uses an actual disposable SQLite library.
- **T-6:** Enforced the schema-version-2 matrix’s exact 70-record scenario event catalog and added missing, wrong, extra, misattributed, reordered, unsafe-token, incomplete AC-12, and unmeasured AC-18 negative mutations.
- **T-7:** Enhanced the real Chromium episode with post-crash A/C terminal commands, exact per-project Management/ExtensionHost roles, and correlated B replacement identity/event/route evidence.
- **T-8:** Replaced assigned cleanup zeros with measured ten-class cleanup and independent initial/replacement identity, listener, database, fixture, and restricted-artifact audits.
- **T-9:** Updated README, runtime, routing, API, harness, architecture, task, and implementation evidence to distinguish 18 pre-forward failures, six frame-delivery rows, 70 exact events, and measured shutdown-race provenance.

## Acceptance Evidence

- **AC-1:** `project-runtime-manager.ts` retains registered/starting/running/failed entries in one stable-ID map; the executable source guard rejects singleton/path/name-key fixtures.
- **AC-2:** Fake and Chromium artifacts correlate three pairwise-distinct PID/start/port/start-time identity digests, routes, and owner tokens; browser A/C remain unchanged and B changes once.
- **AC-3:** `interleaved-24` executes 24 calls, records three launches/readiness results, eight identical object results per project, and distinct project outcomes.
- **AC-4:** `project-runtime-process.test.ts` launches three real fixture processes and checks exact final argv path, cwd, user, full allowlist, and cross-fixture exclusion; fake evidence retains safe launch classifications/digests.
- **AC-5:** Chromium executes Explorer, editor sentinel, `pwd -P`, Git root/branch/status/config, and terminal marker checks for three disposable Git repositories.
- **AC-6:** Proxy resolution now requires both field invariants and `ProjectRuntimeManager.ownsSnapshot`; matching Chromium traffic records project-local route/socket roles.
- **AC-7:** Schema-minimization tests retain four columns and public fields with zero runtime canaries; Chromium opens and exactly removes an actual disposable SQLite database/sidecars.
- **AC-8:** All 12 scenarios match an exact 70-record runtime/proxy catalog: scenario order/count, event ID, safe opaque token attribution, state or transport, failure/replacement classification, and zero-or-within-suite elapsed class are validated; missing, wrong, extra, misattributed, reordered, and unsafe-token mutations fail.
- **AC-9:** Five fake scan sources plus the Chromium public scan derive literal/encoded matches from actual bytes; residual output reports six scans, zero public/restricted protected matches, and rejects assigned scans.
- **AC-10:** A/B/C reuse rows return each exact project-local object; Chromium preserves A/C and explicitly replaces only B.
- **AC-11:** Malformed, unknown, and closed route requests execute while A/B/C run; before/after snapshot/process/listener/route/project-event digests and all three terminal probes remain unchanged.
- **AC-12:** The 24 exact ordered rows contain 18 pre-forward route/HTTP/WebSocket target failures and six post-upgrade frame rows. Each frame row records source/target boundaries, two unique hashed text/binary execution IDs, two source receipt IDs, one target-control receipt, zero mismatched-target receipts, exact source/target tokens, and measured cleanup; missing/wrong/extra/misattributed/order mutations fail.
- **AC-13:** Separate early-exit, crash, readiness, health, and proxy-reset rows run through manager/process/proxy paths and retain unchanged A/C identity, route, listener, and terminal-sentinel checks.
- **AC-14:** Replacement evidence records one explicit new B identity, stable B route/token, no automatic generation, and unchanged peers.
- **AC-15:** The all-caller case records eight B cancellations, no B running caller, exact orphan cleanup, and successful A/C terminal probes.
- **AC-16:** The one-caller case records one cancellation, seven identical B running results from one spawn, and safe A/C identity/route/listener/terminal evidence.
- **AC-17:** Global shutdown records three project audits, A graceful/B escalated/C cancelled logical outcomes, exact physical cleanup, and unrelated-control survival.
- **AC-18:** A separate shutdown-race execution proves memoized shutdown, during/after typed rejection, and late settlement suppression. After a 1,000 ms bounded wait, `ProjectRuntimeManager.audit()` independently measures zero entries, starting entries, ownership records, completion tasks, and background tasks; process and listener probes prove control survival, and assigned-zero/missing-provenance mutations fail.
- **AC-19:** `fake-matrix.json` schema version 2 contains 12 executable scenarios, 70 exact event records, 24 executable mismatch rows, measured shutdown audits, comprehensive negative mutations, finite bounds, and a measured residual union.
- **AC-20:** The production source guard passes; singleton, path-keyed, and name-keyed fixtures fail; copied-event, missing-ID, assigned-scan, and assigned-cleanup mutations fail.
- **AC-21:** The no-retry Chromium episode holds A/B/C concurrently, terminates exact B authority, reruns A/C terminal commands, opens one fresh replacement B workflow, and correlates replacement evidence.
- **AC-22:** Public artifacts retain only tokens/digests/classes; one ignored mode-0600 restricted artifact correlates exact initial/current identities, routes, API/web authority, socket roles, events, and cleanup.
- **AC-23:** Residual output independently reports three zero project partitions, all ten resource classes at zero, 13 exact measurements, zero runtime-data directories, fixture integrity, and control survival/cleanup.
- **AC-24:** README, runtime, routing, API, harness, architecture, and this evidence record document ownership, concurrency, faults, mismatch rows, scans, Chromium roles, and cleanup.
- **AC-25:** `just verify` exits zero with formatting, lint, type checks, unit tests, builds, BL-004/010/011/012 gates, Chromium regressions, and BL-013 residual audit.
- **AC-26:** Evidence declares local-only, finite, offline, no credential, no hosted resource, no retry, and no manual judgment; commands are root-justfile recipes.
- **AC-27:** Chromium scope remains `immediate concurrent isolation only; no BL-014 session continuity claim`; docs retain BL-014/BL-015/lifecycle exclusions.

## Documentation Evidence

- `README.md`: 12-scenario/70-event counts, 18 target failures plus six executed frame rows, bounded manager-audit shutdown evidence, Chromium roles, and measured residual behavior.
- `docs/project-runtime.md`: exact event mutation contract, frame execution/receipt evidence, independently measured shutdown maps/control survival, Chromium replacement, and ten-class cleanup.
- `docs/stable-workbench-routing.md`: distinguishes pre-forward snapshot rejection from post-upgrade frame delivery and documents exact event and shutdown-audit validators.
- `apps/api/src/routes/README.md`: unchanged API/schema plus corrected 70-event, 18-target, six-frame, and shutdown-audit gate scope.
- `.harness/engineering-harness.md`: corrected BL-013 event/frame/audit signal counts and independent residual scope.
- Architecture: runtime/proxy core-components now require measured manager task/owner audits and real post-upgrade frame-destination evidence while retaining the exact manager-owned snapshot boundary. No ADR deviation or new ADR was required.
- No migration note or deployment change is required: public API, SQLite schema, defaults, and runtime operations are unchanged. The test-only evidence schema is generated and ignored. Parallel residual artifact traversal is an internal validation-performance correction with no setup, usage, API, configuration, deployment, or operational documentation impact.

## Validation Evidence

- `just verify-focused` targeted regressions: PASS repeatedly — acceptance/event/frame/shutdown validator, manager, documentation, and proxy HTTP suites; latest comprehensive set was 4 files/25 tests.
- `just verify-project-runtime-isolation`: PASS — 8 Vitest files/36 tests, one real no-retry Chromium test (latest full-gate run 32.1 seconds), then residual audit.
- BL-013 residual: PASS — schema 2, 2 public artifacts, 6 protected scans, 0 public/restricted matches, 1 valid restricted artifact, 3 zero project partitions, 10 zero resource classes, 13 independent measurements, and 0 assigned-zero failures.
- `just verify`: PASS on the final rerun — formatting, lint, type checks, 83 unit files/559 tests plus skips, builds, prior BL-004/010/011/012 gates, browser regressions, and final BL-013 Chromium/residual gate exited zero. An earlier rerun exposed a 10-second stable-route residual inventory timeout under suite contention; parallel directory traversal reduced the focused audit from about 4.8 seconds to about 1.0 second without changing audit semantics.

## Observation Evidence

Real `harness observe` captures for this correction: DL-616 through DL-637. They cover unavailable Python/ripgrep, source-aligned patch retries, focused/type/format failures, strict-validator diagnosis, bounded view retries, and Chromium/full-validation waits over 30 seconds.
