// Shared test support for the node:test integration suites (ADR-0005 D7).
//
// Zero third-party dependency: built-in `node:test`/`node:net` + global `fetch`.
// `withServer` binds `createAppServer()` to an EPHEMERAL port (`.listen(0)`),
// hands the caller a base URL, and ALWAYS closes the server in teardown so no
// handle leaks and the runner exits cleanly. This file is not a `*.test.ts`, so
// the runner imports it but never executes it as a test.

import type { AddressInfo } from "node:net";
import { createAppServer } from "../../src/server.ts";

export async function withServer(
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createAppServer();
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  try {
    const { port } = server.address() as AddressInfo;
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
