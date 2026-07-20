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

## `--json` contract

Every machine-facing verb (`orient`, `doctor`, `lint`, `test`, `build`, `boot`,
`verify`, `status`, `clean`, `friction list`) supports `--json` and emits a
stable schema. Required keys on every JSON response:

```json
{ "harness_version": "1", "verb": "verify", "verdict": "degraded", "timestamp": "2026-07-20T07:20:35Z" }
```

Aggregate verbs (e.g. `verify`) additionally include `checks[]`; verbs that write
evidence additionally include `evidence`. Consumers read `verdict` (and, for
aggregates, `checks[].verdict`) rather than parsing human text. The
`pr-review-complement` skill already relies on `./harness orient` and
`./harness verify --json`.

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

## Agent workflow

The RPIV stages MUST prefer `./harness` for supported verbs and MAY bypass to a direct
command only when the contract lacks the verb or the harness reports
`unknown`/`degraded` — and MUST log that gap via `./harness friction add` (collected in
`.harness/friction.jsonl`). The harness-usage rules are embedded (idempotently) in the RPIV
stage agents only — `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, `rpiv-verifier` —
between `<!-- HARNESS:BEGIN -->` / `<!-- HARNESS:END -->` markers inside their `<instructions>`.
The `ship` orchestrator does not run the harness; it dispatches the stages.
