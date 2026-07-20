# Task Breakdown: Generate the engineering harness CLI (Issue #4)

All tasks implement **ADR-0003 — Adopt a repo-local engineering harness** and
**CORE-COMPONENT-0003 — Engineering Harness Contract**, honour **ADR-0002** (no new build
system, no framework dependencies; wrap existing commands), and comply with
**CORE-COMPONENT-0002 (Commit Standards)** for commit/PR authoring. The harness is
generated via the **`harness-cli-it`** agent.

Tasks are ordered by dependency. Complexity is relative (S / M / L).

---

## Task T1: Detect the existing command surface

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** None
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Inspect the repository's command sources (`package.json`, absence of `Makefile`/`justfile`/
`Taskfile.yml`/`.github/workflows/`, `.devcontainer/devcontainer.json`, `.nvmrc`) and
produce the command map the harness will wrap. Confirm the only executable commands are
`npm install` (setup → `boot`) and `npm run typecheck` (→ `typecheck` and part of
`verify`), and that no `lint`, `test`, `build`, or `clean` scripts exist. Enumerate the
inferences that must become friction entries (absent `lint`/`test`/`build`; inferred
`clean`).

### Acceptance Criteria
- [ ] The command map records `boot → npm install` and `typecheck → npm run typecheck`.
- [ ] Absent verbs (`lint`, `test`, `build`) are identified as `unknown`.
- [ ] `clean` is identified as inferred (no declared clean command).
- [ ] No non-existent command source is claimed.

### Test Coverage
- Detection accuracy (TEST T1-a): the generated `.harness/contract.yml` maps only real
  commands (`npm install`, `npm run typecheck`) and marks `lint`/`test`/`build` as `unknown`.

---

## Task T2: Author `./harness` and `.harness/contract.yml`

- **Status:** Not started
- **Complexity:** L
- **Dependencies:** T1
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Create the executable `./harness` (dependency-light POSIX/bash) implementing every required
verb: `help`, `orient`, `doctor`, `lint`, `test`, `build`, `boot`, `verify`, `status`,
`clean`, `friction add`, `friction list`. Each verb:
- returns exactly one verdict (`pass`/`fail`/`degraded`/`unknown`) and sets an exit code
  consistent with CORE-COMPONENT-0003 (pass → 0; fail → non-zero; degraded/unknown → 0
  unless `--strict`);
- emits useful human-readable output;
- supports `--json` for the important verbs, with a `verdict` field.

Behaviour:
- `boot` wraps `npm install`; `verify` runs `doctor` + `npm run typecheck` and writes a
  timestamped JSON evidence file under `.harness/evidence/` plus `latest.json`;
- `doctor` probes Node/npm availability and version against `.nvmrc`/`engines`, degrading
  gracefully if the toolchain is absent;
- `lint`, `test`, `build` return `unknown` and append a friction entry;
- `clean` performs a conservative, well-scoped artifact removal (e.g. `*.tsbuildinfo`,
  `dist/`) and records that its behaviour was inferred;
- `friction add`/`friction list` append to / read `.harness/friction.jsonl`.
Create `.harness/contract.yml` declaring the verbs, the command each wraps, `--json`
support, and the evidence/friction paths. Guard every wrapped command behind a
tool-availability probe. Do not record secrets in any output.

### Acceptance Criteria
- [ ] `./harness` exists, is executable, and implements all 12 required verbs.
- [ ] Every verb prints a verdict that is one of `pass`/`fail`/`degraded`/`unknown`.
- [ ] Important verbs support `--json` with a `verdict` field.
- [ ] `boot` invokes `npm install`; `verify` invokes `npm run typecheck` (wrapping, not
  reimplementing).
- [ ] `verify` writes a JSON evidence file under `.harness/evidence/`.
- [ ] Absent verbs (`lint`/`test`/`build`) return `unknown`.
- [ ] `.harness/contract.yml` exists and is valid YAML mapping verbs to wrapped commands.
- [ ] The harness requires no packages to run its own logic and does not crash when the
  Node toolchain is missing (degrades instead).

### Test Coverage
- Verb presence (TEST T2-a): `./harness help` lists all 12 verbs.
- Verdict/exit contract (TEST T2-b): each verb's `--json` verdict is one of the four values;
  `pass` exits 0, `fail` exits non-zero.
- Wrapping (TEST T2-c): `verify`/`boot` invoke `npm run typecheck` / `npm install` (not a
  reimplementation).
- Evidence (TEST T2-d): `verify` creates a file under `.harness/evidence/`.
- Graceful degradation (TEST T2-e): with the toolchain absent, `doctor` returns
  `degraded`/`unknown` and does not error out.

---

## Task T3: Record friction and author `.harness/README.md`

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Seed `.harness/friction.jsonl` with one JSON-Lines entry per inference from T1 (absent
`lint`, absent `test`, absent `build`, inferred `clean`), each answering the KEY_QUESTION
("What did the agent have to infer that the harness should have proved?"). Author
`.harness/README.md` documenting every verb and the supported **human** and **agent**
workflows (setup, day-to-day dev, validation), and the single entry point `./harness`.

### Acceptance Criteria
- [ ] `.harness/friction.jsonl` contains a valid JSON object per line, each with a
  `question` field equal to the KEY_QUESTION and an `inference` describing the gap.
- [ ] Friction entries cover absent `lint`, `test`, `build`, and inferred `clean`.
- [ ] `.harness/README.md` documents all 12 verbs and both human and agent workflows.
- [ ] `.harness/README.md` names `./harness` as the single documented entry point.

### Test Coverage
- Friction validity (TEST T3-a): every line of `.harness/friction.jsonl` parses as JSON and
  answers the KEY_QUESTION.
- Docs completeness (TEST T3-b): `.harness/README.md` mentions each verb and both a human
  and an agent workflow.

---

## Task T4: Require harness usage and wire verification

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T2
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Update `AGENTS.md` to require `./harness` as the first-choice operating surface (an
additive, clearly-marked, idempotent block). Update every `.github/agents/*.agent.md` with
an idempotent harness-usage note that preserves existing behaviour. Create
`.github/soft-factory/verification.yml` registering `./harness verify` as the RPIV Verify
stage's verification command.

### Acceptance Criteria
- [ ] `AGENTS.md` contains a harness-usage requirement referencing `./harness` and
  `.harness/contract.yml`; re-running the update does not duplicate it.
- [ ] Every `.github/agents/*.agent.md` contains the harness-usage note; existing content is
  preserved and the insertion is idempotent.
- [ ] `.github/soft-factory/verification.yml` exists and registers `./harness verify`.

### Test Coverage
- AGENTS update (TEST T4-a): `AGENTS.md` mentions `./harness` and the adoption rule exactly
  once (idempotent).
- Agent-def update (TEST T4-b): each `.github/agents/*.agent.md` contains the harness-usage
  marker exactly once and its original front-matter/body is intact.
- Verification wiring (TEST T4-c): `.github/soft-factory/verification.yml` parses and its
  command(s) include `./harness verify`.

---

## Task T5: Boot and verify the harness end-to-end

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T2, T3, T4
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Run `./harness boot` (wraps `npm install`) then `./harness verify --json` on the pinned Node
22 toolchain. Confirm a `pass` verdict, that `npm run typecheck` actually ran, and that a
JSON evidence record was written under `.harness/evidence/`. If verification is not `pass`,
perform a focused repair of `./harness`/`.harness/contract.yml` and re-run.

### Acceptance Criteria
- [ ] `./harness boot` completes (dependencies installed via `npm install`).
- [ ] `./harness verify` returns `pass`.
- [ ] The `verify` run wrapped `npm run typecheck` (exit 0).
- [ ] A timestamped JSON evidence file exists under `.harness/evidence/` and `latest.json`
  points at it.
- [ ] `./harness` is invocable as the single documented entry point.

### Test Coverage
- End-to-end verify (TEST T5-a, **P0**): `./harness verify --json` reports `verdict: pass`
  and lists the evidence path.
- Evidence content (TEST T5-b): the newest evidence record shows the `typecheck` check
  passed.
- Single entry point (TEST T5-c): `./harness` (no args / `help`) runs from a clean shell and
  lists supported workflows.
