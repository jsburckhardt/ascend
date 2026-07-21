// TEST-A1 (ADR-0005 D6/D7): GET /health -> 200 application/json {"status":"ok"}.
//
// Built-in node:test + global fetch, zero new dependency. The server binds an
// ephemeral port via `withServer` and is closed in teardown (no leaked handle).

import { test } from "node:test";
import assert from "node:assert/strict";
import { withServer } from "./support.ts";

test('GET /health -> 200 application/json {"status":"ok"}', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/health`);

    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);

    const body = await res.json();
    assert.deepEqual(body, { status: "ok" });
  });
});
