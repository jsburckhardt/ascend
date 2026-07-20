# Action Plan: Add local development and validation commands

## Feature
- **ID:** 5
- **Research Brief:** project/issues/5/research/00-research.md

## Scope & Orientation

- **Scope type:** `issue` (implementation-level wiring on top of ADR-0003 +
  CORE-COMPONENT-0003). Confirmed by the research brief.
- **Harness verb surface (enumerated from `.harness/contract.yml` + the `harness`
  source, the data `./harness orient` renders):** `help`, `orient`, `doctor`,
  `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction add`,
  `friction list` (12 verbs). Shell execution was not available in this planning
  environment, so orientation was derived deterministically from the harness data
  and source; the Implement/Verify stages MUST re-confirm with `./harness orient`
  and `./harness status`.
- **Current repository state (from files, equivalent to `./harness status`):**
  `verify` = `degraded` (wraps `npm run typecheck`, exit 0); `lint`/`test`/`build`/
  `boot` = `unknown` (`maps_to: null`); `doctor` = `degraded` when `node_modules`
  absent. `package.json` has one script (`typecheck`). `src/` holds only
  `placeholder.ts`. `.harness/friction.jsonl` has 9 entries (6 seeded by #4;
  2 added by #5 research for `boot`/`verify`; 1 for `doctor`).

## Architecture Decision Record status

**No ADR, no core-component, and no `DECISION-LOG.md` change is required or made.**

Rationale: #5 introduces **no new architectural decision** and **no new
cross-cutting behavior**. Deciding and wiring dev/validation commands is fully
governed by existing artifacts:
- **ADR-0003** (repo-local harness) + **CORE-COMPONENT-0003 R8** (data-driven
  verbs) — anticipate exactly this kind of story.
- **CORE-COMPONENT-0003 R3** (exit-code contract) — governs the `degraded`=exit-0
  interpretation.
- **ADR-0002** (`no speculative frameworks` / no build beyond `tsc`) — the binding
  constraint keeping us from adding a linter/test-runner.
Every choice below stays *inside* these decisions, so creating a new ADR would be
noise. Per the escalation rule, the only trigger that would demand an ADR — adding
a genuine test/lint framework — is explicitly **rejected** (see D3). No decision is
made outside an ADR because no *new* architectural decision is made at all.

## ADRs Created
None. (See "Architecture Decision Record status" above.)

## Core-Components Created
None. #5 *consumes* CORE-COMPONENT-0003; it defines no new shared behavior.

## Decisions (resolving the 5 open questions)

> These are the design choices the ship orchestrator delegated to Plan. Each is
> explicit, honest, minimal, reversible, and dependency-free.

### D1 — Dev command identity & harness mapping (OQ1)
- **Decision:** Add exactly one script — `"dev": "tsc --noEmit --watch"` — to
  `package.json`. This is the honest Prototype-0 *development inner loop*
  (continuous typecheck feedback) for a code-less TypeScript baseline. It adds
  **zero** dependencies and honors ADR-0002 / PRD §28.7.
- **Do NOT** wire it into `boot.maps_to`. `contract.yml` is left **unchanged**.
- **Why not wire `boot`:** the dev command is a *blocking, interactive,
  long-running* process. The harness `verb_capability` handler runs a wrapped
  command to completion via `( cd "$ROOT" && sh -c "$maps" ) >/dev/null 2>&1`
  (output suppressed, exit code folded into a single run-once verdict), and the
  durable suite `tests/harness/run.sh` **TEST-20 invokes `boot` to completion**.
  A watch mapped to `boot` would (a) hang `./harness boot` and the entire
  regression suite forever, (b) suppress all developer feedback, and (c) report
  `fail` on Ctrl-C. Making the harness handle a long-running process is a
  **harness code change** (exec/handoff or readiness-probe+detach), which is
  out of scope for a data-only `issue` story (CORE-COMPONENT-0003 R8; ADR-0003).

### D2 — `boot` semantics for a long-running process (OQ2)
- **Decision:** At #5, `./harness boot` **remains a run-once verdict emitter
  reporting `unknown`** (no backing command; `maps_to: null`). The harness MUST
  NOT, in its current form, be pointed at a blocking foreground command. The dev
  watch is invoked **directly** (`npm run dev`) — a documented, *sanctioned*
  bypass per the harness agent-workflow rule — and is surfaced on the harness
  documentation surface (`.harness/README.md`, root README).
- **`boot` ownership stays with #6** (consistent with the #4-seeded friction).
  #5 records the two honest patterns #6 must choose between when it wraps the
  real app-serve + code-server launch:
  1. **exec/handoff** — `./harness boot` replaces its own process with the
     dev/serve process (interactive; emits no verdict); or
  2. **readiness-probe + detach** — start detached, poll a health signal, emit
     `pass`/`degraded`/`fail`, and leave the process running.
  #5 implements **neither** (both are code changes).
- **AC3 interpretation (recorded honestly):** the *validation* command is fully
  wrapped/invokable (`./harness verify`). The *development* command is surfaced
  *through* the harness CLI (documented on the harness surface; `./harness boot`
  honestly reports the gap) but its live watch is run directly until #6 adds
  interactive-process handling. Residual risk: a strict reader may view AC3 as
  only *partially* met for the dev command at #5 — mitigated by #6 completing the
  wrapping. The underlying capability gap is already logged in
  `.harness/friction.jsonl` (the `boot` entry added by #5 research).

### D3 — Does "runs and passes" require verdict `pass`? (OQ3)
- **Decision:** **No.** `./harness verify` = `degraded` (exit 0) **satisfies** the
  AC "a documented validation command runs and passes on the baseline codebase."
  Per CORE-COMPONENT-0003 R3, only `fail` is blocking (exit 1); `pass`/`degraded`/
  `unknown` all exit 0. `degraded` is the honest, expected, non-blocking baseline
  and is already documented as such in `.github/soft-factory/verification.yml`.
  "Passes" is interpreted as **runs and does not block (exit 0 / non-fail)**.
- **Do NOT** add a linter or test runner to push `verify` to `pass`. That would
  violate ADR-0002 "no speculative frameworks" / PRD §28.7. `lint`/`test`/`build`
  stay honestly `unknown` until a validated need arrives. `contract.yml` `verify`
  is left **unchanged** (already wraps `npm run typecheck`).

### D4 — Fate of the #4-seeded friction entries (OQ4)
- **Decision:** The friction log is **append-only** (the `friction add` verb only
  appends; seed entries are an immutable audit trail). #5 does **not** rewrite
  history. The implementer **appends** clarifying entries via
  `./harness friction add` so `suggested_closure` text stays truthful:
  - `lint`, `test`, `build` — **re-point / defer**: closure moves off #5 to
    "a future story once a validated need for a linter/test-runner/build emerges;
    #5 intentionally left these `unknown` per ADR-0002 (no speculative frameworks)."
  - `verify` — **accepted-degraded**: record that #5 confirms `verify` = `degraded`
    / exit 0 as the accepted Prototype-0 validation surface (typecheck); full
    `pass` deferred until real lint/test/build exist.
  - `boot` — **defer to #6**: record that #5 keeps `boot` `unknown` and #6 owns it
    (interactive-process handling); the dev inner loop today is `npm run dev`.
  - `clean` — no change (still names #5/#6; #5 adds no clean command).
- Appends keep the suite green: isolated-copy tests compute friction counts
  dynamically (TEST-08/27) and TEST-09 only requires verbatim KEY_QUESTION +
  non-empty closures, which new valid entries satisfy.

### D5 — Redundant `validate`/`check` alias? (OQ5)
- **Decision:** **No alias.** The canonical validation entry is `./harness verify`
  (harness surface), backed by `npm run typecheck` (npm surface). A third
  `validate`/`check` alias would introduce a drifting entry point — the issue's own
  stated risk ("Commands drifting from what the harness wraps"). The README
  documents **only** these two existing forms.

## Files the Implement stage will touch

| File | Change | Guardrail |
|------|--------|-----------|
| `package.json` | Add `"dev": "tsc --noEmit --watch"` to `scripts`. | No new deps; `typecheck` unchanged. |
| `README.md` | Document `npm run dev` (dev environment) and `./harness verify` / `npm run typecheck` (validation), incl. the `degraded`=non-blocking note and the `./harness boot` deferral to #6. | Both commands documented (AC4). |
| `.harness/README.md` | Note the dev inner loop is `npm run dev`; `boot` wrapping deferred to #6 (interactive-process handling); `verify`=`degraded` is the accepted validation baseline. | Verb table stays truthful; keep TEST-11 tokens. |
| `.harness/friction.jsonl` | Append annotation entries per D4 (via `./harness friction add`). | Append-only; verbatim KEY_QUESTION. |
| `tests/harness/run.sh` | Add durable coverage (new TEST-30) for #5 ACs (static assertions; **must not execute** `npm run dev`/`./harness boot`). | Keep TEST-01..29 green. |

**NOT touched (deliberately):** `harness` script (no code change — CORE-COMPONENT-0003
R8); `.harness/contract.yml` (`verify` already wired; `boot` stays `null` by D1/D2;
`boot.description` "no dev/serve command yet" remains honest since a typecheck watch
is not an app-serve); `tsconfig.json`; `.github/soft-factory/verification.yml`
(already routes `./harness verify`); `src/`.

## Implementation Tasks (outline)

Ordered by dependency (see `02-task-breakdown.md` for full detail):

1. **T1 — Add the `dev` script** to `package.json` (`tsc --noEmit --watch`). [D1]
2. **T2 — Document both commands in the root README** (dev + validation, AC1/AC2/AC4). [D1, D3, D5]
3. **T3 — Update `.harness/README.md`** to reflect the dev command, `boot` deferral, and accepted-degraded validation. [D2, D3]
4. **T4 — Append friction annotations** for `lint`/`test`/`build`/`verify`/`boot`. [D4]
5. **T5 — Add durable regression coverage** (TEST-30) for #5's ACs without executing the watch, and confirm TEST-01..29 stay green. [D1–D5]

## Commit / process guardrails
- Commits and PR title follow **CORE-COMPONENT-0002** (Conventional Commits v1.0.0);
  AI-authored commits carry the `Co-authored-by` trailer.
- Changes must be minimal, honest, reversible, and dependency-free (ADR-0002, PRD §5.5/§28.7).
