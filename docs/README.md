# Ascend Documentation

Ascend provides a browser project home for existing host directories and persistent code-server workbenches. The product owns navigation and runtime lifecycle; code-server owns editing, terminals, Explorer, previews, Git UI, and extensions.

## MVP Boundaries

- Projects are explicitly opened by filesystem path; Ascend does not scan for repositories.
- Project metadata is stored in SQLite; source files remain in their original directories.
- Closing a project removes metadata and stops managed resources without deleting project files.
- Workbenches run directly on the host as the configured Ascend user.
- The MVP targets a modern Chromium desktop browser and a single development host.

## Local Development

Use the root command interface:

```text
just setup
just run
just verify
```

The devcontainer pins Node.js 22, pnpm 10.34.5, and code-server 4.131.0 through features. Its post-create script invokes `just setup` to install workspace and Playwright dependencies reproducibly.

Configuration uses environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `ASCEND_HOST` | `127.0.0.1` | API bind address |
| `ASCEND_PORT` | `3000` | API port |
| `ASCEND_DATABASE_URL` | `<repository>/apps/api/ascend.db` | Local application SQLite path; `file:` or filesystem-path overrides are supported |
| `ASCEND_PROJECT_HOME` | configured OS home | Home used for `~` expansion and opening policy |
| `ASCEND_PROJECT_ALLOWED_ROOTS` | configured home | Path-delimiter-separated allowed roots; an explicit empty value is deny-all |
| Standard `OTEL_*` variables | OpenTelemetry defaults | Optional observability configuration |

Application logs are simple structured console records. Logs and telemetry must not contain source, terminal, clipboard, prompt, credential, or secret content.

## Designated-host workbench proof

The repository exposes `just proof-start` and `just proof-stop` for one bounded standalone code-server 4.131.0 lifecycle. `just verify` includes five fake failure cases and two real workbench Chromium scenarios: forced integrated-terminal timeout cleanup and passing Explorer, Markdown Preview, and terminal parity, each with exact-handle cleanup. See [`workbench-proof.md`](workbench-proof.md) for the fixed host prerequisites, handle contract, readiness and stop bounds, disposable artifacts, diagnostics, evidence, and troubleshooting. Harness boot remains non-persistent and test-backed.

## Source Documents

- [`PRD.md`](../PRD.md) defines the MVP requirements and acceptance criteria.
- [`ADR-260808-typescript-monorepo`](../project/architecture/ADR/ADR-260808-typescript-monorepo.md) defines the initial stack.
- [`project/architecture/core-components/`](../project/architecture/core-components/) contains cross-cutting contracts.

## Host-native terminal parity

Run `just proof-terminal-parity` on the designated Ubuntu 24.04.4 LTS devcontainer as `vscode` with code-server 4.131.0, Chromium, and the fixed Git, GitHub CLI, tmux, Docker CLI, and Copilot CLI executables installed. The BL-001 workbench/Chromium sensor runs both real scenarios; its passing terminal-parity scenario compares direct and integrated `hostname`, `id -un`, `pwd -P`, and the exact six-command tool list. It has a 90,000 ms episode bound and 5,000 ms per-command bounds. See [the operational runbook](workbench-proof.md).

## Browser workbench presentation proof

The designated comparison command is just proof-workbench-presentation. It compares only embedded code-server and full-page code-server with a minimal Ascend header, using three fresh no-retry attempts per candidate and a 1440 by 900 repository Chromium context. The retained authoritative desktop result selected full-page because it had fewer blocking browser protocol violations, 0 versus 3. Both candidates were eligible. Tablet validation remains a separate non-authoritative follow-up, and this proof adds no product routing or lifecycle behavior. The operational and evidence contract is documented in workbench-proof.md.


## Project library persistence


```text
just db-migrate <database-path>
```

The command creates parent directories and a missing database, never resets data, applies committed migrations in order, closes its SQLite handle, and emits exactly one JSON object. For the supported missing, immediately prior, and current committed states, the complete output set is:

```json
{"appliedMigrationIds":["0000_project_library","0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":["0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":[],"currentMigrationId":"0001_project_canonical_path_unique"}
```

The final `projects` table has exactly four physical columns: `id`, `name`, `canonical_path`, and `created_at`. They map to the `Project` fields `id`, `name`, `canonicalPath`, and `createdAt`; `createdAt` is a finite, non-negative safe integer containing Unix epoch milliseconds. No source text, terminal output, ports, PIDs, handles, environment data, credentials, secrets, or runtime state is part of this schema.

The in-process `ProjectLibrary` creates and lists records. A valid create returns a `created` or `existing` disposition; canonical-path uniqueness is enforced by SQLite, and `existing` carries the durable winning record. Invalid input returns `invalid` with `empty-id`, `blank-name`, `empty-canonical-path`, or `invalid-created-at` before a write. A bounded integration proof closes the complete library/database generation, reconstructs fresh instances at the same path, and recovers exactly two records once each. BL-007 now exposes this persisted data through the read-only list route and Project Home.

Migration compatibility uses the tracked prior-version fixture `apps/api/test/fixtures/db/0000_project_library.sqlite`, which is at `0000_project_library` and contains exactly two records. BL-005 database tests allocate unique paths below `test-results/bl-005/databases`, refuse `<repository>/apps/api/ascend.db`, close all handles, remove only the selected database plus `-wal`, `-shm`, and `-journal`, and prove those files are absent. The tracked fixture is copied and never mutated.



## Canonical filesystem registration

BL-006 adds the in-process registration boundary over BL-005 persistence. BL-008 delegates to that unchanged boundary from HTTP and Project Home. Construction receives an explicit database path, configured home, and allowed-root list. Every configured entry must be an absolute, existing, readable directory and is canonicalized once before persistence opens. Canonically equivalent roots are deduplicated, configuration symlink targets are frozen for the service lifetime, and [] is a valid deny-all policy. Any invalid entry fails the whole construction as invalid_opening_policy with only safe field configured_home or allowed_roots[n].

Inputs support absolute paths, exactly ~, and ~/.... Blank input maps to path_required; NUL and unsupported forms map to unsupported_path_syntax; missing, file, unreadable, and disallowed targets map to path_not_found, path_not_directory, path_unreadable, and outside_opening_policy. Each registration failure contains only field: path and its category. Nonblank path whitespace is preserved. Canonical segment containment admits roots and descendants while rejecting prefix siblings, outside traversal, and escaping symlinks; symlinked roots are evaluated at their canonical targets.

A project record has exactly stable ID, canonical-basename display name (canonical root fallback), canonical path, and created-at time. Equivalent absolute, home, normalized, or symlink inputs—and exactly eight concurrent registrations—return the same durable four-field winner after close/reopen. Registration never mutates project membership, bytes, permissions, or modification timestamps.

just verify-project-registration uses disposable test-results/bl-006/fixtures trees and emits named configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and permission-capability signals. The generated test-results/bl-006/permission-capability.json says proved only when bounded mode-000 checks are enforceable; otherwise it says skipped with the failed probe result. Controlled denial always proves unreadable configuration and project mappings, and fixture cleanup restores modes and removes only allocated roots.



BL-008 exposes BL-006 registration but does not replace its path, canonicalization, policy, persistence, idempotency, or non-mutation rules. Repository scanning, clone/import, Git requirements, native pickers, project close, and workbench launch remain outside registration.

## Open Project interaction (BL-008)

API startup resolves one `ASCEND_DATABASE_URL`, applies committed migrations before listening, constructs the listing library and merged BL-006 registration service before listening, and closes both idempotently. Complete shutdown closes resources after repeated SIGINT, SIGTERM, or direct stop. Startup failure emits only `api.start.failed` with `project_library_initialization_failed`. List failure emits only `project.list.failed` with `project_list_failed`. The page retains loading, empty, populated, failure, and Retry states. Invalid opening-policy or persistence initialization fails before listen with only the safe startup category. No schema, data, API, or configuration migration is required.

### HTTP contracts

`GET /api/projects` remains the exact ordered list contract. `POST /api/projects` requires `Content-Type: application/json`, a body of at most 4,096 encoded bytes, and an exact object with the sole string field `path`; `name` is never submitted. Blank and whitespace strings are contract-valid and delegate once to BL-006. `application/json` is the only supported request media type; missing or other media types, including parser-supported `text/plain` and unsupported `application/xml` or `application/octet-stream`, return the safe 400 `invalid_registration_request` envelope with no delegation. Empty or malformed JSON, scalar or array bodies, missing or non-string path, and extra fields return 400 `{"error":{"category":"invalid_registration_request"}}` with no delegation. Byte 4,097 returns 413 `{"error":{"category":"registration_request_too_large"}}`.

Created is HTTP 201 and existing is HTTP 200. Both return only:

```json
{"disposition":"created","project":{"id":"stable-id","name":"BL-006 name","canonicalPath":"/canonical/path","createdAt":1786407000000}}
```

Typed failures return only `{"error":{"category":"<category>","field":"path"}}`: `path_required` and `unsupported_path_syntax` are 400, `path_not_found` is 404, `path_unreadable` and `outside_opening_policy` are 403, and `path_not_directory` is 422. Unexpected failures are 500 `{"error":{"category":"project_registration_failed"}}`. Responses and structured events expose no submitted or configured path, partial project, raw platform error, stack, SQL, secret, or internal detail.

### Accessible interaction and recovery

Project Home presents a semantic Open Project form with a persistent `Host path` label and associated absolute, `~`, and `~/...` guidance. It preserves exact input. Blank input and all six typed path failures set `aria-invalid`, associate an alert with the field, announce the specific correction, focus the field, retain text, and change no card. React renders input, locked payload, names, and paths as complete inert whitespace-preserving text.

Created and existing responses upsert by stable ID only, never display text, and restore `createdAt ASC, id ASC`. The exact card Open action is scrolled into view, focused, and announced as created or already registered. Equivalent path expressions therefore activate one unchanged card and one durable record. Open itself remains project-ID identified and keyboard operable but only announces that the workbench is deferred; it starts no workbench, request, or navigation.

Each ordinary or retry registration owns a 10,000 ms bound; each list or recovery refresh owns 5,000 ms. Pending registration blocks repeated submit and exposes active Cancel. Ordinary cancellation, controlled positive pre-send unavailability, and unmount preserve input and cards while invalidating late completion. Once fetch is invoked, timeout, reset or rejection, truncated or unreadable body, non-JSON, undocumented status, or invalid response contract is `Submission outcome unknown`.

Unknown outcome locks and visibly displays the exact serialized `{"path":"..."}` payload. Before a successful refresh, the only idle recovery actions are `Retry same submission` and `Refresh projects`; a different payload cannot be sent. Retry sends byte-equivalent JSON and has the same timeout and Cancel. Retry cancellation returns to the same locked state. Refresh replaces cards only after a valid authoritative list and compares stable IDs with the immutable pre-submit snapshot: one added ID is focused and reconciled; zero added IDs retains authoritative cards, unlocks the exact input, and announces no new project; multiple additions retain the complete list without guessing identity and require explicit reset. Failed, timed-out, or invalid refresh preserves locked payload and current cards and restores both recovery actions.

One active owner and monotonic generation govern ordinary, retry, refresh, cancellation, timeout, authoritative lists, reset, and unmount. Any completion from an invalidated generation is inert across cards, input, validation, focus, scroll, announcements, and recovery state.

### Scope and validation

Native pickers, scanning, clone/import, repository detection, running or failed workbench close, search, user sorting, tags, path mutation, workbench launch, BL-010, and BL-012 remain deferred. Run root commands only: `just verify-open-project`, targeted `just verify-focused <test-path>`, and `just verify`.

The real desktop Chromium episode is keyboard-only and uses disposable loopback listeners, an isolated refused-default database, and content-bearing host fixtures below `test-results/bl-008/open-project`. It proves created, equivalent existing, invalid/corrected, stable identity, no reload, and deferred Open. Recursive manifests prove fixture membership, bytes, links, modes, and timestamps unchanged. Harness boot remains non-persistent and test-backed.

The bounded episode passed. Retained cleanup evidence maps only executed scenarios; the prior modeled startup placeholders are no longer used:

| Artifact / scenario | Injected event | Retained result |
|---|---|---|
| `episode.json` / success | Complete keyboard episode | Graceful API/web stop, absent listeners and process groups, removed database/sidecars and fixture allocation, equal fixture manifest |
| `cleanup-matrix.json` / `startupFailure` | Rejected startup after resource allocation | Failure observed; independent process-group, listener, database/sidecar, and fixture audits are zero |
| `cleanup-matrix.json` / `assertionFailure` | Assertion thrown after listener readiness | Failure observed; all four owned-resource audits are zero |
| `cleanup-matrix.json` / `episodeTimeout` | Executed bounded timeout race | Timeout observed; all four owned-resource audits are zero |
| `cleanup-matrix.json` / `interruptedGracefulShutdown` | Child ignores SIGTERM | `gracefulStop` is false; exact-group escalation completes and all four owned-resource audits are zero |
| `cleanup-matrix.json` / `survivingDescendant` | Descendant escapes the parent process group | Survivor is detected and `ownerCleanupPassed` is false; exact-PID test teardown removes it, then `teardownClean` is true and every residual count is zero |

The matrix stores booleans and counts, including each scenario's executed failure, process-group members, listeners, database files, fixtures, descendant count before teardown, and descendant count after teardown. It is not an all-true assertion: the interrupted graceful result and pre-teardown surviving-descendant owner verdict are deliberately false.


## Persistence-only stopped-project close (BL-009)

DELETE /api/projects/{id} treats the decoded nonempty stable ID as opaque. It delegates once and returns exactly 200 {id:<stable-id>, disposition:closed}, 400 {error:{category:invalid_project_id}}, 404 {error:{category:project_not_found}}, or 500 {error:{category:project_close_failed}}. Metadata removal uses DELETE WHERE id RETURNING id inside one explicit SQLite transaction. Unknown and already-absent IDs change no row; persistence failure rolls back target and siblings. No migration or configuration change is required.

The close service is constructed over the application-owned listing ProjectLibrary and has no project path inspector, runtime manager, or project-filesystem API. Close never deletes, moves, renames, copies, chmods, or changes project contents. Exactly eight concurrent DELETE requests produce one closed and seven project_not_found outcomes. Responses, logs, and browser errors contain safe categories and fixed copy rather than IDs, paths, SQL, database paths, stacks, project content, secrets, or internal detail. Fastify access logging enforces `req.url` redaction to `[request-url-redacted]`; captured DELETE logs contain the static event/category but neither encoded nor decoded project-ID sentinels.

Each card has one Close button. Its aria-modal dialog is named Close <project name>? and says exactly: Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted. Focus is trapped for Tab and Shift+Tab. Escape and Cancel before transmission make zero close requests and restore the activating button. Confirm is destructive and repeat activation cannot start another request. Transmitted pending and recovery states are announced programmatically without Cancel.

Confirmed success filters only the original ID without page reload and focuses the next Close, previous Close, or Ascend heading; closing the final card displays No registered projects. A definitive no-mutation failure exposes same-ID Retry. project_not_found and ambiguous post-transmission timeout/reset/body/status/contract results require GET /api/projects reconciliation. Original-ID presence enables Retry; absence applies success; failed, timed-out, duplicate-ID, or invalid refresh leaves the interaction locked with Refresh projects. One abortable generation suppresses stale, cancelled, timed-out, and unmounted completion.

The recursive BL-009 matrix executes Cancel, success, unknown, persistence failure, transport ambiguity plus authoritative GET, same-ID retry, repeated already-absent close, and a combined exact eight-way HTTP DELETE path. Every named outcome retains complete before/after relative membership, bytes, symlink targets, modes, and nanosecond mtimes before cleanup; the combined path records one 200, seven 404 responses, and equal recursive manifests. The desktop Chromium flow performs keyboard registration, Cancel, Confirm, authoritative-list removal, and unchanged sentinel validation. A separate repository-controlled one-shot persistence fault proves safe Retry and recovery. Cleanup removes only owned process groups, listeners, isolated database plus -wal/-shm/-journal, and disposable fixtures after integrity capture.

Component/client text-safety checks execute one-character and 4,096-character bounded project name/path fixtures as inert text. That 4,096-character fixture is not a new product name/path maximum; the existing finite request contract remains 4,096 encoded registration-body bytes and rejects byte 4,097. Malformed IDs are rejected before DELETE transmission.

Use just verify-close-project, targeted just verify-focused paths, and just verify. Generated evidence lives at test-results/bl-009/close-project/manifest-matrix.json, test-results/bl-008/open-project/episode.json, and test-results/bl-008/open-project/close-fault-episode.json. Running or failed workbench close, stop/restart, runtime state, archive, undo, bulk close, and product cleanup remain BL-020 or later.


Exact DELETE wire examples are:

    200 {"id":"stable-id","disposition":"closed"}
    400 {"error":{"category":"invalid_project_id"}}
    404 {"error":{"category":"project_not_found"}}
    500 {"error":{"category":"project_close_failed"}}
