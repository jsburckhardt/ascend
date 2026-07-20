# Test Plan: Issue #4 — Engineering harness CLI

Verifies the harness delivered by the tasks in `02-task-breakdown.md` against ADR-0003 and
CORE-COMPONENT-0003. Every task's explicit test coverage requirement is realised by one or
more tests below. Tests are executed by `rpiv-implementer` during Implement and re-validated
by `rpiv-verifier` during Verify. All harness runs assume `npm install` has been run so
`npm run typecheck` is available (ADR-0002 setup entry point).

**Priority:** High = release-gating; Medium = important; Low = nice-to-have.

> **Review Cycle 1 (2026-07-20).** Tests **TEST-18…TEST-24** were added to cover the review
> findings F-01…F-05, and **TEST-25** requires a durable executable regression suite
> (`tests/harness/run.sh`, CC-0003 R16) that runs every case below and exits non-zero on any
> failure. TEST-05 and TEST-07 were amended for the `doctor` aggregate member and the
> data-driven `clean` mapping.

---

## Test TEST-01: Contract file conforms to the CORE-COMPONENT-0003 schema

- **Type:** Contract
- **Task:** T1
- **Priority:** High

### Setup
- `.harness/contract.yml` exists.

### Steps
1. Parse `.harness/contract.yml` as YAML.
2. Assert `version`, `entrypoint`, `verbs`, `evidence`, `friction` keys exist.
3. Assert every required verb (`help`, `orient`, `doctor`, `lint`, `test`, `build`, `boot`,
   `verify`, `status`, `clean`, `friction add`, `friction list`) has an entry.
4. Assert `verify.maps_to == "npm run typecheck"`; `lint`/`test`/`build`/`boot` `maps_to: null`.
5. Assert no verb other than `verify` maps to `npm run typecheck`.
6. Assert `evidence.dir == ".harness/evidence"`, `friction.path == ".harness/friction.jsonl"`,
   and `friction.key_question` equals the KEY_QUESTION verbatim.

### Expected Result
YAML parses; all assertions pass; no build-system/new-tooling command present.

---

## Test TEST-02: `help` and `orient` produce human and JSON output and exit 0

- **Type:** Integration
- **Task:** T2
- **Priority:** High

### Setup
- `./harness` is executable.

### Steps
1. Run `./harness help`; capture stdout and exit code.
2. Run `./harness orient`; capture stdout and exit code.
3. Run `./harness orient --json`; capture stdout and exit code; parse JSON.

### Expected Result
- `help` lists all 12 verbs; exit 0.
- `orient` prints stack, `npm install` entry point, and contract summary; exit 0.
- `orient --json` is valid JSON containing `harness_version`, `verb`, `verdict`, `timestamp`;
  exit 0.

---

## Test TEST-03: `doctor` reports environment verdict

- **Type:** Integration
- **Task:** T2
- **Priority:** Medium

### Setup
- Node available per `.nvmrc`/`engines`; `node_modules` present.

### Steps
1. Run `./harness doctor` and `./harness doctor --json`.
2. Inspect the verdict and exit code.
3. (Negative) Temporarily simulate missing `node_modules`; re-run.

### Expected Result
- With a healthy env: verdict `pass`, exit 0.
- With missing `node_modules`: verdict `degraded`, exit 0, and a friction entry is recorded.
- JSON conforms to the CC-0003 schema.

---

## Test TEST-04: `verify` wraps `npm run typecheck`, writes evidence, returns `degraded`

- **Type:** Integration
- **Task:** T3
- **Priority:** High

### Setup
- Clean checkout with `node_modules` installed; `src/placeholder.ts` typechecks cleanly.
- Note the current file list under `.harness/evidence/`.

### Steps
1. Run `./harness verify`; capture stdout and exit code.
2. List `.harness/evidence/` and diff against the pre-run list.

### Expected Result
- `verify` invokes `npm run typecheck` (not a reimplementation); typecheck passes.
- Overall verdict is `degraded` (test/lint/build `unknown`); exit 0.
- Exactly one new timestamped evidence file appears under `.harness/evidence/`.

---

## Test TEST-05: `verify --json` emits the stable aggregate schema

- **Type:** Contract
- **Task:** T3
- **Priority:** High

### Steps
1. Run `./harness verify --json`; parse JSON.
2. Assert required keys: `harness_version`, `verb` (`verify`), `verdict` (`degraded`),
   `timestamp`, `checks` (array), `evidence` (path).
3. Assert `checks` includes a `typecheck` check whose `verdict` is `pass`, entries for
   `lint`/`test`/`build` with `verdict` `unknown`, and a `doctor` member check (CC-0003 R6).
4. Assert the `evidence` path exists on disk.

### Expected Result
All assertions pass; schema matches CORE-COMPONENT-0003; exit 0.

---

## Test TEST-06: `unknown` verbs report honestly and emit friction

- **Type:** Integration
- **Task:** T4
- **Priority:** High

### Steps
1. For each of `lint`, `test`, `build`, `boot`: run `./harness <verb>` and
   `./harness <verb> --json`.
2. Capture verdict and exit code; confirm no `tsc`/`npm run typecheck` invocation occurs.
3. Inspect `.harness/friction.jsonl` for a matching entry.

### Expected Result
- Each verb returns `unknown` and exits 0.
- No verb aliases `tsc`.
- JSON conforms to the CC-0003 schema.
- A friction entry exists for each, answering the KEY_QUESTION verbatim.

---

## Test TEST-07: `clean` is `degraded` and non-destructive

- **Type:** Integration
- **Task:** T4
- **Priority:** High

### Setup
- `node_modules` present; place a dummy stale file under `.harness/evidence/`.

### Steps
1. Run `./harness clean` and `./harness clean --json`.
2. Verify `node_modules` still exists afterwards.
3. Verify only harness-owned ephemeral artifacts (if any) were removed.

### Expected Result
- Verdict `degraded`, exit 0.
- `node_modules` is NOT removed.
- A friction entry records the missing project `clean` command.
- When `clean.maps_to` is set to a command, `clean` wraps it instead of the native prune
  (covered in depth by TEST-18, CC-0003 R8).

---

## Test TEST-08: `friction add` / `friction list` round-trip

- **Type:** Unit
- **Task:** T5
- **Priority:** High

### Steps
1. Record the current line count of `.harness/friction.jsonl`.
2. Run `./harness friction add` with `verb`, `inference`, `proof-gap`, `suggested-closure`.
3. Assert exactly one line was appended and it is valid JSON with required fields
   (`ts`, `verb`, `key_question`, `inference`, `proof_gap`, `suggested_closure`).
4. Run `./harness friction list` and `friction list --json`; assert the new entry is present.

### Expected Result
- One well-formed JSONL line appended; `key_question` verbatim.
- `friction list` reads back all entries; both verbs return `pass`, exit 0.

---

## Test TEST-09: Seed friction log covers every capability gap

- **Type:** Contract
- **Task:** T5
- **Priority:** High

### Steps
1. Parse each line of the seeded `.harness/friction.jsonl`.
2. Assert entries exist for `lint`, `test`, `build`, `boot`, `clean`, and the `verify`
   degraded aggregate.
3. Assert every entry's `key_question` equals the KEY_QUESTION verbatim and has a non-empty
   `suggested_closure`.

### Expected Result
All gaps are represented; every entry answers the KEY_QUESTION and names a closure path.

---

## Test TEST-10: Exit-code contract (only `fail` exits non-zero)

- **Type:** Integration
- **Task:** T2, T3
- **Priority:** High

### Setup
- A way to force a failing typecheck (e.g. a temporary type error in a scratch file under
  `src/`), reverted after the test.

### Steps
1. Confirm `pass`/`degraded`/`unknown` verbs (`orient`, `verify`, `test`) exit 0.
2. Introduce a type error so `npm run typecheck` fails; run `./harness verify`.
3. Capture the verdict and exit code; revert the type error.

### Expected Result
- Non-`fail` verdicts exit 0.
- Failing typecheck makes `verify` return `fail` and exit non-zero.

---

## Test TEST-11: `.harness/README.md` documents workflows and verdict semantics

- **Type:** Documentation review
- **Task:** T6
- **Priority:** Medium

### Steps
1. Open `.harness/README.md`.
2. Confirm it lists all 12 verbs with their current verdicts.
3. Confirm it states the exit-code contract, that `unknown`/`degraded` are expected states,
   the `--json` contract, the KEY_QUESTION, and the single entry point `./harness`.

### Expected Result
Documentation is complete and matches the delivered behaviour; satisfies the "documented
workflows" issue AC.

---

## Test TEST-12: Every agent surface carries exactly one harness block

- **Type:** Integration
- **Task:** T7
- **Priority:** High

### Steps
1. For `AGENTS.md` and each of the 16 `.github/agents/*.agent.md`, count occurrences of
   `<!-- HARNESS:BEGIN -->` and `<!-- HARNESS:END -->`.
2. Assert exactly one begin/end pair per file (17 surfaces total).
3. Assert the block content contains the four harness-usage rules including friction-on-bypass.

### Expected Result
All 17 surfaces contain exactly one well-formed harness block with the required rules.

---

## Test TEST-13: Agent-surface update is idempotent and behaviour-preserving

- **Type:** Idempotency / regression
- **Task:** T7
- **Priority:** High

### Setup
- Snapshot (hash) all 17 agent surfaces after the first update.

### Steps
1. Re-run the harness agent-surface update process.
2. Re-hash all 17 files and diff against the snapshot.
3. Diff content outside the `<!-- HARNESS:BEGIN/END -->` markers against the pre-update
   originals.

### Expected Result
- Re-run produces byte-identical files (no duplicated blocks).
- No content outside the markers changed; each agent's frontmatter and instructions preserved.

---

## Test TEST-14: Issue acceptance criteria satisfied end-to-end

- **Type:** Acceptance
- **Task:** T6, T9
- **Priority:** High

### Steps
1. Confirm `./harness` exists and is executable (AC: harness exists via harness-cli-it agent).
2. Confirm `verify` wraps `npm run typecheck` rather than reimplementing it (AC: wraps
   existing commands).
3. Confirm an evidence file is written under `.harness/evidence/` after a run (AC: records
   evidence).
4. Confirm `.harness/README.md` documents human and agent workflows (AC: documented).
5. Confirm `./harness` is the single documented entry point in README/AGENTS (AC: single
   entry point).

### Expected Result
All 5 issue acceptance criteria demonstrably pass against the delivered harness.

---

## Test TEST-15: Harness runs dependency-light under POSIX shell

- **Type:** Integration
- **Task:** T2
- **Priority:** Medium

### Steps
1. Execute `./harness help` and `./harness orient` under `sh` (e.g. `sh ./harness help`).
2. Confirm no interpreter/tool beyond POSIX shell utilities and the already-present repo
   tooling is required.

### Expected Result
Harness executes without any new runtime dependency; no `bash`-only or external-package
requirement; exit 0.

---

## Test TEST-16: Verification config and VCS policy

- **Type:** Integration
- **Task:** T8
- **Priority:** High

### Steps
1. Open `.github/soft-factory/verification.yml`; assert its verification step runs
   `./harness verify`.
2. Run the configured command; assert verdict `degraded`, exit 0.
3. Assert `.gitignore` ignores `.harness/evidence/` run output but not `.gitkeep`.
4. Assert `.harness/contract.yml`, `.harness/README.md`, `.harness/friction.jsonl` are
   git-tracked and generated evidence files are not.

### Expected Result
Verification config routes through `./harness verify` deterministically; VCS policy matches
CORE-COMPONENT-0003 R13.

---

## Test TEST-17: `pr-review-complement` contract invocations succeed

- **Type:** Integration
- **Task:** T9
- **Priority:** High

### Steps
1. Run `./harness orient` (the skill's pre-edit orientation call); capture exit code.
2. Run `./harness verify --json` (the skill's verification call); parse JSON; capture exit
   code.

### Expected Result
- `./harness orient` exits 0.
- `./harness verify --json` returns valid JSON with a non-`fail` verdict (`degraded`) and
  exits 0, so the skill's harness branch behaves as designed.

---

## Test TEST-18: Contract-driven rewiring works by data alone (no code change)

- **Type:** Contract / Integration
- **Task:** T10, T11
- **Priority:** High

### Setup
- Copy `.harness/contract.yml` and `./harness` to a scratch workspace (or snapshot the
  `./harness` hash) so behavior is exercised without editing the tracked harness.

### Steps
1. With the baseline contract, run `./harness verify --json`; assert overall `degraded`.
2. Patch the contract copy so `lint`/`test`/`build` `maps_to` are a trivially-passing command
   (e.g. `true`) with `doctor` healthy; re-run `verify --json` WITHOUT editing `./harness`.
3. Patch the contract copy so `clean.maps_to` is a harmless command (e.g. `sh -c 'echo cleaned'`
   or `true`); run `./harness clean`.
4. Hash `./harness` before and after the whole exercise.

### Expected Result
- Step 2 yields overall `verdict: pass` purely from data (aggregate reaches `pass`).
- Step 3 shows `clean` wrapping the mapped command (verdict `pass`) instead of the native
  prune.
- `./harness` is byte-identical throughout (no code change required to rewire).

---

## Test TEST-19: `verify` aggregate verdict truth table

- **Type:** Unit / Integration
- **Task:** T11
- **Priority:** High

### Setup
- Ability to force member verdicts via a temp contract copy (`maps_to: true` ⇒ pass,
  `maps_to: false` ⇒ fail, `maps_to: null` ⇒ unknown) and a `doctor` stub for its verdict.

### Steps
1. Any member `fail` (e.g. `test.maps_to: false`) ⇒ run `verify`; assert overall `fail`,
   exit non-zero.
2. All members `pass` ⇒ assert overall `pass`, exit 0.
3. All members `unknown` (all `maps_to: null`, typecheck excluded/also unknown) ⇒ assert
   overall `unknown`, exit 0.
4. Mix of `pass` + `unknown`, no `fail` ⇒ assert overall `degraded`, exit 0.
5. `doctor` `degraded` with other members `pass` ⇒ assert overall `degraded` (never `fail`).

### Expected Result
Every case matches the fixed rule (any fail⇒fail; all pass⇒pass; all unknown⇒unknown; else
degraded); exit codes follow the R3 contract; member verdicts appear in `checks[]`.

---

## Test TEST-20: Every human verb emits exactly one `Verdict:` line

- **Type:** Integration
- **Task:** T12
- **Priority:** High

### Steps
1. For each verb (`help`, `orient`, `doctor`, `lint`, `test`, `build`, `boot`, `verify`,
   `status`, `clean`, `friction add`, `friction list`), run the human (non-`--json`) form.
2. Count lines matching `^Verdict:` in each verb's output.

### Expected Result
- Exactly one `Verdict:` line per verb (no zero, no duplicates).
- `help` and `friction list` each print `Verdict: pass`.

---

## Test TEST-21: `doctor` validates the full supported Node range (boundaries)

- **Type:** Integration
- **Task:** T13
- **Priority:** High

### Setup
- A `node` shim earlier on `PATH` that reports a chosen major version (21, 22, 23) for the
  version probe; `node_modules` present.

### Steps
1. With the shim reporting major `22`, run `./harness doctor` / `--json`.
2. With the shim reporting major `21`, re-run.
3. With the shim reporting major `23`, re-run.

### Expected Result
- Major `22` → node check ok, verdict `pass`, exit 0.
- Major `21` → verdict `degraded` (below range), friction recorded, exit 0.
- Major `23` → verdict `degraded` (above range), friction recorded, exit 0.
- `doctor` never reports `pass` for a major outside `22`.

---

## Test TEST-22: Evidence is collision-safe and written atomically

- **Type:** Integration
- **Task:** T14
- **Priority:** High

### Setup
- Empty `.harness/evidence/` (except `.gitkeep`).

### Steps
1. Run `./harness verify` many times in a tight loop within the same wall-clock second
   (e.g. 20 iterations).
2. Count the resulting evidence files.
3. Parse each evidence file as complete JSON.

### Expected Result
- One distinct evidence file per run (e.g. 20 files); no run overwrites another.
- Every evidence file parses as complete, non-truncated JSON (atomic write).

---

## Test TEST-23: Required-persistence failure yields `fail`

- **Type:** Integration / Negative
- **Task:** T14
- **Priority:** High

### Setup
- A way to make the evidence directory/file unwritable and the friction path unwritable
  (e.g. `chmod`), reverted after the test.

### Steps
1. Make `.harness/evidence/` unwritable; run `./harness verify`; capture verdict + exit code.
2. Make `.harness/friction.jsonl` unwritable; run `./harness friction add --verb x ...`;
   capture verdict + exit code.
3. Restore permissions.

### Expected Result
- `verify` returns `fail` and exits non-zero when the required evidence cannot be persisted
  (never `degraded`/`pass`).
- `friction add` returns `fail` and exits non-zero when the append cannot be persisted.

---

## Test TEST-24: Non-GNU portability of JSON escaping

- **Type:** Portability
- **Task:** T15
- **Priority:** High

### Setup
- A non-GNU userland available (busybox `sh` + busybox `sed`/`awk`).

### Steps
1. Record a friction entry whose `inference`/`proof-gap` contain a newline, a tab, a double
   quote, a backslash, and a control character.
2. Under the busybox userland, run `./harness friction list --json` and `./harness verify --json`.
3. Parse the outputs as JSON.

### Expected Result
- All JSON parses; quotes, backslashes, tabs, newlines, and control characters are correctly
  escaped.
- No GNU-only sed/awk construct is exercised; output is identical in intent to the GNU path.

---

## Test TEST-25: Durable executable regression suite runs green and clean

- **Type:** Regression
- **Task:** T16
- **Priority:** High

### Steps
1. Run `tests/harness/run.sh`; capture the summary and exit code.
2. Run `git status --porcelain` afterwards.
3. Inject a temporary regression (e.g. force `verify` to `pass` incorrectly) and re-run the
   suite; then revert.

### Expected Result
- The suite exercises TEST-01…TEST-24 and exits 0 on the conformant harness.
- The working tree is clean afterwards (no leftover scratch/evidence/contract/stub files).
- The suite exits non-zero when a regression is present (step 3), proving it is a real gate.
