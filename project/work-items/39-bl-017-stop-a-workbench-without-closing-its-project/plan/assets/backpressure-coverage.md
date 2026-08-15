# Backpressure Coverage — BL-017 Stop a Workbench Without Closing Its Project

**Plan**: [01-action-plan.md](../01-action-plan.md)
**Basis (plan SHA-256)**: `9ef68b5ae7f45a7d2e3bcebabf8168a5591ecd2f832f969593547c8b2f2bace0`
**Generated**: 2026-08-15
**Certainty**: Partial

> Advisory only. Never blocks, never gates, no scores. This is an advisory
> backpressure survey. Selection, not enforcement: nothing here executes at
> phase end. The proof lines below are what implementation must preserve.

## Existing Sensors (inventory)

| Sensor | Paved command | Dimension | Found in |
|---|---|---|---|
| Focused Vitest runner | `just verify-focused <files>` | behaviour | root `justfile`; root and API Vitest configs |
| Project-runtime acceptance gate | `just verify-project-runtime` | behaviour | root `justfile`; `apps/api/test/project-runtime-*.test.ts` |
| Stable-route and proxy gate | `just verify-workbench-route` | behaviour, architecture-fitness | root `justfile`; API proxy/route tests and Playwright |
| Project Home gate | `just verify-home-workbench false` | behaviour | root `justfile`; API/web component tests and Playwright |
| Runtime-isolation gate | `just verify-project-runtime-isolation` | behaviour, architecture-fitness | root `justfile`; API isolation tests and Playwright |
| Public runtime-state gate | `just verify-runtime-state` | behaviour, contract integrity | root `justfile`; API/web runtime-state tests |
| Real runtime proof and residual audit | `just proof-project-runtime` and `just proof-project-runtime-residual-audit` | behaviour | root `justfile`; designated-host test and audit CLI |
| Full repository gate | `just verify` | maintainability, behaviour, architecture-fitness | root `justfile` |
| Browser end-to-end suite | `just test-e2e` | behaviour | root `justfile`; `playwright.config.ts`; `tests/e2e/` |

Workspace roots surveyed: repository root, `apps/api`, `apps/web`, and `tests/contracts`.
The probe found root and API Vitest configs, Playwright configuration, 122 test/spec
files, existing source-contract validators, deterministic evidence matrices,
designated-host proofs, and residual-audit CLIs. No Cypress or Jest entry point is
used by this repository.

## Coverage Matrix

| Criterion / failure mode | Phase | Selected proof | Status | Tier | Probe trail |
|---|---|---|---|---|---|
| Selected stop releases only the claimed exact runtime and reports `Stopped` only after the complete ownership audit (AC-1) | 1 | BUILD→RUN: add the selected-stop manager, source guard, matrix, and retained-evidence sensor; then `just proof-runtime-stop` | BUILDABLE | computational | — |
| Graceful delivery, signal-relative escalation, force window, monotonic timing, cancellation, refusal, fault, and hostile primitive bounds (AC-2) | 1 | BUILD→RUN: expose and exercise the shipped injectable termination sequencer; then `just verify-runtime-stop` | BUILDABLE | computational | — |
| Confirmed stop preserves the single registration row and projects `Stopped` without a fifth public state (AC-3) | 1 | EXTEND→RUN: add stop transition-target and post-stop projection cases to the existing runtime-state sensor; then `just verify-runtime-state` | EXTEND | computational | — |
| Repeated stops are bounded successful no-ops only after this manager confirmed a release (AC-4) | 1 | BUILD→RUN: add the released-marker and repeated-stop matrix cases; then `just verify-runtime-stop` | BUILDABLE | computational | — |
| Peer runtimes, unrelated controls, and both finite project fixtures remain unchanged (AC-5) | 1 | EXTEND→RUN: add selected-stop peer/control/manifest cases to the existing isolation sensor; then `just verify-project-runtime-isolation` | EXTEND | computational | — |
| The fixed 31-scenario matrix, mutation rejection, byte-identical retained evidence, and inventory cleanup prove all criteria (AC-6) | 1 | BUILD→RUN: add the BL-017 validator, deterministic serializer, and proof recipe; then `just proof-runtime-stop` | BUILDABLE | computational | — |
| A reuse-health or exit observation settling after a stop claim cannot return or forward the released snapshot | 1 | EXTEND→RUN: add both race winner orders and source-contract checks to the runtime manager sensor; then `just verify-project-runtime` | EXTEND | computational | — |
| The stop route and web transport expose only bounded categories and client-owned notices | 1 | EXTEND→RUN: add strict route/parser and disclosure cases to the existing API and proxy test surfaces; then `just verify-project-runtime` and `just verify-workbench-route` | EXTEND | computational | — |
| Project Home serializes Stop with Close, reconciles once, preserves focus, and never renders optimistic state | 1 | EXTEND→RUN: add the Stop component/controller matrix to the existing Home sensor; then `just verify-home-workbench false` | EXTEND | computational | — |
| Runtime, API, routing, switching, and package documentation contain the delivered stop contract and no stale exclusion claim | 1 | EXTEND→RUN: add BL-017 documentation assertions and reconciliation scans to the existing runtime-state documentation sensor; then `just verify-runtime-state` | EXTEND | computational | — |
| A real managed code-server runtime leaves its exact root, recorded member closure, group, and listener absent out of process | 1 | BUILD→RUN: add the designated stop episode and residual-audit CLI; then `just proof-runtime-stop-residual-audit` | BUILDABLE | computational | — |
| Existing BL-010, BL-011, BL-012, BL-013, BL-016, build, lint, type, unit, and browser behavior remain intact | 1 | EXTEND→RUN: wire the three BL-017 recipes into the existing full gate exactly once; then `just verify` | EXTEND | computational | — |

## Proof Plan (selected)

### Phase 1: Deliver selected runtime stop

| Proves | Mode | Proof line |
|---|---|---|
| Exact selected release, bounded stop vocabulary, sequencer behavior, races, route, transport, and idempotency | BUILD→RUN | Build the BL-017 unit/integration/source-contract sensor; then `just verify-runtime-stop` |
| Deterministic scenario evidence, mutation rejection, metadata/filesystem safety, and byte-identical regeneration | BUILD→RUN | Build the 31-scenario acceptance sensor; then `just proof-runtime-stop` |
| Real-host exact identity, member closure, process-group, listener, and teardown absence | BUILD→RUN | Build the independent designated residual audit; then `just proof-runtime-stop-residual-audit` |
| Existing manager behavior | EXTEND→RUN | Add selected-stop manager and reuse-race cases; then `just verify-project-runtime` |
| Stable route and proxy isolation | EXTEND→RUN | Add stop-in-flight proxy and disclosure regressions; then `just verify-workbench-route` |
| Home accessibility and reconciliation | EXTEND→RUN | Add the Stop interaction matrix; then `just verify-home-workbench false` |
| Peer/control isolation and fixture preservation | EXTEND→RUN | Add selected-stop isolation cases; then `just verify-project-runtime-isolation` |
| Four-state projection and six-event agreement | EXTEND→RUN | Add stop target/event/documentation cases; then `just verify-runtime-state` |
| Whole-repository regression | EXTEND→RUN | Wire the three new recipes into the existing gate; then `just verify` |

## Certainty: Partial

Counts (behaviour/architecture rows): 0 RUN · 7 EXTEND · 5 BUILD · 0 ABSENT

Recommended next move (per-task lookup, advisory): build the risk-linked termination
sequencer and evidence sensors first, then extend the existing runtime, routing,
Home, isolation, state, and full-gate sensors before treating the feature as done.

Every machine-checkable promise has a deterministic destination, but none of the
selected-stop behavior exists on the current branch yet. Five proof surfaces must be
built and seven existing surfaces must be extended, so certainty is Partial until
implementation makes those paved commands real and green.

## Recommended Phase 0: Establish Backpressure (build or extend)

The implementation plan already assigns these sensor changes to T-2 and T-9 through
T-14. This table records the order in which they should become executable; it does
not add another phase or alter task ownership.

| Sensor to build/extend | Proves | Suggested form | Paved command it strengthens/exposes |
|---|---|---|---|
| Extend the project-runtime sensor | Manager state machine, reuse races, and per-phase cleanup cardinality | Vitest manager/process/source-contract cases | `just verify-project-runtime` |
| Extend the runtime-isolation sensor | Peer, control, registration, and fixture non-mutation | Existing two-project acceptance and manifest helpers | `just verify-project-runtime-isolation` |
| Extend the Home and runtime-state sensors | Accessible Stop reconciliation and truthful four-state projection | Existing component matrix, event catalog, and documentation tests | `just verify-home-workbench false`; `just verify-runtime-state` |
| Build the termination-sequencer sensor | Real graceful/force ordering, trusted scheduling, monotonic time, cancellation, refusal, and faults | Production sequencer over injected primitives plus source guards | `just verify-runtime-stop` |
| Build the deterministic stop evidence sensor | All 31 scenarios, mutations, evidence determinism, and cleanup inventory | Acceptance matrix, validator, serializer, and retained artifact | `just proof-runtime-stop` |
| Build the designated residual audit | Real root/member/group/listener absence and fixture retention | Designated-host Vitest episode plus out-of-process audit CLI | `just proof-runtime-stop-residual-audit` |
| Extend the full gate | Every affected regression plus the new proof surfaces | Add each BL-017 recipe exactly once to the root recipe | `just verify` |

## Closing Verdict

One thing I already did, automatically: I selected the exact paved commands that
will prove each selected-stop promise and wrote them beside the plan, so completion
can be decided by commands rather than by an agent's confidence.

One thing that needed approval was teaching the existing runtime, routing, Home,
isolation, state, and full-gate sensors the new behavior, while building the
termination and retained-evidence sensors first. The standing instruction to
continue the backlog supplies that approval, and the implementation plan already
owns those changes. If a command passes while an acceptance claim is still false,
the checker is wrong: fix the checker first, then the product, so the same gap
cannot pass again.

In summary: the new stop recipes will prove exact release, bounded sequencing,
idempotency, retained registration and files, isolation, truthful state, and
deterministic evidence; the extended existing commands will prove regressions and
integration. No acceptance criterion is left to a manual judgement call. Proceed
by building the risk-linked termination and evidence sensors, then make every
selected and extended command green.
