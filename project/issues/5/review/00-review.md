# Code Review: Add local development and validation commands

## Summary
- **Issue:** #5
- **Title:** Add local development and validation commands
- **Base Branch:** main
- **Feature Branch:** feat/5-dev-validation-commands
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 1

## Repository Understanding
Ascend is a greenfield TypeScript and Node.js workflow orchestrator. ADR-0002 keeps the Prototype-0 baseline minimal and prohibits speculative frameworks. ADR-0003 and CORE-COMPONENT-0003 establish `./harness` as the first-choice operating surface: existing project commands are wrapped rather than reimplemented, command wiring is declared in `.harness/contract.yml`, and `verify` aggregates contract-declared checks under the four-verdict exit-code model.

## Scope of Change
The implementation adds `npm run dev` as a TypeScript watch loop, documents development and validation commands, appends friction records, and adds TEST-30 to the harness regression suite. The harness executable, contract, lockfile, TypeScript configuration, and application source remain unchanged. The branch also adds the issue Research, Plan, Implementation, and Verify artifacts.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A documented command starts the local development environment | Met | `package.json:10-13` defines `npm run dev`; `README.md:60-68` documents its watch behavior. |
| A documented validation command runs and passes on the baseline codebase | Met | `README.md:75-90` documents both forms. Local corroboration found `npm run typecheck` successful and `./harness verify` non-failing with exit 0 under the documented degraded baseline semantics. |
| The commands are wrapped/invokable through the harness CLI | **Unmet** | Validation is invokable as `./harness verify`, but `.harness/contract.yml:43-50` leaves `boot.maps_to` null and `README.md:70-73` explicitly requires direct `npm run dev`; no harness CLI invocation starts the development command. |
| Both commands are documented in the README | Met | `README.md:53-90` documents development and validation. |

## Architecture Conformance
- The dependency-free TypeScript watch command conforms to ADR-0002 and introduces no speculative framework or build pipeline.
- Validation remains data-driven through `verify.maps_to`, and no drift was introduced in the harness executable or contract implementation.
- The development command is not exposed by the mandatory harness operating surface. Documentation of a direct-command fallback is honest, but it does not satisfy AC3 or the ADR-0003 / CORE-COMPONENT-0003 R1 expectation that an existing backing command be wrapped. A naive foreground mapping would hang, so this conflict requires a Plan-level resolution rather than treating documentation as invocation.
- Friction records are valid JSON Lines, contain the verbatim KEY_QUESTION and required fields, and preserve all six base lines unchanged before eight appended records.
- All three feature commits use Conventional Commit subjects and include `Co-authored-by` trailers. Cryptographic signatures are present; signer trust could not be established locally because no signer allowlist is configured. CORE-COMPONENT-0002 does not mandate signing.

## Test Coverage Assessment
`npm run typecheck`, the isolated `./harness verify` gate, and `sh tests/harness/run.sh` completed successfully; the durable suite reported all 36 checks passing. TEST-30 does not execute `npm run dev` and therefore cannot hang on the watch process. Its static assertions correctly lock the script value, documentation, friction markers, and existing validation mapping.

TEST-30 does not cover AC3. At `tests/harness/run.sh:675-692` it instead requires `boot.maps_to` to remain null and checks only `verify`; thus it can pass while the development command remains impossible to invoke through the CLI.

No additional correctness, security, or error-handling defects were found in the changed implementation surface.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-01 | blocking | `package.json:10-13`; `.harness/contract.yml:43-50`; `README.md:60-73`; `tests/harness/run.sh:637-696` | **Confidence: high.** AC3 is unmet: `npm run dev` exists only as a direct command, while `./harness boot` remains unmapped and returns `unknown`. Merely mentioning the direct command in harness documentation does not make it invokable through the harness CLI. TEST-30 codifies the gap rather than testing the criterion. | Return to Plan to resolve long-running dev semantics against the harness contract. Either deliver a non-hanging harness CLI path that actually starts the development environment and add an integration assertion for it, recording any required ADR/core-component change, or explicitly amend the issue acceptance criterion before claiming delivery. Do not map the foreground watch into the current run-to-completion handler without solving the hang. |

## Verdict Rationale
**REQUEST_CHANGES.** One acceptance criterion is demonstrably unmet, which requires this verdict even though validation, documentation, friction integrity, commit standards, and the existing regression suite otherwise pass.

## Suggested Follow-ups
- Resolve F-01 at the Plan stage because the current single-verdict handler conflicts with a long-running watch process.
- Update TEST-30 and the Verify summary so AC3 is proven by an actual harness CLI capability rather than by documentation and an `unknown` verdict.
