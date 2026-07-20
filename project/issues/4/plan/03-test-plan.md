# Test Plan: Generate the engineering harness CLI (Issue #4)

Scope: verify the harness CLI generated via the `harness-cli-it` agent wraps Ascend's
existing commands, records evidence, documents supported human and agent workflows, and is
invocable from a single documented entry point (`./harness`) — implementing ADR-0003 and
CORE-COMPONENT-0003 without inventing a new build system (ADR-0002). The central guarantee
is that **`./harness verify` returns `pass`, wraps the real `npm run typecheck`, and writes
a JSON evidence record**.

Test types: `structural` (file/contract assertions), `behavioural` (harness command
execution), `content` (documentation assertions). Priority: **P0** = must pass to accept
the story.

---

## Test T2-a: Harness exposes all required verbs

- **Type:** behavioural
- **Task:** T2
- **Priority:** P0

### Setup
`./harness` created and executable.

### Steps
1. Run `./harness help`.

### Expected Result
- Output lists every required verb: `help`, `orient`, `doctor`, `lint`, `test`, `build`,
  `boot`, `verify`, `status`, `clean`, `friction add`, `friction list`.

---

## Test T2-b: Every verb returns a valid verdict with a consistent exit code

- **Type:** behavioural
- **Task:** T2
- **Priority:** P0

### Setup
Harness created; toolchain available.

### Steps
1. Run each important verb with `--json` and read the `verdict` field.
2. Observe exit codes for a `pass` verb and a `fail`-inducing condition.

### Expected Result
- Each `verdict` is one of `pass`, `fail`, `degraded`, `unknown`.
- A `pass` verdict exits 0; a `fail` verdict exits non-zero; `degraded`/`unknown` exit 0 by
  default (non-zero only under `--strict`).

---

## Test T2-c: Harness wraps existing commands (no reimplementation)

- **Type:** structural / behavioural
- **Task:** T2
- **Priority:** P0

### Steps
1. Inspect `./harness` and `.harness/contract.yml`.

### Expected Result
- `boot` invokes `npm install`; `verify`/`typecheck` invokes `npm run typecheck`.
- No verb reimplements lint/test/build logic; `.harness/contract.yml` maps verbs to the real
  underlying commands.

---

## Test T2-d: verify writes an evidence record

- **Type:** behavioural
- **Task:** T2 / T5
- **Priority:** P0

### Setup
Toolchain installed (`./harness boot`).

### Steps
1. Run `./harness verify`.
2. List `.harness/evidence/`.

### Expected Result
- A timestamped JSON evidence file is created under `.harness/evidence/` and referenced by
  `latest.json`; `verify` reports the evidence path.

---

## Test T2-e: Harness degrades gracefully without the toolchain

- **Type:** behavioural
- **Task:** T2
- **Priority:** P1

### Setup
A shell where `node`/`npm` are not on `PATH`.

### Steps
1. Run `./harness doctor --json`.

### Expected Result
- `doctor` returns `degraded` or `unknown` (not a crash / unhandled error) and explains the
  missing toolchain. The harness itself requires no packages to run.

---

## Test T2-f: Absent verbs return `unknown`

- **Type:** behavioural
- **Task:** T1 / T2
- **Priority:** P0

### Steps
1. Run `./harness lint --json`, `./harness test --json`, `./harness build --json`.

### Expected Result
- Each returns `verdict: unknown` (no fabricated coverage) and notes that no such project
  command is declared.

---

## Test T3-a: Friction log is valid and answers the KEY_QUESTION

- **Type:** structural
- **Task:** T3
- **Priority:** P0

### Steps
1. Read `.harness/friction.jsonl`.

### Expected Result
- Every line parses as a JSON object.
- Entries cover absent `lint`, `test`, `build`, and inferred `clean`.
- Each entry answers *"What did the agent have to infer that the harness should have
  proved?"* (a `question`/KEY_QUESTION field).

---

## Test T3-b: friction add / list round-trips

- **Type:** behavioural
- **Task:** T3
- **Priority:** P1

### Steps
1. Run `./harness friction add "test gap note"`.
2. Run `./harness friction list`.

### Expected Result
- The new entry appears in the list and is appended as a valid JSON line to
  `.harness/friction.jsonl`.

---

## Test T3-c: Harness README documents verbs and workflows

- **Type:** content
- **Task:** T3
- **Priority:** P0

### Steps
1. Read `.harness/README.md`.

### Expected Result
- Documents every verb and both a **human** and an **agent** workflow (setup / dev /
  validation), and names `./harness` as the single documented entry point.

---

## Test T4-a: AGENTS.md requires harness usage (idempotent)

- **Type:** content / structural
- **Task:** T4
- **Priority:** P0

### Steps
1. Read `AGENTS.md`; count occurrences of the harness-usage block/marker.

### Expected Result
- `AGENTS.md` requires `./harness` as the first-choice operating surface and references
  `.harness/contract.yml`; the marker appears exactly once (re-running the update does not
  duplicate it).

---

## Test T4-b: Every repo agent definition prefers the harness (behaviour preserved)

- **Type:** structural
- **Task:** T4
- **Priority:** P0

### Steps
1. For each `.github/agents/*.agent.md`, check for the harness-usage marker and confirm the
   original front-matter/body is intact.

### Expected Result
- Each file contains the harness-usage note exactly once; no existing agent content is
  removed or corrupted.

---

## Test T4-c: Verification config registers the harness

- **Type:** structural
- **Task:** T4
- **Priority:** P1

### Steps
1. Read `.github/soft-factory/verification.yml`.

### Expected Result
- File parses as YAML and its verification command(s) include `./harness verify`.

---

## Test T5-a: End-to-end verify passes with evidence

- **Type:** behavioural
- **Task:** T5
- **Priority:** P0

### Setup
Pinned Node 22 toolchain; `./harness boot` run.

### Steps
1. Run `./harness verify --json`.

### Expected Result
- `verdict: pass`; the `typecheck` check passed (wrapping `npm run typecheck`, exit 0); a
  JSON evidence path under `.harness/evidence/` is reported.

---

## Test T5-b: Evidence content reflects the wrapped check

- **Type:** structural
- **Task:** T5
- **Priority:** P1

### Steps
1. Read the newest file in `.harness/evidence/` (or `latest.json`).

### Expected Result
- Records the `verify` verdict and a `typecheck` check result of `pass`, with a timestamp and
  no secret-bearing output.

---

## Test T5-c: Single documented entry point works from a clean shell

- **Type:** behavioural
- **Task:** T5
- **Priority:** P0

### Steps
1. From a fresh shell, run `./harness` (or `./harness orient`).

### Expected Result
- The harness runs and lists the supported workflows without requiring any prior setup of the
  harness itself.

---

## Coverage Traceability

| Acceptance Criterion | Covered by |
|----------------------|------------|
| Repo-local harness CLI exists, generated via `harness-cli-it` | T2-a, T5-c |
| Wraps existing commands rather than reimplementing | T2-c, T2-f |
| Records evidence for the commands it runs | T2-d, T5-a, T5-b |
| Supported human and agent workflows are documented | T3-c, T4-a, T4-b |
| Invocable from a documented single entry point | T5-a, T5-c, T4-c |
