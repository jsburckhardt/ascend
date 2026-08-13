# Implementation Notes: Issue 33 / BL-014

## Scope delivered

T-0 through T-9 remain complete. This verifier correction upgrades BL-014 evidence to schema version 3, adds actual A/B/C identity observations, closes transition/workflow/network joins, declares and probes the exact counter artifacts, regenerates Chromium evidence, and updates the runbook. Runtime ownership and public behavior remain unchanged.

## Retained execution

Public artifact test-results/bl-014/session-switching/switching-browser.json uses execution a7290b03-05c7-4287-b103-5e4805811096 and timestamps 146679308314574–146771307282117. It contains 692 events, 48 surfaces, 24 focus observations, 24 lifecycle deltas, 24 transitions, three identities, 11 state rows, two away samples, 14 workflows, and 344 network rows. Restricted manifest 9e2acad2-71aa-47d9-b875-9b7284ec4f66 has digest 4b97acea8a3cde781317f4be0d5d86713ac18d30cd1d6e909b98e777daab3321.

## Acceptance evidence

### AC-1
A/B/C start once. Identity IDs A d128b1ba-1a6b-4ba0-bb28-bdefd645fe32, B 7e78d95a-212b-46bd-9c3b-2cd36311b053, and C defde65e-972e-4854-9d9c-8df003f42828 each resolve once in public and restricted collections to matching execution, token, actual PID/start/port/route, and fixture/Explorer/editor/terminal/Git observations.

### AC-2
The 250 ms, 60,000 ms A counter records one owner identity. Exact output and identity files are content-hashed before cleanup; visible values advance and command ownership joins the root execution.

### AC-3
All 24 ordered transitions execute the planned sequence. Each joins one unique before surface, after surface, focus observation, and lifecycle delta under the same transition ID/execution, token, and root execution. Home stop/shutdown deltas are zero.

### AC-4
Eleven visible state rows retain distinct A/B/C file, terminal, cwd, root, branch, status, Git, and sentinel digests. Each executes 12 peer-absence assertions with zero matches.

### AC-5
Away observations 533f7475-d981-4b33-8180-362036092232 and 99c9f16d-8c1d-4bd9-8fd2-81283ccccc9d are host-only, retain one process/command identity, and advance 13→33.

### AC-6
A before-leave b6ef4830-424b-4523-a1b0-d3f3a28b8273, return ab4452eb-c177-442b-bcd5-4d32cd8a591f, and probe e810a154-80e8-45c9-ac13-c032fcc0af4d retain A identity and A-only state with no second start.

### AC-7
B revisit d3224ce9-7f44-47c4-b0a3-0e3334bc981e and C revisit 105a3884-78bc-4439-912f-b14b20623353 retain original state. Exactly five Projects/Open re-entries B/C/A/B/C are reuse-only; reconnect rows remain separate.

### AC-8
Each Home row contains one A/B/C card, keyboard focus, Open/Close only, and zero Stop/Restart or lifecycle invocation.

### AC-9
Back/Forward executions f5ee3d4d-c0fb-45be-85c0-3f9410419479 and d52e6c1c-1f97-4a5c-9125-a97fca64972f have complete distinct joins, B attribution, and zero stop/shutdown.

### AC-10
Storage execution 3e8d8e32-0973-4f39-b80b-dc51ec12393d measures seeded classes and clears them to zero. Fresh B e83ffcaf-7bab-4092-bf2c-1c27b811058e reuses B; terminal and editor outcomes remain separately unsupported.

### AC-11
B close is client-local. A probe e810a154-80e8-45c9-ac13-c032fcc0af4d, C probe 14e1e723-7161-436c-addf-23b6ba124f0c, and B reopen 599d18a1-9072-4c40-bcec-2029e8924f17 prove A/C usability and unchanged B ownership.

### AC-12
Fourteen workflows resolve one transition and token. Each has HTTP plus exactly one Management and ExtensionHost socket. All 344 network rows repeat workflow, transition ID/execution, root execution, token, reconnection class, allowed stable-prefix URL, and zero leaks.

### AC-13
Negative fixtures reject missing, duplicate, orphan, cross-token, wrong-execution identities/surfaces/focus/lifecycle/workflows/network IDs, wrong roles/URLs, unchanged counters, unsafe authority, malformed cleanup, missing declarations, wrong paths, predeleted fake paths, and unprobed artifacts.

### AC-14
Public and restricted evidence form complete execution-backed joins. IDs are unique across joined surface/focus/lifecycle/identity/network collections; restricted manifest hash and public cleanup declaration digest agree.

### AC-15
The manifest declares counterOutput test-results/bl-014/session-switching/a-counter.log and counterIdentity test-results/bl-014/session-switching/a-counter-identity.json with path/content hashes, owner PID/start digest, command digest, execution, declaration ID, and pre-cleanup probe. Residual audit probes those exact resolved paths absent. Twelve resource classes are 1/2/2/14/3/5/16/1/1/1/3/2→0; three identity joins equal one with zero process/listener residual.

### AC-16
docs/session-switching.md specifies schema-v3 identity, transition, workflow/network, manifest, and exact residual-probe contracts. Documentation tests enforce paths and rejection classes. README, API, configuration, migration, deployment, and architecture have no impact because behavior and ownership do not move.

### AC-17
Focused contracts pass. just verify-session-switching passes eight Vitest rows, one no-retry Chromium scenario, and residual audit. just proof-session-switching-residual-audit returns schema 3, declarationsComplete true, identity join count one, and all residuals zero. Full verify and boot are recorded below after execution.

## Documentation evidence

Changed docs/session-switching.md and its documentation contract. README, API reference, configuration, migration, deployment, and architecture artifacts have no impact: this correction changes proof contracts only.

## Validation evidence

- just verify-focused (schema, residual, documentation): 3 files and 5 tests passed.
- just verify-session-switching: 8 Vitest tests, one Chromium test with retries zero, and residual audit passed.
- just proof-session-switching-residual-audit: status ok, schema 3, exact artifact probes absent, declarations complete, all residuals zero.
- just verify: exit 0; formatting, lint, type checks, unit/component/API/browser suites, build, BL-010–BL-014 gates, and all residual audits passed.
- harness boot --json: status ok, readiness ready, 405,497 ms within 610,000 ms.

## Observation evidence

Real observations DL-737 through DL-746 and COORD-083 retain grep, Python alias, positive-fixture, Chromium syntax/evidence, negative-fixture, shell-quoting, formatting/typecheck, and long-validation-wait friction. No failed observation attempt remains pending.

Evidence is recorded for Verify; final acceptance remains owned by Verify.
