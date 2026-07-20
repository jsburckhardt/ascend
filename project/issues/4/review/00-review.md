# Code Review: Generate the engineering harness CLI via the harness-cli-it agent

## Summary
- **Issue:** #4
- **Title:** Generate the engineering harness CLI via the harness-cli-it agent
- **Base Branch:** main
- **Feature Branch:** feat/4-harness-cli
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 0

## Repository Understanding
Ascend is a greenfield TypeScript/Node.js workflow orchestrator. Issue #4 establishes `./harness` as the mandatory first-choice operating surface while preserving ADR-0002: wrap existing npm commands, add no speculative build system, expose capability gaps honestly, and maintain evidence/friction records through a portable contract.

## Scope of Change
The full `origin/main...feat/4-harness-cli` changeset contains 35 files: the executable harness and contract, harness documentation and VCS policy, canonical verification configuration, ADR-0003 and CORE-COMPONENT-0003, issue RPIV artifacts, one marker block on each of 17 agent surfaces, and the cycle-1 regression suite. The re-review focused on the cycle-1 remediation while rechecking the complete branch.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A repo-local harness CLI exists, generated via the harness-cli-it agent | Met | `harness` is tracked executable and exposes the required 12-verb surface. |
| The harness wraps existing commands rather than reimplementing them | Met | The sole typecheck mapping is in `.harness/contract.yml`; executed command strings are read through `maps_to`. |
| The harness records evidence for commands it runs | Met for the Issue #4 baseline | `verify` persists collision-safe JSON evidence atomically and fails if required persistence fails. |
| Supported human and agent workflows are documented | Met | `.harness/README.md` and all 17 agent surfaces document the harness workflow. |
| The harness is invocable from a documented single entry point | Met | `./harness <verb>` is documented and the executable is repo-local. |

## Architecture Conformance
The primary F-01 architecture divergence is corrected: command wiring comes from contract `maps_to` values, `clean` honors its mapping, and `verify` reads `verify.aggregate`, includes `doctor`, and applies the ordered total function. R14 persistence and R15 Node-major handling also conform on inspected paths. Agent marker blocks and VCS policy conform to R10/R13.

R2, R7, and R16 are not yet fully conformant. A failing human `verify` does not leave its verdict as the terminal line; empty friction logs break machine JSON; and the regression suite does not actually enforce all portability/idempotency claims. A new aggregate rendering bug also executes mapped members twice in human mode.

## Test Coverage Assessment
The isolated regression suite completed with 31 passes, no failures/skips, and left tracked state clean. TypeScript typecheck, POSIX-shell syntax checks, baseline human verdict counts, baseline machine JSON parsing, diff checks, commit trailers, 17 marker blocks, and VCS tracking/ignore policy also passed.

The green suite is not sufficient for approval: an independent empty-log probe produced invalid JSON for `status --json` and `friction list --json`; TEST-20 does not assert that the verdict is the final line on failure; TEST-24 can pass on GNU awk; and TEST-13 only checks marker ordering rather than rerun idempotency.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-02R | major | `harness:636-654` | Help and friction-list verdicts are fixed, but R2 remains incomplete. On a typecheck failure, `verify` prints `Verdict: fail` and then prints the captured typecheck diagnostic, so the required terminal verdict line is not terminal. TEST-20 only counts verdict lines on passing/baseline paths. | Print diagnostics before the single verdict line and add a forced-failure assertion that the last output line is exactly `Verdict: fail`. |
| F-06 | major | `harness:585-603`, `harness:640-649` | Human `verify` calls `resolve_member` once to derive/persist the aggregate and again to render output. Once lint/test/build are mapped, every member command runs twice; a stateful/flaky command can make displayed checks disagree with the persisted evidence and overall verdict. | Resolve each member once, cache its verdict/reason/rendered row, and reuse that result for aggregation, evidence, and human output. Add an invocation-count regression test. |
| F-07 | major | `harness:657-680`, `harness:797-816` | An empty regular friction file makes both `status --json` and `friction list --json` invalid. `grep -c` emits `0` but exits 1, so `|| echo 0` contributes a second `0` to the numeric JSON field. This violates the stable machine schema and is not covered because tests always copy the non-empty seed log. | Compute counts with a command that prints exactly one number, and add missing/empty/read-error friction-log cases for both human and JSON forms. |
| F-08 | major | `tests/harness/run.sh:24`, `tests/harness/run.sh:329-342`, `tests/harness/run.sh:435-462` | The R16 suite is not POSIX-portable as claimed (`mktemp`, `sha256sum`, `grep -o`, `head -c`, and implementation-specific awk flags), and TEST-24 computes `nongnu` but does not require it for success. The portability test therefore passes on GNU awk without validating the required non-GNU userland. | Use POSIX utilities such as `cksum`, remove implementation-specific options, create scratch space portably, and require an actual non-GNU awk/BusyBox execution (or fail/explicitly skip when unavailable). |
| F-09 | minor | `tests/harness/run.sh:249-274` | TEST-13 does not exercise the planned idempotency test. One marker pair with begin-before-end does not prove that rerunning the updater is byte-identical or preserves content outside the markers. | Snapshot all 17 surfaces, run the real update operation in an isolated copy, and compare full hashes plus content outside the markers. |

## Verdict Rationale
All five issue-level acceptance criteria are delivered and no blocking finding remains. However, the cycle-1 implementation still violates mandatory R2/R7 behavior, can execute future aggregate checks twice, and overstates R16 coverage. These high-confidence major findings require correction before merge, so the verdict remains REQUEST_CHANGES.

## Suggested Follow-ups
- Keep the corrected data-driven dispatch, persistence, escaping, Node-range, marker, and VCS behavior unchanged while addressing F-02R and F-06 through F-09.
- Update `.harness/README.md` after correction so the all-unknown aggregate and persistence-failure semantics match the tightened contract.

## Review Cycle 1 Re-Review

### Prior Finding Disposition
| Prior finding | Disposition | Evidence |
|---------------|-------------|----------|
| F-01 (blocking) | Resolved | Wrapped commands come from `maps_to`; `clean.maps_to` is honored; `verify.aggregate` is iterated with `doctor`; the ordered total function is implemented; data-only rewiring reaches `pass`. F-06 is a separate duplicate-execution regression in human rendering. |
| F-02 (major) | Partially resolved | `help` and `friction list` now emit one `Verdict: pass` line and baseline verbs emit one line. The failing `verify` path still violates the tightened terminal-line requirement (F-02R). |
| F-03 (major) | Resolved | `doctor` accepts major 22 and degrades majors 21 and 23; boundary regression checks pass. |
| F-04 (major) | Resolved | Evidence names include second-independent uniqueness, writes use same-filesystem temp plus rename, persistence operations are checked, and required failures return `fail`/exit 1. |
| F-05 (major) | Resolved in implementation | JSON escaping uses POSIX awk with untrusted input passed as data and correctly handles multiline/control input under dash plus mawk. F-08 concerns the durability and portability enforcement of the new suite, not the escaping routine itself. |

### Re-Review Verdict
**REQUEST_CHANGES** — zero blocking findings; four major and one minor high-confidence findings remain.
