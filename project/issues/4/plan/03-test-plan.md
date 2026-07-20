# Test Plan: Issue #4 — Engineering harness CLI

Verifies the harness delivered by the tasks in `02-task-breakdown.md` against ADR-0003 and
CORE-COMPONENT-0003. Every task's explicit test coverage requirement is realised by one or
more tests below. Tests are executed by `rpiv-implementer` during Implement and re-validated
by `rpiv-verifier` during Verify. All harness runs assume `npm install` has been run so
`npm run typecheck` is available (ADR-0002 setup entry point).

**Priority:** High = release-gating; Medium = important; Low = nice-to-have.

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
3. Assert `checks` includes a `typecheck` check whose `verdict` is `pass` and includes
   entries for `test`/`lint`/`build` with `verdict` `unknown`.
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
