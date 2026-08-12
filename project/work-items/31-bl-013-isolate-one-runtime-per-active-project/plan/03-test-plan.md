# Test Plan: BL-013 Isolate One Runtime per Active Project

## Test V-1: Stable-ID entry, snapshot, event, and source contract

- **Type:** Unit and architecture contract
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-11, AC-20
- **Priority:** Critical

### Setup
Construct A/B/C persisted projects and deterministic manager dependencies. Prepare positive production-source inspection plus negative fixtures containing a singleton runtime field, a path-keyed map, a name-keyed map, a mutable snapshot, and raw-ID event serialization.

### Steps
1. Barrier the manager with simultaneous registered, starting, running, and failed project entries and inspect their keys/states.
2. Complete A/B/C and assert frozen snapshots contain ID, PID/start identity, loopback port/URL, canonical path, stable route, start timestamp, elapsed value, and owner token.
3. Serialize lifecycle and proxy events and compare opaque tokens and allowed fields.
4. Execute unknown/malformed lookup checks and verify no entry changes.
5. Run the source guard against production and every negative fixture, while permitting only the cleanup-only exact identity index.

### Expected Result
All project lifecycle entries are stable-ID keyed, all running snapshots are complete/immutable/distinct, events share one opaque token without raw IDs, invalid IDs do not mutate state, production passes, and every forbidden fixture fails.

### Expected Evidence
`V-1` record with state/key inventory, snapshot key/type/freeze checks, pairwise identity comparisons, token equality, invalid-ID before/after digests, and guard fixture verdicts.

## Test V-2: Interleaved 24-call start, launch context, and reuse

- **Type:** Deterministic runtime integration
- **Task:** T-2
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-10
- **Priority:** Critical

### Setup
Create A/B/C projects with distinct canonical paths and safe unique launch canaries. Use three controlled launch/readiness barriers, a configured non-root fake user/environment, and healthy process adapters with distinct PID/start/port identities.

### Steps
1. Issue eight calls per project in an explicitly interleaved 24-call sequence before releasing readiness.
2. Assert one launch/readiness operation per project and inspect the three starting entries.
3. Release barriers in a different project order and settle all callers.
4. Compare object identity within each project and inequality across projects.
5. Inspect argv, final path argument, cwd, user, environment classifications, and cross-fixture scans.
6. Reopen A/B/C and assert health-checked project-local identity/port/start-time reuse with no new launch.

### Expected Result
Exactly three independent spawn/readiness sequences serve 24 correctly partitioned callers; launch context matches each project and contains no peer value; reuse is same-project only.

### Expected Evidence
`V-2` call ledger with schedule position, opaque token, result digest, three launch/readiness counts, safe argv/cwd/user/environment classes, cross-scan zeros, and reuse equality results.

## Test V-3: Ordered proxy cross-target fail-closed matrix

- **Type:** HTTP and WebSocket integration matrix
- **Task:** T-4
- **Acceptance Criteria:** AC-6, AC-11, AC-12, AC-13
- **Priority:** Critical

### Setup
Create three fake upstream HTTP/WebSocket servers and immutable A/B/C snapshots. Instrument deliveries, frame destinations, project-attributed proxy resources, events, and exact cleanup. Generate all six ordered distinct project pairs for each mismatch class.

### Steps
1. Prove matching A/B/C HTTP and upgrade requests use their own route, token, and loopback target.
2. Inject each ordered mismatch for route/project ID, HTTP snapshot target, WebSocket snapshot target, and WebSocket frame destination.
3. Assert mismatch detection before forwarding or frame delivery and verify the declared safe public failure.
4. Execute malformed/unknown/closed route cases and one selected-project proxy failure.
5. Audit per-project/global streams, sockets, handshakes, deliveries, peer runtime snapshots, and internal-authority public scans.

### Expected Result
Matching traffic reaches only its selected project; all 24 ordered mismatch rows and invalid IDs fail closed with zero nonmatching delivery, unchanged peers, loopback-only internals, and zero residual proxy resources.

### Expected Evidence
`V-3` matrix with unique execution IDs, ordered pair, mismatch class, transport, route/token class, target/delivery counters, public outcome, unchanged-peer digest, public scan, and cleanup audit.

## Test V-4: Persistence and public runtime-field canary

- **Type:** SQLite and API integration
- **Task:** T-5
- **Acceptance Criteria:** AC-7
- **Priority:** Critical

### Setup
Allocate one disposable database, register three projects, and create unique runtime-only canaries for state, PID, port, handle, stable route, owner token, and internal identity. Open API list/registration boundaries and a raw SQLite resource.

### Steps
1. Inspect `PRAGMA table_info(projects)`, indexes, and rows.
2. Inspect registration and list JSON plus strict web parsing.
3. Scan schema/row serialization and raw database bytes for every runtime canary.
4. Close/reopen persistence and compare exact four-field projects.
5. Close handles and remove only the database and sidecars.

### Expected Result
Only `id`, `name`, `canonical_path`, and `created_at` persist; public project objects retain four fields; all runtime canaries are absent; reopen is equal; no migration is added; cleanup is exact.

### Expected Evidence
`V-4` schema/payload key arrays, zero canary match counts, byte-scan result, reopen digest, migration count zero, and database cleanup inventory.

## Test V-5: Project-token event attribution and redaction

- **Type:** Event contract and security validation
- **Task:** T-1, T-3, T-4, T-8
- **Acceptance Criteria:** AC-8, AC-9
- **Priority:** Critical

### Setup
Seed distinct A/B/C canonical-path, port, command, environment, terminal, Git, source, and secret-like canaries. Enable marker-bounded lifecycle and proxy event capture. Declare expected event names/counts for concurrency, five failures, replacement, both cancellation cases, and shutdown.

### Steps
1. Run each scenario through its real fake manager/proxy boundary.
2. Compare each event token to the selected snapshot owner token and ensure it differs from peers.
3. Validate event/state/transport/classification/elapsed fields against closed taxonomies.
4. Assert exact expected counts and reject empty, missing, duplicate, extra, or cross-attributed streams.
5. Scan serialized event evidence for every raw and encoded protected canary.

### Expected Result
Every required event is present exactly as declared under the matching opaque project token, all fields are bounded/allowed, and protected-value scans return zero.

### Expected Evidence
`V-5` expectation-versus-observation ledger, token correlation table, allowed-field result, nonempty count proof, and zero-match redaction matrix.

## Test V-6: Invalid ID, five B failures, and explicit replacement containment

- **Type:** Runtime/proxy fault integration
- **Task:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-11, AC-13, AC-14
- **Priority:** Critical

### Setup
Start healthy A/B/C identities and terminal probes. Prepare controlled B-only early exit before readiness, post-running crash, readiness timeout, failed health reuse, and proxy failure. Capture peer snapshots/listeners/routes/events before each row.

### Steps
1. Execute unknown, malformed, and closed ID failures and compare all peers before/after.
2. Execute each of the five B-specific failure classes once without automatic retry.
3. After every row, probe A/C terminal health and compare exact identity/start/port/listener/route/event token.
4. Confirm B has the existing typed failed/evicted outcome.
5. Invoke one explicit B start, assert exactly one launch and a new B identity, and confirm A/C remain unchanged.

### Expected Result
Invalid IDs and every B fault affect only B; A/C remain healthy and identical; no retry occurs automatically; one explicit start replaces only B exactly once.

### Expected Evidence
`V-6` row ledger with fault class, typed outcome, launch counts, B state/old/new identity digests, A/C equality and terminal checks, event attribution, and cleanup.

## Test V-7: Cancellation and global shutdown race matrix

- **Type:** Deterministic lifecycle race integration
- **Task:** T-3
- **Acceptance Criteria:** AC-15, AC-16, AC-17, AC-18
- **Priority:** Critical

### Setup
Create bounded simultaneous A/B/C starts with eight waiters each, process ownership callbacks, distinct resources, and an unrelated listener/process. Prepare barriers before B readiness and manager shutdown.

### Steps
1. Cancel one B caller; require one cancellation, seven identical B snapshots, one B spawn, and successful unchanged A/C.
2. In a fresh row, cancel all eight B callers; require eight cancellation outcomes, B abort/cleanup, successful A/C, and no B owner residual.
3. Start mixed in-flight/running A/B/C owners and invoke global shutdown twice.
4. Attempt one start during shutdown and one after completion; release a deliberately late launch settlement.
5. Check memoized shutdown identity, typed outcomes, one project-attributed audit per owner, deadline, no surviving owners, and unrelated control survival.

### Expected Result
One-caller cancellation is local; zero waiters cancel/clean only B; shutdown is bounded/idempotent, rejects race starts, cleans every project, suppresses late ownership, and never touches the control resource.

### Expected Evidence
`V-7` waiter/result/spawn counts, per-project termination audits, shutdown promise/result identity, race failure categories, timing bounds, late-settlement outcome, zero residuals, and control identity checks.

## Test V-8: Executable fake matrix, evidence validator, and contract guard

- **Type:** Acceptance coordinator and artifact contract
- **Task:** T-6
- **Acceptance Criteria:** AC-1, AC-3, AC-8, AC-9, AC-12, AC-19, AC-20, AC-22, AC-26
- **Priority:** Critical

### Setup
Enable the BL-013 acceptance mode and use only local fake projects, barriers, upstreams, listeners, databases, and event collectors. Predeclare schema version, scenario IDs/counts, finite bounds, expected events, protected scans, and cleanup requirements.

### Steps
1. Execute the 24-call, five-failure, early-exit/crash, cancellation, replacement, invalid-ID, cross-target, event, shutdown, and cleanup rows.
2. Merge observations into one public fake-matrix artifact and compute the exact owned-identity union.
3. Validate unique execution IDs, actual boundary observations, exact scenario/event counts, finite timing, and zero residuals.
4. Mutate the artifact to remove/duplicate/falsify each required class and require rejection.
5. Run positive/negative source guards and verify no network, credential, hosted service, production resource, or manual input is referenced.

### Expected Result
The complete execution-backed matrix validates; every incomplete, assertion-only, leaked, duplicate, empty-event, forbidden-architecture, or nonzero-residual fixture fails deterministically.

### Expected Evidence
`test-results/bl-013/runtime-isolation/fake-matrix.json`, validator mutation results, guard report, local-dependency manifest, bounds, AC mapping, and zero-residual union.

## Test V-9: Real three-project Chromium isolation and B replacement

- **Type:** Designated Playwright end-to-end
- **Task:** T-7
- **Acceptance Criteria:** AC-2, AC-4, AC-5, AC-6, AC-10, AC-13, AC-14, AC-21, AC-22, AC-23, AC-26, AC-27
- **Priority:** Critical

### Setup
On the designated local Linux/code-server/Chromium host, create three disposable Git fixtures under one controlled root with distinct files, editor sentinels, branches, status, local configuration, terminal markers, and pre-run manifests. Allocate isolated API/web listeners, SQLite path, front-door token, unrelated control listener, finite step/overall/cleanup bounds, workers 1, retries 0, and `EXTENSIONS_GALLERY={}`.

### Steps
1. Start exactly owned API/web groups, register A/B/C, and navigate each stable route in separate active pages/contexts.
2. Capture exact identities transiently and prove pairwise-distinct PID/start/port/route/token values.
3. For each project, prove Explorer file, editor-visible sentinel, `pwd -P`, Git root, branch/status/config, and terminal marker against fixture expectations.
4. Inventory/classify browser requests and Management/ExtensionHost/terminal WebSockets per stable project route.
5. Reopen each healthy project and verify same-project identity reuse.
6. Through repository-local nonpublic test authority, terminate exact B; verify typed B failure, unchanged A/C identities and terminal checks, and zero automatic replacement.
7. Navigate/start B once, prove one new B identity and unchanged A/C, then retain safe evidence and execute teardown.

### Expected Result
Three independent workbenches remain active concurrently; every IDE/terminal/Git observation is project-specific; network traffic is route-local; B termination and explicit replacement are contained; no BL-014 continuity claim is made.

### Expected Evidence
`three-project-chromium.json` with safe token/route/identity digests, project result classes, socket roles, B failure/replacement, A/C equality, event counts, timing, scope statement, fixture integrity, and cleanup; no raw path/port in public output.

## Test V-10: Public/restricted evidence and residual cleanup audit

- **Type:** Security, cleanup, and residual audit
- **Task:** T-8
- **Acceptance Criteria:** AC-9, AC-17, AC-22, AC-23
- **Priority:** Critical

### Setup
Collect all BL-013 public artifacts and, only if authority detail is required, one ignored regular restricted artifact. Retain exact process/listener/socket/database/terminal identities in memory for audit and one unrelated control identity.

### Steps
1. Scan public evidence, docs, command output, and committed artifacts for raw paths, project IDs where prohibited, ports/authorities, commands, environments, Git/terminal/source values, sentinels, and secret-like seeds.
2. Assert at most one raw-authority artifact, file mode `0600`, owner-readable regular-file status, and ignore policy.
3. Audit per-project and global browser, proxy, runtime, process-group, listener, API/web, SQLite/sidecar, terminal, and fixture resources.
4. Check fixture manifests before removal, require the control resource alive, remove fixtures, then clean and audit the control separately.
5. Execute negative audit fixtures for every resource/leak/mode/tracking/control failure.

### Expected Result
Public scans have zero leaks; restricted evidence obeys the existing one-file policy; every scenario-owned resource is absent per project and globally; fixture integrity passes; the control survives until separately cleaned; all negative fixtures fail.

### Expected Evidence
`residual-audit.json` with scanned artifact counts/classes, restricted file metadata, per-project/global zero-resource inventories, exact identity absence, fixture digests/removal, control survival/cleanup, and negative-fixture verdicts.

## Test V-11: Documentation, paved commands, scope, and full regressions

- **Type:** Documentation contract and repository validation
- **Task:** T-9
- **Acceptance Criteria:** AC-24, AC-25, AC-26, AC-27
- **Priority:** Critical

### Setup
Use the clean tracked implementation commit with dependencies installed. Record tracked-tree hashes before validation. Enumerate root/API/docs/harness files, public routes/UI controls, designated command prerequisites, and BL-004/010/011/012 regression commands.

### Steps
1. Run documentation contract tests for ownership, 24-call concurrency, reuse, five failures, replacement, proxy/events, fixtures, injected B fault, commands, evidence, cleanup, observed results, and explicit BL-014/BL-015/lifecycle deferrals.
2. Scan routes/UI/dependencies for public Stop/Restart, lifecycle expansion, BL-014 switching/session-persistence claims, BL-015 performance gates, and network/manual prerequisites.
3. Run `just verify-project-runtime-isolation` and its independent residual audit.
4. Run existing BL-010 runtime, BL-011 stable-route, BL-012 navigation, and BL-004 capacity audits.
5. Run full `just verify`, compare tracked-tree hashes, and rerun the BL-013 residual audit.

### Expected Result
Documentation is complete and bounded, excluded scope is absent, all designated work is repository-local/offline/no-retry, focused and prior gates pass, full verification passes, tracked source is unchanged by validation, and the final residual audit is clean.

### Expected Evidence
`V-11` documentation matrix, forbidden-scope scan, command/exit/duration ledger, clean-tree before/after hashes, focused/prior/full regression results, and final residual status.

## Coverage Check

Every AC-1 through AC-27 appears in at least one test above and has a declared expected result and expected evidence artifact. Tests V-1 through V-11 collectively cover implementation tasks T-1 through T-9.
