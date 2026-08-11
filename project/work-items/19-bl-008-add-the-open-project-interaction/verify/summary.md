# Verification Summary: Issue #19

- **Issue:** BL-008: Add the Open Project interaction
- **Work Item:** project/work-items/19-bl-008-add-the-open-project-interaction
- **Verified Branch:** feat/19-add-open-project-interaction
- **Implementation Commit:** 5e43214d40d12ef79a8ee04c8c194ebf73ef9f57
- **Base Commit:** 23562840afd1c596a9027bb232d54d32241ae63e
- **Pull Request:** https://github.com/jsburckhardt/ascend/pull/20

## Acceptance Decisions

- **AC-1 — Passed:** Exact path-only requests delegate once to unchanged BL-006 behavior.
- **AC-2 — Passed:** Exact created/existing, six typed failure, and safe unexpected envelopes and statuses are tested and documented.
- **AC-3 — Passed:** Invalid shape/media, malformed, 4,096-byte, and 4,097-byte cases prove safe rejection, delegation counts, and unchanged rows.
- **AC-4 — Passed:** Semantic labeled form, notation guidance, exact value retention, and correction are covered.
- **AC-5 — Passed:** Blank, whitespace, and all typed failures associate and announce errors, focus input, and preserve cards/value.
- **AC-6 — Passed:** Stable-ID upsert, ordering, duplicate prevention, scroll/focus, announcements, and no reload are proven.
- **AC-7 — Passed:** Equivalent expressions retain one stable ID, card, and durable record.
- **AC-8 — Passed:** Ten-second ownership, active Cancel, repeat blocking, unmount abort, and late suppression are proven.
- **AC-9 — Passed:** Definite pre-send and ordinary-cancel outcomes preserve input/cards and restore editing.
- **AC-10 — Passed:** All ambiguous triggers lock and display exact payload with announced unknown state and two recovery actions.
- **AC-11 — Passed:** Unknown state blocks other payloads and exits only through specified retry, refresh, or reset transitions.
- **AC-12 — Passed:** Retry bytes are identical and successful retry activates only the returned stable-ID card.
- **AC-13 — Passed:** Retry cancellation restores unchanged locked recovery and suppresses delayed completion.
- **AC-14 — Passed:** One-ID authoritative refresh replaces cards and activates the sole snapshot addition.
- **AC-15 — Passed:** Zero-ID refresh retains authoritative cards and unlocks exact input with correction focus.
- **AC-16 — Passed:** Multi-ID refresh retains the complete list, guesses no identity, and requires reset.
- **AC-17 — Passed:** Failed, timed-out, and invalid refresh preserve cards/payload and restore recovery actions.
- **AC-18 — Passed:** Repeated recovery actions prove one finite active owner and no parallel updates.
- **AC-19 — Passed:** Monotonic generation tests make all invalidated completions inert across visible state.
- **AC-20 — Passed:** Exact React text and API redaction matrices keep values inert and internal details absent.
- **AC-21 — Passed:** Stable-ID keyboard Open remains deferred with no navigation, request, or workbench.
- **AC-22 — Passed:** The 22-test isolated API suite covers the complete contract, identity, rejection, redaction, and cleanup matrix.
- **AC-23 — Passed:** Eight concurrent equivalents produce eight complete responses, eight delegations, and one reopened durable row.
- **AC-24 — Passed:** 27 client, 16 controller, and 22 component tests cover the required finite interaction matrix.
- **AC-25 — Passed:** One bounded no-retry desktop Chromium episode proves all keyboard-only registration phases and deferred Open.
- **AC-26 — Passed:** Isolated fixture manifests and five executed cleanup scenarios end with zero final owned residuals.
- **AC-27 — Passed:** Application documentation fully matches API, UI, recovery, accessibility, scope, validation, isolation, and cleanup behavior.
- **AC-28 — Passed:** Focused evidence and independent full verification pass with no BL-008 residual.

## Documentation Review

Passed for README, API reference, configuration, usage, migration, architecture impact, operations, harness, cleanup, and deployment impact. Only application/json is supported; safe 400 behavior for text/plain, application/xml, and application/octet-stream matches committed code and tests. No schema/data migration, new ADR, core component, or deployment surface is required.

## Diff and Architecture Review

The complete 31-file branch diff (4,024 additions, 433 deletions) is issue-scoped. It complies with the accepted TypeScript/Fastify/React/SQLite stack, filesystem path safety, closeable SQLite ownership, structured redaction, root command interface, non-persistent harness, deferred full-page workbench boundary, and Conventional Commit standards. All three implementation commits contain the required Co-authored-by trailer.

## Validation

- Root justfile exposes verify-focused and verify.
- Independent just verify exited zero.
- API: 49 files, 289 tests; coverage 88.29% statements, 80.41% branches, 86.57% functions, 89.23% lines.
- Web: 4 files, 81 tests; coverage 93.85% statements, 88.59% branches, 98.43% functions, 96.25% lines.
- BL-006 gate: 48 tests passed.
- Chromium: 4 passed; 1 designated-only scenario skipped.
- Capacity audit passed.
- Retained episode and cleanup evidence passed; independent filesystem and process scans found zero BL-008 owned residuals.

## Result

Accepted and shipped in pull request #20.
