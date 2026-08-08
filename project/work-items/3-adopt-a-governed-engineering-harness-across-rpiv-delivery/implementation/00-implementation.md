# Implementation Evidence: Governed Engineering Harness

## Scope and status

Issue #3 was implemented from the complete existing worktree in dependency order. The verifier-owned correction preserves checks diagnostics from both process streams, removes stale skill guidance, and aligns the checks documentation with the corrected behavior. This record provides Implement-stage evidence only; final acceptance remains owned by Verify.

## Completed tasks

| Task | Result | Focused validation |
|---|---|---|
| T-1 | Checks failures now retain bounded labeled stderr/stdout diagnostics with a non-empty exit-code fallback; stdout-only negative path passed | just verify-focused passed, 3 files and 3 tests |
| T-2 | Immutable reports, flows, generated views, change records, and retros validated | just verify-focused passed, 3 files and 3 tests |
| T-3 | Nine local skills and both lock surfaces validated; stale `just list-skills` guidance replaced with committed skill/lock inventory guidance | just verify-focused passed, 3 files and 3 tests |
| T-4 | RPIV lifecycle replacement, canonical request, legacy deletion, and formatting scope validated | just verify-focused passed, 3 files and 3 tests |
| T-5 | Implementer observation, correction, documentation, commit, and handoff contracts validated | just verify-focused passed, 3 files and 3 tests |
| T-6 | Verifier correction evidence, stdout-only negative path, extension discovery, and canonical validation completed | just verify-focused passed, 3 files and 3 tests |

## Acceptance evidence catalog

| AC | Concrete repository evidence | Result |
|---|---|---|
| AC-1 | .harness/engineering-harness.md lines 7-74 contains boot, checks, health, interaction, observation, evidence, four RPIV fire seams plus coding observation, four back-pressure gaps, and one current L3 marker | Pass |
| AC-2 | `.harness/extensions/checks/extension.ts:12-28` delegates to `just verify`, keeps the last 20 lines of each non-empty stderr/stdout stream with labels, and supplies an exit-code fallback. A temporary stdout-only fake `just` exited 17; `harness checks --json` exited 1 with `E_WRAP_FAILED`, `details=stdout:\nstdout-only-diagnostic`, and the rerun action | Pass |
| AC-3 | boot extension lines 11-38 composes checks. Success returned ready, harness checks proof, test-backed scaffold mode, just run, exact 5173 and 3000 endpoints, and duration_ms=21886; listener delta was empty | Pass |
| AC-4 | Report schema validated; canonical/latest SHA-256 pairs match at 0995e8b3261a58f32bc5e88d6794f9353f8adaeec5f62609828cb90809e4dd94 JSON and 209a3c90752ad6637554746cfdb44828624d306fa2f819b5d1fc1c3e41916398 Markdown; scores, GAP-001 through GAP-005, H2, and L2 were asserted | Pass |
| AC-5 | Flow show and render checks passed for adopt and loop; governance, inject, build-boot, boot, retro-drain, retro-harvest, improve, and improve-boot-duration are done; both change records resolve named evidence; excursion schema remains open | Pass |
| AC-6 | Skill directory and root lock keys are the same sorted nine names; every computedHash is lowercase 64-hex; installation lock has one project, packaged, github-copilot install. README/AUTHORING guidance now names the committed skill surface and lock entry, and the package contains zero `just list-skills` references | Pass |
| AC-7 | rpiv.agent.md main route orders branch, pre-flight, Research, Plan, pre-coding, Implement, post-coding, Verify, post-flight; correction repeats pre-coding and post-coding; six HARNESS_RESULT captures are advisory | Pass |
| AC-8 | Implementer constants list all eight triggers and kinds; record-pending-friction excludes OBSERVED_EVENTS then appends; both validation failures observe difficulty before correction; unsupported kinds are rejected at line 315 before command execution at line 316 | Pass |
| AC-9 | Coordinator line 305 builds exactly branch_name, issue_number, plan_handoff, verification_feedback, work_item_path; path and stale handoff return to Plan; branch mismatch returns an Implement error | Pass |
| AC-10 | Implementer task loop checks dependencies, applies complete application/test edits, runs focused validation, performs one correction rerun, then returns Focused validation still fails | Pass |
| AC-11 | Documentation process requires updates or a task-tied non-empty no-impact rationale; full validation has one correction rerun and then returns Full validation still fails | Pass |
| AC-12 | Evidence completeness, notes, safely quoted stage/commit inference, SHA, branch, and clean status are explicit; absent changes and dirty final tree are terminal Implement errors | Pass |
| AC-13 | APS matrix below evaluates every target-content LINT_CHECKS row and every FIELD_REQUIREMENTS_VSCODE rule for both modified files; only the generator response wrapper is excluded and the Claude rule is visible as not applicable | Pass |
| AC-14 | Git reports a tracked deletion for .github/agents/harness-cli-it.agent.md; RPIV has lifecycle references; .prettierignore retains all prior rows and adds exactly .agents and .harness | Pass |
| AC-15 | Injected child exit 19 returned command=boot, status=error, E_BOOT_CHECKS_FAILED, duration_ms=14 details, rerun harness boot action, and no ready data | Pass |
| AC-16 | Eight explicit non-success paths and owners are recorded in the execution-path matrix below | Pass |
| AC-17 | Two checks and two boot runs at revision f2f15f757885f0ba3dddf5c58dc3853953a9a330 were semantically identical; tracked diff hash remained 7f6165670c99e2d6d6bad65c0212259866d6e705b4b4f2635f04164be8bb2033; no listener or persistent process delta | Pass |
| AC-18 | Governance separates current L3 test-backed behavior from immutable harnessability evidence and names database lifecycle, local/CI equivalence, executable architecture checks, and live-service readiness as gaps | Pass |
| AC-19 | harness doctor reported boot and checks loaded once each, extensions 2 loaded, 0 failed, 0 conflicts; aggregate degradation was isolated to telemetry-flush-hook | Pass |
| AC-20 | Sequential checks and boot all exited zero with fixed semantic values, unchanged tracked diff, empty 5173/3000 listener snapshots, and no new development process | Pass |
| AC-21 | just verify exited zero and ran Prettier formatting, oxlint, TypeScript checks, Vitest with coverage, both builds, and one Chromium Playwright test | Pass |
| AC-22 | Ajv 2020 accepted the report; both flow show operations and both render --check operations exited zero; cmp accepted both aliases | Pass |
| AC-23 | The bounded governance, envelope, report, flow, skill, lifecycle, execution-path, APS, legacy, formatting, determinism, and validation tables in this file use repository files only | Pass |

## Verifier correction evidence

| Defect | Concrete correction and proof | Result |
|---|---|---|
| Stdout-only failure diagnostics | `.harness/extensions/checks/extension.ts:14-21` builds bounded labeled details from both streams and falls back to the exit code. The bounded fake `just` emitted only `stdout-only-diagnostic` and exited 17; the harness envelope exited 1 with non-empty `error.details` exactly `stdout:\nstdout-only-diagnostic` | Pass |
| Diagnostics documentation | `.harness/extensions/checks/instructions.md:11-21` and `CORE-COMPONENT-260808-engineering-harness-delivery-contract.md:36` state the same stderr-first, stdout-second, 20-line-per-stream and empty-stream fallback behavior | Pass |
| Skill guidance | `.agents/skills/eng-harness-0-harnessability-assessment/README.md:53-65` and `AUTHORING.md:85-96` point to the committed `SKILL.md` and root lock entry; bounded grep found no `just list-skills` references | Pass |
| Extension discovery | `harness doctor --json` reported extensions `2 loaded, 0 failed, 0 conflict(s)` and the checks extension in loaded status; unrelated aggregate degradation remained telemetry-flush-hook only | Pass |

## Harness command evidence

| Validation | Evidence | Result |
|---|---|---|
| V-1 governance | Sections at lines 7, 13, 18, 26, 31, 37, 45, 53, 65, and 73; seam rows at 59-63; one bold L3 match | Pass |
| V-2 checks success | command=checks, status=ok, data.command=just verify, exit 0 | Pass |
| V-2 checks failure | Temporary untracked stdout-only fake `just` exited 17; harness exited 1 with E_WRAP_FAILED, `details=stdout:\nstdout-only-diagnostic`, and a non-empty rerun action | Pass |
| V-3 boot success | command=boot, status=ok, readiness=ready, proof=harness checks, mode=test-backed scaffold, start_command=just run, exact endpoints, duration_ms=21886 | Pass |
| V-3 boot failure | Temporary untracked fake child exited 19; E_BOOT_CHECKS_FAILED, elapsed details, rerun boot action, no ready data, exit 1 | Pass |
| V-11 checks pair | Both normalized to command=checks, status=ok, wrapped_command=just verify | Pass |
| V-11 boot pair | Both normalized to ready, harness checks, test-backed scaffold, just run, and exact endpoint object | Pass |
| V-11 immutability | pnpm lock SHA-256 remained 929b8581807696fa19c88cf7e6226d89df9fb7ec57e4ce4be52b428efd443819; tracked diff hash unchanged; listener snapshots [] to [] | Pass |
| V-12 discovery | Entry paths .harness/extensions/boot/extension.ts and .harness/extensions/checks/extension.ts loaded in v2 API format | Pass |

## Baseline, flow, and record evidence

| Validation | Evidence | Result |
|---|---|---|
| Report schema | Local node_modules/.pnpm/ajv@8.20.0 Ajv 2020 validation returned true | Pass |
| Report inventory | report.md, report.json, summary.md, evidence.jsonl, and schema.json are present | Pass |
| Baseline values | Operate-Today 63/C, Adaptability 57/C, index 60/C, H2, L2, main, f2f15f757885f0ba3dddf5c58dc3853953a9a330 | Pass |
| Ordered gaps | GAP-001, GAP-002, GAP-003, GAP-004, GAP-005 occur in declared order | Pass |
| Alias bytes | Both cmp operations exited zero and both canonical/latest hash pairs match | Pass |
| Adopt flow | harness flow show reports 6 nodes and 11 events; render --check drift=false | Pass |
| Loop flow | harness flow show reports 8 nodes and 19 events; render --check drift=false | Pass |
| Records | 001-adoption-nucleus resolves GAP-001; 002-boot-duration resolves SUGG-001; 002-improve-excursion-schema has compound status open | Pass |

## Skill and installation inventory

Sorted skill directories and root lock keys both equal:

builder, eng-harness-0-harnessability-assessment, eng-harness-flow, eng-harness-in-a-box, grill-agent-done, plan-0-v2-constitution, plan-v2-extract-domain, the-flow, validate-v2.

| Assertion | Result |
|---|---|
| Exact directory-to-lock bijection and no extras | Pass |
| builder computedHash is lowercase 64-hex | Pass |
| eng-harness-0-harnessability-assessment computedHash is lowercase 64-hex | Pass |
| eng-harness-flow computedHash is lowercase 64-hex | Pass |
| eng-harness-in-a-box computedHash is lowercase 64-hex | Pass |
| grill-agent-done computedHash is lowercase 64-hex | Pass |
| plan-0-v2-constitution computedHash is lowercase 64-hex | Pass |
| plan-v2-extract-domain computedHash is lowercase 64-hex | Pass |
| the-flow computedHash is lowercase 64-hex | Pass |
| validate-v2 computedHash is lowercase 64-hex | Pass |
| One installation: scope=project, source=packaged, targets=[github-copilot] | Pass |
| Skill README/AUTHORING reference the committed `SKILL.md` and lock entry; stale `just list-skills` references are absent | Pass |

## RPIV lifecycle and execution-path evidence

| Route | Ordered evidence | Result |
|---|---|---|
| Main | prepare-feature-branch at 172; pre-flight 175; Research 177; Plan 180; pre-coding 183; Implement 185; post-coding 188; Verify 190; post-flight 195 | Pass |
| Correction | pre-coding 346; Implement 348; post-coding 350; Verify 352 | Pass |
| Advisory | Every lifecycle USE is followed by CAPTURE HARNESS_RESULT and no HARNESS_RESULT condition gates stage status | Pass |
| Stage order | Research, Plan, Implement, Verify declarations and dispatch order remain unchanged | Pass |

| Required failure case | Source | Explicit non-success outcome | Owner | Result |
|---|---|---|---|---|
| Mismatched work-item path | rpiv-implementer.agent.md:242-243 | IMPLEMENT_ERROR | Plan | Pass |
| Stale Plan handoff | rpiv-implementer.agent.md:255-257 | IMPLEMENT_ERROR | Plan | Pass |
| Mismatched branch | rpiv-implementer.agent.md:417-419 | IMPLEMENT_ERROR | Implement | Pass |
| Unsupported observation kind | rpiv-implementer.agent.md:315-316 | Rejected before execute/runInTerminal | Implement | Pass |
| Exhausted focused correction | rpiv-implementer.agent.md:288-304 | IMPLEMENT_ERROR after one rerun | Implement | Pass |
| Exhausted full correction | rpiv-implementer.agent.md:367-383 | IMPLEMENT_ERROR after one rerun | Implement | Pass |
| Absent implementation change | rpiv-implementer.agent.md:401-404 | IMPLEMENT_ERROR | Implement | Pass |
| Dirty final tree | rpiv-implementer.agent.md:420-424 | IMPLEMENT_ERROR | Implement | Pass |

Observation evidence: all eight OBSERVATION_TRIGGERS and all eight OBSERVATION_KINDS match the repository-local skill vocabulary. The loop excludes prior OBSERVED_EVENTS and appends each emitted event. Focused and full failures emit difficulty before edits. During this run the previously unseen trigger categories extension-path backtrack, missing fixture setup, empty module-resolution search, and tool wait over 30 seconds emitted configured observations before continuing.

## APS LINT_CHECKS matrix

Rule text is copied from .github/agents/aps-v1.2.2.agent.md lines 159-184. Evidence was evaluated independently against each written target.

| Exact LINT_CHECKS rule | rpiv.agent.md | rpiv-implementer.agent.md | Evidence |
|---|---|---|---|
| section order: instructions, constants, formats, runtime, triggers, processes, input | Pass | Pass | All seven sections occur once in order |
| tag newline rule | Pass | Pass | Opening and closing section tags occupy separate lines |
| no tabs | Pass | Pass | Zero tab characters |
| no // comments in any section | Pass | Pass | Zero section lines beginning with // |
| ids in RUN/USE are backticked | Pass | Pass | Every RUN and USE target is delimited |
| where: keys are lexicographic | Pass | Pass | Parsed WHERE placeholder keys equal sorted order |
| every format:<ID> referenced exists | Pass | Pass | Every RETURN format has a matching format definition |
| output is exactly one fenced block per turn | Excluded | Excluded | Generator user-visible response rule; it does not inspect written target-file content |
| frontmatter matches target platform schema | Pass | Pass | Parsed VS Code fields are in the allowlist |
| tools syntax matches target platform (YAML array vs comma-separated) | Pass | Pass | Both tools values are YAML arrays |
| frontmatter field order: Required fields first, then Recommended, then Conditional | Pass | Pass | Raw key order matches FIELD_REQUIREMENTS_VSCODE |
| all Required fields (name, description) are present and non-empty | Pass | Pass | Parsed strings are non-empty |
| all Recommended fields are present with defaults if not overridden | Pass | Pass | tools, user-invocable, disable-model-invocation, target present |
| Conditional fields only present when explicitly specified | Pass | Pass | Coordinator explicitly declares agents; implementer has no conditional field |
| no YAML comments in frontmatter output | Pass | Pass | Zero YAML comment lines |
| VS Code: tools is YAML array, user-invocable is boolean, disable-model-invocation is boolean, target is string | Pass | Pass | Parsed value types match |
| VS Code: deprecated `infer` field MUST NOT appear in generated frontmatter | Pass | Pass | Field absent |
| VS Code: deprecated `user-invokable` field MUST NOT appear in generated frontmatter | Pass | Pass | Field absent |
| Claude Code: tools is comma-separated string, model is string, permissionMode is string | Not applicable | Not applicable | Both targets explicitly use target: vscode; rule retained visibly |
| generated <instructions> use MUST/SHOULD/MAY vocabulary correctly | Pass | Pass | Every directive starts with approved vocabulary |
| generated <instructions> has one directive per line with no blank lines | Pass | Pass | Parsed instruction blocks have no blank directive lines |
| generated frontmatter tools use individual/qualified names unless all set tools needed | Pass | Pass | Qualified tools plus individual todo and agent entries only |
| generated content follows SECTION_GUIDE placement (no workflows in instructions, no static rules in processes) | Pass | Pass | No DSL workflow keyword in instructions; processes contain executable steps |
| generated <constants> use YAML blocks for structured data unless JSON is the target format | Pass | Pass | Structured constants use YAML blocks |
| update mode preserves the target path, agent identity, and unrelated behavior unless explicitly overridden | Pass | Pass | Git paths and name fields retained; changes are lifecycle and Implement contracts only |
| update mode traces every supplied requirement to one or more concrete changes | Pass | Pass | Lifecycle requirements map to RPIV lines 41-45 and 175-196; Implement requirements map to lines 21-56 and processes 224-424 |

## FIELD_REQUIREMENTS_VSCODE matrix

| Exact constant item or rule | rpiv.agent.md | rpiv-implementer.agent.md | Evidence |
|---|---|---|---|
| required: [name, description] | Pass | Pass | Both are non-empty strings |
| recommended.tools default [] or explicit override | Pass | Pass | Explicit qualified YAML arrays |
| recommended.user-invocable default true or explicit override | Pass | Pass | Both are boolean true |
| recommended.disable-model-invocation default false or explicit override | Pass | Pass | Coordinator explicitly true; implementer false |
| recommended.target default vscode or explicit override | Pass | Pass | Both equal vscode |
| conditional: [model, argument-hint, agents, mcp-servers, handoffs] | Pass | Pass | Only coordinator agents appears and is explicitly specified |
| fieldOrder: [name, description, tools, user-invocable, disable-model-invocation, target, model, argument-hint, agents, mcp-servers, handoffs] | Pass | Pass | Present keys preserve relative order exactly |
| deprecated: [infer, user-invokable] | Pass | Pass | Both deprecated names absent |
| VS Code value types | Pass | Pass | Array, booleans, string, and optional array types parse correctly |
| Default-or-explicit-override semantics | Pass | Pass | Every recommended field is present; differences from defaults are intentional coordinator controls |

## Legacy replacement and formatting evidence

| Assertion | Evidence | Result |
|---|---|---|
| Legacy agent absent | git status reports D .github/agents/harness-cli-it.agent.md and filesystem test confirms absence | Pass |
| Replacement surface | Harness 0.13.0, governed extensions, engineering-harness.md, eng-harness-flow skill, and root justfile delegation replace standalone ./harness, contract.yml, and duplicate verification behavior | Pass |
| Active lifecycle | Bounded search finds the four lifecycle skill hooks and correction hooks in rpiv.agent.md; no active agent depends on harness-cli-it | Pass |
| Formatting delta | git diff shows only two additions after all prior ignore entries: .agents and .harness | Pass |

## Documentation evidence

| Documentation scope | Disposition |
|---|---|
| Harness governance and usage | Updated `.harness/extensions/checks/instructions.md` to specify stderr-first/stdout-second bounded failure excerpts and the non-empty fallback; setup and command delegation remain unchanged |
| Explanatory architecture | Updated `CORE-COMPONENT-260808-engineering-harness-delivery-contract.md` so its diagnostics contract exactly matches corrected checks behavior; no ADR decision changed |
| Generated flow and evidence documentation | Added canonical generated flow Markdown, immutable report Markdown and summary, retros, and harness-change records |
| Root README and docs/README.md | No application impact: tasks alter repository engineering governance and RPIV execution only; application setup remains the root justfile, product behavior, API, configuration, and supported user workflows are unchanged |
| API references/specifications | No impact: no application endpoint or API contract changed |
| Configuration instructions | No application impact: no Ascend environment variable, default, or runtime configuration changed |
| Migration/upgrade guidance | No impact: no breaking, data, API, or application configuration migration occurred |
| Operational/deployment instructions | No impact: boot is explicitly non-persistent and does not change runtime or deployment procedures |

## Validation results

| Stage | Command | Result |
|---|---|---|
| Focused T-1 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Focused T-2 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Focused T-3 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Focused T-4 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Focused T-5 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Focused T-6 | just verify-focused | Exit 0; 3 files, 3 tests passed |
| Correction negative path | Temporary stdout-only fake `just`; `harness checks --json` | Harness exit 1 as required; parsed E_WRAP_FAILED envelope retained labeled stdout diagnostics and rerun action |
| Correction focused | just verify-focused | Exit 0; 3 files and 3 tests passed |
| Full (correction) | just verify | Exit 0; format, lint, typecheck, unit coverage, API/web builds, and Chromium Playwright passed |

The implementation commit is created after this evidence file is staged. The handoff reports the resulting SHA from git rev-parse HEAD, confirms the requested branch, and provides clean-tree proof.
