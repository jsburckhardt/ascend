#!/usr/bin/env sh
# scripts/launch-editor.sh - the single, dependency-light editor-provider launch
# seam (ADR-0006 D1/D3). It launches ONE `code-server` process against a
# configured local directory and is the ONLY file that may contain code-server
# specifics (the `code-server` invocation, `--bind-addr`, `--auth`); PRD 5.7.
#
# Configuration (provider-agnostic inputs only; ADR-0006 D3/D4):
#   PROJECT_PATH  (required)  the directory to open in the editor.
#   EDITOR_PORT   (optional)  loopback port to bind; defaults to 8080.
#
# Read-only / fail-fast safety (ADR-0006 D5, PRD 28.6, issue AC5): the launcher
# validates PROJECT_PATH with NON-MUTATING checks only and NEVER creates,
# deletes, moves, renames, resets, or cleans the target on any code path. On an
# unusable target it prints a clear message to stderr and exits non-zero BEFORE
# any attempt to launch code-server.
#
# Handoff (ADR-0006 D6): on success it replaces itself via `exec`, so code-server
# becomes the process and its exit code propagates. No supervision/restart.
#
# Introspection: the harness `edit` verb (mode: exec) owns `--print`/`--json`
# and never execs this script for those forms, so this launcher needs no
# introspection flag of its own (it is purely the exec target).

set -eu

# --- Configuration (defaulted so `set -u` never trips on an unset var) --------
PROJECT_PATH="${PROJECT_PATH:-}"
EDITOR_PORT="${EDITOR_PORT:-8080}"

# --- Read-only, fail-fast validation of PROJECT_PATH (ADR-0006 D5 / AC5) ------
# Order matters (TEST-L1..L4): unset/empty -> missing -> not-a-directory. Every
# check is non-mutating; the launcher NEVER repairs or creates the target.
if [ -z "$PROJECT_PATH" ]; then
	printf 'launch-editor: PROJECT_PATH is not set or is empty.\n' >&2
	printf 'launch-editor: set it to the directory to open, e.g. PROJECT_PATH=/path/to/project ./harness edit\n' >&2
	exit 1
fi

if [ ! -e "$PROJECT_PATH" ]; then
	printf 'launch-editor: PROJECT_PATH does not exist: %s\n' "$PROJECT_PATH" >&2
	printf 'launch-editor: this launcher never creates the target; point PROJECT_PATH at an existing directory.\n' >&2
	exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
	printf 'launch-editor: PROJECT_PATH is not a directory: %s\n' "$PROJECT_PATH" >&2
	exit 1
fi

# --- Resolve code-server (documented prerequisite; ADR-0006 D6/D7) -----------
# Checked AFTER path validation so an invalid path fails first (TEST-L6 vs L1-L4).
if ! command -v code-server >/dev/null 2>&1; then
	printf 'launch-editor: code-server not found on PATH.\n' >&2
	printf 'launch-editor: install it first (see README "Launch the editor (code-server)"); this launcher does not install it.\n' >&2
	exit 127
fi

# --- Isolated, single-instance invocation + handoff (ADR-0006 D3/D6) ---------
# ALL code-server flags live here and nowhere else (PRD 5.7). `exec` hands off so
# code-server's exit code propagates.
exec code-server "$PROJECT_PATH" --bind-addr "127.0.0.1:${EDITOR_PORT}" --auth none
