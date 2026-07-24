# Implementation Notes: Issue #26

Scope delivered: **A + B + E + C** via tasks **T1, T2, T3, T4, T5, T6, T7**.
D and F are deferred (untouched).

Governance implemented within: ADR-0007, ADR-0008, CORE-COMPONENT-0003 (R18, R19,
friction `agent` schema). No ADR/core-component deviation was required.

Final harness regression result:

```
Totals: PASS=52 FAIL=0 SKIP=0
Verdict: pass
```

TEST-43 now asserts and passes. Launcher/app suite (`npm test`) also green:
`pass 15 / fail 0`.

---

## Task-by-task summary

### T1 — `agent` field in the friction write path — DONE
- `harness` `write_friction()`: added a 6th parameter `_fagent` defaulting to
  `unknown`; the emitted record now appends `"agent": "<agent>"` **after
  `severity`** (additive; no existing key renamed/removed/reordered). POSIX
  `json_escape` used for the new value.
- `ensure_friction()` unchanged: it passes `write_friction "$@"` and the new
  default yields `agent: "unknown"` for the R4 auto-recorder. **Verb-only dedupe
  grep left intact.**
- Tests: TEST-40 (new) green; TEST-08 (exact required-key set + round-trip) green.

### T2 — `--agent <name>` flag on `friction add` — DONE
- `harness` `friction_add()`: added `--agent <name>` **flag** (default `unknown`),
  passed through to `write_friction`. `--verb` still required; unknown-option and
  missing-`--verb` still exit 2; `persist_fail`/R14 path preserved.
- `--json` success fragment now includes `"agent"`; the human line reads
  `... for verb "<v>" (agent "<a>").` with exactly one `Verdict: pass`.
- `verb_help` updated to document `--agent`.
- Tests: TEST-41, TEST-42 (new) green; TEST-08 green.

### T3 — RPIV self-attribution via the APS agent — **DONE (APS skill)**
- The `.github/agents/aps-v1.2.2.agent.md` VS Code chat agent is `target: vscode`,
  `disable-model-invocation: true`, and cannot be invoked from the Copilot CLI's
  bash-only execution environment. Per the maintainer's direction, the equivalent
  **`agnostic-prompt-standard` skill** (the faithful APS-conformant mechanism,
  loaded in-session) was used to author the edits instead of a manual marker-block
  hand-edit.
- Each of the four `.github/agents/rpiv-*.agent.md` files now instructs
  `./harness friction add --agent rpiv-<stage> …` inside its single
  `HARNESS:BEGIN/END` block, self-attributing to that stage's own name:
  `--agent rpiv-research` / `--agent rpiv-planner` / `--agent rpiv-implementer` /
  `--agent rpiv-verifier`.
- APS conformance preserved: one directive per line inside the harness block,
  ASCII quotes, no tabs/comments, unchanged MUST/MAY vocabulary, and the R10
  invariant (exactly one harness block per stage agent; none added elsewhere).
- Test: **TEST-43 asserts and passes** — it auto-switched from SKIP to assertion
  mode once the `--agent` attribution was applied.

### T4 — required code-server readiness check in `doctor` (fail-when-absent) — DONE
- `harness`: added `code_server_present()` probing
  `command -v "${HARNESS_CODE_SERVER:-code-server}"` (testability seam consistent
  with existing `HARNESS_*` overrides).
- `compute_doctor()` sets `DOCTOR_CS_OK`/`DOCTOR_CS_REASON`; **present ⇒ pass
  contribution, absent ⇒ `DOCTOR_VERDICT="fail"`** (fail precedence over
  degraded). Node/`node_modules` `degraded` behaviour (Decision #61) unchanged.
- `doctor --json` `checks[]` now carries a `code_server` entry (`ok`, `reason`);
  a `code-server` line added to the human output.
- `verb_doctor()` records R4 friction whenever the verdict is non-pass (degraded
  or fail), verb-only dedupe; a required-write failure routes through
  `persist_fail` → fail/exit 1 (R14).
- `resolve_member("doctor")` propagates the fail with **no change to
  `derive_overall`** — `verify` fails via the existing any-member-fail rule.
- Tests: TEST-44, TEST-45, TEST-46 (new) green; TEST-03, TEST-05, TEST-33 green.

**How present/absent were driven:** present-case uses an exported
`HARNESS_CODE_SERVER` pointing at an executable stub `code-server` under the test
scratch dir (so ambient-environment verbs keep prior verdicts); absent-case uses a
per-invocation `HARNESS_CODE_SERVER="$WORK/cs-none/code-server"` that is never
created, so `command -v` fails deterministically **even after** code-server is
provisioned in the devcontainer.

### T5 — provision code-server in the devcontainer — DONE (config only)
- `.devcontainer/devcontainer.json`: added the feature
  `ghcr.io/coder/devcontainer-features/code-server:1` (durable replacement for
  ADR-0006/#9's transient `/tmp` installer), with a comment tying it to ADR-0008 /
  R19 and noting no launch flags leak into `src/`/harness (ADR-0006 §5.7).
- **Present-case caveat:** the devcontainer was **not** rebuilt in this session, so
  `command -v code-server` is proven PRESENT here only against the PATH/seam stub
  (T4 seam). After a devcontainer rebuild the same present-case holds against the
  real binary; the absent-case stays deterministic via the seam regardless.

### T6 — friction retrospect (delete-on-fix + retain anchors) — DONE
- Edited committed `.harness/friction.jsonl`. The committed baseline held **33**
  records (records #1–#33); the working tree's uncommitted #34 retrospect / #35
  planner-orient records were never committed and are discretionary/not needed for
  coverage, so the retrospect operates on the 33-record committed baseline.
- **DELETED (22):** #8, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33 (the 21 already-resolved records plus **#23**, closed
  by T4/ADR-0008). This removed every `dev` and `edit` record.
- **KEPT (9 still-true):** #1 (lint), #3 (build), #5 (clean), #6 (verify),
  #7 (doctor), #9 (verify), #10 (lint), #12 (build), #13 (verify).
- **REWRITTEN ANCHORS (2):** #2 (test) and #4 (boot) rewritten in place — their
  `inference`/`suggested_closure` now honestly declare they are retained **solely**
  as TEST-09 seed-coverage anchors for the now-passing verbs, keeping the verbatim
  KEY_QUESTION and a non-empty `suggested_closure`.
- Result: **11 records** (9 kept + 2 anchors), valid JSONL, coverage set
  `{lint, test, build, boot, clean, verify}` intact. Original harness spacing
  (`"key": "value"`) preserved so grep-based assertions match.
- **Post-retrospect (harness rule):** one further record was appended live via
  `./harness friction add --agent rpiv-implementer --verb test …` to honor the
  HARNESS instruction — while implementing I ran the harness self-test suite
  directly (`bash tests/harness/run.sh`) because no harness verb runs it. This
  also exercises the new `--agent` flow end-to-end on the real committed log.
  Final committed log = **12 records** (still ≤ 12; TEST-47/TEST-09 green).
- Tests: TEST-47 (new) and TEST-09 (retained-anchor comment) green.

### T7 — tests, docs, verification.yml comment — DONE
- `tests/harness/run.sh`: added TEST-40..TEST-48 (TEST-43 now asserts, T3 done);
  added a global code-server present-case stub + `CS_ABSENT` seam target;
  updated TEST-09's inline comment for the retained-anchor intent.
- Adjusted **TEST-30** sub-check (7): removed the now-stale assertions that
  required the resolved `dev`/`boot` closure friction records deleted by the T6
  retrospect (analogous to the TEST-09 anchor adjustment); the live `dev` handoff
  is still proven elsewhere. TEST-27's count is dynamic (now 11) — no change
  needed.
- `README.md` + `.harness/README.md`: documented `friction add --agent` (additive,
  `unknown` default, verb-only dedupe, per-agent view) and the `doctor`
  code-server = **fail-when-absent** rule + devcontainer provisioning +
  `HARNESS_CODE_SERVER` seam.
- `.github/soft-factory/verification.yml`: updated **only** the outdated
  "degraded/unknown non-blocking" header comment + step description to note that
  `verify` can now `fail` on missing code-server (ADR-0008). File not
  restructured/removed (that is issue #27).
- Tests: TEST-11, TEST-48 green; full suite green.

---

## Verification evidence

- `bash tests/harness/run.sh` → `Totals: PASS=52 FAIL=0 SKIP=0`, `Verdict: pass`.
- `npm test` (launcher + app) → `pass 15 / fail 0`.
- Pass-path proven via the `HARNESS_CODE_SERVER` present stub; fail-path proven via
  the absent seam. **Bare `./harness verify` in this un-provisioned session exits 1
  (code-server absent) — EXPECTED per ADR-0008 until the devcontainer is rebuilt.**
- Working tree left clean by the suite (all mutation isolated via `HARNESS_*`).
- `package-lock.json` was regenerated by a local `npm install` (to make the
  ambient environment healthy for `verify`/typecheck) then **reverted** to avoid
  scope creep; `node_modules` remains installed.

## Blockers
- None. All tasks T1–T7 complete; full harness suite green (PASS=52 FAIL=0 SKIP=0).
  T3 was authored through the `agnostic-prompt-standard` skill (the APS-conformant
  mechanism) since the `@aps-v1.2.2` VS Code chat agent is not invokable from the
  Copilot CLI's bash-only environment.
