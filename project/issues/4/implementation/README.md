# Implementation Notes — Issue #4: Engineering harness CLI

Implements the repo-local engineering harness (`./harness`) per **ADR-0003** and
**CORE-COMPONENT-0003**, generated to the `harness-cli-it` agent's
`REQUIRED_OUTPUTS` / `REQUIRED_VERBS` / `VERDICTS` / `JSON_VERBS` / `KEY_QUESTION`
contract. Tasks T1–T9 (initial delivery) and **T10–T16 (Review Cycle 1
remediation)** are complete; every test in
[`../plan/03-test-plan.md`](../plan/03-test-plan.md) (TEST-01…TEST-25) passes via
the durable suite `tests/harness/run.sh`.

> **Review Cycle 1 (2026-07-20).** Independent review returned REQUEST_CHANGES
> (F-01 blocking + F-02…F-05 major). All five findings are resolved; see the
> [Review Cycle 1 remediation](#review-cycle-1-remediation-f-01f-05--r16) section
> below for the data-driven dispatch/aggregate design, the aggregate truth table,
> evidence-reliability, POSIX escaping, Node-range handling, and how to run the
> regression suite.

## What was built

| Path | Purpose | VCS |
|------|---------|-----|
| `harness` | Executable portable POSIX-shell CLI; single operating surface; all 12 verbs; verdict + exit-code contract; `--json`. | tracked |
| `.harness/contract.yml` | Data-driven verb→command map, evidence/friction config, verbatim KEY_QUESTION. | tracked |
| `.harness/evidence/.gitkeep` | Retains the evidence directory in VCS. | tracked |
| `.harness/evidence/verify-*.json` | Timestamped evidence records written by `verify`. | **git-ignored** |
| `.harness/friction.jsonl` | Committed, append-only seed friction log (one entry per capability gap). | tracked |
| `.harness/README.md` | Documents the single entry point, all verbs + verdicts, exit-code contract, `--json`, evidence/friction, KEY_QUESTION. | tracked |
| `.github/soft-factory/verification.yml` | Canonical Verify-stage gate: runs `./harness verify`. | tracked |
| `.gitignore` | Adds `.harness/evidence/*` + `!…/.gitkeep` (CC-0003 R13). | modified |
| `AGENTS.md` + 16 `.github/agents/*.agent.md` | Idempotent marker-delimited harness-usage block. | modified |

## Verb → command / verdict map (Issue #4 baseline)

From a real `./harness verify --json` run (verdict **`degraded`**, exit 0):

| Verb | `maps_to` (contract) | Verdict | `--json` | Friction |
|------|----------------------|---------|----------|----------|
| `help` | native | `pass` | no | no |
| `orient` | native | `pass` | yes | no |
| `doctor` | native | `pass` (`degraded` if env unhealthy) | yes | only if degraded |
| `lint` | `null` | `unknown` | yes | yes |
| `test` | `null` | `unknown` | yes | yes |
| `build` | `null` | `unknown` | yes | yes |
| `boot` | `null` | `unknown` | yes | yes |
| `verify` | `npm run typecheck` | `degraded` | yes | yes |
| `status` | native | `pass` | yes | no |
| `clean` | native | `degraded` | yes | yes |
| `friction add` | native | `pass` | no | no |
| `friction list` | native | `pass` | yes | no |

`npm run typecheck` is wrapped **only** by `verify`; it is deliberately **not**
aliased under `lint`/`test`/`build` (ADR-0003 §5), so a typecheck is never
misrepresented as a linter/test/build and the honest gaps stay visible.

### `verify --json` (real output)

```json
{
  "harness_version": "1",
  "verb": "verify",
  "verdict": "degraded",
  "timestamp": "2026-07-20T07:53:32Z",
  "checks": [
    { "name": "typecheck", "maps_to": "npm run typecheck", "verdict": "pass", "exit_code": 0 },
    { "name": "lint",  "verdict": "unknown", "reason": "no lint command detected" },
    { "name": "test",  "verdict": "unknown", "reason": "no test command detected" },
    { "name": "build", "verdict": "unknown", "reason": "no build command detected" }
  ],
  "evidence": ".harness/evidence/verify-20260720T075332Z.json",
  "notes": "test, lint, and build are unknown until Issue #5 wires their commands in contract.yml"
}
```

## Which verbs are `unknown`/`degraded` and why

Honest façade over what exists today (ADR-0002: only `npm run typecheck` is a
wrappable check; `npm install` is setup). No command is faked; each gap is a
committed friction entry answering the KEY_QUESTION.

- **`lint` → unknown** — no ESLint/Prettier; `tsc --noEmit` is a typecheck, not a linter, and is deliberately not aliased.
- **`test` → unknown** — no test runner/script/files.
- **`build` → unknown** — `tsc` is `noEmit`; nothing emits artifacts.
- **`boot` → unknown** — no dev/serve/start command yet (arrives with #6).
- **`verify` → degraded** — aggregate is `pass` for typecheck but `test`/`lint`/`build` are `unknown`, so full verification is only partially proven (CC-0003 R6).
- **`clean` → degraded** — no project clean command; the harness only prunes its own evidence output and must never delete `node_modules`/project sources.

Each moves toward `pass` later by editing the verb's `maps_to` in
`.harness/contract.yml` (data-driven, CC-0003 R8) and closing the friction entry.

## Evidence & friction locations

- **Evidence:** `.harness/evidence/verify-<UTC-timestamp>.json`, written on every
  `verify` run (CC-0003 R5). Run output is git-ignored; the directory is retained
  via `.harness/evidence/.gitkeep` (R13). Latest final run:
  `.harness/evidence/verify-20260720T075332Z.json`.
- **Friction:** `.harness/friction.jsonl` (committed, append-only JSONL). Seeded
  with one entry per gap — `lint`, `test`, `build`, `boot`, `clean`, `verify` —
  each with the KEY_QUESTION verbatim and a `suggested_closure`. New gaps append
  via `./harness friction add`; the harness de-duplicates auto-recorded gaps by
  verb to avoid log bloat while guaranteeing an entry exists (R4).

## KEY_QUESTION

> **What did the agent have to infer that the harness should have proved?**

Recorded verbatim in `contract.yml` (`friction.key_question`), every friction
record, `.harness/README.md`, and the agent-surface blocks.

## Agent-surface updates (idempotent)

`AGENTS.md` and all 16 `.github/agents/*.agent.md` (17 surfaces) carry exactly one
`<!-- HARNESS:BEGIN -->…<!-- HARNESS:END -->` block with the four
`AGENT_HARNESS_RULES` (prefer `./harness`; the specific preferred verbs; bypass
only when a verb is missing/`unknown`/`degraded`; log bypasses via
`./harness friction add` using the KEY_QUESTION). The updater replaces only
content between the markers, so re-running is byte-identical (CC-0003 R10) and no
content outside the markers — including pipeline agents `ship`/`rpiv-*` — is
altered.

## How the 5 issue acceptance criteria are satisfied

1. **A repo-local harness CLI exists (via the `harness-cli-it` agent).**
   `./harness` is an executable POSIX-shell CLI implementing all 12
   `REQUIRED_VERBS` with the `VERDICTS` and `JSON_VERBS` contract. — *TEST-02, TEST-14, TEST-15.*
2. **Wraps existing commands rather than reimplementing them.** `verify` runs the
   contract's `maps_to` (`npm run typecheck`) via `sh -c`; the harness contains no
   `tsc` reimplementation and invents no build system (ADR-0002/ADR-0003 §2). — *TEST-04, TEST-14.*
3. **Records evidence.** Every `verify` writes a timestamped JSON record under
   `.harness/evidence/` and references it in output. — *TEST-04, TEST-05, TEST-14.*
4. **Supported human and agent workflows are documented.** `.harness/README.md`
   documents the entry point, all verbs + verdicts, exit-code contract, `--json`,
   evidence/friction, and KEY_QUESTION; agent rules are embedded in every agent
   surface. — *TEST-11, TEST-12, TEST-14.*
5. **Invocable from a single documented entry point.** `./harness` is the single
   documented surface in `.harness/README.md` and `AGENTS.md`; the exact
   `pr-review-complement` invocations (`./harness orient`, `./harness verify --json`)
   succeed and exit 0. — *TEST-14, TEST-17.*

## Test results (TEST-01…TEST-17)

| Test | Subject | Result |
|------|---------|--------|
| TEST-01 | Contract schema (parsed with js-yaml) | PASS |
| TEST-02 | `help` + `orient` human/JSON, exit 0 | PASS |
| TEST-03 | `doctor` verdict (healthy `pass`; missing `node_modules` `degraded`+friction) | PASS |
| TEST-04 | `verify` wraps typecheck, writes evidence, `degraded`, exit 0 | PASS |
| TEST-05 | `verify --json` aggregate schema | PASS |
| TEST-06 | `lint`/`test`/`build`/`boot` `unknown`+friction, no `tsc` alias | PASS |
| TEST-07 | `clean` `degraded`, non-destructive (`node_modules` preserved) | PASS |
| TEST-08 | `friction add`/`list` round-trip + schema | PASS |
| TEST-09 | Seed covers every gap, verbatim KQ + closure | PASS |
| TEST-10 | Exit-code contract (only `fail` non-zero; forced type error) | PASS |
| TEST-11 | `.harness/README.md` completeness | PASS |
| TEST-12 | 17 surfaces each carry exactly one block, 4 rules | PASS |
| TEST-13 | Agent update idempotent + behaviour-preserving | PASS |
| TEST-14 | Issue acceptance criteria end-to-end | PASS |
| TEST-15 | Runs dependency-light under `sh` (dash) | PASS |
| TEST-16 | `verification.yml` runs `./harness verify`; VCS policy | PASS |
| TEST-17 | `pr-review-complement` contract (`orient` + `verify --json` exit 0) | PASS |

## Notes / environment

- The npm registry is unreachable from this sandbox (allowlist proxy blocks
  `registry.npmjs.org`), so `node_modules/typescript@5.7.3` was reconstructed from
  the jsdelivr CDN purely to run `npm run typecheck` during validation.
  `node_modules` is git-ignored and is **not** part of the deliverable; a normal
  `npm install` (ADR-0002) provides it in CI / the Verify stage.
- Implemented in portable POSIX shell (dash-clean, mawk-safe, `dash -n` passes);
  no new runtime dependency (CC-0003 R12).
- No ADR/core-component deviation was required; implementation stayed within
  ADR-0003 / CORE-COMPONENT-0003 boundaries.
- Not committed here — committing/PR is the Verify stage's responsibility.

---

## Review Cycle 1 remediation (F-01…F-05 + R16)

Files changed this cycle: `harness` (rewritten within ADR/CC boundaries),
`.harness/contract.yml` (added `verify.aggregate`), and a new durable suite
`tests/harness/run.sh`. No agent surfaces, VCS policy, or the wrapped-typecheck
mapping changed. `git diff` touches no `AGENTS.md` / `.github/agents/*` file.

### F-01 — Data-driven dispatch & aggregate (blocking, R6/R8)

- **No hard-coded verb→command wiring.** Every executed command is resolved from
  `.harness/contract.yml` `maps_to` at runtime via `get_maps_to <verb>` and run
  through `sh -c "$maps"`. The previous `_maps="npm run typecheck"` fallback and
  the always-`degraded` aggregate are gone. `grep -E 'npm|tsc' harness` now only
  matches comments, help text, and the `typecheck` *check name* — never a
  dispatched command string. The `case "$_verb"` block is retained solely as
  **structural** name→handler routing (permitted by R8).
- **`clean` honors `clean.maps_to`.** `native` → prune only harness-owned
  evidence (`degraded`); a command → wrap it (`pass`/`fail`); `null` → `unknown`
  + friction. Proven by TEST-18 (a temp contract with `clean.maps_to: "true"`
  makes `clean` return `pass` with **no** `./harness` edit).
- **Data-driven aggregate.** `verify` builds its member set from data: the
  `typecheck` check = verify's own `maps_to`, plus every verb in
  `verify.aggregate` (`[lint, test, build, doctor]`). Each member verdict is
  resolved from the contract at runtime (`resolve_member`); `doctor` is the one
  native member (via `compute_doctor`, `pass`/`degraded` only). Members appear in
  `checks[]` including `doctor`. Baseline stays `degraded`; once #5 wires
  `lint`/`test`/`build` `maps_to` and doctor is healthy, the **same** code yields
  `pass` (TEST-18 proves this via a temp contract, `./harness` byte-identical).

#### Aggregate truth table (`derive_overall`, evaluated in order — R6)

| # | Member verdicts (typecheck + aggregate) | Overall | Exit |
|---|------------------------------------------|---------|------|
| 1 | any member `fail` | `fail` | 1 |
| 2 | else all `pass` | `pass` | 0 |
| 3 | else all `unknown` | `unknown` | 0 |
| 4 | else (mix, no `fail`) | `degraded` | 0 |

`doctor` `degraded` with all others `pass` ⇒ `degraded` (never `fail`) — rule 4.
All five rows are asserted by TEST-19.

### F-02 — One `Verdict:` line per human verb (R2)

Every human/default verb now prints exactly one terminal line matching
`^Verdict: <value>` (verified by TEST-20 counting `grep -c '^Verdict:'` = 1).
`help` and `friction list` print `Verdict: pass`; the old aligned
`Verdict        : x` and inline `... Verdict: x (exit 0)` forms were normalised;
the help "Verdicts:" vocabulary line was renamed to "Vocabulary:" to avoid a
false match. `--json` keeps the `verdict` key.

### F-03 — Full Node range in `doctor` (R15)

`doctor` now requires the Node major to **equal** the supported major derived
from `.nvmrc` (`22`), which matches `engines.node` `>=22 <23`. Both `<22` and
`>=23` are `degraded` (with friction), never `pass`. `node_major` parses
`node --version`, making the boundary testable with a `node` shim. TEST-21
asserts 21→`degraded`, 22→`pass`, 23→`degraded` (all exit 0).

### F-04 — Reliable, collision-safe, atomic persistence (R14)

- **Collision-safe names:** `verify-<UTCstamp>-<pid>-<randhex>.json`
  (e.g. `verify-20260720T085041Z-82802-65859913.json`). 20 same-second runs
  produce 20 distinct files (TEST-22).
- **Atomic writes:** `persist_atomic` writes a temp file in the target dir then
  `mv`-renames into place — no partial/truncated record is ever observable; no
  `.tmp-*` leftovers.
- **Checked ops:** `mkdir`, evidence write, and friction append are all checked.
  A **required** record that cannot be stored (verify evidence, a `friction add`
  append, or an R4 auto-friction entry) returns `fail` and exits non-zero via
  `persist_fail` — never a masked `pass`/`degraded`/`unknown` (TEST-23).
  `ensure_friction` dedupe means the healthy happy path attempts no write and so
  never spuriously fails.

### F-05 — POSIX-only JSON escaping (R12)

`json_escape` is a POSIX `awk` routine (no GNU-only `:a;N;$!ba` / `\n`-regex sed).
It builds a byte→code table with `sprintf("%c",i)` under `LC_ALL=C` and encodes
`"`, `\`, backspace, tab, newline, form-feed, carriage-return, and any other
control char as `\uXXXX`; non-ASCII bytes pass through as valid UTF-8.
**Injection-safe:** untrusted friction input is passed to `awk` as *data* through
the environment (`JE_INPUT`), never via `-v` or code interpolation. Validated on
a non-GNU userland (dash + **mawk 1.3.4**) with multiline/tab/quote/backslash/
control-char input; all `friction list --json` and `verify --json` output parses
(TEST-24). `busybox` is unavailable offline in this sandbox, so mawk (a non-GNU
awk) + dash serve as the non-GNU userland proof.

### R16 — Durable regression suite

`tests/harness/run.sh` (POSIX shell, executable) exercises TEST-01…TEST-24,
prints a summary and a final `Verdict:` line, and exits non-zero on any failure.
It is **isolated** — every verb run overrides `HARNESS_EVIDENCE_DIR` /
`HARNESS_FRICTION` / `HARNESS_CONTRACT` / `HARNESS_ROOT` (new optional env knobs,
unset in normal use) into a `mktemp -d` scratch dir, so it never mutates tracked
files; permission changes are reverted and the scratch dir is trapped for
cleanup. It uses only POSIX shell + the repo's own `node` for strict JSON
validation (no new dependency; node-dependent checks `SKIP` if node is absent),
and guards permission tests when run as root. It is **not** aliased as the
project `test` verb (which stays honest `unknown`).

Run it:

```sh
./tests/harness/run.sh        # -> "Totals: PASS=31 FAIL=0 SKIP=0" / "Verdict: pass"; exit 0
```

Injecting a regression (e.g. forcing `derive_overall` to `pass`) makes it exit 1
with 6 failures; reverting restores green. After a run, `git status --porcelain`
shows no leftover scratch/evidence/contract/stub files.

### Cycle-1 validation evidence

| Check | Result |
|-------|--------|
| Every verb human form: exactly one `^Verdict:` line | ✅ 12/12 |
| Every machine verb `--json`: valid JSON + `verdict` | ✅ |
| `./harness verify --json` baseline | `degraded`, exit 0, `doctor` in `checks[]`, collision-safe evidence |
| Data-driven rewiring (temp contract, no script edit) | `verify`→`pass`, `clean` wraps cmd, `./harness` byte-identical |
| Aggregate truth table (TEST-19) | all 5 rows ✅ |
| Node range 21/22/23 (TEST-21) | degraded/pass/degraded ✅ |
| Evidence collision + atomicity (TEST-22) | 20/20 distinct, 0 invalid, 0 temp leftovers |
| Persistence failure ⇒ `fail` (TEST-23) | verify + friction add exit 1 ✅ |
| Non-GNU portability (TEST-24) | dash + mawk, all JSON parses ✅ |
| `npm run typecheck` | exit 0 |
| 17 agent surfaces, one marker block each, unchanged | ✅ (no diff to `AGENTS.md`/`.github/agents/*`) |
| Regression suite | PASS=31 FAIL=0; catches injected regression |

**Environment limitation:** the npm registry is proxy-blocked in this sandbox;
`node_modules/typescript` was reconstructed so `npm run typecheck` (wrapped by
`verify`) runs and exits 0. `busybox` could not be installed offline, so the
non-GNU portability proof uses dash + mawk (both non-GNU) instead of busybox.
No ADR/CC deviation was required; all work stayed within the reconciled
ADR-0003 §5–§7 / CORE-COMPONENT-0003 R2/R6/R8/R12/R14/R15/R16 boundaries.

## Review Cycle 2 remediation (F-02R, F-06…F-09 + README)

> **Review Cycle 2 (2026-07-20).** Independent re-review returned REQUEST_CHANGES
> (0 blocking; F-02R + F-06/F-07/F-08 major, F-09 minor). All are **CODE/TEST**
> fixes — the accepted architecture (ADR-0003 / CORE-COMPONENT-0003) is unchanged,
> so no return to Plan and no ADR/CC decision-text edits. Every already-resolved
> cycle-1 behavior (data-driven dispatch, Node range, evidence reliability, POSIX
> escaping, one marker block per surface, VCS policy, wrapped typecheck under
> `verify` only) is preserved. The regression suite now runs **34 tests green**
> (`PASS=34 FAIL=0 SKIP=0`) under both `sh` and `dash`, exits non-zero on any
> failure, and leaves the tree clean.

### F-02R — terminal `Verdict:` line on a failing `verify` (R2/R7)

`verb_verify`'s human path printed `Verdict: <value>` **and then** the captured
typecheck diagnostic, so the verdict was not the terminal line. Fixed by moving
the `--- typecheck output ---` diagnostic block to print **before** the single
`Verdict: %s` line. The last line of every human verb (pass or fail) is now
exactly `Verdict: <value>`.

- **File:** `harness` (`verb_verify` output block).
- **Evidence:** forcing a failing typecheck (temp contract, data-only) → human
  output ends with `LAST=[Verdict: fail]`, exit 1; real diagnostic
  (`error TS9999: forced failure`) prints above it.
- **Regression test:** **TEST-28** asserts last line == `Verdict: fail`, exit 1,
  exactly one `^Verdict:` line.

### F-06 — double execution of aggregate members in human `verify`

Human `verify` resolved each member once to aggregate and **again** to render,
running any mapped member command twice. Fixed by resolving each member **exactly
once** in a single loop that caches the verdict, the JSON `checks[]` fragment, and
the human-rendered row (`$_rows`); the human output reuses `$_rows` instead of a
second `resolve_member` pass.

- **File:** `harness` (`verb_verify` aggregate loop + output block).
- **Evidence:** temp contract mapping `lint` to a counter-incrementing command →
  member invoked **1×** for both human and `--json` verify.
- **Regression test:** **TEST-26** (counter file; asserts count == 1 in both forms).

### F-07 — empty/missing friction log produced invalid JSON

`grep -c . file` printed `0` **and exited 1**, so `|| echo 0` appended a **second**
`0`, embedding a raw newline in the numeric JSON field (`"count": 0\n0`). Replaced
with a single `friction_count()` helper (`awk 'NF{n++} END{print n+0}'` guarded by
a file-existence check) that prints **exactly one integer** for missing, empty, and
populated logs — including a final record with no trailing newline. `friction list`
no longer creates the log as a read side effect.

- **File:** `harness` (`friction_count`, `verb_status`, `friction_list`).
- **Evidence:** `status --json` and `friction list --json` are valid JSON with
  `count`/`friction_entries` = `0` (missing), `0` (empty), `6` (populated seed),
  `2` (no-trailing-newline fixture).
- **Regression test:** **TEST-27** (missing/empty/populated × `status`/`friction
  list` × JSON+human; asserts valid JSON + correct count; asserts the missing log
  is not created).

### F-08 — POSIX portability of the suite + real non-GNU enforcement (R16)

`tests/harness/run.sh` used non-POSIX constructs and TEST-24 could pass on GNU awk
without ever exercising a non-GNU userland. Fixes:

- `mktemp -d` → PID-based scratch dir `${TMPDIR:-/tmp}/harness-suite.$$` created
  with `umask 077` + `mkdir`, trap-cleaned.
- `sha256sum … | cut` → `cksum < file` (TEST-18 harness-unchanged check).
- `grep -o … | sed` → POSIX `sed -n 's/…/\1/p'` (TEST-23 no-node fallback).
- Removed `awk -Wversion` and `head -c` (TEST-24).
- **TEST-24 now REQUIRES a real non-GNU awk:** it locates `mawk`/`busybox awk`/a
  non-GNU default `awk`, forces it onto `PATH` via an `awk` shim, runs the
  friction/verify escaping path under `dash`, asserts the harness actually
  resolved `awk` to the shim, and validates JSON + control-char/newline/tab
  round-trip. If **no** non-GNU userland exists it emits a **visible SKIP** (never
  a silent GNU pass). In this sandbox it runs on forced `/usr/bin/mawk` under
  `dash`.

The suite stays POSIX-portable (verified with `sh -n`, and green under both `sh`
and `dash`), exits non-zero on any failure, and leaves the tree clean.

### F-09 — real idempotency proof for the agent-surface updater (R10)

TEST-13 only checked marker ordering. The marker-update operation is now a small
committed POSIX-awk helper, **`tests/harness/apply-marker.sh`**, which replaces the
content between `<!-- HARNESS:BEGIN/END -->` with a supplied block (or appends if
absent) and never duplicates it. TEST-13 runs it **twice** on an isolated copy of
each of the **17** surfaces (output to scratch; tracked files never mutated) and
asserts: (a) the second run is byte-identical to the first (`cksum`); (b)
re-applying on the committed state is a no-op (`cksum` == original) with exactly one
BEGIN/END pair (no duplication); (c) content **outside** the markers is preserved
verbatim.

- **New file:** `tests/harness/apply-marker.sh` (committed helper; `sh -n` clean).
- **Regression test:** **TEST-13** (strengthened; 17 surfaces).

### F-follow-up — `.harness/README.md` semantics

Updated the `verify` aggregation policy to the tightened ordered total function
(any `fail` → `fail`; all `pass` → `pass`; all `unknown` → `unknown`; otherwise
`degraded`) and documented persistence-failure ⇒ `fail` and the diagnostics-before-
terminal-verdict rule. The `fail` verdict-table row now notes the required-record
persistence-failure case (R14).

### Cycle-2 validation evidence

| Check | Result |
|-------|--------|
| Failing `verify` human output last line | `Verdict: fail` (diagnostics above), exit 1 (F-02R) |
| `verify` runs each mapped member once | human=1, json=1 (TEST-26, F-06) |
| `status`/`friction list` `--json` count | valid JSON, `0`/`0`/`6` for missing/empty/populated (TEST-27, F-07) |
| Suite under `sh` and `dash` | `PASS=34 FAIL=0 SKIP=0`, exit 0 |
| TEST-24 non-GNU | forced `/usr/bin/mawk` under `dash`, JSON valid + round-trip (F-08) |
| TEST-13 idempotency | 17 surfaces byte-identical on rerun, outside-markers preserved (F-09) |
| Suite is a real gate | reintroducing F-02R → TEST-28 fails, suite exit 1 |
| Baseline `verify --json` | `degraded`, exit 0, `doctor` present in `checks[]` |
| `npm run typecheck` | exit 0 |
| 17 marker blocks, unchanged | ✅ one each; `AGENTS.md`/`.github/agents/*` no diff |
| VCS policy | evidence git-ignored + `.gitkeep` kept; contract/README/friction tracked |
| Tree clean | only `harness`, `.harness/README.md`, `tests/harness/run.sh` modified + `tests/harness/apply-marker.sh` new |

No ADR/CC deviation was required; all cycle-2 work is CODE/TEST-level within the
CORE-COMPONENT-0003 R2/R6/R7/R12/R14/R15/R16 boundaries.

## Review Cycle 3 remediation (F-08R)

### F-08R — remove non-POSIX `awk --version` probe from TEST-24 selection (TEST-only)

Removed the default-`awk` `--version` probe from `find_nongnu_awk`
(`tests/harness/run.sh`); the non-GNU awk under test is now selected ONLY from
explicit `mawk` / `busybox awk` candidates, and the already-implemented visible
SKIP fires when neither exists — no non-POSIX awk flag remains in the selection
path. Validation: `grep -n "awk --version\|-Wversion\|--version" tests/harness/run.sh`
returns nothing; `sh` and `dash` runs both `PASS=34 FAIL=0 SKIP=0` exit 0 with
TEST-24 executing the real non-GNU path via `/usr/bin/mawk`; tree clean;
`./harness verify --json` still `degraded` exit 0; `harness`, `.harness/contract.yml`,
`.harness/README.md`, `.github/agents/*`, and `AGENTS.md` unmodified.
