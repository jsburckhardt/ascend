// tests/launcher/launch-editor.test.ts
//
// TEST-L1..L8 (ADR-0006 D3/D5/D6/D7; issue #7 AC4/AC5, PRD 5.7): drive
// `scripts/launch-editor.sh` directly through node:child_process. The suite is
// CODE-SERVER-FREE — a stub `code-server` on PATH stands in for the real binary
// — so it stays green in CI where code-server is absent. Zero third-party
// dependency (built-in node:test + node:child_process + node:fs; ADR-0005 D7).
//
// It asserts: fail-fast exit codes + stderr on invalid PROJECT_PATH (L1..L4,L6),
// the exact isolated code-server argv on a valid dir (L5) incl. EDITOR_PORT
// override (L7), that the target directory is byte-for-byte UNCHANGED on every
// path (AC5), and that provider flags live only in the launcher seam (L8).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const SCRIPT = path.join(REPO, "scripts", "launch-editor.sh");

// spawnSync resolves the command via the CHILD's env.PATH, and we REPLACE the
// child env to fully control code-server resolution. So resolve an absolute
// `sh` once (from the ambient PATH) and always invoke the launcher through it.
function resolveSh(): string {
  for (const d of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!d) continue;
    const p = path.join(d, "sh");
    try {
      statSync(p);
      return p;
    } catch {
      /* keep looking */
    }
  }
  return "/bin/sh";
}
const SH = resolveSh();

// --- temp fixtures (always under the OS temp dir; never the repo tree) -------
const tmpRoots: string[] = [];
function mkTmp(prefix: string): string {
  const d = mkdtempSync(path.join(tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
process.on("exit", () => {
  for (const d of tmpRoots) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort teardown */
    }
  }
});

// A fixture "project" directory with a couple of files + a subdir.
function makeProjectDir(): string {
  const d = mkTmp("le-proj-");
  writeFileSync(path.join(d, "README.md"), "# fixture project\n");
  mkdirSync(path.join(d, "sub"));
  writeFileSync(path.join(d, "sub", "a.txt"), "alpha\n");
  return d;
}

// Byte-for-byte snapshot: sorted "relpath|type|size|mtimeMs" for every entry.
function snapshot(dir: string): string {
  const out: string[] = [];
  const walk = (rel: string) => {
    const abs = rel ? path.join(dir, rel) : dir;
    const st = statSync(abs);
    out.push(`${rel || "."}|${st.isDirectory() ? "d" : "f"}|${st.size}|${st.mtimeMs}`);
    if (st.isDirectory()) {
      for (const name of readdirSync(abs).sort()) {
        walk(rel ? path.join(rel, name) : name);
      }
    }
  };
  walk("");
  return out.sort().join("\n");
}

// A stub `code-server` on PATH: appends each argv item (one per line) to a log
// then exits 0. Lets the valid-path tests assert the exact isolated invocation
// without a real code-server or any bound port.
function makeStub(): { binDir: string; logPath: string } {
  const binDir = mkTmp("le-stub-");
  const logPath = path.join(binDir, "argv.log");
  const stub =
    "#!/bin/sh\n" +
    `for a in "$@"; do printf '%s\\n' "$a"; done > ${JSON.stringify(logPath)}\n` +
    "exit 0\n";
  const stubPath = path.join(binDir, "code-server");
  writeFileSync(stubPath, stub);
  chmodSync(stubPath, 0o755);
  return { binDir, logPath };
}

// A bin dir guaranteed to contain NO code-server (for the absent case).
function emptyBin(): string {
  return mkTmp("le-empty-");
}

// Run the launcher with a fully-controlled env (spawnSync REPLACES the env).
function runLauncher(opts: {
  projectPath?: string | null;
  editorPort?: string;
  pathDir: string;
}) {
  const env: Record<string, string> = { PATH: opts.pathDir };
  if (opts.projectPath !== null && opts.projectPath !== undefined) {
    env.PROJECT_PATH = opts.projectPath;
  }
  if (opts.editorPort !== undefined) env.EDITOR_PORT = opts.editorPort;
  return spawnSync(SH, [SCRIPT], { env, encoding: "utf8" });
}

function stubArgv(logPath: string): string[] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((l) => l.length > 0);
}

function readAllFiles(dir: string): string {
  let acc = "";
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const st = statSync(abs);
    acc += st.isDirectory() ? readAllFiles(abs) : readFileSync(abs, "utf8");
  }
  return acc;
}

// --- TEST-L1: PROJECT_PATH unset -> fail-fast, no launch, no mutation --------
test("TEST-L1: PROJECT_PATH unset -> fail-fast, no launch, no mutation", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: null, pathDir: binDir });

  assert.notEqual(r.status, 0, "unset PROJECT_PATH must exit non-zero");
  assert.match(r.stderr, /PROJECT_PATH/, "stderr must name PROJECT_PATH");
  assert.deepEqual(stubArgv(logPath), [], "code-server must NOT be launched");
  assert.equal(snapshot(proj), before, "target must be unchanged");
});

// --- TEST-L2: PROJECT_PATH empty -> fail-fast --------------------------------
test("TEST-L2: PROJECT_PATH empty -> fail-fast, no launch, no mutation", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: "", pathDir: binDir });

  assert.notEqual(r.status, 0, "empty PROJECT_PATH must exit non-zero");
  assert.match(r.stderr, /PROJECT_PATH/);
  assert.deepEqual(stubArgv(logPath), []);
  assert.equal(snapshot(proj), before);
});

// --- TEST-L3: PROJECT_PATH non-existent -> fail-fast, path NOT created -------
test("TEST-L3: PROJECT_PATH non-existent -> fail-fast, path not created", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const missing = path.join(proj, `does-not-exist-${Math.random().toString(36).slice(2)}`);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: missing, pathDir: binDir });

  assert.notEqual(r.status, 0, "non-existent PROJECT_PATH must exit non-zero");
  assert.match(r.stderr, /does not exist/i);
  assert.equal(existsSync(missing), false, "launcher must NOT create the target (no mkdir)");
  assert.deepEqual(stubArgv(logPath), [], "code-server must NOT be launched");
  assert.equal(snapshot(proj), before);
});

// --- TEST-L4: PROJECT_PATH is a file, not a directory -> fail-fast -----------
test("TEST-L4: PROJECT_PATH is a file, not a directory -> fail-fast", () => {
  const proj = makeProjectDir();
  const filePath = path.join(proj, "target-file.txt");
  writeFileSync(filePath, "do not touch\n");
  const beforeStat = statSync(filePath);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: filePath, pathDir: binDir });

  assert.notEqual(r.status, 0, "file PROJECT_PATH must exit non-zero");
  assert.match(r.stderr, /not a directory/i);
  const afterStat = statSync(filePath);
  assert.equal(afterStat.size, beforeStat.size, "file size must be unchanged");
  assert.equal(afterStat.mtimeMs, beforeStat.mtimeMs, "file mtime must be unchanged");
  assert.deepEqual(stubArgv(logPath), [], "code-server must NOT be launched");
});

// --- TEST-L5: valid dir + stub -> exact isolated argv, no mutation -----------
test("TEST-L5: valid dir -> single isolated code-server invocation, no mutation", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: proj, pathDir: binDir });

  assert.equal(r.status, 0, "valid dir should hand off (stub exits 0)");
  assert.deepEqual(
    stubArgv(logPath),
    [proj, "--bind-addr", "127.0.0.1:8080", "--auth", "none"],
    "exactly one isolated invocation with the PRD 5.7 flags",
  );
  assert.equal(snapshot(proj), before, "target must be byte-for-byte unchanged (AC5)");
});

// --- TEST-L6: valid dir + code-server absent -> clear error, no mutation -----
test("TEST-L6: valid dir + code-server absent -> clear error, no mutation", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);

  const r = runLauncher({ projectPath: proj, pathDir: emptyBin() });

  assert.notEqual(r.status, 0, "absent code-server must exit non-zero");
  assert.match(r.stderr, /code-server not found/i, "stderr must name the missing prerequisite");
  assert.equal(snapshot(proj), before, "target unchanged even on the failure path (AC5)");
});

// --- TEST-L7: EDITOR_PORT override -> bind-addr reflects the port ------------
test("TEST-L7: EDITOR_PORT override -> bind-addr reflects the port", () => {
  const proj = makeProjectDir();
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: proj, editorPort: "9443", pathDir: binDir });

  assert.equal(r.status, 0);
  assert.deepEqual(
    stubArgv(logPath),
    [proj, "--bind-addr", "127.0.0.1:9443", "--auth", "none"],
    "EDITOR_PORT flows into --bind-addr and stays behind the launcher seam",
  );
});

// --- TEST-L8: provider-argument isolation (static, no leakage) ---------------
test("TEST-L8: code-server flags live ONLY in scripts/launch-editor.sh (PRD 5.7)", () => {
  const launcher = readFileSync(SCRIPT, "utf8");
  // The launcher DOES own every provider flag.
  assert.match(launcher, /--bind-addr/, "launcher owns --bind-addr");
  assert.match(launcher, /--auth/, "launcher owns --auth");
  assert.match(launcher, /exec code-server/, "launcher owns the code-server invocation");

  const surfaces: Record<string, string> = {
    "src/": readAllFiles(path.join(REPO, "src")),
    ".harness/contract.yml": readFileSync(path.join(REPO, ".harness", "contract.yml"), "utf8"),
    harness: readFileSync(path.join(REPO, "harness"), "utf8"),
    "package.json": readFileSync(path.join(REPO, "package.json"), "utf8"),
  };
  for (const [label, content] of Object.entries(surfaces)) {
    assert.ok(!content.includes("--bind-addr"), `${label} must NOT contain --bind-addr (PRD 5.7)`);
    assert.ok(!content.includes("--auth"), `${label} must NOT contain --auth (PRD 5.7)`);
    assert.ok(
      !/code-server\s+["']?\$?\{?PROJECT_PATH/.test(content),
      `${label} must NOT contain the code-server invocation (PRD 5.7)`,
    );
  }
  // The edit verb wires only the provider-agnostic npm script.
  assert.match(
    surfaces[".harness/contract.yml"],
    /maps_to:\s*"npm run edit"/,
    "the edit verb maps only to the agnostic npm script",
  );
});
