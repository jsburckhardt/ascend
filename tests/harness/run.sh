#!/bin/sh
# tests/harness/run.sh - durable, dependency-light regression suite for ./harness
# (CORE-COMPONENT-0003 R16). Exercises TEST-01..TEST-24 from
# project/issues/4/plan/03-test-plan.md, TEST-30..TEST-31 from
# project/issues/5/plan/03-test-plan.md (dev + validation commands), plus
# TEST-32 from project/issues/6/plan/03-test-plan.md (app shell + /health wired
# via boot/test), plus PR #6 review additions TEST-32c (F-02 truthful friction)
# and TEST-33 (F-01 doctor >=22.6.0 minor floor). Runs non-interactively, prints
# a summary
# and an overall Verdict line, exits non-zero on any failure, and leaves the
# working tree clean (all mutations go to a scratch dir; permission changes are
# reverted; tracked files are never written because every verb run is isolated
# via HARNESS_EVIDENCE_DIR / HARNESS_FRICTION / HARNESS_CONTRACT / HARNESS_ROOT).
#
# It adds NO new runtime dependency: POSIX shell + the repo's own node (used only
# to strictly validate JSON; node is already the project runtime). It is NOT the
# project's `test` command (that verb stays honest `unknown`); it is a separate
# self-test for the harness itself.

set -u

SUITE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO=$(CDPATH= cd -- "$SUITE_DIR/../.." && pwd)
H="$REPO/harness"
SEED_FRICTION="$REPO/.harness/friction.jsonl"
CONTRACT="$REPO/.harness/contract.yml"
NODE=$(command -v node 2>/dev/null || true)

# POSIX-portable scratch dir (no mktemp): a PID-based directory under TMPDIR,
# created private with umask, trap-cleaned. All mutation lands here so the tracked
# tree is never written.
WORK="${TMPDIR:-/tmp}/harness-suite.$$"
( umask 077 && mkdir "$WORK" ) || { printf 'FATAL: cannot create scratch dir %s\n' "$WORK" >&2; exit 2; }
cleanup() {
	chmod -R u+rwx "$WORK" 2>/dev/null || true
	rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

PASS=0; FAIL=0; SKIP=0
ok()   { PASS=$((PASS + 1)); printf 'PASS  %s\n' "$1"; }
no()   { FAIL=$((FAIL + 1)); printf 'FAIL  %s\n' "$1"; }
skip() { SKIP=$((SKIP + 1)); printf 'SKIP  %s\n' "$1"; }
# expect_eq <desc> <expected> <actual>
expect_eq() { if [ "$2" = "$3" ]; then ok "$1"; else no "$1 (expected '$2', got '$3')"; fi; }

IS_ROOT=0; [ "$(id -u 2>/dev/null)" = "0" ] && IS_ROOT=1

# --- JSON helpers (node = repo runtime, not a new dependency) ---------------
json_valid() { # stdin -> exit 0 if valid JSON
	[ -n "$NODE" ] || return 2
	"$NODE" -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{JSON.parse(d);process.exit(0)}catch(e){process.exit(1)}})'
}
jget() { # jget <dotpath> ; stdin JSON -> prints value ('__ERR__' on failure)
	"$NODE" -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{let o=JSON.parse(d);for(const p of process.argv[1].split("."))o=o[p];if(Array.isArray(o))o=o.map(x=>typeof x==="object"?x.name+"="+x.verdict:x).join(" ");process.stdout.write(o===undefined?"__UNDEF__":String(o))}catch(e){process.stdout.write("__ERR__")}})' "$1"
}

# --- contract patch helpers (POSIX awk/sed; no python) ----------------------
set_maps() { # set_maps <src> <dst> <verb> <literal-value>
	awk -v verb="$3" -v val="$4" '
		/^verbs:[ \t]*$/ { inv = 1; print; next }
		/^[^ ]/ { if ($0 !~ /^verbs:/) inv = 0 }
		{
			if (inv && $0 ~ /^  [^ ].*:[ \t]*$/ && $0 !~ /^    /) {
				h = $0; sub(/^  /, "", h); sub(/:[ \t]*$/, "", h); gsub(/"/, "", h); cur = h
			}
			if (inv && cur == verb && $0 ~ /^    maps_to:/) { print "    maps_to: " val; next }
			print
		}
	' "$1" > "$2"
}
set_aggregate() { # set_aggregate <src> <dst> <comma-list>
	sed 's/^    aggregate: .*/    aggregate: ['"$3"']/' "$1" > "$2"
}

# fresh isolated friction file
new_friction() { f="$WORK/fr.$$.$(awk 'BEGIN{srand();printf "%d",int(rand()*1e6)}')"; cp "$SEED_FRICTION" "$f"; printf '%s' "$f"; }
new_evdir()   { d="$WORK/ev.$$.$(awk 'BEGIN{srand();printf "%d",int(rand()*1e6)}')"; mkdir -p "$d"; printf '%s' "$d"; }

# healthy fake root (real node is major 22): node_modules present + .nvmrc=22
HEALTHY_ROOT="$WORK/healthy-root"; mkdir -p "$HEALTHY_ROOT/node_modules"; printf '22\n' > "$HEALTHY_ROOT/.nvmrc"
# degraded fake root: .nvmrc=22 but NO node_modules
DEGRADED_ROOT="$WORK/degraded-root"; mkdir -p "$DEGRADED_ROOT"; printf '22\n' > "$DEGRADED_ROOT/.nvmrc"

printf '=== harness regression suite (tests/harness/run.sh) ===\n'
[ -n "$NODE" ] || printf 'NOTE: node not found; JSON-validity assertions will be skipped.\n'

# preflight: is the wrapped typecheck runnable? (drives the real-verify tests)
TC_OK=0
if ( cd "$REPO" && npm run typecheck ) >/dev/null 2>&1; then TC_OK=1; fi

# preflight: does `npm test` run to green? Gates the #6 wired-`test` assertions
# (TEST-05 / TEST-32). `npm test` uses the repo's node runtime (built-in
# node:test) with no third-party install; guarded so the suite stays honest when
# node is absent.
TEST_OK=0
if [ -n "$NODE" ] && ( cd "$REPO" && npm test ) >/dev/null 2>&1; then TEST_OK=1; fi

# ===========================================================================
# TEST-01: contract schema
# ===========================================================================
c="$CONTRACT"
t01=1
for k in "^version:" "^entrypoint:" "^verbs:" "^evidence:" "^friction:"; do
	grep -q "$k" "$c" || t01=0
done
for v in help orient doctor lint test build boot dev edit verify status clean '"friction add"' '"friction list"'; do
	grep -Eq "^  $v:" "$c" || t01=0
done
grep -q '    maps_to: "npm run typecheck"' "$c" || t01=0
[ "$(grep -c '    maps_to: "npm run typecheck"' "$c")" = "1" ] || t01=0
# dev verb: interactive/handoff (R17) -> maps_to "npm run dev", mode exec.
grep -q '    maps_to: "npm run dev"' "$c" || t01=0
[ "$(grep -c '    maps_to: "npm run dev"' "$c")" = "1" ] || t01=0
dev_mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="dev"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$c")
[ "$dev_mode" = "exec" ] || t01=0
# lint/build remain honestly unmapped (null); #6 wires test + boot (below).
for v in lint build; do
	# the maps_to line following the verb header must be null
	got=$(awk -v verb="$v" '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur==verb&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);print v;exit}' "$c")
	[ "$got" = "null" ] || t01=0
done
# #6 / ADR-0005: test -> "npm test" (capability verb) and boot -> "npm run start"
# with mode: exec (interactive handoff). Assert the wired values (data-driven R8).
test_maps=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="test"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$c")
boot_maps=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="boot"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$c")
boot_mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="boot"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$c")
[ "$test_maps" = "npm test" ] || t01=0
[ "$boot_maps" = "npm run start" ] || t01=0
[ "$boot_mode" = "exec" ] || t01=0
# #7 / ADR-0006: edit -> "npm run edit" with mode: exec (code-server launch
# handoff). The maps_to stays PROVIDER-AGNOSTIC (no code-server flag here, 5.7).
edit_maps=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="edit"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$c")
edit_mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="edit"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$c")
[ "$edit_maps" = "npm run edit" ] || t01=0
[ "$edit_mode" = "exec" ] || t01=0
# 5.7 isolation: NO code-server flag may leak into the contract.
grep -q -- '--bind-addr' "$c" && t01=0
grep -q -- '--auth' "$c" && t01=0
grep -q '    aggregate: \[lint, test, build, doctor\]' "$c" || t01=0
grep -Eq '^  clean:' "$c" && awk '/^  clean:/{f=1} f&&/^    maps_to:/{print;exit}' "$c" | grep -q 'maps_to:' || t01=0
grep -q '  dir: ".harness/evidence"' "$c" || t01=0
grep -q '  path: ".harness/friction.jsonl"' "$c" || t01=0
grep -q 'What did the agent have to infer that the harness should have proved?' "$c" || t01=0
[ "$t01" = "1" ] && ok "TEST-01 contract schema conforms" || no "TEST-01 contract schema conforms"

# ===========================================================================
# TEST-02: help + orient human/JSON exit 0
# ===========================================================================
hv=$("$H" help); code=$?
verbs_ok=1
for v in help orient doctor lint test build boot dev edit verify status clean "friction add" "friction list"; do
	printf '%s' "$hv" | grep -q "$v" || verbs_ok=0
done
[ "$code" = "0" ] && [ "$verbs_ok" = "1" ] && ok "TEST-02 help lists 14 verbs, exit 0" || no "TEST-02 help lists 14 verbs, exit 0"
"$H" orient >/dev/null 2>&1; expect_eq "TEST-02 orient human exit 0" 0 "$?"
if [ -n "$NODE" ]; then
	oj=$("$H" orient --json); code=$?
	printf '%s' "$oj" | json_valid && jv=1 || jv=0
	hasK=1; for k in harness_version verb verdict timestamp; do printf '%s' "$oj" | grep -q "\"$k\"" || hasK=0; done
	[ "$code" = "0" ] && [ "$jv" = "1" ] && [ "$hasK" = "1" ] && ok "TEST-02 orient --json valid + required keys" || no "TEST-02 orient --json valid + required keys"
else skip "TEST-02 orient --json (node absent)"; fi

# ===========================================================================
# TEST-03: doctor verdict (healthy pass; missing node_modules degraded+friction)
# ===========================================================================
fr=$(new_friction); ev=$(new_evdir)
dv=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json | jget verdict)
expect_eq "TEST-03 doctor healthy -> pass" "pass" "$dv"
fr=$(new_friction)
dv=$(HARNESS_ROOT="$DEGRADED_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json | jget verdict)
HARNESS_ROOT="$DEGRADED_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor >/dev/null 2>&1; dcode=$?
fcnt=$(grep -c '"verb": "doctor"' "$fr")
{ [ "$dv" = "degraded" ] && [ "$dcode" = "0" ] && [ "$fcnt" -ge 1 ]; } && ok "TEST-03 doctor missing node_modules -> degraded+friction, exit 0" || no "TEST-03 doctor missing node_modules -> degraded+friction (got $dv exit $dcode friction $fcnt)"

# ===========================================================================
# TEST-04: verify wraps typecheck, writes evidence, degraded, exit 0
# ===========================================================================
if [ "$TC_OK" = "1" ] && [ -n "$NODE" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	before=$(ls -1 "$ev" | wc -l)
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json)
	verdict=$(printf '%s' "$vv" | jget verdict)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; vcode=$?
	after=$(ls -1 "$ev"/verify-*.json 2>/dev/null | wc -l)
	{ [ "$verdict" = "degraded" ] && [ "$vcode" = "0" ] && [ "$after" -ge 1 ]; } && ok "TEST-04 verify degraded + evidence + exit 0" || no "TEST-04 verify degraded + evidence (got $verdict exit $vcode files $after)"
else skip "TEST-04 verify wraps typecheck (npm typecheck unavailable or node absent)"; fi

# ===========================================================================
# TEST-05: verify --json aggregate schema incl doctor
# ===========================================================================
if [ -n "$NODE" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json)
	printf '%s' "$vv" | json_valid && jv=1 || jv=0
	names=$(printf '%s' "$vv" | jget checks)
	evp=$(printf '%s' "$vv" | jget evidence)
	hasall=1
	# #6 wired `test`: it now aggregates as `pass` when the npm test preflight is
	# green; otherwise just require the member key is present.
	if [ "$TEST_OK" = "1" ]; then test_want="test=pass"; else test_want="test="; fi
	for want in "typecheck=" "lint=unknown" "$test_want" "build=unknown" "doctor="; do
		printf '%s' "$names" | grep -q "$want" || hasall=0
	done
	{ [ "$jv" = "1" ] && [ "$hasall" = "1" ] && [ -f "$ev/$(basename "$evp")" ]; } && ok "TEST-05 verify --json schema incl doctor member + wired test + evidence exists" || no "TEST-05 verify --json schema (jv=$jv checks='$names')"
else skip "TEST-05 verify --json schema (node absent)"; fi

# ===========================================================================
# TEST-06: lint/build unknown + friction, no tsc alias (test/boot wired by #6)
# ===========================================================================
t06=1
for v in lint build; do
	fr=$(new_friction); ev=$(new_evdir)
	# strip the seed entry for this verb so we can prove friction is (re)recorded
	grep -v "\"verb\": \"$v\"" "$SEED_FRICTION" > "$fr"
	vd=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" "$v" --json | jget verdict)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" "$v" >/dev/null 2>&1; vc=$?
	fcnt=$(grep -c "\"verb\": \"$v\"" "$fr")
	{ [ "$vd" = "unknown" ] && [ "$vc" = "0" ] && [ "$fcnt" -ge 1 ]; } || t06=0
	# no evidence file should be created by these verbs
	[ "$(ls -1 "$ev" 2>/dev/null | wc -l)" = "0" ] || t06=0
done
[ "$t06" = "1" ] && ok "TEST-06 lint/build unknown+friction, no evidence" || no "TEST-06 lint/build unknown+friction"

# ===========================================================================
# TEST-07: clean degraded + non-destructive (node_modules preserved)
# ===========================================================================
fr=$(new_friction); ev=$(new_evdir)
: > "$ev/verify-stale.json"; : > "$ev/.gitkeep"
mkdir -p "$HEALTHY_ROOT/node_modules"
cd=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" clean --json | jget verdict)
HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" clean >/dev/null 2>&1; ccode=$?
{ [ "$cd" = "degraded" ] && [ "$ccode" = "0" ] && [ -d "$HEALTHY_ROOT/node_modules" ] && [ -f "$ev/.gitkeep" ]; } && ok "TEST-07 clean degraded, non-destructive (node_modules + .gitkeep preserved)" || no "TEST-07 clean degraded/non-destructive (got $cd exit $ccode)"

# ===========================================================================
# TEST-08: friction add/list round-trip + schema
# ===========================================================================
fr=$(new_friction); before=$(grep -c . "$fr")
HARNESS_FRICTION="$fr" "$H" friction add --verb rttest --inference "inf x" --proof-gap "gap y" --suggested-closure "close z" >/dev/null 2>&1; ac=$?
after=$(grep -c . "$fr")
line=$(grep '"verb": "rttest"' "$fr" | head -1)
schema_ok=1
if [ -n "$NODE" ]; then
	printf '%s' "$line" | json_valid || schema_ok=0
	for k in ts verb key_question inference proof_gap suggested_closure; do printf '%s' "$line" | grep -q "\"$k\"" || schema_ok=0; done
	printf '%s' "$line" | grep -q 'What did the agent have to infer that the harness should have proved?' || schema_ok=0
fi
listed=$(HARNESS_FRICTION="$fr" "$H" friction list | grep -c '"verb": "rttest"')
{ [ "$ac" = "0" ] && [ "$after" = "$((before + 1))" ] && [ "$schema_ok" = "1" ] && [ "$listed" -ge 1 ]; } && ok "TEST-08 friction add/list round-trip + schema" || no "TEST-08 friction add/list round-trip (add exit $ac, +$((after-before)) line, schema $schema_ok)"

# ===========================================================================
# TEST-09: seed friction covers every gap, verbatim KEY_QUESTION + closure
# ===========================================================================
t09=1
for v in lint test build boot clean verify; do grep -q "\"verb\": \"$v\"" "$SEED_FRICTION" || t09=0; done
# every seed line: verbatim KQ + non-empty suggested_closure
while IFS= read -r ln; do
	[ -n "$ln" ] || continue
	printf '%s' "$ln" | grep -q 'What did the agent have to infer that the harness should have proved?' || t09=0
	if [ -n "$NODE" ]; then
		sc=$(printf '%s' "$ln" | jget suggested_closure)
		[ -n "$sc" ] && [ "$sc" != "__ERR__" ] && [ "$sc" != "__UNDEF__" ] || t09=0
	fi
done < "$SEED_FRICTION"
[ "$t09" = "1" ] && ok "TEST-09 seed friction covers gaps + verbatim KQ + closures" || no "TEST-09 seed friction coverage"

# ===========================================================================
# TEST-10: exit-code contract (only fail exits non-zero)
# ===========================================================================
# non-fail verbs exit 0
t10=1
for v in orient status "friction list"; do fr=$(new_friction); ev=$(new_evdir); HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" $v >/dev/null 2>&1 || t10=0; done
# forced failing typecheck via data (verify.maps_to: false) -> fail, exit 1
fr=$(new_friction); ev=$(new_evdir); ct="$WORK/c10.yml"
set_maps "$CONTRACT" "$ct" verify '"false"'
fv=$(HARNESS_CONTRACT="$ct" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget verdict)
HARNESS_CONTRACT="$ct" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; fcode=$?
{ [ "$t10" = "1" ] && [ "$fv" = "fail" ] && [ "$fcode" = "1" ]; } && ok "TEST-10 exit-code contract (non-fail=0; failing typecheck -> fail exit 1)" || no "TEST-10 exit-code contract (verify=$fv exit $fcode nonfail=$t10)"

# ===========================================================================
# TEST-11: README documents workflows and verdict semantics
# ===========================================================================
rd="$REPO/.harness/README.md"
t11=1
[ -f "$rd" ] || t11=0
for tok in "pass" "fail" "degraded" "unknown" "--json" "./harness" "What did the agent have to infer"; do grep -qF -- "$tok" "$rd" || t11=0; done
vc=1; for v in help orient doctor lint test build boot dev edit verify status clean friction; do grep -q "$v" "$rd" || vc=0; done
{ [ "$t11" = "1" ] && [ "$vc" = "1" ]; } && ok "TEST-11 README documents verbs, verdicts, exit-code, --json, KEY_QUESTION" || no "TEST-11 README completeness"

# ===========================================================================
# TEST-12: the harness block is scoped to the consuming agents only
# ===========================================================================
# The harness exposes deterministic tasks for the RPIV stages, so only the stage
# agents (rpiv-*) carry the usage rule. Assert each stage has exactly one block
# and every non-stage agent (incl. ship and AGENTS.md) none.
t12=1; cons=0; noncons_bad=0
is_consumer() {
	case "$1" in
		rpiv-research|rpiv-planner|rpiv-implementer|rpiv-verifier) return 0;;
		*) return 1;;
	esac
}
for f in "$REPO"/.github/agents/*.agent.md; do
	[ -e "$f" ] || continue
	base=$(basename "$f" .agent.md)
	b=$(grep -c '<!-- HARNESS:BEGIN -->' "$f"); e=$(grep -c '<!-- HARNESS:END -->' "$f")
	if is_consumer "$base"; then
		{ [ "$b" = "1" ] && [ "$e" = "1" ]; } && cons=$((cons + 1)) || { t12=0; printf '  (t12 consumer missing/dup block: %s)\n' "$base"; }
	else
		{ [ "$b" = "0" ] && [ "$e" = "0" ]; } || { t12=0; noncons_bad=$((noncons_bad + 1)); printf '  (t12 non-consumer has block: %s)\n' "$base"; }
	fi
done
{ [ "$(grep -c '<!-- HARNESS:BEGIN -->' "$REPO/AGENTS.md")" = "0" ]; } || { t12=0; printf '  (t12 AGENTS.md has block)\n'; }
{ [ "$t12" = "1" ] && [ "$cons" = "4" ]; } && ok "TEST-12 harness block on $cons rpiv stage agents only; none on ship, non-consumers, or AGENTS.md" || no "TEST-12 harness block scoping (t12=$t12 stages=$cons noncons_bad=$noncons_bad)"

# ===========================================================================
# TEST-13: agent-surface marker update is idempotent + behaviour-preserving (F-09)
# ===========================================================================
# Exercise the REAL marker-update operation (tests/harness/apply-marker.sh, the
# committed helper implementing CC-0003 R10) TWICE on an isolated copy of every
# consuming surface (output goes to scratch; tracked files are never mutated)
# and assert:
#   (a) the second run is byte-identical to the first (full-file cksum),
#   (b) re-applying on the committed surface is a no-op (cksum == original) with
#       exactly one BEGIN/END pair -> the block is never duplicated,
#   (c) content OUTSIDE the markers is preserved verbatim.
APPLY="$SUITE_DIR/apply-marker.sh"
outside_markers() { awk '/<!-- HARNESS:BEGIN -->/{p=1} !p{print} /<!-- HARNESS:END -->/{p=0}' "$1"; }
t13=1; t13n=0
[ -f "$APPLY" ] || { t13=0; printf '  (t13 helper missing: %s)\n' "$APPLY"; }
for base in rpiv-research rpiv-planner rpiv-implementer rpiv-verifier; do
	f="$REPO/.github/agents/$base.agent.md"
	[ -e "$f" ] || { t13=0; printf '  (t13 consumer missing: %s)\n' "$f"; continue; }
	t13n=$((t13n + 1))
	wdir="$WORK/t13.$t13n"; mkdir -p "$wdir"
	blk="$wdir/block.txt"
	# extract this surface's own harness block (BEGIN..END inclusive)
	awk '/<!-- HARNESS:BEGIN -->/{p=1} p{print} /<!-- HARNESS:END -->/{p=0}' "$f" > "$blk"
	[ -s "$blk" ] || { t13=0; printf '  (t13 no block: %s)\n' "$f"; continue; }
	r1="$wdir/r1"; r2="$wdir/r2"
	sh "$APPLY" "$f"  "$blk" > "$r1" 2>/dev/null || { t13=0; printf '  (t13 apply1 failed: %s)\n' "$f"; }
	sh "$APPLY" "$r1" "$blk" > "$r2" 2>/dev/null || { t13=0; printf '  (t13 apply2 failed: %s)\n' "$f"; }
	# (a) rerun byte-identical
	[ "$(cksum < "$r1")" = "$(cksum < "$r2")" ] || { t13=0; printf '  (t13 rerun not identical: %s)\n' "$f"; }
	# (b) no-op on committed state + exactly one block (no duplication)
	[ "$(cksum < "$f")" = "$(cksum < "$r1")" ] || { t13=0; printf '  (t13 not a no-op on committed state: %s)\n' "$f"; }
	{ [ "$(grep -c '<!-- HARNESS:BEGIN -->' "$r1")" = "1" ] && [ "$(grep -c '<!-- HARNESS:END -->' "$r1")" = "1" ]; } || { t13=0; printf '  (t13 duplicated block: %s)\n' "$f"; }
	# (c) content outside markers preserved
	outside_markers "$f" > "$wdir/o0"; outside_markers "$r1" > "$wdir/o1"
	diff "$wdir/o0" "$wdir/o1" >/dev/null 2>&1 || { t13=0; printf '  (t13 outside-markers changed: %s)\n' "$f"; }
done
{ [ "$t13" = "1" ] && [ "$t13n" -ge 4 ]; } && ok "TEST-13 marker update idempotent: $t13n stage surfaces byte-identical on rerun, no duplication, outside-markers preserved" || no "TEST-13 idempotency (t13=$t13 surfaces=$t13n)"

# ===========================================================================
# TEST-14: issue acceptance criteria end-to-end
# ===========================================================================
t14=1
[ -x "$H" ] || t14=0
grep -q '    maps_to: "npm run typecheck"' "$CONTRACT" || t14=0
if [ "$TC_OK" = "1" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1
	[ "$(ls -1 "$ev"/verify-*.json 2>/dev/null | wc -l)" -ge 1 ] || t14=0
fi
[ -f "$REPO/.harness/README.md" ] || t14=0
grep -q './harness' "$REPO/.github/agents/rpiv-verifier.agent.md" || t14=0
[ "$t14" = "1" ] && ok "TEST-14 acceptance criteria (exists/wraps/evidence/docs/entrypoint)" || no "TEST-14 acceptance criteria"

# ===========================================================================
# TEST-15: runs dependency-light under POSIX sh (dash)
# ===========================================================================
if command -v dash >/dev/null 2>&1; then
	dash "$H" help >/dev/null 2>&1; expect_eq "TEST-15 runs under dash, exit 0" 0 "$?"
else
	sh "$H" help >/dev/null 2>&1; expect_eq "TEST-15 runs under sh, exit 0" 0 "$?"
fi

# ===========================================================================
# TEST-16: verification config + VCS policy
# ===========================================================================
vf="$REPO/.github/soft-factory/verification.yml"
gi="$REPO/.gitignore"
t16=1
[ -f "$vf" ] && grep -q './harness verify' "$vf" || t16=0
grep -q '.harness/evidence/\*' "$gi" || t16=0
grep -q '!.harness/evidence/.gitkeep' "$gi" || t16=0
# tracked artifacts
( cd "$REPO" && git ls-files --error-unmatch .harness/contract.yml .harness/README.md .harness/friction.jsonl .harness/evidence/.gitkeep ) >/dev/null 2>&1 || t16=0
[ "$t16" = "1" ] && ok "TEST-16 verification.yml runs ./harness verify + VCS policy" || no "TEST-16 verification.yml / VCS policy"

# ===========================================================================
# TEST-17: pr-review-complement invocations succeed
# ===========================================================================
fr=$(new_friction); ev=$(new_evdir)
HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" orient >/dev/null 2>&1; oc=$?
if [ -n "$NODE" ]; then
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; vc=$?
	verdict=$(printf '%s' "$vv" | jget verdict)
	printf '%s' "$vv" | json_valid && jv=1 || jv=0
	{ [ "$oc" = "0" ] && [ "$vc" = "0" ] && [ "$jv" = "1" ] && [ "$verdict" != "fail" ]; } && ok "TEST-17 orient + verify --json exit 0, non-fail" || no "TEST-17 pr-review-complement (orient=$oc verify=$vc verdict=$verdict)"
else skip "TEST-17 (node absent)"; fi

# ===========================================================================
# TEST-18: contract-driven rewiring works by data alone (no code change)
# ===========================================================================
h1=$(cksum < "$H")
fr=$(new_friction); ev=$(new_evdir)
c1="$WORK/c18a.yml"; c2="$WORK/c18b.yml"; c3="$WORK/c18c.yml"; c4="$WORK/c18d.yml"
set_maps "$CONTRACT" "$c1" verify '"true"'
set_maps "$c1" "$c2" lint '"true"'
set_maps "$c2" "$c3" test '"true"'
set_maps "$c3" "$c4" build '"true"'
if [ -n "$NODE" ]; then
	pv=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$c4" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget verdict)
else pv="skip"; fi
# clean wrapping a mapped command
cc="$WORK/c18clean.yml"; set_maps "$CONTRACT" "$cc" clean '"true"'
clv=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$cc" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" clean --json | jget verdict)
h2=$(cksum < "$H")
if [ -n "$NODE" ]; then
	{ [ "$pv" = "pass" ] && [ "$clv" = "pass" ] && [ "$h1" = "$h2" ]; } && ok "TEST-18 data-only rewiring: verify->pass, clean wraps cmd, harness unchanged" || no "TEST-18 rewiring (verify=$pv clean=$clv unchanged=$([ "$h1" = "$h2" ] && echo yes || echo NO))"
else
	{ [ "$clv" = "pass" ] && [ "$h1" = "$h2" ]; } && ok "TEST-18 data-only clean rewiring, harness unchanged (verify pass needs node)" || no "TEST-18 rewiring (clean=$clv unchanged=$([ "$h1" = "$h2" ] && echo yes || echo NO))"
fi

# ===========================================================================
# TEST-19: verify aggregate verdict truth table
# ===========================================================================
tt_case() { # tt_case <desc> <root> <expected-verdict> <expected-exit> <contract>
	fr=$(new_friction); ev=$(new_evdir)
	gv=$(HARNESS_ROOT="$2" HARNESS_CONTRACT="$5" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget verdict)
	HARNESS_ROOT="$2" HARNESS_CONTRACT="$5" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; gc=$?
	{ [ "$gv" = "$3" ] && [ "$gc" = "$4" ]; } && ok "TEST-19 $1" || no "TEST-19 $1 (got $gv exit $gc, want $3/$4)"
}
if [ -n "$NODE" ]; then
	# 1. any fail -> fail (test=false; others pass)
	a="$WORK/c19a.yml"; set_maps "$CONTRACT" "$WORK/c19a0" verify '"true"'; set_maps "$WORK/c19a0" "$WORK/c19a1" lint '"true"'; set_maps "$WORK/c19a1" "$WORK/c19a2" build '"true"'; set_maps "$WORK/c19a2" "$a" test '"false"'
	tt_case "any-fail -> fail" "$HEALTHY_ROOT" "fail" "1" "$a"
	# 2. all pass -> pass
	b="$WORK/c19b.yml"; set_maps "$CONTRACT" "$WORK/c19b0" verify '"true"'; set_maps "$WORK/c19b0" "$WORK/c19b1" lint '"true"'; set_maps "$WORK/c19b1" "$WORK/c19b2" test '"true"'; set_maps "$WORK/c19b2" "$b" build '"true"'
	tt_case "all-pass -> pass" "$HEALTHY_ROOT" "pass" "0" "$b"
	# 3. all unknown -> unknown (verify null; lint/test/build null; doctor removed)
	#    #6 wired test -> npm test, so null it here too (fake root has no package).
	d="$WORK/c19c.yml"; set_maps "$CONTRACT" "$WORK/c19c0" verify 'null'; set_maps "$WORK/c19c0" "$WORK/c19c1" test 'null'; set_aggregate "$WORK/c19c1" "$d" "lint, test, build"
	tt_case "all-unknown -> unknown" "$HEALTHY_ROOT" "unknown" "0" "$d"
	# 4. mix pass+unknown -> degraded (verify true; lint/test/build null; doctor pass)
	#    null the #6-wired test so it stays unknown in this fake root (no package).
	e="$WORK/c19d.yml"; set_maps "$CONTRACT" "$WORK/c19d0" verify '"true"'; set_maps "$WORK/c19d0" "$e" test 'null'
	tt_case "mix pass+unknown -> degraded" "$HEALTHY_ROOT" "degraded" "0" "$e"
	# 5. doctor degraded + others pass -> degraded (never fail)
	g="$WORK/c19e.yml"; set_maps "$CONTRACT" "$WORK/c19e0" verify '"true"'; set_maps "$WORK/c19e0" "$WORK/c19e1" lint '"true"'; set_maps "$WORK/c19e1" "$WORK/c19e2" test '"true"'; set_maps "$WORK/c19e2" "$g" build '"true"'
	tt_case "doctor-degraded + others-pass -> degraded" "$DEGRADED_ROOT" "degraded" "0" "$g"
else skip "TEST-19 aggregate truth table (node absent)"; fi

# ===========================================================================
# TEST-20: every human verb emits exactly one Verdict: line
# ===========================================================================
t20=1
one_verdict() { n=$(printf '%s\n' "$1" | grep -c '^Verdict:'); [ "$n" = "1" ]; }
for v in help orient doctor lint test build verify status clean; do
	fr=$(new_friction); ev=$(new_evdir)
	out=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" "$v" 2>/dev/null)
	one_verdict "$out" || { t20=0; printf '  (verb %s Verdict count=%s)\n' "$v" "$(printf '%s\n' "$out" | grep -c '^Verdict:')"; }
done
# friction list
fr=$(new_friction); out=$(HARNESS_FRICTION="$fr" "$H" friction list 2>/dev/null); one_verdict "$out" || t20=0
[ "$(printf '%s\n' "$out" | grep '^Verdict:')" = "Verdict: pass" ] || t20=0
# friction add
fr=$(new_friction); out=$(HARNESS_FRICTION="$fr" "$H" friction add --verb z --inference i --proof-gap g --suggested-closure c 2>/dev/null); one_verdict "$out" || t20=0
# help/friction list say pass
hout=$("$H" help); [ "$(printf '%s\n' "$hout" | grep '^Verdict:')" = "Verdict: pass" ] || t20=0
# dev is an interactive/handoff verb (mode: exec, R17): it is EXCLUDED from the
# run-to-completion loop above (exec'ing it would hang). Prove invocability via
# the non-exec --print form instead: it resolves `npm run dev`, exits 0, does NOT
# hang, and emits NO `Verdict:` line (handoff verbs are verdict-exempt).
dpr=$("$H" dev --print 2>/dev/null); dprc=$?
[ "$dpr" = "npm run dev" ] || { t20=0; printf '  (dev --print = "%s" exit %s)\n' "$dpr" "$dprc"; }
[ "$dprc" = "0" ] || t20=0
[ "$(printf '%s\n' "$dpr" | grep -c '^Verdict:')" = "0" ] || t20=0
# boot is likewise an interactive/handoff verb (#6: mode: exec, execs
# `npm run start`). It is EXCLUDED from the run-to-completion loop above (exec'ing
# it would bind a port and hang). Prove invocability via --print: resolves
# `npm run start`, exits 0, no hang, and emits NO `Verdict:` line.
bpr=$("$H" boot --print 2>/dev/null); bprc=$?
[ "$bpr" = "npm run start" ] || { t20=0; printf '  (boot --print = "%s" exit %s)\n' "$bpr" "$bprc"; }
[ "$bprc" = "0" ] || t20=0
[ "$(printf '%s\n' "$bpr" | grep -c '^Verdict:')" = "0" ] || t20=0
# edit (#7: mode: exec, execs `npm run edit` -> the code-server launcher) is
# likewise an interactive/handoff verb. It is EXCLUDED from the run-to-completion
# loop above (exec'ing it would launch code-server / bind a port). Prove
# invocability via --print: resolves `npm run edit`, exits 0, no hang, and emits
# NO `Verdict:` line.
epr=$("$H" edit --print 2>/dev/null); eprc=$?
[ "$epr" = "npm run edit" ] || { t20=0; printf '  (edit --print = "%s" exit %s)\n' "$epr" "$eprc"; }
[ "$eprc" = "0" ] || t20=0
[ "$(printf '%s\n' "$epr" | grep -c '^Verdict:')" = "0" ] || t20=0
[ "$t20" = "1" ] && ok "TEST-20 exactly one Verdict: line per human verb (help/friction list = pass; dev+boot+edit handoffs excluded, --print no hang)" || no "TEST-20 one Verdict line per verb"

# ===========================================================================
# TEST-21: doctor validates full Node range (21/22/23 boundaries)
# ===========================================================================
# The major-22 case uses a minor >= 6 so it clears the >=22.6.0 floor introduced
# by PR #6 F-01 / ADR-0005 D2 (the minor-floor boundary itself is TEST-33).
if [ -n "$NODE" ]; then
	shimdir="$WORK/shim"; mkdir -p "$shimdir"
	t21=1
	for pair in "v21.0.0:degraded" "v22.6.0:pass" "v23.0.0:degraded"; do
		ver=${pair%%:*}; want=${pair##*:}
		printf '#!/bin/sh\necho %s\n' "$ver" > "$shimdir/node"; chmod +x "$shimdir/node"
		fr=$(new_friction); ev=$(new_evdir)
		got=$(PATH="$shimdir:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json | "$NODE" -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{process.stdout.write(JSON.parse(d).verdict)}catch(e){process.stdout.write("__ERR__")}})')
		PATH="$shimdir:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor >/dev/null 2>&1; gc=$?
		{ [ "$got" = "$want" ] && [ "$gc" = "0" ]; } || { t21=0; printf '  (node %s -> %s exit %s, want %s)\n' "$ver" "$got" "$gc" "$want"; }
	done
	[ "$t21" = "1" ] && ok "TEST-21 doctor node range: 21->degraded, 22.6->pass, 23->degraded (exit 0)" || no "TEST-21 doctor node range"
else skip "TEST-21 node range (node absent)"; fi

# ===========================================================================
# TEST-22: evidence collision-safe + atomic
# ===========================================================================
if [ -n "$NODE" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	# Isolate `test` to null so the 20x loop exercises evidence writing WITHOUT
	# re-running the #6-wired `npm test` 20 times; collision-safety/atomicity is
	# independent of which members the aggregate contains.
	c22="$WORK/c22.yml"; set_maps "$CONTRACT" "$c22" test 'null'
	i=0; while [ "$i" -lt 20 ]; do HARNESS_CONTRACT="$c22" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; i=$((i + 1)); done
	files=$(ls -1 "$ev"/verify-*.json 2>/dev/null | wc -l)
	bad=0; for f in "$ev"/verify-*.json; do "$NODE" -e 'JSON.parse(require("fs").readFileSync(process.argv[1]))' "$f" 2>/dev/null || bad=$((bad + 1)); done
	tmpleft=$(ls -a "$ev" 2>/dev/null | grep -c '^\.tmp' || true)
	{ [ "$files" -eq 20 ] && [ "$bad" -eq 0 ] && [ "$tmpleft" -eq 0 ]; } && ok "TEST-22 20 collision-safe evidence files, all valid, no temp leftovers" || no "TEST-22 collision/atomicity (files=$files bad=$bad temp=$tmpleft)"
else skip "TEST-22 collision-safety (node absent)"; fi

# ===========================================================================
# TEST-23: required-persistence failure -> fail
# ===========================================================================
if [ "$IS_ROOT" = "1" ]; then
	skip "TEST-23 persistence-failure (running as root; chmod perms do not restrict)"
else
	fr=$(new_friction); ev=$(new_evdir); chmod 000 "$ev"
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json 2>/dev/null)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; vc=$?
	chmod 755 "$ev"
	vd=$(printf '%s' "$vv" | jget verdict 2>/dev/null)
	[ -z "$NODE" ] && vd=$(printf '%s' "$vv" | sed -n 's/.*"verdict": "\([a-z]*\)".*/\1/p' | head -1)
	c23a=0; { [ "$vc" = "1" ] && { [ "$vd" = "fail" ] || printf '%s' "$vv" | grep -q '"verdict": "fail"'; }; } && c23a=1
	# friction unwritable -> friction add fail
	frx="$WORK/fr23"; : > "$frx"; chmod 000 "$frx"
	HARNESS_FRICTION="$frx" "$H" friction add --verb x --inference i --proof-gap g --suggested-closure c >/dev/null 2>&1; fc=$?
	chmod 644 "$frx"
	c23b=0; [ "$fc" = "1" ] && c23b=1
	{ [ "$c23a" = "1" ] && [ "$c23b" = "1" ]; } && ok "TEST-23 unwritable evidence/friction -> fail exit 1" || no "TEST-23 persistence-failure (verify fail=$c23a friction fail=$c23b)"
fi

# ===========================================================================
# TEST-24: non-GNU portability of JSON escaping (REQUIRES a real non-GNU awk;
# explicit SKIP when no non-GNU userland exists) (F-08)
# ===========================================================================
# The escaping routine is pure awk, so portability MUST be proven on a genuine
# non-GNU awk. We locate a non-GNU awk from explicit candidates (mawk / busybox
# awk only -- never probing the default awk, which would need a non-POSIX flag),
# force it onto PATH via a shim, run the escaping path under dash (or sh),
# and FAIL if the JSON is invalid. If NO non-GNU awk is available we SKIP loudly
# instead of silently passing on GNU awk.
find_nongnu_awk() { # echoes an absolute non-GNU awk command, or nothing
	# Select ONLY from explicit non-GNU candidates. We never probe the default
	# `awk`, since detecting its implementation would require a non-POSIX flag; if
	# neither explicit candidate exists we return nothing so the caller SKIPs.
	_p=$(command -v mawk 2>/dev/null)
	if [ -n "$_p" ] && printf '' | "$_p" 'BEGIN{exit 0}' >/dev/null 2>&1; then printf '%s' "$_p"; return 0; fi
	_bb=$(command -v busybox 2>/dev/null)
	if [ -n "$_bb" ] && printf '' | "$_bb" awk 'BEGIN{exit 0}' >/dev/null 2>&1; then printf '%s awk' "$_bb"; return 0; fi
	return 1
}
NONGNU_AWK=$(find_nongnu_awk || true)
sh_run=sh; command -v dash >/dev/null 2>&1 && sh_run=dash
if [ -z "$NODE" ]; then
	skip "TEST-24 non-GNU portability (node absent for JSON validation)"
elif [ -z "$NONGNU_AWK" ]; then
	skip "TEST-24 non-GNU portability (NO non-GNU awk/busybox/mawk userland available -- cannot prove R12)"
else
	# force awk -> the non-GNU implementation for every awk the harness invokes
	shimd="$WORK/awkshim"; mkdir -p "$shimd"
	printf '#!/bin/sh\nexec %s "$@"\n' "$NONGNU_AWK" > "$shimd/awk"; chmod +x "$shimd/awk"
	awk_label=$(printf '%s' "$NONGNU_AWK" | cut -c1-40)
	usedawk=$(PATH="$shimd:$PATH" "$sh_run" -c 'command -v awk')
	fr=$(new_friction)
	inf=$(printf 'l1\nl2\twith"q\\b\001ctrl')
	PATH="$shimd:$PATH" HARNESS_FRICTION="$fr" "$sh_run" "$H" friction add --verb portable --inference "$inf" --proof-gap "g" --suggested-closure "c" >/dev/null 2>&1
	lj=$(PATH="$shimd:$PATH" HARNESS_FRICTION="$fr" "$sh_run" "$H" friction list --json)
	ev=$(new_evdir); vj=$(PATH="$shimd:$PATH" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$sh_run" "$H" verify --json)
	lok=0; vok=0
	printf '%s' "$lj" | json_valid && lok=1
	printf '%s' "$vj" | json_valid && vok=1
	# confirm the control-char/newline/tab round-trip through the non-GNU escaper
	rt=$(printf '%s' "$lj" | "$NODE" -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const o=JSON.parse(d);const e=o.entries.find(x=>x.verb==="portable");process.stdout.write(e&&/\u0001/.test(e.inference)&&/\n/.test(e.inference)&&/\t/.test(e.inference)?"ok":"no")})')
	# assert the harness actually resolved awk to the shim (i.e. really ran non-GNU)
	used_ok=0; [ "$usedawk" = "$shimd/awk" ] && used_ok=1
	{ [ "$lok" = "1" ] && [ "$vok" = "1" ] && [ "$rt" = "ok" ] && [ "$used_ok" = "1" ]; } \
		&& ok "TEST-24 JSON escaping valid under $sh_run + forced non-GNU awk ($awk_label)" \
		|| no "TEST-24 non-GNU portability (list=$lok verify=$vok roundtrip=$rt forced-awk=$usedawk)"
fi

# ===========================================================================
# TEST-26: verify resolves each mapped aggregate member EXACTLY ONCE (F-06)
# ===========================================================================
# Regression for the double-execution bug: human `verify` previously resolved
# each member once to aggregate and again to render, running mapped member
# commands twice. Map `lint` to a command that appends to a counter file and
# assert the count is exactly 1 for BOTH human and --json verify.
if [ -n "$NODE" ]; then
	t26=1
	ctr="$WORK/mem.count"
	c26="$WORK/c26.yml"
	# verify->true (fast, deterministic pass), lint-> counter-incrementing command;
	# null the #6-wired test so `npm test` does not run in this fake root.
	set_maps "$CONTRACT" "$WORK/c26a" verify '"true"'
	set_maps "$WORK/c26a" "$WORK/c26b" test 'null'
	set_maps "$WORK/c26b" "$c26" lint "\"sh -c 'echo x >> $ctr'\""
	# human form
	: > "$ctr"
	fr=$(new_friction); ev=$(new_evdir)
	HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$c26" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1
	human_n=$(awk 'END{print NR+0}' "$ctr")
	[ "$human_n" = "1" ] || { t26=0; printf '  (t26 human ran member %s times)\n' "$human_n"; }
	# --json form
	: > "$ctr"
	fr=$(new_friction); ev=$(new_evdir)
	HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$c26" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json >/dev/null 2>&1
	json_n=$(awk 'END{print NR+0}' "$ctr")
	[ "$json_n" = "1" ] || { t26=0; printf '  (t26 --json ran member %s times)\n' "$json_n"; }
	[ "$t26" = "1" ] && ok "TEST-26 verify runs each mapped member exactly once (human=$human_n json=$json_n)" || no "TEST-26 member invoked more than once (human=$human_n json=$json_n)"
else skip "TEST-26 member single-execution (node absent)"; fi

# ===========================================================================
# TEST-27: friction count is valid JSON + correct for missing/empty/populated (F-07)
# ===========================================================================
# Regression for the empty/missing friction log producing invalid JSON (grep -c
# emitting "0\n" + `|| echo 0` appending a second 0). Cover status --json and
# friction list --json (and their human forms) for MISSING, EMPTY, POPULATED.
if [ -n "$NODE" ]; then
	t27=1
	# populated fixture: known number of records
	fr_pop="$WORK/fr27.pop"; cp "$SEED_FRICTION" "$fr_pop"
	pop_n=$(awk 'NF{n++} END{print n+0}' "$fr_pop")
	fr_empty="$WORK/fr27.empty"; : > "$fr_empty"
	fr_missing="$WORK/fr27.missing"; rm -f "$fr_missing"
	for spec in "missing:$fr_missing:0" "empty:$fr_empty:0" "populated:$fr_pop:$pop_n"; do
		kind=${spec%%:*}; rest=${spec#*:}; file=${rest%:*}; want=${rest##*:}
		# status --json
		sj=$(HARNESS_FRICTION="$file" HARNESS_EVIDENCE_DIR="$WORK/ev27" "$H" status --json)
		printf '%s' "$sj" | json_valid || { t27=0; printf '  (t27 status --json invalid: %s)\n' "$kind"; }
		sc=$(printf '%s' "$sj" | jget friction_entries)
		[ "$sc" = "$want" ] || { t27=0; printf '  (t27 status count %s want %s: %s)\n' "$sc" "$want" "$kind"; }
		# friction list --json
		lj=$(HARNESS_FRICTION="$file" "$H" friction list --json)
		printf '%s' "$lj" | json_valid || { t27=0; printf '  (t27 friction list --json invalid: %s)\n' "$kind"; }
		lc=$(printf '%s' "$lj" | jget count)
		[ "$lc" = "$want" ] || { t27=0; printf '  (t27 list count %s want %s: %s)\n' "$lc" "$want" "$kind"; }
		# human forms must still emit exactly one Verdict: line and exit 0
		HARNESS_FRICTION="$file" HARNESS_EVIDENCE_DIR="$WORK/ev27" "$H" status >/dev/null 2>&1 || { t27=0; printf '  (t27 status human nonzero: %s)\n' "$kind"; }
		HARNESS_FRICTION="$file" "$H" friction list >/dev/null 2>&1 || { t27=0; printf '  (t27 friction list human nonzero: %s)\n' "$kind"; }
	done
	# missing file must NOT be created as a side effect of a read-only list
	[ -e "$fr_missing" ] && { t27=0; printf '  (t27 friction list created the missing file)\n'; }
	[ "$t27" = "1" ] && ok "TEST-27 status/friction-list counts valid JSON for missing/empty/populated ($pop_n)" || no "TEST-27 friction count JSON (see notes)"
else skip "TEST-27 friction count JSON (node absent)"; fi

# ===========================================================================
# TEST-28: failing verify prints the terminal Verdict line LAST (F-02R / R2,R7)
# ===========================================================================
# Force the wrapped typecheck to fail (data-only: verify.maps_to -> a failing
# command) and assert the human output's LAST line is exactly `Verdict: fail`,
# with diagnostics printed BEFORE it, and exit code 1.
t28=1
c28="$WORK/c28.yml"; set_maps "$CONTRACT" "$WORK/c28a" verify '"sh -c '\''echo TYPECHECK_DIAG >&2; exit 1'\''"'; set_maps "$WORK/c28a" "$c28" test 'null'
fr=$(new_friction); ev=$(new_evdir)
out28=$(HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$c28" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify 2>/dev/null)
HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_CONTRACT="$c28" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; code28=$?
last28=$(printf '%s\n' "$out28" | awk 'NF{last=$0} END{print last}')
nverd=$(printf '%s\n' "$out28" | grep -c '^Verdict:')
[ "$last28" = "Verdict: fail" ] || { t28=0; printf '  (t28 last line = "%s")\n' "$last28"; }
[ "$code28" = "1" ] || { t28=0; printf '  (t28 exit = %s, want 1)\n' "$code28"; }
[ "$nverd" = "1" ] || { t28=0; printf '  (t28 Verdict lines = %s)\n' "$nverd"; }
[ "$t28" = "1" ] && ok "TEST-28 failing verify: last line exactly 'Verdict: fail', exit 1, one Verdict line" || no "TEST-28 terminal verdict on failure (last='$last28' exit=$code28 verds=$nverd)"

# ===========================================================================
# TEST-29: consuming agents carry role-scoped, non-identical harness blocks
# ===========================================================================
# Guards against stamping one generic block into every agent: each consumer's
# block names only the verbs relevant to its role, so the blocks must differ and
# the read-only roles (research/plan) must forbid execution verbs.
extract_block() { awk '/<!-- HARNESS:BEGIN -->/{f=1;next} /<!-- HARNESS:END -->/{f=0} f' "$1"; }
AGD="$REPO/.github/agents"
t29=1
uniq_n=$(for a in rpiv-research rpiv-planner rpiv-implementer rpiv-verifier; do extract_block "$AGD/$a.agent.md" | cksum; done | sort -u | wc -l)
[ "$uniq_n" -ge 3 ] || { t29=0; printf '  (t29 blocks not distinct: %s unique)\n' "$uniq_n"; }
extract_block "$AGD/rpiv-implementer.agent.md" | grep -q 'lint, test, build' || { t29=0; printf '  (t29 implementer missing execution verbs)\n'; }
extract_block "$AGD/rpiv-verifier.agent.md" | grep -q 'harness verify as the canonical verification gate' || { t29=0; printf '  (t29 verifier missing verify gate)\n'; }
for ro in rpiv-research rpiv-planner; do
	extract_block "$AGD/$ro.agent.md" | grep -q 'MUST NOT run the execution verbs' || { t29=0; printf '  (t29 %s does not forbid execution verbs)\n' "$ro"; }
	extract_block "$AGD/$ro.agent.md" | grep -Eq 'MUST run ./harness (lint|test|build)' && { t29=0; printf '  (t29 %s instructs an execution verb)\n' "$ro"; }
done
[ "$t29" = "1" ] && ok "TEST-29 consuming agents carry role-scoped, distinct harness blocks ($uniq_n distinct)" || no "TEST-29 role-scoped blocks (t29=$t29 distinct=$uniq_n)"

# ===========================================================================
# TEST-30: Issue #5 dev command is genuinely invokable through the harness (AC3;
#          resolves review finding F-01) + validation unchanged (no drift)
# ===========================================================================
# Proves AC3 POSITIVELY via the interactive/handoff verb `dev` (mode: exec, R17)
# WITHOUT hanging: it never `exec`s the blocking watch, using the non-exec
# --print/--json introspection forms instead. `boot` is wired by #6 (mode: exec,
# `npm run start`) and `verify` stays degraded/exit-0. All mutating runs are
# isolated to the scratch dir so tracked files stay clean.
t30=1
PKG="$REPO/package.json"
ROOT_RD="$REPO/README.md"
HARN_RD="$REPO/.harness/README.md"

# (1) package.json: dev == 'tsc --noEmit --watch', typecheck == 'tsc --noEmit',
#     and NO validate/check/lint/build alias script (D1, D5). `test` and `start`
#     ARE now present (added by #6 / ADR-0005) and asserted in TEST-32.
if [ -n "$NODE" ]; then
	dev=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).scripts||{}).dev||"")' "$PKG")
	tc=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).scripts||{}).typecheck||"")' "$PKG")
	extra=$("$NODE" -e 's=require(process.argv[1]).scripts||{};process.stdout.write(["validate","check","lint","build"].filter(k=>k in s).join(","))' "$PKG")
	[ "$dev" = "tsc --noEmit --watch" ] || t30=0
	[ "$tc" = "tsc --noEmit" ] || t30=0
	[ -z "$extra" ] || t30=0
else
	grep -q '"dev": "tsc --noEmit --watch"' "$PKG" || t30=0
	grep -q '"typecheck": "tsc --noEmit"' "$PKG" || t30=0
	for k in validate check lint build; do grep -q "\"$k\":" "$PKG" && t30=0; done
fi

# (2) contract.yml: dev.maps_to == "npm run dev", dev.mode == exec (R17);
#     boot.maps_to == "npm run start" (wired by #6); exactly one verify typecheck
#     mapping -> no drift.
dev_maps=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="dev"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$CONTRACT")
dev_mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="dev"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$CONTRACT")
boot_maps=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="boot"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$CONTRACT")
[ "$dev_maps" = "npm run dev" ] || t30=0
[ "$dev_mode" = "exec" ] || t30=0
[ "$boot_maps" = "npm run start" ] || t30=0
[ "$(grep -c '    maps_to: "npm run typecheck"' "$CONTRACT")" = "1" ] || t30=0

# (3) `./harness help` and `./harness orient` list `dev` as an interactive handoff.
"$H" help | grep -qE '^  dev ' || t30=0
"$H" orient 2>/dev/null | grep -q 'dev execs' || t30=0

# (4) `./harness dev --print` resolves `npm run dev`, exit 0, WITHOUT hanging.
#     `./harness dev --json` is a valid handoff descriptor: mode exec, maps_to,
#     interactive:true, and NO verdict key; exit 0 without exec.
dpr=$("$H" dev --print 2>/dev/null); dprc=$?
{ [ "$dpr" = "npm run dev" ] && [ "$dprc" = "0" ]; } || { t30=0; printf '  (TEST-30 dev --print="%s" exit=%s)\n' "$dpr" "$dprc"; }
dj=$("$H" dev --json 2>/dev/null); djc=$?
[ "$djc" = "0" ] || t30=0
printf '%s' "$dj" | grep -q '"mode": "exec"' || t30=0
printf '%s' "$dj" | grep -q '"maps_to": "npm run dev"' || t30=0
printf '%s' "$dj" | grep -q '"interactive": true' || t30=0
printf '%s' "$dj" | grep -q '"verdict"' && { t30=0; printf '  (TEST-30 dev --json unexpectedly carries a verdict key)\n'; }
if [ -n "$NODE" ]; then printf '%s' "$dj" | json_valid || { t30=0; printf '  (TEST-30 dev --json not valid JSON)\n'; }; fi

# (5) Isolated contract with dev.maps_to null -> `./harness dev` returns unknown +
#     friction, exit 0, and execs NOTHING (honest-when-unmapped, R17.3). Uses a
#     fresh empty friction file so the appended entry is observable.
dn="$WORK/c30devnull.yml"; set_maps "$CONTRACT" "$dn" dev 'null'
frdn="$WORK/fr30devnull.$$"; : > "$frdn"
fb=$(awk 'NF{n++}END{print n+0}' "$frdn")
dno=$(HARNESS_CONTRACT="$dn" HARNESS_FRICTION="$frdn" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" dev 2>/dev/null); dnc=$?
fa=$(awk 'NF{n++}END{print n+0}' "$frdn")
printf '%s\n' "$dno" | grep -q '^Verdict: unknown' || { t30=0; printf '  (TEST-30 unmapped dev verdict: %s)\n' "$(printf '%s\n' "$dno" | grep '^Verdict:')"; }
[ "$dnc" = "0" ] || t30=0
[ "$fa" -gt "$fb" ] || { t30=0; printf '  (TEST-30 unmapped dev did not record friction: %s->%s)\n' "$fb" "$fa"; }

# (6) docs: root README documents `./harness dev` + validation + degraded/
#     non-blocking, and introduces NO validate/check alias (AC1/AC3/AC4).
#     .harness/README.md lists `dev` and defers `boot` to #6.
for tok in "./harness dev" "./harness verify" "npm run typecheck" "degraded" "non-blocking"; do
	grep -qF -- "$tok" "$ROOT_RD" || t30=0
done
grep -q 'npm run validate' "$ROOT_RD" && t30=0
grep -q 'npm run check' "$ROOT_RD" && t30=0
grep -qF 'npm run dev' "$HARN_RD" || t30=0
grep -qF -- '| `dev`' "$HARN_RD" || t30=0
grep -Eq 'boot.*#6|#6.*boot' "$HARN_RD" || t30=0

# (7) friction closure (T6): a post-#5 `dev` friction entry records that the
#     interactive-process gap is now handled by the mode: exec handoff / ./harness dev.
grep '"verb": "dev"' "$SEED_FRICTION" | grep -q './harness dev' || t30=0
grep '"verb": "dev"' "$SEED_FRICTION" | grep -q 'mode: exec' || t30=0
# no-drift on the seeded boot/deferral closures (append-only integrity).
grep -q 'Owned by #6' "$SEED_FRICTION" || t30=0
[ "$(grep -c 'Deferred beyond #5' "$SEED_FRICTION")" -ge 3 ] || t30=0

# (8) `./harness verify` runs non-fail + exit 0 = validation "passes" (D5).
#     Node/typecheck-gated and isolated; NEVER runs `npm run dev`.
if [ -n "$NODE" ] && [ "$TC_OK" = "1" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget verdict)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; vc=$?
	{ [ "$vv" != "fail" ] && [ "$vv" != "__ERR__" ] && [ "$vc" = "0" ]; } || t30=0
	[ "$t30" = "1" ] && ok "TEST-30 #5 dev invokable via ./harness dev (print='$dpr'); verify=$vv non-fail exit $vc; boot wired; no drift" || no "TEST-30 #5 dev invokable + validation (verify=$vv exit $vc t30=$t30)"
else
	[ "$t30" = "1" ] && ok "TEST-30 #5 dev invokable via ./harness dev (print='$dpr'); verify exec skipped: node/typecheck unavailable" || no "TEST-30 #5 dev invokable + validation static assertions (t30=$t30)"
fi

# (9, optional) guarded exec probe: prove `./harness dev` genuinely starts the
#     watch via process handoff. Hard-bounded by timeout/gtimeout so it can never
#     hang; skipped loudly when no timeout tool (or node/typecheck) is available.
TMO=""
command -v timeout  >/dev/null 2>&1 && TMO="timeout"
command -v gtimeout >/dev/null 2>&1 && TMO="gtimeout"
if [ -n "$TMO" ] && [ -n "$NODE" ] && [ "$TC_OK" = "1" ]; then
	probe=$( ( cd "$REPO" && "$TMO" 3 "$H" dev ) 2>&1 ); pc=$?
	{ [ "$pc" = "124" ] || printf '%s' "$probe" | grep -q 'Watching for file changes'; } \
		&& ok "TEST-30b guarded exec probe: ./harness dev started the watch, killed by ${TMO} (exit $pc)" \
		|| no "TEST-30b guarded exec probe (exit=$pc, no watch banner observed)"
else
	skip "TEST-30b guarded exec probe (no timeout tool or node/typecheck unavailable)"
fi

# ===========================================================================
# TEST-31: contract `mode` is AUTHORITATIVE -- mode-driven dispatch (F-02 / R17)
# ===========================================================================
# Proves the harness selects the verb handler from the contract `mode` DATA, not
# from hard-coded verb names: `mode: exec` -> interactive/handoff path, absent or
# `mode: capability` -> run-to-completion capability path, and any unsupported
# `mode` -> usage error (exit 2, not a silent handler pick). Everything runs
# against ISOLATED scratch contracts (HARNESS_CONTRACT) mapped to FAST, non-
# blocking commands (`true`), so nothing hangs and no tracked file is mutated.
t31=1

# (A) Positive: `boot` with `mode: exec` switches to the HANDOFF path even though
#     boot is NOT `dev` -- proving selection is data-driven, not name-driven. Uses
#     maps_to `true` (returns instantly; never blocks a run-to-completion).
ce="$WORK/c31.boot-exec.yml"
cat > "$ce" <<'YML'
version: 1
entrypoint: ./harness
verbs:
  boot:
    maps_to: "true"
    mode: exec
YML
# boot --print resolves the mapped command, exit 0, NO Verdict line, no hang.
bpr=$(HARNESS_CONTRACT="$ce" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" boot --print 2>/dev/null); bprc=$?
{ [ "$bpr" = "true" ] && [ "$bprc" = "0" ]; } || { t31=0; printf '  (TEST-31A boot --print="%s" exit=%s want "true"/0)\n' "$bpr" "$bprc"; }
[ "$(printf '%s\n' "$bpr" | grep -c '^Verdict:')" = "0" ] || { t31=0; printf '  (TEST-31A boot --print emitted a Verdict line)\n'; }
# boot --json is a verdict-FREE handoff descriptor (mode exec, maps_to, interactive).
bj=$(HARNESS_CONTRACT="$ce" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" boot --json 2>/dev/null); bjc=$?
[ "$bjc" = "0" ] || { t31=0; printf '  (TEST-31A boot --json exit=%s)\n' "$bjc"; }
printf '%s' "$bj" | grep -q '"mode": "exec"' || t31=0
printf '%s' "$bj" | grep -q '"maps_to": "true"' || t31=0
printf '%s' "$bj" | grep -q '"interactive": true' || t31=0
printf '%s' "$bj" | grep -q '"verdict"' && { t31=0; printf '  (TEST-31A boot --json unexpectedly carries a verdict key)\n'; }
if [ -n "$NODE" ]; then printf '%s' "$bj" | json_valid || { t31=0; printf '  (TEST-31A boot --json not valid JSON)\n'; }; fi
# bare `./harness boot` now HANDS OFF via exec (runs `true` -> exit 0), emitting
# NO Verdict line (handoff is verdict-exempt). Bounded: `true` returns instantly,
# so this cannot hang -- proving boot no longer uses the run-to-completion handler.
bexo=$(HARNESS_CONTRACT="$ce" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" boot 2>/dev/null); bexc=$?
[ "$bexc" = "0" ] || { t31=0; printf '  (TEST-31A boot handoff exit=%s want 0)\n' "$bexc"; }
[ "$(printf '%s\n' "$bexo" | grep -c '^Verdict:')" = "0" ] || { t31=0; printf '  (TEST-31A boot handoff emitted a Verdict line)\n'; }

# (B) Default/negative: `dev` with NO `mode` -> run-to-completion CAPABILITY path,
#     exactly one Verdict line (proving absent mode selects capability, NOT exec).
cnm="$WORK/c31.dev-nomode.yml"
cat > "$cnm" <<'YML'
version: 1
entrypoint: ./harness
verbs:
  dev:
    maps_to: "true"
YML
dnmo=$(HARNESS_CONTRACT="$cnm" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" dev 2>/dev/null); dnmc=$?
[ "$(printf '%s\n' "$dnmo" | grep -c '^Verdict:')" = "1" ] || { t31=0; printf '  (TEST-31B dev(no mode) Verdict count=%s want 1)\n' "$(printf '%s\n' "$dnmo" | grep -c '^Verdict:')"; }
[ "$dnmc" = "0" ] || { t31=0; printf '  (TEST-31B dev(no mode) exit=%s want 0)\n' "$dnmc"; }
printf '%s\n' "$dnmo" | grep -q '^Verdict: pass' || { t31=0; printf '  (TEST-31B dev(no mode) verdict=%s want pass)\n' "$(printf '%s\n' "$dnmo" | grep '^Verdict:')"; }

# (B2) `dev` with explicit `mode: capability` -> same run-to-completion behavior.
ccap="$WORK/c31.dev-cap.yml"
cat > "$ccap" <<'YML'
version: 1
entrypoint: ./harness
verbs:
  dev:
    maps_to: "true"
    mode: capability
YML
dco=$(HARNESS_CONTRACT="$ccap" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" dev 2>/dev/null); dcc=$?
[ "$(printf '%s\n' "$dco" | grep -c '^Verdict:')" = "1" ] || { t31=0; printf '  (TEST-31B2 dev(mode:capability) Verdict count!=1)\n'; }
[ "$dcc" = "0" ] || { t31=0; printf '  (TEST-31B2 dev(mode:capability) exit=%s want 0)\n' "$dcc"; }

# (C) Unsupported mode -> USAGE ERROR (exit 2), NOT a silent handler pick.
cbo="$WORK/c31.bogus.yml"
cat > "$cbo" <<'YML'
version: 1
entrypoint: ./harness
verbs:
  boot:
    maps_to: "true"
    mode: bogus
YML
bgo=$(HARNESS_CONTRACT="$cbo" HARNESS_FRICTION="$(new_friction)" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" boot 2>/dev/null); bgc=$?
[ "$bgc" = "2" ] || { t31=0; printf '  (TEST-31C boot(mode:bogus) exit=%s want 2)\n' "$bgc"; }
[ "$(printf '%s\n' "$bgo" | grep -c '^Verdict:')" = "0" ] || { t31=0; printf '  (TEST-31C bogus mode emitted a Verdict line)\n'; }

# (D) Regression: the REAL contract still routes by data -- dev(mode:exec) and
#     boot(mode:exec, wired by #6) are BOTH handoffs. Prove via the verdict-free
#     --print form; NEVER run bare `./harness boot` here (it would exec
#     `npm run start`, bind a port and hang).
rdp=$("$H" dev --print 2>/dev/null); rdpc=$?
{ [ "$rdp" = "npm run dev" ] && [ "$rdpc" = "0" ]; } || { t31=0; printf '  (TEST-31D real dev --print="%s" exit=%s)\n' "$rdp" "$rdpc"; }
rbp=$("$H" boot --print 2>/dev/null); rbpc=$?
{ [ "$rbp" = "npm run start" ] && [ "$rbpc" = "0" ]; } || { t31=0; printf '  (TEST-31D real boot --print="%s" exit=%s want "npm run start"/0)\n' "$rbp" "$rbpc"; }
[ "$(printf '%s\n' "$rbp" | grep -c '^Verdict:')" = "0" ] || { t31=0; printf '  (TEST-31D real boot --print emitted a Verdict line)\n'; }

[ "$t31" = "1" ] && ok "TEST-31 contract mode authoritative: exec->handoff, absent/capability->run-to-completion, unsupported->exit 2 (real dev+boot exec handoff intact)" || no "TEST-31 mode-driven dispatch (t31=$t31)"

# ===========================================================================
# TEST-32: Issue #6 -- application shell + /health wired through the harness
# ===========================================================================
# Proves the #6 / ADR-0005 surface end to end (DATA + behavior + docs) WITHOUT
# binding a port in the durable suite: contract wiring (boot exec ->
# `npm run start`, test -> `npm test`), package.json start/test scripts +
# @types/node devDep, the boot --print/--json handoff, `./harness test` -> pass
# and `verify` degraded/test=pass (gated on the npm test preflight), plus doc
# coherence across README + .harness/README. A separate, timeout-bounded probe
# (TEST-32b) exercises a real bind on a high port.
t32=1
PKG="$REPO/package.json"
ROOT_RD="$REPO/README.md"
HARN_RD="$REPO/.harness/README.md"

# (1) contract: boot -> exec "npm run start"; test -> "npm test" (capability).
b32m=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="boot"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$CONTRACT")
b32mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="boot"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$CONTRACT")
t32m=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="test"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$CONTRACT")
[ "$b32m" = "npm run start" ] || { t32=0; printf '  (TEST-32 boot.maps_to="%s")\n' "$b32m"; }
[ "$b32mode" = "exec" ] || { t32=0; printf '  (TEST-32 boot.mode="%s")\n' "$b32mode"; }
[ "$t32m" = "npm test" ] || { t32=0; printf '  (TEST-32 test.maps_to="%s")\n' "$t32m"; }

# (2) package.json: start execs the strip-types entrypoint, test wires node:test,
#     @types/node in devDependencies (ADR-0005 D2/D3/D7).
if [ -n "$NODE" ]; then
	st=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).scripts||{}).start||"")' "$PKG")
	te=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).scripts||{}).test||"")' "$PKG")
	ty=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).devDependencies||{})["@types/node"]||"")' "$PKG")
	[ "$st" = "node --experimental-strip-types src/main.ts" ] || { t32=0; printf '  (TEST-32 start="%s")\n' "$st"; }
	{ printf '%s' "$te" | grep -q 'node --test' && printf '%s' "$te" | grep -q -- '--experimental-strip-types'; } || { t32=0; printf '  (TEST-32 test script="%s")\n' "$te"; }
	[ -n "$ty" ] || { t32=0; printf '  (TEST-32 @types/node devDep missing)\n'; }
else
	grep -q '"start": "node --experimental-strip-types src/main.ts"' "$PKG" || t32=0
	grep -q '"@types/node":' "$PKG" || t32=0
fi

# (3) src files exist (T1/T2): server factory + entrypoint.
[ -f "$REPO/src/server.ts" ] || { t32=0; printf '  (TEST-32 missing src/server.ts)\n'; }
[ -f "$REPO/src/main.ts" ] || { t32=0; printf '  (TEST-32 missing src/main.ts)\n'; }
grep -q 'createAppServer' "$REPO/src/server.ts" || { t32=0; printf '  (TEST-32 server.ts lacks createAppServer)\n'; }

# (4) boot --print handoff: resolves `npm run start`, exit 0, NO Verdict, no hang.
b32pr=$("$H" boot --print 2>/dev/null); b32prc=$?
{ [ "$b32pr" = "npm run start" ] && [ "$b32prc" = "0" ]; } || { t32=0; printf '  (TEST-32 boot --print="%s" exit=%s)\n' "$b32pr" "$b32prc"; }
[ "$(printf '%s\n' "$b32pr" | grep -c '^Verdict:')" = "0" ] || { t32=0; printf '  (TEST-32 boot --print emitted a Verdict line)\n'; }
# boot --json: verdict-free handoff descriptor (mode exec, maps_to, interactive).
b32j=$("$H" boot --json 2>/dev/null); b32jc=$?
[ "$b32jc" = "0" ] || { t32=0; printf '  (TEST-32 boot --json exit=%s)\n' "$b32jc"; }
printf '%s' "$b32j" | grep -q '"mode": "exec"' || { t32=0; printf '  (TEST-32 boot --json mode)\n'; }
printf '%s' "$b32j" | grep -q '"maps_to": "npm run start"' || { t32=0; printf '  (TEST-32 boot --json maps_to)\n'; }
printf '%s' "$b32j" | grep -q '"interactive": true' || { t32=0; printf '  (TEST-32 boot --json interactive)\n'; }
printf '%s' "$b32j" | grep -q '"verdict"' && { t32=0; printf '  (TEST-32 boot --json unexpectedly carries a verdict key)\n'; }
if [ -n "$NODE" ]; then printf '%s' "$b32j" | json_valid || { t32=0; printf '  (TEST-32 boot --json not valid JSON)\n'; }; fi

# (5) `./harness test` -> pass and verify --json shows test=pass (gated on the npm
#     test preflight; runs in the REAL repo, no fake root).
if [ "$TEST_OK" = "1" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	tvo=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" test 2>/dev/null); tvc=$?
	printf '%s\n' "$tvo" | grep -q '^Verdict: pass' || { t32=0; printf '  (TEST-32 ./harness test verdict=%s)\n' "$(printf '%s\n' "$tvo" | grep '^Verdict:')"; }
	[ "$tvc" = "0" ] || { t32=0; printf '  (TEST-32 ./harness test exit=%s want 0)\n' "$tvc"; }
	fr=$(new_friction); ev=$(new_evdir)
	vchecks=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget checks)
	printf '%s' "$vchecks" | grep -q 'test=pass' || { t32=0; printf '  (TEST-32 verify checks=%s want test=pass)\n' "$vchecks"; }
else
	skip "TEST-32(5) ./harness test verdict + verify test=pass (npm test preflight unavailable)"
fi

# (6) `./harness verify` degraded + exit 0 (D5/D8); gated on typecheck + test.
if [ -n "$NODE" ] && [ "$TC_OK" = "1" ] && [ "$TEST_OK" = "1" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	vv=$(HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify --json | jget verdict)
	HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; vc=$?
	{ [ "$vv" = "degraded" ] && [ "$vc" = "0" ]; } || { t32=0; printf '  (TEST-32 verify verdict=%s exit=%s want degraded/0)\n' "$vv" "$vc"; }
fi

# (7) docs coherence: root README documents the boot start command, default port
#     + PORT, and the /health contract body; .harness/README names `npm run start`.
for tok in "./harness boot" "npm run start" "/health" "3000" "PORT"; do
	grep -qF -- "$tok" "$ROOT_RD" || { t32=0; printf '  (TEST-32 README missing token: %s)\n' "$tok"; }
done
grep -qF -- '{"status":"ok"}' "$ROOT_RD" || { t32=0; printf '  (TEST-32 README missing health body {"status":"ok"})\n'; }
grep -qF -- 'npm run start' "$HARN_RD" || { t32=0; printf '  (TEST-32 .harness/README missing npm run start)\n'; }

[ "$t32" = "1" ] && ok "TEST-32 #6 shell+health wired: boot exec->npm run start (--print/--json), test->pass, verify degraded/test=pass, docs coherent" || no "TEST-32 #6 wiring (t32=$t32)"

# ---------------------------------------------------------------------------
# TEST-32b (guarded live probe): a REAL bind on an OS-chosen EPHEMERAL port,
# hard-bounded by timeout/gtimeout so it can never hang or leak. Uses the
# strip-types entrypoint directly (never bare `./harness boot`, never the default
# port 3000). The port is allocated by asking the OS for a free one (node binds
# port 0, reports it, releases it) instead of a hard-coded port, and EVERY curl
# carries a client connect/overall timeout so a hung or foreign listener can
# neither stall the test nor silently defeat the assertions.
# ---------------------------------------------------------------------------
TMO=""
command -v timeout  >/dev/null 2>&1 && TMO="timeout"
command -v gtimeout >/dev/null 2>&1 && TMO="gtimeout"
# free_port: ask the OS for an available ephemeral TCP port on 127.0.0.1 (bind 0,
# read the assigned port, close). Empty on failure -> the probe skips.
free_port() {
	"$NODE" -e 'const net=require("net");const s=net.createServer();s.on("error",()=>process.exit(1));s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>process.stdout.write(String(p)))})' 2>/dev/null
}
# per-curl client timeout (POSIX curl): fail fast on connect, cap total time.
CURL_TMO="--connect-timeout 2 --max-time 5"
pp=""
[ -n "$NODE" ] && pp=$(free_port)
if [ -n "$TMO" ] && [ -n "$NODE" ] && [ -n "$pp" ] && [ "$TEST_OK" = "1" ] && command -v curl >/dev/null 2>&1; then
	( cd "$REPO" && exec env PORT="$pp" "$TMO" 5 "$NODE" --experimental-strip-types src/main.ts >/dev/null 2>&1 ) &
	probe_pid=$!
	up=0; i=0
	while [ "$i" -lt 50 ]; do
		if curl $CURL_TMO -fsS "http://127.0.0.1:$pp/health" >/dev/null 2>&1; then up=1; break; fi
		sleep 0.1; i=$((i + 1))
	done
	hb=$(curl $CURL_TMO -fsS "http://127.0.0.1:$pp/health" 2>/dev/null)
	hs=$(curl $CURL_TMO -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$pp/health" 2>/dev/null)
	rs=$(curl $CURL_TMO -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$pp/" 2>/dev/null)
	rb=$(curl $CURL_TMO -fsS "http://127.0.0.1:$pp/" 2>/dev/null)
	us=$(curl $CURL_TMO -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$pp/does-not-exist" 2>/dev/null)
	kill "$probe_pid" 2>/dev/null
	wait "$probe_pid" 2>/dev/null
	{ [ "$up" = "1" ] && [ "$hb" = '{"status":"ok"}' ] && [ "$hs" = "200" ] && [ "$rs" = "200" ] && [ "$us" = "404" ] && printf '%s' "$rb" | grep -qi '<html'; } \
		&& ok "TEST-32b live probe: /health 200 {\"status\":\"ok\"}, / 200 HTML, unknown 404 (timeout-bounded, ephemeral port $pp, per-curl timeout, no leak)" \
		|| no "TEST-32b live probe (up=$up health='$hb' hs=$hs rs=$rs unknown=$us port=$pp)"
else
	skip "TEST-32b live probe (no timeout/curl/node, no free ephemeral port, or npm test preflight unavailable)"
fi

# ---------------------------------------------------------------------------
# TEST-32c (PR #6 F-02 regression): a `verify` run against the REAL contract
# with an EMPTY friction log records a TRUTHFUL friction entry -- it names the
# ACTUAL unknown members (lint/build) and does NOT falsely claim `test` is
# unwired, nor reference an "Issue #5" wiring of test (test is now `npm test`
# and passes). Asserted with plain grep (no node needed for the text checks);
# gated on the typecheck preflight so `verify` is degraded (not fail) and thus
# writes the aggregate friction record.
# ---------------------------------------------------------------------------
if [ "$TC_OK" = "1" ]; then
	t32c=1
	frc="$WORK/fr32c.$$"; : > "$frc"; ev=$(new_evdir)
	HARNESS_FRICTION="$frc" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1
	vfl=$(grep '"verb": "verify"' "$frc" 2>/dev/null | tail -n 1)
	[ -n "$vfl" ] || { t32c=0; printf '  (TEST-32c no verify friction entry recorded on empty log)\n'; }
	printf '%s' "$vfl" | grep -q 'lint, build' || { t32c=0; printf '  (TEST-32c verify friction does not name the real unknown members lint, build)\n'; }
	printf '%s' "$vfl" | grep -q 'test' && { t32c=0; printf '  (TEST-32c verify friction FALSELY names test)\n'; }
	printf '%s' "$vfl" | grep -q 'Issue #5' && { t32c=0; printf '  (TEST-32c verify friction references stale Issue #5 wiring)\n'; }
	[ "$t32c" = "1" ] && ok "TEST-32c #6 F-02: empty-friction verify records truthful friction (names lint/build; no false test, no Issue #5)" || no "TEST-32c F-02 friction truthfulness (t32c=$t32c)"
else
	skip "TEST-32c F-02 friction truthfulness (typecheck preflight unavailable)"
fi

# ===========================================================================
# TEST-33 (PR #6 F-01 / ADR-0005 D2): doctor Node minor-floor boundary
# ===========================================================================
# Proves the refined `doctor` >=22.6.0 floor WITHOUT depending on this machine's
# Node: stub a fake `node` on PATH (same seam as TEST-21) reporting a chosen
# version. Major-22 minor<6 -> `degraded` (exit 0, NEVER fail) with a reason
# naming the 22.6.0 floor; major-22 minor>=6 -> node check OK (pass). The change
# is localized to compute_doctor (no CC-0003 amendment). SKIPs cleanly if the
# stub mechanism is unavailable (no node, or shim dir unwritable).
if [ -n "$NODE" ]; then
	shimdir33="$WORK/shim33"; mkdir -p "$shimdir33" 2>/dev/null
	if [ -d "$shimdir33" ] && [ -w "$shimdir33" ]; then
		t33=1
		# (a) below the floor (v22.5.0) -> degraded, exit 0, NEVER fail, node
		#     check not-ok, and reason names the 22.6.0 floor.
		printf '#!/bin/sh\necho v22.5.0\n' > "$shimdir33/node"; chmod +x "$shimdir33/node"
		fr=$(new_friction); ev=$(new_evdir)
		dj=$(PATH="$shimdir33:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json)
		PATH="$shimdir33:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor >/dev/null 2>&1; dc=$?
		dv=$(printf '%s' "$dj" | jget verdict)
		dnotes=$(printf '%s' "$dj" | jget notes)
		dnodeok=$(printf '%s' "$dj" | jget checks.0.ok)
		[ "$dv" = "degraded" ] || { t33=0; printf '  (TEST-33 v22.5.0 verdict=%s want degraded)\n' "$dv"; }
		[ "$dv" != "fail" ] || { t33=0; printf '  (TEST-33 v22.5.0 verdict must NEVER be fail)\n'; }
		[ "$dc" = "0" ] || { t33=0; printf '  (TEST-33 v22.5.0 exit=%s want 0)\n' "$dc"; }
		[ "$dnodeok" = "false" ] || { t33=0; printf '  (TEST-33 v22.5.0 node.ok=%s want false)\n' "$dnodeok"; }
		printf '%s' "$dnotes" | grep -q '22.6.0' || { t33=0; printf '  (TEST-33 v22.5.0 reason does not name the 22.6.0 floor: %s)\n' "$dnotes"; }
		printf '%s' "$dj" | json_valid || { t33=0; printf '  (TEST-33 v22.5.0 doctor --json not valid JSON)\n'; }
		# (b) at/above the floor -> node check OK (pass), exit 0.
		for ver in v22.6.0 v22.17.1; do
			printf '#!/bin/sh\necho %s\n' "$ver" > "$shimdir33/node"; chmod +x "$shimdir33/node"
			fr=$(new_friction); ev=$(new_evdir)
			dj=$(PATH="$shimdir33:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json)
			PATH="$shimdir33:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor >/dev/null 2>&1; dc=$?
			dv=$(printf '%s' "$dj" | jget verdict)
			dnodeok=$(printf '%s' "$dj" | jget checks.0.ok)
			{ [ "$dv" = "pass" ] && [ "$dc" = "0" ] && [ "$dnodeok" = "true" ]; } || { t33=0; printf '  (TEST-33 %s verdict=%s exit=%s node.ok=%s want pass/0/true)\n' "$ver" "$dv" "$dc" "$dnodeok"; }
		done
		[ "$t33" = "1" ] && ok "TEST-33 doctor >=22.6.0 floor: v22.5.0->degraded (exit 0, reason names 22.6.0), v22.6.0/v22.17.1->pass" || no "TEST-33 doctor node minor floor (t33=$t33)"
	else
		skip "TEST-33 doctor node minor floor (shim dir unavailable)"
	fi
else
	skip "TEST-33 doctor node minor floor (node absent -> cannot stub/validate)"
fi


# ===========================================================================
# TEST-34: Issue #7 -- code-server launcher wired through the `edit` handoff
# ===========================================================================
# Proves the #7 / ADR-0006 surface WITHOUT launching code-server or binding a
# port: contract wiring (edit exec -> `npm run edit`, provider-agnostic),
# package.json edit script -> the launcher seam, the launcher script exists +
# executable + owns ALL code-server flags (5.7 isolation), the edit --print/
# --json handoff (no hang, verdict-exempt), help/orient listing, honest-when-
# unmapped, and doc coherence. NEVER runs bare `./harness edit`.
t34=1
PKG="$REPO/package.json"
ROOT_RD="$REPO/README.md"
HARN_RD="$REPO/.harness/README.md"
LAUNCHER="$REPO/scripts/launch-editor.sh"

# (1) contract: edit -> exec "npm run edit" (agnostic; NO code-server flag).
e34m=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="edit"&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);gsub(/"/,"",v);print v;exit}' "$CONTRACT")
e34mode=$(awk '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur=="edit"&&/^    mode:/{v=$0;sub(/^    mode:[ \t]*/,"",v);print v;exit}' "$CONTRACT")
[ "$e34m" = "npm run edit" ] || { t34=0; printf '  (TEST-34 edit.maps_to="%s")\n' "$e34m"; }
[ "$e34mode" = "exec" ] || { t34=0; printf '  (TEST-34 edit.mode="%s")\n' "$e34mode"; }

# (2) package.json: edit script execs the launcher seam (no code-server flag).
if [ -n "$NODE" ]; then
	ed=$("$NODE" -e 'process.stdout.write((require(process.argv[1]).scripts||{}).edit||"")' "$PKG")
	[ "$ed" = "sh scripts/launch-editor.sh" ] || { t34=0; printf '  (TEST-34 edit script="%s")\n' "$ed"; }
else
	grep -q '"edit": "sh scripts/launch-editor.sh"' "$PKG" || t34=0
fi

# (3) launcher script exists, is executable, and is POSIX-parseable.
[ -f "$LAUNCHER" ] || { t34=0; printf '  (TEST-34 missing %s)\n' "$LAUNCHER"; }
[ -x "$LAUNCHER" ] || { t34=0; printf '  (TEST-34 launcher not executable)\n'; }
sh -n "$LAUNCHER" 2>/dev/null || { t34=0; printf '  (TEST-34 launcher not POSIX-parseable)\n'; }

# (4) 5.7 provider-argument isolation: the code-server flags live ONLY in the
#     launcher -- NOT in the contract, the harness script, or src/.
grep -q -- '--bind-addr' "$LAUNCHER" || { t34=0; printf '  (TEST-34 launcher lacks --bind-addr)\n'; }
grep -q -- '--auth' "$LAUNCHER" || { t34=0; printf '  (TEST-34 launcher lacks --auth)\n'; }
for f in "$CONTRACT" "$H"; do
	grep -q -- '--bind-addr' "$f" && { t34=0; printf '  (TEST-34 %s leaks --bind-addr)\n' "$f"; }
	grep -q -- '--auth' "$f" && { t34=0; printf '  (TEST-34 %s leaks --auth)\n' "$f"; }
done
for f in "$REPO"/src/*.ts; do
	[ -e "$f" ] || continue
	grep -q -- '--bind-addr' "$f" && { t34=0; printf '  (TEST-34 %s leaks --bind-addr)\n' "$f"; }
	grep -q 'code-server' "$f" && { t34=0; printf '  (TEST-34 %s references code-server)\n' "$f"; }
done

# (5) help + orient represent edit as an interactive handoff; count includes it.
"$H" help | grep -qE '^  edit ' || { t34=0; printf '  (TEST-34 help does not list edit)\n'; }
if [ -n "$NODE" ]; then
	ev34=$("$H" orient --json 2>/dev/null | jget verbs)
	[ "$ev34" = "14" ] || { t34=0; printf '  (TEST-34 orient verb count=%s want 14)\n' "$ev34"; }
fi

# (6) edit --print handoff: resolves `npm run edit`, exit 0, NO Verdict, no hang.
e34pr=$("$H" edit --print 2>/dev/null); e34prc=$?
{ [ "$e34pr" = "npm run edit" ] && [ "$e34prc" = "0" ]; } || { t34=0; printf '  (TEST-34 edit --print="%s" exit=%s)\n' "$e34pr" "$e34prc"; }
[ "$(printf '%s\n' "$e34pr" | grep -c '^Verdict:')" = "0" ] || { t34=0; printf '  (TEST-34 edit --print emitted a Verdict line)\n'; }

# (7) edit --json: verdict-free handoff descriptor (mode exec, maps_to, interactive).
e34j=$("$H" edit --json 2>/dev/null); e34jc=$?
[ "$e34jc" = "0" ] || { t34=0; printf '  (TEST-34 edit --json exit=%s)\n' "$e34jc"; }
printf '%s' "$e34j" | grep -q '"mode": "exec"' || { t34=0; printf '  (TEST-34 edit --json mode)\n'; }
printf '%s' "$e34j" | grep -q '"maps_to": "npm run edit"' || { t34=0; printf '  (TEST-34 edit --json maps_to)\n'; }
printf '%s' "$e34j" | grep -q '"interactive": true' || { t34=0; printf '  (TEST-34 edit --json interactive)\n'; }
printf '%s' "$e34j" | grep -q '"verdict"' && { t34=0; printf '  (TEST-34 edit --json unexpectedly carries a verdict key)\n'; }
if [ -n "$NODE" ]; then printf '%s' "$e34j" | json_valid || { t34=0; printf '  (TEST-34 edit --json not valid JSON)\n'; }; fi

# (8) honest-when-unmapped (R17.3): isolated contract with edit.maps_to null ->
#     `./harness edit` returns unknown + friction, exit 0, and execs NOTHING.
en="$WORK/c34editnull.yml"; set_maps "$CONTRACT" "$en" edit 'null'
fren="$WORK/fr34editnull.$$"; : > "$fren"
fb34=$(awk 'NF{n++}END{print n+0}' "$fren")
eno=$(HARNESS_CONTRACT="$en" HARNESS_FRICTION="$fren" HARNESS_EVIDENCE_DIR="$(new_evdir)" "$H" edit 2>/dev/null); enc=$?
fa34=$(awk 'NF{n++}END{print n+0}' "$fren")
printf '%s\n' "$eno" | grep -q '^Verdict: unknown' || { t34=0; printf '  (TEST-34 unmapped edit verdict: %s)\n' "$(printf '%s\n' "$eno" | grep '^Verdict:')"; }
[ "$enc" = "0" ] || { t34=0; printf '  (TEST-34 unmapped edit exit=%s want 0)\n' "$enc"; }
[ "$fa34" -gt "$fb34" ] || { t34=0; printf '  (TEST-34 unmapped edit did not record friction: %s->%s)\n' "$fb34" "$fa34"; }

# (9) docs coherence: README documents ./harness edit + config + safety; the
#     .harness/README lists edit and names `npm run edit`.
for tok in "./harness edit" "PROJECT_PATH" "EDITOR_PORT" "npm run edit"; do
	grep -qF -- "$tok" "$ROOT_RD" || { t34=0; printf '  (TEST-34 README missing token: %s)\n' "$tok"; }
done
grep -qF -- 'npm run edit' "$HARN_RD" || { t34=0; printf '  (TEST-34 .harness/README missing npm run edit)\n'; }
grep -qF -- '| `edit`' "$HARN_RD" || { t34=0; printf '  (TEST-34 .harness/README missing edit verb row)\n'; }

[ "$t34" = "1" ] && ok "TEST-34 #7 code-server launcher: edit exec->npm run edit (--print/--json), launcher owns flags (5.7), honest-when-unmapped, docs coherent" || no "TEST-34 #7 launcher wiring (t34=$t34)"

# ===========================================================================
# Summary
# ===========================================================================
printf -- '-------------------------------------------------------\n'
printf 'Totals: PASS=%s FAIL=%s SKIP=%s\n' "$PASS" "$FAIL" "$SKIP"
if [ "$FAIL" -eq 0 ]; then
	printf 'Verdict: pass\n'
	exit 0
else
	printf 'Verdict: fail\n'
	exit 1
fi
