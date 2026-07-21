# ADR-0005: Ascend application-serve runtime (HTTP server, TypeScript runtime execution, and `boot` lifecycle)

## Status

Accepted

> **Refined 2026-07-21 (PR #6 review F-01):** narrowed the Decision 2 runtime floor
> from "major 22" to **`>=22.6.0 <23`** — `--experimental-strip-types` first shipped
> in Node **v22.6.0**, so Node 22.0–22.5 cannot run the app — and recorded the
> `doctor` degraded-on-minor<6 readiness diagnostic. No other decision (D1, D3–D8)
> changes, and **no CORE-COMPONENT-0003 amendment is required** (CC-0003 R15 already
> derives the supported range from `engines.node` and enforces both bounds).

## Context

Issue #6 gives Ascend its **first executable application**: a real HTTP service
that serves a minimal application shell at a browser URL and a health endpoint
that reports the service is up, both started via a documented command
(PRD §29 Prototype 0; parent feature #2). This is the first story that must
produce a *running process*.

The tension is that the ADR-0002 baseline explicitly **forbids** the machinery a
running web service usually reaches for:

- **ADR-0002 Decision 7** — "No web framework (Express, Next.js, Fastify …), no
  build/bundler pipeline beyond `tsc`, no runtime, **health endpoint**, or
  `code-server` integration — these are explicitly later Prototype 0 stories."
- **ADR-0002 Decision #10 / #13** — no application frameworks/features at
  bootstrap; wrap, never reimplement, and add no build system.
- `tsconfig.json` is **`noEmit`** (Decision #7), so `tsc` is a *typecheck*, not a
  build — there is **no emitted JavaScript to run**. Something must execute the
  TypeScript source at runtime.

So issue #6 is exactly the "later Prototype 0 story" ADR-0002 deferred, and it
must resolve three genuinely new, cross-cutting, hard-to-reverse questions that no
existing ADR settles, without breaching the framework/build prohibitions:

1. **HTTP server mechanism** — a framework (ADR-0002 breach) vs. the standard
   library.
2. **TypeScript runtime-execution strategy** — how `src/` TypeScript runs given
   `tsc` is `noEmit` (no emitted JS): a runtime flag, a loader dependency, or an
   emit/build step (the latter breaches "no build beyond `tsc`").
3. **`boot` lifecycle** — how a **long-running app-serve process** reconciles with
   the harness run-once verdict+evidence model. ADR-0004 (Decision #40/#41)
   deliberately reserved the `boot` verb for this issue and forbade mapping a
   long-running serve into the run-to-completion capability handler, while
   introducing the reusable `mode: exec` handoff category (CORE-COMPONENT-0003
   R17) as the sanctioned way to invoke such a process.

Empirical grounding (verified on this checkout, Node v22.17.1): `node
--experimental-strip-types src/<file>.ts` runs a `.ts` file directly with **no
emit and no dependency** (plain `node file.ts` throws); Node's built-in
`node:http` serves `GET /health` → `200 {"status":"ok"}`; Node's built-in
`node:test` + global `fetch` proves the endpoint with **zero new dependency**;
and `tsc --noEmit` typechecks `node:http`/`node:test` imports **only when
`@types/node` is present**. The harness already routes `boot`/`test` through
`dispatch_verb`, which selects the handler from the verb's contract `mode`
(CORE-COMPONENT-0003 R8/R17) — so `boot: { mode: exec }` and a wired `test` are
**data-only** changes (already proven by regression TEST-31A, which exercises a
`boot` `mode: exec` handoff).

This decision is binding on every later serving story (code-server launcher #7,
reverse proxy, editor embedding, runtime/editor health), so it is recorded as an
ADR rather than slipped in as implementation.

## Decision

Establish the Ascend application-serve runtime as a **zero-runtime-dependency**,
framework-free, no-build service, and wire it through the existing harness by
data alone.

1. **HTTP mechanism — Node built-in `node:http`.** The service is implemented
   with `node:http` `createServer`; no web framework is added (ADR-0002
   Decision 7). `src/server.ts` exports a `createAppServer()` factory returning a
   not-yet-listening `http.Server` (so tests can bind an ephemeral port);
   `src/main.ts` is the entry that starts listening.

2. **TypeScript runtime execution — `node --experimental-strip-types` (requires
   Node ≥ 22.6.0).** `src/` TypeScript runs directly under Node via
   `node --experimental-strip-types`; **no emit, no build step, no bundler, no loader
   dependency** is added, and `tsconfig.json` stays `noEmit` (ADR-0002 "no build
   beyond `tsc`"). Because type-stripping does not support all TS constructs, `src/`
   app code MUST stay strip-types-safe (no `enum`, `namespace`, or parameter
   properties). This runtime **requires Node.js ≥ 22.6.0** — `--experimental-strip-types`
   first shipped in Node **v22.6.0**, so on Node 22.0–22.5 `npm run start`/`npm test`
   fail *before executing* (the flag is unrecognized). The supported runtime floor is
   therefore **`>=22.6.0 <23`** (still within major 22), which `engines.node`, `.nvmrc`
   (`22`, which nvm resolves to the newest 22.x), and the README MUST express. The
   experimental flag prints an `ExperimentalWarning` and its behaviour can change across
   Node 22.x — mitigated by strip-types-safe code and the `>=22.6.0 <23` pin. `doctor`
   enforces this floor as a **readiness diagnostic**: when the running Node is major 22
   but minor < 6 it reports **`degraded`** (its existing non-failing verdict — never
   `fail`) with a clear reason, since 22.0–22.5 cannot run the app. This is
   CORE-COMPONENT-0003 R15 applied to the narrowed `engines.node` range (R15 derives the
   supported range from `engines.node` and enforces both bounds), so **no
   CORE-COMPONENT-0003 amendment is required** — the `compute_doctor` minor-floor check
   is an implementation detail bounded by this ADR's `>=22.6.0` floor.

3. **Add `@types/node` as a devDependency.** `tsc --noEmit` (the `verify` gate)
   cannot typecheck `node:http`/`process`/`console` without Node type
   definitions. `@types/node` (`^22`) is added as a **compile-time-only
   devDependency**, analogous to the existing `typescript` devDependency ADR-0002
   already permits. It is **not** a runtime dependency — the app and its tests run
   with zero installed packages.

4. **`boot` lifecycle — reuse the ADR-0004 `mode: exec` handoff.** `boot` is wired
   in `.harness/contract.yml` as `boot: { maps_to: "npm run start", mode: exec }`.
   `./harness boot` hands off (execs) the long-running server, is verdict/evidence
   exempt (CORE-COMPONENT-0003 R17), and is introspectable without executing via
   `./harness boot --print` / `--json`. This is a **data-only** edit — no change to
   the `harness` script (dispatch is `mode`-driven, R8/R17). `npm run start` runs
   `node --experimental-strip-types src/main.ts`.

5. **Dev-vs-serve resolution.** `./harness dev` (execs `npm run dev` =
   `tsc --noEmit --watch`) is **unchanged** — it remains the typecheck-watch inner
   loop. The shell + health service is started by **`./harness boot`** (execs
   `npm run start`). The README documents both distinctly so AC3's "documented dev
   command" that starts the shell+health is unambiguously `./harness boot`.

6. **Port and health/shell contract.** The server listens on port **3000** by
   default, overridable via the **`PORT`** environment variable. Routes:
   `GET /health` → `200`, `content-type: application/json`, body `{"status":"ok"}`;
   `GET /` → `200`, `content-type: text/html`, a deliberately **thin** static
   shell page (no navigation, project library, polished UI, auth, or editor
   embedding — PRD §4 hyp. 6, §5.5, §28.7); any other path → `404`.

7. **Test runner — Node built-in `node:test`, and wire the harness `test` verb.**
   The health/shell check uses Node's built-in `node:test` + global `fetch` (zero
   dependency). `package.json` gains `"test"` running
   `node --test --experimental-strip-types` over `tests/app/`. The harness `test`
   verb is wired (`test: { maps_to: "npm test" }`, a run-to-completion capability
   verb — no `mode`), moving it from `unknown` → `pass` and, via the existing
   `verify.aggregate` (R6), into the `verify` gate. `verify` stays **`degraded`**
   (exit 0) because `lint`/`build` remain intentionally `unknown` (ADR-0002); it
   turns `fail` only if `typecheck` or `test` actually fails. `lint` and `build`
   stay `unknown` (no linter/build added — ADR-0002).

8. **No new core-component.** At Prototype 0 the health endpoint is a single,
   deliberately thin, service-level liveness signal — issue-local, not yet a
   reusable behavioural contract consumed by multiple surfaces. No
   CORE-COMPONENT-0004 is created; a shared HTTP/health API contract is deferred
   until a validated multi-consumer need emerges (e.g. the per-project
   `runtime/health` API of PRD §16/§17.2).

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Web framework (Express/Fastify/Next.js) | Batteries-included routing | New runtime dependency; would need an ADR-0002 amendment | Breaches ADR-0002 Decision 7 / PRD §28.7; `node:http` serves a thin shell + one route with zero deps |
| Add a `tsc` emit/build step (emit JS, then `node dist/`) | Runs plain JS; no experimental flag | Introduces a build pipeline and emitted artifacts | Breaches ADR-0002 "no build beyond `tsc`" (Decision #10/#13); `--experimental-strip-types` runs source with no emit |
| Add a TS loader/runner dependency (`ts-node`/`tsx`) | Mature TS execution | New dependency and tooling growth | Violates ADR-0002 dependency-light; the built-in flag needs nothing installed |
| Readiness-probe + detach for `boot` (return a real verdict) | Fits the run-once verdict+evidence model | Extra process-lifecycle machinery; speculative at Prototype 0 | ADR-0004 already provides the sanctioned `mode: exec` handoff; heavier is unjustified for a thin shell (§28.7) |
| Overload `./harness dev` to also serve the app | One fewer verb | Conflates the typecheck-watch inner loop with app-serve; breaks AC clarity | `dev` and `boot` are distinct concerns (ADR-0004); `boot` was reserved for exactly this (Decision #40) |
| Jest/Vitest test framework | Rich assertions/mocks | New dependency; ADR-0002 strain | `node:test` ships with Node 22 and proves the endpoint with zero deps |
| Create CORE-COMPONENT-0004 (health/HTTP contract) now | Future endpoints conform | Speculative; over-builds a liveness spike | Research recommends against at Prototype 0; keep the endpoint issue-local until a multi-consumer need is validated |
| Fixed port only (no env override) | Marginally simpler | Inflexible for demos/parallel runs | A `PORT` env override is near-free and avoids port collisions |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- Ascend runs as a real service for the first time — shell at `http://localhost:3000`
  and `GET /health` → `200 {"status":"ok"}` — with **zero new runtime dependency**;
  the app and tests run fully offline.
- `boot` is wired by **contract data only** (no `harness` script change), reusing
  the ADR-0004 `mode: exec` handoff already covered by the regression suite.
- The `test` verb moves `unknown` → `pass` and joins the `verify` aggregate, so
  the gate now proves the health/shell behaviour — with no harness code change.
- Fully reversible and minimal (a ~2-file `node:http` server, a thin HTML string,
  one test); honours ADR-0002/0003/0004 and PRD §4/§5.5/§28.7.

### Negative
- Runtime execution depends on the **experimental** `--experimental-strip-types`
  flag: it emits an `ExperimentalWarning`, supports only a subset of TS, and its
  behaviour may shift across Node 22.x patch releases (mitigated by
  strip-types-safe code and the `>=22.6.0 <23` pin).
- The supported runtime range **narrows from "major 22" to `>=22.6.0 <23`** because
  `--experimental-strip-types` is unavailable before Node **v22.6.0**; Node 22.0–22.5
  are now unsupported (they cannot run `npm run start`/`npm test`). `engines.node`,
  `.nvmrc`, the README, and `doctor` MUST reflect the `>=22.6.0` floor — `doctor`
  reports `degraded` (never `fail`) when the running Node is major 22 but minor < 6.
  This is CORE-COMPONENT-0003 R15 applied to the narrowed range; **no CC-0003
  amendment** is needed.
- `verify` now **runs the test suite** as an aggregate member, so it is slower and
  turns `fail` if a test fails — intended, but a new way for the gate to block.
- `@types/node` is added to `package.json`; `package-lock.json` cannot be
  regenerated in the network-blocked sandbox, so the lock will drift until a
  connected `npm install` refreshes it (the gate is `tsc --noEmit`, not `npm ci`,
  so lock drift does not fail `verify`).
- The harness now hands off a second long-running process (`boot`); the regression
  suite must never run bare `./harness boot` (it would bind a port / hang) and
  must prove invocability via `boot --print`/`--json` instead.

### Neutral
- Default port is 3000 with a `PORT` override; the demo URL is documented in the
  README.
- `src/placeholder.ts` is replaced by `src/server.ts` + `src/main.ts`.
- The health/HTTP contract stays issue-local; a shared contract is deferred (no
  core-component).

## Related Issues

- [#6](https://github.com/jsburckhardt/ascend/issues/6) — Add a minimal Ascend health endpoint and application shell (this ADR)
- [#2](https://github.com/jsburckhardt/ascend/issues/2) — parent Prototype 0 feature
- [#5](https://github.com/jsburckhardt/ascend/issues/5) — introduced the `mode: exec` handoff category (ADR-0004) that #6 reuses for `boot`

## References

- ADR-0002 — Ascend baseline technology stack and repository layout (no web framework, no build beyond `tsc`, dependency-light)
- ADR-0003 — Adopt a repo-local engineering harness (`./harness`) as the operating surface (wrap, never reimplement; data-driven wiring)
- ADR-0004 — Interactive/handoff verbs in the engineering harness (`mode: exec`; reserves `boot` for #6)
- CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction conventions (R6 aggregate, R8 data-driven, R16 regression suite, R17 interactive/handoff verbs)
- PRD §29 (Prototype 0 scope), §4 hypothesis 6 & §5.5 (thin shell / small spikes), §28.7 (avoid speculative frameworks), §16/§17.2 (future per-project runtime health API — signal only)
- `project/issues/6/research/00-research.md` — research brief (proposed ADR-0005; enumerated the decision points)
- Node.js docs — `node --experimental-strip-types`, built-in `node:http`, and the `node:test` runner
