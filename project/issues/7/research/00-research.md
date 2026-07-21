# Research Brief: Launch one code-server process against a configured path

## GitHub Issue
- **Issue:** #7
- **Title:** Launch one code-server process against a configured path

## Scope Classification
- **Scope Type:** issue

**Rationale.** Issue #7 is PRD §29 Prototype 0 item 4 ("script to launch one
`code-server` instance against a configured path"). Every durable, cross-cutting
mechanism it needs is **already decided** by prior ADRs, so #7 does not force a
new foundational architectural decision the way #6 did:

- **Long-running-process invocation through the harness** is settled by
  **ADR-0004** (`mode: exec` interactive/handoff verb category) and reused by
  **ADR-0005** for `boot`. A `code-server` instance is a long-running server, so
  it fits the *same* sanctioned handoff pattern — it must **not** be mapped into
  the run-to-completion capability handler (ADR-0004 Decision #41 forbids that; it
  would hang the harness and the regression suite forever).
- **Wiring a verb by contract data alone** (no `harness` script change) is settled
  by **CORE-COMPONENT-0003 R8/R17** and demonstrated by `boot`/`dev`. If #7 surfaces
  the launcher through the harness, it is a **data-only** `.harness/contract.yml`
  edit plus a launch script — mirroring the **#5 precedent** that was classified
  `issue` precisely because it wired verbs by data and made no new decision.
- **`PORT`/env-driven configuration** precedent is settled by **ADR-0005 D6**
  (`PORT` env override), so a `PROJECT_PATH` env var for #7 is an established idiom.

This is materially different from **#6**, which was `architecture_decision`
because it had to *choose* the HTTP mechanism, the TypeScript-at-runtime strategy,
and the `boot` lifecycle under the ADR-0002 "no framework / no build" baseline —
genuinely new, hard-to-reverse decisions. #7 introduces **no comparable
irreversible mechanism**: it wraps an external editor binary behind an isolated
launch script and (optionally) an existing-pattern handoff verb. The launch
script, the isolated `code-server` flags, the fail-fast path validation, and the
read-only safety guarantee are **ordinary implementation** inside the existing
ADR-0003/0004/0005 + CORE-COMPONENT-0003 boundaries.

> **One genuinely-new, borderline concern is flagged, not decided.** #7 is the
> **first external editor-provider integration** (`code-server`), and PRD §5.7
> ("keep provider-specific logic isolated") plus §28.6 (the read-only project-path
> safety criterion) describe a **durable seam** that later serving stories
> (reverse proxy, editor embedding, multi-runtime, a *future* editor provider)
> will inherit. A reasonable reader could argue this warrants a small ADR now.
> This brief therefore **proposes an optional ADR** (see *Proposed ADRs*) for Plan
> to adopt **or** consciously defer as speculative at Prototype 0 (PRD §28.7).
> **Research proposes; Plan/decider decides.** My recommended classification is
> `issue`, because the isolation *interface* (a full `EditorProvider`, PRD §15)
> would be speculative to build now, and the actual work reuses decided mechanisms.

## Problem Statement

Ascend must provide a **documented script/command that launches a single
`code-server` process against a configured filesystem path**, so a contributor can
set `PROJECT_PATH`, run the launcher, reach a running `code-server` in the browser
serving that path, and use the integrated terminal against it. This answers PRD
Prototype 0's core question — *"Can `code-server` be launched reliably against an
arbitrary local path?"* (PRD §29, line 1447) — and is the runtime implementation
of the **"Host process runtime"** option (PRD §14.2: "Launch `code-server`
directly as a child process").

The story is deliberately a **spike**, not a product surface. In scope: one
launch script/command, target-path configuration (e.g. `PROJECT_PATH`), and
verification that the editor + terminal work against the path. **Out of scope**
(from the issue and PRD §29 non-goals): reverse proxy, iframe embedding, multiple
projects, persistence, authentication, Docker abstraction, polished navigation.

Two hard constraints frame the work:

1. **Provider isolation (PRD §5.7).** `code-server` is the *first* editor
   provider. The core project model must not depend directly on code-server CLI
   arguments, ports, or config formats; those must be isolated so a future editor
   provider is possible without rewriting core behaviour. For #7 this means all
   code-server-specific flags live behind **one** launcher seam.
2. **Read-only project-path safety (PRD §28.6 / issue AC5).** The launch operation
   **must not delete, move, rename, reset, clean, or otherwise modify the project
   directory** — filesystem mutation is not the purpose of this story. (The
   *user* editing files inside the running editor is the intended direct-filesystem
   behaviour validated by the *next* story, #5-in-PRD "Verify direct filesystem
   editing"; the **launcher itself** must be read-only with respect to the target.)

Sequencing (PRD §29): #3 bootstrap → #4 harness → #5 dev/validation → #6
shell+health → **#7 code-server launcher**. #7 **depends on the application shell
story (#6, already merged)** for the repository's runtime baseline, but the
code-server process is an **external, separate** process from the Ascend
`node:http` server — at Prototype 0 there is deliberately **no** integration
between the two (that is reverse-proxy/embedding scope in Prototype 1).

### Grounding evidence (harness + on-disk, not inferred)
- `./harness orient` → **`pass`**: Stack "TypeScript + Node.js 22 (LTS) + npm
  (ADR-0002)"; setup entry `npm install`; operating surface `./harness`; Contract
  `.harness/contract.yml` (**13 verbs**); `verify wraps: npm run typecheck`;
  `dev execs: npm run dev (mode: exec; interactive handoff, emits no verdict)`.
- `./harness doctor` → **`degraded`** (exit 0): `node present: v22.17.1`,
  `node >= 22.6.0: true`, `node_modules: false` ("node_modules missing — run npm
  install"). *(npm install cannot reach the registry in this sandbox — a network
  restriction, not a repo defect — so `node_modules`/`tsc` are absent here.)*
- **`code-server` is NOT installed anywhere in this devcontainer:**
  `command -v code-server` → none; not in `node_modules/.bin`; not in the npm
  global root; and **`.devcontainer/devcontainer.json` declares no code-server
  feature** (its `features` list has common-utils, docker-outside-of-docker,
  azure-cli, github-cli, copilot-cli, tmux, just, etc. — no editor runtime).
  `harness doctor` proves only Node health, **not** editor-provider availability.
- `.harness/contract.yml`: has **no** editor/launcher verb. Existing long-running
  handoffs are `boot: { maps_to: "npm run start", mode: exec }` and
  `dev: { maps_to: "npm run dev", mode: exec }`. `harness` dispatch selects the
  handler from the verb's `mode` (R8/R17), so adding a new `mode: exec` verb is a
  **data-only** contract edit (no `harness` script change), exactly like `boot`.
- `package.json` scripts: `dev` (`tsc --noEmit --watch`), `typecheck`
  (`tsc --noEmit`), `start` (`node --experimental-strip-types src/main.ts`),
  `test` (`node --test --experimental-strip-types 'tests/app/**/*.test.ts'`);
  `engines.node`: `>=22.6.0 <23`. **No** launcher script yet.
- App source (#6): `src/server.ts` (`node:http` `createAppServer()` factory) and
  `src/main.ts` (owns the single `.listen()`, `PORT` env override, default 3000).
  This is the **Ascend** server — separate from any code-server process.

## Existing Context

### Existing ADRs (`project/architecture/ADR/`) — all read
- **ADR-0001** — template (do not edit; copy-and-rename per AGENTS.md).
- **ADR-0002** — Baseline stack & layout: TypeScript + Node 22 LTS + npm; app code
  under `src/`; `npm install` is the single setup entry point. **Decision 7
  explicitly names "`code-server` integration" as a *later Prototype 0 story***
  (i.e. this one) and forbids frameworks / build beyond `tsc`. **Directly relevant**
  (dependency-light, no speculative frameworks — PRD §28.7).
- **ADR-0003** — Repo-local engineering harness (`./harness`) is the mandatory
  operating surface; wrap existing commands, never reimplement; verbs wired by
  contract data. **Directly relevant** (where/how the launcher is surfaced).
- **ADR-0004** — Interactive/handoff verbs (`mode: exec`): the sanctioned way to
  invoke a **long-running process** through the harness without hanging it;
  verdict/exit-code/evidence-exempt; introspect via `--print`/`--json`. **Directly
  relevant** — a code-server instance is exactly such a process.
- **ADR-0005** — Application-serve runtime: `boot` wired `mode: exec` → `npm run
  start`; `PORT` env override (D6); Node **≥22.6.0** floor; `doctor` degraded (never
  fail) as a readiness diagnostic. **Explicitly names this story**: *"This decision
  is binding on every later serving story (**code-server launcher #7**, reverse
  proxy, editor embedding, runtime/editor health)."* **Directly relevant** — the
  reusable `mode: exec` handoff + env-config precedent for #7.

### Existing Core-Components (`project/architecture/core-components/`) — all read
- **CORE-COMPONENT-0001** — template (do not edit).
- **CORE-COMPONENT-0002** — Commit Standards (Conventional Commits, Co-authored-by).
  Governs how #7's commits are authored (Verify stage).
- **CORE-COMPONENT-0003** — Engineering harness contract, verdicts, evidence &
  friction. **R8** (data-driven verb wiring), **R17** (interactive/handoff
  `mode: exec` verbs and their exemptions/introspection), **R6** (verify aggregate),
  **R4/R9** (honest friction). **Directly relevant** — any harness surfacing of the
  launcher is bounded by these rules and requires **no** amendment.

### Decision Log (`project/architecture/ADR/DECISION-LOG.md`) — read
- 5 ADRs (0002–0005) + 2 core-components (0002–0003); 61 recorded decisions.
- Most relevant: #38–#46 (`mode: exec` handoff category), #52 (`boot` wired
  `mode: exec` → `npm run start`), #55 (`PORT` env override), #60/#61 (Node
  ≥22.6.0 floor + `doctor` degraded readiness). No decision covers an **editor
  provider**, code-server flags, or a provider-launch safety contract — that seam
  is currently **unproven** and is the one new area #7 touches.

### PRD constraints (read)
- **§5.1** — *Do not rebuild VS Code.* Host code-server; don't reimplement editor
  features (also §18: "code-server" in the "what Ascend must not rebuild" list).
- **§5.7** — Keep provider-specific logic isolated (code-server CLI args, ports,
  config formats, Docker/iframe specifics must not leak into the core).
- **§14.2 "Host process runtime"** — *"Launch `code-server` directly as a child
  process"*; advantages (simple host-fs access, low overhead, no Docker) and risks
  (weaker isolation, process cleanup). This is exactly #7's mechanism.
- **§28.6 / issue AC5** — the read-only project-path safety criterion (verbatim in
  the issue). **§28.7** — avoid speculative frameworks (so *don't* build a generic
  EditorProvider SDK now). **§28.8** — if VS Code owns it (e.g. the integrated
  terminal), configure/launch it, don't rebuild it.
- **§29 Prototype 0** — item 4 is this story; *Evidence to capture* includes
  "startup command", "startup duration", "behaviour when the path is invalid",
  "behaviour when the editor process crashes"; *Exit criteria* include "one local
  folder can be opened", "the terminal works", "stopping the editor does not affect
  project files".

### `code-server` invocation conventions (external research — informative, not decided)
`code-server` is Coder's build of VS Code that runs in the browser. Relevant CLI
surface for a **single local instance opening a folder with a working terminal**
(to be confirmed against the installed version during Plan/Implement):
- **Open a folder:** `code-server <path>` opens that directory as the workspace
  (the terminal opens in that folder). The *path argument* is the primary knob #7
  drives from `PROJECT_PATH`.
- **Bind address / port:** `--bind-addr 127.0.0.1:<port>` (the modern flag;
  `--port` is legacy). Loopback bind keeps the spike local-only (PRD §5.6
  local-first; auth/proxy are out of scope).
- **Auth:** `--auth none` for a local spike (authentication is explicitly out of
  scope for #7; the `PASSWORD`/`HASHED_PASSWORD` env is the alternative for later).
- **Integrated terminal:** provided **natively** by code-server (it *is* VS Code) —
  §28.8 says configure/launch, don't rebuild. No Ascend work is needed to make the
  terminal exist; the AC is to *demonstrate* it works against the path.
- **Config/state:** code-server reads `~/.config/code-server/config.yaml` and CLI
  flags; user/extension state lives under `~/.local/share/code-server`. Keeping
  these flags/paths behind the single launcher seam satisfies §5.7.
- **Availability:** code-server is **not** bundled with Node/npm and is **absent
  here**; it must be provisioned (devcontainer feature, an install step, or a
  documented prerequisite). This is a Plan/decider input, logged as friction below.

## Proposed ADRs

**Are ADRs required?** **Not strictly.** #7's mechanics fit entirely within the
existing **ADR-0003** (harness operating surface), **ADR-0004** (`mode: exec`
handoff for long-running processes), **ADR-0005** (`boot` handoff + `PORT`/env-config
precedent + Node floor), and **CORE-COMPONENT-0003** (R8/R17 data-driven wiring)
boundaries. No harness-contract amendment is needed.

**One optional, small ADR is *proposed* for Plan to adopt or consciously defer.**
Because #7 is the **first external editor-provider integration** and establishes a
seam every later serving story inherits (provider-argument isolation per §5.7, and
the read-only launch-safety contract per §28.6), Plan may judge it worth recording:

> **Proposed (optional) ADR-0006 — "code-server editor-provider launch, argument
> isolation, and read-only project-path safety."** Would record: (a) launching
> `code-server` as a **host child process** (PRD §14.2) surfaced through the
> harness as a **`mode: exec` handoff verb** (reusing ADR-0004/0005), (b) the
> **single-seam isolation** of all code-server-specific flags/ports/config so the
> core stays provider-agnostic (§5.7) **without** building a speculative
> `EditorProvider` interface yet (§28.7), (c) `PROJECT_PATH` as the configured
> target (env-config precedent from ADR-0005 D6), and (d) the **read-only
> launch-safety** guarantee (§28.6/AC5: validate-only; never `mkdir`/`rm`/`mv` the
> target). **Proposed, not decided** — Plan may instead keep this issue-local at
> Prototype 0 (matching ADR-0005's "no new core-component" spike posture) if it
> judges the boundary not yet durable enough to formalise.

If Plan classifies the work as pure `issue` and declines the ADR, that is a valid
outcome; the recommended classification above (`issue`) assumes this is the likely
path, with the ADR available if the decider wants the provider seam recorded.

## Proposed Core-Components

**Are core-components required?** **No.** A reusable **`EditorProvider`** contract
(PRD §15) that would let a *second* editor provider slot in without rewriting core
behaviour is a genuine future cross-cutting concern — but building it now is
**speculative** (PRD §28.7; ADR-0002 minimality), because there is exactly **one**
provider and **one** consumer at Prototype 0. This mirrors ADR-0005 D8's explicit
choice to keep the health/HTTP contract issue-local and create no core-component
until a validated multi-consumer need emerges.

**Deferred (not proposed for now):** a future `CORE-COMPONENT-000X — "Editor
provider launch/isolation contract"` once a *second* editor provider or a
multi-consumer need (reverse proxy + embedding + runtime health) is validated. #7
should keep provider isolation to a **single launcher seam**, not a framework.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [ ] A documented script launches one `code-server` instance against a configured path
- [ ] The editor is reachable in the browser and opens the configured folder
- [ ] The integrated terminal works within the launched editor
- [ ] The launch behaviour when the configured path is invalid is documented
- [ ] The operation must not delete, move, rename, reset, clean, or otherwise modify the project directory unless that filesystem mutation is the explicit purpose of the story
<!-- ACCEPTANCE_CRITERIA_END -->

## Risks and Open Questions

### Recommended framing (for Plan to decide — this brief proposes, it does not decide)
- **Launcher location & harness surfacing.** The launcher is *process
  orchestration*, not Ascend HTTP app logic, so it should **not** live in `src/`
  alongside `server.ts`/`main.ts`. The ADR-0003-honest default is a small,
  dependency-light **launch script** (POSIX shell mirrors `tests/harness/`, or an
  `npm run`-invoked script) that isolates all code-server flags, **surfaced through
  the harness as a new `mode: exec` handoff verb** (e.g. `edit` / `code-server` /
  `launch`) wired by **contract data only** (CC-0003 R8/R17), reusing the `boot`
  pattern. This keeps it invokable on the single operating surface (ADR-0003) and
  introspectable via `--print`/`--json` without launching.
- **Configuration.** `PROJECT_PATH` as an **environment variable** (matches the PRD
  demo "Configure PROJECT_PATH" and the ADR-0005 D6 `PORT` env precedent). A `PORT`
  / `--bind-addr` for the code-server instance can reuse the same env idiom, kept
  behind the launcher seam.
- **Provider isolation (§5.7).** Put **every** code-server-specific flag
  (`<path>`, `--bind-addr`, `--auth none`, config path) inside the *one* launcher;
  the harness verb and any docs pass only `PROJECT_PATH` (+ optional port). Do
  **not** leak code-server flags into `src/` or the harness script. Do **not** build
  an `EditorProvider` abstraction (§28.7) — the single seam *is* the isolation.
- **Invalid-path fail-fast (§28.6-safe).** Validate before launching: `PROJECT_PATH`
  **unset/empty** → clear error + non-zero exit; **non-existent** → error + exit;
  **not a directory** (a file) → error + exit. **Never** create or repair the path
  (no `mkdir -p`), never mutate it. Document each case (AC4).
- **Read-only safety (§28.6 / AC5).** The launcher performs **validate-only**
  checks (e.g. `test -d`) and points code-server at the path; it issues **no**
  `rm`/`mv`/`rename`/`reset`/`clean`/`mkdir` against the target. (Files the *user*
  edits inside the running editor change in place — that is the intended
  direct-filesystem behaviour the *next* story validates — but the launcher's own
  footprint on the directory is nil.)
- **Verification strategy.** *Manual demonstration* for the browser-dependent ACs
  (AC1–AC3: reachable editor, opened folder, working terminal). *Automatable
  without code-server installed* for AC4/AC5: script-level tests asserting fail-fast
  on unset/empty/non-existent/non-directory paths **and** that a valid launch path
  performs **no** filesystem mutation of the target (a shell test à la
  `tests/harness/`, or a `node:test` per ADR-0005 D7). Document crash behaviour
  (PRD §29 "behaviour when the editor process crashes"): under `mode: exec` the
  handoff propagates code-server's exit code (ADR-0004 Decision #46).

### Risks
1. **`code-server` is absent in this environment (and CI).** `command -v
   code-server` → none; the devcontainer declares no editor feature. AC1–AC3 cannot
   be auto-verified without provisioning it. **Mitigation:** Plan decides
   provisioning (devcontainer feature / install step / documented prerequisite);
   verify AC1–AC3 by manual demo and AC4/AC5 by code-server-free script tests. Logged
   as friction (`doctor`).
2. **Hanging the harness with a long-running process.** Naively mapping the
   launcher into the **capability** handler would hang `./harness` and the
   regression suite forever (the exact failure ADR-0004 Decision #41 prevents).
   **Mitigation:** use the `mode: exec` handoff (like `boot`); the regression suite
   must never run the bare verb and must prove invocability via `--print`/`--json`
   (ADR-0005 already established this for `boot`).
3. **Safety-criterion violation (AC5/§28.6).** Any convenience `mkdir -p
   "$PROJECT_PATH"` or cleanup would breach the read-only guarantee.
   **Mitigation:** validate-only checks; explicit test asserting no target mutation;
   code review against §28.6.
4. **Provider-flag leakage (§5.7).** Spreading code-server flags across the harness
   verb, an npm script, and docs would couple the core to code-server.
   **Mitigation:** one launcher seam owns all flags; the verb passes only
   `PROJECT_PATH`(+port).
5. **Scope creep beyond the spike.** iframe embedding, reverse proxy, auth,
   multi-project, persistence, Docker are all **out of scope** (issue + PRD §29
   non-goals) and belong to Prototype 1+. **Mitigation:** ship one launcher + one
   optional handoff verb; nothing more. The Ascend `node:http` shell (#6) stays
   **separate** from the code-server process at Prototype 0 (no integration).
6. **Experimental-runtime / Node-floor coupling.** If the launcher or its tests are
   written in `src/`-style TS run via `--experimental-strip-types`, they inherit the
   Node ≥22.6.0 floor and strip-types-safe constraints (ADR-0005 D2). **Mitigation:**
   a POSIX shell launcher avoids this entirely; a Node/TS launcher must honour the
   floor. Plan chooses the implementation language.
7. **Reliability / crash handling (issue's own risk).** code-server startup can fail
   (permissions, port in use, missing binary). **Mitigation:** fail-fast validation +
   documented crash behaviour (exit-code propagation via `mode: exec`); full health
   supervision (PRD "code-server exited before becoming healthy") is later scope.
8. **Sandbox cannot `npm install` / install code-server (network).** `node_modules`
   is absent here (`ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE`); code-server likewise
   cannot be fetched. **Mitigation:** Plan/Implement verify on a network-connected
   environment; keep the code-server-free tests (AC4/AC5) as the CI-safe gate.

### Open Questions (for Plan / decider — not decided here)
1. **Classification confirmation:** confirm `issue` (recommended) vs adopting the
   proposed optional **ADR-0006** for the code-server launch / provider-isolation /
   read-only-safety seam.
2. **Launcher location & form:** POSIX shell script vs Node/TS script vs `npm run`
   target — and its directory (a `scripts/`/`bin/` location vs reusing an existing
   convention). What path does Plan want established?
3. **Harness surfacing:** add a new `mode: exec` verb (name? `edit` / `code-server`
   / `launch`) wired by contract data, or keep the launcher as a standalone
   documented command outside the harness? (ADR-0003 favours the single operating
   surface.)
4. **Configuration contract:** `PROJECT_PATH` env var (recommended) — plus how the
   instance's bind address/port is configured and isolated (§5.7).
5. **code-server provisioning:** devcontainer feature vs install step vs documented
   prerequisite; and should `doctor` later report code-server presence as a
   readiness diagnostic (degraded, never fail)?
6. **Auth/bind posture for the spike:** `--auth none` + loopback bind for a local
   Prototype-0 demo — confirm this is acceptable given auth is explicitly out of
   scope.
7. **Verification split:** exactly which ACs are manual-demo (AC1–AC3) vs
   automatable script tests (AC4/AC5), and the test harness (shell à la
   `tests/harness/` vs `node:test`).
8. **Evidence capture:** the issue/PRD §29 asks to capture "startup command" and
   "startup duration" (Observability) — where/how is this recorded (README demo
   steps, an evidence note), given full resource measurements are a *separate*
   later story (PRD §29 item 6)?

### Harness-recorded inferences (friction, KEY_QUESTION)
Per the research-stage harness rule, inferences this brief made that the harness
could **not** prove were logged via `./harness friction add`
(`.harness/friction.jsonl`), answering the KEY_QUESTION *"What did the agent have to
infer that the harness should have proved?"*:
- **`boot`** — inferred that launching one code-server instance against
  `PROJECT_PATH` is naturally a **new `mode: exec` handoff verb** (reusing the
  ADR-0004/0005 pattern) executing a launch script that isolates all code-server
  flags (§5.7), rather than a bare command outside the harness. *Proof gap:* the
  contract has **no** editor/launch verb, code-server is **not installed**, and
  `doctor` proves only Node health — so the verb-vs-script choice and `PROJECT_PATH`
  config are inferred, not proven. *Suggested closure:* Plan chooses the launcher
  location, whether to wire a `mode: exec` verb (data-only, R8/R17), and whether a
  small ADR records the provider-launch/isolation/safety seam.
- **`doctor`** — inferred that **code-server is absent** and must be provisioned
  before the launcher can be demonstrated, so AC1–AC3 rely on **manual demo** while
  AC4/AC5 (invalid-path + read-only safety) are automatable without code-server.
  *Proof gap:* `doctor` proves only Node/toolchain health, not editor-provider
  availability; `command -v code-server` is empty and the devcontainer declares no
  code-server feature — provider readiness is unproven. *Suggested closure:* Plan
  decides provisioning (devcontainer feature / install step / documented
  prerequisite) and the manual-vs-automated verification split; optionally extend
  `doctor` to report code-server presence (degraded, never fail) in a later story.

These are handed to Plan/decider for resolution.
