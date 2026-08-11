# Verification Summary: Issue #21

## Delivery

- **Issue:** BL-009: Close a stopped project without deleting files
- **Work item:** `project/work-items/21-bl-009-close-a-stopped-project-without-deleting-files`
- **Verified branch:** `feat/21-close-stopped-project-and`
- **Implementation commit:** `51d76a1d342f9d8e5ff7b37d154cad6a61e63f75`
- **Merge base:** `831ec7abd278da6a4f479d6a2791b793b2dc62e5`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/22
- **Decision:** Accepted

## Contract Review

The exact branch and implementation SHA matched the Implement handoff and the working tree was clean before verification. The complete 38-file branch diff and both implementation commit messages were inspected. Scope stays within persistence-only stopped-project close; no runtime lifecycle, archive, product filesystem cleanup, schema migration, configuration option, or unrelated feature was added. The referenced ADRs and core-components remain satisfied. Both implementation commits use Conventional Commit subjects and include the required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer.

## Documentation Review

Passed. `README.md`, `docs/README.md`, `apps/api/README.md`, `apps/web/README.md`, `.harness/engineering-harness.md`, and the root `justfile` accurately cover the DELETE contract, persistence-only scope, exact dialog copy, keyboard/focus behavior, same-ID recovery, request-URL redaction, manifests, controlled fault, cleanup, commands, and BL-020 deferral. Configuration, migration, architecture, and deployment have concrete no-impact rationales; no stale or contradictory applicable documentation was found.

## Acceptance Decisions

- **AC-1 — Passed:** Transactional delete-returning, typed absence, sibling preservation, restart absence, and real after-delete rollback passed.
- **AC-2 — Passed:** Metadata-only dependency plus all equal recursive manifests prove no project-filesystem call or mutation.
- **AC-3 — Passed:** Exact 200/400/404/500 DELETE mappings and one accepted delegation passed.
- **AC-4 — Passed:** Response, UI, and log sentinel scans passed; request URLs and encoded/decoded IDs are redacted.
- **AC-5 — Passed:** One semantic Close action and exact accessible dialog name/copy passed in component and Chromium evidence.
- **AC-6 — Passed:** Tab/Shift+Tab containment, Escape/Cancel zero requests, and focus restoration passed.
- **AC-7 — Passed:** Destructive confirmation, repeated-action suppression, cancellation boundary, pending state, and announcements passed.
- **AC-8 — Passed:** Stable-ID-only removal, no reload, success announcement, focus fallback, and final empty state passed.
- **AC-9 — Passed:** Definitive failures preserve the card and expose only proven same-ID recovery with safe guidance.
- **AC-10 — Passed:** Ambiguous outcomes and all authoritative present/absent/failed/invalid reconciliation branches passed without guessing.
- **AC-11 — Passed:** Original-ID ownership, one active request, abort, stale generation, timeout, cancellation, and unmount suppression passed.
- **AC-12 — Passed:** Combined eight real HTTP DELETEs yielded one 200 and seven 404 responses, zero target rows, and an unchanged manifest.
- **AC-13 — Passed:** Whitespace, metacharacter, one-character, 4,096-character, and existing byte-bound fixtures remain inert.
- **AC-14 — Passed:** All eight executed manifest outcomes have identical membership, bytes/link targets, modes, and timestamps before cleanup.
- **AC-15 — Passed:** Isolated malformed, success, absence, rollback, restart, closure, redaction, concurrency, and targeted-cleanup evidence passed.
- **AC-16 — Passed:** Definitive, ambiguous, and stale matrices passed 27 client, 15 controller, and 16 component cases.
- **AC-17 — Passed:** Keyboard Chromium success and separate controlled persistence-fault recovery passed with unchanged sentinel content.
- **AC-18 — Passed:** Browser episodes and five cleanup scenarios prove integrity-before-cleanup and zero final owned resources.
- **AC-19 — Passed:** All required application, API, usage, operational, command, evidence, cleanup, and scope documentation is current.
- **AC-20 — Passed:** Focused and full root validation exited zero; retained evidence and residual probes were clean.

## Validation Results

- **Root command interface — Passed:** `just --list` exposes `verify-focused`, `verify-close-project`, and `verify`.
- **Documentation review — Passed:** Applicable documentation matches commit behavior and configuration.
- **`just verify-close-project` — Passed:** 7 Vitest files, 76 tests; 3 Chromium tests.
- **Independent `just verify` — Passed:** formatting, lint, strict typecheck, API 307 tests with 80.21% branch coverage, web 139 tests with 90.46% branch coverage, BL-006 48-test gate, builds, 5 browser passes with 1 designated skip, and capacity audit.
- **Retained evidence — Passed:** manifest matrix, success episode, controlled-fault episode, and five-scenario cleanup matrix validated.
- **Residual audit — Passed:** no close-owned database, sidecar, fixture, process, or listener residual was reported or found.

All AC-1 through AC-20 passed independently. Issue acceptance checkboxes were updated only after acceptance, the verified branch was pushed, and pull request #22 was created.
