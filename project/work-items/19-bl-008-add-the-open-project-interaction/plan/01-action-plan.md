# Action Plan: Add the Open Project Interaction

## Feature
- **ID:** 19
- **Research Brief:** `project/work-items/19-bl-008-add-the-open-project-interaction/research/00-research.md`

## ADRs Created

- None. The accepted TypeScript/Fastify/React/SQLite stack and full-page workbench deferral already govern this issue. The POST envelope, finite byte bound, status map, browser recovery states, and test seams are issue-local product contracts, not new global architecture.

## Core-Components Created

- None. Existing path-safety, SQLite lifecycle, structured logging, development, command-interface, harness, and RPIV contracts cover the reusable behavior. This plan adds no new cross-cutting subsystem.

## Acceptance Criteria

- **AC-1:** The documented project-registration POST operation accepts an exact JSON object containing only one string `path` field; project `name` is returned from BL-006 and is not submitted. Each contract-valid request delegates once to the merged BL-006 registration boundary and does not weaken or replace BL-006 path syntax, opening-policy, canonicalization, idempotency, persistence, or non-mutation outcomes.
- **AC-2:** Every BL-006 created, existing, and typed registration-failure result has one documented HTTP status and exact safe response shape. Success exposes only the stable four-field project record and its created-or-existing disposition; failures expose no partial project, submitted or configured path, raw platform error, stack, SQL, secret sentinel, or internal error text.
- **AC-3:** A finite documented request-size bound is enforced. Empty bodies, malformed JSON, oversized bodies at the bound plus one byte, wrong field types, a missing `path`, and unrecognized fields return stable safe non-success outcomes, invoke no registration, and leave an isolated project library unchanged.
- **AC-4:** Project Home provides a semantic Open Project form for an existing host directory. Its host-path control has a persistent programmatic label and associated supported-notation guidance, preserves the exact user-entered text, and can be corrected after validation or transport failure.
- **AC-5:** Blank and whitespace-only input plus every backend typed path failure produce a specific message programmatically associated with the host-path control, move focus to the correction target when submission cannot proceed, preserve the submitted text, add no card, and expose the error through an inspectable alert or live-status semantic.
- **AC-6:** A normal created or existing response updates Project Home without a page reload by stable project ID: replace the one matching card or insert one card, never duplicate an ID, and restore the documented deterministic card ordering. The exact returned ID card is brought into view, focused at its project action, and announced as created or already registered.
- **AC-7:** Submitting any supported expression equivalent to an already registered canonical path presents and activates the same stable-ID card and leaves exactly one card and one durable record for that ID; display name and path text are never used as identity.
- **AC-8:** Each registration attempt has a client-owned 10-second bound. While an ordinary submission is pending, an active keyboard-operable Cancel action is available and repeated submit activation cannot send another request. Unmount ends ownership of the current attempt and no later completion can update the unmounted page.
- **AC-9:** An outcome for which the client has positive evidence that no usable request was transmitted, a controlled pre-send network-unavailable outcome, or deliberate cancellation of an ordinary submission preserves the input, changes no cards, invalidates every later response from that generation, and restores normal editing and retry controls. Deliberate initial cancellation has this client outcome even if transport completion cannot be observed.
- **AC-10:** After request transmission, timeout, connection reset, truncated body, unreadable or non-JSON body, undocumented status, or JSON that does not match a documented registration response enters a programmatically announced `submission outcome unknown` state. The exact submitted `path` JSON payload is visible and locked, no optimistic card change occurs, and before any successful recovery refresh the only available recovery actions are keyboard-operable `Retry same submission` and `Refresh projects`.
- **AC-11:** While submission outcome is unknown, no different registration payload can be sent. The state ends only through a created-or-existing retry result, a zero-or-one-added-ID authoritative refresh result, or an explicit reset made available after a successful multiple-ID refresh.
- **AC-12:** `Retry same submission` sends JSON bytes equivalent to the locked original payload. A BL-006 created or existing result returns one stable project, exits recovery, upserts only that ID, and brings into view, focuses, and announces that exact card.
- **AC-13:** A retry attempt retains the 10-second bound and active Cancel. Cancelling that retry invalidates its generation and returns to the unchanged submission-outcome-unknown state with the same locked payload and the same two recovery actions; it does not unlock a different submission.
- **AC-14:** `Refresh projects` replaces all cards from the authoritative project-list response and compares stable IDs only with the pre-submit card snapshot. If exactly one ID was added, that card is brought into view, focused, announced as reconciled, and recovery ends.
- **AC-15:** If a successful recovery refresh adds zero IDs relative to the pre-submit snapshot, the page states that no new project was observed, preserves and unlocks the original input, and returns to normal editing and retry without changing the authoritative refreshed cards.
- **AC-16:** If a successful recovery refresh adds multiple IDs relative to the pre-submit snapshot, the page shows the complete authoritative refreshed list and an actionable ambiguous-reconciliation message without selecting an identity from display name or path. The locked payload cannot be edited or resubmitted until the user activates the now-available explicit reset, after which a new submission can be made.
- **AC-17:** If a recovery refresh fails, times out, or returns an invalid list contract, the page remains in submission-outcome-unknown recovery, preserves the locked input and current cards, sends no new registration, and again exposes the same two recovery actions.
- **AC-18:** At most one recovery request is active at a time. Repeated Retry or Refresh activation cannot create parallel registration or list requests or duplicate card updates; controls expose an inspectable pending state, and the registration retry and existing project-list client bounds remain finite.
- **AC-19:** Responses are owned by a monotonic request generation. Cancellation; every ordinary, retry, or refresh timeout; each recovery action; explicit reset; and each newer authoritative list invalidate all older generations. Any later completion from an invalidated generation cannot modify cards, inputs, focus, announcements, validation, or recovery state.
- **AC-20:** User-entered paths, returned names, and returned paths, including long values, whitespace, and HTML or script metacharacters, remain inert complete text and are not interpreted as markup or exposed in unsafe error details.
- **AC-21:** Existing card Open actions remain project-ID-identified, keyboard-operable deferred actions that start no workbench and perform no navigation. BL-010 or BL-012 behavior, picker integration, repository scanning, clone or import, project close, search, user sorting, tags, and path mutation are not added.
- **AC-22:** Finite isolated API validation covers created and existing results, every BL-006 typed failure mapping, malformed and oversized request cases, exact safe response shapes and redaction sentinels, one delegation per accepted request, unchanged persistence on rejection, stable identity, and sequential equivalent submissions.
- **AC-23:** Finite isolated API validation sends exactly eight concurrent equivalent valid POST requests and proves eight bounded responses identify the same complete stable project, exactly one durable record exists afterward, and each accepted HTTP request delegates once without a partial response.
- **AC-24:** Finite component validation covers semantic form labeling and guidance; blank, whitespace, and every typed validation outcome; created and existing stable-ID card updates; deterministic ordering; focus, scroll, and inspectable announcements; 10-second timeout; ordinary and recovery Cancel semantics; repeated-submit prevention; unmount; definite pre-send outcomes; every unknown-outcome trigger; byte-equivalent retry; zero, one, multiple, failed, timed-out, and invalid refresh branches; explicit reset; repeated recovery actions; stale-generation suppression; and inert text rendering.
- **AC-25:** One bounded real desktop Chromium episode uses only keyboard interaction to prove a new valid path, an equivalent-path existing result on the same card, an invalid path with programmatically associated announced error, correction and successful resubmission, no page reload, exact stable card identity, and the still-deferred card Open action.
- **AC-26:** The real-browser episode runs the web and API applications against an isolated database and disposable host-directory fixtures and proves project fixture membership and bytes are unchanged. On success, startup failure, assertion failure, timeout, and interrupted graceful shutdown paths, bounded cleanup removes only episode-owned processes, listeners, database, sidecars, and allocated fixtures and leaves none of them behind.
- **AC-27:** Documentation completely records the registration request, response, size, status, and safe-error contracts; host-path form and validation behavior; created and existing card outcomes; 10-second timeout and both Cancel outcomes; definite versus unknown transport outcomes; payload locking, retry, refresh, reset, stable-ID reconciliation, stale-response ownership, accessibility semantics, scope exclusions, validation commands, isolation, integrity checks, cleanup on every exit path, and the observed bounded browser result.
- **AC-28:** The repository-configured focused validations for the API, component, documentation, and browser matrices and the root full-validation command all exit zero and leave no BL-008 process, listener, database, sidecar, or host-directory fixture behind.

## Acceptance Coverage

| Acceptance Criterion | Implementation Tasks | Tests / Validation | Expected Evidence |
|---|---|---|---|
| AC-1 | T-1 | V-1, V-2 | Exact POST-body and delegation counts prove one BL-006 call per contract-valid request. |
| AC-2 | T-1 | V-1 | Status/envelope and sentinel matrices prove complete safe created, existing, typed, and unexpected mappings. |
| AC-3 | T-1 | V-1, V-2 | 4,096-byte boundary and malformed-body tests show zero delegation and byte-identical isolated rows. |
| AC-4 | T-4 | V-4, V-6 | Label, guidance, value, correction, and keyboard Chromium assertions prove the semantic form. |
| AC-5 | T-4 | V-4, V-6 | Error association, input focus, preserved value, zero-card mutation, and announced message assertions pass. |
| AC-6 | T-3, T-4 | V-4 | Stable-ID upsert, deterministic order, scroll, focus, and created/existing announcements pass without reload. |
| AC-7 | T-1, T-3, T-4 | V-2, V-4, V-6 | Equivalent expressions retain one durable ID/card and activate that exact card. |
| AC-8 | T-2, T-3, T-4 | V-3, V-4, V-5 | 10-second timer, one-request lock, active Cancel, unmount abort, and late-result suppression traces pass. |
| AC-9 | T-2, T-3, T-4 | V-3, V-5 | Controlled not-transmitted and ordinary-cancel traces preserve input/cards and restore editing. |
| AC-10 | T-2, T-3, T-4 | V-3, V-5 | Every ambiguous transport trigger yields locked visible payload, no card change, and exactly two recovery actions. |
| AC-11 | T-3, T-4 | V-5 | Recovery state blocks changed payloads and exits only through the specified retry, refresh, or reset transitions. |
| AC-12 | T-2, T-3, T-4 | V-3, V-5 | Captured request bodies are byte-identical and successful retry focuses the returned stable-ID card. |
| AC-13 | T-3, T-4 | V-5 | Retry cancellation returns to the same locked unknown state with no stale update. |
| AC-14 | T-3, T-4 | V-5 | One-added-ID refresh replaces the list, compares snapshot IDs, and activates the sole new ID. |
| AC-15 | T-3, T-4 | V-5 | Zero-ID refresh retains authoritative cards, unlocks exact input, and announces no new project. |
| AC-16 | T-3, T-4 | V-5 | Multi-ID refresh retains the full list, selects no card, locks payload, and exposes only explicit reset. |
| AC-17 | T-2, T-3, T-4 | V-3, V-5 | Failed, timed-out, and invalid refreshes preserve cards/payload and restore the two recovery actions. |
| AC-18 | T-2, T-3, T-4 | V-3, V-5 | Pending-state and call-count traces prove one finite recovery owner and no parallel request. |
| AC-19 | T-3, T-4 | V-5 | Monotonic-generation matrix proves all late completions are inert across every visible side effect. |
| AC-20 | T-1, T-4 | V-1, V-4, V-6 | Response redaction and exact DOM text checks prove long, whitespace, and metacharacter values stay inert. |
| AC-21 | T-4 | V-4, V-6 | Control/request/URL inventories prove project-ID Open remains keyboard-operable and deferred. |
| AC-22 | T-1, T-7 | V-1, V-2, V-8 | Isolated API matrix reports all mappings, delegation, persistence, identity, and sequential equivalence passing. |
| AC-23 | T-1, T-7 | V-2, V-8 | Exactly eight concurrent responses share one complete ID and reopen to one durable row. |
| AC-24 | T-2, T-3, T-4, T-7 | V-3, V-4, V-5, V-8 | Finite client/component reports cover every named normal, recovery, accessibility, and stale branch. |
| AC-25 | T-5, T-7 | V-6, V-8 | One keyboard-only Chromium episode records all requested valid, equivalent, invalid/corrected, identity, and deferred phases. |
| AC-26 | T-5, T-7 | V-6, V-8 | Fixture manifests and all-path cleanup evidence prove exact integrity and zero owned residuals. |
| AC-27 | T-6, T-7 | V-7, V-8 | Executable documentation checks match constants, behavior, exclusions, commands, cleanup, and retained result. |
| AC-28 | T-7 | V-8 | Focused and `just verify` exits are zero and final residual audits are empty. |

**Coverage proof:** All 28 stable IDs preserve issue order and text. Every ID maps to dependency-ordered implementation, finite validation, and inspectable evidence before any plan artifact is considered complete.

## Implementation Tasks

1. **T-1 — Add the registration service lifecycle and exact POST contract** (AC-1, AC-2, AC-3, AC-7, AC-20, AC-22, AC-23). Construct and close the merged BL-006 service through API startup, expose `POST /api/projects`, enforce an issue-local 4,096-byte JSON body bound, and use exact mappings: created 201 and existing 200 with `{disposition,project}`; typed path failures with `{error:{category,field}}` and documented 400/403/404/422 statuses; malformed contract 400 `invalid_registration_request`; oversized 413 `registration_request_too_large`; and unexpected 500 `project_registration_failed`. Never log raw errors or paths.
2. **T-2 — Add strict web codecs and typed finite transports** (AC-8, AC-9, AC-10, AC-12, AC-17, AC-18, AC-24). Serialize `{path}` once, retain those exact bytes for retry, distinguish only positive pre-send evidence from post-invocation ambiguity, preserve the 10,000 ms registration and 5,000 ms list bounds, and validate only documented exact response contracts.
3. **T-3 — Implement one monotonic Project Home request and reconciliation controller** (AC-6 through AC-19, AC-24). Replace privately isolated list state with one simple reducer/controller owning cards, snapshots, payload lock, ordinary/retry/refresh cancellation, one active request, stable-ID upsert and refresh comparison, ordering, and global generation invalidation.
4. **T-4 — Render the accessible form, recovery states, stable-ID focus, and deferred cards** (AC-4 through AC-21, AC-24). Add persistent label/guidance/error association, exact value preservation, pending Cancel, unknown/retry/refresh/reset controls, live announcements, ID-keyed refs with `scrollIntoView` and focus, inert text, and unchanged deferred Open behavior.
5. **T-5 — Extend the owned keyboard-only Chromium episode and cleanup harness** (AC-25, AC-26). Allocate isolated SQLite and host-directory fixtures, configure the owned API opening policy, prove new/equivalent/invalid/corrected flows without reload, snapshot fixture integrity, and audit success plus startup, assertion, timeout, and interrupted-shutdown cleanup paths.
6. **T-6 — Synchronize API, web, application, harness, and command documentation** (AC-27). Document every exact contract and state, replace stale BL-008 deferrals while retaining workbench Open deferral, add a named focused BL-008 gate and harness signal/evidence path, and use root `just` commands only.
7. **T-7 — Run focused and full validation and record the AC-indexed handoff** (AC-22 through AC-28). Run isolated API, web, documentation, and Chromium matrices, then `just verify`; independently inspect generated integrity/cleanup evidence and record all AC results in the implementation handoff.
