# Implementation Record: BL-017 Stop a Workbench Without Closing Its Project

## Scope and completed behavior

Implemented T-1 through T-14 on
`feat/39-stop-workbench-without-closing-project` within
ADR-260815-selected-runtime-stop-control,
ADR-260815-termination-sequencer-boundary, and the amended runtime lifecycle,
structured logging, and filesystem-safety core-components.

- Added manager-owned selected-runtime stop with a synchronous ownership claim,
  joined same-project requests, confirmed-release state, retained ownership on
  unconfirmed or faulted termination, and one shutdown re-attempt.
- Added a real graceful-then-force termination sequencer with exact process
  identity revalidation, process-group attribution, loopback-listener auditing,
  monotonic phase bounds, cancellation, and a trusted overall deadline.
- Added `POST /api/projects/:id/runtime/stop` with the exact `{ id, outcome }`
  success shape and nine bounded, disclosure-safe rejection categories.
- Added the strict browser transport and single-owner Project Home Stop
  controller with global pending serialization, selected-card busy state,
  focus restoration, bounded Retry and unknown-outcome recovery, and exactly
  one runtime-state refresh after confirmed success.
- Preserved project registration and filesystem fixtures, the four public
  runtime states, peer runtime identity and readiness, unrelated controls,
  Open and Close behavior, stable routing, and session continuity.
- Added a fixed 31-scenario acceptance matrix, source and evidence guards,
  controlled validator mutations, a real designated code-server episode, and
  an independent exact-identity residual audit.
- Added root verification and designated-proof recipes and updated all affected
  user, API, browser, architecture, runtime, routing, and session documentation.

## Completed tasks

| Task | Result |
|---|---|
| T-1 | Complete - stop vocabulary, bounds, lifecycle targets, and exhaustive mappings |
| T-2 | Complete - bounded termination primitive and shipped sequencer |
| T-3 | Complete - manager stop ownership, races, retained failure, and shutdown behavior |
| T-4 | Complete - real process, process-group, listener, and attribution adapter |
| T-5 | Complete - strict selected-project stop route and operational records |
| T-6 | Complete - browser contract and finite transport |
| T-7 | Complete - single-owner Home controller and recovery behavior |
| T-8 | Complete - accessible Stop controls and post-success projection refresh |
| T-9 | Complete - source, contract, sequencer, route, browser, and component proof |
| T-10 | Complete - 31 executed scenarios and deterministic retained evidence |
| T-11 | Complete - real designated-host stop episode and residual audit |
| T-12 | Complete - canonical root recipes and full-gate wiring |
| T-13 | Complete - application and architecture documentation |
| T-14 | Complete - retained evidence, targeted regressions, repeated determinism proof, and full gate |

## Acceptance evidence

| AC | Concrete implementation and observed evidence |
|---|---|
| AC-1 | The manager claims only the selected running entry, the route identifies that project, and successful matrix rows require the complete `processAbsent` / `processGroupAbsent` / `listenerAbsent` audit triple. The non-managed, unregistered, start-in-progress, retained-failure, unconfirmed, fault, deadline, and settlement-invariant rows return bounded non-success classifications with unchanged registrations, public states, peer/control digests, and fixture manifests. The real designated episode independently proved one root, two owned member identities, one process group, and one listener absent. |
| AC-2 | The shipped sequencer gives `SIGTERM` a finite graceful window and delivers `SIGKILL` only after that window. The graceful row records zero escalation; escalation records ordered delivered signals and success within the overall bound. Refused/faulted/deadline/cancellation cases cannot turn incomplete observations into absence and retain `Failed`, never `Stopped`. Direct sequencer tests cover hanging and cancellation-ignoring primitives and the pre-aborted no-side-effect case. |
| AC-3 | Confirmed stop installs only the released registered entry. The graceful, escalated, already-absent-generation, and metadata-retention rows preserve exactly one registration with unchanged stable ID, display name, canonical path, and created-at digests, then observe `Stopped` from the public runtime endpoint after the stop result. |
| AC-4 | The repeated-stop row performs one confirmed release followed by three `already-stopped` results within the declared bound, with no new or terminated identity, restart, lifecycle event, or cleanup after the first result. Registration, fixture digest, and `Stopped` projection remain unchanged. An absent current-manager entry remains the distinct non-success `runtime_not_managed` case. |
| AC-5 | The two-ready-runtime row retains the peer's exact identity digest, `Running` projection, and successful readiness observation. The unrelated control process and listener retain identity and availability, both registrations remain unchanged, and both projects' fixed non-empty fixture manifests retain tree membership, content digests, permission modes, and timestamps. |
| AC-6 | The committed 31-row matrix records finite bounds, result classes, ownership closure, cleanup cardinality, peer/control and metadata retention, public-state ordering, fixed four-class inventories, fixture manifests, and zero final validation-owned residuals. Source guards and controlled mutations reject weakened ownership, timing, mapping, evidence, and cleanup claims. The retained and disposable files are byte-identical and repeated regeneration produced the same SHA-256. Targeted regressions and the complete root gate passed, including the real episode and residual audit. |

## Retained evidence

- Accepted action plan:
  `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/plan/01-action-plan.md`
- Accepted action-plan SHA-256:
  `9ef68b5ae7f45a7d2e3bcebabf8168a5591ecd2f832f969593547c8b2f2bace0`
- Retained matrix:
  `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json`
- Disposable matrix: `test-results/bl-017/runtime-stop-matrix.json`
- Final matrix SHA-256:
  `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3`
- `cmp` proved the retained and disposable matrices byte-identical.
- Two consecutive `just verify-runtime-stop` executions regenerated the same
  bytes and digest. Raw scheduler polling cadence is intentionally excluded
  from retained evidence; its deterministic field records audit presence as
  `0` or `1`, while measured timing remains in the disposable timing artifact.
- The retained artifact excludes timestamps, measured durations, filesystem
  paths, PIDs, ports, authorities, and tokens.

## Validation results

| Command | Observed result |
|---|---|
| `just verify-runtime-stop` | Passed twice: 12 files, 153 tests; fixed 31-scenario catalog and byte-stable retained evidence |
| `just proof-runtime-stop` | Passed: one real code-server selected-stop episode |
| `just proof-runtime-stop-residual-audit` | Passed: one root, two member identities, one process group, and one listener checked; zero residuals |
| `just verify-project-runtime` | Passed: 5 files, 37 tests |
| `just verify-workbench-route` | Passed: 10 files, 54 tests, designated Chromium proof, and residual audit |
| `just verify-home-workbench false` | Passed: 7 files, 51 tests, three Chromium scenarios, and residual audit |
| `just verify-project-runtime-isolation` | Passed: 9 files, 41 tests, designated Chromium proof, and residual audit |
| `just verify-runtime-state` | Passed: 10 files, 105 tests |
| Runtime-stop documentation contract | Passed: 4 files, 20 tests |
| Complete API package | Passed: 102 files passed, 2 skipped; 548 tests passed, 5 skipped; coverage thresholds met |
| Complete web package | Passed: 17 files, 265 tests |
| `just verify` | Passed: formatting, lint, type checks, coverage suites, builds, E2E, historical designated proofs, BL-017 acceptance, the real selected-stop episode, and every configured residual audit |

The API and web Vitest projects both use `maxWorkers: 4` so mixed-project and
process-backed coverage runs receive bounded host backpressure. The API
coverage configuration excludes only the acceptance-owned
`test/runtime-stop-fixtures.ts` helper outside `BL017_ACCEPTANCE=1`; all shipped
source remains covered.

## Documentation evidence

- `README.md` and `docs/README.md` describe the selected Stop behavior,
  distinction from Close, commands, and retained evidence.
- `docs/project-runtime.md` documents ownership, graceful and force bounds,
  confirmed release, retained failure, shutdown behavior, route classifications,
  attribution ceiling, and evidence.
- `docs/stable-workbench-routing.md` preserves stable routing and proxy
  ownership while explaining selected release.
- `docs/session-switching.md` preserves browser-session continuity while a
  selected runtime is released.
- `apps/api/README.md` and `apps/api/src/routes/README.md` document the exact
  endpoint, success and failure envelopes, body/query policy, and disclosure
  boundary.
- `apps/web/README.md` documents keyboard behavior, pending ownership, focus,
  Retry and unknown recovery, and projection refresh.
- Documentation contract tests machine-check the affected behavior and command
  surface.
- Configuration: no product environment variable, user option, or default was
  added. Migration: no schema, data, persisted-process-handle, or payload
  migration is required. Deployment: no daemon, listener, topology, or release
  procedure changed. Operations: the new designated proof and residual audit
  are exposed through the root `justfile`.

## Architecture compliance

- ADR-260815-selected-runtime-stop-control is implemented through one
  manager-owned selected-project command, confirmed-release semantics,
  retained registration, explicit failure, and a non-optimistic browser owner.
- ADR-260815-termination-sequencer-boundary is implemented through fallible
  awaited observations behind a trusted monotonic deadline and synchronous
  signal delivery, with exact-identity checks and no absence inference from
  incomplete observations.
- CORE-COMPONENT-260808-runtime-lifecycle-error-handling retains exact ownership
  and exposes bounded failures instead of reporting false release.
- CORE-COMPONENT-260808-structured-runtime-logging adds only the accepted stop
  lifecycle events and safe operational rejection/failure records.
- CORE-COMPONENT-260808-filesystem-path-safety preserves project and fixture
  paths without deletion or mutation.
- The global artifacts and `DECISION-LOG.md` contain every accepted Plan-stage
  decision. Implementation introduced no ADR or core-component divergence and
  therefore did not return to Plan.

## Harness evidence

Implement-stage friction was captured through real `harness observe` calls,
including the deterministic test backpressure, source-guard formatting,
teardown-order, and retained-evidence cadence findings. The coordinator also
attempted the exact `eng-harness-flow --hook post-coding --json` host skill
invocation. This host's skill API accepts only registered skill names, so the
argument-bearing invocation returned skill-not-found and no lifecycle envelope
was produced. This record does not fabricate success or substitute prior
evidence for that unavailable seam; the observation buffer remains pending for
coordinator disposition.

## Handoff boundary

All planned product, test, evidence, command, architecture, and application
documentation work is complete. The implementation commit provides Verify with
the accepted plan digest, retained matrix digest, passing root gate, and a clean
tree. Final acceptance, independent `just verify`, GitHub acceptance-checkbox
updates, push, PR creation, and merge remain owned by Verify. BL-018
reconciliation after API restart, Restart, bulk stop, idle shutdown, and
arbitrary-process adoption remain out of scope.

## Verify correction 1

Verify returned one application-documentation accuracy defect: `README.md` and `apps/api/src/routes/README.md` attributed registration/fixture checks to the standalone residual audit, although the executable checks only exact root/member identities, the owned process group, and the loopback listener.

- Corrected both documents to assign the real selected-stop episode to registration/fixture retention and recorded ownership evidence, and the standalone residual audit to exact identity, process-group, and listener residual absence only.
- Added a deterministic documentation assertion that rejects any renewed claim that the residual-audit command audits registration or fixtures.
- The accepted plan, architecture artifacts, product code, tests outside this documentation contract, and runtime behavior are unchanged; no Plan-stage or architecture divergence occurred.
- Focused correction gate: `just verify-focused apps/api/test/runtime-stop-documentation.test.ts --reporter=verbose` passed all 15 tests.
- Canonical correction gate: `just verify` passed.
- Accepted action-plan SHA-256: `9ef68b5ae7f45a7d2e3bcebabf8168a5591ecd2f832f969593547c8b2f2bace0`.
- Retained matrix SHA-256: `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3`.
- Retained and disposable matrices were byte-identical by `cmp`; no disposable `test-results/bl-017` file is tracked.
