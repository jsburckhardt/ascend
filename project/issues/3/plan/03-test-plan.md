# Test Plan: Bootstrap the Ascend repository (Issue #3)

Scope: verify the four bootstrap artifacts (manifest/toolchain, directory layout, README,
clean-checkout setup) implement ADR-0002 and satisfy Issue #3's acceptance criteria, with
**no** DevDeck code migrated. The central guarantee is that a **clean checkout sets up
successfully via the single documented entry point**.

Test types: `structural` (repo/file assertions), `content` (documentation assertions),
`toolchain` (command execution). Priority: **P0** = must pass to accept the story.

---

## Test T1-a: Manifest is valid and complete

- **Type:** structural
- **Task:** T1
- **Priority:** P0

### Setup
Repository at the state after T1.

### Steps
1. Parse `package.json` as JSON.
2. Inspect required fields.

### Expected Result
- File parses as valid JSON.
- Contains `name: "ascend"`, `private: true`, `engines.node` pinning Node 22, and a
  `typecheck` script invoking `tsc --noEmit`.

---

## Test T1-b: Dependencies are minimal

- **Type:** structural
- **Task:** T1
- **Priority:** P0

### Setup
Repository at the state after T1.

### Steps
1. Read `dependencies` and `devDependencies` from `package.json`.

### Expected Result
- `dependencies` is absent or empty (no framework/runtime deps).
- `devDependencies` contains only `typescript`.
- Satisfies ADR-0002 "no frameworks/app features at bootstrap".

---

## Test T2-a: Directory layout matches ADR-0002

- **Type:** structural
- **Task:** T2
- **Priority:** P0

### Setup
Repository at the state after T2.

### Steps
1. Check for the required top-level paths.

### Expected Result
- All exist: `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`,
  `src/`, `docs/`, `project/`.
- `src/` is tracked (contains only a placeholder) and holds no application logic.

---

## Test T2-b: Toolchain smoke test (typecheck on empty src)

- **Type:** toolchain
- **Task:** T2 (also covers T1)
- **Priority:** P0

### Setup
Repository after T2 with dependencies installed (`npm install`).

### Steps
1. Run `npm run typecheck`.

### Expected Result
- Command exits 0, proving `tsconfig.json` is valid and `src/` is correctly wired even with
  no application code.

---

## Test T3-a: README states the product boundary

- **Type:** content
- **Task:** T3
- **Priority:** P0

### Setup
Repository at the state after T3.

### Steps
1. Read `README.md`.

### Expected Result
- Contains a product-boundary statement referencing that Ascend *orchestrates* projects and
  that *VS Code / code-server* provides the IDE.
- Does **not** contain the residual placeholder string "Project Name".
- Does not describe not-yet-built features (health endpoint, code-server launcher).

---

## Test T3-b: README documents the single setup entry point

- **Type:** content
- **Task:** T3
- **Priority:** P0

### Setup
Repository at the state after T3.

### Steps
1. Read the README "Getting Started" section.

### Expected Result
- Documents exactly one setup command: `npm install` from the repo root.
- References the required/pinned Node.js version (via `.nvmrc` / engines).
- No competing or alternative setup path is documented.

---

## Test T3-c: README directory structure matches disk

- **Type:** structural
- **Task:** T3
- **Priority:** P1

### Setup
Repository at the state after T3.

### Steps
1. Extract each directory named in the README's structure section.
2. Confirm each exists on disk.

### Expected Result
- Every directory documented in the README exists; no documented path is missing and no
  top-level app directory exists that the README omits.

---

## Test T4-a: Clean-checkout setup succeeds via single entry point

- **Type:** toolchain
- **Task:** T4
- **Priority:** P0

### Setup
A pristine working tree (fresh clone or clean tree) with no `node_modules`, using only the
pinned Node.js version.

### Steps
1. Run only the documented single entry point: `npm install` from the repo root.

### Expected Result
- Command completes successfully with no manual steps beyond those documented in the README.
- `node_modules/` is populated.
- Directly satisfies AC "the project can be checked out and set up from a documented single
  entry point".

---

## Test T4-b: Post-setup typecheck succeeds

- **Type:** toolchain
- **Task:** T4
- **Priority:** P1

### Setup
Immediately after T4-a.

### Steps
1. Run `npm run typecheck`.

### Expected Result
- Exits 0, confirming the toolchain is functional on a freshly set-up checkout.

---

## Test T4-c: Ignore hygiene keeps the baseline clean

- **Type:** structural
- **Task:** T4
- **Priority:** P1

### Setup
Repository after T4-a (with `node_modules` present locally).

### Steps
1. Read `.gitignore`.
2. Check git tracking status of `node_modules/`.

### Expected Result
- `.gitignore` excludes `node_modules/`.
- `node_modules/` is not tracked/committed.

---

## Test T4-d: No DevDeck code migrated

- **Type:** structural / content
- **Task:** T4
- **Priority:** P0

### Setup
Repository at the state after T3.

### Steps
1. Scan tracked file paths and contents for "DevDeck" references and DevDeck-specific
   config/naming.

### Expected Result
- No tracked file path or content contains migrated DevDeck code, configuration, or naming.
- Satisfies AC "No DevDeck code is migrated into the repository".

---

## Coverage Traceability

| Acceptance Criterion | Covered by |
|----------------------|------------|
| Documented directory structure + README product boundary | T2-a, T3-a, T3-c |
| Project metadata/manifest for the chosen stack | T1-a, T1-b |
| Checkout + set up from a documented single entry point | T3-b, T4-a, T4-b |
| No DevDeck code migrated | T4-c, T4-d |
