# Task Breakdown: Issue #5 — Add local development and validation commands

**Revision: REVIEW CYCLE 1 (resolves blocking finding F-01).** This breakdown
supersedes the prior data-only plan: the dev command is now made genuinely
invokable through the harness via a new interactive/handoff verb `dev`.

Reference: `project/issues/5/plan/01-action-plan.md` (decisions D1–D5),
`project/issues/5/review/00-review.md` (finding F-01).
Governing artifacts: **ADR-0004** (interactive/handoff verbs), **ADR-0002**
(baseline stack / no speculative frameworks), **ADR-0003** (repo-local harness),
**CORE-COMPONENT-0003** (harness contract: R1 wrap-never-reimplement, R3 exit
codes, R4/R9 friction, R6 verify aggregate, R8 data-driven verbs, R16 durable
suite, **R17 interactive/handoff verbs**), **CORE-COMPONENT-0002** (commit standards).

Complexity scale: XS < S < M < L.

---

## Task T1: Add the interactive/handoff verb path to the `harness` script

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** None
- **Related ADRs:** ADR-0004, ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R17, R8, R12, R2/R3/R5 exemption)

### Description
Add the minimal harness code to support `mode: exec` interactive/handoff verbs and
dispatch the new `dev` verb. Concretely:

1. **`get_mode <verb>` reader** — a contract reader analogous to `get_maps_to`
   that prints the `mode:` scalar (4-space-indented `^    mode:`) for a verb, or
   empty when absent. POSIX awk only (R12).
2. **Dispatch** — add `dev)` to the `main()` case statement routing to a handoff
   handler (verb→handler routing is dispatch mechanics, permitted by R8). The
   global `--json` is already stripped by `main`'s first pass; `--print` survives
   into `$@` and is parsed by the handler.
3. **Handoff handler** (e.g. `verb_dev`/`verb_exec`) that reads `mode` + `maps_to`
   from the contract and:
   - if `maps_to` is `""`/`null`/`None`/`native` → `unknown` + friction (R4/R9),
     exit 0, **exec nothing** (R17.3);
   - else if `--json` → print a JSON descriptor with `harness_version`, `verb`,
     `timestamp`, `mode` (`"exec"`), `maps_to`, `interactive: true` and **no**
     `verdict` key; exit 0 (R17.4);
   - else if `--print` → print the resolved command (containing `npm run dev`);
     exit 0 (R17.4);
   - else → `cd "$ROOT" && exec sh -c "$maps_to"` (process handoff; the harness
     process is replaced; the wrapped command's exit code becomes the process exit
     code) (R17.1).
4. **`verb_help`** — add a `dev` line describing it as an interactive handoff
   (execs `npm run dev`; emits no verdict); keep help's own terminal `Verdict: pass`.
5. **`verb_orient`** — surface the resolved dev command honestly (human line and/or
   a `--json` field), keeping the JSON valid and the required keys intact.

Do **not** change any existing verb's behavior, the exit-code contract for
verdict-emitting verbs, `--json` for existing verbs, evidence, or friction. Do
**not** map a blocking command into `verb_capability` or `boot`.

### Acceptance Criteria
- [ ] `./harness dev` (no flags) execs `npm run dev` (process handoff); it does
      **not** run to completion inside the harness and emits no `Verdict:` line.
- [ ] `./harness dev --print` prints a line containing `npm run dev` and exits 0
      **without** starting the watch.
- [ ] `./harness dev --json` prints valid JSON containing `"mode": "exec"`,
      `"maps_to"` = `npm run dev`, `"interactive": true`, and **no** `verdict`
      key; exits 0 without exec.
- [ ] With `dev.maps_to` null/native (isolated contract), `./harness dev` returns
      `unknown` + friction, exit 0, and execs nothing.
- [ ] `./harness help` lists `dev` and states it is an interactive handoff that
      emits no verdict.
- [ ] `./harness orient` (human and `--json`) surfaces the dev command; `--json`
      remains valid with required keys.
- [ ] No existing verb’s behavior, verdict, `--json`, evidence, or exit code
      changes; the script remains POSIX-only (no GNU-only idioms).

### Test Coverage
- **Automated (TEST-30, rewritten):** assert `dev --print` and `dev --json`
  resolve `npm run dev` and exit 0 without hanging; assert `help`/`orient` list
  `dev`; assert an isolated `dev.maps_to: null` contract yields `unknown`+friction.
- **Automated (TEST-20, corrected):** the run-to-completion loop excludes `dev`;
  a dedicated assertion runs `dev --print` (bounded/instant) proving no hang.
- **Regression:** TEST-18 (harness byte-unchanged under data-only rewiring) is
  necessarily updated for this cycle because the harness **is** intentionally
  changed; confirm its intent (data-only rewiring of *capability* verbs) still
  holds by comparing against the new baseline harness cksum.

---

## Task T2: Wire the `dev` verb in `.harness/contract.yml`

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0004, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R8 data-driven, R17)

### Description
Add the `dev` verb entry to `.harness/contract.yml` (data-driven wiring, R8):

```yaml
  dev:
    maps_to: "npm run dev"
    mode: exec
    json: true
    description: "Start the local dev inner loop (interactive handoff; execs npm run dev)"
```

Leave `boot.maps_to: null` and `verify.maps_to: "npm run typecheck"` **unchanged**
(no drift; `boot` app-serve stays owned by #6). Place `dev` logically near `boot`
or `verify`.

### Acceptance Criteria
- [ ] `.harness/contract.yml` declares a `dev` verb with `maps_to: "npm run dev"`,
      `mode: exec`, `json: true`, and a description.
- [ ] `boot.maps_to` is still `null`; `verify.maps_to` is still `"npm run typecheck"`
      (exactly one occurrence).
- [ ] The contract remains valid YAML parseable by the harness readers
      (`get_maps_to`, `get_mode`, `count_verbs`).

### Test Coverage
- **Automated (TEST-30):** grep-assert the `dev` verb has `maps_to: "npm run dev"`
  and `mode: exec`; assert `boot.maps_to: null` and one `verify` typecheck mapping.
- **Regression (TEST-01):** contract schema still conforms (add `dev` to the
  checked verb list; verb count is now 13).

---

## Task T3: Confirm the `package.json` `dev` script and the no-alias rule

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** None
- **Related ADRs:** ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 wrap-never-reimplement)

### Description
`package.json` already defines `"dev": "tsc --noEmit --watch"` and
`"typecheck": "tsc --noEmit"`. Confirm these are present and unchanged, add no new
dependency, and add **no** `validate`/`check`/`test`/`lint`/`build`/`start` alias
(D5). The harness `dev` verb wraps this existing script — it does not reimplement
it (R1).

### Acceptance Criteria
- [ ] `package.json` `scripts.dev` == `tsc --noEmit --watch`.
- [ ] `package.json` `scripts.typecheck` == `tsc --noEmit` (unchanged).
- [ ] No `validate`/`check`/`test`/`lint`/`build`/`start` script; no new
      dependency; `package-lock.json` unchanged.
- [ ] `package.json` is valid JSON.

### Test Coverage
- **Automated (TEST-30 §1):** assert `scripts.dev`/`scripts.typecheck` values and
  the absence of alias scripts.

---

## Task T4: Update the root README to document `./harness dev` and validation

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0004, ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R3 exit codes, R17)

### Description
Update `README.md` "Development and validation" so the **development environment is
started through the harness** (AC1, AC3, AC4):

- **Development:** document **`./harness dev`** as the command that starts the local
  development environment (it execs `npm run dev` = `tsc --noEmit --watch`); note
  `npm run dev` is the backing script. Prefer `./harness dev` (single operating
  surface). Explain it is an interactive handoff (Ctrl-C to stop; emits no verdict).
- **Validation:** keep `./harness verify` (wraps `npm run typecheck`) and the direct
  `npm run typecheck`; keep the honest `degraded`/exit-0 = non-blocking explanation
  (D5; R3).
- **`boot` note:** revise so it defers the **app-serve + health `boot`** to #6 — and
  **remove** the prior instruction to "run `npm run dev` directly" instead of the
  harness (that was the F-01 gap). The dev command is now `./harness dev`.

### Acceptance Criteria
- [ ] README documents `./harness dev` as the command that starts the local
      development environment (with `npm run dev` as the backing script).
- [ ] README documents `./harness verify` and `npm run typecheck` for validation,
      with the `degraded`/non-blocking note.
- [ ] README no longer tells users to run `npm run dev` directly *in place of* the
      harness; it defers only the app-serve `boot` to #6.
- [ ] No `validate`/`check` alias is documented (D5); existing README content
      (product boundary, structure, `npm install`) is preserved.

### Test Coverage
- **Automated (TEST-30 §2):** grep-assert README contains `./harness dev`,
  `./harness verify`, `npm run typecheck`, a `degraded`/`non-blocking` token; and
  contains no `npm run validate`/`npm run check` alias.
- **Doc review (TEST-P3):** reviewer confirms AC1/AC3/AC4 wording is accurate.

---

## Task T5: Update `.harness/README.md` for the `dev` handoff verb

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0004, ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R17, R6, R8)

### Description
Keep the harness docs truthful and consistent with the root README, `package.json`,
and the contract:

- Add **`dev`** to the verb table as an **interactive handoff** (backing command
  `npm run dev`; current verdict: *n/a — hands off, emits no verdict*).
- Document the **`mode: exec`** category and the non-exec `--print`/`--json`
  introspection forms (R17).
- Keep **`boot` = `unknown`**, owned by **#6** for the app-serve + health endpoint
  (not the dev inner loop); keep **`verify` = `degraded`** as the accepted baseline
  and the no-alias rule for `typecheck`.
- Do **not** contradict the exit-code contract; note handoff verbs propagate the
  exec'd command's exit code.

### Acceptance Criteria
- [ ] `.harness/README.md` lists `dev` as an interactive handoff executing
      `npm run dev` and emitting no verdict.
- [ ] `.harness/README.md` documents the `mode: exec` category and `--print`/`--json`
      introspection.
- [ ] `.harness/README.md` states `boot` is `unknown` and owned by #6 (app-serve),
      and reaffirms `verify` = `degraded` accepted baseline + the no-alias rule.
- [ ] All TEST-11 tokens still present: verbs `help`, `orient`, `doctor`, `lint`,
      `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction` (+ `dev`);
      `pass`/`fail`/`degraded`/`unknown`; `--json`; `./harness`; the KEY_QUESTION.

### Test Coverage
- **Regression (TEST-11):** `.harness/README.md` still documents all verbs,
  verdicts, exit codes, `--json`, KEY_QUESTION (add `dev` to the checked list).
- **Automated (TEST-30 §3):** grep-assert `.harness/README.md` names `dev`/`npm run
  dev` and references #6 for `boot`.

---

## Task T6: Append a friction annotation closing the interactive-process gap

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0004, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R9 friction, append-only)

### Description
The friction log is append-only. Using `./harness friction add` (never hand-editing
seed lines), append a clarifying entry for the `boot`/dev interactive-process gap:
the gap recorded in entries #8/#14 (a long-running watch/dev process does not fit the
run-once verdict model) is now **handled** by the `mode: exec` handoff category — the
dev command is invokable as **`./harness dev`** — while `boot` (app-serve + health)
remains owned by #6. Answer the verbatim KEY_QUESTION with a non-empty
`suggested_closure`.

### Acceptance Criteria
- [ ] A new friction entry records that `mode: exec` / `./harness dev` closes the
      dev interactive-process gap, with `boot` app-serve still deferred to #6.
- [ ] The entry is valid JSON on its own line, includes the verbatim KEY_QUESTION,
      and a non-empty `suggested_closure`.
- [ ] Seed/prior lines are not rewritten (append-only); the entry was produced via
      `./harness friction add`.

### Test Coverage
- **Regression (TEST-08/09/27):** friction schema, verbatim KEY_QUESTION, non-empty
  closures, and dynamic counts stay green with the added entry.
- **Automated (TEST-30 §5):** assert a post-#5 friction entry references
  `./harness dev` / `mode: exec` handling the interactive gap.

---

## Task T7: Correct TEST-20 and rewrite TEST-30 to prove AC3 without hanging

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2, T3, T4, T5, T6
- **Related ADRs:** ADR-0004, ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 durable suite, R17)

### Description
Update the durable suite `tests/harness/run.sh` so it proves AC3 for the dev command
without hanging, and keep TEST-01..29 green.

**TEST-20 correction (R17.5):** the "one `Verdict:` line per verb" loop MUST NOT
`exec` `dev`. Keep the loop for the run-to-completion verbs (help/orient/doctor/lint/
test/build/boot/verify/status/clean) and add a dedicated assertion that
`./harness dev --print` resolves `npm run dev` and exits 0 (no hang, no `Verdict:`
line expected because `dev` is verdict-exempt).

**TEST-30 rewrite (proves AC3):** replace the prior "boot stays null" gap-codifying
assertions with positive proof of dev invocability:
1. `package.json` `scripts.dev` == `tsc --noEmit --watch`, no alias (D5).
2. `.harness/contract.yml`: `dev.maps_to` == `"npm run dev"` and `dev.mode` ==
   `exec`; `boot.maps_to` still `null`; one `verify` typecheck mapping.
3. `./harness help` and `./harness orient` list `dev`.
4. `./harness dev --print` prints `npm run dev` and exits 0 **without hanging**;
   `./harness dev --json` is valid JSON with `mode: exec`, `maps_to`, `interactive`,
   and no `verdict` key, exit 0.
5. (isolated) an override contract with `dev.maps_to: null` makes `./harness dev`
   return `unknown` + friction, exit 0, exec nothing.
6. `README.md` documents `./harness dev`; `.harness/README.md` lists `dev` as a
   handoff and defers `boot` to #6.
7. `./harness verify` runs non-`fail`, exit 0 (validation "passes"; node/typecheck
   gated) — unchanged.
8. **(Optional, skippable)** a guarded exec probe: run `./harness dev` under a hard
   `timeout`/`gtimeout` (skip if neither exists) in an isolated subshell and assert
   the watch actually starts, then is killed — proving genuine invocation.

Adjust **TEST-02** (help lists verbs; label 12→13 and add `dev` to the list) and
**TEST-11** (add `dev`) and **TEST-01** (add `dev` header) so they stay green with
the 13th verb. Confirm **TEST-18** still demonstrates data-only rewiring of
*capability* verbs against the new harness baseline.

The suite MUST run non-interactively, never hang, and leave the tree clean (all
mutations isolated to the scratch dir).

### Acceptance Criteria
- [ ] TEST-20 does not `exec` `dev`; it asserts `dev --print` resolves and exits
      without hanging.
- [ ] TEST-30 positively proves AC3: `dev` listed by help/orient, `dev --print`/
      `--json` resolve `npm run dev` without exec, contract has `dev`/`mode: exec`,
      docs updated; `boot` still `null`; `verify` still non-fail.
- [ ] `sh tests/harness/run.sh` → `Verdict: pass` (TEST-01..30, FAIL=0) with Node 22
      + `node_modules` present, and **completes without hanging**.
- [ ] Working tree stays clean; no tracked files mutated by the suite.

### Test Coverage
- **Self-referential:** TEST-20 + TEST-30 are the coverage for the AC-level behavior;
  the gate is `sh tests/harness/run.sh` → `Verdict: pass` with no hang.
- **Regression:** TEST-01/02/11/18 adjusted for the 13th verb and the intentional
  harness change; TEST-03..17, TEST-19, TEST-21..29 unchanged and green.

---

## Dependency order summary

```
T1 (harness handoff verb) ─┬─▶ T2 (contract dev verb) ─┐
                           ├─▶ T4 (root README) ────────┤
                           ├─▶ T5 (.harness README) ─────┼─▶ T7 (TEST-20 fix + TEST-30)
                           └─▶ T6 (friction annotation) ─┤
T3 (package.json confirm) ───────────────────────────────┘
```

T1 first (the harness behavior everything else references); T2 depends on T1; T3 is
independent; T4/T5/T6 depend on T1 (and T2 for the wired command); T7 last (it
asserts the results of T1–T6).
