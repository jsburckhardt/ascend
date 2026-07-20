# Code Review: Generate the engineering harness CLI via the harness-cli-it agent

## Summary
- **Issue:** #4
- **Title:** Generate the engineering harness CLI via the harness-cli-it agent
- **Base Branch:** main
- **Feature Branch:** feat/4-harness-cli
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 1

## Repository Understanding
Ascend is a greenfield TypeScript and Node.js workflow orchestrator. This issue establishes `./harness` as the first-choice repository operating surface while preserving ADR-0002: wrap the existing npm commands, add no build system, expose honest capability gaps, and maintain evidence and friction records through the RPIV workflow.

## Scope of Change
The branch adds the POSIX-shell harness, its YAML contract, documentation, seed friction log, evidence VCS policy, and canonical verification configuration. It also adds ADR-0003 and CORE-COMPONENT-0003, registers them in the decision log, records Issue #4 RPIV artifacts, and appends one harness marker block to AGENTS.md plus all 16 agent definitions. The comparison against `origin/main` contains 33 changed files and no deletions.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A repo-local harness CLI exists, generated via the harness-cli-it agent | Met | `harness` is tracked executable, exposes all 12 required verbs, and runs under `sh` and dash. |
| The harness wraps existing commands rather than reimplementing them | Met for the current baseline | `verify` reads `npm run typecheck` from `.harness/contract.yml` and executes it as a wrapped command; no new build system was introduced. Finding F-01 covers future contract wiring. |
| The harness records evidence for commands it runs | Partially met | Existing valid verify evidence proves the happy path, but F-04 shows that same-second runs can overwrite one record and persistence failures still report a non-failing result. |
| Supported human and agent workflows are documented | Met | `.harness/README.md`, AGENTS.md, and every agent definition document the operating surface and harness rules. |
| The harness is invocable from a documented single entry point | Met | `.harness/README.md` documents `./harness <verb>` as the entry point and the script is executable. |

## Architecture Conformance
The change conforms to ADR-0002 and much of ADR-0003: only `verify` maps to `npm run typecheck`; missing capabilities remain honest; evidence output is ignored while `.gitkeep` and contract artifacts are tracked; and all 17 agent surfaces have exactly one marker pair with prior substantive content preserved. Commit and PR metadata also conform to CORE-COMPONENT-0002.

It does not conform to CORE-COMPONENT-0003 R2, R6, R8, and R12. Most importantly, the supposedly data-driven contract cannot drive the aggregate or several verbs, which is a blocking divergence from the accepted architecture and requires returning to Plan before implementation changes are selected.

## Test Coverage Assessment
Read-only corroboration covered help, orient, doctor, status, friction list, and the lint/test/build/boot unknown paths; all exercised machine outputs parsed as JSON and all non-fail paths exited 0. Shell syntax passed under `sh` and dash, marker counts were exactly one pair on all 17 surfaces, seed friction records parsed and covered all six gaps, and VCS tracking and ignore behavior matched R13. Existing verify evidence and the verifier summary show `npm run typecheck` passing with an aggregate `degraded` result.

The reviewer contract prohibits commands that mutate files, so `verify`, `clean`, and `friction add` were not re-run because they write or delete evidence/friction records. Their implementation and prior verifier artifacts were inspected instead. No durable automated regression suite was added for the 17 planned test cases.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-01 | blocking | `harness:282-381`, `harness:410-435`, `harness:518-538` | The implementation is not data-driven as required by ADR-0003 and CORE-COMPONENT-0003 R6/R8. Dispatch is hard-coded; `clean` ignores its contract mapping; and `verify` always hard-codes lint/test/build as unknown and the overall result as degraded while omitting the planned doctor check. Editing `maps_to` in Issues #5/#6 therefore cannot wire clean or allow the aggregate to reach pass. | Return to Plan for the architecture divergence, then make dispatch and aggregate checks derive from contract data, including doctor, or explicitly revise the decision artifacts before implementation. |
| F-02 | major | `harness:181-210`, `harness:475-493` | The human forms of `help` and `friction list` do not emit one clear overall result. Help lists all four vocabulary values without reporting its own pass result, and friction list prints records without any overall verdict. This violates R2 and the generator requirement that every command return a clear verdict. | Emit an explicit single overall `Verdict: pass` for both human outputs and add assertions for every verb. |
| F-03 | major | `harness:166-175`, `harness:237-279`; `package.json:7-9` | Doctor accepts any Node major greater than or equal to 22. Node 23 or later therefore reports pass even though the repository engine range is `>=22 <23` and `.nvmrc` pins 22. | Validate the complete supported range, or require the exact pinned major, and test both below-range and above-range versions. |
| F-04 | major | `harness:118-140`, `harness:330-381`, `harness:453-472` | Required persistence is not reliable. Evidence names have only second precision and are opened with truncation, so overlapping runs can overwrite one record. In addition, directory creation, evidence writes, and friction appends are unchecked; the command can still report degraded or pass and exit 0 after persistence fails. | Generate collision-safe evidence names, write atomically, check every persistence operation, and return a valid fail response when a required record cannot be stored. |
| F-05 | major | `harness:41-46` | JSON escaping depends on the GNU-style multiline sed expression `:a;N;$!ba;s/\n/\\n/g`. Matching newline via `\n` and the label form are not portable POSIX sed behavior, so valid JSON is not guaranteed on non-GNU userlands despite R12. The dash check only validates the shell parser. | Replace this with POSIX-defined escaping and add a portability test using a non-GNU userland, including multiline and control-character friction inputs. |

## Verdict Rationale
F-01 is a blocking divergence from the accepted data-driven architecture, and the evidence criterion is not fully reliable because F-04 can lose or fail to persist run records while reporting success. The current happy path works, but the delivered contract cannot support the planned next stories without code restructuring. Changes are required before merge.

## Suggested Follow-ups
- Resolve F-01 through the Plan stage, then re-run Verify and independent review.
- Add executable regression coverage for contract-driven rewiring, every human verdict, Node range boundaries, persistence failures/collisions, and non-GNU portability.
- Preserve the passing marker, JSON-schema, wrapped-typecheck, and VCS-policy behavior while correcting the findings.
