# Project runtime manager

Issue #25 adds an internal, in-process runtime manager over the persisted four-field project record. It does not add an HTTP route or browser workflow.

## Interface and ownership

ProjectRuntimeManager.start({ projectId, canonicalPath, signal? }) validates the exact ID/path pair with ProjectLibrary.findById. It resolves an immutable snapshot with project ID, state, PID and process-start identity, loopback internal URL and port, canonical path, startedAt, and elapsedMs. inspect(projectId) reports starting, running, or bounded failed state; absence represents stopped. lastFailure(projectId) returns the retained typed diagnostic. shutdown() owns cleanup.

Process handles, PID identities, ports, in-flight operations, and lifecycle state are memory-only and exist only in manager memory. SQLite remains metadata-only with id, name, canonical_path, and created_at; no migration is required. Snapshots and failures never contain a command, environment, credentials, secrets, source or terminal content, command output, stacks, raw errors, or redaction sentinels.

## Launch and readiness contract

The default executable is /home/vscode/.local/bin/code-server, and the configured user is non-root vscode. Construction accepts explicit executable, user, deterministic environment allowlist, and finite bound overrides for tests or a designated deployment. Launch uses direct argument-vector process creation, a canonical working directory, a detached owned process group, a 127.0.0.1 manager-selected port, and the exact stored canonical directory once as the final argument. No shell interpolation occurs.

Port reservation is loopback-only. The unavoidable reservation-to-child-bind race retries address-in-use at most three times with a fresh candidate and exact owned-group cleanup; unrelated listeners are never closed, rebound, or signalled.

Readiness polls GET /healthz/. Only HTTP 200 plus JSON status equal to alive or code-server's healthy-idle expired state is accepted. Transient mismatches remain non-ready and are polled only within the total bound; the last observed status or body mismatch becomes its distinct typed failure if readiness never succeeds. Each request is bounded to 1,000 ms, polling is 50 ms, and total readiness is 15,000 ms. Attempt timing is retained finitely. Readiness uses cancellation, never a fixed startup sleep.

Exactly concurrent starts for one project join one launch/readiness promise. A later start reuses the same PID identity and port only when the exact process remains alive and the health contract passes. Failed starts are evicted and permit an explicit fresh retry. A post-running exit retains one bounded code-or-signal failure, evicts reuse state, and starts no automatic retry.

Caller cancellation ends only that caller's wait. It does not cancel or mutate shared manager-owned startup, create a duplicate, or affect later callers. Manager shutdown is the shared cancellation boundary.

## Typed failures

The closed categories are unknown-project, canonical-path-invariant, spawn-error, executable-missing, early-exit-code, early-exit-signal, address-in-use-exhausted, readiness-timeout, health-status-unexpected, health-body-unexpected, caller-cancelled, and manager-shutdown. Their fixed safe messages direct callers to refresh or register the project, install or correct code-server, release listeners, check host capacity, start again, or restart Ascend as appropriate.

Diagnostics allow only finite attempt count, exit code, signal, health status, timeout, and port fields. Every caller participating in one failed shared attempt receives the same typed failure object.

## Events and shutdown

Structured events are runtime.start.requested, runtime.start.succeeded, runtime.start.failed, runtime.health.changed, and runtime.exited. Allowed fields are event name, project ID, from/to state, non-negative elapsedMs, and a bounded failure classification. Raw canonical paths and protected development content are excluded.

Application close calls the one manager before registration and SQLite owners close. Repeated shutdown calls join one promise, reject new starts, cancel in-flight readiness with manager-shutdown, send SIGTERM only to exact owned groups, wait 2,000 ms, then allow a 2,000 ms SIGKILL escalation. Exact PID/start identity and listener inode absence are audited. Unrelated processes and listeners remain alive.

## Validation and observed result

Repository commands are just verify-project-runtime for the deterministic fake matrix, just proof-project-runtime for the one designated real episode, just proof-project-runtime-residual-audit for the exact retained audit, just verify-focused for focused validation, and just verify for authoritative full validation. The generic package test pass skips the designated episode to avoid concurrent host-process contention; just verify invokes the designated recipe serially before the residual audit.

The designated Ubuntu 24.04.4 host uses code-server 4.131.0, vscode uid 1000, Linux /proc sensors, and the BL-001 metacharacter fixture. The implementation run observed 880 ms startup against the 15,000 ms target (within target), HTTP 200 with healthy-idle expired, exact final path argument, loopback-only ownership, PID/port reuse, unchanged fixture bytes, exact cleanup, unrelated-control survival, and zero residuals. Generated evidence is test-results/bl-010/project-runtime/episode.json, fake-matrix.json, and residual-audit.json.

## Deferred boundaries

This manager intentionally does not add the stable route or proxy, Project Home navigation or Open wiring, multi-project coordination, user Stop or Restart UI, API-restart reconciliation, persisted runtime handles or state, auto-sleep, scheduling, or containers. Full-page workbench presentation remains unchanged. Harness boot remains non-persistent and test-backed.
