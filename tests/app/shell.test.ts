// TEST-A2 / TEST-A3 (ADR-0005 D6/D7): the `/` application shell and the 404
// fallback for unknown routes.
//
// Built-in node:test + global fetch, zero new dependency. Each test binds an
// ephemeral port via `withServer` and closes it in teardown (no leaked handle).

import { test } from "node:test";
import assert from "node:assert/strict";
import { withServer } from "./support.ts";

test("GET / -> 200 text/html thin shell (non-empty)", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/`);

    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);

    const body = await res.text();
    assert.ok(body.length > 0, "shell body should be non-empty");
    assert.match(body, /<html/i);
  });
});

test("GET /does-not-exist -> 404", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/does-not-exist`);
    // Drain the body so the connection is released and no handle leaks.
    await res.text();

    assert.equal(res.status, 404);
  });
});
