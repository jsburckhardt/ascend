# Ascend API

Fastify API for project metadata and host workbench lifecycle management.

The bootstrap scaffold includes SQLite/Drizzle foundations, structured Fastify logging, and environment-driven OpenTelemetry initialization. The API binds to loopback by default.

| Variable | Default |
|---|---|
| `ASCEND_HOST` | `127.0.0.1` |
| `ASCEND_PORT` | `3000` |
| `ASCEND_DATABASE_URL` | `file:ascend.db` |

Use the repository root `justfile` rather than invoking package commands directly.
