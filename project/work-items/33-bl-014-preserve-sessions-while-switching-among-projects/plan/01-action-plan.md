# Action Plan: BL-014 Preserve Sessions While Switching Among Projects

## Feature
- **ID:** 33
- **Research Brief:** `project/work-items/33-bl-014-preserve-sessions-while-switching-among-projects/research/00-research.md`

## ADRs Created
- None. Session ownership remains with the existing memory-only runtime manager and code-server; navigation and client disconnection still do not own runtime lifecycle. No architectural decision expands.

## Core-Components Created
- None. The existing runtime lifecycle and stable proxy contracts already require per-ID reuse, client-local disconnect, no automatic retry, and exact cleanup. Their explicit BL-014 exclusions remain component-scope boundaries rather than a prohibition on acceptance proof.

## Acceptance Criteria

### AC-1
One designated Chromium scenario registers exactly three repository-defined Git fixtures A, B, and C; starts each project exactly once through the existing Home/Open stable-route flows before switching begins; and records each project’s initial immutable runtime identity (PID, process start time, port token, and stable route) plus project-specific Explorer, editor, terminal, and Git evidence.

### AC-2
In A, the scenario opens one known file and starts one repository-defined long-running terminal command that emits an increasing sequence every 250 ms to the visible terminal and disposable untracked output, with a maximum 90-second run. The command PID and a visible sequence value are recorded before leaving A.

### AC-3
After all three initial starts, with A displayed, the scenario navigates A→Home→B→Home→C→Home→A using keyboard-only Projects/Open actions. Exact URLs, focus targets, start/reuse/stop counts, and runtime identities are recorded at every transition; every Home navigation has zero runtime stop or shutdown invocations.

### AC-4
In B and C, the scenario opens distinct known files and runs bounded project-specific terminal commands that prove `pwd -P`, `git rev-parse --show-toplevel`, branch/status, and a unique sentinel. B’s and C’s state does not appear in A or in each other.

### AC-5
While A is not the displayed workbench, the scenario independently samples A’s command PID/process liveness and output sequence at least twice. The same command PID remains live and the sampled values advance; evidence collection does not interact with A’s browser workbench in a way that restores it.

### AC-6
When the scenario returns to A, the runtime identity and long-running command PID match the initial records, the visible terminal shows a later sequence, the same known file remains visibly open, and the canonical cwd, Git, and sentinel values remain A-specific. A has no second runtime or start.

### AC-7
After that switching sequence, the scenario revisits B and then C once each and proves that each retains its original runtime identity, known open file, terminal state/output, canonical cwd, Git, and sentinel. Together with the B, C, and A entries in the preceding post-start switching sequence, these are exactly five Projects/Open Workbench re-entries, and all five use reuse only; reload, history, and client-reconnection checks are recorded separately from this count.

### AC-8
Project Home remains keyboard-usable through the recorded Projects/Open actions while all three runtimes are active, lists each project card exactly once with the expected project identity and focus target, and renders no runtime-control UI beyond the existing Open/Close boundaries. Close, Stop, and Restart are not invoked.

### AC-9
One bounded Back-then-Forward browser sequence during switching restores the correct Home or Workbench surface without a duplicate start, a stop, cross-project state, or a runtime-identity change.

### AC-10
One controlled page reload on A and one fresh browser-context direct link to B prove server-owned runtime/session reconnection. The fresh context clears client storage, cache, and service workers and must reconnect to the same B runtime. Evidence records exactly one closed outcome for visible server-owned file/terminal restoration: restored by the existing workbench, or unsupported by the existing workbench with the bounded observed behavior retained. Browser-local editor restoration is classified separately and does not broaden the server-session claim.

### AC-11
A and C remain usable when the B browser page or context is closed. Closing the client connection does not stop B’s runtime; reopening B reuses the same runtime identity and server-owned state, with visible file/terminal restoration evaluated under the same closed restored-or-unsupported outcome defined for the fresh-context check.

### AC-12
For each Workbench entry and reconnection, event and network evidence uses safe project tokens, identifies the exact Management and ExtensionHost socket roles, remains under the stable project prefix, exposes zero internal ports or authorities on public surfaces, and has unambiguous project attribution.

### AC-13
Bounded unit, component, and API validation executes navigation generation, history, no-stop rules, and runtime-manager per-ID reuse. Evidence validators reject assigned or static identity/state rows, duplicate starts, cross-token events, and unchanged sequence constants.

### AC-14
Retained evidence maps every transition and project to runtime, command, file, Git, sentinel, socket, event, focus, and URL values; includes A’s away samples, return assertions, browser close/reconnect, measured cleanup, and pre/post fixture-manifest equality; and complies with the existing restricted/public evidence policy.

### AC-15
Cleanup terminates the scenario’s terminal commands, browser contexts/pages/sockets, all three runtime groups/listeners, API/web services, databases/sidecars, and fixtures. The scenario-owned residual audit reports zero for every project/resource class, while the unrelated control listener remains unchanged until its separate cleanup.

### AC-16
Documentation records the exact switching sequence, persistence ownership and limits, no-stop semantics, the server-versus-browser state boundary, commands and finite bounds, artifacts, cleanup, and observed result. It explicitly defers BL-015 performance benchmarking and lifecycle features.

### AC-17
The repository’s full validation and the existing BL-010, BL-011, BL-012, and BL-013 regression gates all complete successfully.

## Acceptance Coverage

| AC | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-2, T-4, T-5 | V-2, V-4, V-5 | Exactly three fixture definitions; one start per A/B/C; exact initial identities in restricted evidence and safe digests/classes publicly |
| AC-2 | T-2, T-4, T-5 | V-2, V-4, V-5 | Repository-defined 250 ms counter command, ≤90 s bound, command identity, visible initial sequence, disposable output record |
| AC-3 | T-3, T-5 | V-3, V-5 | Exact keyboard transition ledger with URL, focus, identity, start/reuse/stop/shutdown counts and zero Home lifecycle calls |
| AC-4 | T-2, T-4, T-5 | V-2, V-4, V-5 | Distinct file/Git/terminal/sentinel digests and negative cross-project scans for B/C/A |
| AC-5 | T-5, T-6 | V-5, V-7 | Two or more non-browser A PID/output samples with same PID and strictly increasing values |
| AC-6 | T-5, T-6 | V-5, V-7 | A return row with unchanged identity/PID, later visible value, retained file, A-only cwd/Git/sentinel, one start |
| AC-7 | T-3, T-5, T-6 | V-3, V-5, V-7 | Exact five Projects/Open re-entry rows, all reuse; B/C reopen state; separate reload/history/reconnection ledgers |
| AC-8 | T-3, T-5 | V-3, V-5 | Three unique Home cards, expected keyboard focus, Open/Close only, and zero Close/Stop/Restart invocation |
| AC-9 | T-3, T-5 | V-3, V-6 | One bounded Back/Forward ledger with unchanged identity and no lifecycle/cross-state event |
| AC-10 | T-5, T-6 | V-6, V-7 | A reload row; storage/cache/service-worker-cleared B direct link; same B runtime; one closed restoration outcome plus separate browser-local classification |
| AC-11 | T-5, T-6, T-7 | V-6, V-7, V-8 | B close/reopen rows, unchanged B identity, live A/C probes, server-state outcome, zero client-close runtime stop |
| AC-12 | T-5, T-6 | V-4, V-5, V-6, V-7 | Token-attributed entry/reconnection events; Management and ExtensionHost roles; stable-prefix classes; zero public authority leaks |
| AC-13 | T-0, T-1, T-2, T-3, T-6 | V-0, V-1, V-2, V-3, V-7 | Executed matrices and negative mutations for static rows, duplicate starts, token swaps, and unchanged sequences |
| AC-14 | T-2, T-6, T-7 | V-2, V-7, V-8 | Versioned public/restricted artifacts with complete transition/project mapping, manifests, cleanup and policy scans |
| AC-15 | T-4, T-5, T-7 | V-4, V-6, V-8 | Per-project/resource residual zeros, exact PID/listener/socket/database/fixture audits, unchanged control listener before separate cleanup |
| AC-16 | T-8 | V-9 | Updated README/runbooks/docs index and contract tests with exact scope, ownership, bounds, artifacts and deferrals |
| AC-17 | T-0, T-1, T-9 | V-0, V-1, V-10 | Contention regressions, paved BL-014 gate, BL-010–013 gates, `just verify`, and harness boot results without retries |

Coverage proof: all 17 criteria have at least one dependency-ordered implementation task, executable validation, and named retained evidence. No criterion relies on manual judgment or an architecture change.

## Implementation Tasks

1. **T-0 — Phase 0 deterministic proxy failure-event classification** (`AC-13`, `AC-17`): replace shared clear-and-immediate-read test observation with execution-correlated, bounded event settlement; preserve proxy response/event semantics; add focused and full-concurrency contention regressions.
2. **T-1 — Phase 0 evidence-based terminal-parity readiness and bounds** (`AC-13`, `AC-17`): instrument one-attempt terminal parity phases, exact owned-listener plus HTTP/browser readiness, retained monotonic timings, cleanup reserve, and evidence-derived finite bounds; remove the hidden three-dispatch loop without changing terminal-parity product semantics.
3. **T-2 — Define BL-014 fixtures, contracts, evidence schemas, and validators** (`AC-1`, `AC-2`, `AC-4`, `AC-13`, `AC-14`): define exactly A/B/C Git manifests and counter/terminal contracts; reject nonexecuted, assigned, duplicated, cross-token, unchanged-sequence, incomplete, unsafe, or over-bound evidence.
4. **T-3 — Execute navigation, history, no-stop, Home, and per-ID reuse matrices** (`AC-3`, `AC-7`, `AC-8`, `AC-9`, `AC-13`): extend execution-backed component/API coverage without adding lifecycle UI or a router.
5. **T-4 — Build the designated three-fixture browser harness** (`AC-1`, `AC-2`, `AC-4`, `AC-12`, `AC-15`): create disposable Git fixtures from repository definitions, isolated SQLite, in-process API/runtime/proxy, web process, safe event/socket instrumentation, and unrelated control listener.
6. **T-5 — Execute switching and reconnection behavior** (`AC-1`–`AC-12`): start B, C, then A once so A is displayed after all starts; execute keyboard A→Home→B→Home→C→Home→A, exactly two later B/C re-entries, two away samples, history, A reload, fresh B context, B client close, A/C probes, and B reopen.
7. **T-6 — Materialize and validate retained evidence** (`AC-5`–`AC-14`): retain safe public classes/digests and exactly one ignored mode-0600 restricted authority artifact; classify server-owned restoration with one closed outcome and browser-local editor restoration separately.
8. **T-7 — Implement exact cleanup and residual auditing** (`AC-11`, `AC-14`, `AC-15`): terminate commands and every owned browser/proxy/runtime/service/database/fixture resource by exact identity; prove zero project/resource partitions and control-listener invariance.
9. **T-8 — Update application and operational documentation** (`AC-16`): document delivered persistence limits and evidence while retaining BL-015 and lifecycle exclusions; record no architecture/log change unless implementation first proves a session-ownership expansion and returns to Plan.
10. **T-9 — Run contention and authoritative regression gates** (`AC-17`): add the paved BL-014 and residual recipes, repeat Phase 0 and BL-014 no-retry gates under contention, then run BL-010–013 and full repository/harness validation.

## Impact Assessment

- **Application behavior:** No new lifecycle API, Stop/Restart control, router, persistence field, or runtime owner. Existing Home, stable shell, runtime manager, proxy, and code-server session behavior is exercised and documented.
- **Validation:** New BL-014 fixture/evidence/residual modules, component/API matrices, one designated Chromium scenario, and two minimal Phase 0 stability corrections.
- **Evidence:** New ignored BL-014 public/restricted runtime artifacts plus committed AC-indexed implementation notes; mutable BL-012 evidence is not reused as BL-014 proof.
- **Commands:** Root `justfile` gains focused BL-014 proof/residual recipes and includes the gate in `just verify` after its prerequisites.
- **Documentation:** README, docs index, runtime/routing runbooks, and a BL-014 switching runbook are affected. PRD text, SQLite schema, API payloads, deployment topology, and migrations are not.
- **Architecture:** No ADR, core-component, or decision-log edit is warranted because session ownership does not expand. Any implementation discovery that moves ownership into Ascend must stop and return to Plan before changing architecture.
- **Excluded:** BL-015 performance, user lifecycle behavior, API-restart reconciliation, more than three projects, auto-sleep, cross-browser/tablet, multi-user, scheduling, quotas, and multi-host operation.
