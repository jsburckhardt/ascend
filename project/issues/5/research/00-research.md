# Research Brief: Add local development and validation commands

## GitHub Issue
- **Issue:** #5
- **Title:** Add local development and validation commands

## Scope Classification
- **Scope Type:** issue

**Rationale.** Unlike #3 (bootstrap) and #4 (harness adoption) — both classified
`architecture_decision` because each materialised a foundational, cross-cutting ADR — issue
#5 is an **implementation-level** story that adds/wires commands onto the surface those two
ADRs already established. The engineering harness was *designed* so that a story like #5
adds capability by **editing `.harness/contract.yml` data**, not by making a new
architectural decision:

- **ADR-0003, Decision #9 / Consequence:** "Later stories (e.g. #5) move a verb from
  `unknown` to `pass` by editing this data, not by restructuring the harness."
- **CORE-COMPONENT-0003 R8 (Data-driven verbs):** "Adding or rewiring any verb — moving
  `unknown`→`pass` … — MUST be possible by editing contract data alone, with NO change to
  `./harness`." This was confirmed on disk: the harness's generic `verb_capability` handler
  already runs any non-null `maps_to` (`cd "$ROOT" && sh -c "$_maps"`) and returns
  `pass`/`fail` — so `lint`/`test`/`build`/`boot` become live purely by data.

Because the primary work products are (a) a small number of `package.json` scripts, (b)
`contract.yml` `maps_to` edits, and (c) README documentation — with **no** new
architectural decision and **no** new reusable cross-cutting contract — the correct
`scope_type` is `issue`.

> **Escalation caveat (surfaced, not decided):** if the Plan stage elects to introduce a
> *genuine* test framework or linter (i.e. a new dev dependency / new tooling), that would
> touch **ADR-0002's** "no speculative frameworks / no build pipeline beyond `tsc`"
> constraint and should be escalated for an ADR amendment. This brief recommends **against**
> adding such tooling at Prototype 0 (see Risks/Open Questions), which keeps the scope at
> `issue`.

## Problem Statement

Ascend must provide a **consistent, documented set of entry points** to (1) start the local
development environment and (2) validate the codebase, with both wrapped by the engineering
harness (`./harness`) and documented in the README.

Sequencing (per `.github/fleet/sketch.md`): #3 bootstrap → #4 harness → **#5 dev/validation**
→ #6 shell+health. #4 delivered `./harness` deliberately reporting `unknown` for verbs whose
backing commands do not exist yet. #5 is the story that turns those honest gaps into wired,
runnable commands — the harness friction log created in #4 explicitly earmarks `lint`,
`test`, `build`, and `verify`'s degraded aggregate for closure by **"Issue #5 … wire the
… verb's `maps_to` in contract.yml."**

The tension #5 must resolve is that the issue asks for **both** a command that *starts the
local development environment* **and** a *validation* command, but at **Prototype 0 there is
no application to boot** (`src/` holds only `src/placeholder.ts`, `export {};`) and no test
runner, linter, or build/emit step exists. Notably, the `boot` verb's own friction entry
earmarks its closure at **issue #6** (shell + health), not #5. Research must therefore
surface *what a sensible Prototype-0 "development environment" command is for a
TypeScript-only baseline* and *what the honest validation command is today* — and hand the
**decision** to Plan.

Grounding evidence (harness, not inferred):
- `./harness orient` → `pass`; reports Stack "TypeScript + Node.js 22 (LTS) + npm", Setup
  entry `npm install`, Contract `.harness/contract.yml` (12 verbs), **`verify wraps: npm run
  typecheck`**.
- `./harness doctor` → **`degraded`** ("node_modules missing (run npm install)"); Node
  v22.17.1 present, major == 22 true.
- `.harness/contract.yml`: `verify.maps_to = "npm run typecheck"` with
  `aggregate: [lint, test, build, doctor]`; `lint`, `test`, `build`, `boot` all
  `maps_to: null` (→ `unknown` + friction).

## Existing Context

### Repository / application state (inspected)
- **Stack (ADR-0002):** TypeScript + Node.js 22 LTS + npm. `package.json`,
  `package-lock.json`, `tsconfig.json`, `.nvmrc` (`22`) present; `engines.node` `>=22 <23`.
- **`package.json` scripts:** exactly one — `"typecheck": "tsc --noEmit"`. `typescript` is
  the only devDependency. **No** `dev`, `start`, `test`, `lint`, `build`, or `clean` script.
- **`tsconfig.json`:** `noEmit: true`, `strict`, `rootDir: src`, `include: ["src"]`. There
  is deliberately **no build/emit** — `tsc` is a typecheck only.
- **Application source:** `src/placeholder.ts` (`export {};`) — **no app to serve/boot yet**
  ("Prototype 0").
- **Setup entry point (ADR-0002 / README):** `npm install` from repo root; README "Getting
  Started" documents `npm install` then `npm run typecheck`.
- **`node_modules` absent** on this checkout — hence `doctor` is `degraded`; `npm install`
  is the documented remedy (an environment-readiness step, not a `boot`).

### Engineering harness (the mandatory operating surface — ADR-0003 / CORE-COMPONENT-0003)
- **Data-driven wiring is proven on disk.** `verb_capability` (generic handler for
  `lint`/`test`/`build`/`boot`) reads each verb's `maps_to`: `null`/`native` → `unknown` +
  friction; any command string → it is wrapped (`sh -c "$maps_to"`) → `pass`/`fail`. So
  wiring #5's commands needs **no harness code change** — only `contract.yml` data + backing
  `package.json` scripts.
- **`verify` aggregate (R6):** derives its verdict from `typecheck` + `verify.aggregate`
  (`lint`,`test`,`build`,`doctor`). Fixed ordered rule: any `fail`⇒`fail`; else all
  `pass`⇒`pass`; else all `unknown`⇒`unknown`; else `degraded`. **Today `verify` =
  `degraded`** (typecheck `pass`; lint/test/build `unknown`; doctor `pass`/`degraded`).
  Populating `lint`/`test`/`build` `maps_to` so they pass would move the SAME rule to `pass`
  with no code change.
- **Exit-code contract (R3):** only `fail` exits non-zero; `pass`/`degraded`/`unknown` exit
  0 (non-blocking). `.github/soft-factory/verification.yml` already routes the Verify stage
  through `./harness verify` and documents `degraded` as non-blocking.
- **Friction log** (`.harness/friction.jsonl`) already contains #4-seeded entries whose
  `suggested_closure` names **issue #5** for `lint`, `test`, `build`, and the degraded
  `verify`; the `boot` entry names **issue #6**; `clean` names "#5/#6".

### Existing ADRs (`project/architecture/ADR/`) — all read
- **ADR-0001** — template (read-only).
- **ADR-0002 — Ascend baseline technology stack and repository layout** (Accepted). Fixes
  the stack, the minimal manifest, the `src/` layout, `npm install` as the single setup
  entry point, and **forbids speculative frameworks / any build pipeline "beyond `tsc`"**.
  This is the binding constraint on *how much* #5 may add (see Risks).
- **ADR-0003 — Adopt a repo-local engineering harness (`./harness`)** (Accepted). Mandates
  the harness as the operating surface; **explicitly anticipates #5 wiring verbs via
  `contract.yml` data**; lists #5 in Related Issues ("dev/validation commands (will move
  harness verbs from `unknown` to `pass`)").

### Existing Core-Components (`project/architecture/core-components/`) — all read
- **CORE-COMPONENT-0001** — template (read-only).
- **CORE-COMPONENT-0002 — Commit Standards** (Adopted). Conventional Commits v1.0.0 on
  commits and PR titles; `Co-authored-by` trailer on AI-authored commits. Governs #5's
  commits; no change required.
- **CORE-COMPONENT-0003 — Engineering harness contract, verdicts, evidence/friction
  conventions** (Adopted). The stable behavioural contract #5 operates within. **R8**
  (data-driven wiring), **R6** (verify aggregate), **R1** (wrap never reimplement), **R4/R9**
  (honest gaps produce friction answering the KEY_QUESTION) all directly govern #5.

### Decision Log (`project/architecture/ADR/DECISION-LOG.md`) — read
Records ADR-0002/0003 and CORE-COMPONENT-0002/0003. Decisions #12–#37 govern the harness.
Directly relevant: **#13** (wrap, never reimplement / no build system), **#15** (wrap
`typecheck` under `verify` only), **#23/#29** (verb→command mappings live in `contract.yml`
as data), **#26/#27** (verify aggregate rule). **Next free IDs** would be ADR-**0004** and
CORE-COMPONENT-**0004** *if* any were required — but see below: none are.

### PRD constraints (read)
- **§29 / §1438 "Prototype 0: Baseline and Spike Repository"** lists this story's scope
  verbatim: "development commands", "validation commands" (alongside health endpoint and a
  code-server launch script owned by #6/#7). The Prototype-0 demonstration begins with
  "**Start Ascend development environment**".
- **§5.5 Start with prototypes** and **§28.7 Avoid speculative frameworks** — keep #5
  minimal, dependency-light, honest, reversible; no test framework / linter / bundler / dev
  server invented ahead of a validated need.

## Proposed ADRs

**ADRs are NOT required for this issue.**

Wiring dev/validation commands into the harness is **already covered by ADR-0003 +
CORE-COMPONENT-0003**, which were explicitly designed for exactly this:

- ADR-0003 Decision #9 and its "Positive" consequence state later stories (**naming #5**)
  wire real commands by **editing `.harness/contract.yml` data, not by restructuring the
  harness**.
- CORE-COMPONENT-0003 **R8** guarantees "moving `unknown`→`pass` … MUST be possible by
  editing contract data alone, with NO change to `./harness`" — confirmed by the generic
  `verb_capability` dispatch on disk.

Therefore #5 introduces **no new architectural decision** and needs **no new ADR**, provided
it stays within wrapping existing/minimal commands.

> **Single open ADR trigger to escalate (not decided here):** if Plan chooses to add a
> genuine test framework or linter (new dependency/tooling), that decision would strain
> **ADR-0002**'s "no speculative frameworks" rule and SHOULD be recorded as an ADR-0002
> amendment or a new ADR. This brief **recommends against** that at Prototype 0.

## Proposed Core-Components

**Core-components are NOT required for this issue.**

The reusable, cross-cutting behavioural contract already exists as **CORE-COMPONENT-0003**
(verb surface, verdict semantics, `--json` schema, evidence/friction conventions, R8
data-driven wiring). #5 **consumes** that contract; it introduces no new shared, global
behaviour of its own. The only artifacts #5 produces — `package.json` scripts, `contract.yml`
`maps_to` values, README prose, and a `friction.jsonl` closure — are instances of the
existing contract, not a new one. No new core-component is warranted.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [ ] A documented command starts the local development environment
- [ ] A documented validation command runs and passes on the baseline codebase
- [ ] The commands are wrapped/invokable through the harness CLI
- [ ] Both commands are documented in the README
<!-- ACCEPTANCE_CRITERIA_END -->

## Risks and Open Questions

### Recommended approach (for Plan to decide — this brief proposes, it does not decide)

**Validation command — high confidence.** Use **`npm run typecheck`** as the Prototype-0
validation command, invoked through the harness as **`./harness verify`** (already wired:
`verify.maps_to = "npm run typecheck"`). It runs and exits 0 on the baseline. Document both
forms in the README. *No new tooling.* This directly closes the "validation command" AC and
the "wrapped through the harness" AC for validation.

**Development command — recommended, with an open decision.** Add a minimal
**`"dev": "tsc --noEmit --watch"`** script (a real TypeScript inner-loop: continuous
typecheck feedback — an honest "development environment" for a code-less baseline that adds
**no** dependency and honours ADR-0002/§28.7). Wire it into the harness by setting
**`boot.maps_to`** in `contract.yml` (data-only, per R8), so the AC "wrapped/invokable
through the harness CLI" is met via `./harness boot`. Then **#6 rewires `boot.maps_to`** to
the real app-serve + health endpoint. This keeps `boot` honest at every step and avoids
inventing a new harness verb (which *would* be restructuring). **Plan must confirm this vs.
the alternatives below**, because the harness contract does not itself disambiguate #5 vs.
#6 ownership of `boot`.

### Risks
1. **Scope creep beyond wrapping minimal commands (ADR-0002 / §28.7).** The pull to add a
   test runner or linter to make `verify` reach `pass` conflicts with "no speculative
   frameworks." Mitigation: keep #5 to `typecheck` (+ watch `dev`); leave `lint`/`test`
   honestly `unknown` until a validated need arrives.
2. **AC wording vs. verdict model.** AC says the validation command must "run and **pass**",
   but `./harness verify` returns **`degraded`** (lint/test/build `unknown`) even though it
   exits 0 (non-blocking). Risk that `degraded` is read as failing the AC. Mitigation:
   document that `degraded`/exit-0 is the honest, expected, non-blocking Prototype-0 state;
   Plan confirms whether "passes" means verdict `pass` or exit-0.
3. **Long-running dev command vs. run-once verdict model.** Harness verbs run-and-return one
   verdict + evidence; a `dev`/watch process blocks and never "returns" a verdict cleanly.
   Wiring `boot.maps_to` to a foreground watch/serve command needs a defined behaviour
   (e.g. detached/backgrounded, or a short readiness probe that returns then leaves the
   process running). This affects **both** #5 (watch typecheck) and #6 (app-serve) and must
   be designed, not assumed.
4. **`boot` ownership ambiguity (#5 vs #6).** The #4-seeded friction earmarks `boot`'s
   closure at **#6**, but the AC "start the local development environment" reads like #5.
   Risk of duplicated/rewound work if #5 claims `boot` and #6 rewires it. Mitigation: Plan
   explicitly assigns the Prototype-0 `boot` mapping to #5 and the app-serve `boot` to #6,
   and updates/annotates the friction entries accordingly.
5. **Friction closure hygiene.** #4 recorded friction naming #5 for `lint`/`test`/`build`/
   `verify`. If #5 does **not** wire `lint`/`test`/`build` (recommended), those entries
   remain open and their `suggested_closure` text becomes stale/misleading. Mitigation: Plan
   decides whether to re-point those closures to a later story or annotate them as
   intentionally deferred.
6. **README/contract drift.** The AC requires README docs for both commands; the harness
   README (`.harness/README.md`) and `contract.yml` must stay consistent with the root
   README and `package.json` scripts. Mitigation: update all four in the same change and
   keep the harness `orient`/`help` text truthful.

### Open Questions (for Plan / decider — not decided here)
1. **Dev command identity & mapping.** Is `tsc --noEmit --watch` (via `npm run dev`, wired
   to `boot.maps_to`) the right Prototype-0 "development environment", or should #5 leave
   `boot` `unknown` and defer *all* boot to #6 — and if so, how is the dev command still
   "invokable through the harness CLI" without inventing a new verb?
2. **`boot` semantics for a long-running process.** How should the harness `boot` verb treat
   a blocking watch/serve command within the single-verdict + evidence model (detach?
   readiness probe? timeout)? (Same question #6 faces.)
3. **Does "passes" require verdict `pass`?** Is `./harness verify` = `degraded` (exit 0)
   acceptable for the "runs and passes" AC, or must #5 push `verify` to `pass` (which would
   require inventing lint/test tooling that ADR-0002 discourages)?
4. **Fate of the #4 friction entries** naming #5 for `lint`/`test`/`build` if those verbs
   stay `unknown`: re-point, annotate, or close as deferred?
5. **Naming/duplication.** Should the validation command be surfaced as its own
   `npm run validate`/`npm run check` alias, or is `npm run typecheck` (+ `./harness verify`)
   sufficient? Avoid introducing redundant entry points that can drift (the issue's own
   stated risk: "Commands drifting from what the harness wraps").

### Harness-recorded inferences (friction, KEY_QUESTION)
Per the research harness rule, the two inferences this brief had to make that the harness
could not prove were logged via `./harness friction add` (verbs `boot` and `verify`) in
`.harness/friction.jsonl`: (a) that #5 owns a Prototype-0 dev/boot command and that a
watch-mode typecheck is the sensible dev environment (proof gap: `boot` friction points to
#6, and the run-once verdict model does not cover a long-running process); and (b) that
`npm run typecheck`/`./harness verify` (`degraded`, exit 0) is the validation command and
that `degraded` satisfies "runs and passes" (proof gap: AC says "pass", verify returns
`degraded`). These are handed to Plan for decision.
