# Task Breakdown: BL-013 Isolate One Runtime per Active Project

## Task T-1: Define the stable-ID runtime identity and state contract

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-8, AC-20
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Refactor project lifecycle ownership into one manager-owned `Map<stableProjectId, ProjectRuntimeEntry>` discriminated across registered, starting, running, and failed states. Keep any PID/start/port keyed index cleanup-only and project-attributed. Extend frozen snapshots with the stable route and deterministic opaque owner token, centralize token derivation for runtime and proxy consumers, serialize lifecycle events with that token instead of raw project IDs, and expose only bounded test inspection needed by the matrix. Add an executable source guard that rejects singleton runtime state and project maps keyed by path or name.

### Acceptance Criteria
- AC-1: simultaneous registered, in-flight, running, and failed entries are keyed only by stable ID.
- AC-2: every running snapshot has the complete immutable identity/route/token fields and A/B/C tuples differ.
- AC-8: lifecycle and proxy attribution can use one matching opaque project token.
- AC-20: negative singleton, path-keyed, and name-keyed fixtures fail the contract guard.

### Test Coverage
- Unit tests for entry transitions, frozen snapshots, stable route/token derivation, inspect/failure/cleanup lookup, and lifecycle event serialization.
- Contract tests inspect source/AST fixtures and distinguish the allowed exact-ownership cleanup index from forbidden project-state keys.
- Negative tests reject missing fields, mutable snapshots, raw-ID event output, singleton fields, and path/name map keys.

### Expected Evidence
- V-1 contract results with A/B/C state inventory, complete frozen snapshot keys, pairwise-distinct tuples, matching opaque tokens, and guard negative-fixture outcomes.
- Source diff showing no public payload or persistence model expansion.

## Task T-2: Prove independent starts, launch context, health reuse, and invalid-ID immutability

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-10, AC-11
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Drive a barrier-controlled A/B/C start schedule with eight interleaved calls per project. Ensure each key installs one in-flight operation before settlement, returns the same project-local snapshot object, never shares promises or outcomes across keys, and produces exactly one launch/readiness sequence per project. Record bounded classifications for direct argv, final canonical path argument, cwd, configured user, and environment; compare each fixture against both peers without retaining protected values. Reopen each healthy runtime and execute unknown, malformed, and closed lookups against immutable before/after peer state.

### Acceptance Criteria
- AC-2 through AC-4: three complete distinct identities, exactly 24 correctly partitioned results, three launch/readiness sequences, and matching launch context.
- AC-10: health-checked reuse returns only the matching project identity and start time.
- AC-11: invalid or absent IDs produce typed failures and zero changes to existing runtimes or event attribution.

### Test Coverage
- Extend runtime-manager and process tests with deterministic interleaving barriers, per-key promise/result identity, launch-call captures, and cross-fixture leak scans.
- Execute healthy reuse for all three IDs and inspect exact identity equality plus peer inequality.
- Execute unknown, malformed-route, and persistence-closed cases with complete before/after snapshots, listeners, routes, and event-token counts.

### Expected Evidence
- V-2 24-call ledger containing call IDs, project tokens, join/spawn/readiness counts, safe launch classifications, reuse results, and immutable peer digests.
- V-6 invalid-ID rows with typed outcomes and zero state/resource deltas.

## Task T-3: Isolate failures, replacement, cancellation, and shutdown races

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-8, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment

### Description
Add explicit waiter accounting to each starting entry. A single cancelled B waiter settles locally while seven remain; when all eight B waiters cancel, abort and exactly clean only the now-orphaned B start. Execute B-only early exit, post-running crash, readiness failure, health failure, and proxy-triggered failure while A/C retain exact identities and terminal probes. Permit one later explicit B start to create one replacement with no retry loop. Expand shutdown to produce one project-attributed audit per owned project, join repeated shutdown, reject starts during and after shutdown, suppress late completions, and leave an unrelated control resource untouched.

### Acceptance Criteria
- AC-13 and AC-14: all five failure classes and one explicit replacement are B-only; A/C are byte-for-byte unchanged in bounded identity/resource observations.
- AC-15 and AC-16: all-caller cancellation cleans B, while one-caller cancellation leaves the shared B start for seven callers.
- AC-17 and AC-18: bounded global shutdown audits each project, is idempotent, rejects race starts with existing typed outcomes, leaves zero owners, and preserves the control resource.
- AC-8: every scenario has the exact required nonempty project-token event counts.

### Test Coverage
- Barrier-driven manager tests for one/all waiter cancellation, late launch settlement, five failure classes, no automatic retry, and one explicit replacement.
- Lifecycle tests for three mixed states, repeated shutdown identity, starts during/after shutdown, exact project audit attribution, deadline bounds, and unrelated listener/process survival.
- Terminal health probes for unaffected fake or real peers as appropriate.

### Expected Evidence
- V-6 failure/replacement matrix with old/new B identities, unchanged A/C digests, typed outcomes, launch counts, and terminal checks.
- V-7 cancellation/shutdown matrix with waiter counts, cleanup audits, race outcomes, finite timing, zero owned residuals, and surviving unrelated identity. The completed correction awaits tracked completion/background promises without direct task-set clearing, then independently measures immediate and delayed post-return zero maps and rejects assigned-zero or cleared-without-settlement provenance.

## Task T-4: Fail closed across proxy targets, resources, frames, and events

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-6, AC-8, AC-9, AC-11, AC-12, AC-13
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Strengthen target resolution so the returned snapshot ID, canonical path, stable route, owner token, loopback URL, and port must agree with the persisted project and parsed route before any connection. Tag pending operations, HTTP streams, handshakes, raw sockets, and WebSockets with the opaque project token and report both per-project and global audit counts. Execute each ordered A/B/C mismatch for route/ID, HTTP target, WebSocket target, and frame destination. Preserve BL-011 public failure envelopes, stream/backpressure behavior, stable prefixes, and loopback-only authorities.

### Acceptance Criteria
- AC-6: A/B/C HTTP and upgrade traffic reaches only the matching immutable snapshot port under the matching stable route.
- AC-11 and AC-12: invalid and every ordered cross-target case fail before nonmatching delivery and leave all running peers unchanged.
- AC-13: proxy failure is attributed only to the selected project and does not mutate peer runtimes.
- AC-8 and AC-9: proxy and lifecycle events share one token and retain no protected fixture/runtime values.

### Test Coverage
- Extend HTTP and WebSocket tests with fake upstream delivery counters, project-attributed resource audits, and route/snapshot mismatch injection.
- Execute all six ordered project pairs across four mismatch classes, including real WebSocket frame sentinels and zero nonmatching receipt.
- Run precommit/postcommit failure, disconnect, shutdown, backpressure, and BL-011 failure-table regressions.

### Expected Evidence
- V-3 cross-target matrix with unique execution IDs, route/token/transport class, selected target classification, delivery counts, public failure, and zero per-project/global resources. The six completed frame rows retain live source/target WebSocket boundary IDs, uniquely hashed text/binary destination-selection attempts, exact source rejection, both endpoint receipt counters at zero, and independent target-control delivery.
- V-5 matching runtime/proxy event tokens and zero protected-value scans.

## Task T-5: Extend persistence and public-surface canaries

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-7
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Extend the existing schema-minimization test with unique runtime-only state, PID, handle, port, stable-route, owner-token, and per-project canaries. Inspect the actual `projects` schema and rows, public registration/list responses, closed/reopened library values, and raw disposable SQLite bytes. Keep exactly `id`, `name`, `canonical_path`, and `created_at`; add no migration.

### Acceptance Criteria
- AC-7: schema and public responses stay four-field, every runtime-only canary is absent from rows and database bytes, and reopen behavior is unchanged.

### Test Coverage
- SQLite integration test using an explicit disposable path and exact sidecar cleanup.
- Fastify registration/list response shape tests and strict web parser regressions.
- Negative validator fixture that fails if any runtime field or canary enters schema, bytes, or public JSON.

### Expected Evidence
- V-4 machine-readable schema columns, payload keys, byte-scan counts, reopen equality, migration count zero, and database/sidecar cleanup.

## Task T-6: Build the deterministic fake matrix, evidence schema, and negative guards

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-3, AC-8, AC-9, AC-12, AC-19, AC-20, AC-22, AC-26
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Create one versioned execution-backed BL-013 fake evidence artifact. Include the 24-call schedule, five B-specific failure classes, early exit/crash distinctions, all-waiter and one-waiter cancellation, one replacement, invalid IDs, complete cross-target matrix, nonempty event expectations, protected-value scans, shutdown races, per-project/global cleanup, and union residuals. Validate unique execution IDs, exact scenario counts, actual controlled-boundary observations, finite bounds, no network prerequisites, and reject assertion-only, empty-event, incomplete, duplicated, leaked, or nonzero-residual fixtures.

### Acceptance Criteria
- AC-19: every named fake scenario has inspectable pass/fail execution evidence and zero residual ownership.
- AC-20: source guard and negative architecture fixtures reject forbidden singleton/path/name state ownership.
- AC-3, AC-8, AC-9, AC-12: exact concurrency, token/count, privacy, and cross-target assertions are executable rather than labels.
- AC-22 and AC-26: artifacts are public-safe, finite, repository-local, and repeatable offline.

### Test Coverage
- Acceptance coordinator test executes all matrix rows through runtime/proxy dependencies and barriers.
- Evidence-validator tests mutate/remove each required field, count, event, cleanup row, and protected scan and require rejection.
- Union residual test deduplicates exact owned identities only and requires every process/group/listener/socket absent.

### Expected Evidence
- V-8 `test-results/bl-013/runtime-isolation/fake-matrix.json` with schema version, bounds, execution records, AC map, event expectations, public scans, and zero-residual union. The completed validator enforces the exact 70-record scenario catalog and rejects missing, wrong, extra, misattributed, reordered, incomplete AC-12, and unmeasured AC-18 mutations.
- Contract-guard report with accepted production source and rejected negative fixtures.

## Task T-7: Run the real three-project Chromium isolation episode

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6
- **Acceptance Criteria:** AC-5, AC-6, AC-10, AC-13, AC-14, AC-21, AC-22, AC-23, AC-26, AC-27
- **Related ADRs:** ADR-260810-full-page-browser-workbench-presentation, ADR-260812-in-process-workbench-reverse-proxy, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Add one no-retry designated Chromium scenario with three disposable directories under a controlled root. Initialize separate Git repositories, branches, status changes, local configuration, Explorer/editor sentinels, terminal markers, and integrity manifests. Register A/B/C, navigate all three stable routes in separate pages/contexts while all runtimes remain active, classify sockets, and transiently capture exact identities/ports. Use a repository-local test authority, unavailable in production/public routes, to terminate only B by exact PID/start identity. Prove A/C identity and terminal continuity, observe B failure, then trigger one explicit stable-route start and prove only B is replaced. Retain bounded booleans, digests, tokens, and counts rather than protected values.

### Acceptance Criteria
- AC-5 and AC-21: all three project-specific Explorer/editor/terminal/Git observations pass concurrently; B termination and replacement do not alter A/C.
- AC-6 and AC-10: routes/sockets stay project-local and healthy reopen reuses only the matching identity.
- AC-13 and AC-14: injected B failure and one replacement are contained with no auto-retry.
- AC-22, AC-23, AC-26, AC-27: evidence is redacted, cleanup-complete, offline/repeatable, and explicitly limited to immediate concurrent isolation.

### Test Coverage
- Playwright Chromium test with finite setup, API/web readiness, runtime readiness, per-project interaction, fault, replacement, evidence, and cleanup bounds; workers 1 and retries 0.
- Browser request/response/log/WebSocket classifiers; Management/ExtensionHost/integrated-terminal usability checks per project.
- Git commands execute inside each integrated terminal and are compared transiently to fixture expectations; public evidence keeps result classes/digests only.
- Failure path must retain partial safe evidence after exact cleanup.

### Expected Evidence
- V-9 ignored/generated `three-project-chromium.json` correlating A/B/C opaque tokens, routes, identity digests, browser/socket roles, project-specific result classes, B old/new identity, unchanged A/C, event counts, bounds, and cleanup.
- Optional raw authority detail only in the single restricted artifact governed by T-8.

## Task T-8: Enforce restricted/public evidence and exact cleanup

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-6, T-7
- **Acceptance Criteria:** AC-9, AC-17, AC-22, AC-23
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
Define the BL-013 public and restricted evidence validators. Public output must reject canonical paths, raw project IDs where disallowed, internal ports/authorities, commands, environments, Git/terminal/source content, fixture sentinels, and secret-like seeds. Permit no more than one ignored regular raw-authority file, require mode `0600`, and verify ignore policy. Audit every page/context, proxy operation/stream/socket, runtime/process group/listener, API/web process group/listener, database/sidecar, terminal command, and fixture per project and globally. Keep an unrelated listener/process alive through the final owned-resource audit, then clean it explicitly.

### Acceptance Criteria
- AC-9 and AC-22: all public artifacts have zero protected matches; any raw authority is confined to the verified restricted artifact.
- AC-17 and AC-23: project-attributed and global audits report zero scenario-owned residuals, fixture integrity passes before removal, and the unrelated control survives until separate cleanup.

### Test Coverage
- Residual-audit CLI and validator tests for each resource class, missing project partitions, stale snapshots, duplicate identities, wrong file mode, tracked restricted file, public leaks, control disappearance, and nonzero cleanup.
- Execute audit after fake and real scenarios and independently after the focused gate.
- Verify partial/failure artifacts still contain cleanup results without protected values.

### Expected Evidence
- V-10 residual JSON with per-project/global zero counts, exact identity absence, fixture digest equality, control survival/cleanup, restricted-file mode/ignore checks, and public artifact scan inventory.

## Task T-9: Document behavior and add paved regressions

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-6, T-7, T-8
- **Acceptance Criteria:** AC-24, AC-25, AC-26, AC-27
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260812-in-process-workbench-reverse-proxy, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Add root `verify-project-runtime-isolation` and residual-audit recipes, compose the focused gate into `just verify`, and document finite/no-retry/no-network behavior. Update root/API/docs/harness runtime and stable-routing surfaces with per-project ownership, 24-call concurrency, reuse, isolation, five faults, replacement, proxy/event boundaries, fixture construction, test-only B termination, evidence privacy, cleanup, and observed results. Remove obsolete statements that all multi-project coordination is deferred while explicitly preserving BL-014, BL-015, public lifecycle, and broader exclusions.

### Acceptance Criteria
- AC-24: all required behavior, validation, evidence, cleanup, and explicit deferrals are documented.
- AC-25: focused BL-013, BL-004/010/011/012 regressions, and full `just verify` pass.
- AC-26: designated commands use repository-local fixtures, finite bounds, no retries/network/credentials/manual judgment.
- AC-27: docs and evidence make no session-switching or persistence claim beyond simultaneous active runtimes.

### Test Coverage
- Documentation contract test checks commands, behavior, evidence paths, observed results, exclusions, and removal of stale deferral language.
- Run `just verify-project-runtime-isolation`, its independent residual audit, `just verify-project-runtime`, `just verify-workbench-route`, `just verify-home-workbench`, `just proof-workbench-capacity-audit`, and full `just verify` from a clean tracked tree.
- Scan dependencies, routes, and UI for forbidden public stop/restart or BL-014/BL-015 additions.

### Expected Evidence
- V-11 command/exit/duration record, documentation matrix, clean-tree before/after hashes, prior-gate outcomes, full `just verify` result, and scope/dependency scan. Documentation now distinguishes 18 pre-forward target failures from six executed frame-delivery rows and records exact event and shutdown-audit counts.
