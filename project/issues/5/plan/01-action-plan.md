# Action Plan: Add local development and validation commands

## Feature
- **ID:** 5
- **Research Brief:** project/issues/5/research/00-research.md

## Scope & Orientation

- **Scope type:** originally `issue` (implementation-level wiring). **Escalated in
  REVIEW CYCLE 1** to include an `architecture_decision`: resolving F-01 introduces
  a new harness behavior category, recorded in **ADR-0004** + **CORE-COMPONENT-0003
  R17** (see below).
- **Harness verb surface (enumerated from `.harness/contract.yml` + the `harness`
  source, the data `./harness orient` renders):** `help`, `orient`, `doctor`,
  `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction add`,
  `friction list` (12 verbs today). **This fix adds a 13th verb, `dev`** (an
  interactive/handoff verb, `mode: exec`). Shell execution was not available in
  this planning environment, so orientation was derived deterministically from
  the harness data and source; the Implement/Verify stages MUST re-confirm with
  `./harness orient` and `./harness status` (both read-only), and MUST NOT run
  the execution verbs during planning.
- **This is an architectural fix (REVIEW CYCLE 1, finding F-01):** unlike the
  original `issue`-scoped plan, resolving F-01 requires a genuine **harness code
  change** (a new interactive/handoff verb behavior) plus an **ADR + core-component
  amendment**. It is therefore recorded architecturally (ADR-0004 +
  CORE-COMPONENT-0003 R17), not by data alone.
- **Current repository state (from files, equivalent to `./harness status`):**
  `verify` = `degraded` (wraps `npm run typecheck`, exit 0); `lint`/`test`/`build`/
  `boot` = `unknown` (`maps_to: null`); `doctor` = `degraded` when `node_modules`
  absent. `package.json` has one script (`typecheck`). `src/` holds only
  `placeholder.ts`. `.harness/friction.jsonl` has 9 entries (6 seeded by #4;
  2 added by #5 research for `boot`/`verify`; 1 for `doctor`).

## Architecture Decision Record status

**This revision (REVIEW CYCLE 1) CREATES an ADR and AMENDS a core-component.**

The local code review returned REQUEST_CHANGES on blocking finding **F-01**: AC3
(*the commands are wrapped/invokable through the harness CLI*) is **unmet** for the
dev command. `npm run dev` existed only as a documented direct command while
`./harness boot` stayed `unknown` — documentation is not invocation. The repo owner
decided to make the dev command **genuinely invokable through the harness now**, via
a minimal process-handoff verb. That is a new **behavioral category** for the harness
(the run-once verdict model cannot host a long-running watch), so it is a genuine,
cross-cutting architectural change:

- **ADR-0004 — Interactive/handoff verbs in the engineering harness (`./harness dev`)**
  (Accepted). Records the decision to add a `mode: exec` handoff verb category and the
  `dev` verb; rejects overloading `boot`, background/detach, and documentation-only
  alternatives.
- **CORE-COMPONENT-0003 amendment — R17 (interactive/handoff verbs)** (Adopted,
  amended). Adds the enforceable contract: the `mode: exec` attribute, the
  verdict/exit-code/evidence exemption, the honest-when-unmapped rule, the mandatory
  non-exec `--print`/`--json` introspection form, and the regression-suite exclusion
  from run-to-completion enumeration.
- **DECISION-LOG.md** updated: ADR-0004 registry row + decision records #38–#46.

Every choice still honors **ADR-0002** (dependency-light, no speculative frameworks)
and **ADR-0003 / CORE-COMPONENT-0003** (single operating surface, wrap never
reimplement, data-driven wiring via `contract.yml`).

## ADRs Created

- `project/architecture/ADR/ADR-0004-interactive-handoff-verbs.md` — interactive/handoff
  verbs; adds the `dev` verb via a `mode: exec` process handoff.

## Core-Components Created

- None created. **CORE-COMPONENT-0003 amended** with **R17** (interactive/handoff
  verbs) — see `project/architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md`.

## Decisions (revised to resolve F-01)

> These choices deliver the repo-owner decision: make the dev command genuinely
> invokable through the harness now, via a minimal, honest, reversible,
> dependency-free process handoff.

### D1 — Dev command is a first-class harness verb `dev` (resolves AC3, F-01)
- **Decision:** Add a **new dedicated verb `dev`** to the harness (do NOT overload
  `boot`, which #6 owns). `./harness dev` starts the local development environment
  through the harness CLI. `npm run dev` (`tsc --noEmit --watch`) is already the
  backing script in `package.json`.
- **Verb name confirmed:** `dev` (distinct from `boot`; the dev inner loop and the
  app-serve boot are different concerns — ADR-0004).
- **Why a new verb, not `boot`:** issue #6 owns `boot` for app-serve + health; the
  #4-seeded friction earmarks `boot` closure at #6. Squatting on `boot` would force
  #6 to rework it and conflate two concerns.

### D2 — Behavior: `exec` process handoff (no hang, no run-to-completion verdict)
- **Decision:** `./harness dev` performs a POSIX **`exec`** handoff:
  `cd "$ROOT" && exec sh -c "$maps_to"`, replacing the harness process with
  `npm run dev`. The harness never runs the watch to completion and never blocks,
  so there is **no hang** and **no run-once verdict** to emit (ADR-0004; R17).
- **Verdict/evidence-exempt:** a `mode: exec` verb emits no `pass`/`fail`/
  `degraded`/`unknown` and writes no evidence; the exec'd command's exit code
  becomes the process exit code (preserves the exit-code contract without masking).
- **Honest when unmapped:** if `dev.maps_to` were `null`/`native`, `dev` returns
  `unknown` + friction (like an unmapped capability verb) and execs nothing.

### D3 — Data-driven mapping via a new `mode` attribute (CORE-COMPONENT-0003 R8)
- **Decision:** Keep the command in **data**. `.harness/contract.yml` gains:
  ```yaml
  dev:
    maps_to: "npm run dev"
    mode: exec
    json: true
    description: "Start the local dev inner loop (interactive handoff; execs npm run dev)"
  ```
  The **new attribute `mode`** selects the behavior category: `mode: exec` =
  handoff; absent `mode` (or `mode: capability`) = the existing run-to-completion
  behavior (default), so **every existing verb is unchanged**. The new *behavior*
  is harness code; the *mapping and mode* stay in contract data (R8).

### D4 — Non-hanging introspection proves AC3 in tests (`--print` / `--json`)
- **Decision:** A handoff verb MUST expose a **non-exec** introspection form
  (R17): `./harness dev --print` prints the resolved command (`npm run dev`) and
  exits 0 without exec; `./harness dev --json` prints a JSON descriptor
  (`verb`, `mode: "exec"`, `maps_to`, `interactive: true`; **no** `verdict` key)
  and exits 0 without exec. Tests assert invocability via these forms — instant,
  deterministic, portable, and non-hanging.
- **TEST-20 correction:** the "one `Verdict:` line per verb" loop MUST NOT `exec`
  `dev`; it asserts `./harness dev --print` resolves + exits without hanging
  instead (R17). An optional guarded exec probe (with a hard timeout, skipped when
  no `timeout`/`gtimeout` is available) may prove the watch actually starts.

### D5 — `boot` stays `unknown`, owned by #6; validation unchanged; no alias
- **Decision (boot):** `boot.maps_to` stays `null` (verdict `unknown`, exit 0),
  reserved for #6 (app-serve + health). #6 may reuse the `mode: exec` handoff
  pattern or choose readiness-probe+detach.
- **Decision (validation):** unchanged from the prior plan — `./harness verify`
  (wraps `npm run typecheck`) is the validation command; it returns **`degraded`**
  / exit 0 on the baseline, which is the accepted, non-blocking "passing" state
  (CORE-COMPONENT-0003 R3). No linter/test-runner/build is added (ADR-0002).
- **Decision (no alias):** no redundant `validate`/`check` npm alias; the canonical
  surfaces are `./harness dev`, `./harness verify`, and their backing
  `npm run dev` / `npm run typecheck`.
- **Friction (append-only):** append a clarifying entry (via `./harness friction add`)
  noting the interactive-process gap logged in the #4/#5 `boot` friction (entries
  #8/#14) is now **handled** by the `mode: exec` handoff category (dev is invokable
  as `./harness dev`), while `boot` app-serve remains #6.

## Files the Implement stage will touch

| File | Change | Guardrail |
|------|--------|-----------|
| `harness` (script) | Add the interactive/handoff verb path: a `get_mode` reader; a `dev)` dispatch case → a handoff handler that reads `mode`+`maps_to`, honors `--print`/`--json` (non-exec introspection), else `cd "$ROOT" && exec sh -c "$maps_to"`; add a `dev` line to `verb_help`; surface the dev command in `verb_orient`. | Preserve ALL existing verbs/verdicts, `--json`, evidence, friction, exit-code contract, POSIX-only (R12). Handoff verb is verdict-exempt (R17). |
| `.harness/contract.yml` | Add the `dev` verb: `maps_to: "npm run dev"`, `mode: exec`, `json: true`, description. Leave `boot.maps_to: null` and `verify.maps_to: "npm run typecheck"` unchanged. | Data-driven wiring (R8); no drift on `boot`/`verify`. |
| `package.json` | Already has `"dev": "tsc --noEmit --watch"` and `"typecheck": "tsc --noEmit"`. No change needed (verify unchanged). | No new deps; no `validate`/`check`/`test`/`lint`/`build`/`start` alias (D5). |
| `README.md` | Change the dev section to document `./harness dev` as the harness-invocable dev command (with `npm run dev` as the backing script); keep the validation section (`./harness verify` / `npm run typecheck`, `degraded`/non-blocking); update the `boot` note so it defers **app-serve** to #6 (no longer telling users to run `npm run dev` directly instead of the harness). | AC1/AC3/AC4; honest; `./harness` is preferred surface. |
| `.harness/README.md` | Add `dev` to the verb table as an interactive handoff (execs `npm run dev`, emits no verdict); explain the `mode: exec` category and `--print`/`--json` introspection; keep `boot` = `unknown`/#6 (app-serve) and `verify` = accepted-degraded. | Keep all TEST-11 tokens; verb table truthful; R17 documented. |
| `.harness/friction.jsonl` | Append (via `./harness friction add`) a clarifying entry: the interactive-process gap (entries #8/#14) is now handled by the `mode: exec` handoff (`./harness dev`); `boot` app-serve stays #6. | Append-only; verbatim KEY_QUESTION. |
| `tests/harness/run.sh` | Update **TEST-20** to not exec `dev` (assert `dev --print` resolves + exits, no hang); rewrite **TEST-30** to prove AC3 via the `dev` verb (help/orient list it; `dev --print`/`--json` resolve `npm run dev` without exec; contract has `dev` `mode: exec`; `boot` still `null`; `verify` still non-fail). Optionally add a guarded, timeout-boxed exec probe (skippable). | Keep TEST-01..29 green (adjust TEST-02/11 label/list for the 13th verb as needed); no hang; tree stays clean. |

**NOT touched (deliberately):** `tsconfig.json`; `.github/soft-factory/verification.yml`
(already routes `./harness verify`); `src/`; the `verify` aggregate and all other
verb behaviors.

## Implementation Tasks (outline)

Ordered by dependency (see `02-task-breakdown.md` for full detail):

1. **T1 — Add the harness interactive/handoff verb path** (`get_mode`, `dev` dispatch, exec handoff, `--print`/`--json` introspection, help/orient text). [D1, D2, D4; ADR-0004; R17]
2. **T2 — Wire the `dev` verb in `.harness/contract.yml`** (`maps_to: "npm run dev"`, `mode: exec`), leaving `boot`/`verify` unchanged. [D3; R8]
3. **T3 — Confirm `package.json` `dev` script** (`tsc --noEmit --watch`) and the no-alias rule; no dependency change. [D5; ADR-0002]
4. **T4 — Update the root README** to document `./harness dev` (dev), `./harness verify` (validation), and the #6 app-serve `boot` deferral. [D1, D5; AC1/AC3/AC4]
5. **T5 — Update `.harness/README.md`** for the `dev` handoff verb, the `mode: exec` category, and `boot`/`verify` status. [D2, D3, D5; R17]
6. **T6 — Append friction annotation** recording the interactive-process gap is now handled by `mode: exec`. [D5; R4/R9]
7. **T7 — Correct TEST-20 and rewrite TEST-30** to prove AC3 without hanging, keeping TEST-01..29 green. [D2, D4; R16, R17]

## Commit / process guardrails
- Commits and PR title follow **CORE-COMPONENT-0002** (Conventional Commits v1.0.0);
  AI-authored commits carry the `Co-authored-by` trailer.
- Changes must be minimal, honest, reversible, and dependency-free (ADR-0002, PRD §5.5/§28.7).
