# Backpressure Coverage: BL-016 Runtime State

- **Basis:** `90591007249502c27782e0d49b9703767977fbf9374d911c7b53a14c6d474011`
- **Plan:** `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/plan/01-action-plan.md`
- **Surveyed:** 2026-08-15
- **Certainty:** Partial

## Existing deterministic sensors

| Sensor | Paved command | Dimension | Evidence |
| --- | --- | --- | --- |
| Focused Vitest entry point across API and web workspaces | `just verify-focused <files>` | behavior, contract, privacy | Root `justfile`; API and web Vitest suites |
| Runtime boundary regression | `just verify-project-runtime` | lifecycle behavior | Root `justfile`; BL-010 manager/process tests |
| Multi-project isolation regression | `just verify-project-runtime-isolation` | concurrency, lifecycle ownership | Root `justfile`; BL-013 fake and Chromium proofs |
| Project Home regression | `just verify-home-workbench false` | user experience, integration | Root `justfile`; BL-012 API/component/browser matrix |
| Full repository gate | `just verify` | maintainability, integration, regression | Root `justfile`; format, lint, type, unit, build, browser, and delivered-story gates |

The repository contains root and workspace Vitest configurations, React
Testing Library component tests, Playwright configuration and browser
scenarios, contract tests, documentation tests, retained evidence validators,
and root justfile recipes. The plan extends these sensors; it does not require
a new test runner or manual proof path.

## Experienced failure modes

- A process exists but is reported `Running` before readiness.
- A retained failure is erased into `Stopped`.
- False-liveness, failed-health, and exit contenders produce zero or duplicate
  terminal events, cleanup, or failure categories.
- Runtime, API, and Home surfaces disagree for one project observation.
- A stale, missing, extra, duplicate, or reordered report attaches to the
  wrong authoritative project-list revision.
- A failed project changes a peer project's state or category.
- Public payload or rendered notice leaks paths, ports, authorities, commands,
  environment values, credentials, or diagnostics.
- The four-field project payload, stable proxy boundary, or manager-only
  lifecycle ownership drifts.
- Disposable test output is mistaken for committed acceptance evidence.

## Coverage matrix

| Promise / failure mode | Status | Tier | Selected proof |
| --- | --- | --- | --- |
| AC-1: exactly four states and three-surface agreement | EXTEND | computational | EXTEND existing API contract, route, client, and component tests, then RUN: `just verify-focused apps/api/test/runtime-state-contract.test.ts apps/api/test/runtime-state-route.test.ts apps/web/src/runtime-state-client.test.ts apps/web/src/runtime-state-component-matrix.test.tsx --reporter=verbose` |
| AC-2: no-runtime is Stopped and pre-readiness is Starting | EXTEND | computational | EXTEND the runtime-manager fake lifecycle harness, then RUN: `just verify-focused apps/api/test/runtime-state-contract.test.ts apps/api/test/runtime-state-manager.test.ts --reporter=verbose` |
| AC-3: Running requires observed readiness | EXTEND | computational | EXTEND the runtime-manager and event tests with the delayed readiness gate, then RUN: `just verify-focused apps/api/test/runtime-state-manager.test.ts apps/api/test/runtime-state-events.test.ts --reporter=verbose` |
| AC-4: every required failure path reports Failed once | EXTEND | computational | EXTEND manager tests with false-liveness, health-versus-exit, and delayed-loser races, then RUN: `just verify-focused apps/api/test/runtime-state-manager.test.ts apps/api/test/runtime-state-events.test.ts --reporter=verbose` |
| AC-5: Home renders all states and a safe failure notice | EXTEND | computational | EXTEND React component and client disclosure tests, then RUN: `just verify-focused apps/web/src/runtime-state-client.test.ts apps/web/src/use-runtime-state.test.tsx apps/web/src/runtime-state-component-matrix.test.tsx --reporter=verbose` |
| AC-6: one failed runtime leaves its peer unchanged | EXTEND | computational | EXTEND manager, route, and Home matrix tests with stable peer digests, then RUN: `just verify-focused apps/api/test/runtime-state-manager.test.ts apps/api/test/runtime-state-route.test.ts apps/web/src/runtime-state-component-matrix.test.tsx --reporter=verbose` |
| AC-7: public transitions emit one consistent NFR-015 event | EXTEND | computational | EXTEND event and isolation catalog tests, then RUN: `just verify-focused apps/api/test/runtime-state-events.test.ts apps/api/test/project-runtime-isolation-acceptance.test.ts --reporter=verbose`; RUN regression: `just verify-project-runtime-isolation` |
| AC-8: finite complete state and transition validation | BUILDABLE | computational | BUILD the planned BL-016 scenario validator, committed matrix artifact, and root recipe, then RUN: `just verify-runtime-state` |
| Guarded transition remains the sole running-to-failed owner | EXTEND | computational | EXTEND the planned source-contract guard and negative fixtures, then RUN: `just verify-runtime-state` |
| Public state remains memory-only and the project payload stays four-field | EXTEND | computational | EXTEND route and schema-minimization contract tests, then RUN: `just verify-runtime-state`; RUN regression: `just verify-project-runtime` |
| Runtime reports and notices disclose only bounded safe fields | EXTEND | computational | EXTEND serialized-body, notice-map, DOM, and retained-artifact scans, then RUN: `just verify-runtime-state` |
| Existing runtime, isolation, Home, and repository behavior remains green | EXISTS | computational | RUN: `just verify-project-runtime`; RUN: `just verify-project-runtime-isolation`; RUN: `just verify-home-workbench false`; RUN: `just verify` |

## Proof Plan (selected)

1. EXTEND the existing Vitest contract and fake-runtime sensors for the public
   projection, guarded terminal transition, event consistency, endpoint,
   client reconciliation, and Home rendering; RUN:
   `just verify-focused <changed-test-files> --reporter=verbose`.
2. BUILD the planned deterministic BL-016 matrix validator, committed evidence
   copy, and root acceptance recipe; RUN: `just verify-runtime-state`.
3. RUN affected delivered-story gates:
   `just verify-project-runtime`,
   `just verify-project-runtime-isolation`, and
   `just verify-home-workbench false`.
4. RUN the canonical repository gate: `just verify`.

## Recommended Phase 0: Establish Backpressure

| Order | Build or extend | What it proves | Paved command |
| --- | --- | --- | --- |
| 1 | Extend the existing runtime-manager fake harness with controllable readiness, liveness, health, exit, cleanup, and delayed-loser seams | The named lifecycle races have one state, category, cleanup, and event | `just verify-focused apps/api/test/runtime-state-manager.test.ts apps/api/test/runtime-state-events.test.ts --reporter=verbose` |
| 2 | Extend source-contract validation with the synchronous projection and guarded-transition rules | Lifecycle authority cannot drift into async probes or unguarded failure paths | `just verify-runtime-state` |
| 3 | Build the deterministic ten-scenario matrix, mutation validator, committed evidence copy, and root recipe | AC-1 through AC-8 have one finite acceptance sensor and durable evidence | `just verify-runtime-state` |

These sensor extensions and the new paved recipe are already assigned to
T-1, T-2, T-6, and T-7. No additional unplanned phase is required.

## Closing Verdict

We will know the runtime-state work is done when the focused lifecycle,
endpoint, client, and Home tests prove the four-state contract and its race
behavior; the new runtime-state recipe validates the deterministic matrix and
its committed evidence; the affected runtime, isolation, and Home regressions
remain green; and the full repository gate passes. The current harness is
**Partial** because the reusable test runners and regression recipes exist,
while the BL-016 scenarios and their paved acceptance recipe must be built as
part of the accepted plan.

Mode mix for behavior and architecture rows: **1 RUN, 10 EXTEND, 1 BUILD,
0 ABSENT**. The advisory next move is to land the named sensor extensions and
the BL-016 recipe before claiming feature completion.
