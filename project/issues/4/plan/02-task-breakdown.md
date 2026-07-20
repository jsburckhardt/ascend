# Task Breakdown: Issue #4 — Engineering harness CLI

Implementation is executed by `rpiv-implementer` (invoking the `harness-cli-it` agent). Each
task maps onto that agent's `REQUIRED_OUTPUTS` / `REQUIRED_VERBS`. Every task lists
acceptance criteria, explicit test coverage (see `03-test-plan.md`), and the ADRs /
core-components it must honour.

**Legend** — Complexity: S (small) / M (medium) / L (large). Status: `Not started`.

> **Review Cycle 1 remediation (2026-07-20).** Independent review returned REQUEST_CHANGES
> with one **blocking** finding (F-01 — the harness is not data-driven per CORE-COMPONENT-0003
> R6/R8) and four **major** findings (F-02 human verdicts, F-03 Node range, F-04 evidence
> reliability, F-05 POSIX JSON escaping), and noted no durable automated regression suite
> exists. Tasks **T10–T16** below are the remediation set; they refine the harness to satisfy
> the clarified CORE-COMPONENT-0003 rules **R2, R6, R8, R12, R14, R15, R16** and ADR-0003
> §5–§7. T1 and T3 acceptance criteria are amended in place to match. All changes keep
> ADR-0002 intact (wrap existing commands; no new build system; dependency-light POSIX shell).

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
NOT alias it (ADR-0003 §5). The `verify` entry MUST also declare an `aggregate:` list of
member verbs (`lint`, `test`, `build`, `doctor`) whose verdicts the `verify` verdict folds
over (CC-0003 R6), and `clean` MUST carry a `maps_to` (`native` today) so it can be wired by
data later (CC-0003 R8).

### Acceptance Criteria
- [ ] `.harness/contract.yml` exists and is valid YAML.
- [ ] Every one of the 12 required verbs has a `verbs:` entry.
- [ ] `verify.maps_to == "npm run typecheck"`; `lint`, `test`, `build`, `boot` have
  `maps_to: null`; no verb other than `verify` maps to `npm run typecheck`.
- [ ] `verify.aggregate == [lint, test, build, doctor]` (member checks for the aggregate,
  CC-0003 R6); `clean.maps_to` is present (`native`) so `clean` is data-wireable (CC-0003 R8).
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
- [ ] **Refined by Review Cycle 1:** the aggregate verdict and evidence handling MUST follow
  T11 (deterministic data-driven aggregate over `verify.aggregate` incl. `doctor`, per CC-0003
  R6) and T14 (collision-safe atomic evidence; required evidence-write failure ⇒ `fail`, per
  CC-0003 R14). The hard-coded `degraded`/omitted-`doctor`/second-precision behavior is not
  acceptable.

### Test Coverage
- **TEST-04** (verify wraps typecheck + evidence + degraded + exit 0), **TEST-05**
  (verify `--json` schema incl. `doctor` member), **TEST-10** (fail → non-zero via simulated
  failing typecheck), **TEST-19** (aggregate truth table) — all required.

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

---

# Review Cycle 1 Remediation (Blocking + Major findings)

These tasks resolve the review findings in `project/issues/4/review/00-review.md`. They MUST
be completed before re-running Verify and independent review. Order: T10 → T11 first (F-01
blocking), then T12–T15 (majors, independent), then T16 (durable regression suite covering
all cases).

---

## Task T10: Make verb dispatch and command wiring data-driven

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2, T3, T4
- **Related ADRs:** ADR-0003 (§5, §9), ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R8)

### Description
Resolves **F-01 (blocking)** for command wiring. Remove every hard-coded verb→command string
from `./harness`. Each wrapped command MUST be resolved from that verb's `maps_to` in
`.harness/contract.yml` at runtime. `clean` MUST honor `clean.maps_to`: a command string is
wrapped (→ `pass`/`fail`); `native` prunes only harness-owned evidence (→ `degraded`); `null`
→ `unknown` + friction. A structural `case` that routes a verb name to its handler function is
allowed (dispatch mechanics), but the command executed and the aggregate membership are data,
not code. After this task, editing `maps_to`/`verify.aggregate` alone (no `./harness` edit)
rewires behavior.

### Acceptance Criteria
- [ ] No hard-coded command string exists in `./harness` for any verb; every wrapped command
  is read from `maps_to` (grep review + test).
- [ ] `clean` runs a mapped command when `clean.maps_to` is a command, prunes only
  harness-owned evidence when `native`, and returns `unknown` when `null` — it no longer
  ignores its contract mapping.
- [ ] Setting a temporary `clean.maps_to` command causes `clean` to wrap it (proven by
  TEST-18) with no change to `./harness`.
- [ ] `node_modules` and project sources are never deleted by `clean` (regardless of mapping).

### Test Coverage
- **TEST-18** (contract-driven rewiring, data-only), **TEST-07** (clean non-destructive,
  now honoring `maps_to`) — required.

---

## Task T11: Implement the deterministic, data-driven `verify` aggregate (incl. `doctor`)

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T3, T10
- **Related ADRs:** ADR-0003 (§6)
- **Related Core-Components:** CORE-COMPONENT-0003 (R6)

### Description
Resolves the core of **F-01 (blocking)**. `verify` MUST iterate the contract-declared member
set — its own `maps_to` surfaced as the `typecheck` check, plus every verb in
`verify.aggregate` (`lint`, `test`, `build`, `doctor`) — resolving each member's verdict from
contract data at runtime (never a hard-coded list). It MUST derive the overall verdict via the
fixed total function, evaluated in order:

1. any member `fail` ⇒ **fail**
2. else all members `pass` ⇒ **pass**
3. else all members `unknown` ⇒ **unknown**
4. else (mix, no fail) ⇒ **degraded**

`doctor` participates and, emitting only `pass`/`degraded`, can push the aggregate to
`degraded` but never `fail`. The JSON `checks[]` MUST list every member with its resolved
verdict. The aggregate MUST be able to reach `pass` once #5 populates `lint`/`test`/`build`
`maps_to`, with no code change.

### Acceptance Criteria
- [ ] The overall verdict is computed by the documented total function over member verdicts
  (no hard-coded `degraded`).
- [ ] `verify --json` `checks[]` includes `typecheck`, `lint`, `test`, `build`, and `doctor`,
  each with its resolved verdict.
- [ ] Issue #4 baseline yields `degraded` (exit 0); a simulated all-`pass` member set (temp
  contract) yields `pass` (exit 0) with no `./harness` edit.
- [ ] A simulated failing member yields overall `fail` (exit non-zero); an all-`unknown`
  member set yields `unknown`.
- [ ] A `degraded` `doctor` pushes the aggregate to `degraded`, never `fail`.

### Test Coverage
- **TEST-19** (aggregate truth table), **TEST-18** (rewiring to `pass`), **TEST-05** (schema
  incl. `doctor`) — required.

---

## Task T12: Emit exactly one overall verdict line from every human verb form

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T2, T5
- **Related ADRs:** ADR-0003
- **Related Core-Components:** CORE-COMPONENT-0003 (R2)

### Description
Resolves **F-02**. Every verb's human/default output MUST end with exactly one terminal
`Verdict: <value>` line — including `help` (`Verdict: pass`) and `friction list`
(`Verdict: pass`), which currently emit none. Audit all 12 verbs so none is missing or
duplicates the line. The `--json` form keeps the `verdict` key.

### Acceptance Criteria
- [ ] `./harness help` human output ends with exactly one `Verdict: pass` line.
- [ ] `./harness friction list` human output ends with exactly one `Verdict: pass` line.
- [ ] Every other human verb prints exactly one terminal `Verdict:` line (no zero, no
  duplicates).
- [ ] `--json` responses still carry the `verdict` key unchanged.

### Test Coverage
- **TEST-20** (one `Verdict:` line per human verb) — required.

---

## Task T13: Validate the full supported Node range in `doctor`

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T2
- **Related ADRs:** ADR-0003 (§5)
- **Related Core-Components:** CORE-COMPONENT-0003 (R15)

### Description
Resolves **F-03**. `doctor` MUST validate the COMPLETE supported Node range derived from
`package.json` `engines.node` (`>=22 <23`) cross-checked with `.nvmrc` (pinned major `22`) —
i.e. exactly major `22`. Both a below-range Node (`<22`) and an above-range Node (`>=23`) MUST
report `degraded` (with friction), never `pass`. The current `>= 22` check that passes Node 23
is not acceptable.

### Acceptance Criteria
- [ ] Node major `22` → node check ok; `doctor` `pass` (with `node_modules` present).
- [ ] Node major `21` → `degraded` (below range), friction recorded, exit 0.
- [ ] Node major `23` → `degraded` (above range), friction recorded, exit 0.
- [ ] `doctor` never reports `pass` for a Node major outside `22`.

### Test Coverage
- **TEST-21** (Node-range boundaries: 21/22/23) — required.

---

## Task T14: Reliable, collision-safe, atomic evidence & friction persistence

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T3, T5
- **Related ADRs:** ADR-0003 (§7)
- **Related Core-Components:** CORE-COMPONENT-0003 (R14)

### Description
Resolves **F-04**. Evidence filenames MUST include a uniqueness component beyond second
precision (e.g. process id plus a random/monotonic suffix) so overlapping same-second runs
never overwrite one another. Evidence MUST be written atomically (temp file on the same
filesystem, then `mv`/rename into place) — no truncation, no partial records. Directory
creation, evidence writes, and friction appends MUST be checked. When a REQUIRED record cannot
be stored — `verify` evidence, a `friction add` append, or the R4-mandated auto-friction entry
for an `unknown`/`degraded` verdict — the verb MUST return `fail` and exit non-zero (never a
masked `pass`/`degraded`/`unknown`). `ensure_friction` dedupe still applies (no attempted
write when an entry already exists ⇒ no spurious failure).

### Acceptance Criteria
- [ ] Two `verify` runs within the same second produce two distinct evidence files; neither is
  overwritten.
- [ ] Evidence is written atomically (temp + rename); no partial/truncated file is ever
  observable.
- [ ] With an unwritable evidence dir/file, `verify` returns `fail` and exits non-zero.
- [ ] With an unwritable friction path, `friction add` (and a required auto-friction write)
  returns `fail` and exits non-zero.
- [ ] The healthy happy path is unchanged (`verify` `degraded`, exit 0; `friction add` `pass`,
  exit 0).

### Test Coverage
- **TEST-22** (collision-safety + atomicity), **TEST-23** (required-persistence failure ⇒
  `fail`) — required.

---

## Task T15: POSIX-only JSON escaping and non-GNU portability

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T2, T5
- **Related ADRs:** ADR-0003 (§11)
- **Related Core-Components:** CORE-COMPONENT-0003 (R12)

### Description
Resolves **F-05**. Replace the GNU-only sed escaping (`:a;N;$!ba;s/\n/\\n/g`, plus `\n`
newline matching) with POSIX-defined escaping (e.g. an `awk` routine) that correctly encodes
`"`, `\`, tab, newline, and other control characters. No GNU-only sed/awk construct may remain.
Portability MUST be validated on a non-GNU userland (busybox `sh` + busybox `sed`/`awk`) using
multiline and control-character friction inputs, proving the emitted JSON is valid.

### Acceptance Criteria
- [ ] `json_escape` (and any JSON emission) uses only POSIX constructs; the `:a;N;$!ba` loop
  and `\n`-regex idioms are gone (grep review + test).
- [ ] Multiline and control-character friction input produces valid, parseable JSON.
- [ ] `friction list --json` and `verify --json` parse correctly under a busybox `sed`/`awk`
  userland.

### Test Coverage
- **TEST-24** (non-GNU portability of JSON escaping) — required.

---

## Task T16: Durable executable regression suite

- **Status:** Not started
- **Complexity:** L
- **Dependencies:** T10, T11, T12, T13, T14, T15 (covers T1–T9 behaviors too)
- **Related ADRs:** ADR-0003, ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (R16)

### Description
Resolves the reviewer's "no durable automated regression suite exists" gap. Add a
dependency-light POSIX shell regression suite under `tests/harness/` (e.g.
`tests/harness/run.sh`) that executes all 17 planned tests (TEST-01…TEST-17) plus the new
Review-Cycle-1 cases (TEST-18…TEST-24). The suite MUST run non-interactively, print a summary
and an overall verdict, exit non-zero on any failure, and clean up every temp artifact it
creates (scratch type errors, temp contracts, stub `node`, dummy evidence, permission changes)
so the working tree is left clean. It adds no new runtime dependency (ADR-0002; CC-0003 R12).
It MAY later be referenced from `.github/soft-factory/verification.yml`, but the canonical
gate remains `./harness verify`.

### Acceptance Criteria
- [ ] `tests/harness/run.sh` exists, is executable, and runs under POSIX `sh`.
- [ ] It exercises every case TEST-01…TEST-24 (any case that cannot be automated is documented
  inline as manual with rationale).
- [ ] It exits 0 on a conformant harness and non-zero when any regression is present
  (spot-verified by injecting a temporary regression).
- [ ] After a run, `git status --porcelain` shows no leftover scratch/evidence/contract/stub
  files (tree is clean).
- [ ] The suite adds no new runtime dependency.

### Test Coverage
- **TEST-25** (regression suite runs green, is durable, leaves tree clean) — required.
