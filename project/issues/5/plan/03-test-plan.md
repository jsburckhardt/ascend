# Test Plan: Issue #5 — Add local development and validation commands

Reference: `01-action-plan.md` (D1–D5), `02-task-breakdown.md` (T1–T5).

## How the acceptance criteria are validated

| Acceptance Criterion | Validated by |
|----------------------|--------------|
| A documented command starts the local development environment | TEST-30 (§1), TEST-M1, TEST-P3 |
| A documented validation command runs and passes on the baseline | TEST-P2 (`./harness verify`), existing TEST-04/05/17, TEST-30 (§5) |
| The commands are wrapped/invokable through the harness CLI | TEST-P2 (validation, fully wrapped), TEST-P4 (dev surfaced + `boot` deferral, D2), existing TEST-01/06/20 (no regression) |
| Both commands are documented in the README | TEST-30 (§2/§3), TEST-P3 |

## Harness commands used (real verbs only)

Enumerated from `.harness/contract.yml` + the `harness` source: the Verify stage
uses `./harness verify`, `./harness orient`, `./harness status`, `./harness boot`,
`./harness friction list`, and the durable suite `sh tests/harness/run.sh`.
**Planning does not execute these** (per the harness rule for read-only stages);
they run in the Implement/Verify stages.

---

## Test TEST-30: New durable regression block for #5 acceptance criteria

- **Type:** Automated (static assertions in `tests/harness/run.sh`)
- **Task:** T5 (covers T1–T4 outputs)
- **Priority:** High

### Setup
Node 22 present and `node_modules` installed (so the `TC_OK`/node-gated branches
run). Working tree at the #5 change set. No mutation of tracked files (the suite
isolates all writes to its scratch dir).

### Steps
1. Assert `package.json` `scripts.dev` == `tsc --noEmit --watch` and
   `scripts.typecheck` == `tsc --noEmit`; assert no `validate`/`check` script.
2. Assert `README.md` contains `npm run dev`, `./harness verify`, `npm run typecheck`,
   and a `degraded`/non-blocking note token.
3. Assert `.harness/README.md` names `npm run dev` and defers `boot` to `#6`.
4. Assert `.harness/contract.yml` still has `boot.maps_to: null` and
   `verify.maps_to: "npm run typecheck"` (exactly one occurrence).
5. Run `./harness verify` (node-gated): capture verdict + exit code.
6. **Do NOT** run `npm run dev` or map any blocking command to `boot`.

### Expected Result
- Steps 1–4 all pass (grep assertions true).
- Step 5: verdict is non-`fail` (`degraded` on baseline) and exit code is `0`.
- The block reports `PASS TEST-30 ...` and the suite's final line is `Verdict: pass`.

---

## Test TEST-P2: Validation command runs and "passes" via the harness

- **Type:** Integration (harness)
- **Task:** T2 (validation AC); reuses existing TEST-04/05/17
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
- Interpretation (D3): this is the accepted "runs and passes" state for AC2.

---

## Test TEST-P3: README documents both commands (AC1, AC4)

- **Type:** Documentation review (+ static grep in TEST-30)
- **Task:** T2
- **Priority:** High

### Setup
Rendered `README.md` at the #5 change set.

### Steps
1. Read the "Getting Started" / development-and-validation section.
2. Confirm `npm run dev` is described as the command that starts the local
   development environment.
3. Confirm `./harness verify` and `npm run typecheck` are described as the
   validation commands, with the `degraded`/exit-0 = non-blocking explanation.
4. Confirm the `./harness boot` deferral to #6 is stated.
5. Confirm no `validate`/`check` alias appears.

### Expected Result
- Both commands are documented, accurate, and honest; the `degraded` note and
  the #6 `boot` deferral are present; no redundant alias is introduced.

---

## Test TEST-P4: Dev command is surfaced through the harness CLI; `boot` deferral is honest (AC3)

- **Type:** Integration (harness) + documentation review
- **Task:** T3, T1 (D2)
- **Priority:** High

### Setup
Unchanged `harness` script and `.harness/contract.yml`; updated `.harness/README.md`.

### Steps
1. Run `./harness boot` and `./harness boot --json`; record verdict + exit code.
2. Confirm `.harness/README.md` names `npm run dev` as the dev inner loop and
   states `boot` wrapping is owned by #6.
3. Confirm the validation command is fully wrapped: `./harness verify` (TEST-P2).

### Expected Result
- `./harness boot` returns `unknown` and exits `0` (honest gap; not faked), and
  records/keeps a `boot` friction entry.
- The harness documentation surface points to `npm run dev` and to #6 for the
  interactive wrapping — satisfying AC3 for validation fully and for the dev
  command via the documented harness surface (residual risk recorded in D2:
  full interactive wrapping of `boot` lands in #6).

---

## Test TEST-P5: No harness/contract drift; existing suite stays green

- **Type:** Regression (durable suite)
- **Task:** T5 (and all tasks)
- **Priority:** High

### Setup
Node 22 + `node_modules` present.

### Steps
1. Run `sh tests/harness/run.sh`.
2. Inspect specifically: TEST-01 (`boot` maps_to null), TEST-06 (`boot`/`lint`/
   `test`/`build` unknown + friction), TEST-20 (each verb emits exactly one
   `Verdict:` line and none hang), TEST-04/05/17 (`verify` degraded/exit-0/non-fail),
   TEST-18/19 (data-only rewiring via isolated contracts), TEST-11 (`.harness/README.md`
   completeness), TEST-16 (`verification.yml` routes `./harness verify`).

### Expected Result
- `Verdict: pass` with `FAIL=0`. In particular TEST-20 completes (proving no
  blocking command was mapped to `boot`) and TEST-01/06 stay green (proving
  `contract.yml` was not rewired). Working tree left clean.

---

## Test TEST-P6: Friction annotations keep closures truthful (D4)

- **Type:** Integration (harness) + schema validation
- **Task:** T4
- **Priority:** Medium

### Setup
Updated `.harness/friction.jsonl` after T4 appends.

### Steps
1. Run `./harness friction list --json` and validate JSON.
2. Confirm new entries exist for `lint`, `test`, `build`, `verify`, `boot` with
   the #5 closures (deferral for lint/test/build; accepted-degraded for verify;
   #6 ownership for boot).
3. Confirm seed lines 1–9 are unchanged (append-only).

### Expected Result
- `friction list --json` is valid JSON with an increased count; every entry has
  the verbatim KEY_QUESTION and a non-empty `suggested_closure`; the post-#5
  `boot` closure names `#6`; the `lint`/`test`/`build` closures no longer promise
  #5 will wire them. Existing TEST-08/09/27 remain green.

---

## Test TEST-M1: Manual verification that `npm run dev` starts the dev environment

- **Type:** Manual / interactive (cannot be automated — the watch blocks)
- **Task:** T1
- **Priority:** Medium

### Setup
Node 22 + `node_modules` present. Interactive terminal.

### Steps
1. Run `npm run dev`.
2. Observe it starts a persistent TypeScript watch and reports the baseline
   (`src/placeholder.ts`) as compiling with no errors.
3. Optionally edit `src/placeholder.ts` to introduce a type error and confirm the
   watch reports it, then revert.
4. Press Ctrl-C to stop.

### Expected Result
- `npm run dev` launches and stays running, giving continuous typecheck feedback;
  it is the honest Prototype-0 "local development environment" (AC1). It is
  **excluded from the automated suite** precisely because it is long-running
  (this is the constraint that keeps `boot` unwrapped until #6 — D2).

---

## Coverage-to-decision matrix

| Decision | Covered by |
|----------|-----------|
| D1 dev = `tsc --noEmit --watch`, not mapped to `boot` | TEST-30 (§1/§4), TEST-M1, TEST-P5 |
| D2 `boot` stays `unknown`, deferred to #6; dev surfaced via harness docs | TEST-P4, TEST-30 (§3/§4), TEST-P5 (TEST-20 no hang) |
| D3 `verify`=`degraded`/exit-0 satisfies "passes"; no lint/test tooling | TEST-P2, TEST-30 (§5), existing TEST-04/05/17 |
| D4 append-only friction closure annotations | TEST-P6, existing TEST-08/09/27 |
| D5 no `validate`/`check` alias | TEST-30 (§1/§2), TEST-P3 |

## Exit criteria for the Verify stage
- `sh tests/harness/run.sh` → `Verdict: pass` (TEST-01..30, FAIL=0).
- `./harness verify` → non-`fail`, exit 0.
- All four issue ACs validated per the table above; TEST-M1 performed manually.
- No changes to the `harness` script or `.harness/contract.yml` (CORE-COMPONENT-0003 R8).
