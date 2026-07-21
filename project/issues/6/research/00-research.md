# Research Brief: Add a minimal Ascend health endpoint and application shell

## GitHub Issue
- **Issue:** #6
- **Title:** Add a minimal Ascend health endpoint and application shell

## Scope Classification
- **Scope Type:** architecture_decision

**Rationale.** Issue #6 is the story where Ascend gains its **first executable
application** — a real HTTP server that serves a shell page and a health endpoint — and it
must do so **under the ADR-0002 baseline that explicitly forbids "no web framework" and "no
build/bundler pipeline beyond `tsc`" (`tsc` is `noEmit`)**. That forces a genuinely new,
cross-cutting, hard-to-reverse decision that no existing ADR settles:

1. **HTTP server mechanism** — Node's built-in `http` module (zero new dependency, honours
   ADR-0002) vs. adding a web framework (Express/Fastify — discouraged by ADR-0002 §Decision
   7 and PRD §28.7).
2. **TypeScript runtime-execution strategy** — because `tsc` is `noEmit` (Decision #7,
   `tsconfig.json` `"noEmit": true`), there is **no emitted JS to run**. Something must
   execute the TypeScript at runtime: Node 22's `--experimental-strip-types` (verified
   working on this checkout — see Existing Context; no dependency, no emit), a loader, or
   **adding an emit/build step** (which would breach ADR-0002's "no build pipeline beyond
   `tsc`" and Decision #10). Each option has a distinct ADR-0002 implication.
3. **`boot` lifecycle** — how a **long-running app-serve process** reconciles with the
   harness run-once verdict+evidence model (reuse the ADR-0004 `mode: exec` handoff, or a
   readiness-probe + detach that returns a real verdict).

This is materially different from **issue #5**, which was classified `issue` because it only
**wired existing verbs by editing `.harness/contract.yml` data** (CORE-COMPONENT-0003 R8) and
made no new architectural decision. Issue #6 mirrors the precedent of **#3 (bootstrap →
ADR-0002)** and **#4 (harness → ADR-0003)** and **#5's own review escalation (→ ADR-0004)**:
each materialised a foundational ADR because a durable cross-cutting mechanism was being
established. The app-serve runtime is exactly such a mechanism — every later Prototype 0/1
story (code-server launcher #4-in-PRD, reverse proxy, editor embedding, runtime/editor
health) inherits it. Therefore `scope_type` is **architecture_decision**.

> **This brief proposes the decision; it does not make it.** The concrete choice of HTTP
> mechanism, TypeScript runtime path, and `boot` lifecycle is owned by the Plan stage /
> decider and the proposed ADR-0005. The application code itself (a ~1-file `http` server,
> a shell HTML string, a `/health` handler, and a test) remains ordinary `issue`-level
> implementation once the ADR fixes the approach.

## Problem Statement

Ascend must serve a **minimal web application shell** at a browser URL plus a **health
endpoint** that reports the service is up, and both must **start via the documented dev
command**. This is PRD §29 Prototype 0 item 3 ("basic web shell", "health endpoint"), part
of parent feature #2, and answers Prototype 0's implicit question — *can Ascend run as a
service at all?* — while keeping the shell deliberately thin (PRD §4 hypothesis 6: "A thin
Ascend shell provides enough unique value without recreating IDE functionality"; §5.5 Start
with prototypes).

Sequencing (PRD §29 / prior briefs): #3 bootstrap → #4 harness → #5 dev/validation → **#6
shell+health** → #7 code-server launcher. #6 is the first story that must produce a *running
process*, and the tension it must resolve is that **at the ADR-0002 baseline there is nothing
that runs**: `src/` holds only `src/placeholder.ts` (`export {};`), `tsc` is `noEmit` (no
emitted JS), there is no HTTP server, no `start`/`serve` script, no test runner, and the
harness `boot` verb is deliberately `unknown` and **reserved for exactly this issue**
(ADR-0004 Decision #40, friction log).

The friction log and ADR-0004 have already **earmarked `boot` for #6** ("`boot.maps_to` stays
`null` … remains owned by **issue #6** for the real app-serve + health endpoint") and noted #6
"may reuse the `mode: exec` handoff pattern". So #6 is expected to wire `boot` (and possibly
`test`) — but the *mechanism* by which a real server is run under `tsc --noEmit` is unproven
and must be decided, not assumed.

### Grounding evidence (harness + on-disk, not inferred)
- `./harness orient` → **`pass`**: Stack "TypeScript + Node.js 22 (LTS) + npm (ADR-0002)";
  Setup entry `npm install`; Contract `.harness/contract.yml` (**13 verbs**); `verify wraps:
  npm run typecheck`; `dev execs: npm run dev (mode: exec; interactive handoff, emits no
  verdict)`.
- `./harness doctor` → **`degraded`**: `node present: v22.17.1`, `node major == 22: true`,
  `node_modules: false` ("node_modules missing (run npm install)"). *(`npm install` fails on
  this sandbox with `ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE` reaching registry.npmjs.org — a
  network restriction of the research environment, not a repo defect; `node_modules`/`tsc` are
  therefore absent here.)*
- `./harness boot` → **`unknown`** (exit 0), JSON `{"verb":"boot","verdict":"unknown",
  "reason":"no boot command detected","maps_to":null}`; records the honest gap as friction.
- **TypeScript-at-runtime probe (on this checkout, Node v22.17.1):**
  `node --experimental-strip-types /tmp/probe.ts` **runs a `.ts` file successfully** (prints
  output, exit 0, emits an `ExperimentalWarning: Type Stripping`), whereas plain
  `node file.ts` throws `SyntaxError`. This proves the **no-dependency, no-emit** path exists
  to run TypeScript source directly under the current runtime — a key input to the ADR-0002
  tension.
- `.harness/contract.yml`: `boot: { maps_to: null, json: true }`;
  `dev: { maps_to: "npm run dev", mode: exec, json: true }`;
  `verify: { maps_to: "npm run typecheck", aggregate: [lint, test, build, doctor] }`;
  `test: { maps_to: null }`, `lint`/`build` also `null`.
- `package.json` scripts: **only** `dev` (`tsc --noEmit --watch`) and `typecheck`
  (`tsc --noEmit`); sole devDependency is `typescript`. **No test runner, no `start`/`serve`.**
- `tsconfig.json`: `"noEmit": true`, `strict`, `rootDir: "src"`, `module`/`moduleResolution`
  `NodeNext`, `target ES2022`, `include: ["src"]`.

## Existing Context

### Repository / application state (inspected)
- **Stack (ADR-0002):** TypeScript + Node.js 22 LTS + npm. `package.json`,
  `package-lock.json`, `tsconfig.json`, `.nvmrc` (`22`), `engines.node` `>=22 <23` present.
- **Application source:** `src/placeholder.ts` only (`export {};`, no logic). **No app to
  serve yet** — #6 writes the first real `src/` code.
- **No emit:** `tsconfig` is `noEmit`; `tsc` is a *typecheck*, not a build. There is
  deliberately **no compiled output** to run (ADR-0002 Decision #10, ADR-0003 Decision #13).
- **No test runner:** no `npm test` script, no test framework dependency, no `src`/app tests.
  (`tests/harness/` holds POSIX-shell harness regression tests — CORE-COMPONENT-0003 R16 — not
  application tests.)
- **Setup entry point:** `npm install` (README "Getting Started"); `node_modules` absent on
  this checkout → `doctor` `degraded`.
- **README already documents** `./harness dev` / `npm run dev` as the dev inner loop and
  explicitly flags: *"`./harness boot` currently reports `unknown` (there is no app to serve
  yet). Wrapping the real **app-serve + health** boot through the harness is owned by **issue
  #6**."* `docs/README.md` is an empty placeholder awaiting app documentation.

### Engineering harness (mandatory operating surface — ADR-0003 / CORE-COMPONENT-0003)
- **13 verbs**, data-driven (R8). The generic run-to-completion `verb_capability` handler runs
  any non-null `maps_to` to a `pass`/`fail` verdict; `null` → `unknown` + friction (R4). So a
  *finite* boot command could be wired by data alone — but a **long-running server never
  returns**, which is precisely the problem ADR-0004 solved for `dev`.
- **`mode: exec` interactive/handoff category (ADR-0004 / CORE-COMPONENT-0003 R17):** a verb
  can `exec` a long-running process (replacing the harness process), emitting **no verdict/
  evidence** and exposing a non-exec `--print`/`--json` introspection form. ADR-0004 §6 keeps
  `boot.maps_to: null` and states **#6 owns the real `boot`** and "may reuse the `mode: exec`
  handoff pattern **or** choose readiness-probe+detach" (Alternatives table & Consequences).
- **`verify` aggregate (R6):** `typecheck` + `lint`/`test`/`build`/`doctor`; today `degraded`
  (typecheck `pass`; lint/test/build `unknown`; doctor `pass`/`degraded`). If #6 wires `test`
  to a real (passing) runner, the SAME rule moves that member toward `pass` with no code change.
- **Exit-code contract (R3):** only `fail` exits non-zero; `pass`/`degraded`/`unknown` exit 0.
- **Friction log** (`.harness/friction.jsonl`): existing entries earmark **`boot` closure at
  issue #6**; `test`/`lint`/`build` were left `unknown` at #5 (deferred per ADR-0002); the
  `dev` entry records that `mode: exec` closed the interactive-invocation gap at #5. Three new
  entries were appended by this research (see *Harness-recorded inferences*).

### Existing ADRs (`project/architecture/ADR/`) — all read
- **ADR-0001** — template (read-only).
- **ADR-0002 — Ascend baseline technology stack and repository layout** (Accepted). Node 22 +
  TypeScript + npm; **Decision 7** "No web framework (Express, Next.js, Fastify …), no
  build/bundler pipeline beyond `tsc`, no runtime, **health endpoint**, or `code-server`
  integration — these are explicitly later Prototype 0 stories." **This is the binding
  constraint #6 must operate within — and the reason #6 needs an ADR:** it must add a health
  endpoint/runtime that ADR-0002 deferred, and choose a runtime-execution path without
  breaching "no build beyond `tsc`."
- **ADR-0003 — Repo-local engineering harness** (Accepted). `./harness` is the single operating
  surface; wrap-never-reimplement; verbs wired by `contract.yml` data; names #6 in Related
  Issues ("shell + health (adds a real `boot`)").
- **ADR-0004 — Interactive/handoff verbs (`./harness dev`)** (Accepted). Introduced
  `mode: exec`; **Decision #40 / §6 reserve `boot` for #6**; §Consequences: "issue #6 can wrap
  an interactive shell/serve process the same way, **or choose readiness-probe+detach**,
  without re-deciding the model." Related Issues explicitly lists #6.

### Existing Core-Components (`project/architecture/core-components/`) — all read
- **CORE-COMPONENT-0001** — template (read-only).
- **CORE-COMPONENT-0002 — Commit Standards** (Adopted). Conventional Commits v1.0.0 + AI
  `Co-authored-by` trailer; governs #6's commits; no change required.
- **CORE-COMPONENT-0003 — Engineering harness contract** (Adopted, amended R17). The stable
  contract #6 operates within: **R1** wrap-never-reimplement, **R8** data-driven wiring, **R6**
  verify aggregate, **R17** interactive/handoff verbs, **R4/R9** honest gaps → friction. #6
  *consumes and extends the wiring of* this contract (via `boot`/`test` `maps_to`); whether it
  adds any *new reusable behaviour* is assessed under Proposed Core-Components.

### Decision Log (`project/architecture/ADR/DECISION-LOG.md`) — read
Records ADR-0002/0003/0004 and CORE-COMPONENT-0002/0003; Decisions #1–#46. Directly relevant:
**#7** (`package.json` + `tsconfig` minimal manifest, `noEmit`), **#8** (source under `src/`),
**#10** (no app frameworks/features at bootstrap), **#13** (wrap, never reimplement / no build
system), **#23/#29** (verb→command mappings live in `contract.yml` as data), **#38–#46**
(interactive/handoff verbs), and critically **#40** ("Keep `boot` unmapped and reserved for
issue #6 app-serve and health") and **#41** ("Prohibit mapping long-running watch/serve
commands into the run-to-completion capability handler"). **Next free IDs: ADR-0005 and
CORE-COMPONENT-0004.**

### PRD constraints (read)
- **§29 Prototype 0** — scope lists "basic web shell" + "health endpoint" + "no persistence /
  no project library / no polished UI / no multi-project switching"; story sequence item 3 is
  this issue.
- **§4 hypothesis 6 / §5.5** — keep the shell thin; a thin shell provides value without
  recreating IDE features; small spikes over frameworks.
- **§16/§17.2** show a future editor/runtime health API shape (`GET
  /api/projects/{projectId}/runtime/health`) and **§14.3** a future reverse-proxy/WebSocket
  need — **signals only**; #6's health endpoint is a *service-level liveness* signal, not that
  per-project runtime API, and must not be over-built toward it (§28.7).

## Proposed ADRs

**ADRs are REQUIRED for this issue.**

Running a real HTTP service under a `tsc --noEmit`, framework-free baseline is a new
cross-cutting decision that ADR-0002 explicitly deferred and that every later serving story
inherits. Proposed:

1. **ADR-0005 — Ascend application-serve runtime: HTTP server mechanism, TypeScript
   runtime-execution strategy, and `boot` lifecycle**
   - **HTTP mechanism:** Node built-in `http` (candidate — zero dependency, honours ADR-0002
     Decision 7 / PRD §28.7) vs. a web framework (would require an ADR-0002 amendment).
   - **TypeScript runtime execution:** how TS source runs given `tsc` is `noEmit` — Node 22
     `--experimental-strip-types` (verified available here; no dependency, no emit) vs. a
     loader vs. **adding an emit/build step** (the latter breaches ADR-0002 "no build beyond
     `tsc`" and would be an ADR-0002 amendment). Record the choice and its ADR-0002 impact.
   - **`boot` lifecycle:** reuse ADR-0004 `mode: exec` handoff for the serve process, **or**
     readiness-probe + detach that returns a real verdict; then wire `boot.maps_to` in
     `contract.yml` (data-only, R8).
   - **Port selection/configuration** for the browser URL (fixed default vs. env override).

   > This brief **proposes** ADR-0005 and enumerates its decision points; it does **not**
   > choose the mechanism. If Plan selects any option that departs from ADR-0002 (a framework,
   > or an emit/build step), that must be recorded as an **ADR-0002 amendment** (or a superseding
   > note), not slipped in as implementation.

2. **Optional / decider's discretion — the test-runner choice** (health-endpoint test). This
   MAY be folded into ADR-0005 or handled as an ADR-0002-consistent implementation note.
   Candidate: Node built-in **`node:test`** (zero dependency, ships with Node 22) as the honest
   Prototype-0 runner, with #6 wiring the harness `test` verb. Adding a *framework* (Jest/
   Vitest) would strain ADR-0002 and should be escalated, not assumed. **Proposed, not decided.**

## Proposed Core-Components

**Core-components are NOT required for this issue.**

At Prototype 0 the health endpoint is a **single, deliberately thin, service-level liveness
signal** — issue-local, not yet a reusable behavioural contract consumed by multiple agents or
skills (contrast CORE-COMPONENT-0003, which many surfaces consume). The reusable harness
contract already exists (CORE-COMPONENT-0003); #6 only *wires* it (`boot`/`test` `maps_to`) and
*consumes* the `mode: exec` pattern — it introduces no new global behaviour of its own.

> **Surfaced for Plan (not decided):** if the decider intends the health endpoint to become a
> shared HTTP/health **API contract** that later per-project runtime/editor-health endpoints
> (PRD §16/§17.2, `GET …/runtime/health`) must conform to, that *would* justify a new
> **CORE-COMPONENT-0004 — Ascend service health/HTTP contract**. This brief recommends
> **against** formalising that at Prototype 0 (§4 thin-shell, §28.7 avoid speculative
> frameworks) and treating #6's endpoint as issue-local.

## Acceptance Criteria (from issue)

<!-- ACCEPTANCE_CRITERIA_START -->
- [ ] Ascend serves a minimal application shell at a browser URL
- [ ] A health endpoint returns a success status when the service is running
- [ ] The shell and health endpoint start via the documented dev command
<!-- ACCEPTANCE_CRITERIA_END -->

## Risks and Open Questions

### Recommended framing (for Plan to decide — this brief proposes, it does not decide)
- **HTTP + runtime:** the ADR-0002-honest default is Node built-in **`http`** + **`node
  --experimental-strip-types`** to run `src/` TypeScript with **no new dependency and no emit**
  (verified working here). This keeps #6 inside ADR-0002; any framework or build/emit step is
  an ADR-0002 amendment the decider must own.
- **`boot` wiring:** wrap the serve command through **`boot`** (the verb ADR-0004/Decision #40
  reserved for #6), reusing `mode: exec` handoff, so `./harness boot` genuinely starts the
  service and `boot` moves off `unknown` by data (R8/R17).
- **Test:** use built-in **`node:test`** for the health-endpoint check and wire the harness
  `test` verb; leave `lint`/`build` `unknown` (ADR-0002).

### Risks
1. **ADR-0002 breach via convenience.** Reaching for a framework (Express/Fastify) or an emit/
   build step to "just serve" would breach Decision 7/#10/#13 and PRD §28.7. Mitigation: keep
   to built-in `http` + strip-types; escalate any departure to an ADR-0002 amendment.
2. **`--experimental-strip-types` is experimental.** It prints an `ExperimentalWarning` and its
   flags/behaviour can change across Node 22.x patch releases; strip-types does not support all
   TS features (e.g. `enum`, namespaces, some decorators without `--experimental-transform-
   types`). Mitigation: constrain `src/` app code to strip-types-safe TypeScript, pin the flag/
   Node major, and document it in ADR-0005.
3. **Long-running server vs. run-once verdict (Decision #41).** Naively mapping a serve command
   into the capability handler would **hang `./harness boot` and the regression suite forever**
   (the exact failure ADR-0004 prevented for `dev`). Mitigation: use `mode: exec` handoff **or**
   a readiness-probe+detach that returns a real verdict — a decision, not an assumption.
4. **AC3 "documented dev command" ambiguity.** A "documented dev command" already exists —
   `./harness dev` / `npm run dev` = `tsc --noEmit --watch` (a **typecheck watch, not a
   server**). Risk that AC3 is read as "reuse the existing dev command" when it actually needs a
   *serve* entry point. Mitigation: Plan decides whether #6 (a) redefines `dev` to serve, (b)
   adds `npm run start`/`serve`, and/or (c) surfaces serve via `./harness boot`, then updates
   README/`contract.yml` so AC3 is genuinely invokable through the harness.
5. **Shell scope creep (issue's own stated risk).** The shell must stay a thin placeholder page
   (PRD §4 hyp. 6, §5.5) — no navigation, project library, polished UI, auth, or code-server
   embedding (all out of scope / later stories). Mitigation: ship a static HTML string + one
   `/health` route; nothing more.
6. **Health-contract over-design.** Modelling #6's `/health` on the future per-project
   `GET …/runtime/health` API (§16) would over-build a liveness spike. Mitigation: a minimal
   `200` + small JSON body (e.g. `{"status":"ok"}`); defer any API contract.
7. **Friction/README/contract drift.** #6 must close the `boot` (and possibly `test`) friction
   entries, flip `boot.maps_to`, update the README's "`boot` is owned by #6" note, and keep
   `orient`/`help` truthful — all in one change, or the single operating surface drifts.
8. **Sandbox can't `npm install` (network).** `node_modules`/`tsc` are absent here
   (`ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE`); Plan/Implement must verify on an environment with
   registry access. Built-in `http`/`node:test`/strip-types need **no** install, which de-risks
   the runtime path but not `tsc` typecheck.

### Open Questions (for Plan / decider — not decided here)
1. **HTTP mechanism:** built-in `http` (ADR-0002-clean) or a framework (ADR-0002 amendment)?
2. **TypeScript runtime execution:** `--experimental-strip-types` (no emit/dep) vs. a loader
   vs. adding a `tsc` emit/build step — and the explicit ADR-0002 impact of each?
3. **`boot` lifecycle:** `mode: exec` handoff (no verdict) vs. readiness-probe+detach (real
   verdict + evidence) for the app-serve process?
4. **AC3 mapping:** does #6 change what `./harness dev` does, add a distinct `start`/`serve`
   command, and/or wire the serve as `./harness boot`? Which is "the documented dev command"?
5. **Port:** fixed default port vs. env-configurable; what URL is documented for the demo?
6. **Health response contract:** status code only, or `200` + minimal JSON body; path
   (`/health` vs `/healthz` vs `/api/health`)?
7. **Test runner:** confirm Node built-in `node:test` as the Prototype-0 runner and whether #6
   wires the harness `test` verb (moving it off `unknown`) and adds an `npm test` script.
8. **ADR/CC formalisation:** confirm ADR-0005 title/scope; confirm the health-endpoint contract
   stays issue-local (no CORE-COMPONENT-0004) at Prototype 0.

### Harness-recorded inferences (friction, KEY_QUESTION)
Per the research-stage harness rule, the inferences this brief made that the harness could not
prove were logged via `./harness friction add` (`.harness/friction.jsonl`):
- **`boot`** — inferred that #6 must choose a TS-at-runtime execution strategy (Node
  `--experimental-strip-types`, verified on disk), a built-in-`http` server, and a `boot`
  lifecycle (`mode: exec` vs. readiness-probe+detach); proof gap: ADR-0004/Decision #40 reserve
  `boot` for #6 but the contract proves none of the HTTP/runtime/lifecycle choices, and
  ADR-0002 forbids frameworks/build-beyond-`tsc` without naming the runtime path.
- **`test`** — inferred that Node built-in `node:test` is the honest Prototype-0 runner for the
  required health-endpoint check and that #6 may wire the `test` verb; proof gap: `test.maps_to`
  is `null`, no runner exists, and prior friction deferred `test` beyond #5.
- **`dev`** — inferred that AC3's "documented dev command" refers to the app-serve+health #6
  introduces (surfaced via the harness), not the existing `./harness dev` typecheck-watch;
  proof gap: a "documented dev command" already exists and starts a watch, not a server, so the
  AC3→verb mapping is inferred, not proven.

These are handed to Plan/decider for resolution.
