# Research Brief: Generate the engineering harness CLI via the harness-cli-it agent

## GitHub Issue

- **Issue:** #4
- **Title:** Generate the engineering harness CLI via the harness-cli-it agent

## Scope Classification

- **Scope Type:** core_component

**Rationale.** The deliverable of this issue is a *reusable, cross-cutting behavioural
contract*: a single repo-local operating surface (`./harness`) that every contributor —
human or agent — uses to run supported workflows (setup, doctor, lint, test, build,
verify, status, clean) with consistent verdicts, evidence recording, and friction
tracking. Per the repository's own pipeline rules ("You MUST NOT create reusable
cross-cutting behavior outside of a core-component document"), this behaviour must be
captured as a **core-component**. That makes `core_component` the defining scope type.

The issue *also* implies an **architectural decision** — mandating `./harness` as the
first-choice operating surface changes how all work in the repository is executed and is
a foundational, cross-cutting, hard-to-reverse commitment. Because "You MUST NOT create
an architectural decision outside of an ADR document," an **ADR is also required** to
record the adoption decision. Following the precedent set by Issue #3 (which named a
single primary scope_type while acknowledging a second required artifact), this brief
classifies the scope as `core_component` and *additionally* proposes one ADR for the
adoption decision. This brief only **proposes** these artifacts; the Plan stage owns the
decisions and their `DECISION-LOG.md` entries.

## Problem Statement

Contributors and agents currently have no single, supported entry point for running
Ascend's engineering workflows. The only executable project command today is
`npm run typecheck` (declared in `package.json`), and the way to discover it is to read
`package.json` or the README. There is no uniform way to:

- discover which supported workflows exist and what they wrap,
- get a consistent pass / fail / degraded / unknown verdict for any workflow,
- record evidence that a workflow actually ran and what it proved, or
- record the gaps an agent had to *infer* because the repository did not prove something.

As more Prototype 0 stories land (dev/validation commands, a health endpoint, a
`code-server` launcher), the number of loosely-documented commands will grow, and both
humans and agents will re-derive how to run them each time. This issue establishes a
stable operating surface — a repo-local **engineering harness CLI** at `./harness` — that
wraps the project's *existing* commands (never reimplementing them), records evidence for
each run, and documents the supported human and agent workflows. The harness is
explicitly generated using the **`harness-cli-it` agent** per its skill definition.

The change is intentionally minimal and additive. It wraps what exists today and marks
everything else honestly as `unknown` (recording friction) rather than pretending
coverage exists. The dev/validation commands themselves are a *later* story; this harness
wraps them once they exist.

## Existing Context

### Current repository state (inspected)

- **Stack (ADR-0002):** Node.js 22 LTS + TypeScript, npm package manager. Manifest is
  `package.json` + `tsconfig.json`; `.nvmrc` pins Node `22`. Setup entry point is
  `npm install` from the repo root.
- **`package.json`** — the single real command surface: one script, `typecheck`
  (`tsc --noEmit`). No `lint`, `test`, `build`, `clean`, or `boot` scripts exist yet.
  Only dev dependency is `typescript`.
- **`src/`** — holds a placeholder only; no application logic yet.
- **No `Makefile`, `justfile`, `Taskfile.yml`, `.github/workflows/`, `docker-compose.yml`,
  or other command sources** exist. `.devcontainer/devcontainer.json` is present but adds
  no project commands.
- **No `.github/soft-factory/verification.yml`** exists yet (bootstrap did not create one),
  so the RPIV verifier currently auto-detects verification steps. Wiring the harness into a
  verification config is an opportunity but a decision for the Plan stage.
- **`.github/agents/*.agent.md`** — 16 repo-local agent definitions exist and must be
  updated to prefer `./harness` once the harness is configured (a `harness-cli-it`
  requirement).
- **`AGENTS.md`** — the repository-level agent specification; must be updated to require
  `./harness` usage.

### Existing ADRs

- **ADR-0002 — Ascend baseline technology stack and repository layout** (Accepted). Fixes
  the Node/TypeScript/npm stack the harness must wrap and preserve. The harness must not
  invent a new build system or add framework dependencies (honours ADR-0002 minimality).

### Existing Core-Components

- **CORE-COMPONENT-0002 — Commit Standards** (Adopted). Governs how the commits produced
  by this issue must be authored (Conventional Commits + `Co-authored-by`). No change
  required. There is **no** existing core-component describing an operating surface — this
  issue introduces the first one.

### The harness-cli-it agent (the tool this issue mandates)

`.github/agents/harness-cli-it.agent.md` and `.github/skills/harness-cli-it/` define the
exact contract the implementation must satisfy:

- **Required outputs:** `./harness`, `.harness/contract.yml`, `.harness/evidence/`,
  `.harness/friction.jsonl`, `.harness/README.md`, updated `AGENTS.md`, and updated
  `.github/agents/*.agent.md`.
- **Required verbs:** `help`, `orient`, `doctor`, `lint`, `test`, `build`, `boot`,
  `verify`, `status`, `clean`, `friction add`, `friction list`.
- **Verdicts:** every command returns exactly one of `pass`, `fail`, `degraded`, `unknown`.
- **Evidence:** `verify` writes evidence under `.harness/evidence/`.
- **Friction:** each inference is recorded in `.harness/friction.jsonl`, answering
  *"What did the agent have to infer that the harness should have proved?"*
- **Adoption:** `AGENTS.md` and every `.github/agents/*.agent.md` must be updated
  idempotently to require `./harness` as the first-choice operating surface.
- **Constraints:** wrap existing commands, do not invent a build system, keep the
  implementation dependency-light, prefer portable shell, preserve existing behaviour, and
  run `./harness verify` before claiming completion.

### Command mapping implied by the current repo

| Verb | Existing command to wrap | Status if generated today |
|------|--------------------------|---------------------------|
| `help` / `orient` / `status` | none (harness-native) | supported |
| `doctor` | check Node/npm vs `.nvmrc` + `engines` | supported (env probe) |
| `boot` | `npm install` (ADR-0002 setup entry point) | supported (inferable) |
| `lint` | none declared | `unknown` + friction |
| `test` | none declared | `unknown` + friction |
| `build` | none declared (only `tsc --noEmit` typecheck) | `unknown` + friction |
| `typecheck` (extra) | `npm run typecheck` | supported (wrapped) |
| `verify` | coordinate `doctor` + `typecheck` | supported |
| `clean` | none declared | inferable (safe artifact removal) + friction |

## Proposed ADRs

**An ADR is REQUIRED for this issue.**

1. **ADR-0003 — Adopt a repo-local engineering harness as the supported operating surface**
   - Records the decision to introduce `./harness` as the first-choice, mandatory operating
     surface for humans and agents, wrapping existing commands rather than replacing them.
   - Records that the harness is generated and maintained via the `harness-cli-it` agent,
     is dependency-light portable shell, and must preserve existing project behaviour and
     the ADR-0002 stack (no new build system, no framework dependencies).
   - Weighs alternatives (status quo of ad-hoc `npm` scripts; a `Makefile`/`justfile`;
     a Node-based CLI with dependencies) and explains why a dependency-light shell harness
     wrapping npm is chosen.

> This brief **proposes** ADR-0003 and its subject; it does **not** decide it. The Plan
> stage / decider owns the decision and the `DECISION-LOG.md` entry.

## Proposed Core-Components

**A core-component is REQUIRED for this issue.**

1. **CORE-COMPONENT-0003 — Engineering Harness Contract**
   - Defines the cross-cutting behavioural contract of `./harness`: the required verbs, the
     four verdicts, the `--json` output expectation for important verbs, the evidence
     convention under `.harness/evidence/`, and the friction convention in
     `.harness/friction.jsonl` (each entry answering the KEY_QUESTION).
   - Defines the adoption rule: once `./harness` and `.harness/contract.yml` exist, agents
     MUST prefer the harness over direct wrapped commands, and MUST record friction when
     bypassing it due to missing proof.
   - References ADR-0003 (the adoption decision) and the `harness-cli-it` skill (the
     generator).

> This brief **proposes** CORE-COMPONENT-0003; the Plan stage owns adopting it and its
> `DECISION-LOG.md` entry.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [ ] A repo-local harness CLI exists, generated via the `harness-cli-it` agent
- [ ] The harness wraps the project's existing commands rather than reimplementing them
- [ ] The harness records evidence for the commands it runs
- [ ] Supported human and agent workflows are documented
- [ ] The harness is invocable from a documented single entry point
<!-- ACCEPTANCE_CRITERIA_END -->

## Risks and Open Questions

### Risks

1. **Harness scope creep beyond wrapping existing commands** (the issue's named risk). The
   harness must *wrap* `npm run typecheck` / `npm install` and mark absent verbs as
   `unknown`; it must not reimplement or invent lint/test/build behaviour that the project
   has not yet defined. Mitigation: honest `unknown` verdicts + friction records instead of
   fabricated coverage.
2. **Inventing a new build system.** Forbidden by the harness-cli-it contract and by
   ADR-0002 minimality. The harness must call existing `npm` scripts, not replace them.
3. **Dishonest `verify` verdict.** If `verify` claimed `pass` while wrapping nothing real,
   the evidence would be meaningless. Mitigation: `verify` must run the one real check
   (`typecheck`) plus `doctor`, and only report `pass` when those genuinely pass; otherwise
   `degraded`/`unknown` with recorded friction.
4. **Toolchain absence at run time.** If Node/npm is not installed, `doctor`/`verify` must
   degrade gracefully (a clear `degraded`/`unknown` verdict) rather than crash. Mitigation:
   guard every wrapped command behind a tool-availability probe.
5. **Agent-definition edits breaking existing behaviour.** Updating 16 `.agent.md` files
   risks corrupting them. Mitigation: idempotent, additive, clearly-marked insertion that
   preserves all existing content; re-runnable without duplication.
6. **Committing secrets into evidence/friction.** The harness must not capture credentials
   in evidence or friction files. Mitigation: evidence records verdicts and command
   metadata, not raw environment or secret-bearing output.

### Open Questions (for the Plan stage / decider — not decided here)

1. **Harness implementation language.** Portable POSIX/bash shell (dependency-light,
   matches the harness-cli-it "prefer portable shell" guidance) vs. a Node script (matches
   the repo stack but adds a runtime requirement to run the harness itself). Proposed:
   shell, deferred to ADR-0003.
2. **`build` mapping.** Should `build` remain `unknown` (no build script exists; `tsc
   --noEmit` is a *typecheck*, not a build) or be aliased to typecheck? Proposed: keep
   `build` `unknown` + friction and expose typecheck explicitly; decide in Plan.
3. **`clean` behaviour.** With no `clean` script declared, should `clean` be `unknown`, or
   perform a conservative, well-scoped artifact removal (e.g. `*.tsbuildinfo`, `dist/`)?
   Proposed: conservative inferred clean + friction; decide in Plan.
4. **Verification config.** Should this issue also create `.github/soft-factory/
   verification.yml` wiring `./harness verify` so the RPIV verifier uses the harness?
   Proposed: yes (it cements the operating surface); decide in Plan.
5. **Evidence retention/format.** JSON evidence per `verify` run plus a `latest` pointer,
   or a single rolling file? Proposed: timestamped JSON per run + `latest.json`; decide in
   Plan.
