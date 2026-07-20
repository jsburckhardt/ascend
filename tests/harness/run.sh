#!/bin/sh
# tests/harness/run.sh - durable, dependency-light regression suite for ./harness
# (CORE-COMPONENT-0003 R16). Exercises TEST-01..TEST-24 from
# project/issues/4/plan/03-test-plan.md. Runs non-interactively, prints a summary
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

# ===========================================================================
# TEST-01: contract schema
# ===========================================================================
c="$CONTRACT"
t01=1
for k in "^version:" "^entrypoint:" "^verbs:" "^evidence:" "^friction:"; do
	grep -q "$k" "$c" || t01=0
done
for v in help orient doctor lint test build boot verify status clean '"friction add"' '"friction list"'; do
	grep -Eq "^  $v:" "$c" || t01=0
done
grep -q '    maps_to: "npm run typecheck"' "$c" || t01=0
[ "$(grep -c '    maps_to: "npm run typecheck"' "$c")" = "1" ] || t01=0
for v in lint test build boot; do
	# the maps_to line following the verb header must be null
	got=$(awk -v verb="$v" '/^  [^ ].*:[ \t]*$/&&/^  /&&!/^    /{h=$0;sub(/^  /,"",h);sub(/:.*/,"",h);gsub(/"/,"",h);cur=h} cur==verb&&/^    maps_to:/{v=$0;sub(/^    maps_to:[ \t]*/,"",v);print v;exit}' "$c")
	[ "$got" = "null" ] || t01=0
done
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
for v in help orient doctor lint test build boot verify status clean "friction add" "friction list"; do
	printf '%s' "$hv" | grep -q "$v" || verbs_ok=0
done
[ "$code" = "0" ] && [ "$verbs_ok" = "1" ] && ok "TEST-02 help lists 12 verbs, exit 0" || no "TEST-02 help lists 12 verbs, exit 0"
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
	for want in "typecheck=" "lint=unknown" "test=unknown" "build=unknown" "doctor="; do
		printf '%s' "$names" | grep -q "$want" || hasall=0
	done
	{ [ "$jv" = "1" ] && [ "$hasall" = "1" ] && [ -f "$ev/$(basename "$evp")" ]; } && ok "TEST-05 verify --json schema incl doctor member + evidence exists" || no "TEST-05 verify --json schema (jv=$jv checks='$names')"
else skip "TEST-05 verify --json schema (node absent)"; fi

# ===========================================================================
# TEST-06: lint/test/build/boot unknown + friction, no tsc alias
# ===========================================================================
t06=1
for v in lint test build boot; do
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
[ "$t06" = "1" ] && ok "TEST-06 lint/test/build/boot unknown+friction, no evidence" || no "TEST-06 lint/test/build/boot unknown+friction"

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
vc=1; for v in help orient doctor lint test build boot verify status clean friction; do grep -q "$v" "$rd" || vc=0; done
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
	d="$WORK/c19c.yml"; set_maps "$CONTRACT" "$WORK/c19c0" verify 'null'; set_aggregate "$WORK/c19c0" "$d" "lint, test, build"
	tt_case "all-unknown -> unknown" "$HEALTHY_ROOT" "unknown" "0" "$d"
	# 4. mix pass+unknown -> degraded (verify true; lint/test/build null; doctor pass)
	e="$WORK/c19d.yml"; set_maps "$CONTRACT" "$e" verify '"true"'
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
for v in help orient doctor lint test build boot verify status clean; do
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
[ "$t20" = "1" ] && ok "TEST-20 exactly one Verdict: line per human verb (help/friction list = pass)" || no "TEST-20 one Verdict line per verb"

# ===========================================================================
# TEST-21: doctor validates full Node range (21/22/23 boundaries)
# ===========================================================================
if [ -n "$NODE" ]; then
	shimdir="$WORK/shim"; mkdir -p "$shimdir"
	t21=1
	for pair in "21:degraded" "22:pass" "23:degraded"; do
		maj=${pair%%:*}; want=${pair##*:}
		printf '#!/bin/sh\necho v%s.0.0\n' "$maj" > "$shimdir/node"; chmod +x "$shimdir/node"
		fr=$(new_friction); ev=$(new_evdir)
		got=$(PATH="$shimdir:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor --json | "$NODE" -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{process.stdout.write(JSON.parse(d).verdict)}catch(e){process.stdout.write("__ERR__")}})')
		PATH="$shimdir:$PATH" HARNESS_ROOT="$HEALTHY_ROOT" HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" doctor >/dev/null 2>&1; gc=$?
		{ [ "$got" = "$want" ] && [ "$gc" = "0" ]; } || { t21=0; printf '  (node %s -> %s exit %s, want %s)\n' "$maj" "$got" "$gc" "$want"; }
	done
	[ "$t21" = "1" ] && ok "TEST-21 doctor node range: 21->degraded, 22->pass, 23->degraded (exit 0)" || no "TEST-21 doctor node range"
else skip "TEST-21 node range (node absent)"; fi

# ===========================================================================
# TEST-22: evidence collision-safe + atomic
# ===========================================================================
if [ -n "$NODE" ]; then
	fr=$(new_friction); ev=$(new_evdir)
	i=0; while [ "$i" -lt 20 ]; do HARNESS_FRICTION="$fr" HARNESS_EVIDENCE_DIR="$ev" "$H" verify >/dev/null 2>&1; i=$((i + 1)); done
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
	# verify->true (fast, deterministic pass), lint-> counter-incrementing command
	set_maps "$CONTRACT" "$WORK/c26a" verify '"true"'
	set_maps "$WORK/c26a" "$c26" lint "\"sh -c 'echo x >> $ctr'\""
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
c28="$WORK/c28.yml"; set_maps "$CONTRACT" "$c28" verify '"sh -c '\''echo TYPECHECK_DIAG >&2; exit 1'\''"'
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
