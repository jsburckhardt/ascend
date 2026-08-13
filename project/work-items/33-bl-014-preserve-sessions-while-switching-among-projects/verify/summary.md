# Verification Summary: Issue #33

## Delivery

- **Work item:** `project/work-items/33-bl-014-preserve-sessions-while-switching-among-projects`
- **Branch:** `feat/33-preserve-project-sessions`
- **Implementation handoff:** `19ee3a9a641c6a36913519462780889ca98ec5c4`
- **Merge base:** `ad86de9b45dca527056f73587f9927f09ddbe6f3`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/34
- **Issue:** https://github.com/jsburckhardt/ascend/issues/33

The exact handoff branch and SHA were verified with a clean working tree before review. The complete 34-file branch diff and all three implementation commits were inspected. Every commit follows Conventional Commits and contains the required Copilot co-author trailer.

## Acceptance Decisions

| Criterion | Status | Independent evidence |
|---|---|---|
| AC-1 | Passed | Designated Chromium starts repository-defined B/C/A exactly once and joins three measured immutable runtime identities to fixture, Explorer, editor, terminal, and Git observations. |
| AC-2 | Passed | The 250 ms counter has a 90,000 ms maximum, one measured PID/start owner, visible pre-leave value, and exact output/identity artifact declarations. |
| AC-3 | Passed | Twenty-four ordered transitions join URL surfaces, focus, lifecycle windows, project tokens, and identities; the exact keyboard sequence records zero Home stop/shutdown calls. |
| AC-4 | Passed | Distinct B/C cwd, root, branch, status, Git, terminal, file, and sentinel evidence is retained; every state row has 12 measured peer-absence checks with zero matches. |
| AC-5 | Passed | Two host-only A samples retain one live process/command identity, avoid browser interaction, and advance 13→35 in the final inspected execution. |
| AC-6 | Passed | A returns on its original identity and open file with A-only terminal/Git state; visible sequence advances from 2 to 74 with no second start. |
| AC-7 | Passed | Exactly five pre-reconnection Projects/Open re-entries B/C/A/B/C are reuse-only; B/C revisit rows retain original state and identities. |
| AC-8 | Passed | Every Home row contains one A/B/C card, Ascend keyboard focus, Open/Close only, and zero Close/Stop/Restart lifecycle invocation. |
| AC-9 | Passed | One separately classified Back/Forward pair restores Home and B without duplicate start, stop, identity change, or cross-project state. |
| AC-10 | Passed | A reload and storage-cleared fresh B direct link reuse original runtimes; all client-storage classes end at zero and server terminal/browser editor restoration are separately `unsupported`. |
| AC-11 | Passed | B client close leaves B live; A and C usability probes pass and B reopen retains the same identity and restoration classification. |
| AC-12 | Passed | Fourteen workflows each join HTTP plus one Management and one ExtensionHost socket under the matching stable prefix/token; the final inspected 345 network rows have zero leaks. |
| AC-13 | Passed | Executed unit/component/API matrices cover navigation, history, no-stop, reuse, event settlement, and one-dispatch timing; negative mutations reject static, duplicate, orphan, cross-token, wrong-execution, unchanged-sequence, unsafe, and unprobed evidence. |
| AC-14 | Passed | Schema-v3 public/restricted evidence joins all required dimensions, passes public disclosure scans, and retains exactly one ignored regular mode-0600 restricted authority artifact. |
| AC-15 | Passed | Exact counter paths, hashes, owner, declaration and pre-cleanup probes validate; all 12 measured resource classes and three project partitions end at zero while the unrelated control remains unchanged through owned cleanup. |
| AC-16 | Passed | Application and operational documentation accurately records sequence, ownership, limits, commands, bounds, artifacts, cleanup, observed unsupported result, and BL-015/lifecycle deferrals. |
| AC-17 | Passed | Independent designated, complete root validation, prior BL-010–BL-013 gates, residual audits, and governed harness boot all pass without Playwright retry. |

## Documentation Review

Passed. Reviewed affected README, API route, docs index, runtime, routing, terminal-proof, harness, and BL-014 runbook surfaces against the committed implementation and regenerated schema-v3 evidence.

- **README/usage/operations:** commands, exact sequence, bounds, evidence, and cleanup are discoverable and accurate.
- **API:** no endpoint or payload changed; route documentation states the unchanged stable-route/runtime contract.
- **Configuration:** no default changed; proof-only `EXTENSIONS_GALLERY={}` remains correctly bounded.
- **Migration:** no SQLite schema, data, or migration impact.
- **Architecture:** no ownership or topology moved; accepted navigation, proxy, runtime, presentation, command-interface, logging, filesystem, and SQLite contracts remain satisfied, so no ADR/core-component/decision-log edit is required.
- **Deployment:** no deployment topology change; the existing front-door contract remains unchanged.

No missing, stale, inaccurate, or inconclusive application documentation was found.

## Validation Results

| Validation | Result | Evidence |
|---|---|---|
| Root command interface | Passed | `just --list` exposes `verify-focused` and `verify`. |
| Designated BL-014 | Passed | `just verify-session-switching`: 5 files/8 Vitest tests, one Chromium worker, retries zero, and schema-v3 residual audit. |
| Full validation | Passed | Independent `just verify` completed formatting, lint, type checks, unit/component/API/browser suites, build, BL-010–BL-014 gates, and all residual audits. |
| Harness boot | Passed | `harness boot --json` returned `ready` in 401,431 ms within its 610,000 ms bound. |
| Cleanup | Passed | Exact counter artifacts absent; runtime/process/listener/socket/service/database/fixture partitions all report zero residuals. |
| Working tree | Passed | Clean before verification and after all validation. |

## Scope and Architecture Review

The diff contains evidence contracts, validators, test fixtures, designated browser and residual proof, two bounded Phase-0 test-stability corrections, root recipes, work-item artifacts, and synchronized documentation. It adds no lifecycle API/UI, router, persisted runtime identity, schema, migration, public authority, scheduling, BL-015 performance behavior, or ownership expansion. ADR and core-component contracts are therefore compliant.

## Observation Evidence

Qualifying verifier friction was captured through the real harness executable:

- `DL-747`: unavailable `python` executable required an installed-tool retry.
- `DL-748`: truncated large diff/document reads required bounded range retries.
- `DL-749`: unavailable `rg` executable required a grep retry.
- `DL-750`: an over-broad documentation inventory required repository-scope correction.
- `WIN-051`: designated no-retry Chromium and residual validation completed after a long wait.
- `WIN-052`: full `just verify` completed successfully after a long wait.
- `WIN-053`: governed harness boot completed ready after a long wait.

## Result

All AC-1 through AC-17 criteria passed independently. Issue checkboxes were updated only after acceptance, the verified branch was pushed, and pull request #34 was created.
