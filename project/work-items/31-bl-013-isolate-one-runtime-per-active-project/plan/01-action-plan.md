# Action Plan: BL-013 Isolate One Runtime per Active Project

## Feature
- **ID:** 31
- **Research Brief:** `project/work-items/31-bl-013-isolate-one-runtime-per-active-project/research/00-research.md`

## ADRs Created
- None. The accepted host-runtime, in-process proxy, and browser-shell architecture remains unchanged.
- Relevant existing ADRs: [`ADR-260808-typescript-monorepo`](../../../architecture/ADR/ADR-260808-typescript-monorepo.md), [`ADR-260810-full-page-browser-workbench-presentation`](../../../architecture/ADR/ADR-260810-full-page-browser-workbench-presentation.md), [`ADR-260812-in-process-workbench-reverse-proxy`](../../../architecture/ADR/ADR-260812-in-process-workbench-reverse-proxy.md), and [`ADR-260812-browser-navigation-shell`](../../../architecture/ADR/ADR-260812-browser-navigation-shell.md).

## Core-Components Created
- None.
- Updated [`CORE-COMPONENT-260808-runtime-lifecycle-error-handling`](../../../architecture/core-components/CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md) for stable-ID-keyed project entries, immutable route/token snapshots, zero-waiter startup cancellation, cross-project containment, project-attributed shutdown audits, and opaque lifecycle attribution.
- Updated [`CORE-COMPONENT-260812-stable-workbench-proxy`](../../../architecture/core-components/CORE-COMPONENT-260812-stable-workbench-proxy.md) for snapshot/project fail-closed checks, per-project resource attribution, and interleaved HTTP/WebSocket isolation.
- Updated [`DECISION-LOG.md`](../../../architecture/ADR/DECISION-LOG.md) with actionable records 90–94 and corrected the zero-waiter cancellation rule in record 56.

## Acceptance Criteria

### Core
- **AC-1:** The runtime manager can hold registered, in-flight, running, and failed entries for at least three projects simultaneously, keyed only by each project’s stable ID.
- **AC-2:** Each running project snapshot contains that project’s OS PID and process start identity, loopback port, canonical path, stable route, start timestamp, and owner token. The identity tuple for each of A, B, and C is distinct from the other two.
- **AC-3:** Concurrently starting projects A, B, and C with eight interleaved calls per project (24 calls total) produces exactly three spawn-and-readiness sequences. Each caller receives the same snapshot as other callers for its own project and never receives a promise, result, or state from another project.
- **AC-4:** For each of A, B, and C, the observed launch arguments, working directory, user, and environment correspond to that project’s canonical directory and do not contain another fixture’s project-specific values.
- **AC-5:** Three disposable fixtures with distinct sentinels, Git repositories, branches, status, and configuration produce matching project-specific Explorer files, `pwd -P`, `git rev-parse --show-toplevel`, branch/status, terminal output, and editor-visible sentinel for all three projects.
- **AC-6:** Proxy HTTP requests and WebSocket upgrades for A, B, and C are resolved from the matching project’s immutable runtime snapshot, remain under that project’s stable route, and reach only that project’s upstream loopback port.
- **AC-7:** Persisted project data remains limited to the existing four metadata fields. Runtime state, ports, PIDs, handles, owner tokens, and unique runtime-only canaries are absent from the SQLite schema and from a byte scan of the disposable database, and runtime fields remain absent from public list and registration responses.
- **AC-8:** For each bounded A/B/C concurrency, failure, replacement, cancellation, and shutdown scenario, the lifecycle and proxy records required by the existing event taxonomy carry the matching stable opaque project token plus an allowed event, state, and elapsed classification; expected records and counts are asserted so an empty event stream fails.
- **AC-9:** The bounded event records expose none of the fixtures’ unique raw canonical paths, internal ports, commands, environment values, terminal or Git content, source sentinels, or seeded secret-like values.

### Edge Cases
- **AC-10:** Reopening or retrying a project that satisfies the existing running-runtime readiness and health checks reuses only that project’s OS PID and process start identity, port, and start time and never reuses another project’s runtime.
- **AC-11:** An unknown, malformed, or closed project ID fails without changing any running project’s snapshot, process, listener, route, or event attribution.
- **AC-12:** A finite cross-project matrix covering each ordered A/B/C mismatch for project ID and route path, HTTP upstream target, WebSocket upstream target, and WebSocket frame destination is rejected or fails closed without reaching the nonmatching runtime. Internal ports remain loopback-only and absent from public surfaces.
- **AC-13:** One project’s injected early exit, crash, readiness failure, health failure, or proxy failure produces its existing typed failed or evicted outcome only for that project. The other two projects retain the same OS PID and process start identities, ports, listeners, routes, and successful terminal checks.
- **AC-14:** After one project fails, one bounded replacement start creates exactly one new runtime identity for that project without changing its peers, and no automatic retry loop occurs.
- **AC-15:** When all eight callers for B cancel before B becomes ready during bounded simultaneous A/B/C starts, each B caller receives the existing cancellation outcome, B’s owned process is cleaned, and all A and C callers complete with their respective snapshots.
- **AC-16:** During bounded simultaneous A/B/C starts, cancelling one of B’s eight callers gives that caller the existing cancellation outcome while the seven remaining B callers share one B snapshot from exactly one B spawn; A and C callers and snapshots are unaffected.
- **AC-17:** Global manager shutdown cancels and cleans every owned project within the existing configured shutdown deadline, records one audit result per project, and leaves a scenario-created unrelated listener or process untouched. No per-project public stop or restart operation is added.
- **AC-18:** A finite shutdown-race matrix covers a second global shutdown plus one start attempted during shutdown and one after shutdown. Each call receives the existing typed shutdown outcome, no new owned runtime survives, and the unrelated listener remains untouched.

### Verification
- **AC-19:** A deterministic fake matrix produces inspectable pass/fail evidence for the 24-call concurrency result, the five project-specific failure classes, all-callers cancellation, one replacement, early exit, the finite proxy cross-target matrix, event attribution and redaction, global shutdown, and zero residual owned resources.
- **AC-20:** A repository contract guard rejects global singleton runtime fields and runtime maps keyed by project path or name instead of stable project ID.
- **AC-21:** A real Chromium scenario registers three disposable Git fixtures, starts and navigates each stable route, and keeps all three runtimes active concurrently. It proves distinct runtime identities, ports, and routes plus project-specific Explorer, `pwd -P`, Git repository/branch/status, terminal output, and editor sentinel; repository-local test authority then injects B’s runtime termination without a public lifecycle operation, proves A and C retain their recorded values and pass terminal checks, and proves one explicit start replaces only B’s identity.
- **AC-22:** Retained machine-readable evidence gives a pass/fail result and correlates all three runtime identities, stable routes, terminal/Git/sentinel results, B failure and replacement, unchanged A/C values, browser and network sockets, events, cleanup, and fixture integrity. Public evidence redacts internal ports and canonical paths; any raw authority evidence uses the repository’s verified restricted-artifact mode and ignore policy.
- **AC-23:** Cleanup closes every browser, proxy socket, runtime, process group, listener, API/web service, database/sidecar, terminal command, and fixture created by the scenario. Per-project and global residual audits report zero scenario-owned residuals, the scenario-created unrelated listener survives until its own cleanup, and fixture integrity checks pass before fixture removal.
- **AC-24:** Documentation records per-project runtime ownership, concurrency, reuse, isolation, failure containment, proxy and event boundaries, repeatable validation commands, fixtures, injected faults, cleanup, and observed results; it explicitly defers BL-014, BL-015, and lifecycle features.
- **AC-25:** `just verify` completes successfully, including existing one-project runtime, stable-route, navigation, and capacity regressions.
- **AC-26:** All designated verification and evidence generation is repeatable with repository-local fixtures and commands and requires no network access, hosted service, production resource, credential, or manual judgment.
- **AC-27:** Real browser evidence makes no BL-014 session-switching or session-persistence claim beyond immediate isolation while all three projects are running.

## Acceptance Coverage

| AC | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1 | V-1, V-8 | State inventory showing stable-ID keys and simultaneous registered/starting/running/failed entries |
| AC-2 | T-1, T-2 | V-1, V-2, V-9 | Three immutable snapshots with complete, pairwise-distinct identity tuples |
| AC-3 | T-2, T-6 | V-2, V-8 | 24 call records, three launch/readiness counts, and project-local object identity |
| AC-4 | T-2 | V-2, V-9 | Per-project argv/cwd/user/environment classification with cross-fixture scan zero |
| AC-5 | T-7 | V-9 | A/B/C Explorer, terminal, Git, branch/status, and editor sentinel outcomes |
| AC-6 | T-4, T-7 | V-3, V-9 | Route/token/target ledger proving matching HTTP and WebSocket upstreams |
| AC-7 | T-5 | V-4 | Four-column schema, four-field payloads, byte-scan zero, and reopen result |
| AC-8 | T-1, T-3, T-4, T-6 | V-5, V-8 | Nonempty exact event/count matrix keyed by matching opaque project token |
| AC-9 | T-4, T-6, T-8 | V-5, V-8, V-10 | Protected-value scans with zero matches across bounded event artifacts |
| AC-10 | T-2 | V-2, V-9 | Per-project health/reuse ledger with unchanged own identity and unequal peer identities |
| AC-11 | T-2, T-4 | V-1, V-3, V-6 | Failure rows plus before/after peer snapshots, listeners, routes, and event tokens |
| AC-12 | T-4, T-6 | V-3, V-8 | Complete ordered mismatch matrix with zero nonmatching upstream/frame deliveries |
| AC-13 | T-3, T-4, T-7 | V-6, V-9 | Five B-only typed failure rows and unchanged A/C identity/terminal checks |
| AC-14 | T-3, T-7 | V-6, V-9 | One explicit B replacement, one new identity, zero peer changes, zero auto-retries |
| AC-15 | T-3 | V-7 | Eight B cancellation results, B cleanup audit, successful A/C snapshots |
| AC-16 | T-3 | V-7 | One B cancellation, seven identical B snapshots, one spawn, unchanged A/C |
| AC-17 | T-3, T-8 | V-7, V-10 | One project-attributed audit per owner, bounded zero residuals, live unrelated control |
| AC-18 | T-3 | V-7 | Memoized shutdown identity, during/after typed failures, zero new owners, live control |
| AC-19 | T-6 | V-8 | Versioned execution-backed fake matrix with all named rows and zero residual union |
| AC-20 | T-1, T-6 | V-1, V-8 | Guard positive result plus rejected singleton/path-key/name-key fixtures |
| AC-21 | T-7 | V-9 | No-retry three-project Chromium artifact with B termination and replacement ledger |
| AC-22 | T-6, T-7, T-8 | V-8, V-9, V-10 | AC-indexed public artifact and optional single mode-0600 ignored authority artifact |
| AC-23 | T-7, T-8 | V-9, V-10 | Per-project/global cleanup inventory, zero residuals, control survival, fixture integrity |
| AC-24 | T-9 | V-11 | Documentation contract matrix and explicit BL-014/BL-015/lifecycle deferrals |
| AC-25 | T-9 | V-11 | Exit-zero focused BL-013 gate and full `just verify` regression record |
| AC-26 | T-6, T-7, T-9 | V-8, V-9, V-11 | Repository-local no-network command manifest with finite bounds and no manual steps |
| AC-27 | T-7, T-9 | V-9, V-11 | Browser evidence scope field and documentation scan rejecting continuity claims |

**Coverage proof:** all 27 criteria have at least one implementation task, one test or validation entry, and one expected evidence outcome before the plan artifacts were written.

## Implementation Tasks
1. **T-1 — Define the stable-ID runtime identity and state contract** (`AC-1`, `AC-2`, `AC-8`, `AC-20`): replace parallel project-state ownership with one stable-ID-keyed discriminated entry map; add frozen `stableRoute` and deterministic opaque `ownerToken` fields; align lifecycle serialization with proxy tokenization; retain exact process-identity indexing only for cleanup; add source contract guards.
2. **T-2 — Prove independent starts, launch context, health reuse, and invalid-ID immutability** (`AC-2`–`AC-4`, `AC-10`, `AC-11`): execute eight interleaved calls for each of A/B/C, preserve project-local single-flight, capture launch inputs safely, and prove same-project-only reuse without changing peers.
3. **T-3 — Isolate failures, replacement, cancellation, and shutdown races** (`AC-8`, `AC-13`–`AC-18`): make zero-waiter cancellation clean only the orphaned project start; keep one-caller cancellation local; contain five B failure classes; require explicit one-generation replacement; return project-attributed bounded shutdown audits while preserving unrelated resources.
4. **T-4 — Fail closed across proxy targets, resources, frames, and events** (`AC-6`, `AC-8`, `AC-9`, `AC-11`–`AC-13`): validate snapshot ID/path/route/token before target use; tag proxy-owned operations and sockets by project token; expose per-project plus aggregate audits; execute all ordered A/B/C HTTP/WebSocket/frame mismatches without cross-delivery.
5. **T-5 — Extend persistence and public-surface canaries** (`AC-7`): retain the exact four-field schema and payloads, add runtime-only owner/token/route canaries, inspect SQLite bytes, and prove close/reopen behavior without a migration.
6. **T-6 — Build the deterministic fake matrix, evidence schema, and negative guards** (`AC-3`, `AC-8`, `AC-9`, `AC-12`, `AC-19`, `AC-20`, `AC-22`, `AC-26`): execute every named bounded scenario, reject assertion-only or incomplete artifacts, validate exact counts and protected-value scans, and retain a zero-residual union.
7. **T-7 — Run the real three-project Chromium isolation episode** (`AC-5`, `AC-6`, `AC-10`, `AC-13`, `AC-14`, `AC-21`–`AC-23`, `AC-26`, `AC-27`): create three disposable Git fixtures, keep all stable routes active, prove Explorer/editor/terminal/Git isolation, terminate B through test-only authority, verify A/C continuity, explicitly replace B, and make no BL-014 claim.
8. **T-8 — Enforce restricted/public evidence and exact cleanup** (`AC-9`, `AC-17`, `AC-22`, `AC-23`): generate privacy-safe AC evidence, permit at most one ignored owner-readable raw-authority artifact, audit every owned browser/process/socket/listener/database/terminal/fixture resource per project and globally, and preserve the unrelated control until its own cleanup.
9. **T-9 — Document behavior and add paved regressions** (`AC-24`–`AC-27`): update runtime/routing/API/root/harness documentation, add `verify-project-runtime-isolation` and residual recipes composed into `just verify`, retain BL-004/010/011/012 gates, and state the BL-014, BL-015, and lifecycle exclusions.

## Impact
- **Architecture:** no new ADR; the existing runtime and proxy core-components now make the issue-required multi-project contracts explicit. Decision records 90–94 capture only the genuine expansions.
- **Runtime/API:** `RuntimeSnapshot`, lifecycle events, manager state storage, waiter accounting, cleanup audits, and test-only inspection/fault boundaries change. Runtime state remains in memory and no public lifecycle API is added.
- **Proxy:** target resolution gains project/snapshot invariant checks; operation/socket inventories gain opaque project attribution and per-project audits while preserving BL-011 transport semantics and proxy-before-runtime shutdown.
- **Persistence/public payloads:** no schema, migration, or four-field project payload change. New runtime route/token fields remain trusted in-process data only.
- **Browser/evidence:** one bounded no-retry Chromium episode runs three disposable Git projects concurrently, injects B termination through repository test authority, and retains public redacted plus optional restricted authority evidence.
- **Commands/docs:** a focused BL-013 gate and residual audit join the root command interface and full regression gate; runtime, routing, API, root, harness, and evidence documentation are updated.
- **Excluded:** BL-014 switching or persistence continuity, BL-015 performance targets, public Stop/Restart, broader lifecycle state, API-restart reconciliation, scheduling, quotas, multi-host operation, public authentication, and claims beyond immediate concurrent isolation.
