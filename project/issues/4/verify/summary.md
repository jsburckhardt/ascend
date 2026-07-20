# Verify Summary: Generate the engineering harness CLI (Issue #4)

- **Issue:** #4 — Generate the engineering harness CLI via the harness-cli-it agent
- **Pull Request:** https://github.com/jsburckhardt/ascend/pull/14
- **Branch:** `feat/4-harness-cli` → `main`
- **Scope type:** core_component (with ADR-0003 for the adoption decision)
- **Verify verdict:** PASS

## Acceptance criteria — validated with evidence

| # | Acceptance criterion | Status | Evidence |
|---|----------------------|--------|----------|
| 1 | A repo-local harness CLI exists, generated via the `harness-cli-it` agent | ✅ | `./harness` (executable); generated via the `harness-cli-it` skill following its create-engineering-harness process |
| 2 | Wraps existing commands rather than reimplementing them | ✅ | `boot` → `npm install`; `verify`/`typecheck` → `npm run typecheck`; `.harness/contract.yml` maps verbs to real commands; `lint`/`test`/`build` → `unknown` + friction |
| 3 | Records evidence for the commands it runs | ✅ | `./harness verify` writes `.harness/evidence/verify-<timestamp>.json` + `latest.json` |
| 4 | Supported human and agent workflows are documented | ✅ | `.harness/README.md`, `AGENTS.md` §Engineering Harness, all 16 `.github/agents/*.agent.md` |
| 5 | Invocable from a documented single entry point | ✅ | `./harness` documented in `.harness/README.md`, `AGENTS.md`; `.github/soft-factory/verification.yml` registers `./harness verify` |

## Verification run

Configured surface: `.github/soft-factory/verification.yml` → `./harness verify` (expect `pass`).

```
[verify] verdict=pass
  doctor    : pass — node v22.17.1, npm 10.9.2 (matches .nvmrc major 22)
  typecheck : pass — npm run typecheck exit 0
  evidence  : .harness/evidence/verify-<timestamp>.json
```

Evidence record (`.harness/evidence/latest.json`):

```json
{
  "verb": "verify",
  "verdict": "pass",
  "checks": [
    {"name": "doctor", "verdict": "pass"},
    {"name": "typecheck", "command": "npm run typecheck", "verdict": "pass"}
  ]
}
```

## Test plan results

All 15 tests in `project/issues/4/plan/03-test-plan.md` pass (verb list, verdict/exit
contract, wrapping, evidence, graceful degradation, `unknown` for absent verbs, friction
validity + round-trip, docs completeness, idempotent `AGENTS.md`/agent-def adoption,
verification wiring, end-to-end `verify` pass, evidence content, single entry point).

## Commits (Conventional Commits, SSH-signed → Verified, Co-authored-by)

- `docs: add ADR-0003 and CORE-COMPONENT-0003 for the engineering harness`
- `docs: add issue #4 research brief and plan artifacts`
- `feat: add repo-local engineering harness CLI`
- `docs: require ./harness usage in AGENTS.md and agent definitions`
- `docs: add issue #4 implementation notes`

All five commits report `verified=true` on GitHub. Branch pushed; no direct push to `main`;
no force-push or `--no-verify`.

## Environment note

The sandbox firewall blocks npm registries (`registry.npmjs.org` SSL handshake failure),
while GitHub and npm CDNs (`cdn.jsdelivr.net`) are reachable. To exercise the real wrapped
`typecheck` and produce genuine evidence, the lockfile-pinned `typescript@5.9.3` was
reconstructed into the git-ignored `node_modules/` from the jsDelivr CDN. The harness wraps
`npm install` / `npm run typecheck` unchanged; on a normally-networked machine `./harness
boot` performs the standard install. Friction for this and for absent `lint`/`test`/`build`
and inferred `clean` is recorded in `.harness/friction.jsonl`.
