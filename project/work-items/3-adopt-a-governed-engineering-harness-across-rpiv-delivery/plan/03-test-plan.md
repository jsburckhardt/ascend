# Test Plan: Adopt a governed engineering harness across RPIV delivery

All checks are repository-local and bounded. Root justfile recipes remain the canonical validation lane; direct Node, Git, cmp, harness discovery, flow, and process-inspection checks validate issue-specific contracts without duplicating project command bodies.

## Test V-1: Governance contract inventory

- **Type:** Static contract validation
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-18
- **Priority:** Critical

### Setup
Read .harness/engineering-harness.md and the immutable canonical baseline report. Use a bounded Node assertion over headings, tables, maturity matches, and required phrases.

### Steps
1. Assert governance names boot, checks, health, interaction, observation, deterministic signals, and evidence paths.
2. Assert the injection map contains pre-flight, pre-coding, post-coding, and post-flight at the required RPIV locations; treat coding as the separate observation seam, not a fifth fire event.
3. Assert exactly one current maturity match from L0 through L4 and that it is L3.
4. Assert the current test-backed implementation is distinguished from the baseline report’s absent checks/boot state.
5. Assert database lifecycle, local/CI equivalence, executable architecture checks, and live-service readiness are listed as unimplemented gaps.

### Expected Result
Every required governance assertion passes, exactly one maturity level is current, and baseline/current capability statements cannot be conflated.

### Expected Evidence
A row per governance assertion with source path, matched text or section, count, and pass result.

## Test V-2: Checks success and error envelopes

- **Type:** Harness integration and negative-path validation
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-2
- **Priority:** Critical

### Setup
Use the installed harness CLI at the repository root. Capture stdout and stderr separately and parse stdout as one JSON value. For the negative path, prepend a temporary untracked directory containing a bounded fake just executable that exits nonzero and emits diagnostics; do not edit justfile or tracked content.

### Steps
1. Run harness checks --json against the real root just verify lane.
2. Assert zero exit, one JSON envelope, command=checks, status=ok, and data.command=just verify.
3. Run harness checks --json with the temporary failing just first on PATH.
4. Assert nonzero exit, one error envelope, non-empty code/message/details, and next_action instructing correction followed by rerunning harness checks.
5. Remove the temporary fixture and confirm tracked diff is unchanged.

### Expected Result
Success exactly reflects just verify; failure is explicit, diagnostic, actionable, and cannot be success-shaped.

### Expected Evidence
Both envelopes, process exit codes, parsed-field assertion rows, temporary-fixture description, and unchanged-diff hash.

## Test V-3: Boot success, child failure, duration, and process ownership

- **Type:** Harness integration and negative-path validation
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-3, AC-15
- **Priority:** Critical

### Setup
Capture baseline process IDs and listeners relevant to Node, Vite, ports 5173 and 3000. For the negative path, invoke the real harness binary while prepending a temporary fake harness child executable that exits nonzero when boot calls harness checks --json.

### Steps
1. Run harness boot --json and parse exactly one envelope.
2. Assert command=boot, status=ok, readiness=ready, proof=harness checks, mode=test-backed scaffold, start_command=just run, exact web/API endpoints, and numeric duration_ms >= 0.
3. Compare post-run process/listener state to the baseline and assert no persistent development server was added.
4. Run the real harness boot --json with the failing child fixture.
5. Assert nonzero exit, status=error, code=E_BOOT_CHECKS_FAILED, diagnostic details containing elapsed duration, non-empty next_action directing rerun of harness boot, and no data.readiness=ready.
6. Remove the fixture and confirm no tracked-content change.

### Expected Result
Boot reports honest test-backed readiness only on successful checks and maps child failure to the exact actionable error without owning persistent processes.

### Expected Evidence
Success/failure envelopes, parsed assertions, exit codes, and before/after process/listener and git-diff snapshots.

## Test V-4: Immutable baseline report, aliases, and schema

- **Type:** Schema, byte-integrity, and semantic validation
- **Task:** T-2, T-6
- **Acceptance Criteria:** AC-4, AC-18, AC-22
- **Priority:** Critical

### Setup
Use the report schema committed under .harness/reports/harnessability/schema.json and the repository-installed Ajv 2020 package in the pnpm virtual store. Fail if the validator cannot be resolved locally; do not download a validator.

### Steps
1. Validate 001-ascend/report.json against the committed schema.
2. Assert report.md, report.json, summary.md, evidence.jsonl, and schema.json exist.
3. Use cmp for canonical report.json versus latest.json and canonical report.md versus latest.md; record SHA-256 values.
4. Assert Operate-Today 63/C, Adaptability 57/C, index 60/C, readiness H2, and highest proof L2.
5. Assert GAP-001 through GAP-005 retain their declared order and meanings.
6. Assert baseline branch main and commit f2f15f757885f0ba3dddf5c58dc3853953a9a330 remain unchanged.

### Expected Result
The report is schema-valid, both aliases are byte-identical, and immutable pre-adoption scores, ordered gaps, and proof ceiling remain intact.

### Expected Evidence
Schema validator output, file inventory, cmp exit codes, four hashes, and semantic assertion rows.

## Test V-5: Flow, generated view, change-record, and retro integrity

- **Type:** Flow schema and generated-artifact validation
- **Task:** T-2, T-6
- **Acceptance Criteria:** AC-5, AC-22
- **Priority:** Critical

### Setup
Use harness flow show and harness flow render --check against .harness/adopt.flow.json and .harness/loop.flow.json. Read records under .harness/records/ without mutation.

### Steps
1. Run harness flow show --json for both flow JSON files and require successful schema-backed summaries.
2. Assert adoption governance, inject, and build-boot nodes are done.
3. Assert loop boot, retro-drain, retro-harvest, improve, and improve-boot-duration nodes are done.
4. Run harness flow render --check for both flows and require zero diff.
5. Assert 001-adoption-nucleus resolves baseline GAP-001 and 002-boot-duration resolves the named SUGG-001 observation.
6. Assert the improve-excursion-schema retro compound status remains open.

### Expected Result
Both flows are valid, required nodes and records preserve their state, generated Markdown is current, and the known upstream schema mismatch remains open.

### Expected Evidence
Two flow envelopes, two render check results, required-node table, record-resolution table, and retro-status row.

## Test V-6: Skill directory and lock bijection

- **Type:** Repository inventory validation
- **Task:** T-3, T-6
- **Acceptance Criteria:** AC-6, AC-23
- **Priority:** Critical

### Setup
Run a bounded Node program over direct child directories of .agents/skills, skills-lock.json, and .harness/skills.lock.json.

### Steps
1. Sort committed skill directory names and root lock skill keys and require exact array equality.
2. Assert each name occurs once and each computedHash matches exactly 64 lowercase hexadecimal characters.
3. Assert no additional lock entry exists.
4. Assert the harness lock has exactly one install with scope=project, source=packaged, and targets exactly [github-copilot].

### Expected Result
The skill tree and integrity lock are a bijection and installation metadata has one exact declared target.

### Expected Evidence
Sorted inventories, per-hash pass rows, extra/missing set results, and parsed installation record.

## Test V-7: RPIV lifecycle seam and correction ordering

- **Type:** Read-only agent contract validation
- **Task:** T-4
- **Acceptance Criteria:** AC-7
- **Priority:** Critical

### Setup
Parse .github/agents/rpiv.agent.md processes as text using ordered anchors; inspect instructions and runtime use of HARNESS_RESULT.

### Steps
1. Assert the main router orders branch preparation, pre-flight, Research, Plan, pre-coding, Implement, post-coding, Verify, and successful post-flight exactly.
2. Assert each harness call captures advisory HARNESS_RESULT without changing stage status or order.
3. Assert post-coding follows a valid Implement handoff and post-flight follows successful Verify.
4. Assert the correction route repeats pre-coding before Implement and post-coding before Verify.
5. Assert strict Research → Plan → Implement → Verify stage declarations remain unchanged.

### Expected Result
All four fire seams occur at their required boundaries, correction repeats the implementation seams, and harness advice never becomes a stage-order gate.

### Expected Evidence
Ordered source-location table for main and correction paths plus advisory-result and stage-order rows.

## Test V-8: Implement request, observation, correction, and execution-path matrix

- **Type:** Read-only agent execution-contract validation
- **Task:** T-4, T-5, T-6
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-11, AC-12, AC-16, AC-23
- **Priority:** Critical

### Setup
Read both modified RPIV definitions. Use a bounded parser/search that does not dispatch either agent, execute edits, stage files, or commit.

### Steps
1. Assert the coordinator request has exactly branch_name, issue_number, plan_handoff, verification_feedback, and work_item_path and is serialized as JSON without prose.
2. Assert all eight OBSERVATION_TRIGGERS and all eight allowed kinds match the skill schema vocabulary.
3. Assert record-pending-friction excludes OBSERVED_EVENTS and appends each emitted event; assert focused/full failures call difficulty observation before correction.
4. Assert observe-friction validates OBSERVATION_KIND against OBSERVATION_KINDS before execute/runInTerminal.
5. Assert task edits cover application and test content, execute in dependency order, and focused validation has one correction rerun followed by an Implement error.
6. Assert documentation update or non-empty task-tied no-impact rationale, full validation, one correction rerun, and terminal Implement error.
7. Assert AC evidence, focused/full results, notes, safely quoted staging/commit inference, branch, SHA, and clean-tree handoff requirements.
8. Produce these required matrix rows: mismatched work-item path → Plan; stale Plan handoff → Plan; mismatched branch → Implement; unsupported observation kind → Implement/non-command rejection; exhausted focused correction → Implement; exhausted full correction → Implement; absent implementation change → Implement; dirty final tree → Implement.

### Expected Result
All declared happy-path contracts and all eight non-success paths resolve explicitly with no unbounded correction or unsafe command interpolation.

### Expected Evidence
A consolidated static table containing request keys, trigger/kind checks, process-order assertions, and eight execution-path rows with source locations and stage owner.

## Test V-9: APS and VS Code field matrix for modified definitions

- **Type:** APS conformance validation
- **Task:** T-6
- **Acceptance Criteria:** AC-13, AC-23
- **Priority:** Critical

### Setup
Use .github/agents/aps-v1.2.2.agent.md as the sole rule source. Evaluate .github/agents/rpiv.agent.md and .github/agents/rpiv-implementer.agent.md independently and record exact rule text.

### Steps
1. Evaluate these LINT_CHECKS content rules for both targets: section order; tag newline rule; no tabs; no // comments; ids in RUN/USE are backticked; where keys are lexicographic; every referenced format exists; frontmatter matches target schema; tools syntax; required/recommended/conditional field order; required fields present/non-empty; recommended fields present with overridden/default values; conditional fields only when explicitly specified; no YAML comments; VS Code field types; both deprecated-field prohibitions; MUST/SHOULD/MAY vocabulary; one instruction directive per line with no blank lines; qualified tool names; SECTION_GUIDE placement; structured constants encoding; update path/identity/unrelated-behavior preservation; and requirement-to-change traceability.
2. Record the Claude Code field-type rule as evaluated but not applicable to a VS Code target.
3. Exclude only the rule “output is exactly one fenced block per turn” because it governs the generator agent’s user-visible response rather than written target-file content; preserve its exact rule text and exclusion reason.
4. Evaluate every FIELD_REQUIREMENTS_VSCODE item: required name/description; recommended tools, user-invocable, disable-model-invocation, target; conditional field allowlist; exact fieldOrder; deprecated infer and user-invokable; and value types/default-or-explicit-override semantics.
5. Record one row per rule per file with included/excluded/applicability, exact source text, evidence location, and result.

### Expected Result
Every applicable target-content and VS Code field rule passes for both files; the one generator-response-only rule is named and excluded, and platform-inapplicable checks are visible rather than silently omitted.

### Expected Evidence
A complete two-target APS table copied into the consolidated implementation evidence table.

## Test V-10: Legacy replacement, lifecycle references, and formatting delta

- **Type:** Git and repository-delta validation
- **Task:** T-4, T-6
- **Acceptance Criteria:** AC-14, AC-23
- **Priority:** Critical

### Setup
Use git diff/name-status, git show HEAD:.prettierignore, filesystem checks, and bounded searches limited to active .github/agents/*.agent.md definitions.

### Steps
1. Assert .github/agents/harness-cli-it.agent.md is absent and represented as a tracked deletion.
2. Record that its old standalone ./harness, contract.yml, verification duplication, and universal agent rewrite model is replaced by installed harness 0.13.0, .harness extensions/governance, eng-harness-flow, and root justfile delegation.
3. Assert active RPIV definitions contain lifecycle skill/reference behavior and no active definition relies on the deleted agent.
4. Compare .prettierignore to HEAD and assert additions are exactly .agents and .harness.
5. Assert all prior ignore entries remain unchanged and in their prior order.

### Expected Result
Legacy deletion is an evidence-backed intentional replacement, lifecycle integration is active, and formatting scope changes only for the two new asset roots.

### Expected Evidence
Deletion status, replacement mapping, active-reference search results, and exact ignore-file delta table.

## Test V-11: Sequential determinism, tracked-tree immutability, and process cleanup

- **Type:** Repetition and side-effect validation
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-17, AC-20
- **Priority:** Critical

### Setup
Record revision, installed dependency lock hashes, git diff --binary hash for tracked content, relevant process IDs, and listeners before execution. Use separate capture files under a temporary untracked directory.

### Steps
1. Run harness checks --json twice sequentially and require zero exits.
2. Run harness boot --json twice sequentially and require zero exits.
3. Normalize permitted volatile fields: timestamp, duration_ms, and captured command output.
4. Compare status, command, readiness, proof, mode, start command, and endpoints across applicable runs and against AC-2/AC-3 constants.
5. Recompute tracked diff hash and require equality with the baseline.
6. Compare process/listener state and require no new persistent development server.

### Expected Result
Both sequential pairs are semantically identical at the fixed revision/dependency state, mutate no tracked content, and leave no development service.

### Expected Evidence
Four envelopes and exits, normalization/comparison table, before/after diff hashes, and process/listener delta.

## Test V-12: Harness extension discovery

- **Type:** CLI discovery validation
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-19
- **Priority:** High

### Setup
Run harness doctor --json and parse the extensions array independently of aggregate doctor status.

### Steps
1. Assert boot and checks each appear once with status=loaded and their expected entry paths.
2. Assert the extensions layer reports two loaded, zero failed, and zero conflicts.
3. Record aggregate degraded status separately and prove it is solely the telemetry-flush-hook layer, not extension loading.

### Expected Result
Both issue extensions are discoverable and error-free even if unrelated telemetry-hook configuration keeps aggregate doctor status degraded.

### Expected Evidence
Doctor envelope excerpt, extension rows, layer counts, and isolated degradation reason.

## Test V-13: Canonical full repository verification

- **Type:** Full repository validation
- **Task:** T-6
- **Acceptance Criteria:** AC-21
- **Priority:** Critical

### Setup
Use the root justfile unchanged as the sole full validation command owner. Ensure dependencies are already installed and no unrelated development server is retained.

### Steps
1. Run just verify once after all corrections and evidence-file edits.
2. Require zero exit.
3. Record output proving format checking, linting, type checking, package tests, builds, and Playwright browser validation all executed.
4. If it fails, follow the implementer’s single full-correction branch, record a difficulty observation before correction, and rerun at most once.

### Expected Result
The canonical gate exits zero and exercises all six required validation categories.

### Expected Evidence
Command, exit code, category-to-output table, and final full-validation result in implementation notes.
