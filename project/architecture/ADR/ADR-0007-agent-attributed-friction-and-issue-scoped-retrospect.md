# ADR-0007: Agent-attributed friction and issue-scoped retrospect (no persistent improvement store)

## Status

Accepted

## Context

The engineering harness (ADR-0003, CORE-COMPONENT-0003) records capability gaps
as friction (`.harness/friction.jsonl`) via `write_friction`/`ensure_friction`
and `./harness friction add`. Two problems motivate issue #26:

- **No agent attribution.** A friction record is attributed only to the *verb*
  that produced it (`ts, verb, key_question, inference, proof_gap,
  suggested_closure, severity`). It never records *which agent* experienced the
  gap, so improvements cannot target the "agent + harness" combination
  (distinguishing friction caused by *how* an agent drives the harness from
  friction *in* the harness). The maintainer needs each record to identify
  exactly one responsible agent, with a distinct recognizable value for records
  written before agent attribution existed and for records that arose with no
  agent involved (e.g. a direct human run).
- **Friction accumulates unactioned.** The committed log holds 34 records; ~22
  describe gaps that were already **resolved** by later issues (#6/#7/ADR-0005/
  ADR-0006) yet were never removed, so the same pain appears to recur and the log
  is not a trustworthy signal. There is no repeatable way to turn captured
  friction into concrete, tracked harness improvement.

The issue's Alignment block narrowed the delivered shape to an agreed model, and
the maintainer locked four decisions on 2026-07-22 (see Decision). The friction
record schema and the KEY_QUESTION rule are a **governed contract**
(CORE-COMPONENT-0003 §"Friction record schema", R4/R7/R8/R9; DECISION-LOG #20),
so a schema change requires an ADR plus a core-component amendment. This ADR
covers agent attribution (A), the issue-scoped retrospect / log hygiene (B), and
the accompanying TEST-09 seed-coverage adjustment (E). The `doctor` code-server
readiness decision (C) is a distinct concern recorded in the sibling **ADR-0008**.

## Decision

1. **Additive `agent` field (A).** The friction record schema gains an `agent`
   string field **appended after `severity`**. It is **additive and
   backward-compatible** (CORE-COMPONENT-0003 R7/R8): no existing key changes,
   order of existing keys is preserved, and existing `--json` and test consumers
   keep working. When a record has no `agent` field on read — every legacy record
   and any record written without attribution — it is interpreted as the sentinel
   `unknown`. There is **no on-disk backfill** of legacy records.

2. **`unknown` sentinel default.** `unknown` is the single distinct value for
   "no agent / legacy / internal" friction (superseding an earlier `general`
   suggestion). `ensure_friction` (the R4 auto-recorder invoked by verb handlers)
   writes `agent: "unknown"` because no agent identity is available at that layer.

3. **`--agent <name>` flag, not positional (locked decision 1).** `./harness
   friction add` gains an `--agent <name>` **flag**. Existing flag-only callers
   keep working unchanged; when `--agent` is omitted the field defaults to
   `unknown`. No positional grammar change.

4. **Verb-only dedupe stays (locked decision 2).** `ensure_friction` continues to
   dedupe by `verb` only; **no agent-aware dedupe is added**. Auto-recorded
   friction stays one-per-verb with `agent: unknown`; any duplicate or
   near-duplicate records are cleaned up in the *next* retrospect, not prevented
   by the harness.

5. **RPIV stage agents self-attribute (A).** Each RPIV stage agent's
   `./harness friction add` instruction is updated to pass that agent's own name —
   `./harness friction add --agent <that-agent-name> --verb …` — for
   `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, and `rpiv-verifier`. Because
   the `.agent.md` files are **APS v1.2.2 artifacts**, this change is authored
   **through the APS agent** (`.github/agents/aps-v1.2.2.agent.md`, which generates
   and lints the file), **not** by hand-editing the marker block or raw text. The
   regenerated result MUST preserve the R10 idempotent-agent-surface invariants
   (exactly one `<!-- HARNESS:BEGIN -->`/`END` block per stage; no duplication; no
   block on non-stage agents/`ship`/`AGENTS.md`; no unrelated change) and pass APS
   lint. R10 constrains the *result*; the APS agent is the *mechanism*.

6. **Issue-scoped retrospect, delete-on-fix (B).** "Friction retrospect →
   improvements" is an **agent-driven, issue-scoped activity**, not a new harness
   verb or a persistent status-tracked store. Triage reuses the existing `friction
   list`; a per-agent view is `friction list` filtered on `agent`; "resulting
   improvement items" are the harness changes shipped through #26's PR/commits.
   On fix, the resolved records are **deleted** from the committed
   `.harness/friction.jsonl` (a reviewed manual edit). Per the maintainer-confirmed
   disposition table, **22 records are deleted** (the 21 already-resolved records
   plus #23 once ADR-0008 ships) and the **9 still-true records are kept** (records
   whose gap is still true MUST NOT be deleted). A non-actionable triage records a
   "no action needed" outcome in #26's notes and makes no harness change / no
   deletions. `friction add` failures continue to surface via the existing
   `persist_fail` (R14) with no partial write.

7. **Retain seed-coverage anchors + explicit TEST-09 adjustment (E).** TEST-09
   asserts committed friction coverage for `lint, test, build, boot, clean,
   verify`. Because `boot` and `test` are now `pass` (wired by #6) their only
   records are "resolved", so **one `boot` and one `test` record are retained as
   coverage anchors** (records #2 and #4). Those two anchors are rewritten in place
   to honestly declare they are retained solely as TEST-09 seed-coverage anchors
   for now-passing verbs, keeping the verbatim KEY_QUESTION and a non-empty
   `suggested_closure` so the suite stays green with no assertion logic change.
   TEST-09's inline comment is updated to make the retained-anchor intent explicit,
   and the test plan asserts the suite stays green after the deletions.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Positional `agent` argument on `friction add` | Terser | Changes the command grammar; risks colliding with existing flags; harder to make optional | Locked decision 1 chose an `--agent` flag; flags are additive and default cleanly to `unknown` |
| Replace/rename an existing key (e.g. fold agent into `verb`) | No new key | Breaks CORE-COMPONENT-0003 R7/R8 "MUST NOT break existing keys" and TEST-08's exact-key assertions | Violates the schema-stability contract |
| On-disk backfill of legacy records with `unknown` | Uniform records | Rewrites committed history for no behavioural gain; risks churn/merge conflicts | Read-time default to `unknown` achieves the same with zero rewrite |
| Agent-aware dedupe in `ensure_friction` | Fewer near-duplicate records | More complex idempotency; not needed given delete-on-fix retrospect | Locked decision 2 keeps dedupe verb-only |
| Persistent status-tracked improvement store / new `retrospect` verb | Literal reading of the AC | New mechanism, new verbs, scope creep; contradicts the issue Alignment | Alignment scopes improvements to #26's shipped changes; reuse `friction list` + delete-on-fix |
| Relax TEST-09 to drop boot/test entirely and delete anchors #2/#4 | Smallest log | Removes seed coverage the maintainer chose to retain (22-delete / retain-anchors instruction) | Maintainer instruction retains the anchors; keep them and adjust TEST-09 intent only |

## Consequences

### Positive
- Every friction record identifies exactly one responsible agent, with a distinct
  `unknown` value for legacy/no-agent records; per-agent views are a `friction
  list` filter.
- The schema change is additive, so existing `--json`/test consumers and TEST-08
  keep working unchanged.
- The log shrinks 34 → ~12, so it becomes a trustworthy signal of *open* gaps and
  the "friction accumulates unactioned" complaint is closed.
- Each RPIV stage self-attributes, so future friction is attributable at capture
  time with no extra process.

### Negative
- Retained anchors #2/#4 keep two records for now-passing verbs (an intentional,
  documented compromise to satisfy TEST-09).
- The retrospect is a manual, reviewed edit rather than an automated mechanism;
  correctness depends on the disposition table and PR review.

### Neutral
- No new harness verb and no persistent store are introduced; "improvement items"
  are the shipped harness changes.
- The literal AC wording ("improvement items looked up later by status") is
  intentionally narrowed to the issue-scoped model; the PR notes the divergence so
  it is not misread as failing.

## Related Issues

- [#26](https://github.com/jsburckhardt/ascend/issues/26) — Retrospect captured harness friction into improvements and attribute friction to an agent (this ADR)
- [#2](https://github.com/jsburckhardt/ascend/issues/2) — parent Prototype 0 feature

## References

- ADR-0003 — Adopt a repo-local engineering harness (`./harness`) as the operating surface
- ADR-0004 — Interactive/handoff verbs (`mode: exec`)
- ADR-0005 — Application-serve runtime (`test`/`boot` wired to `pass`)
- ADR-0008 — code-server readiness is a required `doctor` check (sibling ADR; improvement C)
- CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction conventions (R4/R7/R8/R9/R10/R14; §"Friction record schema"; amended by #26)
- `project/issues/26/research/00-research.md` — research brief (disposition table; approved scope A+B+E+C)
