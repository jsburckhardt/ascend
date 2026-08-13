# Test Plan: BL-014 Preserve Sessions While Switching Among Projects

## Test V-0: Proxy failure events remain deterministic under contention

- **Type:** API integration and contention regression
- **Task:** T-0
- **Acceptance Criteria:** AC-13, AC-17
- **Priority:** Phase 0 / Blocking

### Setup
Use the existing 23-row stable-route failure matrix with unique execution IDs, real request/upgrade boundaries, safe project tokens, short injected finite fault bounds, and competing Vitest/API work. Keep product event and public failure behavior unchanged.

### Steps
1. Execute every failure row and await the event matching execution, token, transport, and classification.
2. Inject late, duplicate, wrong-token, wrong-transport, and missing-event mutations and require rejection.
3. Repeat the focused file under controlled suite contention with retries disabled.
4. Run the package/full topology that previously exposed the race.

### Expected Result
All 23 outcomes correlate to exactly one matching emitted failure event; no event is erased or borrowed across rows; focused, contention, and full runs pass without retry.

### Expected Evidence
- Correlated 23-row event matrix and mutation report.
- Repeated contention command results and durations.
- Product-semantic no-change diff review.

## Test V-1: Terminal parity uses measured readiness and one dispatch

- **Type:** Unit, designated Chromium, and contention regression
- **Task:** T-1
- **Acceptance Criteria:** AC-13, AC-17
- **Priority:** Phase 0 / Blocking

### Setup
Instrument the BL-001 terminal-parity episode with exact owned-listener and HTTP/browser readiness, monotonic named steps, cleanup reserve, partial failure evidence, one command dispatch, fixed evidence-derived bounds, one Playwright worker, and zero retries.

### Steps
1. Execute timing/readiness unit rows for success, never-ready timeout, wrong owner, wrong HTTP consequence, early exit, cancellation, and cleanup.
2. Mutate measurements to assigned, missing, over-bound, failed, or dispatch count above one and require rejection.
3. Run the designated proof standalone multiple times and under controlled full-suite contention.
4. Run full validation and harness boot without wrapper reruns.

### Expected Result
Readiness requires exact ownership plus the declared consequence; the terminal command is dispatched once; every step is within a retained evidence-derived bound; timeout preserves cleanup evidence; no hidden retry occurs.

### Expected Evidence
- Step timing/readiness artifact with fixed bounds and derivation.
- `dispatchCount: 1`, Playwright retry count zero, exact cleanup.
- Standalone/contention/full command records.

## Test V-2: Fixture and evidence-contract matrices reject synthetic proof

- **Type:** Unit and contract validation
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-13, AC-14
- **Priority:** Critical

### Setup
Load the repository-defined A/B/C fixture catalog, A counter contract, versioned BL-014 evidence schemas, public/restricted policy, and negative mutation fixtures.

### Steps
1. Materialize exactly three disposable Git repositories and inspect branch, committed known file, distinct dirty status, and Git sentinel.
2. Validate the A command cadence, sequence format, PID/output ownership, and ≤90 second maximum.
3. Validate a complete executed evidence fixture.
4. Apply mutations for fourth/missing project, assigned/static identity/state, duplicate start, cross-token event/socket, unchanged sequence, missing transition dimension, unsafe public authority, ambiguous restoration, missing timing, and assigned cleanup.

### Expected Result
Only the complete execution-backed three-project shape passes; every prohibited synthetic, incomplete, unsafe, duplicated, or nonadvancing shape fails.

### Expected Evidence
- Exactly-three fixture manifest and Git checks.
- Positive schema result and named negative-mutation report.
- Public/restricted policy validation.

## Test V-3: Navigation, Home, history, no-stop, and reuse matrices execute

- **Type:** Component and API integration
- **Task:** T-3
- **Acceptance Criteria:** AC-3, AC-7, AC-8, AC-9, AC-13
- **Priority:** Critical

### Setup
Render Home with exactly A/B/C through the production React component, stable URL generator, native browser-history surface, Fastify route, and instrumented per-ID runtime manager/proxy boundaries.

### Steps
1. Activate Open using keyboard and record URL, focus, generation, runtime acquisition, and event IDs.
2. Execute A→Home→B→Home→C→Home→A and the later B/C Open rows.
3. Execute one Back then Forward event pair and keep it outside the Open count.
4. Assert one card per project, Open/Close only, expected focus, and zero Close/Stop/Restart/shutdown invocation.
5. Mutate counts, focus, ordering, event IDs, reuse ownership, and row classification and require rejection.

### Expected Result
Exactly five re-entry Open rows use project-local reuse; native history is separate; Home is keyboard usable; every Home transition has zero lifecycle invocation.

### Expected Evidence
- Execution-backed component and API matrix artifacts.
- Exact five-entry and separate history ledgers.
- Three total launches and zero Home stop/shutdown counts.

## Test V-4: Designated Chromium creates exactly three isolated initial sessions

- **Type:** End-to-end Chromium
- **Task:** T-4
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-12, AC-15
- **Priority:** Critical

### Setup
Use one desktop Chromium worker with zero retries; disposable A/B/C Git fixtures and SQLite; application-owned runtime/proxy; one web process; safe event/socket observers; disabled marketplace; and an unrelated exact control listener.

### Steps
1. Register A/B/C and verify exactly one Home card for each.
2. Open B, C, then A through keyboard Home/Open flows so all are started once and A is displayed.
3. In B/C open distinct files and execute bounded cwd/root/branch/status/sentinel terminal proof.
4. In A open the known file and start the one 250 ms visible counter command.
5. Record exact restricted identities and safe public classes/digests, events, and socket roles.

### Expected Result
Exactly three starts create pairwise distinct runtime identities; each project shows only its own state; A counter begins visibly; all initial transport stays safely attributed under the stable prefix.

### Expected Evidence
- Initial restricted identity table and safe public project rows.
- Pairwise distinct file/Git/sentinel/status digests.
- Initial event/socket inventory and pre-scenario resource/manifest inventory.

## Test V-5: Keyboard switching preserves A, B, and C sessions

- **Type:** End-to-end Chromium and host sensors
- **Task:** T-5
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-12
- **Priority:** Critical

### Setup
Continue V-4 with A displayed, all three runtimes live, exact process/file sensors for A that do not touch its browser workbench, and transition/event/socket ledgers active.

### Steps
1. Record A command PID and visible sequence before leaving.
2. Keyboard navigate A→Home→B; take the first independent A liveness/output sample.
3. Execute the separately classified Back/Forward pair, then keyboard navigate B→Home→C; take the second A sample and require advancement.
4. Keyboard navigate C→Home→A and prove original A identity/PID, later visible sequence, known file, cwd, Git, and sentinel.
5. Keyboard revisit B then C once each and prove original identities and retained file/terminal/cwd/Git/sentinel.
6. Assert exactly five Projects/Open re-entries, all reuse, and no lifecycle controls invoked.

### Expected Result
A remains live and advances while away; A/B/C restore only their own state; all five re-entries reuse original runtimes; Home remains keyboard usable and no stop/shutdown occurs.

### Expected Evidence
- Ordered transition ledger with URLs, focus, counts, identities, events, and sockets.
- At least two strict A away samples plus A return evidence.
- Exact five re-entry rows and B/C retained-state rows.

## Test V-6: History, reload, fresh B context, client close, and reopen are separate

- **Type:** End-to-end Chromium reconnection edge cases
- **Task:** T-5
- **Acceptance Criteria:** AC-9, AC-10, AC-11, AC-12
- **Priority:** Critical

### Setup
Use the same live runtimes after the five Open re-entries. Prepare a controlled A reload, a fresh B browser context with empty storage state and blocked/cleared service workers, CDP cache/origin clearing, and direct stable links classified outside the Open count.

### Steps
1. Verify the earlier Back/Forward pair restored the expected surfaces without identity or lifecycle change.
2. Reload A once and prove unchanged runtime and server-owned terminal state.
3. Direct-link fresh B after clearing cookies, local/session storage, CacheStorage, browser cache, and service workers.
4. Record one closed server-visible restoration outcome: `restored` or `unsupported`; record browser-local editor restoration separately.
5. Close B page/context, prove B runtime stays live and A/C remain usable with unchanged identities.
6. Reopen B by direct stable link and require the same identity and the same restoration-outcome classification contract.

### Expected Result
History/reload/reconnection remain outside the five Open count; B fresh/close/reopen never starts or stops B; A/C remain usable; restoration claims stay bounded to observed server-owned state.

### Expected Evidence
- Separate history, reload, direct-link, close, and reopen ledgers.
- Empty client-state proof and same-B identity records.
- Closed server-state outcome plus separate browser-local editor classification.
- A/C usability and client-close no-stop records.

## Test V-7: Retained evidence is complete, attributed, advancing, and safe

- **Type:** Evidence validation and privacy/security scan
- **Task:** T-6
- **Acceptance Criteria:** AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14
- **Priority:** Critical

### Setup
Load the actual component/API/browser artifacts and the single restricted artifact. Build joins across project, transition, identity, command, file, Git, sentinel, socket, event, focus, URL, timing, manifest, and cleanup dimensions.

### Steps
1. Validate every required join and exact cardinality/count rule.
2. Validate strictly increasing A samples/visible return and immutable runtime identities.
3. Validate token and socket-role attribution for each Workbench workflow.
4. Scan public artifacts/logs/docs for raw paths, internal ports/authorities, credentials, commands/output, payloads, and reconnection tokens.
5. Validate the restricted file is ignored, regular, mode `0600`, and the only raw-authority evidence.
6. Run all negative evidence mutations.

### Expected Result
Actual evidence passes complete joins and safety scans; public protected matches are zero; exactly one restricted artifact is valid; every synthetic or misattributed mutation fails.

### Expected Evidence
- Evidence validator summary with project/transition coverage counts.
- Zero-match public scan and one restricted-file audit.
- Complete negative-mutation result set.

## Test V-8: Cleanup and residual audit report exact zero ownership

- **Type:** Cleanup integration and independent host audit
- **Task:** T-7
- **Acceptance Criteria:** AC-11, AC-14, AC-15
- **Priority:** Critical

### Setup
Retain exact command/runtime/web/API/listener/socket/database/fixture identities and the unrelated control identity before cleanup. Configure cleanup to run for success, timeout, assertion, setup, and reconnect-close failures.

### Steps
1. Stop A and any remaining terminal command by exact identity and remove disposable output.
2. Close all pages, contexts, sockets, and proxy resources.
3. Stop proxy before all three runtime groups/listeners and service owners.
4. Close/remove owned SQLite plus sidecars, compare fixture manifests, then remove fixture root.
5. Audit each project and every resource class independently.
6. Prove control listener identity is unchanged, then clean it separately.
7. Apply assigned-zero, missing-resource, surviving-owner, changed-control, and wrong-order mutations.

### Expected Result
Every measured project/resource residual is zero, pre/post fixture manifests match, no disposable output remains, and unrelated control survives unchanged until separate cleanup.

### Expected Evidence
- Three zero project partitions and full zero resource-class table.
- Exact identity/listener/socket/database/fixture audit methods and before counts.
- Manifest equality and control survival/cleanup records.

## Test V-9: Documentation matches delivered session boundaries

- **Type:** Documentation contract
- **Task:** T-8
- **Acceptance Criteria:** AC-16
- **Priority:** High

### Setup
Inspect README surfaces, docs index, runtime/routing runbooks, BL-014 switching runbook, root recipes, artifact schemas, and architecture references.

### Steps
1. Assert the exact switching sequence, five re-entry count, no-stop semantics, and server/browser boundary are documented.
2. Assert commands, finite bounds, evidence paths/policy, cleanup, and observed outcome are documented.
3. Assert BL-015 and lifecycle features remain explicitly deferred.
4. Search for stale application-document claims that BL-014 remains wholly deferred.
5. Confirm no schema, API payload, configuration, migration, deployment, ADR, core-component, or decision-log change is claimed without actual ownership expansion.

### Expected Result
Documentation is discoverable, accurate, bounded, and consistent with executable evidence and architecture scope.

### Expected Evidence
- Passing documentation tests and link checks.
- Documentation impact list and architecture no-impact rationale.
- Zero stale application-document deferral findings.

## Test V-10: Paved BL-014, contention, prior backlog, full, and harness gates pass

- **Type:** Full regression and operational validation
- **Task:** T-9
- **Acceptance Criteria:** AC-17
- **Priority:** Release Blocking

### Setup
Use the committed implementation tree, root `justfile`, one-worker/no-retry designated browser recipes, exact residual audits, and controlled contention workload. Ensure no stale mutable BL-012 fixture evidence is cited as BL-014 proof.

### Steps
1. Run repeated V-0 and V-1 regressions under contention.
2. Run the new BL-014 matrix/browser gate repeatedly with retries zero and immediate residual audits.
3. Run BL-010 runtime, BL-011 routing, BL-012 Home/workbench, and BL-013 isolation gates.
4. Run `just verify` and every final residual audit.
5. Run `harness boot` and inspect its machine-readable readiness result.
6. Confirm tracked-tree integrity and generated-evidence ownership.

### Expected Result
All focused, contention, BL-010–014, full repository, residual, and harness gates pass within declared bounds without hidden or Playwright retries.

### Expected Evidence
- Command/result/duration/retry table for every gate.
- Passing residual artifacts and harness readiness envelope.
- Clean tracked-tree hash/diff and generated-artifact ownership report.
