# Code Review: Launch one code-server process against a configured path

## Summary
- **Issue:** #7
- **Title:** Launch one code-server process against a configured path
- **Base Branch:** main
- **Feature Branch:** feat/7-code-server-launcher
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 1

## Repository Understanding
Ascend orchestrates cross-project developer workflows while an external browser-based VS Code provider supplies the IDE. The repository uses the RPIV pipeline, a minimal Node.js and TypeScript baseline, and ./harness as its operating surface. Long-running commands use the ADR-0004 and CORE-COMPONENT-0003 mode: exec handoff contract.

## Scope of Change
The branch adds a POSIX code-server launcher, exposes it through the edit handoff verb, wires launcher tests into npm test, extends the harness regression suite, and adds ADR-0006 plus issue documentation. The changeset contains no package-lock.json or application src/ changes.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC1 — documented script launches one instance against a configured path | **Unmet** | The script and stubbed invocation exist, but required manual Task T9 was not performed; the verification summary marks this criterion not verifiable (project/issues/7/verify/summary.md:45-51). |
| AC2 — browser reaches the editor with the configured folder open | **Unmet** | Only a manual procedure is documented; no completed browser evidence exists (project/issues/7/implementation/README.md:208-241). |
| AC3 — integrated terminal works in the configured folder | **Unmet** | Only a manual procedure is documented; no completed terminal evidence exists (project/issues/7/implementation/README.md:208-241). |
| AC4 — invalid-path behavior is documented | **Met** | README documents all required cases (README.md:185-195); launcher validation is fail-fast (scripts/launch-editor.sh:33-55) and automated tests pass. |
| AC5 — launcher does not mutate the project directory | **Met, with test caveat** | The launcher contains only read-only path tests followed by exec and has no target mutation path (scripts/launch-editor.sh:24-61). See F-002 for snapshot limitations. |

## Architecture Conformance
ADR-0006 is correctly global and registered in the decision log with decisions #62-#72. The implementation follows inherited ADR-0002/0003/0004/0005 boundaries and creates no speculative core-component. Operational provider arguments remain in scripts/launch-editor.sh; the contract, harness dispatch, npm script, and src/ do not carry provider flags.

The edit verb is declared mode: exec, exposes non-executing --print and --json forms, is excluded from run-to-completion enumeration, and propagates the provider exit code. The harness code change is limited to structural dispatch and help text. Commit messages and the PR title follow Conventional Commits, all six commits carry the required trailers, and the verifier commit changes only its summary artifact.

## Test Coverage Assessment
Independent checks passed: TypeScript typecheck, all 11 application and launcher tests, all 43 harness regression checks, and the canonical gate with a non-blocking degraded verdict. A controlled provider exit of 37 propagated through ./harness edit. No live code-server demo was completed, leaving AC1-AC3 unresolved.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-001 | blocking | project/issues/7/implementation/README.md:119-120,208-241; project/issues/7/verify/summary.md:45-51,81-85 | Required manual Task T9 was not executed. There is no evidence that a real code-server instance starts, opens the configured folder in a browser, or provides a working integrated terminal, so AC1-AC3 remain unmet. | Run the documented demo on a provisioned host and record the startup command and duration, single-instance observation, opened folder, terminal command and working directory, and before/after project snapshot. Then update verification evidence and acceptance statuses. |
| F-002 | minor | tests/launcher/launch-editor.test.ts:80-95,193-253 | The snapshot called byte-for-byte records only entry type, size, and mtime. It cannot detect permission changes, symlink-target changes, or content replacement with preserved size and timestamp; TEST-L7 also has no before/after snapshot. | Hash regular-file contents, use lstat to capture modes and symlink targets, and apply the snapshot assertion to every valid launch variant. |
| F-003 | minor | .harness/README.md:49,216-219 | Harness documentation still says npm test runs only tests/app/, while the delivered test script also runs tests/launcher/. This conflicts with the same document at lines 245-247. | Update both stale references to describe the application and launcher suites. |

## Verdict Rationale
**REQUEST_CHANGES.** The implementation and automated checks are otherwise sound, but the issue and its own test plan require manual AC1-AC3 evidence. Those criteria are explicitly still pending, so the delivery cannot be approved.

## Suggested Follow-ups
- Complete Task T9 without adding code-server as a repository dependency.
- Strengthen the no-mutation snapshot and correct the stale harness test documentation.
