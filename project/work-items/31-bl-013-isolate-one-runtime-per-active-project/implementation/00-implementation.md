# Implementation Notes: BL-013 Isolate One Runtime per Active Project

## Status

Implementation tasks T-1 through T-9 and the verifier-requested corrections are complete. This record supplies implementation evidence to Verify and does not claim final acceptance.

## Completed Tasks

- **T-1:** Retained one stable-ID entry map and added exact immutable running-snapshot ownership validation for proxy target selection.
- **T-2:** Executed 24 interleaved calls plus real A/B/C process launches with per-project argv, canonical cwd, OS user, environment allowlist, and peer-fixture exclusion.
- **T-3:** Executed five independent B faults, both cancellation cases, one replacement, and independent global-shutdown/shutdown-race episodes. Shutdown now cancels and awaits tracked completion and process-exit promises until their settlement handlers remove them, without clearing task sets; delayed completion and post-return audits prove no repopulation while the unrelated process/listener survives. Both shutdown episodes retain real high-resolution `process.hrtime.bigint` start/end/elapsed measurements for manager shutdown, tracked-task settlement, each A/B/C cleanup, and delayed post-return observation, with every elapsed value checked against its configured bound.
- **T-4:** Executed 18 ordered route/HTTP/WebSocket target mismatches before forwarding and six frame-destination rows through live source and mismatched-target WebSocket controls. The production frame boundary attempts target-socket selection for hashed text/binary frames, rejects both sends with exact source close/callback outcomes, records both endpoint receipt counters at zero, and retains a successful target-control echo.
- **T-5:** Preserved four-field SQLite and public project contracts; Chromium now uses an actual disposable SQLite library.
- **T-6:** Enforced the schema-version-2 matrix’s exact 70-record scenario event catalog, a fixture persisted and removed through the committed close API before closed start/route attempts, and negative mutations for rightful-only frames, unknown-as-closed evidence, identical Git statuses, cleared-without-settlement tasks, prior malformed/incomplete cases, and assigned-duration, over-bound, or failed timing cases.
- **T-7:** Gave A/B/C distinct untracked filenames and exact Git status bytes, required project-specific integrated-terminal status output and three distinct public digests, reused active A/C terminals after B crash, used exact group plus PID/start-identity B authority and a fresh B replacement context, and retained exact socket/replacement evidence.
- **T-8:** Replaced assigned cleanup zeros with measured ten-class cleanup and independent initial/replacement identity, listener, database, fixture, and restricted-artifact audits.
- **T-9:** Updated README, runtime, routing, API, harness, architecture, task, and implementation evidence to distinguish 18 pre-forward failures from six rejected frame-destination attempts, exact persisted-close behavior, distinct Chromium Git statuses, 70 events, tracked settlement/post-return provenance, the encoded stable-ID URL, public-safe one-way token correlation, and explicitly restricted authority evidence.

## Acceptance Evidence

- **AC-1:** `project-runtime-manager.ts` retains registered/starting/running/failed entries in one stable-ID map; the executable source guard rejects singleton/path/name-key fixtures.
- **AC-2:** Fake and Chromium artifacts correlate three pairwise-distinct PID/start/port/start-time identity digests, routes, and owner tokens; browser A/C remain unchanged and B changes once.
- **AC-3:** `interleaved-24` executes 24 calls, records three launches/readiness results, eight identical object results per project, and distinct project outcomes.
- **AC-4:** `project-runtime-process.test.ts` launches three real fixture processes and checks exact final argv path, cwd, user, full allowlist, and cross-fixture exclusion; fake evidence retains safe launch classifications/digests.
- **AC-5:** Chromium executes Explorer, editor sentinel, `pwd -P`, Git root/branch/status/config, and terminal marker checks for three disposable Git repositories; statuses use distinct filenames, exact expected terminal bytes, and three unique evidence digests.
- **AC-6:** Proxy resolution now requires both field invariants and `ProjectRuntimeManager.ownsSnapshot`; matching Chromium traffic records project-local route/socket roles.
- **AC-7:** Schema-minimization tests retain four columns and public fields with zero runtime canaries; Chromium opens and exactly removes an actual disposable SQLite database/sidecars.
- **AC-8:** All 12 scenarios match an exact 70-record runtime/proxy catalog: scenario order/count, event ID, safe opaque token attribution, state or transport, failure/replacement classification, and zero-or-within-suite elapsed class are validated; missing, wrong, extra, misattributed, reordered, and unsafe-token mutations fail.
- **AC-9:** Five fake scan sources plus the Chromium public scan derive literal/encoded matches from actual bytes; residual output reports six scans, zero public/restricted protected matches, and rejects assigned scans.
- **AC-10:** A/B/C reuse rows return each exact project-local object; Chromium preserves A/C and explicitly replaces only B.
- **AC-11:** Malformed and unknown remain separate. A fourth fixture is persisted, removed through `DELETE /api/projects/:id`, confirmed absent, then started directly and routed while A/B/C run; launch/event/manager/proxy counts, peer snapshots, listeners, routes, and terminal probes remain unchanged.
- **AC-12:** The 24 exact ordered rows contain 18 pre-forward target failures and six post-upgrade frame rows. Each frame row attempts a live mismatched target socket, records two send attempts, exact abnormal source close/send-callback failures, zero source and target frame receipts, one target-control receipt, source/target token/route/socket correlation, and measured cleanup; rightful-only substitutions fail validation.
- **AC-13:** Separate early-exit, crash, readiness, health, and proxy-reset rows run through manager/process/proxy paths and retain unchanged A/C identity, route, listener, and terminal-sentinel checks.
- **AC-14:** Replacement evidence records one explicit new B identity, stable B route/token, no automatic generation, and unchanged peers.
- **AC-15:** The all-caller case records eight B cancellations, no B running caller, exact orphan cleanup, and successful A/C terminal probes.
- **AC-16:** The one-caller case records one cancellation, seven identical B running results from one spawn, and safe A/C identity/route/listener/terminal evidence.
- **AC-17:** Global shutdown records three project audits, A graceful/B escalated/C cancelled logical outcomes, exact physical cleanup, real bounded monotonic shutdown/settlement/project-cleanup/post-return durations, and unrelated-control survival.
- **AC-18:** A separate shutdown race proves memoization and typed during/after rejection. A delayed launch would register ownership if shutdown returned early; shutdown awaits it and process-exit tasks, settlement counters advance, immediate and 40 ms post-return audits remain identical at zero, and assigned-duration, over-bound, failed-duration, assigned-zero, or cleared-without-settlement mutations fail.
- **AC-19:** `fake-matrix.json` schema version 2 contains 12 executable scenarios, 70 exact events, a real persisted-close row, 24 mismatch rows including target-socket frame attempts, measured monotonic shutdown/settlement/A-B-C-cleanup/post-return audits, required assigned-duration/over-bound/failed-duration negative mutations, and a measured residual union.
- **AC-20:** The production source guard passes; singleton, path-keyed, and name-keyed fixtures fail; copied-event, missing-ID, assigned-scan, and assigned-cleanup mutations fail.
- **AC-21:** The no-retry Chromium episode holds A/B/C concurrently, terminates exact B group and PID/start authority, reruns A/C terminal commands, opens one fresh-context replacement B workflow, and correlates replacement evidence.
- **AC-22:** Public artifacts may retain the declared one-way project token plus safe digests/classes; their stable URLs contain the encoded stable project ID, and they exclude raw canonical paths, internal ports/authorities, credentials, and secrets. One ignored mode-0600 restricted artifact correlates explicitly allowed exact initial/current identities, routes, API/web authority, socket roles, events, and cleanup.
- **AC-23:** Residual output independently reports three zero project partitions, all ten resource classes at zero, 13 exact measurements, zero runtime-data directories, fixture integrity, and control survival/cleanup.
- **AC-24:** README, runtime, routing, API, harness, architecture, and this evidence record document ownership, concurrency, faults, mismatch rows, scans, Chromium roles, monotonic shutdown timing, cleanup, encoded stable-ID URLs, public-safe one-way token correlation, and restricted authority boundaries.
- **AC-25:** `just verify` exits zero with formatting, lint, type checks, unit tests, builds, BL-004/010/011/012 gates, Chromium regressions, and BL-013 residual audit.
- **AC-26:** Evidence declares local-only, finite, offline, no credential, no hosted resource, no retry, and no manual judgment; commands are root-justfile recipes.
- **AC-27:** Chromium scope remains `immediate concurrent isolation only; no BL-014 session continuity claim`; docs retain BL-014/BL-015/lifecycle exclusions.

## Documentation Evidence

- `README.md`: 12-scenario/70-event counts, 18 target failures plus six executed frame rows, bounded monotonic manager/task/project-cleanup/post-return shutdown evidence, encoded stable-ID and one-way token boundaries, Chromium roles, and measured residual behavior.
- `docs/project-runtime.md`: exact event mutations, rejected frame destination attempts, persisted close, settled task/post-return audits with real monotonic start/end/elapsed/bounds, public-safe token versus restricted authority policy, exact Chromium status evidence, control survival, and ten-class cleanup.
- `docs/stable-workbench-routing.md`: distinguishes pre-forward snapshot rejection from post-upgrade mismatched-destination send rejection; documents persisted-close plus monotonic shutdown timing validators; and corrects the encoded stable-ID URL, one-way public-safe token, and restricted authority contract.
- `apps/api/src/routes/README.md`: unchanged API/schema plus corrected 70-event, 18-target, six-frame, and shutdown-audit gate scope.
- `.harness/engineering-harness.md`: corrected BL-013 event/frame/close/status/settlement signals and independent residual scope.
- Architecture: runtime/proxy/logging core-components now require measured monotonic manager/task/project-cleanup/post-return audits, correct stable-ID/token/evidence boundaries, and real post-upgrade frame-destination evidence while retaining the exact manager-owned snapshot boundary. No ADR deviation or new ADR was required.
- No migration note or deployment change is required: public API, SQLite schema, defaults, and runtime operations are unchanged. The test-only evidence schema is generated and ignored. The 30,000 ms browser-operation bound, fresh replacement context, exact group/identity test authority, and 200 ms test-only proxy fault bound stabilize validation under suite contention; they do not change setup, public API, configuration, deployment, or runtime operations. Application behavior changes are documented in README, runtime/routing/API/harness guides and all three affected core-component contracts; no migration note is required.

## Validation Evidence

- `just verify-focused` targeted regressions: PASS repeatedly for manager/lifecycle, evidence/negative validators, documentation, HTTP/WebSocket proxy, and route acceptance suites; the final focused BL-013 Vitest gate was 8 files/39 tests; final targeted timing/docs/isolation/contention validation was 4 files/8 tests, and the final timing-only correction run was 1 file/4 tests.
- `just verify-project-runtime-isolation`: PASS — 8 Vitest files/39 tests, one no-retry Chromium test (38.0 seconds in the final full run), then residual audit.
- BL-013 residual: PASS — schema 2, 2 public artifacts, 6 protected scans, 0 public/restricted matches, 1 valid restricted artifact, 3 zero project partitions, 10 zero resource classes, 13 independent measurements, and 0 assigned-zero failures.
- `just verify`: PASS on the final rerun — formatting, lint, type checks, 83 passing and 1 skipped unit files with 562 passing and 2 skipped tests, builds, browser regressions, BL-004/010/011/012 gates, and final BL-013 Chromium/residual gate. Correction runs exposed non-settling process-exit mocks and full-suite contention in proxy fault classification and command-palette terminal opening; mocks now settle, the injected fault bound remains finite at 200 ms, and the 30,000 ms browser-operation bound plus a fresh B context avoids restored terminal state without changing product behavior.

## Observation Evidence

Real `harness observe` captures for this correction include DL-643 through DL-689, CONF-100 through CONF-103, INS-133, INS-135, INS-136, SUGG-018, and WIN-034 through WIN-040. They cover unavailable tooling, edit retries, focused/full failures, strict-validator diagnosis, Chromium/full waits over 30 seconds, terminal-continuity improvement, and successful browser/full gates.
