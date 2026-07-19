# Ascend

<!-- Replace with a short description of your project. -->
[![APS version](https://img.shields.io/badge/APS-v1.2.2-blue?logo=github)](https://github.com/chris-buckley/agnostic-prompt-standard/releases/tag/v1.2.2)

Ascend is a workflow orchestrator for developers who work across many projects.

## Product boundary

**Ascend orchestrates; VS Code provides the IDE.** Ascend's job is cross-project
workflow — opening, closing, switching, and resuming projects — while the editing
experience is delivered by an existing browser-based VS Code (initially
[`code-server`](https://github.com/coder/code-server)). Ascend does **not** rebuild
IDE features; it coordinates the projects and the runtime around the editor.

This repository is a greenfield baseline. It is deliberately independent of any prior
implementation, and no prior codebase has been migrated into it.

## Directory structure

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

Application source lives under `src/`. The directory is the agreed home for code but
currently holds only a placeholder; later stories populate it.

## Getting Started

Ascend uses Node.js and TypeScript (see
[ADR-0002](project/architecture/ADR/ADR-0002-ascend-baseline-stack-and-layout.md)).

1. Clone the repository.
2. Ensure the pinned Node.js version is active. The version is pinned in
   [`.nvmrc`](.nvmrc) and enforced by the `engines` field in `package.json`
   (Node.js 22 LTS). With [nvm](https://github.com/nvm-sh/nvm): `nvm use`.
3. From the repository root, run the single setup command:

   ```bash
   npm install
   ```

That is the only setup step. To verify the toolchain:

```bash
npm run typecheck
```

## Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — pipeline workflow, how to contribute via GitHub Issues, and where artifacts belong
- [`AGENTS.md`](AGENTS.md) — agent definitions, guardrails, and pipeline specification
- [`docs/`](docs/) — application-specific documentation (API docs, user guides, etc.)
- [`project/`](project/) — architecture decisions, core-components, and per-issue pipeline artifacts
