# Code Review: Launch one code-server process against a configured path

## Summary
- **Issue:** #7
- **Title:** Launch one code-server process against a configured path
- **Base Branch:** main
- **Feature Branch:** feat/7-code-server-launcher
- **Reviewer Model:** GPT-5.6 Sol
- **Review Cycle:** 2
- **Verdict:** APPROVE
- **Blocking Findings:** 0

## Repository Understanding
Ascend orchestrates cross-project developer workflows while an external browser-based VS Code provider supplies the IDE. The repository uses the RPIV pipeline, a minimal Node.js and TypeScript baseline, and `./harness` as its operating surface. Long-running commands use the ADR-0004 and CORE-COMPONENT-0003 `mode: exec` handoff contract.

## Scope of Change
The full branch adds a POSIX code-server launcher, exposes it through the `edit` handoff verb, wires launcher tests into `npm test`, extends the harness regression suite, and records ADR-0006 plus issue documentation.

Cycle 2 changes only `tests/launcher/launch-editor.test.ts`, `.harness/README.md`, and issue implementation, verification, and review artifacts. The launcher, `edit` verb, contract, harness wiring, package manifest, and harness regression suite are unchanged from cycle 1. The branch contains no `package-lock.json` or application `src/` change against `main`.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC1 — documented script launches one instance against a configured path | **Met** | The launcher performs one `exec code-server` handoff (`scripts/launch-editor.sh:50-61`). T9 records one loopback listener for the configured folder and measured startup (`project/issues/7/implementation/README.md:247-264`). |
| AC2 — browser reaches the editor with the configured folder open | **Met** | T9 records the root redirect carrying the configured folder, a successful VS Code Workbench response, and a successful health response (`project/issues/7/implementation/README.md:265-267`). This is adequate reachability and folder-selection evidence in the headless environment. |
| AC3 — integrated terminal works in the configured folder | **Met** | The live run used the provisioned code-server bundle to spawn a real PTY shell in the configured project working directory, execute commands, and exit successfully (`project/issues/7/implementation/README.md:268-273`). Exercising the actual bundled terminal backend is adequate for this CLI-only Prototype-0 demonstration; lack of a human GUI click is not blocking. |
| AC4 — invalid-path behavior is documented | **Met** | README documents all required cases (`README.md:185-195`); launcher validation is fail-fast (`scripts/launch-editor.sh:30-55`) and TEST-L1 through TEST-L6 pass. |
| AC5 — operation does not mutate the project directory | **Met** | The launcher has only validate-only checks before handoff (`scripts/launch-editor.sh:30-61`). Hardened recursive snapshots cover valid launch variants (`tests/launcher/launch-editor.test.ts:83-134,250-294`), and T9 records an identical live before/after byte-and-hash snapshot (`project/issues/7/implementation/README.md:274-277`). |

All five issue checkboxes are checked in the current GitHub issue body.

## Architecture Conformance
The implementation remains within ADR-0006 and inherited ADR-0002 through ADR-0005 boundaries. Provider arguments remain isolated in `scripts/launch-editor.sh`; the contract and harness expose only the provider-agnostic `npm run edit` handoff. The `edit` verb remains `mode: exec`, supports non-executing `--print` and `--json` introspection, and uses only the CORE-COMPONENT-0003-permitted structural dispatch change.

Security and error handling remain appropriate for the local spike: loopback-only binding limits the documented no-auth posture, invalid project paths and a missing provider fail clearly before launch, quoting preserves configured paths as one argument, and provider exit status propagates through `exec`. No dependency, lockfile, or application-source change was introduced.

## Test Coverage Assessment
Independent cycle-2 checks all completed successfully:

- `npm run typecheck`: pass, exit 0.
- `npm test`: 11 tests passed, including all 8 launcher cases.
- `sh tests/harness/run.sh`: 43 passed, 0 failed, 0 skipped.
- `./harness verify`: expected `degraded` verdict, exit 0; typecheck and test passed while intentionally absent lint/build capabilities remained unknown.

The revised snapshot records entry type, ordinary permission bits, size, timestamp, SHA-256 file content, and symlink target via `lstat`, and recursively avoids following symlinked directories (`tests/launcher/launch-editor.test.ts:83-134`). It therefore detects ordinary permission changes, symlink retargeting, and same-size content replacement. TEST-L7 now receives the same before/after assertion (`tests/launcher/launch-editor.test.ts:279-294`).

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-001 | blocking | `project/issues/7/implementation/README.md:247-283`; `project/issues/7/verify/summary.md:45-70` | **Resolved in cycle 2; no longer active.** T9 now records adequate live evidence for AC1 through AC3 and re-confirms AC5. | None — closed. |
| F-002 | minor | `tests/launcher/launch-editor.test.ts:83-134,250-294` | **Resolved in cycle 2; no longer active.** The snapshot now uses `lstat`, content hashing, permission metadata, and symlink targets recursively, and TEST-L7 is covered. | None — closed. |
| F-003 | minor | `.harness/README.md:43-54,216-222` | **Resolved in cycle 2; no longer active.** Both stale references now describe the application and launcher suites consistently. | None — closed. |

No active findings were identified in cycle 2.

## Verdict Rationale
**APPROVE.** Every acceptance criterion is met, all cycle-1 findings are resolved, architecture and security boundaries remain intact, and all requested independent checks pass. The headless AC3 demonstration is sufficient for this Prototype-0 CLI environment because it exercises the actual code-server bundled PTY backend in the configured folder.

## Suggested Follow-ups
No follow-up is required for issue #7. Retain the documented requirement to revisit the loopback no-auth posture before any shared or remote exposure.
