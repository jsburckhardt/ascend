# Engineering harness (`./harness`)

`./harness` is Ascend's **single, documented operating surface** for humans and
agents. It **wraps** the repo's existing commands (it never reimplements them or
invents a build system) and reports one honest verdict per verb. It is the
first-choice way to run supported workflows — prefer `./harness <verb>` over
calling a wrapped command directly.

- Adopted by **ADR-0003** (repo-local engineering harness).
- Behavioural contract in **CORE-COMPONENT-0003** (verdicts, `--json` schema,
  evidence/friction conventions, KEY_QUESTION rule).
- Machine-readable contract: [`.harness/contract.yml`](./contract.yml).

## Single entry point

```sh
./harness <verb> [--json] [args]
```

Run `./harness help` to list the supported verbs. The harness is a portable
POSIX shell script and adds **no new runtime dependency** — it only needs a
POSIX shell and the tooling already present in the checkout (Node/npm for the
wrapped `typecheck`).

## Verdicts and the exit-code contract

Every verb returns exactly one verdict:

| Verdict | Meaning | Exit code |
|---------|---------|-----------|
| `pass` | The wrapped command ran and succeeded. | `0` |
| `fail` | The wrapped command ran and **failed**, OR a required record (evidence/friction) could not be persisted (R14). | `1` (non-zero) |
| `degraded` | The capability is partially available/proven (e.g. an aggregate whose sub-checks include `unknown`). | `0` |
| `unknown` | No backing command exists to prove the capability — it is **not faked**. | `0` |

**Only a real `fail` exits non-zero.** `unknown` and `degraded` are honest,
**expected** states in the Issue #4 baseline — they are *not* defects and *must
not* be read as failures by CI or the verifier. A usage error (bad/missing verb)
is not a verdict and exits `2`.

## Verbs and current verdicts (Issue #4 baseline)

| Verb | Backing command today | Current verdict | `--json` |
|------|-----------------------|-----------------|----------|
| `help` | repo metadata (native) | `pass` | no |
| `orient` | repo metadata / contract (native) | `pass` | yes |
| `doctor` | Node vs `.nvmrc`/`engines`, `node_modules` presence (native) | `pass` (or `degraded`) | yes |
| `lint` | none (no ESLint/Prettier) | `unknown` | yes |
| `test` | none (no runner/script/files) | `unknown` | yes |
| `build` | none (`tsc` is `noEmit`; nothing emits) | `unknown` | yes |
| `boot` | none (no dev/serve app yet) | `unknown` | yes |
| `dev` | `npm run dev` (`tsc --noEmit --watch`) — interactive handoff (`mode: exec`) | n/a — hands off via `exec`, emits **no verdict** | yes (descriptor) / `--print` |
| `verify` | `npm run typecheck` (aggregate) | `degraded` | yes |
| `status` | contract + last evidence (native) | `pass` | yes |
| `clean` | none (harness-owned evidence only) | `degraded` | yes |
| `friction add` | harness-native | `pass` | no |
| `friction list` | harness-native | `pass` | yes |

`npm run typecheck` is wrapped **only** by `verify`. It is deliberately **not**
aliased under `lint`, `test`, or `build` — misrepresenting a typecheck as a
linter/test/build would hide the very proof gaps the KEY_QUESTION exists to
surface.

### `verify` aggregation policy

`verify` derives its overall verdict from its member checks (its own wrapped
`typecheck` plus every verb in `verify.aggregate`: `lint`, `test`, `build`,
`doctor`) using one fixed, ordered total function (CORE-COMPONENT-0003 R6),
evaluated in this order:

1. **any member `fail` → `fail`** (exit 1);
2. else **every member `pass` → `pass`**;
3. else **every member `unknown` → `unknown`**;
4. otherwise (a mix of `pass`/`degraded`/`unknown` with no `fail`) **→ `degraded`**.

`doctor` only emits `pass`/`degraded`, so it can move the aggregate toward
`degraded` but never `fail`. In the Issue #4 baseline `verify` returns
**`degraded`** (typecheck `pass`; `lint`/`test`/`build` `unknown`; `doctor`
`pass`). Every run writes a timestamped evidence record under
`.harness/evidence/`. If that **required evidence record cannot be persisted**,
`verify` returns **`fail`** and exits non-zero — it never masks a persistence
failure as `pass`/`degraded`/`unknown` (R14). On a failure path the human output
prints any diagnostics **before** the single terminal `Verdict: <value>` line, so
the last line of output is always exactly the verdict.

## Interactive/handoff verbs (`mode: exec`, R17)

A verb whose backing command is a long-running, interactive process (a dev watch
or a serve loop) cannot be run to completion by the run-once capability handler —
it would block forever and never return a verdict. Such a verb is declared in
[`.harness/contract.yml`](./contract.yml) with the attribute **`mode: exec`**
(data-driven). Absence of `mode` — or `mode: capability` — selects the default
run-to-completion behavior, so **every pre-existing verb is unchanged**.

The only interactive/handoff verb today is **`dev`** (backing command
`npm run dev` = `tsc --noEmit --watch`). A `mode: exec` verb:

- **Hands off via `exec`.** `./harness dev` replaces the harness process with the
  wrapped command (`cd "$ROOT" && exec sh -c "npm run dev"`), so the harness
  never runs it to completion and never blocks. The wrapped command's exit code
  becomes the process exit code.
- **Is verdict/evidence-exempt.** Because it hands off, it emits **no**
  `pass`/`fail`/`degraded`/`unknown` verdict and writes **no** evidence — it is
  exempt from the single-verdict rule (R2), the verdict→exit-code mapping (R3, it
  propagates the exec'd command's exit code instead), and the evidence rule (R5).
- **Stays honest when unmapped.** If its `maps_to` were `null`/`native`, it would
  behave like an unmapped capability verb — verdict `unknown`, exit `0`, and a
  friction entry answering the KEY_QUESTION — and would `exec` nothing.
- **Exposes a non-exec introspection form.** To resolve the wrapped command
  without starting it:

  ```sh
  ./harness dev --print   # prints: npm run dev   (exit 0, no exec)
  ./harness dev --json     # JSON descriptor (exit 0, no exec):
  # {"harness_version":"1","verb":"dev","timestamp":"…","mode":"exec",
  #  "maps_to":"npm run dev","interactive":true}   ← note: NO "verdict" key
  ```

`help` and `orient` list `dev` as an interactive handoff (`orient` also surfaces
the resolved `dev` command); the automatic verb count includes it. The regression
suite (`tests/harness/run.sh`) never `exec`s `dev`; it proves invocability via
`dev --print`/`--json` (which cannot hang).

## `--json` contract

Every machine-facing verb (`orient`, `doctor`, `lint`, `test`, `build`, `boot`,
`dev`, `verify`, `status`, `clean`, `friction list`) supports `--json` and emits a
stable schema. Required keys on every JSON response:

```json
{ "harness_version": "1", "verb": "verify", "verdict": "degraded", "timestamp": "2026-07-20T07:20:35Z" }
```

Aggregate verbs (e.g. `verify`) additionally include `checks[]`; verbs that write
evidence additionally include `evidence`. Consumers read `verdict` (and, for
aggregates, `checks[].verdict`) rather than parsing human text. The
`pr-review-complement` skill already relies on `./harness orient` and
`./harness verify --json`.

Interactive/handoff verbs (`mode: exec`, e.g. `dev`) are the one documented
exception: their `--json` form is a non-exec **descriptor** that is
verdict-exempt (R17) and therefore **omits** the `verdict` key, carrying
`mode: "exec"`, `maps_to`, and `interactive: true` instead (see above).

```sh
./harness orient --json
./harness verify --json      # verdict: degraded (typecheck passes; test/lint/build unknown)
./harness test  --json       # { "verb": "test", "verdict": "unknown", ... }
```

## Evidence

`verify` writes a timestamped JSON record under
[`.harness/evidence/`](./evidence/) on every run and references that path in its
output. Evidence **run output is git-ignored** (ephemeral, noisy); the directory
is retained in version control via a committed `.gitkeep`.

## Friction and the KEY_QUESTION

Whenever a verb returns `unknown`/`degraded` because a backing command is
missing, the harness records a **friction entry** in
[`.harness/friction.jsonl`](./friction.jsonl) (committed, append-only JSON
Lines). Every entry answers the **KEY_QUESTION** verbatim:

> **What did the agent have to infer that the harness should have proved?**

Each record carries: `ts`, `verb`, `key_question`, `inference`, `proof_gap`,
`suggested_closure` (and an optional `severity`). Record and read gaps:

```sh
./harness friction add --verb test \
  --inference "No test runner exists" \
  --proof-gap "No npm test script or test files" \
  --suggested-closure "Wire test verb in contract.yml when #5 lands"
./harness friction list --json
```

## How gaps close later

Later stories (#5 dev/validation, #6 shell + health) move a verb from `unknown`
to `pass` by editing the verb's `maps_to` in
[`.harness/contract.yml`](./contract.yml) (data) — **not** by restructuring the
harness — and then closing the corresponding friction entry.

### Issue #5 status: dev inner loop and validation

- **Development inner loop (invokable through the harness):** the Prototype-0
  "start the local development environment" command is **`./harness dev`** — an
  interactive/handoff verb (`mode: exec`) that `exec`s **`npm run dev`**
  (`tsc --noEmit --watch` — continuous typecheck feedback). It is genuinely
  invokable through the harness CLI (resolving review finding F-01 / ADR-0004);
  introspect it without starting the watch via `./harness dev --print` or
  `./harness dev --json`. See the root [`README.md`](../README.md) and
  [ADR-0004](../project/architecture/ADR/ADR-0004-interactive-handoff-verbs.md).
- **`boot` stays `unknown` (owned by #6):** `boot` is reserved for the real
  **app-serve + health** endpoint, a distinct concern from the dev inner loop, so
  `boot.maps_to` remains `null`. Wrapping app-serve (it may reuse this
  `mode: exec` handoff pattern or choose readiness-probe + detach) is delivered by
  **issue #6** (shell + health); #5 does **not** rewire `boot`.
- **`verify` = `degraded` is the accepted baseline:** `./harness verify` wraps
  `npm run typecheck` (which passes) and stays `degraded` because `lint`,
  `test`, and `build` remain `unknown`. `degraded` exits `0` and is the honest,
  non-blocking Prototype-0 validation state — #5 does **not** add a
  linter/test-runner/build to force `pass` (ADR-0002, no speculative frameworks).
- **No alias:** `npm run typecheck` is wrapped **only** by `verify`; it is never
  aliased as `lint`, `test`, or `build`, and no redundant `validate`/`check`
  entry point is introduced. `npm run dev` is the backing script for `./harness
  dev` and is not aliased elsewhere.

## Agent workflow

The RPIV stages MUST prefer `./harness` for supported verbs and MAY bypass to a direct
command only when the contract lacks the verb or the harness reports
`unknown`/`degraded` — and MUST log that gap via `./harness friction add` (collected in
`.harness/friction.jsonl`). The harness-usage rules are embedded (idempotently) in the RPIV
stage agents only — `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, `rpiv-verifier` —
between `<!-- HARNESS:BEGIN -->` / `<!-- HARNESS:END -->` markers inside their `<instructions>`.
The `ship` orchestrator does not run the harness; it dispatches the stages.
