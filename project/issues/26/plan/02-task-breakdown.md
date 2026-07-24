# Task Breakdown: Issue #26

Scope: **A + B + E + C** (defer D, F). Tasks are dependency-ordered. Every task
lists acceptance criteria, explicit test coverage (see 03-test-plan.md), and the
governing ADR/core-component. All harness verbs named below are real verbs from
`.harness/contract.yml`.

---

## Task T1: Add the `agent` field to the friction write path

- **Status:** Not started
- **Complexity:** Small
- **Dependencies:** none
- **Related ADRs:** ADR-0007
- **Related Core-Components:** CORE-COMPONENT-0003 (R4, R7, R8, R14, R18; §"Friction record schema")

### Description
Extend `write_friction()` (harness ~lines 264–275) so the emitted JSONL record
appends an `agent` field **after `severity`**, using a new final parameter that
defaults to `unknown`. Update `ensure_friction()` (~lines 281–287) to pass
`agent: "unknown"` (the auto-recorder has no agent identity). The field is
**additive** — no existing key is renamed, removed, or reordered — so R7/R8 hold
and legacy records (no `agent`) are simply read as `unknown`. Keep POSIX-only
`json_escape` for the new value (R12). Dedupe stays **verb-only** (do not change
the `ensure_friction` grep).

### Acceptance Criteria
- `write_friction` emits a record ending `…, "severity": "<sev>", "agent": "<agent>"}` with `agent` defaulting to `unknown` when not supplied.
- Existing keys (`ts, verb, key_question, inference, proof_gap, suggested_closure, severity`) are unchanged in name and order.
- `ensure_friction` writes `agent: "unknown"` and still dedupes by `verb` only.
- The record remains valid JSON for multiline/control-character inputs (POSIX escaping).

### Test Coverage
- TEST-40 (agent field present + `unknown` default) — required.
- TEST-08 (existing round-trip + exact required-key set) — must stay green.
- Portability/escaping assertions in the existing suite — must stay green.

---

## Task T2: Add the `--agent <name>` flag to `friction add`

- **Status:** Not started
- **Complexity:** Small
- **Dependencies:** T1
- **Related ADRs:** ADR-0007
- **Related Core-Components:** CORE-COMPONENT-0003 (R2, R14, R18)

### Description
Add an `--agent <name>` **flag** (not positional) to `friction_add()` (harness
~lines 934–963): parse `--agent`, default to `unknown` when omitted, and pass it
through to `write_friction`. Preserve `--verb` as required and the existing
`persist_fail` (R14) path. Reflect the agent in both output forms: the human line
and the `--json` response (add `"agent"` to the JSON success fragment). Update
`verb_help`/usage text for `friction add` to document `--agent`.

### Acceptance Criteria
- `./harness friction add --agent <name> --verb <v> …` writes a record with `"agent": "<name>"`.
- Omitting `--agent` writes `"agent": "unknown"`; existing flag-only callers keep working unchanged.
- `--verb` remains required; unknown-option and missing-`--verb` errors still exit 2.
- `friction add --json` includes `"agent"` in its response; the human form still prints exactly one `Verdict: pass` line (R2).
- A write failure still routes through `persist_fail` → `fail`/exit 1 (R14), with no partial write.

### Test Coverage
- TEST-41 (`--agent` sets the field; omission defaults to `unknown`) — required.
- TEST-42 (`friction add --json` carries `agent`; single verdict line) — required.
- TEST-08 — must stay green (default path unchanged for existing callers).

---

## Task T3: Self-attribute friction in each RPIV stage agent (via the APS agent)

- **Status:** Not started
- **Complexity:** Small
- **Dependencies:** T2
- **Related ADRs:** ADR-0007
- **Related Core-Components:** CORE-COMPONENT-0003 (R10, R11, R18)

### Description
The four RPIV stage agent files are **APS v1.2.2 prompt artifacts**. Their content
MUST be modified **through the APS agent** (`.github/agents/aps-v1.2.2.agent.md`),
which regenerates and lints the file — **NOT by hand-editing the marker block or
any raw text.** For each stage agent, use the APS agent to update the
`./harness friction add` instruction so it passes that agent's own name via
`--agent`, then let the APS agent lint the written file:
- `.github/agents/rpiv-research.agent.md` → `--agent rpiv-research`
- `.github/agents/rpiv-planner.agent.md` → `--agent rpiv-planner`
- `.github/agents/rpiv-implementer.agent.md` → `--agent rpiv-implementer`
- `.github/agents/rpiv-verifier.agent.md` → `--agent rpiv-verifier`

The APS regeneration MUST preserve the R10 invariants in the *result*: exactly one
`<!-- HARNESS:BEGIN -->`/`END` block per stage, no duplication, no block added to
any non-stage agent or `ship`/`AGENTS.md`, and no unrelated behavioural change. The
`aps-v1.2.2.agent.md` agent is `user-invocable`/`disable-model-invocation`, so the
implementer invokes it explicitly (e.g. `@aps-v1.2.2` / handoff) per stage file and
attaches the APS lint report as evidence.

> **Note (R10 vs. APS mechanism):** the *requirement* that each stage self-attributes
> and the marker invariants (R10) are unchanged; only the **authoring mechanism**
> changes — edits go through the APS generator+linter, not a manual block edit.

### Acceptance Criteria
- Each of the four RPIV files instructs `./harness friction add --agent <that-agent-name> --verb …`, produced via the APS agent.
- Each written file passes APS lint (report captured).
- Each stage still has exactly one marker-delimited block; no content outside the intended change altered; no block on any non-stage agent.

### Test Coverage
- TEST-43 (each RPIV file names its own agent via `--agent`; file remains APS-valid) — required.
- TEST-12 (block scoped to consumers only; exactly one per stage) — must stay green.

---

## Task T4: Extend `doctor` with a required code-server readiness check (fail when absent)

- **Status:** Not started
- **Complexity:** Medium
- **Dependencies:** none (pairs with T5)
- **Related ADRs:** ADR-0008
- **Related Core-Components:** CORE-COMPONENT-0003 (R3, R4, R6, R15, R19)

### Description
Extend `compute_doctor()` (harness ~lines 370–412) and `verb_doctor()` (~lines
545–571) with a code-server readiness probe: `command -v code-server`. Add a
**testability seam** so the regression suite can control the probe target
deterministically even after code-server is provisioned — e.g. probe
`command -v "${HARNESS_CODE_SERVER:-code-server}"`, consistent with the existing
`HARNESS_*` override convention. Semantics:
- code-server **present** → check contributes `pass`.
- code-server **absent** → `doctor` verdict `fail` (exit 1). This is an exception
  to the Node/`node_modules` `degraded` behaviour (unchanged). Record the R4
  friction for the gap.
Extend the `doctor --json` `checks[]` with a `code_server` entry (`ok`, `reason`).
Because `doctor` is a `verify.aggregate` member, `resolve_member("doctor")` will
propagate the `fail` and the existing `derive_overall` makes `verify` `fail`
(any-member-fail ⇒ fail) with **no aggregate-logic change**. Node/`node_modules`
`degraded` behaviour (Decision #61) is untouched.

### Acceptance Criteria
- `doctor` returns `pass` (exit 0) when the probed code-server is present and Node is healthy.
- `doctor` returns `fail` (exit 1) when code-server is absent, and records friction (R4).
- The absent case is exercised deterministically via the testability seam / PATH stub, independent of the ambient environment.
- `doctor --json` includes a `code_server` check entry and a `verdict` reflecting the rule.
- `verify` returns `fail` (exit 1) when `doctor` fails on missing code-server; no change to `derive_overall`/aggregate code.
- Node minor-floor and out-of-range Node still report `degraded` (R15/Decision #61), not `fail`.

### Test Coverage
- TEST-44 (doctor present⇒pass / absent⇒fail via stub) — required.
- TEST-45 (doctor absent records friction) — required.
- TEST-46 (verify aggregate ⇒ fail when doctor fails) — required.
- TEST-03 (healthy⇒pass; missing node_modules⇒degraded) — must stay green with code-server present.
- TEST-05 (verify --json schema incl doctor member) — must stay green.

---

## Task T5: Provision code-server in the devcontainer

- **Status:** Not started
- **Complexity:** Medium
- **Dependencies:** pairs with T4 (verify goes red until this lands)
- **Related ADRs:** ADR-0008, ADR-0006
- **Related Core-Components:** CORE-COMPONENT-0003 (R19)

### Description
Add code-server to `.devcontainer/devcontainer.json` so the required environment
genuinely exists and `./harness verify` can pass. Use a devcontainer **feature**
(preferred) or an install step via the existing (commented) `postCreateCommand:
bash ./.devcontainer/setupEnv.sh` hook / `features` block. This replaces
ADR-0006/#9's transient `/tmp` installer for the durable environment. Do not leak
code-server launch flags into `src/` or the harness (ADR-0006 §5.7 isolation stays
intact — provisioning ≠ launch flags).

### Acceptance Criteria
- `.devcontainer/devcontainer.json` declares code-server (feature or documented install step).
- After a devcontainer build, `command -v code-server` resolves, so `doctor` and `verify` can pass.
- No code-server CLI flags are added to `src/`, `harness`, or `.harness/contract.yml` (ADR-0006 §5.7 preserved).

### Test Coverage
- Manual/CI verification: devcontainer build yields a resolvable code-server (documented in the implementation notes).
- TEST-44 present-case remains valid against the real binary once provisioned (the stub keeps the absent-case deterministic).

---

## Task T6: Friction retrospect — delete-on-fix and retain anchors

- **Status:** Not started
- **Complexity:** Medium
- **Dependencies:** T4 (so #23's gap is genuinely closed before deleting it)
- **Related ADRs:** ADR-0007
- **Related Core-Components:** CORE-COMPONENT-0003 (R13; §"Friction record schema")

### Description
Perform the reviewed manual edit of the committed `.harness/friction.jsonl` per
the research brief disposition table:
- **DELETE 22 records:** the 21 already-resolved records (#8, 11, 14, 15, 16, 17,
  18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33) **plus #23** (closed
  by T4/ADR-0008).
- **KEEP the 9 still-true records:** #1, 3, 5, 6, 7, 9, 10, 12, 13 (gaps still
  true — MUST NOT delete).
- **RETAIN anchors #2 (test) and #4 (boot)** for TEST-09 coverage, and **rewrite
  them in place** so their `inference`/`suggested_closure` honestly declare they
  are retained solely as TEST-09 seed-coverage anchors for now-passing verbs,
  keeping the verbatim KEY_QUESTION and a non-empty `suggested_closure`.
- The planner's `#34` retrospect record and the `rpiv-planner` orient-gap record
  may be kept as attribution exemplars or deleted once #26 ships (implementer's
  discretion; not required for coverage).
A non-actionable triage records only a "no action needed" note (there is none
required here). No `friction add` failure semantics change.

### Acceptance Criteria
- Exactly the 22 listed records are removed; the 9 still-true records remain.
- Anchors #2 and #4 remain, rewritten to state their retained-anchor purpose, each keeping the verbatim KEY_QUESTION and a non-empty `suggested_closure`.
- The file remains valid JSONL (one object per non-empty line).
- No record whose gap is still true is deleted.

### Test Coverage
- TEST-09 (seed coverage for lint/test/build/boot/clean/verify) — must stay green with anchors retained.
- TEST-47 (post-deletion log integrity: valid JSONL; kept set present; deleted set absent) — required.

---

## Task T7: Update the regression suite, docs, and the verification.yml comment

- **Status:** Not started
- **Complexity:** Medium
- **Dependencies:** T1–T6
- **Related ADRs:** ADR-0007, ADR-0008
- **Related Core-Components:** CORE-COMPONENT-0003 (R11, R16)

### Description
- Add the new tests (TEST-40..TEST-47) to `tests/harness/run.sh` and, where
  useful, reuse the `tests/launcher/` PATH-stub pattern for the code-server probe.
- Update TEST-09's inline comment to make the retained-anchor intent explicit
  (no assertion-set change is required because anchors #2/#4 are retained).
- Update `README.md` and `.harness/README.md` friction usage to show
  `friction add --agent` and document the `doctor` code-server = fail-when-absent
  rule + devcontainer provisioning.
- Update the outdated "degraded/unknown non-blocking" **comment** in
  `.github/soft-factory/verification.yml` for accuracy only (do NOT restructure or
  remove the file — that is #27). If #27 already removed the file, skip this edit.

### Acceptance Criteria
- `tests/harness/run.sh` includes TEST-40..TEST-47 and runs non-interactively, leaving the tree clean (R16).
- README and `.harness/README.md` document `--agent` and the `doctor` code-server rule.
- `verification.yml`'s comment accurately reflects that `verify` can now `fail` on missing code-server (or the edit is skipped if #27 removed the file).

### Test Coverage
- TEST-11 (README documents verbs/verdicts/KEY_QUESTION) — must stay green (extended for `--agent`).
- The full `tests/harness/run.sh` suite — green end-to-end after T1–T7 (with code-server present via T5 or stub).
