# Research Brief: Generate the engineering harness CLI via the harness-cli-it agent

## GitHub Issue
- **Issue:** #4
- **Title:** Generate the engineering harness CLI via the harness-cli-it agent

## Scope Classification
- **Scope Type:** architecture_decision

**Rationale.** On the surface this reads like tooling plumbing (an `issue`-level chore:
"run an agent, get a script"). It is not. The `harness-cli-it` agent
(`.github/agents/harness-cli-it.agent.md`) is mandated to make `./harness` **the supported
operating surface for humans and agents** and to rewrite `AGENTS.md` and **every**
`.github/agents/*.agent.md` so that agents MUST prefer `./harness` over calling wrapped
commands directly. It also introduces a durable behavioural contract at
`.harness/contract.yml` plus a verdict model (`pass`/`fail`/`degraded`/`unknown`), an
evidence store (`.harness/evidence/`), and a friction log (`.harness/friction.jsonl`).
Changing how every contributor and every agent operates the repository, and adding a
machine-readable contract that other skills already depend on (the `pr-review-complement`
skill already branches on `if [ -x ./harness ]` and runs `./harness verify --json`), is a
foundational, cross-cutting, hard-to-reverse decision — exactly what AGENTS.md says belongs
in an ADR, and exactly the precedent set by Issue #3 (classified `architecture_decision`
because it materialised a foundational cross-cutting decision).

Because `scope_type` must be exactly one value and an ADR is the primary gating artifact
(the *adoption* decision), the scope is **architecture_decision**. However, this issue also
warrants a **core-component** for the reusable harness contract/behaviour: see
[Proposed ADRs](#proposed-adrs) and [Proposed Core-Components](#proposed-core-components).
**This brief proposes those artifacts; it does not make the decision.** The Plan stage /
decider owns the ADR, the core-component, and their `DECISION-LOG.md` entries.

## Problem Statement

Contributors and agents currently operate the Ascend repository through ad-hoc, memorised,
directly-invoked commands. Today there is effectively **one** verifiable command —
`npm run typecheck` (`tsc --noEmit`) — plus the documented setup step `npm install`
(ADR-0002). There is:

- no single, discoverable entry point that lists the supported workflows;
- no test runner, linter, build/emit step, or dev/boot command yet (those arrive in later
  Prototype 0 stories, notably #5 dev/validation and #6 shell+health);
- no machine-readable statement of "what this repo supports and how to run it";
- no evidence trail proving a command actually ran and what its result was; and
- no structured place to record the gap between "what an agent had to infer" and "what the
  repo should have proved."

Issue #4 closes that gap by running the `harness-cli-it` agent to generate a **repo-local
engineering harness CLI** (`./harness`) that **wraps** (does not reimplement) Ascend's
existing commands, records evidence for each run, exposes the supported human and agent
workflows behind a stable verb surface, and is invocable from a single documented entry
point. The harness must **preserve existing project behaviour** and **must not invent a new
build system** — it is a thin, honest façade over what already exists, reporting `unknown`
or `degraded` where a capability is not yet present rather than fabricating one.

Sequencing (per `.github/fleet/sketch.md`): #3 bootstrap → **#4 harness** → #5
dev/validation → #6 shell+health. #4 runs **after** bootstrap so real commands exist to
wrap, and **before** the dev/validation story so those commands, once created, are wired
into the harness. The harness therefore starts life mostly wrapping `typecheck`/`install`
and honestly reporting `unknown` for verbs whose backing commands do not exist yet.

The agent's guiding question — **KEY_QUESTION: "What did the agent have to infer that the
harness should have proved?"** — is the core acceptance lens: every inference the agent had
to make (e.g., "there is no test command," "typecheck is the only static check") must be
captured as a friction entry so the missing proof is visible and later closable.

## Existing Context

### Repository state (inspected)
- **Stack (ADR-0002):** TypeScript + Node.js 22 LTS + npm. `package.json`, `package-lock.json`,
  `tsconfig.json`, `.nvmrc` present; application source under `src/` (only
  `src/placeholder.ts`, `export {};`).
- **`package.json` scripts:** exactly one — `"typecheck": "tsc --noEmit"`. `typescript` is
  the only devDependency. No `test`, `lint`, `build`, `dev`, `start`, or `clean` script.
- **`tsconfig.json`:** `noEmit: true`, `strict`, `rootDir: src`. There is deliberately **no
  build/emit step** — `tsc` is used only as a typecheck.
- **Documented setup entry point (ADR-0002 / README):** `npm install` from repo root, with
  Node pinned by `.nvmrc` (`22`) and `engines.node` `>=22 <23`.
- **No `./harness`, no `.harness/`, no `.github/soft-factory/`, no `verification.yml`** exist
  yet (confirmed on disk). This is a from-scratch generation, not a repair/update run.
- **DETECTION_FILES present** (from the agent's list): `package.json`, `package-lock.json`,
  `.devcontainer/devcontainer.json`. **Absent:** `Makefile`, `justfile` (though the `just`
  devcontainer feature is installed, there is no `justfile`), `Taskfile.yml`, `pyproject.toml`,
  `go.mod`, `Cargo.toml`, and any `.github/workflows/*.yml` (there is no `workflows/` dir).
- **Devcontainer** (`.devcontainer/devcontainer.json`): base Ubuntu image; features include
  `github-cli`, `copilot-cli`, `just`, `docker-outside-of-docker`; `postStartCommand` starts
  a tmux session; `postCreateCommand` is commented out. No Node/Python feature is enabled by
  default, so the harness cannot assume a runtime beyond what the checkout provides.
- **Existing harness assumptions in the repo:** `.github/skills/pr-review-complement/`
  already conditionally depends on `./harness` — it runs `./harness orient` before edits
  when the harness exists and `./harness verify --json` for verification, otherwise falling
  back to the repo's configured lint/typecheck/test/build. This confirms the harness
  contract (`orient`, `verify --json`, verdicts) is an intended, already-referenced
  integration surface, and that the harness must degrade gracefully when a capability is
  missing.

### Command-detection landscape (what the harness can honestly wrap)
| Verb | Backing command available today | Expected initial verdict |
|------|--------------------------------|--------------------------|
| `help` / `orient` / `status` | repo metadata, README, structure | `pass` (informational) |
| `doctor` | Node version vs `.nvmrc`/`engines`, `node_modules` presence | `pass`/`degraded` |
| `lint` | none (no ESLint/Prettier); `tsc --noEmit` is the closest static check | `unknown` (or map to typecheck, flagged as friction) |
| `test` | **none** — no test runner/script, no test files | `unknown` |
| `build` | **none** — `tsc` is `noEmit`; nothing emits artifacts | `unknown`/`degraded` |
| `boot` | no dev/serve app yet; `npm install` is the env-prep step | `unknown` (or wrap `npm install` as env bootstrap, flagged) |
| `verify` | can aggregate `npm run typecheck` (+ install check) | `pass` if typecheck passes; `degraded` because test/lint/build are `unknown` |
| `clean` | no clean script; could remove `node_modules`/artifacts | `degraded`/`unknown` |
| `friction add` / `friction list` | harness-native (writes/reads `.harness/friction.jsonl`) | `pass` |

The single genuinely wrappable project command today is **`npm run typecheck`**; the single
documented setup command is **`npm install`**. Everything else is honestly `unknown` until
Issue #5 supplies dev/validation commands. This is expected and correct behaviour, not a
defect — the harness must report the gap, not paper over it.

### Existing ADRs (`project/architecture/ADR/`)
- **ADR-0001** — template (read-only; do not edit).
- **ADR-0002 — Ascend baseline technology stack and repository layout** (Accepted). Fixes the
  stack (TS/Node 22/npm), the minimal manifest, the `src/` layout, and — most relevant here —
  establishes `npm install` as the **single documented setup entry point** and forbids
  speculative frameworks / new build pipelines "beyond `tsc`". The harness must respect this:
  it wraps `npm install`/`npm run typecheck`, and must **not** introduce a build system.

### Existing Core-Components (`project/architecture/core-components/`)
- **CORE-COMPONENT-0001** — template (read-only).
- **CORE-COMPONENT-0002 — Commit Standards** (Adopted). Conventional Commits v1.0.0 on
  commits and PR titles; `Co-authored-by` trailer on AI-authored commits. Governs how the
  harness-related commit(s) are authored; no change required, but relevant to the Verify stage.

### Decision Log (`project/architecture/ADR/DECISION-LOG.md`)
Records ADR-0002 and CORE-COMPONENT-0002 and their derived decisions. **Next free IDs:**
ADR-**0003** and CORE-COMPONENT-**0003**. Any new ADR/core-component proposed below must be
registered here by the Plan stage.

### PRD constraints
- **§5.5 Start with prototypes** and **§28.7 Avoid speculative frameworks** — the harness
  must stay minimal, dependency-light, and reversible; no orchestration framework, no new
  build system, no speculative verbs backed by fabricated commands.

## Proposed ADRs

**ADRs are REQUIRED for this issue.**

Adopting `./harness` as the mandatory operating surface for humans and agents — and rewriting
`AGENTS.md` and every agent definition to require it — is a foundational, cross-cutting,
hard-to-reverse decision that must be recorded and reviewable rather than made implicitly by
running an agent. Proposed:

1. **ADR-0003 — Adopt a repo-local engineering harness (`./harness`) as the operating surface
   for humans and agents**
   - Decides that `./harness` is the first-choice interface for supported workflows; that it
     **wraps and never reimplements** existing commands; that it must not introduce a new build
     system (honouring ADR-0002 / PRD §28.7); that verbs return one of
     `pass`/`fail`/`degraded`/`unknown`; that `verify` writes evidence under
     `.harness/evidence/`; that a friction log captures agent inferences (KEY_QUESTION); and
     that `AGENTS.md` and `.github/agents/*.agent.md` are updated (idempotently) to require
     harness usage while preserving each agent's behaviour.
   - Should weigh alternatives explicitly (e.g., `just`/`Makefile`/`npm scripts` only, or no
     harness) and record why a repo-local wrapper with a contract + evidence is chosen.
   - References ADR-0002 (stack, single entry point, no build system) and the already-present
     `pr-review-complement` skill dependency on `./harness`.

> This brief **proposes** ADR-0003 and its subject; it does **not** decide adoption. The Plan
> stage / decider owns the decision and the `DECISION-LOG.md` entry.

## Proposed Core-Components

**Core-components are REQUIRED for this issue.**

Beyond the *decision to adopt* a harness (the ADR), the harness defines a **reusable,
cross-cutting behavioural contract** that other agents and skills consume and that must remain
stable as later stories wire in real commands. That contract is precisely the kind of shared,
global behaviour core-components exist to capture. Proposed:

1. **CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction
   conventions**
   - Defines the stable verb surface (`help`, `orient`, `doctor`, `lint`, `test`, `build`,
     `boot`, `verify`, `status`, `clean`, `friction add`, `friction list`); the verdict
     semantics (`pass`/`fail`/`degraded`/`unknown`) and when each applies; the `--json` output
     expectation for machine consumers; the `.harness/contract.yml` schema (what it declares and
     how commands map to wrapped project commands); the evidence file conventions under
     `.harness/evidence/`; and the `.harness/friction.jsonl` schema that answers KEY_QUESTION.
   - Records the interoperability rule (already relied on by `pr-review-complement`): agents
     MUST prefer `./harness` verbs and MAY only bypass to direct commands when a verb is
     missing or reports `unknown`/`degraded`, logging the gap via `./harness friction add`.
   - References ADR-0003 (motivating decision) and CORE-COMPONENT-0002 (commit standards for
     harness-related commits).

> This brief **proposes** CORE-COMPONENT-0003 and its subject; it does **not** author the
> contract. The Plan stage owns the core-component and the `DECISION-LOG.md` entry.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [x] A repo-local harness CLI exists, generated via the `harness-cli-it` agent
- [x] The harness wraps the project's existing commands rather than reimplementing them
- [x] The harness records evidence for the commands it runs
- [x] Supported human and agent workflows are documented
- [x] The harness is invocable from a documented single entry point
<!-- ACCEPTANCE_CRITERIA_END -->

> Note: the criteria appear pre-checked (`[x]`) in the issue body; they are reproduced
> **verbatim** above. The Verify stage owns re-validating and (re)setting these against the
> delivered harness — being pre-checked in the issue does not constitute verification.

## Risks and Open Questions

### Risks
1. **Harness scope creep beyond wrapping existing commands** (the issue's own stated risk and
   the agent's `MUST NOT invent a new build system`). The harness must stay a thin façade over
   `npm install`/`npm run typecheck`; it must not add ESLint, a bundler, a test framework, a
   build/emit step, or a dev server — those belong to later stories (#5, #6) or their own ADRs.
2. **`unknown`/`degraded` verdicts read as failure.** With only `typecheck` present, `test`,
   `lint`, `build`, `boot`, and `clean` will legitimately report `unknown`/`degraded`. This is
   correct, honest behaviour, but risks being misread as a broken harness. The contract/README
   must make the semantics explicit, and `verify` should still yield a usable overall verdict
   (likely `degraded`, or `pass` scoped to available capabilities) rather than `fail`.
3. **Dependency-light constraint vs. portability.** The agent `SHOULD` keep the harness
   dependency-light and prefer portable shell or existing repo runtime. The devcontainer does
   not guarantee Node at container build time, and `just` exists as a feature but there is no
   `justfile`. Choice of implementation language (POSIX shell vs. Node) is an implementation
   detail for Plan/Implement, constrained to add **no** new runtime dependency.
4. **Non-idempotent agent-definition edits.** The agent must rewrite `AGENTS.md` and **every**
   `.github/agents/*.agent.md` (16 files) to require harness usage, idempotently and without
   altering each agent's existing behaviour. Poorly-scoped edits could corrupt agent specs,
   duplicate instruction blocks on re-runs, or change agent semantics. Re-runnability and
   behaviour-preservation are hard requirements.
5. **Contract drift as later stories add commands.** #5 introduces dev/validation commands the
   harness must then wrap. The contract must be shaped so those verbs move from `unknown` to
   `pass` by editing `.harness/contract.yml`, not by restructuring the harness. Otherwise the
   proposed CORE-COMPONENT-0003 contract becomes churny.
6. **Evidence/friction hygiene & VCS noise.** `.harness/evidence/` and `.harness/friction.jsonl`
   accumulate run artifacts. Whether (and which of) these are committed vs. git-ignored is
   unresolved; uncommitted evidence weakens the audit trail, while committing every run adds
   noise. `.gitignore` currently ignores only `.trees` and `node_modules`.
7. **Consistency with an already-assumed contract.** `pr-review-complement` already calls
   `./harness orient` and `./harness verify --json`; the generated harness must satisfy those
   exact invocations or the skill's harness branch silently misbehaves.
8. **Self-referential dispatch loop.** This RPIV research is itself dispatched by the `ship`
   agent, whose definition will be rewritten to require `./harness`. The Plan/Implement stages
   should ensure edits to pipeline agent files don't disrupt the in-flight pipeline.

### Open Questions (for Plan / decider — not decided here)
1. **Implementation language of `./harness`** — portable POSIX shell vs. Node (the pinned
   runtime) — given the dependency-light `SHOULD` and no guaranteed container-time Node?
2. **`verify` verdict policy** — with only `typecheck` available, should `verify` return `pass`
   (scoped to available checks) or `degraded` (because test/lint/build are `unknown`)? What is
   the exact rule?
3. **Verb-to-command mapping decisions** — should `lint` alias to `tsc --noEmit`, or stay
   `unknown` (with friction)? Should `boot` wrap `npm install`, or stay `unknown` until a real
   dev/boot command exists (#5/#6)? Should `clean` remove `node_modules`?
4. **Evidence & friction VCS policy** — commit `.harness/evidence/` and
   `.harness/friction.jsonl`, ignore them, or commit a seed and ignore run output? Update
   `.gitignore` accordingly?
5. **Contract shape/schema** — the concrete `.harness/contract.yml` structure that lets #5 add
   verbs by data (config) rather than by code change (this is the CORE-COMPONENT-0003 subject).
6. **Agent-file edit strategy** — a single shared, marker-delimited "harness usage" block
   inserted idempotently into all 17 agent surfaces (`AGENTS.md` + 16 `*.agent.md`) vs.
   per-file bespoke edits; how to guarantee re-run idempotency and behaviour preservation?
7. **Interaction with `.github/soft-factory/verification.yml`** — it does not exist. Should the
   harness reference/anticipate it, or ignore it entirely for now?
8. **ADR vs. core-component split** — confirm the division of content between the proposed
   ADR-0003 (the *adoption decision*) and CORE-COMPONENT-0003 (the *contract behaviour*) so
   neither duplicates the other.
