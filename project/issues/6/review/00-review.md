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


---

## Review Cycle 2 (Re-review)

### Cycle 2 Summary
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** APPROVE
- **Blocking Findings:** 0
- **New Findings:** 0
- **Cycle 1 findings:** F-01 resolved; F-02 resolved; F-03 resolved
- **Base Branch:** `main`
- **Feature Branch:** `feat/6-app-shell-health-endpoint`

The full `main...HEAD` changeset and the Cycle 1 remediation delta were re-reviewed. The remediation narrows the Node runtime floor, makes doctor and verify output truthful, hardens the live probe, and adds focused regressions. No application behavior regression, harness dispatch regression, security defect, or new review finding was found.

### Cycle 1 Finding Resolution

| ID | Prior Severity | Status | Evidence |
|----|----------------|--------|----------|
| F-01 | major | **Resolved** | `package.json:8-10` now declares `>=22.6.0 <23`; `.nvmrc:1` remains `22`; `README.md:43-51,114-118`, `project/architecture/ADR/ADR-0005-application-serve-runtime.md:7-12,78-97`, and `project/architecture/ADR/DECISION-LOG.md:62,74,86-87` agree on the 22.6.0 floor and reason. `harness:339-410,543-568` portably parses the minor version and returns `degraded`/exit 0 below the floor. TEST-21 and TEST-33 cover 21, 22.5, 22.6, 22.17, and 23 boundaries (`tests/harness/run.sh:483-499,1057-1099`). Direct stubbing also confirmed Node 22.5 makes both doctor and verify degraded, never fail. |
| F-02 | minor | **Resolved** | `harness:744-795` builds the unknown-member list from actual aggregate results. On the real contract, friction and evidence name only `lint, build`; they do not claim `test` is unwired or reference Issue #5. TEST-32c covers an empty isolated friction log (`tests/harness/run.sh:1033-1054`). |
| F-03 | minor | **Resolved** | TEST-32b obtains an OS-assigned ephemeral port, applies connect and overall timeouts to every curl, keeps the server under `timeout`/`gtimeout`, and performs numeric-PID kill plus wait (`tests/harness/run.sh:990-1031`). The durable suite completed with TEST-32b passing, no skips, and no leaked `src/main.ts` process. |

### Acceptance Criteria Re-assessment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Ascend serves a minimal application shell at a browser URL | Met | `src/server.ts:17-31,49-52`; application test and TEST-32b both pass. |
| A health endpoint returns a success status when the service is running | Met | `src/server.ts:43-46` returns 200 JSON `{"status":"ok"}`; application test and TEST-32b verify it. |
| The shell and health endpoint start via the documented dev command | Met | `.harness/contract.yml:51-55`, `package.json:14`, `src/main.ts:10-17`, and `README.md:98-121` consistently define and document `./harness boot` to `npm run start`; introspection and the live probe pass. |

### Architecture Conformance

- ADR-0005, Decision Log records #36/#48/#60/#61, `engines.node`, README, and doctor behavior consistently enforce Node `>=22.6.0 <23`.
- No semantic CORE-COMPONENT-0003 amendment is needed. R15 already requires validation of the complete range derived from `engines.node` and already assigns unsupported runtimes the non-failing `degraded` verdict; ADR-0005 supplies the concrete 22.6.0 floor. The localized `compute_doctor` refinement applies that existing rule.
- The new shell code uses POSIX parameter expansion and test constructs; no Bash-only or GNU-only idiom was introduced. `dash -n` passes for both scripts. The optional `timeout`/`gtimeout` probe remains capability-guarded.
- Doctor degradation continues to fold through the unchanged R6 aggregate as `degraded`, not `fail`. Existing handoff verbs and command resolution remain intact, as corroborated by TEST-31 and the full suite.

### Test Coverage and Corroboration

- `./harness verify`: degraded, exit 0; typecheck/test/doctor pass and lint/build are unknown.
- `./harness doctor`: pass, exit 0 on Node 22.17.1; JSON is valid and reports the required range.
- Isolated Node 22.5 stub: doctor degraded, verify degraded, both exit 0, and the reason names 22.6.0.
- `npm run typecheck`: pass, exit 0.
- `npm test`: 3/3 pass, exit 0.
- `sh tests/harness/run.sh`: PASS=42, FAIL=0, SKIP=0; verdict pass.
- Verification left no tracked changes and no live application process.

### Commit and Security Review

All 11 `main..HEAD` commits have Conventional Commit subjects, `Co-authored-by` trailers, and valid GitHub signature verification. The history is linear and local HEAD matches the remote feature head; no evidence of force-push or `--no-verify` use was found. The PR title is conventional. No common secret pattern, binary payload, or unexpected executable-mode change was found.

### New Findings

| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| — | — | — | No new findings. | — |

### Cycle 2 Verdict Rationale

**APPROVE.** F-01, F-02, and F-03 are genuinely resolved. All three issue acceptance criteria remain met, the narrowed runtime contract is coherent, the fixes are portable and covered by deterministic regressions, and no new correctness, security, error-handling, architecture, or test-coverage issue was found. The intentionally stale offline lockfile remains the already-documented environment caveat and is not a review finding.

### Cycle 2 Suggested Follow-ups

None required for approval.
