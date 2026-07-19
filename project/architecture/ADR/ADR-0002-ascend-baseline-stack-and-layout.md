# ADR-0002: Ascend baseline technology stack and repository layout

## Status

Accepted

## Context

Ascend is an un-bootstrapped greenfield repository (Issue #3, PRD §29 Prototype 0,
item 1). To satisfy the story's acceptance criteria we must produce a project
metadata/manifest for a **chosen stack** and a **single documented setup entry point**
that works on a clean checkout. Neither can exist without first committing to a language,
runtime, package manager, manifest format, and top-level directory layout.

This is the **first ADR in the project**. The choice is foundational and comparatively
hard to reverse: every subsequent Prototype 0 story (local dev/validation commands, a
health endpoint and application shell, launching `code-server`) inherits it. The decision
must therefore be recorded and reviewable rather than made implicitly inside a manifest.

Two PRD principles constrain the decision:

- **§5.5 Start with prototypes** — prefer small spikes over generic frameworks and
  reversible decisions over premature commitments.
- **§28.7 Avoid speculative frameworks** — do not introduce plugin SDKs, orchestration
  frameworks, or other speculative infrastructure until a validated prototype requires it.

The following are strong signals toward a specific stack:

- PRD §15 expresses every suggested internal interface (`ProjectRepository`,
  `RuntimeProvider`, `EditorProvider`, `HostFilesystemService`) and the §16 data model in
  **TypeScript**.
- The product hosts and orchestrates a browser-based VS Code experience (`code-server`),
  whose ecosystem, extension model, and reverse-proxy/WebSocket needs (PRD §14.3) are
  native to the Node.js/TypeScript ecosystem.
- The acceptance criteria explicitly forbid migrating any DevDeck code, so the baseline
  must be justified independently rather than inherited.

## Decision

Adopt a **minimal Node.js + TypeScript** baseline for the Ascend repository:

1. **Language:** TypeScript.
2. **Runtime:** Node.js LTS (Node 22.x), pinned via the `engines` field in `package.json`
   and an `.nvmrc` file so contributors and agents resolve the same version.
3. **Package manager:** npm (bundled with Node — no extra tooling to install, honouring the
   minimality constraint). A committed `package-lock.json` provides reproducible installs.
4. **Manifest:** the minimal project manifest is `package.json` plus `tsconfig.json`. No
   application dependencies are added at bootstrap; only TypeScript itself as a dev
   dependency is permitted so the toolchain is real and verifiable.
5. **Repository layout** (top level):

   ```text
   /
   ├── README.md          # Product boundary + single documented setup entry point
   ├── package.json       # Project manifest (stack, engines, scripts)
   ├── package-lock.json  # Reproducible dependency lock
   ├── tsconfig.json      # Minimal TypeScript compiler configuration
   ├── .nvmrc             # Pinned Node.js version
   ├── src/               # Application source (location established; no app code yet)
   ├── docs/              # Application-specific documentation
   └── project/           # Soft Factory pipeline artifacts (ADRs, core-components, issues)
   ```

   Application source lives under `src/`. The directory is established now (as the agreed
   home for code) but contains no application logic; Prototype 0 stories 2–4 populate it.
6. **Single documented setup entry point:** running `npm install` from the repository root
   on a clean checkout is the one documented setup command. It must succeed with no
   additional manual steps beyond having the pinned Node.js version available. The README's
   "Getting Started" section is the single place this is documented.
7. **No application frameworks or features at bootstrap.** No web framework (Express,
   Next.js, Fastify, etc.), no build/bundler pipeline beyond `tsc`, no runtime, health
   endpoint, or `code-server` integration — these are explicitly later Prototype 0 stories.
8. **No DevDeck code, config, or conventions** are migrated into the repository. The
   baseline is independently justified and clean.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Python (uv / FastAPI) | Fast to scaffold; uv feature already referenced in devcontainer | PRD §15 interfaces and §16 data model are TypeScript; reverse-proxy/WebSocket + `code-server` extension work is Node-native; would force translation of every documented interface | Fights the PRD's own conceptual model and the editor ecosystem; higher long-term friction |
| Go | Strong single-binary runtime and proxy performance | Interfaces/data model are TypeScript; smaller overlap with `code-server`/VS Code extension ecosystem; more ceremony for a thin prototype shell | Misaligned with §15/§16 and prototype speed; premature for Prototype 0 |
| Node.js + JavaScript (no TypeScript) | Slightly less tooling | Loses the type contracts the PRD interfaces are expressed in; weaker refactor safety across prototypes | Discards a core benefit for negligible saving |
| Node/TypeScript **with** a web framework now (Next.js/Express) | Ready for the health endpoint story | Speculative scaffolding forbidden by §5.5/§28.7; app features are out of scope for #3 | Over-scaffolding; violates minimality constraint |
| pnpm / yarn as package manager | Faster installs, stricter linking | Requires installing extra tooling on a clean checkout; adds a non-minimal dependency | npm ships with Node and satisfies the minimal, reproducible bar |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- The PRD §15 interfaces and §16 data model translate directly to code without a language
  bridge.
- A clean checkout needs only Node.js (pinned) + `npm install` — a simple, reproducible,
  single entry point.
- Later Prototype 0 stories (health endpoint, `code-server` launcher) build on a native,
  well-supported ecosystem.
- The baseline is minimal and reversible: with no framework committed, the stack can still
  be re-evaluated after prototype evidence.

### Negative
- Commits the project to a stack in the first story (unavoidable to produce a manifest);
  mitigated by keeping the surface minimal and this ADR reviewable.
- TypeScript adds a compile step (`tsc`) versus plain JavaScript.

### Neutral
- npm chosen over pnpm/yarn; can be revisited via a future ADR if install performance
  becomes a measured problem.
- `src/` exists as an agreed location before any application code is written.

## Related Issues

- [#3](https://github.com/jsburckhardt/ascend/issues/3)

## References

- PRD.md §5.1 (Do not rebuild VS Code), §5.5 (Start with prototypes), §15 (Suggested
  Internal Interfaces), §16 (Data Model), §28.7 (Avoid speculative frameworks), §29
  (Suggested Initial Story Sequence — Prototype 0)
- project/issues/3/research/00-research.md
- CORE-COMPONENT-0002 (Commit Standards) — governs how bootstrap commits are authored
