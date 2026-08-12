# Test Plan: BL-010: Start and reuse one project workbench

Use root `justfile` recipes. Generated runtime evidence belongs below `test-results/bl-010/`; retained acceptance mapping belongs in the implementation record. Relevant architecture: `ADR-260808-typescript-monorepo`, `ADR-260808-governed-engineering-harness`, `CORE-COMPONENT-260808-runtime-lifecycle-error-handling`, `CORE-COMPONENT-260808-host-process-environment`, `CORE-COMPONENT-260808-filesystem-path-safety`, `CORE-COMPONENT-260808-structured-runtime-logging`, and `CORE-COMPONENT-260810-sqlite-persistence-lifecycle`.

## Test V-1: Runtime contract, persisted invariant, and minimization

- **Type:** Unit and SQLite integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-6, AC-7, AC-8, AC-9
- **Priority:** Critical

### Setup
- Allocate an isolated BL-005-safe SQLite path and one four-field project.
- Prepare fixed runtime, secret, command, environment, raw-error, stack, path, source, terminal, output, and redaction sentinels.

### Steps
1. Assert exact snapshot keys/types/states and every fixed failure category, safe message, finite diagnostic field, and field limit.
2. Resolve the exact persisted ID/path pair, an unknown ID, and a same-ID/different-path pair.
3. Exercise event serialization for start request/success/failure and health/exit transitions.
4. Inspect SQLite schema, project rows, reopened records, raw database bytes, snapshots, diagnostics, messages, and events for forbidden sentinels and unexpected keys.

### Expected Result
- Valid snapshots include only AC-1 fields; lookup distinguishes known, unknown, and invalid invariant; all failures are distinct/actionable; persistence remains exactly four metadata fields; events are bounded and omit raw canonical paths and protected values.

### Expected Evidence
- Verbose Vitest result, exported-key assertions, schema/row report, reopened project, and zero-match sentinel scan.

## Test V-2: Spawn, collision, readiness, and typed failure matrix

- **Type:** Unit and process integration
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-6, AC-7
- **Priority:** Critical

### Setup
- Use injectable process/port/health adapters plus repository fake executable modes.
- Start one attributed unrelated loopback listener as a control.

### Steps
1. Launch ready mode and inspect detached ownership, configured non-root user, deterministic environment boundary, canonical `cwd`, exact final path argument, and loopback URL/listener.
2. Force two collisions then success; force three collisions and exhaustion; inspect candidates, groups, and control listener after each.
3. Return valid `/healthz`, unexpected status, unexpected body, stalled request, overall timeout, and cancellation while retaining attempt timings.
4. Trigger unknown/path invariant through the launch boundary, synchronous/asynchronous spawn error, missing executable, and early code/signal exits.
5. Audit every discovered exact PID/start identity and listener after each failure.

### Expected Result
- The matrix applies at most three collision attempts, never disturbs the control, accepts only HTTP 200 plus the documented alive body, enforces both timeout layers/cancellation, and returns the correct typed safe failure with exact cleanup.

### Expected Evidence
- Collision/readiness matrix JSON, argv/user/listener rows, health timing rows, failure catalog, exact absence audit, and unrelated-listener survival row.

## Test V-3: Eight-call single flight, reuse, cancellation, failure retry, and exit replacement

- **Type:** Deterministic concurrency unit/integration
- **Task:** T-3
- **Acceptance Criteria:** AC-3, AC-10, AC-11, AC-12
- **Priority:** Critical

### Setup
- Use barriers to hold spawn and readiness, counters for spawn/readiness/health, controllable exit events, and exact ownership fakes.

### Steps
1. Issue exactly eight starts before readiness, release barriers, and compare all snapshots and counters.
2. Start again while exact identity is live and health passes.
3. Cancel one waiter, multiple waiters, and all waiters; release the manager-owned attempt and inspect stale mutations, ownership, and a later start.
4. Fail one shared attempt, compare all participating failure outcomes, inspect atomic eviction/cleanup, then issue eight retry calls.
5. Exit a running process by code and signal, inspect retained bounded diagnostic and zero automatic spawn, then explicitly start replacement.

### Expected Result
- One initial spawn/readiness serves eight callers, healthy reuse preserves identity/port, cancellation affects only waits, one shared failure settles all callers identically and retries once, and post-running exit requires one explicit replacement.

### Expected Evidence
- Call-result matrix, exact counters, state-transition trace, cancellation generations, failure identity, old/new PID identities, and zero-auto-retry assertion.

## Test V-4: Application shutdown, exact ownership, and lifecycle events

- **Type:** Application lifecycle and process integration
- **Task:** T-4
- **Acceptance Criteria:** AC-7, AC-9, AC-10, AC-13
- **Priority:** Critical

### Setup
- Construct Fastify with injected runtime manager, registration/library close spies, captured logger, cooperative and TERM-ignoring owned process groups, and unrelated process/listener controls.

### Steps
1. Confirm one manager is constructed and application close invokes manager shutdown before persistence closes.
2. Call shutdown/server stop repeatedly and concurrently; compare promise/result and call counts.
3. Shut down during readiness and after running; attempt a new start after shutdown.
4. Observe graceful TERM and bounded KILL escalation; audit each exact owned identity/listener and both unrelated controls.
5. Scan all lifecycle events for required fields, bounded classification, raw canonical path, and forbidden sentinels.

### Expected Result
- Shutdown is one bounded idempotent operation, in-flight starts receive manager-shutdown, new starts are rejected, exact owned resources are absent after graceful/escalated cleanup, unrelated controls survive, persistence closes afterward, and event records remain safe.

### Expected Evidence
- Construction/shutdown counts, ordering trace, elapsed/escalation timings, event capture, exact absence rows, and unrelated survival rows.

## Test V-5: Complete fake acceptance, integrity, privacy, and residual matrix

- **Type:** Acceptance integration
- **Task:** T-5
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15
- **Priority:** Critical

### Setup
- Allocate disposable projects with nested files, links, modes, and byte sentinels; isolated SQLite; all fake modes; unrelated process/listener; and a union resource registry.

### Steps
1. Execute every AC-15 named fake scenario, including exactly-eight concurrency and every typed failure.
2. Capture recursive membership and byte hashes before and after success/reuse, failed cleanup/retry, post-running replacement, and shutdown.
3. Inspect diagnostics/events for field bounds and forbidden sentinels; inspect schema/rows/database bytes for runtime data.
4. Audit every registered PID/start identity and listener after each case and once across the union at matrix completion.

### Expected Result
- Every named case executes finitely, all representative project manifests are equal, persistence/events contain no prohibited runtime data, unrelated controls survive, and union residual counts are zero.

### Expected Evidence
- `test-results/bl-010/project-runtime/fake-matrix.json` with executed case names, bounds, categories, counters, manifest comparisons, sentinel totals, ownership results, and final zero residuals.

## Test V-6: Designated real code-server manager episode

- **Type:** Designated-host process acceptance
- **Task:** T-6
- **Acceptance Criteria:** AC-1, AC-3, AC-5, AC-14, AC-16
- **Priority:** Critical

### Setup
- Require documented Ubuntu 24.04.4, repository path, non-root `vscode` uid 1000, code-server 4.131.0, BL-001 fixture, `/proc` sensors, and no active BL-010 episode.
- Snapshot the fixture and start one unrelated control listener/process.

### Steps
1. Start through the product manager and issue the documented `/healthz` request.
2. Inspect exact canonical argv item, real/effective user, PID/start identity, loopback listener/port, snapshot, and readiness attempt timings.
3. Start the same project again and compare PID identity/port while checking spawn/readiness counters.
4. Record observed startup elapsed time and compare it explicitly with 15,000 ms without converting the target into an undocumented gate.
5. Shut down in `finally`, compare fixture manifest, audit exact owned identity/listener absence, prove controls alive, and perform a union residual audit.

### Expected Result
- One real code-server is healthy and correctly targeted, repeated start reuses it, evidence records elapsed-versus-target, the fixture is unchanged, exact owned resources are absent, and unrelated controls remain alive.

### Expected Evidence
- `test-results/bl-010/project-runtime/episode.json` with prerequisites, health, argv/user/listener, reuse, timing comparison, integrity, shutdown, unrelated survival, and zero residuals.

## Test V-7: Runtime documentation and command contract

- **Type:** Documentation contract
- **Task:** T-7
- **Acceptance Criteria:** AC-12, AC-17
- **Priority:** High

### Setup
- Read `docs/project-runtime.md`, `docs/README.md`, root `justfile`, `.harness/engineering-harness.md`, and runtime contract constants/types.

### Steps
1. Assert documentation covers every AC-17 subject and matches code constants/categories/messages.
2. Assert caller cancellation is documented as caller-wait-only and manager shutdown as shared-operation cancellation.
3. Assert exact focused, designated, residual, and full commands plus evidence paths are present.
4. Assert all deferred boundaries are named and harness boot remains non-persistent/test-backed.

### Expected Result
- Documentation and executable contracts agree completely, no deferred route/multi-project/UI/reconciliation behavior is claimed, and harness command ownership is unchanged.

### Expected Evidence
- Passing documentation-contract test with one assertion mapping for each required subject and deferred boundary.

## Test V-8: Focused, full, and final residual validation

- **Type:** Repository gate and residual audit
- **Task:** T-7
- **Acceptance Criteria:** AC-18
- **Priority:** Critical

### Setup
- Ensure designated prerequisites are available where the real episode is part of the gate and start with no BL-010 validation owner active.

### Steps
1. Run the new focused runtime recipe.
2. Run the designated real runtime recipe when required by the documented designated-host gate.
3. Run `just verify` unchanged as the canonical full gate.
4. Run the standalone bounded BL-010 residual audit over every retained validation identity/listener.
5. Check Git status for unintended generated evidence or tracked fixture mutation.

### Expected Result
- Focused and full commands exit zero; designated validation has an honest prerequisite/result envelope; the final residual audit reports no validation-owned PID identity or listener; tracked fixtures and source are unchanged except intended implementation/docs/evidence records.

### Expected Evidence
- Command exit transcript, full-gate summary, final residual JSON with zero counts, fixture hash comparison, and clean generated-artifact status.

## Acceptance Coverage Proof

| AC | Tests |
|---|---|
| AC-1 | V-1, V-2, V-6 |
| AC-2 | V-1, V-5 |
| AC-3 | V-3, V-5, V-6 |
| AC-4 | V-2, V-5 |
| AC-5 | V-2, V-5, V-6 |
| AC-6 | V-1, V-2, V-5 |
| AC-7 | V-1, V-2, V-4, V-5 |
| AC-8 | V-1, V-5 |
| AC-9 | V-1, V-4, V-5 |
| AC-10 | V-3, V-4, V-5 |
| AC-11 | V-3, V-5 |
| AC-12 | V-3, V-5, V-7 |
| AC-13 | V-4, V-5 |
| AC-14 | V-5, V-6 |
| AC-15 | V-1, V-2, V-3, V-4, V-5 |
| AC-16 | V-6 |
| AC-17 | V-7 |
| AC-18 | V-8 |

Every AC has finite validation and expected evidence; every T-1 through T-7 task has explicit test coverage above.
