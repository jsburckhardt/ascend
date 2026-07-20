# Implementation Notes: Issue #5 — Add local development and validation commands

> **Revision: REVIEW CYCLE 2 — resolves major review finding F-02
> (mode-driven dispatch).** The interactive/handoff category (ADR-0004 /
> CORE-COMPONENT-0003 R17) is now enforced by making the contract `mode`
> attribute **authoritative** for handler selection, instead of keying on
> hard-coded verb names. Architecture (ADR-0004, R17, DECISION-LOG) was already
> correct and is unchanged; this cycle only makes the code + tests honor it. See
> the **F-02 fix** section below.
>
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

## The F-02 fix (REVIEW CYCLE 2): contract `mode` is now authoritative

Review finding F-02 (major, high confidence) held that `mode` was *descriptive*
rather than the behavior selector promised by ADR-0004 / R17: dispatch keyed on
hard-coded verb **names** (`lint|test|build|boot -> verb_capability`,
`dev -> verb_exec`), `verb_exec` defaulted a *missing* mode to `exec`, and
`verb_orient` hard-coded `dev_mode: exec`. Consequently, if issue #6 set
`boot.mode: exec`, boot would still use the run-to-completion handler and could
**hang**; and removing/relaxing `dev.mode` would not select capability behavior —
both violating R17. The architecture was already correct; only the code and tests
did not honor it.

The fix makes the contract `mode` DATA the single source of truth for handler
selection (data-driven, R8), defined once in a small `dispatch_verb` helper:

1. **Mode-driven dispatch (`dispatch_verb`).** The capability/handoff verb family
   (`lint`, `test`, `build`, `boot`, `dev`) now routes through one helper that
   reads the verb's `mode` via `get_mode` and selects the handler by DATA:
   - `mode == exec` → `verb_exec` (interactive/handoff);
   - `mode` absent/empty or `mode == capability` → `verb_capability`
     (run-to-completion, the default — so every pre-existing verb is unchanged);
   - any other/unsupported `mode` → a usage error printed to stderr, **exit 2**
     (never a silent handler pick).
   `main()`'s special handlers (`help`, `orient`, `doctor`, `verify`, `status`,
   `clean`, `friction`) are untouched and keep their exact behavior.
2. **`verb_exec`.** Removed the "default missing mode to `exec`" fallback. Because
   dispatch guarantees `mode == exec` before routing here, the descriptor's `mode`
   is derived from the real `get_mode` value (it will be `exec`) — no fabrication.
   The `--print`/`--json` non-exec introspection, the unmapped→`unknown`+friction
   honesty, and the `exec sh -c "$maps_to"` handoff are unchanged.
3. **`verb_orient`.** The `dev_mode` JSON field (and the human `dev execs` line's
   `mode:` note) are now derived from `get_mode dev` rather than the literal
   `exec`, so orient reflects contract data.

Everything else is preserved: existing verbs/verdicts, the `verify` aggregate
(R6), the exit-code contract (R3), the `--json` schema, evidence, friction, `boot`
staying `unknown` (no mode → capability → unknown), `verify` staying
degraded/exit-0, and the real `./harness dev` handoff + `dev --print`/`dev --json`.

**New regression coverage — TEST-31 (mode-switch, hermetic).** Using isolated
scratch contracts via `HARNESS_CONTRACT` (+ `HARNESS_FRICTION`/`HARNESS_EVIDENCE_DIR`)
mapped to fast, non-blocking commands (`true`), so no tracked file is mutated and
nothing hangs:
- **Positive:** a scratch contract with `boot.mode: exec` + `maps_to: "true"` →
  `./harness boot --print` resolves `true`, exit 0, **no** `Verdict:` line, no
  hang; `./harness boot --json` is a verdict-FREE handoff descriptor
  (`mode: exec`, `maps_to`, `interactive: true`, no `verdict`); bare
  `./harness boot` hands off via `exec` (runs `true`, exit 0, no verdict) —
  proving `boot` switched to the handoff path purely from data.
- **Default/negative:** a scratch contract where `dev` has **no** `mode` (and one
  with explicit `mode: capability`) + `maps_to: "true"` → `./harness dev` goes
  through the run-to-completion capability path and emits **exactly one**
  `Verdict:` line (proving absent/`capability` selects capability).
- **Unsupported:** a scratch contract with `mode: bogus` → `./harness boot`
  **exit 2** (usage error), no `Verdict:` line.
- **Regression inside TEST-31:** the REAL contract still routes by data —
  `dev --print` → `npm run dev` (exec handoff), `boot` (no mode) → `unknown`
  exit 0. Existing TEST-20 (dev excluded from run-to-completion) and TEST-30 stay
  green; suite count 37 → **38 PASS**.

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
| `harness` (script) | T1 | Added the `mode: exec` interactive/handoff verb path: a `get_mode` contract reader; a generic `verb_exec` handler (unmapped → `unknown`+friction, `--json`/`--print` non-exec introspection, else `cd "$ROOT" && exec sh -c "$maps_to"`); a `dev)` dispatch case; a `dev` line in `verb_help` (+ handoff note); the resolved dev command surfaced in `verb_orient` (human + `--json`). POSIX-only; every existing verb byte-for-byte behaviorally unchanged. **REVIEW CYCLE 2 (F-02):** added a `dispatch_verb` helper that selects the handler for the `lint/test/build/boot/dev` family from `get_mode` DATA (`exec`→`verb_exec`, absent/`capability`→`verb_capability`, other→exit 2); removed `verb_exec`'s "default missing mode to exec" fallback; derived `verb_orient`'s `dev_mode` from `get_mode dev` instead of a literal. |
| `.harness/contract.yml` | T2 | Added the `dev` verb as DATA: `maps_to: "npm run dev"`, `mode: exec`, `json: true`, description. Documented `mode` semantics in the header comment. `boot.maps_to` stays `null`; `verify.maps_to` stays `"npm run typecheck"`. |
| `README.md` | T4 | Reworked "Start the local development environment" to document **`./harness dev`** as the harness-invocable dev command (execs `npm run dev`; interactive handoff, no verdict; `--print`/`--json` introspection). Removed the prior "run `npm run dev` directly instead of the harness" framing; the `boot` note now defers only **app-serve + health** to #6. Validation section unchanged. |
| `.harness/README.md` | T5 | Added `dev` to the verb table (interactive handoff; n/a — no verdict); added an "Interactive/handoff verbs (`mode: exec`, R17)" section; noted the `--json` descriptor is verdict-exempt; updated the Issue #5 status so the dev inner loop is invokable via `./harness dev` and `boot` (app-serve) stays #6. All TEST-11 tokens preserved. |
| `.harness/friction.jsonl` | T6 | Appended one `dev` entry via `./harness friction add` recording that the interactive-process gap (entries #8/#14) is now handled by the `mode: exec` handoff (`./harness dev`), with `boot` app-serve still deferred to #6. Append-only. |
| `tests/harness/run.sh` | T7 | TEST-01/02/11 updated for the 13th verb (`dev`) + `dev.maps_to`/`dev.mode` assertions; TEST-20 keeps `dev` OUT of the run-to-completion loop and adds a `dev --print` no-hang assertion; TEST-30 rewritten to positively prove AC3; added optional timeout-guarded exec probe **TEST-30b**. **REVIEW CYCLE 2 (F-02):** added **TEST-31** proving contract `mode` is authoritative via isolated scratch contracts — `boot.mode: exec`→handoff (`--print`/`--json`/bare exec, no hang), `dev` absent/`capability`→one `Verdict:` line, `mode: bogus`→exit 2, and the real contract still routing dev(exec)/boot(unknown). |

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
PASS  TEST-31 contract mode authoritative: exec->handoff, absent/capability->run-to-completion, unsupported->exit 2 (real dev exec / boot unknown intact)
-------------------------------------------------------
Totals: PASS=38 FAIL=0 SKIP=0
Verdict: pass
```
The suite **completed and returned** (exit 0) — it did **not** hang, confirming the
interactive `dev` verb is never exec'd to completion by the enumeration and that
the new mode-switch cases (`boot.mode: exec`, `dev` no-mode, `mode: bogus`) all use
fast, non-blocking commands.

---

## Task T8 (REVIEW CYCLE 2): make contract `mode` authoritative (F-02)

- **Status:** Done
- **Files Changed:** `harness`, `tests/harness/run.sh`
- **Tests Passed:** TEST-31 (new) + all existing (TEST-01..30b) — 38 checks
- **Tests Failed:** 0

### Changes Summary
- **`dispatch_verb` (new helper)** — routes the `lint/test/build/boot/dev`
  capability/handoff family by reading `get_mode`: `exec`→`verb_exec`,
  absent/empty or `capability`→`verb_capability`, any other value→usage error
  (stderr, exit 2). Selection is defined once and driven by contract DATA, so
  `mode` is now authoritative (R8/R17). Special handlers (help/orient/doctor/
  verify/status/clean/friction) are untouched.
- **`verb_exec`** — removed `[ -n "$_mode" ] || _mode="exec"`; the descriptor's
  `mode` is derived from the real `get_mode` value (dispatch guarantees `exec`).
- **`verb_orient`** — `dev_mode` JSON field and the human `dev execs` line's
  `mode:` note now derive from `get_mode dev` (no hard-coded `exec` literal).

### Test Results
- Positive: `boot.mode: exec` (scratch) → `boot --print` resolves `true` exit 0 no
  verdict; `boot --json` verdict-free handoff descriptor; bare `boot` execs `true`
  exit 0 no verdict — **no hang**.
- Default/negative: `dev` with no `mode` and with `mode: capability` (scratch) →
  exactly one `Verdict:` line, exit 0.
- Unsupported: `mode: bogus` (scratch) → exit 2, no verdict.
- Regression: real `dev --print` → `npm run dev` (exec); real `boot` (no mode) →
  `unknown` exit 0; `verify` → degraded exit 0; `orient --json` `dev_mode` = `exec`
  via `get_mode`; `sh -n harness` clean.

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
| 7. Durable suite | `sh tests/harness/run.sh` | **`Verdict: pass`** — `PASS=38 FAIL=0 SKIP=0`; **completes without hanging** |
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
