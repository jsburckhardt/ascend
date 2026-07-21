# ADR-0006: code-server editor-provider launch, argument isolation, and read-only project-path safety

## Status

Accepted

## Context

Issue #7 (PRD §29 Prototype 0, item 4) is Ascend's **first external editor-provider
integration**: a documented command must launch **one** `code-server` process
against a configured local filesystem path so a contributor can reach the editor
in the browser, open that folder, and use its integrated terminal. This is the
runtime implementation of PRD §14.2 "Host process runtime" — *"Launch `code-server`
directly as a child process."* The Ascend `node:http` shell (#6, ADR-0005) is a
**separate** process; at Prototype 0 there is deliberately no integration between
the two (reverse proxy / iframe embedding are Prototype 1+).

Most of the machinery #7 needs is **already decided** and reused, not re-litigated:

- **ADR-0004** established the `mode: exec` interactive/handoff verb category — the
  sanctioned way to invoke a long-running process through the harness without
  hanging it. A `code-server` instance is exactly such a process.
- **ADR-0005** reused that category for `boot` (`mode: exec` → `npm run start`) and
  set the `PORT` env-override precedent, and it **explicitly names this story** as
  binding: *"This decision is binding on every later serving story (code-server
  launcher #7, reverse proxy, editor embedding, runtime/editor health)."*
- **CORE-COMPONENT-0003 R8/R17** make verb wiring data-driven and define the
  handoff verb's exemptions and `--print`/`--json` introspection.

What is **genuinely new** — and is why this is recorded as an ADR rather than
slipped in as implementation — is a durable **provider seam** that every later
serving story inherits:

1. **Provider-argument isolation (PRD §5.7).** `code-server` is the first editor
   provider. Its CLI arguments, bind address, port, `--auth` posture, and config
   paths must **not** leak into the Ascend core (`src/`) or the harness script, so a
   future editor provider can be swapped behind the same seam.
2. **Read-only project-path safety (PRD §28.6 / issue AC5).** The launch operation
   MUST NOT delete, move, rename, reset, clean, or otherwise modify the target
   directory — filesystem mutation is not this story's purpose. (Files the *user*
   edits inside the running editor change in place; that is the *next* story's
   concern. The launcher's own footprint on the target must be nil.)

Empirical grounding (this checkout): `code-server` is **not installed** anywhere
(`command -v code-server` → none; not in `node_modules/.bin`; `.devcontainer/`
declares no editor feature), and `./harness doctor` proves only Node health, not
editor-provider availability. The `.harness/contract.yml` has no editor/launcher
verb. So the launch mechanism, the isolated flags, the fail-fast path validation,
and the read-only guarantee are new work that must be recorded, even though the
*invocation pattern* is inherited.

A borderline point was consciously decided: whether to build a reusable
`EditorProvider` abstraction (PRD §15) now. It is **deferred as speculative**
(PRD §28.7; ADR-0002 minimality) — there is exactly one provider and one consumer
at Prototype 0, mirroring ADR-0005 D8's choice to keep the health/HTTP contract
issue-local. The isolation is achieved by a **single launcher seam**, not a
framework, so **no new core-component is created** by this ADR.

## Decision

Establish the code-server launch as a **single, dependency-light, read-only
launcher seam** surfaced through the harness by the inherited `mode: exec` handoff,
with all provider-specific arguments isolated behind that one script.

1. **Launch mechanism — a single POSIX shell launcher script.** All code-server
   launch logic lives in one dependency-light POSIX shell script,
   `scripts/launch-editor.sh` (consistent with the `harness` / `tests/harness/`
   shell convention, and avoiding the ADR-0005 `--experimental-strip-types` Node
   floor a `src/` TS launcher would inherit). It is **not** placed in `src/` — it is
   process orchestration, not Ascend HTTP app logic. It launches `code-server` as a
   host **child process** (PRD §14.2), replacing itself via `exec` so the
   process/exit code propagates.

2. **Harness surfacing — a new `mode: exec` verb `edit`, wired by contract data
   (plus a minimal dispatch-allowlist edit).** The launcher is surfaced on the
   single operating surface (ADR-0003) as a **provider-agnostic** verb `edit`,
   declared in `.harness/contract.yml` as
   `edit: { maps_to: "npm run edit", mode: exec, json: true }` (reusing the
   ADR-0004/0005 `boot` handoff). `npm run edit` runs `sh scripts/launch-editor.sh`.
   The `mode`→handler selection stays **data-driven** (`dispatch_verb`, R8/R17).
   Because the harness `main()` routes only an allowlisted set of verb **names**,
   the new name `edit` MUST also be added to that `main()` dispatch case and to
   `verb_help` — a minimal **structural-dispatch** edit that CORE-COMPONENT-0003 R8
   permits ("a structural dispatch that routes a verb name to its handler function
   is permitted; that is dispatch mechanics, not command wiring"). No verdict/exit
   handler logic changes.

3. **Provider-argument isolation (PRD §5.7).** **Every** code-server-specific flag
   — the `<PROJECT_PATH>` positional, `--bind-addr`, `--auth none`, and any config
   path — lives **only** inside `scripts/launch-editor.sh`. The harness verb, the
   npm script, `src/`, and the docs pass **only** provider-agnostic inputs
   (`PROJECT_PATH`, optional `EDITOR_PORT`). No code-server flag may appear in
   `.harness/contract.yml`, the `harness` script, or `src/`. No generic
   `EditorProvider` interface is built (§28.7) — the single seam *is* the isolation.

4. **Target configuration — the `PROJECT_PATH` environment variable; bind via
   `EDITOR_PORT`.** The folder to open is configured with the **`PROJECT_PATH`**
   environment variable (mirroring the ADR-0005 D6 `PORT` precedent). The instance
   binds **loopback only** at `127.0.0.1:${EDITOR_PORT:-8080}` (code-server's default
   port) and runs with **`--auth none`** — acceptable because authentication and
   non-local exposure are explicitly out of scope for this local Prototype-0 spike
   (PRD §29 non-goals; §5.6 local-first). Both the port default and the auth posture
   are owned by the launcher (§5.7).

5. **Read-only, fail-fast validation (PRD §28.6 / AC5).** Before launching, the
   launcher performs **validate-only** checks and fails fast with a clear message
   and a **non-zero exit** when the target is not usable, and it NEVER repairs or
   mutates the target:
   - `PROJECT_PATH` **unset** or **empty** → error + non-zero exit.
   - `PROJECT_PATH` **does not exist** → error + non-zero exit.
   - `PROJECT_PATH` **is not a directory** (e.g. a file) → error + non-zero exit.
   - The launcher issues **no** `mkdir`/`mkdir -p`, `rm`, `mv`, `rename`, `reset`,
     or `clean` against the target under any path — validation uses only
     non-mutating checks (e.g. `test -d`). This guarantees AC5/§28.6.

6. **Crash / exit behaviour.** Under `mode: exec` the handoff **propagates
   code-server's exit code** (ADR-0004 Decision #46); the launcher adds **no**
   process supervision, restart, or health probing (that is later scope). If the
   `code-server` binary is **absent**, the launcher fails fast with a clear
   "code-server not found" message and a non-zero exit (a documented prerequisite,
   not a repo defect).

7. **Provisioning & verification split.** `code-server` is a **documented
   prerequisite** for the manual demo — it is not bundled with Node/npm and is
   absent in this devcontainer/CI. Therefore:
   - **AC1–AC3** (script launches one instance; editor reachable and opens the
     folder; integrated terminal works) are verified by **manual demonstration** on
     a code-server-provisioned environment, capturing the startup command and
     startup duration (PRD §29 evidence).
   - **AC4–AC5** (invalid-path behaviour; read-only/no-mutation) are verified by
     **code-server-free automated tests** (`node:test`, ADR-0005 D7) that drive the
     launcher script directly and assert exit codes, error messages, argument
     isolation (via a stub `code-server` on `PATH`), and zero target mutation. These
     stay green in CI without code-server and are wired into the `verify` gate.
   Extending `./harness doctor` to report code-server presence as a readiness
   diagnostic (degraded, never fail) is **deferred** to a later story.

8. **No new core-component.** A reusable `EditorProvider` launch/isolation contract
   is a genuine *future* cross-cutting concern, but building it now is speculative
   (§28.7; ADR-0002). With one provider and one consumer, provider isolation is a
   single launcher seam. **No CORE-COMPONENT-0004 is created**; revisit only when a
   second editor provider or a multi-consumer need (reverse proxy + embedding +
   runtime health) is validated.

## Alternatives

What other options were considered? Why were they rejected?

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Build a generic `EditorProvider` abstraction/SDK now (PRD §15) | Future providers slot in cleanly | Speculative framework with one provider/one consumer | Violates PRD §28.7 / ADR-0002 minimality; the single launcher seam already isolates the provider |
| Write the launcher in `src/` TypeScript (run via `--experimental-strip-types`) | Reuses the app runtime | Inherits the Node ≥22.6.0 floor and strip-types-safe constraints (ADR-0005 D2) for pure process orchestration | A POSIX shell launcher avoids runtime coupling and matches the `harness`/`tests/harness` convention |
| Keep the launcher as a standalone documented command **outside** the harness | Zero harness change | Not invokable on the single operating surface; documentation is not invocation (ADR-0004 F-01) | ADR-0003 mandates `./harness` as the first-choice surface; reuse the `mode: exec` handoff |
| Map the long-running launch into the run-to-completion **capability** handler | Data-only, no new mode | Hangs `./harness` and the regression suite forever (binds a port, never returns) | ADR-0004 Decision #41 forbids exactly this; use the `mode: exec` handoff |
| Leak code-server flags into the harness verb / npm script / docs | Marginally fewer files | Couples the core to code-server; breaks §5.7; a provider swap would touch many places | All provider flags MUST live behind the one launcher seam (§5.7) |
| `mkdir -p "$PROJECT_PATH"` convenience when the path is missing | "Just works" for typos | Mutates/creates the target — breaches the read-only safety criterion | Violates PRD §28.6 / AC5; the launcher must be validate-only and fail fast |
| Auto-provision code-server (bake into devcontainer, install on launch) | Turnkey demo | Heavier; rebuilds the container; network-dependent; scope creep for a spike | Keep provisioning a documented prerequisite; the launcher fails fast with guidance when absent |
| Enable auth / non-loopback bind for the spike | Closer to production | Auth and remote exposure are explicitly out of scope for #7 | `--auth none` + loopback bind is the correct local Prototype-0 posture (PRD §29 non-goals, §5.6) |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- Ascend can launch the editor for the first time via one documented command
  (`PROJECT_PATH=<dir> ./harness edit`) on the single operating surface, reusing the
  proven `mode: exec` handoff with **zero new runtime dependency**.
- All code-server specifics are isolated behind one script, so a future editor
  provider (or a bind/auth change) touches exactly one file (§5.7).
- The read-only, validate-only launcher makes the AC5/§28.6 safety guarantee
  explicit and testable; the no-mutation and invalid-path behaviours are covered by
  code-server-free automated tests that stay green in CI.
- Fully reversible and minimal; honours ADR-0002/0003/0004/0005 and PRD §5.7/§14.2/§28.6/§28.7.

### Negative
- The harness now hands off a **third** long-running process (`edit`); the
  regression suite must never run bare `./harness edit` (it would bind a port /
  hang) and must prove invocability via `edit --print`/`--json` (R17.5).
- Adding a new verb **name** requires a minimal `harness` `main()` dispatch-allowlist
  edit plus a `verb_help` line — it is not purely data-only (recorded as friction);
  the `mode`→handler selection remains data-driven.
- **AC1–AC3 cannot be auto-verified** without provisioning code-server; they rely on
  a manual demo. Provider readiness is not proven by `doctor` (deferred).
- `--auth none` + loopback bind is safe only for a local spike; it must be revisited
  before any shared/remote exposure (out of scope now, but a known follow-up).

### Neutral
- A new `scripts/` directory (for `scripts/launch-editor.sh`) and a new
  `tests/launcher/` suite are introduced; the `npm test` glob is widened to include
  them so the launcher tests join the `verify` gate.
- `EDITOR_PORT` defaults to `8080` (code-server's default) and is overridable,
  mirroring the `PORT` idiom but kept behind the launcher seam.
- The provider-isolation/launch-safety contract stays issue-local; a shared
  `EditorProvider` contract is deferred (no core-component).

## Related Issues

- [#7](https://github.com/jsburckhardt/ascend/issues/7) — Launch one code-server process against a configured path (this ADR)
- [#6](https://github.com/jsburckhardt/ascend/issues/6) — application shell + `/health` (ADR-0005; the Ascend server is a separate process)
- [#2](https://github.com/jsburckhardt/ascend/issues/2) — parent Prototype 0 feature

## References

- ADR-0002 — Ascend baseline technology stack and repository layout (dependency-light; no speculative frameworks; `code-server` integration named as a later Prototype-0 story)
- ADR-0003 — Adopt a repo-local engineering harness (`./harness`) as the operating surface (wrap, never reimplement; data-driven wiring)
- ADR-0004 — Interactive/handoff verbs in the engineering harness (`mode: exec`; long-running process handoff; exit-code propagation)
- ADR-0005 — Ascend application-serve runtime (`boot` `mode: exec` handoff; `PORT` env precedent; binding on every later serving story incl. this one; `node:test` runner)
- CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction conventions (R8 data-driven wiring / permitted structural dispatch, R16 regression suite, R17 interactive/handoff verbs)
- PRD §5.7 (provider isolation), §14.2 (host process runtime), §28.6 (read-only project-path safety), §28.7 (avoid speculative frameworks), §29 (Prototype 0 scope, evidence to capture)
- `project/issues/7/research/00-research.md` — research brief (proposed this optional ADR; enumerated the seam and the verification split)
- code-server docs — CLI (`<path>`, `--bind-addr`, `--auth`), default `127.0.0.1:8080` bind
