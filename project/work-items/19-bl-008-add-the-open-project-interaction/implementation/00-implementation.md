# Implementation Notes: Issue #19 Open Project Interaction

## Completed Tasks

- T-1: Added the BL-006-backed registration lifecycle and exact bounded POST contract; this correction maps Fastify unsupported-media-type errors and the parser-supported wrong-media-type path to safe HTTP 400 while isolating persistence, delegation, and redaction evidence for every rejected case.
- T-2: Added exact web codecs, serialization, transport classification, and finite request bounds, including non-JSON success/error and owner-cancellation evidence.
- T-3: Added one monotonic Project Home request and stable-ID reconciliation controller with complete cancel, retry, refresh, timeout, unmount, and stale-generation matrices.
- T-4: Added the accessible form, recovery controls, focus and scroll behavior, inert text, and deferred Open cards; correction removed the duplicate retry Cancel control.
- T-5: Added the isolated keyboard-only Chromium episode and executed cleanup scenarios for startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and a surviving descendant.
- T-6: Synchronized root, application, and API documentation to identify `application/json` as the sole supported registration media type and document safe zero-delegation rejection for `text/plain`, `application/xml`, and `application/octet-stream`.
- T-7: Ran focused API, client/controller/component, documentation, cleanup, and Chromium gates, then the complete root validation and residual audits.

## Acceptance Evidence

- **AC-1:** project-registration-route.test.ts proves exact sole-string path bodies delegate once; the eight-request spy records exactly eight BL-006 calls.
- **AC-2:** The API table proves created 201, existing 200, all six typed mappings, exact envelopes and four-field projects, and safe unexpected 500 responses.
- **AC-3:** Malformed JSON, parser-supported `text/plain`, Fastify-rejected `application/xml` and `application/octet-stream`, exact-bound typed rejection, and oversized cases each compare isolated durable rows before and after the request; every media-type and malformed rejection proves zero registration calls.
- **AC-4:** App.test.tsx proves the semantic form, persistent Host path label, notation guidance, exact value, and correction workflow.
- **AC-5:** Component tables cover blank, whitespace, and every typed path failure with associated alert, aria-invalid, input focus, retained text, and unchanged cards.
- **AC-6:** Controller and component tests prove ID-only insert or replacement, createdAt/id order, exact action scroll/focus, and created/existing announcements.
- **AC-7:** Sequential API and browser symlink-equivalent submissions retain the same stable ID, card, and durable record.
- **AC-8:** Client tests prove the 10,000 ms abort; controller/component tests prove one owner, one active Cancel, repeated-action blocking, unmount abort, and inert late completion.
- **AC-9:** Controlled network-unavailable and ordinary-cancel traces preserve input/cards and suppress stale responses.
- **AC-10:** Connection reset, timeout, truncated/unreadable body, non-JSON success, non-JSON error, undocumented status, and invalid-contract tests all produce unknown; the component locks and displays the exact payload with two recovery actions.
- **AC-11:** Recovery tests block changed payloads and exit only through successful retry, zero/one refresh, or explicit reset after many.
- **AC-12:** Request bytes are identical for retry; created and existing retry matrices upsert and focus the returned stable-ID card with exactly two registration calls.
- **AC-13:** Retry Cancel restores the same locked state and two actions; delayed success changes no input, card, focus, validation, or announcement.
- **AC-14:** One-added-ID refresh replaces authoritative cards, compares snapshot IDs, focuses the sole addition, and announces reconciliation.
- **AC-15:** Zero-added-ID refresh retains authoritative cards, unlocks exact input, focuses correction, and announces no new project.
- **AC-16:** Multiple-added-ID refresh renders the complete list, leaves all card actions unfocused, locks input, announces ambiguity, and exposes Reset.
- **AC-17:** Failed and timed-out refreshes preserve locked input/cards and restore recovery; invalid-list transport rejects before partial data.
- **AC-18:** Repeated submit, Retry, and Refresh activation matrices assert registration/list call counts and one inspectable active owner.
- **AC-19:** Deferred results after ordinary Cancel, retry Cancel, refresh Cancel, list timeout/retry, a newer ordinary generation, and unmount are inert across input, cards, focus, validation, announcements, and counts.
- **AC-20:** Every unsupported-media-type and malformed rejection test inspects the safe response body, response headers, and captured Fastify logs for submitted/configured path, secret, SQL, platform, stack, and internal sentinels; no sentinel is exposed.
- **AC-21:** Component and Chromium tests prove stable-ID keyboard Open, unchanged URL, no workbench request/navigation, and deferred announcement.
- **AC-22:** The 22-test API route suite covers exact mappings, malformed JSON, parser-supported and Fastify-rejected unsupported media types, per-rejection row snapshots, zero delegation, response/header/log redaction, sequential identity, and cleanup.
- **AC-23:** Exactly eight simultaneous fresh POSTs produce complete exact two-key envelopes and exact four-field projects, one 201 created and seven 200 existing, one stable ID, eight delegate calls, one live row, and one reopened row.
- **AC-24:** Focused web validation passes 27 client, 16 controller, and 22 component tests spanning every requested normal, transport, refresh, cancel, focus, count, unmount, and stale branch.
- **AC-25:** The no-retry Chromium episode passes created, equivalent existing, invalid/corrected, exact card focus, no reload, fixture integrity, and deferred Open using keyboard product interaction.
- **AC-26:** episode.json retains successful episode cleanup. cleanup-matrix.json retains five executed scenarios and independent process-group, listener, database/sidecar, and fixture counts. Interrupted shutdown records gracefulStop false before bounded escalation. The surviving descendant is detected with ownerCleanupPassed false until exact-PID teardown, then teardownClean true and every residual count zero.
- **AC-27:** Root, application, and API documentation now state that only `application/json` is supported and that `text/plain`, `application/xml`, and `application/octet-stream` receive safe HTTP 400 `invalid_registration_request` with zero registration delegation; executable documentation assertions enforce these tokens.
- **AC-28:** Corrected `just verify-open-project` and final `just verify` exit zero; generated cleanup evidence and the complete browser gate report no owned residual.

## Documentation Evidence

- README.md: user-facing API behavior now names the sole supported registration media type and safe unsupported-type outcome.
- docs/README.md: directly coupled HTTP contract now lists parser-supported and Fastify-rejected unsupported media types, safe status/category, and no delegation.
- apps/api/README.md: exact `application/json`-only contract, safe 400 behavior for `text/plain`, `application/xml`, and `application/octet-stream`, and zero delegation.
- apps/web/README.md: transport/controller behavior and honest survivor owner-failure semantics.
- .harness/engineering-harness.md: focused signal and separate successful-episode versus executed-scenario evidence paths.
- justfile: verify-open-project now includes the anti-hardcoding cleanup contract test; verify remains authoritative.
- Migration note: no schema, data, API upgrade, or configuration migration is required.
- Architecture note: no ADR or core-component contract changed; the correction stays within existing TypeScript, path-safety, SQLite, logging, command, harness, lifecycle, and RPIV boundaries.

## Validation Results

- Focused API: `just verify-focused apps/api/test/project-registration-route.test.ts` — 22 passed after the initial two unsupported-media-type cases reproduced unsafe 500 responses.
- Focused client/controller/component: targeted just verify-focused — 65 passed after correcting one duplicate retry Cancel control and test-query ambiguity.
- Focused documentation: `just verify-focused apps/api/test/open-project-documentation.test.ts` — 2 passed.
- Focused Open Project gate: `just verify-open-project` — 91 Vitest tests and 2 Chromium tests passed.
- Full: final `just verify` passed formatting, lint, strict typecheck, API 289 tests at 88.29/80.47/86.57/89.19 percent statement/branch/function/line coverage, web 81 tests at 93.85/88.59/98.43/96.25 percent, BL-006 48-test gate, builds, Chromium 4 passed and 1 designated-only skipped, and capacity audit passed.
- Residual evidence: all five cleanup scenarios report zero process-group members, listeners, database files, fixtures, and post-teardown descendants; no cleanup child or BL-008 owned application process remained.

These notes provide correction evidence for independent Verify review and do not claim final acceptance.
