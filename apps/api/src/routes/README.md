# Routes Folder

Routes define the pathways within your application.
Fastify's structure supports the modular monolith approach, where your
application is organized into distinct, self-contained modules.
This facilitates easier scaling and future transition to a microservice architecture.
In the future you might want
to independently deploy some of those.

In this folder you should define all the routes that define the endpoints
of your web application.
Each service is a [Fastify
plugin](https://fastify.dev/docs/latest/Reference/Plugins/), it is
encapsulated (it can have its own independent plugins) and it is
typically stored in a file; be careful to group your routes logically,
e.g. all `/users` routes in a `users.js` file. We have added
a `root.js` file for you with a '/' root added.

If a single file becomes too large, create a folder and add a `index.js` file there:
this file must be a Fastify plugin, and it will be loaded automatically
by the application. You can now add as many files as you want inside that folder.
In this way you can create complex routes within a single monolith,
and eventually extract them.

If you need to share functionality between routes, place that
functionality into the `plugins` folder, and share it via
[decorators](https://fastify.dev/docs/latest/Reference/Decorators/).

If you're a bit confused about using `async/await` to write routes, you would
better take a look at [Promise resolution](https://fastify.dev/docs/latest/Reference/Routes/#promise-resolution) for more details.


## Ascend project and workbench routes

The public project registration and list payload remains exactly id, name, canonicalPath, and createdAt. Runtime PID, process-start identity, port, internal URL, stable route, owner token, handles, state, and ephemeral user-data path are trusted in-process values only. BL-013 adds no schema, migration, or runtime payload. BL-017 adds selected Stop and BL-018 adds selected Restart without adding those values to persistence or public payloads.

### Read-only runtime state

`GET /api/projects/runtime` is a separate read-only endpoint. It lists authoritative projects in the same `createdAt ASC, id ASC` order as `GET /api/projects`, then performs one synchronous manager projection. HTTP 200 is exactly `{"runtimes":[{"id":"stable-id","state":"Stopped"}]}`. State is one of `Stopped`, `Starting`, `Running`, or `Failed`; an internal reconciling project reports `Starting`, an adopted survivor `Running`, proven absence `Stopped`, and unresolved evidence `Failed/reconcile-unconfirmed`; only `Failed` adds `failureCategory`, and that value is one of the 19 bounded runtime categories. No row includes name, canonical path, process identity, port, authority, stable route, owner token, command, environment, or diagnostic.

If project listing or projection fails, the route logs `project.runtime.state.failed` and returns exactly HTTP 500 `{"error":{"category":"runtime_state_failed"}}`. It never returns a partial list or an empty success-shaped fallback. The four-field `GET /api/projects` response, its validators, `POST /api/projects`, and `DELETE /api/projects/{id}` remain unchanged.

Runtime state is memory-only and read-only. This projection route adds no schema or data migration, configuration variable, deployment topology, stream, or polling protocol. Validate it with `just verify-runtime-state`; retained evidence is `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json`.

### Selected runtime stop

`POST /api/projects/{id}/runtime/stop` accepts one decoded nonempty stable ID. The request carries no operation fields: an absent body or empty JSON object is accepted, any non-empty parsed body or query field is `invalid_stop_request`, and the body limit is 1,024 bytes. The route delegates exactly once to `ProjectRuntimeManager.stop({ projectId: id })`. It does not call process termination, audit, health, registration mutation, or project filesystem APIs itself.

Success is HTTP 200 with exactly one of:

```json
{"id":"stable-id","outcome":"stopped"}
{"id":"stable-id","outcome":"already-stopped"}
```

The exact error table is:

| Condition | HTTP | Category |
|---|---:|---|
| missing, empty, or undecodable ID | 400 | `invalid_project_id` |
| invalid request body or query | 400 | `invalid_stop_request` |
| project registration absent | 404 | `project_not_found` |
| persisted project has no manager-owned runtime | 409 | `runtime_not_managed` |
| start is in progress | 409 | `runtime_start_in_progress` |
| restart is in progress | 409 | `runtime_restart_in_progress` |
| runtime failure is retained | 409 | `runtime_failure_retained` |
| termination absence cannot be confirmed | 500 | `runtime_stop_unconfirmed` |
| runtime manager shutdown has begun | 503 | `runtime_manager_shutdown` |
| unexpected or invariant stop failure | 500 | `runtime_stop_failed` |
| reconciliation is pending | 409 | `runtime_reconcile_in_progress` |
| reconciliation is unresolved | 409 | `runtime_reconcile_unresolved` |

Errors are exactly `{"error":{"category":"<category>"}}`. The twelve-category route vocabulary is fixed. No response includes public runtime state, release mode, audit, PID, process identity, group membership, port, listener, path, authority, diagnostic, or server message. Expected rejections log `project.runtime.stop.rejected` with only the bounded route category; unexpected faults log the operational record `project.runtime.stop.failed`. The route emits no lifecycle event.

`runtime_not_managed` and `already-stopped` are deliberately distinct. A persisted project with no entry before reconciliation returns the former; after API restart, a positively absent project is installed as released and returns `already-stopped`, while pending or unresolved reconciliation returns its distinct 409 category. The latter is available only when this manager retains a released registration installed by a confirmed selected stop. Stop leaves the four persisted project fields and filesystem unchanged. Project Home obtains the resulting public state from one fresh `GET /api/projects/runtime` request rather than from this action response.

Validate the finite contract and fixed 31-scenario matrix with `just verify-runtime-stop`. Run `just proof-runtime-stop` for the single designated real-host selected-stop episode, including registration/fixture retention and its recorded ownership evidence. Run `just proof-runtime-stop-residual-audit` for the independent exact root/member identities, owned process group, and loopback listener residual-absence audit only. It does not audit registration or fixtures; those are checked by the designated episode. The committed deterministic artifact is `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json`.

### Selected runtime restart

`POST /api/projects/{id}/runtime/restart` accepts one decoded nonempty stable ID, an absent body or empty JSON object, no query fields, and at most 1,024 body bytes. It delegates exactly once to `ProjectRuntimeManager.restart({ projectId: id })`. Success is exactly `{"id":"stable-id","outcome":"restarted"}`. Its twelve error categories are `invalid_project_id`, `invalid_restart_request`, `project_not_found`, `runtime_not_managed`, `runtime_start_in_progress`, `runtime_stop_in_progress`, `runtime_restart_release_unconfirmed`, `runtime_replacement_failed`, `runtime_manager_shutdown`, `runtime_restart_failed`, `runtime_reconcile_in_progress`, and `runtime_reconcile_unresolved`; both reconciliation categories are HTTP 409.

The route returns no state, identity, release mode, audit, path, authority, diagnostic, or server message. Expected rejections log `project.runtime.restart.rejected`; unexpected faults log `project.runtime.restart.failed`. Validate with `just verify-runtime-restart`, `just proof-runtime-restart`, and `just proof-runtime-restart-residual-audit`.

The stable /projects/{projectId}/workbench/ HTTP and WebSocket boundary resolves one stable-ID-keyed runtime snapshot per active project. It rejects a snapshot whose ID, canonical path, route, owner token, loopback URL, or port does not match the persisted project and parsed route, and rejects any snapshot that is not the exact running object still owned by ProjectRuntimeManager. Interleaved A/B/C requests, upgrades, and frames remain bound to their matching project token and target. The selected Stop and Restart routes plus global application shutdown are the exposed runtime lifecycle paths; the proxy remains a pure consumer and never invokes them.

Use just verify-project-runtime-isolation for the 12-scenario schema-version-2 matrix, its exact 70-record event catalog, 18 pre-forward mismatch rows, six rejected cross-project frame-destination attempts through the production forwarding boundary, persisted-close and measured task-settlement audits, and the Chromium exact-status replacement episode; use just proof-project-runtime-isolation-residual-audit for the independent exact-resource inventory. BL-014 validates switching/session reuse through the stable route. BL-017 adds selected Stop and BL-018 adds selected Restart; the stable proxy payload and target-selection contract remain unchanged.
