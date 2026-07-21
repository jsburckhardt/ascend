# Code Review: Add a minimal Ascend health endpoint and application shell

## Summary
- **Issue:** #6
- **Title:** Add a minimal Ascend health endpoint and application shell
- **Base Branch:** main
- **Feature Branch:** feat/6-app-shell-health-endpoint
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 0
- **Review Cycle:** 1 (initial review)

## Repository Understanding
Ascend is a greenfield Node.js/TypeScript workflow orchestrator. ADR-0002 keeps Prototype 0 framework-free and dependency-light. ADR-0003, ADR-0004, and CORE-COMPONENT-0003 make `./harness` the data-driven operating surface and define deterministic aggregation plus `mode: exec` process handoffs. ADR-0005 establishes the first application runtime: built-in `node:http`, direct TypeScript execution, a thin shell, `/health`, and `boot`/`test` harness wiring.

## Scope of Change
The full `main...HEAD` changeset contains 22 files. It replaces the placeholder with `src/server.ts` and `src/main.ts`, adds three `node:test` integration tests, wires `boot` and `test` through contract data, updates harness prose and regression coverage, adds ADR-0005 plus Decision Log records 47–59, and supplies README and issue RPIV artifacts. The `harness` executable has only human-facing string changes; its dispatch and command-resolution logic is unchanged.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| Ascend serves a minimal application shell at a browser URL | Met | `src/server.ts:17-31,49-52` serves non-empty HTML for `GET /`; `tests/app/shell.test.ts:11-21` and the guarded live probe confirm it. |
| A health endpoint returns a success status when the service is running | Met | `src/server.ts:43-46` returns 200 JSON with `{"status":"ok"}`; `tests/app/health.test.ts:10-19` verifies status, content type, and body. |
| The shell and health endpoint start via the documented dev command | Met in the reviewed Node 22.17 environment | `.harness/contract.yml:51-55` maps `boot` as `mode: exec` to `npm run start`; `package.json:14` and `src/main.ts:12-17` start the server; `README.md:93-123` documents the complete path. F-01 identifies a broader declared-runtime compatibility defect. |

## Architecture Conformance
- The implementation conforms to ADR-0005 D1 and D3–D8: built-in HTTP only, no runtime dependency or build output, non-listening factory, `PORT`/3000, exact health body, thin shell, built-in tests, data-only `boot`/`test` mappings, and no new core-component.
- Query strings are handled without widening methods; non-GET requests and unknown paths return 404. No route handling leaked into `src/main.ts`.
- `boot` is an R17 `mode: exec` handoff. The durable suite never runs bare real-contract `./harness boot`; the one bare `boot` execution uses an isolated `true` mapping.
- F-01 conflicts with ADR-0002 and CORE-COMPONENT-0003 R15 because the declared supported range accepts early Node 22 releases that lack the selected runtime flag.
- F-02 is a remaining R4/R9 truthfulness defect in generated friction text.
- All seven branch commits have Conventional Commit subjects, valid GitHub signature verification, and `Co-authored-by` trailers. The PR title is conventional. No common secret pattern or prohibited harness dispatch change was found.

## Test Coverage Assessment
Corroboration completed successfully: `npm run typecheck`; the three application tests; the canonical gate with typecheck/test/doctor passing, lint/build unknown, and a degraded exit-0 verdict; and the durable harness suite with 40 passes, no failures, and no skips. A separate ephemeral-port probe confirmed the factory starts unbound, query-bearing shell/health URLs return 200, and POST `/health` plus an unknown path return 404. The probe port was released.

The application tests bind port 0 and close their server in `finally` (`tests/app/support.ts:15-25`). TEST-A1/A2/A3, H1–H4, R1, and V1 are represented. F-03 identifies isolation and timeout weaknesses in the additional fixed-port TEST-32b probe.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-01 | major | `package.json:8-15`; `.nvmrc:1`; `project/architecture/ADR/ADR-0005-application-serve-runtime.md:71-79` | The repository declares and the harness doctor accepts every Node 22 release, but `--experimental-strip-types` was introduced in Node 22.6.0. On accepted Node 22.0–22.5, both `npm run start` and `npm test` fail before executing, so the documented operating surface is not valid across the architectural support range. Pinning only the major does not mitigate this. | Establish a compatible Node 22 minimum or exact pin, then make `engines`, `.nvmrc`, README, ADR/Decision Log, doctor behavior, CORE-COMPONENT-0003 R15, and boundary tests agree. |
| F-02 | minor | `harness:745-751` | When the friction log has no existing `verify` entry, current `verify` still writes that `test` has no backing command and that Issue #5 must wire it. `test` is now mapped and passes, so this creates a false append-only friction record despite R4/R9 truthfulness requirements. | Generate the friction explanation from the actual unknown members, or at minimum update it to lint/build and the current closure; add an empty-friction-log regression with the real contract. |
| F-03 | minor | `tests/harness/run.sh:987-1009` | TEST-32b binds fixed port 39517 rather than an ephemeral port, and its `curl` calls have no client timeout. A concurrent listener can make the test flaky, target the wrong process, or defeat the claimed hard bound by accepting a request without responding. | Allocate an isolated available port and bound every client operation with connection/overall timeouts; retain explicit process cleanup and waiting. |

## Verdict Rationale
**REQUEST_CHANGES.** All three issue acceptance criteria work in the reviewed environment, and the implementation is otherwise minimal and consistent with ADR-0005. However, F-01 is a high-confidence major runtime-support mismatch: commands required by the feature fail on versions the repository and harness explicitly accept. F-02 and F-03 are non-blocking harness truthfulness and test-isolation defects. There are no blocking-severity findings.

## Suggested Follow-ups
- Reconcile the intentionally stale lockfile with a connected `npm install` as already documented; this is not a review finding.
- Preserve the dependency-free server, ephemeral application tests, data-only mappings, and current aggregate behavior while addressing F-01 through F-03.
