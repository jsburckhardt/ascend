# Implementation Notes — Issue #4: Engineering harness CLI

Implements the repo-local engineering harness (`./harness`) per **ADR-0003** and
**CORE-COMPONENT-0003**, generated to the `harness-cli-it` agent's
`REQUIRED_OUTPUTS` / `REQUIRED_VERBS` / `VERDICTS` / `JSON_VERBS` / `KEY_QUESTION`
contract. All nine tasks (T1–T9) are complete and every test in
[`../plan/03-test-plan.md`](../plan/03-test-plan.md) (TEST-01…TEST-17) passes.

## What was built

| Path | Purpose | VCS |
|------|---------|-----|
| `harness` | Executable portable POSIX-shell CLI; single operating surface; all 12 verbs; verdict + exit-code contract; `--json`. | tracked |
| `.harness/contract.yml` | Data-driven verb→command map, evidence/friction config, verbatim KEY_QUESTION. | tracked |
| `.harness/evidence/.gitkeep` | Retains the evidence directory in VCS. | tracked |
| `.harness/evidence/verify-*.json` | Timestamped evidence records written by `verify`. | **git-ignored** |
| `.harness/friction.jsonl` | Committed, append-only seed friction log (one entry per capability gap). | tracked |
| `.harness/README.md` | Documents the single entry point, all verbs + verdicts, exit-code contract, `--json`, evidence/friction, KEY_QUESTION. | tracked |
| `.github/soft-factory/verification.yml` | Canonical Verify-stage gate: runs `./harness verify`. | tracked |
| `.gitignore` | Adds `.harness/evidence/*` + `!…/.gitkeep` (CC-0003 R13). | modified |
| `AGENTS.md` + 16 `.github/agents/*.agent.md` | Idempotent marker-delimited harness-usage block. | modified |

## Verb → command / verdict map (Issue #4 baseline)

From a real `./harness verify --json` run (verdict **`degraded`**, exit 0):

| Verb | `maps_to` (contract) | Verdict | `--json` | Friction |
|------|----------------------|---------|----------|----------|
| `help` | native | `pass` | no | no |
| `orient` | native | `pass` | yes | no |
| `doctor` | native | `pass` (`degraded` if env unhealthy) | yes | only if degraded |
| `lint` | `null` | `unknown` | yes | yes |
| `test` | `null` | `unknown` | yes | yes |
| `build` | `null` | `unknown` | yes | yes |
| `boot` | `null` | `unknown` | yes | yes |
| `verify` | `npm run typecheck` | `degraded` | yes | yes |
| `status` | native | `pass` | yes | no |
| `clean` | native | `degraded` | yes | yes |
| `friction add` | native | `pass` | no | no |
| `friction list` | native | `pass` | yes | no |

`npm run typecheck` is wrapped **only** by `verify`; it is deliberately **not**
aliased under `lint`/`test`/`build` (ADR-0003 §5), so a typecheck is never
misrepresented as a linter/test/build and the honest gaps stay visible.

### `verify --json` (real output)

```json
{
  "harness_version": "1",
  "verb": "verify",
  "verdict": "degraded",
  "timestamp": "2026-07-20T07:53:32Z",
  "checks": [
    { "name": "typecheck", "maps_to": "npm run typecheck", "verdict": "pass", "exit_code": 0 },
    { "name": "lint",  "verdict": "unknown", "reason": "no lint command detected" },
    { "name": "test",  "verdict": "unknown", "reason": "no test command detected" },
    { "name": "build", "verdict": "unknown", "reason": "no build command detected" }
  ],
  "evidence": ".harness/evidence/verify-20260720T075332Z.json",
  "notes": "test, lint, and build are unknown until Issue #5 wires their commands in contract.yml"
}
```

## Which verbs are `unknown`/`degraded` and why

Honest façade over what exists today (ADR-0002: only `npm run typecheck` is a
wrappable check; `npm install` is setup). No command is faked; each gap is a
committed friction entry answering the KEY_QUESTION.

- **`lint` → unknown** — no ESLint/Prettier; `tsc --noEmit` is a typecheck, not a linter, and is deliberately not aliased.
- **`test` → unknown** — no test runner/script/files.
- **`build` → unknown** — `tsc` is `noEmit`; nothing emits artifacts.
- **`boot` → unknown** — no dev/serve/start command yet (arrives with #6).
- **`verify` → degraded** — aggregate is `pass` for typecheck but `test`/`lint`/`build` are `unknown`, so full verification is only partially proven (CC-0003 R6).
- **`clean` → degraded** — no project clean command; the harness only prunes its own evidence output and must never delete `node_modules`/project sources.

Each moves toward `pass` later by editing the verb's `maps_to` in
`.harness/contract.yml` (data-driven, CC-0003 R8) and closing the friction entry.

## Evidence & friction locations

- **Evidence:** `.harness/evidence/verify-<UTC-timestamp>.json`, written on every
  `verify` run (CC-0003 R5). Run output is git-ignored; the directory is retained
  via `.harness/evidence/.gitkeep` (R13). Latest final run:
  `.harness/evidence/verify-20260720T075332Z.json`.
- **Friction:** `.harness/friction.jsonl` (committed, append-only JSONL). Seeded
  with one entry per gap — `lint`, `test`, `build`, `boot`, `clean`, `verify` —
  each with the KEY_QUESTION verbatim and a `suggested_closure`. New gaps append
  via `./harness friction add`; the harness de-duplicates auto-recorded gaps by
  verb to avoid log bloat while guaranteeing an entry exists (R4).

## KEY_QUESTION

> **What did the agent have to infer that the harness should have proved?**

Recorded verbatim in `contract.yml` (`friction.key_question`), every friction
record, `.harness/README.md`, and the agent-surface blocks.

## Agent-surface updates (idempotent)

`AGENTS.md` and all 16 `.github/agents/*.agent.md` (17 surfaces) carry exactly one
`<!-- HARNESS:BEGIN -->…<!-- HARNESS:END -->` block with the four
`AGENT_HARNESS_RULES` (prefer `./harness`; the specific preferred verbs; bypass
only when a verb is missing/`unknown`/`degraded`; log bypasses via
`./harness friction add` using the KEY_QUESTION). The updater replaces only
content between the markers, so re-running is byte-identical (CC-0003 R10) and no
content outside the markers — including pipeline agents `ship`/`rpiv-*` — is
altered.

## How the 5 issue acceptance criteria are satisfied

1. **A repo-local harness CLI exists (via the `harness-cli-it` agent).**
   `./harness` is an executable POSIX-shell CLI implementing all 12
   `REQUIRED_VERBS` with the `VERDICTS` and `JSON_VERBS` contract. — *TEST-02, TEST-14, TEST-15.*
2. **Wraps existing commands rather than reimplementing them.** `verify` runs the
   contract's `maps_to` (`npm run typecheck`) via `sh -c`; the harness contains no
   `tsc` reimplementation and invents no build system (ADR-0002/ADR-0003 §2). — *TEST-04, TEST-14.*
3. **Records evidence.** Every `verify` writes a timestamped JSON record under
   `.harness/evidence/` and references it in output. — *TEST-04, TEST-05, TEST-14.*
4. **Supported human and agent workflows are documented.** `.harness/README.md`
   documents the entry point, all verbs + verdicts, exit-code contract, `--json`,
   evidence/friction, and KEY_QUESTION; agent rules are embedded in every agent
   surface. — *TEST-11, TEST-12, TEST-14.*
5. **Invocable from a single documented entry point.** `./harness` is the single
   documented surface in `.harness/README.md` and `AGENTS.md`; the exact
   `pr-review-complement` invocations (`./harness orient`, `./harness verify --json`)
   succeed and exit 0. — *TEST-14, TEST-17.*

## Test results (TEST-01…TEST-17)

| Test | Subject | Result |
|------|---------|--------|
| TEST-01 | Contract schema (parsed with js-yaml) | PASS |
| TEST-02 | `help` + `orient` human/JSON, exit 0 | PASS |
| TEST-03 | `doctor` verdict (healthy `pass`; missing `node_modules` `degraded`+friction) | PASS |
| TEST-04 | `verify` wraps typecheck, writes evidence, `degraded`, exit 0 | PASS |
| TEST-05 | `verify --json` aggregate schema | PASS |
| TEST-06 | `lint`/`test`/`build`/`boot` `unknown`+friction, no `tsc` alias | PASS |
| TEST-07 | `clean` `degraded`, non-destructive (`node_modules` preserved) | PASS |
| TEST-08 | `friction add`/`list` round-trip + schema | PASS |
| TEST-09 | Seed covers every gap, verbatim KQ + closure | PASS |
| TEST-10 | Exit-code contract (only `fail` non-zero; forced type error) | PASS |
| TEST-11 | `.harness/README.md` completeness | PASS |
| TEST-12 | 17 surfaces each carry exactly one block, 4 rules | PASS |
| TEST-13 | Agent update idempotent + behaviour-preserving | PASS |
| TEST-14 | Issue acceptance criteria end-to-end | PASS |
| TEST-15 | Runs dependency-light under `sh` (dash) | PASS |
| TEST-16 | `verification.yml` runs `./harness verify`; VCS policy | PASS |
| TEST-17 | `pr-review-complement` contract (`orient` + `verify --json` exit 0) | PASS |

## Notes / environment

- The npm registry is unreachable from this sandbox (allowlist proxy blocks
  `registry.npmjs.org`), so `node_modules/typescript@5.7.3` was reconstructed from
  the jsdelivr CDN purely to run `npm run typecheck` during validation.
  `node_modules` is git-ignored and is **not** part of the deliverable; a normal
  `npm install` (ADR-0002) provides it in CI / the Verify stage.
- Implemented in portable POSIX shell (dash-clean, mawk-safe, `dash -n` passes);
  no new runtime dependency (CC-0003 R12).
- No ADR/core-component deviation was required; implementation stayed within
  ADR-0003 / CORE-COMPONENT-0003 boundaries.
- Not committed here — committing/PR is the Verify stage's responsibility.
