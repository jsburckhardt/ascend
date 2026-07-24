# Test Plan: Issue #26

Covers the additive `agent` field, `friction add --agent`, RPIV self-attribution,
the `doctor` code-server = fail-when-absent rule, the `verify` aggregate reflecting
a failing `doctor`, and the friction-log retrospect keeping the suite green. New
tests are added to the durable POSIX suite `tests/harness/run.sh`
(CORE-COMPONENT-0003 R16); the code-server probe reuses the `tests/launcher/`
PATH-stub pattern. Regression tests that must stay green are listed per task in
02-task-breakdown.md.

Legend — Type: unit (single verb/function), integration (aggregate/round-trip),
regression (existing behaviour unchanged), doc/static (file assertion).

---

## Test TEST-40: friction record carries an additive `agent` field defaulting to `unknown`

- **Type:** unit
- **Task:** T1
- **Priority:** High

### Setup
Isolated friction file (`HARNESS_FRICTION`). Node available for JSON validation.

### Steps
1. Call `write_friction`/`friction add --verb w1 …` with no agent.
2. Read the new line; assert valid JSON.
3. Assert keys `ts, verb, key_question, inference, proof_gap, suggested_closure, severity, agent` all present, in that order, with `agent` last.

### Expected Result
Line is valid JSON; `agent` == `unknown`; existing keys unchanged in name/order (R7/R8 additive guarantee).

---

## Test TEST-41: `friction add --agent` sets the field; omission defaults to `unknown`

- **Type:** unit
- **Task:** T2
- **Priority:** High

### Setup
Isolated friction file.

### Steps
1. `./harness friction add --agent rpiv-research --verb boot --inference i --proof-gap g --suggested-closure c`.
2. `./harness friction add --verb boot --inference i --proof-gap g --suggested-closure c` (no `--agent`).

### Expected Result
First record has `"agent": "rpiv-research"`; second has `"agent": "unknown"`. Both exit 0 and print exactly one `Verdict: pass` line (R2).

---

## Test TEST-42: `friction add --json` includes `agent`; single verdict

- **Type:** unit
- **Task:** T2
- **Priority:** Medium

### Setup
Isolated friction file; Node for JSON validation.

### Steps
1. `./harness friction add --agent rpiv-verifier --verb doctor … --json`.
2. Validate JSON; read `verdict` and `agent`.

### Expected Result
JSON valid; `verdict` == `pass`; response carries `"agent": "rpiv-verifier"`; required keys `harness_version, verb, verdict, timestamp` present.

---

## Test TEST-43: each RPIV stage agent self-attributes via `--agent` (APS-authored)

- **Type:** doc/static
- **Task:** T3
- **Priority:** High

### Setup
The four `.github/agents/rpiv-*.agent.md` files, modified via the APS agent.

### Steps
1. For each stage file, extract the `<!-- HARNESS:BEGIN -->`…`END` block.
2. Assert the `friction add` line contains `--agent <that-stage-name>`.
3. Assert exactly one block per file and no block in any non-stage agent / `ship` / `AGENTS.md`.
4. Confirm the file was produced through the APS agent and passes APS lint (lint report captured as T3 evidence); no manual marker-block/raw-text edit was used.

### Expected Result
Each RPIV file names its own agent (`rpiv-research`/`rpiv-planner`/`rpiv-implementer`/`rpiv-verifier`), remains a valid APS v1.2.2 artifact (lint clean), marker scoping unchanged (R10); TEST-12 still green.

---

## Test TEST-44: `doctor` code-server readiness — present ⇒ pass, absent ⇒ fail (PATH stub)

- **Type:** unit
- **Task:** T4
- **Priority:** High

### Setup
Healthy fake root (`node_modules` present, `.nvmrc=22`). A stub `code-server` on a
controlled probe target (PATH stub dir or `HARNESS_CODE_SERVER` seam) for the
present case; an empty/absent probe target for the absent case — deterministic and
independent of the ambient environment (must hold even after T5 provisioning).

### Steps
1. Present: run `doctor --json` with the stub resolvable; capture `verdict` and exit code.
2. Absent: run `doctor --json` with no resolvable code-server; capture `verdict` and exit code.

### Expected Result
Present ⇒ `verdict` `pass`, exit 0. Absent ⇒ `verdict` `fail`, exit 1. `checks[]` includes a `code_server` entry in both cases.

---

## Test TEST-45: `doctor` records friction when code-server is absent (R4)

- **Type:** unit
- **Task:** T4
- **Priority:** Medium

### Setup
Isolated friction file; absent code-server probe target.

### Steps
1. Run `doctor` (absent case).
2. Grep the friction file for a `doctor` record answering the verbatim KEY_QUESTION.

### Expected Result
Exactly one added/retained `doctor` friction entry (verb-only dedupe), verbatim KEY_QUESTION, non-empty `suggested_closure`; a persistence failure would instead yield `fail`/exit 1 (R14).

---

## Test TEST-46: `verify` aggregate ⇒ fail when `doctor` fails on missing code-server

- **Type:** integration
- **Task:** T4
- **Priority:** High

### Setup
Contract with `verify.aggregate` including `doctor`; typecheck runnable; absent
code-server probe target; isolated evidence + friction dirs.

### Steps
1. Run `verify --json` with code-server absent; read overall `verdict` and `checks[]`.
2. Run `verify` (human) and capture exit code.

### Expected Result
Overall `verdict` == `fail`; `checks[]` shows the `doctor` member `fail`; exit 1 — produced by the unchanged `derive_overall` (any member `fail` ⇒ `fail`). With code-server present, `verify` returns its prior `degraded`/`pass` (no aggregate-logic regression; TEST-04/TEST-05 green).

---

## Test TEST-47: friction-log retrospect keeps the suite green

- **Type:** regression
- **Task:** T6
- **Priority:** High

### Setup
The committed `.harness/friction.jsonl` after T6's deletions.

### Steps
1. Assert the 22 deleted records are absent and the 9 still-true records (#1,3,5,6,7,9,10,12,13) are present.
2. Assert anchors #2 (test) and #4 (boot) remain, each with the verbatim KEY_QUESTION and a non-empty `suggested_closure`.
3. Assert every non-empty line is valid JSON (one object per line).
4. Run TEST-09's coverage assertion for `lint, test, build, boot, clean, verify`.

### Expected Result
Log is valid JSONL; kept + anchor records present; deleted records absent; TEST-09 passes unchanged (anchors satisfy `test`/`boot` coverage). TEST-08 round-trip unaffected.

---

## Test TEST-09 (adjusted): seed friction coverage with retained anchors

- **Type:** regression (comment/intent update)
- **Task:** T6, T7
- **Priority:** High

### Setup
`tests/harness/run.sh` TEST-09 (~lines 252–265), unchanged assertion set
`{lint, test, build, boot, clean, verify}`.

### Steps
1. Update TEST-09's inline comment to state that `test`/`boot` coverage is now satisfied by intentionally-retained anchors (#2/#4) for verbs wired to `pass` by #6.
2. Run TEST-09 after T6.

### Expected Result
TEST-09 passes with no assertion-logic change; the comment makes the retained-anchor decision explicit (improvement E). *(If a future story deletes the anchors, TEST-09 must first be relaxed to `{lint, build, clean, verify}` — out of scope here.)*

---

## Test TEST-08 (regression): friction add/list round-trip + exact required-key set

- **Type:** regression
- **Task:** T1, T2
- **Priority:** High

### Setup
Isolated friction file (existing test harness).

### Steps
1. Run the existing TEST-08 flow unchanged (`friction add --verb rttest …` without `--agent`).

### Expected Result
Round-trip passes; required key set `ts verb key_question inference proof_gap suggested_closure` still asserted (the additive `agent` does not break the exact-key check); verbatim KEY_QUESTION present. Confirms the schema change is backward-compatible.

---

## Test TEST-48 (doc/static): README + `.harness/README.md` document `--agent` and the doctor rule

- **Type:** doc/static
- **Task:** T7
- **Priority:** Medium

### Setup
`README.md`, `.harness/README.md`.

### Steps
1. Grep for `friction add --agent` usage.
2. Grep for the `doctor` code-server = fail-when-absent statement and devcontainer provisioning note.

### Expected Result
Both files document the new flag and the code-server readiness rule; TEST-11 stays green.

---

## Test TEST-49 (regression): full harness suite green end-to-end

- **Type:** regression/integration
- **Task:** T1–T7
- **Priority:** High

### Setup
Full `tests/harness/run.sh` with code-server present (via T5 provisioning or the present-case stub).

### Steps
1. Run the entire suite non-interactively.
2. Confirm the working tree is left clean and the overall Verdict line is green.

### Expected Result
All TEST-01..TEST-49 pass; exit 0; no tracked files mutated (all mutation isolated via `HARNESS_*` overrides, R16).

---

## Traceability

| Acceptance area (issue Alignment / refined intent) | Tests |
|---|---|
| Friction record identifies exactly one agent; distinct value when none | TEST-40, TEST-41, TEST-42 |
| Legacy/absent records read as `unknown`; consumers keep working | TEST-40, TEST-08 |
| RPIV agents self-attribute | TEST-43 |
| Per-agent view = `friction list` filtered on `agent` | TEST-42 (field presence enables filter) |
| doctor code-server present⇒pass / absent⇒fail | TEST-44, TEST-45 |
| verify aggregate fails on failing doctor | TEST-46 |
| Retrospect deletions keep suite green (TEST-09) | TEST-47, TEST-09(adjusted) |
| Backward-compatible schema (TEST-08) | TEST-08 |
| Docs updated | TEST-48, TEST-11 |
| Whole suite green | TEST-49 |
