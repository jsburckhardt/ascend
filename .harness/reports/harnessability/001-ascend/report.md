# Harnessability Assessment — Ascend

Run metadata:

- Timestamp: 2026-08-08T07:08:46Z
- Repo root: `/workspaces/ascend`
- Branch / commit: `main` / `f2f15f757885f0ba3dddf5c58dc3853953a9a330`
- Mode: static
- Executed: Git/repository metadata and static file inventory
- Skipped: installs, service boot, tests, migrations, database mutation, and external calls
- Safety: no secret values were read

## Verdict

- Operate-Today: **C (63%)**
- Adaptability: **C (57%)**
- Harnessability Index: **60% (C)**
- Final grade: **C**
- Readiness: **H2 — assessed**
- Highest proof level detected: **L2**
- Target next proof level: **L4**
- Confidence: **medium**

Ascend is well-oriented and locally structured, with a clear `justfile`, a pinned
devcontainer, focused/full verification lanes, and useful Fastify, DOM, and browser
test seams. It is not yet agent-operable through the engineering harness: the
governance document is seeded at L0, `checks` and `boot` do not exist, state has no
fixture/reset lifecycle, and runtime evidence remains split across logs, tests, and
ad hoc endpoints.

## Assessment matrix

| Area | Grade | Score | Rationale |
|---|---:|---:|---|
| Orientation and setup | B | 75% | Strong docs and pinned devcontainer; no application doctor |
| Operate and interact | C | 63% | Canonical commands and scaffold interactions; no aggregate boot or state lifecycle |
| Prove and observe | C | 57% | Broad local gates; no CI equivalence or unified runtime evidence |
| Adapt and compound | C | 57% | Good package/RPIV boundaries; few executable architecture or loop sensors |

## Top blockers

1. **No configured `harness checks` or `harness boot`.** The current front door
   cannot produce a machine-readable readiness verdict.
2. **No deterministic SQLite lifecycle.** Schema exists without migration, fixture,
   reset, cleanup, or persistent-consequence proof.
3. **No CI/local equivalence.** `just verify` is broad, but no tracked CI workflow
   demonstrates that the same gate protects integration.
4. **Architecture is prose-only.** Accepted boundaries are not enforced by a
   dependency or architecture sensor.
5. **Runtime evidence paths are diffuse.** Structured logs, OpenTelemetry, coverage,
   Playwright traces, and health clues are not exposed through one diagnostic.

## Highest-leverage improvements

1. Add `harness checks` around the canonical root verification lane.
2. Add `harness boot` that proves API/web readiness and composes checks.
3. Add isolated SQLite migrate, fixture, reset, and consequence-check commands.
4. Add an executable package/host-process architecture boundary check.
5. Make CI invoke the same root `just` recipes and retain their artifacts.

## First safe agent session plan

1. Use `just verify-focused <path>` while changing a bounded file.
2. Exercise API behavior through Fastify inject or UI behavior through the existing
   Testing Library/Playwright surfaces.
3. Avoid persistent-state changes until an isolated database lifecycle exists.
4. Finish adoption by creating `checks` and `boot`, then record the RPIV injection map.

## Harness surfaces

| Surface | Path | Status | Notes |
|---|---|---|---|
| Root command interface | `justfile` | Configured, unverified this run | Canonical setup/run/focused/full recipes |
| Engineering harness | `.harness/engineering-harness.md` | Seeded L0 | Boot, checks, signals, and injection map are TODO |
| RPIV flow | `CONTRIBUTING.md` | Documented | Durable Research → Plan → Implement → Verify contract |

## Repository topology

- TypeScript pnpm monorepo with `apps/web` and `apps/api`
- React/Vite web application and Fastify API
- SQLite/libSQL with Drizzle ORM
- Vitest unit/integration tests and Playwright browser E2E
- Future host-native code-server process management
- Node 22 and pnpm 10.34.5 pinned by the devcontainer

## Existing engineering environment survey

### Engineering flows

| Flow | Commands | Canonical | Evidence |
|---|---|---|---|
| Root development | `just setup`, `run`, `verify-focused`, `verify` | Yes | README and justfile |
| RPIV delivery | Research → Plan → Implement → Verify | Yes | CONTRIBUTING and AGENTS |

There are no tracked CI workflows or project-owned pre-commit quality gates. The
local `just verify` recipe formats, lints, typechecks, tests, builds, and runs E2E,
but its CI equivalence is therefore one-sided.

### Test mechanisms

| Mechanism | Type | Determinism | Reusable affordance |
|---|---|---|---|
| Fastify `inject` | In-process integration | Strong | API interaction without binding a port |
| Testing Library + jsdom | DOM simulation | Strong | Accessible UI consequence checks |
| Playwright managed Vite server | Browser E2E | Partial | Runtime UI interaction plus visible consequence |

### External-dependency pressure

| Dependency | Pressure | Local option | Proof impact |
|---|---|---|---|
| SQLite/libSQL | Low | Native file | Commands for state lifecycle are missing |
| code-server | Medium | Host binary | Future process lifecycle needs a fake and diagnostics |
| OpenTelemetry collector | Low | Optional | Does not block correctness proof |

### Code composition and seams

- Workspace boundaries keep web and API changes local.
- Fastify plugin registration and `inject` are strong test seams.
- The database client is a concrete module-global dependency with no detected
  substitution seam.
- Host-process contracts are documented but not yet implemented or executable.

### Deterministic-encoding opportunities

- Validate required RPIV artifacts and coverage maps with a workflow/schema sensor.
- Enforce the accepted web/API/host-process boundaries with a dependency check.
- Test host-process lifecycle against a fake executable before using real workbenches.

## Axis A — Operate-Today

| ID | Dimension | Band | Points | Key evidence |
|---|---|---:|---:|---|
| A1 | Orientation and repo map | Strong | 3 | README, docs, CONTRIBUTING |
| A2 | Setup/environment contract | Partial | 2 | Devcontainer and documented env defaults |
| A3 | Locality/external exposure | Partial | 2 | Local SQLite; future host code-server dependency |
| A4 | Front door/discoverability | Partial | 2 | Canonical justfile; harness verbs absent |
| A5 | Boot/readiness | Partial | 2 | Separate run, API status, and Playwright server clues |
| A6 | Fixture/reset/cleanup | Weak | 1 | Schema without state lifecycle |
| A7 | Supported interactions | Partial | 2 | Fastify inject and browser tests |
| A8 | Deterministic sensors | Partial | 2 | Broad local verify; no CI equivalence |
| A9 | Observability/evidence | Partial | 2 | Logs, OTel, coverage, traces; no unified diagnostic |
| A10 | Compounding loop | Weak | 1 | RPIV plus seeded harness, no injection/retro wiring |

## Axis B — Adaptability

| ID | Dimension | Band | Points | Key evidence |
|---|---|---:|---:|---|
| B1 | Structural coupling | Partial | 2 | Clear package/plugin boundaries; sparse implementation |
| B2 | Temporal coupling | Unknown | 0 | Deep history analysis not enabled |
| B3 | Cohesion/locality | Strong | 3 | App-local code and tests |
| B4 | Substitution seams | Partial | 2 | Fastify seams; concrete database client |
| B5 | Hermetic testability | Strong | 3 | Current tests need no remote services |
| B6 | Side-effect sinks | Weak | 1 | No host/filesystem/process fakes yet |
| B7 | State evolution | Weak | 1 | No migration/reset/consequence path |
| B8 | Architecture enforcement | Weak | 1 | Prose contracts only |
| B9 | Complexity/navigability | Partial | 2 | Oxlint/strict TS; no complexity thresholds |
| B10 | Inner-loop repeatability | Partial | 2 | Focused/full lanes; no timings or clean rerun |

## Back-pressure inventory

- **Static L2:** format, lint, typecheck, unit tests, build, and E2E are configured.
- **Runtime L3 candidate:** API root status and Playwright-managed Vite server.
- **Consequence L4 candidate:** Fastify JSON assertion and visible browser UI assertion.
- **Observability:** Fastify structured logging, OpenTelemetry, coverage, and traces.
- **Human/inferential:** RPIV and architecture contracts are strong guidance but do
  not fail deterministically when violated.

The ignored `test-results/.last-run.json` records a passing Playwright run. It
supports an L2 proof ceiling, but it is not durable CI evidence and was not rerun
during this static assessment.

## Scenario probes

### API health behavior

Fastify `inject` can exercise `GET /` and verify a 200 JSON status at L4 without
binding a port. Bound-port readiness and shutdown remain unproven.

### Project-home UI behavior

Testing Library and Playwright verify the heading and Open Project button at L4.
Actual project registration and workbench behavior are not implemented.

### SQLite project state

The schema defines persistent project rows, but no supported interaction, migration,
fixture, reset, or consequence assertion exists. Current ceiling: L1.

### Host workbench lifecycle

The PRD and architecture records define the target, but there is no implemented
interaction or deterministic verdict. Current ceiling: L0.

## Services, environment, and remote dependency exposure

Documented names are `ASCEND_HOST`, `ASCEND_PORT`, `ASCEND_DATABASE_URL`, and
standard `OTEL_*` variables. Loopback and local SQLite defaults avoid required
secrets. No secret values were inspected.

## Codebase affordance recommendations

- **Low risk:** add a local/test-only isolated SQLite lifecycle that refuses unsafe
  database URLs and exposes a consequence diagnostic.
- **Medium risk:** add a fake code-server/process adapter and structured lifecycle
  diagnostic before launching arbitrary host processes. Require review for process
  ownership, cleanup, port allocation, and filesystem safety.

## Harness-only recommendations

- Encode `checks`, then `boot`.
- Fill the governance health, interaction, observation, signals, and evidence fields.
- Wire harness lifecycle hooks into RPIV so adoption survives cold agent starts.

## Onboarding consolidation notes

README, `docs/README.md`, CONTRIBUTING, and architecture records are coherent and
were reused directly. No onboarding content was moved or modified.

## Human question

Should the first boot command own starting both applications, or only probe services
that the operator has already started? This choice determines cleanup semantics.

