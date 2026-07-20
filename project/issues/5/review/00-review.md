# Code Review: Add local development and validation commands

## Summary
- **Issue:** #5
- **Title:** Add local development and validation commands
- **Base Branch:** main
- **Feature Branch:** feat/5-dev-validation-commands
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 0

## Repository Understanding
Ascend is a greenfield Node.js 22 and TypeScript workflow orchestrator. ADR-0002 keeps Prototype 0 minimal. ADR-0003 and CORE-COMPONENT-0003 make `./harness` the first-choice operating surface, require command mappings to remain in contract data, and define deterministic verdict, exit-code, JSON, evidence, and friction behavior. ADR-0004 and CORE-COMPONENT-0003 R17 add a second behavior category for long-running commands: contract-declared `mode: exec` process handoff.

## Scope of Change
The full `main...HEAD` changeset adds `npm run dev`, a contract-declared `dev` verb, process-handoff support in `harness`, documentation, friction closure, ADR-0004 and R17, and regression coverage. It preserves `boot.maps_to: null`, `verify.maps_to: "npm run typecheck"`, the verify aggregate, dependencies, lockfile, TypeScript configuration, and application source. The branch also contains the complete issue RPIV artifacts and the prior Cycle 1 report.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A documented command starts the local development environment | Met | `package.json:10-12` defines the watch script; `README.md:60-76` documents `./harness dev`; `harness:627-679` performs the process handoff. The guarded suite probe confirms the watch starts and is bounded by a timeout. |
| A documented validation command runs and passes on the baseline codebase | Met | `README.md:83-98` documents validation. Local corroboration found `npm run typecheck` successful and `./harness verify` degraded with exit 0, the accepted non-blocking baseline state. |
| The commands are wrapped/invokable through the harness CLI | Met | `.harness/contract.yml:55-63` maps dev to `npm run dev` with `mode: exec` and verify to `npm run typecheck`; `harness:627-679` genuinely executes the dev mapping through the CLI. Cycle 1 F-01 is resolved. |
| Both commands are documented in the README | Met | `README.md:53-98` documents `./harness dev`, its backing command and handoff semantics, plus `./harness verify` and the validation baseline. |

## Architecture Conformance
- The new watch command wraps the existing TypeScript toolchain and adds no dependency or speculative framework, conforming to ADR-0002.
- `dev.maps_to`, `boot.maps_to`, and `verify.maps_to` remain contract data. The current `dev` mapping performs a real POSIX `exec sh -c "$maps_to"` handoff, emits no verdict/evidence, propagates the wrapped process status, and exposes non-exec `--print` and `--json` forms. CLI arguments are parsed and rejected rather than interpolated; only the trusted contract command is interpreted by `sh -c`. No command-injection path from user-provided CLI arguments was found.
- Unmapped handoff behavior is honest: null/native/empty mappings produce `unknown`, exit 0, friction, and no exec. Existing boot, verify, verdict, JSON, evidence, and friction behavior remains intact.
- ADR-0004, R17, and DECISION-LOG decisions 38 through 46 are present. The ADR and core-component templates have no branch diff, so templates were not edited in place.
- The implementation does not, however, make the new `mode` attribute authoritative; see F-02.

## Test Coverage Assessment
`sh tests/harness/run.sh` completed without hanging and reported 37 passes, 0 failures, 0 skips, and terminal `Verdict: pass`. TEST-20 excludes bare `dev` and uses non-exec introspection. TEST-30 proves the current mapping, JSON descriptor, unmapped behavior, docs, boot deferral, and unchanged validation. TEST-30b is hard-bounded and confirmed the watch starts.

Direct corroboration also found `./harness dev --print` successful with only the resolved command and no verdict, `./harness dev --json` valid and verdict-free, `./harness verify` degraded with exit 0, and `npm run typecheck` successful. Shell syntax checks passed and the tracked working tree remained clean. The missing regression is mode-driven handler selection: tests assert that the current dev tuple says `exec`, but do not prove that changing `mode` changes behavior.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-02 | major | `harness:491-498`, `harness:627-640`, `harness:976-982`; `tests/harness/run.sh:678-704` | **Confidence: high.** `mode` is descriptive rather than the behavior selector promised by ADR-0004 and R17. Dispatch sends `lint/test/build/boot` unconditionally to `verb_capability` and `dev` unconditionally to `verb_exec`; `verb_exec` even defaults a missing mode to `exec`, while R17 says absent or `capability` must select run-to-completion behavior. Orient also hard-codes `dev_mode: exec`. Consequently, setting `boot.mode: exec` in issue #6 would still use the run-to-completion handler and could hang, while removing or changing `dev.mode` would not select capability behavior. Current tests only lock the present values and cannot detect this contract violation. | Read `mode` before selecting the command handler. Route `exec` to the handoff path and absent/`capability` to the capability path, reject unsupported modes, and derive orient output from `get_mode`. Add isolated tests proving `boot` switches to handoff with `mode: exec` and `dev` switches to capability behavior when mode is absent or `capability`, while preserving the current dev and verify behavior. |

## Verdict Rationale
**REQUEST_CHANGES.** Cycle 1 F-01 is genuinely resolved and all issue acceptance criteria are met. The current dev handoff is correct, bounded in tests, and does not expose a new input-injection path. However, the implementation does not enforce the central data-driven selector introduced by ADR-0004 and R17. That major architecture/logic defect would make the documented reusable handoff category fail for `boot`, the specifically anticipated next consumer.

## Suggested Follow-ups
- Make contract `mode` authoritative and add mode-switch regression cases.
- Re-run the same four corroboration commands, preserving current dev introspection, verify aggregation, and no-hang behavior.
