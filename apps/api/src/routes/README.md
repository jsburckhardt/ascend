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

The public project registration and list payload remains exactly id, name, canonicalPath, and createdAt. Runtime PID, process-start identity, port, internal URL, stable route, owner token, handles, state, and ephemeral user-data path are trusted in-process values only; BL-013 adds no schema, migration, runtime payload, Stop endpoint, or Restart endpoint.

### Read-only runtime state

`GET /api/projects/runtime` is a separate read-only endpoint. It lists authoritative projects in the same `createdAt ASC, id ASC` order as `GET /api/projects`, then performs one synchronous manager projection. HTTP 200 is exactly `{"runtimes":[{"id":"stable-id","state":"Stopped"}]}`. State is one of `Stopped`, `Starting`, `Running`, or `Failed`; only `Failed` adds `failureCategory`, and that value is one of the 12 bounded runtime categories. No row includes name, canonical path, process identity, port, authority, stable route, owner token, command, environment, or diagnostic.

If project listing or projection fails, the route logs `project.runtime.state.failed` and returns exactly HTTP 500 `{"error":{"category":"runtime_state_failed"}}`. It never returns a partial list or an empty success-shaped fallback. The four-field `GET /api/projects` response, its validators, `POST /api/projects`, and `DELETE /api/projects/{id}` remain unchanged.

Runtime state is memory-only and read-only. This route adds no schema or data migration, configuration variable, deployment topology, Stop or Restart route, stream, or polling protocol. Validate it with `just verify-runtime-state`; retained evidence is `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json`.

The stable /projects/{projectId}/workbench/ HTTP and WebSocket boundary resolves one stable-ID-keyed runtime snapshot per active project. It rejects a snapshot whose ID, canonical path, route, owner token, loopback URL, or port does not match the persisted project and parsed route, and rejects any snapshot that is not the exact running object still owned by ProjectRuntimeManager. Interleaved A/B/C requests, upgrades, and frames remain bound to their matching project token and target. Global application shutdown is the only exposed runtime shutdown path.

Use just verify-project-runtime-isolation for the 12-scenario schema-version-2 matrix, its exact 70-record event catalog, 18 pre-forward mismatch rows, six rejected cross-project frame-destination attempts through the production forwarding boundary, persisted-close and measured task-settlement audits, and the Chromium exact-status replacement episode; use just proof-project-runtime-isolation-residual-audit for the independent exact-resource inventory. These are test/evidence refinements and change no public API contract. BL-014 now validates switching/session reuse through the unchanged route and runtime API; it adds no endpoint or payload. BL-015 performance and public lifecycle controls remain explicitly outside API capabilities.
