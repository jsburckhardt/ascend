#!/bin/sh
# apply-marker.sh - the idempotent HARNESS agent-surface marker-update operation
# (CORE-COMPONENT-0003 R10), extracted as a small, committed, dependency-light
# POSIX-awk helper so tests/harness/run.sh (TEST-13) can prove idempotency by
# actually re-running the real update.
#
# Usage: apply-marker.sh <target-file> <block-file>
#   <block-file> contains the FULL harness block INCLUDING the
#   `<!-- HARNESS:BEGIN -->` and `<!-- HARNESS:END -->` marker lines.
#
# Behaviour (writes the rendered file to stdout; never mutates the target):
#   - If <target-file> already contains a `<!-- HARNESS:BEGIN -->` marker, the
#     content from that marker through the first following
#     `<!-- HARNESS:END -->` (inclusive) is REPLACED by <block-file> verbatim.
#     All content outside the markers is preserved byte-for-byte.
#   - If no marker is present, the block is appended after a blank-line separator.
#   - Re-running against the produced output yields a byte-identical result and
#     never duplicates the block (exactly one BEGIN/END pair).
#
# POSIX only: a single awk pass, no GNU extensions.

set -u

if [ "$#" -ne 2 ]; then
	printf 'usage: %s <target-file> <block-file>\n' "$0" >&2
	exit 2
fi

target="$1"
block="$2"

[ -f "$target" ] || { printf 'apply-marker: no such target file: %s\n' "$target" >&2; exit 2; }
[ -f "$block" ]  || { printf 'apply-marker: no such block file: %s\n' "$block" >&2; exit 2; }

awk -v blockfile="$block" '
	BEGIN {
		blk = ""
		while ((getline line < blockfile) > 0) blk = blk line "\n"
		close(blockfile)
	}
	/<!-- HARNESS:BEGIN -->/ {
		if (!injected) { printf "%s", blk; injected = 1 }
		skipping = 1
		next
	}
	skipping && /<!-- HARNESS:END -->/ { skipping = 0; next }
	skipping { next }
	{ print }
	END {
		if (!injected) printf "\n%s", blk
	}
' "$target"
