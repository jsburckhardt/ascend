# Implementation Notes: Issue #5 — Add local development and validation commands

> **Revision: REVIEW CYCLE 1 — resolves blocking review finding F-01.** This
> supersedes the earlier data-only implementation. The dev command is now made
> **genuinely invokable through the harness** via a new interactive/handoff verb
> `./harness dev` (`mode: exec`), per **ADR-0004** and **CORE-COMPONENT-0003
> R17**. Implements tasks **T1–T7** from
> [`../plan/02-task-breakdown.md`](../plan/02-task-breakdown.md) within decisions
> **D1–D5** of [`../plan/01-action-plan.md`](../plan/01-action-plan.md), validated
> against [`../plan/03-test-plan.md`](../plan/03-test-plan.md).

Governing architecture: **ADR-0004** (interactive/handoff verbs — new), **ADR-0002**
(baseline stack / no speculative frameworks / no new deps), **ADR-0003** (repo-local
harness as the single operating surface), **CORE-COMPONENT-0003** (harness contract
— R2/R3 verdict/exit-code, R4/R9 friction, R5 evidence, R8 data-driven verbs, R12
POSIX-only, R16 durable suite, **R17 interactive/handoff verbs** — amended), and
**CORE-COMPONENT-0002** (commit standards).

## The F-01 fix in one paragraph

Review finding F-01 (high confidence) held that AC3 — *the commands are
wrapped/invokable through the harness CLI* — was **unmet** for the dev command:
`npm run dev` existed only as a documented direct command, `./harness boot` stayed
`unknown`, and documentation is not invocation. A naive foreground mapping into the
run-once capability handler (or into `boot`) would **hang** the harness and the
regression suite forever. The fix introduces a **new interactive/handoff verb
category** (`mode: exec`): `./harness dev` resolves its wrapped command from
contract data and performs a POSIX **`exec` process handoff** — it replaces the
harness process with `npm run dev`, so it never runs to completion, never blocks,
and never emits a verdict. Non-exec introspection (`--print`/`--json`) lets tests
and tooling prove invocability without hanging. `boot` is left untouched
(`maps_to: null`, `unknown`) and remains owned by **#6** (app-serve + health).

## Environment note (registry blocked — do NOT delete node_modules)

The public npm registry is unreachable on this checkout (`npm install` fails with
an SSL handshake error). Lockfile-matching TypeScript is already present under the
**git-ignored** `node_modules/` and is required to run typecheck / `./harness
verify` / the durable suite / the guarded `dev` exec probe. `npm install` is
network-blocked, so `node_modules/` was **not** deleted or reinstalled. No tracked
file, `package.json`, or `package-lock.json` was changed to accommodate the
runtime; `node_modules/` stays gitignored, so the change set is unaffected.

## Files changed (tracked)

| File | Task | Change |
|------|------|--------|
| `harness` (script) | T1 | Added the `mode: exec` interactive/handoff verb path: a `get_mode` contract reader; a generic `verb_exec` handler (unmapped → `unknown`+friction, `--json`/`--print` non-exec introspection, else `cd "$ROOT" && exec sh -c "$maps_to"`); a `dev)` dispatch case; a `dev` line in `verb_help` (+ handoff note); the resolved dev command surfaced in `verb_orient` (human + `--json`). POSIX-only; every existing verb byte-for-byte behaviorally unchanged. |
| `.harness/contract.yml` | T2 | Added the `dev` verb as DATA: `maps_to: "npm run dev"`, `mode: exec`, `json: true`, description. Documented `mode` semantics in the header comment. `boot.maps_to` stays `null`; `verify.maps_to` stays `"npm run typecheck"`. |
| `README.md` | T4 | Reworked "Start the local development environment" to document **`./harness dev`** as the harness-invocable dev command (execs `npm run dev`; interactive handoff, no verdict; `--print`/`--json` introspection). Removed the prior "run `npm run dev` directly instead of the harness" framing; the `boot` note now defers only **app-serve + health** to #6. Validation section unchanged. |
| `.harness/README.md` | T5 | Added `dev` to the verb table (interactive handoff; n/a — no verdict); added an "Interactive/handoff verbs (`mode: exec`, R17)" section; noted the `--json` descriptor is verdict-exempt; updated the Issue #5 status so the dev inner loop is invokable via `./harness dev` and `boot` (app-serve) stays #6. All TEST-11 tokens preserved. |
| `.harness/friction.jsonl` | T6 | Appended one `dev` entry via `./harness friction add` recording that the interactive-process gap (entries #8/#14) is now handled by the `mode: exec` handoff (`./harness dev`), with `boot` app-serve still deferred to #6. Append-only. |
| `tests/harness/run.sh` | T7 | TEST-01/02/11 updated for the 13th verb (`dev`) + `dev.maps_to`/`dev.mode` assertions; TEST-20 keeps `dev` OUT of the run-to-completion loop and adds a `dev --print` no-hang assertion; TEST-30 rewritten to positively prove AC3; added optional timeout-guarded exec probe **TEST-30b**. |

`package.json` (T3) already defined `"dev": "tsc --noEmit --watch"` and
`"typecheck": "tsc --noEmit"` — **confirmed unchanged**, no dependency added, no
alias added.

**Deliberately NOT touched** (D5; R8): `boot.maps_to` (`null`, #6),
`verify.maps_to` (`"npm run typecheck"`), the `verify` aggregate, all other verb
behaviors, `tsconfig.json`, `package-lock.json`,
`.github/soft-factory/verification.yml`, `src/`.

---

## Task T1: Interactive/handoff verb path in the `harness` script

- **Status:** Done
- **Files Changed:** `harness`
- **Tests Passed:** T1 ACs (TEST-30 §3/§4/§5, TEST-20, TEST-P4, TEST-30b) — all
- **Tests Failed:** 0

### Changes Summary
- **`get_mode <verb>`** — a POSIX-awk contract reader analogous to `get_maps_to`
  that prints the 4-space-indented `mode:` scalar for a verb (empty when absent →
  default capability behavior, so pre-existing verbs are unchanged).
- **`verb_exec <verb> <json> [args]`** — the handoff handler. Reads `maps_to` +
  `mode`; then:
  - `maps_to` `""`/`null`/`None`/`native` → `unknown` + friction (R4/R9), exit 0,
    **execs nothing** (R17.3);
  - `--json` → verdict-exempt descriptor `{harness_version, verb, timestamp, mode:"exec",
    maps_to, interactive:true}` (**no** `verdict` key), exit 0, no exec (R17.4);
  - `--print` → prints the resolved command (`npm run dev`), exit 0, no exec (R17.4);
  - otherwise → `cd "$ROOT" && exec sh -c "$maps_to"` — process handoff (R17.1);
    the wrapped command's exit code becomes the process exit code (R17.2).
- **Dispatch** — added `dev) verb_exec "$_verb" "$JSON" "$@"` to `main()`'s case.
  The global `--json` is stripped by `main`'s first pass; `--print` survives into
  `$@` and is parsed by the handler. (Structural verb→handler routing is permitted
  by R8; the command + mode stay in contract data.)
- **`verb_help`** — added a `dev` line (interactive handoff; execs `npm run dev`;
  emits NO verdict) plus a note on `--print`/`--json` introspection; help still
  prints its own terminal `Verdict: pass`.
- **`verb_orient`** — surfaces the resolved dev command (`dev execs : npm run dev`
  human line; `dev_maps_to` + `dev_mode` JSON fields); JSON stays valid.

### Test Results
- `./harness dev` (no flags) → process handoff to `tsc --noEmit --watch` (proven
  under a hard `timeout` in TEST-30b; exit 124 = still-running watch killed).
- `./harness dev --print` → `npm run dev`, **exit 0, no hang, no `Verdict:` line**.
- `./harness dev --json` → valid JSON, `"mode": "exec"`, `"maps_to": "npm run dev"`,
  `"interactive": true`, **no `verdict` key**, exit 0.
- Isolated contract with `dev.maps_to: null` → `Verdict: unknown`, exit 0, friction
  appended, **nothing exec'd**.
- `./harness help` and `./harness orient` list `dev`; verb count = 13.
- POSIX portability confirmed under `dash` (`dev --print`/`--json`, help/orient,
  usage-error exit 2) and TEST-24's forced non-GNU (`mawk`) userland stays green.
- No existing verb's behavior/verdict/`--json`/evidence/exit-code changed.

---

## Task T2: Wire the `dev` verb in `.harness/contract.yml`

- **Status:** Done
- **Files Changed:** `.harness/contract.yml`
- **Tests Passed:** T2 ACs (TEST-01, TEST-30 §2) — all
- **Tests Failed:** 0

### Changes Summary
Added the `dev` verb entry (`maps_to: "npm run dev"`, `mode: exec`, `json: true`,
description) after `boot`, and documented the `mode` attribute in the header
comment. `boot.maps_to` stays `null`; `verify.maps_to` stays `"npm run typecheck"`
(exactly one occurrence). Data-driven wiring (R8); no code embeds the command.

### Test Results
- `get_maps_to dev` → `npm run dev`; `get_mode dev` → `exec`; `count_verbs` → 13.
- `boot.maps_to` still `null`; single `verify` typecheck mapping (no drift) ✓.
- Contract parses cleanly via all harness readers (TEST-01, TEST-30 §2).

---

## Task T3: Confirm `package.json` dev script + no-alias rule

- **Status:** Done (no change required)
- **Files Changed:** none
- **Tests Passed:** T3 ACs (TEST-30 §1) — all
- **Tests Failed:** 0

### Changes Summary
`scripts.dev` == `tsc --noEmit --watch` and `scripts.typecheck` == `tsc --noEmit`
confirmed present and unchanged. No `validate`/`check`/`test`/`lint`/`build`/`start`
alias; no dependency added; `package-lock.json` untouched. The harness `dev` verb
**wraps** this existing script (R1) rather than reimplementing it.

---

## Task T4: Root README documents `./harness dev` + validation

- **Status:** Done
- **Files Changed:** `README.md`
- **Tests Passed:** T4 ACs (TEST-30 §6, TEST-P3) — all
- **Tests Failed:** 0

### Changes Summary
Rewrote the development subsection to lead with **`./harness dev`** (preferred,
single operating surface) with `npm run dev` shown as the underlying script it
execs; explained the interactive-handoff / no-verdict semantics and the
`--print`/`--json` introspection; linked ADR-0004. The `boot` note now defers only
the **app-serve + health `boot`** to #6 and **no longer** tells users to run
`npm run dev` directly instead of the harness. Validation section (`./harness
verify` / `npm run typecheck`, `degraded`/exit-0 non-blocking) preserved; no
`validate`/`check` alias.

### Test Results
- README contains `./harness dev`, `./harness verify`, `npm run typecheck`,
  `degraded`, `non-blocking`; no `npm run validate`/`npm run check`.

---

## Task T5: `.harness/README.md` for the `dev` handoff verb

- **Status:** Done
- **Files Changed:** `.harness/README.md`
- **Tests Passed:** T5 ACs (TEST-11, TEST-30 §6) — all
- **Tests Failed:** 0

### Changes Summary
Added the `dev` row to the verb table (interactive handoff; n/a — no verdict); a
new "Interactive/handoff verbs (`mode: exec`, R17)" section (exec handoff,
verdict/evidence exemption, honest-when-unmapped, `--print`/`--json`); a note that
the handoff `--json` descriptor omits `verdict`; and an updated Issue #5 status
(dev invokable via `./harness dev`; `boot` app-serve stays #6; `verify`=`degraded`;
no-alias). All TEST-11 tokens preserved (now including `dev`).

### Test Results
- Names `dev` / `npm run dev`, defers `boot` to `#6`, `| \`dev\`` table row present.
- TEST-11 regression green: all verbs (`help`…`friction`, `dev`), verdicts,
  `--json`, `./harness`, verbatim KEY_QUESTION present.

---

## Task T6: Friction annotation closing the interactive-process gap

- **Status:** Done
- **Files Changed:** `.harness/friction.jsonl`
- **Tests Passed:** T6 ACs (TEST-08/09/27, TEST-30 §7, TEST-P6) — all
- **Tests Failed:** 0

### Changes Summary
Appended one `dev` entry via `./harness friction add` (never hand-edited): records
that the interactive-process gap logged in entries #8/#14 is now **handled** by the
`mode: exec` handoff — the dev command is invokable as `./harness dev` — while
`boot` (app-serve + health) remains owned by #6. Verbatim KEY_QUESTION and a
non-empty `suggested_closure`.

### Test Results
- Log grew 14 → 15 entries; `friction list --json` valid (count 15); every entry
  carries the verbatim KEY_QUESTION + non-empty closure; append-only (no seed line
  rewritten). New `dev` entry references `./harness dev` and `mode: exec`.

---

## Task T7: Correct TEST-20 + rewrite TEST-30 to prove AC3 without hanging

- **Status:** Done
- **Files Changed:** `tests/harness/run.sh`
- **Tests Passed:** All 37 checks (TEST-01..30 + TEST-30b, FAIL=0)
- **Tests Failed:** 0

### Changes Summary
- **TEST-01** — added `dev` to the checked verb list; asserts `dev.maps_to ==
  "npm run dev"` and `dev.mode == exec`.
- **TEST-02** — label `12 → 13`, added `dev` to the help verb list.
- **TEST-11** — added `dev` to the `.harness/README.md` verb-token list.
- **TEST-20** — the run-to-completion loop still **excludes** `dev` (execing it
  would hang, R17.5); added a dedicated assertion that `./harness dev --print`
  resolves `npm run dev`, exits 0, and emits **no** `Verdict:` line.
- **TEST-30 (rewritten)** — positively proves AC3: (1) `package.json` dev/typecheck
  + no alias; (2) contract `dev.maps_to`/`dev.mode == exec`, `boot` null, single
  verify mapping; (3) help + orient list `dev`; (4) `dev --print`/`--json` resolve
  `npm run dev` without exec (no hang), descriptor has `mode: exec`/`maps_to`/
  `interactive`, **no `verdict` key**; (5) isolated `dev.maps_to: null` →
  `unknown` + friction, exit 0, exec nothing; (6) README + `.harness/README.md`
  doc assertions; (7) friction closure references `./harness dev`/`mode: exec`;
  (8) `./harness verify` non-`fail`, exit 0.
- **TEST-30b (new, optional)** — timeout-guarded exec probe: runs `timeout 3
  ./harness dev`, proving the watch genuinely starts via handoff (exit 124), then
  is killed. Skips loudly when no `timeout`/`gtimeout` or when node/typecheck is
  unavailable, so the suite never hangs and stays green anywhere.
- **TEST-18** unchanged and still green — it compares the harness cksum before/
  after a data-only rewiring **within the same run**, so it correctly proves
  capability verbs rewire by data alone against the new harness baseline.

### Test Results (full suite)
```
PASS  TEST-20 exactly one Verdict: line per human verb (help/friction list = pass; dev handoff excluded, --print no hang)
PASS  TEST-30 #5 dev invokable via ./harness dev (print='npm run dev'); verify=degraded non-fail exit 0; boot null; no drift
PASS  TEST-30b guarded exec probe: ./harness dev started the watch, killed by timeout (exit 124)
-------------------------------------------------------
Totals: PASS=37 FAIL=0 SKIP=0
Verdict: pass
```
The suite **completed and returned** (exit 0) — it did **not** hang, confirming the
interactive `dev` verb is never exec'd to completion by the enumeration.

---

## Verification results (exit criteria)

| Check | Command | Result |
|-------|---------|--------|
| 1. Typecheck | `npm run typecheck` | **exit 0** |
| 2. Harness verify (aggregate gate) | `./harness verify` | **`Verdict: degraded`, exit 0** (non-fail; accepted Prototype-0 "passing" state) |
| 3. Dev print | `./harness dev --print` | prints **`npm run dev`**, **exit 0**, no watch started |
| 4. Dev json | `./harness dev --json` | valid JSON descriptor (`mode:"exec"`, `maps_to:"npm run dev"`, `interactive:true`, **no `verdict`**), exit 0, no watch |
| 5. Discoverability | `./harness help` / `./harness orient` | both list `dev` (handoff) |
| 6. Guarded handoff | `timeout 3 ./harness dev` | starts `tsc --noEmit --watch`, killed by timeout (exit 124); **no leftover process tree** |
| 7. Durable suite | `sh tests/harness/run.sh` | **`Verdict: pass`** — `PASS=37 FAIL=0 SKIP=0`; **completes without hanging** |
| 8. Working tree | `git status` | only intended files changed; `node_modules/` and `.harness/evidence/*` gitignored; no `/tmp` scratch left |

### Acceptance criteria (issue) — status
- **A documented command starts the local development environment** — ✓
  `./harness dev` (execs `npm run dev`); README + `.harness/README.md`; TEST-30
  §3/§4, TEST-30b, TEST-M1.
- **A documented validation command runs and passes on the baseline** — ✓
  `./harness verify` (`degraded`/exit-0, non-blocking = "passes", D5) +
  `npm run typecheck` (exit 0); TEST-30 §8, TEST-04/05/17.
- **The commands are wrapped/invokable through the harness CLI** — ✓ **F-01
  resolved**: the dev command is genuinely invokable as `./harness dev` (`mode:
  exec` handoff, ADR-0004 / R17); validation invokable as `./harness verify`.
- **Both commands are documented in the README** — ✓ root `README.md` and
  `.harness/README.md` (TEST-30 §6, TEST-P3).

Changes stayed inside ADR-0002, ADR-0003, ADR-0004, and CORE-COMPONENT-0003
(incl. the amended R17). No further ADR/core-component deviation was required.
Commits/PR are owned by the Verify stage.
