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
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  lstatSync,
  readlinkSync,
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

// Structural no-mutation snapshot (AC5). For every entry in the tree it records
// the relative path, type (file/dir/symlink/other), permission bits (mode),
// size, and mtimeMs. Regular files additionally carry a SHA-256 content hash and
// symlinks their link target. It uses `lstatSync` (never following symlinks) and
// walks recursively, so — unlike a size+mtime-only snapshot — it detects
// permission changes, symlink-target changes, and same-size/same-mtime content
// replacement. Compared with `assert.deepEqual`, so any difference fails loudly.
type SnapEntry = {
  path: string;
  type: "file" | "dir" | "symlink" | "other";
  mode: number;
  size: number;
  mtimeMs: number;
  hash?: string;
  target?: string;
};

function snapshot(dir: string): SnapEntry[] {
  const out: SnapEntry[] = [];
  const walk = (rel: string) => {
    const abs = rel ? path.join(dir, rel) : dir;
    const st = lstatSync(abs);
    const type: SnapEntry["type"] = st.isSymbolicLink()
      ? "symlink"
      : st.isDirectory()
        ? "dir"
        : st.isFile()
          ? "file"
          : "other";
    const entry: SnapEntry = {
      path: rel || ".",
      type,
      mode: st.mode & 0o777,
      size: st.size,
      mtimeMs: st.mtimeMs,
    };
    if (type === "file") {
      entry.hash = createHash("sha256").update(readFileSync(abs)).digest("hex");
    } else if (type === "symlink") {
      entry.target = readlinkSync(abs);
    }
    out.push(entry);
    // Descend into real directories only (never through a symlinked dir).
    if (type === "dir") {
      for (const name of readdirSync(abs).sort()) {
        walk(rel ? path.join(rel, name) : name);
      }
    }
  };
  walk("");
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
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

// A stub `code-server` that SIMULATES a user edit: it logs its argv (as
// makeStub does) and then writes `newContent` to `$PROJECT_PATH/README.md`
// (the first positional it receives) before exiting 0. It is a stand-in for a
// real editor save so the launcher/filesystem MECHANICS can be asserted with
// code-server absent (ADR-0006 D7). It is NOT the real editor; the real
// user-edit round trip is proven by the manual demo (TEST-M1/M2), not here.
function makeEditingStub(newContent: string): { binDir: string; logPath: string } {
  const binDir = mkTmp("le-editstub-");
  const logPath = path.join(binDir, "argv.log");
  // Single-quote the content for POSIX sh (the stub's PATH holds only itself, so
  // it must rely on the `printf` builtin — no external `cat`). Real newlines are
  // literal inside single quotes; embedded single quotes are escaped.
  const sq = "'" + newContent.replace(/'/g, "'\\''") + "'";
  const stub =
    "#!/bin/sh\n" +
    `for a in "$@"; do printf '%s\\n' "$a"; done > ${JSON.stringify(logPath)}\n` +
    // "$1" is the PROJECT_PATH positional the launcher passes first (TEST-L5).
    `printf '%s' ${sq} > "$1/README.md"\n` +
    "exit 0\n";
  const stubPath = path.join(binDir, "code-server");
  writeFileSync(stubPath, stub);
  chmodSync(stubPath, 0o755);
  return { binDir, logPath };
}

// Diff two snapshots by relative path. Returns the set of changed paths, and the
// added/removed path sets, so tests can assert "exactly one entry changed, none
// added/removed" (path-identity + no-copy + non-mutation).
function diffSnapshots(
  before: SnapEntry[],
  after: SnapEntry[],
): { changed: string[]; added: string[]; removed: string[] } {
  const b = new Map(before.map((e) => [e.path, e]));
  const a = new Map(after.map((e) => [e.path, e]));
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [p, ae] of a) {
    const be = b.get(p);
    if (!be) {
      added.push(p);
    } else if (JSON.stringify(be) !== JSON.stringify(ae)) {
      changed.push(p);
    }
  }
  for (const p of b.keys()) {
    if (!a.has(p)) removed.push(p);
  }
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() };
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
  assert.deepEqual(snapshot(proj), before, "target must be unchanged");
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
  assert.deepEqual(snapshot(proj), before);
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
  assert.deepEqual(snapshot(proj), before);
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
  assert.deepEqual(snapshot(proj), before, "target must be byte-for-byte unchanged (AC5)");
});

// --- TEST-L6: valid dir + code-server absent -> clear error, no mutation -----
test("TEST-L6: valid dir + code-server absent -> clear error, no mutation", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);

  const r = runLauncher({ projectPath: proj, pathDir: emptyBin() });

  assert.notEqual(r.status, 0, "absent code-server must exit non-zero");
  assert.match(r.stderr, /code-server not found/i, "stderr must name the missing prerequisite");
  assert.deepEqual(snapshot(proj), before, "target unchanged even on the failure path (AC5)");
});

// --- TEST-L7: EDITOR_PORT override -> bind-addr reflects the port ------------
test("TEST-L7: EDITOR_PORT override -> bind-addr reflects the port", () => {
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: proj, editorPort: "9443", pathDir: binDir });

  assert.equal(r.status, 0);
  assert.deepEqual(
    stubArgv(logPath),
    [proj, "--bind-addr", "127.0.0.1:9443", "--auth", "none"],
    "EDITOR_PORT flows into --bind-addr and stays behind the launcher seam",
  );
  assert.deepEqual(snapshot(proj), before, "target must be byte-for-byte unchanged (AC5)");
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

// ===========================================================================
// Issue #8 (verify direct filesystem editing) — TEST-L9..L12.
//
// These extend the code-server-free snapshot suite to prove, at the LAUNCHER /
// FILESYSTEM-MECHANICS level, the model behind issue #8's acceptance criteria:
//   AC1  an edit lands on the ORIGINAL path, in place (not a copy/stage);
//   AC2  stopping the editor leaves project files unchanged (bar the edit);
//   AC4  the launcher mutates nothing else and writes no editor state into
//        PROJECT_PATH (PRD 28.6, ADR-0006 D5).
//
// SCOPE CAVEAT (ADR-0006 D7): a STUB code-server stands in for the real binary,
// so these cases prove launcher/filesystem mechanics only — NOT the real
// editor's behaviour. The real user-edit round trip (AC1/AC2/AC3) is proven by
// the MANUAL demo (TEST-M1..M4, project/issues/8/implementation/README.md),
// pending a code-server-provisioned host.
// ===========================================================================

// --- TEST-L9: launcher passes the EXACT PROJECT_PATH positional (no copy) ----
test("TEST-L9: launcher opens the exact PROJECT_PATH in place (no copy/stage)", () => {
  // Stub stands in for the real editor (ADR-0006 D7): asserts the launch SEAM
  // hands off the real path, not a copy — the mechanical basis for AC1.
  // Build the fixture inside a DEDICATED enclosing dir so the parent listing is
  // controlled (the shared OS temp dir would otherwise churn across tests).
  const enclosing = mkTmp("le-encl-");
  const proj = path.join(enclosing, "project");
  mkdirSync(proj);
  writeFileSync(path.join(proj, "README.md"), "# fixture project\n");
  mkdirSync(path.join(proj, "sub"));
  writeFileSync(path.join(proj, "sub", "a.txt"), "alpha\n");
  const parent = enclosing;
  const beforeProj = snapshot(proj);
  const beforeParent = readdirSync(parent).sort();
  const { binDir, logPath } = makeStub();

  const r = runLauncher({ projectPath: proj, pathDir: binDir });

  assert.equal(r.status, 0, "valid dir should hand off (stub exits 0)");
  const argv = stubArgv(logPath);
  assert.equal(argv[0], proj, "code-server receives the EXACT PROJECT_PATH (no copy/temp/stage)");
  assert.deepEqual(
    readdirSync(parent).sort(),
    beforeParent,
    "no sibling/staging/copy dir appeared alongside the fixture",
  );
  assert.deepEqual(snapshot(proj), beforeProj, "launcher touched nothing in the target (AC1/AC4)");
});

// --- TEST-L10: simulated edit lands on the same path; nothing else touched ---
test("TEST-L10: simulated in-place edit lands on README.md; nothing else changes", () => {
  // Stub simulates a user save to the opened folder (ADR-0006 D7 scope caveat):
  // the REAL editor round trip is proven manually (TEST-M1).
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const edited = "# fixture project\n\nEDITED THROUGH THE EDITOR\n";
  const { binDir } = makeEditingStub(edited);

  const r = runLauncher({ projectPath: proj, pathDir: binDir });

  assert.equal(r.status, 0, "stub edits then hands off (exits 0)");
  const after = snapshot(proj);
  const { changed, added, removed } = diffSnapshots(before, after);

  assert.deepEqual(changed, ["README.md"], "exactly one entry changed, and it is README.md (path-identity)");
  assert.deepEqual(added, [], "no new file/dir created (no copy/shadow)");
  assert.deepEqual(removed, [], "no file/dir removed");

  const afterReadme = after.find((e) => e.path === "README.md");
  const beforeReadme = before.find((e) => e.path === "README.md");
  assert.ok(afterReadme && beforeReadme);
  assert.notEqual(afterReadme.hash, beforeReadme.hash, "README.md content (hash) actually changed");
  assert.equal(
    readFileSync(path.join(proj, "README.md"), "utf8"),
    edited,
    "the identical change appears at the ORIGINAL path (AC1)",
  );
});

// --- TEST-L11: post-stop integrity — only the intended edit persists ---------
test("TEST-L11: after the editor exits, only the intended edit persists (AC2)", () => {
  // Edit-then-stop via the exec handoff (ADR-0006 D6). Stub scope caveat as
  // above: the real process-stop integrity is proven manually (TEST-M2).
  const proj = makeProjectDir();
  const before = snapshot(proj);
  const edited = "# fixture project\n\nSAVED THEN EDITOR STOPPED\n";
  const { binDir } = makeEditingStub(edited);

  const r = runLauncher({ projectPath: proj, pathDir: binDir });

  assert.equal(r.status, 0, "exit code propagates through the exec handoff (ADR-0006 D6)");
  const afterStop = snapshot(proj);
  const { changed, added, removed } = diffSnapshots(before, afterStop);

  assert.deepEqual(changed, ["README.md"], "only the intended edit persists after stop");
  assert.deepEqual(added, [], "process stop added nothing");
  assert.deepEqual(removed, [], "process stop removed/reset nothing");

  // Every non-edited entry is byte-for-byte its pre-edit self after the editor stops.
  for (const be of before) {
    if (be.path === "README.md") continue;
    const ae = afterStop.find((e) => e.path === be.path);
    assert.deepEqual(ae, be, `entry '${be.path}' is unchanged after the editor stops`);
  }
});

// --- TEST-L12: launcher writes NO editor workspace-state into PROJECT_PATH ---
test("TEST-L12: launcher sets no flag placing editor state inside PROJECT_PATH", () => {
  // Static read of the launcher (like TEST-L8); no launch, code-server absent.
  // The empirical DEFAULT workspace-state location (e.g. ~/.local/share/
  // code-server, OUTSIDE PROJECT_PATH) is confirmed by the manual demo (TEST-M3);
  // this test locks the launcher's own contribution: it introduces no such flag.
  const launcher = readFileSync(SCRIPT, "utf8");

  assert.ok(
    !launcher.includes("--user-data-dir"),
    "launcher must not set --user-data-dir (would place editor state under a chosen dir)",
  );
  assert.ok(
    !launcher.includes("--extensions-dir"),
    "launcher must not set --extensions-dir",
  );
  assert.ok(
    !/--config[\s"'=]/.test(launcher),
    "launcher must not pin a --config path rooted under PROJECT_PATH",
  );
  assert.ok(
    !/XDG_(DATA|CONFIG|STATE|CACHE)_HOME[^\n]*PROJECT_PATH/.test(launcher),
    "launcher must not root any XDG_*_HOME under PROJECT_PATH",
  );
});
