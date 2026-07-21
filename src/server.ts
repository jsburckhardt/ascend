// Ascend application HTTP server (ADR-0005 D1/D6).
//
// Built on Node's built-in `node:http` — no web framework, no build step, and
// zero third-party runtime dependency (ADR-0002 "no framework"). This module
// exports a `createAppServer()` factory that returns a NON-listening
// `http.Server`, so tests can bind an ephemeral port (`.listen(0)`) and
// `src/main.ts` owns the single real `.listen()` on the configured port.
//
// Strip-types-safe: no `enum`, `namespace`, or parameter properties — the code
// runs directly under `node --experimental-strip-types` (ADR-0005 D2).

import http from "node:http";

// A deliberately thin application shell (ADR-0005 D6; PRD §4 hyp. 6 / §5.5):
// minimal static markup, no navigation, project library, polished UI, auth,
// editor embedding, client-side JavaScript, or external assets.
const SHELL_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ascend</title>
  </head>
  <body>
    <main>
      <h1>Ascend</h1>
      <p>Ascend is running. Liveness is reported at <code>/health</code>.</p>
    </main>
  </body>
</html>
`;

// Route contract (ADR-0005 D6):
//   GET /health -> 200 application/json {"status":"ok"}
//   GET /       -> 200 text/html thin shell
//   anything else -> 404
export function createAppServer(): http.Server {
  return http.createServer((req, res) => {
    const method = req.method ?? "GET";
    // Strip any query string so `/health?x=1` still matches the route.
    const path = (req.url ?? "/").split("?", 1)[0];

    if (method === "GET" && path === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (method === "GET" && path === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(SHELL_HTML);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found\n");
  });
}
