# Action Plan: Close a Stopped Project Without Deleting Files

## Feature
- **ID:** 21
- **Research Brief:** `project/work-items/21-bl-009-close-a-stopped-project-without-deleting-files/research/00-research.md`

## ADRs Created

- None. The accepted TypeScript/Fastify/React/SQLite stack, explicit SQLite lifecycle, structured logging boundary, and non-destructive filesystem contract already govern this slice. The stable-ID DELETE envelope, confirmation dialog, and ambiguous-outcome reconciliation are issue-local behavior, not new global architecture.

## Core-Components Created

- None. Existing filesystem safety, SQLite lifecycle, logging, development, command, harness, and RPIV contracts cover the reusable rules. No new cross-cutting subsystem is introduced.

## Acceptance Criteria

- **AC-1:** Closing by stable project ID removes exactly one matching metadata row in one transaction and returns the stable ID with an explicit `closed` disposition. An unknown or already-absent ID returns typed `project_not_found` and leaves all metadata unchanged; a persistence failure rolls back and leaves the matching row and all other metadata unchanged.
- **AC-2:** The close service invokes no project-filesystem API for success, unknown or already-absent ID, malformed input, persistence failure, transport ambiguity, retry, or concurrent requests; database-resource access is outside this project-filesystem prohibition.
- **AC-3:** The documented DELETE project operation (`DELETE /projects/{id}` or a repository-consistent equivalent) delegates each accepted close once and returns a success response containing the stable ID and `closed` disposition. Malformed ID, unknown or already-absent ID, and persistence failure have distinct documented non-2xx statuses or categories and contain no partial success data.
- **AC-4:** Close responses, logs exposed by bounded validation, and user-facing errors contain none of the supplied stack, SQL, database-path, project-content, secret, or internal-error sentinels.
- **AC-5:** Project Home provides exactly one semantic, keyboard-focusable Close action for each project card. Activating it opens a modal dialog named `Close <project name>?` whose exact body copy is: `Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted.`
- **AC-6:** The dialog keeps focus within its controls for Tab and Shift+Tab. Escape and Cancel close it without a close request or metadata mutation and restore focus to the activating Close action.
- **AC-7:** Closing requires explicit activation of a destructive Confirm control. Repeated Confirm activation during one close attempt sends no additional request. Cancel remains available while cancellation is known to prevent transmission; once transmission has occurred and the outcome cannot be known, Cancel is unavailable and the pending or recovery state is programmatically announced.
- **AC-8:** A confirmed successful close removes only the matching stable-ID card without reloading the page and announces success. Focus moves to the next card Close action, otherwise the previous card Close action, otherwise the Project Home heading; closing the final card displays the existing empty state.
- **AC-9:** A definitive validation, API, persistence, or pre-transmission transport failure preserves the matching card and the dialog or stable-ID recovery state, announces the failure category without internal detail, and identifies the next recovery action. Retry of the same stable ID is available only when the outcome proves no close mutation or an authoritative refresh proves that the ID remains present; every other post-transmission outcome requires reconciliation before retry.
- **AC-10:** A timeout, connection reset, or other ambiguous post-transmission outcome makes no optimistic card change and locks the close interaction for the original stable ID while the documented project-list operation refreshes the authoritative list. If that ID is present, retry becomes available; if absent, the UI applies the same card-removal, announcement, focus, and empty-state outcome as confirmed success; if refresh fails or is invalid, the interaction remains locked, announces that the result is still unknown, and offers refresh again without guessing.
- **AC-11:** Retry and reconciliation use only the original stable project ID. Repeated retry or refresh activation creates at most one active request, and completion from an older attempt, reconciliation, cancellation, or unmounted page cannot change cards, dialog state, focus, announcements, or recovery state.
- **AC-12:** Exactly eight concurrent DELETE requests for one registered stopped project complete within repository validation bounds with one `closed` response and seven typed `project_not_found` responses, zero remaining rows for that ID, no raw database error exposure, and an unchanged project-filesystem manifest.
- **AC-13:** Project names, paths, IDs, and error text containing whitespace, HTML or script metacharacters, and values at each documented supported length bound remain inert text in cards, dialog copy, announcements, and errors.
- **AC-14:** Before-and-after recursive manifests for a disposable registered fixture prove identical directory membership, file bytes, permissions, and recorded timestamps after Cancel, successful close, unknown ID, persistence failure, transport ambiguity, retry, and repeated already-absent close. Manifest collection and comparison are repository-local, bounded, and complete before test-only fixture removal.
- **AC-15:** Finite isolated persistence, service, and close-operation evidence covers success, unknown and already-absent ID, malformed ID, persistence failure with complete rollback, sentinel redaction, no project-filesystem calls, the exact eight-request concurrency result, restart with the closed ID absent from the authoritative list, resource closure, and removal of only the isolated database and test fixtures after integrity evidence is captured.
- **AC-16:** Finite component and client evidence covers dialog copy and accessible role/name, focus containment and restoration, Tab and Shift+Tab, Escape and Cancel with zero close requests, destructive Confirm, repeated activation prevention, pending announcements, success and final-card empty state, definitive errors and same-ID retry eligibility, timeout/list reconciliation for present, absent, failed, and invalid results, stale completion, unmount, supported-bound and metacharacter text rendering.
- **AC-17:** One bounded real desktop Chromium scenario uses keyboard interaction with the merged BL-008 flow to register a disposable project, cancel Close once, then confirm Close and prove card and authoritative-list removal plus an unchanged sentinel file. A separate repository-controlled persistence or transport fault proves the documented error and recovery outcome without external services or credentials.
- **AC-18:** After project-content integrity is recorded, browser success and controlled-failure validation removes only test-owned process groups, listeners, isolated database and sidecars, and disposable fixtures, then proves that none remain. This cleanup is test-harness ownership and adds no product cleanup or archive behavior.
- **AC-19:** Documentation records the DELETE operation and outcomes, the persistence-only stopped-project boundary, exact confirmation copy, keyboard and focus behavior, same-ID ambiguous-outcome recovery, non-mutation evidence, validation commands, controlled faults, test-only cleanup result, and deferral of running or failed workbench close to BL-020.
- **AC-20:** The repository-configured focused validations and root full-validation command exit zero and leave no close-scenario process, listener, database, sidecar, or disposable fixture behind.

## Acceptance Coverage

| Acceptance Criterion | Implementation Tasks | Tests / Validation | Expected Evidence |
|---|---|---|---|
| AC-1 | T-1 | V-1, V-2 | Transaction traces, row snapshots, and an after-delete fault prove exact removal and complete rollback. |
| AC-2 | T-1, T-6 | V-1, V-3 | Import-boundary checks, forbidden-operation spies, and equal manifests prove no project-filesystem call. |
| AC-3 | T-2 | V-2 | Exact status/envelope tables, delegation counts, and unchanged rows prove the DELETE contract. |
| AC-4 | T-1, T-2, T-3, T-4, T-5 | V-1, V-2, V-4, V-6, V-7 | Sentinel scans across responses, headers, logs, DOM, and evidence prove redaction. |
| AC-5 | T-5 | V-6, V-7 | Role/name/copy queries and keyboard traces prove one Close action per card and the exact dialog. |
| AC-6 | T-5 | V-6, V-7 | Tab, Shift+Tab, Escape, Cancel, call-count, row, and active-element assertions prove containment and restoration. |
| AC-7 | T-3, T-4, T-5 | V-4, V-5, V-6 | Transmission-phase traces, repeated-activation counts, controls, and live-status assertions prove explicit confirmation. |
| AC-8 | T-4, T-5 | V-5, V-6, V-7 | Stable-ID card diffs, no-navigation counts, announcements, focus targets, and empty-state assertions prove success. |
| AC-9 | T-3, T-4, T-5 | V-4, V-5, V-6 | Fixed errors and same-ID Retry/Refresh inventories prove definitive recovery eligibility. |
| AC-10 | T-3, T-4, T-5 | V-4, V-5, V-6 | Timeout/reset and present, absent, failed, and invalid refresh snapshots prove reconciliation without guessing. |
| AC-11 | T-3, T-4, T-5 | V-4, V-5, V-6 | Original-ID capture, one-owner counts, abort traces, and stale no-diff snapshots prove ownership. |
| AC-12 | T-1, T-2, T-6 | V-2, V-3 | Eight bounded responses, one/seven disposition counts, zero rows, safe logs, and an equal manifest prove concurrency. |
| AC-13 | T-3, T-5, T-6 | V-4, V-6, V-7 | Exact DOM text and no-markup assertions cover whitespace, metacharacters, lower bounds, and documented finite edges. |
| AC-14 | T-6 | V-3, V-7 | Per-outcome recursive manifests record membership, bytes, modes, and mtimes before fixture cleanup. |
| AC-15 | T-1, T-2, T-6 | V-1, V-2, V-3 | Isolated suites record all outcomes, restart absence, closure, targeted cleanup, and zero residuals. |
| AC-16 | T-3, T-4, T-5, T-6 | V-4, V-5, V-6 | Finite client, controller, and component matrices record every named accessibility and recovery branch. |
| AC-17 | T-7 | V-7 | Bounded desktop Chromium evidence records keyboard success and a separate controlled fault/recovery episode. |
| AC-18 | T-7 | V-7 | Owned identities, integrity-before-cleanup, and zero process/listener/database/sidecar/fixture audits prove cleanup. |
| AC-19 | T-8 | V-8 | Executable documentation checks cross-check endpoint, copy, recovery, evidence, commands, and BL-020 deferral. |
| AC-20 | T-9 | V-9 | Focused and `just verify` exits are zero and final residual probes are empty. |

**Coverage proof:** All 20 stable IDs preserve GitHub issue order and text. Every ID maps to dependency-ordered implementation, finite validation, and inspectable evidence before these plan artifacts are complete.

## Implementation Tasks

**Impact summary:**

- **API:** Extend the existing four-field project repository and already-owned listing library with transactional removal, add a small in-process close service, and expose `DELETE /api/projects/:id`. No schema or data migration is required.
- **Web:** Extend the single Project Home owner with strict close codecs, one stable-ID recovery state, an issue-local modal dialog, and ID-keyed card/focus updates. Do not add runtime state.
- **Validation and documentation:** Reuse BL-005 database refusal/sidecar cleanup, BL-006 recursive manifests, and BL-008 owned browser processes/listeners; add BL-009 evidence, documentation, and root gates.
- **No impact:** Do not change registration policy, the four-column schema, proof workbench modules, product process lifecycle, stop/restart, archive, soft delete, or project-filesystem behavior. Running or failed workbench close remains BL-020.

1. **T-1 — Add transactional persistence and the in-process close service** (AC-1, AC-2, AC-4, AC-12, AC-15). Add stable-ID delete-returning inside one explicit SQLite transaction, typed `closed` and `project_not_found` outcomes, rollback-safe persistence errors, and a service that receives only the metadata repository boundary.
2. **T-2 — Expose the safe stable-ID DELETE operation** (AC-3, AC-4, AC-12, AC-15). Construct the close service from the existing application-owned library, inject it for tests, add `DELETE /api/projects/:id`, delegate accepted IDs once, and map 200 `closed`, 400 `invalid_project_id`, 404 `project_not_found`, and 500 `project_close_failed` without partial success or raw detail.
3. **T-3 — Add strict close client codecs and transmission classification** (AC-4, AC-7, AC-9, AC-10, AC-11, AC-13, AC-16). Encode the original ID once, validate exact envelopes, bound DELETE attempts, expose pre-transmission versus transmitted state, and treat every post-fetch timeout, reset, unreadable body, undocumented status, or invalid contract as unknown.
4. **T-4 — Extend the single Project Home owner for close and reconciliation** (AC-7, AC-8, AC-9, AC-10, AC-11, AC-16). Keep one active request/generation across list, registration, close, retry, and refresh; lock the original ID, reconcile authoritative presence/absence, remove only by ID, compute next/previous/heading focus, and suppress stale or unmounted completion.
5. **T-5 — Render the accessible confirmation, recovery, and focus behavior** (AC-4 through AC-11, AC-13, AC-16). Add one Close button per card and a modal dialog with the exact name/copy, focus trap, Escape/Cancel before transmission, destructive Confirm, pending/error/unknown announcements, same-ID Retry/Refresh, success focus, and final empty state.
6. **T-6 — Build isolated non-mutation, concurrency, and resource matrices** (AC-2, AC-4, AC-12, AC-13, AC-14, AC-15, AC-16). Reuse isolated SQLite and recursive manifests, inject a real after-delete transactional fault, run exact eight-way DELETE, restart, and capture all integrity evidence before targeted cleanup.
7. **T-7 — Extend the owned real Chromium and cleanup harness** (AC-4, AC-5, AC-6, AC-8, AC-13, AC-14, AC-17, AC-18). Run the merged BL-008 keyboard registration then Cancel and Confirm Close, plus a separate test-only controlled fault/recovery episode; audit exact processes, listeners, databases/sidecars, and fixtures after integrity capture.
8. **T-8 — Synchronize application, API, web, harness, and command documentation** (AC-19). Document exact contracts, copy, accessibility, same-ID recovery, non-mutation evidence, controlled faults, cleanup, root commands, persistence-only stopped scope, and explicit BL-020 deferral.
9. **T-9 — Run focused and full validation and record the AC-indexed handoff** (AC-1 through AC-20). Run all isolated and Chromium matrices through root recipes, then `just verify`; inspect retained evidence and residual resources before implementation handoff.
