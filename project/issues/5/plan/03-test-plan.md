# Test Plan: Issue #5 — Add local development and validation commands

**Revision: REVIEW CYCLE 1 (resolves blocking finding F-01).** Tests now prove AC3
for the dev command via the new `./harness dev` verb, without hanging.

Reference: `01-action-plan.md` (D1–D5), `02-task-breakdown.md` (T1–T7),
`project/issues/5/review/00-review.md` (F-01). Governing: **ADR-0004**,
**CORE-COMPONENT-0003 R17**.

## How the acceptance criteria are validated

| Acceptance Criterion | Validated by |
|----------------------|--------------|
| A documented command starts the local development environment | TEST-P4 (`./harness dev` handoff/introspection), TEST-30 (§3/§4), TEST-M1 |
| A documented validation command runs and passes on the baseline | TEST-P2 (`./harness verify`), existing TEST-04/05/17, TEST-30 (§7) |
| The commands are wrapped/invokable through the harness CLI | **TEST-P4 (`./harness dev` genuinely invokable — resolves F-01)**, TEST-P2 (validation), existing TEST-20 corrected (no hang) |
| Both commands are documented in the README | TEST-30 (§6), TEST-P3 |

## Harness commands used (real verbs only)

Enumerated from `.harness/contract.yml` + the `harness` source: the Verify stage
uses `./harness dev --print`, `./harness dev --json`, `./harness verify`,
`./harness orient`, `./harness status`, `./harness help`, `./harness friction list`,
and the durable suite `sh tests/harness/run.sh`. The **only** genuine handoff form
`./harness dev` (no flags) is exercised only under a hard timeout guard (TEST-P4
step 4 / TEST-30 §8, skippable). **Planning does not execute any of these** (per the
harness rule for read-only stages); they run in the Implement/Verify stages.

---

## Test TEST-30: New durable regression block proving AC3 via `./harness dev`

- **Type:** Automated (assertions in `tests/harness/run.sh`)
- **Task:** T7 (covers T1–T6 outputs)
- **Priority:** High

### Setup
Node 22 present and `node_modules` installed. Working tree at the #5 change set.
No mutation of tracked files (the suite isolates all writes to its scratch dir).
The `dev` verb is wired (`dev.maps_to: "npm run dev"`, `mode: exec`).

### Steps
1. Assert `package.json` `scripts.dev` == `tsc --noEmit --watch`, `scripts.typecheck`
   == `tsc --noEmit`; assert no `validate`/`check`/`test`/`lint`/`build`/`start` alias.
2. Assert `.harness/contract.yml` declares `dev` with `maps_to: "npm run dev"` and
   `mode: exec`; `boot.maps_to` still `null`; exactly one `verify` typecheck mapping.
3. Assert `./harness help` and `./harness orient` list `dev`.
4. Run `./harness dev --print`: assert output contains `npm run dev` and exit 0
   **without hanging**. Run `./harness dev --json`: assert valid JSON with
   `mode: exec`, `maps_to` = `npm run dev`, `interactive: true`, no `verdict` key,
   exit 0.
5. (Isolated contract) set `dev.maps_to: null`; assert `./harness dev` returns
   `unknown` + friction and exit 0 (execs nothing).
6. Assert `README.md` contains `./harness dev`, `./harness verify`, `npm run typecheck`,
   a `degraded`/`non-blocking` token, and no `npm run validate`/`npm run check`;
   assert `.harness/README.md` names `dev`/`npm run dev` and defers `boot` to `#6`.
7. Run `./harness verify` (node/TC_OK-gated): assert non-`fail` verdict, exit 0.
8. **(Optional, skippable)** guarded exec probe: if `timeout`/`gtimeout` exists, run
   `timeout 3 ./harness dev` in an isolated subshell and assert it started a process
   (exit reflects the timeout kill), then cleaned up. Skip loudly otherwise.
9. **Do NOT** run bare `./harness dev` without a timeout guard (it would hand off to
   the blocking watch).

### Expected Result
- Steps 1–3, 6 pass (grep/parse assertions true).
- Step 4: `dev --print` prints `npm run dev`, exit 0, instantly (no hang); `dev --json`
  is valid JSON with the handoff descriptor and no `verdict` key.
- Step 5: isolated `dev` → `unknown`, exit 0, friction recorded, nothing exec'd.
- Step 7: verify non-`fail`, exit 0.
- Step 8: skipped or proves the watch starts under timeout.
- The block reports `PASS TEST-30 ...` and the suite's final line is `Verdict: pass`.

---

## Test TEST-P2: Validation command runs and "passes" via the harness

- **Type:** Integration (harness)
- **Task:** T4 (validation docs); the `verify` verb itself is unchanged
- **Priority:** High

### Setup
Node 22 + `node_modules` present. Unchanged `.harness/contract.yml`
(`verify.maps_to: "npm run typecheck"`).

### Steps
1. Run `./harness verify` and record the human verdict line + exit code.
2. Run `./harness verify --json` and read `.verdict`, `.checks[]`, `.evidence`.
3. Run `npm run typecheck` directly and record its exit code.

### Expected Result
- `./harness verify` prints a terminal `Verdict: degraded` line and exits `0`
  (non-blocking; only `fail` blocks — ADR-0003 exit-code contract).
- `--json` verdict is `degraded`; `checks[]` include `typecheck=pass`,
  `lint=unknown`, `test=unknown`, `build=unknown`, and a `doctor` member; an
  `evidence` record is written under `.harness/evidence/`.
- `npm run typecheck` exits `0`.
- Interpretation (D5): this is the accepted "runs and passes" state for the
  validation AC.

---

## Test TEST-P3: README documents both commands (AC1, AC4)

- **Type:** Documentation review (+ static grep in TEST-30)
- **Task:** T4
- **Priority:** High

### Setup
Rendered `README.md` at the #5 change set.

### Steps
1. Read the "Development and validation" section.
2. Confirm `./harness dev` is described as the command that starts the local
   development environment (with `npm run dev` as the backing script).
3. Confirm `./harness verify` and `npm run typecheck` are described as the
   validation commands, with the `degraded`/exit-0 = non-blocking explanation.
4. Confirm the note defers only the **app-serve + health `boot`** to #6 and no
   longer instructs users to run `npm run dev` directly instead of the harness.
5. Confirm no `validate`/`check` alias appears.

### Expected Result
- Both commands are documented, accurate, and honest; the dev command is the
  harness verb `./harness dev`; the `degraded` note and the #6 app-serve `boot`
  deferral are present; no redundant alias is introduced.

---

## Test TEST-P4: Dev command is genuinely invokable through the harness CLI (AC3 — resolves F-01)

- **Type:** Integration (harness) + documentation review
- **Task:** T1, T2 (D1/D2/D4; ADR-0004; R17)
- **Priority:** High

### Setup
`harness` script updated with the `mode: exec` handoff path; `.harness/contract.yml`
declares `dev` (`maps_to: "npm run dev"`, `mode: exec`); `.harness/README.md` updated.
Node 22 + `node_modules` present.

### Steps
1. Run `./harness help` and `./harness orient`; confirm both list `dev` as an
   interactive handoff.
2. Run `./harness dev --print`; confirm it prints `npm run dev` and exits 0
   **instantly, without starting the watch**.
3. Run `./harness dev --json`; confirm valid JSON with `mode: exec`, `maps_to` =
   `npm run dev`, `interactive: true`, and **no** `verdict` key; exit 0.
4. **(Guarded)** if `timeout`/`gtimeout` is available, run `timeout 3 ./harness dev`;
   confirm it actually launches the `tsc --noEmit --watch` process (handoff) and is
   terminated by the timeout — proving genuine invocation. Skip if no timeout tool.
5. (Isolated contract) with `dev.maps_to: null`, run `./harness dev`; confirm
   `unknown` + friction, exit 0, nothing exec'd (honest-when-unmapped, R17.3).
6. Run `./harness boot`; confirm it still returns `unknown`, exit 0 (owned by #6).

### Expected Result
- `dev` is discoverable via `help`/`orient`.
- `./harness dev --print`/`--json` resolve `npm run dev` without exec and exit 0 —
  proving invocability with **no hang** (the mechanism the durable suite relies on).
- The guarded probe (when run) proves `./harness dev` genuinely starts the dev
  environment via process handoff — **AC3 is met for the dev command** (closes F-01).
- Unmapped `dev` degrades to `unknown` + friction honestly; `boot` remains `unknown`
  and reserved for #6.

---

## Test TEST-P5: No regression; existing suite stays green and never hangs

- **Type:** Regression (durable suite)
- **Task:** T7 (and all tasks)
- **Priority:** High

### Setup
Node 22 + `node_modules` present.

### Steps
1. Run `sh tests/harness/run.sh`.
2. Inspect specifically: **TEST-20 (corrected)** — the run-to-completion loop
   excludes `dev`, and a dedicated assertion runs `./harness dev --print` (no hang);
   TEST-01 (contract schema incl. `dev`; `boot` maps_to null), TEST-06 (`boot`/`lint`/
   `test`/`build` unknown + friction), TEST-04/05/17 (`verify` degraded/exit-0/non-fail),
   TEST-18 (data-only rewiring of *capability* verbs against the new harness baseline),
   TEST-19 (aggregate truth table), TEST-11 (`.harness/README.md` completeness incl. `dev`),
   TEST-16 (`verification.yml` routes `./harness verify`).

### Expected Result
- `Verdict: pass` with `FAIL=0`, and the suite **completes without hanging** (proving
  the interactive `dev` verb is never exec'd to completion). TEST-01/06 stay green
  (proving `boot` was not rewired and `verify` did not drift). Working tree left clean.

---

## Test TEST-P6: Friction annotation records the closed interactive-process gap (D5)

- **Type:** Integration (harness) + schema validation
- **Task:** T6
- **Priority:** Medium

### Setup
Updated `.harness/friction.jsonl` after the T6 append.

### Steps
1. Run `./harness friction list --json` and validate JSON.
2. Confirm a new entry records that the interactive-process gap (entries #8/#14) is
   now handled by the `mode: exec` handoff (`./harness dev`), with `boot` app-serve
   still deferred to #6.
3. Confirm prior/seed lines are unchanged (append-only).

### Expected Result
- `friction list --json` is valid JSON with an increased count; every entry has the
  verbatim KEY_QUESTION and a non-empty `suggested_closure`; the new entry references
  `./harness dev` / `mode: exec` and keeps `boot` app-serve at #6. Existing
  TEST-08/09/27 remain green.

---

## Test TEST-M1: Manual verification that `./harness dev` starts the dev environment

- **Type:** Manual / interactive (cannot be fully automated — the watch blocks)
- **Task:** T1
- **Priority:** Medium

### Setup
Node 22 + `node_modules` present. Interactive terminal.

### Steps
1. Run `./harness dev` (the harness verb; it execs `npm run dev`).
2. Observe it hands off to a persistent TypeScript watch and reports the baseline
   (`src/placeholder.ts`) as compiling with no errors.
3. Optionally edit `src/placeholder.ts` to introduce a type error and confirm the
   watch reports it, then revert.
4. Press Ctrl-C to stop.

### Expected Result
- `./harness dev` launches the dev inner loop through the harness (process handoff)
  and stays running, giving continuous typecheck feedback — the harness-invocable
  Prototype-0 "local development environment" (AC1/AC3). It is **excluded from the
  run-to-completion enumeration** of the automated suite precisely because it is a
  handoff verb (R17); the suite proves invocability via `dev --print`/`--json`.

---

## Coverage-to-decision matrix

| Decision | Covered by |
|----------|-----------|
| D1 dev is a first-class harness verb `./harness dev` (not `boot`) | TEST-P4, TEST-30 (§2/§3/§4), TEST-M1 |
| D2 `dev` = `exec` process handoff (no hang, verdict-exempt) | TEST-P4 (steps 2–4), TEST-30 (§4/§5/§8), TEST-P5 (TEST-20 no hang) |
| D3 data-driven `mode: exec` in `contract.yml` | TEST-30 (§2), TEST-P4 (step 5 unmapped) |
| D4 non-hanging `--print`/`--json` introspection proves AC3 | TEST-P4 (steps 2–3), TEST-30 (§4), TEST-P5 (TEST-20 corrected) |
| D5 `boot` stays `unknown`/#6; verify=`degraded` accepted; no alias | TEST-P4 (step 6), TEST-P2, TEST-P6, TEST-30 (§1/§2/§6/§7) |

## Exit criteria for the Verify stage
- `sh tests/harness/run.sh` → `Verdict: pass` (TEST-01..30, FAIL=0) and the suite
  **completes without hanging** (proving the `dev` handoff verb is never exec'd to
  completion — TEST-20 corrected).
- `./harness dev --print` resolves `npm run dev` and exits 0 without starting the
  watch; `./harness dev` genuinely hands off to the dev environment (AC3, F-01 closed).
- `./harness verify` → non-`fail`, exit 0 (validation "passes").
- All four issue ACs validated per the table above; TEST-M1 performed manually.
- ADR-0004 + CORE-COMPONENT-0003 R17 recorded; DECISION-LOG.md updated; the `harness`
  script and `.harness/contract.yml` changes are exactly those specified (new `dev`
  verb + `mode: exec` path), with no other verb behavior changed.
