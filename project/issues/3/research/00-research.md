# Research Brief: Bootstrap the Ascend repository

## GitHub Issue

- **Issue:** #3
- **Title:** Bootstrap the Ascend repository

## Scope Classification

- **Scope Type:** architecture_decision

**Rationale.** On the surface this is a repository-scaffolding chore (an `issue`-level
change). However, satisfying the acceptance criteria requires selecting a technology
stack — the "chosen stack" for the project metadata/manifest and the single documented
setup entry point. That stack choice is a foundational, cross-cutting, and hard-to-reverse
decision that every subsequent Prototype 0 story (health endpoint, code-server launcher,
dev/validation commands) inherits. Per the repository's own architecture conventions,
"significant architectural decisions" belong in an ADR. The concrete bootstrapping work
(directory layout, README, manifest, setup entry point) is ordinary `issue`-level
implementation, but because it is gated on and materialises an architectural decision,
the scope is classified as **architecture_decision**. This classification only signals
that an ADR is expected; **this brief does not make the decision** — it proposes it for
the Plan stage to resolve.

## Problem Statement

The repository is currently the un-bootstrapped Soft Factory template. `README.md` still
reads "Project Name" with placeholder text, there is no application source code, and there
is no project manifest for any stack. As a result, a contributor (human or agent) cloning
the repository has no coherent entry point to understand what Ascend is, where code should
live, which stack to build on, or how to set the project up.

This story establishes Ascend as an **independent greenfield codebase**, deliberately
separate from the prior DevDeck implementation, and answers Prototype 0's first question:
*"Can Ascend be developed independently?"* (PRD.md §29, Prototype 0).

The change is intentionally minimal. PRD §5.5 ("Start with prototypes") and §28.7
("Avoid speculative frameworks") require the **smallest possible** greenfield repository:
small spikes over generic frameworks, reversible decisions over premature commitments, no
speculative platform scaffolding. This story delivers only:

- a documented directory structure,
- a README stating the product boundary (*Ascend orchestrates cross-project workflow;
  VS Code / `code-server` provides the IDE*),
- a minimal project metadata/manifest for the chosen stack, and
- a single documented setup entry point that works on a clean checkout.

It explicitly does **not** include application features (health endpoint, editor launch),
CI/CD, infrastructure, or any migration of DevDeck code — those are later stories in the
Prototype 0 sequence (PRD §29).

## Existing Context

### Current repository state (inspected)

- `README.md` — still the template placeholder ("Project Name", APS badge, generic doc
  links). Must be rewritten to describe Ascend and its product boundary.
- `docs/README.md` — placeholder for application-specific documentation; no app docs yet.
- `project/` — Soft Factory pipeline scaffolding present:
  - `project/architecture/ADR/` — `ADR-0001-template.md` (read-only template) and
    `DECISION-LOG.md`.
  - `project/architecture/core-components/` — `CORE-COMPONENT-0001-template.md` (template),
    `CORE-COMPONENT-0002-commit-standards.md` (Adopted), and a README.
  - `project/issues/` — existing artifacts for issues #34 and #30; this brief adds `#3`.
- **No application source code exists.** No `package.json`, `pyproject.toml`, `go.mod`, or
  `Cargo.toml`; no `src/`, `app/`, or `lib/` directory. The repo is genuinely greenfield.
- `.devcontainer/`, `.github/`, `.gitignore`, `AGENTS.md`, `CONTRIBUTING.md`, `LLM.txt`,
  and `PRD.md` are present.

### Existing ADRs

None. `project/architecture/ADR/DECISION-LOG.md` records no ADRs yet (only the template
exists). This issue would introduce the **first** ADR in the project.

### Existing Core-Components

- `CORE-COMPONENT-0002 — Commit Standards` (Adopted) — enforces Conventional Commits v1.0.0
  on commit messages and PR titles, and requires a `Co-authored-by` trailer on AI-authored
  commits. Relevant as a constraint on how bootstrap commits are authored, but does not
  itself require change for this issue.

### Relevant PRD context

- **§1 Executive Summary / §5.1** — Ascend must not rebuild an IDE. It hosts an existing
  browser-based VS Code experience (initially `code-server`). This is the product boundary
  the README must state: *Ascend orchestrates opening/closing/switching/resuming projects;
  VS Code provides the IDE.*
- **§5.5 Start with prototypes** — prefer small spikes over generic frameworks; reversible
  decisions over premature commitments; prototype code may be discarded.
- **§28.7 Avoid speculative frameworks** — do not build plugin SDKs, orchestration
  frameworks, or other speculative infrastructure unless a validated prototype requires it.
- **§29 Prototype 0** — objective is "the smallest possible greenfield repository for
  testing Ascend concepts without migrating the original DevDeck implementation." Story #3
  is item 1 of the Prototype 0 sequence.
- **§15 Suggested Internal Interfaces** — conceptual interfaces (`ProjectRepository`,
  `RuntimeProvider`, `EditorProvider`, `HostFilesystemService`) are expressed in
  **TypeScript**, and the product hosts `code-server`. This makes a **Node/TypeScript**
  stack the natural candidate — but the PRD is explicit that "exact language, naming, and
  syntax are implementation decisions." This brief only records the signal; the stack
  choice is deferred to the proposed ADR and the Plan stage.

## Proposed ADRs

**ADRs are REQUIRED for this issue.**

The acceptance criteria reference "the chosen stack" without choosing it. That choice is an
architectural decision that must be recorded (it is the first ADR in the project and it
constrains all later Prototype 0 work). Proposed ADR:

1. **ADR-0002 — Ascend baseline technology stack and repository layout**
   - Records the chosen implementation stack for the Ascend baseline (candidate:
     Node/TypeScript, given PRD §15 TypeScript interfaces and the need to host/launch
     `code-server`; alternatives such as Python or Go should be weighed and explicitly
     rejected or accepted by the decider).
   - Records the top-level repository directory layout and where application source will
     live.
   - Records the single documented setup entry point convention (e.g., what the manifest's
     setup command is) at a decision level, not implementation level.
   - Must honour PRD §5.5 and §28.7: minimal, reversible, no speculative frameworks.

> Note: This brief **proposes** the ADR and its subject; it does **not** decide the stack.
> The Plan stage / decider owns the decision and its `DECISION-LOG.md` entry.

## Proposed Core-Components

**Core-components are NOT required for this issue.**

Bootstrapping the repository skeleton, README, and manifest does not introduce a reusable,
cross-cutting behavioural contract shared across issues. The only relevant existing
core-component is `CORE-COMPONENT-0002 (Commit Standards)`, which already governs how
bootstrap commits must be authored and needs no change. No new core-component is proposed.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [ ] Repository has a documented directory structure and README stating the product boundary (Ascend orchestrates; VS Code provides the IDE)
- [ ] Project metadata/manifest exists for the chosen stack
- [ ] The project can be checked out and set up from a documented single entry point
- [ ] No DevDeck code is migrated into the repository
<!-- ACCEPTANCE_CRITERIA_END -->

## Risks and Open Questions

### Risks

1. **Over-scaffolding beyond a minimal spike.** The primary risk called out by the issue
   and by PRD §5.5 / §28.7. The bootstrap must resist introducing frameworks, build
   pipelines, abstractions, or directory structures beyond what Prototype 0 needs. Keep the
   manifest and layout minimal and reversible.
2. **Premature stack lock-in.** Choosing a stack in the first story is unavoidable for the
   manifest, but it is a comparatively hard-to-reverse decision. Framing it as an ADR with
   explicit alternatives keeps it reviewable and reversible per §5.5.
3. **Accidental DevDeck coupling.** AC explicitly forbids migrating DevDeck code. Even
   copying conventions or config from DevDeck could smuggle assumptions in; the baseline
   must be clean and independently justified.
4. **Setup entry point not reproducible on a clean checkout.** The "single documented entry
   point" must actually succeed from a fresh clone (the issue's Tests/Demo steps depend on
   this). Environment assumptions (Node version, etc.) must be documented.
5. **README product-boundary drift.** If the README overstates scope (e.g., implies Ascend
   builds IDE features), it violates the §5.1 / §28.8 product boundary. The README must
   clearly state Ascend orchestrates and VS Code/code-server provides the IDE.

### Open Questions (for the Plan stage / decider — not decided here)

1. **Which stack?** Node/TypeScript is the natural candidate (PRD §15 interfaces are
   TypeScript; the product hosts `code-server`), but Python and Go are viable alternatives.
   This is deferred to the proposed ADR-0002.
2. **Manifest specifics.** If Node/TypeScript: is a `package.json` alone sufficient for
   Prototype 0, or is a `tsconfig.json` also warranted at bootstrap time given no app code
   yet exists? Prefer the minimum that supports the later Prototype 0 stories.
3. **Single entry point mechanism.** What concrete form does the "single documented setup
   entry point" take (e.g., a documented `npm install`/`make setup`/script), and where is
   it documented (README vs. a dedicated section)? The health-endpoint and code-server
   launcher stories (#items 3–4 in PRD §29) will build on it.
4. **Directory layout depth.** How much of a `src/` layout should exist now versus be added
   by later stories, given no application code is in scope for this story?
5. **License/metadata.** The issue's outcome mentions "license/metadata." Should a LICENSE
   file and repository metadata be established as part of this story, and under what
   license? Not explicitly in the AC list — flag for the decider.
6. **DevDeck reference.** DevDeck is referenced but not present in this repository. Is any
   explicit "no DevDeck" verification needed beyond confirming the greenfield state?
