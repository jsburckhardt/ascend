# Research Brief: Retrospect captured harness friction into improvements and attribute friction to an agent

## GitHub Issue
- **Issue:** #26
- **Title:** Retrospect captured harness friction into improvements and attribute friction to an agent

## Scope Classification
- **Scope Type:** architecture_decision

**Rationale.** Issue #26 changes the **shared, stable behavioural contract** of the
engineering harness's friction subsystem, and the issue's own Alignment block
explicitly **requests an ADR** ("Agent-attributed friction + issue-scoped
retrospect (no persistent improvement store)"). Two facts push this above a plain
`issue`:

- **It amends a governed contract, not just an implementation.** The friction
  record schema and the KEY_QUESTION rule are defined by **CORE-COMPONENT-0003**
  (§"Friction record schema", R4/R9/R14) and its required fields are asserted by
  ADR-0003's decision registry (DECISION-LOG #20). Adding an `agent` field is a
  schema change to a contract that other agents, tests, and `--json` consumers
  read. Per the pipeline rules, "no architectural decision exists unless it is in
  an ADR" and "every ADR or core-component change must update DECISION-LOG.md."
- **It sets a cross-cutting attribution convention.** "Every friction record
  identifies exactly one responsible agent (`unknown` when none)" is a durable,
  repo-wide convention that all RPIV stage agents must follow, which is precisely
  what an ADR + core-component amendment exist to record.

The retrospect activity itself (read the log → rank → propose → user approves →
implement → delete fixed records) is an **agent-driven, issue-scoped one-off**,
not a new persistent mechanism — but the schema/attribution change it is bundled
with is the architectural decision that classifies the issue.

## Problem Statement

The harness records friction as it runs (`.harness/friction.jsonl`), but that
captured friction is **never systematically reviewed and turned into concrete
harness improvements** — the same pain recurs across deliveries and accumulates
unactioned. Additionally, friction is attributed **only to the verb** that
produced it, never to the **agent** that experienced it, so improvements cannot
target the "agent + harness" combination (e.g. distinguishing friction caused by
*how* an agent drives the harness from friction *in* the harness itself).

The maintainer needs (a) a repeatable way to turn captured friction into tracked,
actionable improvement, and (b) a new **`agent`** property associating each
friction record with exactly one agent, with a **distinct recognizable value**
for friction that arose with no agent (e.g. a direct human run) and for legacy
records written before agent attribution existed.

The issue's Alignment block narrows the delivered shape to an agreed model:

- **Schema:** the friction record gains an `agent` field; `./harness friction add`
  accepts an agent name; **default `unknown`** when none is supplied (supersedes
  an earlier `general` suggestion). Legacy/no-agent/internal records read as
  `unknown` — **no on-disk backfill**.
- **Wiring:** each `rpiv-*` agent's existing `./harness friction add` instruction
  is updated to pass **that agent's own name**.
- **Retrospect:** agent-driven and **issue-scoped to #26** — during Research, read
  `.harness/friction.jsonl`, identify highest-value frictions, propose harness
  fixes; the **user approves** which to implement; approved fixes are implemented
  in #26; fixed records are **deleted** from the log (a manual file edit).
- **No new harness verbs and no persistent improvement store** — triage reuses the
  existing `friction list`; "resulting improvements" are the harness changes
  shipped through #26's PR/commits.

## Existing Context

**Friction subsystem (target of change).**
- `harness` (POSIX sh, ~1050 lines). `write_friction()` (lines ~264–275) builds the
  JSONL record with exactly these keys: `ts, verb, key_question, inference,
  proof_gap, suggested_closure, severity`. **There is no `agent` field.**
- `ensure_friction()` (lines ~281–287) is the R4 auto-recorder used by verb
  handlers; it **dedupes by `verb`** (`grep -F '"verb": "<verb>"'`), appending at
  most one entry per verb. This is the existing idempotency/"no double-count"
  mechanism the Alignment relies on.
- `friction_add()` (lines ~934–963) parses flags `--verb --inference --proof-gap
  --suggested-closure --severity --json`; **`--verb` is required**. There is **no
  `--agent` flag** today. On write failure it routes through `persist_fail`
  (R14 — visible failure, no partial write), satisfying the "failure surfaces
  visibly, no partial/duplicated items" edge case.
- `friction_list()` (lines ~965–~990) prints/streams records and supports `--json`
  (emits `count` + raw `entries[]`). A **per-agent view** is obtainable by
  filtering this output on the `agent` field.
- `friction_count()` (lines ~294–300) counts non-empty JSONL lines with `awk`.

**Contract & governance.**
- `.harness/contract.yml` declares `friction add` / `friction list` verbs and the
  `friction: { path, key_question }` block. It does **not** encode the record
  field list (that lives in CORE-COMPONENT-0003), so the schema change is mostly a
  doc + code change, though the contract's friction section is the natural place
  to note the new field.
- **CORE-COMPONENT-0003** "Engineering harness contract" §"Friction record schema"
  (lines ~245–259) lists the required fields; **R4** (honest gaps produce
  friction), **R9** (verbatim KEY_QUESTION), **R7/R8** (stable, non-breaking JSON
  schema — "MUST NOT break existing keys"), and **R14** (reliable collision-safe
  persistence) all bound the change. The `agent` field must be **additive and
  backward-compatible** to satisfy R7/R8 and the "existing consumers keep working"
  criteria.
- **DECISION-LOG.md** registers decision #20 (KEY_QUESTION friction rule). A new
  ADR + the CORE-COMPONENT-0003 amendment each require a new DECISION-LOG entry.

**Current friction log (33 records, verb-attributed only).** All 33 lack an
`agent` field, so after the change they read as `unknown` (the required
legacy behaviour). ~6 records already describe **resolved** gaps (their
`inference` begins "Resolved by #7/ADR-0006" or "Resolved by #9") — these are the
prime **delete-on-fix candidates** for the retrospect. The remainder are
research/plan inferences from issues #5–#10.

**Consumers to keep working (regression surface).**
- `tests/harness/run.sh` — **TEST-08** asserts the `friction add`/`list`
  round-trip and the **exact required key set** `ts verb key_question inference
  proof_gap suggested_closure` plus verbatim KEY_QUESTION; **TEST-09** asserts seed
  friction coverage; **TEST-01** asserts contract schema. Any schema change must
  keep these green (the `agent` field is additive, so existing key assertions
  still hold) and should add coverage for the new field + `unknown` default.
- Every `rpiv-*` agent file references `./harness friction add` in its `<!--
  HARNESS:BEGIN -->` block: `rpiv-research.agent.md:47`, `rpiv-planner:57`,
  `rpiv-implementer:40`, `rpiv-verifier:57` (and `harness-cli-it:88,114`). These
  are the instruction surfaces to update so each passes its own agent name. Note
  **R10 idempotent-agent-surface** rule governs edits to these HARNESS blocks.
- `README.md` / harness `README` document the friction usage examples.

## Proposed ADRs

**ADRs are REQUIRED.** One new ADR is proposed (explicitly requested by the
issue's Alignment → ADR Requests):

- **Proposed ADR-0007 — "Agent-attributed friction and issue-scoped retrospect
  (no persistent improvement store)."** Records the decision to (1) add an
  additive, backward-compatible `agent` field to the friction record schema with a
  distinct `unknown` sentinel for no-agent/legacy/internal records; (2) extend
  `./harness friction add` with an agent-name input and update each RPIV stage
  agent to self-attribute; (3) treat "friction retrospect → improvements" as an
  **agent-driven, issue-scoped activity** (reuse `friction list`, delete fixed
  records manually) rather than a new harness verb or persistent status-tracked
  store; (2b) pass the agent name via an **`--agent` flag** and keep friction
  dedupe **verb-only** (maintainer decisions 2026-07-22); and (4) **[approved
  improvement C]** add a **code-server readiness check to the existing `doctor`
  verb** that reports a missing code-server as **`fail`** (code-server is a
  required dependency for a stable environment, per maintainer decision), closing
  the gap that recurred across friction #23/27/28/30/33. ADR-0007 must **explicitly
  supersede DECISION-LOG #28 and ADR-0006** (which treated code-server as a
  documented-but-absent prerequisite and kept `doctor` degrade-never-fail) and
  address provisioning code-server in dev/CI. It must also cite the
  CORE-COMPONENT-0003 amendment and add DECISION-LOG entries.
  *(Author in the Plan stage — Research proposes only.)*

  > **Plan-stage split option:** the doctor readiness check (C) is a distinct
  > concern from friction attribution; the planner may either fold it into ADR-0007
  > or author a small sibling ADR. Research proposes one ADR for cohesion but does
  > not decide.

## Proposed Core-Components

**No NEW core-component is required; an AMENDMENT to an existing one is.**

- **Amend CORE-COMPONENT-0003 (Engineering harness contract, verdicts, and
  evidence/friction conventions).** (1) Add `agent` to the friction record schema
  with its `unknown` default/sentinel semantics, state the additive/backward-
  compatible guarantee (R7/R8), and note that RPIV stage agents self-attribute via
  `friction add`. (2) **[approved improvement C]** document the `doctor`
  code-server readiness check as a **`fail`-when-absent** requirement, which
  **supersedes existing decision #28** ("doctor may degrade but never fail the
  verify aggregate") for the code-server case — code-server is a required
  dependency per maintainer decision 2026-07-22. Both amendments must be recorded
  in DECISION-LOG.md with their own decision records. No cross-cutting behaviour
  outside CORE-COMPONENT-0003 is introduced, so no new core-component file is
  warranted.

## Acceptance Criteria (from issue)

> Verbatim from the issue's `ACCEPTANCE_CRITERIA` markers. The issue's Alignment
> block **refines** several of these to the agreed model (see "Risks & Open
> Questions"); the refined intent governs delivery, the original text is retained.

**Core**
- [ ] Whenever the harness captures a friction record, that record identifies exactly one responsible agent, using a distinct recognizable value when no agent was involved.
- [ ] A maintainer can review captured friction and, when the reviewed friction contains actionable items, the review records tracked improvement items that can each be looked up later by status.
- [ ] Each recorded improvement item can be associated with a specific agent, so friction and its resulting improvements can be viewed together per agent.
- [ ] For a given agent, a maintainer can observe both the friction attributed to it and the improvement items that resulted from reviewing that friction.
- [ ] After repeated reviews, previously recorded improvement items remain retrievable and are not lost or silently duplicated by later reviews.

**Edge Cases**
- [ ] Friction recorded before agent attribution existed is readable and carries a distinct "unknown/legacy" agent value, and existing friction and evidence consumers keep working unchanged.
- [ ] Friction that arose with no agent involved carries the distinct non-agent value rather than being left empty or attributed to an arbitrary agent.
- [ ] A review of friction that contains nothing actionable completes with a recorded "no action needed" outcome and creates no improvement items.
- [ ] The same friction situation for the same agent occurring repeatedly is represented so it is not silently double-counted as separate improvement items.
- [ ] A failure while reading captured friction or recording review results is surfaced visibly and leaves no partial or duplicated improvement items.

**Verification**
- [ ] A harness run that encounters friction yields a friction record that includes agent attribution.
- [ ] A review of captured friction that contains actionable items yields at least one tracked improvement item associated with an agent; a review of non-actionable friction yields a recorded "no action needed" outcome and no items.
- [ ] For a chosen agent, its attributed friction and the resulting improvement items can be listed together.

### Refined intent (from issue Alignment — governs delivery)
- "Tracked improvement items" are **not** a persistent status-tracked store: reviewing friction produces **harness changes implemented in #26**; a per-agent view = filtering `friction list` on `agent`; idempotency is met by existing per-verb `ensure_friction` dedupe + delete-on-fix.
- The distinct no-agent/legacy value is **`unknown`** (supersedes an earlier `general`), applied by default (missing field reads as `unknown`); **no on-disk backfill**.
- A non-actionable triage records a **"no action" outcome in #26's research/plan notes** and makes no harness change / no deletions.
- `friction add` failures surface via the existing **`persist_fail` (R14)** with no partial write.

## Friction Retrospect (Issue #26 core deliverable)

This is the "read the log → rank by impact → propose fixes → user approves →
implement → delete fixed records" activity the issue's Alignment scopes to #26.
The log holds **34 records** (33 legacy + the #26 research record). Each was
triaged below.

### Hard constraint on deletion — TEST-09 seed coverage
`tests/harness/run.sh` **TEST-09** (lines 252–265) asserts the committed
`.harness/friction.jsonl` retains **≥1 record for each of `lint, test, build,
boot, clean, verify`**, every line carrying the verbatim KEY_QUESTION and a
non-empty `suggested_closure`. Delete-on-fix therefore **cannot remove the last
record for any of those six verbs**. `lint/build/clean/verify` stay covered by
by-design records that are still true, but **`boot` and `test` are now `pass`**
(wired by #6) yet their only records are all "resolved" — so either one boot and
one test record must be retained as coverage anchors, or TEST-09 must be relaxed
(see improvement **E**). This is itself a retrospect finding.

### Per-record disposition

Legend: **KEEP** = honest gap still true (do not delete); **DELETE** = gap closed,
delete-on-fix candidate; **ANCHOR** = resolved but must be retained for TEST-09
coverage unless TEST-09 is relaxed; **ACTIVE** = this issue's own work.

| # | verb | Disposition | Why |
|---|------|-------------|-----|
| 1 | lint | KEEP | lint intentionally unwired (ADR-0002); still true, covers TEST-09 `lint` |
| 2 | test | ANCHOR | test wired→pass by #6, but sole `test` coverage for TEST-09 |
| 3 | build | KEEP | build intentionally unwired; still true, covers TEST-09 `build` |
| 4 | boot | ANCHOR | boot wired→pass by #6, but sole `boot` coverage for TEST-09 |
| 5 | clean | KEEP | no project clean command; still true, covers TEST-09 `clean` |
| 6 | verify | KEEP | verify still degraded (lint/build unwired); true, covers TEST-09 `verify` |
| 7 | doctor | KEEP | `node_modules` missing — environmental, currently true (doctor=degraded) |
| 8 | boot | DELETE | #5 boot inference, superseded by #14/#19 |
| 9 | verify | KEEP | accepted-degraded interpretation — still the standing decision |
| 10 | lint | KEEP | lint deferral (by design); still true |
| 11 | test | DELETE | #5 "test not wired" — superseded, test wired by #6 |
| 12 | build | KEEP | build deferral (by design); still true |
| 13 | verify | KEEP | accepted-degraded at #5 — still standing |
| 14 | boot | DELETE | #5 "boot unknown" — superseded by #6/#19 |
| 15 | dev | DELETE | Closed at #5 by mode: exec (ADR-0004) |
| 16 | boot | DELETE | #6 research inference — Resolved by #19 |
| 17 | test | DELETE | #6 research inference — Resolved by #20 |
| 18 | dev | DELETE | #6 research inference — Resolved by #21 |
| 19 | boot | DELETE | Resolved by #6/ADR-0005 |
| 20 | test | DELETE | Resolved by #6/ADR-0005 (test now pass) |
| 21 | dev | DELETE | Resolved by #6/ADR-0005 |
| 22 | boot | DELETE | #7 research inference — Resolved by #26 |
| 23 | doctor | DELETE (via **C**) | canonical open request: **doctor code-server readiness** (improvement **C**, now approved) — deleted once C ships |
| 24 | edit | DELETE | #7 plan inference — Resolved by #25 |
| 25 | edit | DELETE | Resolved by #7/ADR-0006 (flags improvement **D**: data-driven main() allowlist) |
| 26 | boot | DELETE | Resolved by #7/ADR-0006 |
| 27 | doctor | DELETE | Resolved by #7/ADR-0006 (echoes improvement **C**) |
| 28 | edit | DELETE | #8 delivered (manual demo) (echoes improvement **C**) |
| 29 | doctor | DELETE | #9 research inference — Resolved by #30/#31 |
| 30 | edit | DELETE | Resolved by #9 (echoes improvements **C**/**F**) |
| 31 | doctor | DELETE | Resolved by #9 |
| 32 | doctor | DELETE | #10 research inference — Resolved by #33 |
| 33 | doctor | DELETE | Resolved by #10 (flags improvement **F**: prototype-review verb) |
| 34 | friction | ACTIVE | this issue's retrospect record; delete after #26 ships (or keep as the attribution exemplar) |

**Totals (baseline B):** DELETE = **21** (#8, 11, 14, 15, 16, 17, 18, 19, 20, 21,
22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33); ANCHOR = **2** (#2, #4); KEEP = **10**
(#1, 3, 5, 6, 7, 9, 10, 12, 13, 23); ACTIVE = **1** (#34). With **improvement C
approved**, #23 also becomes DELETE-on-fix → **22 deleted**, KEEP = **9**. The log
shrinks 34 → ~12, directly closing the "friction accumulates unactioned"
complaint.

### Actionable harness improvements surfaced by the retrospect (ranked)

| Rank | ID | Improvement | Signal | Recommended for #26? |
|------|----|-------------|--------|----------------------|
| 1 | **A** | Agent-attributed friction: add `agent` field + `friction add --agent`, self-attribute in each `rpiv-*` block | #34 (the issue itself) | **YES — mandated** |
| 2 | **B** | Log hygiene: delete the 21 resolved records (close the loop) | whole log; the issue's core complaint | **YES — the retrospect itself** |
| 3 | **E** | TEST-09 seed-coverage is stale — it demands friction for now-passing `boot`/`test`; retain anchors #2/#4 **or** relax TEST-09 to unknown/degraded verbs only | TEST-09 vs. #6 wiring | **YES if B deletes boot/test records** (needed to keep tests green) |
| 4 | **C** | `doctor` code-server readiness diagnostic — **`fail` when absent** (code-server is a required dependency) | recurring **5×** (#23, 27, 28, 30, 33) | **YES — approved** (extends existing `doctor` verb; supersedes DECISION-LOG #28 / ADR-0006) |
| 5 | **D** | Derive main() dispatch allowlist from contract verbs (make new `mode: exec` verbs fully data-only) | recurring **2×** (#24, 25) | Defer — refactor, tangential |
| 6 | **F** | New `capture/measure` and `prototype-review/decision` verbs | #30, #33 | Defer — **new verbs, explicitly out of #26 scope** (Alignment: "no new harness verbs") |

**Approved scope (maintainer, 2026-07-22):** implement **A + B + E + C**; **defer
D and F** to later stories.

- **A + B + E** deliver the issue's agreed core (agent attribution, log hygiene,
  and the minimal TEST-09 adjustment to keep the suite green).
- **C** is now in scope: extend the existing `doctor` verb to report code-server
  readiness. Per the maintainer's 2026-07-22 decision, code-server is a **required
  dependency** for a stable environment, so a missing code-server reports **`fail`**
  (not degraded). ⚠️ This **supersedes DECISION-LOG #28 and ADR-0006** and makes
  `./harness verify` fail until code-server is provisioned in dev/CI — see the
  Improvement C risk below for the provisioning obligation and open scope question.
  Because C recurs across **five** records (#23, 27, 28, 30, 33), delivering it
  lets those doctor/edit records be deleted (B) *and* closes the recurring gap.
  Record **#23** moves from KEEP/ACTIONABLE to **DELETE-on-fix** once C ships.

Since C now uses the retained coverage differently, note the KEEP set drops #23:
after A+B+E+C, KEEP = **9** (#1, 3, 5, 6, 7, 9, 10, 12, 13), and #23 joins the
deletion set (22 records deleted total). The log shrinks 34 → ~12.

## Risks and Open Questions

- **R7/R8 schema-stability risk (highest).** The `agent` field **must be additive**
  — existing keys unchanged — or it breaks CORE-COMPONENT-0003's "MUST NOT break
  existing keys" guarantee and `tests/harness/run.sh` TEST-08's exact-key
  assertions. *Mitigation:* append `agent` after `severity`; keep it optional on
  read (absent ⇒ `unknown`).
- **`friction add` interface shape — DECIDED (maintainer, 2026-07-22): `--agent`
  flag.** Add an `--agent <name>` flag to `friction add` (e.g.
  `./harness friction add --agent rpiv-research --verb boot …`). Backward-
  compatible: existing flag-only callers keep working; when `--agent` is omitted
  the field defaults to `unknown`. No positional grammar change.
- **`ensure_friction` dedupe granularity — DECIDED (maintainer, 2026-07-22): keep
  verb-only dedupe.** Do **not** add agent-aware dedupe. Auto-recorded (internal)
  friction stays one-per-verb with `agent: unknown`; any duplicate/near-duplicate
  records are cleaned up in the **next retrospect exercise**, not prevented by the
  harness. This keeps the change minimal and matches the issue's "no persistent
  store, delete-on-fix" model.
- **Retrospect approval gate — RESOLVED.** The maintainer approved **A + B + E +
  C** on 2026-07-22 (deferring D and F). The concrete deletion set (22 records:
  the 21 resolved + #23 once C ships) is fixed above; Research does **not** delete
  anything itself — deletion is an implementer edit reviewed in the PR.
- **Improvement C — DECIDED (maintainer, 2026-07-22): code-server absence must
  `fail`, not degrade.** The maintainer requires a **stable environment where
  code-server is a hard dependency**, so the new `doctor` readiness check reports a
  missing code-server as **`fail`** (not `degraded`). ⚠️ **This materially changes
  scope and supersedes prior decisions — flagged for Plan/ADR:**
  - It **contradicts DECISION-LOG #28** ("doctor may degrade but never fail the
    verify aggregate") and **ADR-0006**, which documented code-server as a
    *documented prerequisite* that is legitimately absent in dev/CI. ADR-0007 must
    explicitly **supersede/amend** both.
  - Because `doctor` is in the `verify` aggregate, a failing doctor makes
    `./harness verify` **`fail` (exit non-zero)** — the CI gate. code-server is
    currently absent in this worktree and CI (`command -v code-server` empty), so
    **verify would go red everywhere until code-server is actually provisioned**.
  - Therefore C now includes a **provisioning obligation, approved in scope for
    #26** (maintainer, 2026-07-22): code-server must be installed so the required
    environment genuinely exists and `verify` can pass. **Provisioning surfaces:**
    - `.devcontainer/devcontainer.json` — add code-server via a devcontainer
      **feature** or an install step (the file already has a commented
      `postCreateCommand: bash ./.devcontainer/setupEnv.sh` hook and a `features`
      block to extend). ADR-0006/#9 previously used the standalone installer into
      `/tmp`; a durable install belongs in the devcontainer.
    - **There is no `.github/workflows/` (no GitHub Actions CI).** The only
      verification gate is `.github/soft-factory/verification.yml`, which runs
      `./harness verify` **in the devcontainer**. So "provision in CI" = ensure the
      devcontainer has code-server; there is no separate workflow file to edit.
      Note `verification.yml`'s header comment ("degraded/unknown non-blocking")
      becomes partly outdated once `verify` can `fail` on missing code-server — the
      implementer should update that comment.
  - Testable via a stubbed `PATH` (reuse the `tests/launcher/` code-server stub):
    present ⇒ pass, absent ⇒ fail.
- **"Improvement items … looked up later by status" (verbatim AC) vs. no
  persistent store.** The literal AC implies a status-tracked store; the accepted
  model delivers issue-scoped improvements with **no** such store. This is an
  intentional, user-accepted narrowing (Alignment "ready with explicitly accepted
  assumptions") — the verifier must validate against the **refined** intent, and
  the PR should note the divergence explicitly so the check isn't read as failing.
- **Seed-friction / TEST-09 coupling.** Deleting resolved records from the
  committed `.harness/friction.jsonl` may interact with TEST-09 (seed friction
  coverage) and TEST-08 fixtures; the implementer must keep the harness test suite
  green after both the schema change and any record deletions.
- **Feature linkage.** Issue is "Part of feature #2"; no cross-issue coordination
  is required for delivery, but the ADR should reference the feature for
  traceability.
- **Spun-out finding — `verification.yml` removal → issue #27 (out of #26 scope).**
  Research surfaced that `.github/soft-factory/verification.yml` is a redundant
  layer wrapping `./harness verify`; the maintainer chose to remove it via a
  **dedicated issue + ADR** rather than expand #26. Created as
  **[#27](https://github.com/jsburckhardt/ascend/issues/27)** ("Remove the
  redundant verification.yml layer so the harness is the single verification
  gate") — architecture_decision scope, must supersede DECISION-LOG #16 / ADR-0003.
  **#26 does NOT touch `verification.yml`.** Note for #26's improvement C: C updates
  `verification.yml`'s outdated "degraded non-blocking" comment only if #27 has not
  already removed the file; the two issues should be sequenced or reconciled at
  Plan time.
