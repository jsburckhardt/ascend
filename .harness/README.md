# Ascend engineering harness (`./harness`)

`./harness` is the **single documented operating surface** for running Ascend's supported
engineering workflows. It wraps the project's existing commands (it never reimplements
them), returns a consistent verdict, records evidence for verification runs, and records
any inference gaps as *friction*.

- Adopted by **[ADR-0003](../project/architecture/ADR/ADR-0003-adopt-engineering-harness.md)**.
- Contract defined by **[CORE-COMPONENT-0003](../project/architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md)**.
- Generated via the **`harness-cli-it`** agent.

The harness is dependency-light: it needs only a POSIX shell to run. Only the *wrapped*
commands (`npm install`, `npm run typecheck`) require the Node.js 22 toolchain (ADR-0002).

## Single entry point

```bash
./harness <verb> [--json] [--strict]
```

Run `./harness help` to list verbs, or `./harness orient` for a repo summary.

## Verdicts

Every verb returns exactly one verdict:

| Verdict | Meaning | Exit code |
|---------|---------|-----------|
| `pass` | The wrapped check ran and succeeded. | `0` |
| `fail` | The wrapped check ran and failed. | non-zero |
| `degraded` | The check could not fully run (e.g. toolchain/deps missing). | `0` (`--strict` → non-zero) |
| `unknown` | No such command is declared; nothing to wrap. | `0` (`--strict` → non-zero) |

`--json` prints machine-readable output (a `verdict` field) for the important verbs.
`--strict` makes `degraded`/`unknown` exit non-zero.

## Verbs

| Verb | Wraps | Verdict today |
|------|-------|---------------|
| `help` | — | lists verbs |
| `orient` | — | repo/stack/contract summary |
| `doctor` | Node/npm vs `.nvmrc` + `engines` | `pass`/`degraded` |
| `boot` | `npm install` | `pass`/`fail`/`degraded` |
| `typecheck` | `npm run typecheck` | `pass`/`fail`/`degraded` |
| `verify` | `doctor` + `npm run typecheck` (+ evidence) | `pass`/`fail`/`degraded` |
| `status` | git + toolchain probe | `pass` |
| `clean` | inferred: remove `*.tsbuildinfo`, `dist/` | `pass` |
| `lint` | — (none declared) | `unknown` |
| `test` | — (none declared) | `unknown` |
| `build` | — (none declared; `tsc --noEmit` is typecheck) | `unknown` |
| `friction add "<note>"` | — | appends a friction record |
| `friction list` | — | lists friction records |

`lint`, `test`, and `build` are honestly `unknown` because Ascend has not declared those
commands yet (see the friction log). A later story adds them; the harness will then wrap
them and their verdicts become real.

## Evidence

`./harness verify` writes a timestamped JSON record to `.harness/evidence/` and updates
`.harness/evidence/latest.json`. Each record holds the overall verdict and per-check results
(`doctor`, `typecheck`) with timestamps — no secret-bearing output is captured.

## Friction

`.harness/friction.jsonl` records, one JSON object per line, every inference the harness had
to make — each answering: *"What did the agent have to infer that the harness should have
proved?"* Add one with `./harness friction add "<note>"`.

## Supported workflows

### Human workflow

```bash
./harness doctor     # 1. confirm your Node 22 toolchain
./harness boot       # 2. install dependencies (npm install)
./harness verify     # 3. run the checks (typecheck) + write evidence
./harness status     # anytime: git + toolchain + deps snapshot
./harness clean      # remove build artifacts when needed
```

### Agent workflow

Agents MUST prefer `./harness` over calling the wrapped commands directly (see `AGENTS.md`
and each `.github/agents/*.agent.md`):

```bash
./harness orient --json        # discover the contract and wrapped commands
./harness doctor --json        # gate on the toolchain
./harness boot --json          # install deps if status shows them missing
./harness verify --json        # verification surface used by the RPIV Verify stage
./harness friction add "…"     # record any gap when bypassing the harness
```

When a needed verb is missing or reports `unknown`/`degraded`, an agent MAY run the direct
command, but MUST record the gap with `./harness friction add`.

## RPIV verification

`.github/soft-factory/verification.yml` registers `./harness verify` as the RPIV Verify
stage's verification command, so the pipeline uses the harness as its verification surface.
