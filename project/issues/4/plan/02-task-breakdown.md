# Task Breakdown: Issue #4 — Engineering harness CLI

Implementation is executed by `rpiv-implementer` (invoking the `harness-cli-it` agent). Each
task maps onto that agent's `REQUIRED_OUTPUTS` / `REQUIRED_VERBS`. Every task lists
acceptance criteria, explicit test coverage (see `03-test-plan.md`), and the ADRs /
core-components it must honour.

**Legend** — Complexity: S (small) / M (medium) / L (large). Status: `Not started`.

---

## Task T1: Author the harness contract (`.harness/contract.yml`)

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** none
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Create `.harness/contract.yml` as the committed, data-driven declaration of the verb surface
per CORE-COMPONENT-0003 Interfaces and Rule R8. It MUST declare `version`, `entrypoint`, a
`verbs:` map (one entry per required verb: `help`, `orient`, `doctor`, `lint`, `test`,
`build`, `boot`, `verify`, `status`, `clean`, `friction add`, `friction list`) with
`maps_to` (`"npm run typecheck"` for `verify`; `null` for `lint`/`test`/`build`/`boot`;
`native`/`null` as appropriate for others), `json`, and `description`; plus `evidence:`
(dir `.harness/evidence`, format `json`) and `friction:` (path `.harness/friction.jsonl`,
the verbatim KEY_QUESTION). Only `verify` maps to `npm run typecheck`; `lint`/`build` MUST
NOT alias it (ADR-0003 §5).

### Acceptance Criteria
- [ ] `.harness/contract.yml` exists and is valid YAML.
- [ ] Every one of the 12 required verbs has a `verbs:` entry.
- [ ] `verify.maps_to == "npm run typecheck"`; `lint`, `test`, `build`, `boot` have
  `maps_to: null`; no verb other than `verify` maps to `npm run typecheck`.
- [ ] `evidence.dir == ".harness/evidence"` and `friction.path == ".harness/friction.jsonl"`.
- [ ] `friction.key_question` equals the KEY_QUESTION verbatim.
- [ ] No build-system or new-tooling command is introduced (ADR-0002 honoured).

### Test Coverage
- **TEST-01** (contract schema validation) — required.
- Static review that `maps_to` values match the ADR-0003 §5 matrix.

---

## Task T2: Implement the `./harness` CLI core and informational verbs

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Create the executable `./harness` as a portable POSIX shell script (CC-0003 R12; ADR-0003
§11) with a verb dispatcher, global `--json` flag handling, the verdict + exit-code contract
(CC-0003 R2/R3), and the informational verbs: `help` (lists supported verbs; human output),
`orient` (repo orientation: stack, entry point `npm install`, contract summary),
`status` (contract + last evidence summary), and `doctor` (Node version vs `.nvmrc`/`engines`
and `node_modules` presence → `pass` or `degraded`). `orient`, `doctor`, and `status` MUST
support `--json` emitting the CC-0003 schema (required keys `harness_version`, `verb`,
`verdict`, `timestamp`). Reads verb metadata from `.harness/contract.yml`. `chmod +x`.

### Acceptance Criteria
- [ ] `./harness` is executable and runs under POSIX `sh` with no new runtime dependency.
- [ ] `./harness help` lists all 12 verbs and exits 0.
- [ ] `./harness orient` and `./harness orient --json` succeed and exit 0; JSON includes the
  required keys and a `verdict`.
- [ ] `./harness doctor` returns `pass` (or `degraded` with friction) and exit 0.
- [ ] `./harness status` reports contract + last-evidence state and exits 0.
- [ ] Unknown/invalid verb prints usage and exits non-zero.
- [ ] Verdict + exit-code contract holds: only `fail` exits non-zero.

### Test Coverage
- **TEST-02** (help + orient human/JSON), **TEST-03** (doctor verdict), **TEST-15**
  (portability under `sh`), **TEST-10** (exit-code contract) — all required.

---

## Task T3: Implement `verify` wrapping `npm run typecheck` with evidence

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Implement `verify` to wrap `npm run typecheck` (the sole real command) plus the `doctor`
env check, apply the aggregation policy (CC-0003 R6: `fail` if any check fails; else
`degraded` if any capability is `unknown`/`degraded`; else `pass`), and write a timestamped
JSON evidence record under `.harness/evidence/` on every run (R5). In the Issue #4 state the
overall verdict is `degraded` (typecheck `pass`; `test`/`lint`/`build` `unknown`). Support
`--json` with a `checks[]` array and an `evidence` path (R7). Exit 0 for `degraded`
(R3).

### Acceptance Criteria
- [ ] `./harness verify` runs `npm run typecheck` (does not reimplement it) and returns
  overall verdict `degraded` when typecheck passes, exiting 0.
- [ ] `./harness verify --json` emits valid schema: `harness_version`, `verb`, `verdict`,
  `timestamp`, `checks[]` (including the typecheck check with its own verdict), and an
  `evidence` path.
- [ ] A new evidence file appears under `.harness/evidence/` after each run.
- [ ] If `npm run typecheck` fails, overall verdict is `fail` and exit is non-zero.
- [ ] A friction entry records that `test`/`lint`/`build` are `unknown` (drives the
  `degraded` aggregate).

### Test Coverage
- **TEST-04** (verify wraps typecheck + evidence + degraded + exit 0), **TEST-05**
  (verify `--json` schema), **TEST-10** (fail → non-zero via simulated failing typecheck) —
  all required.

---

## Task T4: Implement honest `unknown`/`degraded` verbs (`lint`, `test`, `build`, `boot`, `clean`)

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T2, T5
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Implement the verbs that have no backing command today so they report honestly (ADR-0003 §5;
CC-0003 R2/R4): `lint`, `test`, `build`, `boot` → `unknown`; `clean` → `degraded`
(non-destructive: may remove only harness-owned ephemeral artifacts such as stale evidence;
MUST NOT delete `node_modules`). None may fake success or alias `tsc`. Each MUST support
`--json` and, on the `unknown`/`degraded` verdict, ensure a friction entry exists answering
the KEY_QUESTION. All exit 0 (R3).

### Acceptance Criteria
- [ ] `./harness lint|test|build|boot` each return `unknown` and exit 0.
- [ ] `./harness clean` returns `degraded`, exits 0, and does NOT remove `node_modules`.
- [ ] None of these verbs invoke `tsc`/`npm run typecheck` (no aliasing).
- [ ] Each verb's `--json` conforms to the CC-0003 schema.
- [ ] Invoking each verb results in a corresponding friction entry answering the KEY_QUESTION.

### Test Coverage
- **TEST-06** (unknown verbs → unknown + exit 0 + friction), **TEST-07** (clean degraded +
  non-destructive) — required.

---

## Task T5: Implement the friction subsystem and seed `.harness/friction.jsonl`

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Implement `friction add` (append a JSONL record) and `friction list` (read/emit records,
`--json` supported), using the CC-0003 friction record schema (required fields `ts`, `verb`,
`key_question`, `inference`, `proof_gap`, `suggested_closure`). Seed
`.harness/friction.jsonl` with one entry per capability gap in the Issue #4 baseline —
`lint`, `test`, `build`, `boot`, `clean`, and the `verify` degraded aggregate — each
answering the KEY_QUESTION verbatim and naming a `suggested_closure` (e.g. "Issue #5 wires
this verb in contract.yml"). The seed log is committed (R13).

### Acceptance Criteria
- [ ] `./harness friction add ...` appends exactly one valid JSONL line with all required
  fields, `key_question` verbatim.
- [ ] `./harness friction list` and `--json` read back all entries.
- [ ] Seed `.harness/friction.jsonl` contains ≥1 entry per gap: `lint`, `test`, `build`,
  `boot`, `clean`, `verify` (degraded).
- [ ] Every seed entry's `key_question` equals the KEY_QUESTION verbatim and has a
  `suggested_closure`.
- [ ] `friction add`/`friction list` return `pass` and exit 0.

### Test Coverage
- **TEST-08** (friction add/list round-trip + schema), **TEST-09** (seed entries cover every
  gap and answer KEY_QUESTION) — required.

---

## Task T6: Author `.harness/README.md`

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T2, T3, T4, T5
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Write `.harness/README.md` documenting the single entry point (`./harness`), each verb and
its current verdict, the verdict semantics + exit-code contract, the `--json` contract, the
evidence and friction conventions, and the KEY_QUESTION. Make explicit that `unknown`/
`degraded` are honest, expected states in the Issue #4 baseline (not defects) and how later
stories (#5/#6) move verbs to `pass` by editing `contract.yml`. This satisfies the issue AC
"supported human and agent workflows are documented".

### Acceptance Criteria
- [ ] `.harness/README.md` exists and documents all 12 verbs with their current verdicts.
- [ ] It states the exit-code contract and that `unknown`/`degraded` are expected, not
  failures.
- [ ] It documents the KEY_QUESTION and the friction/evidence locations.
- [ ] It names `./harness` as the single documented entry point.

### Test Coverage
- **TEST-11** (documentation completeness review), **TEST-14** (acceptance-criteria
  end-to-end includes the "documented workflows" AC) — required.

---

## Task T7: Idempotent harness-usage updates to `AGENTS.md` and all agent definitions

- **Status:** Not started
- **Complexity:** L
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Insert a single marker-delimited harness-usage block (`<!-- HARNESS:BEGIN -->` …
`<!-- HARNESS:END -->`) into `AGENTS.md` and each of the 16 `.github/agents/*.agent.md`
files, carrying the `AGENT_HARNESS_RULES` (agents MUST prefer `./harness`; MAY bypass only
when a verb is missing/`unknown`/`degraded`; MUST log gaps via `./harness friction add`).
The edit MUST be idempotent (CC-0003 R10): re-running replaces only content between the
markers, never duplicates the block, never alters content outside the markers, and preserves
each agent's existing behaviour. Be careful with pipeline agent files (`ship`,
`rpiv-*`) so the in-flight pipeline is not disrupted (research Risk 8).

### Acceptance Criteria
- [ ] `AGENTS.md` and all 16 `.github/agents/*.agent.md` each contain exactly one
  `<!-- HARNESS:BEGIN -->`/`<!-- HARNESS:END -->` block.
- [ ] Running the update twice yields byte-identical files (idempotent; no duplicate blocks).
- [ ] No content outside the markers is modified; each agent's existing frontmatter and
  instructions are preserved.
- [ ] The block content states the four harness-usage rules including the friction-on-bypass
  rule.

### Test Coverage
- **TEST-12** (all 17 surfaces carry exactly one block), **TEST-13** (idempotency: re-run →
  no diff; behaviour-preservation) — required.

---

## Task T8: Wire verification config and VCS policy

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T3
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003

### Description
Create `.github/soft-factory/verification.yml` declaring `./harness verify` as the canonical
verification command (ADR-0003 §13) so the Verify stage is deterministic and routes through
the single operating surface (the exit-code contract keeps `degraded` non-blocking). Apply
the CC-0003 R13 VCS policy: add `.harness/evidence/.gitkeep`; update `.gitignore` to ignore
`.harness/evidence/*` while keeping `.gitkeep`; ensure `contract.yml`, `README.md`, and
`friction.jsonl` remain tracked.

### Acceptance Criteria
- [ ] `.github/soft-factory/verification.yml` exists and its verification step runs
  `./harness verify`.
- [ ] `.gitignore` ignores `.harness/evidence/` run output but not `.harness/evidence/.gitkeep`.
- [ ] `contract.yml`, `README.md`, `friction.jsonl` are tracked; ephemeral evidence is not.
- [ ] `./harness verify` invoked via the config exits 0 (verdict `degraded`).

### Test Coverage
- **TEST-16** (verification.yml + gitignore policy) — required.

---

## Task T9: End-to-end verification and evidence capture

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1–T8
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003, CORE-COMPONENT-0002

### Description
Run the harness end-to-end and confirm the whole contract: `./harness verify --json` and
`./harness orient` succeed and exit 0 (the exact `pr-review-complement` invocations); the
5 issue acceptance criteria are satisfied by the delivered harness; evidence is written; the
seed friction log is present. The commit(s) delivering the harness follow CORE-COMPONENT-0002
(Conventional Commits + `Co-authored-by`). Record a short implementation note under
`project/issues/4/implementation/README.md`.

### Acceptance Criteria
- [ ] `./harness verify --json` returns verdict `degraded`, valid schema, exit 0.
- [ ] `./harness orient` succeeds and exits 0.
- [ ] All 5 issue acceptance criteria are demonstrably met (harness exists; wraps existing
  commands; records evidence; workflows documented; single documented entry point).
- [ ] An evidence file exists under `.harness/evidence/` from the final verify run.
- [ ] Harness delivery commit(s) follow Conventional Commits with a `Co-authored-by` trailer.

### Test Coverage
- **TEST-14** (acceptance-criteria end-to-end), **TEST-17** (pr-review-complement contract:
  `orient` + `verify --json` exit 0) — required.
