# Task Breakdown: Issue #5 — Add local development and validation commands

Reference: `project/issues/5/plan/01-action-plan.md` (decisions D1–D5).
Governing artifacts: **ADR-0002** (baseline stack / no speculative frameworks),
**ADR-0003** (repo-local harness), **CORE-COMPONENT-0003** (harness contract:
R1 wrap-never-reimplement, R3 exit codes, R4/R9 friction, R6 verify aggregate,
R8 data-driven verbs, R16 durable suite), **CORE-COMPONENT-0002** (commit standards).

Complexity scale: XS < S < M < L.

---

## Task T1: Add the `dev` development-inner-loop script to package.json

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** None
- **Related ADRs:** ADR-0002, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R8), CORE-COMPONENT-0002 (commit)

### Description
Add exactly one script to `package.json` `scripts`:

```json
"dev": "tsc --noEmit --watch"
```

This is the Prototype-0 "start the local development environment" command
(continuous typecheck feedback) per decision **D1**. It adds no dependency (uses
the existing `typescript` devDependency and `tsconfig.json`), leaves `typecheck`
untouched, and introduces **no** linter/test-runner/bundler/dev-server
(ADR-0002 / PRD §28.7). Do **not** add a `validate`/`check` alias (**D5**). Do
**not** edit `.harness/contract.yml` or the `harness` script (**D1/D2**;
CORE-COMPONENT-0003 R8).

### Acceptance Criteria
- [ ] `package.json` `scripts.dev` equals `tsc --noEmit --watch`.
- [ ] `package.json` `scripts.typecheck` is still `tsc --noEmit` (unchanged).
- [ ] No new entries under `dependencies`/`devDependencies`; `package-lock.json`
      is unchanged by this task.
- [ ] No `validate`, `check`, `test`, `lint`, `build`, or `start` script is added.
- [ ] `package.json` remains valid JSON.

### Test Coverage
- **Static (automated, TEST-30 in `tests/harness/run.sh`):** grep-assert
  `scripts.dev` = `tsc --noEmit --watch` and `scripts.typecheck` = `tsc --noEmit`;
  assert absence of `validate`/`check` scripts. The suite **must not execute**
  `npm run dev` (it is a blocking watch and would hang).
- **Manual (interactive, documented in `03-test-plan.md` TEST-M1):** run
  `npm run dev`, confirm it starts a persistent watch and reports the baseline as
  clean, then Ctrl-C.

---

## Task T2: Document dev + validation commands in the root README

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1
- **Related ADRs:** ADR-0002, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R3 exit codes)

### Description
Extend `README.md` "Getting Started" (or a new "Development and validation"
subsection) to document **both** commands (AC1, AC2, AC4):

- **Development environment:** `npm run dev` — starts the local development inner
  loop (`tsc --noEmit --watch`, continuous typecheck feedback).
- **Validation:** `./harness verify` (preferred, single operating surface) which
  wraps `npm run typecheck`; and the direct form `npm run typecheck`.
- State honestly (per **D3**) that `./harness verify` returns **`degraded`** and
  **exits 0** on the baseline — this is the expected, non-blocking "passing"
  state at Prototype 0 (only `fail` blocks; ADR-0003 exit-code contract), because
  `lint`/`test`/`build` are intentionally still `unknown` (ADR-0002, no
  speculative frameworks).
- Note (per **D2**) that `./harness boot` currently reports `unknown`; wrapping
  the interactive dev/serve process through the harness is delivered by issue #6.
- Prefer `./harness <verb>` over direct commands, consistent with the harness
  agent-workflow rule.

### Acceptance Criteria
- [ ] README documents `npm run dev` as the command that starts the local
      development environment.
- [ ] README documents `./harness verify` **and** `npm run typecheck` as the
      validation commands.
- [ ] README explains `degraded`/exit-0 is non-blocking and is the expected
      Prototype-0 passing state.
- [ ] README notes `./harness boot` is `unknown` today and that harness wrapping
      of the dev/serve process is owned by #6.
- [ ] No `validate`/`check` alias is documented or implied (**D5**).
- [ ] Existing README content (product boundary, directory structure, `npm install`
      setup step) is preserved.

### Test Coverage
- **Static (automated, TEST-30):** grep-assert `README.md` contains `npm run dev`,
  `./harness verify`, and `npm run typecheck`; assert it contains a
  `degraded`/non-blocking note token; assert it does **not** introduce a
  `npm run validate`/`npm run check` alias.
- **Doc review (TEST-P3):** reviewer confirms AC1/AC2/AC4 wording is accurate and
  honest.

---

## Task T3: Update `.harness/README.md` for the dev command and boot/verify status

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R6 aggregate, R8 data-driven)

### Description
Keep the harness documentation truthful and consistent with the root README and
`package.json` (avoiding README/contract drift):

- In the verb table / narrative, note the **development inner loop is
  `npm run dev`** (run directly today).
- State that **`boot` stays `unknown`** and that wrapping the interactive
  dev/serve process is deferred to **#6** (interactive-process handling:
  exec/handoff or readiness-probe+detach) per **D2**.
- Reaffirm that **`verify` = `degraded`** is the accepted Prototype-0 validation
  baseline (typecheck passes; `lint`/`test`/`build` remain `unknown`) per **D3**,
  and that `npm run typecheck` is wrapped **only** by `verify` (never aliased as
  `lint`/`test`/`build`).
- Do **not** change the `harness` script or `.harness/contract.yml`.

### Acceptance Criteria
- [ ] `.harness/README.md` names `npm run dev` as the dev inner loop.
- [ ] `.harness/README.md` states `boot` is `unknown` and owned by #6.
- [ ] `.harness/README.md` reaffirms `verify`=`degraded` as the accepted baseline
      and the no-alias rule for `typecheck`.
- [ ] Every verb token still appears in `.harness/README.md` (keeps TEST-11 green):
      `help`, `orient`, `doctor`, `lint`, `test`, `build`, `boot`, `verify`,
      `status`, `clean`, `friction`, plus `pass`/`fail`/`degraded`/`unknown`,
      `--json`, `./harness`, and the KEY_QUESTION string.

### Test Coverage
- **Regression (existing TEST-11):** `.harness/README.md` still documents all verbs,
  verdicts, exit-code contract, `--json`, and KEY_QUESTION.
- **Static (automated, TEST-30):** grep-assert `.harness/README.md` mentions
  `npm run dev` and references #6 for `boot`.

---

## Task T4: Append friction annotations to keep the log's closures truthful

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** None (independent; may run any time)
- **Related ADRs:** ADR-0002, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R9 friction, append-only)

### Description
Per **D4**, the friction log is append-only. Using `./harness friction add`
(never hand-editing seed lines), append clarifying entries so the #4-seeded
`suggested_closure` text stays truthful:

- `--verb lint` / `--verb test` / `--verb build`: closure re-pointed off #5 to a
  future story once a validated need arises; note #5 deliberately left them
  `unknown` per ADR-0002 (no speculative frameworks).
- `--verb verify`: record #5 confirms `verify`=`degraded`/exit-0 as the accepted
  Prototype-0 validation surface; full `pass` deferred until real lint/test/build exist.
- `--verb boot`: record #5 keeps `boot` `unknown`; #6 owns it (interactive-process
  handling); the dev inner loop today is `npm run dev`.

Each entry answers the verbatim KEY_QUESTION (the harness enforces this) and
carries a non-empty `suggested_closure`.

### Acceptance Criteria
- [ ] New friction entries exist for `lint`, `test`, `build`, `verify`, `boot`
      recording the #5 decisions above.
- [ ] Each new entry is valid JSON on its own line, includes the verbatim
      KEY_QUESTION, and a non-empty `suggested_closure`.
- [ ] Seed entries (lines 1–9) are **not** rewritten (append-only preserved).
- [ ] Entries were produced via `./harness friction add` (not hand-edited).

### Test Coverage
- **Regression (existing TEST-08/TEST-09/TEST-27):** friction schema, verbatim
  KEY_QUESTION, non-empty closures, and dynamic counts all stay green with the
  additional valid entries.
- **Static (automated, TEST-30):** assert a post-#5 `boot` closure entry mentions
  `#6`, and a `lint`/`test`/`build` closure entry no longer claims #5 will wire it
  (grep for the deferral marker text).

---

## Task T5: Add durable regression coverage for #5's acceptance criteria

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2, T3, T4
- **Related ADRs:** ADR-0002, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 durable suite, R8 data-driven)

### Description
Add a new test block **TEST-30** to `tests/harness/run.sh` that locks in #5's ACs
without regressing TEST-01..29. All assertions are **static** (file greps /
`./harness verify` which already returns cleanly); the suite **must not** run
`npm run dev` or map a blocking command to `boot` (TEST-20 would hang).

TEST-30 asserts:
1. `package.json` has `scripts.dev` = `tsc --noEmit --watch` and `scripts.typecheck`
   = `tsc --noEmit`; no `validate`/`check` alias (D1, D5).
2. `README.md` documents `npm run dev`, `./harness verify`, and `npm run typecheck`,
   and carries the `degraded`/non-blocking note (D2, D3, AC1/AC2/AC4).
3. `.harness/README.md` names `npm run dev` and defers `boot` to #6 (D2, D3).
4. `.harness/contract.yml` still has `boot.maps_to: null` and
   `verify.maps_to: "npm run typecheck"` (no drift; D1/D3; reaffirms #6 owns boot).
5. `./harness verify` runs and returns a **non-`fail`** verdict with exit 0
   (validation "passes"; reuses the existing TC_OK guard, node-gated).

Also confirm the full suite still passes: TEST-01 (`boot` maps_to null),
TEST-06 (`boot` unknown), TEST-20 (every verb one Verdict line, no hang),
TEST-04/05/17 (`verify` degraded/exit0/non-fail) all remain green because
`contract.yml` and the `harness` script are unchanged.

### Acceptance Criteria
- [ ] `tests/harness/run.sh` contains a TEST-30 block covering items 1–5 above.
- [ ] TEST-30 performs **no** execution of `npm run dev` or a boot watch (static
      greps + the already-clean `./harness verify` only).
- [ ] Running `sh tests/harness/run.sh` yields `Verdict: pass` (all of
      TEST-01..30 green) in an environment with Node 22 + `node_modules` present.
- [ ] The suite still leaves the working tree clean (mutations isolated to the
      scratch dir; tracked files untouched).

### Test Coverage
- **Self-referential:** TEST-30 *is* the coverage for the AC-level behavior; this
  task's own gate is `sh tests/harness/run.sh` → `Verdict: pass`.
- **Regression:** TEST-01..29 unchanged and green.

---

## Dependency order summary

```
T1 (dev script) ──▶ T2 (root README) ──┐
T1 ─────────────▶ T3 (.harness README) ─┼─▶ T5 (regression coverage)
T4 (friction annotations) ──────────────┘
```

T1 first (everything references the `dev` script); T2 and T3 depend on T1; T4 is
independent; T5 last (it asserts the results of T1–T4).
