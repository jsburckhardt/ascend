# Code Review: Add local development and validation commands

## Summary
- **Issue:** #5
- **Title:** Add local development and validation commands
- **Base Branch:** main
- **Feature Branch:** feat/5-dev-validation-commands
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** APPROVE
- **Blocking Findings:** 0
- **Review Cycle:** 3 (final re-review)

## Repository Understanding
Ascend is a greenfield Node.js 22/TypeScript workflow orchestrator. ADR-0002 keeps Prototype 0 minimal. ADR-0003 and CORE-COMPONENT-0003 make `./harness` the first-choice operating surface and define data-driven command mappings, deterministic verdicts, exit codes, JSON, evidence, and friction. ADR-0004 and CORE-COMPONENT-0003 R17 add a contract-declared `mode: exec` category for long-running process handoff.

## Scope of Change
The full `main...HEAD` changeset adds the `npm run dev` watch script, a contract-declared `dev` verb, exec-handoff support, documentation, a friction closure, ADR-0004/R17, RPIV artifacts, and harness regression coverage. The Cycle 2 fix adds mode-driven `dispatch_verb`, removes the exec-handler's missing-mode default, derives orientation mode from the contract, and adds hermetic TEST-31. No application source, lockfile, TypeScript configuration, or verification-gate drift was found.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A documented command starts the local development environment | Met | `package.json:10-12` defines the watch script; `README.md:60-76` documents `./harness dev`; `.harness/contract.yml:55-59` declares the `exec` handoff. |
| A documented validation command runs and passes on the baseline codebase | Met | `README.md:83-98` documents validation. Corroboration confirmed `npm run typecheck` passes and `./harness verify` remains the accepted `degraded`/exit-0 honest baseline. |
| The commands are wrapped/invokable through the harness CLI | Met | `harness:628-682` hands off the `dev` mapping and `harness:686-789` wraps/aggregates validation. `dispatch_verb` at `harness:971-989` now selects the capability or handoff handler from contract `mode`. |
| Both commands are documented in the README | Met | `README.md:53-98` documents `./harness dev`, its backing command, handoff semantics, `./harness verify`, and the validation baseline. |

## Architecture Conformance
- `dispatch_verb` reads `get_mode` for the `lint|test|build|boot|dev` family: `exec` routes to `verb_exec`, absent or `capability` routes to `verb_capability`, and any other value is a clear usage error with exit 2. This resolves F-02; `verb_exec` no longer fabricates a missing `exec` mode (`harness:127-154, 628-684, 971-1014`).
- `boot.mode: exec` is proven hermetically to select verdict-free handoff, while absent/`capability` mode selects a single-verdict run-to-completion path. The real contract still routes `dev` to handoff and `boot` to honest `unknown` behavior (`tests/harness/run.sh:766-858`).
- `maps_to` remains the only command interpreted by `sh -c`. CLI arguments are never concatenated into that command; the handoff handler accepts only its defined introspection flags and rejects other input.
- `orient` derives both the resolved `dev_mode` field and human mode note from `get_mode dev` (`harness:491-515`).
- ADR-0004, CORE-COMPONENT-0003 R17, and Decision Log records 38-46 are consistent with the implementation. No template edit, unrelated architecture change, or decision-log drift was found.

## Test Coverage Assessment
`sh tests/harness/run.sh` completed without hanging: 38 checks passed with no failures or skips, and the suite returned a pass verdict. TEST-31 uses only scratch contracts, friction files, and evidence directories; its fast `true` mappings prove `boot.mode: exec` handoff and `dev` absent/`capability` run-to-completion without executing a blocking watch or modifying tracked files. It also covers unsupported mode (exit 2) and real-contract regression.

Direct corroboration confirmed:
- `./harness dev --print`: resolved `npm run dev`, exited 0, started no watch, and emitted no verdict.
- `./harness boot`: `unknown`, exited 0, and recorded the expected honest gap.
- `./harness verify`: `degraded`, exited 0, with typecheck pass and lint/test/build unknown as required by R6.
- `./harness orient --json`: valid JSON, pass verdict, and `dev_mode: exec` derived from the contract.
- `npm run typecheck`: completed successfully.
- Portable shell syntax checks passed, and the tracked working tree remained unchanged before writing this report.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|-----------------|
| — | — | — | No review findings. | — |

## Verdict Rationale
**APPROVE.** F-02 is resolved with high confidence: contract `mode` now actually selects the handler, the anticipated `boot.mode: exec` case is hermetically covered, default/capability and unsupported-mode behavior is explicit, and orientation reads the contract. No regression, security defect, unmet acceptance criterion, or architecture drift was found.

## Suggested Follow-ups
None required.
