// Ascend application entry point (ADR-0005 D1/D2/D6).
//
// Thin bootstrap executed by `npm run start`
// (`node --experimental-strip-types src/main.ts`). It owns the single real
// `.listen()` call; all routing lives in `createAppServer()` so the server
// stays unit-testable on an ephemeral port without binding a fixed one.
//
// Strip-types-safe: no `enum`, `namespace`, or parameter properties.

import { createAppServer } from "./server.ts";

const port = Number(process.env.PORT) || 3000;
const server = createAppServer();

server.listen(port, () => {
  console.log(`Ascend serving on http://localhost:${port}`);
});
