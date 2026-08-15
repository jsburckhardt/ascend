# Implementation Record: BL-016 Accurate Runtime State and Health

## Scope and completed behavior

Implemented T-1 through T-9 on `feat/37-report-accurate-runtime-state-and-health` within ADR-260815-public-runtime-state-projection and the updated runtime lifecycle and structured logging core-components.

- Added the four-value `Stopped` / `Starting` / `Running` / `Failed` public contract and one synchronous, frozen, ordered manager projection with no process, health, port, cleanup, or event dependency calls.
- Added one guarded exact-entry-and-generation `running -> failed` transition shared by false liveness, failed health, and exit settlement. The winner retains one category, performs one cleanup, and emits one `runtime.health.changed`; losers reuse the result without side effects. Shutdown remains suppressed.
- Replaced the non-catalog `runtime.exited` source, test, and shipped-document references while preserving the BL-013 70-record catalog and correlation contract.
- Added the separate `GET /api/projects/runtime` endpoint with authoritative project ordering, exact safe success/failure envelopes, and no change to the four-field project payload or registration/close routes.
- Added strict browser parsing, exact ordered reconciliation, one request per authoritative list revision or Retry, stale-response discard, timeout/abort behavior, and whole-list unavailability.
- Added accessible Project Home state text, stable state/failure/unavailability evidence attributes, safe category notices, a four-state summary, and runtime-state Retry without changing Open, Close, focus, announcement, or navigation ownership.
- Added source guards, event consistency checks, ten executed fake-runtime scenarios, controlled validator mutations, byte-identical disposable/retained serialization, and the root `verify-runtime-state` gate.

## Completed tasks

| Task | Result |
|---|---|
| T-1 | Complete - public vocabulary and synchronous projection |
| T-2 | Complete - guarded terminal transition and event alignment |
| T-3 | Complete - read-only runtime-state endpoint |
| T-4 | Complete - revision-bound browser client/controller |
| T-5 | Complete - Project Home state and unavailability presentation |
| T-6 | Complete - source guard, scenarios, validator, deterministic matrix |
| T-7 | Complete - root validation recipe and full-gate wiring |
| T-8 | Complete - affected application documentation and contract test |
| T-9 | Complete - retained evidence, regressions, and full validation |

## Acceptance evidence

| AC | Concrete implementation and observed evidence |
|---|---|
| AC-1 | `reportPublicStates`, `GET /api/projects/runtime`, strict browser parsing/reconciliation, and Project Home attributes expose only the same four values. `just verify-runtime-state` passed 105 tests; the retained matrix has exact three-surface equality in all ten rows. |
| AC-2 | V-1 proves missing and registered entries are `Stopped` and a delayed accepted start is `Starting`. The executed `stopped-registered` and `starting-delayed-readiness` matrix rows passed. |
| AC-3 | Manager installation still follows resolved readiness; source/event guards reject non-gated success. The executed `running-observed-readiness` row and V-1/V-3 tests require a retained readiness observation before `Running`. |
| AC-4 | V-2 covers start failure, post-readiness exit, failed health, false liveness, both race orders, delayed losers, cleanup rejection, and shutdown suppression. All corresponding executed matrix rows retain `Failed` and one bounded category. |
| AC-5 | V-5 and V-7 cover all visible states, all 12 distinct client-owned notices, stable DOM attributes, loading/transport/timeout/mismatch unavailability, and protected-value scans. Project Home exposes no lifecycle control or server diagnostic. |
| AC-6 | Manager race tests and the executed `cross-project-isolation` row retain an unchanged peer digest. Component tests preserve the peer card's `Running` state, no failure notice, and unchanged Open/Close controls while another project fails. |
| AC-7 | `runtime-state-events.test.ts`, guarded-transition tests, the source guard, and the matrix prove catalog-only event-to-state agreement, one terminal winner event, zero loser events, and no success/healthy event after `Failed`. `just verify-project-runtime-isolation` preserved the exact 70-record catalog. |
| AC-8 | V-1 through V-10 are finite and automated. The ten-scenario retained matrix revalidates after re-read, controlled mutations are rejected, two serializations are byte-identical, all prescribed regressions pass, and final `just verify` passed with BL-016 in sequence. |

## Retained evidence

- Retained artifact: `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json`
- Disposable artifact: `test-results/bl-016/runtime-state-matrix.json`
- SHA-256 for both files: `8473b4afc9b5aa2da1c5ba769bfa6929f4c2bb219a016f80a199f4d25c504485`
- Both files were written from one deterministic string, compared byte-for-byte, independently re-read, revalidated, and reserialized without a byte change.
- The digest and byte identity were reconfirmed after final `just verify`.

## Validation results

| Command | Observed result |
|---|---|
| `just verify-runtime-state` | Passed: 10 files, 105 tests; retained matrix regenerated and revalidated |
| `just verify-project-runtime` | Passed: 5 files, 37 tests |
| `just verify-project-runtime-isolation` | Passed: 9 files / 41 tests, one Chromium episode, exact residual audit, unchanged 70-record catalog |
| `just verify-home-workbench false` | Passed: 7 files / 51 tests, three Chromium episodes, exact residual audit; an initial existing cleanup-bound contention failed once and the unchanged bounded recipe passed on retry |
| `just verify` | Passed: formatting, lint, type check, unit/integration/E2E, designated proofs, BL-016 gate, and residual audits |
| Evidence digest and `cmp` | Passed after full validation; both copies are byte-identical at the recorded digest |

Focused construction also passed the T-1/T-2 manager contract (3 files, 20 tests), T-3 route contract (2 files, 28 tests), browser client/controller/Home coverage, source-guard fixtures, mutation table, and documentation contract.

## Documentation evidence

- Updated `README.md` and `docs/README.md` for user-visible states, endpoint envelopes, Home unavailability, commands, and retained evidence.
- Updated `docs/project-runtime.md` for readiness gating, synchronous projection, retained-failure precedence, all four failure causes, guarded transition semantics, event vocabulary, evidence, and commands.
- Updated `docs/stable-workbench-routing.md` to explain that reporting does not change proxy ownership and adds no client health probe or lifecycle protocol.
- Updated `apps/api/src/routes/README.md` for exact API ordering, success/failure envelopes, disclosure limits, and unchanged project/registration/close contracts.
- `runtime-state-documentation.test.ts` machine-checks these statements and confirms no shipped document contains `runtime.exited`.
- Configuration: no new variable or default. Migration: no data, schema, API-payload, or configuration migration. Architecture: only the accepted global ADR/core-component artifacts and decision-log records changed. Operations/deployment: no new daemon, topology, listener, manual step, or procedure.

## Architecture compliance

- ADR-260815-public-runtime-state-projection: manager-owned synchronous projection, exact four-state vocabulary, bounded failure category, separate endpoint, and revision-bound browser reconciliation are implemented as accepted.
- CORE-COMPONENT-260808-runtime-lifecycle-error-handling: one guarded terminal transition owns competing failure outcomes and cleanup semantics.
- CORE-COMPONENT-260808-structured-runtime-logging: lifecycle events use the NFR-015 catalog and safe project-token correlation; route failure uses the bounded structured event/category.
- DECISION-LOG decisions 95-107 and the accepted plan basis are preserved. No implementation divergence required return to Plan.

## Implement-stage observations

Captured through the real `harness observe` executable: DL-011 (missing `rg`), DL-012 (missing `apply_patch`), DL-013 (fallback patch hunk counts), DL-014 (Fastify autoload source resolution), DL-015 (revision object identity), DL-016 (Home focus order), DL-017 (mutation/report revision race), DL-018 (async source-guard signature), INS-001 (live peer watcher semantics), DL-019 (format backpressure), DL-020 (one BL-012 cleanup-bound retry), and DL-021 (over-specific final task-status guard). No lifecycle hook was invoked by Implement.

## Known limitations and handoff boundary

The feature intentionally adds no polling, event stream, browser health probe, host process, listener, Stop/Restart control, persisted runtime state, or automatic recovery. The matrix uses deterministic fakes only. Final acceptance, GitHub acceptance-checkbox updates, push, and PR creation remain owned by Verify.
